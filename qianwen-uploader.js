// qianwen-uploader.js - 通义千问专用内容脚本
// 注入到通义千问页面，负责接收来自 popup 的上传请求

(function() {
  'use strict';

  // 防止重复注入
  if (window.__qianwenUploaderInjected) {
    return;
  }
  window.__qianwenUploaderInjected = true;

  console.log('通义千问上传器已加载');

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

  // 查找输入框（可拖拽目标）
  function findInputBox() {
    const selectors = [
      'div[contenteditable="true"].slate-editor',
      'div[role="textbox"][contenteditable="true"]',
      '.slateEditorWrapper [contenteditable="true"]',
      '.slate-textarea [contenteditable="true"]',
      '.ProseMirror',
      'textarea',
      '[contenteditable="true"]'
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  // 查找发送按钮
  function findSendButton() {
    const selectors = [
      'button[aria-label*="发送"]',
      'button[class*="operateBtn"]',
      '.send-button',
      '[data-testid="send-button"]',
      'button[type="submit"]'
    ];
    for (const sel of selectors) {
      const btn = document.querySelector(sel);
      if (btn) return btn;
    }
    return null;
  }

  // 上传 HTML 文件（模拟拖拽）
  async function uploadFileAsHTML(htmlContent, fileName = 'page.html') {
    const inputBox = findInputBox();
    if (!inputBox) {
      console.error('通义千问上传器: 未找到输入框');
      return false;
    }

    // 创建 File 对象
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const file = new File([blob], fileName, { type: 'text/html' });

    // 构造拖拽事件
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    const dropEvent = new DragEvent('drop', {
      bubbles: true,
      cancelable: true,
      dataTransfer: dataTransfer
    });

    inputBox.dispatchEvent(dropEvent);
    console.log('通义千问上传器: 文件已拖拽到输入框:', fileName);
    return true;
  }

  // 触发发送
  function triggerSend() {
    const sendBtn = findSendButton();
    if (sendBtn) {
      // 如果按钮有 disabled 属性，等待一段时间再试
      if (sendBtn.disabled) {
        setTimeout(() => {
          if (!sendBtn.disabled) {
            sendBtn.click();
            console.log('通义千问上传器: 发送按钮已点击');
          }
        }, 500);
      } else {
        sendBtn.click();
        console.log('通义千问上传器: 发送按钮已点击');
      }
    } else {
      // 尝试模拟回车
      const inputBox = findInputBox();
      if (inputBox) {
        const enterEvent = new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          which: 13,
          bubbles: true,
          cancelable: true
        });
        inputBox.dispatchEvent(enterEvent);
        console.log('通义千问上传器: 已模拟回车发送');
      }
    }
  }

  // 显示通知
  function showNotification(message, isError = false) {
    const existingNotification = document.getElementById('qianwen-uploader-notification');
    if (existingNotification) {
      existingNotification.remove();
    }

    const notification = document.createElement('div');
    notification.id = 'qianwen-uploader-notification';
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

    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideDown {
        from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
        to { transform: translateX(-50%) translateY(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideDown 0.3s ease reverse';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // 监听来自 popup 的消息
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'UPLOAD_PAGES') {
      (async () => {
        const pages = msg.pages;
        let successCount = 0;

        console.log(`通义千问上传器: 收到上传请求，共 ${pages.length} 个页面`);
        showNotification(`开始上传 ${pages.length} 个页面...`);

        for (let i = 0; i < pages.length; i++) {
          const page = pages[i];
          const fileName = `${page.title.replace(/[\\/:*?"<>|]/g, '_')}.html`;

          // 构造元数据对象
          const metadata = {
            url: page.url,
            title: page.title,
            savedAt: new Date(page.savedAt).toISOString(),
            originalSize: page.size,
            capturedFrom: '保存网页并发送给deepseek或千问'
          };

          // 包装 HTML
          const wrappedHtml = wrapHtmlWithMetadata(page.html, metadata);

          try {
            const success = await uploadFileAsHTML(wrappedHtml, fileName);
            if (success) {
              successCount++;
              // 等待文件处理（通义千问可能需要一点时间解析文件）
              await new Promise(r => setTimeout(r, 1000));
              triggerSend();
              await new Promise(r => setTimeout(r, 800));
            } else {
              console.error('通义千问上传器: 上传失败:', page.title);
            }
          } catch (err) {
            console.error('通义千问上传器: 上传出错', err);
          }
        }

        showNotification(`成功上传 ${successCount}/${pages.length} 个页面`);
        sendResponse({ status: 'ok', count: successCount });
      })();
      return true;
    }
  });

  // 页面加载完成后显示就绪通知
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      console.log('通义千问上传器: 页面加载完成，已就绪');
    });
  } else {
    console.log('通义千问上传器: 页面已加载，已就绪');
  }
})();
