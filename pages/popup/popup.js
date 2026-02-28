// popup.js - 扩展弹窗逻辑

let allFiles = [];
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
    logger.error('应用主题失败:', e);
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

// 加载文件列表
async function loadFiles() {
  try {
    const allFilesData = await chrome.runtime.sendMessage({ 
      type: MESSAGE_TYPES.GET_ALL_FILES 
    });
    if (!Array.isArray(allFilesData)) throw new Error('返回数据格式错误');

    // 转换为统一的文件对象格式
    allFiles = allFilesData.map(f => ({
      id: f.id,
      name: f.name || f.metadata?.filename || '未命名',
      type: f.type,
      size: f.size,
      content: f.content,
      createdAt: f.createdAt,
      source: f.source || {},
      metadata: f.metadata || {},
      // 为 HTML 文件保留 title 和 url 方便上传
      title: f.type === 'html' ? (f.source?.title || f.metadata?.title || '') : '',
      url: f.type === 'html' ? (f.source?.url || f.metadata?.url || '') : '',
      // 为资源保留原始 URL
      resourceUrl: f.type !== 'html' ? (f.source?.url || '') : ''
    }));

    renderFiles();
  } catch (error) {
    logger.error('加载文件列表失败:', error);
    showEmptyState('fileList', '加载失败，请刷新重试');
  }
}

// 渲染文件列表
function renderFiles() {
  const container = document.getElementById('fileList');
  const countEl = document.getElementById('fileCount');
  
  if (!container) return;
  countEl.textContent = allFiles.length;

  if (allFiles.length === 0) {
    showEmptyState('fileList', '暂无保存的文件');
    return;
  }

  container.innerHTML = allFiles.map(file => {
    const icon = getResourceIcon(file.type);
    const sizeText = formatSize(file.size);
    const timeText = new Date(file.createdAt).toLocaleString();
    const displayName = file.name || (file.type === 'html' ? file.title : '文件');

    return `
      <div class="file-item" data-id="${file.id}">
        <input type="checkbox" class="file-checkbox" data-id="${file.id}">
        <div class="file-icon ${file.type}">${icon}</div>
        <div class="file-info">
          <div class="file-name" title="${escapeHtml(displayName)}">${escapeHtml(displayName)}</div>
          <div class="file-meta">${timeText} · ${sizeText}</div>
        </div>
        <div class="file-actions">
          <button class="btn btn-secondary download-btn" data-id="${file.id}">📥</button>
          <button class="btn btn-danger delete-btn" data-id="${file.id}">🗑️</button>
        </div>
      </div>
    `;
  }).join('');

  // 绑定事件
  container.querySelectorAll('.file-checkbox').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const item = e.target.closest('.file-item');
      item.classList.toggle('selected', e.target.checked);
      updateButtonStates();
    });
  });

  container.querySelectorAll('.file-item').forEach(div => {
    div.addEventListener('click', (e) => {
      if (e.target.closest('.file-checkbox') || e.target.closest('.delete-btn') || e.target.closest('.download-btn')) {
        return;
      }
      const checkbox = div.querySelector('.file-checkbox');
      checkbox.checked = !checkbox.checked;
      div.classList.toggle('selected', checkbox.checked);
      updateButtonStates();
    });
  });

  container.querySelectorAll('.download-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      downloadFile(btn.dataset.id);
    });
  });

  container.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteFile(btn.dataset.id);
    });
  });
}

// 获取选中的文件
function getSelectedFiles() {
  const checkboxes = document.querySelectorAll('.file-checkbox:checked');
  const ids = Array.from(checkboxes).map(cb => cb.dataset.id);
  return allFiles.filter(f => ids.includes(f.id));
}

// 更新按钮状态
function updateButtonStates() {
  const selected = document.querySelectorAll('.file-checkbox:checked').length;
  document.getElementById('downloadSelectedBtn').disabled = selected === 0;
  document.getElementById('deleteSelectedBtn').disabled = selected === 0;
}

// 下载单个文件
async function downloadFile(id) {
  const file = allFiles.find(f => f.id === id);
  if (!file) throw new Error('文件不存在');

  let blob;
  let fileName = file.name;

  if (file.type === 'html') {
    // HTML 文件添加元数据注释
    const metadata = {
      url: file.url,
      title: file.title,
      savedAt: new Date(file.createdAt).toISOString(),
      originalSize: file.size
    };
    const wrappedHtml = wrapHtmlWithMetadata(file.content, metadata);
    blob = new Blob([wrappedHtml], { type: 'text/html' });
  } else {
    // 其他类型直接使用内容（如果是 base64 图片需要转换）
    if (typeof file.content === 'string' && file.content.startsWith('data:')) {
      // 将 data URL 转为 Blob
      const [meta, data] = file.content.split(',');
      const byteString = atob(data);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      blob = new Blob([ab], { type: meta.split(':')[1].split(';')[0] });
    } else {
      blob = new Blob([file.content], { type: 'application/octet-stream' });
    }
  }

  const url = URL.createObjectURL(blob);
  return new Promise((resolve, reject) => {
    chrome.downloads.download({
      url: url,
      filename: fileName,
      saveAs: false
    }, (downloadId) => {
      URL.revokeObjectURL(url);
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve(downloadId);
    });
  });
}

// 下载选中的文件
async function downloadSelected() {
  const selected = getSelectedFiles();
  if (selected.length === 0) {
    alert('请至少选择一个文件');
    return;
  }
  let success = 0, fail = 0;
  for (const file of selected) {
    try {
      await downloadFile(file.id);
      success++;
    } catch (error) {
      fail++;
      logger.error('下载文件失败:', file.name, error);
    }
  }
  alert(`下载完成：成功 ${success} 个，失败 ${fail} 个`);
}

// 删除单个文件
async function deleteFile(id) {
  if (!confirm('确定要删除这个文件吗？')) return;
  try {
    await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.DELETE_FILE, id });
    await loadFiles();
  } catch (error) {
    logger.error('删除文件失败:', error);
    alert('删除失败，请重试');
  }
}

// 删除选中的文件
async function deleteSelected() {
  const selected = getSelectedFiles();
  if (selected.length === 0) {
    alert('请至少选择一个文件');
    return;
  }
  if (!confirm(`确定要删除选中的 ${selected.length} 个文件吗？`)) return;

  const ids = selected.map(f => f.id);
  try {
    await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.DELETE_FILES, ids });
    await loadFiles();
  } catch (error) {
    logger.error('批量删除失败:', error);
    alert('删除失败，请重试');
  }
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
    
    const savedAt = Date.now();
    const fileEntity = {
      name: `${title.replace(/[\\/:*?"<>|]/g, '_')}.html`,
      content: html,
      type: 'html',
      source: { url, title },
      createdAt: savedAt,
      metadata: {
        savedAt
      }
    };
    
    await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.SAVE_FILE,
      fileEntity
    });
    
    await loadFiles();
    
    btn.textContent = '✅ 保存成功';
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

// 从页面获取去除脚本和样式的 HTML
async function saveHTMLFromPage() {
  const btn = document.getElementById('saveHtmlBtn');
  btn.disabled = true;
  btn.textContent = '⏳ 获取中...';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const clone = document.documentElement.cloneNode(true);
        // 移除所有 script 标签
        clone.querySelectorAll('script').forEach(el => el.remove());
        // 移除所有 style 标签
        clone.querySelectorAll('style').forEach(el => el.remove());
        // 移除所有 link[rel="stylesheet"]
        clone.querySelectorAll('link[rel="stylesheet"]').forEach(el => el.remove());
        return clone.outerHTML;
      }
    });

    const cleanedHtml = results[0].result;
    const fileEntity = {
      name: `${tab.title?.replace(/[\\/:*?"<>|]/g, '_') || 'page'}_clean.html`,
      content: cleanedHtml,
      type: 'html',
      source: { url: tab.url, title: tab.title },
      createdAt: Date.now(),
      metadata: { sourcePageUrl: tab.url, cleaned: true }
    };

    await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.SAVE_FILE,
      fileEntity
    });

    await loadFiles();
    btn.textContent = '✅ 保存成功';
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = '📄 只获取HTML';
    }, 1500);
  } catch (error) {
    logger.error('获取HTML失败:', error);
    btn.textContent = '❌ 获取失败';
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = '📄 只获取HTML';
    }, 1500);
  }
}

// 从页面获取所有 JavaScript
async function saveJSFromPage() {
  const btn = document.getElementById('saveJsBtn');
  btn.disabled = true;
  btn.textContent = '⏳ 获取中...';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: async () => {
        const scripts = [];
        for (const script of document.scripts) {
          if (script.src) {
            try {
              const res = await fetch(script.src);
              const content = await res.text();
              scripts.push({ content, src: script.src });
            } catch (e) {
              console.warn('获取外部脚本失败:', script.src);
            }
          } else if (script.textContent) {
            scripts.push({ content: script.textContent, src: 'inline' });
          }
        }
        return scripts;
      }
    });

    const scriptList = results[0].result;
    if (!scriptList.length) {
      alert('未找到任何脚本');
      btn.disabled = false;
      btn.textContent = '📜 只获取JS';
      return;
    }

    const fileEntities = scriptList.map((item, index) => ({
      name: `${tab.title?.replace(/[\\/:*?"<>|]/g, '_') || 'page'}_script_${index + 1}.js`,
      content: item.content,
      type: 'js',
      source: { url: item.src !== 'inline' ? item.src : tab.url },
      createdAt: Date.now(),
      metadata: { sourcePageUrl: tab.url, sourcePageTitle: tab.title }
    }));

    await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.SAVE_FILES,
      fileEntities
    });

    await loadFiles();
    btn.textContent = '✅ 保存成功';
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = '📜 只获取JS';
    }, 1500);
  } catch (error) {
    logger.error('获取JS失败:', error);
    btn.textContent = '❌ 获取失败';
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = '📜 只获取JS';
    }, 1500);
  }
}

// 从页面获取所有 CSS
async function saveCSSFromPage() {
  const btn = document.getElementById('saveCssBtn');
  btn.disabled = true;
  btn.textContent = '⏳ 获取中...';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: async () => {
        const styles = [];
        
        // 获取内联 style 标签
        document.querySelectorAll('style').forEach((style, index) => {
          if (style.textContent) {
            styles.push({ content: style.textContent, src: `inline-${index}` });
          }
        });
        
        // 获取外部样式表
        for (const link of document.querySelectorAll('link[rel="stylesheet"]')) {
          if (link.href) {
            try {
              const res = await fetch(link.href);
              const content = await res.text();
              styles.push({ content, src: link.href });
            } catch (e) {
              console.warn('获取外部样式失败:', link.href);
            }
          }
        }
        
        return styles;
      }
    });

    const styleList = results[0].result;
    if (!styleList.length) {
      alert('未找到任何样式');
      btn.disabled = false;
      btn.textContent = '🎨 只获取CSS';
      return;
    }

    const fileEntities = styleList.map((item, index) => ({
      name: `${tab.title?.replace(/[\\/:*?"<>|]/g, '_') || 'page'}_style_${index + 1}.css`,
      content: item.content,
      type: 'css',
      source: { url: item.src.startsWith('inline') ? tab.url : item.src },
      createdAt: Date.now(),
      metadata: { sourcePageUrl: tab.url, sourcePageTitle: tab.title }
    }));

    await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.SAVE_FILES,
      fileEntities
    });

    await loadFiles();
    btn.textContent = '✅ 保存成功';
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = '🎨 只获取CSS';
    }, 1500);
  } catch (error) {
    logger.error('获取CSS失败:', error);
    btn.textContent = '❌ 获取失败';
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = '🎨 只获取CSS';
    }, 1500);
  }
}

// 上传选中的文件（移除自动发送）
async function uploadSelected() {
  currentTab = await getCurrentTab();
  await checkPlatformStatus();

  const ready = await isContentScriptReady(currentTab.id);
  if (!ready) {
    alert('当前 AI 页面尚未完全加载，请刷新后重试。');
    return;
  }

  const selectedFiles = getSelectedFiles();
  if (selectedFiles.length === 0) {
    alert('请至少选择一个文件');
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
  progressFill.style.width = '0%';
  progressText.textContent = '正在上传...';

  // 构造 items 数组
  const items = selectedFiles.map(file => {
    if (file.type === 'html') {
      return {
        kind: 'page',
        data: {
          id: file.id,
          title: file.title,
          url: file.url,
          savedAt: file.createdAt,
          size: file.size,
          html: file.content
        }
      };
    } else {
      return { kind: 'resource', id: file.id };
    }
  });

  try {
    chrome.tabs.sendMessage(
      currentTab.id,
      { type: 'UPLOAD_ITEMS', items },
      (response) => {
        overlay.classList.remove('active');
        if (chrome.runtime.lastError) {
          alert(`❌ 上传失败：${chrome.runtime.lastError.message}`);
        } else if (response && response.status === 'ok') {
          alert(`✅ 成功上传 ${response.count} 个文件`);
        } else {
          alert(`❌ 上传失败，请确保页面已加载完成`);
        }
      }
    );
  } catch (error) {
    overlay.classList.remove('active');
    alert('上传失败: ' + error.message);
  }
}

// 全选
function selectAll() {
  document.querySelectorAll('.file-checkbox').forEach(cb => cb.checked = true);
  document.querySelectorAll('.file-item').forEach(item => item.classList.add('selected'));
  updateButtonStates();
}

// 取消全选
function deselectAll() {
  document.querySelectorAll('.file-checkbox').forEach(cb => cb.checked = false);
  document.querySelectorAll('.file-item').forEach(item => item.classList.remove('selected'));
  updateButtonStates();
}

// 打开选中页面的资源管理页面
async function openPageResourcesForSelected() {
  const selectedFiles = getSelectedFiles();
  const selectedPages = selectedFiles.filter(f => f.type === 'html');
  if (selectedPages.length === 0) {
    alert('请至少选择一个页面');
    return;
  }

  for (const page of selectedPages) {
    const url = chrome.runtime.getURL('pages/resources/resources.html') +
                '?url=' + encodeURIComponent(page.url);
    chrome.tabs.create({ url });
  }
}

// 绑定所有事件
function bindEvents() {
  document.getElementById('saveCurrentBtn')?.addEventListener('click', saveCurrentPage);
  document.getElementById('saveHtmlBtn')?.addEventListener('click', saveHTMLFromPage);
  document.getElementById('saveJsBtn')?.addEventListener('click', saveJSFromPage);
  document.getElementById('saveCssBtn')?.addEventListener('click', saveCSSFromPage);
  document.getElementById('manageResourcesBtn')?.addEventListener('click', openPageResourcesForSelected);
  document.getElementById('selectAllBtn')?.addEventListener('click', selectAll);
  document.getElementById('deselectAllBtn')?.addEventListener('click', deselectAll);
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
  try {
    await loadFiles();
  } catch (e) { logger.error(e); }
});
