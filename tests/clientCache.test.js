const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('浏览器长期缓存不按时间失效，版本不变复用，版本变化清除内容缓存', async () => {
  const memory = new Map();
  let version = 'v1';
  let calls = 0;
  const context = vm.createContext({
    console, Date, i18n: { t: key => key }, setInterval: () => {},
    localStorage: {
      getItem: key => memory.get(key) || null,
      setItem: (key, value) => memory.set(key, value),
      removeItem: key => memory.delete(key)
    },
    fetch: async () => { calls++; return { ok: true, json: async () => ({ version }) }; }
  });
  const script = fs.readFileSync(path.join(__dirname, '../public/js/cache.js'), 'utf8');
  vm.runInContext(script + '\nthis.cache = ClientCache;', context);
  const cache = context.cache;
  // 本地存储 mock 使用对象自身键，与浏览器 localStorage 的枚举行为一致。
  context.localStorage.setItem = (key, value) => { memory.set(key, value); context.localStorage[key] = value; };
  context.localStorage.removeItem = key => { memory.delete(key); delete context.localStorage[key]; };
  await Promise.all([cache.ensureVersion(), cache.ensureVersion()]);
  assert.equal(calls, 1);
  cache.set('posts', '', { tree: {} });
  cache.set('post', 'test.md', { html: 'old' });
  assert.equal(JSON.parse(memory.get(cache.getKey('posts'))).expiresAt, null);
  cache.clearExpired();
  assert.equal(await cache.ensureVersion(), false);
  assert.equal(cache.get('post', 'test.md').html, 'old');
  version = 'v2';
  assert.equal(await cache.ensureVersion(), true);
  assert.equal(cache.get('posts'), null);
  assert.equal(cache.get('post', 'test.md'), null);
  cache.set('post', 'test.md', { html: 'new', version: 'v2' });
  cache.set('post', 'test.md', { html: 'late old response', version: 'v1' });
  assert.equal(cache.get('post', 'test.md').html, 'new');
});
