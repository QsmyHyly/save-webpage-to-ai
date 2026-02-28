// rule-engine.js - 规则引擎核心
// 统一管理规则的执行和过滤

// ============================================================================
// 日志辅助（兼容独立运行和集成环境）
// ============================================================================

const _engineLog = {
  _getLogger: function() {
    if (typeof logger !== 'undefined') return logger;
    return {
      warn: function() { console.warn.apply(console, arguments); }
    };
  },
  warn: function() { this._getLogger().warn.apply(this._getLogger(), arguments); }
};

// ============================================================================
// 规则引擎
// ============================================================================

/**
 * 规则引擎
 * 负责执行规则并过滤文档中的元素
 */
class RuleEngine {
  /**
   * @param {MatcherRegistry} registry - 匹配器注册表（可选，默认使用全局注册表）
   */
  constructor(registry = null) {
    this.registry = registry || (typeof globalRegistry !== 'undefined' ? globalRegistry : null);
    this.rules = [];
    this.stats = {
      totalRules: 0,
      enabledRules: 0,
      matchedElements: 0
    };
  }

  /**
   * 设置匹配器注册表
   * @param {MatcherRegistry} registry
   */
  setRegistry(registry) {
    this.registry = registry;
  }

  /**
   * 加载规则
   * @param {Object[]} rules - 规则数组
   * @param {boolean} validate - 是否验证规则（默认 true）
   */
  loadRules(rules, validate = true) {
    this.rules = [];
    this.stats.totalRules = rules.length;
    this.stats.enabledRules = 0;

    for (const rule of rules) {
      // 验证规则
      if (validate && typeof validateRule === 'function') {
        const { valid, errors } = validateRule(rule);
        if (!valid) {
          _engineLog.warn(`[RuleEngine] 规则验证失败: ${rule.id}`, errors);
          continue;
        }
      }

      // 检查是否有对应的匹配器
      if (this.registry && !this.registry.has(rule.type)) {
        _engineLog.warn(`[RuleEngine] 未找到匹配器: ${rule.type}`);
        continue;
      }

      this.rules.push(rule);
      if (typeof isRuleEnabled === 'function' && isRuleEnabled(rule)) {
        this.stats.enabledRules++;
      } else if (rule.enabled !== false) {
        this.stats.enabledRules++;
      }
    }
  }

  /**
   * 获取启用的规则
   * @returns {Object[]}
   */
  getEnabledRules() {
    return this.rules.filter(rule => {
      if (typeof isRuleEnabled === 'function') {
        return isRuleEnabled(rule);
      }
      return rule.enabled !== false;
    });
  }

  /**
   * 检查单个元素是否匹配任意规则
   * @param {Element} element - DOM 元素
   * @param {Object[]} rules - 规则数组（可选，默认使用已加载的规则）
   * @returns {{ matched: boolean, rule: Object|null }}
   */
  matchElement(element, rules = null) {
    const targetRules = rules || this.getEnabledRules();

    for (const rule of targetRules) {
      const matcher = this.registry?.get(rule.type);
      if (matcher && matcher.matches(element, rule)) {
        return { matched: true, rule };
      }
    }

    return { matched: false, rule: null };
  }

  /**
   * 过滤文档，返回所有应移除的元素
   * @param {Document} doc - DOM 文档
   * @param {Object[]} rules - 规则数组（可选，默认使用已加载的规则）
   * @returns {{ elements: Element[], stats: Object }}
   */
  filter(doc, rules = null) {
    const targetRules = rules || this.getEnabledRules();
    const matchedElements = new Set();
    const ruleStats = {};

    // 按规则类型分组执行
    for (const rule of targetRules) {
      const matcher = this.registry?.get(rule.type);
      if (!matcher) continue;

      try {
        const elements = matcher.queryAll(doc, rule);
        elements.forEach(el => {
          if (!matchedElements.has(el)) {
            matchedElements.add(el);
            ruleStats[rule.id] = (ruleStats[rule.id] || 0) + 1;
          }
        });
      } catch (e) {
        _engineLog.warn(`[RuleEngine] 规则执行失败: ${rule.id}`, e.message);
      }
    }

    this.stats.matchedElements = matchedElements.size;

    return {
      elements: Array.from(matchedElements),
      stats: {
        totalRules: targetRules.length,
        matchedElements: matchedElements.size,
        ruleStats
      }
    };
  }

  /**
   * 执行过滤并移除元素
   * @param {Document} doc - DOM 文档
   * @param {Object[]} rules - 规则数组（可选）
   * @returns {{ removedCount: number, stats: Object }}
   */
  execute(doc, rules = null) {
    const { elements, stats } = this.filter(doc, rules);
    
    let removedCount = 0;
    elements.forEach(el => {
      try {
        // 检查元素是否仍在文档中
        if (el.parentNode) {
          el.remove();
          removedCount++;
        }
      } catch (e) {
        // 元素可能已被其他规则移除
      }
    });

    return {
      removedCount,
      stats: {
        ...stats,
        removedCount
      }
    };
  }

  /**
   * 批量过滤 HTML 字符串
   * @param {string} html - HTML 字符串
   * @param {Object[]} rules - 规则数组（可选）
   * @returns {{ html: string, stats: Object }}
   */
  filterHtml(html, rules = null) {
    if (!html || typeof html !== 'string') {
      return { html, stats: null };
    }

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      const { removedCount, stats } = this.execute(doc, rules);
      
      return {
        html: doc.documentElement.outerHTML,
        stats: {
          ...stats,
          originalSize: html.length,
          cleanedSize: doc.documentElement.outerHTML.length
        }
      };
    } catch (e) {
      _engineLog.warn('[RuleEngine] HTML 解析失败:', e);
      return { html, stats: { error: e.message } };
    }
  }

  /**
   * 获取统计信息
   * @returns {Object}
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * 重置统计
   */
  resetStats() {
    this.stats = {
      totalRules: 0,
      enabledRules: 0,
      matchedElements: 0
    };
  }
}

// ============================================================================
// 便捷函数
// ============================================================================

/**
 * 创建规则引擎实例并加载规则
 * @param {Object[]} rules - 规则数组
 * @param {MatcherRegistry} registry - 匹配器注册表（可选）
 * @returns {RuleEngine}
 */
function createRuleEngine(rules, registry = null) {
  const engine = new RuleEngine(registry);
  engine.loadRules(rules);
  return engine;
}

/**
 * 快速过滤 HTML
 * @param {string} html - HTML 字符串
 * @param {Object[]} rules - 规则数组
 * @param {MatcherRegistry} registry - 匹配器注册表（可选）
 * @returns {string} - 过滤后的 HTML
 */
function quickFilterHtml(html, rules, registry = null) {
  const engine = createRuleEngine(rules, registry);
  const result = engine.filterHtml(html);
  return result.html;
}

// ============================================================================
// 导出
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    RuleEngine,
    createRuleEngine,
    quickFilterHtml
  };
}
