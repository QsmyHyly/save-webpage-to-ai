// 工具函数：主题、标签页、平台检测等

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

// 获取当前标签页
async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// 检查内容脚本是否就绪
async function isContentScriptReady(tabId, timeout = 1000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), timeout);
    chrome.tabs.sendMessage(tabId, { type: 'PING' }, (response) => {
      clearTimeout(timer);
      if (chrome.runtime.lastError) {
        resolve(false);
      } else {
        resolve(response && response.pong === true);
      }
    });
  });
}

// 检查当前页面是否是目标 AI 平台
async function checkPlatformStatus() {
  currentTab = await getCurrentTab();
  const url = currentTab?.url || '';
  
  if (url.includes('chat.deepseek.com')) {
    isTargetPage = true;
    currentPlatform = 'deepseek';
  } else if (url.includes('qianwen.com') || url.includes('qwen.ai')) {
    isTargetPage = true;
    currentPlatform = 'qianwen';
  } else {
    isTargetPage = false;
    currentPlatform = null;
  }
  
  updateStatusUI();
}

// 更新状态 UI
function updateStatusUI() {
  const indicator = document.getElementById('statusIndicator');
  const statusText = document.getElementById('statusText');
  const uploadBtn = document.getElementById('uploadSelectedBtn');
  
  if (isTargetPage) {
    indicator.classList.add('active');
    const platformName = currentPlatform === 'deepseek' ? 'DeepSeek' : '通义千问';
    statusText.textContent = `当前平台: ${platformName}`;
    uploadBtn.disabled = false;
    uploadBtn.textContent = `📤 上传到 ${platformName}`;
  } else {
    indicator.classList.remove('active');
    statusText.textContent = '未在 DeepSeek 或通义千问页面';
    uploadBtn.disabled = true;
    uploadBtn.textContent = '📤 上传到 DeepSeek';
  }
}

// ==================== debugger 模式工具函数 ====================

function attachDebugger(tabId) {
  return new Promise((resolve, reject) => {
    chrome.debugger.attach({ tabId }, "1.3", () => {
      if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
      else resolve();
    });
  });
}

function detachDebugger(tabId) {
  return new Promise((resolve) => {
    chrome.debugger.detach({ tabId }, () => resolve());
  });
}

function sendDebuggerCommand(tabId, method, params) {
  return new Promise((resolve, reject) => {
    chrome.debugger.sendCommand({ tabId }, method, params, (result) => {
      if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
      else resolve(result);
    });
  });
}

function escapeHtml(value) {
  if (value === undefined || value === null) return '';
  const str = String(value);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function cdpNodeToHTML(node) {
  const nodeType = node.nodeType;

  if (nodeType === 9) {
    let html = '';
    if (node.children) {
      for (const child of node.children) {
        html += cdpNodeToHTML(child);
      }
    }
    return html;
  }

  if (nodeType === 1) {
    const tagName = node.nodeName.toLowerCase();
    let html = '<' + tagName;

    if (node.attributes && node.attributes.length) {
      for (let i = 0; i < node.attributes.length; i += 2) {
        const attrName = node.attributes[i];
        const attrValue = node.attributes[i + 1];
        const escapedValue = escapeHtml(attrValue);
        html += ` ${attrName}="${escapedValue}"`;
      }
    }
    html += '>';

    if (node.children) {
      for (const child of node.children) {
        html += cdpNodeToHTML(child);
      }
    }

    if (node.shadowRoots) {
      for (const shadowRoot of node.shadowRoots) {
        let shadowHtml = '';
        if (shadowRoot.children) {
          for (const child of shadowRoot.children) {
            shadowHtml += cdpNodeToHTML(child);
          }
        }
        html += `<template shadowrootmode="${shadowRoot.mode}">${shadowHtml}</template>`;
      }
    }

    html += '</' + tagName + '>';
    return html;
  }

  if (nodeType === 3) {
    return node.nodeValue || '';
  }

  return '';
}

function getDoctypeFromNode(node) {
  if (node.nodeType === 9) {
    if (node.doctype) {
      const { name, publicId, systemId } = node.doctype;
      if (publicId && systemId) {
        return `<!DOCTYPE ${name} PUBLIC "${publicId}" "${systemId}">`;
      } else if (publicId) {
        return `<!DOCTYPE ${name} PUBLIC "${publicId}">`;
      } else if (systemId) {
        return `<!DOCTYPE ${name} SYSTEM "${systemId}">`;
      } else {
        return `<!DOCTYPE ${name}>`;
      }
    }
  }
  return '<!DOCTYPE html>';
}
