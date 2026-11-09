// DOM 元素
const homeView = document.getElementById('homeView');
const postView = document.getElementById('postView');
const postBody = document.getElementById('postBody');
const postDate = document.getElementById('postDate');
const postFileName = document.getElementById('postFileName');
const postSize = document.getElementById('postSize');
const siteHeader = document.getElementById('siteHeader');
const siteFooter = document.getElementById('siteFooter');
const copyDocBtn = document.getElementById('copyDocBtn');
const rawToggleBtn = document.getElementById('rawToggleBtn');
const rawBody = document.getElementById('rawBody');
const shareBtn = document.getElementById('shareBtn');
const fullPageBtn = document.getElementById('fullPageBtn');
const readerExitBtn = document.getElementById('readerExitBtn');

/* ========== 沉浸式阅读 ==========
   HTML 文章的「全屏」不再跳转 /full/ 独立页面，而是在当前页把正文画布展开到
   视口大小：桌面端保留左侧目录，移动端收紧留白并收起抽屉侧栏，右上角提供退出按钮。
   展开状态挂在 body 上，只影响布局，不重载 iframe，因此页面内部的滚动位置不会丢。 */
const READER_MODE_CLASS = 'reader-expanded';
const READER_INSTANT_CLASS = 'reader-instant';
let readerScrollY = 0;

function isReaderMode() {
  return document.body.classList.contains(READER_MODE_CLASS);
}

function enterReaderMode(options) {
  const settings = options || {};
  if (isReaderMode()) return;
  readerScrollY = window.scrollY || 0;

  // 打开 HTML 文章时直接是沉浸态，不播展开动画：页面此时刚画好，
  // 再放一段从目录宽度撑开的过渡反而像布局抖动。
  if (settings.animate === false) {
    const root = document.documentElement;
    root.classList.add(READER_INSTANT_CLASS);
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove(READER_INSTANT_CLASS)));
  }

  // 移动端抽屉式侧栏如果正开着，先收起，避免压住正文
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (sidebar && sidebar.classList.contains('open')) {
    sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
  }

  document.documentElement.classList.add(READER_MODE_CLASS);
  document.body.classList.add(READER_MODE_CLASS);
  if (fullPageBtn) fullPageBtn.setAttribute('aria-expanded', 'true');
  // 展开后画布从视口顶部开始，先回到顶部再让内容占满剩余高度
  window.scrollTo(0, 0);
  // 自动进入时不抢焦点：用户还没开始操作，焦点应该留在浏览器手里
  if (settings.focusExit !== false && readerExitBtn) readerExitBtn.focus({ preventScroll: true });
}

function exitReaderMode(options) {
  if (!isReaderMode()) return;
  const settings = options || {};
  document.documentElement.classList.remove(READER_MODE_CLASS);
  document.body.classList.remove(READER_MODE_CLASS);
  if (fullPageBtn) fullPageBtn.setAttribute('aria-expanded', 'false');
  if (settings.restoreScroll !== false) window.scrollTo(0, readerScrollY);
  // 首页也可能处于沉浸态，此时「全屏」按钮在隐藏的文章视图里，不能把焦点丢过去
  if (settings.restoreFocus !== false && fullPageBtn && fullPageBtn.offsetParent !== null) {
    fullPageBtn.focus({ preventScroll: true });
  }
}

function toggleReaderMode() {
  if (isReaderMode()) exitReaderMode(); else enterReaderMode();
}

/* 首页沿用同一套沉浸态：配置的首页是 .html 时同样铺满视口，
   退出后回到带站点外壳的阅读视图（iframe 此时按内容高度展开）。
   首页是 Markdown 时保持原来的窄栏排版。 */
function isHtmlHome() {
  return !!(siteConfig && siteConfig.homeContent &&
    /\.(html?|htm)$/i.test(siteConfig.homeContent.path || ''));
}

function applyHomeReaderMode() {
  if (!homeView || !homeView.classList.contains('active')) return;
  if (isHtmlHome()) {
    if (!isReaderMode()) enterReaderMode({ animate: false, focusExit: false });
    // 首页的退出目标始终是页面顶部，不继承上一篇文档的滚动位置
    readerScrollY = 0;
  } else {
    exitReaderMode({ restoreScroll: false, restoreFocus: false });
  }
}

if (fullPageBtn) {
  fullPageBtn.addEventListener('click', event => {
    // 非 HTML 文章这个入口是隐藏的，不响应
    if (!fullPageBtn.getAttribute('href')) return;
    // 修饰键与中键仍然交给浏览器：需要真正的新标签页时依然可用
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    toggleReaderMode();
  });
}

if (readerExitBtn) {
  readerExitBtn.addEventListener('click', () => exitReaderMode());
}

document.addEventListener('keydown', event => {
  // 焦点在沙箱 iframe 内时按键不会冒泡到这里，此时用右上角的退出按钮
  if (event.key === 'Escape' && isReaderMode()) exitReaderMode();
});

// 按创建时间计算相邻文档，不修改菜单顺序或受搜索过滤影响。
function getAdjacentPosts(files, currentPath) {
  const ordered = files.filter(file => file.created != null && Number.isFinite(new Date(file.created).getTime()))
    .slice().sort((a, b) => {
      const difference = new Date(a.created).getTime() - new Date(b.created).getTime();
      return difference || (a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
    });
  const index = ordered.findIndex(file => file.path === currentPath);
  return index < 0 ? { previous: null, next: null } : {
    previous: ordered[index - 1] || null,
    next: ordered[index + 1] || null
  };
}

function renderPostNavigation(post) {
  const navigation = document.getElementById('postNavigation');
  if (!navigation) return;
  navigation.replaceChildren();
  navigation.hidden = true;
  const adjacent = getAdjacentPosts(postsFlat, post.path);
  for (const direction of ['previous', 'next']) {
    const file = adjacent[direction];
    if (!file) continue;
    const link = document.createElement('a');
    link.className = `post-navigation-link post-navigation-${direction}`;
    link.href = postUrl(file.path);
    const label = document.createElement('span');
    label.className = 'post-navigation-label';
    label.textContent = direction === 'previous'
      ? `← ${i18n.t('client.previousPost')}` : `${i18n.t('client.nextPost')} →`;
    const title = document.createElement('span');
    title.className = 'post-navigation-title';
    title.textContent = file.name || file.path;
    link.appendChild(label);
    link.appendChild(title);
    link.addEventListener('click', event => {
      // 保留新标签页、修饰键和普通链接的浏览器行为。
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      window.history.pushState({ path: file.path }, '', link.href);
      loadPost(file.path);
    });
    navigation.appendChild(link);
    navigation.hidden = false;
  }
}

// 原始文档切换状态
let isRawView = false;
// 记录进入原始视图前目录栏的显示状态，切回时还原
let tocPrevDisplay = '';

// 复制文档按钮事件（复制原始 Markdown 内容）
if (copyDocBtn) {
  copyDocBtn.addEventListener('click', async () => {
    if (!currentPost || !currentPost.path) return;

    const btn = copyDocBtn;
    const btnText = btn.querySelector('span');
    const originalText = btnText ? btnText.textContent : '';

    try {
      const rawContent = currentPost.raw || '';
      await navigator.clipboard.writeText(rawContent);

      btn.classList.add('copied');
      if (btnText) btnText.textContent = '✓ ' + i18n.t('client.copied');
      showNotification(i18n.t('client.copied'), 'success');

      setTimeout(() => {
        btn.classList.remove('copied');
        if (btnText) btnText.textContent = originalText;
      }, 2000);
    } catch (error) {
      console.error('复制失败:', error);
      showNotification(i18n.t('client.copyFailed') + ': ' + error.message, 'error');
    }
  });
}

// 原始文档切换按钮事件（渲染视图 / 原始 Markdown 之间显隐切换，
// 不重建 DOM，避免代码复制、图片放大等已绑定事件丢失）
if (rawToggleBtn) {
  rawToggleBtn.addEventListener('click', () => {
    if (!currentPost) return;

    isRawView = !isRawView;
    const btn = rawToggleBtn;
    const rawBtnText = btn.querySelector('span');
    const tocSidebar = document.getElementById('tocSidebar');

    if (isRawView) {
      // 填充并显示原始 Markdown，仅隐藏渲染视图（保留其 DOM 与事件）
      if (rawBody) {
        rawBody.textContent = currentPost.raw || '';
        rawBody.style.display = 'block';
      }
      postBody.style.display = 'none';
      btn.classList.add('active');
      if (rawBtnText) rawBtnText.textContent = i18n.t('client.showRendered');
      btn.setAttribute('title', i18n.t('client.showRendered'));
      // 隐藏目录，记录原显示状态以便还原
      if (tocSidebar) {
        tocPrevDisplay = tocSidebar.style.display;
        tocSidebar.style.display = 'none';
      }
    } else {
      // 直接恢复原有渲染视图，其代码复制/图片放大等事件仍有效
      if (rawBody) rawBody.style.display = 'none';
      postBody.style.display = '';
      btn.classList.remove('active');
      if (rawBtnText) rawBtnText.textContent = i18n.t('client.showRaw');
      btn.setAttribute('title', i18n.t('client.showRaw'));
      if (tocSidebar) tocSidebar.style.display = tocPrevDisplay;
    }
  });
}

// 分享按钮事件（生成文章短链并复制到剪贴板）
if (shareBtn) {
  shareBtn.addEventListener('click', async () => {
    if (!currentPost || !currentPost.path) return;

    const btn = shareBtn;
    const btnText = btn.querySelector('span');
    const originalText = btnText ? btnText.textContent : '';

    try {
      // 向后端请求该文章的固定短链
      const response = await fetch(`/api/shortlink/${encodePath(currentPost.path)}`);
      if (!response.ok) {
        throw new Error('shortlink request failed');
      }
      const data = await response.json();
      const shortUrl = data.shortUrl;

      await navigator.clipboard.writeText(shortUrl);

      btn.classList.add('copied');
      if (btnText) btnText.textContent = '✓ ' + i18n.t('client.shareCopied');
      showNotification(i18n.t('client.shareCopied') + ': ' + shortUrl, 'success');

      setTimeout(() => {
        btn.classList.remove('copied');
        if (btnText) btnText.textContent = originalText;
      }, 2000);
    } catch (error) {
      console.error('生成短链失败:', error);
      showNotification(i18n.t('client.shareFailed') + ': ' + error.message, 'error');
    }
  });
}

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
    if (!response.ok) throw new Error('Config unavailable');
    ClientCache.adoptVersion(response.headers.get('X-Content-Version'));
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
      if (!response.ok) throw new Error('Config unavailable');
      ClientCache.adoptVersion(response.headers.get('X-Content-Version'));
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
    document.getElementById('ogSiteName').setAttribute('content', data.siteName || siteConfig.siteTitle || 'PowerWiki');
  }

  // 更新 Twitter Card 标签
  document.getElementById('twitterUrl').setAttribute('content', url);
  document.getElementById('twitterTitle').setAttribute('content', title);
  document.getElementById('twitterDescription').setAttribute('content', description);
  document.getElementById('twitterImage').setAttribute('content', image || `${baseUrl}/og-image.png`);

  document.querySelector('meta[property="og:type"]').setAttribute('content', type);
  document.getElementById('structuredData').textContent = JSON.stringify(data.structuredData);
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

  if (currentPost || window.__INITIAL_POST__) return;

  // 首页内容已就绪：HTML 首页直接以沉浸态打开
  applyHomeReaderMode();
  updateSEOMetaTags(config.seo);
}

// 加载单篇文章
async function loadPost(filePath) {
  try {
    if (await ClientCache.ensureVersion()) {
      await Promise.all([loadConfig(), loadPosts()]);
    }
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

    ClientCache.adoptVersion(response.headers.get('X-Content-Version'));
    const post = await response.json();
    currentPost = post;

    // 缓存文章
    ClientCache.set('post', filePath, post);

    renderPost(post);
  } catch (error) {
    console.error(i18n.t('client.loadPostFailed'), error);
    showNotification(i18n.t('client.loadPostFailed') + ': ' + error.message, 'error');
    currentPost = null;
    stopPdfRendering();
    isRawView = false;
    if (rawBody) rawBody.style.display = 'none';
    postBody.style.display = '';
    const navigation = document.getElementById('postNavigation');
    if (navigation) navigation.hidden = true;
    postBody.innerHTML = '<h1>文章不存在或暂时无法加载</h1><a href="/">返回首页</a>';
    postView.classList.add('active');
    document.querySelector('meta[name="robots"]').setAttribute('content', 'noindex');
  }
}

// 渲染文章
function renderPost(post) {
  if (typeof stopPdfRendering === 'function') stopPdfRendering();

  // 切换文章时退出沉浸式阅读，避免上一页的展开状态带到下一篇
  exitReaderMode({ restoreScroll: false, restoreFocus: false });

  // 复位视图切换状态：回到渲染视图并隐藏原始视图（防止上一篇残留）
  isRawView = false;
  if (rawBody) rawBody.style.display = 'none';
  postBody.style.display = '';

  // 显示文件名（从路径中提取）
  const fileName = post.path.split('/').pop().replace(/\.(md|markdown|pdf|html|htm)$/i, '');
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
  const isHtmlPost = fileType === 'html' || /\.(html?|htm)$/i.test(filePath);

  // HTML 文章默认提供「全屏」入口，直达 /full/ 下的完整页面；
  // 其余类型隐藏，避免出现无效链接。
  if (fullPageBtn) {
    if (isHtmlPost) {
      fullPageBtn.href = `/full/${encodePath(filePath)}`;
      fullPageBtn.style.display = 'inline-flex';
    } else {
      fullPageBtn.style.display = 'none';
      fullPageBtn.removeAttribute('href');
    }
  }

  // 分享按钮对 Markdown 和 PDF 均可用
  if (shareBtn) {
    shareBtn.style.display = 'inline-flex';
    shareBtn.classList.remove('copied');
    const shareBtnText = shareBtn.querySelector('span');
    if (shareBtnText) shareBtnText.textContent = i18n.t('client.share');
  }

  if (fileType === 'pdf') {
    // PDF 文件：隐藏按钮
    if (copyDocBtn) copyDocBtn.style.display = 'none';
    if (rawToggleBtn) rawToggleBtn.style.display = 'none';

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
    // Markdown 文件：显示按钮，重置状态。
    // HTML 文章的正文是沙箱里的完整页面，复制正文和切换原文都拿不到有意义的内容，只留「全屏」「分享」。
    const showDocTools = !isHtmlPost;
    if (copyDocBtn) copyDocBtn.style.display = showDocTools ? 'inline-flex' : 'none';
    if (rawToggleBtn) {
      rawToggleBtn.style.display = showDocTools ? 'inline-flex' : 'none';
      rawToggleBtn.classList.remove('active');
      rawToggleBtn.setAttribute('title', i18n.t('client.showRaw'));
      const rawBtnText = rawToggleBtn.querySelector('span');
      if (rawBtnText) rawBtnText.textContent = i18n.t('client.showRaw');
    }

    // Markdown 文件：正常渲染
    postBody.innerHTML = post.html;

    // 为代码块添加复制按钮
    addCopyButtonsToCodeBlocks();

    // 为图片添加点击放大功能
    addImageZoomFeature();

    // 渲染 Mermaid 图表
    renderMermaidBlocks();

    // 为标题添加 ID 并生成目录
    const hasTOC = generateTOC();

    // 仅在存在标题目录时显示目录栏
    const tocSidebar = document.getElementById('tocSidebar');
    if (tocSidebar) {
      tocSidebar.style.display = hasTOC ? 'flex' : 'none';
    }

    // 设置目录滚动监听
    if (hasTOC) {
      setupTOCScroll();
    }
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
  renderPostNavigation(post);

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

  document.querySelector('meta[name="robots"]').setAttribute('content', 'index, follow');
  updateSEOMetaTags(post.seo);
  window.history.replaceState({ path: post.path }, '', post.url);

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

  // HTML 文章本身就是一整页，默认直接以沉浸态打开；点右上角「退出全屏」回到带站点外壳的阅读视图
  if (isHtmlPost) enterReaderMode({ animate: false, focusExit: false });
}

// 后台更新文章（用于更新访问量等可能变化的数据）
async function updatePostInBackground(filePath) {
  try {
    const response = await fetch(`/api/view/${encodePath(filePath)}`, { method: 'POST' });
    if (!response.ok) return;
    const data = await response.json();
    if (!currentPost || currentPost.path !== filePath) return;
    currentPost.viewCount = data.viewCount;
    const existingText = document.getElementById('postViewCount')?.querySelector('span.view-text');
    if (existingText) existingText.textContent = data.viewCount;
    ClientCache.set('post', filePath, currentPost);
  } catch (error) {
    console.warn(i18n.t('client.backgroundUpdatePostFailed'), error);
  }
}
