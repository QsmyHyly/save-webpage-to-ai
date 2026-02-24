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
 * 生成包含资源的完整 HTML
 * @param {Object} page - 页面对象
 * @param {Array} resources - 资源数组
 * @returns {string} 完整的 HTML
 */
function generateCompleteHtml(page, resources) {
  let html = page.html;
  
  // 内联 CSS
  const cssResources = resources.filter(r => r.type === 'css' && r.content);
  cssResources.forEach(cssRes => {
    const styleTag = `<style data-resource-id="${cssRes.id}">\n${cssRes.content}\n</style>`;
    html = html.replace(
      `<link href="${cssRes.url}" rel="stylesheet">`,
      styleTag
    );
  });
  
  // 内联 JavaScript
  const jsResources = resources.filter(r => r.type === 'js' && r.content);
  jsResources.forEach(jsRes => {
    const scriptTag = `<script data-resource-id="${jsRes.id}">\n${jsRes.content}\n</script>`;
    html = html.replace(
      `<script src="${jsRes.url}">`,
      scriptTag
    );
  });
  
  // 内联图片
  const imageResources = resources.filter(r => r.type === 'image' && r.content);
  imageResources.forEach(imgRes => {
    html = html.replace(
      `src="${imgRes.url}"`,
      `src="${imgRes.content}"`
    );
  });
  
  return html;
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
 * 上传文件为 HTML 到输入框
 * @param {string} htmlContent - HTML 内容
 * @param {string} fileName - 文件名
 * @returns {Promise<boolean>} 是否成功
 */
async function uploadFileAsHTML(htmlContent, fileName) {
  const file = new File([htmlContent], fileName, { type: 'text/html' });
  
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);
  
  const fileInput = document.querySelector('input[type="file"]');
  if (fileInput) {
    fileInput.files = dataTransfer.files;
    const event = new Event('change', { bubbles: true });
    fileInput.dispatchEvent(event);
    return true;
  }
  
  return false;
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
