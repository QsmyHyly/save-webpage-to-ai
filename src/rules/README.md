# 规则引擎模块 (Rule Engine)

## 概述

规则引擎模块提供了一套统一的规则处理系统，用于元素屏蔽逻辑的抽象化管理。该模块将规则的类型定义、匹配逻辑和执行分离，便于扩展和维护。

## 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                    RuleEngine (规则引擎)                      │
│  - loadRules(rules)    加载规则                               │
│  - filter(doc)         过滤文档                               │
│  - execute(doc)        执行并移除元素                          │
├─────────────────────────────────────────────────────────────┤
│                MatcherRegistry (匹配器注册表)                  │
│  - register(matcher)   注册匹配器                             │
│  - get(type)           获取匹配器                             │
├─────────────────────────────────────────────────────────────┤
│  CssMatcher         │  AttributeMatcher                      │
│  (CSS 选择器匹配)    │  (属性条件匹配)                          │
├─────────────────────────────────────────────────────────────┤
│                    rule-types.js                             │
│  RULE_TYPES         │  ALL_OPERATORS    │  MATCH_MODES       │
└─────────────────────────────────────────────────────────────┘
```

## 核心组件

### 1. rule-types.js - 规则类型定义

定义规则类型、操作符和工具函数。

#### 规则类型
```javascript
const RULE_TYPES = {
  CSS: 'css',           // CSS 选择器匹配
  ATTRIBUTE: 'attribute', // 属性值条件匹配
  XPATH: 'xpath',       // XPath 匹配 (保留扩展)
  CUSTOM: 'custom'      // 自定义匹配函数 (保留扩展)
};
```

#### 操作符
```javascript
// 字符串操作符
const STRING_OPERATORS = {
  CONTAINS: 'contains',       // 包含
  STARTS_WITH: 'startsWith',  // 前缀匹配
  ENDS_WITH: 'endsWith',      // 后缀匹配
  REGEX: 'regex',             // 正则匹配
  EQUALS: 'equals'            // 完全相等
};

// 数值操作符
const NUMERIC_OPERATORS = {
  GT: '>',    // 大于
  LT: '<',    // 小于
  GTE: '>=',  // 大于等于
  LTE: '<=',  // 小于等于
  EQ: '=='    // 等于
};

// 长度操作符
const LENGTH_OPERATORS = {
  LENGTH_GT: 'length>',
  LENGTH_LT: 'length<',
  LENGTH_EQ: 'length=='
};

// 存在性操作符
const EXISTENCE_OPERATORS = {
  EXISTS: 'exists',     // 属性存在
  NOT_EXISTS: 'notExists' // 属性不存在
};
```

### 2. rule-matcher.js - 匹配器实现

#### BaseMatcher (基类)
```javascript
class BaseMatcher {
  constructor(type) { ... }
  matches(element, rule) { ... }  // 检查元素是否匹配
  queryAll(doc, rule) { ... }     // 获取所有匹配元素
}
```

#### CssMatcher (CSS 选择器匹配器)
```javascript
const matcher = new CssMatcher();
matcher.matches(element, { selector: '.ad-banner' });  // 使用 element.matches()
matcher.queryAll(doc, { selector: '.ad-banner' });     // 使用 querySelectorAll()
```

#### AttributeMatcher (属性匹配器)
```javascript
const matcher = new AttributeMatcher();
// 检查属性条件
matcher.matchCondition('https://example.com/ad.js', { op: 'contains', value: '/ad.' });
// => true

// 匹配元素
matcher.matches(element, {
  conditions: [
    { attr: 'src', op: 'contains', value: 'tracking' }
  ],
  match: 'all'
});
```

### 3. rule-engine.js - 规则引擎

```javascript
const engine = new RuleEngine();

// 加载规则
engine.loadRules([
  { id: 'r1', type: 'css', selector: '.ad', enabled: true },
  { id: 'r2', type: 'attribute', conditions: [...], enabled: true }
]);

// 过滤文档（返回匹配的元素）
const { elements, stats } = engine.filter(doc);

// 执行过滤并移除元素
const { removedCount } = engine.execute(doc);

// 快速过滤 HTML 字符串
const result = engine.filterHtml('<html>...</html>');
```

## 规则格式

### CSS 规则
```javascript
{
  id: 'css-xxx',
  type: 'css',
  selector: '.ad-banner, #popup, [data-ad]',
  enabled: true,
  description: '屏蔽广告元素'
}
```

### 属性规则
```javascript
{
  id: 'attr-xxx',
  type: 'attribute',
  tag: 'img',           // 可选，限制标签类型
  conditions: [
    { attr: 'src', op: 'contains', value: 'tracking' },
    { attr: 'width', op: '>', value: '1000' }
  ],
  match: 'all',         // 'all' 所有条件满足 | 'any' 任一条件满足
  enabled: true,
  description: '屏蔽追踪图片'
}
```

## 使用示例

### 基本使用
```javascript
// 创建规则引擎
const engine = new RuleEngine();

// 加载规则
engine.loadRules([
  createCssRule('.ad-banner', '广告横幅'),
  createAttributeRule([
    createCondition('src', 'contains', 'utm_')
  ], 'any', 'img', '追踪参数图片')
]);

// 执行清理
const parser = new DOMParser();
const doc = parser.parseFromString(html, 'text/html');
const { removedCount } = engine.execute(doc);
```

### 在 html-cleaner.js 中使用
```javascript
class RuleBasedCleaner extends BaseCleaner {
  clean(html, baseUrl, config) {
    const rules = config.elementBlocking?.rules || [];
    const engine = new RuleEngine();
    engine.loadRules(rules.filter(isRuleEnabled));
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const { removedCount } = engine.execute(doc);
    
    return { output: doc.documentElement.outerHTML, stat: { removedElements: removedCount } };
  }
}
```

## 扩展指南

### 添加新的规则类型

1. 在 `rule-types.js` 中添加类型常量：
```javascript
const RULE_TYPES = {
  // ...
  XPATH: 'xpath'
};
```

2. 在 `rule-matcher.js` 中实现匹配器：
```javascript
class XPathMatcher extends BaseMatcher {
  constructor() {
    super('xpath');
  }
  
  matches(element, rule) {
    // 实现匹配逻辑
  }
  
  queryAll(doc, rule) {
    // 实现查询逻辑
  }
}

// 注册到全局注册表
globalRegistry.register(new XPathMatcher());
```

### 添加新的操作符

1. 在 `rule-types.js` 中添加操作符常量
2. 在 `AttributeMatcher.matchCondition` 中实现匹配逻辑

## 文件列表

- `rule-types.js` - 规则类型、操作符、工具函数
- `rule-matcher.js` - 匹配器实现（CssMatcher, AttributeMatcher）
- `rule-engine.js` - 规则引擎核心类
- `index.js` - 统一导出入口

## 依赖关系

```
index.js
  ├── rule-types.js (无依赖)
  ├── rule-matcher.js (无依赖)
  └── rule-engine.js (依赖 rule-types.js, rule-matcher.js)
```

## 与 html-cleaner.js 的集成

规则引擎模块已被 `html-cleaner.js` 内部使用：

```javascript
// html-cleaner.js 内部定义了简化的规则匹配逻辑
// 避免了外部依赖，同时保持一致的规则格式

class RuleBasedCleaner extends BaseCleaner {
  // 统一处理 CSS 和属性规则
  queryElementsByRule(doc, rule) {
    if (rule.type === 'css') {
      return doc.querySelectorAll(rule.selector);
    } else if (rule.type === 'attribute') {
      // 属性条件匹配
    }
  }
}
```

## 设计优势

| 方面 | 设计选择 | 优势 |
|------|---------|------|
| **规则抽象** | 统一的规则格式 | 不同类型的规则可用统一方式管理 |
| **匹配器分离** | 独立的 Matcher 类 | 易于扩展新规则类型 |
| **操作符枚举** | 明确的操作符常量 | 避免字符串硬编码，便于维护 |
| **条件组合** | match: 'all' \| 'any' | 灵活的条件组合方式 |
| **统计信息** | 返回匹配统计 | 便于调试和监控 |

## 向后兼容

`html-cleaner.js` 保留了以下向后兼容别名：

```javascript
const ElementBlockerCleaner = RuleBasedCleaner;
const AttributeBasedBlocker = RuleBasedCleaner;
```

这确保了使用旧类名的代码仍能正常工作。
