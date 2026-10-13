# PowerWiki

<div align="center">

<img src="assets/powerwiki-logo.svg" alt="PowerWiki" width="360" />

![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![Node](https://img.shields.io/badge/Node.js->=14-339933?style=for-the-badge&logo=node.js&logoColor=white)

一个现代化的基于 Git 仓库的 Markdown 知识库系统，支持自动同步、代码高亮、飞书风格 UI。

**🔗 在线演示: [https://powerwiki.ga666666.cn](https://powerwiki.ga666666.cn)**

[English](README.md) • [中文](README_ZH.md) • [日本語](docs/README_JA.md) • [한국어](docs/README_KO.md) • [Español](docs/README_ES.md) • [Français](docs/README_FR.md) • [Deutsch](docs/README_DE.md) • [Русский](docs/README_RU.md)

</div>

---

## 📸 界面与功能预览

以下截图来自 [在线演示站](https://powerwiki.ga666666.cn/)。将自己的 Git 文档仓库接入后，即可使用同样的阅读界面。

### Git 文档变成可浏览的知识库

左侧按文件夹组织文档，中间展示 Markdown 正文，右侧自动生成文章目录，方便在长文中定位章节。

![PowerWiki 首页：文件夹导航、Markdown 正文与自动目录](assets/screenshots/home.jpg)

### 技术文档的阅读与复用

代码块、文章信息和章节导航集中在同一页面。通过文章工具栏，可以复制全文、切换原始 Markdown 视图或分享文章。

![PowerWiki 代码演示：文章工具栏与章节导航](assets/screenshots/code.jpg)

### Mermaid 图表直接呈现在文章中

用文本描述时序关系，直接在文章中展示用户、浏览器与服务之间的交互图，无需额外上传图表图片。

![PowerWiki 中渲染的 Mermaid 时序图](assets/screenshots/mermaid.jpg)

### 一键切换暗夜阅读

通过顶部主题按钮切换深色背景，在同样的页面中继续阅读技术文档。

![PowerWiki 暗夜模式下的技术文档](assets/screenshots/dark-mode.jpg)

---

## 💡 设计理念

PowerWiki 诞生于对「知识管理」与「技术写作」的深度思考。我们相信：

### 1. 简单即力量

不做过度设计，不造复杂轮子。Markdown + Git 是经过十年验证的最简知识管理方案。放弃数据库，回归文件系统，让知识回归纯粹。

### 2. 极客优先

为开发者量身打造。代码高亮、语法简洁、本地图片支持、Git 工作流——每一个功能都源自真实的开发场景需求。

### 3. 开箱即用

零学习成本启动，不需要复杂的配置，不需要专门的 CMS 系统。克隆即用，推送即更新。

### 4. 持久化与可移植

你的数据永远属于你自己。纯文本存储，版本控制天然支持，随时可以迁移到任何平台。

### 5. 隐私与安全

无需注册，无需云端，所有数据存储在你自己可控的环境中。

---

## ✨ 特性

- **自动同步** - 从 Git 仓库自动拉取和更新文档
- **代码高亮** - 支持多种编程语言语法高亮
- **响应式设计** - 完美适配各种设备屏幕
- **自动目录** - 自动生成文章目录
- **现代界面** - 简约现代的界面设计
- **PDF 支持** - 高清渲染 PDF 文件
- **访问统计** - 自动统计文章查看量
- **轻量级** - 无需数据库
- **SEO 优化** - 全面优化搜索引擎可见性
- **Frontmatter 支持** - 解析 YAML 元信息
- **本地图片** - 支持 Markdown 中引用本地图片
- **多语言** - 支持中文和英文
- **Docker 支持** - 完整的 Docker 部署支持

## 🚀 快速开始

### 前置要求

- Node.js >= 14.0.0
- Git

### 方式一：Docker（推荐）

```bash
# 克隆项目
git clone https://github.com/steven-ld/PowerWiki.git
cd PowerWiki

# 创建配置文件
cp config.example.json config.json
# 编辑 config.json 配置你的 Git 仓库

# 使用 Docker Compose 启动
docker-compose up -d
```

### 方式二：Node.js

```bash
# 克隆项目
git clone https://github.com/steven-ld/PowerWiki.git
cd PowerWiki

# 安装依赖
npm install

# 创建配置文件
cp config.example.json config.json
# 编辑 config.json 配置你的 Git 仓库

# 启动服务器
npm start
```

打开浏览器访问 `http://localhost:3150`

## ⚙️ 配置说明

编辑 `config.json`：

```json
{
  "gitRepo": "https://github.com/your-username/your-wiki-repo.git",
  "repoBranch": "main",
  "port": 3150,
  "siteTitle": "我的知识库",
  "siteDescription": "知识库",
  "autoSyncInterval": 180000,
  "pages": {
    "home": "README.md",
    "about": "ABOUT.md"
  }
}
```

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `gitRepo` | Git 仓库地址 | - |
| `repoBranch` | 分支名称 | `main` |
| `mdPath` | Markdown 文件子目录 | `""` |
| `port` | 服务器端口 | `3150` |
| `siteTitle` | 网站标题 | `PowerWiki` |
| `siteDescription` | 网站描述 | `知识库` |
| `autoSyncInterval` | 自动同步间隔（毫秒） | `180000` |
| `sortOrder` | 排序方式 (`modified` 或 `name`) | `modified` |
| `pages.home` | 首页文件 | `""` |
| `pages.about` | 关于页面文件 | `""` |

## 🌍 环境变量

PowerWiki 支持环境变量进行灵活部署：

```bash
# 配置文件路径
CONFIG_PATH=/path/to/your/config.json

# 数据存储目录（统计和日志）
DATA_DIR=/path/to/data/directory

# Git 仓库缓存目录
GIT_CACHE_DIR=/path/to/git/cache

# 语言设置（zh-CN 或 en）
LANG=zh-CN
```

复制 `.env.example` 为 `.env` 并根据需要自定义。

## 🐳 Docker 部署

### Docker 镜像

**[@sayunchuan](https://github.com/sayunchuan)** 为 PowerWiki 提供了 Docker 镜像。

- **镜像名称**: `sayunchuan/powerwiki`
- **Docker Hub**: [sayunchuan/powerwiki](https://hub.docker.com/r/sayunchuan/powerwiki)
- **版本标签**: `latest`, `1.4.5`, `20260207`

### 快速启动

```bash
# 最简单的方式
docker run -d -p 3150:3150 sayunchuan/powerwiki

# 使用自定义配置
docker run -d \
  --name powerwiki \
  -p 3150:3150 \
  -v $(pwd)/config.json:/app/config.json:ro \
  -v powerwiki_data:/app/data \
  -v powerwiki_cache:/app/cache \
  sayunchuan/powerwiki
```

### Docker Compose 部署

```yaml
version: '3.8'
services:
  powerwiki:
    image: sayunchuan/powerwiki:latest
    ports:
      - "3150:3150"
    environment:
      - NODE_ENV=production
      - LANG=zh-CN
    volumes:
      - ./config.json:/app/config.json:ro
      - powerwiki_data:/app/data
      - powerwiki_cache:/app/cache
    restart: unless-stopped

volumes:
  powerwiki_data:
  powerwiki_cache:
```

```bash
# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

**致谢**: 感谢 [@sayunchuan](https://github.com/sayunchuan) 为 PowerWiki 提供 Docker 镜像，使得部署更加便捷。

## 📂 文章组织

PowerWiki 支持层次化的文件夹结构来组织文章：

```
your-wiki-repo/
├── README.md              # 首页
├── ABOUT.md               # 关于页面
├── images/                # 全局公共图片（可选）
├── 架构设计/              # 分类文件夹（支持中文）
│   ├── images/            # 分类公共图片
│   ├── 物模型：IoT设备标准化实践.md
│   ├── TLS加密算法深度解析.md
│   └── README.md          # 分类索引页
├── 项目实践/               # 另一个分类
│   ├── images/
│   ├── OpenResty + Redis 短链接服务系统.md
│   └── README.md
└── 音视频/
    ├── images/
    ├── WebRTC 信令服务详解.md
    └── README.md
```

### 文章 Frontmatter 格式

每篇文章可以包含 YAML frontmatter 元信息：

```yaml
---
title: 文章标题
description: 文章描述（用于 SEO）
author: 作者名称
date: 2026-01-10
updated: 2026-01-10
keywords: 关键词1, 关键词2, 关键词3
tags: [标签1, 标签2]
---
```

### 稳定文章地址与 SEO

为文章设置固定 `slug`，即可通过 `/article/getting-started` 访问。之后移动目录或重命名文件时，保留 `slug`，文章地址及分享短链就不会改变。不设置 `slug` 的文章仍使用原有 `/post/文件路径`。

```yaml
---
title: 入门指南
slug: getting-started
aliases:
  - /post/旧目录/入门.md
  - /article/old-getting-started
---
```

`slug` 支持中文、字母、数字、下划线和连字符；全站必须唯一。`aliases` 支持上例的列表或 `[/post/旧文件.md, /article/旧slug]`，填写旧地址的未编码路径，不含域名、查询参数或锚点。旧文件地址、旧 slug 地址会 301 跳转到当前地址，对应旧短链也继续有效。重命名时请主动保留旧路径别名；没有别名的历史路径无法自动恢复。冲突或非法配置会报错，修复后等待 Git 同步即可。

浏览器和爬虫共用文章 HTML、canonical、Open Graph、Twitter Card 和 JSON-LD；RSS 与 sitemap 使用相同的 canonical 地址。发布时间取 Git 创建时间，更新时间取 Git 修改时间，作者优先取 `author`。首次打开直接输出正文，浏览器复用这份内容，不再次下载文章；不存在的文章返回真实 404，并标记 `noindex`。地址索引和正文继续按内容版本缓存，仅在 Git 文档、配置变化或重启后重建。

### 图片引用

PowerWiki 支持在 Markdown 中使用相对路径引用本地图片，系统会自动将图片路径转换为可访问的 API 地址：

```markdown
# 方式一：使用当前目录的 images 文件夹（推荐）
![图片描述](./images/pic.png)

# 方式二：使用父目录的 images 文件夹
![图片描述](../images/pic.png)

# 方式三：使用绝对路径（相对于仓库根目录）
![图片描述](/images/pic.png)

# 方式四：直接引用（不使用 ./ 或 ../ 前缀）
![图片描述](images/pic.png)
```

支持的图片格式：`PNG`、`JPG/JPEG`、`GIF`、`WEBP`、`SVG`、`ICO`

## 🌐 多语言支持

PowerWiki 支持多语言控制台输出，并允许用户自定义语言包。

### 支持的语言
- **中文简体** (`zh-CN`) - 默认语言
- **英文** (`en`)

### 使用方法

```bash
# 启动英文版本
LANG=en npm start

# 启动中文版本
LANG=zh-CN npm start

# 或使用 npm 脚本
npm run start:en
npm run start:zh
```

### 自定义语言包

PowerWiki 使用 JSON 文件进行多语言翻译，支持用户添加自定义语言。

#### 1. 创建语言文件

在 `locales/` 目录下创建新的语言文件，文件名格式为 `<语言代码>.json`：

```bash
# 例如创建日语文件
cp locales/en.json locales/ja.json
```

#### 2. 编辑语言文件

修改 `locales/ja.json`，将英文翻译替换为日语：

```json
{
  "siteTitle": "PowerWiki",
  "siteDescription": "Wiki システム",
  "nav": {
    "home": "ホーム",
    "about": "概要"
  },
  "content": {
    "readingTime": "読み取り時間",
    "words": "語",
    "toc": "目次"
  },
  "actions": {
    "copy": "コピー",
    "copied": "コピー完了"
  },
  "stats": {
    "views": "閲覧数"
  },
  "footer": {
    "poweredBy": "Powered by"
  }
}
```

#### 3. 更新控制台语言选项

修改 `src/config/i18n.js`，在 `SUPPORTED_LANGUAGES` 数组中添加新语言：

```javascript
const SUPPORTED_LANGUAGES = [
  { code: 'zh-CN', name: '中文', file: 'zh-CN.json' },
  { code: 'en', name: 'English', file: 'en.json' },
  { code: 'ja', name: '日本語', file: 'ja.json' },  // 新增日语
];
```

#### 4. 使用自定义语言

```bash
# 启动日语版本
LANG=ja npm start
```

#### 语言文件结构参考

语言文件支持以下键值（全部为可选，缺失的键将回退到英文）：

| 分类 | 键名 | 说明 |
|------|------|------|
| 站点 | `siteTitle` | 网站标题 |
| 站点 | `siteDescription` | 网站描述 |
| 导航 | `nav.home` | 首页链接文字 |
| 导航 | `nav.about` | 关于页面链接文字 |
| 内容 | `content.readingTime` | 阅读时间标签 |
| 内容 | `content.words` | 字数单位 |
| 内容 | `content.toc` | 目录标题 |
| 操作 | `actions.copy` | 复制按钮 |
| 操作 | `actions.copied` | 复制成功提示 |
| 统计 | `stats.views` | 浏览量标签 |
| 底部 | `footer.poweredBy` | 技术支持文字 |

## 🛠️ 开发

### 可用脚本

```bash
# 开发
npm run dev              # 使用 nodemon 启动
npm run test:env         # 测试环境变量

# Docker
npm run docker:build     # 构建 Docker 镜像
npm run docker:run       # 运行 Docker 容器
npm run docker:stop      # 停止并删除容器
npm run docker:logs      # 查看容器日志

# 语言变体
npm run start:en         # 启动英文版本
npm run start:zh         # 启动中文版本
```

### 项目结构

```
PowerWiki/
├── src/                     # 源代码
│   ├── index.js             # Express 服务器入口
│   ├── routes/              # 路由模块
│   │   ├── api.js           # API 路由
│   │   ├── feeds.js         # RSS/Sitemap 路由
│   │   └── static.js        # 静态文件路由
│   ├── config/              # 配置模块
│   │   ├── env.js           # 环境变量
│   │   └── i18n.js          # 国际化
│   └── utils/               # 工具模块
│       ├── cacheManager.js  # 缓存管理
│       ├── gitManager.js    # Git 操作
│       └── markdownParser.js# Markdown 解析
├── locales/                 # 翻译文件
│   ├── zh-CN.json           # 中文翻译
│   └── en.json              # 英文翻译
├── templates/               # HTML 模板
│   ├── header.html          # 头部模板
│   ├── footer.html          # 底部模板
│   └── home.html            # 首页模板
├── public/                  # 静态资源
│   ├── index.html           # 前端页面
│   ├── app.js               # 主入口（模块化）
│   ├── js/                  # JavaScript 模块
│   │   ├── theme.js         # 主题管理
│   │   ├── i18n.js          # 国际化
│   │   ├── cache.js         # 客户端缓存
│   │   ├── utils.js         # 工具函数
│   │   ├── posts.js         # 文章列表与目录树
│   │   ├── article.js       # 文章渲染
│   │   ├── toc.js           # 目录生成
│   │   └── media.js         # 代码复制、图片灯箱、PDF
│   └── css/                 # CSS 模块
│       ├── base.css         # 基础样式与变量
│       ├── layout.css       # 布局（侧边栏、头部）
│       ├── sidebar.css      # 导航菜单
│       ├── article.css      # 文章与 Markdown
│       ├── toc.css          # 右侧目录栏
│       ├── media.css        # 响应式适配
│       └── components.css   # UI 组件
├── config.example.json      # 配置模板
├── package.json             # 项目依赖
├── Dockerfile               # Docker 配置
└── docker-compose.yml       # Docker Compose
```

## 🛠️ 技术栈

- **后端**: Express.js
- **前端**: 原生 JavaScript
- **Git 操作**: simple-git
- **Markdown**: marked + highlight.js
- **PDF 渲染**: pdfjs-dist
- **容器化**: Docker

## 📄 许可证

MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 👥 贡献者

- [@sayunchuan](https://github.com/sayunchuan) - 增加多语言、Mermaid 支持、修复若干问题

## 🙏 致谢

- [Express.js](https://expressjs.com/)
- [marked](https://marked.js.org/)
- [highlight.js](https://highlightjs.org/)
- [simple-git](https://github.com/steveukx/git-js)
- [PDF.js](https://mozilla.github.io/pdf.js/)

---

<div align="center">

**如果这个项目对你有帮助，请给个 ⭐ Star！**

</div>
