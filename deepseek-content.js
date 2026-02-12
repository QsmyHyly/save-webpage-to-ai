// deepseek-content.js - DeepSeek 专用内容脚本
// 注入到 chat.deepseek.com 页面，负责接收页面内容并自动填充到输入框

(function() {
  'use strict';

  // 防止重复注入
  if (window.__deepseekContentInjected) {
    return;
  }
  window.__deepseekContentInjected = true;

  console.log('DeepSeek Sidebar: DeepSeek 页面脚本已加载');

  // 初始化
  function init() {
    // 监听来自父窗口的消息（通过 postMessage）
    window.addEventListener('message', handleMessage, false);

    // 检查是否在 iframe 中
    if (window.self !== window.top) {
      console.log('DeepSeek Sidebar: 在 iframe 中运行');
      showNotification('DeepSeek 助手已就绪，等待接收页面内容...');
    }
  }

  // 处理接收到的消息
  function handleMessage(event) {
    // 放宽来源检查：只验证消息格式，不限制 origin
    // 因为 postMessage 已经通过 targetOrigin 限制了目标窗口，接收方无需再限制来源
    const { type, payload } = event.data || {};

    if (type === 'PAGE_CONTENT') {
      console.log('DeepSeek Sidebar: 收到页面内容，来源：', event.origin);
      sendToDeepSeek(payload);
    }
  }

  /**
   * 模拟拖拽上传 HTML 文件
   * @param {string} htmlContent - 完整的 HTML 字符串
   * @param {string} fileName - 文件名
   */
  async function uploadFileAsHTML(htmlContent, fileName = 'page.html') {
    // 尝试多种选择器找到输入框
    const inputSelectors = [
      'textarea[placeholder*="消息"]',
      'textarea[placeholder*="发送"]',
      'textarea[placeholder*="输入"]',
      'textarea',
      '[contenteditable="true"]',
      '.ProseMirror',
      '[role="textbox"]',
      'div[contenteditable]',
      '[data-testid="text-input"]'
    ];

    let inputBox = null;
    for (const selector of inputSelectors) {
      inputBox = document.querySelector(selector);
      if (inputBox) break;
    }

    if (!inputBox) {
      console.error('DeepSeek Sidebar: 未找到输入框，无法上传文件');
      return false;
    }

    // 1. 创建 File 对象
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const file = new File([blob], fileName, { type: 'text/html' });

    // 2. 创建 DataTransfer 并添加文件
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);

    // 3. 触发 drop 事件
    const dropEvent = new DragEvent('drop', {
      bubbles: true,
      cancelable: true,
      dataTransfer: dataTransfer
    });
    inputBox.dispatchEvent(dropEvent);

    console.log('DeepSeek Sidebar: HTML 文件已上传:', fileName);
    return true;
  }

  // 将内容填充到 DeepSeek 输入框并自动发送
  async function sendToDeepSeek(content) {
    // 获取 autoSend 设置，默认为 true
    const autoSend = content.autoSend !== false;

    // 对于 DOM_CONTENT 类型，使用文件上传方式
    if (content.type === 'DOM_CONTENT') {
      const fileName = `${content.title.replace(/[\\/:*?"<>|]/g, '_')}.html`;
      const success = await uploadFileAsHTML(content.html, fileName);

      if (success) {
        if (autoSend) {
          // 等待文件上传完成，然后模拟回车发送
          setTimeout(() => {
            triggerSend();
          }, 500);
          showNotification('HTML 文件已上传并自动发送');
        } else {
          showNotification('HTML 文件已上传，请确认后手动发送');
        }
      } else {
        showNotification('文件上传失败，请重试', true);
      }
      return;
    }

    // 其他类型（备用）使用原有方式
    const message = formatMessage(content);

    // 等待并找到输入框
    const maxAttempts = 30;
    let attempts = 0;

    const tryFillInput = async () => {
      attempts++;

      // 尝试多种选择器找到输入框
      const inputSelectors = [
        'textarea[placeholder*="消息"]',
        'textarea[placeholder*="发送"]',
        'textarea[placeholder*="输入"]',
        'textarea',
        '[contenteditable="true"]',
        '.ProseMirror',
        '[role="textbox"]',
        'div[contenteditable]',
        '.cm-content',
        '.monaco-editor textarea',
        '[data-testid="text-input"]'
      ];

      let inputBox = null;
      for (const selector of inputSelectors) {
        inputBox = document.querySelector(selector);
        if (inputBox) break;
      }

      // 如果还是没找到，尝试通过查找包含 placeholder 的元素
      if (!inputBox) {
        const allInputs = document.querySelectorAll('textarea, [contenteditable="true"], div[contenteditable]');
        for (const input of allInputs) {
          const placeholder = input.getAttribute('placeholder') || input.getAttribute('data-placeholder');
          if (placeholder && (placeholder.includes('消息') || placeholder.includes('发送') || placeholder.includes('输入'))) {
            inputBox = input;
            break;
          }
        }
      }

      if (inputBox) {
        console.log('DeepSeek Sidebar: 找到输入框', inputBox);
        fillInput(inputBox, message);

        if (autoSend) {
          setTimeout(() => {
            triggerSend();
          }, 500);
        } else {
          showNotification('内容已填入输入框，请确认后手动发送');
        }

        return true;
      }

      if (attempts >= maxAttempts) {
        console.error('DeepSeek Sidebar: 未找到输入框');
        showNotification('未找到输入框，请手动粘贴内容', true);

        // 尝试复制到剪贴板作为备用方案
        try {
          await navigator.clipboard.writeText(message);
          showNotification('内容已复制到剪贴板，请手动粘贴', true);
        } catch (e) {
          console.error('复制到剪贴板失败:', e);
        }
        return false;
      }

      // 继续尝试
      setTimeout(tryFillInput, 500);
      return false;
    };

    tryFillInput();
  }

  // 触发发送（点击按钮或模拟回车）
  function triggerSend() {
    // 增强的发送按钮选择器
    const sendButtonSelectors = [
      'button[type="submit"]',
      'button[aria-label*="发送"]',
      'button[aria-label*="send"]',
      'button svg[data-icon="paper-plane"]',
      '.send-button',
      '[data-testid="send-button"]',
      'button[class*="Send"]',
      'button[class*="send"]',
      '.ds-button',
      'button[class*="submit"]',
      'div.b13855df',
      'div[role="button"]:has(svg)',
      '.ds-icon-button',
      'button[role="button"]:last-of-type'
    ];

    let sendButton = null;
    for (const selector of sendButtonSelectors) {
      try {
        sendButton = document.querySelector(selector);
        if (sendButton) break;
      } catch (e) {
        // 某些选择器可能语法错误，跳过
        continue;
      }
    }

    if (sendButton) {
      console.log('DeepSeek Sidebar: 点击发送按钮');
      sendButton.click();
      showNotification('页面内容已自动发送！');
    } else {
      // 尝试模拟回车键
      console.log('DeepSeek Sidebar: 未找到发送按钮，尝试模拟回车键');
      const inputBox = document.querySelector('textarea[placeholder*="消息"]') ||
                       document.querySelector('[contenteditable="true"]');

      if (inputBox) {
        // 尝试 Ctrl+Enter
        const ctrlEnterEvent = new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          which: 13,
          ctrlKey: true,
          bubbles: true,
          cancelable: true
        });
        inputBox.dispatchEvent(ctrlEnterEvent);

        // 200ms 后再试普通回车
        setTimeout(() => {
          const enterEvent = new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true
          });
          inputBox.dispatchEvent(enterEvent);
        }, 200);

        showNotification('已模拟回车发送');
      }
    }
  }

  // 填充输入框
  function fillInput(inputBox, message) {
    // 检查是否是 contenteditable 元素
    if (inputBox.isContentEditable || inputBox.getAttribute('contenteditable') === 'true') {
      // 对于 contenteditable 元素
      inputBox.focus();

      // 清空现有内容
      inputBox.innerHTML = '';

      // 创建文本节点
      const textNode = document.createTextNode(message);
      inputBox.appendChild(textNode);

      // 触发必要的事件
      const events = ['input', 'keydown', 'keyup', 'change'];
      events.forEach(eventType => {
        const event = new Event(eventType, {
          bubbles: true,
          cancelable: true,
          composed: true
        });
        inputBox.dispatchEvent(event);
      });

      // 触发 React 的 onChange 事件（如果适用）
      const tracker = inputBox._valueTracker;
      if (tracker) {
        tracker.setValue('');
      }

    } else if (inputBox.tagName === 'TEXTAREA' || inputBox.tagName === 'INPUT') {
      // 对于普通输入框
      inputBox.focus();
      inputBox.value = message;

      // 触发必要的事件
      const events = ['focus', 'input', 'change', 'keyup', 'keydown'];
      events.forEach(eventType => {
        const event = new Event(eventType, {
          bubbles: true,
          cancelable: true
        });
        inputBox.dispatchEvent(event);
      });

      // 设置光标到末尾
      inputBox.setSelectionRange(message.length, message.length);
    }

    console.log('DeepSeek Sidebar: 输入框已填充');
  }

  // 格式化页面内容为可读文本
  function formatMessage(pageData) {
    // 仅保留 DOM_CONTENT 类型，其他类型不再出现
    return `## 当前页面完整 DOM 树\n\n` +
           `📄 页面标题: ${pageData.title}\n` +
           `🔗 URL: ${pageData.url}\n` +
           `⏱️ 捕获时间: ${pageData.captureTime}\n\n` +
           `\`\`\`html\n` +
           pageData.html +  // 直接使用完整 HTML，无截断
           `\n\`\`\`\n\n` +
           `请分析以上 DOM 结构，告诉我这个页面的 HTML 结构特点、使用的标签和布局方式。`;
  }

  // 显示通知
  function showNotification(message, isError = false) {
    // 移除现有通知
    const existingNotification = document.getElementById('deepseek-sidebar-notification');
    if (existingNotification) {
      existingNotification.remove();
    }

    const notification = document.createElement('div');
    notification.id = 'deepseek-sidebar-notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: ${isError ? '#ff4444' : '#4CAF50'};
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      z-index: 2147483647;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      animation: slideDown 0.3s ease;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    notification.innerText = message;

    // 添加动画样式
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideDown {
        from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
        to { transform: translateX(-50%) translateY(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(notification);

    // 3秒后自动移除
    setTimeout(() => {
      notification.style.animation = 'slideDown 0.3s ease reverse';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // 页面加载完成后执行
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
