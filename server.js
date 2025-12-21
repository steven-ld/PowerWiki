/**
 * PowerWiki Server
 * 
 * 基于 Express.js 的 Markdown 知识库服务器
 * 支持从 Git 仓库自动拉取和展示 Markdown 文档
 * 
 * @author PowerWiki Team
 * @version 1.0.0
 */

const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const GitManager = require('./utils/gitManager');
const { parseMarkdown } = require('./utils/markdownParser');

const app = express();

// 加载配置文件
let config;
try {
  config = require('./config.json');
} catch (error) {
  console.error('❌ 配置文件加载失败，请确保 config.json 文件存在');
  console.error('💡 提示: 可以复制 config.example.json 为 config.json 并修改配置');
  process.exit(1);
}

// 初始化 GitManager
const gitManager = new GitManager(config.gitRepo, config.repoBranch, './.git-repos');

// 中间件
app.use(express.json());
app.use(express.static('public'));

/**
 * 读取模板文件
 * @param {string} templateName - 模板名称（不含扩展名）
 * @returns {string} 模板内容
 */
function readTemplate(templateName) {
  try {
    const templatePath = path.join(__dirname, 'templates', `${templateName}.html`);
    if (fs.existsSync(templatePath)) {
      return fs.readFileSync(templatePath, 'utf-8');
    }
  } catch (error) {
    console.error(`读取模板 ${templateName} 失败:`, error);
  }
  return '';
}

/**
 * 渲染模板，替换变量占位符
 * @param {string} template - 模板内容
 * @param {Object} data - 数据对象
 * @returns {string} 渲染后的内容
 */
function renderTemplate(template, data) {
  let rendered = template;
  Object.keys(data).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    rendered = rendered.replace(regex, data[key]);
  });
  return rendered;
}

/**
 * 初始化并同步 Git 仓库
 * @returns {Promise<void>}
 */
async function initRepo() {
  try {
    console.log('📦 正在同步 Git 仓库...');
    await gitManager.cloneOrUpdate();
    console.log('✅ 仓库同步完成！');
  } catch (error) {
    console.error('❌ 初始化仓库失败:', error.message);
    console.error('💡 提示: 请检查 Git 仓库地址和网络连接');
  }
}

/**
 * 启动自动同步任务
 * 根据配置的间隔时间定期同步 Git 仓库
 */
function startAutoSync() {
  const interval = config.autoSyncInterval || 180000; // 默认3分钟
  setInterval(async () => {
    try {
      console.log('⏰ 自动同步 Git 仓库...');
      await gitManager.cloneOrUpdate();
      console.log('✅ 自动同步完成！');
    } catch (error) {
      console.error('❌ 自动同步失败:', error.message);
    }
  }, interval);
  console.log(`🔄 已启动自动同步，间隔: ${interval / 1000}秒`);
}

/**
 * 构建目录树结构
 * 将扁平的文件列表转换为树形结构
 * @param {Array} files - 文件列表
 * @returns {Object} 目录树对象
 */
function buildDirectoryTree(files) {
  const tree = {};

  files.forEach(file => {
    const parts = file.path.split('/');
    let current = tree;

    // 遍历路径的每一部分
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;

      if (isFile) {
        // 这是文件
        const fileName = part.replace(/\.(md|markdown)$/i, ''); // 去掉扩展名
        if (!current.files) {
          current.files = [];
        }
        current.files.push({
          name: fileName,
          path: file.path,
          fullName: file.name,
          modified: file.modified,
          size: file.size
        });
      } else {
        // 这是目录
        if (!current.dirs) {
          current.dirs = {};
        }
        if (!current.dirs[part]) {
          current.dirs[part] = {};
        }
        current = current.dirs[part];
      }
    }
  });

  return tree;
}

// API: 获取所有文章列表（返回目录树结构）
app.get('/api/posts', async (req, res) => {
  try {
    const files = await gitManager.getAllMarkdownFiles(config.mdPath);
    const tree = buildDirectoryTree(files);
    res.json({ tree, flat: files }); // 同时返回树结构和扁平列表（用于搜索）
  } catch (error) {
    console.error('获取文章列表失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: 获取单篇文章内容
app.get('/api/post/*', async (req, res) => {
  try {
    // 获取路径参数，可能需要解码
    let filePath = req.params[0];
    // 如果路径包含编码字符，尝试解码
    try {
      filePath = decodeURIComponent(filePath);
    } catch (e) {
      // 如果解码失败，使用原始路径
      console.warn('路径解码失败，使用原始路径:', filePath);
    }
    const content = await gitManager.readMarkdownFile(filePath);
    const parsed = parseMarkdown(content);
    const fileInfo = await gitManager.getFileInfo(filePath);

    // 使用文件名作为标题（去掉扩展名）
    const fileName = fileInfo.name.replace(/\.(md|markdown)$/i, '');
    const title = fileName || parsed.title;

    res.json({
      ...parsed,
      title, // 使用文件名作为标题
      fileInfo,
      path: filePath
    });
  } catch (error) {
    console.error('获取文章失败:', error);
    res.status(404).json({ error: '文章不存在' });
  }
});

// API: 获取网站配置
app.get('/api/config', (req, res) => {
  const headerTemplate = readTemplate('header');
  const footerTemplate = readTemplate('footer');
  const homeTemplate = readTemplate('home');

  const headerData = {
    siteTitle: config.siteTitle || config.title,
    siteDescription: config.siteDescription || config.description
  };

  const footerData = {
    currentYear: new Date().getFullYear(),
    siteTitle: config.siteTitle || config.title
  };

  const homeData = {
    siteTitle: config.siteTitle || config.title,
    siteDescription: config.siteDescription || config.description
  };

  res.json({
    header: renderTemplate(headerTemplate, headerData),
    footer: renderTemplate(footerTemplate, footerData),
    home: renderTemplate(homeTemplate, homeData),
    siteTitle: config.siteTitle || config.title,
    siteDescription: config.siteDescription || config.description
  });
});

// 首页
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 文章详情页
app.get('/post/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = config.port || 3000;

/**
 * 启动服务器
 * 先启动 HTTP 服务，然后异步同步仓库，避免阻塞
 */
async function startServer() {
  // 先启动服务器，再同步仓库（避免仓库同步失败导致服务器无法启动）
  app.listen(PORT, () => {
    console.log('════════════════════════════════════════');
    console.log(`🚀 博客服务器已启动: http://localhost:${PORT}`);
    console.log(`📝 Git 仓库: ${config.gitRepo}`);
    console.log(`🌿 分支: ${config.repoBranch}`);
    console.log(`⏱️  自动同步间隔: ${(config.autoSyncInterval || 180000) / 1000}秒`);
    console.log('════════════════════════════════════════');
    console.log(`💡 提示: 如果仓库同步失败，请检查 config.json 中的 gitRepo 配置`);
  });

  // 异步同步仓库（不阻塞服务器启动）
  initRepo().catch(err => {
    console.error('⚠️  仓库同步失败，但服务器已启动。请检查 Git 仓库配置。');
  });

  // 启动自动同步
  startAutoSync();
}

// 启动服务器
startServer().catch(console.error);

