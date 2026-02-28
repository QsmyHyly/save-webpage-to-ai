// popup.js - 主入口，定义共享变量和事件绑定

// 共享变量（供各模块使用）
let allFiles = [];
let currentTab = null;
let isTargetPage = false;
let currentPlatform = null;

function bindEvents() {
  document.getElementById('saveCurrentBtn')?.addEventListener('click', saveCurrentPage);
  document.getElementById('saveHtmlBtn')?.addEventListener('click', saveHTMLFromPage);
  document.getElementById('saveJsBtn')?.addEventListener('click', saveJSFromPage);
  document.getElementById('saveCssBtn')?.addEventListener('click', saveCSSFromPage);
  document.getElementById('manageResourcesBtn')?.addEventListener('click', openPageResourcesForSelected);
  document.getElementById('selectAllCheckbox')?.addEventListener('click', toggleSelectAll);
  document.getElementById('downloadSelectedBtn')?.addEventListener('click', downloadSelected);
  document.getElementById('deleteSelectedBtn')?.addEventListener('click', deleteSelected);
  document.getElementById('uploadSelectedBtn')?.addEventListener('click', uploadSelected);
}

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  await applyTheme();
  bindEvents();
  try {
    await checkPlatformStatus();
  } catch (e) { logger.error(e); }

  // 加载文件列表，失败时自动重试一次
  try {
    await loadFiles();
  } catch (e) {
    logger.warn('首次加载文件列表失败，1秒后重试...', e);
    setTimeout(async () => {
      try {
        await loadFiles();
      } catch (e2) {
        logger.error('重试加载文件列表仍然失败', e2);
      }
    }, 1000);
  }
});
