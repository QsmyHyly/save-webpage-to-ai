// html-cleaner.js - HTML 内容清理模块
// 用于在保存页面时过滤掉冗长但低信息密度的内容

/**
 * 默认 HTML 清理配置
 */
const DEFAULT_HTML_CLEANER_CONFIG = {
  // 追踪链接配置
  trackingLinks: {
    enabled: true,
    // 链接长度阈值（超过此长度的链接会被检查）
    maxLength: 2000,
    // 常见追踪域名模式
    trackingDomains: [
      'cm.bilibili.com/cm/api',
      'ad.doubleclick.net',
      'pagead2.googlesyndication.com',
      'adservice.google',
      'analytics.google',
      'www.google-analytics.com',
      'www.googletagmanager.com',
      'hm.baidu.com',
      'c.cnzz.com',
      's22.cnzz.com',
      'pos.baidu.com',
      'cpro.baidu.com',
      'eclick.baidu.com',
      'nsclick.baidu.com',
      'ad.toutiao.com',
      'log.toutiao.com',
      'pv.toutiao.com',
      'item.toutiao.com',
      'tracker.toutiao.com',
      'ad.qq.com',
      'c.gdt.qq.com',
      'pgdt.gtimg.cn',
      'mi.gdt.qq.com',
      'e.qq.com',
      'b.qq.com',
      'tajs.qq.com',
      'c.cnzz.com',
      's23.cnzz.com',
      'res.wx.qq.com',
      'weixin.qq.com/cgi-bin/mmwebwx',
      'abtest.cm.bilibili.com',
      'data.bilibili.com',
      'member.bilibili.com/x/web',
      'api.bilibili.com/x/web-interface/nav',
      'api.bilibili.com/x/report',
    ],
    // 追踪参数关键词
    trackingParams: [
      'track_id', 'trackid', 'tracking_id',
      'request_id', 'requestid',
      'session_id', 'sessionid',
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'click_id', 'clickid', 'clickid',
      'ad_id', 'adid',
      'creative_id', 'creativeid',
      'placement_id',
      'from_spmid', 'from_spam',
      'spm_id', 'spmid',
      'scm_id', 'scmid',
      'pvid', 'pv_id',
      'cna', 'sid', 'sids',
      'abtest', 'bucket_id',
      'feid', 'fid',
      'w_uid', 'web_uid',
      'x-b3-traceid', 'x-trace-id',
    ]
  },

  // 内联样式配置
  inlineStyles: {
    enabled: true,
    // 样式块大小阈值（字节），超过此大小的样式块会被移除
    maxStyleSize: 50000, // 50KB
    // 保留的样式块特征（包含这些特征的样式块会被保留）
    preservePatterns: [
      'print', // 打印样式
      '@media print',
      'page-break',
    ],
    // 需要移除的样式块特征（数据注入器标记）
    removeInjectors: [
      'data-injector="nano"',
      'data-injector="danmaku-x"',
      'data-injector="bili-player"',
      'id="bmgstyle-',
      'class="bili-player',
      'bpx-player',
    ]
  },

  // 脚本配置
  scripts: {
    enabled: true,
    // 需要保留的脚本特征（包含有用信息的脚本）
    preservePatterns: [
      '__playinfo__',      // B站视频流信息
      '__NEXT_DATA__',     // Next.js 数据
      '__NUXT__',          // Nuxt.js 数据
      'window.__INITIAL_STATE__', // 初始状态数据
      'videoUrl',          // 视频URL
      'streamUrl',         // 流URL
      'playUrl',           // 播放URL
      'sourceUrl',         // 资源URL
    ],
    // 需要移除的脚本特征（纯配置/追踪脚本）
    removePatterns: [
      'window.webAbTest',           // A/B测试配置
      'window.__MIRROR_CONFIG__',   // 镜像配置
      'window.__ABTEST__',          // A/B测试
      'window.__PRELOAD_STATE__',   // 预加载状态（可选移除）
      'window.__ssrFirstPageData__', // SSR数据
      'window.__INITIAL_SSR_STATE__', // SSR初始状态
      'window.__INITIAL_BASE_DATA__', // 基础数据
      'performance.mark',           // 性能标记
      'performance.measure',        // 性能测量
      '_hmt.push',                  // 百度统计
      '_czc.push',                  // CNZZ统计
      'gtag(',                      // Google Analytics
      'dataLayer.push',             // GTM
      'sensors.track',              // 神策埋点
      'sensors.identify',           // 神策识别
      'zhuge.track',                // 诸葛io
      'zhuge.identify',             // 诸葛io
    ],
    // 脚本内容大小阈值（字节），超过此大小会被检查
    maxScriptSize: 100000, // 100KB
  },

  // 通用配置
  general: {
    // 是否移除注释
    removeComments: false,
    // 是否移除 data-* 属性（保留有意义的如 data-v-*）
    removeDataAttributes: false,
  }
};

/**
 * 当前 HTML 清理配置（运行时）
 */
let HTML_CLEANER_CONFIG = JSON.parse(JSON.stringify(DEFAULT_HTML_CLEANER_CONFIG));

/**
 * 从 storage 加载 HTML 清理配置
 * @returns {Promise<Object>} 清理配置
 */
async function loadCleanerConfig() {
  try {
    // 检查是否在扩展上下文中
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      const result = await chrome.storage.sync.get(['profiles', 'currentProfileId']);
      const profiles = result.profiles || {};
      const currentProfileId = result.currentProfileId || 'default';
      
      if (profiles[currentProfileId] && profiles[currentProfileId].cleanerConfig) {
        HTML_CLEANER_CONFIG = profiles[currentProfileId].cleanerConfig;
        console.log('[HTML清理] 已加载配置:', currentProfileId);
      } else {
        HTML_CLEANER_CONFIG = JSON.parse(JSON.stringify(DEFAULT_HTML_CLEANER_CONFIG));
        console.log('[HTML清理] 使用默认配置');
      }
    }
  } catch (error) {
    console.warn('[HTML清理] 加载配置失败，使用默认配置:', error);
    HTML_CLEANER_CONFIG = JSON.parse(JSON.stringify(DEFAULT_HTML_CLEANER_CONFIG));
  }
  
  return HTML_CLEANER_CONFIG;
}

/**
 * 获取当前配置（同步）
 * @returns {Object} 当前配置
 */
function getCurrentCleanerConfig() {
  return HTML_CLEANER_CONFIG;
}

/**
 * 设置清理配置（用于从外部传入配置）
 * @param {Object} config - 新配置
 */
function setCleanerConfig(config) {
  if (config) {
    HTML_CLEANER_CONFIG = config;
  }
}

/**
 * 检查URL是否是追踪链接
 * @param {string} url - 要检查的URL
 * @returns {boolean} 是否是追踪链接
 */
function isTrackingUrl(url) {
  if (!url || typeof url !== 'string') return false;
  
  const config = HTML_CLEANER_CONFIG.trackingLinks;
  if (!config.enabled) return false;

  // 检查长度
  if (url.length > config.maxLength) {
    // 检查是否包含追踪域名
    const lowerUrl = url.toLowerCase();
    for (const domain of config.trackingDomains) {
      if (lowerUrl.includes(domain.toLowerCase())) {
        return true;
      }
    }
    
    // 检查是否包含大量追踪参数
    let trackingParamCount = 0;
    for (const param of config.trackingParams) {
      if (lowerUrl.includes(param.toLowerCase())) {
        trackingParamCount++;
      }
    }
    // 如果包含3个以上追踪参数，视为追踪链接
    if (trackingParamCount >= 3) {
      return true;
    }
  }
  
  return false;
}

/**
 * 清理HTML中的追踪链接
 * @param {string} html - HTML内容
 * @returns {string} 清理后的HTML
 */
function cleanTrackingLinks(html) {
  if (!HTML_CLEANER_CONFIG.trackingLinks.enabled) return html;
  
  // 匹配 href 属性值
  return html.replace(/href\s*=\s*["']([^"']+)["']/gi, function(match, url) {
    if (isTrackingUrl(url)) {
      // 替换为占位符，保留链接结构
      return 'href="[追踪链接已移除]" data-original-href-length="' + url.length + '"';
    }
    return match;
  });
}

/**
 * 清理HTML中的大型内联样式块
 * @param {string} html - HTML内容
 * @returns {string} 清理后的HTML
 */
function cleanInlineStyles(html) {
  if (!HTML_CLEANER_CONFIG.inlineStyles.enabled) return html;
  
  const config = HTML_CLEANER_CONFIG.inlineStyles;
  
  // 匹配 <style> 标签
  return html.replace(/<style([^>]*)>([\s\S]*?)<\/style>/gi, function(match, attrs, content) {
    const styleSize = content.length;
    
    // 检查是否需要保留
    for (const pattern of config.preservePatterns) {
      if (content.includes(pattern) || attrs.includes(pattern)) {
        return match;
      }
    }
    
    // 检查是否匹配移除特征
    for (const injector of config.removeInjectors) {
      if (attrs.includes(injector)) {
        return '<!-- [样式块已移除: ' + injector + ', 原大小: ' + formatSize(styleSize) + '] -->';
      }
    }
    
    // 如果超过大小阈值，移除
    if (styleSize > config.maxStyleSize) {
      return '<!-- [大型样式块已移除, 原大小: ' + formatSize(styleSize) + '] -->';
    }
    
    return match;
  });
}

/**
 * 清理HTML中的配置脚本
 * @param {string} html - HTML内容
 * @returns {string} 清理后的HTML
 */
function cleanScripts(html) {
  if (!HTML_CLEANER_CONFIG.scripts.enabled) return html;
  
  const config = HTML_CLEANER_CONFIG.scripts;
  
  // 匹配 <script> 标签（内联脚本）
  return html.replace(/<script([^>]*)>([\s\S]*?)<\/script>/gi, function(match, attrs, content) {
    const scriptSize = content.length;
    
    // 如果是外部脚本（有src属性），保留
    if (/\bsrc\s*=/.test(attrs)) {
      return match;
    }
    
    // 如果内容为空或很小，保留
    if (scriptSize < 100) {
      return match;
    }
    
    // 检查是否需要保留
    for (const pattern of config.preservePatterns) {
      if (content.includes(pattern)) {
        return match;
      }
    }
    
    // 检查是否匹配移除特征
    for (const pattern of config.removePatterns) {
      if (content.includes(pattern)) {
        return '<!-- [配置脚本已移除: ' + pattern + ', 原大小: ' + formatSize(scriptSize) + '] -->';
      }
    }
    
    // 如果超过大小阈值，添加警告注释
    if (scriptSize > config.maxScriptSize) {
      // 不直接移除，但添加注释标记
      return '<!-- [大型脚本警告, 大小: ' + formatSize(scriptSize) + '] -->' + match;
    }
    
    return match;
  });
}

/**
 * 格式化文件大小
 * @param {number} bytes - 字节数
 * @returns {string} 格式化后的大小
 */
function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * 清理HTML注释（可选）
 * @param {string} html - HTML内容
 * @returns {string} 清理后的HTML
 */
function cleanComments(html) {
  if (!HTML_CLEANER_CONFIG.general.removeComments) return html;
  
  // 移除HTML注释，但保留条件注释（IE hack）
  return html.replace(/<!--(?!\[if)[\s\S]*?-->/g, '');
}

/**
 * 统计清理效果
 * @param {string} originalHtml - 原始HTML
 * @param {string} cleanedHtml - 清理后的HTML
 * @returns {Object} 统计信息
 */
function getCleanStats(originalHtml, cleanedHtml) {
  const originalSize = originalHtml.length;
  const cleanedSize = cleanedHtml.length;
  const savedSize = originalSize - cleanedSize;
  const savedPercent = ((savedSize / originalSize) * 100).toFixed(1);
  
  // 统计移除的内容
  const removedTracking = (originalHtml.match(/href\s*=\s*["'][^"']+["']/gi) || []).length -
                         (cleanedHtml.match(/href\s*=\s*["'][^"']+["']/gi) || []).length;
  const removedStyles = (cleanedHtml.match(/\[样式块已移除/g) || []).length;
  const removedScripts = (cleanedHtml.match(/\[配置脚本已移除/g) || []).length;
  
  return {
    originalSize,
    cleanedSize,
    savedSize,
    savedPercent,
    removedTracking,
    removedStyles,
    removedScripts
  };
}

/**
 * 初始化清理模块（加载配置）
 * @returns {Promise<void>}
 */
async function initCleaner() {
  await loadCleanerConfig();
}

/**
 * 主清理函数 - 清理HTML内容
 * @param {string} html - 原始HTML内容
 * @param {Object} options - 可选配置覆盖
 * @param {boolean} options.loadConfig - 是否从 storage 加载配置（默认 false）
 * @param {Object} options.config - 自定义配置（覆盖当前配置）
 * @returns {Promise<Object>} 包含清理后的HTML和统计信息
 */
async function cleanHtmlContent(html, options = {}) {
  if (!html || typeof html !== 'string') {
    return { html: html, stats: null };
  }
  
  // 如果需要，从 storage 加载配置
  if (options.loadConfig) {
    await loadCleanerConfig();
  }
  
  const originalHtml = html;
  let cleanedHtml = html;
  
  // 合并配置
  if (options.config) {
    const mergedConfig = JSON.parse(JSON.stringify(HTML_CLEANER_CONFIG));
    Object.assign(mergedConfig, options.config);
    // 临时使用合并后的配置
    const originalConfig = HTML_CLEANER_CONFIG;
    HTML_CLEANER_CONFIG = mergedConfig;
    
    const result = performClean(originalHtml, cleanedHtml);
    
    // 恢复原始配置
    HTML_CLEANER_CONFIG = originalConfig;
    return result;
  }
  
  return performClean(originalHtml, cleanedHtml);
}

/**
 * 执行清理操作
 * @param {string} originalHtml - 原始HTML
 * @param {string} cleanedHtml - 待清理的HTML
 * @returns {Object} 清理结果
 */
function performClean(originalHtml, cleanedHtml) {
  // 按顺序执行清理
  // 1. 清理追踪链接
  cleanedHtml = cleanTrackingLinks(cleanedHtml);
  
  // 2. 清理内联样式
  cleanedHtml = cleanInlineStyles(cleanedHtml);
  
  // 3. 清理脚本
  cleanedHtml = cleanScripts(cleanedHtml);
  
  // 4. 清理注释（可选）
  cleanedHtml = cleanComments(cleanedHtml);
  
  // 统计清理效果
  const stats = getCleanStats(originalHtml, cleanedHtml);
  
  // 记录日志
  if (stats.savedSize > 0) {
    console.log('[HTML清理] 原始大小:', formatSize(stats.originalSize), 
                '清理后:', formatSize(stats.cleanedSize),
                '节省:', formatSize(stats.savedSize), '(' + stats.savedPercent + '%)');
  }
  
  return {
    html: cleanedHtml,
    stats: stats
  };
}

/**
 * 获取当前清理配置
 * @returns {Object} 当前配置
 */
function getCleanerConfig() {
  return JSON.parse(JSON.stringify(HTML_CLEANER_CONFIG));
}

/**
 * 获取默认清理配置
 * @returns {Object} 默认配置
 */
function getDefaultCleanerConfig() {
  return JSON.parse(JSON.stringify(DEFAULT_HTML_CLEANER_CONFIG));
}
