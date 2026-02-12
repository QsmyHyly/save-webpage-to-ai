// content.js - 全局内容脚本
// 负责创建/销毁侧边栏、获取页面内容、与后台通信

(function() {
  'use strict';

  // 防止重复注入
  if (window.__deepseekSidebarInjected) {
    return;
  }
  window.__deepseekSidebarInjected = true;

  let sidebar = null;
  let sidebarIframe = null;
  let isResizing = false;
  let resizeStartX = 0;
  let sidebarStartWidth = 0;

  // 创建侧边栏
  function createSidebar() {
    if (sidebar) {
      sidebar.style.display = 'flex';
      return;
    }

    // 创建浮动容器
    sidebar = document.createElement('div');
    sidebar.id = 'deepseek-sidebar';
    sidebar.style.cssText = `
      position: fixed;
      top: 0;
      right: 0;
      width: 450px;
      height: 100vh;
      background: #ffffff;
      box-shadow: -4px 0 20px rgba(0,0,0,0.15);
      z-index: 2147483647;
      display: flex;
      flex-direction: column;
      border-left: 1px solid #e0e0e0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    `;

    // 头部：标题 + 控制按钮
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 12px 16px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(255,255,255,0.2);
      color: white;
      user-select: none;
    `;

    const title = document.createElement('span');
    title.innerText = 'DeepSeek 助手';
    title.style.cssText = 'font-weight: 600; font-size: 16px;';

    const controls = document.createElement('div');
    controls.style.cssText = 'display: flex; gap: 8px; align-items: center;';

    // 调整大小按钮
    const resizeBtn = document.createElement('button');
    resizeBtn.innerHTML = '⬌';
    resizeBtn.title = '拖动调整宽度';
    resizeBtn.style.cssText = `
      font-size: 14px;
      border: none;
      background: rgba(255,255,255,0.2);
      color: white;
      cursor: ew-resize;
      padding: 4px 8px;
      border-radius: 4px;
      line-height: 1;
    `;
    resizeBtn.onmousedown = startResize;

    // 关闭按钮
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.title = '关闭侧边栏';
    closeBtn.style.cssText = `
      font-size: 20px;
      border: none;
      background: rgba(255,255,255,0.2);
      color: white;
      cursor: pointer;
      padding: 0 6px;
      border-radius: 4px;
      line-height: 1;
    `;
    closeBtn.onclick = destroySidebar;

    controls.appendChild(resizeBtn);
    controls.appendChild(closeBtn);
    header.appendChild(title);
    header.appendChild(controls);
    sidebar.appendChild(header);

    // 调整大小手柄
    const resizeHandle = document.createElement('div');
    resizeHandle.style.cssText = `
      position: absolute;
      left: -4px;
      top: 0;
      width: 8px;
      height: 100%;
      cursor: ew-resize;
      z-index: 2147483648;
    `;
    resizeHandle.onmousedown = startResize;
    sidebar.appendChild(resizeHandle);

    // iframe 容器
    const iframeWrapper = document.createElement('div');
    iframeWrapper.style.cssText = 'flex: 1; position: relative; overflow: hidden;';

    sidebarIframe = document.createElement('iframe');
    sidebarIframe.src = 'https://chat.deepseek.com/';
    sidebarIframe.style.cssText = 'width: 100%; height: 100%; border: none;';
    sidebarIframe.sandbox = 'allow-scripts allow-same-origin allow-forms allow-popups';

    // 监听 iframe 加载状态
    sidebarIframe.onload = () => {
      console.log('DeepSeek iframe 加载完成');
    };

    iframeWrapper.appendChild(sidebarIframe);
    sidebar.appendChild(iframeWrapper);

    // 底部控制栏
    const footer = document.createElement('div');
    footer.style.cssText = `
      padding: 12px 16px;
      background: #f8f9fa;
      border-top: 1px solid #e0e0e0;
      display: flex;
      flex-direction: column;
      gap: 12px;
    `;

    // 自动发送开关行
    const autoSendControl = document.createElement('div');
    autoSendControl.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 13px;
      color: #555;
      margin-bottom: 8px;
    `;

    const autoSendLabel = document.createElement('span');
    autoSendLabel.innerText = '自动发送到 DeepSeek';
    autoSendLabel.style.cssText = 'font-weight: 500;';

    // 开关（checkbox模拟toggle）
    const toggleWrapper = document.createElement('label');
    toggleWrapper.style.cssText = `
      position: relative;
      display: inline-block;
      width: 46px;
      height: 24px;
      cursor: pointer;
    `;

    const toggleCheckbox = document.createElement('input');
    toggleCheckbox.type = 'checkbox';
    toggleCheckbox.id = 'auto-send-toggle';
    toggleCheckbox.checked = true; // 默认开启
    toggleCheckbox.style.cssText = `
      opacity: 0;
      width: 0;
      height: 0;
    `;

    const toggleSlider = document.createElement('span');
    toggleSlider.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #667eea;
      transition: 0.2s;
      border-radius: 24px;
    `;

    const toggleKnob = document.createElement('span');
    toggleKnob.style.cssText = `
      position: absolute;
      content: "";
      height: 20px;
      width: 20px;
      left: 24px;
      top: 2px;
      background-color: white;
      transition: 0.2s;
      border-radius: 50%;
    `;

    toggleCheckbox.addEventListener('change', function() {
      toggleSlider.style.backgroundColor = this.checked ? '#667eea' : '#ccc';
      toggleKnob.style.left = this.checked ? '24px' : '2px';
    });

    toggleWrapper.appendChild(toggleCheckbox);
    toggleWrapper.appendChild(toggleSlider);
    toggleWrapper.appendChild(toggleKnob);

    autoSendControl.appendChild(autoSendLabel);
    autoSendControl.appendChild(toggleWrapper);
    footer.appendChild(autoSendControl);

    // 新增功能按钮行：获取完整DOM树、获取所有资源文件
    const featureRow = document.createElement('div');
    featureRow.style.cssText = 'display: flex; gap: 8px; margin-top: 8px;';

    const domBtn = document.createElement('button');
    domBtn.innerText = '🌲 获取完整DOM树';
    domBtn.style.cssText = `
      flex: 1;
      padding: 10px 16px;
      background: #28a745;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s ease;
    `;
    domBtn.onmouseover = () => {
      domBtn.style.transform = 'translateY(-1px)';
      domBtn.style.boxShadow = '0 4px 12px rgba(40, 167, 69, 0.4)';
    };
    domBtn.onmouseout = () => {
      domBtn.style.transform = 'translateY(0)';
      domBtn.style.boxShadow = 'none';
    };
    domBtn.onclick = () => sendDOMContent();

    featureRow.appendChild(domBtn);
    footer.appendChild(featureRow);

    sidebar.appendChild(footer);
    document.body.appendChild(sidebar);

    // 添加调整大小的全局事件监听
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', stopResize);
  }

  // 开始调整大小
  function startResize(e) {
    isResizing = true;
    resizeStartX = e.clientX;
    sidebarStartWidth = parseInt(sidebar.style.width);
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  }

  // 处理调整大小
  function handleResize(e) {
    if (!isResizing || !sidebar) return;
    const delta = resizeStartX - e.clientX;
    const newWidth = Math.max(300, Math.min(800, sidebarStartWidth + delta));
    sidebar.style.width = newWidth + 'px';
  }

  // 停止调整大小
  function stopResize() {
    if (isResizing) {
      isResizing = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  }

  // 销毁侧边栏
  function destroySidebar() {
    if (sidebar) {
      document.removeEventListener('mousemove', handleResize);
      document.removeEventListener('mouseup', stopResize);
      sidebar.remove();
      sidebar = null;
      sidebarIframe = null;
    }
  }

  // 切换侧边栏显示
  function toggleSidebar() {
    if (sidebar) {
      if (sidebar.style.display === 'none') {
        sidebar.style.display = 'flex';
      } else {
        sidebar.style.display = 'none';
      }
    } else {
      createSidebar();
    }
  }

  // 获取完整、未截断的 DOM 树
  function captureFullDOM() {
    return {
      html: document.documentElement.outerHTML,  // 完整 HTML，无任何截断
      url: location.href,
      title: document.title,
      captureTime: new Date().toLocaleString(),
      type: 'DOM_CONTENT'
    };
  }

  // 发送完整 DOM 树
  async function sendDOMContent() {
    if (!sidebarIframe) return;
    try {
      const content = captureFullDOM();  // 同步调用，直接取 outerHTML，无截断
      content.autoSend = document.querySelector('#auto-send-toggle')?.checked ?? true;
      sidebarIframe.contentWindow.postMessage({
        type: 'PAGE_CONTENT',
        payload: content
      }, 'https://chat.deepseek.com');
      console.log('完整 DOM 树已发送到 DeepSeek iframe');
    } catch (error) {
      console.error('发送 DOM 内容失败:', error);
      alert('页面 DOM 过大，发送失败。您可尝试刷新页面或关闭其他扩展。');
    }
  }

  // 消息监听
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    switch (msg.type) {
      case 'CREATE_SIDEBAR':
        createSidebar();
        sendResponse({ status: 'created' });
        break;

      case 'TOGGLE_SIDEBAR':
        toggleSidebar();
        sendResponse({ status: 'toggled' });
        break;

      case 'PING_SIDEBAR':
        sendResponse({ status: sidebar ? 'alive' : 'dead' });
        break;

      default:
        break;
    }
    return false;
  });

  console.log('DeepSeek Sidebar: 内容脚本已加载');
})();
