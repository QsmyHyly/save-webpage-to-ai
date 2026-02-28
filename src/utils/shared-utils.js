// shared-utils.js - 共享工具函数库
// 
// 此文件定义所有模块共用的工具函数，作为"单一事实来源"
// 
// 使用说明：
// - popup/resources 页面：通过 <script> 标签加载此文件
// - 内容脚本 (content-scripts)：由于运行在隔离环境，需要在 content-utils.js 中复制实现
// - html-cleaner.js：由于运行在 popup 环境，可直接使用此文件
// - Service Worker：通过 importScripts 加载
//
// 重要：修改此文件中的函数时，需要同步更新以下文件：
// - src/content/content-utils.js (内容脚本环境)
// - src/utils/html-cleaner.js (如果有独立实现)

// ============================================================================
// 格式化函数
// ============================================================================

/**
 * 格式化文件大小
 * @param {number} bytes - 字节数
 * @returns {string} 格式化后的大小
 */
function formatSize(bytes) {
  if (!bytes && bytes !== 0) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * 格式化日期时间
 * @param {Date|string|number} date - 日期对象或时间戳
 * @returns {string} 格式化后的日期时间
 */
function formatDateTime(date) {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

/**
 * 格式化相对时间
 * @param {Date|string|number} date - 日期对象或时间戳
 * @returns {string} 相对时间描述
 */
function formatRelativeTime(date) {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const now = new Date();
  const diff = now - d;
  
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return Math.floor(diff / 60000) + ' 分钟前';
  if (diff < 86400000) return Math.floor(diff / 3600000) + ' 小时前';
  if (diff < 604800000) return Math.floor(diff / 86400000) + ' 天前';
  
  return formatDateTime(d);
}

// ============================================================================
// HTML 处理函数
// ============================================================================

/**
 * HTML 转义
 * @param {string} text - 原始文本
 * @returns {string} 转义后的文本
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * 将元数据以 HTML 注释形式添加到 HTML 内容最前面
 * @param {string} originalHtml - 原始 HTML 内容
 * @param {Object} metadata - 元数据对象
 * @returns {string} 包装后的 HTML
 */
function wrapHtmlWithMetadata(originalHtml, metadata) {
  const metaComment = `<!--\n  PageMetadata: ${JSON.stringify(metadata, null, 2)}\n-->`;
  return metaComment + '\n' + originalHtml;
}

/**
 * 格式化资源元数据注释
 * @param {Object} metadata - 元数据对象
 * @param {string} type - 资源类型 (css, js, html, other)
 * @returns {string} 格式化后的注释
 */
function formatMetadataComment(metadata, type) {
  const json = JSON.stringify(metadata, null, 2);
  if (type === 'css') return `/*\n  ResourceMetadata: ${json}\n*/\n`;
  if (type === 'js') return `// ResourceMetadata: ${json}\n`;
  return `<!--\n  ResourceMetadata: ${json}\n-->\n`;
}

// ============================================================================
// UI 辅助函数
// ============================================================================

/**
 * 显示通知
 * @param {string} message - 通知消息
 * @param {string} type - 通知类型 (success, error, info, warning)
 * @param {number} duration - 显示时长（毫秒）
 */
function showNotification(message, type = 'info', duration = 3000) {
  const colors = {
    success: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    error: 'linear-gradient(135deg, #eb3349 0%, #f45c43 100%)',
    warning: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    info: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  };
  
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${colors[type] || colors.info};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    font-size: 14px;
    font-weight: 500;
    animation: slideIn 0.3s ease-out;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, duration);
}

// ============================================================================
// 导出
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    formatSize,
    formatDateTime,
    formatRelativeTime,
    escapeHtml,
    wrapHtmlWithMetadata,
    formatMetadataComment,
    showNotification
  };
}
