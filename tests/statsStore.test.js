const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const store = require('../src/utils/statsStore');
const { recordPostView, recordShortlinkView, readStats } = require('../src/routes/api');

test('统计在内存累计，批量落盘后保留全部文章和短链计数', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'powerwiki-stats-'));
  const file = path.join(root, '.stats.json');
  try {
    const req = { headers: { 'user-agent': 'Test' }, ip: '127.0.0.1' };
    for (let i = 0; i < 1000; i++) recordPostView(file, 'test.md', req);
    for (let i = 0; i < 10; i++) recordShortlinkView(file, 'code', 'test.md');
    assert.equal(readStats(file).totalViews, 1000);
    await assert.rejects(fs.readFile(file), { code: 'ENOENT' });
    await store.flush();
    const saved = JSON.parse(await fs.readFile(file, 'utf8'));
    assert.equal(saved.postViews['test.md'], 1000);
    assert.equal(saved.shortlinkViews.code.count, 10);
    assert.equal(JSON.parse(await fs.readFile(path.join(root, '.access-log.json'), 'utf8')).length, 1000);

    // 写入进行中新增的访问仍然保持 dirty，下一批不会遗漏。
    const originalWrite = fs.writeFile;
    let unblock;
    let entered;
    const writing = new Promise(resolve => { entered = resolve; });
    fs.writeFile = async (...args) => {
      entered();
      await new Promise(resolve => { unblock = resolve; });
      return originalWrite(...args);
    };
    recordShortlinkView(file, 'code', 'test.md');
    const flushing = store.flush();
    await writing;
    recordShortlinkView(file, 'code', 'test.md');
    fs.writeFile = originalWrite;
    unblock();
    await flushing;
    await store.flush();
    assert.equal(JSON.parse(await fs.readFile(file, 'utf8')).shortlinkViews.code.count, 12);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('旧统计 JSON 损坏时保留原文件备份，服务可继续累计和落盘', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'powerwiki-corrupt-stats-'));
  const file = path.join(root, '.stats.json');
  const originalError = console.error;
  console.error = () => {};
  try {
    await fs.writeFile(file, '{');
    const stats = readStats(file);
    assert.equal(stats.totalViews, 0);
    recordPostView(file, 'test.md', { headers: {}, ip: '127.0.0.1' });
    await store.flush();
    assert.equal(JSON.parse(await fs.readFile(file, 'utf8')).totalViews, 1);
    const backup = (await fs.readdir(root)).find(name => name.startsWith('.stats.json.invalid-'));
    assert.ok(backup);
    assert.equal(await fs.readFile(path.join(root, backup), 'utf8'), '{');
  } finally {
    console.error = originalError;
    await fs.rm(root, { recursive: true, force: true });
  }
});
