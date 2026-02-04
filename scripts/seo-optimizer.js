#!/usr/bin/env node

/**
 * Blog SEO Optimizer
 *
 * 批量为 Markdown 文章添加 YAML Frontmatter 和优化 SEO
 */

const fs = require('fs-extra');
const path = require('path');

/**
 * 从文章内容提取信息
 */
function extractArticleInfo(content, filePath) {
  const lines = content.split('\n');

  // 提取标题（第一个 # 标题）
  let title = '';
  for (const line of lines) {
    const match = line.match(/^#\s+(.+)$/);
    if (match) {
      title = match[1].trim();
      break;
    }
  }

  // 从文件名提取标题（如果没找到）
  if (!title) {
    title = path.basename(filePath, path.extname(filePath));
  }

  // 提取描述（第一段文字，排除标题和代码块）
  let description = '';
  let inCodeBlock = false;
  let foundTitle = false;

  for (const line of lines) {
    if (line.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }

    if (line.startsWith('#')) {
      foundTitle = true;
      continue;
    }

    if (foundTitle && !inCodeBlock && line.trim() && !line.startsWith('---')) {
      // 移除 Markdown 格式
      const cleanLine = line
        .replace(/\*\*(.+?)\*\*/g, '$1')  // 加粗
        .replace(/\*(.+?)\*/g, '$1')       // 斜体
        .replace(/\[(.+?)\]\(.+?\)/g, '$1') // 链接
        .replace(/`(.+?)`/g, '$1')         // 代码
        .trim();

      if (cleanLine) {
        description = cleanLine;
        break;
      }
    }
  }

  // 限制描述长度
  if (description.length > 160) {
    description = description.substring(0, 157) + '...';
  }

  // 提取关键词
  const keywords = extractKeywords(content, title, filePath);

  // 提取标签（从路径）
  const tags = extractTags(filePath);

  return {
    title,
    description: description || `${title} - 技术文章详解`,
    keywords: keywords.join(', '),
    tags
  };
}

/**
 * 提取关键词
 */
function extractKeywords(content, title, filePath) {
  const keywords = new Set();

  // 从标题提取
  if (title) {
    keywords.add(title);
  }

  // 从路径提取
  const pathParts = filePath.split('/').filter(p => p && !p.endsWith('.md'));
  pathParts.forEach(part => {
    if (part !== 'note' && part.length > 1) {
      keywords.add(part);
    }
  });

  // 从 H2 标题提取
  const h2Matches = content.match(/^##\s+(.+)$/gm) || [];
  h2Matches.slice(0, 3).forEach(match => {
    const heading = match.replace(/^##\s+/, '').trim();
    if (heading.length >= 2 && heading.length <= 30) {
      keywords.add(heading);
    }
  });

  // 从加粗文本提取
  const boldMatches = content.match(/\*\*(.+?)\*\*/g) || [];
  boldMatches.slice(0, 5).forEach(match => {
    const bold = match.replace(/\*\*/g, '').trim();
    if (bold.length >= 2 && bold.length <= 20) {
      keywords.add(bold);
    }
  });

  // 添加默认关键词
  keywords.add('技术博客');
  keywords.add('开发经验');

  return Array.from(keywords).slice(0, 10);
}

/**
 * 从路径提取标签
 */
function extractTags(filePath) {
  const tags = [];
  const pathParts = filePath.split('/').filter(p => p && !p.endsWith('.md'));

  // 添加目录作为标签
  if (pathParts.length > 1) {
    tags.push(pathParts[pathParts.length - 2]);
  }

  return tags;
}

/**
 * 生成 YAML Frontmatter
 */
function generateFrontmatter(info) {
  const now = new Date().toISOString().split('T')[0];

  return `---
title: ${info.title}
description: ${info.description}
author: ga666666
date: ${now}
updated: ${now}
keywords: ${info.keywords}
tags: [${info.tags.join(', ')}]
---

`;
}

/**
 * 检查文件是否已有 Frontmatter
 */
function hasFrontmatter(content) {
  return content.trim().startsWith('---');
}

/**
 * 为文章添加 Frontmatter
 */
function addFrontmatter(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');

    // 跳过已有 Frontmatter 的文件
    if (hasFrontmatter(content)) {
      console.log(`⏭️  跳过（已有 Frontmatter）: ${filePath}`);
      return false;
    }

    // 提取文章信息
    const info = extractArticleInfo(content, filePath);

    // 生成 Frontmatter
    const frontmatter = generateFrontmatter(info);

    // 写入文件
    const newContent = frontmatter + content;
    fs.writeFileSync(filePath, newContent, 'utf-8');

    console.log(`✅ 已添加 Frontmatter: ${filePath}`);
    console.log(`   标题: ${info.title}`);
    console.log(`   关键词: ${info.keywords}`);

    return true;
  } catch (error) {
    console.error(`❌ 处理失败: ${filePath}`, error.message);
    return false;
  }
}

/**
 * 优化图片 Alt 文本
 */
function optimizeImageAlt(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    let modified = false;

    // 匹配图片：![alt](url) 或 ![](url)
    const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;

    content = content.replace(imgRegex, (match, alt, url) => {
      // 如果已有完整 alt，跳过
      if (alt && alt.length > 5) {
        return match;
      }

      // 从 URL 提取有意义的描述
      let newAlt = alt || '';

      if (!newAlt) {
        // 从文件名提取
        const filename = url.split('/').pop().split('?')[0];
        const name = filename.replace(/\.(png|jpg|jpeg|gif|webp|svg)$/i, '');
        newAlt = name
          .replace(/[-_]/g, ' ')
          .replace(/\d{8,}/g, '') // 移除长数字
          .trim();

        if (!newAlt || newAlt.length < 3) {
          newAlt = '文章配图';
        }
      }

      modified = true;
      return `![${newAlt}](${url})`;
    });

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`✅ 已优化图片 Alt: ${filePath}`);
      return true;
    } else {
      console.log(`⏭️  无需优化图片: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ 图片优化失败: ${filePath}`, error.message);
    return false;
  }
}

/**
 * 递归处理目录
 */
function processDirectory(dirPath, options = {}) {
  const stats = {
    total: 0,
    frontmatterAdded: 0,
    imageOptimized: 0,
    skipped: 0,
    failed: 0
  };

  function walk(currentPath) {
    const files = fs.readdirSync(currentPath);

    for (const file of files) {
      const filePath = path.join(currentPath, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        // 跳过特殊目录
        if (file === 'node_modules' || file === '.git' || file === '.git-repos') {
          continue;
        }
        walk(filePath);
      } else if (file.endsWith('.md')) {
        stats.total++;

        // 添加 Frontmatter
        if (options.addFrontmatter) {
          if (addFrontmatter(filePath)) {
            stats.frontmatterAdded++;
          } else {
            stats.skipped++;
          }
        }

        // 优化图片
        if (options.optimizeImages) {
          if (optimizeImageAlt(filePath)) {
            stats.imageOptimized++;
          }
        }
      }
    }
  }

  walk(dirPath);
  return stats;
}

// 主程序
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
📝 Blog SEO Optimizer

用法:
  node seo-optimizer.js <目录路径> [选项]

选项:
  --frontmatter    添加 YAML Frontmatter
  --images         优化图片 Alt 文本
  --all            执行所有优化

示例:
  node seo-optimizer.js /Users/ga666666/Desktop/note --all
  node seo-optimizer.js /Users/ga666666/Desktop/note --frontmatter
  node seo-optimizer.js /Users/ga666666/Desktop/note --images
`);
    process.exit(1);
  }

  const targetDir = args[0];
  const options = {
    addFrontmatter: args.includes('--frontmatter') || args.includes('--all'),
    optimizeImages: args.includes('--images') || args.includes('--all')
  };

  if (!fs.existsSync(targetDir)) {
    console.error(`❌ 目录不存在: ${targetDir}`);
    process.exit(1);
  }

  console.log('🚀 开始优化...\n');
  console.log(`📁 目标目录: ${targetDir}`);
  console.log(`✨ 优化选项:`, options);
  console.log('');

  const stats = processDirectory(targetDir, options);

  console.log('\n');
  console.log('=' .repeat(50));
  console.log('📊 优化完成统计:');
  console.log('=' .repeat(50));
  console.log(`总文件数: ${stats.total}`);
  console.log(`✅ Frontmatter 添加: ${stats.frontmatterAdded}`);
  console.log(`✅ 图片 Alt 优化: ${stats.imageOptimized}`);
  console.log(`⏭️  跳过: ${stats.skipped}`);
  console.log(`❌ 失败: ${stats.failed}`);
  console.log('=' .repeat(50));
}

main();
