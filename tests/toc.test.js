const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createElement() {
  return {
    style: {},
    innerHTML: '',
    querySelectorAll: () => [],
    addEventListener() {},
    scrollIntoView() {},
    classList: {
      add() {},
      remove() {},
      contains() {
        return false;
      }
    }
  };
}

function loadTocScript(contextOverrides = {}) {
  const scriptPath = path.join(__dirname, '..', 'public/js/toc.js');
  const script = fs.readFileSync(scriptPath, 'utf8');
  const context = {
    console,
    setTimeout,
    clearTimeout,
    escapeHtml: (value) => value,
    window: {
      pageYOffset: 0,
      scrollTo() {},
      addEventListener() {},
      requestAnimationFrame(callback) {
        callback();
      },
      history: {
        pushState() {}
      }
    },
    document: {
      getElementById() {
        return null;
      },
      querySelectorAll() {
        return [];
      }
    },
    postBody: {
      querySelectorAll() {
        return [];
      }
    },
    ...contextOverrides
  };

  vm.createContext(context);
  vm.runInContext(script, context);
  return context;
}

test('generateTOC 在没有标题时会清空旧目录并隐藏目录栏', () => {
  const tocNav = createElement();
  const tocSidebar = createElement();

  tocNav.innerHTML = '<ul><li>stale toc</li></ul>';
  tocSidebar.style.display = 'flex';

  const context = loadTocScript({
    document: {
      getElementById(id) {
        if (id === 'tocNav') return tocNav;
        if (id === 'tocSidebar') return tocSidebar;
        return null;
      },
      querySelectorAll() {
        return [];
      }
    },
    postBody: {
      querySelectorAll() {
        return [];
      }
    }
  });

  context.generateTOC();

  assert.equal(tocNav.innerHTML, '');
  assert.equal(tocSidebar.style.display, 'none');
});
