// db-manager.js - IndexedDB 数据库管理类
// 封装所有数据库操作，提高可维护性和复用性

class DBManager {
  constructor(dbName, version) {
    this.dbName = dbName;
    this.version = version;
    this.db = null;
    this.stores = {};
  }

  /**
   * 初始化数据库
   * @returns {Promise<IDBDatabase>}
   */
  async init() {
    if (this.db) {
      return this.db;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onupgradeneeded = (e) => {
        const database = e.target.result;
        
        // 创建 pages store
        if (!database.objectStoreNames.contains('pages')) {
          const store = database.createObjectStore('pages', { keyPath: 'id' });
          store.createIndex('savedAt', 'savedAt', { unique: false });
          store.createIndex('url', 'url', { unique: false });
        }
        
        // 创建 resources store
        if (!database.objectStoreNames.contains('resources')) {
          const store = database.createObjectStore('resources', { keyPath: 'id' });
          store.createIndex('pageId', 'pageId', { unique: false });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('savedAt', 'savedAt', { unique: false });
        }
      };

      request.onsuccess = (e) => {
        this.db = e.target.result;
        console.log('IndexedDB 初始化成功');
        resolve(this.db);
      };

      request.onerror = (e) => {
        console.error('IndexedDB 初始化失败:', e.target.error);
        reject(e.target.error);
      };
    });
  }

  /**
   * 确保数据库已初始化
   * @returns {Promise<IDBDatabase>}
   */
  async ensureDB() {
    if (!this.db) {
      await this.init();
    }
    return this.db;
  }

  /**
   * 执行事务
   * @param {string} storeName - store 名称
   * @param {string} mode - 事务模式
   * @returns {IDBTransaction}
   */
  transaction(storeName, mode = 'readonly') {
    if (!this.db) {
      throw new Error('数据库未初始化');
    }
    return this.db.transaction(storeName, mode);
  }

  /**
   * 获取 store
   * @param {string} storeName - store 名称
   * @param {string} mode - 事务模式
   * @returns {IDBObjectStore}
   */
  objectStore(storeName, mode = 'readonly') {
    const tx = this.transaction(storeName, mode);
    return tx.objectStore(storeName);
  }

  /**
   * 获取所有页面
   * @returns {Promise<Array>}
   */
  async getAllPages() {
    const store = this.objectStore('pages', 'readonly');
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * 保存页面
   * @param {Object} data - 页面数据
   * @returns {Promise<string>}
   */
  async savePage(data) {
    const store = this.objectStore('pages', 'readwrite');
    return new Promise((resolve, reject) => {
      data.id = data.id || Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      data.savedAt = data.savedAt || Date.now();
      const req = store.add(data);
      req.onsuccess = () => resolve(data.id);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * 删除页面
   * @param {string} id - 页面 ID
   * @returns {Promise<void>}
   */
  async deletePage(id) {
    const store = this.objectStore('pages', 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * 根据 URL 查找页面
   * @param {string} url - 页面 URL
   * @returns {Promise<Array>}
   */
  async findPageByUrl(url) {
    const store = this.objectStore('pages', 'readonly');
    const index = store.index('url');
    return new Promise((resolve, reject) => {
      const req = index.getAll(url);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * 清空所有页面
   * @returns {Promise<void>}
   */
  async clearAllPages() {
    const store = this.objectStore('pages', 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * 获取某个页面的所有资源
   * @param {string} pageId - 页面 ID
   * @returns {Promise<Array>}
   */
  async getResourcesByPageId(pageId) {
    const store = this.objectStore('resources', 'readonly');
    const index = store.index('pageId');
    return new Promise((resolve, reject) => {
      const req = index.getAll(pageId);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * 获取所有资源
   * @returns {Promise<Array>}
   */
  async getAllResources() {
    const store = this.objectStore('resources', 'readonly');
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * 保存单个资源
   * @param {Object} resource - 资源数据
   * @returns {Promise<string>}
   */
  async saveResource(resource) {
    const store = this.objectStore('resources', 'readwrite');
    return new Promise((resolve, reject) => {
      resource.id = resource.id || `res-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      resource.savedAt = resource.savedAt || Date.now();
      const req = store.put(resource);
      req.onsuccess = () => resolve(resource.id);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * 批量保存资源
   * @param {Array} resources - 资源数组
   * @returns {Promise<Array<string>>}
   */
  async saveResources(resources) {
    const ids = [];
    for (const resource of resources) {
      const id = await this.saveResource(resource);
      ids.push(id);
    }
    return ids;
  }

  /**
   * 删除资源
   * @param {string} id - 资源 ID
   * @returns {Promise<void>}
   */
  async deleteResource(id) {
    const store = this.objectStore('resources', 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * 删除某个页面的所有资源
   * @param {string} pageId - 页面 ID
   * @returns {Promise<void>}
   */
  async deleteResourcesByPageId(pageId) {
    const store = this.objectStore('resources', 'readwrite');
    const index = store.index('pageId');
    return new Promise((resolve, reject) => {
      const req = index.getAllKeys(pageId);
      req.onsuccess = () => {
        const keys = req.result;
        keys.forEach(key => store.delete(key));
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * 清空所有资源
   * @returns {Promise<void>}
   */
  async clearAllResources() {
    const store = this.objectStore('resources', 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * 关闭数据库连接
   * @returns {Promise<void>}
   */
  async close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// 创建全局实例
const dbManager = new DBManager('PageCacheDB', 2);
