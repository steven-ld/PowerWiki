const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const env = require('../../config/env');

// 统计页面
router.get('/', (req, res) => {
  const statsTemplate = fs.readFileSync(path.join(__dirname, '../../public', 'admin.html'), 'utf-8');
  
  // 根据环境变量设置语言
  const lang = env.LANG || 'zh-CN';
  
  // 替换页面中的语言设置
  let localizedTemplate = statsTemplate
    .replace(/lang="zh-CN"/, `lang="${lang === 'en' ? 'en' : 'zh-CN'}"`)
    .replace("const LANG = 'zh-CN'; // 将被服务器替换", `const LANG = '${lang}';`);
  
  res.send(localizedTemplate);
});

module.exports = router;
