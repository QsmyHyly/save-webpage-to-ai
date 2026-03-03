// 文件列表渲染、选择、删除等

async function loadFiles() {
  try {
    const allFilesData = await chrome.runtime.sendMessage({ 
      type: MESSAGE_TYPES.GET_ALL_FILES 
    });

    // 检查是否为错误响应
    if (allFilesData && allFilesData.status === 'error') {
      throw new Error(allFilesData.message || '获取文件列表失败');
    }

    if (!Array.isArray(allFilesData)) throw new Error('返回数据格式错误');

    allFiles = allFilesData.map(f => ({
      id: f.id,
      name: f.name || f.metadata?.filename || '未命名',
      type: f.type,
      size: f.size,
      content: f.content,
      createdAt: f.createdAt,
      source: f.source || {},
      metadata: f.metadata || {},
      title: f.type === 'html' ? (f.source?.title || f.metadata?.title || '') : '',
      url: f.type === 'html' ? (f.source?.url || f.metadata?.url || '') : '',
      resourceUrl: f.type !== 'html' ? (f.source?.url || '') : ''
    }));

    renderFiles();
  } catch (error) {
    logger.error('加载文件列表失败:', error);
    showEmptyState('fileList', '加载失败，请刷新重试');
    throw error;
  }
}

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

function getSelectedFiles() {
  const checkboxes = document.querySelectorAll('.file-checkbox:checked');
  const ids = Array.from(checkboxes).map(cb => cb.dataset.id);
  return allFiles.filter(f => ids.includes(f.id));
}

function updateButtonStates() {
  const total = document.querySelectorAll('.file-checkbox').length;
  const selected = document.querySelectorAll('.file-checkbox:checked').length;
  
  document.getElementById('downloadSelectedBtn').disabled = selected === 0;
  document.getElementById('deleteSelectedBtn').disabled = selected === 0;
  
  updateSelectAllCheckboxState(total, selected);
}

// 更新三状态复选框的显示状态
function updateSelectAllCheckboxState(total, selected) {
  const selectAllCheckbox = document.getElementById('selectAllCheckbox');
  const selectAllInput = document.getElementById('selectAllInput');
  const selectAllText = selectAllCheckbox?.querySelector('.select-all-text');
  
  if (!selectAllCheckbox || !selectAllInput) return;
  
  selectAllCheckbox.classList.remove('indeterminate');
  
  if (total === 0) {
    // 没有文件
    selectAllInput.checked = false;
    selectAllInput.disabled = true;
    if (selectAllText) selectAllText.textContent = '全选';
  } else if (selected === 0) {
    // 未选中任何文件
    selectAllInput.checked = false;
    selectAllInput.disabled = false;
    if (selectAllText) selectAllText.textContent = '全选';
  } else if (selected === total) {
    // 全部选中
    selectAllInput.checked = true;
    selectAllInput.disabled = false;
    if (selectAllText) selectAllText.textContent = '全选';
  } else {
    // 部分选中 - 半选状态
    selectAllInput.checked = false;
    selectAllInput.disabled = false;
    selectAllCheckbox.classList.add('indeterminate');
    if (selectAllText) selectAllText.textContent = `${selected}/${total}`;
  }
}

// 三状态复选框点击处理
function toggleSelectAll() {
  const total = document.querySelectorAll('.file-checkbox').length;
  const selected = document.querySelectorAll('.file-checkbox:checked').length;
  
  if (total === 0) return;
  
  if (selected === total) {
    // 当前全选，点击后取消全选
    deselectAll();
  } else {
    // 当前未全选（包括部分选中和完全未选中），点击后全选
    selectAll();
  }
}

async function downloadFile(id) {
  const file = allFiles.find(f => f.id === id);
  if (!file) throw new Error('文件不存在');

  let blob;
  let fileName = file.name;

  if (file.type === 'html') {
    const metadata = {
      url: file.url,
      title: file.title,
      savedAt: new Date(file.createdAt).toISOString(),
      originalSize: file.size
    };
    const wrappedHtml = wrapHtmlWithMetadata(file.content, metadata);
    blob = new Blob([wrappedHtml], { type: 'text/html' });
  } else {
    if (typeof file.content === 'string' && file.content.startsWith('data:')) {
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

async function downloadSelected() {
  const selected = getSelectedFiles();
  if (selected.length === 0) {
    await alertWithSetting('请至少选择一个文件', 'warning');
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
  await alertWithSetting(`下载完成：成功 ${success} 个，失败 ${fail} 个`, 'success');
}

async function deleteFile(id) {
  if (!await confirmWithSetting('确定要删除这个文件吗？', 'confirm', true)) return;
  try {
    const response = await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.DELETE_FILE, id });

    if (response && response.status === 'error') {
      throw new Error(response.message);
    }

    await loadFiles();
  } catch (error) {
    logger.error('删除文件失败:', error);
    await alertWithSetting('删除失败，请重试', 'error');
  }
}

async function deleteSelected() {
  const selected = getSelectedFiles();
  if (selected.length === 0) {
    await alertWithSetting('请至少选择一个文件', 'warning');
    return;
  }
  if (!await confirmWithSetting(`确定要删除选中的 ${selected.length} 个文件吗？`, 'confirm', true)) return;

  const ids = selected.map(f => f.id);
  try {
    const response = await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.DELETE_FILES, ids });

    if (response && response.status === 'error') {
      throw new Error(response.message);
    }

    await loadFiles();
  } catch (error) {
    logger.error('批量删除失败:', error);
    await alertWithSetting('删除失败，请重试', 'error');
  }
}

function selectAll() {
  document.querySelectorAll('.file-checkbox').forEach(cb => cb.checked = true);
  document.querySelectorAll('.file-item').forEach(item => item.classList.add('selected'));
  updateButtonStates();
}

function deselectAll() {
  document.querySelectorAll('.file-checkbox').forEach(cb => cb.checked = false);
  document.querySelectorAll('.file-item').forEach(item => item.classList.remove('selected'));
  updateButtonStates();
}
