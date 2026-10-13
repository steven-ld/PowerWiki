const express = require('express');
const cacheManager = require('../utils/cacheManager');
const seoHelper = require('../utils/seoHelper');
const { escapeHtml: xml } = require('../utils/pageRenderer');

function createApiFeedRoutes({ config, articles }) {
  const router = express.Router();
  router.get(['/rss.xml', '/sitemap.xml'], async (req, res) => {
    try {
      const posts = await articles.warmPosts();
      const base = (config.siteUrl || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
      const rss = req.path === '/rss.xml';
      const key = `${posts.version}:${base}`;
      const type = rss ? 'rss' : 'sitemap';
      let document = cacheManager.get(type, key);
      if (!document) {
        const files = posts.flat.filter(file => file.type !== 'pdf' && !/\.pdf$/i.test(file.path));
        const selected = rss ? [...files].sort((a, b) => new Date(b.modified) - new Date(a.modified)).slice(0, 20) : files;
        const items = [];
        for (const file of selected) {
          const post = await articles.getPost(file.path);
          const url = xml(base + post.url);
          if (rss) {
            items.push(`<item><title>${xml(post.title)}</title><link>${url}</link><guid isPermaLink="true">${url}</guid><description>${xml(post.description)}</description><pubDate>${new Date(file.created || file.modified).toUTCString()}</pubDate></item>`);
          } else {
            const images = seoHelper.extractImages(post.html, base).slice(0, 3)
              .map(url => `<image:image><image:loc>${xml(url)}</image:loc></image:image>`).join('');
            items.push(`<url><loc>${url}</loc><lastmod>${new Date(file.modified).toISOString()}</lastmod>${images}</url>`);
          }
        }
        document = '<?xml version="1.0" encoding="UTF-8"?>' + (rss ?
          `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${xml(config.siteTitle || 'PowerWiki')}</title><link>${xml(base + '/')}</link><description>${xml(config.siteDescription)}</description><atom:link href="${xml(base + '/rss.xml')}" rel="self" type="application/rss+xml"/>${items.join('')}</channel></rss>` :
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"><url><loc>${xml(base + '/')}</loc></url>${items.join('')}</urlset>`);
        cacheManager.set(type, key, document, Infinity);
      }
      res.type('application/xml').send(document);
    } catch (error) {
      console.error('Feed generation failed:', error);
      res.status(503).type('application/xml').send('<error>Service unavailable</error>');
    }
  });
  return router;
}
module.exports = { createApiFeedRoutes };
