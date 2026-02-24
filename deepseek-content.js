// deepseek-content.js - DeepSeek 专用内容脚本
// 注入到 chat.deepseek.com 页面，负责接收来自 popup 的上传请求

(function() {
  'use strict';

  // 防止重复注入
  if (window.__deepseekContentInjected) {
    return;
  }
  window.__deepseekContentInjected = true;

  console.log('DeepSeek Page Uploader: DeepSeek 页面脚本已加载');

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

  function generateCompleteHtml(page, resources) {
    let html = page.html;
    
    const cssResources = resources.filter(r => r.type === 'css' && r.content);
    cssResources.forEach(cssRes => {
      const styleTag = `<style data-resource-id="${cssRes.id}">\n${cssRes.content}\n</style>`;
      html = html.replace(
        `<link href="${cssRes.url}" rel="stylesheet">`,
        styleTag
      );
    });
    
    const jsResources = resources.filter(r => r.type === 'js' && r.content);
    jsResources.forEach(jsRes => {
      const scriptTag = `<script data-resource-id="${jsRes.id}">\n${jsRes.content}\n</script>`;
      html = html.replace(
        `<script src="${jsRes.url}">`,
        scriptTag
      );
    });
    
    const imageResources = resources.filter(r => r.type === 'image' && r.content);
    imageResources.forEach(imgRes => {
      html = html.replace(
        `src="${imgRes.url}"`,
        `src="${imgRes.content}"`
      );
    });
    
    return html;
  }

  // 上传 HTML 文件到 DeepSeek
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
      console.error('DeepSeek Page Uploader: 未找到输入框，无法上传文件');
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

    console.log('DeepSeek Page Uploader: HTML 文件已上传:', fileName);
    return true;
  }

  // 触发发送
  function triggerSend() {
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
        continue;
      }
    }

    if (sendButton) {
      console.log('DeepSeek Page Uploader: 点击发送按钮');
      sendButton.click();
      return true;
    } else {
      // 尝试模拟回车键
      const inputBox = document.querySelector('textarea[placeholder*="消息"]') ||
                       document.querySelector('[contenteditable="true"]');

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
        return true;
      }
    }
    return false;
  }

  // 显示通知
  function showNotification(message, isError = false) {
    const existingNotification = document.getElementById('deepseek-uploader-notification');
    if (existingNotification) {
      existingNotification.remove();
    }

    const notification = document.createElement('div');
    notification.id = 'deepseek-uploader-notification';
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

        console.log(`DeepSeek Page Uploader: 收到上传请求，共 ${pages.length} 个页面`);
        showNotification(`开始上传 ${pages.length} 个页面...`);

        for (let i = 0; i < pages.length; i++) {
          const page = pages[i];
          const fileName = `${page.title.replace(/[\\/:*?"<>|]/g, '_')}.html`;

          const resources = await chrome.runtime.sendMessage({
            type: 'GET_RESOURCES_BY_PAGE_ID',
            pageId: page.id
          });

          const completeHtml = generateCompleteHtml(page, resources);

          const metadata = {
            url: page.url,
            title: page.title,
            savedAt: new Date(page.savedAt).toISOString(),
            originalSize: page.size,
            resourcesCount: resources.length,
            resourcesIncluded: resources.map(r => ({
              type: r.type,
              url: r.url,
              size: r.size
            })),
            capturedFrom: '保存网页并发送给deepseek或千问'
          };

          const wrappedHtml = wrapHtmlWithMetadata(completeHtml, metadata);

          try {
            const success = await uploadFileAsHTML(wrappedHtml, fileName);
            if (success) {
              successCount++;
              await new Promise(r => setTimeout(r, 800));
              triggerSend();
              await new Promise(r => setTimeout(r, 600));
            } else {
              console.error('上传失败:', page.title);
            }
          } catch (error) {
            console.error('上传出错:', error);
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
      console.log('DeepSeek Page Uploader: 页面加载完成，已就绪');
    });
  } else {
    console.log('DeepSeek Page Uploader: 页面已加载，已就绪');
  }
})();
