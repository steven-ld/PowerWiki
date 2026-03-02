/**
 * API Routes
 *
 * API 接口路由模块
 * 包含文章、配置、统计、缓存等 API 接口
 *
 * @module routes/api
 */

const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const { parseMarkdown } = require('../utils/markdownParser');
const seoHelper = require('../utils/seoHelper');
const cacheManager = require('../utils/cacheManager');
const { t } = require('../config/i18n');

/**
 * 构建目录树结构
 */
function buildDirectoryTree(files) {
  const tree = {};

  files.forEach(file => {
    const parts = file.path.split('/');
    let current = tree;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;

      if (isFile) {
        const fileName = part.replace(/\.(md|markdown|pdf)$/i, '');
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
          current.readme = fileData;
        } else if (isAbout && fileData.type === 'markdown') {
          current.about = fileData;
        } else {
          if (!current.files) {
            current.files = [];
          }
          current.files.push(fileData);
        }
      } else {
        if (!current.dirs) {
          current.dirs = {};
        }
        if (!current.dirs[part]) {
          current.dirs[part] = {
            _maxModified: null
          };
        }
        current = current.dirs[part];
      }
    }
  });

  function sortTree(node) {
    if (node.files) {
      node.files.sort((a, b) => {
        const timeA = new Date(a.modified).getTime();
        const timeB = new Date(b.modified).getTime();
        return timeB - timeA;
      });
    }

    if (node.dirs) {
      const dirs = Object.keys(node.dirs);

      dirs.forEach(dirName => {
        const dirNode = node.dirs[dirName];
        sortTree(dirNode);

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

      dirs.sort((a, b) => {
        const timeA = node.dirs[a]._maxModified || 0;
        const timeB = node.dirs[b]._maxModified || 0;
        return timeB - timeA;
      });

      const sortedDirs = {};
      dirs.forEach(dirName => {
        sortedDirs[dirName] = node.dirs[dirName];
      });
      node.dirs = sortedDirs;
    }
  }

  sortTree(tree);

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

/**
 * 读取统计数据
 */
function readStats(statsFilePath) {
  try {
    if (fs.existsSync(statsFilePath)) {
      const data = fs.readFileSync(statsFilePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error(`❌ ${t('stats.readStatsFailed')}:`, error);
  }
  return { totalViews: 0, postViews: {} };
}

/**
 * 保存统计数据
 */
function saveStats(statsFilePath, stats) {
  try {
    fs.writeFileSync(statsFilePath, JSON.stringify(stats, null, 2), 'utf-8');
  } catch (error) {
    console.error(`❌ ${t('stats.saveStatsFailed')}:`, error);
  }
}

/**
 * 从 User-Agent 解析浏览器名称
 */
function parseBrowser(userAgent) {
  if (!userAgent || userAgent === 'unknown') {
    return t('browser.unknown');
  }

  const ua = userAgent.toLowerCase();

  if (ua.includes('micromessenger')) return t('browser.wechat');
  if (ua.includes('edg') || (ua.includes('edge') && !ua.includes('edgechromium'))) return t('browser.edge');
  if (ua.includes('opr') || ua.includes('opera')) return t('browser.opera');
  if (ua.includes('chrome') && !ua.includes('edg') && !ua.includes('opr')) return t('browser.chrome');
  if (ua.includes('firefox')) return t('browser.firefox');
  if (ua.includes('safari') && !ua.includes('chrome')) {
    if (ua.includes('iphone') || ua.includes('ipad')) return t('browser.safariIos');
    return t('browser.safari');
  }
  if (ua.includes('msie') || ua.includes('trident')) return t('browser.ie');
  if (ua.includes('mobile')) {
    if (ua.includes('android')) return t('browser.android');
  }
  if (ua.includes('bot') || ua.includes('crawler') || ua.includes('spider')) return t('browser.crawler');

  return t('browser.other');
}

/**
 * 获取客户端IP地址
 */
function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.ip ||
    'unknown';
}

/**
 * 读取访问日志
 */
function readAccessLog(accessLogFilePath) {
  try {
    if (fs.existsSync(accessLogFilePath)) {
      const data = fs.readFileSync(accessLogFilePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error(`❌ ${t('stats.readAccessLogFailed')}:`, error);
  }
  return [];
}

/**
 * 保存访问日志
 */
function saveAccessLog(accessLogFilePath, log) {
  try {
    const maxRecords = 10000;
    const trimmedLog = log.slice(-maxRecords);
    fs.writeFileSync(accessLogFilePath, JSON.stringify(trimmedLog, null, 2), 'utf-8');
  } catch (error) {
    console.error(`❌ ${t('stats.saveAccessLogFailed')}:`, error);
  }
}

/**
 * 记录文章访问
 */
function recordPostView(statsFilePath, filePath, req) {
  const accessLogFilePath = statsFilePath.replace('.stats.json', '.access-log.json');

  const stats = readStats(statsFilePath);
  stats.totalViews = (stats.totalViews || 0) + 1;
  stats.postViews = stats.postViews || {};
  stats.postViews[filePath] = (stats.postViews[filePath] || 0) + 1;
  saveStats(statsFilePath, stats);

  // 记录详细访问日志
  const accessLog = readAccessLog(accessLogFilePath);
  const ip = getClientIP(req);
  const userAgent = req.headers['user-agent'] || 'unknown';
  const browser = parseBrowser(userAgent);
  const referrer = req.headers.referer || '';
  const timestamp = new Date().toISOString();

  accessLog.push({
    timestamp,
    ip,
    filePath,
    userAgent,
    browser,
    referrer
  });

  saveAccessLog(accessLogFilePath, accessLog);

  return stats.postViews[filePath];
}

/**
 * 创建 API 路由
 * @param {Object} options - 选项
 * @param {Object} options.config - 网站配置
 * @param {Object} options.gitManager - Git 管理器
 * @param {string} options.statsFilePath - 统计文件路径
 * @param {Function} options.readTemplate - 读取模板函数
 * @param {Function} options.renderTemplate - 渲染模板函数
 */
function createApiRoutes(options) {
  const router = express.Router();
  const { config, gitManager, statsFilePath, readTemplate, renderTemplate } = options;

  // API: 获取所有文章列表
  router.get('/posts', async (req, res) => {
    try {
      const cached = cacheManager.get('posts');
      if (cached) {
        res.json(cached);
        return;
      }

      const files = await gitManager.getAllMarkdownFiles(config.mdPath);
      const tree = buildDirectoryTree(files);
      const result = { tree, flat: files };

      cacheManager.set('posts', '', result, 10 * 60 * 1000);
      res.json(result);
    } catch (error) {
      console.error(`❌ ${t('stats.getPostsFailed')}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // API: 获取单篇文章内容
  router.get('/post/*', async (req, res) => {
    try {
      let filePath = req.params[0];
      try {
        filePath = decodeURIComponent(filePath);
      } catch (e) {
        console.warn(`⚠️  ${t('static.pathDecodeFailed')}:`, filePath);
      }

      const cached = cacheManager.get('post', filePath);
      if (cached) {
        const viewCount = recordPostView(statsFilePath, filePath, req);
        cached.viewCount = viewCount;
        res.json(cached);
        return;
      }

      const viewCount = recordPostView(statsFilePath, filePath, req);

      if (filePath.endsWith('.pdf')) {
        const fileInfo = await gitManager.getFileInfo(filePath);
        const fileName = fileInfo.name.replace(/\.pdf$/i, '');

        const result = {
          type: 'pdf',
          title: fileName,
          fileInfo,
          path: filePath,
          html: '',
          description: 'PDF 文档',
          viewCount
        };

        cacheManager.set('post', filePath, result, 15 * 60 * 1000);
        res.json(result);
      } else {
        const content = await gitManager.readMarkdownFile(filePath);
        const parsed = parseMarkdown(content, filePath);
        const fileInfo = await gitManager.getFileInfo(filePath);

        const fileName = fileInfo.name.replace(/\.(md|markdown)$/i, '');
        const title = parsed.title || fileName;

        const optimizedHtml = seoHelper.optimizeImageTags(parsed.html, title);
        const description = parsed.description || seoHelper.generateDescription(optimizedHtml, title);
        const keywords = parsed.keywords || seoHelper.extractKeywords(optimizedHtml, title, filePath);

        const result = {
          ...parsed,
          type: 'markdown',
          title,
          html: optimizedHtml,
          description,
          keywords,
          fileInfo,
          path: filePath,
          viewCount
        };

        cacheManager.set('post', filePath, result, 10 * 60 * 1000);
        res.json(result);
      }
    } catch (error) {
      console.error(`❌ ${t('stats.getPostFailed')}:`, error);
      res.status(404).json({ error: t('stats.postNotFound') });
    }
  });

  // API: 获取网站配置
  router.get('/config', async (req, res) => {
    const cached = cacheManager.get('config');
    if (cached) {
      res.json(cached);
      return;
    }

    const headerTemplate = readTemplate('header');
    const footerTemplate = readTemplate('footer');
    const homeTemplate = readTemplate('home');
    const stats = readStats(statsFilePath);

    const homePagePath = config.pages.home || '';
    const aboutPagePath = config.pages.about || '';

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
        console.warn(`⚠️  ${t('stats.readHomePageFailed')}: ${homePagePath}:`, error.message);
      }
    }

    let aboutPath = '/post/README.md';
    if (aboutPagePath) {
      aboutPath = `/post/${encodeURIComponent(aboutPagePath)}`;
    } else if (homePagePath && !aboutPagePath) {
      aboutPath = `/post/${encodeURIComponent(homePagePath)}`;
    }

    const headerData = {
      siteTitle: config.siteTitle || config.title,
      siteDescription: config.siteDescription || config.description,
      aboutPath
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

    const result = {
      header: renderTemplate(headerTemplate, headerData),
      footer: renderTemplate(footerTemplate, footerData),
      home: renderTemplate(homeTemplate, homeData),
      homeContent,
      siteTitle: config.siteTitle || config.title,
      siteDescription: config.siteDescription || config.description,
      pages: {
        home: homePagePath,
        about: aboutPagePath
      }
    };

    cacheManager.set('config', '', result, 30 * 60 * 1000);
    res.setHeader('Cache-Control', 'public, max-age=1800');
    res.json(result);
  });

  // API: 获取统计数据
  router.get('/stats', (req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=30');
    const cached = cacheManager.get('stats');
    if (cached) {
      res.json(cached);
      return;
    }

    const stats = readStats(statsFilePath);
    cacheManager.set('stats', '', stats, 30 * 1000);
    res.json(stats);
  });

  // API: 获取详细访问统计
  router.get('/stats/detail', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    try {
      const stats = readStats(statsFilePath);
      const accessLogFilePath = statsFilePath.replace('.stats.json', '.access-log.json');
      const accessLog = fs.existsSync(accessLogFilePath)
        ? JSON.parse(fs.readFileSync(accessLogFilePath, 'utf-8'))
        : [];

      const ipStats = {};
      const postStats = {};
      const dateStats = {};
      const hourStats = {};
      const browserStats = {};
      const weekdayStats = {};
      const deviceStats = {};
      const depthStats = {};
      const returningUsers = {};
      const referrerStats = {};

      accessLog.forEach(record => {
        if (!ipStats[record.ip]) {
          ipStats[record.ip] = {
            ip: record.ip,
            count: 0,
            posts: new Set(),
            firstVisit: record.timestamp,
            lastVisit: record.timestamp
          };
        }
        ipStats[record.ip].count++;
        ipStats[record.ip].posts.add(record.filePath);
        if (record.timestamp < ipStats[record.ip].firstVisit) {
          ipStats[record.ip].firstVisit = record.timestamp;
        }
        if (record.timestamp > ipStats[record.ip].lastVisit) {
          ipStats[record.ip].lastVisit = record.timestamp;
        }

        if (!postStats[record.filePath]) {
          postStats[record.filePath] = {
            filePath: record.filePath,
            count: 0,
            uniqueIPs: new Set()
          };
        }
        postStats[record.filePath].count++;
        postStats[record.filePath].uniqueIPs.add(record.ip);

        const date = record.timestamp.split('T')[0];
        dateStats[date] = (dateStats[date] || 0) + 1;

        const hour = new Date(record.timestamp).getHours();
        hourStats[hour] = (hourStats[hour] || 0) + 1;

        const browser = record.browser || t('browser.unknown');
        browserStats[browser] = (browserStats[browser] || 0) + 1;

        const weekday = new Date(record.timestamp).getDay();
        weekdayStats[weekday] = (weekdayStats[weekday] || 0) + 1;

        const userAgent = record.userAgent || '';
        let deviceType = 'Desktop';
        if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
          deviceType = /iPad/.test(userAgent) ? 'Tablet' : 'Mobile';
        }
        deviceStats[deviceType] = (deviceStats[deviceType] || 0) + 1;

        // 访问来源统计
        const referrer = record.referrer || 'Direct';
        let referrerType = 'Direct';
        if (referrer !== 'Direct') {
          if (referrer.includes('google')) referrerType = 'Google';
          else if (referrer.includes('baidu')) referrerType = 'Baidu';
          else if (referrer.includes('bing')) referrerType = 'Bing';
          else if (referrer.includes('github')) referrerType = 'GitHub';
          else referrerType = 'Other';
        }
        referrerStats[referrerType] = (referrerStats[referrerType] || 0) + 1;
      });

      Object.keys(ipStats).forEach(ip => {
        const visitCount = ipStats[ip].count;
        const postCount = ipStats[ip].posts.size;

        let depth = 'shallow';
        if (postCount >= 5) depth = 'deep';
        else if (postCount >= 2) depth = 'medium';
        depthStats[depth] = (depthStats[depth] || 0) + 1;

        if (visitCount > 1) {
          returningUsers[ip] = visitCount;
        }

        ipStats[ip].posts = postCount;
      });

      Object.keys(postStats).forEach(filePath => {
        postStats[filePath].uniqueIPs = postStats[filePath].uniqueIPs.size;
      });

      const ipStatsArray = Object.values(ipStats).sort((a, b) => b.count - a.count);
      const postStatsArray = Object.values(postStats).sort((a, b) => b.count - a.count);

      const dateChartData = [];
      const today = new Date();
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        dateChartData.push({ date: dateStr, count: dateStats[dateStr] || 0 });
      }

      const hourChartData = [];
      for (let i = 0; i < 24; i++) {
        hourChartData.push({ hour: i, count: hourStats[i] || 0 });
      }

      const browserChartData = Object.entries(browserStats)
        .map(([browser, count]) => ({ browser, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

      const weekdayNames = [
        t('weekday.sunday'),
        t('weekday.monday'),
        t('weekday.tuesday'),
        t('weekday.wednesday'),
        t('weekday.thursday'),
        t('weekday.friday'),
        t('weekday.saturday')
      ];
      const weekdayChartData = [];
      for (let i = 0; i < 7; i++) {
        weekdayChartData.push({ weekday: weekdayNames[i], count: weekdayStats[i] || 0 });
      }

      const popularPostsChartData = postStatsArray.slice(0, 10).map(post => ({
        name: (post.filePath || '').length > 30 ? (post.filePath || '').substring(0, 30) + '...' : (post.filePath || ''),
        count: post.count
      }));

      const deviceChartData = Object.entries(deviceStats)
        .map(([device, count]) => ({ device, count }))
        .sort((a, b) => b.count - a.count);

      const depthChartData = Object.entries(depthStats)
        .map(([depth, count]) => ({ depth, count }));

      const referrerChartData = Object.entries(referrerStats)
        .map(([referrer, count]) => ({ referrer, count }))
        .sort((a, b) => b.count - a.count);

      const totalUsers = ipStatsArray.length;
      const returningUserCount = Object.keys(returningUsers).length;
      const retentionRate = totalUsers > 0 ? ((returningUserCount / totalUsers) * 100).toFixed(1) : 0;
      const avgDepth = totalUsers > 0 ? (Object.values(ipStats).reduce((sum, user) => sum + user.posts, 0) / totalUsers).toFixed(1) : 0;

      res.json({
        summary: {
          totalViews: stats.totalViews,
          totalPosts: Object.keys(stats.postViews).length,
          totalIPs: ipStatsArray.length,
          totalRecords: accessLog.length,
          returningUsers: returningUserCount,
          retentionRate,
          avgDepth
        },
        ipStats: ipStatsArray,
        postStats: postStatsArray,
        dateChart: dateChartData,
        hourChart: hourChartData,
        browserChart: browserChartData,
        weekdayChart: weekdayChartData,
        deviceChart: deviceChartData,
        depthChart: depthChartData,
        referrerChart: referrerChartData,
        popularPostsChart: popularPostsChartData,
        recentLogs: accessLog.slice(-50).reverse()
      });
    } catch (error) {
      console.error(`❌ ${t('stats.getAdminStatsFailed')}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // API: 查询 IP 归属地
  router.get('/ip/location', async (req, res) => {
    const { ip } = req.query;
    if (!ip) {
      return res.status(400).json({ error: 'IP address is required' });
    }

    try {
      const http = require('http');
      const url = `http://ip-api.com/json/${ip}?fields=status,message,country,regionName,city&lang=zh-CN`;
      
      http.get(url, (response) => {
        let data = '';
        response.on('data', (chunk) => data += chunk);
        response.on('end', () => {
          try {
            const result = JSON.parse(data);
            if (result.status === 'success') {
              const location = result.country ? `${result.country} ${result.regionName} ${result.city}` : '未知';
              res.json({ success: true, ip, location });
            } else {
              res.json({ success: false, ip, location: '未知' });
            }
          } catch (e) {
            res.json({ success: false, ip, location: '未知' });
          }
        });
      }).on('error', () => {
        res.json({ success: false, ip, location: '未知' });
      });
    } catch (error) {
      res.json({ success: false, ip, location: '未知' });
    }
  });

  // API: 获取缓存统计
  router.get('/cache/stats', (req, res) => {
    res.json(cacheManager.getStats());
  });

  // API: 清除缓存
  router.post('/cache/clear', (req, res) => {
    const { type, key } = req.body;

    if (type) {
      cacheManager.delete(type, key);
      res.json({ success: true, message: `已清除缓存: ${type}${key ? `/${key}` : ''}` });
    } else {
      cacheManager.clear();
      res.json({ success: true, message: '已清除所有缓存' });
    }
  });

  return router;
}

module.exports = { createApiRoutes, recordPostView, readStats, saveStats };
