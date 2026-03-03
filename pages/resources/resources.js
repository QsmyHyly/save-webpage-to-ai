// resources.js
let allPages = [];
let currentResources = [];
let currentPageId = null;
let currentResourcesData = null;

// 解析 URL 参数
const urlParams = new URLSearchParams(window.location.search);
const pageUrl = urlParams.get('url');

// 如果 MESSAGE_TYPES 未定义，直接抛出错误，避免静默失败
if (typeof MESSAGE_TYPES === 'undefined') {
  throw new Error('MESSAGE_TYPES 未定义，请确保 constants.js 已正确加载');
}

document.addEventListener('DOMContentLoaded', async () => {
  await applyTheme();
  await loadCurrentResources();
  bindEvents();
});
