const express = require('express');
const router = express.Router();
const fs = require('fs-extra');
const path = require('path');
const env = require('../../config/env');
const { t } = require('../../config/i18n');

function getGitManager(config) {
  const GitManager = require('../../utils/gitManager');
  return new GitManager(config.gitRepo, config.repoBranch, env.GIT_CACHE_DIR);
}

// API: 获取本地图片文件
// 图片存储在各文章目录的 images 文件夹中
router.get('/image/*', async (req, res) => {
  try {
    const config = req.app.get('config');
    const gitManager = getGitManager(config);
    
    let imagePath = req.params[0];

    // 处理可能的双重编码
    try {
      let decodedPath = decodeURIComponent(imagePath);
      if (decodedPath.includes('%')) {
        decodedPath = decodeURIComponent(decodedPath);
      }
      imagePath = decodedPath;
    } catch (e) {
      console.warn(t('error.imageDecodeFailed') + ':', imagePath);
    }

    // 构建完整路径
    const fullPath = path.join(gitManager.repoPath, imagePath);

    // 检查文件是否存在
    if (!await fs.pathExists(fullPath)) {
      console.warn(t('error.imageFileNotFound') + ':', fullPath);
      return res.status(404).send(t('error.imageNotFound'));
    }

    // 读取图片文件
    const imageBuffer = await fs.readFile(fullPath);
    const fileName = path.basename(imagePath);

    // 根据扩展名设置 Content-Type
    const ext = path.extname(imagePath).toLowerCase();
    const contentTypes = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon'
    };
    const contentType = contentTypes[ext] || 'application/octet-stream';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Content-Length', imageBuffer.length);

    // 设置缓存头（图片可以长期缓存）
    res.setHeader('Cache-Control', 'public, max-age=31536000');

    res.send(imageBuffer);
  } catch (error) {
    console.error(t('error.getImageFailed') + ':', error.message);
    res.status(404).send(t('error.imageNotFound'));
  }
});

module.exports = router;
