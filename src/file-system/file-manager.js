// file-manager.js - 统一文件管理器
// 整合 FileEntity、FileStorage 和现有 DBManager 的功能

(function(global) {
  const { FileEntity } = global;
  const { FileStorage } = global;
  const { FileTypes, inferTypeFromUrl, generateFilename } = global.fileTypes || {};

  class FileManager {
    constructor(options = {}) {
      this.fileStorage = new FileStorage({
        NAME: options.dbName || 'FileManagerDB',
        VERSION: options.version || 1,
        STORES: {
          files: 'files',
          pages: 'pages'
        }
      });
      
      this.dbManager = global.dbManager || null;
      this.useLegacyMode = options.useLegacyMode || false;
    }

    async init() {
      await this.fileStorage.init();
      if (this.useLegacyMode && this.dbManager) {
        await this.dbManager.init();
      }
    }

    async saveFile(fileEntity) {
      if (!(fileEntity instanceof FileEntity)) {
        throw new Error('fileEntity 必须是 FileEntity 实例');
      }
      return await this.fileStorage.save(fileEntity);
    }

    async saveFiles(fileEntities) {
      if (!Array.isArray(fileEntities)) {
        throw new Error('fileEntities 必须是数组');
      }
      return await this.fileStorage.saveMany(fileEntities);
    }

    async getFile(id) {
      return await this.fileStorage.get(id);
    }

    async getFiles(ids) {
      return await this.fileStorage.getMany(ids);
    }

    async getAllFiles() {
      return await this.fileStorage.getAll();
    }

    async getFilesByType(type) {
      return await this.fileStorage.getByType(type);
    }

    async getFilesByUrl(url) {
      return await this.fileStorage.getBySourceUrl(url);
    }

    async deleteFile(id) {
      return await this.fileStorage.delete(id);
    }

    async deleteFiles(ids) {
      return await this.fileStorage.deleteMany(ids);
    }

    async clearAllFiles() {
      return await this.fileStorage.clear();
    }

    async getFileCount() {
      return await this.fileStorage.count();
    }

    async savePageLegacy(data) {
      if (!this.dbManager) {
        throw new Error('未提供 dbManager，无法使用遗留模式');
      }
      return await this.dbManager.savePage(data);
    }

    async getPageLegacy(id) {
      if (!this.dbManager) {
        throw new Error('未提供 dbManager，无法使用遗留模式');
      }
      const pages = await this.dbManager.getAllPages();
      return pages.find(p => p.id === id) || null;
    }

    async deletePageLegacy(id) {
      if (!this.dbManager) {
        throw new Error('未提供 dbManager，无法使用遗留模式');
      }
      return await this.dbManager.deletePage(id);
    }

    async getAllPagesLegacy() {
      if (!this.dbManager) {
        throw new Error('未提供 dbManager，无法使用遗留模式');
      }
      return await this.dbManager.getAllPages();
    }

    async saveResourceLegacy(resource) {
      if (!this.dbManager) {
        throw new Error('未提供 dbManager，无法使用遗留模式');
      }
      return await this.dbManager.saveResource(resource);
    }

    async getResourcesByPageIdLegacy(pageId) {
      if (!this.dbManager) {
        throw new Error('未提供 dbManager，无法使用遗留模式');
      }
      return await this.dbManager.getResourcesByPageId(pageId);
    }

    async deleteResourceLegacy(id) {
      if (!this.dbManager) {
        throw new Error('未提供 dbManager，无法使用遗留模式');
      }
      return await this.dbManager.deleteResource(id);
    }

    createFileFromHTML(html, url, title) {
      return FileEntity.fromHTML(html, url, title);
    }

    createFileFromResource(resource) {
      return FileEntity.fromResource(resource);
    }

    async downloadFile(fileEntity, options = {}) {
      if (!(fileEntity instanceof FileEntity)) {
        throw new Error('fileEntity 必须是 FileEntity 实例');
      }
      await fileEntity.download(options);
    }

    async uploadFile(fileEntity, uploader, options = {}) {
      if (!(fileEntity instanceof FileEntity)) {
        throw new Error('fileEntity 必须是 FileEntity 实例');
      }
      const file = fileEntity.toFile(options);
      return await uploader.upload(file);
    }

    async close() {
      await this.fileStorage.close();
      if (this.dbManager) {
        await this.dbManager.close();
      }
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = FileManager;
  } else {
    global.FileManager = FileManager;
  }

})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : this));
