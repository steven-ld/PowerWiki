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
  }

  extractRepoName(url) {
    const match = url.match(/\/([^\/]+)\.git$/);
    return match ? match[1] : 'repo';
  }

  async cloneOrUpdate() {
    try {
      await fs.ensureDir(this.localPath);
      
      if (await fs.pathExists(this.repoPath)) {
        // 如果已存在，执行 pull 更新
        const git = simpleGit(this.repoPath);
        
        // 获取更新前的最新提交
        const beforePull = await git.revparse(['HEAD']);
        
        // 执行 pull
        await git.pull('origin', this.branch);
        
        // 获取更新后的最新提交
        const afterPull = await git.revparse(['HEAD']);
        
        // 检查是否有更新
        const updated = beforePull !== afterPull;
        
        return { updated, isNew: false };
      } else {
        // 如果不存在，执行 clone
        const git = simpleGit(this.localPath);
        await git.clone(this.repoUrl, this.repoName, ['--branch', this.branch]);
        console.log(`已克隆仓库: ${this.repoName}`);
        return { updated: true, isNew: true };
      }
    } catch (error) {
      console.error('Git 操作失败:', error);
      throw error;
    }
  }

  async getAllMarkdownFiles(mdPath = '') {
    const searchPath = mdPath ? path.join(this.repoPath, mdPath) : this.repoPath;
    const files = [];
    
    const scanDirectory = async (dir) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        // 跳过 .git 目录
        if (entry.name === '.git') continue;
        
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

