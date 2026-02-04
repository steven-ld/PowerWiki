const express = require('express');
const router = express.Router();
const path = require('path');

function getGitManager(config) {
  const GitManager = require('../../utils/gitManager');
  return new GitManager(config.gitRepo, config.repoBranch, './.git-repos');
}

router.get('/*', async (req, res) => {
  try {
    const config = req.app.get('config');
    let filePath = req.params[0];
    try {
      filePath = decodeURIComponent(filePath);
    } catch (e) {
      console.warn('路径解码失败，使用原始路径:', filePath);
    }

    if (!filePath.endsWith('.pdf')) {
      return res.status(400).json({ error: '不是 PDF 文件' });
    }

    const gitManager = getGitManager(config);
    const pdfBuffer = await gitManager.readPdfFile(filePath);
    const fileName = path.basename(filePath);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('获取 PDF 失败:', error);
    res.status(404).json({ error: 'PDF 文件不存在' });
  }
});

module.exports = router;
