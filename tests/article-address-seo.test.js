const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const net = require('node:net');
const { spawn, execFileSync } = require('node:child_process');
const { once } = require('node:events');
const { articleAddress, buildAddressIndex } = require('../src/utils/articleAddress');
const { generateCode } = require('../src/utils/shortlink');
const { parseFrontmatter } = require('../src/utils/markdownParser');

async function until(check) {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    try { const value = await check(); if (value) return value; } catch (_) {}
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error('Service state timed out');
}

test('slug/aliases validate addresses and reject collisions', () => {
  const frontmatter = parseFrontmatter('---\nslug: "stable"\naliases:\n  - "/post/old.md"\n  - /article/previous\n---\n# Title').frontmatter;
  const file = { path: 'new.md', ...articleAddress({ path: 'new.md' }, frontmatter) };
  assert.equal(file.url, '/article/stable');
  const index = buildAddressIndex([file]);
  assert.equal(index.routes.get('/post/old.md'), file);
  assert.equal(index.codes.get(generateCode('old.md')), file);
  assert.equal(index.codes.get(generateCode('slug:previous')), file);
  assert.throws(() => articleAddress(file, { slug: '../bad' }), /Invalid/);
  assert.throws(() => articleAddress(file, { aliases: ['https://example.com'] }), /Invalid/);
  assert.throws(() => buildAddressIndex([file, { path: 'other.md', ...articleAddress({ path: 'other.md' }, { slug: 'stable' }) }]), /collision/);
});

test('SSR preserves replacement tokens and escapes metadata/bootstrap JSON', () => {
  const { renderPage } = require('../src/utils/pageRenderer');
  const template = require('node:fs').readFileSync(path.join(__dirname, '..', 'public/index.html'), 'utf8');
  const payload = '</script><script>alert(1)</script>';
  const post = { html: '<p>$& costs $10</p>', type: 'markdown', path: 'test.md', title: payload };
  const html = renderPage(template, { post, translations: {}, lang: 'zh-CN',
    seo: { title: payload, description: '" & <', type: 'article', structuredData: { headline: payload } } });
  assert.match(html, /<p>\$& costs \$10<\/p>/);
  assert.ok(html.includes('&lt;/script&gt;'));
  assert.deepEqual(JSON.parse(html.match(/window.__INITIAL_POST__=(.*?);<\/script>/)[1]), post);
  assert.equal(html.includes('<script>alert(1)</script>'), false);
});

test('stable routes, unified SSR/SEO, feeds, missing articles and Git rename', { timeout: 25000 }, async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'powerwiki-seo-'));
  const repo = path.join(root, 'source');
  await fs.mkdir(repo);
  const git = (...args) => execFileSync('git', args, { cwd: repo });
  git('init', '-b', 'master');
  git('config', 'user.name', 'Test');
  git('config', 'user.email', 'test@example.com');
  const article = '---\nslug: stable\ntitle: "A & B <Title>"\nauthor: Writer\ndescription: "description & details"\n---\n# Article\n\nVisible article body\n';
  await fs.writeFile(path.join(repo, 'README.md'), '# Home');
  await fs.writeFile(path.join(repo, 'old.md'), article);
  await fs.writeFile(path.join(repo, '中文 100%.md'), '# Special path');
  await fs.mkdir(path.join(repo, 'articles'));
  await fs.writeFile(path.join(repo, 'articles', '.gitkeep'), '');
  git('add', '.'); git('commit', '-qm', 'initial');
  const listener = net.createServer();
  listener.listen(0, '127.0.0.1'); await once(listener, 'listening');
  const port = listener.address().port;
  await new Promise(resolve => listener.close(resolve));
  const configPath = path.join(root, 'config.json');
  await fs.writeFile(configPath, JSON.stringify({ gitRepo: `file://${repo}`, repoBranch: 'master', port,
    autoSyncInterval: 300, siteTitle: 'Test & Wiki', siteUrl: 'https://wiki.example', pages: { home: 'README.md' } }));
  const child = spawn(process.execPath, ['src/index.js'], { cwd: path.join(__dirname, '..'),
    env: { ...process.env, CONFIG_PATH: configPath, DATA_DIR: root, GIT_CACHE_DIR: path.join(root, 'cache') }, stdio: 'pipe' });
  let output = '';
  child.stdout.on('data', data => { output += data; }); child.stderr.on('data', data => { output += data; });
  const base = `http://127.0.0.1:${port}`;
  const request = (url, options) => fetch(base + url, options);
  try {
    await until(async () => {
      const response = await request('/api/posts');
      return response.ok && (await response.json()).flat.length === 3;
    });
    const redirect = await request('/post/old.md', { redirect: 'manual' });
    assert.equal(redirect.status, 301);
    assert.equal(redirect.headers.get('location'), '/article/stable');
    const normal = await (await request('/article/stable')).text();
    const bot = await (await request('/article/stable', { headers: { 'user-agent': 'Googlebot' } })).text();
    assert.equal(normal, bot);
    assert.match(normal, /id="postView" class="view active"/);
    assert.match(normal, /id="postBody" class="markdown-body">[\s\S]*Visible article body/);
    assert.match(normal, /id="canonicalUrl" href="https:\/\/wiki.example\/article\/stable"/);
    assert.match(normal, /A &amp; B &lt;Title&gt;/);
    const bootstrap = JSON.parse(normal.match(/window.__INITIAL_POST__=(.*?);<\/script>/)[1]);
    const api = await (await request('/api/post/old.md')).json();
    assert.deepEqual(bootstrap.seo, api.seo);
    assert.equal(api.seo.structuredData.datePublished, api.fileInfo.created);
    assert.equal(api.seo.structuredData.author.name, 'Writer');
    const stats = await (await request('/api/stats/detail')).json();
    assert.equal(stats.summary.totalViews, 1); // SSR never double-counts hydration.
    for (const url of ['/post/missing.md', '/article/missing', '/api/post/missing.md', '/api/shortlink/missing.md']) {
      assert.equal((await request(url)).status, 404);
    }
    assert.match(await (await request('/post/missing.md')).text(), /noindex/);
    const special = '/post/' + encodeURIComponent('中文 100%.md');
    assert.equal((await request(special)).status, 200);
    assert.equal((await request('/api/post/' + encodeURIComponent('中文 100%.md'))).status, 200);
    const home = await (await request('/')).text();
    assert.equal(home, await (await request('/', { headers: { 'user-agent': 'Googlebot' } })).text());
    assert.match(home, /<h1>Home<\/h1>/);
    const config = await (await request('/api/config')).json();
    assert.equal(config.seo.url, 'https://wiki.example/');
    assert.match(home, /id="ogSiteName" content="Test &amp; Wiki"/);
    assert.equal(JSON.parse(home.match(/id="structuredData">(.*?)<\/script>/)[1]).url, config.seo.structuredData.url);
    for (const feed of ['/rss.xml', '/sitemap.xml']) {
      const xml = await (await request(feed)).text();
      assert.match(xml, /https:\/\/wiki.example\/article\/stable/);
      assert.doesNotMatch(xml, /https:\/\/wiki.example\/post\/old.md/);
      if (feed === '/rss.xml') assert.match(xml, /Test &amp; Wiki/);
    }
    const code = (await (await request('/api/shortlink/old.md')).json()).code;
    const version = api.version;
    git('mv', 'old.md', 'new.md');
    await fs.writeFile(path.join(repo, 'new.md'), article.replace('slug: stable', 'slug: stable\naliases: [/post/old.md, /article/previous]'));
    git('add', '.'); git('commit', '-qm', 'rename');
    await until(async () => {
      const response = await request('/api/posts');
      return response.ok && (await response.json()).version !== version;
    });
    for (const old of ['/post/old.md', '/article/previous']) {
      const response = await request(old, { redirect: 'manual' });
      assert.equal(response.status, 301);
      assert.equal(response.headers.get('location'), '/article/stable');
    }
    for (const short of [code, generateCode('old.md')]) {
      assert.equal((await request('/s/' + short, { redirect: 'manual' })).headers.get('location'), '/article/stable');
    }
    assert.equal((await (await request('/api/shortlink/new.md')).json()).code, code);
    assert.match(await (await request('/article/stable')).text(), /Visible article body/);
    // Explicit pages outside the menu's mdPath remain reachable; missing page config is harmless.
    const configuration = JSON.parse(await fs.readFile(configPath, 'utf8'));
    await fs.writeFile(configPath, JSON.stringify({ ...configuration, mdPath: 'articles', pages: { home: 'README.md', about: 'new.md' } }));
    await until(async () => {
      const response = await request('/api/posts');
      return response.ok && (await response.json()).flat.length === 2;
    });
    assert.equal((await request('/article/stable')).status, 200);
    assert.match(await (await request('/')).text(), /<h1>Home<\/h1>/);
    await fs.writeFile(configPath, JSON.stringify({ ...configuration, pages: { home: 'missing.md' } }));
    await until(async () => (await (await request('/api/config')).json()).pages.home === 'missing.md');
    assert.equal((await request('/api/posts')).status, 200);
  } catch (error) { error.message += '\n' + output; throw error; }
  finally {
    child.kill('SIGTERM'); await once(child, 'exit'); await fs.rm(root, { recursive: true, force: true });
  }
});
