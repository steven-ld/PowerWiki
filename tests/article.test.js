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
    postUrl: value => `/post/${context.encodePath(value)}`,
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
      history: { replaceState() {} },
      location: {
        origin: 'http://localhost:3150'
      },
      scrollTo() {}
    },
    document: {
      title: '',
      querySelector() { return createElement(); },
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
    url: '/post/docs/no-headings.md',
    seo: { title: 'No headings - PowerWiki', type: 'article' },
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


test('相邻文章按创建时间排序，忽略修改时间，同时间按路径稳定排序', () => {
  const { context } = loadArticleScript();
  const files = [
    { path: 'c.md', created: '2026-01-03', modified: '2026-01-04' },
    { path: 'b.md', created: '2026-01-02', modified: '2026-12-01' },
    { path: 'a.md', created: '2026-01-02' },
    { path: 'missing.md' }, { path: 'invalid.md', created: 'invalid' }
  ];
  const original = files.map(file => file.path);
  const adjacent = context.getAdjacentPosts(files, 'b.md');
  assert.equal(adjacent.previous.path, 'a.md');
  assert.equal(adjacent.next.path, 'c.md');
  assert.equal(context.getAdjacentPosts(files, 'a.md').previous, null);
  assert.equal(context.getAdjacentPosts(files, 'c.md').next, null);
  assert.equal(context.getAdjacentPosts(files, 'missing.md').next, null);
  assert.equal(context.getAdjacentPosts([], 'b.md').previous, null);
  assert.deepEqual(files.map(file => file.path), original);
});

test('文章导航安全显示文件名，正确编码路径，切换后清除旧导航', () => {
  const navigation = createElement();
  navigation.replaceChildren = function () { this.children = []; };
  const { context } = loadArticleScript({
    postsFlat: [
      { path: '目录/a #.md', name: '<img onerror=alert(1)>', created: '2026-01-01' },
      { path: 'b.md', created: '2026-01-02' }
    ],
    encodePath: value => value.split('/').map(encodeURIComponent).join('/'),
    document: {
      getElementById: id => id === 'postNavigation' ? navigation : null,
      createElement
    }
  });
  context.renderPostNavigation({ path: 'b.md' });
  assert.equal(navigation.hidden, false);
  assert.equal(navigation.children.length, 1);
  const link = navigation.children[0];
  assert.equal(link.href, '/post/%E7%9B%AE%E5%BD%95/a%20%23.md');
  assert.equal(link.children[1].textContent, '<img onerror=alert(1)>');
  assert.equal(link.children[1].innerHTML, '');
  context.renderPostNavigation({ path: 'unknown.md' });
  assert.equal(navigation.hidden, true);
  assert.equal(navigation.children.length, 0);
});
