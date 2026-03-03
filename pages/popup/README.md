# popup.js – 扩展弹窗逻辑

## 简介

`popup.js` 是浏览器扩展弹窗（popup）的脚本，用于展示已保存的页面和外部资源，并提供保存当前页面、上传到 DeepSeek/千问、下载、删除等核心操作。

## 主要功能

- **状态检测**：检查当前标签页是否在 DeepSeek 或通义千问官网，更新上传按钮状态。
- **保存当前页面**：支持普通模式和调试模式两种方式获取页面 HTML
  - 普通模式：通过 `chrome.scripting.executeScript` 获取页面 HTML，经清理后保存
  - 调试模式：使用 Chrome Debugger Protocol 捕获包含 closed Shadow DOM 的完整页面
- **展示列表**：从 background 获取已保存的页面和资源列表，支持多选、下载、删除。
- **上传到 AI 平台**：将选中的页面/资源通过 content script 注入到 AI 对话输入框。
- **主题应用**：从存储读取主题颜色并应用到弹窗 UI。
- **通知控制**：根据用户设置决定是否显示各类通知（成功、错误、警告、确认对话框）。

## 数据流

- **获取数据**：通过 `chrome.runtime.sendMessage` 与 background 通信，使用 `GET_ALL_FILES` 获取所有文件，然后按类型过滤出页面（html）和资源。
- **保存页面**：`saveCurrentPage()` → 检查调试模式 → 注入脚本获取 HTML → `cleanHtmlContent()` 清理 → 创建 `FileEntity` → 发送 `SAVE_FILE` 消息。
- **保存资源**：创建 `FileEntity` 数组 → 发送 `SAVE_FILES` 消息批量保存。
- **删除**：发送 `DELETE_FILE`（单个）或 `DELETE_FILES`（批量）消息。
- **上传**：`uploadSelected()` → 检查 content script 就绪 → 发送 `UPLOAD_ITEMS` 消息。
- **资源管理**：点击「管理外部资源」按钮时，注入脚本收集当前页面资源，存入 `chrome.storage.local` 后打开 `resources.html`。

## 消息类型

| 消息类型 | 说明 |
|---------|------|
| `GET_ALL_FILES` | 获取所有文件，按类型过滤 |
| `SAVE_FILE` | 保存单个文件 |
| `SAVE_FILES` | 批量保存文件 |
| `DELETE_FILE` | 删除单个文件 |
| `DELETE_FILES` | 批量删除文件 |
| `UPLOAD_ITEMS` | 上传选中的项目 |

## 依赖

- `chrome.tabs`、`chrome.scripting`、`chrome.runtime`、`chrome.storage`
- `../../src/utils/logger.js`、`constants.js`、`common-utils.js`、`html-cleaner.js`
- `popup.css`（样式文件）

## 关键函数

| 函数 | 作用 |
|------|------|
| `checkPlatformStatus()` | 根据当前 URL 判断平台并更新 UI |
| `saveCurrentPage()` | 获取并清理当前页面 HTML 后保存（支持调试模式） |
| `loadPages()` / `loadResources()` | 从 background 加载已保存数据 |
| `renderPages()` / `renderResources()` | 渲染页面列表和资源列表（显示标题、URL、保存时间、文件大小） |
| `downloadSelected()` | 批量下载选中的页面（包装元数据） |
| `uploadSelected()` | 将选中项目上传到当前 AI 平台 |
| `openResourcesManager()` | 注入脚本收集资源并打开资源管理页 |
| `applyTheme()` | 从存储读取主题并应用 CSS 变量 |

## 注意事项

- **内容脚本就绪检查**：上传前需确认 content script 已注入（通过 `PING` 消息），否则可能失败。
- **清理统计**：保存页面后会显示清理节省的百分比（若启用清理规则）。
- **跨域资源**：资源下载功能需注意 CORS 限制，目前仅下载同源或允许跨域的资源。
- **主题同步**：弹窗的 CSS 变量与 options 页面共享同一套存储，修改后需重新打开弹窗生效。
- **调试模式**：启用调试模式后，保存页面时会使用 Chrome Debugger Protocol，可捕获 closed Shadow DOM 内容，但需要用户手动确认权限。
- **通知控制**：用户可在选项页面中关闭各类通知，关闭后对应弹窗将不再显示。
