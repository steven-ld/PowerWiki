const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const net = require('node:net');
const { spawn, execFileSync } = require('node:child_process');
const { once } = require('node:events');

async function until(check) {
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    try { const result = await check(); if (result) return result; } catch (_) {}
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error('Timed out waiting for service state');
}

test('同步预热、HTTP 版本检查、文章缓存失效、配置重载和静态哈希缓存', { timeout: 25000 }, async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'powerwiki-performance-'));
  const repo = path.join(root, 'source.git');
  await fs.mkdir(repo);
  const git = (...args) => execFileSync('git', args, { cwd: repo });
  git('init', '-b', 'master');
  git('config', 'user.name', 'Test');
  git('config', 'user.email', 'test@example.com');
  await fs.writeFile(path.join(repo, 'README.md'), '# Home');
  await fs.writeFile(path.join(repo, 'test.md'), '# Initial');
  git('add', '.');
  git('commit', '-qm', 'initial');
  const portServer = net.createServer();
  portServer.listen(0, '127.0.0.1');
  await once(portServer, 'listening');
  const port = portServer.address().port;
  await new Promise(resolve => portServer.close(resolve));
  const configPath = path.join(root, 'config.json');
  const config = { gitRepo: `file://${repo}`, repoBranch: 'master', port, autoSyncInterval: 300,
    sortOrder: 'modified', siteTitle: 'Test', pages: { home: 'README.md' } };
  await fs.writeFile(configPath, JSON.stringify(config));
  // 升级前的同步 JSON 写入可能留下损坏文件，不能阻断 Wiki 启动。
  await fs.writeFile(path.join(root, '.stats.json'), '{');
  await fs.writeFile(path.join(root, '.access-log.json'), '{');
  const child = spawn(process.execPath, ['src/index.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, CONFIG_PATH: configPath, DATA_DIR: root, GIT_CACHE_DIR: path.join(root, 'cache'), LANG: 'zh-CN' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let output = '';
  child.stdout.on('data', chunk => { output += chunk; });
  child.stderr.on('data', chunk => { output += chunk; });
  const base = `http://127.0.0.1:${port}`;
  const json = async url => {
    const response = await fetch(base + url);
    assert.equal(response.status, 200);
    return response.json();
  };
  try {
    // 尚未请求菜单时，启动同步已经预热完整目录缓存。
    await until(async () => (await json('/api/cache/stats')).size > 0);
    assert.equal((await fs.readdir(root)).filter(name => name.endsWith('.bak')).length, 2);
    const version = (await json('/api/version')).version;
    const response = await fetch(base + '/api/posts');
    const etag = response.headers.get('etag');
    const posts = await response.json();
    assert.equal(posts.flat.length, 2);
    assert.equal(posts.version, version);
    assert.equal((await fetch(base + '/api/posts', { headers: { 'If-None-Match': etag, 'Cache-Control': 'max-age=0' } })).status, 304);
    const sets = (await json('/api/cache/stats')).sets;
    await new Promise(resolve => setTimeout(resolve, 700));
    assert.equal((await json('/api/version')).version, version);
    await json('/api/posts');
    assert.equal((await json('/api/cache/stats')).sets, sets);

    const first = await json('/api/post/test.md');
    const articleSets = (await json('/api/cache/stats')).sets;
    const second = await json('/api/post/test.md');
    assert.equal(second.viewCount, first.viewCount + 1);
    assert.equal((await json('/api/cache/stats')).sets, articleSets);
    const view = await fetch(base + '/api/view/test.md', { method: 'POST' });
    assert.equal((await view.json()).viewCount, second.viewCount + 1);

    const html = await (await fetch(base + '/')).text();
    const assetUrl = html.match(/src="(\/app\.js\?v=[a-f0-9]+)"/)[1];
    const asset = await fetch(base + assetUrl);
    assert.match(asset.headers.get('cache-control'), /immutable/);
    const assetEtag = asset.headers.get('etag');
    assert.equal((await fetch(base + assetUrl, { headers: { 'If-None-Match': assetEtag, 'Cache-Control': 'max-age=0' } })).status, 304);
    assert.match((await fetch(base + '/app.js')).headers.get('cache-control'), /must-revalidate/);
    const deepHtml = await (await fetch(base + '/post/test.md')).text();
    assert.ok(deepHtml.includes(assetUrl));

    await fs.writeFile(configPath, JSON.stringify({ ...config, siteTitle: 'Updated', sortOrder: 'name' }));
    await until(async () => (await json('/api/version')).version !== version);
    assert.equal((await json('/api/config')).siteTitle, 'Updated');
    const configVersion = (await json('/api/version')).version;
    await fs.writeFile(path.join(repo, 'test.md'), '# Changed');
    await fs.writeFile(path.join(repo, 'new.md'), '# New');
    git('add', '.');
    git('commit', '-qm', 'content update');
    await until(async () => (await json('/api/version')).version !== configVersion);
    await until(async () => (await json('/api/posts')).flat.length === 3);
    assert.match((await json('/api/post/test.md')).html, /Changed/);
    child.kill('SIGTERM');
    await once(child, 'exit');
    assert.equal(JSON.parse(await fs.readFile(path.join(root, '.stats.json'), 'utf8')).postViews['test.md'], 4);
  } catch (error) {
    error.message += '\n' + output;
    throw error;
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill('SIGTERM');
      await once(child, 'exit');
    }
    await fs.rm(root, { recursive: true, force: true });
  }
});
