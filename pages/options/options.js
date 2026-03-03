document.addEventListener('DOMContentLoaded', async () => {
  const checkbox = document.getElementById('enableDebugger');
  const saveBtn = document.getElementById('save');
  const status = document.getElementById('status');

  const result = await chrome.storage.sync.get('enableDebugger');
  checkbox.checked = result.enableDebugger || false;

  saveBtn.addEventListener('click', async () => {
    await chrome.storage.sync.set({ enableDebugger: checkbox.checked });
    status.textContent = '✅ 已保存';
    setTimeout(() => status.textContent = '', 1500);
  });
});
