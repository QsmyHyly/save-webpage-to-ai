// resources.js
let allPages = [];
let currentResources = [];
let currentPageId = null;
let currentResourcesData = null;

// 解析 URL 参数
const urlParams = new URLSearchParams(window.location.search);
const pageUrl = urlParams.get('url');

// 如果 MESSAGE_TYPES 未定义，直接抛出错误，避免静默失败
if (typeof MESSAGE_TYPES === 'undefined') {
  throw new Error('MESSAGE_TYPES 未定义，请确保 constants.js 已正确加载');
}

// 默认主题配置
const DEFAULT_THEME_COLORS = {
  primaryColor: '#667eea',
  primaryDark: '#5568d3',
  dangerColor: '#dc3545',
  successColor: '#28a745',
  infoColor: '#17a2b8',
  gradientStart: '#667eea',
  gradientEnd: '#764ba2'
};

// 应用主题到页面
async function applyTheme() {
  try {
    const result = await chrome.storage.sync.get('themeColors');
    const colors = result.themeColors || DEFAULT_THEME_COLORS;
    
    const root = document.documentElement;
    root.style.setProperty('--primary-color', colors.primaryColor);
    root.style.setProperty('--primary-dark', colors.primaryDark);
    root.style.setProperty('--danger-color', colors.dangerColor);
    root.style.setProperty('--success-color', colors.successColor);
    root.style.setProperty('--info-color', colors.infoColor);
    root.style.setProperty('--gradient-start', colors.gradientStart);
    root.style.setProperty('--gradient-end', colors.gradientEnd);
  } catch (e) {
    logger.error('应用主题失败:', e);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  // 应用主题
  await applyTheme();
  await loadCurrentResources();
  bindEvents();
});

// 加载资源（使用新的文件系统 API）
async function loadCurrentResources() {
  const container = document.getElementById('resourcesList');
  container.innerHTML = '<div class="empty-state">加载中...</div>';

  try {
    // 从文件系统获取已保存的资源
    const allFiles = await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.GET_ALL_FILES
    });

    if (!Array.isArray(allFiles)) {
      showResourceEmptyState('resourcesList', '加载失败');
      return;
    }

    // 过滤出非 HTML 文件
    let resources = allFiles
      .filter(f => f.type !== 'html')
      .map(f => ({
        id: f.id,
        url: f.source?.url || '',
        type: f.type,
        size: f.size,
        content: f.content,
        metadata: {
          filename: f.name,
          sourcePageUrl: f.metadata?.sourcePageUrl || f.source?.url,
          sourcePageTitle: f.metadata?.sourcePageTitle || f.source?.title,
          savedAt: f.createdAt,
          ...f.metadata
        }
      }));

    // 如果存在 pageUrl，则只筛选 sourcePageUrl 匹配的资源
    if (pageUrl) {
      resources = resources.filter(r => r.metadata.sourcePageUrl === pageUrl);
      renderPageResources(resources, pageUrl);
    } else {
      currentResources = resources;
      renderAllResources();
    }
  } catch (error) {
    logger.error('加载资源失败:', error);
    showResourceEmptyState('resourcesList', '加载失败: ' + error.message);
  }
}

function renderAllResources() {
  const container = document.getElementById('resourcesList');
  container.innerHTML = '';

  if (currentResources.length === 0) {
    showResourceEmptyState('resourcesList', '没有保存的资源');
    return;
  }

  const pageGroups = {};
  currentResources.forEach(resource => {
    let pageId = resource.metadata?.sourcePageUrl || 'unknown';
    let pageTitle = resource.metadata?.sourcePageTitle || '未知页面';

    if (!pageGroups[pageId]) {
      pageGroups[pageId] = {
        title: pageTitle,
        url: pageId,
        resources: []
      };
    }
    pageGroups[pageId].resources.push(resource);
  });

  Object.keys(pageGroups).forEach(pageId => {
    const group = pageGroups[pageId];
    const pageHeader = document.createElement('div');
    pageHeader.style.cssText = `
      background: #f0f0f0;
      padding: 8px 12px;
      margin: 16px 0 8px 0;
      border-radius: 4px;
      font-weight: 600;
      color: #333;
      display: flex;
      justify-content: space-between;
    `;
    pageHeader.innerHTML = `
      <span>📄 ${escapeHtml(group.title)}</span>
      <span style="font-size: 12px; color: #666;">${escapeHtml(group.url)}</span>
    `;
    container.appendChild(pageHeader);

    group.resources.forEach(resource => {
      const div = createResourceElement(resource);
      container.appendChild(div);
    });
  });
}

// 渲染特定页面的资源
function renderPageResources(resources, pageUrl) {
  const container = document.getElementById('resourcesList');
  container.innerHTML = '';

  if (resources.length === 0) {
    showResourceEmptyState('resourcesList', '该页面暂无保存的资源');
    return;
  }

  // 显示页面信息
  const pageTitle = resources[0]?.metadata.sourcePageTitle || pageUrl;
  const infoDiv = document.createElement('div');
  infoDiv.style.cssText = `
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 16px;
    border-radius: 8px;
    margin-bottom: 20px;
  `;
  infoDiv.innerHTML = `
    <h2 style="margin: 0 0 8px 0; font-size: 18px;">📄 ${escapeHtml(pageTitle)}</h2>
    <div style="font-size: 14px; opacity: 0.9;">${escapeHtml(pageUrl)}</div>
    <div style="margin-top: 8px; font-size: 12px; opacity: 0.8;">
      共 ${resources.length} 个资源
    </div>
  `;
  container.appendChild(infoDiv);

  resources.forEach(resource => {
    const div = createResourceElement(resource);
    container.appendChild(div);
  });
}

function createResourceElement(resource) {
  const div = document.createElement('div');
  div.className = 'resource-item';
  div.style.cursor = 'pointer';
  
  const icon = getResourceIcon(resource.type);
  const sizeText = resource.size ? formatSize(resource.size) : '未知大小';
  const durationText = resource.duration ? `加载时间: ${resource.duration.toFixed(0)}ms` : '';
  
  div.innerHTML = `
    <input type="checkbox" class="resource-checkbox" data-id="${resource.id}">
    <div class="resource-icon ${resource.type}">${icon}</div>
    <div class="resource-info">
      <div class="resource-url" title="${escapeHtml(resource.url)}">${escapeHtml(resource.url)}</div>
      <div class="resource-meta">
        ${escapeHtml(resource.metadata?.filename || '')} | ${sizeText}
        ${durationText ? `<span style="margin-left: 8px; color: #999;">${durationText}</span>` : ''}
      </div>
    </div>
  `;
  
  div.addEventListener('click', (e) => {
    if (e.target.classList.contains('resource-checkbox')) {
      return;
    }
    const checkbox = div.querySelector('.resource-checkbox');
    checkbox.checked = !checkbox.checked;
    updateDeleteButtonState();
  });

  return div;
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

function renderResources() {
  const container = document.getElementById('resourcesList');
  
  showPageInfo(currentResourcesData);
  
  if (currentResources.length === 0) {
    showResourceEmptyState('resourcesList', '该页面没有外部资源');
    return;
  }
  
  currentResources.forEach(resource => {
    const div = createResourceElement(resource);
    container.appendChild(div);
  });
}

function guessMimeType(url) {
  const ext = url.split('.').pop().split('?')[0].toLowerCase();
  if (typeof MIME_TYPES !== 'undefined') {
    const mimeMap = {
      'png': MIME_TYPES.PNG,
      'jpg': MIME_TYPES.JPG,
      'jpeg': MIME_TYPES.JPEG,
      'gif': MIME_TYPES.GIF,
      'svg': MIME_TYPES.SVG,
      'webp': MIME_TYPES.WEBP,
      'ico': MIME_TYPES.ICO
    };
    return mimeMap[ext] || 'image/*';
  }
  
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

// 删除选中的资源
async function deleteSelectedResources() {
  const checkboxes = document.querySelectorAll('.resource-checkbox:checked');
  const ids = Array.from(checkboxes).map(cb => cb.dataset.id);
  if (ids.length === 0) return alert('请至少选择一个资源');

  if (!confirm(`确定删除选中的 ${ids.length} 个资源吗？`)) return;

  try {
    await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.DELETE_FILES, ids });
    await loadCurrentResources();
    updateDeleteButtonState();
  } catch (error) {
    logger.error('删除资源失败:', error);
    alert('删除失败: ' + error.message);
  }
}

// 删除资源（使用新的文件系统 API）
async function deleteResource(savedId) {
  if (!confirm('确定要删除这个资源吗？')) {
    return;
  }
  
  try {
    // 使用新消息删除
    await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.DELETE_FILE,
      id: savedId
    });
    await loadCurrentResources();
  } catch (error) {
    logger.error('删除资源失败:', error);
    alert('删除失败: ' + error.message);
  }
}

function selectAll() {
  document.querySelectorAll('.resource-checkbox:not(:disabled)').forEach(cb => cb.checked = true);
  updateDeleteButtonState();
}

function deselectAll() {
  document.querySelectorAll('.resource-checkbox').forEach(cb => cb.checked = false);
  updateDeleteButtonState();
}

function updateDeleteButtonState() {
  const checkedCount = document.querySelectorAll('.resource-checkbox:checked').length;
  document.getElementById('deleteSelectedBtn').disabled = checkedCount === 0;
}

function bindEvents() {
  document.getElementById('selectAllBtn').addEventListener('click', selectAll);
  document.getElementById('deselectAllBtn').addEventListener('click', deselectAll);
  document.getElementById('deleteSelectedBtn').addEventListener('click', deleteSelectedResources);

  document.addEventListener('change', (e) => {
    if (e.target.classList.contains('resource-checkbox')) {
      updateDeleteButtonState();
    }
  });
}
