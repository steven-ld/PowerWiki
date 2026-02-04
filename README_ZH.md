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

- 📚 **自动同步** - 从 Git 仓库自动拉取和更新文档
- 🎨 **代码高亮** - 支持多种编程语言语法高亮
- 📱 **响应式设计** - 完美适配各种设备屏幕
- 📑 **自动目录** - 自动生成文章目录，支持折叠展开和点击跳转
- 🎯 **飞书风格** - 简约现代的界面设计
- 📄 **PDF 支持** - 高清渲染 PDF 文件
- 📊 **访问统计** - 自动统计文章查看量
- ⚡ **轻量级** - 无需数据库
- 🔍 **SEO 优化** - 全面优化搜索引擎可见性
- 📋 **Frontmatter 支持** - 解析 YAML 元信息
- 🖼️ **本地图片** - 支持 Markdown 中引用本地图片

## 🚀 快速开始

### 前置要求

- Node.js >= 14.0.0
- Git

### 安装步骤

```bash
# 克隆项目
git clone https://github.com/steven-ld/PowerWiki.git
cd PowerWiki

# 安装依赖
npm install

# 创建配置文件
cp config.example.json config.json

# 启动服务器
npm start
```

打开浏览器访问 `http://localhost:3000`

## ⚙️ 配置说明

编辑 `config.json`：

```json
{
  "gitRepo": "https://github.com/your-username/your-wiki-repo.git",
  "repoBranch": "main",
  "port": 3000,
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
| `port` | 服务器端口 | `3000` |
| `siteTitle` | 网站标题 | `PowerWiki` |
| `siteDescription` | 网站描述 | `知识库` |
| `autoSyncInterval` | 自动同步间隔（毫秒） | `180000` |
| `pages.home` | 首页文件 | `""` |
| `pages.about` | 关于页面文件 | `""` |

## 📂 文章文件夹结构

PowerWiki 支持层次化的文件夹结构来组织文章。文章存储在 Git 仓库中，自动同步。

### 文件夹结构示例

```
your-wiki-repo/
├── README.md              # 首页
├── ABOUT.md               # 关于页面
├── 架构设计/              # 分类文件夹（支持中文）
│   ├── 物模型：IoT设备标准化实践.md
│   ├── TLS加密算法深度解析.md
│   └── README.md          # 分类索引页
├── 项目实践/               # 另一个分类
│   ├── OpenResty + Redis 短链接服务系统.md
│   └── README.md
└── 音视频/
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

| 字段 | 必填 | 说明 |
|------|------|------|
| `title` | 是 | 文章标题（显示为页面标题） |
| `description` | 否 | SEO meta 描述 |
| `author` | 否 | 作者名称 |
| `date` | 否 | 创建日期（YYYY-MM-DD） |
| `updated` | 否 | 最后修改日期（YYYY-MM-DD） |
| `keywords` | 否 | SEO 关键词（逗号分隔） |
| `tags` | 否 | 文章标签（数组） |

### 本地图片

将图片放在 Markdown 文件相对路径的文件夹中：

```
your-wiki-repo/
├── 架构设计/
│   ├── 物模型/
│   │   ├── architecture.png
│   │   └── README.md
```

在 Markdown 中引用：
```markdown
![架构图](architecture.png)
```

## 📁 项目结构

```
PowerWiki/
├── server.js              # Express 服务器
├── config.example.json    # 配置模板
├── package.json           # 项目依赖
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

## 📄 许可证

MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

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

