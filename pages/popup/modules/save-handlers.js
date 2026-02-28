// 保存当前页面、只获取HTML/JS/CSS等功能

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
      metadata: { savedAt }
    };
    
    const response = await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.SAVE_FILE,
      fileEntity
    });

    // 新增：检查错误响应
    if (response && response.status === 'error') {
      throw new Error(response.message);
    }

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
        clone.querySelectorAll('script').forEach(el => el.remove());
        clone.querySelectorAll('style').forEach(el => el.remove());
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

    const response = await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.SAVE_FILE,
      fileEntity
    });

    if (response && response.status === 'error') {
      throw new Error(response.message);
    }

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

    const response = await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.SAVE_FILES,
      fileEntities
    });

    if (response && response.status === 'error') {
      throw new Error(response.message);
    }

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
        
        document.querySelectorAll('style').forEach((style, index) => {
          if (style.textContent) {
            styles.push({ content: style.textContent, src: `inline-${index}` });
          }
        });
        
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

    const response = await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.SAVE_FILES,
      fileEntities
    });

    if (response && response.status === 'error') {
      throw new Error(response.message);
    }

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
