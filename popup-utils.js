// popup-utils.js - 弹窗页面专用工具
// 公共函数已移至 common-utils.js，此文件仅保留 popup 特有逻辑

// 封装 common-utils.js 中的函数，保持原有调用方式
function showEmptyState(message) {
  window.showEmptyState('pageList', message);
}

function showResourceEmptyState(message) {
  window.showResourceEmptyState('resourceList', message);
}

// 其他函数都已移至 common-utils.js，无需重复
