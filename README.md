# PowerWiki

<div align="center">

![PowerWiki](https://img.shields.io/badge/PowerWiki-Git--Based%20Wiki-3370ff?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![Node](https://img.shields.io/badge/Node.js->=14-339933?style=for-the-badge&logo=node.js&logoColor=white)

A modern Git-based Markdown wiki system with auto-sync, syntax highlighting, and Feishu-style UI.

[English](README.md) • [中文](README_ZH.md)

</div>

---

## ✨ Features

- 📚 **Auto Sync** - Automatically sync from Git repositories
- 🎨 **Syntax Highlighting** - Code highlighting powered by highlight.js
- 📱 **Responsive Design** - Works on all devices
- 📑 **Auto TOC** - Automatic table of contents generation
- 🎯 **Feishu-style UI** - Clean and modern interface
- 📄 **PDF Support** - Render PDF files as high-quality images
- 📊 **View Statistics** - Track article views
- ⚡ **Lightweight** - No database required

## 🚀 Quick Start

### Prerequisites

- Node.js >= 14.0.0
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/PowerWiki.git
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
