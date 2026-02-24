// DOM 元素
const homeView = document.getElementById('homeView');
const postView = document.getElementById('postView');
const postBody = document.getElementById('postBody');
const postDate = document.getElementById('postDate');
const postFileName = document.getElementById('postFileName');
const postSize = document.getElementById('postSize');
const siteHeader = document.getElementById('siteHeader');
const siteFooter = document.getElementById('siteFooter');

// 加载网站配置和模板
async function loadConfig() {
  try {
    // 检查缓存
    const cached = ClientCache.get('config');
    if (cached) {
      const config = cached;
      applyConfig(config);

      // 如果配置了首页路径但没有首页内容，说明仓库可能还在初始化，稍后重试
      if (config.pages && config.pages.home && !config.homeContent) {
        checkAndReloadConfig();
      }
      return;
    }

    const response = await fetch('/api/config');
    const config = await response.json();

    // 缓存配置
    ClientCache.set('config', '', config);

    applyConfig(config);

    // 如果配置了首页路径但没有首页内容，说明仓库可能还在初始化，稍后重试
    if (config.pages && config.pages.home && !config.homeContent) {
      checkAndReloadConfig();
    }
  } catch (error) {
    console.error(i18n.t('client.loadConfigFailed'), error);
  }
}

// 检查并重新加载配置（用于仓库初始化完成后刷新）
let configCheckInterval = null;
function checkAndReloadConfig() {
  // 如果已经有检查任务在运行，不重复启动
  if (configCheckInterval) {
    return;
  }

  let checkCount = 0;
  configCheckInterval = setInterval(async () => {
    checkCount++;

    // 最多检查20次（约10秒）
    if (checkCount > 20) {
      clearInterval(configCheckInterval);
      configCheckInterval = null;
      return;
    }

    try {
      const response = await fetch('/api/config');
      const config = await response.json();

      // 如果现在有首页内容了，说明仓库初始化完成，重新加载配置
      if (config.pages && config.pages.home && config.homeContent) {
        clearInterval(configCheckInterval);
        configCheckInterval = null;

        // 清除缓存并重新加载
        ClientCache.delete('config');
        ClientCache.set('config', '', config);
        applyConfig(config);
      }
    } catch (error) {
      // 忽略错误，继续检查
    }
  }, 500); // 每500ms检查一次
}

// 更新 SEO Meta 标签
function updateSEOMetaTags(data) {
  const baseUrl = window.location.origin;
  const {
    title = 'PowerWiki - 知识库',
    description = 'PowerWiki - 一个现代化的知识库系统',
    keywords = '知识库,文档,Markdown,Wiki',
    url = baseUrl,
    image = '',
    type = 'website'
  } = data;

  // 更新基础 meta 标签
  document.getElementById('pageTitle').textContent = title;
  document.getElementById('metaDescription').setAttribute('content', description);
  document.getElementById('metaKeywords').setAttribute('content', keywords);
  document.getElementById('canonicalUrl').setAttribute('href', url);

  // 更新 Open Graph 标签
  document.getElementById('ogUrl').setAttribute('content', url);
  document.getElementById('ogTitle').setAttribute('content', title);
  document.getElementById('ogDescription').setAttribute('content', description);
  document.getElementById('ogImage').setAttribute('content', image || `${baseUrl}/og-image.png`);
  if (siteConfig) {
    document.getElementById('ogSiteName').setAttribute('content', siteConfig.siteTitle || 'PowerWiki');
  }

  // 更新 Twitter Card 标签
  document.getElementById('twitterUrl').setAttribute('content', url);
  document.getElementById('twitterTitle').setAttribute('content', title);
  document.getElementById('twitterDescription').setAttribute('content', description);
  document.getElementById('twitterImage').setAttribute('content', image || `${baseUrl}/og-image.png`);

  // 更新结构化数据
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': type === 'article' ? 'Article' : 'WebSite',
    'headline': title,
    'description': description,
    'url': url
  };

  if (type === 'article' && data.articleData) {
    structuredData['datePublished'] = data.articleData.datePublished || new Date().toISOString();
    structuredData['dateModified'] = data.articleData.dateModified || new Date().toISOString();
    structuredData['author'] = {
      '@type': 'Organization',
      'name': siteConfig?.siteTitle || 'PowerWiki'
    };
    if (data.articleData.image) {
      structuredData['image'] = data.articleData.image;
    }
  } else {
    structuredData['name'] = siteConfig?.siteTitle || 'PowerWiki';
    structuredData['description'] = siteConfig?.siteDescription || description;
  }

  document.getElementById('structuredData').textContent = JSON.stringify(structuredData);
}

// 应用配置
function applyConfig(config) {
  siteConfig = config; // 保存配置供 SEO 函数使用

  // 获取 DOM 元素
  const siteLogo = document.getElementById('siteLogo');

  // 更新标题
  if (siteLogo) {
    siteLogo.textContent = config.siteTitle || 'PowerWiki';
  }

  // 加载 header 和 footer
  if (siteHeader && config.header) {
    siteHeader.innerHTML = config.header;
  }
  if (siteFooter && config.footer) {
    siteFooter.innerHTML = config.footer;
    // 更新统计数据
    updateFooterStats();
  }

  // 加载首页模板
  if (homeView && config.home) {
    homeView.innerHTML = config.home;

    // 如果配置了 README 文件，显示其内容
    if (config.homeContent && config.homeContent.html) {
      try {
        const homeContent = document.getElementById('homeContent');
        const homeWelcome = document.getElementById('homeWelcome');

        if (homeContent) {
          homeContent.innerHTML = config.homeContent.html;
          homeContent.style.display = 'block';

          // 隐藏默认欢迎页面
          if (homeWelcome) {
            homeWelcome.style.display = 'none';
          }

          // 为代码块和图片添加功能
          addCopyButtonsToCodeBlocks(homeContent);
          addImageZoomFeature(homeContent);
          renderMermaidBlocks(homeContent);

          // 为标题添加 ID 并生成目录（如果有标题）
          generateHomeTOC();
        }
      } catch (error) {
        console.error(i18n.t('client.loadHomeContentFailed'), error);
        // 如果出错，显示默认欢迎页面
        const homeWelcome = document.getElementById('homeWelcome');
        if (homeWelcome) {
          homeWelcome.style.display = 'block';
        }
      }
    }
  }

  // 更新页面标题和 SEO
  const homeTitle = `${config.siteTitle || 'PowerWiki'} - ${config.siteDescription || '知识库'}`;
  document.title = homeTitle;

  // 更新 SEO meta 标签（首页）
  updateSEOMetaTags({
    title: homeTitle,
    description: config.siteDescription || 'PowerWiki - 一个现代化的知识库系统',
    keywords: '知识库,文档,Markdown,Wiki',
    url: window.location.origin,
    type: 'website'
  });
}

// 加载单篇文章
async function loadPost(filePath) {
  try {
    postView.classList.remove('active');
    homeView.classList.remove('active');

    // 检查缓存
    const cached = ClientCache.get('post', filePath);
    if (cached) {
      currentPost = cached;
      renderPost(cached);
      // 后台更新文章（访问量可能变化）
      updatePostInBackground(filePath);
      return;
    }

    const response = await fetch(`/api/post/${encodePath(filePath)}`);
    if (!response.ok) {
      throw new Error('文章不存在');
    }

    const post = await response.json();
    currentPost = post;

    // 缓存文章
    ClientCache.set('post', filePath, post);

    renderPost(post);
  } catch (error) {
    console.error(i18n.t('client.loadPostFailed'), error);
    showNotification(i18n.t('client.loadPostFailed') + ': ' + error.message, 'error');
    // 文章不存在时自动跳转到首页
    if (error.message === 'Article not found' || error.message === '文章不存在') {
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    }
  }
}

// 渲染文章
function renderPost(post) {

  // 显示文件名（从路径中提取）
  const fileName = post.path.split('/').pop().replace(/\.(md|markdown|pdf)$/i, '');
  if (postFileName) {
    postFileName.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M3 2h5l3 3v7a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M8 2v3h3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span>${escapeHtml(fileName)}</span>
    `;
  }

  // 显示查看量
  const viewCount = post.viewCount || 0;
  const postViewCount = document.getElementById('postViewCount');
  if (postViewCount) {
    // 追加文字到现有的 SVG 图标后
    const existingText = postViewCount.querySelector('span.view-text');
    if (existingText) {
      existingText.textContent = viewCount;
    } else {
      const textSpan = document.createElement('span');
      textSpan.className = 'view-text';
      textSpan.textContent = viewCount;
      postViewCount.appendChild(textSpan);
    }
  }

  // 检查文件类型
  const filePath = post.path;
  const fileType = post.type || (filePath.endsWith('.pdf') ? 'pdf' : 'markdown');

  if (fileType === 'pdf') {
    // PDF 文件：渲染成图片，无任何控件
    const pdfUrl = `/api/pdf/${encodePath(filePath)}`;
    postBody.innerHTML = `<div class="pdf-pages" id="pdfPages"></div>`;

    // 加载并渲染 PDF
    renderPdfAsImages(pdfUrl);

    // PDF 文件不显示目录
    const tocSidebar = document.getElementById('tocSidebar');
    if (tocSidebar) {
      tocSidebar.style.display = 'none';
    }
  } else {
    // Markdown 文件：正常渲染
    postBody.innerHTML = post.html;

    // 为代码块添加复制按钮
    addCopyButtonsToCodeBlocks();

    // 为图片添加点击放大功能
    addImageZoomFeature();

    // 渲染 Mermaid 图表
    renderMermaidBlocks();

    // 为标题添加 ID 并生成目录
    generateTOC();

    // 显示目录栏
    const tocSidebar = document.getElementById('tocSidebar');
    if (tocSidebar) {
      tocSidebar.style.display = 'flex';
    }

    // 设置目录滚动监听
    setupTOCScroll();
  }

  // 格式化创建日期（显示在左上角）
  const createdDate = new Date(post.fileInfo.created || post.fileInfo.modified);
  const createdDateText = createdDate.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  // 追加文字到现有的 SVG 图标后
  const existingDateText = postDate.querySelector('span.date-text');
  if (existingDateText) {
    existingDateText.textContent = createdDateText;
  } else {
    const dateSpan = document.createElement('span');
    dateSpan.className = 'date-text';
    dateSpan.textContent = createdDateText;
    postDate.appendChild(dateSpan);
  }

  // 添加更新时间到文章末尾（右下角）
  // 先移除可能存在的旧更新时间元素
  const existingUpdatedTime = postBody.querySelector('.post-updated-time');
  if (existingUpdatedTime) {
    existingUpdatedTime.remove();
  }

  // 只有在创建时间和修改时间不同时才显示更新时间
  const modifiedDate = new Date(post.fileInfo.modified);
  const createdDateForCompare = new Date(post.fileInfo.created || post.fileInfo.modified);
  if (post.fileInfo.created && createdDateForCompare.getTime() !== modifiedDate.getTime()) {
    const updatedDateText = modifiedDate.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const updatedTimeDiv = document.createElement('div');
    updatedTimeDiv.className = 'post-updated-time';
    updatedTimeDiv.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.2"/>
        <path d="M7 4v3l2 2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
      </svg>
      <span>${i18n.tf('client.updatedTime', updatedDateText)}</span>
    `;
    postBody.appendChild(updatedTimeDiv);
  }

  // 添加许可证和原创声明到文章末尾
  // 先移除可能存在的旧许可证元素
  const existingLicense = postBody.querySelector('.post-license');
  if (existingLicense) {
    existingLicense.remove();
  }

  const licenseDiv = document.createElement('div');
  licenseDiv.className = 'post-license';
  licenseDiv.innerHTML = `
    <div class="license-content">
      <div class="license-icon">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 1L3 3.5v5c0 3.5 2.5 6.5 5 7.5 2.5-1 5-4 5-7.5v-5L8 1z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M6 7h4M6 9h4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
        </svg>
      </div>
      <div class="license-text">
        <p class="license-title">${i18n.t('client.copyright')}</p>
        <p class="license-description">${i18n.t('client.copyrightText')} <a href="https://opensource.org/licenses/MIT" target="_blank" rel="noopener noreferrer">${i18n.t('client.license')}</a></p>
      </div>
    </div>
  `;
  postBody.appendChild(licenseDiv);

  // 格式化文件大小
  const sizeKB = (post.fileInfo.size / 1024).toFixed(2);
  const sizeMB = (post.fileInfo.size / (1024 * 1024)).toFixed(2);
  const sizeText = post.fileInfo.size > 1024 * 1024 ? `${sizeMB} MB` : `${sizeKB} KB`;
  const existingSizeText = postSize.querySelector('span.size-text');
  if (existingSizeText) {
    existingSizeText.textContent = sizeText;
  } else {
    const sizeSpan = document.createElement('span');
    sizeSpan.className = 'size-text';
    sizeSpan.textContent = sizeText;
    postSize.appendChild(sizeSpan);
  }

  // 显示文章视图
  postView.classList.add('active');
  homeView.classList.remove('active');

  // 更新 SEO meta 标签（文章页）
  const articleUrl = `${window.location.origin}/post/${encodePath(post.path)}`;
  const articleTitle = `${post.title} - ${siteConfig?.siteTitle || 'PowerWiki'}`;
  const articleDescription = post.description || post.title || 'PowerWiki 文章';

  // 提取文章中的第一张图片作为 og:image
  let articleImage = '';
  if (post.html) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = post.html;
    const firstImg = tempDiv.querySelector('img');
    if (firstImg && firstImg.src) {
      articleImage = firstImg.src.startsWith('http') ? firstImg.src : `${window.location.origin}${firstImg.src}`;
    }
  }

  document.title = articleTitle;
  updateSEOMetaTags({
    title: articleTitle,
    description: articleDescription,
    keywords: `${post.title},知识库,文档`,
    url: articleUrl,
    image: articleImage,
    type: 'article',
    articleData: {
      datePublished: post.fileInfo?.modified || new Date().toISOString(),
      dateModified: post.fileInfo?.modified || new Date().toISOString(),
      image: articleImage
    }
  });

  // 更新footer统计信息
  updateFooterStats();

  // 滚动到顶部
  window.scrollTo(0, 0);

  // 更新导航栏活动状态（清除所有选中状态）
  postList.querySelectorAll('.nav-item-file').forEach(i => i.classList.remove('active'));
  postList.querySelectorAll('.nav-dir').forEach(d => d.classList.remove('active'));

  // 高亮当前文件
  const currentFilePath = post.path;
  postList.querySelectorAll('.nav-item-file').forEach(item => {
    if (item.dataset.path === currentFilePath) {
      item.classList.add('active');
      // 展开所有父目录
      let parent = item.parentElement;
      while (parent && parent !== postList) {
        if (parent.classList.contains('nav-dir')) {
          parent.classList.add('expanded');
          const children = parent.querySelector('.nav-dir-children');
          if (children) {
            children.style.display = 'block';
          }
        }
        parent = parent.parentElement;
      }
    }
  });
}

// 后台更新文章（用于更新访问量等可能变化的数据）
async function updatePostInBackground(filePath) {
  try {
    const response = await fetch(`/api/post/${encodePath(filePath)}`);
    if (response.ok) {
      const post = await response.json();

      // 只更新访问量，不重新渲染整个页面
      if (post.viewCount !== undefined && currentPost && currentPost.path === filePath) {
        currentPost.viewCount = post.viewCount;
        const postViewCount = document.getElementById('postViewCount');
        if (postViewCount) {
          const existingText = postViewCount.querySelector('span.view-text');
          if (existingText) {
            existingText.textContent = post.viewCount;
          }
        }
      }

      // 更新缓存
      ClientCache.set('post', filePath, post);
    }
  } catch (error) {
    console.warn(i18n.t('client.backgroundUpdatePostFailed'), error);
  }
}
