const express = require('express');
const compression = require('compression');
const path = require('path');
const GitManager = require('../utils/gitManager');
const cacheManager = require('../utils/cacheManager');
const loadConfig = require('./config');

const app = express();

app.use(compression());
app.use(express.json());
app.use(express.static('public'));
app.use('/pdfjs', express.static(path.join(__dirname, 'node_modules', 'pdfjs-dist')));

const config = loadConfig();
app.set('config', config);
app.set('repoInitialized', false);
app.set('repoInitializing', false);

const gitManager = new GitManager(config.gitRepo, config.repoBranch, './.git-repos');

let repoInitialized = false;
let repoInitializing = false;

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

app.use('/rss.xml', require('./routes/rss'));
app.use('/sitemap.xml', require('./routes/sitemap'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/config', require('./routes/config'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/cache', require('./routes/cache'));
app.use('/api/pdf', require('./routes/pdf'));
app.use('/', require('./routes/pages'));
app.use('/post', require('./routes/post'));

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

app.get('/stats', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

async function initRepo() {
  if (repoInitializing) {
    return;
  }

  repoInitializing = true;
  try {
    gitManager.setProgressCallback(showProgress);

    console.log('📦 正在同步 Git 仓库...');
    const result = await gitManager.cloneOrUpdate();
    if (result.updated) {
      console.log('✅ 仓库已更新！');
      cacheManager.delete('posts');
      cacheManager.delete('config');
      console.log('🗑️  已清除相关缓存');
    } else {
      console.log('✅ 仓库已是最新版本');
    }
    repoInitialized = true;
    app.set('repoInitialized', true);
    cacheManager.delete('config');
  } catch (error) {
    console.error('❌ 初始化仓库失败:', error.message);
    console.error('💡 提示: 请检查 Git 仓库地址和网络连接');
    repoInitialized = false;
  } finally {
    repoInitializing = false;
    app.set('repoInitializing', false);
  }
}

function startAutoSync() {
  const interval = config.autoSyncInterval || 180000;
  setInterval(async () => {
    if (repoInitializing || gitManager.isOperating) {
      console.log('⏸️  跳过本次同步：Git 操作正在进行中...');
      return;
    }

    if (!repoInitialized) {
      console.log('⏸️  跳过本次同步：仓库尚未初始化完成...');
      return;
    }

    try {
      gitManager.setProgressCallback(showProgress);

      const result = await gitManager.cloneOrUpdate();
      if (result.updated) {
        console.log('⏰ [' + new Date().toLocaleString() + '] 仓库有更新，已自动同步');
        cacheManager.delete('posts');
        cacheManager.delete('config');
        console.log('🗑️  已清除相关缓存');
      }
    } catch (error) {
      if (error.message && error.message.includes('正在进行中')) {
        return;
      }
      console.error('❌ 自动同步失败:', error.message);
    }
  }, interval);
  console.log(`🔄 已启动自动同步，间隔: ${interval / 1000}秒`);
}

const PORT = config.port || 3000;

async function startServer() {
  app.listen(PORT, () => {
    console.log('════════════════════════════════════════');
    console.log(`🚀 博客服务器已启动: http://localhost:${PORT}`);
    console.log(`📝 Git 仓库: ${config.gitRepo}`);
    console.log(`🌿 分支: ${config.repoBranch}`);
    console.log(`⏱️  自动同步间隔: ${(config.autoSyncInterval || 180000) / 1000}秒`);
    console.log('════════════════════════════════════════');
    console.log(`💡 提示: 如果仓库同步失败，请检查 config.json 中的 gitRepo 配置`);
  });

  initRepo().catch(err => {
    console.error('⚠️  仓库同步失败，但服务器已启动。请检查 Git 仓库配置。');
  });

  startAutoSync();
}

startServer().catch(console.error);
