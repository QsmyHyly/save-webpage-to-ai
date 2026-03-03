# 保存网页并发送给deepseek或千问

一个 Chrome 浏览器扩展，用于保存任意网页的完整 HTML，并支持在 DeepSeek、通义千问等 AI 对话平台批量上传这些 HTML 文件进行分析。

## 功能特性

- 💾 **保存任意网页**：一键保存当前页面的完整 HTML、标题、URL 到本地存储
- 📂 **管理已保存页面**：在 popup 中查看所有保存的页面（标题、URL、保存时间、文件大小）
- ✅ **多选/全选/删除**：支持批量选择页面，方便管理
- 📤 **批量上传到 AI 平台**：
  - 在 DeepSeek（`chat.deepseek.com`）或通义千问（`qianwen.com` / `qwen.ai`）的对话页面
  - 点击「上传到 DeepSeek」或「上传到通义千问」按钮，将选中的 HTML 文件依次拖拽到输入框并自动发送
  - **智能检测**：上传前自动检测内容脚本是否就绪，避免页面未完全加载导致上传失败
- 🚀 **自动发送**：上传完成后自动触发 AI 的发送按钮，无需手动点击
- 🎨 **美观的 popup 界面**：渐变头部、状态指示、进度提示
- 🖱️ **优化的交互体验**：
  - 点击整个条目即可切换选中状态，无需精确点击复选框
  - 复选框尺寸放大，更容易点击
  - 选中的条目会高亮显示，视觉反馈更清晰
- 📦 **外部资源管理**：
  - 使用 performance API 获取当前页面的所有外部资源
  - 支持查看和保存 CSS、JavaScript、图片等资源
  - 支持按原始页面分组查看已保存的资源
- 🎨 **主题配置**：支持自定义界面主色调、危险色、成功色、渐变色等
- 📊 **日志系统**：统一的日志模块，方便调试
- 🗄️ **文件系统管理**：使用 FileManager 类封装 IndexedDB 操作，统一管理页面和资源
- 🔧 **调试模式**：支持 debugger 模式，可捕获包含 closed Shadow DOM 的完整页面内容
- 🔕 **通知设置**：可自定义显示/隐藏各类通知（成功、错误、警告、确认对话框）

## 文件结构

```
保存网页并发送给deepseek或千问/
├── manifest.json              # 扩展配置文件
├── README.md                  # 项目说明文档
├── icons/                     # 图标文件夹
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── src/                       # 源代码目录
│   ├── background/            # 后台脚本
│   │   └── background.js      # Service Worker，管理文件系统存储
│   ├── content/               # 内容脚本
│   │   ├── content-utils.js   # 内容脚本共享模块
│   │   ├── deepseek-content.js # DeepSeek 页面内容脚本（处理上传）
│   │   └── qianwen-uploader.js # 通义千问页面内容脚本（处理上传）
│   ├── file-system/           # 文件系统模块
│   │   ├── file-entity.js     # 文件实体类
│   │   ├── file-manager.js    # 文件管理器（统一接口）
│   │   ├── file-storage.js    # 文件存储管理器
│   │   ├── file-types.js      # 文件类型系统
│   │   └── README.md          # 文件系统文档
│   └── utils/                 # 工具模块
│       ├── common-utils.js    # 公共工具函数
│       ├── constants.js       # 常量定义模块
│       ├── logger.js          # 统一日志模块
│       └── shared-utils.js    # 共享工具函数
├── pages/                     # 页面目录
│   ├── common.css             # 公共样式
│   ├── popup/                 # 弹窗页面
│   │   ├── popup.html         # 扩展 popup 界面
│   │   ├── popup.js           # popup 界面逻辑
│   │   ├── popup.css          # popup 样式
│   │   └── README.md          # popup 说明文档
│   ├── resources/             # 资源管理页面
│   │   ├── resources.html     # 资源管理页面
│   │   ├── resources.js       # 资源管理逻辑
│   │   ├── resources.css      # 资源管理样式
│   │   └── README.md          # 资源管理说明文档
│   └── options/               # 选项页面
│       ├── options.html       # 扩展选项界面
│       ├── options.js         # 选项逻辑
│       └── options.css        # 选项样式
├── 文档/                      # 项目文档
│   └── 设计文档.md            # 设计文档
└── tools/                     # 工具文件夹
```

## 安装步骤

### 1. 准备图标文件
在 `icons/` 文件夹中放置以下尺寸的 PNG 图标：
- `icon16.png` (16x16)
- `icon48.png` (48x48)
- `icon128.png` (128x128)

### 2. 加载扩展到 Chrome
1. 打开 Chrome 浏览器，在地址栏输入 `chrome://extensions/` 并回车
2. 开启右上角的「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择本项目所在的文件夹
5. 扩展图标将出现在 Chrome 工具栏中

## 使用方法

### 保存页面
1. 访问任意网页
2. 点击 Chrome 工具栏中的扩展图标
3. 在 popup 中点击「保存当前页面」按钮
4. 页面的完整 HTML、标题、URL 将保存到本地存储

### 管理保存的页面
1. 在 popup 中查看所有已保存的页面列表
2. 点击页面行任意位置可快速选中/取消选中（无需精确点击复选框）
3. 选中的条目会显示浅蓝色背景高亮
4. 使用「全选」「取消全选」按钮批量操作
5. 点击单个「删除」按钮或「删除选中」按钮清理无用页面

### 配置主题颜色
在选项页面（右键扩展图标 → 选项）中可以：
- 选择预设主题（浅色、深色、自定义）
- 自定义主色调、危险色、成功色、渐变色等
- 保存设置后，所有页面将同步应用新主题

### 上传到 AI 平台
1. 打开 DeepSeek 对话页面（`https://chat.deepseek.com/`）或通义千问对话页面（`qianwen.com` / `qwen.ai`）
2. 点击扩展图标，状态栏会显示当前平台，上传按钮会变为「上传到 DeepSeek」或「上传到通义千问」
3. 勾选要上传的页面
4. 点击上传按钮，扩展会先检测内容脚本是否就绪
   - 如果页面未完全加载，会提示「当前 AI 页面尚未完全加载，请刷新后重试」
   - 请确保 AI 页面完全加载后再尝试上传
5. 扩展将逐个将选中的页面作为 HTML 文件拖拽到 AI 输入框，并自动点击发送
6. 上传过程中会显示进度条，完成后弹出提示

### 管理外部资源
1. 点击 popup 中的「📦 管理外部资源」按钮
2. 扩展会使用 performance API 获取当前页面的所有外部资源
3. 查看该页面的所有外部资源（CSS、JavaScript、图片等）
4. 勾选需要保存的资源
5. 点击「💾 保存选中的资源」按钮下载并保存到 IndexedDB
6. 保存的资源可以按原始页面分组查看

### 使用调试模式
在选项页面中可以启用调试模式：
- 启用后，保存页面时会使用 Chrome Debugger Protocol
- 可以捕获包含 closed Shadow DOM 的完整页面内容
- 适用于需要获取完整 DOM 结构的场景

### 配置通知设置
在选项页面中可以自定义通知显示行为：
- ✅ 显示成功通知
- ❌ 显示错误通知
- ⚠️ 显示警告提示
- 💬 显示确认对话框
- 关闭后对应弹窗将不再显示（确认对话框可设置默认行为）

## 注意事项

1. **支持的 AI 平台**：目前支持 DeepSeek（`chat.deepseek.com`）和通义千问（`qianwen.com` / `qwen.ai`）。其他 AI 平台如需支持，可参照现有内容脚本编写适配器。
2. **登录状态**：请确保已在对应 AI 平台登录，否则上传后可能无法正常发送。
3. **存储限制**：HTML 内容保存在 IndexedDB 中，理论上无大小限制（取决于用户磁盘空间），但页面过大可能导致保存缓慢。
4. **上传机制**：扩展通过模拟拖拽事件上传文件，需要 AI 页面支持拖拽上传（DeepSeek 和通义千问均已支持）。
5. **上传检测**：上传前会自动检测内容脚本是否就绪，如果 AI 页面未完全加载，会提示用户刷新页面后重试。
6. **自动发送**：上传后会尝试自动点击发送按钮。如果发送失败，请手动点击 AI 输入框旁的发送按钮。
7. **跨域限制**：扩展仅在当前标签页执行内容脚本，不会读取或修改其他网站数据。
8. **资源管理**：外部资源功能使用 performance API 获取已加载的资源，需要页面完全加载后才能获取完整列表。
9. **删除操作**：删除页面和资源时会弹出确认对话框，请谨慎操作。
10. **调试模式限制**：调试模式需要额外的权限，首次启用时会提示用户确认。

## 隐私说明

- 所有保存的页面 HTML 仅存储在本地 IndexedDB 中，不会上传到任何第三方服务器。
- 扩展不会收集任何用户个人信息。
- 仅在用户主动点击上传按钮时，才会将 HTML 内容发送到当前 AI 平台的对话页面。
- 主题配置和通知设置通过 `chrome.storage.sync` 同步，不会上传任何敏感信息。

## 技术实现

- **Manifest V3**：使用 Chrome 扩展的最新规范
- **IndexedDB**：在 background service worker 中存储页面数据
- **文件系统架构**：
  - `FileEntity`：统一的文件实体类，将页面和资源抽象为文件
  - `FileStorage`：IndexedDB 存储管理器
  - `FileManager`：统一文件管理接口，整合页面和资源管理
- **Content Scripts**：分别注入到 DeepSeek 和通义千问页面，负责文件上传和发送
- **chrome.scripting**：动态执行脚本获取当前页面 HTML
- **DragEvent**：模拟拖拽事件实现文件上传
- **主题系统**：通过 CSS 变量实现主题切换
- **日志系统**：统一日志模块，支持不同环境的日志输出
- **模块化架构**：
  - `src/background/`：后台脚本目录
    - `background.js`：Service Worker 主入口，统一管理文件系统
  - `src/content/`：内容脚本目录
    - `content-utils.js`：内容脚本共享函数
    - `deepseek-content.js`：DeepSeek 平台适配
    - `qianwen-uploader.js`：通义千问平台适配
  - `src/file-system/`：文件系统目录
    - `file-entity.js`：文件实体类
    - `file-manager.js`：文件管理器
    - `file-storage.js`：存储管理器
    - `file-types.js`：文件类型系统
  - `src/utils/`：工具模块目录
    - `common-utils.js`：公共工具函数
    - `constants.js`：统一管理所有常量
    - `logger.js`：统一日志模块
    - `shared-utils.js`：共享工具函数
  - `pages/popup/`：弹窗页面目录
  - `pages/resources/`：资源管理页面目录
  - `pages/options/`：选项页面目录

## 消息系统

扩展使用统一的消息类型进行组件间通信，所有消息类型定义在 `src/utils/constants.js` 中：

| 消息类型 | 说明 |
|---------|------|
| `SAVE_FILE` | 保存单个文件 |
| `SAVE_FILES` | 批量保存文件 |
| `GET_FILE` | 获取单个文件 |
| `GET_FILES` | 批量获取文件 |
| `GET_ALL_FILES` | 获取所有文件 |
| `GET_FILES_BY_TYPE` | 按类型获取文件 |
| `GET_FILES_BY_URL` | 按来源 URL 获取文件 |
| `DELETE_FILE` | 删除单个文件 |
| `DELETE_FILES` | 批量删除文件 |
| `CLEAR_ALL_FILES` | 清空所有文件 |
| `GET_FILE_COUNT` | 获取文件数量 |
| `CREATE_FILE_FROM_HTML` | 从 HTML 创建文件实体 |
| `CREATE_FILE_FROM_RESOURCE` | 从资源创建文件实体 |
| `UPLOAD_ITEMS` | 上传选中的项目到 AI 平台 |
| `RESET_DB` | 重置数据库 |

## 许可证

MIT License
