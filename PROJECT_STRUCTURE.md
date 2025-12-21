# 项目结构说明

## 目录结构

```
PowerWiki/
├── server.js                 # Express 服务器主文件
├── config.json               # 配置文件（需要从 config.example.json 复制）
├── config.example.json       # 配置模板文件
├── package.json              # 项目依赖和脚本配置
├── package-lock.json         # 依赖锁定文件
├── README.md                 # 项目说明文档
├── LICENSE                   # MIT 许可证
├── CHANGELOG.md              # 更新日志
├── CONTRIBUTING.md           # 贡献指南
├── PROJECT_STRUCTURE.md      # 本文件 - 项目结构说明
├── .gitignore               # Git 忽略文件配置
├── .npmignore               # NPM 发布忽略文件
├── .editorconfig            # 编辑器配置
│
├── utils/                   # 工具模块
│   ├── gitManager.js        # Git 仓库管理模块
│   └── markdownParser.js    # Markdown 解析模块
│
├── templates/               # 模板文件
│   ├── header.html          # 网站头部模板
│   ├── footer.html          # 网站底部模板
│   └── home.html            # 首页模板
│
└── public/                  # 前端静态文件
    ├── index.html           # 前端页面
    ├── styles.css           # 样式文件
    └── app.js               # 前端逻辑
```

## 文件说明

### 核心文件

- **server.js**: Express 服务器，处理所有 API 请求和路由
- **config.json**: 项目配置文件（需要用户创建）
- **config.example.json**: 配置模板，供用户参考

### 工具模块

- **utils/gitManager.js**: 
  - 负责 Git 仓库的克隆和更新
  - 扫描 Markdown 文件
  - 读取文件内容

- **utils/markdownParser.js**:
  - 解析 Markdown 为 HTML
  - 提取文章标题和描述
  - 代码语法高亮

### 模板文件

- **templates/header.html**: 网站头部模板，支持变量替换
- **templates/footer.html**: 网站底部模板，支持变量替换

### 前端文件

- **public/index.html**: 单页应用的主 HTML 文件
- **public/styles.css**: 飞书文档风格的样式文件
- **public/app.js**: 前端 JavaScript 逻辑，处理路由、搜索、目录等

### 文档文件

- **README.md**: 项目主要文档，包含安装、配置、使用说明
- **LICENSE**: MIT 许可证
- **CHANGELOG.md**: 版本更新日志
- **CONTRIBUTING.md**: 贡献指南
- **PROJECT_STRUCTURE.md**: 项目结构说明（本文件）

### 配置文件

- **.gitignore**: Git 版本控制忽略文件
- **.npmignore**: NPM 发布时忽略的文件
- **.editorconfig**: 编辑器代码格式配置

## 数据流

1. **启动流程**:
   ```
   启动服务器 → 加载配置 → 初始化 GitManager → 同步仓库 → 启动自动同步
   ```

2. **请求流程**:
   ```
   用户请求 → Express 路由 → API 处理 → GitManager/MarkdownParser → 返回数据
   ```

3. **前端流程**:
   ```
   页面加载 → 获取配置 → 加载文章列表 → 渲染目录树 → 用户交互 → 加载文章
   ```

## 关键设计

- **无数据库设计**: 直接从 Git 仓库读取文件，无需数据库
- **单页应用**: 前端使用 SPA 架构，路由由前端处理
- **模板系统**: 支持自定义 Header 和 Footer
- **自动同步**: 定时从 Git 仓库拉取最新内容

## 扩展建议

如需扩展功能，可以考虑：

1. **添加缓存机制**: 减少 Git 操作频率
2. **支持多仓库**: 同时管理多个 Git 仓库
3. **添加评论系统**: 集成第三方评论服务
4. **SEO 优化**: 服务端渲染支持
5. **主题系统**: 支持多套主题切换

