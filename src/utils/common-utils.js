// common-utils.js - 公共工具函数
// 供 popup.html、resources.html 等页面使用
//
// 注意：核心工具函数已迁移到 shared-utils.js
// 此文件保留特定于 popup/resources 页面的工具函数

// ============================================================================
// 引入共享工具（通过 script 标签加载 shared-utils.js 后可用）
// ============================================================================

// formatSize, escapeHtml, wrapHtmlWithMetadata 等函数在 shared-utils.js 中定义
// 如果 shared-utils.js 已加载，这些函数可直接使用

// 降级实现（当 shared-utils.js 未加载时）
if (typeof formatSize !== 'function') {
  function formatSize(bytes) {
    if (!bytes && bytes !== 0) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
}

if (typeof escapeHtml !== 'function') {
  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// ============================================================================
// 页面特定工具函数
// ============================================================================

/**
 * 获取资源图标（使用 constants.js 中的常量）
 * @param {string} type - 资源类型
 * @returns {string} 图标字符
 */
function getResourceIcon(type) {
  // 如果 constants.js 已加载，使用 RESOURCE_ICONS
  if (typeof RESOURCE_ICONS !== 'undefined') {
    return RESOURCE_ICONS[type] || RESOURCE_ICONS.other;
  }
  // 降级方案
  const icons = {
    css: '🎨',
    js: '📜',
    image: '🖼️',
    font: '🔤',
    other: '📄'
  };
  return icons[type] || icons.other;
}

/**
 * 显示空状态（页面列表）
 * @param {string} containerId - 容器元素 ID
 * @param {string} message - 提示消息
 */
function showEmptyState(containerId, message) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = `
    <div class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
      </svg>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

/**
 * 显示资源空状态
 * @param {string} containerId - 容器元素 ID
 * @param {string} message - 提示消息
 */
function showResourceEmptyState(containerId, message) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = `
    <div class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
      </svg>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}
