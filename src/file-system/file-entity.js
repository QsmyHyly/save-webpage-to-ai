// file-entity.js - 文件实体类
// 代表扩展中管理的任何可保存、可上传、可下载的内容

(function(global) {
  const {
    FileTypes,
    MimeMap,
    getMimeType,
    sanitizeFilename,
    generateFilename,
    generateId,
    MetadataComment
  } = global.fileTypes || {};

  class FileEntity {
    constructor(options = {}) {
      this.id = options.id || generateId();
      this.name = options.name || 'unnamed';
      this.content = options.content || '';
      this.type = options.type || FileTypes.OTHER;
      this.size = options.size || 0;
      this.source = options.source || {};
      this.createdAt = options.createdAt || Date.now();
      this.metadata = options.metadata || {};
      
      if (!this.size && this.content) {
        this.size = new Blob([this.content]).size;
      }
    }

    toBlob(options = {}) {
      const addMetadata = options.addMetadata !== false;
      let content = this.content;
      
      if (addMetadata && this._isTextType()) {
        const metadataComment = this._getMetadataComment();
        content = metadataComment + content;
      }
      
      const mimeType = this.getMimeType();
      return new Blob([content], { type: mimeType });
    }

    toFile(options = {}) {
      const blob = this.toBlob(options);
      const filename = options.filename || this.name || 'file';
      return new File([blob], filename, { type: blob.type });
    }

    async download(options = {}) {
      const blob = this.toBlob(options);
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = options.filename || this.name || 'file';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 100);
    }

    toJSON() {
      return {
        id: this.id,
        name: this.name,
        content: this.content,
        type: this.type,
        size: this.size,
        source: this.source,
        createdAt: this.createdAt,
        metadata: this.metadata
      };
    }

    getMimeType() {
      return getMimeType(this.type, this.name);
    }

    _isTextType() {
      return ['html', 'css', 'js', 'json'].includes(this.type);
    }

    _getMetadataComment() {
      const metadata = {
        id: this.id,
        name: this.name,
        type: this.type,
        source: this.source,
        createdAt: new Date(this.createdAt).toISOString(),
        ...this.metadata
      };
      
      const commentFn = MetadataComment[this.type] || MetadataComment.default;
      return commentFn(metadata);
    }

    static fromHTML(html, url, title) {
      const safeTitle = sanitizeFilename(title || 'page');
      return new FileEntity({
        name: `${safeTitle}.html`,
        content: html,
        type: FileTypes.HTML,
        source: { url, title },
        metadata: {}
      });
    }

    static fromResource(resource) {
      const { inferTypeFromUrl, generateFilename } = global.fileTypes || {};
      const { type, extension } = inferTypeFromUrl(resource.url);
      const fileName = resource.fileName || generateFilename(resource, type);
      
      return new FileEntity({
        name: fileName,
        content: resource.content,
        type,
        source: { url: resource.url },
        metadata: resource.metadata || {}
      });
    }

    static fromGrab(content, type, source, selector = null) {
      const name = generateFilename(source, type, selector);
      
      return new FileEntity({
        name,
        content,
        type,
        source,
        metadata: selector ? { selector } : {}
      });
    }

    static fromJSON(obj) {
      return new FileEntity(obj);
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = FileEntity;
  } else {
    global.FileEntity = FileEntity;
  }

})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : this));
