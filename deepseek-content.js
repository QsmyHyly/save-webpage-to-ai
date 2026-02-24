// deepseek-content.js - DeepSeek 专用内容脚本
// 注入到 chat.deepseek.com 页面，负责接收来自 popup 的上传请求

(function() {
  'use strict';

  // 防止重复注入
  if (window.__deepseekContentInjected) {
    return;
  }
  window.__deepseekContentInjected = true;

  logger.info('DeepSeek Page Uploader: DeepSeek 页面脚本已加载');

  // 监听来自 popup 的消息
  chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
    if (msg.type === 'PING') {
      sendResponse({ pong: true });
      return true;
    }
    
    if (msg.type === 'UPLOAD_ITEMS') {
      (async function() {
        var items = msg.items;
        var successCount = 0;

        logger.info('DeepSeek Page Uploader: 收到上传请求，共 ' + items.length + ' 个项目');
        showNotification('开始上传 ' + items.length + ' 个项目...');

        for (var i = 0; i < items.length; i++) {
          var item = items[i];
          try {
            var blob, fileName;

            if (item.kind === 'page') {
              // 处理页面
              var page = item.data;
              fileName = page.title.replace(/[\\/:*?"<>|]/g, '_') + '.html';

              var metadata = {
                url: page.url,
                title: page.title,
                savedAt: new Date(page.savedAt).toISOString(),
                originalSize: page.size,
                capturedFrom: '保存网页并发送给deepseek或千问'
              };

              var wrappedHtml = wrapHtmlWithMetadata(page.html, metadata);
              blob = new Blob([wrappedHtml], { type: 'text/html' });

            } else if (item.kind === 'resource') {
              // 处理资源
              var resource = await chrome.runtime.sendMessage({
                type: 'GET_RESOURCE_BY_ID',
                id: item.id
              });

              if (!resource) {
                logger.error('获取资源失败:', item.id);
                continue;
              }

              blob = prepareFileContent(resource);
              fileName = resource.metadata ? resource.metadata.filename : 'resource';

            } else {
              continue;
            }

            if (await uploadFile(blob, fileName)) {
              successCount++;
              await new Promise(function(r) { setTimeout(r, 800); });
              triggerSend();
              await new Promise(function(r) { setTimeout(r, 600); });
            }
          } catch (error) {
            logger.error('上传出错:', error);
          }
        }

        showNotification('成功上传 ' + successCount + '/' + items.length + ' 个项目');
        sendResponse({ status: 'ok', count: successCount });
      })();

      return true;
    }
  });

  // 页面加载完成后显示就绪通知
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      logger.info('DeepSeek Page Uploader: 页面加载完成，已就绪');
    });
  } else {
    logger.info('DeepSeek Page Uploader: 页面已加载，已就绪');
  }
})();
