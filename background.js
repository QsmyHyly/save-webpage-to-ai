// background.js - Service Worker
// 负责 IndexedDB 数据库管理和消息处理

// 使用 importScripts 加载依赖脚本（Service Worker 不支持 ES 模块 import）
importScripts('constants.js', 'db-manager.js');

chrome.runtime.onInstalled.addListener(() => {
  console.log('DeepSeek Page Manager 已安装');
  dbManager.init().catch(console.error);
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      switch (msg.type) {
        case 'GET_ALL_PAGES':
          const pages = await dbManager.getAllPages();
          sendResponse(pages);
          break;

        case 'SAVE_PAGE':
          const id = await dbManager.savePage(msg.data);
          sendResponse({ status: 'ok', id });
          break;

        case 'DELETE_PAGE':
          await dbManager.deletePage(msg.id);
          sendResponse({ status: 'ok' });
          break;

        case 'FIND_PAGE_BY_URL':
          const found = await dbManager.findPageByUrl(msg.url);
          sendResponse(found);
          break;

        case 'CLEAR_ALL_PAGES':
          await dbManager.clearAllPages();
          sendResponse({ status: 'ok' });
          break;

        case 'GET_RESOURCES_BY_PAGE_ID':
          const resources = await dbManager.getResourcesByPageId(msg.pageId);
          sendResponse(resources);
          break;

        case 'GET_ALL_RESOURCES':
          const allResources = await dbManager.getAllResources();
          sendResponse(allResources);
          break;

        case 'GET_RESOURCE_BY_ID':
          const resource = await dbManager.getResourceById(msg.id);
          sendResponse(resource);
          break;

        case 'SAVE_RESOURCES':
          const ids = await dbManager.saveResources(msg.resources);
          sendResponse({ status: 'ok', ids });
          break;

        case 'DELETE_RESOURCE':
          await dbManager.deleteResource(msg.id);
          sendResponse({ status: 'ok' });
          break;

        case 'DELETE_RESOURCES_BY_PAGE_ID':
          await dbManager.deleteResourcesByPageId(msg.pageId);
          sendResponse({ status: 'ok' });
          break;

        default:
          sendResponse({ status: 'error', message: '未知消息类型' });
      }
    } catch (error) {
      console.error('处理消息失败:', error);
      sendResponse({ status: 'error', message: error.message });
    }
  })();

  return true;
});

self.addEventListener('activate', () => {
  dbManager.init().catch(console.error);
});
