/**
 * GitManager
 * 
 * Git 仓库管理模块
 * 负责克隆、更新仓库以及读取 Markdown 文件
 * 
 * @class GitManager
 */

const simpleGit = require('simple-git');
const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');

/**
 * Git 仓库管理器
 */
class GitManager {
  constructor(repoUrl, branch = 'main', localPath = './.git-repos') {
    this.repoUrl = repoUrl;
    this.branch = branch;
    this.localPath = localPath;
    this.repoName = this.extractRepoName(repoUrl);
    this.repoPath = path.join(localPath, this.repoName);
    this.isOperating = false; // 操作状态标志
    this.progressCallback = null; // 进度回调函数
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

  async cloneOrUpdate() {
    // 如果正在操作，直接返回
    if (this.isOperating) {
      throw new Error('Git 操作正在进行中，请稍候...');
    }
    
    this.isOperating = true;
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
            // 如果获取失败，说明仓库可能有问题，但继续尝试 pull
            console.warn('⚠️  无法获取当前提交，继续尝试拉取...');
          }
          
          // 先 fetch 检查是否有更新
          let hasUpdates = false;
          try {
            await git.fetch('origin', this.branch);
            // 检查本地 HEAD 和远程分支是否有差异
            try {
              const remoteCommit = await git.revparse([`origin/${this.branch}`]);
              hasUpdates = beforePull !== remoteCommit;
            } catch (error) {
              // 如果无法比较，假设有更新
              hasUpdates = true;
            }
          } catch (error) {
            // 如果 fetch 失败，尝试直接 pull
            hasUpdates = true; // 假设有更新，执行 pull
          }
          
          // 只有在有更新时才显示消息和执行 pull
          if (hasUpdates) {
            this.showProgress('🔄 正在拉取更新...');
            await git.pull('origin', this.branch);
            this.showProgress('✅ 拉取完成');
            return { updated: true, isNew: false };
          } else {
            // 没有更新，静默返回
            return { updated: false, isNew: false };
          }
        }
      }
      
      // 如果不存在或不完整，执行 clone
      this.showProgress('📦 正在克隆仓库...');
      
      // 使用 spawn 执行 git clone 以捕获进度输出
      const result = await new Promise((resolve, reject) => {
        let lastProgress = 0;
        let progressType = '接收对象';
        
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
        
        // 处理标准输出（通常为空）
        gitProcess.stdout.on('data', (data) => {
          const output = data.toString();
          const progress = this.parseProgress(output);
          if (progress && progress.progress !== null) {
            if (progress.progress !== lastProgress) {
              lastProgress = progress.progress;
              progressType = progress.type === 'receiving' ? '接收对象' : '解析增量';
              this.showProgress(`📥 ${progressType}:`, progress.progress);
            }
          }
        });
        
        // 处理标准错误（Git 的进度信息通常在这里）
        gitProcess.stderr.on('data', (data) => {
          const output = data.toString();
          // Git 的进度信息通常输出到 stderr
          const progress = this.parseProgress(output);
          if (progress && progress.progress !== null) {
            if (progress.progress !== lastProgress) {
              lastProgress = progress.progress;
              progressType = progress.type === 'receiving' ? '接收对象' : '解析增量';
              this.showProgress(`📥 ${progressType}:`, progress.progress);
            }
          }
        });
        
        gitProcess.on('close', (code) => {
          if (code === 0) {
            this.showProgress(`✅ 已克隆仓库: ${this.repoName}`);
            resolve({ updated: true, isNew: true });
          } else {
            reject(new Error(`Git clone 失败，退出码: ${code}`));
          }
        });
        
        gitProcess.on('error', (error) => {
          reject(new Error(`Git clone 执行失败: ${error.message}`));
        });
      });
      
      return result;
    } catch (error) {
      console.error('Git 操作失败:', error);
      throw error;
    } finally {
      this.isOperating = false;
    }
  }

  async getAllMarkdownFiles(mdPath = '') {
    const searchPath = mdPath ? path.join(this.repoPath, mdPath) : this.repoPath;
    const files = [];
    
    const scanDirectory = async (dir) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        // 跳过 .git 目录和 images 文件夹（images 是 markdown 的本地图片目录）
        if (entry.name === '.git' || entry.name === 'images') continue;
        
        if (entry.isDirectory()) {
          await scanDirectory(fullPath);
        } else if (entry.name.endsWith('.md') || entry.name.endsWith('.markdown') || entry.name.endsWith('.pdf')) {
          const relativePath = path.relative(this.repoPath, fullPath);
          const stats = await fs.stat(fullPath);
          
          // 尝试从 Git 获取创建时间和修改时间
          const gitCreated = await this.getFileCreatedTime(relativePath);
          const gitModified = await this.getFileModifiedTime(relativePath);
          
          files.push({
            path: relativePath,
            fullPath: fullPath,
            name: entry.name,
            created: gitCreated || stats.birthtime, // Git 创建时间，如果没有则使用文件系统创建时间
            modified: gitModified || stats.mtime, // Git 修改时间，如果没有则使用文件系统修改时间
            size: stats.size,
            type: entry.name.endsWith('.pdf') ? 'pdf' : 'markdown'
          });
        }
      }
    };
    
    await scanDirectory(searchPath);
    // 按修改时间排序（最新的在前）
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

  /**
   * 获取文件在 Git 中的创建时间（首次提交时间）
   * @param {string} filePath - 文件相对路径
   * @returns {Date|null} 创建时间，如果获取失败返回 null
   */
  async getFileCreatedTime(filePath) {
    try {
      const git = simpleGit(this.repoPath);
      // 使用 --follow 跟踪文件重命名，--diff-filter=A 只显示添加文件的提交
      // --format=%ai 输出 ISO 8601 格式的日期时间
      const log = await git.raw([
        'log',
        '--follow',
        '--diff-filter=A',
        '--format=%ai',
        '--',
        filePath
      ]);
      
      if (log && log.trim()) {
        // 获取最后一行（最早的提交）
        const lines = log.trim().split('\n');
        const firstCommitDate = lines[lines.length - 1].trim();
        if (firstCommitDate) {
          return new Date(firstCommitDate);
        }
      }
    } catch (error) {
      // 如果获取失败（例如文件不在 Git 中），返回 null
      console.warn(`无法获取文件 ${filePath} 的 Git 创建时间:`, error.message);
    }
    return null;
  }

  /**
   * 获取文件在 Git 中的最后修改时间（最后提交时间）
   * @param {string} filePath - 文件相对路径
   * @returns {Date|null} 修改时间，如果获取失败返回 null
   */
  async getFileModifiedTime(filePath) {
    try {
      const git = simpleGit(this.repoPath);
      // 获取文件最后一次提交的时间
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
      // 如果获取失败，返回 null
      console.warn(`无法获取文件 ${filePath} 的 Git 修改时间:`, error.message);
    }
    return null;
  }

  async getFileInfo(filePath) {
    const fullPath = path.join(this.repoPath, filePath);
    if (await fs.pathExists(fullPath)) {
      const stats = await fs.stat(fullPath);
      
      // 尝试从 Git 获取创建时间和修改时间
      const gitCreated = await this.getFileCreatedTime(filePath);
      const gitModified = await this.getFileModifiedTime(filePath);
      
      return {
        path: filePath,
        name: path.basename(filePath),
        created: gitCreated || stats.birthtime, // Git 创建时间，如果没有则使用文件系统创建时间
        modified: gitModified || stats.mtime, // Git 修改时间，如果没有则使用文件系统修改时间
        size: stats.size
      };
    }
    return null;
  }
}

module.exports = GitManager;

