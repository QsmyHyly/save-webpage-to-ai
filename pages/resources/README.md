# resources.js – 外部资源管理页面逻辑

## 简介

`resources.js` 是独立页面 `resources.html` 的脚本，用于展示当前页面或所有已保存的外部资源（CSS、JS、图片、字体等），并允许用户选择保存这些资源到扩展存储中。

## 主要功能

- **展示资源**：从 `chrome.storage.local` 获取由 popup 注入脚本收集的当前页面资源，或从 background 获取所有已保存的资源。
- **分组显示**：若显示所有已保存资源，按来源页面分组。
- **保存选中资源**：下载选中的资源内容（支持 Base64 编码图片），并发送 `SAVE_FILES` 消息保存到 IndexedDB。
- **进度提示**：下载过程中显示进度条。
- **主题应用**：从存储读取主题颜色并应用到页面 UI。

## 数据流

- **加载资源**：
  1. 优先读取 `chrome.storage.local` 中的 `currentResources`（由 popup 设置的临时资源）。
  2. 若无临时资源，则向 background 请求 `GET_ALL_FILES`，过滤出非 HTML 类型的文件作为资源。
- **保存资源**：
  1. 选中资源 → 调用 `fetchResource()` 下载（图片转为 Base64，文本保持原样）。
  2. 构造 `FileEntity` 对象（包含 id、name、content、type、source、createdAt、metadata）→ 发送 `SAVE_FILES` 消息批量保存。
  3. 保存成功后重新加载列表。
- **删除资源**：发送 `DELETE_FILE` 消息删除单个资源。

## 消息类型

| 消息类型 | 说明 |
|---------|------|
| `GET_ALL_FILES` | 获取所有文件，过滤非 HTML 类型作为资源 |
| `SAVE_FILES` | 批量保存资源（传入 FileEntity 数组） |
| `DELETE_FILE` | 删除单个资源 |

## FileEntity 格式

```javascript
{
  id: 'res-xxx',           // 资源ID
  name: 'style.css',       // 文件名
  content: '...',          // 内容（文本或 base64）
  type: 'css',             // 类型：css/js/image/font/other
  source: { url: '...' },  // 来源信息
  createdAt: timestamp,    // 创建时间
  metadata: { ... }        // 元数据（sourcePageUrl, sourcePageTitle等）
}
```

## 依赖

- `chrome.runtime`、`chrome.storage`
- `../../src/utils/logger.js`、`constants.js`、`common-utils.js`
- `resources.css`（样式文件）

## 关键函数

| 函数 | 作用 |
|------|------|
| `loadCurrentResources()` | 从存储或 background 加载资源数据 |
| `renderResources()` | 渲染资源列表（附带页面信息） |
| `renderAllResources()` | 按来源页面分组渲染所有已保存资源 |
| `saveSelectedResources()` | 下载并保存选中的资源 |
| `fetchResource(url)` | 根据 URL 获取资源内容，图片返回 Base64 |
| `updateSaveButtonState()` | 根据选中项数量启用/禁用保存按钮 |

## 注意事项

- **跨域问题**：`fetch` 请求可能受 CORS 限制，建议仅在同源或允许跨域的站点使用。
- **图片保存**：图片以 Base64 形式存储，可能大幅增加存储占用，需合理限制。
- **临时资源数据**：`currentResources` 是临时数据，关闭页面后丢失，但保存后的资源会持久化。
- **性能**：大量资源同时下载可能阻塞 UI，建议分批处理（当前未实现分页）。
- **主题同步**：页面的 CSS 变量与 popup 和 options 页面共享同一套存储，修改后需重新打开页面生效。
