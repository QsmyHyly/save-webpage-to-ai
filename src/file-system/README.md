# 文件封装系统 (File System)

## 概述

文件封装系统提供了一套统一的抽象层，将扩展中需要管理的各种内容（网页、资源、抓取的内容等）都抽象为 **"文件"**，使得这些内容可以用统一的方式处理：保存、读取、下载、上传、生成元数据等。

## 架构设计

```
┌─────────────────────────────────────────────────────────┐
│                   FileManager (统一接口)                  │
├─────────────────────────────────────────────────────────┤
│  FileEntity (文件实体)  │  FileStorage (存储管理器)      │
├─────────────────────────────────────────────────────────┤
│              FileTypes (文件类型系统)                     │
└─────────────────────────────────────────────────────────┘
```

## 核心组件

### 1. FileEntity (文件实体类)

`FileEntity` 代表扩展中管理的任何可保存、可上传、可下载的内容。

#### 属性
- `id`: 唯一标识，格式：`file-{timestamp}-{random}`
- `name`: 文件名（包含扩展名）
- `content`: 文件内容（文本或 base64）
- `type`: 文件类型：`html` | `css` | `js` | `image` | `font` | `other`
- `size`: 文件大小（字节）
- `source`: 来源信息 `{ url, title, tabId, ... }`
- `createdAt`: 创建时间戳
- `metadata`: 额外的元数据

#### 核心方法
- `toBlob(options)`: 转换为 Blob（支持添加元数据注释）
- `toFile(options)`: 转换为 File 对象（用于上传）
- `download()`: 触发浏览器下载
- `toJSON()`: 转换为纯对象（用于存储）
- `getMimeType()`: 获取 MIME 类型

#### 静态工厂方法
- `FileEntity.fromHTML(html, url, title)`: 从 HTML 创建
- `FileEntity.fromResource(resource)`: 从资源对象创建
- `FileEntity.fromGrab(content, type, source, selector)`: 从抓取内容创建
- `FileEntity.fromJSON(obj)`: 从存储对象还原

#### 使用示例
```javascript
// 创建 HTML 文件
const htmlFile = FileEntity.fromHTML(htmlContent, url, title);

// 创建资源文件
const cssFile = FileEntity.fromResource({
  url: 'https://example.com/style.css',
  content: cssContent,
  fileName: 'style.css'
});

// 创建抓取的文件
const grabbedFile = FileEntity.fromGrab(
  elementContent,
  'html',
  { url: sourceUrl },
  '.my-selector'
);

// 下载文件
await htmlFile.download({ filename: 'page.html' });

// 转换为 File 对象用于上传
const fileObj = htmlFile.toFile({ addMetadata: true });
```

### 2. FileStorage (文件存储管理器)

`FileStorage` 负责 IndexedDB 的读写操作。

#### 核心方法
- `async init()`: 初始化数据库
- `async save(fileEntity)`: 保存单个文件
- `async saveMany(fileEntities)`: 批量保存
- `async get(id)`: 获取单个文件
- `async getMany(ids)`: 批量获取
- `async getAll()`: 获取所有文件
- `async getByType(type)`: 按类型获取
- `async getBySourceUrl(url)`: 按来源 URL 获取
- `async delete(id)`: 删除单个文件
- `async deleteMany(ids)`: 批量删除
- `async clear()`: 清空所有文件
- `async count()`: 获取文件总数

#### 使用示例
```javascript
const storage = new FileStorage({
  dbName: 'MyFileDB',
  version: 1
});

await storage.init();

// 保存文件
const fileId = await storage.save(htmlFile);

// 获取文件
const file = await storage.get(fileId);

// 按类型获取
const cssFiles = await storage.getByType('css');

// 批量保存
await storage.saveMany([file1, file2, file3]);
```

### 3. FileManager (统一文件管理器)

`FileManager` 整合了 `FileEntity` 和 `FileStorage`，并提供更高级的功能。

#### 核心方法
- `async init()`: 初始化
- `async saveFile(fileEntity)`: 保存文件
- `async saveFiles(fileEntities)`: 批量保存
- `async getFile(id)`: 获取文件
- `async getAllFiles()`: 获取所有文件
- `async getFilesByType(type)`: 按类型获取
- `async deleteFile(id)`: 删除文件
- `async downloadFile(fileEntity, options)`: 下载文件
- `async uploadFile(fileEntity, uploader, options)`: 上传文件

#### 使用示例
```javascript
const fileManager = new FileManager({
  dbName: 'FileManagerDB',
  version: 1,
  useLegacyMode: true
});

await fileManager.init();

// 保存文件
const fileId = await fileManager.saveFile(htmlFile);

// 获取并下载
const file = await fileManager.getFile(fileId);
await fileManager.downloadFile(file);
```

### 4. FileTypes (文件类型系统)

提供文件类型、MIME 类型、扩展名等映射和推断功能。

#### 主要工具函数
- `inferTypeFromUrl(url)`: 从 URL 推断文件类型
- `inferTypeFromContent(content)`: 从内容推断文件类型
- `getMimeType(type, filename)`: 获取 MIME 类型
- `sanitizeFilename(filename)`: 清理文件名
- `generateFilename(source, type, selector)`: 生成文件名
- `generateId(prefix)`: 生成唯一 ID

## 文件类型系统

### 支持的文件类型
```javascript
const FileTypes = {
  HTML: 'html',    // HTML 页面
  CSS: 'css',      // 样式文件
  JS: 'js',        // 脚本文件
  IMAGE: 'image',  // 图片文件
  FONT: 'font',    // 字体文件
  OTHER: 'other'   // 其他
};
```

### MIME 类型映射
```javascript
const MimeMap = {
  html: 'text/html',
  css: 'text/css',
  js: 'application/javascript',
  image: 'image/png',
  font: 'font/woff2',
  other: 'application/octet-stream'
};
```

## 元数据系统

文件在下载或上传时可以添加元数据注释，保留来源信息。

### 元数据注释格式
```javascript
// HTML
<!--
  FileMetadata: {
    "id": "file-1234567890-abc",
    "name": "page.html",
    "type": "html",
    "source": { "url": "...", "title": "..." },
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
-->

// CSS
/*
  FileMetadata: { ... }
*/

// JS
// FileMetadata: { ... }
```

## 消息系统

在 Service Worker 中，可以通过消息类型使用文件管理器：

### 消息类型（已合并到 MESSAGE_TYPES）
```javascript
// 所有消息类型定义在 src/utils/constants.js 的 MESSAGE_TYPES 中
// 文件相关消息类型包括：
const FILE_MESSAGE_TYPES = {
  SAVE_FILE: 'SAVE_FILE',
  SAVE_FILES: 'SAVE_FILES',
  GET_FILE: 'GET_FILE',
  GET_ALL_FILES: 'GET_ALL_FILES',
  GET_FILES_BY_TYPE: 'GET_FILES_BY_TYPE',
  DELETE_FILE: 'DELETE_FILE',
  CLEAR_ALL_FILES: 'CLEAR_ALL_FILES',
  CREATE_FILE_FROM_HTML: 'CREATE_FILE_FROM_HTML',
  CREATE_FILE_FROM_RESOURCE: 'CREATE_FILE_FROM_RESOURCE'
};

// 注意：FILE_MESSAGE_TYPES 已废弃，请使用 MESSAGE_TYPES
// 例如：MESSAGE_TYPES.SAVE_FILE, MESSAGE_TYPES.GET_FILE 等
```

### 使用示例
```javascript
// 保存文件
chrome.runtime.sendMessage({
  type: 'SAVE_FILE',
  fileEntity: fileEntity.toJSON()
}, function(response) {
  console.log('保存的文件 ID:', response.id);
});

// 获取所有文件
chrome.runtime.sendMessage({
  type: 'GET_ALL_FILES'
}, function(files) {
  console.log('所有文件:', files);
});
```

## 完整使用流程

### 1. 保存网页
```javascript
// 在 content script 或 popup 中
const html = document.documentElement.outerHTML;
const fileEntity = FileEntity.fromHTML(html, window.location.href, document.title);

// 发送到 background 保存
chrome.runtime.sendMessage({
  type: 'SAVE_FILE',
  fileEntity: fileEntity.toJSON()
}, function(response) {
  if (response.status === 'ok') {
    console.log('保存成功，文件 ID:', response.id);
  }
});
```

### 2. 批量保存资源
```javascript
const resources = [
  { url: 'style.css', content: '...', fileName: 'style.css' },
  { url: 'script.js', content: '...', fileName: 'script.js' }
];

const entities = resources.map(r => FileEntity.fromResource(r));

chrome.runtime.sendMessage({
  type: 'SAVE_FILES',
  fileEntities: entities.map(e => e.toJSON())
}, function(response) {
  console.log('批量保存完成，IDs:', response.ids);
});
```

### 3. 获取并下载文件
```javascript
chrome.runtime.sendMessage({
  type: 'GET_FILE',
  id: fileId
}, function(fileJson) {
  if (fileJson) {
    const file = FileEntity.fromJSON(fileJson);
    file.download(); // 触发下载
  }
});
```

### 4. 按类型筛选文件
```javascript
chrome.runtime.sendMessage({
  type: 'GET_FILES_BY_TYPE',
  type: 'css'
}, function(files) {
  console.log('CSS 文件列表:', files);
});
```

## 设计优势

| 方面 | 设计选择 | 优势 |
|------|---------|------|
| **统一抽象** | FileEntity 类 | 统一处理所有类型文件，减少重复代码 |
| **存储分离** | FileStorage 类 | 存储逻辑独立，易于测试和维护 |
| **工厂方法** | fromHTML, fromResource 等 | 封装创建逻辑，使用清晰 |
| **元数据系统** | 文件头部注释 | 保留来源信息，便于溯源 |
| **类型推断** | 根据 URL/内容推断类型 | 减少手动指定，提高准确性 |
| **批量操作** | saveMany, deleteMany | 性能优化，减少事务开销 |
| **错误重试** | 初始化重试机制 | 提高稳定性，应对临时失败 |
| **文件名处理** | 自动补全扩展名 | 确保文件可正确打开 |

## 扩展性

- **新增文件类型**: 只需在 `FileTypes` 中添加类型，在 `MimeMap` 和 `ExtensionMap` 中添加映射
- **新增来源**: 工厂方法可以灵活扩展，不影响核心类
- **新增元数据**: metadata 对象完全开放，可任意添加
- **新增存储方式**: 可基于 FileStorage 接口实现其他存储（如 localStorage）

## 文件列表

- `file-types.js` - 文件类型系统和工具函数
- `file-entity.js` - 文件实体类
- `file-storage.js` - 文件存储管理器
- `file-manager.js` - 统一文件管理器
- `file-system.js` - 文件系统统一入口

## 依赖关系

```
background.js
  ├── constants.js
  ├── logger.js
  ├── file-system/file-types.js
  ├── file-system/file-entity.js
  ├── file-system/file-storage.js
  ├── file-system/file-manager.js
  └── db-manager.js (遗留兼容)
```

## 兼容性

文件封装系统设计为与现有的 `db-manager.js` 兼容，可以渐进式迁移：

1. 现有代码继续使用 `dbManager`
2. 新功能使用 `fileManager`
3. 通过 `useLegacyMode` 选项可以同时使用两者

## 测试建议

1. 测试文件创建和保存
2. 测试文件读取和下载
3. 测试批量操作
4. 测试元数据添加
5. 测试类型推断
6. 测试错误处理
