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
- 📑 **自动目录** - 自动生成文章目录，支持点击跳转
- 🎯 **飞书风格** - 简约现代的界面设计
- 📄 **PDF 支持** - 高清渲染 PDF 文件
- 📊 **访问统计** - 自动统计文章查看量
- ⚡ **轻量级** - 无需数据库

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

### 环境变量

PowerWiki 支持通过环境变量进行灵活配置（特别适用于 Docker 部署）：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `CONFIG_PATH` | `./config.json` | 配置文件路径 |
| `DATA_DIR` | 应用根目录 | 统计数据和访问日志存储目录 |
| `GIT_CACHE_DIR` | `./.git-repos` | Git 仓库缓存目录 |
| `LANG` | `zh-CN` | 控制台输出语言（`zh-CN`、`en`） |

使用示例：

```bash
# 使用自定义路径
CONFIG_PATH=/etc/powerwiki/config.json DATA_DIR=/var/lib/powerwiki npm start

# 使用英文控制台输出
LANG=en npm start
```

## 📁 项目结构

```
PowerWiki/
├── server.js              # Express 服务器
├── config.example.json    # 配置模板
├── package.json           # 项目依赖
├── locales/               # 多语言翻译
│   ├── zh-CN.json         # 简体中文
│   ├── en.json            # 英文
│   └── index.js           # 翻译加载器
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

