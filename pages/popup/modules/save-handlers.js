// ==================== debugger 模式工具函数 ====================

function attachDebugger(tabId) {
  return new Promise((resolve, reject) => {
    chrome.debugger.attach({ tabId }, "1.3", () => {
      if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
      else resolve();
    });
  });
}

function detachDebugger(tabId) {
  return new Promise((resolve) => {
    chrome.debugger.detach({ tabId }, () => resolve());
  });
}

function sendDebuggerCommand(tabId, method, params) {
  return new Promise((resolve, reject) => {
    chrome.debugger.sendCommand({ tabId }, method, params, (result) => {
      if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
      else resolve(result);
    });
  });
}

function escapeHtml(value) {
  if (value === undefined || value === null) return '';
  const str = String(value);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function cdpNodeToHTML(node) {
  const nodeType = node.nodeType;

  if (nodeType === 9) {
    let html = '';
    if (node.children) {
      for (const child of node.children) {
        html += cdpNodeToHTML(child);
      }
    }
    return html;
  }

  if (nodeType === 1) {
    const tagName = node.nodeName.toLowerCase();
    let html = '<' + tagName;

    if (node.attributes && node.attributes.length) {
      for (let i = 0; i < node.attributes.length; i += 2) {
        const attrName = node.attributes[i];
        const attrValue = node.attributes[i + 1];
        const escapedValue = escapeHtml(attrValue);
        html += ` ${attrName}="${escapedValue}"`;
      }
    }
    html += '>';

    if (node.children) {
      for (const child of node.children) {
        html += cdpNodeToHTML(child);
      }
    }

    if (node.shadowRoots) {
      for (const shadowRoot of node.shadowRoots) {
        let shadowHtml = '';
        if (shadowRoot.children) {
          for (const child of shadowRoot.children) {
            shadowHtml += cdpNodeToHTML(child);
          }
        }
        html += `<template shadowrootmode="${shadowRoot.mode}">${shadowHtml}</template>`;
      }
    }

    html += '</' + tagName + '>';
    return html;
  }

  if (nodeType === 3) {
    return node.nodeValue || '';
  }

  return '';
}

function getDoctypeFromNode(node) {
  if (node.nodeType === 9) {
    if (node.doctype) {
      const { name, publicId, systemId } = node.doctype;
      if (publicId && systemId) {
        return `<!DOCTYPE ${name} PUBLIC "${publicId}" "${systemId}">`;
      } else if (publicId) {
        return `<!DOCTYPE ${name} PUBLIC "${publicId}">`;
      } else if (systemId) {
        return `<!DOCTYPE ${name} SYSTEM "${systemId}">`;
      } else {
        return `<!DOCTYPE ${name}>`;
      }
    }
  }
  return '<!DOCTYPE html>';
}

async function saveScriptsCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    await alertWithSetting('未找到当前标签页', 'warning');
    return;
  }

  const btn = document.getElementById('saveScriptsBtn');
  btn.disabled = true;
  btn.textContent = '正在获取...';

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const scriptTags = Array.from(document.querySelectorAll('script'))
          .map(s => s.outerHTML)
          .filter(html => !html.includes('src=') || html.includes('type="module"'));
        return {
          scriptTags,
          title: document.title,
          url: location.href
        };
      }
    });

    const { scriptTags, title, url } = results[0].result;
    if (!scriptTags.length) {
      await alertWithSetting('未找到任何脚本', 'warning');
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

    await chrome.runtime.sendMessage({ 
      type: 'SAVE_FILE', 
      file: fileEntity 
    });

    await alertWithSetting(`✅ 成功保存 ${scriptTags.length} 个脚本标签`, 'success');
  } catch (error) {
    logger.error('保存脚本失败:', error);
    await alertWithSetting('保存失败: ' + error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '📜 只获取JS';
  }
}

async function saveScriptsDebugger() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    await alertWithSetting('未找到当前标签页', 'warning');
    return;
  }

  const btn = document.getElementById('saveScriptsDebuggerBtn');
  btn.disabled = true;
  btn.textContent = '正在获取...';

  try {
    await attachDebugger(tab.id);

    const { result: { root: { nodeId } } } = await sendDebuggerCommand(tab.id, 'DOM.getDocument', {});

    const { result: { nodes } } = await sendDebuggerCommand(tab.id, 'DOM.querySelectorAll', { nodeId, selector: 'script' });

    const scripts = [];
    for (const node of nodes) {
      const { result: { outerHTML } } = await sendDebuggerCommand(tab.id, 'DOM.getOuterHTML', { nodeId: node.nodeId });
      scripts.push(outerHTML);
    }

    await detachDebugger(tab.id);

    if (scripts.length === 0) {
      await alertWithSetting('未找到任何脚本', 'warning');
      btn.disabled = false;
      btn.textContent = '📜 只获取JS';
      return;
    }

    const title = tab.title || 'page';
    const url = tab.url;
    const safeTitle = title.replace(/[\\/:*?"<>|]/g, '_');
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
  标签数量: 脚本 ${scripts.length} 个
  捕获方式: debugger 模式（包含 Shadow DOM 内脚本）
-->
</head>
<body>
<!-- 原始脚本标签集合（含 Shadow DOM 内） -->
${scripts.join('\n')}
</body>
</html>`;

    const fileEntity = {
      name: `${safeTitle}_脚本标签_full.html`,
      content: html,
      type: 'html',
      source: { url, title },
      createdAt: Date.now(),
      metadata: {
        type: 'script-tags',
        sourcePageUrl: url,
        sourcePageTitle: title,
        tagCount: scripts.length,
        savedAt,
        captureMode: 'debugger'
      }
    };

    await chrome.runtime.sendMessage({ 
      type: 'SAVE_FILE', 
      file: fileEntity 
    });

    await alertWithSetting(`✅ 成功保存 ${scripts.length} 个脚本标签（含 Shadow DOM）`, 'success');
  } catch (error) {
    logger.error('保存脚本失败:', error);
    await alertWithSetting('保存失败: ' + error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '📜 只获取JS';
  }
}

async function saveStylesCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    await alertWithSetting('未找到当前标签页', 'warning');
    return;
  }

  const btn = document.getElementById('saveStylesBtn');
  btn.disabled = true;
  btn.textContent = '正在获取...';

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const styleTags = Array.from(document.querySelectorAll('style')).map(s => s.outerHTML);
        return {
          styleTags,
          title: document.title,
          url: location.href
        };
      }
    });

    const { styleTags, title, url } = results[0].result;
    if (!styleTags.length) {
      await alertWithSetting('未找到任何样式', 'warning');
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

    await chrome.runtime.sendMessage({ 
      type: 'SAVE_FILE', 
      file: fileEntity 
    });

    await alertWithSetting(`✅ 成功保存 ${styleTags.length} 个样式标签`, 'success');
  } catch (error) {
    logger.error('保存样式失败:', error);
    await alertWithSetting('保存失败: ' + error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '🎨 只获取CSS';
  }
}

async function saveStylesDebugger() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    await alertWithSetting('未找到当前标签页', 'warning');
    return;
  }

  const btn = document.getElementById('saveStylesDebuggerBtn');
  btn.disabled = true;
  btn.textContent = '正在获取...';

  try {
    await attachDebugger(tab.id);

    const { result: { root: { nodeId } } } = await sendDebuggerCommand(tab.id, 'DOM.getDocument', {});

    const { result: { nodes } } = await sendDebuggerCommand(tab.id, 'DOM.querySelectorAll', { nodeId, selector: 'style' });

    const styles = [];
    for (const node of nodes) {
      const { result: { outerHTML } } = await sendDebuggerCommand(tab.id, 'DOM.getOuterHTML', { nodeId: node.nodeId });
      styles.push(outerHTML);
    }

    await detachDebugger(tab.id);

    if (styles.length === 0) {
      await alertWithSetting('未找到任何样式', 'warning');
      btn.disabled = false;
      btn.textContent = '🎨 只获取CSS';
      return;
    }

    const title = tab.title || 'page';
    const url = tab.url;
    const safeTitle = title.replace(/[\\/:*?"<>|]/g, '_');
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
  标签数量: 样式 ${styles.length} 个
  捕获方式: debugger 模式（包含 Shadow DOM 内样式）
-->
${styles.join('\n')}
</head>
<body>
<!-- 样式测试区域 -->
<div style="padding: 20px;">
  <h1>样式标签集合（含 Shadow DOM 内样式）</h1>
  <p>此页面包含从 <strong>${title}</strong> 收集的所有样式标签。</p>
  <p>来源: <a href="${url}" target="_blank">${url}</a></p>
</div>
</body>
</html>`;

    const fileEntity = {
      name: `${safeTitle}_样式标签_full.html`,
      content: html,
      type: 'html',
      source: { url, title },
      createdAt: Date.now(),
      metadata: {
        type: 'style-tags',
        sourcePageUrl: url,
        sourcePageTitle: title,
        tagCount: styles.length,
        savedAt,
        captureMode: 'debugger'
      }
    };

    await chrome.runtime.sendMessage({ 
      type: 'SAVE_FILE', 
      file: fileEntity 
    });

    await alertWithSetting(`✅ 成功保存 ${styles.length} 个样式标签（含 Shadow DOM）`, 'success');
  } catch (error) {
    logger.error('保存样式失败:', error);
    await alertWithSetting('保存失败: ' + error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '🎨 只获取CSS';
  }
}

async function savePageFullContent() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    await alertWithSetting('未找到当前标签页', 'warning');
    return;
  }

  const btn = document.getElementById('saveFullPageBtn');
  btn.disabled = true;
  btn.textContent = '正在保存...';

  try {
    await attachDebugger(tab.id);

    const { result: { root: { nodeId } } } = await sendDebuggerCommand(tab.id, 'DOM.getDocument', {});

    const { result: { nodes } } = await sendDebuggerCommand(tab.id, 'DOM.querySelectorAll', { nodeId, selector: 'script,style' });

    const scripts = [];
    const styles = [];
    for (const node of nodes) {
      const { result: { outerHTML } } = await sendDebuggerCommand(tab.id, 'DOM.getOuterHTML', { nodeId: node.nodeId });
      if (node.tagName === 'SCRIPT') scripts.push(outerHTML);
      if (node.tagName === 'STYLE') styles.push(outerHTML);
    }

    await detachDebugger(tab.id);

    const title = tab.title || 'page';
    const url = tab.url;
    const safeTitle = title.replace(/[\\/:*?"<>|]/g, '_');
    const savedAt = new Date().toLocaleString('zh-CN');

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${title} - 完整页面内容</title>
<!--
  来源页面: ${url}
  页面标题: ${title}
  收集时间: ${savedAt}
  脚本数量: ${scripts.length} 个
  样式数量: ${styles.length} 个
  捕获方式: debugger 模式（包含 Shadow DOM 内资源）
-->
</head>
<body>
<!-- 原始脚本标签 -->
${scripts.join('\n')}
<!-- 原始样式标签 -->
${styles.join('\n')}
</body>
</html>`;

    const fileEntity = {
      name: `${safeTitle}_完整页面.html`,
      content: html,
      type: 'html',
      source: { url, title },
      createdAt: Date.now(),
      metadata: {
        type: 'full-page',
        sourcePageUrl: url,
        sourcePageTitle: title,
        scriptCount: scripts.length,
        styleCount: styles.length,
        savedAt,
        captureMode: 'debugger'
      }
    };

    await chrome.runtime.sendMessage({ 
      type: 'SAVE_FILE', 
      file: fileEntity 
    });

    await alertWithSetting(`✅ 成功保存完整页面（${scripts.length} 个脚本，${styles.length} 个样式）`, 'success');
  } catch (error) {
    logger.error('保存页面失败:', error);
    await alertWithSetting('保存失败: ' + error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '💾 保存完整页面';
  }
}
