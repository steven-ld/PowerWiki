/**
 * 环境变量配置管理
 */

const path = require('path');

// 环境变量配置
const env = {
  // 配置文件路径
  CONFIG_PATH: process.env.CONFIG_PATH || path.join(__dirname, '..', 'config.json'),
  
  // 数据存储目录
  DATA_DIR: process.env.DATA_DIR || __dirname.replace('/config', ''),
  
  // Git 缓存目录
  GIT_CACHE_DIR: process.env.GIT_CACHE_DIR || path.join(__dirname, '..', '.git-cache'),
  
  // 语言设置
  LANG: process.env.LANG || 'zh-CN'
};

module.exports = env;
