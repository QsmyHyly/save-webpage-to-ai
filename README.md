# DeepSeek 浏览器侧边栏扩展

在 Chrome 浏览器页面右侧打开侧边栏，内嵌 DeepSeek 并支持将当前页面内容传递给 AI 进行分析。

## 功能特性

- 🚀 在任意网页右侧快速打开 DeepSeek 侧边栏
- 📄 一键发送当前页面完整内容到 DeepSeek
- 🔗 支持仅发送页面链接
- 📊 4 级内容精简选项，控制发送内容的体积
- 🎨 美观的渐变 UI 设计
- 📐 支持拖拽调整侧边栏宽度
- 🔄 与页面共存，切换标签页自动隐藏

## 文件结构

```
deepseek浏览器侧边栏/
├── manifest.json          # 扩展配置文件
├── background.js          # Service Worker 后台脚本
├── content.js             # 全局内容脚本（创建侧边栏）
├── deepseek-content.js    # DeepSeek 页面专用脚本
├── sidebar.html           # 侧边栏 HTML（备用）
├── sidebar.css            # 侧边栏样式
├── sidebar.js             # 侧边栏脚本（备用）
├── icons/                 # 图标文件夹
│   ├── icon.svg           # SVG 图标源文件
│   └── README.md          # 图标制作说明
├── README.md              # 本文件
└── 文档/
    └── 设计文档.md        # 详细设计文档
```

## 安装步骤

### 1. 准备图标文件

扩展需要 PNG 格式的图标文件，请先将 `icons/icon.svg` 转换为以下尺寸的 PNG：

- `icon16.png` (16x16)
- `icon48.png` (48x48)
- `icon128.png` (128x128)

转换方法详见 `icons/README.md`

### 2. 加载扩展到 Chrome

1. 打开 Chrome 浏览器
2. 在地址栏输入 `chrome://extensions/` 并回车
3. 开启右上角的「开发者模式」
4. 点击「加载已解压的扩展程序」
5. 选择本项目的文件夹（`deepseek浏览器侧边栏`）
6. 扩展图标将出现在 Chrome 工具栏中

### 3. 使用扩展

1. 访问任意网页
2. 点击 Chrome 工具栏中的扩展图标
3. 页面右侧将显示 DeepSeek 侧边栏
4. 使用底部的控制栏发送页面内容：
   - 调整「内容精简级别」滑块
   - 点击「发送页面内容到 DeepSeek」按钮
   - 或点击「仅发送链接」按钮

## 内容精简级别说明

| 级别 | 名称 | 说明 |
|------|------|------|
| 0 | 完整 | 保留完整 HTML、样式和脚本信息 |
| 1 | 精简 | 移除注释、压缩空白字符（推荐） |
| 2 | 仅文本 | 移除 script 和 style 标签 |
| 3 | 仅正文 | 只保留 body 内的纯文本内容 |

## 注意事项

1. **CSP 限制**：DeepSeek 网站可能有内容安全策略限制 iframe 嵌入。扩展已尝试通过 `declarativeNetRequest` API 移除相关限制，但在某些情况下可能仍无法嵌入。

2. **登录状态**：如果 DeepSeek 需要登录，请在侧边栏内完成登录操作。

3. **内容大小**：为避免超出消息大小限制，内容会自动截断：
   - 级别 0：HTML 最多 100,000 字符
   - 级别 1：HTML 最多 50,000 字符
   - 级别 2-3：HTML 最多 20,000 字符

4. **跨域限制**：由于浏览器安全限制，无法获取跨域样式表和脚本的内容。

## 故障排除

### 侧边栏无法显示
- 检查是否已开启开发者模式
- 查看 Chrome 控制台是否有错误信息
- 尝试刷新页面后重新点击扩展图标

### 无法发送内容到 DeepSeek
- 确保 DeepSeek 页面已完全加载
- 检查是否在 iframe 中正确登录
- 查看浏览器控制台是否有错误信息

### DeepSeek 页面无法加载
- DeepSeek 可能限制了 iframe 嵌入
- 尝试直接访问 https://chat.deepseek.com/ 查看是否正常
- 检查网络连接

## 技术说明

本扩展使用以下技术：
- **Manifest V3**：Chrome 扩展最新版本
- **Content Scripts**：注入到页面中创建侧边栏
- **Service Worker**：处理扩展生命周期和消息通信
- **postMessage**：实现跨域 iframe 通信
- **declarativeNetRequest**：修改响应头以允许 iframe 嵌入

## 隐私说明

- 本扩展仅在本地处理页面内容
- 不会将任何数据上传到第三方服务器
- 页面内容仅发送到用户指定的 DeepSeek 服务

## 许可证

MIT License
