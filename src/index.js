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
const compression = require('compression');
const path = require('path');
const fs = require('fs-extra');

const env = require('./config/env');
const i18n = require('./config/i18n');
const { t } = i18n;
const GitManager = require('./utils/gitManager');
const { parseMarkdown } = require('./utils/markdownParser');
const cacheManager = require('./utils/cacheManager');
const seoHelper = require('./utils/seoHelper');
const { createApiRoutes } = require('./routes/api');
const { createApiFeedRoutes } = require('./routes/feeds');
const { createStaticRoutes } = require('./routes/static');

const app = express();

// 统计文件路径
const statsFilePath = path.join(env.DATA_DIR, '.stats.json');
const accessLogFilePath = path.join(env.DATA_DIR, '.access-log.json');

// 中间件
app.use(compression());
app.use(express.json());

// 首页路由必须在 static 中间件之前定义，否则会被 static 拦截
const indexHtmlPath = path.join(__dirname, '..', 'public', 'index.html');

// 获取翻译的辅助函数
function getFrontendTranslations() {
  const lang = i18n.getLang();
  const langFile = path.join(__dirname, '..', 'locales', `${lang}.json`);

  // 尝试加载指定语言的翻译
  if (fs.existsSync(langFile)) {
    try {
      return JSON.parse(fs.readFileSync(langFile, 'utf8'));
    } catch (e) {
      // 静默失败
    }
  }

  // 回退到 zh-CN
  const fallbackFile = path.join(__dirname, '..', 'locales', 'zh-CN.json');
  if (fs.existsSync(fallbackFile)) {
    try {
      return JSON.parse(fs.readFileSync(fallbackFile, 'utf8'));
    } catch (e) {
      // 静默失败
    }
  }

  return {};
}

app.get('/', async (req, res) => {
  const userAgent = req.get('user-agent') || '';
  const isBot = /bot|crawler|spider|crawling|googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|sogou|exabot|facebot|ia_archiver/i.test(userAgent);

  // 获取前端翻译
  const translations = getFrontendTranslations();
  const lang = i18n.getLang();

  if (isBot) {
    // SSR 模式：返回完整渲染的 HTML
    try {
      const headerTemplate = readTemplate('header');
      const footerTemplate = readTemplate('footer');
      const homeTemplate = readTemplate('home');
      const stats = require('./routes/api').readStats(statsFilePath);
      const homePagePath = config.pages.home || '';

      let homeContent = null;
      if (homePagePath) {
        try {
          const content = await gitManager.readMarkdownFile(homePagePath);
          const parsed = parseMarkdown(content, homePagePath);
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
        totalPosts: stats.postViews ? Object.keys(stats.postViews).length : 0,
        footerCopyright: config.footer?.copyright || `© ${new Date().getFullYear()} ${config.siteTitle || config.title}`,
        footerPoweredBy: config.footer?.poweredBy || 'Powered by <a href="https://github.com/steven-ld/PowerWiki.git" target="_blank" rel="noopener">PowerWiki</a>'
      };

      const homeData = {
        siteTitle: config.siteTitle || config.title,
        siteDescription: config.siteDescription || config.description
      };

      const html = `<!DOCTYPE html>
<html lang="${lang === 'en' ? 'en' : 'zh-CN'}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${config.siteTitle || 'PowerWiki'} - ${config.siteDescription || '知识库'}</title>
    <meta name="description" content="${config.siteDescription || 'PowerWiki - 一个现代化的知识库系统'}">
    <meta name="keywords" content="知识库,文档,Markdown,Wiki">
    <link rel="canonical" href="${config.siteUrl || `${req.protocol}://${req.get('host')}`}">
    <link rel="alternate" type="application/rss+xml" title="${config.siteTitle || 'PowerWiki'} RSS Feed" href="${config.siteUrl || `${req.protocol}://${req.get('host')}`}/rss.xml">
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
      console.error(`❌ ${t('error.ssrRenderFailed')}:`, error);
    }
  }

  // 非爬虫：读取 index.html 并注入翻译
  try {
    let html = fs.readFileSync(indexHtmlPath, 'utf-8');

    // 注入翻译数据到 HTML（在 </head> 之前）
    const translationsScript = `\n    <script>window.__I18N__ = ${JSON.stringify(translations)};</script>`;
    html = html.replace('</head>', `${translationsScript}\n</head>`);

    // 注入语言属性
    html = html.replace(/lang="zh-CN"/, `lang="${lang === 'en' ? 'en' : 'zh-CN'}"`);

    // 禁用缓存
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    res.send(html);
  } catch (error) {
    console.error('[i18n] 注入翻译失败:', error);
    res.sendFile(indexHtmlPath);
  }
});

// 翻译数据 API（在静态文件之前，让所有页面都能获取翻译）
app.get('/api/i18n', (req, res) => {
  const translations = getFrontendTranslations();
  res.json(translations);
});

// 静态文件中间件（放在首页路由之后，禁用 index.html 自动处理）
app.use(express.static('public', { index: false }));
app.use('/pdfjs', express.static(path.join(__dirname, '..', 'node_modules', 'pdfjs-dist')));

/**
 * 读取模板文件
 */
function readTemplate(templateName) {
  try {
    const templatePath = path.join(__dirname, '..', 'templates', `${templateName}.html`);
    if (fs.existsSync(templatePath)) {
      return fs.readFileSync(templatePath, 'utf-8');
    }
  } catch (error) {
    console.error(`❌ ${t('error.templateReadFailed', templateName)}:`, error);
  }
  return '';
}

/**
 * 渲染模板
 */
function renderTemplate(template, data) {
  let rendered = template;
  Object.keys(data).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    rendered = rendered.replace(regex, data[key]);
  });
  return rendered;
}

// 加载配置文件
let config;
try {
  config = require(env.CONFIG_PATH);

  if (!config.gitRepo) {
    console.error(`❌ ${t('error.gitRepoRequired')}`);
    process.exit(1);
  }

  config.pages = config.pages || {};
  config.pages.home = config.pages.home || '';
  config.pages.about = config.pages.about || '';
} catch (error) {
  // 配置文件不存在，尝试加载示例配置
  const exampleConfigPath = path.join(__dirname, '..', 'config.example.json');
  
  try {
    config = require(exampleConfigPath);
    console.warn(`⚠️  ${t('tip.usingExampleConfig')}`);
    console.warn(`💡 ${t('tip.createCustomConfig')}`);
    
    config.pages = config.pages || {};
    config.pages.home = config.pages.home || '';
    config.pages.about = config.pages.about || '';
  } catch (exampleError) {
    console.error(`❌ ${t('error.configNotFound')}`);
    console.error(`💡 ${t('tip.configNotFoundTip')}`);
    process.exit(1);
  }
}

// 初始化 GitManager
const gitManager = new GitManager(config.gitRepo, config.repoBranch, env.GIT_CACHE_DIR);

// 仓库初始化状态
let repoInitialized = false;
let repoInitializing = false;

/**
 * 显示进度条
 */
function showProgress(message, progress = null) {
  if (progress !== null) {
    const barLength = 30;
    const filled = Math.round((progress / 100) * barLength);
    const empty = barLength - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    process.stdout.write(`\r\x1b[K${message} [${bar}] ${progress}%`);
    if (progress === 100) {
      process.stdout.write('\n');
    }
  } else {
    if (process.stdout.cursorTo) {
      process.stdout.write('\n');
    }
    console.log(message);
  }
}

/**
 * 初始化并同步 Git 仓库
 */
async function initRepo() {
  if (repoInitializing) {
    return;
  }

  repoInitializing = true;
  try {
    gitManager.setProgressCallback(showProgress);

    console.log(`📦 ${t('git.syncing')}`);
    const result = await gitManager.cloneOrUpdate(t);

    if (result.updated) {
      console.log(`✅ ${t('git.syncComplete')}`);
      cacheManager.delete('posts');
      cacheManager.delete('config');
      console.log(`🗑️  ${t('cache.cleared')}`);
    } else {
      console.log(`✅ ${t('git.upToDate')}`);
    }
    repoInitialized = true;
    cacheManager.delete('config');
  } catch (error) {
    console.error(`❌ ${t('error.initRepoFailed')}:`, error.message);
    console.error(`💡 ${t('error.initRepoFailedTip')}`);
    repoInitialized = false;
  } finally {
    repoInitializing = false;
  }
}

/**
 * 启动自动同步任务
 */
function startAutoSync() {
  const interval = config.autoSyncInterval || 180000;
  console.log(`🔄 ${t('git.autoSyncEnabled')} ${interval / 60000} ${t('git.minutes')}`);

  setInterval(async () => {
    if (repoInitializing || gitManager.isOperating) {
      console.log(`⏸️  ${t('error.skipSyncGitOperating')}`);
      return;
    }

    if (!repoInitialized) {
      console.log(`⏸️  ${t('error.skipSyncNotInitialized')}`);
      return;
    }

    try {
      gitManager.setProgressCallback(showProgress);

      const result = await gitManager.cloneOrUpdate(t);
      if (result.updated) {
        console.log(`⏰ [${new Date().toLocaleString()}] ${t('git.syncComplete')}`);
        cacheManager.delete('posts');
        cacheManager.delete('config');
        console.log(`🗑️  ${t('cache.cleared')}`);
      }
    } catch (error) {
      if (error.message && error.message.includes('正在进行中')) {
        return;
      }
      console.error(`❌ ${t('error.autoSyncFailed')}:`, error.message);
    }
  }, interval);
  console.log(`🔄 ${t('git.autoSyncEnabled')}, ${t('git.interval')}: ${interval / 1000}${t('git.seconds')}`);
}

/**
 * 记录访问日志
 */
function readAccessLog() {
  try {
    if (fs.existsSync(accessLogFilePath)) {
      const data = fs.readFileSync(accessLogFilePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error(`❌ ${t('error.readAccessLogFailed')}:`, error);
  }
  return [];
}

function saveAccessLog(log) {
  try {
    const maxRecords = 10000;
    const trimmedLog = log.slice(-maxRecords);
    fs.writeFileSync(accessLogFilePath, JSON.stringify(trimmedLog, null, 2), 'utf-8');
  } catch (error) {
    console.error(`❌ ${t('error.saveAccessLogFailed')}:`, error);
  }
}

function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.ip ||
    'unknown';
}

function parseBrowser(userAgent) {
  if (!userAgent || userAgent === 'unknown') {
    return '未知';
  }

  const ua = userAgent.toLowerCase();

  if (ua.includes('micromessenger')) return '微信浏览器';
  if (ua.includes('edg') || (ua.includes('edge') && !ua.includes('edgechromium'))) return 'Edge';
  if (ua.includes('opr') || ua.includes('opera')) return 'Opera';
  if (ua.includes('chrome') && !ua.includes('edg') && !ua.includes('opr')) return 'Chrome';
  if (ua.includes('firefox')) return 'Firefox';
  if (ua.includes('safari') && !ua.includes('chrome')) {
    if (ua.includes('iphone') || ua.includes('ipad')) return 'Safari (iOS)';
    return 'Safari';
  }
  if (ua.includes('msie') || ua.includes('trident')) return 'Internet Explorer';
  if (ua.includes('mobile')) {
    if (ua.includes('android')) return 'Android 浏览器';
  }
  if (ua.includes('bot') || ua.includes('crawler') || ua.includes('spider')) return '爬虫';

  return '其他';
}

function recordPostView(filePath, req) {
  const stats = require('./routes/api').readStats(statsFilePath);
  stats.totalViews = (stats.totalViews || 0) + 1;
  stats.postViews = stats.postViews || {};
  stats.postViews[filePath] = (stats.postViews[filePath] || 0) + 1;
  require('./routes/api').saveStats(statsFilePath, stats);

  const accessLog = readAccessLog();
  const ip = getClientIP(req);
  const userAgent = req.headers['user-agent'] || 'unknown';
  const browser = parseBrowser(userAgent);
  const timestamp = new Date().toISOString();

  accessLog.push({
    timestamp,
    ip,
    filePath,
    userAgent,
    browser
  });

  saveAccessLog(accessLog);

  return stats.postViews[filePath];
}

// 注册 API 路由
const apiOptions = {
  config,
  gitManager,
  statsFilePath,
  readTemplate,
  renderTemplate
};
app.use('/api', createApiRoutes(apiOptions));
app.use('/api', createStaticRoutes(apiOptions));

// 注册 Feed 路由（RSS 和 Sitemap）
const feedsRouter = createApiFeedRoutes({
  config,
  gitManager,
  readTemplate,
  renderTemplate
});

// RSS 和 Sitemap 在根路径可用（/rss.xml, /sitemap.xml）
app.use('/api', feedsRouter);

// 直接在根路径挂载 RSS 和 Sitemap
const rootFeedsRouter = createApiFeedRoutes({
  config,
  gitManager,
  readTemplate,
  renderTemplate
});
app.use('/', rootFeedsRouter);

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

// 文章详情页 - 支持 SSR
app.get('/post/*', async (req, res) => {
  const userAgent = req.get('user-agent') || '';
  const isBot = /bot|crawler|spider|crawling|googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|sogou|exabot|facebot|ia_archiver/i.test(userAgent);

  if (isBot) {
    try {
      let filePath = req.params[0];
      try {
        filePath = decodeURIComponent(filePath);
      } catch (e) {
        // 解码失败，使用原始路径
      }

      if (filePath.endsWith('.pdf')) {
        res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
        return;
      }

      const content = await gitManager.readMarkdownFile(filePath);
      const parsed = parseMarkdown(content, filePath);
      const fileInfo = await gitManager.getFileInfo(filePath);
      const fileName = fileInfo.name.replace(/\.(md|markdown)$/i, '');
      const title = parsed.title || fileName;

      const headerTemplate = readTemplate('header');
      const footerTemplate = readTemplate('footer');
      const stats = require('./routes/api').readStats(statsFilePath);

      const headerData = {
        siteTitle: config.siteTitle || config.title,
        siteDescription: config.siteDescription || config.description,
        aboutPath: config.pages.about ? `/post/${encodeURIComponent(config.pages.about)}` : '/post/README.md'
      };

      const footerData = {
        currentYear: new Date().getFullYear(),
        siteTitle: config.siteTitle || config.title,
        totalViews: stats.totalViews || 0,
        totalPosts: stats.postViews ? Object.keys(stats.postViews).length : 0,
        footerCopyright: config.footer?.copyright || `© ${new Date().getFullYear()} ${config.siteTitle || config.title}`,
        footerPoweredBy: config.footer?.poweredBy || 'Powered by <a href="https://github.com/steven-ld/PowerWiki.git" target="_blank" rel="noopener">PowerWiki</a>'
      };

      const baseUrl = config.siteUrl || `${req.protocol}://${req.get('host')}`;
      const articleUrl = `${baseUrl}/post/${encodeURIComponent(filePath)}`;
      const articleTitle = `${title} - ${config.siteTitle || 'PowerWiki'}`;

      const optimizedHtml = seoHelper.optimizeImageTags(parsed.html, title);
      const articleDescription = parsed.description || seoHelper.generateDescription(optimizedHtml, title);
      const articleKeywords = parsed.keywords || seoHelper.extractKeywords(optimizedHtml, title, filePath);
      const images = seoHelper.extractImages(optimizedHtml, baseUrl);
      const articleImage = images.length > 0 ? images[0] : '';

      const breadcrumbSchema = seoHelper.generateBreadcrumbSchema(filePath, baseUrl, config.siteTitle || 'PowerWiki');
      const articleSchema = seoHelper.generateArticleSchema({
        title,
        description: articleDescription,
        url: articleUrl,
        datePublished: new Date(fileInfo.created || fileInfo.modified).toISOString(),
        dateModified: new Date(fileInfo.modified).toISOString(),
        authorName: config.siteTitle || 'PowerWiki',
        authorUrl: baseUrl,
        image: articleImage || undefined,
        keywords: articleKeywords
      });

      const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${articleTitle}</title>
    <meta name="description" content="${articleDescription}">
    <meta name="keywords" content="${articleKeywords}">
    <link rel="canonical" href="${articleUrl}">
    <link rel="alternate" type="application/rss+xml" title="${config.siteTitle || 'PowerWiki'} RSS Feed" href="${baseUrl}/rss.xml">
    <meta property="og:type" content="article">
    <meta property="og:url" content="${articleUrl}">
    <meta property="og:title" content="${articleTitle}">
    <meta property="og:description" content="${articleDescription}">
    ${articleImage ? `<meta property="og:image" content="${articleImage}">` : ''}
    <meta property="og:site_name" content="${config.siteTitle || 'PowerWiki'}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${articleTitle}">
    <meta name="twitter:description" content="${articleDescription}">
    ${articleImage ? `<meta name="twitter:image" content="${articleImage}">` : ''}
    <script type="application/ld+json">
    ${JSON.stringify(articleSchema)}
    </script>
    ${breadcrumbSchema ? `<script type="application/ld+json">
    ${JSON.stringify(breadcrumbSchema)}
    </script>` : ''}
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
                    <div class="markdown-body">
                        ${optimizedHtml}
                        ${fileInfo.created && fileInfo.modified && new Date(fileInfo.created).getTime() !== new Date(fileInfo.modified).getTime() ? `
                        <div class="post-updated-time">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.2"/>
                                <path d="M7 4v3l2 2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
                            </svg>
                            <span>更新时间：${new Date(fileInfo.modified).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        </div>
                        ` : ''}
                    </div>
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
      console.error(`❌ ${t('error.postSsrRenderFailed')}:`, error);
    }
  }

  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// 统计页面
app.get('/stats', (req, res) => {
  const statsTemplate = fs.readFileSync(path.join(__dirname, '..', 'public', 'admin.html'), 'utf-8');
  const lang = env.LANG || 'zh-CN';

  let localizedTemplate = statsTemplate
    .replace(/lang="zh-CN"/, `lang="${lang === 'en' ? 'en' : 'zh-CN'}"`)
    .replace("const LANG = 'zh-CN'; // 将被服务器替换", `const LANG = '${lang}';`);

  res.send(localizedTemplate);
});

const PORT = config.port || 3150;

/**
 * 启动服务器
 */
async function startServer() {
  app.listen(PORT, () => {
    console.log('════════════════════════════════════════');
    console.log(`🚀 ${t('server.started')}: http://localhost:${PORT}`);
    console.log(`📝 Git ${t('git.repository')}: ${config.gitRepo}`);
    console.log(`🌿 ${t('git.branch')}: ${config.repoBranch}`);
    console.log(`⏱️  ${t('git.autoSyncInterval')}: ${(config.autoSyncInterval || 180000) / 1000}${t('git.seconds')}`);
    console.log('════════════════════════════════════════');
    console.log(`💡 ${t('git.syncTip')}`);
  });

  initRepo().catch(err => {
    console.error(`⚠️  ${t('server.syncFailedButStarted', t('git.syncFailed'))}`);
  });

  startAutoSync();
}

startServer().catch(console.error);
