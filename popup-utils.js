// popup-utils.js - 弹窗页面通用工具模块
// 为 popup.html 和 resources.html 提供共享的工具函数

// 格式化文件大小
function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// HTML 转义
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 获取资源图标
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

// 显示空状态（页面列表）
function showEmptyState(message) {
  const container = document.getElementById('pageList');
  container.innerHTML = `
    <div class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 2 2h12a2 2 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
      </svg>
      <p>${message}</p>
    </div>
  `;
}

// 显示资源空状态
function showResourceEmptyState(message) {
  const container = document.getElementById('resourceList');
  container.innerHTML = `
    <div class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
      </svg>
      <p>${message}</p>
    </div>
  `;
}

// 将元数据以 HTML 注释形式添加到原始 HTML 内容最前面
function wrapHtmlWithMetadata(originalHtml, metadata) {
  const metaComment = `<!--\n  PageMetadata: ${JSON.stringify(metadata, null, 2)}\n-->`;
  return metaComment + '\n' + originalHtml;
}
