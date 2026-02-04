# Frontmatter 显示问题修复说明

## 问题描述

在博客文章中添加 YAML Frontmatter 后，Frontmatter 内容会被直接渲染显示在页面上，看起来很丑：

```markdown
---
title: 文章标题
description: 文章描述
keywords: 关键词1, 关键词2
tags: [分类1, 分类2]
---

# 文章标题
正文内容...
```

**显示效果**：
```
--- title: 文章标题 description: 文章描述 ...

文章标题
正文内容...
```

## 解决方案

### 1. 修改 Markdown 解析器

在 `utils/markdownParser.js` 中添加 Frontmatter 解析功能：

```javascript
/**
 * 解析 YAML Frontmatter
 * @param {string} markdown - Markdown 内容
 * @returns {Object} { frontmatter: Object, content: string }
 */
function parseFrontmatter(markdown) {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = markdown.match(frontmatterRegex);

  if (!match) {
    return {
      frontmatter: {},
      content: markdown
    };
  }

  const frontmatterText = match[1];
  const content = match[2];
  const frontmatter = {};

  // 解析 YAML (简单实现)
  const lines = frontmatterText.split('\n');
  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim();
      let value = line.substring(colonIndex + 1).trim();

      // 处理数组 [tag1, tag2]
      if (value.startsWith('[') && value.endsWith(']')) {
        value = value.substring(1, value.length - 1)
          .split(',')
          .map(v => v.trim())
          .filter(v => v);
      }

      frontmatter[key] = value;
    }
  }

  return {
    frontmatter,
    content
  };
}
```

### 2. 修改解析流程

在 `parseMarkdown` 函数中：

```javascript
function parseMarkdown(markdown) {
  // 1. 先解析 Frontmatter
  const { frontmatter, content } = parseFrontmatter(markdown);

  // 2. 只渲染内容部分（不包含 Frontmatter）
  let html = marked.parse(content);

  // 3. 优先使用 Frontmatter 中的信息
  const title = frontmatter.title || extractTitle(content);
  const description = frontmatter.description || extractDescription(content);
  const keywords = frontmatter.keywords || '';
  const tags = frontmatter.tags || [];

  return {
    html,           // 不含 Frontmatter 的渲染结果
    title,
    description,
    keywords,
    tags,
    frontmatter,    // 原始 Frontmatter 对象
    raw: content    // 不含 Frontmatter 的原始内容
  };
}
```

### 3. 更新 server.js

在 API 和 SSR 路由中优先使用 Frontmatter 数据：

```javascript
// API 路由
const parsed = parseMarkdown(content);
const title = parsed.title || fileName;
const description = parsed.description || seoHelper.generateDescription(html, title);
const keywords = parsed.keywords || seoHelper.extractKeywords(html, title, filePath);

// SSR 路由
const articleDescription = parsed.description || seoHelper.generateDescription(optimizedHtml, title);
const articleKeywords = parsed.keywords || seoHelper.extractKeywords(optimizedHtml, title, filePath);
```

## 使用效果

### 修复前
```
页面显示：
---
title: AI 时代的图片搜索方案
description: 基于向量数据库...
keywords: 向量数据库, 图片搜索
tags: [架构设计, AI]
---

# AI 时代的图片搜索方案
```

### 修复后
```
页面显示：
# AI 时代的图片搜索方案

正文内容...

元信息被正确提取：
- title: "AI 时代的图片搜索方案"
- description: "基于向量数据库..."
- keywords: "向量数据库, 图片搜索"
- tags: ["架构设计", "AI"]
```

## 功能特性

### 1. 自动过滤 Frontmatter
- Frontmatter 不会出现在渲染后的 HTML 中
- 保持页面简洁美观

### 2. 元信息提取
- 自动提取 title, description, keywords, tags
- 用于 SEO Meta 标签生成
- 用于结构化数据（Schema.org）

### 3. 智能回退
- 如果没有 Frontmatter，使用原有的提取逻辑
- 兼容旧文章（没有 Frontmatter 的文章）
- 渐进式增强

### 4. 数组支持
- 支持数组格式：`tags: [tag1, tag2, tag3]`
- 自动解析为数组

## 支持的 Frontmatter 字段

```yaml
---
title: 文章标题             # 用于 <title> 和 <h1>
description: 文章描述       # 用于 meta description
author: 作者名             # 用于 Schema.org
date: 2026-01-10          # 发布日期
updated: 2026-01-10       # 更新日期
keywords: 关键词1, 关键词2  # 用于 meta keywords
tags: [分类1, 分类2]       # 文章标签
---
```

## 测试方法

### 1. 创建测试文章
```markdown
---
title: 测试文章
description: 这是一篇测试文章
keywords: 测试, Markdown, Frontmatter
tags: [测试, 文档]
---

# 测试文章

这是正文内容。
```

### 2. 访问文章
```bash
curl http://localhost:3150/api/post/test.md
```

### 3. 检查返回
```json
{
  "html": "<h1>测试文章</h1>\n<p>这是正文内容。</p>",
  "title": "测试文章",
  "description": "这是一篇测试文章",
  "keywords": "测试, Markdown, Frontmatter",
  "tags": ["测试", "文档"],
  "frontmatter": {
    "title": "测试文章",
    "description": "这是一篇测试文章",
    "keywords": "测试, Markdown, Frontmatter",
    "tags": ["测试", "文档"]
  }
}
```

### 4. 查看页面
访问 `http://localhost:3150/post/test.md`，确认：
- ✅ Frontmatter 不显示
- ✅ 标题正确
- ✅ Meta 标签包含正确信息

## 迁移指南

### 已有文章（没有 Frontmatter）
- 不需要修改，继续正常工作
- 系统会自动从内容中提取 title 和 description

### 新文章（推荐添加 Frontmatter）
```markdown
---
title: 文章标题
description: 140-160字符的描述，用于搜索结果展示
keywords: 核心关键词1, 关键词2, 关键词3
tags: [分类标签]
---

# 文章标题
正文...
```

### 批量添加（使用工具）
```bash
# 使用 seo-optimizer.js 批量添加
node seo-optimizer.js /path/to/blog --frontmatter
```

## Git 提交记录

- ✅ `74ab646` - fix: 修复 Frontmatter 显示问题，支持 YAML 元信息解析
- ✅ 已推送到 GitHub

## 相关文档

- [SEO_OPTIMIZATION.md](./SEO_OPTIMIZATION.md) - 完整的 SEO 优化指南
- [seo-optimizer.js](./seo-optimizer.js) - 批量优化工具
- [keywords-optimizer.js](./keywords-optimizer.js) - 关键词优化工具

---

**修复日期**: 2026-01-10
**状态**: ✅ 已完成并推送
**影响范围**: 所有 Markdown 文章
**向后兼容**: ✅ 完全兼容旧文章
