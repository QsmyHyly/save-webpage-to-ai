// background.js - Service Worker
// 负责处理扩展图标点击，动态向当前标签页注入侧边栏

// 安装时设置 declarativeNetRequest 规则以允许 iframe 嵌入
chrome.runtime.onInstalled.addListener(() => {
  // 移除 X-Frame-Options 和 CSP 头，允许 DeepSeek 被嵌入 iframe
  chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [1, 2, 3],
    addRules: [
      {
        id: 1,
        priority: 1,
        action: {
          type: 'modifyHeaders',
          responseHeaders: [
            { header: 'x-frame-options', operation: 'remove' },
            { header: 'X-Frame-Options', operation: 'remove' }
          ]
        },
        condition: {
          urlFilter: '||chat.deepseek.com/*',
          resourceTypes: ['sub_frame', 'main_frame']
        }
      },
      {
        id: 2,
        priority: 1,
        action: {
          type: 'modifyHeaders',
          responseHeaders: [
            { header: 'content-security-policy', operation: 'remove' },
            { header: 'Content-Security-Policy', operation: 'remove' }
          ]
        },
        condition: {
          urlFilter: '||chat.deepseek.com/*',
          resourceTypes: ['sub_frame', 'main_frame']
        }
      },
      {
        id: 3,
        priority: 1,
        action: {
          type: 'modifyHeaders',
          responseHeaders: [
            { header: 'content-security-policy', operation: 'remove' },
            { header: 'Content-Security-Policy', operation: 'remove' },
            { header: 'x-frame-options', operation: 'remove' },
            { header: 'X-Frame-Options', operation: 'remove' },
            // 添加一个空的 CSP，防止继承父页面的策略
            { header: 'Content-Security-Policy', operation: 'set', value: 'frame-ancestors *;' }
          ]
        },
        condition: {
          urlFilter: '||chat.deepseek.com/*',
          resourceTypes: ['sub_frame', 'main_frame']
        }
      }
    ]
  });
  console.log('DeepSeek Sidebar: 已安装，CSP规则已设置');
});

// 处理扩展图标点击事件
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;

  try {
    // 尝试向当前标签页发送 ping 消息，检查侧边栏是否已存在
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'PING_SIDEBAR' });

    if (response?.status === 'alive') {
      // 已存在，切换显示/隐藏
      chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_SIDEBAR' });
    } else {
      // 不存在，创建侧边栏
      chrome.tabs.sendMessage(tab.id, { type: 'CREATE_SIDEBAR' });
    }
  } catch (error) {
    // 未注入内容脚本，需要先注入
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
      // 注入成功后创建侧边栏
      setTimeout(() => {
        chrome.tabs.sendMessage(tab.id, { type: 'CREATE_SIDEBAR' });
      }, 100);
    } catch (injectError) {
      console.error('注入内容脚本失败:', injectError);
    }
  }
});

// 监听来自内容脚本的消息（当前无额外处理）
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 扩展预留接口，当前无需处理
  return false;
});
