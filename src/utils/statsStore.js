const fs = require('fs');
const path = require('path');

// ponytail: 单进程 JSON 存储；多实例部署时改用共享数据库。
const entries = new Map();
let pendingFlush;

function read(filePath, fallback) {
  if (!entries.has(filePath)) {
    let value = fallback;
    let writable = true;
    try {
      value = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('统计数据读取失败，使用内存统计:', filePath, error.message);
        try {
          // 保留旧写入方式留下的损坏文件，统计故障不阻断文档服务。
          fs.copyFileSync(filePath, `${filePath}.invalid-${Date.now()}.bak`, fs.constants.COPYFILE_EXCL);
        } catch (backupError) {
          writable = false;
          console.error('统计文件无法备份，暂停该文件落盘:', backupError.message);
        }
      }
    }
    entries.set(filePath, { value, writable, revision: 0, saved: 0 });
  }
  return entries.get(filePath).value;
}

function save(filePath, value) {
  const entry = entries.get(filePath) || { revision: 0, saved: 0 };
  entry.value = value;
  entry.revision++;
  entries.set(filePath, entry);
}

async function flush() {
  if (pendingFlush) return pendingFlush;
  pendingFlush = (async () => {
    for (const [filePath, entry] of entries) {
      if (entry.writable === false || entry.saved === entry.revision) continue;
      const revision = entry.revision;
      const snapshot = JSON.stringify(entry.value);
      const temporary = `${filePath}.${process.pid}.tmp`;
      await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
      await fs.promises.writeFile(temporary, snapshot, 'utf8');
      await fs.promises.rename(temporary, filePath);
      entry.saved = revision;
    }
  })();
  try {
    await pendingFlush;
  } finally {
    pendingFlush = null;
  }
}

function flushSync() {
  for (const [filePath, entry] of entries) {
    if (entry.writable === false || entry.saved === entry.revision) continue;
    try {
      const temporary = `${filePath}.${process.pid}.exit.tmp`;
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(temporary, JSON.stringify(entry.value), 'utf8');
      fs.renameSync(temporary, filePath);
      entry.saved = entry.revision;
    } catch (error) {
      console.error('统计数据落盘失败:', error.message);
    }
  }
}

setInterval(() => {
  flush().catch(error => console.error('统计数据落盘失败，将重试:', error.message));
}, 5000).unref();
process.once('exit', flushSync);

module.exports = { read, save, flush, flushSync };
