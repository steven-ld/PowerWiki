/**
 * 多语言支持
 */

const fs = require('fs');
const path = require('path');
const env = require('./env');

let translations = {};

// 加载翻译文件
function loadTranslations() {
  try {
    const langFile = path.join(__dirname, '..', 'locales', `${env.LANG}.json`);
    if (fs.existsSync(langFile)) {
      translations = JSON.parse(fs.readFileSync(langFile, 'utf8'));
    } else {
      // 回退到中文
      const fallbackFile = path.join(__dirname, '..', 'locales', 'zh-CN.json');
      translations = JSON.parse(fs.readFileSync(fallbackFile, 'utf8'));
    }
  } catch (error) {
    console.error('Failed to load translations:', error);
    translations = {};
  }
}

// 获取翻译文本
function t(key, ...args) {
  const keys = key.split('.');
  let value = translations;
  
  for (const k of keys) {
    value = value?.[k];
  }
  
  if (typeof value === 'string' && args.length > 0) {
    return value.replace(/{(\d+)}/g, (match, index) => args[index] || match);
  }
  
  return value || key;
}

// 初始化
loadTranslations();

module.exports = { t, loadTranslations };
