/**
 * 多语言支持模块
 * 
 * 根据 LANG 环境变量加载对应的翻译文件
 * 默认使用中文 (zh-CN)
 */

const fs = require('fs');
const path = require('path');

// 支持的语言列表
const SUPPORTED_LANGS = ['zh-CN', 'en'];
const DEFAULT_LANG = 'zh-CN';

// 从环境变量获取语言设置
function detectLanguage() {
  const lang = process.env.LANG || process.env.LANGUAGE || DEFAULT_LANG;
  
  // 处理系统语言格式 (如 en_US.UTF-8 -> en)
  const shortLang = lang.split('.')[0].replace('_', '-');
  
  if (SUPPORTED_LANGS.includes(shortLang)) {
    return shortLang;
  }
  
  // 尝试匹配语言前缀 (如 en-US -> en)
  const prefix = shortLang.split('-')[0];
  const matched = SUPPORTED_LANGS.find(l => l.startsWith(prefix));
  
  return matched || DEFAULT_LANG;
}

const currentLang = detectLanguage();
const localeFile = path.join(__dirname, `${currentLang}.json`);
const fallbackFile = path.join(__dirname, `${DEFAULT_LANG}.json`);

let messages;
try {
  messages = JSON.parse(fs.readFileSync(localeFile, 'utf-8'));
} catch {
  console.warn(`Warning: Could not load ${localeFile}, falling back to ${DEFAULT_LANG}`);
  messages = JSON.parse(fs.readFileSync(fallbackFile, 'utf-8'));
}

/**
 * 获取翻译文本
 * @param {string} key - 翻译键 (如 'config.loaded')
 * @param {object} params - 替换参数 (如 { path: '/app/config.json' })
 * @returns {string} 翻译后的文本
 * 
 * @example
 * t('config.loaded', { path: '/app/config.json' })
 * // => "📄 配置文件加载自: /app/config.json"
 */
function t(key, params = {}) {
  let text = messages[key];
  
  if (!text) {
    console.warn(`Missing translation: ${key}`);
    return key;
  }
  
  for (const [k, v] of Object.entries(params)) {
    text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
  }
  
  return text;
}

/**
 * 获取当前语言
 * @returns {string} 当前语言代码
 */
function getCurrentLang() {
  return currentLang;
}

module.exports = { t, getCurrentLang };
