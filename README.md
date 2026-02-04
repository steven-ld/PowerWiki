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

- **Auto Sync** - Automatically sync from Git repositories
- **Syntax Highlighting** - Code highlighting powered by highlight.js
- **Responsive Design** - Works on all devices
- **Auto TOC** - Automatic table of contents generation
- **Modern UI** - Clean and intuitive interface
- **PDF Support** - Render PDF files as images
- **View Statistics** - Track article views
- **Lightweight** - No database required
- **SEO Optimized** - Full SEO optimization
- **Frontmatter Support** - Parse YAML metadata
- **Local Images** - Support for local images in Markdown
- **Multi-language** - Chinese and English support
- **Docker Ready** - Full Docker support

## 🚀 Quick Start

### Prerequisites

- Node.js >= 14.0.0
- Git

### Option 1: Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/steven-ld/PowerWiki.git
cd PowerWiki

# Create config file
cp config.example.json config.json
# Edit config.json with your Git repository URL

# Start with Docker Compose
docker-compose up -d
```

### Option 2: Node.js

```bash
# Clone the repository
git clone https://github.com/steven-ld/PowerWiki.git
cd PowerWiki

# Install dependencies
npm install

# Create config file
cp config.example.json config.json
# Edit config.json with your Git repository URL

# Start the server
npm start
```

Visit `http://localhost:3150` in your browser.

## ⚙️ Configuration

Edit `config.json`:

```json
{
  "gitRepo": "https://github.com/your-username/your-wiki-repo.git",
  "repoBranch": "main",
  "port": 3150,
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
| `port` | Server port | `3150` |
| `siteTitle` | Site title | `PowerWiki` |
| `siteDescription` | Site description | `Wiki` |
| `autoSyncInterval` | Auto sync interval (ms) | `180000` |
| `pages.home` | Home page file | `""` |
| `pages.about` | About page file | `""` |

## 🌍 Environment Variables

PowerWiki supports environment variables for flexible deployment:

```bash
# Configuration file path
CONFIG_PATH=/path/to/your/config.json

# Data storage directory (for stats and logs)
DATA_DIR=/path/to/data/directory

# Git repository cache directory
GIT_CACHE_DIR=/path/to/git/cache

# Language setting (zh-CN or en)
LANG=zh-CN
```

Copy `.env.example` to `.env` and customize as needed.

## 🐳 Docker Deployment

### Quick Start with Docker Compose

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Manual Docker Commands

```bash
# Build image
docker build -t powerwiki .

# Run container
docker run -d \
  --name powerwiki \
  -p 3150:3150 \
  -v $(pwd)/config.json:/app/config.json:ro \
  -v powerwiki_data:/app/data \
  -v powerwiki_cache:/app/cache \
  -e LANG=zh-CN \
  powerwiki
```

### Production Deployment

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

## 📂 Article Organization

PowerWiki supports hierarchical folder structure for organizing articles:

```
your-wiki-repo/
├── README.md              # Home page
├── ABOUT.md               # About page
├── images/                # Global images (optional)
├── Architecture/          # Category folder
│   ├── images/            # Category images
│   ├── IoT-Device-Standards.md
│   ├── TLS-Encryption.md
│   └── README.md          # Category index
├── Projects/              # Another category
│   ├── images/
│   ├── URL-Shortener.md
│   └── README.md
└── Media/
    ├── images/
    ├── WebRTC-Signaling.md
    └── README.md
```

### Article Frontmatter

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

## 🌐 Multi-language Support

PowerWiki supports multiple languages for console output:

### Supported Languages
- **Chinese Simplified** (`zh-CN`) - Default
- **English** (`en`)

### Usage

```bash
# Start with English
LANG=en npm start

# Start with Chinese
LANG=zh-CN npm start

# Or use npm scripts
npm run start:en
npm run start:zh
```

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev              # Start with nodemon
npm run test:env         # Test environment variables

# Docker
npm run docker:build     # Build Docker image
npm run docker:run       # Run Docker container
npm run docker:stop      # Stop and remove container
npm run docker:logs      # View container logs

# Language variants
npm run start:en         # Start with English
npm run start:zh         # Start with Chinese
```

### Project Structure

```
PowerWiki/
├── server.js              # Express server
├── config.example.json    # Config template
├── package.json           # Dependencies
├── Dockerfile             # Docker configuration
├── docker-compose.yml     # Docker Compose
├── docs/                  # Documentation
│   ├── DOCKER.md          # Docker deployment guide
│   └── ENVIRONMENT.md     # Environment variables guide
├── config/                # Configuration modules
│   ├── env.js             # Environment variables
│   └── i18n.js            # Internationalization
├── locales/               # Translation files
│   ├── zh-CN.json         # Chinese translations
│   └── en.json            # English translations
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
- **Containerization**: Docker

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 👥 Contributors

- [@sayunchuan](https://github.com/sayunchuan) - Multi-language support

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
