const { encodePath } = require('./articleAddress');
const escapeHtml = value => String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const safeJSON = value => JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

function renderPage(template, { seo, post, home, translations, lang, readerMode }) {
  let html = template.replace(/lang="zh-CN"/, `lang="${lang === 'en' ? 'en' : 'zh-CN'}"`);
  html = html.replace(/(<title id="pageTitle">)[\s\S]*?(<\/title>)/, (_, a, b) => a + escapeHtml(seo.title) + b);
  const attributes = { metaDescription: seo.description, metaKeywords: seo.keywords,
    ogSiteName: seo.siteName, canonicalUrl: seo.url, ogUrl: seo.url, ogTitle: seo.title, ogDescription: seo.description,
    ogImage: seo.image, twitterUrl: seo.url, twitterTitle: seo.title,
    twitterDescription: seo.description, twitterImage: seo.image };
  for (const [id, value] of Object.entries(attributes)) {
    html = html.replace(new RegExp(`(<[^>]+id="${id}"[^>]+(?:content|href)=")[^"]*(")`), (_, a, b) => a + escapeHtml(value) + b);
  }
  html = html.replace(/(property="og:type" content=")[^"]*/, `$1${seo.type}`);
  html = html.replace(/(<script type="application\/ld\+json" id="structuredData">)[\s\S]*?(<\/script>)/,
    (_, a, b) => a + safeJSON(seo.structuredData) + b);
  if (post) {
    html = html.replace('id="homeView" class="view active"', 'id="homeView" class="view"')
      .replace('id="postView" class="view"', 'id="postView" class="view active"')
      .replace('<div id="postBody" class="markdown-body"></div>',
        () => `<div id="postBody" class="markdown-body" data-server-rendered="1">${post.type === 'pdf' ? `<h1>${escapeHtml(post.title)}</h1><a href="/api/pdf/${encodePath(post.path)}">PDF</a>` : post.html}</div>`);
  } else if (home) {
    html = html.replace('<!-- 首页内容由模板加载 -->', () => home);
  }
  // HTML 首页与 HTML 文章首帧就是沉浸布局：若先按窄栏渲染、等脚本再撑开，
  // 用户会看到一次明显的宽度跳变。把状态直接写进首屏标记，过渡自然不会发生。
  if (readerMode) {
    html = html.replace(/<html([^>]*)>/, '<html$1 class="reader-expanded">')
      .replace('<body>', '<body class="reader-expanded">');
  }
  html = html.replace('</head>', () => `<script>window.__I18N__=${safeJSON(translations)};window.__INITIAL_POST__=${safeJSON(post || null)};</script></head>`);
  return html;
}

module.exports = { renderPage, escapeHtml, safeJSON };
