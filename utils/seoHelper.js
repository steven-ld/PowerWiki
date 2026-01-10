/**
 * SEO Helper
 *
 * SEO 优化辅助工具模块
 * 提供 Meta 描述生成、关键词提取、结构化数据生成等功能
 *
 * @module seoHelper
 */

/**
 * 从 HTML 中提取纯文本
 * @param {string} html - HTML 内容
 * @returns {string} 纯文本内容
 */
function stripHtml(html) {
  if (!html) return '';

  return html
    // 移除脚本和样式标签
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    // 移除所有 HTML 标签
    .replace(/<[^>]+>/g, ' ')
    // 解码 HTML 实体
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // 移除多余空格和换行
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 生成文章摘要（用于 Meta Description）
 * @param {string} html - 文章 HTML 内容
 * @param {string} title - 文章标题
 * @param {number} maxLength - 最大长度（默认 155）
 * @returns {string} 文章摘要
 */
function generateDescription(html, title = '', maxLength = 155) {
  if (!html) {
    return title ? `${title} - 文章详情` : '文章详情';
  }

  // 提取纯文本
  const plainText = stripHtml(html);

  if (!plainText) {
    return title ? `${title} - 文章详情` : '文章详情';
  }

  // 如果文本长度小于最大长度，直接返回
  if (plainText.length <= maxLength) {
    return plainText;
  }

  // 截取到最大长度，并在句子边界处截断
  const truncated = plainText.substring(0, maxLength);

  // 尝试在句号、问号、感叹号处截断
  const sentenceEnd = Math.max(
    truncated.lastIndexOf('。'),
    truncated.lastIndexOf('！'),
    truncated.lastIndexOf('？'),
    truncated.lastIndexOf('.'),
    truncated.lastIndexOf('!'),
    truncated.lastIndexOf('?')
  );

  if (sentenceEnd > maxLength * 0.6) {
    // 如果找到合适的句子结尾（至少是目标长度的 60%）
    return truncated.substring(0, sentenceEnd + 1);
  }

  // 否则在空格处截断
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > maxLength * 0.8) {
    return truncated.substring(0, lastSpace) + '...';
  }

  // 直接截断并添加省略号
  return truncated + '...';
}

/**
 * 提取关键词
 * @param {string} html - 文章 HTML 内容
 * @param {string} title - 文章标题
 * @param {string} filePath - 文件路径（用于提取目录名）
 * @param {number} maxKeywords - 最大关键词数量（默认 10）
 * @returns {string} 逗号分隔的关键词列表
 */
function extractKeywords(html, title = '', filePath = '', maxKeywords = 10) {
  const keywords = new Set();

  // 添加文章标题作为关键词
  if (title) {
    keywords.add(title);
  }

  // 从文件路径提取目录名作为关键词
  if (filePath) {
    const pathParts = filePath.split('/').filter(p => p && !p.endsWith('.md') && !p.endsWith('.markdown'));
    pathParts.forEach(part => {
      // 移除特殊字符，只保留中英文和数字
      const cleanPart = part.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, ' ').trim();
      if (cleanPart && cleanPart.length >= 2) {
        keywords.add(cleanPart);
      }
    });
  }

  // 从内容中提取关键词
  if (html) {
    const plainText = stripHtml(html);

    // 提取 H2、H3 标题
    const headingMatches = html.match(/<h[23][^>]*>(.*?)<\/h[23]>/gi) || [];
    headingMatches.forEach(match => {
      const headingText = stripHtml(match).trim();
      if (headingText && headingText.length >= 2 && headingText.length <= 50) {
        keywords.add(headingText);
      }
    });

    // 提取强调的内容（加粗）
    const boldMatches = html.match(/<(strong|b)[^>]*>(.*?)<\/(strong|b)>/gi) || [];
    boldMatches.forEach(match => {
      const boldText = stripHtml(match).trim();
      if (boldText && boldText.length >= 2 && boldText.length <= 30) {
        keywords.add(boldText);
      }
    });

    // 中文分词（简单实现）：提取 2-4 字的中文词组
    const chineseWords = plainText.match(/[\u4e00-\u9fa5]{2,4}/g) || [];
    const wordFreq = {};
    chineseWords.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    // 提取出现频率较高的词
    const sortedWords = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);

    sortedWords.forEach(word => keywords.add(word));

    // 提取英文单词（3个字母以上）
    const englishWords = plainText.match(/\b[a-zA-Z]{3,}\b/g) || [];
    const englishFreq = {};
    englishWords.forEach(word => {
      const lower = word.toLowerCase();
      // 排除常见停用词
      if (!['the', 'and', 'for', 'with', 'this', 'that', 'from', 'have', 'been', 'will'].includes(lower)) {
        englishFreq[lower] = (englishFreq[lower] || 0) + 1;
      }
    });

    const sortedEnglish = Object.entries(englishFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);

    sortedEnglish.forEach(word => keywords.add(word));
  }

  // 添加默认关键词
  keywords.add('知识库');
  keywords.add('技术文档');

  // 转换为数组并限制数量
  const keywordArray = Array.from(keywords).slice(0, maxKeywords);

  return keywordArray.join(',');
}

/**
 * 提取文章中的所有图片
 * @param {string} html - HTML 内容
 * @param {string} baseUrl - 网站基础 URL
 * @returns {Array} 图片 URL 数组
 */
function extractImages(html, baseUrl = '') {
  if (!html) return [];

  const images = [];
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let match;

  while ((match = imgRegex.exec(html)) !== null) {
    let imgUrl = match[1];

    // 转换相对路径为绝对路径
    if (imgUrl && !imgUrl.startsWith('http') && !imgUrl.startsWith('//')) {
      imgUrl = baseUrl + (imgUrl.startsWith('/') ? imgUrl : '/' + imgUrl);
    }

    if (imgUrl) {
      images.push(imgUrl);
    }
  }

  return images;
}

/**
 * 生成面包屑导航结构化数据
 * @param {string} filePath - 文件路径
 * @param {string} baseUrl - 网站基础 URL
 * @param {string} siteTitle - 网站标题
 * @returns {Object} BreadcrumbList Schema
 */
function generateBreadcrumbSchema(filePath, baseUrl, siteTitle) {
  const pathParts = filePath.split('/').filter(p => p);
  const breadcrumbItems = [
    {
      '@type': 'ListItem',
      'position': 1,
      'name': siteTitle || '首页',
      'item': baseUrl
    }
  ];

  let currentPath = '';
  pathParts.forEach((part, index) => {
    // 最后一个元素是文件名，不加入面包屑
    if (index === pathParts.length - 1) return;

    currentPath += '/' + part;
    breadcrumbItems.push({
      '@type': 'ListItem',
      'position': index + 2,
      'name': part,
      'item': `${baseUrl}${currentPath}`
    });
  });

  // 如果只有首页，不生成面包屑
  if (breadcrumbItems.length === 1) {
    return null;
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': breadcrumbItems
  };
}

/**
 * 生成文章 Schema.org 结构化数据
 * @param {Object} options - 配置选项
 * @returns {Object} Article Schema
 */
function generateArticleSchema({
  title,
  description,
  url,
  datePublished,
  dateModified,
  authorName,
  authorUrl,
  image,
  keywords
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    'headline': title,
    'description': description,
    'url': url
  };

  if (datePublished) {
    schema['datePublished'] = datePublished;
  }

  if (dateModified) {
    schema['dateModified'] = dateModified;
  }

  if (authorName) {
    schema['author'] = {
      '@type': 'Organization',
      'name': authorName
    };

    if (authorUrl) {
      schema['author']['url'] = authorUrl;
    }
  }

  if (image) {
    schema['image'] = image;
  }

  if (keywords) {
    schema['keywords'] = keywords;
  }

  return schema;
}

/**
 * 生成网站 Schema.org 结构化数据
 * @param {Object} options - 配置选项
 * @returns {Object} WebSite Schema
 */
function generateWebSiteSchema({
  name,
  description,
  url
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    'name': name,
    'description': description,
    'url': url
  };
}

/**
 * 优化图片标签（添加 alt 属性）
 * @param {string} html - HTML 内容
 * @param {string} defaultAlt - 默认 alt 文本
 * @returns {string} 优化后的 HTML
 */
function optimizeImageTags(html, defaultAlt = '文章图片') {
  if (!html) return html;

  return html.replace(/<img([^>]*)>/gi, (match, attrs) => {
    // 检查是否已有 alt 属性
    if (/alt\s*=/i.test(attrs)) {
      return match; // 已有 alt，不修改
    }

    // 尝试从 src 或 title 提取有意义的 alt
    const srcMatch = attrs.match(/src\s*=\s*["']([^"']+)["']/i);
    const titleMatch = attrs.match(/title\s*=\s*["']([^"']+)["']/i);

    let alt = defaultAlt;
    if (titleMatch && titleMatch[1]) {
      alt = titleMatch[1];
    } else if (srcMatch && srcMatch[1]) {
      // 从文件名提取
      const filename = srcMatch[1].split('/').pop().split('.')[0];
      if (filename && filename !== 'image') {
        alt = filename.replace(/[-_]/g, ' ');
      }
    }

    // 添加 loading="lazy" 以支持懒加载
    const hasLoading = /loading\s*=/i.test(attrs);
    const loadingAttr = hasLoading ? '' : ' loading="lazy"';

    return `<img${attrs} alt="${alt}"${loadingAttr}>`;
  });
}

module.exports = {
  stripHtml,
  generateDescription,
  extractKeywords,
  extractImages,
  generateBreadcrumbSchema,
  generateArticleSchema,
  generateWebSiteSchema,
  optimizeImageTags
};
