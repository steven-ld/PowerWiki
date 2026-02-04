const express = require('express');
const router = express.Router();
const cacheManager = require('../../utils/cacheManager');
const { parseMarkdown } = require('../../utils/markdownParser');
const seoHelper = require('../../utils/seoHelper');

function getGitManager(config) {
  const GitManager = require('../../utils/gitManager');
  return new GitManager(config.gitRepo, config.repoBranch, './.git-repos');
}

router.get('/', async (req, res) => {
  try {
    const config = req.app.get('config');
    const cached = cacheManager.get('rss');
    if (cached) {
      res.setHeader('Content-Type', 'application/xml');
      res.send(cached);
      return;
    }

    const gitManager = getGitManager(config);
    const files = await gitManager.getAllMarkdownFiles(config.mdPath);
    const baseUrl = config.siteUrl || `${req.protocol}://${req.get('host')}`;

    const recentFiles = files
      .filter(file => !file.path.endsWith('.pdf'))
      .sort((a, b) => new Date(b.modified) - new Date(a.modified))
      .slice(0, 20);

    let rss = '<?xml version="1.0" encoding="UTF-8"?>\n';
    rss += '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n';
    rss += '  <channel>\n';
    rss += `    <title>${config.siteTitle || 'PowerWiki'}</title>\n`;
    rss += `    <link>${baseUrl}</link>\n`;
    rss += `    <description>${config.siteDescription || 'PowerWiki - 一个现代化的知识库系统'}</description>\n`;
    rss += `    <language>zh-CN</language>\n`;
    rss += `    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>\n`;
    rss += `    <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml" />\n`;

    for (const file of recentFiles) {
      try {
        const content = await gitManager.readMarkdownFile(file.path);
        const parsed = parseMarkdown(content);
        const fileInfo = await gitManager.getFileInfo(file.path);
        const fileName = fileInfo.name.replace(/\.(md|markdown)$/i, '');
        const title = fileName || parsed.title || '文章';

        const optimizedHtml = seoHelper.optimizeImageTags(parsed.html, title);
        const description = seoHelper.generateDescription(optimizedHtml, title, 300);

        const articleUrl = `${baseUrl}/post/${encodeURIComponent(file.path)}`;
        const pubDate = new Date(file.modified).toUTCString();

        rss += '    <item>\n';
        rss += `      <title><![CDATA[${title}]]></title>\n`;
        rss += `      <link>${articleUrl}</link>\n`;
        rss += `      <description><![CDATA[${description}]]></description>\n`;
        rss += `      <pubDate>${pubDate}</pubDate>\n`;
        rss += `      <guid isPermaLink="true">${articleUrl}</guid>\n`;

        const pathParts = file.path.split('/').filter(p => p && !p.endsWith('.md') && !p.endsWith('.markdown'));
        pathParts.forEach(part => {
          rss += `      <category><![CDATA[${part}]]></category>\n`;
        });

        rss += '    </item>\n';
      } catch (error) {
        console.warn(`RSS: 跳过文章 ${file.path}:`, error.message);
      }
    }

    rss += '  </channel>\n';
    rss += '</rss>';

    cacheManager.set('rss', '', rss, 30 * 60 * 1000);

    res.setHeader('Content-Type', 'application/xml');
    res.send(rss);
  } catch (error) {
    console.error('生成 RSS 失败:', error);
    res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><error>生成 RSS 失败</error>');
  }
});

module.exports = router;
