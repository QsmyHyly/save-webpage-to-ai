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
      func: () => {
        const scriptTags = [];
        for (const script of document.scripts) {
          scriptTags.push(script.outerHTML);
        }
        return {
          scriptTags,
          title: document.title,
          url: location.href
        };
      }
    });

    const { scriptTags, title, url } = results[0].result;
    if (!scriptTags.length) {
      alert('未找到任何脚本');
      btn.disabled = false;
      btn.textContent = '📜 只获取JS';
      return;
    }

    const safeTitle = (title || 'page').replace(/[\\/:*?"<>|]/g, '_');
    const savedAt = new Date().toLocaleString('zh-CN');

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${title} - 脚本标签集合</title>
<!--
  来源页面: ${url}
  页面标题: ${title}
  收集时间: ${savedAt}
  标签数量: 脚本 ${scriptTags.length} 个
-->
</head>
<body>
<!-- 原始脚本标签集合 -->
${scriptTags.join('\n')}
</body>
</html>`;

    const fileEntity = {
      name: `${safeTitle}_脚本标签.html`,
      content: html,
      type: 'html',
      source: { url, title },
      createdAt: Date.now(),
      metadata: {
        type: 'script-tags',
        sourcePageUrl: url,
        sourcePageTitle: title,
        tagCount: scriptTags.length,
        savedAt
      }
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
      func: () => {
        const styleTags = [];
        
        // 收集内联样式标签
        document.querySelectorAll('style').forEach(style => {
          styleTags.push(style.outerHTML);
        });
        
        // 收集外部样式链接
        document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
          styleTags.push(link.outerHTML);
        });
        
        return {
          styleTags,
          title: document.title,
          url: location.href
        };
      }
    });

    const { styleTags, title, url } = results[0].result;
    if (!styleTags.length) {
      alert('未找到任何样式');
      btn.disabled = false;
      btn.textContent = '🎨 只获取CSS';
      return;
    }

    const safeTitle = (title || 'page').replace(/[\\/:*?"<>|]/g, '_');
    const savedAt = new Date().toLocaleString('zh-CN');

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${title} - 样式标签集合</title>
<!--
  来源页面: ${url}
  页面标题: ${title}
  收集时间: ${savedAt}
  标签数量: 样式 ${styleTags.length} 个
-->
${styleTags.join('\n')}
</head>
<body>
<!-- 样式测试区域 -->
<div style="padding: 20px;">
  <h1>样式标签集合</h1>
  <p>此页面包含从 <strong>${title}</strong> 收集的所有样式标签。</p>
  <p>来源: <a href="${url}" target="_blank">${url}</a></p>
</div>
</body>
</html>`;

    const fileEntity = {
      name: `${safeTitle}_样式标签.html`,
      content: html,
      type: 'html',
      source: { url, title },
      createdAt: Date.now(),
      metadata: {
        type: 'style-tags',
        sourcePageUrl: url,
        sourcePageTitle: title,
        tagCount: styleTags.length,
        savedAt
      }
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
