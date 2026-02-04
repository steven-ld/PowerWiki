const express = require('express');
const router = express.Router();
const path = require('path');
const { parseMarkdown } = require('../../utils/markdownParser');
const seoHelper = require('../../utils/seoHelper');
const { readStats } = require('../services/statsService');
const { readTemplate, renderTemplate } = require('../services/templateService');

function getGitManager(config) {
  const GitManager = require('../../utils/gitManager');
  return new GitManager(config.gitRepo, config.repoBranch, './.git-repos');
}

function isBot(userAgent) {
  return /bot|crawler|spider|crawling|googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|sogou|exabot|facebot|ia_archiver/i.test(userAgent);
}

router.get('/*', async (req, res) => {
  const userAgent = req.get('user-agent') || '';

  if (isBot(userAgent)) {
    try {
      const config = req.app.get('config');
      let filePath = req.params[0];
      try {
        filePath = decodeURIComponent(filePath);
      } catch (e) {}

      if (filePath.endsWith('.pdf')) {
        res.sendFile(path.join(__dirname, '../../public', 'index.html'));
        return;
      }

      const gitManager = getGitManager(config);
      const content = await gitManager.readMarkdownFile(filePath);
      const parsed = parseMarkdown(content);
      const fileInfo = await gitManager.getFileInfo(filePath);
      const fileName = fileInfo.name.replace(/\.(md|markdown)$/i, '');
      const title = parsed.title || fileName;

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

      const optimizedHtml = seoHelper.optimizeImageTags(parsed.html, title);

      const articleDescription = parsed.description || seoHelper.generateDescription(optimizedHtml, title);
      const articleKeywords = parsed.keywords || seoHelper.extractKeywords(optimizedHtml, title, filePath);

      const images = seoHelper.extractImages(optimizedHtml, baseUrl);
      const articleImage = images.length > 0 ? images[0] : '';

      const breadcrumbSchema = seoHelper.generateBreadcrumbSchema(filePath, baseUrl, config.siteTitle || 'PowerWiki');

      const articleSchema = seoHelper.generateArticleSchema({
        title: title,
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
      console.error('文章 SSR 渲染失败，回退到普通模式:', error);
    }
  }

  res.sendFile(path.join(__dirname, '../../public', 'index.html'));
});

module.exports = router;
