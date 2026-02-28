// 上传文件到 AI 平台，以及打开资源管理页面

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
    // 改为 Promise 包装
    const response = await new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(
        currentTab.id,
        { type: 'UPLOAD_ITEMS', items },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        }
      );
    });

    overlay.classList.remove('active');

    if (response && response.status === 'error') {
      throw new Error(response.message);
    }

    if (response && response.status === 'ok') {
      alert(`✅ 成功上传 ${response.count} 个文件`);
    } else {
      alert(`❌ 上传失败，请确保页面已加载完成`);
    }
  } catch (error) {
    overlay.classList.remove('active');
    logger.error('上传失败:', error);
    alert('上传失败: ' + error.message);
  }
}

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
