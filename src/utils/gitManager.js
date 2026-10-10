/**
 * GitManager
 *
 * Git 仓库管理模块
 * 负责克隆、更新仓库以及读取 Markdown 文件
 *
 * @module GitManager
 */

const simpleGit = require('simple-git');
const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');
const { t } = require('../config/i18n');

/**
 * Git 仓库管理器
 */
class GitManager {
  constructor(repoUrl, branch = 'main', localPath = './.git-repos', options = {}) {
    this.repoUrl = repoUrl;
    this.branch = branch;
    this.localPath = localPath;
    this.repoName = this.extractRepoName(repoUrl);
    this.repoPath = path.join(localPath, this.repoName);
    this.isOperating = false; // 操作状态标志
    this.progressCallback = options.progressCallback || null; // 进度回调函数
    this.fileLists = new Map();
    this.contentVersion = 0;
  }

  invalidateFileLists() {
    this.contentVersion++;
    this.fileLists.clear();
  }

  extractRepoName(url) {
    const match = url.match(/\/([^\/]+)\.git$/);
    return match ? match[1] : 'repo';
  }

  /**
   * 设置进度回调函数
   * @param {Function} callback - 进度回调函数，接收 (message, progress) 参数
   */
  setProgressCallback(callback) {
    this.progressCallback = callback;
  }

  /**
   * 显示进度信息
   * @param {string} message - 进度消息
   * @param {number} progress - 进度百分比 (0-100)
   */
  showProgress(message, progress = null) {
    if (this.progressCallback) {
      this.progressCallback(message, progress);
    } else {
      // 默认输出
      if (progress !== null) {
        console.log(`\r${message} ${progress}%`);
      } else {
        console.log(message);
      }
    }
  }

  /**
   * 解析 Git 进度输出
   * @param {string} output - Git 输出
   * @returns {Object|null} 包含进度信息的对象
   */
  parseProgress(output) {
    if (!output) return null;

    // 解析 clone 进度: "Receiving objects: 45% (1234/5678), 1.23 MiB | 1.45 MiB/s"
    const receivingMatch = output.match(/Receiving objects:\s*(\d+)%/);
    if (receivingMatch) {
      return { type: 'receiving', progress: parseInt(receivingMatch[1]) };
    }

    // 解析 clone 进度: "Resolving deltas: 30% (123/456)"
    const resolvingMatch = output.match(/Resolving deltas:\s*(\d+)%/);
    if (resolvingMatch) {
      return { type: 'resolving', progress: parseInt(resolvingMatch[1]) };
    }

    // 解析 pull 进度: "Updating 1234..5678"
    if (output.includes('Updating')) {
      return { type: 'updating', progress: null };
    }

    return null;
  }

  async cloneOrUpdate(t) {
    // 如果正在操作，直接返回
    if (this.isOperating) {
      throw new Error('Git 操作正在进行中，请稍候...');
    }

    this.isOperating = true;
    let finishOperation;
    this.operationFinished = new Promise(resolve => { finishOperation = resolve; });
    const translate = (key) => {
      const translations = {
        'git.cloning': '正在克隆仓库...',
        'git.receiving': '接收对象',
        'git.resolving': '解析增量',
        'git.cloned': '仓库克隆成功',
        'git.cloneFailed': '克隆失败',
        'git.cloneExecutionFailed': '克隆执行失败',
        'git.cloning': '正在克隆仓库'
      };
      return translations[key] || key;
    };
    const _t = t || translate;

    try {
      await fs.ensureDir(this.localPath);

      if (await fs.pathExists(this.repoPath)) {
        // 检查仓库是否完整（是否有 HEAD）
        const git = simpleGit(this.repoPath);
        let isComplete = false;
        try {
          await git.revparse(['HEAD']);
          isComplete = true;
        } catch (error) {
          // HEAD 不存在，说明仓库不完整，需要重新克隆
          this.showProgress('⚠️  检测到不完整的仓库，正在清理并重新克隆...');
          await fs.remove(this.repoPath);
          isComplete = false;
        }

        if (isComplete) {
          // 如果已存在且完整，先检查是否有更新
          let beforePull = null;
          try {
            beforePull = await git.revparse(['HEAD']);
          } catch (error) {
            console.warn(`⚠️  ${t('git.cannotGetCommit')}`);
          }

          // 先 fetch 检查是否有更新
          let hasUpdates = false;
          try {
            await git.fetch('origin', this.branch);
            try {
              const remoteCommit = await git.revparse([`origin/${this.branch}`]);
              hasUpdates = beforePull !== remoteCommit;
            } catch (error) {
              hasUpdates = true;
            }
          } catch (error) {
            hasUpdates = true;
          }

          if (hasUpdates) {
            this.showProgress('🔄 正在拉取更新...');
            await git.pull('origin', this.branch);
            this.invalidateFileLists();
            this.showProgress('✅ 拉取完成');
            return { updated: true, isNew: false };
          } else {
            return { updated: false, isNew: false };
          }
        }
      }

      // 如果不存在或不完整，执行 clone
      this.showProgress(`📦 ${_t('git.cloning')}`);

      const result = await new Promise((resolve, reject) => {
        let lastProgress = 0;
        let progressType = _t('git.receiving');

        const gitProcess = spawn('git', [
          'clone',
          '--branch', this.branch,
          '--progress',
          this.repoUrl,
          this.repoName
        ], {
          cwd: this.localPath,
          stdio: ['ignore', 'pipe', 'pipe']
        });

        gitProcess.stdout.on('data', (data) => {
          const output = data.toString();
          const progress = this.parseProgress(output);
          if (progress && progress.progress !== null) {
            if (progress.progress !== lastProgress) {
              lastProgress = progress.progress;
              progressType = progress.type === 'receiving' ? _t('git.receiving') : _t('git.resolving');
              this.showProgress(`📥 ${progressType}:`, progress.progress);
            }
          }
        });

        gitProcess.stderr.on('data', (data) => {
          const output = data.toString();
          const progress = this.parseProgress(output);
          if (progress && progress.progress !== null) {
            if (progress.progress !== lastProgress) {
              lastProgress = progress.progress;
              progressType = progress.type === 'receiving' ? _t('git.receiving') : _t('git.resolving');
              this.showProgress(`📥 ${progressType}:`, progress.progress);
            }
          }
        });

        gitProcess.on('close', (code) => {
          if (code === 0) {
            this.showProgress(`✅ ${_t('git.cloned')}: ${this.repoName}`);
            resolve({ updated: true, isNew: true });
          } else {
            reject(new Error(`${_t('git.cloneFailed')}: ${code}`));
          }
        });

        gitProcess.on('error', (error) => {
          reject(new Error(`${_t('git.cloneExecutionFailed')}: ${error.message}`));
        });
      });

      this.invalidateFileLists();
      return result;
    } catch (error) {
      console.error(`❌ ${t('git.operationFailed')}:`, error);
      throw error;
    } finally {
      this.isOperating = false;
      this.operationFinished = null;
      finishOperation();
    }
  }

  async getAllMarkdownFiles(mdPath = '') {
    if (!this.fileLists.has(mdPath) && this.operationFinished) await this.operationFinished;
    if (!this.fileLists.has(mdPath)) {
      const pending = this.scanMarkdownFiles(mdPath);
      this.fileLists.set(mdPath, pending);
      pending.catch(() => {
        if (this.fileLists.get(mdPath) === pending) this.fileLists.delete(mdPath);
      });
    }
    return this.fileLists.get(mdPath);
  }

  async scanMarkdownFiles(mdPath = '') {
    const searchPath = mdPath ? path.join(this.repoPath, mdPath) : this.repoPath;
    const files = [];
    const dates = new Map();
    const renamed = new Set();
    const merged = new Set();
    const historyFiles = [];

    // 一次读取历史，避免每篇文章串行启动两次 git log。
    // NUL 分隔保留中文、空格及换行文件名；重命名的创建时间仍用 --follow。
    try {
      const log = await simpleGit(this.repoPath).raw([
        'log', '--cc', '--format=%x00%ai', '--name-status', '-z', '--find-renames'
      ]);
      const tokens = log.split('\0');
      let date;
      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i].trim();
        if (!token) continue;
        if (/^\d{4}-\d{2}-\d{2} /.test(token)) {
          date = new Date(token);
          continue;
        }
        const oldPath = tokens[++i];
        const filePath = /^[RC]\d+$/.test(token) ? tokens[++i] : oldPath;
        if (!date || !filePath) continue;
        const info = dates.get(filePath) || {};
        if (!info.modified) info.modified = date;
        if (/^A+$/.test(token)) info.created = date;
        if (token.includes('R')) renamed.add(filePath);
        dates.set(filePath, info);
      }
      // 合并可能丢弃某个分支的文件历史，全仓库日志无法执行逐路径简化。
      // 仅对合并涉及的文件保留原查询语义，其余文件继续使用批量结果。
      const mergeLog = await simpleGit(this.repoPath).raw([
        'log', '--merges', '-m', '--format=%x00MERGE', '--name-status', '-z', '--find-renames'
      ]);
      const mergeTokens = mergeLog.split('\0');
      for (let i = 0; i < mergeTokens.length; i++) {
        const status = mergeTokens[i].trim();
        if (!status || status === 'MERGE') continue;
        merged.add(mergeTokens[++i]);
        if (/^[RC]\d+$/.test(status)) merged.add(mergeTokens[++i]);
      }
    } catch (error) {
      console.warn('⚠️ 无法批量读取 Git 时间，使用文件系统时间:', error.message);
    }

    const scanDirectory = async (dir) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        // 跳过 .git 目录和 images 文件夹
        if (entry.name === '.git' || entry.name === 'images') continue;

        if (entry.isDirectory()) {
          await scanDirectory(fullPath);
        } else if (entry.name.endsWith('.md') || entry.name.endsWith('.markdown') || entry.name.endsWith('.pdf')) {
          const relativePath = path.relative(this.repoPath, fullPath).replace(/\\/g, '/');
          const stats = await fs.stat(fullPath);

          const info = dates.get(relativePath) || {};
          const file = {
            path: relativePath,
            fullPath: fullPath,
            name: entry.name,
            created: info.created || stats.birthtime,
            modified: info.modified || stats.mtime,
            size: stats.size,
            type: entry.name.endsWith('.pdf') ? 'pdf' : 'markdown'
          };
          files.push(file);
          if (renamed.has(relativePath) || merged.has(relativePath)) historyFiles.push(file);
        }
      }
    };

    await scanDirectory(searchPath);
    let historyIndex = 0;
    // 最多四个 Git 子进程，避免大仓库合并历史造成串行等待或进程风暴。
    await Promise.all(Array.from({ length: Math.min(2, historyFiles.length) }, async () => {
      while (historyIndex < historyFiles.length) {
        const file = historyFiles[historyIndex++];
        const [created, modified] = await Promise.all([
          this.getFileCreatedTime(file.path),
          merged.has(file.path) ? this.getFileModifiedTime(file.path) : null
        ]);
        file.created = created || file.created;
        file.modified = modified || file.modified;
      }
    }));
    return files.sort((a, b) => {
      const timeA = new Date(a.modified).getTime();
      const timeB = new Date(b.modified).getTime();
      return timeB - timeA;
    });
  }

  async readMarkdownFile(filePath) {
    const fullPath = path.join(this.repoPath, filePath);
    if (await fs.pathExists(fullPath)) {
      return await fs.readFile(fullPath, 'utf-8');
    }
    throw new Error(`文件不存在: ${filePath}`);
  }

  async readPdfFile(filePath) {
    const fullPath = path.join(this.repoPath, filePath);
    if (await fs.pathExists(fullPath)) {
      return await fs.readFile(fullPath);
    }
    throw new Error(`文件不存在: ${filePath}`);
  }

  async getFileCreatedTime(filePath) {
    try {
      const git = simpleGit(this.repoPath);
      const log = await git.raw([
        'log',
        '--follow',
        '--diff-filter=A',
        '--format=%ai',
        '--',
        filePath
      ]);

      if (log && log.trim()) {
        const lines = log.trim().split('\n');
        const firstCommitDate = lines[lines.length - 1].trim();
        if (firstCommitDate) {
          return new Date(firstCommitDate);
        }
      }
    } catch (error) {
      console.warn(`⚠️  ${t('git.cannotGetCreatedTime', filePath)}:`, error.message);
    }
    return null;
  }

  async getFileModifiedTime(filePath) {
    try {
      const git = simpleGit(this.repoPath);
      const log = await git.raw([
        'log',
        '-1',
        '--format=%ai',
        '--',
        filePath
      ]);

      if (log && log.trim()) {
        const commitDate = log.trim();
        if (commitDate) {
          return new Date(commitDate);
        }
      }
    } catch (error) {
      console.warn(`⚠️  ${t('git.cannotGetModifiedTime', filePath)}:`, error.message);
    }
    return null;
  }

  async getFileInfo(filePath) {
    const fullPath = path.join(this.repoPath, filePath);
    if (await fs.pathExists(fullPath)) {
      const stats = await fs.stat(fullPath);

      const gitCreated = await this.getFileCreatedTime(filePath);
      const gitModified = await this.getFileModifiedTime(filePath);

      return {
        path: filePath,
        name: path.basename(filePath),
        created: gitCreated || stats.birthtime,
        modified: gitModified || stats.mtime,
        size: stats.size
      };
    }
    return null;
  }
}

module.exports = GitManager;
