# PowerWiki SEO 优化指南

本文档详细说明了 PowerWiki 的 SEO 优化功能和最佳实践。

## 📋 目录

1. [优化功能概览](#优化功能概览)
2. [技术 SEO 优化](#技术-seo-优化)
3. [内容 SEO 优化](#内容-seo-优化)
4. [性能优化](#性能优化)
5. [配置建议](#配置建议)
6. [SEO 检查清单](#seo-检查清单)

---

## 优化功能概览

PowerWiki 现已集成以下 SEO 优化功能:

### ✅ 已实现的优化

- [x] **智能 Meta 标签生成** - 自动从文章内容提取描述和关键词
- [x] **面包屑导航** - 带结构化数据的面包屑导航
- [x] **优化的 Sitemap** - 包含图片信息和动态优先级
- [x] **RSS Feed** - 支持 RSS 订阅
- [x] **图片优化** - 自动添加 alt 标签和懒加载
- [x] **结构化数据** - Article、BreadcrumbList Schema
- [x] **Open Graph** - 社交媒体分享优化
- [x] **Twitter Card** - Twitter 分享卡片
- [x] **Gzip 压缩** - 减少页面传输大小
- [x] **服务端渲染 (SSR)** - 为搜索引擎爬虫提供预渲染页面

---

## 技术 SEO 优化

### 1. 智能 Meta 标签生成

PowerWiki 自动为每篇文章生成优化的 Meta 标签:

**自动提取的信息:**
- **标题**: 从文件名提取
- **描述**: 从文章内容前 155 字符智能提取
- **关键词**: 从文章标题、路径、标题、加粗内容自动提取

**示例:**
```html
<title>文章标题 - PowerWiki</title>
<meta name="description" content="从文章内容自动提取的描述...">
<meta name="keywords" content="关键词1,关键词2,知识库,技术文档">
```

### 2. 结构化数据 (Schema.org)

PowerWiki 为每个页面添加 JSON-LD 结构化数据:

#### Article Schema (文章页面)
```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "文章标题",
  "description": "文章描述",
  "url": "https://yoursite.com/post/article.md",
  "datePublished": "2024-01-01T00:00:00.000Z",
  "dateModified": "2024-01-10T00:00:00.000Z",
  "author": {
    "@type": "Organization",
    "name": "你的站点名称"
  },
  "image": "https://yoursite.com/image.jpg",
  "keywords": "关键词1,关键词2"
}
```

#### BreadcrumbList Schema (面包屑导航)
```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "首页",
      "item": "https://yoursite.com"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "目录名",
      "item": "https://yoursite.com/目录名"
    }
  ]
}
```

### 3. Open Graph 和 Twitter Card

**Open Graph (用于 Facebook、LinkedIn 等):**
```html
<meta property="og:type" content="article">
<meta property="og:url" content="https://yoursite.com/post/article">
<meta property="og:title" content="文章标题">
<meta property="og:description" content="文章描述">
<meta property="og:image" content="https://yoursite.com/image.jpg">
<meta property="og:site_name" content="PowerWiki">
```

**Twitter Card:**
```html
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="文章标题">
<meta name="twitter:description" content="文章描述">
<meta name="twitter:image" content="https://yoursite.com/image.jpg">
```

### 4. Sitemap.xml 优化

**访问地址**: `https://yoursite.com/sitemap.xml`

**优化特性:**
- ✅ 包含所有 Markdown 文章
- ✅ 自动提取文章中的图片 (前 3 张)
- ✅ 动态计算优先级（基于文章新鲜度）
- ✅ 包含最后修改时间
- ✅ 1 小时缓存

**优先级规则:**
- 首页: `1.0`
- 一周内的文章: `0.9`
- 一个月内的文章: `0.8`
- 三个月内的文章: `0.7`
- 较旧的文章: `0.6`

### 5. RSS Feed

**访问地址**: `https://yoursite.com/rss.xml`

**特性:**
- ✅ 包含最新 20 篇文章
- ✅ 文章描述（前 300 字符）
- ✅ 发布时间
- ✅ 文章分类（从路径提取）
- ✅ 30 分钟缓存

**RSS 链接已自动添加到:**
- HTML `<head>` 中的 `<link rel="alternate">` 标签
- 用户可以通过 RSS 阅读器订阅

### 6. Robots.txt

**访问地址**: `https://yoursite.com/robots.txt`

```
User-agent: *
Allow: /
Disallow: /api/
Disallow: /pdfjs/

Sitemap: https://yoursite.com/sitemap.xml
```

---

## 内容 SEO 优化

### 1. 图片优化

**自动添加的属性:**
- `alt` 属性: 从图片标题、文件名或上下文自动提取
- `loading="lazy"`: 启用原生懒加载

**示例:**
```html
<!-- 优化前 -->
<img src="/images/photo.jpg">

<!-- 优化后 -->
<img src="/images/photo.jpg" alt="Photo" loading="lazy">
```

### 2. 关键词提取策略

PowerWiki 使用多种策略自动提取关键词:

1. **文章标题** - 直接作为主要关键词
2. **路径目录** - 从文件路径提取分类关键词
3. **H2/H3 标题** - 提取文章中的小标题
4. **加粗内容** - 提取 `<strong>` 和 `<b>` 标签中的关键词
5. **高频中文词组** - 提取 2-4 字的高频中文词
6. **高频英文单词** - 提取 3+ 字母的高频英文单词
7. **默认关键词** - "知识库"、"技术文档"

### 3. 描述生成策略

1. 从 HTML 中提取纯文本
2. 截取前 155 字符（Google 推荐长度）
3. 在句子边界处智能截断
4. 添加省略号（如需要）

---

## 性能优化

### 1. Gzip 压缩

所有 HTTP 响应都启用了 Gzip 压缩:

**预期压缩率:**
- HTML: 70-80%
- CSS: 60-70%
- JavaScript: 60-70%
- JSON: 70-80%

### 2. 缓存策略

**服务端缓存 (内存):**
- 文章列表: 10 分钟
- 单篇文章: 10-15 分钟
- 配置信息: 30 分钟
- 统计数据: 30 秒
- Sitemap: 1 小时
- RSS: 30 分钟

**HTTP 缓存头:**
```http
Cache-Control: public, max-age=1800  # 30分钟
```

### 3. 服务端渲染 (SSR)

**爬虫检测:**
PowerWiki 自动检测搜索引擎爬虫并提供 SSR:

```
Googlebot, Bingbot, Baiduspider, Yandexbot, DuckDuckBot,
Sogou, Slurp, Exabot, Facebot, ia_archiver
```

**SSR 优势:**
- ✅ 完整的 HTML 内容
- ✅ 所有 Meta 标签
- ✅ 结构化数据
- ✅ 无需 JavaScript 执行

### 4. 图片懒加载

所有图片自动添加 `loading="lazy"` 属性:
- ✅ 减少初始页面加载时间
- ✅ 节省带宽
- ✅ 改善 Core Web Vitals 指标

---

## 配置建议

### 1. config.json 配置

确保在 `config.json` 中设置以下字段:

```json
{
  "siteTitle": "你的网站名称",
  "siteDescription": "你的网站描述（建议 50-160 字符）",
  "siteUrl": "https://yoursite.com",
  "gitRepo": "https://github.com/your/repo.git",
  "repoBranch": "master",
  "mdPath": "",
  "port": 3150,
  "autoSyncInterval": 180000
}
```

**重要字段说明:**
- `siteUrl`: 必填，用于生成正确的 canonical URL 和 sitemap
- `siteTitle`: 用于 Meta 标签和 Schema.org
- `siteDescription`: 首页描述，影响搜索结果

### 2. 文章编写建议

为了最大化 SEO 效果:

#### 文件命名
```
✅ 好的命名: use-react-hooks.md
✅ 好的命名: JavaScript-基础教程.md
❌ 避免: untitled.md, 新建文档.md
```

#### 文章结构
```markdown
# 主标题 (H1)

文章的第一段应该是简短的摘要，包含主要关键词。

## 小标题 1 (H2)
内容...

### 子标题 (H3)
内容...

**重要内容加粗** - 会被提取为关键词
```

#### 图片使用
```markdown
<!-- 推荐：使用描述性的文件名和 title -->
![描述性文字](./images/react-hooks-diagram.png "React Hooks 工作流程")

<!-- 避免 -->
![](./image.png)
```

#### 目录结构
```
docs/
├── JavaScript/
│   ├── 基础教程.md        # 提取关键词: JavaScript, 基础教程
│   └── 高级技巧.md        # 提取关键词: JavaScript, 高级技巧
└── React/
    ├── Hooks详解.md      # 提取关键词: React, Hooks详解
    └── 性能优化.md       # 提取关键词: React, 性能优化
```

### 3. 提交到搜索引擎

**Google Search Console:**
1. 访问 https://search.google.com/search-console
2. 添加你的网站
3. 提交 Sitemap: `https://yoursite.com/sitemap.xml`

**Bing Webmaster Tools:**
1. 访问 https://www.bing.com/webmasters
2. 添加你的网站
3. 提交 Sitemap: `https://yoursite.com/sitemap.xml`

**百度站长平台:**
1. 访问 https://ziyuan.baidu.com
2. 添加你的网站
3. 提交 Sitemap: `https://yoursite.com/sitemap.xml`

---

## SEO 检查清单

### 部署前检查

- [ ] 在 `config.json` 中设置 `siteUrl`
- [ ] 在 `config.json` 中设置 `siteTitle` 和 `siteDescription`
- [ ] 确保已安装 `compression` 依赖: `npm install`
- [ ] 测试 Sitemap: 访问 `/sitemap.xml`
- [ ] 测试 RSS: 访问 `/rss.xml`
- [ ] 测试 robots.txt: 访问 `/robots.txt`

### 部署后检查

- [ ] 使用 Google Rich Results Test 测试结构化数据
  - https://search.google.com/test/rich-results
- [ ] 使用 Facebook Sharing Debugger 测试 Open Graph
  - https://developers.facebook.com/tools/debug/
- [ ] 使用 Twitter Card Validator 测试 Twitter Card
  - https://cards-dev.twitter.com/validator
- [ ] 提交 Sitemap 到 Google Search Console
- [ ] 提交 Sitemap 到 Bing Webmaster Tools
- [ ] 检查页面加载速度 (PageSpeed Insights)
  - https://pagespeed.web.dev/

### 定期维护

- [ ] 每月检查 Google Search Console 的索引覆盖率
- [ ] 每月检查搜索分析数据
- [ ] 定期更新文章内容保持新鲜度
- [ ] 监控 Core Web Vitals 指标

---

## 常见问题

### Q: 为什么 Google 还没有索引我的网站?

**A**: 索引需要时间，通常 1-4 周。你可以:
1. 在 Google Search Console 提交 Sitemap
2. 使用"请求编入索引"功能
3. 确保网站可以被 Googlebot 访问

### Q: 如何测试 SSR 是否正常工作?

**A**: 使用 curl 模拟爬虫:
```bash
curl -A "Googlebot" https://yoursite.com/post/article.md
```
应该返回完整的 HTML，包含文章内容。

### Q: 如何查看缓存统计?

**A**: 访问 `/api/cache/stats` 查看缓存命中率:
```bash
curl https://yoursite.com/api/cache/stats
```

### Q: RSS Feed 不显示最新文章?

**A**: RSS 有 30 分钟缓存。等待缓存过期或手动清除缓存:
```bash
curl -X POST https://yoursite.com/api/cache/clear \
  -H "Content-Type: application/json" \
  -d '{"type": "rss"}'
```

---

## 进一步优化建议

### 1. 添加 Google Analytics

在 `public/index.html` 中添加:
```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

### 2. 添加 Favicon

在 `public/` 目录添加 `favicon.ico` 和 `apple-touch-icon.png`:
```html
<link rel="icon" type="image/x-icon" href="/favicon.ico">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
```

### 3. 启用 HTTPS

SEO 需要 HTTPS。推荐使用:
- Let's Encrypt (免费 SSL 证书)
- Cloudflare (免费 CDN + SSL)

### 4. 使用 CDN

将静态资源托管到 CDN:
- 图片: 使用图床或对象存储
- CSS/JS: 使用 CDN 加速

### 5. 内部链接优化

在文章中添加相关文章链接:
```markdown
相关阅读:
- [React Hooks 详解](./react-hooks.md)
- [JavaScript 基础](../JavaScript/basics.md)
```

---

## 监控和分析

### 推荐工具

1. **Google Search Console** - 搜索表现分析
2. **Google Analytics** - 流量分析
3. **PageSpeed Insights** - 性能分析
4. **Ahrefs / SEMrush** - SEO 综合分析（付费）
5. **Screaming Frog** - 网站爬取和分析

### 关键指标

- **索引覆盖率**: 被索引的页面数
- **平均排名**: 关键词平均排名
- **点击率 (CTR)**: 搜索结果点击率
- **页面加载时间**: < 3 秒为佳
- **Core Web Vitals**:
  - LCP (Largest Contentful Paint): < 2.5s
  - FID (First Input Delay): < 100ms
  - CLS (Cumulative Layout Shift): < 0.1

---

## 总结

PowerWiki 已经内置了完善的 SEO 优化功能。通过正确配置和遵循最佳实践，你的网站将能够:

✅ 被搜索引擎快速索引
✅ 获得更好的搜索排名
✅ 在社交媒体上更好地展示
✅ 提供更快的页面加载速度
✅ 改善用户体验

**下一步行动:**
1. 完成"SEO 检查清单"中的所有项目
2. 提交 Sitemap 到各大搜索引擎
3. 定期发布高质量内容
4. 监控和优化性能指标

祝你的网站获得更多自然流量！🚀

---

**文档版本**: v1.0.0
**最后更新**: 2026-01-10
**维护者**: PowerWiki Team
