#!/usr/bin/env node

/**
 * Keywords Optimizer
 *
 * 优化 YAML Frontmatter 中的关键词和标签
 */

const fs = require('fs-extra');
const path = require('path');

/**
 * 从文章内容智能提取关键词
 */
function extractSmartKeywords(content, filePath) {
  const keywords = new Set();

  // 提取标题
  const titleMatch = content.match(/^#\s+(.+)$/m);
  if (titleMatch) {
    const title = titleMatch[1].trim();
    // 从标题中提取关键技术词
    const techWords = title.match(/[\u4e00-\u9fa5]{2,6}|[A-Z][a-zA-Z]{2,}/g) || [];
    techWords.forEach(word => {
      if (word.length >= 2 && word.length <= 15) {
        keywords.add(word);
      }
    });
  }

  // 从路径提取分类（只要最后一级目录）
  const pathParts = filePath.split('/').filter(p => p && !p.endsWith('.md'));
  if (pathParts.length > 1) {
    const category = pathParts[pathParts.length - 2];
    if (category !== 'note' && category !== 'Users' && category !== 'Desktop') {
      keywords.add(category);
    }
  }

  // 提取 H2 标题中的关键词
  const h2Matches = content.match(/^##\s+(.+)$/gm) || [];
  h2Matches.slice(0, 5).forEach(match => {
    const heading = match.replace(/^##\s+/, '').trim();
    // 只提取中文词组和英文技术词
    const words = heading.match(/[\u4e00-\u9fa5]{2,8}|[A-Z][a-zA-Z0-9]{2,}/g) || [];
    words.forEach(word => {
      if (word.length >= 2 && word.length <= 15) {
        keywords.add(word);
      }
    });
  });

  // 提取加粗的技术术语
  const boldMatches = content.match(/\*\*([^*]+)\*\*/g) || [];
  boldMatches.slice(0, 10).forEach(match => {
    const bold = match.replace(/\*\*/g, '').trim();
    // 只要简短的技术词
    if (bold.length >= 2 && bold.length <= 15 && !bold.includes(' ')) {
      keywords.add(bold);
    }
  });

  // 提取常见技术栈关键词
  const techKeywords = [
    'Kubernetes', 'K8s', 'Docker', 'Redis', 'MySQL', 'MongoDB', 'Kafka',
    'Spring', 'SpringBoot', 'Java', 'Python', 'Go', 'Node.js', 'React',
    'Vue', 'WebRTC', 'MQTT', 'RTP', 'P2P', 'SFU', 'MCU', 'TLS', 'HTTPS',
    'OpenResty', 'Nginx', 'Git', 'YOLO', 'AI', 'ML', 'Milvus', 'CLIP',
    'IoT', 'SaaS', 'OLAP', 'ClickHouse', 'StarRocks', 'InfluxDB',
    'GPS', '向量数据库', '缓存同步', '高并发', '架构设计', '性能优化',
    '音视频', '物联网', '容器编排', '微服务', '分布式系统'
  ];

  techKeywords.forEach(tech => {
    if (content.includes(tech)) {
      keywords.add(tech);
    }
  });

  return Array.from(keywords).slice(0, 8);
}

/**
 * 从路径提取标签
 */
function extractTags(filePath) {
  const tags = [];
  const pathParts = filePath.split('/').filter(p => p && !p.endsWith('.md'));

  // 使用倒数第二个路径作为主标签
  if (pathParts.length > 1) {
    const category = pathParts[pathParts.length - 2];
    if (category !== 'note' && category !== 'Users' && category !== 'Desktop' && category !== 'ga666666') {
      tags.push(category);
    }
  }

  return tags;
}

/**
 * 更新文件的 Frontmatter
 */
function updateFrontmatter(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');

    // 检查是否有 Frontmatter
    if (!content.startsWith('---')) {
      console.log(`⏭️  跳过（无 Frontmatter）: ${filePath}`);
      return false;
    }

    // 提取现有的 Frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]+?)\n---\n/);
    if (!frontmatterMatch) {
      console.log(`⏭️  跳过（Frontmatter 格式错误）: ${filePath}`);
      return false;
    }

    const frontmatterContent = frontmatterMatch[1];
    const restContent = content.substring(frontmatterMatch[0].length);

    // 提取现有字段
    const titleMatch = frontmatterContent.match(/^title:\s*(.+)$/m);
    const descMatch = frontmatterContent.match(/^description:\s*(.+)$/m);
    const authorMatch = frontmatterContent.match(/^author:\s*(.+)$/m);
    const dateMatch = frontmatterContent.match(/^date:\s*(.+)$/m);
    const updatedMatch = frontmatterContent.match(/^updated:\s*(.+)$/m);

    // 生成新的关键词和标签
    const keywords = extractSmartKeywords(content, filePath);
    const tags = extractTags(filePath);

    // 重新构建 Frontmatter
    const newFrontmatter = `---
title: ${titleMatch ? titleMatch[1] : '文章标题'}
description: ${descMatch ? descMatch[1] : '文章描述'}
author: ${authorMatch ? authorMatch[1] : 'ga666666'}
date: ${dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0]}
updated: ${updatedMatch ? updatedMatch[1] : new Date().toISOString().split('T')[0]}
keywords: ${keywords.join(', ')}
tags: [${tags.join(', ')}]
---

`;

    // 写回文件
    const newContent = newFrontmatter + restContent;
    fs.writeFileSync(filePath, newContent, 'utf-8');

    console.log(`✅ 已优化: ${filePath}`);
    console.log(`   关键词: ${keywords.join(', ')}`);
    console.log(`   标签: [${tags.join(', ')}]`);

    return true;
  } catch (error) {
    console.error(`❌ 处理失败: ${filePath}`, error.message);
    return false;
  }
}

/**
 * 递归处理目录
 */
function processDirectory(dirPath) {
  const stats = {
    total: 0,
    updated: 0,
    skipped: 0,
    failed: 0
  };

  function walk(currentPath) {
    const files = fs.readdirSync(currentPath);

    for (const file of files) {
      const filePath = path.join(currentPath, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        if (file === 'node_modules' || file === '.git' || file === '.git-repos') {
          continue;
        }
        walk(filePath);
      } else if (file.endsWith('.md')) {
        stats.total++;

        if (updateFrontmatter(filePath)) {
          stats.updated++;
        } else {
          stats.skipped++;
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
🔧 Keywords Optimizer

用法:
  node keywords-optimizer.js <目录路径>

示例:
  node keywords-optimizer.js /Users/ga666666/Desktop/note
`);
    process.exit(1);
  }

  const targetDir = args[0];

  if (!fs.existsSync(targetDir)) {
    console.error(`❌ 目录不存在: ${targetDir}`);
    process.exit(1);
  }

  console.log('🚀 开始优化关键词...\n');
  console.log(`📁 目标目录: ${targetDir}`);
  console.log('');

  const stats = processDirectory(targetDir);

  console.log('\n');
  console.log('='.repeat(50));
  console.log('📊 优化完成统计:');
  console.log('='.repeat(50));
  console.log(`总文件数: ${stats.total}`);
  console.log(`✅ 已优化: ${stats.updated}`);
  console.log(`⏭️  跳过: ${stats.skipped}`);
  console.log(`❌ 失败: ${stats.failed}`);
  console.log('='.repeat(50));
}

main();
