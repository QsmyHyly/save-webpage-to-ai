# 保存网页并发送给deepseek或千问

一个 Chrome 浏览器扩展，用于保存任意网页的完整 HTML，并支持在 DeepSeek、通义千问等 AI 对话平台批量上传这些 HTML 文件进行分析。

## 功能特性

- 💾 **保存任意网页**：一键保存当前页面的完整 HTML、标题、URL 到本地存储
- 📂 **管理已保存页面**：在 popup 中查看所有保存的页面（标题、URL、保存时间、文件大小）
- ✅ **多选/全选/删除**：支持批量选择页面，方便管理
- 📤 **批量上传到 AI 平台**：
  - 在 DeepSeek（`chat.deepseek.com`）或通义千问（`qianwen.com` / `qwen.ai`）的对话页面
  - 点击「上传到 DeepSeek」或「上传到通义千问」按钮，将选中的 HTML 文件依次拖拽到输入框并自动发送
- 🚀 **自动发送**：上传完成后自动触发 AI 的发送按钮，无需手动点击
- 🎨 **美观的 popup 界面**：渐变头部、状态指示、进度提示

## 文件结构

```
AI-Page-Manager/
├── manifest.json          # 扩展配置文件
├── background.js          # Service Worker，管理 IndexedDB 存储
├── popup.html             # 扩展 popup 界面
├── popup.js               # popup 界面逻辑
├── deepseek-content.js    # DeepSeek 页面内容脚本（处理上传）
├── qianwen-uploader.js    # 通义千问页面内容脚本
├── icons/                 # 图标文件夹
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md              # 本文件
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
4. 选择本项目所在的文件夹（`AI-Page-Manager`）
5. 扩展图标将出现在 Chrome 工具栏中

## 使用方法

### 保存页面

1. 访问任意网页
2. 点击 Chrome 工具栏中的扩展图标
3. 在 popup 中点击「保存当前页面」按钮
4. 页面的完整 HTML、标题、URL 将保存到本地存储

### 管理保存的页面

- 在 popup 中查看所有已保存的页面列表
- 点击页面行可快速选中/取消选中（复选框）
- 使用「全选」「取消全选」按钮批量操作
- 点击单个「删除」按钮或「删除选中」按钮清理无用页面

### 上传到 AI 平台

1. 打开 DeepSeek 对话页面（`https://chat.deepseek.com/`）或通义千问对话页面（`qianwen.com` / `qwen.ai`）
2. 点击扩展图标，状态栏会显示当前平台，上传按钮会变为「上传到 DeepSeek」或「上传到通义千问」
3. 勾选要上传的页面
4. 点击上传按钮，扩展将逐个将选中的页面作为 HTML 文件拖拽到 AI 输入框，并自动点击发送
5. 上传过程中会显示进度条，完成后弹出提示

## 注意事项

1. **支持的 AI 平台**：目前支持 DeepSeek（`chat.deepseek.com`）和通义千问（`qianwen.com` / `qwen.ai`）。其他 AI 平台如需支持，可参照现有内容脚本编写适配器。
2. **登录状态**：请确保已在对应 AI 平台登录，否则上传后可能无法正常发送。
3. **存储限制**：HTML 内容保存在 IndexedDB 中，理论上无大小限制（取决于用户磁盘空间），但页面过大可能导致保存缓慢。
4. **上传机制**：扩展通过模拟拖拽事件上传文件，需要 AI 页面支持拖拽上传（DeepSeek 和通义千问均已支持）。
5. **自动发送**：上传后会尝试自动点击发送按钮。如果发送失败，请手动点击 AI 输入框旁的发送按钮。
6. **跨域限制**：扩展仅在当前标签页执行内容脚本，不会读取或修改其他网站数据。

## 隐私说明

- 所有保存的页面 HTML 仅存储在本地 IndexedDB 中，不会上传到任何第三方服务器。
- 扩展不会收集任何用户个人信息。
- 仅在用户主动点击上传按钮时，才会将 HTML 内容发送到当前 AI 平台的对话页面。

## 技术实现

- **Manifest V3**：使用 Chrome 扩展的最新规范
- **IndexedDB**：在 background service worker 中存储页面数据
- **Content Scripts**：分别注入到 DeepSeek 和通义千问页面，负责文件上传和发送
- **chrome.scripting**：动态执行脚本获取当前页面 HTML
- **DragEvent**：模拟拖拽事件实现文件上传

## 许可证

MIT License
