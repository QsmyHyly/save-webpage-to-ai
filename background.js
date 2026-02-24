// background.js - Service Worker
// 负责 IndexedDB 数据库管理和消息处理

let db = null;
const DB_NAME = 'PageCacheDB';
const PAGES_STORE = 'pages';
const RESOURCES_STORE = 'resources';
const DB_VERSION = 2;

// 初始化数据库
function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const database = e.target.result;
      
      // pages store
      if (!database.objectStoreNames.contains(PAGES_STORE)) {
        const store = database.createObjectStore(PAGES_STORE, { keyPath: 'id' });
        store.createIndex('savedAt', 'savedAt', { unique: false });
        store.createIndex('url', 'url', { unique: false });
      }
      
      // resources store
      if (!database.objectStoreNames.contains(RESOURCES_STORE)) {
        const store = database.createObjectStore(RESOURCES_STORE, { keyPath: 'id' });
        store.createIndex('pageId', 'pageId', { unique: false });
        store.createIndex('type', 'type', { unique: false });
        store.createIndex('savedAt', 'savedAt', { unique: false });
      }
    };

    request.onsuccess = (e) => {
      db = e.target.result;
      console.log('IndexedDB 初始化成功');
      resolve(db);
    };

    request.onerror = (e) => {
      console.error('IndexedDB 初始化失败:', e.target.error);
      reject(e.target.error);
    };
  });
}

// 确保数据库已初始化
async function ensureDB() {
  if (!db) {
    await initDB();
  }
  return db;
}

// 获取所有页面
async function getAllPages() {
  const database = await ensureDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(PAGES_STORE, 'readonly');
    const store = tx.objectStore(PAGES_STORE);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// 保存页面
async function savePage(data) {
  const database = await ensureDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(PAGES_STORE, 'readwrite');
    const store = tx.objectStore(PAGES_STORE);

    // 生成唯一 ID
    data.id = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    data.savedAt = Date.now();

    const req = store.add(data);
    req.onsuccess = () => resolve(data.id);
    req.onerror = () => reject(req.error);
  });
}

// 删除页面
async function deletePage(id) {
  const database = await ensureDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(PAGES_STORE, 'readwrite');
    const store = tx.objectStore(PAGES_STORE);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// 根据 URL 查找页面
async function findPageByUrl(url) {
  const database = await ensureDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(PAGES_STORE, 'readonly');
    const store = tx.objectStore(PAGES_STORE);
    const index = store.index('url');
    const req = index.getAll(url);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// 清空所有页面
async function clearAllPages() {
  const database = await ensureDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(PAGES_STORE, 'readwrite');
    const store = tx.objectStore(PAGES_STORE);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// 获取某个页面的所有资源
async function getResourcesByPageId(pageId) {
  const database = await ensureDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(RESOURCES_STORE, 'readonly');
    const store = tx.objectStore(RESOURCES_STORE);
    const index = store.index('pageId');
    const req = index.getAll(pageId);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// 保存单个资源
async function saveResource(resource) {
  const database = await ensureDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(RESOURCES_STORE, 'readwrite');
    const store = tx.objectStore(RESOURCES_STORE);
    
    resource.id = resource.id || `res-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    resource.savedAt = resource.savedAt || Date.now();
    
    const req = store.put(resource);
    req.onsuccess = () => resolve(resource.id);
    req.onerror = () => reject(req.error);
  });
}

// 批量保存资源
async function saveResources(resources) {
  const ids = [];
  for (const resource of resources) {
    const id = await saveResource(resource);
    ids.push(id);
  }
  return ids;
}

// 删除资源
async function deleteResource(id) {
  const database = await ensureDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(RESOURCES_STORE, 'readwrite');
    const store = tx.objectStore(RESOURCES_STORE);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// 删除某个页面的所有资源
async function deleteResourcesByPageId(pageId) {
  const database = await ensureDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(RESOURCES_STORE, 'readwrite');
    const store = tx.objectStore(RESOURCES_STORE);
    const index = store.index('pageId');
    const req = index.getAllKeys(pageId);
    req.onsuccess = () => {
      const keys = req.result;
      keys.forEach(key => store.delete(key));
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
}

// 安装时初始化
chrome.runtime.onInstalled.addListener(() => {
  console.log('DeepSeek Page Manager 已安装');
  initDB().catch(console.error);
});

// 监听消息
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      switch (msg.type) {
        case 'GET_ALL_PAGES':
          const pages = await getAllPages();
          sendResponse(pages);
          break;

        case 'SAVE_PAGE':
          const id = await savePage(msg.data);
          sendResponse({ status: 'ok', id });
          break;

        case 'DELETE_PAGE':
          await deletePage(msg.id);
          sendResponse({ status: 'ok' });
          break;

        case 'FIND_PAGE_BY_URL':
          const found = await findPageByUrl(msg.url);
          sendResponse(found);
          break;

        case 'CLEAR_ALL_PAGES':
          await clearAllPages();
          sendResponse({ status: 'ok' });
          break;

        case 'GET_RESOURCES_BY_PAGE_ID':
          const resources = await getResourcesByPageId(msg.pageId);
          sendResponse(resources);
          break;

        case 'SAVE_RESOURCES':
          const ids = await saveResources(msg.resources);
          sendResponse({ status: 'ok', ids });
          break;

        case 'DELETE_RESOURCE':
          await deleteResource(msg.id);
          sendResponse({ status: 'ok' });
          break;

        case 'DELETE_RESOURCES_BY_PAGE_ID':
          await deleteResourcesByPageId(msg.pageId);
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

// Service Worker 启动时初始化数据库
self.addEventListener('activate', () => {
  initDB().catch(console.error);
});
