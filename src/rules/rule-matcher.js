// rule-matcher.js - 规则匹配器实现
// 每种规则类型对应一个匹配器

// ============================================================================
// 日志辅助（兼容独立运行和集成环境）
// ============================================================================

const _ruleLog = {
  _getLogger: function() {
    if (typeof logger !== 'undefined') return logger;
    return {
      warn: function() { console.warn.apply(console, arguments); }
    };
  },
  warn: function() { this._getLogger().warn.apply(this._getLogger(), arguments); }
};

// ============================================================================
// 基础匹配器
// ============================================================================

/**
 * 匹配器基类
 */
class BaseMatcher {
  constructor(type) {
    this.type = type;
  }

  /**
   * 检查元素是否匹配规则
   * @param {Element} element - DOM 元素
   * @param {Object} rule - 规则对象
   * @returns {boolean}
   */
  matches(element, rule) {
    return false;
  }

  /**
   * 获取匹配的元素列表
   * @param {Document} doc - DOM 文档
   * @param {Object} rule - 规则对象
   * @returns {Element[]}
   */
  queryAll(doc, rule) {
    return [];
  }
}

// ============================================================================
// CSS 选择器匹配器
// ============================================================================

/**
 * CSS 选择器匹配器
 * 使用 element.matches() 和 querySelectorAll() 进行匹配
 */
class CssMatcher extends BaseMatcher {
  constructor() {
    super('css');
  }

  matches(element, rule) {
    if (!rule.selector) return false;
    try {
      return element.matches(rule.selector);
    } catch (e) {
      _ruleLog.warn(`[CssMatcher] 无效选择器: ${rule.selector}`);
      return false;
    }
  }

  queryAll(doc, rule) {
    if (!rule.selector) return [];
    try {
      return Array.from(doc.querySelectorAll(rule.selector));
    } catch (e) {
      _ruleLog.warn(`[CssMatcher] 查询失败: ${rule.selector}`, e.message);
      return [];
    }
  }
}

// ============================================================================
// 属性值匹配器
// ============================================================================

/**
 * 属性值条件匹配器
 * 支持多种操作符进行属性值匹配
 */
class AttributeMatcher extends BaseMatcher {
  constructor() {
    super('attribute');
  }

  /**
   * 检查单个条件是否匹配
   * @param {string|null} attrValue - 属性值
   * @param {Object} cond - 条件对象 { attr, op, value }
   * @returns {boolean}
   */
  matchCondition(attrValue, cond) {
    const { op, value } = cond;

    // 存在性检查
    if (op === 'exists') {
      return attrValue !== null;
    }
    if (op === 'notExists') {
      return attrValue === null;
    }

    // 其他操作符需要属性值存在
    if (attrValue === null) {
      return false;
    }

    // 字符串操作符
    switch (op) {
      case 'contains':
        return attrValue.includes(String(value));
      
      case 'startsWith':
        return attrValue.startsWith(String(value));
      
      case 'endsWith':
        return attrValue.endsWith(String(value));
      
      case 'equals':
        return attrValue === String(value);
      
      case 'regex':
        try {
          return new RegExp(value, 'i').test(attrValue);
        } catch (e) {
          _ruleLog.warn(`[AttributeMatcher] 无效正则: ${value}`);
          return false;
        }
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

  /**
   * 检查元素是否匹配规则的所有条件
   * @param {Element} element - DOM 元素
   * @param {Object} rule - 规则对象
   * @returns {boolean}
   */
  matches(element, rule) {
    const conditions = rule.conditions || [];
    if (conditions.length === 0) return false;

    const matchMode = rule.match || 'all';
    const results = conditions.map(cond => {
      const attrValue = element.getAttribute(cond.attr);
      return this.matchCondition(attrValue, cond);
    });

    return matchMode === 'any'
      ? results.some(Boolean)
      : results.every(Boolean);
  }

  /**
   * 获取匹配的元素列表
   * @param {Document} doc - DOM 文档
   * @param {Object} rule - 规则对象
   * @returns {Element[]}
   */
  queryAll(doc, rule) {
    const conditions = rule.conditions || [];
    if (conditions.length === 0) return [];

    // 使用 tag 限定查询范围
    const selector = rule.tag ? rule.tag.toLowerCase() : '*';
    
    try {
      const elements = doc.querySelectorAll(selector);
      return Array.from(elements).filter(el => this.matches(el, rule));
    } catch (e) {
      _ruleLog.warn(`[AttributeMatcher] 查询失败:`, e.message);
      return [];
    }
  }
}

// ============================================================================
// 匹配器注册表
// ============================================================================

/**
 * 匹配器工厂
 * 管理所有匹配器的注册和获取
 */
class MatcherRegistry {
  constructor() {
    this.matchers = new Map();
    // 注册内置匹配器
    this.register(new CssMatcher());
    this.register(new AttributeMatcher());
  }

  /**
   * 注册匹配器
   * @param {BaseMatcher} matcher
   */
  register(matcher) {
    if (!(matcher instanceof BaseMatcher)) {
      throw new Error('Matcher must extend BaseMatcher');
    }
    this.matchers.set(matcher.type, matcher);
  }

  /**
   * 获取匹配器
   * @param {string} type - 规则类型
   * @returns {BaseMatcher|null}
   */
  get(type) {
    return this.matchers.get(type) || null;
  }

  /**
   * 检查匹配器是否存在
   * @param {string} type - 规则类型
   * @returns {boolean}
   */
  has(type) {
    return this.matchers.has(type);
  }

  /**
   * 获取所有已注册的类型
   * @returns {string[]}
   */
  getTypes() {
    return Array.from(this.matchers.keys());
  }
}

// 创建全局注册表实例
const globalRegistry = new MatcherRegistry();

// ============================================================================
// 导出
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    BaseMatcher,
    CssMatcher,
    AttributeMatcher,
    MatcherRegistry,
    globalRegistry
  };
}
