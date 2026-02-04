const express = require('express');
const router = express.Router();
const cacheManager = require('../../utils/cacheManager');
const { parseMarkdown } = require('../../utils/markdownParser');
const seoHelper = require('../../utils/seoHelper');
const { recordPostView } = require('../services/statsService');

function getGitManager(config) {
  const GitManager = require('../../utils/gitManager');
  return new GitManager(config.gitRepo, config.repoBranch, './.git-repos');
}

function buildDirectoryTree(files) {
  const tree = {};

  files.forEach(file => {
    const parts = file.path.split('/');
    let current = tree;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;

      if (isFile) {
        const fileName = part.replace(/\.(md|markdown|pdf)$/i, '');
        const isReadme = /^readme$/i.test(fileName);
        const isAbout = /^about$/i.test(fileName);

        const fileData = {
          name: fileName,
          path: file.path,
          fullName: file.name,
          created: file.created,
          modified: file.modified,
          size: file.size,
          type: file.type || (file.name.endsWith('.pdf') ? 'pdf' : 'markdown')
        };

        if (isReadme && fileData.type === 'markdown') {
          current.readme = fileData;
        } else if (isAbout && fileData.type === 'markdown') {
          current.about = fileData;
        } else {
          if (!current.files) {
            current.files = [];
          }
          current.files.push(fileData);
        }
      } else {
        if (!current.dirs) {
          current.dirs = {};
        }
        if (!current.dirs[part]) {
          current.dirs[part] = {
            _maxModified: null
          };
        }
        current = current.dirs[part];
      }
    }
  });

  function sortTree(node) {
    if (node.files) {
      node.files.sort((a, b) => {
        const timeA = new Date(a.modified).getTime();
        const timeB = new Date(b.modified).getTime();
        return timeB - timeA;
      });
    }

    if (node.dirs) {
      const dirs = Object.keys(node.dirs);

      dirs.forEach(dirName => {
        const dirNode = node.dirs[dirName];
        sortTree(dirNode);

        let maxTime = null;
        if (dirNode.files && dirNode.files.length > 0) {
          maxTime = Math.max(...dirNode.files.map(f => new Date(f.modified).getTime()));
        }
        if (dirNode.dirs) {
          Object.keys(dirNode.dirs).forEach(subDirName => {
            const subDirMax = dirNode.dirs[subDirName]._maxModified;
            if (subDirMax && (!maxTime || subDirMax > maxTime)) {
              maxTime = subDirMax;
            }
          });
        }
        dirNode._maxModified = maxTime;
      });

      dirs.sort((a, b) => {
        const timeA = node.dirs[a]._maxModified || 0;
        const timeB = node.dirs[b]._maxModified || 0;
        return timeB - timeA;
      });

      const sortedDirs = {};
      dirs.forEach(dirName => {
        sortedDirs[dirName] = node.dirs[dirName];
      });
      node.dirs = sortedDirs;
    }
  }

  sortTree(tree);

  function cleanTree(node) {
    if (node._maxModified !== undefined) {
      delete node._maxModified;
    }
    if (node.dirs) {
      Object.keys(node.dirs).forEach(dirName => {
        cleanTree(node.dirs[dirName]);
      });
    }
  }

  cleanTree(tree);
  return tree;
}

router.get('/', async (req, res) => {
  try {
    const config = req.app.get('config');
    const cached = cacheManager.get('posts');
    if (cached) {
      res.json(cached);
      return;
    }

    const gitManager = getGitManager(config);
    const files = await gitManager.getAllMarkdownFiles(config.mdPath);
    const tree = buildDirectoryTree(files);
    const result = { tree, flat: files };

    cacheManager.set('posts', '', result, 10 * 60 * 1000);

    res.json(result);
  } catch (error) {
    console.error('获取文章列表失败:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/*', async (req, res) => {
  try {
    const config = req.app.get('config');
    let filePath = req.params[0];
    try {
      filePath = decodeURIComponent(filePath);
    } catch (e) {
      console.warn('路径解码失败，使用原始路径:', filePath);
    }

    const cached = cacheManager.get('post', filePath);
    if (cached) {
      const viewCount = recordPostView(filePath, req);
      cached.viewCount = viewCount;
      res.json(cached);
      return;
    }

    const viewCount = recordPostView(filePath, req);

    const gitManager = getGitManager(config);

    if (filePath.endsWith('.pdf')) {
      const fileInfo = await gitManager.getFileInfo(filePath);
      const fileName = fileInfo.name.replace(/\.pdf$/i, '');

      const result = {
        type: 'pdf',
        title: fileName,
        fileInfo,
        path: filePath,
        html: '',
        description: 'PDF 文档',
        viewCount
      };

      cacheManager.set('post', filePath, result, 15 * 60 * 1000);

      res.json(result);
    } else {
      const content = await gitManager.readMarkdownFile(filePath);
      const parsed = parseMarkdown(content);
      const fileInfo = await gitManager.getFileInfo(filePath);

      const fileName = fileInfo.name.replace(/\.(md|markdown)$/i, '');
      const title = parsed.title || fileName;

      const optimizedHtml = seoHelper.optimizeImageTags(parsed.html, title);

      const description = parsed.description || seoHelper.generateDescription(optimizedHtml, title);
      const keywords = parsed.keywords || seoHelper.extractKeywords(optimizedHtml, title, filePath);

      const result = {
        ...parsed,
        type: 'markdown',
        title,
        html: optimizedHtml,
        description,
        keywords,
        fileInfo,
        path: filePath,
        viewCount
      };

      cacheManager.set('post', filePath, result, 10 * 60 * 1000);

      res.json(result);
    }
  } catch (error) {
    console.error('获取文章失败:', error);
    res.status(404).json({ error: '文章不存在' });
  }
});

module.exports = router;
