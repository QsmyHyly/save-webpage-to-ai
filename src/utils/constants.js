// constants.js - 常量定义
// 集中管理所有常量，便于维护和修改

// 数据库配置
const DB_CONFIG = {
  NAME: 'PageCacheDB',
  VERSION: 2,
  PAGES_STORE: 'pages',
  RESOURCES_STORE: 'resources'
};

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

// 默认屏蔽规则
const DEFAULT_BLOCKING_RULES = {
  idRules: [
    { selector: '#doubao-ai-assistant', enabled: true },
    { selector: '[aria-label="flow-ai-assistant"]', enabled: true },
    { selector: '.mini-header__logo', enabled: true }
  ],
  classRules: [
    { selector: '.ad-banner', enabled: true },
    { selector: '[data-ad]', enabled: true },
    { selector: '.popup-overlay', enabled: true }
  ]
};

// 存储键名
const STORAGE_KEYS = {
  PROFILES: 'profiles',
  CURRENT_PROFILE_ID: 'currentProfileId',
  CURRENT_RESOURCES: 'currentResources'
};

// 消息类型
const MESSAGE_TYPES = {
  GET_ALL_PAGES: 'GET_ALL_PAGES',
  SAVE_PAGE: 'SAVE_PAGE',
  DELETE_PAGE: 'DELETE_PAGE',
  FIND_PAGE_BY_URL: 'FIND_PAGE_BY_URL',
  CLEAR_ALL_PAGES: 'CLEAR_ALL_PAGES',
  GET_RESOURCES_BY_PAGE_ID: 'GET_RESOURCES_BY_PAGE_ID',
  GET_ALL_RESOURCES: 'GET_ALL_RESOURCES',
  GET_RESOURCE_BY_ID: 'GET_RESOURCE_BY_ID',
  SAVE_RESOURCES: 'SAVE_RESOURCES',
  DELETE_RESOURCE: 'DELETE_RESOURCE',
  DELETE_RESOURCES_BY_PAGE_ID: 'DELETE_RESOURCES_BY_PAGE_ID',
  UPLOAD_PAGES: 'UPLOAD_PAGES',
  UPLOAD_ITEMS: 'UPLOAD_ITEMS',
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
