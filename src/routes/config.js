const express = require('express');
const router = express.Router();
const cacheManager = require('../../utils/cacheManager');
const { parseMarkdown } = require('../../utils/markdownParser');
const { readStats } = require('../services/statsService');
const { readTemplate, renderTemplate } = require('../services/templateService');

function getGitManager(config) {
  const GitManager = require('../../utils/gitManager');
  return new GitManager(config.gitRepo, config.repoBranch, './.git-repos');
}

router.get('/', async (req, res) => {
  const config = req.app.get('config');
  const cached = cacheManager.get('config');
  if (cached) {
    res.json(cached);
    return;
  }

  const headerTemplate = readTemplate('header');
  const footerTemplate = readTemplate('footer');
  const homeTemplate = readTemplate('home');

  const stats = readStats();

  const homePagePath = config.pages.home || '';
  const aboutPagePath = config.pages.about || '';
  const repoInitialized = req.app.get('repoInitialized');

  let homeContent = null;
  if (homePagePath && repoInitialized) {
    try {
      const gitManager = getGitManager(config);
      const content = await gitManager.readMarkdownFile(homePagePath);
      const parsed = parseMarkdown(content);
      homeContent = {
        html: parsed.html,
        title: parsed.title || '首页',
        path: homePagePath
      };
    } catch (error) {
      console.warn(`⚠️  无法读取首页文件 ${homePagePath}:`, error.message);
      console.warn('💡 将使用默认欢迎页面');
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
    homeContent: homeContent,
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

module.exports = router;
