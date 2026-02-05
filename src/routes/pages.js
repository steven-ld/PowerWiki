const express = require('express');
const env = require("../../config/env");
const router = express.Router();
const path = require('path');
const { parseMarkdown } = require('../../utils/markdownParser');
const seoHelper = require('../../utils/seoHelper');
const { readStats } = require('../services/statsService');
const { readTemplate, renderTemplate } = require('../services/templateService');
const { t } = require('../../config/i18n');

function getGitManager(config) {
  const GitManager = require('../../utils/gitManager');
  return new GitManager(config.gitRepo, config.repoBranch, env.GIT_CACHE_DIR);
}

function isBot(userAgent) {
  return /bot|crawler|spider|crawling|googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|sogou|exabot|facebot|ia_archiver/i.test(userAgent);
}

router.get('/', async (req, res) => {
  const userAgent = req.get('user-agent') || '';

  if (isBot(userAgent)) {
    try {
      const config = req.app.get('config');
      const headerTemplate = readTemplate('header');
      const footerTemplate = readTemplate('footer');
      const homeTemplate = readTemplate('home');

      const stats = readStats();
      const homePagePath = config.pages.home || '';
      const repoInitialized = req.app.get('repoInitialized');

      let homeContent = null;
      if (homePagePath && repoInitialized) {
        try {
          const gitManager = getGitManager(config);
          const content = await gitManager.readMarkdownFile(homePagePath);
          const parsed = parseMarkdown(content);
          homeContent = {
            html: parsed.html,
            title: parsed.title || t('content.home'),
            path: homePagePath
          };
        } catch (error) {}
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
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${config.siteTitle || 'PowerWiki'} - ${config.siteDescription || t('content.knowledgeBase')}</title>
    <meta name="description" content="${config.siteDescription || t('content.knowledgeBaseDesc')}">
    <meta name="keywords" content="${t('content.knowledgeBase')},${t('content.document')},Markdown,Wiki">
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
      console.error(t('error.ssrRenderFailed'), error.message);
    }
  }

  res.sendFile(path.join(__dirname, '../../public', 'index.html'));
});

module.exports = router;
