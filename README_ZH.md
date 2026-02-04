# PowerWiki

<div align="center">

![PowerWiki](https://img.shields.io/badge/PowerWiki-Git%E7%9F%A5%E8%AF%86%E5%BA%93-3370ff?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![Node](https://img.shields.io/badge/Node.js->=14-339933?style=for-the-badge&logo=node.js&logoColor=white)

一个现代化的基于 Git 仓库的 Markdown 知识库系统，支持自动同步、代码高亮、飞书风格 UI。

**🔗 在线演示: [https://ga666666.cn](https://ga666666.cn)**

[English](README.md) • [中文](README_ZH.md)

</div>

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

### 使用 Docker Compose 快速启动

```bash
# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 手动 Docker 命令

```bash
# 构建镜像
docker build -t powerwiki .

# 运行容器
docker run -d \
  --name powerwiki \
  -p 3150:3150 \
  -v $(pwd)/config.json:/app/config.json:ro \
  -v powerwiki_data:/app/data \
  -v powerwiki_cache:/app/cache \
  -e LANG=zh-CN \
  powerwiki
```

### 生产环境部署

```yaml
version: '3.8'
services:
  powerwiki:
    image: powerwiki:latest
    ports:
      - "3150:3150"
    environment:
      - NODE_ENV=production
      - DATA_DIR=/app/data
      - GIT_CACHE_DIR=/app/cache
      - LANG=zh-CN
    volumes:
      - ./config.json:/app/config.json:ro
      - powerwiki_data:/app/data
      - powerwiki_cache:/app/cache
    restart: unless-stopped
```

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

## 🌐 多语言支持

PowerWiki 支持多语言控制台输出：

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
├── server.js              # Express 服务器
├── config.example.json    # 配置模板
├── package.json           # 项目依赖
├── Dockerfile             # Docker 配置
├── docker-compose.yml     # Docker Compose
├── docs/                  # 文档目录
│   ├── DOCKER.md          # Docker 部署指南
│   └── ENVIRONMENT.md     # 环境变量指南
├── config/                # 配置模块
│   ├── env.js             # 环境变量
│   └── i18n.js            # 国际化
├── locales/               # 翻译文件
│   ├── zh-CN.json         # 中文翻译
│   └── en.json            # 英文翻译
├── utils/
│   ├── gitManager.js      # Git 操作模块
│   └── markdownParser.js  # Markdown 解析模块
├── templates/
│   ├── header.html        # 头部模板
│   ├── footer.html        # 底部模板
│   └── home.html          # 首页模板
└── public/
    ├── index.html         # 前端页面
    ├── styles.css         # 样式文件
    └── app.js             # 前端逻辑
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

- [@sayunchuan](https://github.com/sayunchuan) - 多语言支持

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
