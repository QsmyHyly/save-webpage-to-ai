// file-storage.js - 文件存储管理器
// 负责 IndexedDB 的读写操作

(function(global) {
  const { FileEntity } = global;

  class FileStorage {
    constructor(dbConfig) {
      this.dbName = dbConfig?.NAME || 'FileStorageDB';
      this.version = dbConfig?.VERSION || 3;
      this.db = null;
      this.initPromise = null;
      this.initAttempts = 0;
      this.maxInitRetries = 3;
    }

    async init() {
      if (this.initPromise) {
        return this.initPromise;
      }

      this.initPromise = this._doInit();
      return this.initPromise;
    }

    async _doInit() {
      if (this.db) {
        return this.db;
      }

      return new Promise((resolve, reject) => {
        const request = indexedDB.open(this.dbName, this.version);

        request.onupgradeneeded = (e) => {
          const database = e.target.result;
          self.logger?.info('FileStorage 数据库升级，当前版本:', e.oldVersion, '新版本:', e.newVersion);

          // 删除旧的 pages store（如果存在）
          if (database.objectStoreNames.contains('pages')) {
            self.logger?.info('删除旧的 pages store');
            database.deleteObjectStore('pages');
          }

          // 创建 files store
          if (!database.objectStoreNames.contains('files')) {
            self.logger?.info('创建 files store');
            const store = database.createObjectStore('files', { keyPath: 'id' });
            store.createIndex('type', 'type', { unique: false });
            store.createIndex('sourceUrl', 'source.url', { unique: false });
            store.createIndex('createdAt', 'createdAt', { unique: false });
          }
        };

        request.onsuccess = (e) => {
          this.db = e.target.result;
          self.logger?.info('FileStorage IndexedDB 初始化成功');
          resolve(this.db);
        };

        request.onerror = (e) => {
          self.logger?.error('FileStorage IndexedDB 初始化失败:', e.target.error);
          reject(e.target.error);
        };
      });
    }

    async _ensureDb() {
      if (!this.db) {
        await this.init();
      }
      return this.db;
    }

    transaction(storeName, mode = 'readonly') {
      if (!this.db) {
        throw new Error('FileStorage 数据库未初始化');
      }
      return this.db.transaction(storeName, mode);
    }

    objectStore(storeName, mode = 'readonly') {
      const tx = this.transaction(storeName, mode);
      return tx.objectStore(storeName);
    }

    async save(fileEntity) {
      await this._ensureDb();
      try {
        const store = this.objectStore('files', 'readwrite');
        return new Promise((resolve, reject) => {
          const req = store.put(fileEntity.toJSON());
          req.onsuccess = () => resolve(fileEntity.id);
          req.onerror = (e) => {
            self.logger?.error('FileStorage save 请求失败:', e.target.error);
            reject(e.target.error);
          };
        });
      } catch (error) {
        self.logger?.error('FileStorage save 操作失败:', error);
        throw error;
      }
    }

    async saveMany(fileEntities) {
      await this._ensureDb();
      try {
        const store = this.objectStore('files', 'readwrite');
        const transaction = this.transaction('files', 'readwrite');

        return new Promise((resolve, reject) => {
          let completed = 0;
          let errors = [];

          if (fileEntities.length === 0) {
            resolve([]);
            return;
          }

          fileEntities.forEach((entity, index) => {
            const req = store.put(entity.toJSON());

            req.onsuccess = () => {
              completed++;
              if (completed === fileEntities.length) {
                resolve(fileEntities.map(e => e.id));
              }
            };

            req.onerror = (e) => {
              errors[index] = e.target.error;
              completed++;
              if (completed === fileEntities.length) {
                if (errors.length > 0) {
                  reject(new Error(`批量保存部分失败：${errors.filter(Boolean).map(e => e.message).join(', ')}`));
                } else {
                  resolve(fileEntities.map(e => e.id));
                }
              }
            };
          });
        });
      } catch (error) {
        self.logger?.error('FileStorage saveMany 操作失败:', error);
        throw error;
      }
    }

    async get(id) {
      await this._ensureDb();
      try {
        const store = this.objectStore('files', 'readonly');
        return new Promise((resolve, reject) => {
          const req = store.get(id);
          req.onsuccess = () => {
            if (req.result) {
              resolve(FileEntity.fromJSON(req.result));
            } else {
              resolve(null);
            }
          };
          req.onerror = (e) => {
            self.logger?.error('FileStorage get 请求失败:', e.target.error);
            reject(e.target.error);
          };
        });
      } catch (error) {
        self.logger?.error('FileStorage get 操作失败:', error);
        throw error;
      }
    }

    async getMany(ids) {
      await this._ensureDb();
      try {
        const store = this.objectStore('files', 'readonly');
        return new Promise((resolve, reject) => {
          const results = [];
          let completed = 0;
          let errors = [];

          if (ids.length === 0) {
            resolve([]);
            return;
          }

          ids.forEach((id, index) => {
            const req = store.get(id);

            req.onsuccess = () => {
              results[index] = req.result ? FileEntity.fromJSON(req.result) : null;
              completed++;
              if (completed === ids.length) {
                resolve(results.filter(Boolean));
              }
            };

            req.onerror = (e) => {
              errors[index] = e.target.error;
              completed++;
              if (completed === ids.length) {
                if (errors.length > 0) {
                  reject(new Error(`批量获取部分失败：${errors.filter(Boolean).map(e => e.message).join(', ')}`));
                } else {
                  resolve(results.filter(Boolean));
                }
              }
            };
          });
        });
      } catch (error) {
        self.logger?.error('FileStorage getMany 操作失败:', error);
        throw error;
      }
    }

    async getAll() {
      await this._ensureDb();
      try {
        const store = this.objectStore('files', 'readonly');
        return new Promise((resolve, reject) => {
          const req = store.getAll();
          req.onsuccess = () => {
            resolve(req.result.map(item => FileEntity.fromJSON(item)));
          };
          req.onerror = (e) => {
            self.logger?.error('FileStorage getAll 请求失败:', e.target.error);
            reject(e.target.error);
          };
        });
      } catch (error) {
        self.logger?.error('FileStorage getAll 操作失败:', error);
        throw error;
      }
    }

    async getByType(type) {
      await this._ensureDb();
      try {
        const store = this.objectStore('files', 'readonly');
        const index = store.index('type');
        return new Promise((resolve, reject) => {
          const req = index.getAll(IDBKeyRange.only(type));
          req.onsuccess = () => {
            resolve(req.result.map(item => FileEntity.fromJSON(item)));
          };
          req.onerror = (e) => {
            self.logger?.error('FileStorage getByType 请求失败:', e.target.error);
            reject(e.target.error);
          };
        });
      } catch (error) {
        self.logger?.error('FileStorage getByType 操作失败:', error);
        throw error;
      }
    }

    async getBySourceUrl(url) {
      await this._ensureDb();
      try {
        const store = this.objectStore('files', 'readonly');
        const index = store.index('sourceUrl');
        return new Promise((resolve, reject) => {
          const req = index.getAll(IDBKeyRange.only(url));
          req.onsuccess = () => {
            resolve(req.result.map(item => FileEntity.fromJSON(item)));
          };
          req.onerror = (e) => {
            self.logger?.error('FileStorage getBySourceUrl 请求失败:', e.target.error);
            reject(e.target.error);
          };
        });
      } catch (error) {
        self.logger?.error('FileStorage getBySourceUrl 操作失败:', error);
        throw error;
      }
    }

    async delete(id) {
      await this._ensureDb();
      try {
        const store = this.objectStore('files', 'readwrite');
        return new Promise((resolve, reject) => {
          const req = store.delete(id);
          req.onsuccess = () => resolve();
          req.onerror = (e) => {
            self.logger?.error('FileStorage delete 请求失败:', e.target.error);
            reject(e.target.error);
          };
        });
      } catch (error) {
        self.logger?.error('FileStorage delete 操作失败:', error);
        throw error;
      }
    }

    async deleteMany(ids) {
      await this._ensureDb();
      try {
        const store = this.objectStore('files', 'readwrite');
        return new Promise((resolve, reject) => {
          let completed = 0;
          let errors = [];

          if (ids.length === 0) {
            resolve();
            return;
          }

          ids.forEach((id, index) => {
            const req = store.delete(id);

            req.onsuccess = () => {
              completed++;
              if (completed === ids.length) {
                resolve();
              }
            };

            req.onerror = (e) => {
              errors[index] = e.target.error;
              completed++;
              if (completed === ids.length) {
                if (errors.length > 0) {
                  reject(new Error(`批量删除部分失败：${errors.filter(Boolean).map(e => e.message).join(', ')}`));
                } else {
                  resolve();
                }
              }
            };
          });
        });
      } catch (error) {
        self.logger?.error('FileStorage deleteMany 操作失败:', error);
        throw error;
      }
    }

    async clear() {
      await this._ensureDb();
      try {
        const store = this.objectStore('files', 'readwrite');
        return new Promise((resolve, reject) => {
          const req = store.clear();
          req.onsuccess = () => resolve();
          req.onerror = (e) => {
            self.logger?.error('FileStorage clear 请求失败:', e.target.error);
            reject(e.target.error);
          };
        });
      } catch (error) {
        self.logger?.error('FileStorage clear 操作失败:', error);
        throw error;
      }
    }

    async count() {
      await this._ensureDb();
      try {
        const store = this.objectStore('files', 'readonly');
        return new Promise((resolve, reject) => {
          const req = store.count();
          req.onsuccess = () => resolve(req.result);
          req.onerror = (e) => {
            self.logger?.error('FileStorage count 请求失败:', e.target.error);
            reject(e.target.error);
          };
        });
      } catch (error) {
        self.logger?.error('FileStorage count 操作失败:', error);
        throw error;
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
  if (typeof self !== 'undefined') {
    self.FileStorage = FileStorage;
  } else if (typeof window !== 'undefined') {
    window.FileStorage = FileStorage;
  }

})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : this));
