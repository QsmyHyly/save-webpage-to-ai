// popup.js - DeepSeek 页面管理器
// 负责管理已保存的页面列表，支持保存、删除、上传到 DeepSeek

let allPages = [];
let allResources = [];
let isTargetPage = false;
let currentTab = null;
let currentPlatform = ''; // 'deepseek' | 'qianwen' | ''

/**
 * 下载单个页面为 HTML 文件
 * @param {Object} page - 页面对象
 */
async function downloadPage(page) {
  const metadata = {
    url: page.url,
    title: page.title,
    savedAt: new Date(page.savedAt).toISOString(),
    originalSize: page.size,
    capturedFrom: '保存网页并发送给deepseek或千问'
  };

  const wrappedHtml = wrapHtmlWithMetadata(page.html, metadata);
  const blob = new Blob([wrappedHtml], { type: 'text/html' });
  const url = URL.createObjectURL(blob);

  const fileName = `${page.title.replace(/[\\/:*?"<>|]/g, '_')}.html`;

  try {
    await chrome.downloads.download({
      url: url,
      filename: fileName,
      saveAs: false
    });
  } catch (error) {
    console.error('下载失败:', error);
    alert('下载失败: ' + error.message);
  }
}

/**
 * 获取启用的屏蔽选择器列表
 */
async function getEnabledSelectors() {
  const [profilesResult, currentProfileResult] = await Promise.all([
    chrome.storage.sync.get('profiles'),
    chrome.storage.sync.get('currentProfileId')
  ]);

  const profiles = profilesResult.profiles || {};
  const currentProfileId = currentProfileResult.currentProfileId || 'default';
  const profile = profiles[currentProfileId];

  if (profile) {
    const idRules = profile.idRules || [];
    const classRules = profile.classRules || [];
    return [...idRules.filter(r => r.enabled), ...classRules.filter(r => r.enabled)].map(r => r.selector);
  }

  // 如果配置不存在，返回默认规则
  const DEFAULT_ID_RULES = [
    { selector: '#doubao-ai-assistant', enabled: true },
    { selector: '[aria-label="flow-ai-assistant"]', enabled: true },
    { selector: '.mini-header__logo', enabled: true }
  ];
  const DEFAULT_CLASS_RULES = [
    { selector: '.ad-banner', enabled: true },
    { selector: '[data-ad]', enabled: true },
    { selector: '.popup-overlay', enabled: true }
  ];
  return [...DEFAULT_ID_RULES, ...DEFAULT_CLASS_RULES].map(r => r.selector);
}

// 获取当前标签页
async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// 检查当前标签页是否为支持的 AI 平台
async function checkPlatformStatus() {
  currentTab = await getCurrentTab();

  if (!currentTab || !currentTab.url) {
    isTargetPage = false;
    currentPlatform = '';
    updateStatusUI();
    return;
  }

  const url = currentTab.url;

  // 检查 DeepSeek
  if (url.startsWith('https://chat.deepseek.com/')) {
    isTargetPage = true;
    currentPlatform = 'deepseek';
  }
  // 检查通义千问
  else if (url.includes('qianwen.com') || url.includes('qwen.ai')) {
    isTargetPage = true;
    currentPlatform = 'qianwen';
  }
  else {
    isTargetPage = false;
    currentPlatform = '';
  }

  updateStatusUI();
}

// 更新状态栏 UI
function updateStatusUI() {
  const indicator = document.getElementById('statusIndicator');
  const statusText = document.getElementById('statusText');
  const uploadBtn = document.getElementById('uploadSelectedBtn');

  if (isTargetPage) {
    indicator.classList.add('active');
    const platformName = currentPlatform === 'deepseek' ? 'DeepSeek' : '通义千问';
    statusText.textContent = `✅ 当前在 ${platformName} 页面，可以上传`;
    uploadBtn.disabled = false;
    uploadBtn.title = '';
    uploadBtn.textContent = `📤 上传到 ${platformName}`;
  } else {
    indicator.classList.remove('active');
    statusText.textContent = '⚠️ 请在 DeepSeek 或通义千问官网使用上传功能';
    uploadBtn.disabled = true;
    uploadBtn.title = '请在支持的 AI 平台使用此功能';
    uploadBtn.textContent = '📤 上传';
  }
}

// 加载页面列表
async function loadPages() {
  try {
    allPages = await chrome.runtime.sendMessage({ type: 'GET_ALL_PAGES' });
    renderList();
    updatePageCount();
  } catch (error) {
    console.error('加载页面列表失败:', error);
    showEmptyState('加载失败，请重试');
  }
}

// 加载资源列表
async function loadResources() {
  try {
    allResources = await chrome.runtime.sendMessage({ type: 'GET_ALL_RESOURCES' });
    renderResourceList();
    updateResourceCount();
  } catch (error) {
    console.error('加载资源列表失败:', error);
    showResourceEmptyState('加载失败，请重试');
  }
}

// 更新页面计数
function updatePageCount() {
  const countEl = document.getElementById('pageCount');
  if (countEl) {
    countEl.textContent = allPages.length;
  }
}

// 更新资源计数
function updateResourceCount() {
  const countEl = document.getElementById('resourceCount');
  if (countEl) {
    countEl.textContent = allResources.length;
  }
}

// 渲染页面列表
function renderList() {
  const container = document.getElementById('pageList');

  if (allPages.length === 0) {
    showEmptyState('暂无保存的页面，点击上方"保存当前页面"按钮添加');
    return;
  }

  container.innerHTML = '';

  // 按保存时间倒序排列
  allPages.sort((a, b) => b.savedAt - a.savedAt);

  allPages.forEach(page => {
    const div = document.createElement('div');
    div.className = 'page-item';
    div.innerHTML = `
      <input type="checkbox" class="page-checkbox" data-id="${page.id}">
      <div class="page-info">
        <div class="page-title" title="${escapeHtml(page.title)}">${escapeHtml(page.title)}</div>
        <div class="page-url" title="${escapeHtml(page.url)}">${escapeHtml(page.url)}</div>
        <div class="page-time">${new Date(page.savedAt).toLocaleString()}</div>
        <span class="size-badge">${formatSize(page.size || 0)}</span>
      </div>
      <div class="page-actions">
        <button class="btn btn-info download-one" data-id="${page.id}">下载</button>
        <button class="btn btn-danger delete-one" data-id="${page.id}">删除</button>
      </div>
    `;

    // 为整个列表项添加点击事件（切换复选框）
    div.addEventListener('click', (event) => {
      // 如果点击的元素是复选框本身、下载按钮、删除按钮或它们的子元素，则忽略行点击
      if (event.target.closest('.page-checkbox') || event.target.closest('.download-one') || event.target.closest('.delete-one')) {
        return;
      }
      // 切换当前行的复选框状态
      const checkbox = div.querySelector('.page-checkbox');
      if (checkbox) {
        checkbox.checked = !checkbox.checked;
      }
    });

    container.appendChild(div);
  });

  // 绑定单个删除按钮
  document.querySelectorAll('.delete-one').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation(); // 防止事件冒泡到行点击
      const id = e.target.dataset.id;
      await deletePage(id);
    });
  });

  // 绑定单个下载按钮
  document.querySelectorAll('.download-one').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = e.target.dataset.id;
      const page = allPages.find(p => p.id === id);
      if (page) {
        await downloadPage(page);
      }
    });
  });
}

// 渲染资源列表
function renderResourceList() {
  const container = document.getElementById('resourceList');

  if (allResources.length === 0) {
    showResourceEmptyState('暂无保存的资源，点击"管理外部资源"添加');
    return;
  }

  container.innerHTML = '';

  // 按保存时间倒序排列
  allResources.sort((a, b) => b.savedAt - a.savedAt);

  allResources.forEach(resource => {
    const div = document.createElement('div');
    div.className = 'resource-item';
    
    const icon = getResourceIcon(resource.type);
    const sizeText = resource.size ? formatSize(resource.size) : '未知大小';
    
    div.innerHTML = `
      <input type="checkbox" class="resource-checkbox" data-id="${resource.id}">
      <div class="resource-icon ${resource.type}">${icon}</div>
      <div class="resource-info">
        <div class="resource-filename" title="${escapeHtml(resource.metadata?.filename || resource.url)}">${escapeHtml(resource.metadata?.filename || resource.url)}</div>
        <div class="resource-meta">${sizeText} | ${resource.type.toUpperCase()}</div>
      </div>
      <div class="resource-actions">
        <button class="btn btn-danger delete-resource" data-id="${resource.id}">删除</button>
      </div>
    `;
    
    // 为整个列表项添加点击事件（切换复选框）
    div.addEventListener('click', (event) => {
      if (event.target.closest('.resource-checkbox') || event.target.closest('.delete-resource')) {
        return;
      }
      const checkbox = div.querySelector('.resource-checkbox');
      if (checkbox) {
        checkbox.checked = !checkbox.checked;
      }
    });

    container.appendChild(div);
  });

  // 绑定单个删除按钮
  document.querySelectorAll('.delete-resource').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = e.target.dataset.id;
      await deleteResource(id);
    });
  });
}

// 删除单个页面
async function deletePage(id) {
  try {
    await chrome.runtime.sendMessage({ type: 'DELETE_PAGE', id });
    await loadPages();
  } catch (error) {
    console.error('删除页面失败:', error);
    alert('删除失败，请重试');
  }
}

// 删除单个资源
async function deleteResource(id) {
  try {
    await chrome.runtime.sendMessage({ type: 'DELETE_RESOURCE', id });
    await loadResources();
  } catch (error) {
    console.error('删除资源失败:', error);
    alert('删除失败，请重试');
  }
}

// 保存当前页面
async function saveCurrentPage() {
  const btn = document.getElementById('saveCurrentBtn');
  btn.disabled = true;
  btn.textContent = '⏳ 保存中...';

  try {
    const tab = await getCurrentTab();
    const selectors = await getEnabledSelectors();

    // 执行脚本获取页面内容（先移除屏蔽元素）
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (blockedSelectors) => {
        // 克隆整个文档（深拷贝），避免修改原始页面
        const clonedDoc = document.documentElement.cloneNode(true);

        // 在克隆的副本中移除屏蔽的元素
        blockedSelectors.forEach(sel => {
          try {
            clonedDoc.querySelectorAll(sel).forEach(el => el.remove());
          } catch (e) {
            // 忽略无效选择器
          }
        });

        return {
          html: clonedDoc.outerHTML,
          url: location.href,
          title: document.title,
          size: new Blob([clonedDoc.outerHTML]).size
        };
      },
      args: [selectors]
    });

    const pageData = results[0].result;
    pageData.savedAt = Date.now();

    await chrome.runtime.sendMessage({ type: 'SAVE_PAGE', data: pageData });

    btn.textContent = '✅ 已保存';
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = '💾 保存当前页面';
    }, 1000);

    await loadPages();
  } catch (error) {
    console.error('保存页面失败:', error);
    btn.textContent = '❌ 保存失败';
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = '💾 保存当前页面';
    }, 1500);
  }
}

// 获取选中的页面 ID
function getSelectedIds() {
  const checkboxes = document.querySelectorAll('.page-checkbox:checked');
  return Array.from(checkboxes).map(cb => cb.dataset.id);
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
    await chrome.runtime.sendMessage({ type: 'DELETE_PAGE', id });
  }
  await loadPages();
}

// 上传选中的页面到当前 AI 平台
async function uploadSelected() {
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

  // 显示进度遮罩
  const overlay = document.getElementById('progressOverlay');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');
  overlay.classList.add('active');

  try {
    // 向当前 AI 页面内容脚本发送消息，合并页面和资源
    chrome.tabs.sendMessage(currentTab.id, {
      type: 'UPLOAD_ITEMS',
      items: [
        ...selectedPages.map(p => ({ kind: 'page', data: p })),
        ...selectedResources.map(r => ({ kind: 'resource', id: r.id }))
      ]
    }, (response) => {
      overlay.classList.remove('active');

      const platformName = currentPlatform === 'deepseek' ? 'DeepSeek' : '通义千问';
      if (response && response.status === 'ok') {
        alert(`✅ 成功上传 ${response.count} 个项目到 ${platformName}！`);
      } else {
        alert(`❌ 上传失败，请确保 ${platformName} 页面已加载完成`);
      }
    });

    // 模拟进度更新
    let progress = 0;
    const interval = setInterval(() => {
      progress += 100 / totalItems / 2;
      if (progress >= 90) {
        clearInterval(interval);
        progress = 90;
      }
      progressFill.style.width = progress + '%';
      progressText.textContent = `正在上传... ${Math.round(progress)}%`;
    }, 300);

  } catch (error) {
    overlay.classList.remove('active');
    console.error('上传失败:', error);
    alert('上传失败: ' + error.message);
  }
}

// 全选
function selectAll() {
  document.querySelectorAll('.page-checkbox').forEach(cb => cb.checked = true);
  document.querySelectorAll('.resource-checkbox').forEach(cb => cb.checked = true);
}

// 取消全选
function deselectAll() {
  document.querySelectorAll('.page-checkbox').forEach(cb => cb.checked = false);
  document.querySelectorAll('.resource-checkbox').forEach(cb => cb.checked = false);
}

// 打开设置页面
function openSettings() {
  chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
}

// 打开资源管理页面
async function openResourcesManager() {
  try {
    const tab = await getCurrentTab();
    
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const resources = performance.getEntriesByType('resource');
        const pageUrl = location.href;
        
        return {
          url: pageUrl,
          title: document.title,
          resources: resources.map((res, index) => {
            let type = 'other';
            let mimeType = '';
            
            switch (res.initiatorType) {
              case 'script':
                type = 'js';
                mimeType = 'application/javascript';
                break;
              case 'link':
                type = 'css';
                mimeType = 'text/css';
                break;
              case 'img':
              case 'image':
                type = 'image';
                mimeType = guessMimeType(res.name);
                break;
              case 'css':
                type = 'css';
                mimeType = 'text/css';
                break;
            }
            
            return {
              id: `res-${index}`,
              url: res.name,
              type: type,
              mimeType: mimeType,
              size: res.transferSize || res.encodedBodySize || 0,
              duration: res.duration,
              initiatorType: res.initiatorType,
              metadata: {
                filename: res.name.split('/').pop()
              }
            };
          })
        };
      }
    });
    
    const pageData = results[0].result;
    
    await chrome.storage.local.set({
      currentResources: pageData
    });
    
    chrome.tabs.create({ url: chrome.runtime.getURL('resources.html') });
  } catch (error) {
    console.error('打开资源管理页面失败:', error);
    alert('打开资源管理页面失败: ' + error.message);
  }
}

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  // 检查平台状态
  await checkPlatformStatus();

  // 加载页面列表
  await loadPages();  
  // 加载资源列表
  await loadResources();

  // 绑定事件
  document.getElementById('saveCurrentBtn').addEventListener('click', saveCurrentPage);
  document.getElementById('manageResourcesBtn').addEventListener('click', openResourcesManager);
  document.getElementById('selectAllBtn').addEventListener('click', selectAll);
  document.getElementById('deselectAllBtn').addEventListener('click', deselectAll);
  document.getElementById('downloadSelectedBtn').addEventListener('click', downloadSelected);
  document.getElementById('deleteSelectedBtn').addEventListener('click', deleteSelected);
  document.getElementById('uploadSelectedBtn').addEventListener('click', uploadSelected);
  document.getElementById('settingsBtn').addEventListener('click', openSettings);
});
