// background.js - Service Worker
// 负责 IndexedDB 数据库管理和消息处理

let db = null;
const DB_NAME = 'PageCacheDB';
const STORE_NAME = 'pages';
const DB_VERSION = 1;

// 初始化数据库
function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const database = e.target.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('savedAt', 'savedAt', { unique: false });
        store.createIndex('url', 'url', { unique: false });
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
    const tx = database.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// 保存页面
async function savePage(data) {
  const database = await ensureDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

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
    const tx = database.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// 根据 URL 查找页面
async function findPageByUrl(url) {
  const database = await ensureDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
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
    const tx = database.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.clear();
    req.onsuccess = () => resolve();
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

        default:
          sendResponse({ status: 'error', message: '未知消息类型' });
      }
    } catch (error) {
      console.error('处理消息失败:', error);
      sendResponse({ status: 'error', message: error.message });
    }
  })();

  return true; // 保持异步响应
});

// Service Worker 启动时初始化数据库
self.addEventListener('activate', () => {
  initDB().catch(console.error);
});
