/**
 * SEO Helper
 *
 * SEO 优化辅助工具模块
 * 提供 Meta 描述生成、关键词提取、结构化数据生成等功能
 *
 * @module seoHelper
 */

function stripHtml(html) {
  if (!html) return '';

  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function generateDescription(html, title = '', maxLength = 155) {
  if (!html) {
    return title ? `${title} - 文章详情` : '文章详情';
  }

  const plainText = stripHtml(html);

  if (!plainText) {
    return title ? `${title} - 文章详情` : '文章详情';
  }

  if (plainText.length <= maxLength) {
    return plainText;
  }

  const truncated = plainText.substring(0, maxLength);

  const sentenceEnd = Math.max(
    truncated.lastIndexOf('。'),
    truncated.lastIndexOf('！'),
    truncated.lastIndexOf('？'),
    truncated.lastIndexOf('.'),
    truncated.lastIndexOf('!'),
    truncated.lastIndexOf('?')
  );

  if (sentenceEnd > maxLength * 0.6) {
    return truncated.substring(0, sentenceEnd + 1);
  }

  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > maxLength * 0.8) {
    return truncated.substring(0, lastSpace) + '...';
  }

  return truncated + '...';
}

function extractKeywords(html, title = '', filePath = '', maxKeywords = 10) {
  const keywords = new Set();

  if (title) {
    keywords.add(title);
  }

  if (filePath) {
    const pathParts = filePath.split('/').filter(p => p && !p.endsWith('.md') && !p.endsWith('.markdown'));
    pathParts.forEach(part => {
      const cleanPart = part.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, ' ').trim();
      if (cleanPart && cleanPart.length >= 2) {
        keywords.add(cleanPart);
      }
    });
  }

  if (html) {
    const plainText = stripHtml(html);

    const headingMatches = html.match(/<h[23][^>]*>(.*?)<\/h[23]>/gi) || [];
    headingMatches.forEach(match => {
      const headingText = stripHtml(match).trim();
      if (headingText && headingText.length >= 2 && headingText.length <= 50) {
        keywords.add(headingText);
      }
    });

    const boldMatches = html.match(/<(strong|b)[^>]*>(.*?)<\/(strong|b)>/gi) || [];
    boldMatches.forEach(match => {
      const boldText = stripHtml(match).trim();
      if (boldText && boldText.length >= 2 && boldText.length <= 30) {
        keywords.add(boldText);
      }
    });

    const chineseWords = plainText.match(/[\u4e00-\u9fa5]{2,4}/g) || [];
    const wordFreq = {};
    chineseWords.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    const sortedWords = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);

    sortedWords.forEach(word => keywords.add(word));

    const englishWords = plainText.match(/\b[a-zA-Z]{3,}\b/g) || [];
    const englishFreq = {};
    englishWords.forEach(word => {
      const lower = word.toLowerCase();
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

  keywords.add('知识库');
  keywords.add('技术文档');

  const keywordArray = Array.from(keywords).slice(0, maxKeywords);

  return keywordArray.join(',');
}

function extractImages(html, baseUrl = '') {
  if (!html) return [];

  const images = [];
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let match;

  while ((match = imgRegex.exec(html)) !== null) {
    let imgUrl = match[1];

    if (imgUrl && !imgUrl.startsWith('http') && !imgUrl.startsWith('//')) {
      imgUrl = baseUrl + (imgUrl.startsWith('/') ? imgUrl : '/' + imgUrl);
    }

    if (imgUrl) {
      images.push(imgUrl);
    }
  }

  return images;
}

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
    if (index === pathParts.length - 1) return;

    currentPath += '/' + part;
    breadcrumbItems.push({
      '@type': 'ListItem',
      'position': index + 2,
      'name': part,
      'item': `${baseUrl}${currentPath}`
    });
  });

  if (breadcrumbItems.length === 1) {
    return null;
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': breadcrumbItems
  };
}

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

function generateWebSiteSchema({ name, description, url }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    'name': name,
    'description': description,
    'url': url
  };
}

function optimizeImageTags(html, defaultAlt = '文章图片') {
  if (!html) return html;

  return html.replace(/<img([^>]*)>/gi, (match, attrs) => {
    if (/alt\s*=/i.test(attrs)) {
      return match;
    }

    const srcMatch = attrs.match(/src\s*=\s*["']([^"']+)["']/i);
    const titleMatch = attrs.match(/title\s*=\s*["']([^"']+)["']/i);

    let alt = defaultAlt;
    if (titleMatch && titleMatch[1]) {
      alt = titleMatch[1];
    } else if (srcMatch && srcMatch[1]) {
      const filename = srcMatch[1].split('/').pop().split('.')[0];
      if (filename && filename !== 'image') {
        alt = filename.replace(/[-_]/g, ' ');
      }
    }

    const hasLoading = /loading\s*=/i.test(attrs);
    const loadingAttr = hasLoading ? '' : ' loading="lazy"';
    // HTML 清洗器会把 img 输出成自闭合形式，插入属性前去掉结尾的斜杠。
    const cleanAttrs = attrs.replace(/\s*\/\s*$/, '');

    return `<img${cleanAttrs} alt="${alt}"${loadingAttr}>`;
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
