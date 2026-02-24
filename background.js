// background.js - Service Worker
// 负责 IndexedDB 数据库管理和消息处理

// 使用 importScripts 加载依赖脚本（Service Worker 不支持 ES 模块 import）
importScripts('constants.js', 'db-manager.js', 'logger.js');

// 日志级别配置
const LOG_LEVEL = 'info'; // 'debug', 'info', 'warn', 'error' 或 false 关闭

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

chrome.runtime.onInstalled.addListener(function() {
  logger.info('DeepSeek Page Manager 已安装');
  dbManager.init().catch(function(err) {
    logger.error('数据库初始化失败:', err);
  });
});

// 统一消息监听器
chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
  // 处理日志消息
  if (msg.type === 'LOGGER_MESSAGE') {
    if (!LOG_LEVEL || LOG_LEVELS[msg.level] >= LOG_LEVELS[LOG_LEVEL]) {
      var time = new Date(msg.timestamp).toISOString();
      var prefix = '[' + time + '] [' + msg.source + ']';
      console[msg.level](prefix, msg.message);
    }
    return false; // 不需要响应
  }

  // 原有业务消息处理
  (async function() {
    try {
      switch (msg.type) {
        case 'GET_ALL_PAGES':
          var pages = await dbManager.getAllPages();
          sendResponse(pages);
          break;

        case 'SAVE_PAGE':
          var id = await dbManager.savePage(msg.data);
          sendResponse({ status: 'ok', id: id });
          break;

        case 'DELETE_PAGE':
          await dbManager.deletePage(msg.id);
          sendResponse({ status: 'ok' });
          break;

        case 'FIND_PAGE_BY_URL':
          var found = await dbManager.findPageByUrl(msg.url);
          sendResponse(found);
          break;

        case 'CLEAR_ALL_PAGES':
          await dbManager.clearAllPages();
          sendResponse({ status: 'ok' });
          break;

        case 'GET_RESOURCES_BY_PAGE_ID':
          var resources = await dbManager.getResourcesByPageId(msg.pageId);
          sendResponse(resources);
          break;

        case 'GET_ALL_RESOURCES':
          var allResources = await dbManager.getAllResources();
          sendResponse(allResources);
          break;

        case 'GET_RESOURCE_BY_ID':
          var resource = await dbManager.getResourceById(msg.id);
          sendResponse(resource);
          break;

        case 'SAVE_RESOURCES':
          var ids = await dbManager.saveResources(msg.resources);
          sendResponse({ status: 'ok', ids: ids });
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
      logger.error('处理消息失败:', error);
      sendResponse({ status: 'error', message: error.message });
    }
  })();

  return true; // 异步响应
});

self.addEventListener('activate', function() {
  logger.info('Service Worker 激活');
  dbManager.init().catch(function(err) {
    logger.error('数据库初始化失败:', err);
  });
});
