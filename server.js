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
const cacheManager = require('./utils/cacheManager');

const app = express();

// 统计文件路径
const statsFilePath = path.join(__dirname, '.stats.json');

/**
 * 读取统计数据
 * @returns {Object} 统计数据对象
 */
function readStats() {
  try {
    if (fs.existsSync(statsFilePath)) {
      const data = fs.readFileSync(statsFilePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('读取统计数据失败:', error);
  }
  return {
    totalViews: 0,
    postViews: {}
  };
}

/**
 * 保存统计数据
 * @param {Object} stats - 统计数据对象
 */
function saveStats(stats) {
  try {
    fs.writeFileSync(statsFilePath, JSON.stringify(stats, null, 2), 'utf-8');
  } catch (error) {
    console.error('保存统计数据失败:', error);
  }
}

/**
 * 记录文章访问
 * @param {string} filePath - 文件路径
 */
function recordPostView(filePath) {
  const stats = readStats();
  stats.totalViews = (stats.totalViews || 0) + 1;
  stats.postViews = stats.postViews || {};
  stats.postViews[filePath] = (stats.postViews[filePath] || 0) + 1;
  saveStats(stats);
  return stats.postViews[filePath];
}

// 加载配置文件
let config;
try {
  config = require('./config.json');
  
  // 验证配置
  if (!config.gitRepo) {
    console.error('❌ 配置错误: gitRepo 是必需的');
    process.exit(1);
  }
  
  // 设置默认值
  config.pages = config.pages || {};
  config.pages.home = config.pages.home || '';
  config.pages.about = config.pages.about || '';
  
} catch (error) {
  console.error('❌ 配置文件加载失败，请确保 config.json 文件存在');
  console.error('💡 提示: 可以复制 config.example.json 为 config.json 并修改配置');
  process.exit(1);
}

// 初始化 GitManager
const gitManager = new GitManager(config.gitRepo, config.repoBranch, './.git-repos');

// 仓库初始化状态
let repoInitialized = false;
let repoInitializing = false;

// 中间件
app.use(express.json());
app.use(express.static('public'));

// 提供 PDF.js 静态文件
app.use('/pdfjs', express.static(path.join(__dirname, 'node_modules', 'pdfjs-dist')));

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
  if (repoInitializing) {
    return; // 已经在初始化中，避免重复初始化
  }
  
  repoInitializing = true;
  try {
    console.log('📦 正在同步 Git 仓库...');
    const result = await gitManager.cloneOrUpdate();
    if (result.updated) {
      console.log('✅ 仓库已更新！');
      // 清除相关缓存
      cacheManager.delete('posts');
      cacheManager.delete('config');
      console.log('🗑️  已清除相关缓存');
    } else {
      console.log('✅ 仓库已是最新版本');
    }
    repoInitialized = true;
    // 清除配置缓存，让前端重新加载
    cacheManager.delete('config');
  } catch (error) {
    console.error('❌ 初始化仓库失败:', error.message);
    console.error('💡 提示: 请检查 Git 仓库地址和网络连接');
    repoInitialized = false; // 初始化失败
  } finally {
    repoInitializing = false;
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
      const result = await gitManager.cloneOrUpdate();
      if (result.updated) {
        console.log('⏰ [' + new Date().toLocaleString() + '] 仓库有更新，已自动同步');
        // 清除相关缓存
        cacheManager.delete('posts');
        cacheManager.delete('config');
        console.log('🗑️  已清除相关缓存');
      }
      // 没有更新时不打印日志
    } catch (error) {
      console.error('❌ 自动同步失败:', error.message);
    }
  }, interval);
  console.log(`🔄 已启动自动同步，间隔: ${interval / 1000}秒`);
}

/**
 * 构建目录树结构
 * 将扁平的文件列表转换为树形结构，并按更新时间排序
 * README.md 文件会被提取为目录的 readme 属性，不显示在文件列表中
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
        const fileName = part.replace(/\.(md|markdown|pdf)$/i, ''); // 去掉扩展名
        const isReadme = /^readme$/i.test(fileName);
        const isAbout = /^about$/i.test(fileName);
        
        const fileData = {
          name: fileName,
          path: file.path,
          fullName: file.name,
          created: file.created,
          modified: file.modified,
          size: file.size,
          type: file.type || (file.name.endsWith('.pdf') ? 'pdf' : 'markdown')
        };
        
        if (isReadme && fileData.type === 'markdown') {
          // README 文件作为目录的描述，不放入 files 列表
          current.readme = fileData;
        } else if (isAbout && fileData.type === 'markdown') {
          // ABOUT 文件也隐藏，不放入 files 列表
          current.about = fileData;
        } else {
          // 普通文件放入 files 列表
          if (!current.files) {
            current.files = [];
          }
          current.files.push(fileData);
        }
      } else {
        // 这是目录
        if (!current.dirs) {
          current.dirs = {};
        }
        if (!current.dirs[part]) {
          current.dirs[part] = {
            _maxModified: null // 用于存储目录下最新文件的修改时间
          };
        }
        current = current.dirs[part];
      }
    }
  });

  // 递归排序目录树
  function sortTree(node) {
    // 排序文件：按修改时间降序（最新的在前）
    if (node.files) {
      node.files.sort((a, b) => {
        const timeA = new Date(a.modified).getTime();
        const timeB = new Date(b.modified).getTime();
        return timeB - timeA; // 降序
      });
    }

    // 处理目录
    if (node.dirs) {
      const dirs = Object.keys(node.dirs);
      
      // 计算每个目录的最大修改时间
      dirs.forEach(dirName => {
        const dirNode = node.dirs[dirName];
        sortTree(dirNode);
        
        // 计算目录的最大修改时间（取目录下所有文件和子目录的最大值）
        let maxTime = null;
        if (dirNode.files && dirNode.files.length > 0) {
          maxTime = Math.max(...dirNode.files.map(f => new Date(f.modified).getTime()));
        }
        if (dirNode.dirs) {
          Object.keys(dirNode.dirs).forEach(subDirName => {
            const subDirMax = dirNode.dirs[subDirName]._maxModified;
            if (subDirMax && (!maxTime || subDirMax > maxTime)) {
              maxTime = subDirMax;
            }
          });
        }
        dirNode._maxModified = maxTime;
      });

      // 按最大修改时间排序目录（最新的在前）
      dirs.sort((a, b) => {
        const timeA = node.dirs[a]._maxModified || 0;
        const timeB = node.dirs[b]._maxModified || 0;
        return timeB - timeA; // 降序
      });

      // 重新构建排序后的目录对象
      const sortedDirs = {};
      dirs.forEach(dirName => {
        sortedDirs[dirName] = node.dirs[dirName];
      });
      node.dirs = sortedDirs;
    }
  }

  sortTree(tree);
  
  // 清理内部属性
  function cleanTree(node) {
    if (node._maxModified !== undefined) {
      delete node._maxModified;
    }
    if (node.dirs) {
      Object.keys(node.dirs).forEach(dirName => {
        cleanTree(node.dirs[dirName]);
      });
    }
  }
  
  cleanTree(tree);
  return tree;
}

// API: 生成 sitemap.xml
app.get('/sitemap.xml', async (req, res) => {
  try {
    // 检查缓存
    const cached = cacheManager.get('sitemap');
    if (cached) {
      res.setHeader('Content-Type', 'application/xml');
      res.send(cached);
      return;
    }

    const files = await gitManager.getAllMarkdownFiles(config.mdPath);
    const baseUrl = config.siteUrl || `${req.protocol}://${req.get('host')}`;
    
    let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
    sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    
    // 添加首页
    sitemap += '  <url>\n';
    sitemap += `    <loc>${baseUrl}/</loc>\n`;
    sitemap += '    <changefreq>daily</changefreq>\n';
    sitemap += '    <priority>1.0</priority>\n';
    sitemap += '  </url>\n';
    
    // 添加所有文章
    files.forEach(file => {
      if (!file.path.endsWith('.pdf')) { // PDF 文件不加入 sitemap
        const url = `${baseUrl}/post/${encodeURIComponent(file.path)}`;
        const lastmod = new Date(file.modified).toISOString().split('T')[0];
        
        sitemap += '  <url>\n';
        sitemap += `    <loc>${url}</loc>\n`;
        sitemap += `    <lastmod>${lastmod}</lastmod>\n`;
        sitemap += '    <changefreq>weekly</changefreq>\n';
        sitemap += '    <priority>0.8</priority>\n';
        sitemap += '  </url>\n';
      }
    });
    
    sitemap += '</urlset>';
    
    // 缓存 sitemap（1小时）
    cacheManager.set('sitemap', '', sitemap, 60 * 60 * 1000);
    
    res.setHeader('Content-Type', 'application/xml');
    res.send(sitemap);
  } catch (error) {
    console.error('生成 sitemap 失败:', error);
    res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><error>生成 sitemap 失败</error>');
  }
});

// API: 获取所有文章列表（返回目录树结构）
app.get('/api/posts', async (req, res) => {
  try {
    // 检查缓存
    const cached = cacheManager.get('posts');
    if (cached) {
      res.json(cached);
      return;
    }

    const files = await gitManager.getAllMarkdownFiles(config.mdPath);
    const tree = buildDirectoryTree(files);
    const result = { tree, flat: files };
    
    // 缓存结果（文章列表缓存10分钟）
    cacheManager.set('posts', '', result, 10 * 60 * 1000);
    
    res.json(result);
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
    
    // 检查缓存
    const cached = cacheManager.get('post', filePath);
    if (cached) {
      // 更新访问量（缓存命中时也要记录）
      const viewCount = recordPostView(filePath);
      cached.viewCount = viewCount;
      res.json(cached);
      return;
    }
    
    // 记录访问量
    const viewCount = recordPostView(filePath);
    
    // 检查是否为 PDF 文件
    if (filePath.endsWith('.pdf')) {
      const fileInfo = await gitManager.getFileInfo(filePath);
      const fileName = fileInfo.name.replace(/\.pdf$/i, '');
      
      const result = {
        type: 'pdf',
        title: fileName,
        fileInfo,
        path: filePath,
        html: '', // PDF 不需要 HTML
        description: 'PDF 文档',
        viewCount
      };
      
      // 缓存结果（PDF 文件缓存15分钟）
      cacheManager.set('post', filePath, result, 15 * 60 * 1000);
      
      res.json(result);
    } else {
      // Markdown 文件处理
      const content = await gitManager.readMarkdownFile(filePath);
      const parsed = parseMarkdown(content);
      const fileInfo = await gitManager.getFileInfo(filePath);

      // 使用文件名作为标题（去掉扩展名）
      const fileName = fileInfo.name.replace(/\.(md|markdown)$/i, '');
      const title = fileName || parsed.title;

      const result = {
        ...parsed,
        type: 'markdown',
        title, // 使用文件名作为标题
        fileInfo,
        path: filePath,
        viewCount
      };
      
      // 缓存结果（Markdown 文件缓存10分钟）
      cacheManager.set('post', filePath, result, 10 * 60 * 1000);
      
      res.json(result);
    }
  } catch (error) {
    console.error('获取文章失败:', error);
    res.status(404).json({ error: '文章不存在' });
  }
});

// API: 获取网站配置
app.get('/api/config', async (req, res) => {
  // 检查缓存
  const cached = cacheManager.get('config');
  if (cached) {
    res.json(cached);
    return;
  }

  const headerTemplate = readTemplate('header');
  const footerTemplate = readTemplate('footer');
  const homeTemplate = readTemplate('home');

  const stats = readStats();

  // 获取配置的页面路径
  const homePagePath = config.pages.home || '';
  const aboutPagePath = config.pages.about || '';

  // 尝试读取 README 文件作为首页内容
  // 只有在仓库已初始化时才尝试读取
  let homeContent = null;
  if (homePagePath && repoInitialized) {
    try {
      const content = await gitManager.readMarkdownFile(homePagePath);
      const parsed = parseMarkdown(content);
      homeContent = {
        html: parsed.html,
        title: parsed.title || '首页',
        path: homePagePath
      };
    } catch (error) {
      // 如果文件不存在，静默失败，使用默认首页
      console.warn(`⚠️  无法读取首页文件 ${homePagePath}:`, error.message);
      console.warn('💡 将使用默认欢迎页面');
    }
  }

  // 构建关于页面路径
  let aboutPath = '/post/README.md'; // 默认值
  if (aboutPagePath) {
    aboutPath = `/post/${encodeURIComponent(aboutPagePath)}`;
  } else if (homePagePath && !aboutPagePath) {
    // 如果没有配置 about，但有 home，使用 home 作为 about
    aboutPath = `/post/${encodeURIComponent(homePagePath)}`;
  }

  const headerData = {
    siteTitle: config.siteTitle || config.title,
    siteDescription: config.siteDescription || config.description,
    aboutPath: aboutPath
  };

  const footerData = {
    currentYear: new Date().getFullYear(),
    siteTitle: config.siteTitle || config.title,
    totalViews: stats.totalViews || 0,
    totalPosts: stats.postViews ? Object.keys(stats.postViews).length : 0
  };

  const homeData = {
    siteTitle: config.siteTitle || config.title,
    siteDescription: config.siteDescription || config.description
  };

  const result = {
    header: renderTemplate(headerTemplate, headerData),
    footer: renderTemplate(footerTemplate, footerData),
    home: renderTemplate(homeTemplate, homeData),
    homeContent: homeContent, // README 文件内容
    siteTitle: config.siteTitle || config.title,
    siteDescription: config.siteDescription || config.description,
    pages: {
      home: homePagePath,
      about: aboutPagePath
    }
  };

  // 缓存结果（配置缓存30分钟）
  cacheManager.set('config', '', result, 30 * 60 * 1000);

  res.json(result);
});

// API: 获取统计数据
app.get('/api/stats', (req, res) => {
  // 统计数据缓存时间较短（1分钟），因为访问量会频繁变化
  const cached = cacheManager.get('stats');
  if (cached) {
    res.json(cached);
    return;
  }

  const stats = readStats();
  
  // 缓存1分钟
  cacheManager.set('stats', '', stats, 60 * 1000);
  
  res.json(stats);
});

// API: 获取缓存统计信息（调试用）
app.get('/api/cache/stats', (req, res) => {
  res.json(cacheManager.getStats());
});

// API: 清除缓存（管理员用）
app.post('/api/cache/clear', (req, res) => {
  const { type, key } = req.body;
  
  if (type) {
    cacheManager.delete(type, key);
    res.json({ success: true, message: `已清除缓存: ${type}${key ? `/${key}` : ''}` });
  } else {
    cacheManager.clear();
    res.json({ success: true, message: '已清除所有缓存' });
  }
});

// robots.txt
app.get('/robots.txt', (req, res) => {
  const baseUrl = config.siteUrl || `${req.protocol}://${req.get('host')}`;
  const robotsTxt = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /pdfjs/

Sitemap: ${baseUrl}/sitemap.xml
`;
  res.setHeader('Content-Type', 'text/plain');
  res.send(robotsTxt);
});

// 首页 - 支持服务端渲染（SSR）用于 SEO
app.get('/', async (req, res) => {
  // 检查是否是搜索引擎爬虫
  const userAgent = req.get('user-agent') || '';
  const isBot = /bot|crawler|spider|crawling|googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|sogou|exabot|facebot|ia_archiver/i.test(userAgent);
  
  if (isBot) {
    // 为搜索引擎提供预渲染的 HTML
    try {
      const headerTemplate = readTemplate('header');
      const footerTemplate = readTemplate('footer');
      const homeTemplate = readTemplate('home');
      
      const stats = readStats();
      const homePagePath = config.pages.home || '';
      
      let homeContent = null;
      if (homePagePath) {
        try {
          const content = await gitManager.readMarkdownFile(homePagePath);
          const parsed = parseMarkdown(content);
          homeContent = {
            html: parsed.html,
            title: parsed.title || '首页',
            path: homePagePath
          };
        } catch (error) {
          // 静默失败
        }
      }
      
      const headerData = {
        siteTitle: config.siteTitle || config.title,
        siteDescription: config.siteDescription || config.description,
        aboutPath: config.pages.about ? `/post/${encodeURIComponent(config.pages.about)}` : '/post/README.md'
      };
      
      const footerData = {
        currentYear: new Date().getFullYear(),
        siteTitle: config.siteTitle || config.title,
        totalViews: stats.totalViews || 0,
        totalPosts: stats.postViews ? Object.keys(stats.postViews).length : 0
      };
      
      const homeData = {
        siteTitle: config.siteTitle || config.title,
        siteDescription: config.siteDescription || config.description
      };
      
      const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${config.siteTitle || 'PowerWiki'} - ${config.siteDescription || '知识库'}</title>
    <meta name="description" content="${config.siteDescription || 'PowerWiki - 一个现代化的知识库系统'}">
    <meta name="keywords" content="知识库,文档,Markdown,Wiki">
    <link rel="canonical" href="${config.siteUrl || `${req.protocol}://${req.get('host')}`}">
    <link rel="stylesheet" href="/styles.css">
</head>
<body>
    <div class="app-container">
        <div id="siteHeader">${renderTemplate(headerTemplate, headerData)}</div>
        <main class="main-content">
            <div id="homeView" class="view active">
                ${renderTemplate(homeTemplate, homeData)}
                ${homeContent ? `<div id="homeContent">${homeContent.html}</div>` : ''}
            </div>
        </main>
        <div id="siteFooter">${renderTemplate(footerTemplate, footerData)}</div>
    </div>
</body>
</html>`;
      
      res.send(html);
      return;
    } catch (error) {
      console.error('SSR 渲染失败，回退到普通模式:', error);
    }
  }
  
  // 普通用户或 SSR 失败时，返回普通 HTML
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API: 获取 PDF 文件（直接返回文件流）
// 注意：PDF 文件不缓存，因为文件可能较大
app.get('/api/pdf/*', async (req, res) => {
  try {
    let filePath = req.params[0];
    try {
      filePath = decodeURIComponent(filePath);
    } catch (e) {
      console.warn('路径解码失败，使用原始路径:', filePath);
    }
    
    if (!filePath.endsWith('.pdf')) {
      return res.status(400).json({ error: '不是 PDF 文件' });
    }
    
    // 直接读取文件，不缓存
    const pdfBuffer = await gitManager.readPdfFile(filePath);
    const fileName = path.basename(filePath);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('获取 PDF 失败:', error);
    res.status(404).json({ error: 'PDF 文件不存在' });
  }
});

// 文章详情页 - 支持服务端渲染（SSR）用于 SEO
app.get('/post/*', async (req, res) => {
  // 检查是否是搜索引擎爬虫
  const userAgent = req.get('user-agent') || '';
  const isBot = /bot|crawler|spider|crawling|googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|sogou|exabot|facebot|ia_archiver/i.test(userAgent);
  
  if (isBot) {
    // 为搜索引擎提供预渲染的 HTML
    try {
      let filePath = req.params[0];
      try {
        filePath = decodeURIComponent(filePath);
      } catch (e) {
        // 解码失败，使用原始路径
      }
      
      // 检查是否为 PDF 文件
      if (filePath.endsWith('.pdf')) {
        // PDF 文件不进行 SSR
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
        return;
      }
      
      // 读取文章内容
      const content = await gitManager.readMarkdownFile(filePath);
      const parsed = parseMarkdown(content);
      const fileInfo = await gitManager.getFileInfo(filePath);
      const fileName = fileInfo.name.replace(/\.(md|markdown)$/i, '');
      const title = fileName || parsed.title || '文章';
      
      const headerTemplate = readTemplate('header');
      const footerTemplate = readTemplate('footer');
      const stats = readStats();
      
      const headerData = {
        siteTitle: config.siteTitle || config.title,
        siteDescription: config.siteDescription || config.description,
        aboutPath: config.pages.about ? `/post/${encodeURIComponent(config.pages.about)}` : '/post/README.md'
      };
      
      const footerData = {
        currentYear: new Date().getFullYear(),
        siteTitle: config.siteTitle || config.title,
        totalViews: stats.totalViews || 0,
        totalPosts: stats.postViews ? Object.keys(stats.postViews).length : 0
      };
      
      const baseUrl = config.siteUrl || `${req.protocol}://${req.get('host')}`;
      const articleUrl = `${baseUrl}/post/${encodeURIComponent(filePath)}`;
      const articleTitle = `${title} - ${config.siteTitle || 'PowerWiki'}`;
      const articleDescription = parsed.description || title || 'PowerWiki 文章';
      
      // 提取第一张图片
      let articleImage = '';
      if (parsed.html) {
        const imgMatch = parsed.html.match(/<img[^>]+src="([^"]+)"/i);
        if (imgMatch && imgMatch[1]) {
          articleImage = imgMatch[1].startsWith('http') ? imgMatch[1] : `${baseUrl}${imgMatch[1]}`;
        }
      }
      
      const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${articleTitle}</title>
    <meta name="description" content="${articleDescription}">
    <meta name="keywords" content="${title},知识库,文档">
    <link rel="canonical" href="${articleUrl}">
    
    <!-- Open Graph -->
    <meta property="og:type" content="article">
    <meta property="og:url" content="${articleUrl}">
    <meta property="og:title" content="${articleTitle}">
    <meta property="og:description" content="${articleDescription}">
    ${articleImage ? `<meta property="og:image" content="${articleImage}">` : ''}
    <meta property="og:site_name" content="${config.siteTitle || 'PowerWiki'}">
    
    <!-- Structured Data -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "${title}",
      "description": "${articleDescription}",
      "url": "${articleUrl}",
      "datePublished": "${new Date(fileInfo.created || fileInfo.modified).toISOString()}",
      "dateModified": "${new Date(fileInfo.modified).toISOString()}",
      "author": {
        "@type": "Organization",
        "name": "${config.siteTitle || 'PowerWiki'}"
      }${articleImage ? `,
      "image": "${articleImage}"` : ''}
    }
    </script>
    
    <link rel="stylesheet" href="/styles.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css">
</head>
<body>
    <div class="app-container">
        <div id="siteHeader">${renderTemplate(headerTemplate, headerData)}</div>
        <main class="main-content">
            <div id="postView" class="view active">
                <article class="post-content">
                    <header class="post-header">
                        <h1>${title}</h1>
                        <div class="post-meta">
                            <span class="meta-item">
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                    <rect x="1" y="2" width="12" height="11" rx="2" stroke="currentColor" stroke-width="1.2"/>
                                    <path d="M1 5h12M4 1v2M10 1v2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
                                </svg>
                                <span class="date-text">${new Date(fileInfo.created || fileInfo.modified).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            </span>
                        </div>
                    </header>
                    <div class="markdown-body">${parsed.html}</div>
                </article>
            </div>
        </main>
        <div id="siteFooter">${renderTemplate(footerTemplate, footerData)}</div>
    </div>
</body>
</html>`;
      
      res.send(html);
      return;
    } catch (error) {
      console.error('文章 SSR 渲染失败，回退到普通模式:', error);
    }
  }
  
  // 普通用户或 SSR 失败时，返回普通 HTML
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

