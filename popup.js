// popup.js - DeepSeek 页面管理器
// 负责管理已保存的页面列表，支持保存、删除、上传到 DeepSeek

let allPages = [];
let isTargetPage = false;
let currentTab = null;
let currentPlatform = ''; // 'deepseek' | 'qianwen' | ''

// 格式化文件大小
function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * 将元数据以 HTML 注释形式添加到原始 HTML 内容最前面
 * @param {string} originalHtml - 原始 HTML 内容
 * @param {Object} metadata - 元数据对象
 * @returns {string} 包装后的 HTML
 */
function wrapHtmlWithMetadata(originalHtml, metadata) {
  const metaComment = `<!--\n  PageMetadata: ${JSON.stringify(metadata, null, 2)}\n-->`;
  return metaComment + '\n' + originalHtml;
}

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
 * 批量下载选中的页面
 */
async function downloadSelected() {
  const selected = getSelectedPages();
  if (selected.length === 0) {
    alert('请至少选择一个页面');
    return;
  }

  for (let i = 0; i < selected.length; i++) {
    await downloadPage(selected[i]);
    if (i < selected.length - 1) {
      await new Promise(r => setTimeout(r, 200));
    }
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
  } catch (error) {
    console.error('加载页面列表失败:', error);
    showEmptyState('加载失败，请重试');
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

// 显示空状态
function showEmptyState(message) {
  const container = document.getElementById('pageList');
  container.innerHTML = `
    <div class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
      </svg>
      <p>${message}</p>
    </div>
  `;
}

// HTML 转义
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
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
  const selected = getSelectedPages();
  if (selected.length === 0) {
    alert('请至少选择一个页面');
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
    // 向当前 AI 页面内容脚本发送消息
    chrome.tabs.sendMessage(currentTab.id, {
      type: 'UPLOAD_PAGES',
      pages: selected.map(p => ({
        html: p.html,
        title: p.title,
        url: p.url,
        savedAt: p.savedAt,
        size: p.size
      }))
    }, (response) => {
      overlay.classList.remove('active');

      const platformName = currentPlatform === 'deepseek' ? 'DeepSeek' : '通义千问';
      if (response && response.status === 'ok') {
        alert(`✅ 成功上传 ${response.count} 个页面到 ${platformName}！`);
      } else {
        alert(`❌ 上传失败，请确保 ${platformName} 页面已加载完成`);
      }
    });

    // 模拟进度更新
    let progress = 0;
    const interval = setInterval(() => {
      progress += 100 / selected.length / 2;
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
}

// 取消全选
function deselectAll() {
  document.querySelectorAll('.page-checkbox').forEach(cb => cb.checked = false);
}

// 打开设置页面
function openSettings() {
  chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
}

// 打开资源管理页面
function openResourcesManager() {
  chrome.tabs.create({ url: chrome.runtime.getURL('resources.html') });
}

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  // 检查平台状态
  await checkPlatformStatus();

  // 加载页面列表
  await loadPages();

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
