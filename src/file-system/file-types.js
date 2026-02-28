// file-types.js - 文件类型系统和工具函数
// 提供文件类型、MIME 类型、扩展名等映射和推断功能

const FileTypes = {
  HTML: 'html',
  CSS: 'css',
  JS: 'js',
  IMAGE: 'image',
  FONT: 'font',
  OTHER: 'other'
};

const MimeMap = {
  html: 'text/html',
  css: 'text/css',
  js: 'application/javascript',
  image: 'image/png',
  font: 'font/woff2',
  other: 'application/octet-stream'
};

const ExtensionMap = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
  woff: 'font/woff',
  woff2: 'font/woff2',
  ttf: 'font/ttf',
  otf: 'font/otf',
  eot: 'application/vnd.ms-fontobject'
};

const ExtensionToTypeMap = {
  html: 'html',
  htm: 'html',
  css: 'css',
  js: 'js',
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  gif: 'image',
  webp: 'image',
  svg: 'image',
  ico: 'image',
  woff: 'font',
  woff2: 'font',
  ttf: 'font',
  otf: 'font',
  eot: 'font'
};

const TypeToExtensionMap = {
  html: '.html',
  css: '.css',
  js: '.js',
  image: '.png',
  font: '.woff2',
  other: '.bin'
};

const MetadataComment = {
  css: (meta) => `/*\n  FileMetadata: ${JSON.stringify(meta, null, 2)}\n*/\n`,
  js: (meta) => `// FileMetadata: ${JSON.stringify(meta, null, 2)}\n`,
  html: (meta) => `<!--\n  FileMetadata: ${JSON.stringify(meta, null, 2)}\n-->\n`,
  default: (meta) => `<!--\n  FileMetadata: ${JSON.stringify(meta, null, 2)}\n-->\n`
};

function inferTypeFromUrl(url) {
  if (!url) return { type: FileTypes.OTHER, extension: '.bin' };
  
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.toLowerCase();
    const extension = pathname.split('.').pop() || '';
    
    if (ExtensionToTypeMap[extension]) {
      return {
        type: ExtensionToTypeMap[extension],
        extension: '.' + extension
      };
    }
    
    if (pathname.endsWith('/') || pathname === '') {
      return { type: FileTypes.HTML, extension: '.html' };
    }
    
    return { type: FileTypes.OTHER, extension: '.bin' };
  } catch (e) {
    return { type: FileTypes.OTHER, extension: '.bin' };
  }
}

function inferTypeFromContent(content) {
  if (!content) return FileTypes.OTHER;
  
  if (typeof content === 'string') {
    const trimmed = content.trim();
    if (trimmed.startsWith('<!DOCTYPE html') || trimmed.startsWith('<html') || trimmed.startsWith('<!doctype html')) {
      return FileTypes.HTML;
    }
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        JSON.parse(content);
        return FileTypes.OTHER;
      } catch (e) {}
    }
  }
  
  return FileTypes.OTHER;
}

function getMimeType(type, filename) {
  if (type && MimeMap[type]) {
    if (type === FileTypes.IMAGE && filename) {
      const ext = filename.split('.').pop().toLowerCase();
      return ExtensionMap[ext] || MimeMap[type];
    }
    if (type === FileTypes.FONT && filename) {
      const ext = filename.split('.').pop().toLowerCase();
      return ExtensionMap[ext] || MimeMap[type];
    }
    return MimeMap[type];
  }
  
  if (filename) {
    const ext = filename.split('.').pop().toLowerCase();
    if (ExtensionMap[ext]) {
      return ExtensionMap[ext];
    }
  }
  
  return 'application/octet-stream';
}

function sanitizeFilename(filename) {
  if (!filename) return 'unnamed';
  
  return filename
    .replace(/[<>:"/\\|?？*]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 200);
}

function generateFilename(source, type) {
  let baseName;
  
  if (source.title) {
    baseName = sanitizeFilename(source.title);
  } else if (source.url) {
    try {
      const url = new URL(source.url);
      baseName = sanitizeFilename(url.hostname + url.pathname.replace(/\//g, '_'));
    } catch (e) {
      baseName = 'page';
    }
  } else {
    baseName = 'file';
  }
  
  const extension = TypeToExtensionMap[type] || '.bin';
  
  return `${baseName}${extension}`;
}

function generateId(prefix = 'file') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// 导出工具函数集合（供 file-entity.js 等模块使用）
const fileTypes = {
  FileTypes,
  MimeMap,
  ExtensionMap,
  ExtensionToTypeMap,
  TypeToExtensionMap,
  MetadataComment,
  inferTypeFromUrl,
  inferTypeFromContent,
  getMimeType,
  sanitizeFilename,
  generateFilename,
  generateId
};

// Service Worker 环境
if (typeof self !== 'undefined') {
  self.fileTypes = fileTypes;
  self.FileTypes = FileTypes;
  self.MimeMap = MimeMap;
  self.MetadataComment = MetadataComment;
}

// Node.js 环境
if (typeof module !== 'undefined' && module.exports) {
  module.exports = fileTypes;
}
