const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createClassList() {
  const names = new Set();

  return {
    add(...tokens) {
      tokens.forEach(token => names.add(token));
    },
    remove(...tokens) {
      tokens.forEach(token => names.delete(token));
    },
    contains(token) {
      return names.has(token);
    }
  };
}

function createElement() {
  let innerHTML = '';

  return {
    style: {},
    dataset: {},
    className: '',
    textContent: '',
    attributes: {},
    children: [],
    classList: createClassList(),
    set innerHTML(value) {
      innerHTML = value;
      this.children = [];
    },
    get innerHTML() {
      return innerHTML;
    },
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    getAttribute(name) {
      return this.attributes[name];
    },
    querySelector(selector) {
      if (selector === 'img') {
        const match = innerHTML.match(/<img[^>]+src=["']([^"']+)["']/i);
        return match ? { src: match[1] } : null;
      }

      return null;
    },
    querySelectorAll() {
      return [];
    },
    addEventListener() {},
    getBoundingClientRect() {
      return { top: 0 };
    }
  };
}

function loadArticleScript(contextOverrides = {}) {
  const scriptPath = path.join(__dirname, '..', 'public/js/article.js');
  const script = fs.readFileSync(scriptPath, 'utf8');

  const elements = {
    homeView: createElement(),
    postView: createElement(),
    postBody: createElement(),
    postDate: createElement(),
    postFileName: createElement(),
    postSize: createElement(),
    siteHeader: createElement(),
    siteFooter: createElement(),
    postViewCount: createElement(),
    tocSidebar: createElement(),
    pageTitle: createElement(),
    metaDescription: createElement(),
    metaKeywords: createElement(),
    canonicalUrl: createElement(),
    ogUrl: createElement(),
    ogTitle: createElement(),
    ogDescription: createElement(),
    ogImage: createElement(),
    ogSiteName: createElement(),
    twitterUrl: createElement(),
    twitterTitle: createElement(),
    twitterDescription: createElement(),
    twitterImage: createElement(),
    structuredData: createElement()
  };

  const context = {
    console,
    setTimeout,
    clearTimeout,
    fetch: async () => ({ ok: true, json: async () => ({}) }),
    ClientCache: {
      get() {
        return null;
      },
      set() {},
      delete() {}
    },
    i18n: {
      t(key) {
        return key;
      },
      tf(key, value) {
        return `${key}:${value}`;
      }
    },
    escapeHtml: (value) => value,
    encodePath: (value) => value,
    addCopyButtonsToCodeBlocks() {},
    addImageZoomFeature() {},
    renderMermaidBlocks() {},
    setupTOCScroll() {},
    updateFooterStats() {},
    updateSEOMetaTags() {},
    renderPdfAsImages() {},
    generateTOC() {
      return false;
    },
    postList: {
      querySelectorAll() {
        return [];
      }
    },
    siteConfig: {
      siteTitle: 'PowerWiki'
    },
    currentPost: null,
    window: {
      location: {
        origin: 'http://localhost:3150'
      },
      scrollTo() {}
    },
    document: {
      title: '',
      getElementById(id) {
        return elements[id] || null;
      },
      createElement() {
        return createElement();
      }
    },
    ...contextOverrides
  };

  vm.createContext(context);
  vm.runInContext(script, context);
  return {
    context,
    elements
  };
}

test('renderPost 在无标题 markdown 文章时不会重新显示目录栏', () => {
  const { context, elements } = loadArticleScript();
  const tocSidebar = elements.tocSidebar;

  tocSidebar.style.display = 'flex';

  context.renderPost({
    path: '/docs/no-headings.md',
    type: 'markdown',
    title: 'No headings',
    description: 'No headings article',
    html: '<p>plain content</p>',
    viewCount: 1,
    fileInfo: {
      size: 512,
      created: '2026-04-18T00:00:00.000Z',
      modified: '2026-04-18T00:00:00.000Z'
    }
  });

  assert.equal(tocSidebar.style.display, 'none');
});
