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

// ==================== 保存函数 ====================

async function saveCurrentPage() {
  const btn = document.getElementById('saveCurrentBtn');
  btn.disabled = true;
  btn.textContent = '⏳ 保存中...';
  
  try {
    const result = await chrome.storage.sync.get('enableDebugger');
    const useDebugger = result.enableDebugger || false;

    if (useDebugger) {
      await saveWithDebugger();
    } else {
      await saveWithInjection();
    }
  } catch (error) {
    logger.error('保存失败:', error);
    btn.textContent = '❌ 保存失败';
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = '💾 保存当前页面';
    }, 1500);
  }
}

async function saveWithInjection() {
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
  const fileEntity = {
    name: `${title.replace(/[\\/:*?"<>|]/g, '_')}.html`,
    content: html,
    type: 'html',
    source: { url, title },
    createdAt: Date.now(),
    metadata: { savedAt: Date.now() }
  };

  const response = await chrome.runtime.sendMessage({
    type: MESSAGE_TYPES.SAVE_FILE,
    fileEntity
  });

  if (response && response.status === 'error') throw new Error(response.message);

  await loadFiles();

  const btn = document.getElementById('saveCurrentBtn');
  btn.textContent = '✅ 保存成功';
  setTimeout(() => {
    btn.disabled = false;
    btn.textContent = '💾 保存当前页面';
  }, 1500);
}

async function saveWithDebugger() {
  const btn = document.getElementById('saveCurrentBtn');
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  try {
    await attachDebugger(tab.id);
    await sendDebuggerCommand(tab.id, 'DOM.enable', {});
    const { root } = await sendDebuggerCommand(tab.id, 'DOM.getDocument', { depth: -1, pierce: true });

    const fullHTML = getDoctypeFromNode(root) + '\n' + cdpNodeToHTML(root);

    await detachDebugger(tab.id);

    const title = tab.title || 'page';
    const url = tab.url;
    const fileEntity = {
      name: `${title.replace(/[\\/:*?"<>|]/g, '_')}_full.html`,
      content: fullHTML,
      type: 'html',
      source: { url, title },
      createdAt: Date.now(),
      metadata: { capturedWithDebugger: true }
    };

    const response = await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.SAVE_FILE,
      fileEntity
    });

    if (response && response.status === 'error') throw new Error(response.message);

    await loadFiles();

    btn.textContent = '✅ 保存成功';
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = '💾 保存当前页面';
    }, 1500);
  } catch (error) {
    logger.error('debugger 模式保存失败:', error);
    try { await detachDebugger(tab.id); } catch (e) {}
    btn.textContent = '❌ 保存失败';
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = '💾 保存当前页面';
    }, 1500);
  }
}

async function saveHTMLFromPage() {
  const result = await chrome.storage.sync.get('enableDebugger');
  const useDebugger = result.enableDebugger || false;
  if (useDebugger) {
    await saveHTMLWithDebugger();
    return;
  }

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

async function saveHTMLWithDebugger() {
  const btn = document.getElementById('saveHtmlBtn');
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  try {
    await attachDebugger(tab.id);
    await sendDebuggerCommand(tab.id, 'DOM.enable', {});
    const { root } = await sendDebuggerCommand(tab.id, 'DOM.getDocument', { depth: -1, pierce: true });

    function generateCleanHTML(node) {
      if (node.nodeType === 9) {
        let html = '';
        if (node.children) {
          for (const child of node.children) {
            html += generateCleanHTML(child);
          }
        }
        return html;
      }

      if (node.nodeType === 1) {
        const tagName = node.nodeName.toLowerCase();

        if (tagName === 'script' || tagName === 'style') return '';
        if (tagName === 'link') {
          let isStyle = false;
          if (node.attributes && node.attributes.length) {
            for (let i = 0; i < node.attributes.length; i += 2) {
              if (node.attributes[i] === 'rel' && node.attributes[i+1] === 'stylesheet') {
                isStyle = true;
                break;
              }
            }
          }
          if (isStyle) return '';
        }

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
            html += generateCleanHTML(child);
          }
        }

        if (node.shadowRoots) {
          for (const shadowRoot of node.shadowRoots) {
            let shadowHtml = '';
            if (shadowRoot.children) {
              for (const child of shadowRoot.children) {
                shadowHtml += generateCleanHTML(child);
              }
            }
            html += `<template shadowrootmode="${shadowRoot.mode}">${shadowHtml}</template>`;
          }
        }

        html += '</' + tagName + '>';
        return html;
      }

      if (node.nodeType === 3) {
        return node.nodeValue || '';
      }

      return '';
    }

    const cleanHTML = getDoctypeFromNode(root) + '\n' + generateCleanHTML(root);
    await detachDebugger(tab.id);

    const title = tab.title || 'page';
    const url = tab.url;
    const fileEntity = {
      name: `${title.replace(/[\\/:*?"<>|]/g, '_')}_clean.html`,
      content: cleanHTML,
      type: 'html',
      source: { url, title },
      createdAt: Date.now(),
      metadata: { capturedWithDebugger: true, cleaned: true }
    };

    const response = await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.SAVE_FILE,
      fileEntity
    });

    if (response && response.status === 'error') throw new Error(response.message);

    await loadFiles();

    btn.textContent = '✅ 保存成功';
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = '📄 只获取HTML';
    }, 1500);
  } catch (error) {
    logger.error('debugger 模式获取HTML失败:', error);
    try { await detachDebugger(tab.id); } catch (e) {}
    btn.textContent = '❌ 获取失败';
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = '📄 只获取HTML';
    }, 1500);
  }
}

async function saveJSFromPage() {
  const result = await chrome.storage.sync.get('enableDebugger');
  const useDebugger = result.enableDebugger || false;
  if (useDebugger) {
    await saveJSWithDebugger();
    return;
  }

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

async function saveJSWithDebugger() {
  const btn = document.getElementById('saveJsBtn');
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  try {
    await attachDebugger(tab.id);
    await sendDebuggerCommand(tab.id, 'DOM.enable', {});
    const { root } = await sendDebuggerCommand(tab.id, 'DOM.getDocument', { depth: -1, pierce: true });

    const scripts = [];

    function collectScripts(node) {
      if (node.nodeType === 1 && node.nodeName.toLowerCase() === 'script') {
        const scriptHTML = cdpNodeToHTML(node);
        scripts.push(scriptHTML);
      }
      if (node.children) {
        for (const child of node.children) {
          collectScripts(child);
        }
      }
      if (node.shadowRoots) {
        for (const shadowRoot of node.shadowRoots) {
          if (shadowRoot.children) {
            for (const child of shadowRoot.children) {
              collectScripts(child);
            }
          }
        }
      }
    }

    collectScripts(root);
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
        capturedWithDebugger: true
      }
    };

    const response = await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.SAVE_FILE,
      fileEntity
    });

    if (response && response.status === 'error') throw new Error(response.message);

    await loadFiles();
    btn.textContent = '✅ 保存成功';
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = '📜 只获取JS';
    }, 1500);
  } catch (error) {
    logger.error('debugger 模式获取JS失败:', error);
    try { await detachDebugger(tab.id); } catch (e) {}
    btn.textContent = '❌ 获取失败';
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = '📜 只获取JS';
    }, 1500);
  }
}

async function saveCSSFromPage() {
  const result = await chrome.storage.sync.get('enableDebugger');
  const useDebugger = result.enableDebugger || false;
  if (useDebugger) {
    await saveCSSWithDebugger();
    return;
  }

  const btn = document.getElementById('saveCssBtn');
  btn.disabled = true;
  btn.textContent = '⏳ 获取中...';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const styleTags = [];
        
        document.querySelectorAll('style').forEach(style => {
          styleTags.push(style.outerHTML);
        });
        
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

async function saveCSSWithDebugger() {
  const btn = document.getElementById('saveCssBtn');
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  try {
    await attachDebugger(tab.id);
    await sendDebuggerCommand(tab.id, 'DOM.enable', {});
    const { root } = await sendDebuggerCommand(tab.id, 'DOM.getDocument', { depth: -1, pierce: true });

    const styles = [];

    function collectStyles(node) {
      if (node.nodeType === 1) {
        const tagName = node.nodeName.toLowerCase();
        if (tagName === 'style') {
          styles.push(cdpNodeToHTML(node));
        } else if (tagName === 'link') {
          let isStyle = false;
          if (node.attributes && node.attributes.length) {
            for (let i = 0; i < node.attributes.length; i += 2) {
              if (node.attributes[i] === 'rel' && node.attributes[i+1] === 'stylesheet') {
                isStyle = true;
                break;
              }
            }
          }
          if (isStyle) {
            styles.push(cdpNodeToHTML(node));
          }
        }
      }
      if (node.children) {
        for (const child of node.children) {
          collectStyles(child);
        }
      }
      if (node.shadowRoots) {
        for (const shadowRoot of node.shadowRoots) {
          if (shadowRoot.children) {
            for (const child of shadowRoot.children) {
              collectStyles(child);
            }
          }
        }
      }
    }

    collectStyles(root);
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
        capturedWithDebugger: true
      }
    };

    const response = await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.SAVE_FILE,
      fileEntity
    });

    if (response && response.status === 'error') throw new Error(response.message);

    await loadFiles();
    btn.textContent = '✅ 保存成功';
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = '🎨 只获取CSS';
    }, 1500);
  } catch (error) {
    logger.error('debugger 模式获取CSS失败:', error);
    try { await detachDebugger(tab.id); } catch (e) {}
    btn.textContent = '❌ 获取失败';
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = '🎨 只获取CSS';
    }, 1500);
  }
}
