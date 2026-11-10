const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const net = require('node:net');
const { spawn, execFileSync } = require('node:child_process');
const { once } = require('node:events');
const {
  MAX_FILE_SIZE,
  resolveRepoFile,
  resolveRequestFile,
  safeDecodePath
} = require('../src/utils/safePath');
const { parseHtmlArticle, htmlRenderMode } = require('../src/utils/htmlArticle');
const { htmlSettings } = require('../src/routes/html');

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

    // 超过 50 MB 的文件不提供（稀疏文件，truncate 不会真的写入磁盘）。
    const bigHandle = await fs.open(path.join(root, 'big.css'), 'w');
    await bigHandle.truncate(MAX_FILE_SIZE + 1);
    await bigHandle.close();
    assert.equal(await resolveRepoFile(root, 'big.css', { extensions: new Set(['.css']) }), null);

    await fs.writeFile(path.join(root, '100%.html'), '<h1>percent</h1>');
    const percent = await resolveRequestFile(root, '100%.html', { extensions: new Set(['.html']) });
    assert.equal(percent && percent.relative, '100%.html');
    assert.equal(safeDecodePath('%zz'), null);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
    await fs.rm(outside, { recursive: true, force: true });
  }
});

test('HTML articles are sanitized and their assets rewritten', () => {
  const source = '<!DOCTYPE html><html><head><title>Doc</title>' +
    '<meta name="description" content="Desc">' +
    '<style>body{display:none}</style></head>' +
    '<body><h1>H</h1><script>alert(1)</script>' +
    '<img src="img/a.png" onerror="alert(1)">' +
    '<img src="data:text/html;base64,AAA">' +
    '<a href="javascript:alert(1)">x</a><a href="other.html">o</a><a href="../up.html">u</a>' +
    '<a href="#part">p</a><a href="/docs/root">r</a><img src="/api/image/docs/b.png">' +
    '<div style="color:red" onclick="alert(1)">d</div></body></html>';

  const article = parseHtmlArticle(source, 'docs/page.html');
  assert.equal(article.title, 'Doc');
  assert.equal(article.description, 'Desc');
  assert.doesNotMatch(article.html, /<script|alert\(1\)|onerror|javascript:|style=/i);
  assert.match(article.html, /src="\/api\/image\/docs\/img\/a\.png"/);
  assert.match(article.html, /href="\/post\/docs\/other\.html"/);
  assert.match(article.html, /href="\/post\/up\.html"/);
  assert.match(article.html, /href="#part"/);
  // 根绝对地址本来就是站点地址，保持原样，避免被再次加上 /post 或 /api/image 前缀。
  assert.match(article.html, /href="\/docs\/root"/);
  assert.match(article.html, /src="\/api\/image\/docs\/b\.png"/);
  assert.match(article.raw, /alert\(1\)/);

  // 没有 <title> 时用正文第一个 h1 作为标题。
  assert.equal(parseHtmlArticle('<body><h1>Only</h1></body>', 'docs/a.htm').title, 'Only');

  // 越界的数字实体不能让整篇文章解析失败。
  assert.equal(parseHtmlArticle('<title>&#x110000;</title><body>x</body>', 'bad.html').title, '�');
  assert.equal(parseHtmlArticle('<title>&#9999999999;</title><body>x</body>', 'bad.html').title, '�');
});

test('sandbox render mode embeds the original page in an isolated iframe', () => {
  const source = '<!DOCTYPE html><html><head><title>Lab</title>' +
    '<meta name="powerwiki-render" content="sandbox"></head>' +
    '<body><h1>Lab</h1><script>window.__LAB__=1</script><style>body{background:#000}</style></body></html>';

  assert.equal(htmlRenderMode(source), 'sandbox');
  assert.equal(htmlRenderMode('<meta content="full" name="powerwiki-render">'), 'sandbox');
  assert.equal(htmlRenderMode('<body><h1>plain</h1></body>'), 'article');

  const article = parseHtmlArticle(source, 'demo/lab.html');
  assert.equal(article.title, 'Lab');
  // 只有沙箱页面才进入沉浸式阅读，普通 HTML 正文照常随页面滚动。
  assert.equal(article.sandboxed, true);
  assert.equal(parseHtmlArticle('<body><h1>plain</h1></body>', 'demo/plain.html').sandboxed, false);
  assert.match(article.html, /<iframe class="html-sandbox-frame" src="\/full\/demo\/lab\.html"/);
  assert.match(article.html, /sandbox="allow-scripts/);
  assert.doesNotMatch(article.html, /allow-same-origin/);
  // 正文只包含 iframe 外壳，没有把原页面的脚本搬进文章 DOM。
  assert.doesNotMatch(article.html, /<script|background:#000/i);
  assert.match(article.raw, /window\.__LAB__=1/);
});

test('html sanitize defaults on and keeps the legacy sandbox switch', () => {
  assert.equal(htmlSettings({}).sanitize, true);
  assert.equal(htmlSettings({ html: {} }).sanitize, true);
  assert.equal(htmlSettings({ html: { sanitize: true } }).sanitize, true);
  assert.equal(htmlSettings({ html: { sanitize: false } }).sanitize, false);
  // 旧的 html.sandbox:false 等价于可信模式；显式 sanitize 优先。
  assert.equal(htmlSettings({ html: { sandbox: false } }).sanitize, false);
  assert.equal(htmlSettings({ html: { sanitize: true, sandbox: false } }).sanitize, true);
});

test('HTML pages, static priority, security headers, 404 and home stats', { timeout: 30000 }, async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'powerwiki-html-'));
  const repo = path.join(root, 'source');
  await fs.mkdir(path.join(repo, 'docs', 'static'), { recursive: true });
  await fs.mkdir(path.join(repo, 'static'), { recursive: true });

  await fs.writeFile(path.join(repo, 'README.md'), '# Home');
  await fs.writeFile(path.join(repo, 'docs', 'guide.html'),
    '<!DOCTYPE html><html><head><title>Guide Title</title>' +
    '<meta name="description" content="Guide description">' +
    '<style>body{display:none}</style></head>' +
    '<body><h1>Guide</h1><script>window.__XSS__=1</script>' +
    '<img src="local.png" onerror="window.__XSS__=2">' +
    '<a href="release-1.0.html">release</a>' +
    '<div style="color:red" onclick="window.__XSS__=3">styled</div></body></html>');
  await fs.writeFile(path.join(repo, 'docs', 'index.html'), '<!DOCTYPE html><html><body><h1>Docs Index</h1></body></html>');
  await fs.writeFile(path.join(repo, 'docs', 'release-1.0.html'), '<!DOCTYPE html><html><body><h1>Release</h1></body></html>');
  await fs.writeFile(path.join(repo, 'docs', '100%.html'), '<!DOCTYPE html><html><body><h1>Percent</h1></body></html>');
  await fs.writeFile(path.join(repo, 'docs', 'full.html'),
    '<!DOCTYPE html><html><head><title>Full Lab</title>' +
    '<meta name="powerwiki-render" content="sandbox">' +
    '<link rel="stylesheet" href="frame.css">' +
    '<link rel="stylesheet" href="assets/deep.css">' +
    '<style>body{background:#0b1020}</style></head>' +
    '<body><h1>Full Lab</h1><script>window.__FULL__="ran";</script></body></html>');
  await fs.writeFile(path.join(repo, 'docs', 'frame.css'), 'body{margin:0}');
  await fs.mkdir(path.join(repo, 'docs', 'assets'), { recursive: true });
  await fs.writeFile(path.join(repo, 'docs', 'assets', 'deep.css'), 'h1{color:#3370ff}');
  await fs.writeFile(path.join(repo, 'docs', 'static', 'site.css'), 'body{color:rgb(1,2,3)}');
  await fs.writeFile(path.join(repo, 'static', 'site.css'), 'body{color:rgb(9,9,9)}');
  await fs.writeFile(path.join(repo, 'static', 'logo.svg'), '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
  await fs.writeFile(path.join(repo, 'docs', 'local.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  await fs.writeFile(path.join(repo, 'docs', 'static', 'picture.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  await fs.writeFile(path.join(repo, '404.html'), '<!DOCTYPE html><html><body>CUSTOM_404_MARKER</body></html>');
  await fs.writeFile(path.join(repo, 'package.json'), '{"name":"leak"}');
  await fs.writeFile(path.join(repo, 'secret.txt'), 'leak');

  // /full/ 的目录回退、数据文件限制与软链接防护。
  await fs.mkdir(path.join(repo, 'docs', 'sub'), { recursive: true });
  await fs.writeFile(path.join(repo, 'docs', 'sub', 'index.html'),
    '<!DOCTYPE html><html><body><h1>SUB_INDEX</h1></body></html>');
  await fs.mkdir(path.join(repo, 'docs', 'static'), { recursive: true });
  await fs.writeFile(path.join(repo, 'docs', 'data.json'), '{"secret":"same-dir"}');
  await fs.writeFile(path.join(repo, 'docs', 'static', 'data.json'), '{"ok":"static-dir"}');
  await fs.writeFile(path.join(repo, 'static', 'data.txt'), 'top-level-static');
  const outsideDir = path.join(root, 'outside');
  await fs.mkdir(outsideDir);
  await fs.writeFile(path.join(outsideDir, 'outside.css'), 'body{color:red}');
  await fs.symlink(path.join(outsideDir, 'outside.css'), path.join(repo, 'docs', 'leak.css'));

  // 首页也可以是 HTML 文章。
  await fs.writeFile(path.join(repo, 'home.html'),
    '<!DOCTYPE html><html><head><title>Home HTML</title></head><body><h1>HOME_HTML</h1></body></html>');

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
    // 缓存目录名带点，回归覆盖 sendFile 对 dotfiles 的误判（默认 .git-cache）。
    env: { ...process.env, CONFIG_PATH: configPath, DATA_DIR: root, GIT_CACHE_DIR: path.join(root, '.cache') },
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
      return response.ok && (await response.json()).flat.some(file => file.path === 'docs/guide.html');
    });

    // HTML 页面不再独立输出：省略后缀、显式后缀都跳到统一的文章地址。
    const articleUrl = '/post/docs/guide.html';
    for (const url of ['/docs/guide', '/docs/guide.html']) {
      const response = await request(url, { redirect: 'manual' });
      assert.equal(response.status, 301, url);
      assert.equal(response.headers.get('location'), articleUrl, url);
    }
    const directoryRedirect = await request('/docs/', { redirect: 'manual' });
    assert.equal(directoryRedirect.status, 301);
    assert.equal(directoryRedirect.headers.get('location'), '/post/docs/index.html');
    // 查询串随跳转保留。
    const queryRedirect = await request('/docs/guide?x=1', { redirect: 'manual' });
    assert.equal(queryRedirect.headers.get('location'), '/post/docs/guide.html?x=1');

    // 文章地址走同一条 SSR 链路，和 Markdown 文章共用阅读界面。
    const article = await request(articleUrl);
    assert.equal(article.status, 200);
    assert.match(article.headers.get('content-type'), /text\/html/);
    const articleBody = await article.text();
    assert.match(articleBody, /<title[^>]*>Guide Title - HTML Test<\/title>/);
    // 正文由模板直接放进 #postBody，和 Markdown 文章共用同一块阅读区域。
    const rendered = articleBody.match(/<div id="postBody"[^>]*>([\s\S]*?)<\/div>/);
    assert.ok(rendered, 'postBody rendered');
    const body = rendered[1];
    assert.match(body, /<h1>Guide<\/h1>/);
    // 脚本、事件处理器与页面自带样式不会进入文章正文。
    assert.doesNotMatch(body, /<script|onerror=|style=|__XSS__/);
    // 相对资源与页面链接被改写为 Wiki 地址。
    assert.match(body, /src="\/api\/image\/docs\/local\.png"/);
    assert.match(body, /alt="local"/);
    assert.match(body, /href="\/post\/docs\/release-1\.0\.html"/);
    // 普通 HTML 文章按文档排版：reader-expanded 会锁住 body 滚动，这里不能出现。
    assert.doesNotMatch(articleBody, /<html[^>]*class="reader-expanded"|<body[^>]*class="reader-expanded"/);

    // API 返回同样的文章数据，原始内容仍可用于「原始」视图。
    const articleData = await (await request('/api/post/docs/guide.html')).json();
    assert.equal(articleData.type, 'html');
    assert.equal(articleData.sandboxed, false);
    assert.equal(articleData.title, 'Guide Title');
    assert.match(articleData.raw, /window\.__XSS__/);
    assert.doesNotMatch(articleData.html, /window\.__XSS__/);

    // 沙箱完整页面：文章正文是 iframe，原始页面由 /full/ 原样输出。
    const fullArticle = await (await request('/api/post/docs/full.html')).json();
    assert.equal(fullArticle.type, 'html');
    assert.equal(fullArticle.sandboxed, true);
    assert.equal(fullArticle.title, 'Full Lab');
    assert.match(fullArticle.html, /<iframe class="html-sandbox-frame" src="\/full\/docs\/full\.html"/);
    assert.doesNotMatch(fullArticle.html, /__FULL__/);
    assert.match(fullArticle.raw, /__FULL__/);

    const fullArticlePage = await (await request('/post/docs/full.html')).text();
    // 沙箱文章首帧即沉浸态，避免脚本接管时宽度跳一下。
    assert.match(fullArticlePage, /<html[^>]*class="reader-expanded"/);
    assert.match(fullArticlePage, /<body[^>]*class="reader-expanded"/);
    const fullRendered = fullArticlePage.match(/<div id="postBody"[^>]*>([\s\S]*?)<\/div>/);
    assert.ok(fullRendered, 'sandbox postBody rendered');
    assert.match(fullRendered[1], /<iframe class="html-sandbox-frame" src="\/full\/docs\/full\.html"/);
    assert.doesNotMatch(fullRendered[1], /__FULL__/);

    const fullPage = await request('/full/docs/full.html');
    assert.equal(fullPage.status, 200);
    assert.match(fullPage.headers.get('content-type'), /text\/html/);
    const fullCsp = fullPage.headers.get('content-security-policy');
    assert.match(fullCsp, /sandbox/);
    assert.match(fullCsp, /script-src/);
    assert.doesNotMatch(fullCsp, /allow-same-origin/);
    // 仍只允许同源页面嵌入。
    assert.match(fullCsp, /frame-ancestors 'self'/);
    assert.equal(fullPage.headers.get('x-content-type-options'), 'nosniff');
    const fullPageBody = await fullPage.text();
    assert.match(fullPageBody, /<script>window\.__FULL__/);
    assert.match(fullPageBody, /<style>body\{background:#0b1020\}<\/style>/);
    assert.match(fullPageBody, /href="frame\.css"/);

    // 相对资源（含子目录）与同级 static 都能正常取到。
    const frameCss = await request('/full/docs/frame.css');
    assert.equal(frameCss.status, 200);
    assert.match(frameCss.headers.get('content-type'), /text\/css/);
    // 沙箱文档是不透明源，它的子资源请求按跨源处理；same-site 会被浏览器拦截。
    assert.equal(frameCss.headers.get('cross-origin-resource-policy'), 'cross-origin');
    assert.equal(frameCss.headers.get('access-control-allow-origin'), '*');
    assert.equal((await request('/full/docs/assets/deep.css')).status, 200);
    const fullLevel = await request('/static/site.css', { headers: { referer: `${origin}/full/docs/full.html` } });
    assert.match(await fullLevel.text(), /rgb\(1,2,3\)/);
    // 目录形式与省略 .html 的地址在 /full/ 下同样可用。
    for (const url of ['/full/docs/sub/', '/full/docs/sub']) {
      const response = await request(url);
      assert.equal(response.status, 200, url);
      assert.match(await response.text(), /SUB_INDEX/, url);
    }
    // 软链接不能借 /full/ 读到仓库外的文件。
    assert.equal((await request('/full/docs/leak.css')).status, 404);
    // 数据文件和仓库敏感文件不能通过 /full/ 下载。
    assert.equal((await request('/full/package.json')).status, 404);
    assert.equal((await request('/full/secret.txt')).status, 404);
    assert.equal((await request('/full/docs/..%2fsecret.txt')).status, 404);

    // 页面名本身带点或百分号时仍可省略 .html。
    for (const [url, location] of [
      ['/docs/release-1.0', '/post/docs/release-1.0.html'],
      ['/docs/100%25.html', '/post/docs/100%25.html']
    ]) {
      const response = await request(url, { redirect: 'manual' });
      assert.equal(response.status, 301, url);
      assert.equal(response.headers.get('location'), location, url);
    }
    assert.match(await (await request('/post/docs/release-1.0.html')).text(), /<h1>Release<\/h1>/);
    assert.match(await (await request('/post/docs/100%25.html')).text(), /<h1>Percent<\/h1>/);

    // HTML 页面与 Markdown 一起出现在文章列表，配置的 404 页面不收录。
    const posts = await (await request('/api/posts')).json();
    const guideFile = posts.flat.find(file => file.path === 'docs/guide.html');
    assert.equal(guideFile.type, 'html');
    assert.equal(guideFile.url, '/post/docs/guide.html');
    assert.equal(posts.flat.some(file => file.path === '404.html'), false);

    // 页面使用相对 static/... 时正文会被改写为 /docs/static/...，无需 Referer。
    // 根绝对 /static/... 仍按 Referer 优先取同级 static，兼容旧页面。
    const sameLevel = await (await request('/static/site.css', { headers: { referer: `${origin}/docs/guide` } })).text();
    assert.match(sameLevel, /rgb\(1,2,3\)/);
    // 文章页面的 Referer（/post/docs/guide.html）同样映射回仓库目录。
    const articleLevel = await (await request('/static/site.css', { headers: { referer: `${origin}/post/docs/guide.html` } })).text();
    assert.match(articleLevel, /rgb\(1,2,3\)/);
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
    assert.equal((await request('/docs/local.png', { headers: { referer: `${origin}/post/docs/guide.html` } })).status, 200);
    assert.equal((await request('/docs/local.png')).status, 404);
    assert.equal((await request('/docs/static/picture.png')).status, 200);
    assert.equal((await request('/package.json')).status, 404);
    assert.equal((await request('/secret.txt')).status, 404);
    // 数据文件只允许来自 static/ 目录，同级目录即使伪造 Referer 也不提供。
    assert.equal((await request('/docs/data.json', { headers: { referer: `${origin}/post/docs/guide.html` } })).status, 404);
    const staticJson = await request('/docs/static/data.json');
    assert.equal(staticJson.status, 200);
    assert.match(await staticJson.text(), /static-dir/);
    assert.equal((await request('/static/data.txt')).status, 200);

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
    const before = await (await request('/api/stats/detail')).json();
    assert.equal(before.summary.totalPosts, 2); // 前面通过 /api/post 访问过 guide 与 full 两篇 HTML 文章
    assert.deepEqual(await (await request('/api/home/view', { method: 'POST' })).json(), { homeViews: 1 });
    assert.deepEqual(await (await request('/api/home/view', { method: 'POST' })).json(), { homeViews: 2 });
    const stats = await (await request('/api/stats/detail')).json();
    assert.equal(stats.summary.totalViews, before.summary.totalViews + 2);
    assert.equal(stats.summary.homeViews, 2);
    assert.equal(stats.summary.totalPosts, before.summary.totalPosts);
    assert.deepEqual(stats.postStats, before.postStats);
    assert.equal(stats.ipStats[0].posts, before.ipStats[0].posts);
    assert.equal(stats.summary.totalRecords, before.summary.totalRecords + 2);

    // 首页可以配置为 HTML 文章，走同一条解析链路。
    await fs.writeFile(configPath, JSON.stringify({ ...config, pages: { home: 'home.html', notFound: '404.html' } }));
    await until(async () => (await (await request('/')).text()).includes('HOME_HTML'), 15000);
    const homeResponse = await request('/');
    assert.equal(homeResponse.status, 200);
    assert.match(await homeResponse.text(), /<div id="homeContent"[^>]*>[\s\S]*HOME_HTML/);
    const homePosts = await (await request('/api/posts')).json();
    assert.equal(homePosts.flat.some(file => file.path === 'home.html'), true);

    // 配置的 404 文件缺失时回退到内置页面。
    await fs.writeFile(configPath, JSON.stringify({ ...config, pages: { home: 'README.md', notFound: 'missing-404.html' } }));
    await until(async () => {
      const body = await (await request('/still-missing')).text();
      return body.includes('class="not-found"') && !body.includes('CUSTOM_404_MARKER');
    }, 15000);
    const fallback = await request('/still-missing');
    assert.equal(fallback.status, 404);
    const fallbackBody = await fallback.text();
    assert.match(fallbackBody, /class="not-found"/);
    assert.match(fallbackBody, /<title>404 - .+<\/title>/);

    // 关闭 HTML 文章后，页面不再收录、不再渲染，也不通过 /full/ 提供。
    await fs.writeFile(configPath,
      JSON.stringify({ ...config, html: { enabled: false }, pages: { home: 'README.md', notFound: '' } }));
    await until(async () => {
      const list = await (await request('/api/posts')).json();
      return list.flat.every(file => file.type !== 'html');
    }, 15000);
    assert.equal((await request('/docs/guide.html', { redirect: 'manual' })).status, 404);
    assert.equal((await request('/full/docs/full.html')).status, 404);
    assert.equal((await request('/api/post/docs/guide.html')).status, 404);
    const markdownPosts = await (await request('/api/posts')).json();
    assert.equal(markdownPosts.flat.some(file => file.path === 'README.md'), true);
  } catch (error) {
    error.message += '\n' + output;
    throw error;
  } finally {
    child.kill('SIGTERM');
    await once(child, 'exit');
    await fs.rm(root, { recursive: true, force: true });
  }
});
