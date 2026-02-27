# options.js – 扩展设置页面逻辑

## 简介
`options.js` 是浏览器扩展设置页面的脚本，负责管理元素屏蔽规则、配置组、HTML 内容清理规则以及主题配色。所有配置通过 `chrome.storage.sync` 同步到用户账号，跨设备可用。

## 主要功能
- **配置组管理**：创建、复制、重命名、删除配置组，切换当前使用的配置。
- **规则管理**：添加/删除 CSS 选择器屏蔽规则，启用/禁用规则（默认配置不可修改）。
- **HTML 清理配置**：配置追踪链接清理、内联样式清理、脚本清理及通用设置。
- **主题配置**：通过颜色选择器自定义界面主色调、危险色、成功色、渐变色等，并实时预览。

## 核心数据结构

### 规则结构（v2.0 统一格式）
```javascript
// 每个规则对象
{
  id: 'rule-xxxx',          // 唯一标识
  type: 'css',              // 规则类型（目前仅支持 'css'）
  selector: '#element-id',  // CSS 选择器
  enabled: true,            // 是否启用
  description: '描述'       // 可选描述
}
```

### 配置组结构
```javascript
{
  name: '配置名称',
  rules: [...],             // 元素屏蔽规则数组
  cleanerConfig: {          // HTML 清理配置
    trackingLinks: {...},
    inlineStyles: {...},
    scripts: {...},
    general: {...}
  },
  isDefault: false
}
```

### 配置合并机制
在 `html-cleaner.js` 的 `loadCleanerConfig()` 中，会将 `rules` 合并到 `elementBlocking`：
```javascript
{
  elementBlocking: {
    enabled: true,
    rules: profile.rules  // 从 profile 同步
  },
  trackingLinks: {...},
  inlineStyles: {...},
  scripts: {...},
  general: {...}
}
```

## 依赖
- `chrome.storage.sync` / `chrome.storage.local`
- `../../src/utils/logger.js`、`constants.js`、`common-utils.js`
- `options.css`（样式文件）

## 关键函数
| 函数 | 作用 |
|------|------|
| `loadProfiles()` | 从存储加载所有配置组，自动迁移旧格式 |
| `saveProfiles(profiles)` | 保存配置组 |
| `renderProfileList()` | 渲染配置组列表 UI |
| `addRule()` | 添加新规则（仅非默认配置） |
| `saveCurrentProfileRules()` | 保存当前配置组的规则及清理配置 |
| `loadCleanerConfig()` | 加载当前配置组的清理规则并渲染 |
| `initTheme()` | 初始化主题，绑定颜色选择器事件 |
| `migrateRules(profile)` | 将旧格式规则迁移为新格式 |

## 数据迁移
从 v2.0 开始，规则结构从 `idRules` + `classRules` 合并为统一的 `rules` 数组。`loadProfiles()` 会自动检测并迁移旧数据，迁移后自动保存。

## 管道式清理器架构
参见 `html-cleaner.js` 文档。元素屏蔽规则通过 `ElementBlockerCleaner` 清理器在保存页面时执行。

## 注意事项
- **默认配置不可修改**：`default` 配置组为只读，修改前需创建新配置组。
- **配置存储结构变更**：若修改 `cleanerConfig` 或 `profiles` 结构，需确保向后兼容，必要时添加迁移逻辑。
- **清理配置的收集**：`collectCleanerConfigFromUI()` 会从 DOM 中读取所有输入值，并合并已有的列表项。
- **主题同步**：主题颜色修改后立即通过 CSS 变量生效，并保存到 `chrome.storage.sync`。
