/**
 * Static Routes
 *
 * 静态文件路由模块
 * 包含图片、PDF 等静态文件的访问
 *
 * @module routes/static
 */

const express = require('express');
const path = require('path');
const { t } = require('../config/i18n');
const {
  IMAGE_EXTENSIONS,
  extensionOf,
  resolveRequestFile
} = require('../utils/safePath');

const IMAGE_CONTENT_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.avif': 'image/avif',
  '.bmp': 'image/bmp'
};

// 直接打开 SVG 时禁止脚本执行，避免仓库图片成为同源 XSS 载体。
const SVG_CSP = "default-src 'none'; style-src 'unsafe-inline'; sandbox";

/**
 * 创建静态文件路由
 */
function createStaticRoutes(options) {
  const router = express.Router();
  const { gitManager } = options;

  // API: 获取本地图片文件
  router.get('/image/*', async (req, res) => {
    try {
      const file = await resolveRequestFile(gitManager.repoPath, req.params[0], {
        extensions: IMAGE_EXTENSIONS
      });

      if (!file) {
        console.warn(`⚠️  ${t('static.imageNotFound')}:`, req.params[0]);
        return res.status(404).send(t('static.imageNotFound'));
      }

      const fileName = path.basename(file.relative);
      res.setHeader('Content-Type', IMAGE_CONTENT_TYPES[file.extension] || 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`);
      res.setHeader('Content-Length', file.size);
      // 仓库图片会被 Git 更新但路径不变，不能使用 immutable，否则一年内不刷新。
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
      if (file.extension === '.svg') res.setHeader('Content-Security-Policy', SVG_CSP);

      res.sendFile(file.absolute, { dotfiles: 'deny' });
    } catch (error) {
      console.error(`❌ ${t('static.getImageFailed')}:`, error);
      res.status(404).send(t('static.imageNotFound'));
    }
  });

  // API: 获取 PDF 文件
  router.get('/pdf/*', async (req, res) => {
    try {
      const file = await resolveRequestFile(gitManager.repoPath, req.params[0], {
        extensions: new Set(['.pdf'])
      });

      if (!file) {
        if (extensionOf(req.params[0]) !== '.pdf') {
          return res.status(400).json({ error: t('static.notPdfFile') });
        }
        return res.status(404).json({ error: t('static.pdfNotFound') });
      }

      const fileName = path.basename(file.relative);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`);
      res.setHeader('Content-Length', file.size);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cross-Origin-Resource-Policy', 'same-site');

      res.sendFile(file.absolute, { dotfiles: 'deny' });
    } catch (error) {
      console.error(`❌ ${t('static.getPdfFailed')}:`, error);
      res.status(404).json({ error: t('static.pdfNotFound') });
    }
  });

  return router;
}

module.exports = { createStaticRoutes };
