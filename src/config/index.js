const fs = require('fs');
const path = require('path');

function loadConfig() {
  try {
    const config = require(path.join(__dirname, '../../config.json'));

    if (!config.gitRepo) {
      console.error('❌ 配置错误: gitRepo 是必需的');
      process.exit(1);
    }

    config.pages = config.pages || {};
    config.pages.home = config.pages.home || '';
    config.pages.about = config.pages.about || '';

    return config;
  } catch (error) {
    console.error('❌ 配置文件加载失败，请确保 config.json 文件存在');
    console.error('💡 提示: 可以复制 config.example.json 为 config.json 并修改配置');
    process.exit(1);
  }
}

module.exports = loadConfig;
