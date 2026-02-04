/**
 * Markdown Parser
 *
 * Markdown 解析模块
 * 负责将 Markdown 文本转换为 HTML，并提取标题和描述
 * 支持 YAML Frontmatter 解析
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

/**
 * 解析 YAML Frontmatter
 * @param {string} markdown - Markdown 内容
 * @returns {Object} { frontmatter: Object, content: string }
 */
function parseFrontmatter(markdown) {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = markdown.match(frontmatterRegex);

  if (!match) {
    return {
      frontmatter: {},
      content: markdown
    };
  }

  const frontmatterText = match[1];
  const content = match[2];
  const frontmatter = {};

  // 解析 YAML (简单实现)
  const lines = frontmatterText.split('\n');
  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim();
      let value = line.substring(colonIndex + 1).trim();

      // 处理数组 [tag1, tag2]
      if (value.startsWith('[') && value.endsWith(']')) {
        value = value.substring(1, value.length - 1)
          .split(',')
          .map(v => v.trim())
          .filter(v => v);
      }

      frontmatter[key] = value;
    }
  }

  return {
    frontmatter,
    content
  };
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

/**
 * 转换 Markdown 中的本地图片路径
 * 将 ![](images/xxx.png) 转换为 ![](/api/image/路径/images/xxx.png)
 * @param {string} markdown - Markdown 内容
 * @param {string} filePath - 当前 markdown 文件路径
 * @returns {string} 转换后的 Markdown
 */
function transformLocalImagePaths(markdown, filePath) {
  // 计算 md 文件所在目录
  const lastSlashIndex = filePath.lastIndexOf('/');
  const mdDir = lastSlashIndex !== -1 ? filePath.substring(0, lastSlashIndex) : '';

  // 匹配 ![xxx](images/yyy.png) 或 ![xxx](./images/yyy.png) 或 ![xxx](../images/yyy.png)
  // 转换为 ![xxx](/api/image/路径/images/yyy.png)
  return markdown.replace(/!\[([^\]]*)\]\((images[^)]*)\)/g, (match, alt, imagePath) => {
    // 移除 imagePath 开头的 ./ 或 ./
    const cleanImagePath = imagePath.replace(/^\.?\//, '');
    const apiPath = mdDir ? `/api/image/${mdDir}/${cleanImagePath}` : `/api/image/${cleanImagePath}`;
    return `![${alt}](${apiPath})`;
  });
}

// 解析 Markdown
// @param {string} markdown - Markdown 内容
// @param {string} filePath - 可选，markdown 文件路径，用于转换本地图片路径
function parseMarkdown(markdown, filePath = '') {
  // 先解析 Frontmatter
  const { frontmatter, content } = parseFrontmatter(markdown);

  // 转换本地图片路径（如果有 filePath）
  let processedContent = content;
  if (filePath) {
    processedContent = transformLocalImagePaths(content, filePath);
  }

  let html;
  // 兼容不同版本的 marked (只解析内容部分，不包含 Frontmatter)
  try {
    if (typeof marked.parse === 'function') {
      html = marked.parse(processedContent);
    } else if (typeof marked === 'function') {
      html = marked(content);
    } else {
      html = processedContent; // 降级处理
    }
  } catch (err) {
    console.error('Markdown 解析错误:', err);
    html = processedContent;
  }

  // 优先使用 Frontmatter 中的信息，否则从内容中提取
  const title = frontmatter.title || extractTitle(content);
  const description = frontmatter.description || extractDescription(content);
  const keywords = frontmatter.keywords || '';
  const tags = Array.isArray(frontmatter.tags) ? frontmatter.tags : (frontmatter.tags || '').split(',').map(t => t.trim()).filter(t => t);

  return {
    html,
    title,
    description,
    keywords,
    tags,
    frontmatter,
    raw: content  // 返回不含 Frontmatter 的原始内容
  };
}

module.exports = {
  parseMarkdown,
  extractTitle,
  extractDescription,
  transformLocalImagePaths
};

