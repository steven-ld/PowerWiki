const express = require('express');
const env = require("../../config/env");
const router = express.Router();
const path = require('path');
const { t } = require('../../config/i18n');

function getGitManager(config) {
  const GitManager = require('../../utils/gitManager');
  return new GitManager(config.gitRepo, config.repoBranch, env.GIT_CACHE_DIR);
}

router.get('/pdf/*', async (req, res) => {
  try {
    const config = req.app.get('config');
    let filePath = req.params[0];
    try {
      filePath = decodeURIComponent(filePath);
    } catch (e) {
      console.warn(t('error.pathDecodeFailed', filePath));
    }

    if (!filePath.endsWith('.pdf')) {
      return res.status(400).json({ error: t('error.notPdfFile') });
    }

    const gitManager = getGitManager(config);
    const pdfBuffer = await gitManager.readPdfFile(filePath);
    const fileName = path.basename(filePath);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (error) {
    console.error(t('error.getPdfFailed'), error.message);
    res.status(404).json({ error: t('error.pdfNotFound') });
  }
});

module.exports = router;
