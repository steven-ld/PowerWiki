/**
 * Markdown Parser
 * 
 * Markdown 解析模块
 * 负责将 Markdown 文本转换为 HTML，并提取标题和描述
 * 
 * @module markdownParser
 */

const { marked } = require('marked');
const hljs = require('highlight.js');

/**
 * 代码高亮函数
 * @param {string} code - 代码内容
 * @param {string} lang - 编程语言
 * @returns {string} 高亮后的 HTML
 */
const highlightCode = function(code, lang) {
  if (lang && hljs.getLanguage(lang)) {
    try {
      return hljs.highlight(code, { language: lang }).value;
    } catch (err) {
      console.error('代码高亮错误:', err);
    }
  }
  return hljs.highlightAuto(code).value;
};

// 配置 marked 选项
try {
  if (typeof marked.setOptions === 'function') {
    marked.setOptions({
      highlight: highlightCode,
      breaks: true,
      gfm: true
    });
  } else if (typeof marked.use === 'function') {
    marked.use({
      highlight: highlightCode,
      breaks: true,
      gfm: true
    });
  }
} catch (err) {
  console.warn('配置 marked 失败，使用默认配置:', err);
}

// 提取标题
function extractTitle(markdown) {
  const lines = markdown.split('\n');
  for (const line of lines) {
    if (line.startsWith('# ')) {
      return line.substring(2).trim();
    }
  }
  return '无标题';
}

// 提取描述（第一段文字）
function extractDescription(markdown) {
  const lines = markdown.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('```') && !trimmed.startsWith('![')) {
      return trimmed.substring(0, 150) + (trimmed.length > 150 ? '...' : '');
    }
  }
  return '';
}

// 解析 Markdown
function parseMarkdown(markdown) {
  let html;
  // 兼容不同版本的 marked
  try {
    if (typeof marked.parse === 'function') {
      html = marked.parse(markdown);
    } else if (typeof marked === 'function') {
      html = marked(markdown);
    } else {
      html = markdown; // 降级处理
    }
  } catch (err) {
    console.error('Markdown 解析错误:', err);
    html = markdown;
  }
  
  const title = extractTitle(markdown);
  const description = extractDescription(markdown);
  
  return {
    html,
    title,
    description,
    raw: markdown
  };
}

module.exports = {
  parseMarkdown,
  extractTitle,
  extractDescription
};

