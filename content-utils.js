// content-utils.js - 内容脚本共享工具模块
// 包含 deepseek-content.js 和 qianwen-uploader.js 的公共函数

// 格式化文件大小
function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * 将元数据以 HTML 注释形式添加到原始 HTML 内容最前面
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

/**
 * 准备文件内容，为文本类型添加元数据注释
 * @param {Object} resource - 资源对象
 * @returns {Blob} 处理后的 Blob 对象
 */
function prepareFileContent(resource) {
  const { content, type, metadata, mimeType } = resource;
  
  // 文本类型添加元数据注释
  if (['css', 'js', 'html', 'other'].includes(type) && typeof content === 'string') {
    const metaComment = formatMetadataComment(metadata, type);
    return new Blob([metaComment + content], { type: mimeType || 'text/plain' });
  }
  
  // 二进制（如图片）将 base64 转换为 Blob
  if (typeof content === 'string' && content.startsWith('data:')) {
    const [meta, data] = content.split(',');
    const byteString = atob(data);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeType || 'application/octet-stream' });
  }
  
  return new Blob([content], { type: mimeType || 'application/octet-stream' });
}

/**
 * 显示通知
 * @param {string} message - 通知消息
 */
function showNotification(message) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 3000);
}

/**
 * 查找输入框元素
 * @returns {Element|null} 输入框元素
 */
function findInputBox() {
  // DeepSeek 输入框
  let inputBox = document.querySelector('input[type="file"]');
  if (inputBox) return inputBox;
  
  // 通义千问输入框
  inputBox = document.querySelector('input[type="file"]');
  return inputBox;
}

/**
 * 上传文件到输入框
 * @param {Blob} blob - 文件内容
 * @param {string} fileName - 文件名
 * @returns {Promise<boolean>} 是否成功
 */
async function uploadFile(blob, fileName) {
  const file = new File([blob], fileName, { type: blob.type });
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);
  
  const inputBox = findInputBox();
  if (!inputBox) {
    console.error('未找到文件输入框');
    return false;
  }
  
  inputBox.files = dataTransfer.files;
  const event = new Event('change', { bubbles: true });
  inputBox.dispatchEvent(event);
  
  return true;
}

/**
 * 触发发送按钮点击
 * @param {string} selector - 发送按钮选择器
 */
function triggerSend(selector = 'button[aria-label="发送"]') {
  setTimeout(() => {
    const sendBtn = document.querySelector(selector);
    if (sendBtn) {
      sendBtn.click();
    }
  }, 100);
}

// 添加动画样式
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);
