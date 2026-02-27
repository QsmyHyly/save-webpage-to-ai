// html-cleaner.js - HTML 内容清理模块（管道式架构）
// 用于在保存页面时过滤掉冗长但低信息密度的内容

// ============================================================================
// 工具函数
// ============================================================================

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
 * 生成唯一 ID
 */
function generateId() {
  return 'cleaner-' + Date.now() + '-' + Math.random().toString(36).substring(2, 11);
}

// ============================================================================
// 默认配置
// ============================================================================

/**
 * 默认 HTML 清理配置
 */
const DEFAULT_HTML_CLEANER_CONFIG = {
  // 元素屏蔽配置
  elementBlocking: {
    enabled: true,
    rules: []  // 从 profiles.rules 同步
  },

  // 追踪链接配置
  trackingLinks: {
    enabled: true,
    maxLength: 2000,
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
      's23.cnzz.com',
      'res.wx.qq.com',
      'weixin.qq.com/cgi-bin/mmwebwx',
      'abtest.cm.bilibili.com',
      'data.bilibili.com',
      'member.bilibili.com/x/web',
      'api.bilibili.com/x/web-interface/nav',
      'api.bilibili.com/x/report',
    ],
    trackingParams: [
      'track_id', 'trackid', 'tracking_id',
      'request_id', 'requestid',
      'session_id', 'sessionid',
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'click_id', 'clickid',
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
    maxStyleSize: 50000,
    preservePatterns: ['print', '@media print', 'page-break'],
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
    preservePatterns: [
      '__playinfo__',
      '__NEXT_DATA__',
      '__NUXT__',
      'window.__INITIAL_STATE__',
      'videoUrl',
      'streamUrl',
      'playUrl',
      'sourceUrl',
    ],
    removePatterns: [
      'window.webAbTest',
      'window.__MIRROR_CONFIG__',
      'window.__ABTEST__',
      'window.__PRELOAD_STATE__',
      'window.__ssrFirstPageData__',
      'window.__INITIAL_SSR_STATE__',
      'window.__INITIAL_BASE_DATA__',
      'performance.mark',
      'performance.measure',
      '_hmt.push',
      '_czc.push',
      'gtag(',
      'dataLayer.push',
      'sensors.track',
      'sensors.identify',
      'zhuge.track',
      'zhuge.identify',
    ],
    maxScriptSize: 100000,
  },

  // 通用配置
  general: {
    removeComments: false,
    removeDataAttributes: false,
  }
};

// ============================================================================
// 清理器基类
// ============================================================================

/**
 * 清理器基类
 * 所有清理器都应继承此类并实现 isEnabled 和 clean 方法
 */
class BaseCleaner {
  constructor(name) {
    this.name = name || 'BaseCleaner';
  }

  /**
   * 判断清理器是否启用
   * @param {Object} config - 全局配置
   * @returns {boolean}
   */
  isEnabled(config) {
    return true;
  }

  /**
   * 执行清理
   * @param {string} html - HTML 内容
   * @param {string} baseUrl - 基础 URL
   * @param {Object} config - 全局配置
   * @returns {{ output: string, stat: Object }}
   */
  clean(html, baseUrl, config) {
    return { output: html, stat: {} };
  }
}

// ============================================================================
// 具体清理器实现
// ============================================================================

/**
 * 元素屏蔽清理器
 * 根据配置的 CSS 选择器移除匹配的元素
 */
class ElementBlockerCleaner extends BaseCleaner {
  constructor() {
    super('ElementBlockerCleaner');
  }

  isEnabled(config) {
    return config.elementBlocking?.enabled ?? true;
  }

  clean(html, baseUrl, config) {
    const rules = config.elementBlocking?.rules || [];
    const enabledRules = rules.filter(r => r.enabled && r.selector);
    
    if (enabledRules.length === 0) {
      return { output: html, stat: { removedElements: 0 } };
    }

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      let removedCount = 0;

      enabledRules.forEach(rule => {
        try {
          const elements = doc.querySelectorAll(rule.selector);
          elements.forEach(el => {
            el.remove();
            removedCount++;
          });
        } catch (e) {
          console.warn(`[元素屏蔽] 无效选择器: ${rule.selector}`, e.message);
        }
      });

      const output = doc.documentElement.outerHTML;
      return {
        output,
        stat: { removedElements: removedCount }
      };
    } catch (e) {
      console.warn('[元素屏蔽] DOM 解析失败:', e);
      return { output: html, stat: { removedElements: 0, error: e.message } };
    }
  }
}

/**
 * 追踪链接清理器
 * 净化 URL 中的追踪参数，保留链接可用性
 */
class TrackingLinkCleaner extends BaseCleaner {
  constructor() {
    super('TrackingLinkCleaner');
    this.attributes = ['href', 'src', 'data-src', 'poster', 'data-href'];
  }

  isEnabled(config) {
    return config.trackingLinks?.enabled ?? true;
  }

  /**
   * 净化单个 URL
   */
  purifyUrl(urlString, config, baseUrl) {
    if (!urlString || typeof urlString !== 'string') return urlString;
    
    const trimmedUrl = urlString.trim();
    // 跳过特殊协议
    if (/^(javascript:|mailto:|data:|tel:|ftp:|#)/i.test(trimmedUrl)) {
      return urlString;
    }

    try {
      const url = new URL(trimmedUrl, baseUrl);
      const params = url.searchParams;
      
      // 移除追踪参数
      config.trackingParams.forEach(param => {
        params.delete(param);
        params.delete(param.toLowerCase());
        params.delete(param.toUpperCase());
      });

      // 检查追踪域名
      const hostname = url.hostname.toLowerCase();
      let isTrackingDomain = false;
      for (const domain of config.trackingDomains) {
        if (hostname.includes(domain.toLowerCase())) {
          isTrackingDomain = true;
          break;
        }
      }

      let resultUrl = url.toString();
      // 如果是追踪域名或 URL 过长，简化 URL
      if ((isTrackingDomain || resultUrl.length > config.maxLength) && resultUrl.length > config.maxLength) {
        resultUrl = url.origin + url.pathname;
      }

      return resultUrl;
    } catch (e) {
      return urlString;
    }
  }

  clean(html, baseUrl, config) {
    const trackingConfig = config.trackingLinks;
    if (!trackingConfig) {
      return { output: html, stat: { purifiedLinks: 0 } };
    }

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      const selector = this.attributes.map(attr => `[${attr}]`).join(',');
      const elements = doc.querySelectorAll(selector);
      let purifiedCount = 0;

      for (const el of elements) {
        for (const attr of this.attributes) {
          const value = el.getAttribute(attr);
          if (!value) continue;
          
          const cleaned = this.purifyUrl(value, trackingConfig, baseUrl);
          if (cleaned !== value) {
            el.setAttribute(attr, cleaned);
            purifiedCount++;
          }
        }
      }

      const output = doc.documentElement.outerHTML;
      return {
        output,
        stat: { purifiedLinks: purifiedCount }
      };
    } catch (e) {
      console.warn('[追踪链接清理] DOM 解析失败:', e);
      return { output: html, stat: { purifiedLinks: 0, error: e.message } };
    }
  }
}

/**
 * 内联样式清理器
 * 移除大型或不必要的样式块
 */
class InlineStyleCleaner extends BaseCleaner {
  constructor() {
    super('InlineStyleCleaner');
  }

  isEnabled(config) {
    return config.inlineStyles?.enabled ?? true;
  }

  clean(html, baseUrl, config) {
    const styleConfig = config.inlineStyles;
    if (!styleConfig) {
      return { output: html, stat: { removedStyles: 0 } };
    }

    let removedCount = 0;

    const output = html.replace(/<style([^>]*)>([\s\S]*?)<\/style>/gi, (match, attrs, content) => {
      const styleSize = content.length;
      
      // 检查保留特征
      for (const pattern of styleConfig.preservePatterns || []) {
        if (content.includes(pattern) || attrs.includes(pattern)) {
          return match;
        }
      }
      
      // 检查移除特征
      for (const injector of styleConfig.removeInjectors || []) {
        if (attrs.includes(injector)) {
          removedCount++;
          return `<!-- [样式块已移除: ${injector}, 原大小: ${formatSize(styleSize)}] -->`;
        }
      }
      
      // 超过大小阈值
      if (styleSize > (styleConfig.maxStyleSize || 50000)) {
        removedCount++;
        return `<!-- [大型样式块已移除, 原大小: ${formatSize(styleSize)}] -->`;
      }
      
      return match;
    });

    return { output, stat: { removedStyles: removedCount } };
  }
}

/**
 * 脚本清理器
 * 移除配置脚本和追踪脚本
 */
class ScriptCleaner extends BaseCleaner {
  constructor() {
    super('ScriptCleaner');
  }

  isEnabled(config) {
    return config.scripts?.enabled ?? true;
  }

  clean(html, baseUrl, config) {
    const scriptConfig = config.scripts;
    if (!scriptConfig) {
      return { output: html, stat: { removedScripts: 0 } };
    }

    let removedCount = 0;

    const output = html.replace(/<script([^>]*)>([\s\S]*?)<\/script>/gi, (match, attrs, content) => {
      const scriptSize = content.length;
      
      // 外部脚本保留
      if (/\bsrc\s*=/.test(attrs)) {
        return match;
      }
      
      // 内容太小保留
      if (scriptSize < 100) {
        return match;
      }
      
      // 检查保留特征
      for (const pattern of scriptConfig.preservePatterns || []) {
        if (content.includes(pattern)) {
          return match;
        }
      }
      
      // 检查移除特征
      for (const pattern of scriptConfig.removePatterns || []) {
        if (content.includes(pattern)) {
          removedCount++;
          return `<!-- [配置脚本已移除: ${pattern}, 原大小: ${formatSize(scriptSize)}] -->`;
        }
      }
      
      // 超大脚本警告
      if (scriptSize > (scriptConfig.maxScriptSize || 100000)) {
        return `<!-- [大型脚本警告, 大小: ${formatSize(scriptSize)}] -->` + match;
      }
      
      return match;
    });

    return { output, stat: { removedScripts: removedCount } };
  }
}

/**
 * 注释清理器
 * 移除 HTML 注释
 */
class CommentCleaner extends BaseCleaner {
  constructor() {
    super('CommentCleaner');
  }

  isEnabled(config) {
    return config.general?.removeComments ?? false;
  }

  clean(html, baseUrl, config) {
    // 移除 HTML 注释，保留条件注释
    const output = html.replace(/<!--(?!\[if)[\s\S]*?-->/g, '');
    const removedCount = (html.match(/<!--(?!\[if)[\s\S]*?-->/g) || []).length;
    
    return { output, stat: { removedComments: removedCount } };
  }
}

/**
 * Data 属性清理器
 * 移除无意义的 data-* 属性
 */
class DataAttributeCleaner extends BaseCleaner {
  constructor() {
    super('DataAttributeCleaner');
  }

  isEnabled(config) {
    return config.general?.removeDataAttributes ?? false;
  }

  clean(html, baseUrl, config) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      const elements = doc.querySelectorAll('[data-]');
      let removedCount = 0;

      elements.forEach(el => {
        const attrs = Array.from(el.attributes);
        attrs.forEach(attr => {
          // 保留 data-v-* (Vue scoped) 等有意义的属性
          if (attr.name.startsWith('data-') && !attr.name.match(/^data-v-/)) {
            el.removeAttribute(attr.name);
            removedCount++;
          }
        });
      });

      const output = doc.documentElement.outerHTML;
      return { output, stat: { removedDataAttrs: removedCount } };
    } catch (e) {
      return { output: html, stat: { removedDataAttrs: 0 } };
    }
  }
}

/**
 * 基于属性值的元素屏蔽清理器
 * 根据元素属性值的条件判断来移除元素，支持比 CSS 选择器更复杂的匹配逻辑
 * 
 * 规则格式:
 * {
 *   id: 'rule-xxx',
 *   type: 'attribute',
 *   tag: 'img',           // 可选，限制标签类型
 *   conditions: [
 *     { attr: 'src', op: 'contains', value: 'utm_' },
 *     { attr: 'style', op: 'length>', value: 5000 }
 *   ],
 *   match: 'all',         // 'all' 或 'any'
 *   enabled: true,
 *   description: '描述'
 * }
 * 
 * 支持的操作符:
 * - contains: 包含字符串
 * - startsWith: 前缀匹配
 * - endsWith: 后缀匹配
 * - regex: 正则匹配
 * - >, <, >=, <=, ==: 数值比较
 * - length>, length<, length==: 字符串长度比较
 * - exists: 属性存在性检查
 */
class AttributeBasedBlocker extends BaseCleaner {
  constructor() {
    super('AttributeBasedBlocker');
  }

  isEnabled(config) {
    return config.attributeBlocking?.enabled ?? true;
  }

  /**
   * 检查单个条件是否匹配
   */
  matchCondition(attrValue, cond) {
    if (cond.op === 'exists') {
      return attrValue !== null;
    }

    if (attrValue === null) {
      return false;
    }

    switch (cond.op) {
      case 'contains':
        return attrValue.includes(cond.value);
      
      case 'startsWith':
        return attrValue.startsWith(cond.value);
      
      case 'endsWith':
        return attrValue.endsWith(cond.value);
      
      case 'regex':
        try {
          return new RegExp(cond.value, 'i').test(attrValue);
        } catch (e) {
          console.warn('[属性屏蔽] 无效正则:', cond.value);
          return false;
        }
      
      case '>':
      case '<':
      case '>=':
      case '<=':
      case '==': {
        const num = parseFloat(attrValue);
        if (isNaN(num)) return false;
        const targetValue = parseFloat(cond.value);
        if (isNaN(targetValue)) return false;
        switch (cond.op) {
          case '>': return num > targetValue;
          case '<': return num < targetValue;
          case '>=': return num >= targetValue;
          case '<=': return num <= targetValue;
          case '==': return num === targetValue;
        }
        return false;
      }
      
      case 'length>':
      case 'length<':
      case 'length==': {
        const len = attrValue.length;
        const targetLen = parseInt(cond.value, 10);
        if (isNaN(targetLen)) return false;
        switch (cond.op) {
          case 'length>': return len > targetLen;
          case 'length<': return len < targetLen;
          case 'length==': return len === targetLen;
        }
        return false;
      }
      
      default:
        return false;
    }
  }

  /**
   * 检查元素是否匹配规则
   */
  matchesRule(element, rule) {
    const conditions = rule.conditions || [];
    if (conditions.length === 0) return false;

    const matchType = rule.match || 'all';
    const results = conditions.map(cond => {
      const attrValue = element.getAttribute(cond.attr);
      return this.matchCondition(attrValue, cond);
    });

    return matchType === 'any' 
      ? results.some(Boolean) 
      : results.every(Boolean);
  }

  clean(html, baseUrl, config) {
    const rules = config.attributeBlocking?.rules || [];
    const enabledRules = rules.filter(r => r.enabled && r.type === 'attribute' && r.conditions?.length > 0);
    
    if (enabledRules.length === 0) {
      return { output: html, stat: { removedByAttribute: 0 } };
    }

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      let removedCount = 0;

      enabledRules.forEach(rule => {
        let selector = '*';
        if (rule.tag) {
          selector = rule.tag.toLowerCase();
        }
        
        try {
          const elements = doc.querySelectorAll(selector);
          elements.forEach(el => {
            if (this.matchesRule(el, rule)) {
              el.remove();
              removedCount++;
            }
          });
        } catch (e) {
          console.warn(`[属性屏蔽] 规则执行失败:`, rule.id, e.message);
        }
      });

      const output = doc.documentElement.outerHTML;
      return {
        output,
        stat: { removedByAttribute: removedCount }
      };
    } catch (e) {
      console.warn('[属性屏蔽] DOM 解析失败:', e);
      return { output: html, stat: { removedByAttribute: 0, error: e.message } };
    }
  }
}

// ============================================================================
// HtmlCleaner 核心类
// ============================================================================

/**
 * HTML 清理器核心类
 * 管理多个清理器并按管道顺序执行
 */
class HtmlCleaner {
  constructor(config = {}) {
    this.config = this.mergeConfig(config);
    this.cleaners = [];
    this.initCleaners();
  }

  /**
   * 合并配置（深度合并）
   */
  mergeConfig(userConfig) {
    const defaultConfig = JSON.parse(JSON.stringify(DEFAULT_HTML_CLEANER_CONFIG));
    
    // 深度合并
    const merge = (target, source) => {
      for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          target[key] = target[key] || {};
          merge(target[key], source[key]);
        } else {
          target[key] = source[key];
        }
      }
      return target;
    };

    return merge(defaultConfig, userConfig);
  }

  /**
   * 初始化所有内置清理器
   */
  initCleaners() {
    // 注册顺序即执行顺序
    this.registerCleaner(new ElementBlockerCleaner());
    this.registerCleaner(new AttributeBasedBlocker());
    this.registerCleaner(new TrackingLinkCleaner());
    this.registerCleaner(new InlineStyleCleaner());
    this.registerCleaner(new ScriptCleaner());
    this.registerCleaner(new CommentCleaner());
    this.registerCleaner(new DataAttributeCleaner());
  }

  /**
   * 注册清理器
   */
  registerCleaner(cleaner) {
    if (cleaner instanceof BaseCleaner) {
      this.cleaners.push(cleaner);
    } else {
      console.warn('[HtmlCleaner] 只能注册 BaseCleaner 的实例');
    }
  }

  /**
   * 更新配置
   */
  setConfig(config) {
    this.config = this.mergeConfig(config);
  }

  /**
   * 执行清理
   * @param {string} html - 原始 HTML
   * @param {string} baseUrl - 基础 URL
   * @returns {{ html: string, stats: Object }}
   */
  clean(html, baseUrl = '') {
    if (!html || typeof html !== 'string') {
      return { html: html, stats: null };
    }

    const originalSize = html.length;
    let currentHtml = html;
    const allStats = {
      originalSize,
      cleanerStats: {}
    };

    // 按顺序执行每个清理器
    for (const cleaner of this.cleaners) {
      if (cleaner.isEnabled(this.config)) {
        try {
          const { output, stat } = cleaner.clean(currentHtml, baseUrl, this.config);
          currentHtml = output;
          allStats.cleanerStats[cleaner.name] = stat;
          
          // 累计关键统计
          if (stat.removedElements) {
            allStats.removedElements = (allStats.removedElements || 0) + stat.removedElements;
          }
          if (stat.purifiedLinks) {
            allStats.purifiedLinks = (allStats.purifiedLinks || 0) + stat.purifiedLinks;
          }
          if (stat.removedStyles) {
            allStats.removedStyles = (allStats.removedStyles || 0) + stat.removedStyles;
          }
          if (stat.removedScripts) {
            allStats.removedScripts = (allStats.removedScripts || 0) + stat.removedScripts;
          }
          if (stat.removedByAttribute) {
            allStats.removedByAttribute = (allStats.removedByAttribute || 0) + stat.removedByAttribute;
          }
        } catch (e) {
          console.warn(`[HtmlCleaner] 清理器 ${cleaner.name} 执行失败:`, e);
        }
      }
    }

    // 计算总体统计
    const cleanedSize = currentHtml.length;
    allStats.cleanedSize = cleanedSize;
    allStats.savedSize = originalSize - cleanedSize;
    allStats.savedPercent = originalSize > 0 
      ? ((allStats.savedSize / originalSize) * 100).toFixed(1) 
      : '0.0';

    // 日志
    if (allStats.savedSize > 0) {
      console.log('[HTML清理] 原始:', formatSize(originalSize), 
                  '清理后:', formatSize(cleanedSize),
                  '节省:', formatSize(allStats.savedSize), `(${allStats.savedPercent}%)`);
    }

    return {
      html: currentHtml,
      stats: allStats
    };
  }
}

// ============================================================================
// 向后兼容的函数接口
// ============================================================================

/**
 * 当前运行时配置（向后兼容）
 */
let HTML_CLEANER_CONFIG = JSON.parse(JSON.stringify(DEFAULT_HTML_CLEANER_CONFIG));

/**
 * 全局清理器实例
 */
let globalCleaner = null;

/**
 * 从 storage 加载配置
 */
async function loadCleanerConfig() {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      const result = await chrome.storage.sync.get(['profiles', 'currentProfileId']);
      const profiles = result.profiles || {};
      const currentProfileId = result.currentProfileId || 'default';
      
      if (profiles[currentProfileId]) {
        const profile = profiles[currentProfileId];
        // 合并 cleanerConfig 和 rules
        HTML_CLEANER_CONFIG = {
          ...DEFAULT_HTML_CLEANER_CONFIG,
          ...(profile.cleanerConfig || {}),
          elementBlocking: {
            enabled: true,
            rules: profile.rules || []
          }
        };
        console.log('[HTML清理] 已加载配置:', currentProfileId);
      } else {
        HTML_CLEANER_CONFIG = JSON.parse(JSON.stringify(DEFAULT_HTML_CLEANER_CONFIG));
      }
    }
  } catch (error) {
    console.warn('[HTML清理] 加载配置失败:', error);
    HTML_CLEANER_CONFIG = JSON.parse(JSON.stringify(DEFAULT_HTML_CLEANER_CONFIG));
  }
  
  return HTML_CLEANER_CONFIG;
}

/**
 * 主清理函数（向后兼容接口）
 */
async function cleanHtmlContent(html, options = {}) {
  if (!html || typeof html !== 'string') {
    return { html: html, stats: null };
  }
  
  // 加载配置
  if (options.loadConfig) {
    await loadCleanerConfig();
  }
  
  // 合并配置
  let config = HTML_CLEANER_CONFIG;
  if (options.config) {
    config = { ...HTML_CLEANER_CONFIG, ...options.config };
  }
  
  // 创建清理器并执行
  const cleaner = new HtmlCleaner(config);
  return cleaner.clean(html, options.baseUrl || '');
}

/**
 * 获取当前配置（向后兼容）
 */
function getCurrentCleanerConfig() {
  return HTML_CLEANER_CONFIG;
}

/**
 * 获取当前配置的副本
 */
function getCleanerConfig() {
  return JSON.parse(JSON.stringify(HTML_CLEANER_CONFIG));
}

/**
 * 设置清理配置
 */
function setCleanerConfig(config) {
  if (config) {
    HTML_CLEANER_CONFIG = config;
  }
}

/**
 * 获取默认配置
 */
function getDefaultCleanerConfig() {
  return JSON.parse(JSON.stringify(DEFAULT_HTML_CLEANER_CONFIG));
}

/**
 * 初始化清理模块
 */
async function initCleaner() {
  await loadCleanerConfig();
}

// 导出（如果需要模块化）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    HtmlCleaner,
    BaseCleaner,
    ElementBlockerCleaner,
    AttributeBasedBlocker,
    TrackingLinkCleaner,
    InlineStyleCleaner,
    ScriptCleaner,
    CommentCleaner,
    DataAttributeCleaner,
    cleanHtmlContent,
    loadCleanerConfig,
    getCleanerConfig,
    getDefaultCleanerConfig,
    DEFAULT_HTML_CLEANER_CONFIG
  };
}
