// constants.js - 常量定义
// 集中管理所有常量，便于维护和修改

// AI 平台配置
const PLATFORM = {
  DEEPSEEK: {
    name: 'DeepSeek',
    url: 'https://chat.deepseek.com/',
    sendSelector: 'button[aria-label="发送"]'
  },
  QIANWEN: {
    name: '通义千问',
    url: 'https://qianwen.com/',
    sendSelector: 'button[aria-label="发送"]'
  }
};

// 存储键名
const STORAGE_KEYS = {
  CURRENT_RESOURCES: 'currentResources'
};

// 消息类型
const MESSAGE_TYPES = {
  // 文件管理
  SAVE_FILE: 'SAVE_FILE',
  SAVE_FILES: 'SAVE_FILES',
  GET_FILE: 'GET_FILE',
  GET_FILES: 'GET_FILES',
  GET_ALL_FILES: 'GET_ALL_FILES',
  GET_FILES_BY_TYPE: 'GET_FILES_BY_TYPE',
  GET_FILES_BY_URL: 'GET_FILES_BY_URL',
  GET_FILES_BY_SOURCE: 'GET_FILES_BY_SOURCE',
  DELETE_FILE: 'DELETE_FILE',
  DELETE_FILES: 'DELETE_FILES',
  CLEAR_ALL_FILES: 'CLEAR_ALL_FILES',
  GET_FILE_COUNT: 'GET_FILE_COUNT',
  DOWNLOAD_FILE: 'DOWNLOAD_FILE',

  // 工厂方法
  CREATE_FILE_FROM_HTML: 'CREATE_FILE_FROM_HTML',
  CREATE_FILE_FROM_RESOURCE: 'CREATE_FILE_FROM_RESOURCE',

  // 上传相关
  UPLOAD_PAGES: 'UPLOAD_PAGES',
  UPLOAD_ITEMS: 'UPLOAD_ITEMS',

  // 数据库管理
  RESET_DB: 'RESET_DB'
};

// 元数据注释格式
const METADATA_COMMENT = {
  HTML: '<!--\n  ResourceMetadata: ${json}\n-->\n',
  CSS: '/*\n  ResourceMetadata: ${json}\n*/\n',
  JS: '// ResourceMetadata: ${json}\n'
};

// 资源类型
const RESOURCE_TYPES = {
  CSS: 'css',
  JS: 'js',
  IMAGE: 'image',
  FONT: 'font',
  OTHER: 'other'
};

// 资源图标映射
const RESOURCE_ICONS = {
  html: '📄',
  css: '🎨',
  js: '📜',
  image: '🖼️',
  font: '🔤',
  other: '📄'
};

// MIME 类型映射
const MIME_TYPES = {
  PNG: 'image/png',
  JPG: 'image/jpeg',
  JPEG: 'image/jpeg',
  GIF: 'image/gif',
  SVG: 'image/svg+xml',
  WEBP: 'image/webp',
  ICO: 'image/x-icon',
  CSS: 'text/css',
  JS: 'application/javascript'
};

// 文件大小单位
const SIZE_UNITS = {
  B: 'B',
  KB: 'KB',
  MB: 'MB'
};

// 通知配置
const NOTIFICATION = {
  DURATION: 3000,
  SLIDE_IN_DURATION: 300,
  SLIDE_OUT_DURATION: 300,
  Z_INDEX: 10000
};

// 上传配置
const UPLOAD = {
  PROGRESS_INTERVAL: 300,
  PROGRESS_STEP: 100 / 2,
  MAX_PROGRESS: 90
};

// UI 配置
const UI = {
  PROGRESS_BAR_MAX_WIDTH: '100%',
  POPUP_WIDTH: 480,
  POPUP_MIN_HEIGHT: 400,
  POPUP_MAX_HEIGHT: 700
};
