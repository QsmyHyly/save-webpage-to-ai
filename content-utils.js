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
 * 查找发送按钮 - 多重选择器冗余查找
 * @returns {Element|null} 发送按钮元素
 */
function findSendButton() {
  // DeepSeek 发送按钮选择器（多重冗余）
  const deepseekSelectors = [
    // 方案1: aria-label
    'button[aria-label="发送"]',
    'button[aria-label="Send"]',
    // 方案2: 基于角色和 SVG 图标（向上箭头）
    'div[role="button"]:not([aria-disabled="true"])',
    'div[role="button"]:not([aria-disabled="false"])',
    // 方案3: DeepSeek 特定类名
    '.ds-icon-button:not([aria-disabled="true"])',
    '.ds-icon-button:not([aria-disabled="false"])',
    // 方案4: 查找包含向上箭头的按钮
    'div[role="button"] svg path[d^="M8.3125"]',
    // 方案5: 通用的发送按钮
    'button[type="submit"]',
    // 方案6: 查找包含发送图标的元素
    '[data-testid="send-button"]',
    // 方案7: 查找发送按钮容器
    '.send-button',
    '.submit-button'
  ];
  
  // 千问发送按钮选择器
  const qianwenSelectors = [
    // 方案1: 千问特定类名
    '.operateBtn-JsB9e2:not(.disabled-ZaDDJC)',
    '.operateBtn:not(.disabled)',
    // 方案2: 包含发送图标的元素
    '[data-icon-type="qwpcicon-sendChat"]',
    // 方案3: 通用的发送按钮
    'button[type="submit"]',
    // 方案4: 查找发送按钮容器
    '.send-button',
    '.submit-button',
    '.send-btn'
  ];
  
  // 合并所有选择器
  const allSelectors = [...deepseekSelectors, ...qianwenSelectors];
  
  for (const selector of allSelectors) {
    try {
      const btn = document.querySelector(selector);
      if (btn && isSendButton(btn)) {
        logger.info('找到发送按钮:', selector, btn);
        return btn;
      }
    } catch (e) {
      // 忽略无效选择器
    }
  }
  
  // 最后尝试：查找任何看起来像发送按钮的元素
  return findSendButtonFallback();
}

/**
 * 判断元素是否是发送按钮
 * @param {Element} btn - 待检测元素
 * @returns {boolean} 是否是发送按钮
 */
function isSendButton(btn) {
  // 检查是否包含禁用属性
  if (btn.hasAttribute('aria-disabled') && btn.getAttribute('aria-disabled') === 'true') {
    return false;
  }
  if (btn.disabled) {
    return false;
  }
  
  // 检查是否包含禁用类
  const className = btn.className || '';
  if (typeof className === 'string' && className.includes('disabled')) {
    return false;
  }
  
  // 检查文本内容
  const text = btn.textContent?.toLowerCase() || '';
  if (text.includes('发送') || text.includes('send') || text.includes('提交')) {
    return true;
  }
  
  // 检查 SVG 图标（向上箭头）
  const svg = btn.querySelector('svg');
  if (svg) {
    const path = svg.querySelector('path');
    if (path && path.getAttribute('d')) {
      const d = path.getAttribute('d');
      // 向上箭头的特征
      if (d.includes('M8.3125') || d.includes('M7 ') || d.includes('M12')) {
        return true;
      }
    }
  }
  
  return true; // 无法确定时返回 true
}

/**
 * 后备发送按钮查找方法
 * @returns {Element|null}
 */
function findSendButtonFallback() {
  // 查找所有可点击的元素
  const candidates = document.querySelectorAll('[role="button"], button, div[class*="send"], div[class*="Submit"]');
  
  for (const btn of candidates) {
    if (isSendButton(btn)) {
      logger.info('后备方案找到发送按钮:', btn);
      return btn;
    }
  }
  
  return null;
}

/**
 * 查找输入框元素 - 多重选择器冗余查找
 * @returns {Element|null} 输入框元素
 */
function findInputBox() {
  const selectors = [
    // DeepSeek 和千问的隐藏 file input
    'input[type="file"]',
    // 带 name 属性的
    'input[name="file"]',
    // 其他可能的
    'input[data-testid="file-input"]',
    'input[data-testid="file-upload"]'
  ];
  
  for (const selector of selectors) {
    const input = document.querySelector(selector);
    if (input) {
      logger.info('找到文件输入框:', selector, input);
      return input;
    }
  }
  
  return null;
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
    logger.error('未找到文件输入框');
    return false;
  }
  
  logger.info('设置文件:', fileName, '类型:', blob.type);
  
  inputBox.files = dataTransfer.files;
  
  // 触发 change 事件
  const changeEvent = new Event('change', { bubbles: true });
  inputBox.dispatchEvent(changeEvent);
  
  // 额外触发 input 事件增强兼容性
  const inputEvent = new Event('input', { bubbles: true });
  inputBox.dispatchEvent(inputEvent);
  
  logger.info('文件上传事件已触发');
  return true;
}

/**
 * 等待发送按钮变为可用
 * @param {number} timeout - 超时时间（毫秒）
 * @returns {Promise<Element|null>}
 */
async function waitForSendButton(timeout = 5000) {
  const start = Date.now();
  
  while (Date.now() - start < timeout) {
    const sendBtn = findSendButton();
    if (sendBtn && isSendButton(sendBtn)) {
      logger.info('发送按钮已可用');
      return sendBtn;
    }
    await new Promise(r => setTimeout(r, 200));
  }
  
  logger.warn('等待发送按钮超时');
  return null;
}

/**
 * 触发发送按钮点击
 * @param {string} selector - 发送按钮选择器（已弃用，使用多重查找）
 */
async function triggerSend(selector = null) {
  // 尝试等待发送按钮可用
  const sendBtn = await waitForSendButton(3000);
  
  if (sendBtn) {
    logger.info('点击发送按钮');
    sendBtn.click();
  } else {
    // 如果等待失败，直接尝试查找并点击
    const btn = findSendButton();
    if (btn) {
      logger.info('直接点击发送按钮');
      btn.click();
    } else {
      logger.error('未能找到发送按钮');
    }
  }
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
