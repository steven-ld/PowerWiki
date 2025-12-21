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
        await git.pull('origin', this.branch);
        console.log(`已更新仓库: ${this.repoName}`);
      } else {
        // 如果不存在，执行 clone
        const git = simpleGit(this.localPath);
        await git.clone(this.repoUrl, this.repoName, ['--branch', this.branch]);
        console.log(`已克隆仓库: ${this.repoName}`);
      }
      return true;
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
        } else if (entry.name.endsWith('.md') || entry.name.endsWith('.markdown')) {
          const relativePath = path.relative(this.repoPath, fullPath);
          const stats = await fs.stat(fullPath);
          
          files.push({
            path: relativePath,
            fullPath: fullPath,
            name: entry.name,
            modified: stats.mtime,
            size: stats.size
          });
        }
      }
    };
    
    await scanDirectory(searchPath);
    return files.sort((a, b) => b.modified - a.modified);
  }

  async readMarkdownFile(filePath) {
    const fullPath = path.join(this.repoPath, filePath);
    if (await fs.pathExists(fullPath)) {
      return await fs.readFile(fullPath, 'utf-8');
    }
    throw new Error(`文件不存在: ${filePath}`);
  }

  async getFileInfo(filePath) {
    const fullPath = path.join(this.repoPath, filePath);
    if (await fs.pathExists(fullPath)) {
      const stats = await fs.stat(fullPath);
      return {
        path: filePath,
        name: path.basename(filePath),
        modified: stats.mtime,
        size: stats.size
      };
    }
    return null;
  }
}

module.exports = GitManager;

