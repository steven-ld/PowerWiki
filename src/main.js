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
const GitManager = require('../utils/gitManager');
const { parseMarkdown, transformLocalImagePaths } = require('../utils/markdownParser');
const cacheManager = require('../utils/cacheManager');
const seoHelper = require('../utils/seoHelper');
const env = require('../config/env');
const { t } = require('../config/i18n');

const app = express();

// 统计文件路径（使用环境变量）
const statsFilePath = path.join(env.DATA_DIR, '.stats.json');
const accessLogFilePath = path.join(env.DATA_DIR, '.access-log.json');

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
    console.error(t('stats.readStatsFailed') + ':', error);
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
    fs.writeFileSync(statsFilePath, JSON.stringify(stats, null, 2));
  } catch (error) {
    console.error(t('stats.saveStatsFailed') + ':', error);
  }
}

/**
 * 记录访问日志
 * @param {string} path - 访问路径
 * @param {string} userAgent - 用户代理
 * @param {string} ip - IP地址
 */
function logAccess(path, userAgent, ip) {
  try {
    const logEntry = {
      timestamp: new Date().toISOString(),
      path,
      userAgent,
      ip
    };
    
    let logs = [];
    if (fs.existsSync(accessLogFilePath)) {
      const data = fs.readFileSync(accessLogFilePath, 'utf-8');
      logs = JSON.parse(data);
    }
    
    logs.push(logEntry);
    
    // 只保留最近1000条记录
    if (logs.length > 1000) {
      logs = logs.slice(-1000);
    }
    
    fs.writeFileSync(accessLogFilePath, JSON.stringify(logs, null, 2));
  } catch (error) {
    console.error(t('stats.saveLogFailed') + ':', error);
  }
}

// 中间件配置
app.use(compression());
app.use(express.json());
app.use(express.static('public'));

// 配置文件路径
const configPath = env.CONFIG_PATH || './config.json';

// 读取配置
let config;
try {
  config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  console.log(t('server.configLoaded'));
} catch (error) {
  console.error(t('server.configLoadError'), error.message);
  process.exit(1);
}

// 将配置设置到app中，供路由使用
app.set('config', config);

// Git 管理器
const gitManager = new GitManager(
  config.gitRepo, 
  config.repoBranch || 'main',
  env.GIT_CACHE_DIR || './.git-cache'
);

// 全局变量
let repoInitialized = false;
let repoInitializing = false;

/**
 * 显示进度信息
 * @param {string} message - 消息
 * @param {number} progress - 进度百分比
 */
function showProgress(message, progress = null) {
  if (progress !== null) {
    const barLength = 30;
    const filled = Math.round((progress / 100) * barLength);
    const empty = barLength - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    process.stdout.write(`\r${message} [${bar}] ${progress.toFixed(1)}%`);
  } else {
    console.log(`\n${message}`);
  }
}

/**
 * 初始化仓库
 */
async function initializeRepo() {
  if (repoInitializing || repoInitialized) return;
  
  repoInitializing = true;
  
  try {
    showProgress(t('git.initializing'));
    
    const result = await gitManager.cloneOrUpdate((progress) => {
      showProgress(t('git.cloning'), progress);
    });
    
    if (result.updated || result.isNew !== undefined) {
      repoInitialized = true;
      app.set('repoInitialized', true);  // 设置到app中供路由使用
      if (result.updated) {
        showProgress(t('git.initialized'));
      } else {
        showProgress(t('git.upToDate'));
      }
      
      // 启动自动同步
      if (config.autoSyncInterval && config.autoSyncInterval > 0) {
        setInterval(async () => {
          try {
            console.log(t('git.autoSyncStart'));
            const syncResult = await gitManager.cloneOrUpdate();
            if (syncResult.updated) {
              console.log(t('git.autoSyncSuccess'));
              // 清除缓存
              cacheManager.clearAll();
            } else {
              console.error(t('git.autoSyncError'), syncResult.error || 'Unknown error');
            }
          } catch (error) {
            console.error(t('git.autoSyncError'), error.message);
          }
        }, config.autoSyncInterval);
      }
    } else {
      console.error(t('git.initError'), result.error || 'Unknown error');
    }
  } catch (error) {
    console.error(t('git.initError'), error.message);
    console.error('详细错误信息:', error);
  } finally {
    repoInitializing = false;
  }
}

// 访问统计中间件
app.use((req, res, next) => {
  // 记录访问日志
  const userAgent = req.get('User-Agent') || '';
  const ip = req.ip || req.connection.remoteAddress || '';
  logAccess(req.path, userAgent, ip);
  
  // 更新统计
  const stats = readStats();
  stats.totalViews++;
  saveStats(stats);
  
  next();
});

// 路由配置
app.use('/api', require('./routes/posts'));
app.use('/api', require('./routes/stats'));
app.use('/api', require('./routes/config'));
app.use('/api', require('./routes/cache'));
app.use('/api', require('./routes/pdf'));
app.use('/sitemap.xml', require('./routes/sitemap'));
app.use('/rss.xml', require('./routes/rss'));
app.use('/', require('./routes/pages'));
app.use('/', require('./routes/post'));

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(t('server.error') + ':', err);
  res.status(500).json({ 
    error: t('server.error'),
    message: process.env.NODE_ENV === 'development' ? err.message : t('server.error')
  });
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({ 
    error: t('server.pageNotFound'),
    path: req.path 
  });
});

// 启动服务器
const PORT = config.port || 3150;

async function startServer() {
  try {
    // 初始化仓库
    await initializeRepo();
    
    // 启动服务器
    app.listen(PORT, () => {
      console.log(`\n🚀 ${t('server.started')}`);
      console.log(`📝 ${t('server.siteTitle')}: ${config.siteTitle || 'PowerWiki'}`);
      console.log(`🌐 ${t('server.url')}: http://localhost:${PORT}`);
      console.log(`📁 ${t('git.repository')}: ${config.gitRepo}`);
      console.log(`🔄 ${t('git.autoSync')}: ${config.autoSyncInterval ? `${config.autoSyncInterval/1000}s` : t('server.disabled')}`);
      console.log(`📊 ${t('server.dataDir')}: ${env.DATA_DIR}`);
      console.log(`💾 ${t('server.cacheDir')}: ${env.GIT_CACHE_DIR}`);
      console.log(`\n${t('server.ready')}\n`);
    });
  } catch (error) {
    console.error(t('server.startError'), error.message);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGTERM', () => {
  console.log(t('server.shutdown'));
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log(t('server.shutdown'));
  process.exit(0);
});

// 启动应用
if (require.main === module) {
  startServer();
}

module.exports = app;
