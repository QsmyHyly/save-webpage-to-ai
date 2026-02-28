// background.js - Service Worker
// 负责 IndexedDB 数据库管理和消息处理

// 使用 importScripts 加载依赖脚本（Service Worker 不支持 ES 模块 import）
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

let fileManager = null;

chrome.runtime.onInstalled.addListener(async function() {
  logger.info('DeepSeek Page Manager 已安装');
  
  try {
    fileManager = new FileManager({
      dbName: 'FileManagerDB',
      version: 2  // 升级版本号以触发迁移
    });
    
    await fileManager.init();
    logger.info('文件管理器初始化成功');
    
    // 执行数据迁移（如果有旧数据）
    await migrateLegacyData();
  } catch (err) {
    logger.error('文件管理器初始化失败:', err);
  }
});

// 迁移旧数据
async function migrateLegacyData() {
  try {
    // 检查是否已完成迁移
    const result = await chrome.storage.local.get('migrationCompleted');
    if (result.migrationCompleted) {
      logger.info('数据迁移已完成，跳过');
      return;
    }
    
    // 检查是否有旧数据库
    const legacyDB = await openLegacyDB();
    if (!legacyDB) {
      logger.info('未检测到旧数据');
      return;
    }
    
    logger.info('检测到旧数据，开始迁移...');
    
    // 迁移 pages
    const pages = await getAllLegacyPages(legacyDB);
    for (const page of pages) {
      try {
        const fileEntity = FileEntity.fromHTML(page.html, page.url, page.title);
        fileEntity.metadata.legacyId = page.id;
        fileEntity.metadata.savedAt = page.savedAt;
        fileEntity.createdAt = page.savedAt || Date.now();
        await fileManager.saveFile(fileEntity);
      } catch (err) {
        logger.error('迁移页面失败:', page.id, err);
      }
    }
    
    // 迁移 resources
    const resources = await getAllLegacyResources(legacyDB);
    for (const resource of resources) {
      try {
        const fileEntity = FileEntity.fromResource({
          url: resource.url,
          content: resource.content,
          fileName: resource.metadata?.filename || 'resource',
          metadata: resource.metadata
        });
        fileEntity.metadata.legacyId = resource.id;
        fileEntity.metadata.savedAt = resource.savedAt;
        fileEntity.createdAt = resource.savedAt || Date.now();
        await fileManager.saveFile(fileEntity);
      } catch (err) {
        logger.error('迁移资源失败:', resource.id, err);
      }
    }
    
    logger.info(`迁移完成: ${pages.length} 个页面, ${resources.length} 个资源`);
    
    // 关闭旧数据库
    legacyDB.close();
    
    // 标记迁移完成
    await chrome.storage.local.set({ migrationCompleted: true });
    
    // 可选：删除旧数据库
    // await deleteLegacyDB();
  } catch (err) {
    logger.error('迁移失败:', err);
  }
}

// 打开旧数据库
async function openLegacyDB() {
  return new Promise((resolve) => {
    const request = indexedDB.open('PageCacheDB', 2);
    
    request.onsuccess = (e) => {
      const db = e.target.result;
      // 检查是否有旧数据存储
      if (db.objectStoreNames.contains('pages') || db.objectStoreNames.contains('resources')) {
        resolve(db);
      } else {
        db.close();
        resolve(null);
      }
    };
    
    request.onerror = () => {
      resolve(null);
    };
    
    request.onupgradeneeded = (e) => {
      // 如果是新数据库，不需要迁移
      e.target.result.close();
      resolve(null);
    };
  });
}

// 获取所有旧页面
async function getAllLegacyPages(db) {
  return new Promise((resolve, reject) => {
    if (!db.objectStoreNames.contains('pages')) {
      resolve([]);
      return;
    }
    
    const transaction = db.transaction('pages', 'readonly');
    const store = transaction.objectStore('pages');
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

// 获取所有旧资源
async function getAllLegacyResources(db) {
  return new Promise((resolve, reject) => {
    if (!db.objectStoreNames.contains('resources')) {
      resolve([]);
      return;
    }
    
    const transaction = db.transaction('resources', 'readonly');
    const store = transaction.objectStore('resources');
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

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
        // === 新文件系统消息 ===
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

        case MESSAGE_TYPES.GET_ALL_FILES:
          if (!fileManager) {
            sendResponse({ status: 'error', message: '文件管理器未初始化' });
            break;
          }
          var files = await withTimeout(
            fileManager.getAllFiles(),
            MESSAGE_TIMEOUT,
            '获取所有文件超时'
          );
          sendResponse(files.map(function(f) { return f.toJSON(); }));
          break;

        case MESSAGE_TYPES.GET_FILES_BY_TYPE:
          if (!fileManager) {
            sendResponse({ status: 'error', message: '文件管理器未初始化' });
            break;
          }
          var filesByType = await withTimeout(
            fileManager.getFilesByType(msg.type),
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

        // === 兼容旧消息（内部转换为新系统）===
        case MESSAGE_TYPES.GET_ALL_PAGES:
          // 从 FileStorage 获取所有 HTML 类型的文件
          if (!fileManager) {
            sendResponse([]);
            break;
          }
          var htmlFiles = await withTimeout(
            fileManager.getFilesByType('html'),
            MESSAGE_TIMEOUT,
            '获取页面列表超时'
          );
          // 转换为旧格式以保持兼容性
          var pages = htmlFiles.map(function(f) {
            return {
              id: f.id,
              title: f.source?.title || f.metadata?.title || 'Untitled',
              url: f.source?.url || f.metadata?.url || '',
              savedAt: f.createdAt,
              size: f.size,
              html: f.content
            };
          });
          sendResponse(pages);
          break;

        case MESSAGE_TYPES.SAVE_PAGE:
          // 将旧格式转换为 FileEntity 并保存
          if (!fileManager) {
            sendResponse({ status: 'error', message: '文件管理器未初始化' });
            break;
          }
          var pageData = msg.data;
          var fileEntity = FileEntity.fromHTML(
            pageData.html,
            pageData.url,
            pageData.title
          );
          fileEntity.metadata.originalSize = pageData.size;
          var savedId = await withTimeout(
            fileManager.saveFile(fileEntity),
            MESSAGE_TIMEOUT,
            '保存页面超时'
          );
          sendResponse({ status: 'ok', id: savedId });
          break;

        case MESSAGE_TYPES.DELETE_PAGE:
          // 删除文件
          if (!fileManager) {
            sendResponse({ status: 'error', message: '文件管理器未初始化' });
            break;
          }
          await withTimeout(
            fileManager.deleteFile(msg.id),
            MESSAGE_TIMEOUT,
            '删除页面超时'
          );
          sendResponse({ status: 'ok' });
          break;

        case MESSAGE_TYPES.FIND_PAGE_BY_URL:
          // 通过 URL 查找页面
          if (!fileManager) {
            sendResponse([]);
            break;
          }
          var filesBySourceUrl = await withTimeout(
            fileManager.getFilesByUrl(msg.url),
            MESSAGE_TIMEOUT,
            '查找页面超时'
          );
          var matchingPages = filesBySourceUrl
            .filter(function(f) { return f.type === 'html'; })
            .map(function(f) {
              return {
                id: f.id,
                title: f.source?.title || f.metadata?.title || 'Untitled',
                url: f.source?.url || f.metadata?.url || '',
                savedAt: f.createdAt,
                size: f.size,
                html: f.content
              };
            });
          sendResponse(matchingPages);
          break;

        case MESSAGE_TYPES.CLEAR_ALL_PAGES:
          // 清空所有 HTML 文件
          if (!fileManager) {
            sendResponse({ status: 'error', message: '文件管理器未初始化' });
            break;
          }
          var allFiles = await fileManager.getAllFiles();
          var htmlFileIds = allFiles
            .filter(function(f) { return f.type === 'html'; })
            .map(function(f) { return f.id; });
          if (htmlFileIds.length > 0) {
            await fileManager.deleteFiles(htmlFileIds);
          }
          sendResponse({ status: 'ok' });
          break;

        case MESSAGE_TYPES.GET_ALL_RESOURCES:
          // 从 FileStorage 获取所有非 HTML 类型的文件
          if (!fileManager) {
            sendResponse([]);
            break;
          }
          var allFilesForResources = await withTimeout(
            fileManager.getAllFiles(),
            MESSAGE_TIMEOUT,
            '获取所有资源超时'
          );
          var nonHtmlFiles = allFilesForResources
            .filter(function(f) { return f.type !== 'html'; })
            .map(function(f) {
              return {
                id: f.id,
                url: f.source?.url || '',
                type: f.type,
                size: f.size,
                content: f.content,
                metadata: {
                  filename: f.name,
                  sourcePageUrl: f.source?.url,
                  sourcePageTitle: f.source?.title,
                  savedAt: f.createdAt,
                  ...f.metadata
                }
              };
            });
          sendResponse(nonHtmlFiles);
          break;

        case MESSAGE_TYPES.GET_RESOURCE_BY_ID:
          // 获取单个资源
          if (!fileManager) {
            sendResponse(null);
            break;
          }
          var resourceFile = await withTimeout(
            fileManager.getFile(msg.id),
            MESSAGE_TIMEOUT,
            '获取资源超时'
          );
          if (!resourceFile) {
            sendResponse(null);
            break;
          }
          // 转换为旧格式
          sendResponse({
            id: resourceFile.id,
            url: resourceFile.source?.url || '',
            type: resourceFile.type,
            size: resourceFile.size,
            content: resourceFile.content,
            metadata: {
              filename: resourceFile.name,
              sourcePageUrl: resourceFile.source?.url,
              sourcePageTitle: resourceFile.source?.title,
              savedAt: resourceFile.createdAt,
              ...resourceFile.metadata
            }
          });
          break;

        case MESSAGE_TYPES.SAVE_RESOURCES:
          // 批量保存资源
          if (!fileManager) {
            sendResponse({ status: 'error', message: '文件管理器未初始化' });
            break;
          }
          var resourceEntities = msg.resources.map(function(r) {
            return FileEntity.fromResource({
              url: r.url,
              content: r.content,
              fileName: r.metadata?.filename || 'resource',
              metadata: r.metadata
            });
          });
          var savedIds = await withTimeout(
            fileManager.saveFiles(resourceEntities),
            MESSAGE_TIMEOUT,
            '保存资源超时'
          );
          sendResponse({ status: 'ok', ids: savedIds });
          break;

        case MESSAGE_TYPES.DELETE_RESOURCE:
          // 删除资源
          if (!fileManager) {
            sendResponse({ status: 'error', message: '文件管理器未初始化' });
            break;
          }
          await withTimeout(
            fileManager.deleteFile(msg.id),
            MESSAGE_TIMEOUT,
            '删除资源超时'
          );
          sendResponse({ status: 'ok' });
          break;

        case MESSAGE_TYPES.RESET_DB:
          // 重新初始化文件管理器
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
      if (msg.type === MESSAGE_TYPES.GET_ALL_PAGES || 
          msg.type === MESSAGE_TYPES.GET_ALL_RESOURCES || 
          msg.type === MESSAGE_TYPES.GET_RESOURCES_BY_PAGE_ID || 
          msg.type === MESSAGE_TYPES.GET_RESOURCE_BY_ID || 
          msg.type === MESSAGE_TYPES.FIND_PAGE_BY_URL) {
        sendResponse([]);
      } else {
        sendResponse({ status: 'error', message: error.message });
      }
    }
  })();

  return true; // 异步响应
});

self.addEventListener('activate', function() {
  logger.info('Service Worker 激活');
  
  // 初始化文件管理器
  if (!fileManager) {
    try {
      fileManager = new FileManager({
        dbName: 'FileManagerDB',
        version: 2
      });
      
      fileManager.init().then(function() {
        logger.info('文件管理器初始化成功');
      }).catch(function(err) {
        logger.error('文件管理器初始化失败:', err);
      });
    } catch (err) {
      logger.error('创建文件管理器失败:', err);
    }
  }
});
