// db-manager.js - IndexedDB 数据库管理类
// 封装所有数据库操作，提高可维护性和复用性

// 注意：DB_CONFIG 已通过 constants.js 在全局作用域定义

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
        self.logger.info('数据库升级，当前版本:', e.oldVersion, '新版本:', e.newVersion);
        const database = e.target.result;
        
        // 创建 pages store
        if (!database.objectStoreNames.contains(DB_CONFIG.PAGES_STORE)) {
          self.logger.info('创建 pages store');
          const store = database.createObjectStore(DB_CONFIG.PAGES_STORE, { keyPath: 'id' });
          store.createIndex('savedAt', 'savedAt', { unique: false });
          store.createIndex('url', 'url', { unique: false });
        }
        
        // 创建 resources store
        if (!database.objectStoreNames.contains(DB_CONFIG.RESOURCES_STORE)) {
          self.logger.info('创建 resources store');
          const store = database.createObjectStore(DB_CONFIG.RESOURCES_STORE, { keyPath: 'id' });
          store.createIndex('pageId', 'pageId', { unique: false });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('savedAt', 'savedAt', { unique: false });
        }
      };

      request.onsuccess = (e) => {
        this.db = e.target.result;
        self.logger.info('IndexedDB 初始化成功');
        resolve(this.db);
      };

      request.onerror = (e) => {
        self.logger.error('IndexedDB 初始化失败:', e.target.error);
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
    await this.ensureDB();
    try {
      const store = this.objectStore(DB_CONFIG.PAGES_STORE, 'readonly');
      return new Promise((resolve, reject) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = (e) => {
          self.logger.error('getAllPages 请求失败:', e.target.error);
          reject(e.target.error);
        };
      });
    } catch (error) {
      self.logger.error('getAllPages 操作失败:', error);
      self.logger.info('尝试重新初始化数据库并重试 getAllPages');
      await this.init();
      const store = this.objectStore(DB_CONFIG.PAGES_STORE, 'readonly');
      return new Promise((resolve, reject) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = (e) => reject(e.target.error);
      });
    }
  }

  async savePage(data) {
    await this.ensureDB();
    try {
      const store = this.objectStore(DB_CONFIG.PAGES_STORE, 'readwrite');
      return new Promise((resolve, reject) => {
        data.id = data.id || Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        data.savedAt = data.savedAt || Date.now();
        const req = store.add(data);
        req.onsuccess = () => resolve(data.id);
        req.onerror = (e) => {
          self.logger.error('savePage 请求失败:', e.target.error);
          reject(e.target.error);
        };
      });
    } catch (error) {
      self.logger.error('savePage 操作失败:', error);
      self.logger.info('尝试重新初始化数据库并重试 savePage');
      await this.init();
      const store = this.objectStore(DB_CONFIG.PAGES_STORE, 'readwrite');
      return new Promise((resolve, reject) => {
        data.id = data.id || Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        data.savedAt = data.savedAt || Date.now();
        const req = store.add(data);
        req.onsuccess = () => resolve(data.id);
        req.onerror = (e) => reject(e.target.error);
      });
    }
  }

  async deletePage(id) {
    await this.ensureDB();
    try {
      const store = this.objectStore(DB_CONFIG.PAGES_STORE, 'readwrite');
      return new Promise((resolve, reject) => {
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = (e) => {
          self.logger.error('deletePage 请求失败:', e.target.error);
          reject(e.target.error);
        };
      });
    } catch (error) {
      self.logger.error('deletePage 操作失败:', error);
      self.logger.info('尝试重新初始化数据库并重试 deletePage');
      await this.init();
      const store = this.objectStore(DB_CONFIG.PAGES_STORE, 'readwrite');
      return new Promise((resolve, reject) => {
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = (e) => reject(e.target.error);
      });
    }
  }

  async findPageByUrl(url) {
    await this.ensureDB();
    try {
      const store = this.objectStore(DB_CONFIG.PAGES_STORE, 'readonly');
      const index = store.index('url');
      return new Promise((resolve, reject) => {
        const req = index.getAll(url);
        req.onsuccess = () => resolve(req.result);
        req.onerror = (e) => {
          self.logger.error('findPageByUrl 请求失败:', e.target.error);
          reject(e.target.error);
        };
      });
    } catch (error) {
      self.logger.error('findPageByUrl 操作失败:', error);
      self.logger.info('尝试重新初始化数据库并重试 findPageByUrl');
      await this.init();
      const store = this.objectStore(DB_CONFIG.PAGES_STORE, 'readonly');
      const index = store.index('url');
      return new Promise((resolve, reject) => {
        const req = index.getAll(url);
        req.onsuccess = () => resolve(req.result);
        req.onerror = (e) => reject(e.target.error);
      });
    }
  }

  async clearAllPages() {
    await this.ensureDB();
    try {
      const store = this.objectStore(DB_CONFIG.PAGES_STORE, 'readwrite');
      return new Promise((resolve, reject) => {
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = (e) => {
          self.logger.error('clearAllPages 请求失败:', e.target.error);
          reject(e.target.error);
        };
      });
    } catch (error) {
      self.logger.error('clearAllPages 操作失败:', error);
      self.logger.info('尝试重新初始化数据库并重试 clearAllPages');
      await this.init();
      const store = this.objectStore(DB_CONFIG.PAGES_STORE, 'readwrite');
      return new Promise((resolve, reject) => {
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = (e) => reject(e.target.error);
      });
    }
  }

  async getResourcesByPageId(pageId) {
    await this.ensureDB();
    try {
      const store = this.objectStore(DB_CONFIG.RESOURCES_STORE, 'readonly');
      const index = store.index('pageId');
      return new Promise((resolve, reject) => {
        const req = index.getAll(pageId);
        req.onsuccess = () => resolve(req.result);
        req.onerror = (e) => {
          self.logger.error('getResourcesByPageId 请求失败:', e.target.error);
          reject(e.target.error);
        };
      });
    } catch (error) {
      self.logger.error('getResourcesByPageId 操作失败:', error);
      self.logger.info('尝试重新初始化数据库并重试 getResourcesByPageId');
      await this.init();
      const store = this.objectStore(DB_CONFIG.RESOURCES_STORE, 'readonly');
      const index = store.index('pageId');
      return new Promise((resolve, reject) => {
        const req = index.getAll(pageId);
        req.onsuccess = () => resolve(req.result);
        req.onerror = (e) => reject(e.target.error);
      });
    }
  }

  async getAllResources() {
    await this.ensureDB();
    try {
      const store = this.objectStore(DB_CONFIG.RESOURCES_STORE, 'readonly');
      return new Promise((resolve, reject) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = (e) => {
          self.logger.error('getAllResources 请求失败:', e.target.error);
          reject(e.target.error);
        };
      });
    } catch (error) {
      self.logger.error('getAllResources 操作失败:', error);
      self.logger.info('尝试重新初始化数据库并重试 getAllResources');
      await this.init();
      const store = this.objectStore(DB_CONFIG.RESOURCES_STORE, 'readonly');
      return new Promise((resolve, reject) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = (e) => reject(e.target.error);
      });
    }
  }

  async getResourceById(id) {
    await this.ensureDB();
    try {
      const store = this.objectStore(DB_CONFIG.RESOURCES_STORE, 'readonly');
      return new Promise((resolve, reject) => {
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result);
        req.onerror = (e) => {
          self.logger.error('getResourceById 请求失败:', e.target.error);
          reject(e.target.error);
        };
      });
    } catch (error) {
      self.logger.error('getResourceById 操作失败:', error);
      self.logger.info('尝试重新初始化数据库并重试 getResourceById');
      await this.init();
      const store = this.objectStore(DB_CONFIG.RESOURCES_STORE, 'readonly');
      return new Promise((resolve, reject) => {
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result);
        req.onerror = (e) => reject(e.target.error);
      });
    }
  }

  async saveResource(resource) {
    await this.ensureDB();
    try {
      const store = this.objectStore(DB_CONFIG.RESOURCES_STORE, 'readwrite');
      return new Promise((resolve, reject) => {
        resource.id = resource.id || `res-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        resource.savedAt = resource.savedAt || Date.now();
        const req = store.put(resource);
        req.onsuccess = () => resolve(resource.id);
        req.onerror = (e) => {
          self.logger.error('saveResource 请求失败:', e.target.error);
          reject(e.target.error);
        };
      });
    } catch (error) {
      self.logger.error('saveResource 操作失败:', error);
      self.logger.info('尝试重新初始化数据库并重试 saveResource');
      await this.init();
      const store = this.objectStore(DB_CONFIG.RESOURCES_STORE, 'readwrite');
      return new Promise((resolve, reject) => {
        resource.id = resource.id || `res-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        resource.savedAt = resource.savedAt || Date.now();
        const req = store.put(resource);
        req.onsuccess = () => resolve(resource.id);
        req.onerror = (e) => reject(e.target.error);
      });
    }
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
    await this.ensureDB();
    try {
      const store = this.objectStore(DB_CONFIG.RESOURCES_STORE, 'readwrite');
      return new Promise((resolve, reject) => {
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = (e) => {
          self.logger.error('deleteResource 请求失败:', e.target.error);
          reject(e.target.error);
        };
      });
    } catch (error) {
      self.logger.error('deleteResource 操作失败:', error);
      self.logger.info('尝试重新初始化数据库并重试 deleteResource');
      await this.init();
      const store = this.objectStore(DB_CONFIG.RESOURCES_STORE, 'readwrite');
      return new Promise((resolve, reject) => {
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = (e) => reject(e.target.error);
      });
    }
  }

  async deleteResourcesByPageId(pageId) {
    await this.ensureDB();
    try {
      const store = this.objectStore(DB_CONFIG.RESOURCES_STORE, 'readwrite');
      const index = store.index('pageId');
      
      return new Promise((resolve, reject) => {
        const req = index.getAllKeys(pageId);
        
        req.onsuccess = () => {
          const keys = req.result;
          if (keys.length === 0) {
            resolve();
            return;
          }
          
          let completed = 0;
          let hasError = false;
          
          keys.forEach(key => {
            const deleteReq = store.delete(key);
            
            deleteReq.onsuccess = () => {
              completed++;
              if (completed === keys.length && !hasError) {
                resolve();
              }
            };
            
            deleteReq.onerror = (e) => {
              if (!hasError) {
                hasError = true;
                self.logger.error('deleteResourcesByPageId 删除失败:', e.target.error);
                reject(e.target.error);
              }
            };
          });
        };
        
        req.onerror = (e) => {
          self.logger.error('deleteResourcesByPageId 获取键失败:', e.target.error);
          reject(e.target.error);
        };
      });
    } catch (error) {
      self.logger.error('deleteResourcesByPageId 操作失败:', error);
      self.logger.info('尝试重新初始化数据库并重试 deleteResourcesByPageId');
      await this.init();
      const store = this.objectStore(DB_CONFIG.RESOURCES_STORE, 'readwrite');
      const index = store.index('pageId');
      
      return new Promise((resolve, reject) => {
        const req = index.getAllKeys(pageId);
        
        req.onsuccess = () => {
          const keys = req.result;
          if (keys.length === 0) {
            resolve();
            return;
          }
          
          let completed = 0;
          let hasError = false;
          
          keys.forEach(key => {
            const deleteReq = store.delete(key);
            
            deleteReq.onsuccess = () => {
              completed++;
              if (completed === keys.length && !hasError) {
                resolve();
              }
            };
            
            deleteReq.onerror = (e) => {
              if (!hasError) {
                hasError = true;
                reject(e.target.error);
              }
            };
          });
        };
        
        req.onerror = (e) => reject(e.target.error);
      });
    }
  }

  async clearAllResources() {
    await this.ensureDB();
    try {
      const store = this.objectStore(DB_CONFIG.RESOURCES_STORE, 'readwrite');
      return new Promise((resolve, reject) => {
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = (e) => {
          self.logger.error('clearAllResources 请求失败:', e.target.error);
          reject(e.target.error);
        };
      });
    } catch (error) {
      self.logger.error('clearAllResources 操作失败:', error);
      self.logger.info('尝试重新初始化数据库并重试 clearAllResources');
      await this.init();
      const store = this.objectStore(DB_CONFIG.RESOURCES_STORE, 'readwrite');
      return new Promise((resolve, reject) => {
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = (e) => reject(e.target.error);
      });
    }
  }

  async close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// 创建全局实例
const dbManager = new DBManager();

// 显式暴露给全局（Service Worker 的全局对象是 self）
if (typeof self !== 'undefined') {
  self.dbManager = dbManager;
}
