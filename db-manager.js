// db-manager.js - IndexedDB 数据库管理类
// 封装所有数据库操作，提高可维护性和复用性

import { DB_CONFIG } from './constants.js';

class DBManager {
  constructor() {
    this.dbName = DB_CONFIG.NAME;
    this.version = DB_CONFIG.VERSION;
    this.db = null;
    this.stores = {};
  }

  async init() {
    if (this.db) {
      return this.db;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onupgradeneeded = (e) => {
        const database = e.target.result;
        
        // 创建 pages store
        if (!database.objectStoreNames.contains(DB_CONFIG.PAGES_STORE)) {
          const store = database.createObjectStore(DB_CONFIG.PAGES_STORE, { keyPath: 'id' });
          store.createIndex('savedAt', 'savedAt', { unique: false });
          store.createIndex('url', 'url', { unique: false });
        }
        
        // 创建 resources store
        if (!database.objectStoreNames.contains(DB_CONFIG.RESOURCES_STORE)) {
          const store = database.createObjectStore(DB_CONFIG.RESOURCES_STORE, { keyPath: 'id' });
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

  async ensureDB() {
    if (!this.db) {
      await this.init();
    }
    return this.db;
  }

  transaction(storeName, mode = 'readonly') {
    if (!this.db) {
      throw new Error('数据库未初始化');
    }
    return this.db.transaction(storeName, mode);
  }

  objectStore(storeName, mode = 'readonly') {
    const tx = this.transaction(storeName, mode);
    return tx.objectStore(storeName);
  }

  async getAllPages() {
    const store = this.objectStore(DB_CONFIG.PAGES_STORE, 'readonly');
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async savePage(data) {
    const store = this.objectStore(DB_CONFIG.PAGES_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
      data.id = data.id || Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      data.savedAt = data.savedAt || Date.now();
      const req = store.add(data);
      req.onsuccess = () => resolve(data.id);
      req.onerror = () => reject(req.error);
    });
  }

  async deletePage(id) {
    const store = this.objectStore(DB_CONFIG.PAGES_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async findPageByUrl(url) {
    const store = this.objectStore(DB_CONFIG.PAGES_STORE, 'readonly');
    const index = store.index('url');
    return new Promise((resolve, reject) => {
      const req = index.getAll(url);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async clearAllPages() {
    const store = this.objectStore(DB_CONFIG.PAGES_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async getResourcesByPageId(pageId) {
    const store = this.objectStore(DB_CONFIG.RESOURCES_STORE, 'readonly');
    const index = store.index('pageId');
    return new Promise((resolve, reject) => {
      const req = index.getAll(pageId);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async getAllResources() {
    const store = this.objectStore(DB_CONFIG.RESOURCES_STORE, 'readonly');
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async saveResource(resource) {
    const store = this.objectStore(DB_CONFIG.RESOURCES_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
      resource.id = resource.id || `res-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      resource.savedAt = resource.savedAt || Date.now();
      const req = store.put(resource);
      req.onsuccess = () => resolve(resource.id);
      req.onerror = () => reject(req.error);
    });
  }

  async saveResources(resources) {
    const ids = [];
    for (const resource of resources) {
      const id = await this.saveResource(resource);
      ids.push(id);
    }
    return ids;
  }

  async deleteResource(id) {
    const store = this.objectStore(DB_CONFIG.RESOURCES_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async deleteResourcesByPageId(pageId) {
    const store = this.objectStore(DB_CONFIG.RESOURCES_STORE, 'readwrite');
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

  async clearAllResources() {
    const store = this.objectStore(DB_CONFIG.RESOURCES_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

export const dbManager = new DBManager();
