// rule-types.js - 规则类型和操作符常量定义
// 统一管理规则相关的类型、操作符和默认值

// ============================================================================
// 规则类型
// ============================================================================

/**
 * 规则类型枚举
 */
const RULE_TYPES = {
  CSS: 'css',           // CSS 选择器匹配
  ATTRIBUTE: 'attribute', // 属性值条件匹配
  XPATH: 'xpath',       // XPath 匹配 (保留扩展)
  CUSTOM: 'custom'      // 自定义匹配函数 (保留扩展)
};

// ============================================================================
// 条件操作符
// ============================================================================

/**
 * 字符串操作符
 */
const STRING_OPERATORS = {
  CONTAINS: 'contains',       // 包含
  STARTS_WITH: 'startsWith',  // 前缀匹配
  ENDS_WITH: 'endsWith',      // 后缀匹配
  REGEX: 'regex',             // 正则匹配
  EQUALS: 'equals'            // 完全相等
};

/**
 * 数值操作符
 */
const NUMERIC_OPERATORS = {
  GT: '>',    // 大于
  LT: '<',    // 小于
  GTE: '>=',  // 大于等于
  LTE: '<=',  // 小于等于
  EQ: '=='    // 等于
};

/**
 * 长度操作符
 */
const LENGTH_OPERATORS = {
  LENGTH_GT: 'length>',
  LENGTH_LT: 'length<',
  LENGTH_EQ: 'length=='
};

/**
 * 存在性操作符
 */
const EXISTENCE_OPERATORS = {
  EXISTS: 'exists',     // 属性存在
  NOT_EXISTS: 'notExists' // 属性不存在
};

/**
 * 所有操作符集合
 */
const ALL_OPERATORS = {
  ...STRING_OPERATORS,
  ...NUMERIC_OPERATORS,
  ...LENGTH_OPERATORS,
  ...EXISTENCE_OPERATORS
};

// ============================================================================
// 条件组合方式
// ============================================================================

/**
 * 条件组合方式
 */
const MATCH_MODES = {
  ALL: 'all',  // 所有条件都满足
  ANY: 'any'   // 任一条件满足
};

// ============================================================================
// 默认规则模板
// ============================================================================

/**
 * 创建 CSS 规则
 * @param {string} selector - CSS 选择器
 * @param {string} description - 描述
 * @returns {Object}
 */
function createCssRule(selector, description = '') {
  return {
    id: `css-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    type: RULE_TYPES.CSS,
    selector,
    enabled: true,
    description
  };
}

/**
 * 创建属性规则
 * @param {Array} conditions - 条件数组
 * @param {string} match - 匹配模式 'all' | 'any'
 * @param {string} tag - 限制标签（可选）
 * @param {string} description - 描述
 * @returns {Object}
 */
function createAttributeRule(conditions, match = MATCH_MODES.ALL, tag = null, description = '') {
  return {
    id: `attr-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    type: RULE_TYPES.ATTRIBUTE,
    conditions,
    match,
    tag,
    enabled: true,
    description
  };
}

/**
 * 创建条件
 * @param {string} attr - 属性名
 * @param {string} op - 操作符
 * @param {string|number} value - 比较值
 * @returns {Object}
 */
function createCondition(attr, op, value) {
  return { attr, op, value };
}

// ============================================================================
// 规则验证
// ============================================================================

/**
 * 验证规则结构
 * @param {Object} rule - 规则对象
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateRule(rule) {
  const errors = [];
  
  if (!rule) {
    return { valid: false, errors: ['规则对象不能为空'] };
  }
  
  if (!rule.id) {
    errors.push('规则必须包含 id');
  }
  
  if (!Object.values(RULE_TYPES).includes(rule.type)) {
    errors.push(`无效的规则类型: ${rule.type}`);
  }
  
  // CSS 规则必须有 selector
  if (rule.type === RULE_TYPES.CSS && !rule.selector) {
    errors.push('CSS 规则必须包含 selector');
  }
  
  // 属性规则必须有 conditions
  if (rule.type === RULE_TYPES.ATTRIBUTE) {
    if (!Array.isArray(rule.conditions) || rule.conditions.length === 0) {
      errors.push('属性规则必须包含至少一个条件');
    } else {
      rule.conditions.forEach((cond, idx) => {
        if (!cond.attr) {
          errors.push(`条件 ${idx + 1} 缺少属性名`);
        }
        if (!Object.values(ALL_OPERATORS).includes(cond.op)) {
          errors.push(`条件 ${idx + 1} 使用了无效的操作符: ${cond.op}`);
        }
      });
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 检查规则是否启用且有效
 * @param {Object} rule - 规则对象
 * @returns {boolean}
 */
function isRuleEnabled(rule) {
  return rule && rule.enabled !== false;
}

// ============================================================================
// 导出
// ============================================================================

// 兼容 Service Worker 的导出方式
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    RULE_TYPES,
    STRING_OPERATORS,
    NUMERIC_OPERATORS,
    LENGTH_OPERATORS,
    EXISTENCE_OPERATORS,
    ALL_OPERATORS,
    MATCH_MODES,
    createCssRule,
    createAttributeRule,
    createCondition,
    validateRule,
    isRuleEnabled
  };
}
