const express = require('express');
const router = express.Router();
const cacheManager = require('../../utils/cacheManager');

router.get('/stats', (req, res) => {
  res.json(cacheManager.getStats());
});

router.post('/clear', (req, res) => {
  const { type, key } = req.body;

  if (type) {
    cacheManager.delete(type, key);
    res.json({ success: true, message: `已清除缓存: ${type}${key ? `/${key}` : ''}` });
  } else {
    cacheManager.clear();
    res.json({ success: true, message: '已清除所有缓存' });
  }
});

module.exports = router;
