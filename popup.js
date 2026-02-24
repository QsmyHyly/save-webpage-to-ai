// 上传选中的页面到当前 AI 平台
async function uploadSelected() {
  // 重新获取当前标签页（防止缓存失效）
  currentTab = await getCurrentTab();
  await checkPlatformStatus(); // 更新 isTargetPage 和 currentPlatform

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
    // 向当前 AI 页面内容脚本发送消息
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
        // 清理进度条定时器
        if (progressInterval) clearInterval(progressInterval);
        overlay.classList.remove('active');

        const platformName = currentPlatform === 'deepseek' ? 'DeepSeek' : '通义千问';
        // 检查发送错误
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

    // 模拟进度更新
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
