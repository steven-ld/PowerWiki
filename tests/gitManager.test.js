const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const GitManager = require('../src/utils/gitManager');

test('批量文章时间与逐文件查询一致，支持重命名、中文和未跟踪文件', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'powerwiki-menu-'));
  const repo = path.join(root, 'repo');
  await fs.mkdir(repo);
  const git = (...args) => execFileSync('git', args, { cwd: repo });
  try {
    git('init');
    git('config', 'user.name', 'Test');
    git('config', 'user.email', 'test@example.com');
    await fs.mkdir(path.join(repo, '目录'));
    await fs.writeFile(path.join(repo, '目录', '中文 空格.md'), '# Initial');
    await fs.writeFile(path.join(repo, 'old.md'), '# Rename me');
    await fs.writeFile(path.join(repo, 'line\nbreak.md'), '# Newline');
    git('add', '.');
    git('commit', '-qm', 'initial', '--date=2020-01-01T00:00:00Z');
    git('mv', 'old.md', 'renamed.md');
    await fs.writeFile(path.join(repo, '目录', '中文 空格.md'), '# Updated');
    git('add', '.');
    git('commit', '-qm', 'update and rename', '--date=2021-01-01T00:00:00Z');
    await fs.writeFile(path.join(repo, 'untracked.pdf'), 'pdf');

    const manager = new GitManager('https://example.com/repo.git', 'main', root);
    const files = await manager.getAllMarkdownFiles();
    assert.equal(files.length, 4);
    for (const file of files) {
      const stats = await fs.stat(file.fullPath);
      assert.equal(+file.created, +(await manager.getFileCreatedTime(file.path) || stats.birthtime));
      assert.equal(+file.modified, +(await manager.getFileModifiedTime(file.path) || stats.mtime));
    }
    const nested = await manager.getAllMarkdownFiles('目录');
    assert.deepEqual(nested.map(file => file.path), ['目录/中文 空格.md']);

    // 普通文件不应再次逐文件启动 Git 查询。
    manager.getFileCreatedTime = async () => { throw new Error('unexpected per-file query'); };
    manager.getFileModifiedTime = async () => { throw new Error('unexpected per-file query'); };
    manager.invalidateFileLists();
    assert.equal((await manager.getAllMarkdownFiles('目录')).length, 1);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('目录长期复用且合并并发扫描，失效后重建，失败可重试', async () => {
  const manager = new GitManager('https://example.com/repo.git');
  let calls = 0;
  let finish;
  manager.scanMarkdownFiles = () => {
    calls++;
    return new Promise(resolve => { finish = resolve; });
  };
  const first = manager.getAllMarkdownFiles();
  const second = manager.getAllMarkdownFiles();
  assert.equal(calls, 1);
  const files = [{ path: 'README.md' }];
  finish(files);
  assert.equal(await first, files);
  assert.equal(await second, files);
  assert.equal(await manager.getAllMarkdownFiles(), files);
  assert.equal(calls, 1);
  manager.invalidateFileLists();
  const refreshed = manager.getAllMarkdownFiles();
  assert.equal(calls, 2);
  finish([]);
  assert.deepEqual(await refreshed, []);
  manager.invalidateFileLists();
  manager.scanMarkdownFiles = async () => { throw new Error('not initialized'); };
  await assert.rejects(manager.getAllMarkdownFiles(), /not initialized/);
  manager.scanMarkdownFiles = async () => files;
  assert.equal(await manager.getAllMarkdownFiles(), files);
});

test('首次目录请求等待克隆完成，避免缓存不完整仓库', async () => {
  const manager = new GitManager('https://example.com/repo.git');
  let complete;
  manager.operationFinished = new Promise(resolve => { complete = resolve; });
  let scans = 0;
  manager.scanMarkdownFiles = async () => { scans++; return []; };
  const request = manager.getAllMarkdownFiles();
  assert.equal(scans, 0);
  complete();
  await request;
  assert.equal(scans, 1);
});

test('批量 Git 时间保留冲突合并的修改时间，不把普通合并当作文件修改', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'powerwiki-merge-'));
  const repo = path.join(root, 'repo');
  await fs.mkdir(repo);
  const git = (...args) => {
    const date = args.find(arg => arg.startsWith('--date='));
    return execFileSync('git', args, { cwd: repo, stdio: 'pipe',
      env: date ? { ...process.env, GIT_COMMITTER_DATE: date.slice(7) } : process.env });
  };
  try {
    git('init', '-b', 'master');
    git('config', 'user.name', 'Test');
    git('config', 'user.email', 'test@example.com');
    await fs.writeFile(path.join(repo, 'test.md'), 'initial\n');
    git('add', '.');
    git('commit', '-qm', 'initial', '--date=2020-01-01T00:00:00Z');
    git('checkout', '-b', 'feature');
    await fs.writeFile(path.join(repo, 'test.md'), 'feature\n');
    await fs.writeFile(path.join(repo, 'feature.md'), 'feature only\n');
    git('add', '.');
    git('commit', '-qm', 'feature', '--date=2021-01-01T00:00:00Z');
    git('checkout', 'master');
    await fs.writeFile(path.join(repo, 'test.md'), 'master\n');
    git('commit', '-qam', 'master', '--date=2022-01-01T00:00:00Z');
    assert.throws(() => git('merge', 'feature'));
    await fs.writeFile(path.join(repo, 'test.md'), 'resolved\n');
    git('add', '.');
    git('commit', '-qm', 'resolve merge', '--date=2023-01-01T00:00:00Z');
    const manager = new GitManager('https://example.com/repo.git', 'master', root);
    const files = await manager.getAllMarkdownFiles();
    for (const file of files) {
      assert.equal(+file.modified, +await manager.getFileModifiedTime(file.path));
      assert.equal(+file.created, +await manager.getFileCreatedTime(file.path));
    }
    assert.equal(files.find(file => file.path === 'test.md').modified.getUTCFullYear(), 2023);
    assert.equal(files.find(file => file.path === 'feature.md').modified.getUTCFullYear(), 2021);

    // 新合并完全保留主分支内容，较晚的被丢弃分支修改不应影响菜单时间。
    git('checkout', '-b', 'discarded');
    await fs.writeFile(path.join(repo, 'test.md'), 'discarded feature\n');
    git('commit', '-qam', 'discarded edit', '--date=2024-01-01T00:00:00Z');
    git('checkout', 'master');
    await fs.writeFile(path.join(repo, 'test.md'), 'retained master\n');
    git('commit', '-qam', 'retained edit', '--date=2023-06-01T00:00:00Z');
    assert.throws(() => git('merge', 'discarded'));
    await fs.writeFile(path.join(repo, 'test.md'), 'retained master\n');
    git('add', '.');
    git('commit', '-qm', 'retain master', '--date=2025-01-01T00:00:00Z');
    manager.invalidateFileLists();
    const retained = (await manager.getAllMarkdownFiles()).find(file => file.path === 'test.md');
    assert.equal(+retained.modified, +await manager.getFileModifiedTime('test.md'));
    assert.equal(retained.modified.toISOString(), '2023-06-01T00:00:00.000Z');
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
