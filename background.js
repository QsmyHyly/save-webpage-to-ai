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

// 消息处理超时时间（毫秒）
const MESSAGE_TIMEOUT = 5000;

chrome.runtime.onInstalled.addListener(function() {
  logger.info('DeepSeek Page Manager 已安装');
  dbManager.init().catch(function(err) {
    logger.error('数据库初始化失败:', err);
  });
});

// 带超时的异步操作包装器
function withTimeout(promise, timeoutMs, errorMessage) {
  return new Promise(function(resolve, reject) {
    var timeoutId = setTimeout(function() {
      reject(new Error(errorMessage || '操作超时'));
    }, timeoutMs);

    promise
      .then(function(result) {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch(function(error) {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

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
          var pages = await withTimeout(
            dbManager.getAllPages(),
            MESSAGE_TIMEOUT,
            '获取页面列表超时'
          );
          sendResponse(pages);
          break;

        case 'SAVE_PAGE':
          var id = await withTimeout(
            dbManager.savePage(msg.data),
            MESSAGE_TIMEOUT,
            '保存页面超时'
          );
          sendResponse({ status: 'ok', id: id });
          break;

        case 'DELETE_PAGE':
          await withTimeout(
            dbManager.deletePage(msg.id),
            MESSAGE_TIMEOUT,
            '删除页面超时'
          );
          sendResponse({ status: 'ok' });
          break;

        case 'FIND_PAGE_BY_URL':
          var found = await withTimeout(
            dbManager.findPageByUrl(msg.url),
            MESSAGE_TIMEOUT,
            '查找页面超时'
          );
          sendResponse(found);
          break;

        case 'CLEAR_ALL_PAGES':
          await withTimeout(
            dbManager.clearAllPages(),
            MESSAGE_TIMEOUT,
            '清空页面超时'
          );
          sendResponse({ status: 'ok' });
          break;

        case 'GET_RESOURCES_BY_PAGE_ID':
          var resources = await withTimeout(
            dbManager.getResourcesByPageId(msg.pageId),
            MESSAGE_TIMEOUT,
            '获取资源列表超时'
          );
          sendResponse(resources);
          break;

        case 'GET_ALL_RESOURCES':
          var allResources = await withTimeout(
            dbManager.getAllResources(),
            MESSAGE_TIMEOUT,
            '获取所有资源超时'
          );
          sendResponse(allResources);
          break;

        case 'GET_RESOURCE_BY_ID':
          var resource = await withTimeout(
            dbManager.getResourceById(msg.id),
            MESSAGE_TIMEOUT,
            '获取资源超时'
          );
          sendResponse(resource);
          break;

        case 'SAVE_RESOURCES':
          var ids = await withTimeout(
            dbManager.saveResources(msg.resources),
            MESSAGE_TIMEOUT,
            '保存资源超时'
          );
          sendResponse({ status: 'ok', ids: ids });
          break;

        case 'DELETE_RESOURCE':
          await withTimeout(
            dbManager.deleteResource(msg.id),
            MESSAGE_TIMEOUT,
            '删除资源超时'
          );
          sendResponse({ status: 'ok' });
          break;

        case 'DELETE_RESOURCES_BY_PAGE_ID':
          await withTimeout(
            dbManager.deleteResourcesByPageId(msg.pageId),
            MESSAGE_TIMEOUT,
            '删除页面资源超时'
          );
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
