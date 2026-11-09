const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const net = require('node:net');
const { spawn, execFileSync } = require('node:child_process');
const { once } = require('node:events');
const {
  resolveRepoFile,
  resolveRequestFile,
  safeDecodePath
} = require('../src/utils/safePath');

async function until(check, timeout = 10000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try { const value = await check(); if (value) return value; } catch (_) {}
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error('Service state timed out');
}

test('safePath rejects traversal, hidden files, symlinks and wrong extensions', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'powerwiki-safe-'));
  const outside = await fs.mkdtemp(path.join(os.tmpdir(), 'powerwiki-outside-'));
  try {
    await fs.writeFile(path.join(root, 'page.html'), '<h1>ok</h1>');
    await fs.writeFile(path.join(root, 'secret.txt'), 'secret');
    await fs.writeFile(path.join(root, '.env'), 'SECRET=1');
    await fs.writeFile(path.join(outside, 'outside.txt'), 'outside');
    await fs.symlink(path.join(outside, 'outside.txt'), path.join(root, 'link.txt'));
    await fs.mkdir(path.join(root, 'docs'));
    await fs.writeFile(path.join(root, 'docs', 'index.html'), '<h1>docs</h1>');

    assert.ok(await resolveRepoFile(root, 'page.html', { extensions: new Set(['.html']) }));
    assert.ok(await resolveRepoFile(root, 'docs/index.html'));
    assert.equal(await resolveRepoFile(root, 'docs/index.html', { extensions: new Set(['.css']) }), null);
    for (const bad of ['../outside.txt', 'docs/../../outside.txt', '/etc/passwd', '.env',
      '.git/config', 'docs/./index.html', 'docs//index.html', 'C:\\Windows\\win.ini', 'docs/%2e%2e%2fpage.html']) {
      assert.equal(await resolveRepoFile(root, bad), null, bad);
    }
    // 已解码的路由参数不再二次解码，字面 % 文件名仍可访问。
    assert.equal(await resolveRepoFile(root, 'secret%.txt', { decoded: true }), null);
    assert.ok(await resolveRepoFile(root, 'secret.txt', { decoded: true }));
    assert.equal(await resolveRepoFile(root, 'link.txt'), null);
    assert.equal(await resolveRepoFile(root, 'docs/'), null);

    await fs.writeFile(path.join(root, '100%.html'), '<h1>percent</h1>');
    const percent = await resolveRequestFile(root, '100%.html', { extensions: new Set(['.html']) });
    assert.equal(percent && percent.relative, '100%.html');
    assert.equal(safeDecodePath('%zz'), null);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
    await fs.rm(outside, { recursive: true, force: true });
  }
});

test('HTML pages, static priority, security headers, 404 and home stats', { timeout: 30000 }, async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'powerwiki-html-'));
  const repo = path.join(root, 'source');
  await fs.mkdir(path.join(repo, 'docs', 'static'), { recursive: true });
  await fs.mkdir(path.join(repo, 'static'), { recursive: true });

  await fs.writeFile(path.join(repo, 'README.md'), '# Home');
  await fs.writeFile(path.join(repo, 'docs', 'guide.html'),
    '<!DOCTYPE html><html><head><link rel="stylesheet" href="/static/site.css"></head><body><h1>Guide</h1></body></html>');
  await fs.writeFile(path.join(repo, 'docs', 'index.html'), '<!DOCTYPE html><html><body><h1>Docs Index</h1></body></html>');
  await fs.writeFile(path.join(repo, 'docs', 'release-1.0.html'), '<!DOCTYPE html><html><body><h1>Release</h1></body></html>');
  await fs.writeFile(path.join(repo, 'docs', '100%.html'), '<!DOCTYPE html><html><body><h1>Percent</h1></body></html>');
  await fs.writeFile(path.join(repo, 'docs', 'static', 'site.css'), 'body{color:rgb(1,2,3)}');
  await fs.writeFile(path.join(repo, 'static', 'site.css'), 'body{color:rgb(9,9,9)}');
  await fs.writeFile(path.join(repo, 'static', 'logo.svg'), '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
  await fs.writeFile(path.join(repo, 'docs', 'local.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  await fs.writeFile(path.join(repo, 'docs', 'static', 'picture.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  await fs.writeFile(path.join(repo, '404.html'), '<!DOCTYPE html><html><body>CUSTOM_404_MARKER</body></html>');
  await fs.writeFile(path.join(repo, 'package.json'), '{"name":"leak"}');
  await fs.writeFile(path.join(repo, 'secret.txt'), 'leak');

  const git = (...args) => execFileSync('git', args, { cwd: repo });
  git('init', '-b', 'master');
  git('config', 'user.name', 'Test');
  git('config', 'user.email', 'test@example.com');
  git('add', '.'); git('commit', '-qm', 'initial');

  const listener = net.createServer();
  listener.listen(0, '127.0.0.1'); await once(listener, 'listening');
  const port = listener.address().port;
  await new Promise(resolve => listener.close(resolve));

  const configPath = path.join(root, 'config.json');
  const config = {
    gitRepo: `file://${repo}`,
    repoBranch: 'master',
    port,
    autoSyncInterval: 300,
    siteTitle: 'HTML Test',
    pages: { home: 'README.md', notFound: '404.html' },
    html: { enabled: true, sandbox: true }
  };
  await fs.writeFile(configPath, JSON.stringify(config));

  const child = spawn(process.execPath, ['src/index.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, CONFIG_PATH: configPath, DATA_DIR: root, GIT_CACHE_DIR: path.join(root, 'cache') },
    stdio: 'pipe'
  });
  let output = '';
  child.stdout.on('data', data => { output += data; });
  child.stderr.on('data', data => { output += data; });

  const base = `http://127.0.0.1:${port}`;
  const request = (url, options) => fetch(base + url, options);
  const origin = base;

  try {
    await until(async () => {
      const response = await request('/api/posts');
      return response.ok && (await response.json()).flat.length === 1;
    });

    // 省略 .html、显式 .html 与目录 index 都返回同一个页面。
    for (const url of ['/docs/guide', '/docs/guide.html', '/docs', '/docs/']) {
      const response = await request(url);
      assert.equal(response.status, 200, url);
      assert.match(response.headers.get('content-type'), /text\/html/, url);
    }
    const guide = await (await request('/docs/guide')).text();
    assert.match(guide, /<h1>Guide<\/h1>/);
    // 页面名本身带点或百分号时仍可省略 .html。
    assert.match(await (await request('/docs/release-1.0')).text(), /<h1>Release<\/h1>/);
    assert.match(await (await request('/docs/100%25.html')).text(), /<h1>Percent<\/h1>/);
    const headers = (await request('/docs/guide')).headers;
    assert.match(headers.get('content-security-policy'), /sandbox/);
    assert.equal(headers.get('x-content-type-options'), 'nosniff');
    assert.equal(headers.get('x-frame-options'), 'SAMEORIGIN');
    assert.equal(headers.get('referrer-policy'), 'strict-origin-when-cross-origin');

    // /static/* 优先命中引用页面同级的 static，再回退到仓库顶层 static。
    const sameLevel = await (await request('/static/site.css', { headers: { referer: `${origin}/docs/guide` } })).text();
    assert.match(sameLevel, /rgb\(1,2,3\)/);
    const topLevel = await (await request('/static/site.css')).text();
    assert.match(topLevel, /rgb\(9,9,9\)/);
    const explicit = await (await request('/docs/static/site.css')).text();
    assert.match(explicit, /rgb\(1,2,3\)/);

    // SVG 直接打开时禁止脚本执行。
    const svg = await request('/static/logo.svg', { headers: { referer: `${origin}/docs/guide` } });
    assert.equal(svg.status, 200);
    assert.match(svg.headers.get('content-security-policy'), /sandbox/);
    assert.equal(svg.headers.get('x-content-type-options'), 'nosniff');

    // 非 static 资源只允许引用页面同级目录；static 目录不受此限制。
    assert.equal((await request('/docs/local.png', { headers: { referer: `${origin}/docs/guide` } })).status, 200);
    assert.equal((await request('/docs/local.png')).status, 404);
    assert.equal((await request('/docs/static/picture.png')).status, 200);
    assert.equal((await request('/package.json')).status, 404);
    assert.equal((await request('/secret.txt')).status, 404);

    // 图片/PDF 接口同样受路径穿越防护约束。
    assert.equal((await request('/api/image/..%2fpackage.json')).status, 404);
    assert.equal((await request('/api/image/%2e%2e%2fsecret.txt')).status, 404);
    assert.equal((await request('/api/pdf/..%2fpackage.json')).status, 400);

    // 自定义 404 页面。
    const custom = await request('/does-not-exist');
    assert.equal(custom.status, 404);
    assert.match(await custom.text(), /CUSTOM_404_MARKER/);
    assert.match(custom.headers.get('content-security-policy'), /sandbox/);
    assert.match((await (await request('/api/missing')).json()).error, /Not found/);

    // 首页访问单独计数，不进入文章排行。
    assert.deepEqual(await (await request('/api/home/view', { method: 'POST' })).json(), { homeViews: 1 });
    assert.deepEqual(await (await request('/api/home/view', { method: 'POST' })).json(), { homeViews: 2 });
    const stats = await (await request('/api/stats/detail')).json();
    assert.equal(stats.summary.totalViews, 2);
    assert.equal(stats.summary.homeViews, 2);
    assert.equal(stats.summary.totalPosts, 0);
    assert.equal(stats.postStats.length, 0);
    assert.equal(stats.ipStats[0].posts, 0);
    assert.equal(stats.summary.totalRecords, 2);

    // 配置的 404 文件缺失时回退到内置页面。
    await fs.writeFile(configPath, JSON.stringify({ ...config, pages: { home: 'README.md', notFound: 'missing-404.html' } }));
    await until(async () => {
      const body = await (await request('/still-missing')).text();
      return body.includes('class="not-found"') && !body.includes('CUSTOM_404_MARKER');
    }, 15000);
    const fallback = await request('/still-missing');
    assert.equal(fallback.status, 404);
    assert.match(await fallback.text(), /class="not-found"/);
  } catch (error) {
    error.message += '\n' + output;
    throw error;
  } finally {
    child.kill('SIGTERM');
    await once(child, 'exit');
    await fs.rm(root, { recursive: true, force: true });
  }
});
