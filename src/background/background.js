// background.js - Service Worker
// 负责 IndexedDB 数据库管理和消息处理

// 使用 importScripts 加载依赖脚本
importScripts(
  '../utils/constants.js',
  '../utils/logger.js',
  '../file-system/file-types.js',
  '../file-system/file-entity.js',
  '../file-system/file-storage.js',
  '../file-system/file-manager.js'
);

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

// 文件管理器变量
let fileManager = null;
let fileManagerInitPromise = null;

/**
 * 确保文件管理器已初始化，若未初始化则执行一次初始化
 * @returns {Promise<FileManager>}
 */
async function ensureFileManager() {
  if (fileManager) return fileManager;
  if (fileManagerInitPromise) return fileManagerInitPromise;

  fileManagerInitPromise = (async () => {
    try {
      logger.info('按需初始化文件管理器...');
      const fm = new FileManager({
        dbName: 'FileManagerDB',
        version: 3
      });
      await fm.init();
      fileManager = fm;
      logger.info('文件管理器初始化成功');
      return fm;
    } catch (err) {
      logger.error('文件管理器初始化失败:', err);
      // 重置 promise 以便后续重试
      fileManagerInitPromise = null;
      throw err;
    }
  })();

  return fileManagerInitPromise;
}

// 需要文件管理器的消息类型列表
const NEEDS_FILE_MANAGER = [
  MESSAGE_TYPES.SAVE_FILE,
  MESSAGE_TYPES.SAVE_FILES,
  MESSAGE_TYPES.GET_FILE,
  MESSAGE_TYPES.GET_FILES,
  MESSAGE_TYPES.GET_ALL_FILES,
  MESSAGE_TYPES.GET_FILES_BY_TYPE,
  MESSAGE_TYPES.GET_FILES_BY_URL,
  MESSAGE_TYPES.GET_FILES_BY_SOURCE,
  MESSAGE_TYPES.DELETE_FILE,
  MESSAGE_TYPES.DELETE_FILES,
  MESSAGE_TYPES.CLEAR_ALL_FILES,
  MESSAGE_TYPES.GET_FILE_COUNT,
  MESSAGE_TYPES.DOWNLOAD_FILE,
  MESSAGE_TYPES.RESET_DB
];

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
      // 如果需要文件管理器，确保已初始化
      if (NEEDS_FILE_MANAGER.includes(msg.type)) {
        await ensureFileManager();
      }

      switch (msg.type) {
        case MESSAGE_TYPES.SAVE_FILE:
          if (!fileManager) {
            sendResponse({ status: 'error', message: '文件管理器未初始化' });
            break;
          }
          var fileId = await withTimeout(
            fileManager.saveFile(FileEntity.fromJSON(msg.fileEntity)),
            MESSAGE_TIMEOUT,
            '保存文件超时'
          );
          sendResponse({ status: 'ok', id: fileId });
          break;

        case MESSAGE_TYPES.SAVE_FILES:
          if (!fileManager) {
            sendResponse({ status: 'error', message: '文件管理器未初始化' });
            break;
          }
          var entities = msg.fileEntities.map(function(fe) {
            return FileEntity.fromJSON(fe);
          });
          var fileIds = await withTimeout(
            fileManager.saveFiles(entities),
            MESSAGE_TIMEOUT,
            '批量保存文件超时'
          );
          sendResponse({ status: 'ok', ids: fileIds });
          break;

        case MESSAGE_TYPES.GET_FILE:
          if (!fileManager) {
            sendResponse({ status: 'error', message: '文件管理器未初始化' });
            break;
          }
          var file = await withTimeout(
            fileManager.getFile(msg.id),
            MESSAGE_TIMEOUT,
            '获取文件超时'
          );
          sendResponse(file ? file.toJSON() : null);
          break;

        case MESSAGE_TYPES.GET_FILES:
          if (!fileManager) {
            sendResponse({ status: 'error', message: '文件管理器未初始化' });
            break;
          }
          var files = await withTimeout(
            fileManager.getFiles(msg.ids),
            MESSAGE_TIMEOUT,
            '获取文件超时'
          );
          sendResponse(files.map(function(f) { return f.toJSON(); }));
          break;

        case MESSAGE_TYPES.GET_ALL_FILES:
          if (!fileManager) {
            sendResponse({ status: 'error', message: '文件管理器未初始化' });
            break;
          }
          var allFiles = await withTimeout(
            fileManager.getAllFiles(),
            MESSAGE_TIMEOUT,
            '获取所有文件超时'
          );
          sendResponse(allFiles.map(function(f) { return f.toJSON(); }));
          break;

        case MESSAGE_TYPES.GET_FILES_BY_TYPE:
          if (!fileManager) {
            sendResponse({ status: 'error', message: '文件管理器未初始化' });
            break;
          }
          var filesByType = await withTimeout(
            fileManager.getFilesByType(msg.fileType),
            MESSAGE_TIMEOUT,
            '按类型获取文件超时'
          );
          sendResponse(filesByType.map(function(f) { return f.toJSON(); }));
          break;

        case MESSAGE_TYPES.GET_FILES_BY_URL:
        case MESSAGE_TYPES.GET_FILES_BY_SOURCE:
          if (!fileManager) {
            sendResponse({ status: 'error', message: '文件管理器未初始化' });
            break;
          }
          var filesByUrl = await withTimeout(
            fileManager.getFilesByUrl(msg.url),
            MESSAGE_TIMEOUT,
            '按URL获取文件超时'
          );
          sendResponse(filesByUrl.map(function(f) { return f.toJSON(); }));
          break;

        case MESSAGE_TYPES.DELETE_FILE:
          if (!fileManager) {
            sendResponse({ status: 'error', message: '文件管理器未初始化' });
            break;
          }
          await withTimeout(
            fileManager.deleteFile(msg.id),
            MESSAGE_TIMEOUT,
            '删除文件超时'
          );
          sendResponse({ status: 'ok' });
          break;

        case MESSAGE_TYPES.DELETE_FILES:
          if (!fileManager) {
            sendResponse({ status: 'error', message: '文件管理器未初始化' });
            break;
          }
          await withTimeout(
            fileManager.deleteFiles(msg.ids),
            MESSAGE_TIMEOUT,
            '批量删除文件超时'
          );
          sendResponse({ status: 'ok' });
          break;

        case MESSAGE_TYPES.CLEAR_ALL_FILES:
          if (!fileManager) {
            sendResponse({ status: 'error', message: '文件管理器未初始化' });
            break;
          }
          await withTimeout(
            fileManager.clearAllFiles(),
            MESSAGE_TIMEOUT,
            '清空所有文件超时'
          );
          sendResponse({ status: 'ok' });
          break;

        case MESSAGE_TYPES.GET_FILE_COUNT:
          if (!fileManager) {
            sendResponse({ status: 'error', message: '文件管理器未初始化' });
            break;
          }
          var count = await withTimeout(
            fileManager.getFileCount(),
            MESSAGE_TIMEOUT,
            '获取文件数量超时'
          );
          sendResponse(count);
          break;

        case MESSAGE_TYPES.CREATE_FILE_FROM_HTML:
          var htmlFile = FileEntity.fromHTML(msg.html, msg.url, msg.title);
          sendResponse(htmlFile.toJSON());
          break;

        case MESSAGE_TYPES.CREATE_FILE_FROM_RESOURCE:
          var resourceFile = FileEntity.fromResource(msg.resource);
          sendResponse(resourceFile.toJSON());
          break;

        case MESSAGE_TYPES.RESET_DB:
          if (fileManager) {
            await fileManager.init();
          }
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

// 预热初始化（非必须，但可提前打开数据库）
chrome.runtime.onInstalled.addListener(function() {
  logger.info('DeepSeek Page Manager 已安装');
  ensureFileManager().catch(err => logger.error('预热初始化失败:', err));
});

self.addEventListener('activate', function() {
  logger.info('Service Worker 激活');
  ensureFileManager().catch(err => logger.error('激活时初始化失败:', err));
});
