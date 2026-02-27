// popup.js - 扩展弹窗逻辑

let allPages = [];
let allResources = [];
let currentTab = null;
let isTargetPage = false;
let currentPlatform = null;

// 默认主题配置
const DEFAULT_THEME_COLORS = {
  primaryColor: '#667eea',
  primaryDark: '#5568d3',
  dangerColor: '#dc3545',
  successColor: '#28a745',
  infoColor: '#17a2b8',
  gradientStart: '#667eea',
  gradientEnd: '#764ba2'
};

// 应用主题到页面
async function applyTheme() {
  try {
    const result = await chrome.storage.sync.get('themeColors');
    const colors = result.themeColors || DEFAULT_THEME_COLORS;
    
    const root = document.documentElement;
    root.style.setProperty('--primary-color', colors.primaryColor);
    root.style.setProperty('--primary-dark', colors.primaryDark);
    root.style.setProperty('--danger-color', colors.dangerColor);
    root.style.setProperty('--success-color', colors.successColor);
    root.style.setProperty('--info-color', colors.infoColor);
    root.style.setProperty('--gradient-start', colors.gradientStart);
    root.style.setProperty('--gradient-end', colors.gradientEnd);
  } catch (e) {
    console.error('应用主题失败:', e);
  }
}

// 获取当前标签页
async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// 检查内容脚本是否就绪
async function isContentScriptReady(tabId, timeout = 1000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), timeout);
    chrome.tabs.sendMessage(tabId, { type: 'PING' }, (response) => {
      clearTimeout(timer);
      if (chrome.runtime.lastError) {
        resolve(false);
      } else {
        resolve(response && response.pong === true);
      }
    });
  });
}

// 检查当前页面是否是目标 AI 平台
async function checkPlatformStatus() {
  currentTab = await getCurrentTab();
  const url = currentTab?.url || '';
  
  if (url.includes('chat.deepseek.com')) {
    isTargetPage = true;
    currentPlatform = 'deepseek';
  } else if (url.includes('qianwen.com') || url.includes('qwen.ai')) {
    isTargetPage = true;
    currentPlatform = 'qianwen';
  } else {
    isTargetPage = false;
    currentPlatform = null;
  }
  
  updateStatusUI();
}

// 更新状态 UI
function updateStatusUI() {
  const indicator = document.getElementById('statusIndicator');
  const statusText = document.getElementById('statusText');
  const uploadBtn = document.getElementById('uploadSelectedBtn');
  
  if (isTargetPage) {
    indicator.classList.add('active');
    const platformName = currentPlatform === 'deepseek' ? 'DeepSeek' : '通义千问';
    statusText.textContent = `当前平台: ${platformName}`;
    uploadBtn.disabled = false;
    uploadBtn.textContent = `📤 上传到 ${platformName}`;
  } else {
    indicator.classList.remove('active');
    statusText.textContent = '未在 DeepSeek 或通义千问页面';
    uploadBtn.disabled = true;
    uploadBtn.textContent = '📤 上传到 DeepSeek';
  }
}

// 加载页面列表
async function loadPages(retry = true) {
  try {
    const result = await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.GET_ALL_PAGES });
    if (result && result.status === 'error') {
      throw new Error(result.message || '获取页面列表失败');
    }
    if (!Array.isArray(result)) {
      logger.error('获取页面列表返回非数组:', result);
      throw new Error('返回数据格式错误');
    }
    allPages = result;
    renderPages();
  } catch (error) {
    logger.error('加载页面列表失败:', error);
    if (retry) {
      logger.info('尝试重置数据库连接并重试...');
      try {
        await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.RESET_DB });
        return loadPages(false);
      } catch (resetError) {
        logger.error('重置数据库失败:', resetError);
      }
    }
    window.showEmptyState('pageList', '加载失败，请刷新重试');
  }
}

// 加载资源列表
async function loadResources(retry = true) {
  try {
    const result = await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.GET_ALL_RESOURCES });
    if (result && result.status === 'error') {
      throw new Error(result.message || '获取资源列表失败');
    }
    if (!Array.isArray(result)) {
      logger.error('获取资源列表返回非数组:', result);
      throw new Error('返回数据格式错误');
    }
    allResources = result;
    renderResources();
  } catch (error) {
    logger.error('加载资源列表失败:', error);
    if (retry) {
      logger.info('尝试重置数据库连接并重试...');
      try {
        await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.RESET_DB });
        return loadResources(false);
      } catch (resetError) {
        logger.error('重置数据库失败:', resetError);
      }
    }
    window.showResourceEmptyState('resourceList', '加载失败，请刷新重试');
  }
}

// 渲染页面列表
function renderPages() {
  const container = document.getElementById('pageList');
  const countEl = document.getElementById('pageCount');
  
  countEl.textContent = allPages.length;
  
  if (allPages.length === 0) {
    window.showEmptyState('pageList', '暂无保存的页面');
    return;
  }
  
  container.innerHTML = allPages.map(page => `
    <div class="page-item" data-id="${page.id}">
      <input type="checkbox" class="page-checkbox" data-id="${page.id}">
      <div class="page-info">
        <div class="page-title" title="${escapeHtml(page.title)}">${escapeHtml(page.title)}</div>
        <div class="page-url" title="${escapeHtml(page.url)}">${escapeHtml(page.url)}</div>
        <div class="page-time">${new Date(page.savedAt).toLocaleString()}</div>
      </div>
      <div class="page-actions">
        <button class="btn btn-secondary download-btn" data-id="${page.id}">📥</button>
        <button class="btn btn-danger delete-btn" data-id="${page.id}">🗑️</button>
      </div>
    </div>
  `).join('');
  
  // 绑定事件
  container.querySelectorAll('.page-checkbox').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const item = e.target.closest('.page-item');
      item.classList.toggle('selected', e.target.checked);
      updateButtonStates();
    });
  });
  
  container.querySelectorAll('.page-item').forEach(div => {
    div.addEventListener('click', (e) => {
      if (e.target.closest('.page-checkbox') || e.target.closest('.delete-btn') || e.target.closest('.download-btn')) {
        return;
      }
      const checkbox = div.querySelector('.page-checkbox');
      checkbox.checked = !checkbox.checked;
      div.classList.toggle('selected', checkbox.checked);
      updateButtonStates();
    });
  });
  
  container.querySelectorAll('.download-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      downloadPage(btn.dataset.id);
    });
  });
  
  container.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deletePage(btn.dataset.id);
    });
  });
}

// 渲染资源列表
function renderResources() {
  const container = document.getElementById('resourceList');
  const countEl = document.getElementById('resourceCount');
  
  countEl.textContent = allResources.length;
  
  if (allResources.length === 0) {
    showResourceEmptyState('暂无保存的资源');
    return;
  }
  
  container.innerHTML = allResources.map(resource => `
    <div class="resource-item" data-id="${resource.id}">
      <input type="checkbox" class="resource-checkbox" data-id="${resource.id}">
      <div class="resource-icon ${resource.type}">${getResourceIcon(resource.type)}</div>
      <div class="resource-info">
        <div class="resource-filename" title="${escapeHtml(resource.metadata?.filename || resource.url)}">${escapeHtml(resource.metadata?.filename || resource.url)}</div>
        <div class="resource-meta">${formatSize(resource.size)}</div>
      </div>
      <div class="resource-actions">
        <button class="btn btn-danger delete-resource-btn" data-id="${resource.id}">🗑️</button>
      </div>
    </div>
  `).join('');
  
  // 绑定事件
  container.querySelectorAll('.resource-checkbox').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const item = e.target.closest('.resource-item');
      item.classList.toggle('selected', e.target.checked);
      updateButtonStates();
    });
  });
  
  container.querySelectorAll('.resource-item').forEach(div => {
    div.addEventListener('click', (e) => {
      if (e.target.closest('.resource-checkbox') || e.target.closest('.delete-resource-btn')) {
        return;
      }
      const checkbox = div.querySelector('.resource-checkbox');
      checkbox.checked = !checkbox.checked;
      div.classList.toggle('selected', checkbox.checked);
      updateButtonStates();
    });
  });
  
  container.querySelectorAll('.delete-resource-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteResource(btn.dataset.id);
    });
  });
}

// 更新按钮状态
function updateButtonStates() {
  const selectedPages = document.querySelectorAll('.page-checkbox:checked').length;
  const selectedResources = document.querySelectorAll('.resource-checkbox:checked').length;
  const total = selectedPages + selectedResources;
  
  document.getElementById('downloadSelectedBtn').disabled = total === 0;
  document.getElementById('deleteSelectedBtn').disabled = total === 0;
}

// 获取选中的页面 ID
function getSelectedIds() {
  return Array.from(document.querySelectorAll('.page-checkbox:checked')).map(cb => cb.dataset.id);
}

// 获取选中的页面数据
function getSelectedPages() {
  const ids = getSelectedIds();
  return allPages.filter(p => ids.includes(p.id));
}

// 获取选中的资源数据
function getSelectedResources() {
  const checkboxes = document.querySelectorAll('.resource-checkbox:checked');
  const ids = Array.from(checkboxes).map(cb => cb.dataset.id);
  return allResources.filter(r => ids.includes(r.id));
}

// 下载单个页面
async function downloadPage(id) {
  const page = allPages.find(p => p.id === id);
  if (!page) throw new Error('页面不存在');
  
  const metadata = {
    url: page.url,
    title: page.title,
    savedAt: new Date(page.savedAt).toISOString(),
    originalSize: page.size
  };
  
  const wrappedHtml = wrapHtmlWithMetadata(page.html, metadata);
  const blob = new Blob([wrappedHtml], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const fileName = `${page.title.replace(/[\\/:*?"<>|]/g, '_')}.html`;
  
  return new Promise((resolve, reject) => {
    chrome.downloads.download({
      url: url,
      filename: fileName,
      saveAs: false
    }, (downloadId) => {
      URL.revokeObjectURL(url);
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(downloadId);
      }
    });
  });
}

// 下载选中的页面
async function downloadSelected() {
  const selected = getSelectedPages();
  if (selected.length === 0) {
    alert('请至少选择一个页面');
    return;
  }
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const page of selected) {
    try {
      await downloadPage(page.id);
      successCount++;
    } catch (error) {
      errorCount++;
      logger.error('下载页面失败:', page.title, error);
    }
  }
  
  if (errorCount > 0) {
    alert(`下载完成：成功 ${successCount} 个，失败 ${errorCount} 个`);
  } else {
    alert(`成功下载 ${successCount} 个页面`);
  }
}

// 删除单个页面
async function deletePage(id) {
  if (!confirm('确定要删除这个页面吗？')) {
    return;
  }
  
  try {
    await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.DELETE_PAGE, id });
    await loadPages();
  } catch (error) {
    logger.error('删除页面失败:', error);
    alert('删除失败，请重试');
  }
}

// 删除单个资源
async function deleteResource(id) {
  if (!confirm('确定要删除这个资源吗？')) {
    return;
  }
  
  try {
    await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.DELETE_RESOURCE, id });
    await loadResources();
  } catch (error) {
    logger.error('删除资源失败:', error);
    alert('删除失败，请重试');
  }
}

// 删除选中的页面
async function deleteSelected() {
  const ids = getSelectedIds();
  if (ids.length === 0) {
    alert('请至少选择一个页面');
    return;
  }

  if (!confirm(`确定要删除选中的 ${ids.length} 个页面吗？`)) {
    return;
  }

  for (const id of ids) {
    await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.DELETE_PAGE, id });
  }
  await loadPages();
}

// 保存当前页面
async function saveCurrentPage() {
  const btn = document.getElementById('saveCurrentBtn');
  btn.disabled = true;
  btn.textContent = '⏳ 保存中...';
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        return {
          html: document.documentElement.outerHTML,
          title: document.title,
          url: location.href
        };
      }
    });
    
    const { html, title, url } = results[0].result;
    
    // 清理HTML内容（过滤追踪链接、大型样式块、配置脚本等）
    const { html: cleanedHtml, stats } = await cleanHtmlContent(html, { loadConfig: true });
    
    // 记录清理统计
    if (stats && stats.savedSize > 0) {
      logger.info('HTML清理统计:', {
        原始大小: formatSize(stats.originalSize),
        清理后: formatSize(stats.cleanedSize),
        节省: formatSize(stats.savedSize) + ' (' + stats.savedPercent + '%)',
        移除追踪链接: stats.removedTracking,
        移除样式块: stats.removedStyles,
        移除脚本: stats.removedScripts
      });
    }
    
    await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.SAVE_PAGE,
      data: { html: cleanedHtml, title, url, size: cleanedHtml.length }
    });
    
    await loadPages();
    
    // 显示清理效果
    if (stats && stats.savedPercent > 0) {
      btn.textContent = `✅ 已清理 ${stats.savedPercent}%`;
    } else {
      btn.textContent = '✅ 保存成功';
    }
    
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = '💾 保存当前页面';
    }, 1500);
  } catch (error) {
    logger.error('保存页面失败:', error);
    btn.textContent = '❌ 保存失败';
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = '💾 保存当前页面';
    }, 1500);
  }
}

// 上传选中的页面到当前 AI 平台
async function uploadSelected() {
  currentTab = await getCurrentTab();
  await checkPlatformStatus();

  const ready = await isContentScriptReady(currentTab.id);
  if (!ready) {
    alert('当前 AI 页面尚未完全加载，请刷新后重试。');
    return;
  }

  const selectedPages = getSelectedPages();
  const selectedResources = getSelectedResources();
  const totalItems = selectedPages.length + selectedResources.length;

  if (totalItems === 0) {
    alert('请至少选择一个项目（页面或资源）');
    return;
  }

  if (!isTargetPage || !currentTab) {
    alert('请在 DeepSeek 或通义千问官网页面使用此功能');
    return;
  }

  const overlay = document.getElementById('progressOverlay');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');
  overlay.classList.add('active');

  let progressInterval;
  try {
    chrome.tabs.sendMessage(
      currentTab.id,
      {
        type: 'UPLOAD_ITEMS',
        items: [
          ...selectedPages.map((p) => ({ kind: 'page', data: p })),
          ...selectedResources.map((r) => ({ kind: 'resource', id: r.id })),
        ],
      },
      (response) => {
        if (progressInterval) clearInterval(progressInterval);
        overlay.classList.remove('active');

        const platformName = currentPlatform === 'deepseek' ? 'DeepSeek' : '通义千问';
        if (chrome.runtime.lastError) {
          logger.error('发送消息失败:', chrome.runtime.lastError);
          alert(`❌ 上传失败：${chrome.runtime.lastError.message}`);
        } else if (response && response.status === 'ok') {
          alert(`✅ 成功上传 ${response.count} 个项目到 ${platformName}！`);
        } else {
          alert(`❌ 上传失败，请确保 ${platformName} 页面已加载完成`);
        }
      }
    );

    let progress = 0;
    progressInterval = setInterval(() => {
      progress += (100 / totalItems) * 0.5;
      if (progress >= 90) {
        clearInterval(progressInterval);
        progress = 90;
      }
      progressFill.style.width = progress + '%';
      progressText.textContent = `正在上传... ${Math.round(progress)}%`;
    }, 300);
  } catch (error) {
    if (progressInterval) clearInterval(progressInterval);
    overlay.classList.remove('active');
    logger.error('上传失败:', error);
    alert('上传失败: ' + error.message);
  }
}

// 全选
function selectAll() {
  document.querySelectorAll('.page-checkbox').forEach(cb => cb.checked = true);
  document.querySelectorAll('.resource-checkbox').forEach(cb => cb.checked = true);
  updateButtonStates();
}

// 取消全选
function deselectAll() {
  document.querySelectorAll('.page-checkbox').forEach(cb => cb.checked = false);
  document.querySelectorAll('.resource-checkbox').forEach(cb => cb.checked = false);
  updateButtonStates();
}

// 打开设置页面
function openSettings() {
  chrome.runtime.openOptionsPage();
}

// 打开资源管理页面
async function openResourcesManager() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const resources = [];
        const seen = new Set();
        
        performance.getEntriesByType('resource').forEach(entry => {
          if (seen.has(entry.name)) return;
          seen.add(entry.name);
          
          let type = 'other';
          const url = entry.name.toLowerCase();
          if (url.endsWith('.css') || url.includes('.css?')) type = 'css';
          else if (url.endsWith('.js') || url.includes('.js?')) type = 'js';
          else if (url.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)/)) type = 'image';
          else if (url.match(/\.(woff|woff2|ttf|eot)/)) type = 'font';
          
          resources.push({
            id: `res-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            url: entry.name,
            type: type,
            size: entry.transferSize || entry.encodedBodySize || 0,
            duration: entry.duration,
            metadata: {
              filename: entry.name.split('/').pop().split('?')[0] || 'unknown'
            }
          });
        });
        
        return {
          resources: resources,
          pageInfo: {
            url: location.href,
            title: document.title
          }
        };
      }
    });
    
    const { resources, pageInfo } = results[0].result;
    
    await chrome.storage.local.set({
      currentResources: {
        resources: resources,
        url: pageInfo.url,
        title: pageInfo.title
      }
    });
    
    chrome.tabs.create({ url: chrome.runtime.getURL('resources.html') });
  } catch (error) {
    logger.error('获取页面资源失败:', error);
    alert('获取页面资源失败: ' + error.message);
  }
}

// 绑定所有事件
function bindEvents() {
  document.getElementById('saveCurrentBtn')?.addEventListener('click', saveCurrentPage);
  document.getElementById('manageResourcesBtn')?.addEventListener('click', openResourcesManager);
  document.getElementById('selectAllBtn')?.addEventListener('click', selectAll);
  document.getElementById('deselectAllBtn')?.addEventListener('click', deselectAll);
  document.getElementById('downloadSelectedBtn')?.addEventListener('click', downloadSelected);
  document.getElementById('deleteSelectedBtn')?.addEventListener('click', deleteSelected);
  document.getElementById('uploadSelectedBtn')?.addEventListener('click', uploadSelected);
  document.getElementById('settingsBtn')?.addEventListener('click', openSettings);
}

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  // 应用主题
  await applyTheme();
  
  // 始终执行事件绑定，避免按钮无效
  bindEvents();

  // 异步初始化，失败只记录不影响 UI 交互
  try {
    await checkPlatformStatus();
  } catch (e) {
    logger.error('checkPlatformStatus error', e);
  }

  try {
    await loadPages();
  } catch (e) {
    logger.error('loadPages error', e);
    showEmptyState('加载页面失败');
  }

  try {
    await loadResources();
  } catch (e) {
    logger.error('loadResources error', e);
    window.showResourceEmptyState('resourceList', '加载资源失败');
  }
});
