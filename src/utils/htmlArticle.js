/**
 * HTML Article Parser
 *
 * 把仓库中的 HTML 页面转换成和其他文章一致的正文：
 * - 只取 <body> 内容，忽略页面自己的 <head> 与外壳
 * - 默认按白名单清洗，去掉脚本、事件处理器、表单、iframe 等可执行内容
 * - 把正文里的相对地址改写为 Wiki 的根路径，图片统一走 /api/image
 *
 * 页面正文随后由前端放进 #postBody，与 Markdown 文章共用同一套阅读界面。
 *
 * @module utils/htmlArticle
 */

const path = require('path');
const sanitizeHtml = require('sanitize-html');
const { encodePath } = require('./articleAddress');
const {
  HTML_EXTENSIONS,
  IMAGE_EXTENSIONS,
  MARKDOWN_EXTENSIONS,
  extensionOf,
  safeDecodePath
} = require('./safePath');

const ALLOWED_TAGS = [
  'a', 'abbr', 'article', 'aside', 'b', 'blockquote', 'br', 'caption', 'cite', 'code',
  'col', 'colgroup', 'dd', 'del', 'details', 'dfn', 'div', 'dl', 'dt', 'em', 'figcaption',
  'figure', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr', 'i', 'img', 'ins', 'kbd',
  'li', 'main', 'mark', 'ol', 'p', 'pre', 'q', 's', 'samp', 'section', 'small', 'span',
  'strong', 'sub', 'summary', 'sup', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead',
  'time', 'tr', 'u', 'ul', 'var', 'wbr'
];

const ALLOWED_ATTRIBUTES = {
  '*': ['class', 'id', 'title', 'dir', 'lang'],
  a: ['href', 'target', 'rel', 'name'],
  img: ['src', 'srcset', 'sizes', 'alt', 'width', 'height', 'loading', 'decoding'],
  ol: ['start', 'reversed', 'type'],
  li: ['value'],
  table: ['summary'],
  td: ['colspan', 'rowspan', 'headers', 'scope', 'abbr'],
  th: ['colspan', 'rowspan', 'headers', 'scope', 'abbr'],
  details: ['open'],
  time: ['datetime'],
  blockquote: ['cite'],
  q: ['cite'],
  del: ['cite', 'datetime'],
  ins: ['cite', 'datetime']
};

const CONTENT_EXTENSIONS = new Set([...HTML_EXTENSIONS, ...MARKDOWN_EXTENSIONS, '.pdf']);
const SCHEME_RE = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;

function decodeEntities(value) {
  return String(value || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

function textOf(html) {
  return decodeEntities(String(html || '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function metaContent(source, name) {
  const tag = source.match(new RegExp(
    `<meta\\b[^>]*\\b(?:name|property)\\s*=\\s*["']${escapeRegExp(name)}["'][^>]*>`, 'i'));
  if (!tag) return '';
  const content = tag[0].match(/\bcontent\s*=\s*(["'])([\s\S]*?)\1/i);
  return content ? decodeEntities(content[2]).trim() : '';
}

/**
 * 提取 HTML 头部可复用的文章元信息，避免为目录列表做完整清洗。
 */
function extractHtmlMetadata(source) {
  const title = textOf((source.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i) || [])[1]);
  return {
    title,
    description: metaContent(source, 'description') || metaContent(source, 'og:description'),
    keywords: metaContent(source, 'keywords')
  };
}

function extractBody(source) {
  const body = /<body\b[^>]*>([\s\S]*?)<\/body\s*>/i.exec(source);
  if (body) return body[1];
  return String(source || '')
    .replace(/<!doctype[^>]*>/i, '')
    .replace(/<head\b[^>]*>[\s\S]*?<\/head\s*>/i, '')
    .replace(/<\/?html\b[^>]*>/gi, '');
}

function firstHeading(body) {
  return textOf((body.match(/<h1\b[^>]*>([\s\S]*?)<\/h1\s*>/i) || [])[1]);
}

/**
 * 把正文里的相对/根路径解析成仓库内路径；越界或隐藏文件返回 null。
 */
function resolveRepoPath(value, directory) {
  const decoded = safeDecodePath(value);
  const target = decoded === null ? value : decoded;
  if (!target || target.includes('\0')) return null;

  const joined = target.startsWith('/')
    ? path.posix.normalize(target).replace(/^\/+/, '')
    : path.posix.normalize(path.posix.join(directory, target));

  if (!joined || joined === '.' || joined.startsWith('..') || joined.startsWith('/')) return null;
  if (joined.split('/').some(segment => !segment || segment.startsWith('.'))) return null;
  return joined;
}

/**
 * 改写正文链接：
 * - 图片 → /api/image/<仓库路径>
 * - html/markdown/pdf → /post/<仓库路径>
 * - 其他静态资源 → /<仓库路径>
 */
function rewriteUrl(value, directory, kind) {
  const raw = String(value || '').trim();
  // 根绝对地址（/docs/x.html、/api/image/...、/static/...）本来就是站点地址，
  // 原样保留；只有相对地址需要按页面所在目录解析。
  if (!raw || raw.startsWith('#') || raw.startsWith('/') || SCHEME_RE.test(raw)) return value;

  const match = raw.match(/^([^?#]*)([?#][\s\S]*)?$/);
  if (!match || !match[1]) return value;
  const resolved = resolveRepoPath(match[1], directory);
  if (!resolved) return null;

  const suffix = match[2] || '';
  const extension = extensionOf(resolved);
  if (extension && IMAGE_EXTENSIONS.has(extension)) {
    return `/api/image/${encodePath(resolved)}${suffix}`;
  }
  if (extension && CONTENT_EXTENSIONS.has(extension)) {
    return `/post/${encodePath(resolved)}${suffix}`;
  }
  return `/${encodePath(resolved)}${suffix}`;
}

// data: 只允许常见位图，避免 data:text/html、data:image/svg+xml 这类可执行载荷。
const SAFE_DATA_IMAGE_RE = /^data:image\/(?:png|jpe?g|gif|webp|avif|bmp);/i;

function rewriteSrcset(value, directory) {
  return String(value || '').split(',').map(part => {
    const match = part.trim().match(/^(\S+)(\s+.*)?$/);
    if (!match) return '';
    const url = rewriteUrl(match[1], directory, 'image');
    return url ? `${url}${match[2] || ''}` : '';
  }).filter(Boolean).join(', ');
}

function sanitizeArticle(body, directory, sanitize) {
  const trusted = sanitize === false;
  const options = trusted ? {
    allowedTags: false,
    allowedAttributes: false,
    nonTextTags: [],
    // 可信模式由配置显式开启，允许 script/style，不再重复告警。
    allowVulnerableTags: true
  } : {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesByTag: { img: ['http', 'https', 'data'] },
    allowProtocolRelative: false
  };

  return sanitizeHtml(body, {
    ...options,
    transformTags: {
      a(tagName, attribs) {
        if (attribs.href) {
          const href = rewriteUrl(attribs.href, directory, 'link');
          if (href) attribs.href = href;
          else delete attribs.href;
        }
        if (attribs.target === '_blank') {
          const rel = new Set(String(attribs.rel || '').split(/\s+/).filter(Boolean));
          rel.add('noopener');
          rel.add('noreferrer');
          attribs.rel = Array.from(rel).join(' ');
        }
        return { tagName, attribs };
      },
      img(tagName, attribs) {
        if (attribs.src) {
          const src = /^data:/i.test(attribs.src) && !SAFE_DATA_IMAGE_RE.test(attribs.src)
            ? null : rewriteUrl(attribs.src, directory, 'image');
          if (src) attribs.src = src;
          else delete attribs.src;
        }
        if (attribs.srcset) {
          const srcset = rewriteSrcset(attribs.srcset, directory);
          if (srcset) attribs.srcset = srcset;
          else delete attribs.srcset;
        }
        return { tagName, attribs };
      }
    }
  });
}

/**
 * 把 HTML 文件解析成文章结构（字段与 parseMarkdown 保持一致）。
 *
 * @param {string} source - HTML 文件内容
 * @param {string} filePath - 仓库内相对路径，用于解析相对地址与回退标题
 * @param {Object} [options]
 * @param {boolean} [options.sanitize=true] - 是否按白名单清洗正文
 */
function parseHtmlArticle(source, filePath = '', options = {}) {
  const metadata = extractHtmlMetadata(source);
  const body = extractBody(source);
  const directory = path.posix.dirname(String(filePath || '').replace(/\\/g, '/'));
  const html = sanitizeArticle(body, directory === '.' ? '' : directory, options.sanitize);
  const fallbackTitle = path.posix.basename(String(filePath || '')).replace(/\.(html?|htm)$/i, '');
  const title = metadata.title || firstHeading(body) || fallbackTitle || '无标题';

  return {
    html,
    title,
    description: metadata.description,
    keywords: metadata.keywords,
    tags: [],
    frontmatter: {},
    raw: source
  };
}

module.exports = {
  parseHtmlArticle,
  extractHtmlMetadata,
  extractBody,
  sanitizeArticle
};
