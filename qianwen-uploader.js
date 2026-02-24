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
              await new Promise(r => setTimeout(r, 1000));
              triggerSend();
              await new Promise(r => setTimeout(r, 800));
            } else {
              console.error('通义千问上传器: 上传失败:', page.title);
            }
          } catch (error) {
            console.error('通义千问上传器: 上传出错', error);
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
