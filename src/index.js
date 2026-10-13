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
const cacheManager = require('./utils/cacheManager');
const { renderPage } = require('./utils/pageRenderer');
const { createApiRoutes } = require('./routes/api');
const { createApiFeedRoutes } = require('./routes/feeds');
const { createStaticRoutes } = require('./routes/static');
const { createAssetManager } = require('./utils/assetManager');

const app = express();
const publicDir = path.join(__dirname, '..', 'public');
const pdfDir = path.join(__dirname, '..', 'node_modules', 'pdfjs-dist');
const assets = createAssetManager(publicDir, pdfDir);

app.use((req, res, next) => {
  const send = res.send;
  res.send = function(body) {
    if (typeof body === 'string' && /^<!DOCTYPE html>/i.test(body)) body = assets.versionHtml(body);
    return send.call(this, body);
  };
  next();
});

// 统计文件路径
const statsFilePath = path.join(env.DATA_DIR, '.stats.json');
const statsStore = require('./utils/statsStore');
statsStore.read(statsFilePath, { totalViews: 0, postViews: {} });
statsStore.read(path.join(env.DATA_DIR, '.access-log.json'), []);
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, async () => {
    try { await statsStore.flush(); } finally { process.exit(0); }
  });
}

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
  try {
    const seo = apiRoutes.homeSEO(req);
    const description = seo.description;
    let home = renderTemplate(readTemplate('home'), { siteTitle: config.siteTitle, siteDescription: description });
    if (config.pages.home) {
      try {
        const content = await apiRoutes.getHomeContent();
        home = `<div id="homeContent" class="markdown-body">${content.html}</div>`;
      } catch (error) { /* The repository may still be starting. */ }
    }
    res.setHeader('Cache-Control', 'no-store');
    res.send(renderPage(fs.readFileSync(indexHtmlPath, 'utf8'), { home,
      seo,
      translations: getFrontendTranslations(), lang: i18n.getLang() }));
  } catch (error) { res.status(503).send('Service unavailable'); }
});

// 翻译数据 API（在静态文件之前，让所有页面都能获取翻译）
app.get('/api/i18n', (req, res) => {
  const translations = getFrontendTranslations();
  res.json(translations);
});

// 静态文件中间件（放在首页路由之后，禁用 index.html 自动处理）
app.use(express.static(publicDir, { index: false, setHeaders: assets.setHeaders }));
app.use('/pdfjs', express.static(pdfDir, { setHeaders: assets.setHeaders }));

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

function invalidateContentCaches() {
  ['posts', 'post', 'config', 'rss', 'sitemap'].forEach(type => cacheManager.delete(type));
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
      invalidateContentCaches();
      console.log(`🗑️  ${t('cache.cleared')}`);
    } else {
      console.log(`✅ ${t('git.upToDate')}`);
    }
    repoInitialized = true;
    cacheManager.delete('config');
    await apiRoutes.warmPosts().catch(error => console.error('目录预热失败:', error.message));
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
let autoSyncTimer;
function startAutoSync() {
  if (autoSyncTimer) clearInterval(autoSyncTimer);
  const interval = config.autoSyncInterval || 180000;
  console.log(`🔄 ${t('git.autoSyncEnabled')} ${interval / 60000} ${t('git.minutes')}`);

  autoSyncTimer = setInterval(async () => {
    if (repoInitializing || gitManager.isOperating) {
      console.log(`⏸️  ${t('error.skipSyncGitOperating')}`);
      return;
    }

    if (!repoInitialized) {
      await initRepo();
      return;
    }

    try {
      gitManager.setProgressCallback(showProgress);

      const result = await gitManager.cloneOrUpdate(t);
      if (result.updated) {
        console.log(`⏰ [${new Date().toLocaleString()}] ${t('git.syncComplete')}`);
        invalidateContentCaches();
        await apiRoutes.warmPosts();
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

// 配置变化才失效目录；普通请求和定时检查不重建目录。
let configReloadTimer;
async function reloadConfig() {
  if (repoInitializing || gitManager.isOperating) {
    configReloadTimer = setTimeout(reloadConfig, 500);
    return;
  }
  try {
    const next = JSON.parse(await fs.readFile(env.CONFIG_PATH, 'utf8'));
    if (typeof next.gitRepo !== 'string' || !next.gitRepo) throw new Error('gitRepo is required');
    const repositoryChanged = next.gitRepo !== config.gitRepo || next.repoBranch !== config.repoBranch;
    if (repositoryChanged) throw new Error('修改 Git 仓库或分支后请重启服务');
    next.pages = { home: '', about: '', ...next.pages };
    const port = config.port; // 监听端口变化在下次重启时生效。
    Object.keys(config).forEach(key => delete config[key]);
    Object.assign(config, next, { port });
    gitManager.invalidateFileLists();
    invalidateContentCaches();
    await apiRoutes.warmPosts();
    startAutoSync();
    console.log('✅ 配置已重新加载，内容缓存已失效');
  } catch (error) {
    console.error('❌ 配置重新加载失败:', error.message);
  }
}
fs.watchFile(env.CONFIG_PATH, { interval: 1000 }, (current, previous) => {
  if (current.mtimeMs === previous.mtimeMs && current.size === previous.size) return;
  clearTimeout(configReloadTimer);
  configReloadTimer = setTimeout(reloadConfig, 100);
});

// 注册 API 路由
const apiOptions = {
  config,
  gitManager,
  statsFilePath,
  readTemplate,
  renderTemplate
};
const apiRoutes = createApiRoutes(apiOptions);
app.use('/api', apiRoutes);
app.use('/api', createStaticRoutes(apiOptions));

// 注册 Feed 路由（RSS 和 Sitemap）
const feedsRouter = createApiFeedRoutes({
  config,
  gitManager,
  readTemplate,
  renderTemplate,
  articles: apiRoutes
});

// RSS 和 Sitemap 在根路径可用（/rss.xml, /sitemap.xml）
app.use('/api', feedsRouter);

// 直接在根路径挂载 RSS 和 Sitemap
const rootFeedsRouter = createApiFeedRoutes({
  config,
  gitManager,
  readTemplate,
  renderTemplate,
  articles: apiRoutes
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

// Stable and legacy short links share the same versioned address index.
app.get('/s/:code', async (req, res) => {
  try {
    const file = (await apiRoutes.addressIndex()).codes.get(req.params.code);
    if (!file) return res.status(404).send('Article not found');
    require('./routes/api').recordShortlinkView(statsFilePath, req.params.code, file.path);
    res.redirect(302, file.url);
  } catch (error) { res.status(503).send('Service unavailable'); }
});

// One shell, one Markdown renderer and one SEO model for all user agents.
app.get(['/post/*', '/article/*'], async (req, res) => {
  try {
    // Express already decoded route parameters; decoding twice breaks literal % filenames.
    const prefix = req.path.startsWith('/article/') ? '/article/' : '/post/';
    const file = (await apiRoutes.addressIndex()).routes.get(prefix + req.params[0]);
    if (!file) return res.status(404).send('<!DOCTYPE html><html><head><meta name="robots" content="noindex"><title>404</title></head><body><h1>文章不存在</h1><a href="/">返回首页</a></body></html>');
    if (req.path !== file.url) return res.redirect(301, file.url);
    const post = apiRoutes.withSEO(await apiRoutes.getPost(file.path), req);
    res.setHeader('Cache-Control', 'no-store');
    res.send(renderPage(fs.readFileSync(indexHtmlPath, 'utf8'), { post, seo: post.seo,
      translations: getFrontendTranslations(), lang: i18n.getLang() }));
  } catch (error) {
    console.error('Article render failed:', error);
    res.status(error.status || 503).send('Service unavailable');
  }
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
