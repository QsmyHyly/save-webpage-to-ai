// index.js - 规则模块统一入口
// 提供规则引擎的完整功能导出

// 注意：在 Service Worker 环境中，需要按顺序导入
// 在 background.js 中使用 importScripts 按以下顺序加载：
// 1. rule-types.js
// 2. rule-matcher.js
// 3. rule-engine.js

// ============================================================================
// 类型定义 (从 rule-types.js)
// ============================================================================

// RULE_TYPES, STRING_OPERATORS, NUMERIC_OPERATORS, etc.

// ============================================================================
// 匹配器 (从 rule-matcher.js)
// ============================================================================

// BaseMatcher, CssMatcher, AttributeMatcher, MatcherRegistry, globalRegistry

// ============================================================================
// 引擎 (从 rule-engine.js)
// ============================================================================

// RuleEngine, createRuleEngine, quickFilterHtml

// ============================================================================
// 便捷导出
// ============================================================================

/**
 * 规则模块完整功能
 * 在模块化环境中使用
 */
const RuleModule = {
  // 类型
  RULE_TYPES: typeof RULE_TYPES !== 'undefined' ? RULE_TYPES : null,
  ALL_OPERATORS: typeof ALL_OPERATORS !== 'undefined' ? ALL_OPERATORS : null,
  MATCH_MODES: typeof MATCH_MODES !== 'undefined' ? MATCH_MODES : null,
  
  // 工厂函数
  createCssRule: typeof createCssRule !== 'undefined' ? createCssRule : null,
  createAttributeRule: typeof createAttributeRule !== 'undefined' ? createAttributeRule : null,
  createCondition: typeof createCondition !== 'undefined' ? createCondition : null,
  
  // 验证
  validateRule: typeof validateRule !== 'undefined' ? validateRule : null,
  isRuleEnabled: typeof isRuleEnabled !== 'undefined' ? isRuleEnabled : null,
  
  // 匹配器
  BaseMatcher: typeof BaseMatcher !== 'undefined' ? BaseMatcher : null,
  CssMatcher: typeof CssMatcher !== 'undefined' ? CssMatcher : null,
  AttributeMatcher: typeof AttributeMatcher !== 'undefined' ? AttributeMatcher : null,
  MatcherRegistry: typeof MatcherRegistry !== 'undefined' ? MatcherRegistry : null,
  globalRegistry: typeof globalRegistry !== 'undefined' ? globalRegistry : null,
  
  // 引擎
  RuleEngine: typeof RuleEngine !== 'undefined' ? RuleEngine : null,
  createRuleEngine: typeof createRuleEngine !== 'undefined' ? createRuleEngine : null,
  quickFilterHtml: typeof quickFilterHtml !== 'undefined' ? quickFilterHtml : null
};

// ============================================================================
// 导出
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = RuleModule;
}
