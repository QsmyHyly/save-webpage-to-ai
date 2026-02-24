let allPages = [];
let currentResources = [];
let currentPageId = null;

document.addEventListener('DOMContentLoaded', async () => {
  await loadPages();
  bindEvents();
});

async function loadPages() {
  try {
    allPages = await chrome.runtime.sendMessage({ type: 'GET_ALL_PAGES' });
    renderPageSelector();
  } catch (error) {
    console.error('加载页面列表失败:', error);
  }
}

function renderPageSelector() {
  const select = document.getElementById('pageSelect');
  select.innerHTML = '<option value="">-- 请选择页面 --</option>';
  
  allPages.forEach(page => {
    const option = document.createElement('option');
    option.value = page.id;
    option.textContent = page.title;
    select.appendChild(option);
  });
}

async function loadPageResources(pageId) {
  if (!pageId) {
    currentResources = [];
    renderResources();
    return;
  }
  
  currentPageId = pageId;
  
  try {
    const page = allPages.find(p => p.id === pageId);
    if (!page) return;
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(page.html, 'text/html');
    
    const resources = [];
    
    doc.querySelectorAll('link[rel="stylesheet"]').forEach((link, index) => {
      resources.push({
        id: `css-${index}`,
        url: link.href,
        type: 'css',
        mimeType: 'text/css',
        metadata: {
          filename: link.href.split('/').pop(),
          media: link.media || 'all'
        }
      });
    });
    
    doc.querySelectorAll('script[src]').forEach((script, index) => {
      resources.push({
        id: `js-${index}`,
        url: script.src,
        type: 'js',
        mimeType: 'application/javascript',
        metadata: {
          filename: script.src.split('/').pop(),
          async: script.async,
          defer: script.defer
        }
      });
    });
    
    doc.querySelectorAll('img[src]').forEach((img, index) => {
      resources.push({
        id: `img-${index}`,
        url: img.src,
        type: 'image',
        mimeType: guessMimeType(img.src),
        metadata: {
          filename: img.src.split('/').pop(),
          alt: img.alt
        }
      });
    });
    
    const savedResources = await chrome.runtime.sendMessage({
      type: 'GET_RESOURCES_BY_PAGE_ID',
      pageId: pageId
    });
    
    resources.forEach(res => {
      const saved = savedResources.find(s => s.url === res.url);
      res.saved = !!saved;
      res.savedId = saved ? saved.id : null;
    });
    
    currentResources = resources;
    renderResources();
  } catch (error) {
    console.error('加载资源失败:', error);
  }
}

function renderResources() {
  const container = document.getElementById('resourcesList');
  
  if (currentResources.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        <p>该页面没有外部资源</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = '';
  
  currentResources.forEach(resource => {
    const div = document.createElement('div');
    div.className = 'resource-item';
    
    const icon = getResourceIcon(resource.type);
    const sizeText = resource.size ? formatSize(resource.size) : '未知大小';
    const statusClass = resource.saved ? 'saved' : 'unsaved';
    const statusText = resource.saved ? '已保存' : '未保存';
    
    div.innerHTML = `
      <input type="checkbox" class="resource-checkbox" data-id="${resource.id}" ${resource.saved ? 'disabled' : ''}>
      <div class="resource-icon ${resource.type}">${icon}</div>
      <div class="resource-info">
        <div class="resource-url" title="${escapeHtml(resource.url)}">${escapeHtml(resource.url)}</div>
        <div class="resource-meta">
          ${escapeHtml(resource.metadata.filename || '')} | ${sizeText} | 
          <span class="resource-status ${statusClass}">${statusText}</span>
        </div>
      </div>
      ${resource.saved ? `<button class="btn btn-danger delete-btn" data-saved-id="${resource.savedId}">删除</button>` : ''}
    `;
    
    container.appendChild(div);
  });
  
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const savedId = e.target.dataset.savedId;
      await deleteResource(savedId);
    });
  });
}

function getResourceIcon(type) {
  const icons = {
    css: '🎨',
    js: '📜',
    image: '🖼️',
    font: '🔤',
    other: '📄'
  };
  return icons[type] || icons.other;
}

function guessMimeType(url) {
  const ext = url.split('.').pop().split('?')[0].toLowerCase();
  const mimeTypes = {
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'webp': 'image/webp',
    'ico': 'image/x-icon'
  };
  return mimeTypes[ext] || 'image/*';
}

function formatSize(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function fetchResource(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.startsWith('image/')) {
      const blob = await response.blob();
      return await blobToBase64(blob);
    }
    
    return await response.text();
  } catch (error) {
    throw error;
  }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function saveSelectedResources() {
  const checkboxes = document.querySelectorAll('.resource-checkbox:checked');
  if (checkboxes.length === 0) {
    alert('请至少选择一个资源');
    return;
  }
  
  const selectedIds = Array.from(checkboxes).map(cb => cb.dataset.id);
  const selectedResources = currentResources.filter(r => selectedIds.includes(r.id));
  
  const overlay = document.getElementById('progressOverlay');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');
  overlay.classList.add('active');
  
  try {
    const resourcesToSave = [];
    
    for (let i = 0; i < selectedResources.length; i++) {
      const resource = selectedResources[i];
      
      progressText.textContent = `正在下载: ${resource.metadata.filename} (${i + 1}/${selectedResources.length})`;
      progressFill.style.width = `${((i + 1) / selectedResources.length) * 100}%`;
      
      try {
        const content = await fetchResource(resource.url);
        resourcesToSave.push({
          ...resource,
          content: content,
          size: content.length,
          pageId: currentPageId
        });
      } catch (error) {
        console.error('下载资源失败:', resource.url, error);
        alert(`下载失败: ${resource.url}`);
      }
    }
    
    if (resourcesToSave.length > 0) {
      await chrome.runtime.sendMessage({
        type: 'SAVE_RESOURCES',
        resources: resourcesToSave
      });
      
      alert(`✅ 成功保存 ${resourcesToSave.length} 个资源`);
      await loadPageResources(currentPageId);
    }
  } catch (error) {
    console.error('保存资源失败:', error);
    alert('保存失败: ' + error.message);
  } finally {
    overlay.classList.remove('active');
  }
}

async function deleteResource(savedId) {
  if (!confirm('确定要删除这个资源吗？')) {
    return;
  }
  
  try {
    await chrome.runtime.sendMessage({
      type: 'DELETE_RESOURCE',
      id: savedId
    });
    await loadPageResources(currentPageId);
  } catch (error) {
    console.error('删除资源失败:', error);
    alert('删除失败: ' + error.message);
  }
}

function selectAll() {
  document.querySelectorAll('.resource-checkbox:not(:disabled)').forEach(cb => cb.checked = true);
}

function deselectAll() {
  document.querySelectorAll('.resource-checkbox').forEach(cb => cb.checked = false);
}

function bindEvents() {
  document.getElementById('pageSelect').addEventListener('change', (e) => {
    loadPageResources(e.target.value);
  });
  
  document.getElementById('selectAllBtn').addEventListener('click', selectAll);
  document.getElementById('deselectAllBtn').addEventListener('click', deselectAll);
  document.getElementById('saveSelectedBtn').addEventListener('click', saveSelectedResources);
  
  document.addEventListener('change', (e) => {
    if (e.target.classList.contains('resource-checkbox')) {
      const checkedCount = document.querySelectorAll('.resource-checkbox:checked').length;
      document.getElementById('saveSelectedBtn').disabled = checkedCount === 0;
    }
  });
}