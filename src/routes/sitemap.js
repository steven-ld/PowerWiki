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
    const cached = cacheManager.get('sitemap');
    if (cached) {
      res.setHeader('Content-Type', 'application/xml');
      res.send(cached);
      return;
    }

    const gitManager = getGitManager(config);
    const files = await gitManager.getAllMarkdownFiles(config.mdPath);
    const baseUrl = config.siteUrl || `${req.protocol}://${req.get('host')}`;

    let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
    sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
    sitemap += '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';

    sitemap += '  <url>\n';
    sitemap += `    <loc>${baseUrl}/</loc>\n`;
    sitemap += `    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n`;
    sitemap += '    <changefreq>daily</changefreq>\n';
    sitemap += '    <priority>1.0</priority>\n';
    sitemap += '  </url>\n';

    for (const file of files) {
      if (!file.path.endsWith('.pdf')) {
        const url = `${baseUrl}/post/${encodeURIComponent(file.path)}`;
        const lastmod = new Date(file.modified).toISOString().split('T')[0];

        const daysSinceModified = (Date.now() - new Date(file.modified).getTime()) / (1000 * 60 * 60 * 24);
        let priority = 0.8;
        if (daysSinceModified < 7) {
          priority = 0.9;
        } else if (daysSinceModified < 30) {
          priority = 0.8;
        } else if (daysSinceModified < 90) {
          priority = 0.7;
        } else {
          priority = 0.6;
        }

        sitemap += '  <url>\n';
        sitemap += `    <loc>${url}</loc>\n`;
        sitemap += `    <lastmod>${lastmod}</lastmod>\n`;
        sitemap += '    <changefreq>weekly</changefreq>\n';
        sitemap += `    <priority>${priority.toFixed(1)}</priority>\n`;

        try {
          const content = await gitManager.readMarkdownFile(file.path);
          const parsed = parseMarkdown(content);
          if (parsed.html) {
            const images = seoHelper.extractImages(parsed.html, baseUrl);
            images.slice(0, 3).forEach(imgUrl => {
              sitemap += '    <image:image>\n';
              sitemap += `      <image:loc>${imgUrl}</image:loc>\n`;
              sitemap += '    </image:image>\n';
            });
          }
        } catch (error) {}

        sitemap += '  </url>\n';
      }
    }

    sitemap += '</urlset>';

    cacheManager.set('sitemap', '', sitemap, 60 * 60 * 1000);

    res.setHeader('Content-Type', 'application/xml');
    res.send(sitemap);
  } catch (error) {
    console.error('生成 sitemap 失败:', error);
    res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><error>生成 sitemap 失败</error>');
  }
});

module.exports = router;
