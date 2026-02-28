// html-cleaner.js - HTML 内容清理模块（管道式架构）
// 用于在保存页面时过滤掉冗长但低信息密度的内容
// 
// 架构说明：
// - 使用规则引擎统一处理元素屏蔽逻辑
// - 清理器按管道顺序执行，每个清理器专注于一种清理任务
// - 配置通过构造函数传入，不再自行加载 storage
//
// 日志说明：
// - 此文件运行在 popup 环境，可通过 logger.js 输出日志
// - 如需统一日志，请在使用前先加载 logger.js

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 安全日志输出（兼容 logger.js 和 console）
 */
const cleanerLog = {
  _getLogger: function() {
    // 优先使用 logger.js（如果已加载）
    if (typeof logger !== 'undefined') return logger;
    // 降级使用 console
    return {
      info: function() { console.log.apply(console, arguments); },
      warn: function() { console.warn.apply(console, arguments); },
      error: function() { console.error.apply(console, arguments); }
    };
  },
  info: function() { this._getLogger().info.apply(this._getLogger(), arguments); },
  warn: function() { this._getLogger().warn.apply(this._getLogger(), arguments); },
  error: function() { this._getLogger().error.apply(this._getLogger(), arguments); }
};

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
// 规则引擎相关（内联定义，避免依赖）
// ============================================================================

/**
 * 规则类型
 */
const RULE_TYPES = {
  CSS: 'css',
  ATTRIBUTE: 'attribute'
};

/**
 * 检查规则是否启用
 */
function isRuleEnabled(rule) {
  return rule && rule.enabled !== false;
}

/**
 * 属性值匹配
 */
function matchAttributeCondition(attrValue, cond) {
  const { op, value } = cond;
  
  if (op === 'exists') return attrValue !== null;
  if (op === 'notExists') return attrValue === null;
  if (attrValue === null) return false;

  switch (op) {
    case 'contains': return attrValue.includes(String(value));
    case 'startsWith': return attrValue.startsWith(String(value));
    case 'endsWith': return attrValue.endsWith(String(value));
    case 'equals': return attrValue === String(value);
    case 'regex':
      try { return new RegExp(value, 'i').test(attrValue); }
      catch (e) { return false; }
  }

  // 数值比较
  const numOps = ['>', '<', '>=', '<=', '=='];
  if (numOps.includes(op)) {
    const num = parseFloat(attrValue);
    const target = parseFloat(value);
    if (isNaN(num) || isNaN(target)) return false;
    switch (op) {
      case '>': return num > target;
      case '<': return num < target;
      case '>=': return num >= target;
      case '<=': return num <= target;
      case '==': return num === target;
    }
  }

  // 长度比较
  const lenOps = ['length>', 'length<', 'length=='];
  if (lenOps.includes(op)) {
    const len = attrValue.length;
    const targetLen = parseInt(value, 10);
    if (isNaN(targetLen)) return false;
    switch (op) {
      case 'length>': return len > targetLen;
      case 'length<': return len < targetLen;
      case 'length==': return len === targetLen;
    }
  }

  return false;
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
 * 基于规则的元素屏蔽清理器
 * 使用 RuleEngine 统一处理 CSS 选择器和属性条件两种规则类型
 * 
 * 依赖：需要先加载 rule-types.js, rule-matcher.js, rule-engine.js
 * 
 * 规则格式：
 * - CSS 规则: { type: 'css', selector: '.ad-banner', enabled: true }
 * - 属性规则: { type: 'attribute', conditions: [...], match: 'all', enabled: true }
 */
class RuleBasedCleaner extends BaseCleaner {
  constructor() {
    super('RuleBasedCleaner');
  }

  isEnabled(config) {
    return config.elementBlocking?.enabled ?? true;
  }

  clean(html, baseUrl, config) {
    const rules = config.elementBlocking?.rules || [];
    const enabledRules = rules.filter(isRuleEnabled);
    
    if (enabledRules.length === 0) {
      return { output: html, stat: { removedElements: 0 } };
    }

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // 使用 RuleEngine 执行规则
      // 检查 RuleEngine 是否可用（可能未加载规则引擎脚本）
      if (typeof RuleEngine === 'undefined') {
        // 降级到内联实现
        cleanerLog.warn('[RuleBasedCleaner] RuleEngine 未加载，使用降级实现');
        return this._cleanWithFallback(doc, html, enabledRules);
      }
      
      // 创建规则引擎实例
      const registry = typeof globalRegistry !== 'undefined' ? globalRegistry : null;
      const engine = new RuleEngine(registry);
      engine.loadRules(enabledRules);
      
      // 执行清理
      const { removedCount, stats } = engine.execute(doc);
      
      return {
        output: doc.documentElement.outerHTML,
        stat: {
          removedElements: removedCount,
          ruleStats: stats?.ruleStats || {}
        }
      };
    } catch (e) {
      cleanerLog.warn('[RuleBasedCleaner] 执行失败:', e);
      return { output: html, stat: { removedElements: 0, error: e.message } };
    }
  }

  /**
   * 降级实现（当 RuleEngine 不可用时）
   * 保持与 RuleEngine 相同的行为
   */
  _cleanWithFallback(doc, originalHtml, enabledRules) {
    const removedElements = new Set();
    const ruleStats = {};

    enabledRules.forEach(rule => {
      let elements = [];
      
      if (rule.type === RULE_TYPES.CSS && rule.selector) {
        try {
          elements = Array.from(doc.querySelectorAll(rule.selector));
        } catch (e) {
          cleanerLog.warn(`[RuleBasedCleaner] 无效选择器: ${rule.selector}`);
        }
      } else if (rule.type === RULE_TYPES.ATTRIBUTE && rule.conditions?.length > 0) {
        const selector = rule.tag ? rule.tag.toLowerCase() : '*';
        try {
          const candidates = doc.querySelectorAll(selector);
          elements = Array.from(candidates).filter(el => {
            const matchMode = rule.match || 'all';
            const results = rule.conditions.map(cond => {
              const attrValue = el.getAttribute(cond.attr);
              return matchAttributeCondition(attrValue, cond);
            });
            return matchMode === 'any' ? results.some(Boolean) : results.every(Boolean);
          });
        } catch (e) {
          cleanerLog.warn(`[RuleBasedCleaner] 属性规则执行失败:`, e.message);
        }
      }

      elements.forEach(el => {
        if (!removedElements.has(el) && el.parentNode) {
          el.remove();
          removedElements.add(el);
          ruleStats[rule.id || rule.selector || 'unknown'] = 
            (ruleStats[rule.id || rule.selector || 'unknown'] || 0) + 1;
        }
      });
    });

    return {
      output: doc.documentElement.outerHTML,
      stat: {
        removedElements: removedElements.size,
        ruleStats
      }
    };
  }
}

// 向后兼容别名
const ElementBlockerCleaner = RuleBasedCleaner;
const AttributeBasedBlocker = RuleBasedCleaner;

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
      cleanerLog.warn('[追踪链接清理] DOM 解析失败:', e);
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
    // RuleBasedCleaner 统一处理 CSS 和属性规则
    this.registerCleaner(new RuleBasedCleaner());
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
      cleanerLog.warn('[HtmlCleaner] 只能注册 BaseCleaner 的实例');
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
        } catch (e) {
          cleanerLog.warn(`[HtmlCleaner] 清理器 ${cleaner.name} 执行失败:`, e);
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
      cleanerLog.info('[HTML清理] 原始:', formatSize(originalSize), 
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
        cleanerLog.info('[HTML清理] 已加载配置:', currentProfileId);
      } else {
        HTML_CLEANER_CONFIG = JSON.parse(JSON.stringify(DEFAULT_HTML_CLEANER_CONFIG));
      }
    }
  } catch (error) {
    cleanerLog.warn('[HTML清理] 加载配置失败:', error);
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
    RuleBasedCleaner,
    // 向后兼容别名
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
