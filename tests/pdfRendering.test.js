const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('PDF 只渲染可见页、限制并发，并在滚动和切换文章时释放画布', async () => {
  const tasks = [];
  const observers = [];
  let destroyed = false;
  function element(fragment = false) {
    return {
      fragment, children: [], style: {}, dataset: {}, width: 0, height: 0,
      appendChild(child) {
        if (child.fragment) child.children.forEach(item => this.appendChild(item));
        else { this.children.push(child); child.parent = this; }
      },
      remove() { if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this); },
      setAttribute() {}, addEventListener() {}, getContext: () => ({})
    };
  }
  const container = element();
  container.clientWidth = 800;
  const pdfDoc = { numPages: 40, getPage: async () => ({
    getViewport: ({ scale }) => ({ width: 612 * scale, height: 792 * scale }),
    cleanup() {},
    render() {
      let resolve, reject;
      const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
      const task = { promise, resolve, cancel() {
        const error = new Error('cancelled'); error.name = 'RenderingCancelledException'; reject(error);
      } };
      tasks.push(task);
      return task;
    }
  }) };
  const context = vm.createContext({
    console, window: { devicePixelRatio: 2 }, i18n: { t: key => key, tf: key => key },
    document: { getElementById: () => container, createElement: () => element(), createDocumentFragment: () => element(true) },
    IntersectionObserver: class {
      constructor(callback) { this.callback = callback; observers.push(this); }
      observe() {} disconnect() { this.disconnected = true; }
    },
    fakePdf: { GlobalWorkerOptions: {}, getDocument: () => ({ promise: Promise.resolve(pdfDoc), destroy: async () => { destroyed = true; } }) }
  });
  let source = fs.readFileSync(path.join(__dirname, '../public/js/media.js'), 'utf8');
  // 注入 PDF.js 测试替身，保持可见区域调度和资源清理逻辑原样执行。
  source = source.replace("await import(window.__PDFJS_URLS__?.module || '/pdfjs/build/pdf.min.mjs')", 'fakePdf');
  vm.runInContext(source + '\nthis.pdfState = () => activePdf;', context);
  const tick = () => new Promise(resolve => setImmediate(resolve));
  await context.renderPdfAsImages('/large.pdf');
  assert.equal(container.children.length, 40);
  assert.equal(tasks.length, 0);
  const visible = container.children.slice(0, 4);
  observers[0].callback(visible.map(target => ({ target, isIntersecting: true })));
  await tick();
  assert.equal(tasks.length, 2);
  tasks.slice(0, 2).forEach(task => task.resolve());
  await tick();
  assert.equal(tasks.length, 4);
  assert.equal(context.pdfState().running, 2);
  const firstCanvas = visible[0].children[0];
  assert.ok(firstCanvas.width > 0);
  observers[0].callback([{ target: visible[0], isIntersecting: false }]);
  assert.equal(firstCanvas.width, 0);
  assert.equal(visible[0].children.length, 0);
  context.stopPdfRendering();
  await tick();
  assert.equal(context.pdfState(), null);
  assert.equal(destroyed, true);
  assert.equal(observers[0].disconnected, true);
  assert.ok(visible.every(slot => slot.children.every(canvas => canvas.width === 0)));
});
