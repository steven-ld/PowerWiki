# PowerWiki

<div align="center">

![PowerWiki](https://img.shields.io/badge/PowerWiki-Git--Based%20Wiki-3370ff?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![Node](https://img.shields.io/badge/Node.js->=14-339933?style=for-the-badge&logo=node.js&logoColor=white)

A modern Git-based Markdown wiki system with auto-sync, syntax highlighting, and Feishu-style UI.

**🔗 Live Demo: [https://ga666666.cn](https://ga666666.cn)**

[English](README.md) • [中文](README_ZH.md)

</div>

---

## ✨ Features

- 📚 **Auto Sync** - Automatically sync from Git repositories
- 🎨 **Syntax Highlighting** - Code highlighting powered by highlight.js
- 📱 **Responsive Design** - Works on all devices
- 📑 **Auto TOC** - Automatic table of contents generation with collapsible sections
- 🎯 **Feishu-style UI** - Clean and modern interface
- 📄 **PDF Support** - Render PDF files as high-quality images
- 📊 **View Statistics** - Track article views
- ⚡ **Lightweight** - No database required
- 🔍 **SEO Optimized** - Full SEO optimization for search engine visibility
- 📋 **Frontmatter Support** - Parse YAML frontmatter for metadata
- 🖼️ **Local Images** - Support for local images in Markdown

## 🚀 Quick Start

### Prerequisites

- Node.js >= 14.0.0
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/steven-ld/PowerWiki.git
cd PowerWiki

# Install dependencies
npm install

# Create config file
cp config.example.json config.json

# Start the server
npm start
```

Visit `http://localhost:3000` in your browser.

## ⚙️ Configuration

Edit `config.json`:

```json
{
  "gitRepo": "https://github.com/your-username/your-wiki-repo.git",
  "repoBranch": "main",
  "port": 3000,
  "siteTitle": "My Wiki",
  "siteDescription": "Knowledge Base",
  "autoSyncInterval": 180000,
  "pages": {
    "home": "README.md",
    "about": "ABOUT.md"
  }
}
```

| Option | Description | Default |
|--------|-------------|---------|
| `gitRepo` | Git repository URL | - |
| `repoBranch` | Branch name | `main` |
| `mdPath` | Markdown files subdirectory | `""` |
| `port` | Server port | `3000` |
| `siteTitle` | Site title | `PowerWiki` |
| `siteDescription` | Site description | `Wiki` |
| `autoSyncInterval` | Auto sync interval (ms) | `180000` |
| `pages.home` | Home page file | `""` |
| `pages.about` | About page file | `""` |

## 📂 Article Folder Structure

PowerWiki supports organizing articles with a hierarchical folder structure. Articles are stored in your Git repository and synced automatically.

### Folder Structure Example

```
your-wiki-repo/
├── README.md              # Home page
├── ABOUT.md               # About page
├── 架构设计/              # Category folder (Chinese supported)
│   ├── 物模型：IoT设备标准化实践.md
│   ├── TLS加密算法深度解析.md
│   └── README.md          # Category index page
├── 项目实践/              # Another category
│   ├── OpenResty + Redis 短链接服务系统.md
│   └── README.md
└── 音视频/
    ├── WebRTC 信令服务详解.md
    └── README.md
```

### Article Frontmatter Format

Each article can include YAML frontmatter for metadata:

```yaml
---
title: Article Title
description: Article description for SEO
author: Author Name
date: 2026-01-10
updated: 2026-01-10
keywords: keyword1, keyword2, keyword3
tags: [tag1, tag2]
---
```

| Field | Required | Description |
|-------|----------|-------------|
| `title` | Yes | Article title (displayed as page title) |
| `description` | No | SEO meta description |
| `author` | No | Author name |
| `date` | No | Creation date (YYYY-MM-DD) |
| `updated` | No | Last modified date (YYYY-MM-DD) |
| `keywords` | No | SEO keywords (comma-separated) |
| `tags` | No | Article tags (array) |

### Local Images

Place images in a folder relative to your Markdown file:

```
your-wiki-repo/
├── 架构设计/
│   ├── 物模型/
│   │   ├── architecture.png
│   │   └── README.md
```

Reference in Markdown:
```markdown
![Architecture](architecture.png)
```

## 📁 Project Structure

```
PowerWiki/
├── server.js              # Express server
├── config.example.json    # Config template
├── package.json           # Dependencies
├── utils/
│   ├── gitManager.js      # Git operations
│   └── markdownParser.js  # Markdown parser
├── templates/
│   ├── header.html        # Header template
│   ├── footer.html        # Footer template
│   └── home.html          # Home template
└── public/
    ├── index.html         # Frontend HTML
    ├── styles.css         # Styles
    └── app.js             # Frontend JS
```

## 🛠️ Tech Stack

- **Backend**: Express.js
- **Frontend**: Vanilla JavaScript
- **Git**: simple-git
- **Markdown**: marked + highlight.js
- **PDF**: pdfjs-dist

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Credits

- [Express.js](https://expressjs.com/)
- [marked](https://marked.js.org/)
- [highlight.js](https://highlightjs.org/)
- [simple-git](https://github.com/steveukx/git-js)
- [PDF.js](https://mozilla.github.io/pdf.js/)

---

<div align="center">

**If this project helps you, please give it a ⭐ Star!**

</div>
