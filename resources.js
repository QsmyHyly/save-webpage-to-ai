let allPages = [];
let currentResources = [];
let currentPageId = null;
let currentResourcesData = null;

document.addEventListener('DOMContentLoaded', async () => {
  await loadCurrentResources();
  bindEvents();
});

async function loadCurrentResources() {
  try {
    const result = await chrome.storage.local.get('currentResources');
    currentResourcesData = result.currentResources;
    
    if (currentResourcesData) {
      currentResources = currentResourcesData.resources;
      renderResources();
      showPageInfo(currentResourcesData);
    } else {
      currentResources = [];
      renderEmptyState();
    }
  } catch (error) {
    console.error('加载当前资源失败:', error);
    renderEmptyState();
  }
}

function showPageInfo(pageData) {
  const container = document.getElementById('resourcesList');
  
  const infoDiv = document.createElement('div');
  infoDiv.style.cssText = `
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 16px;
    border-radius: 8px;
    margin-bottom: 20px;
  `;
  infoDiv.innerHTML = `
    <h2 style="margin: 0 0 8px 0; font-size: 18px;">📄 ${escapeHtml(pageData.title)}</h2>
    <div style="font-size: 14px; opacity: 0.9;">${escapeHtml(pageData.url)}</div>
    <div style="margin-top: 8px; font-size: 12px; opacity: 0.8;">
      共 ${currentResources.length} 个外部资源
    </div>
  `;
  
  container.innerHTML = '';
  container.appendChild(infoDiv);
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
          size: content.length
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
      
      await loadCurrentResources();
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
    await loadCurrentResources();
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