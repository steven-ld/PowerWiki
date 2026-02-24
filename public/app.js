// PowerWiki - 主入口文件
// 此文件负责初始化和协调各个模块

// DOM 元素
const siteLogo = document.getElementById('siteLogo');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');

// 防止滚动穿透
function preventScroll(e) {
  e.preventDefault();
}

// 关闭移动端菜单
function closeMobileMenu() {
  isMobileMenuOpen = false;
  if (sidebar) {
    sidebar.classList.remove('open');
  }
  if (sidebarOverlay) {
    sidebarOverlay.classList.remove('active');
  }
  document.body.style.overflow = '';
  document.removeEventListener('touchmove', preventScroll);
}

// 回到首页
function goToHome() {
  try {
    homeView.classList.add('active');
    postView.classList.remove('active');
    currentPost = null;
    window.history.pushState({}, '', '/');

    // 更新 SEO meta 标签（首页）
    if (siteConfig) {
      const homeTitle = `${siteConfig.siteTitle || 'PowerWiki'} - ${siteConfig.siteDescription || '知识库'}`;
      document.title = homeTitle;
      updateSEOMetaTags({
        title: homeTitle,
        description: siteConfig.siteDescription || 'PowerWiki - 一个现代化的知识库系统',
        keywords: '知识库,文档,Markdown,Wiki',
        url: window.location.origin,
        type: 'website'
      });
    }

    // 检查首页是否有 README 内容，有则显示目录
    const homeContent = document.getElementById('homeContent');
    if (homeContent && homeContent.innerHTML.trim() !== '') {
      generateHomeTOC();
    } else {
      // 没有内容则隐藏目录栏
      const tocSidebar = document.getElementById('tocSidebar');
      if (tocSidebar) {
        tocSidebar.style.display = 'none';
      }
    }

    // 清除导航栏选中状态
    if (postList) {
      postList.querySelectorAll('.nav-item-file').forEach(item => {
        item.classList.remove('active');
      });
      postList.querySelectorAll('.nav-dir').forEach(item => {
        item.classList.remove('active');
      });
    }

    // 滚动到顶部
    window.scrollTo(0, 0);
  } catch (error) {
    console.error(i18n.t('client.goHomeFailed'), error);
  }
}

// 设置路由
function setupRouting() {
  const path = window.location.pathname;
  if (path.startsWith('/post/')) {
    const encodedPath = path.replace('/post/', '');
    // 解码 URL 编码的路径
    try {
      const postPath = decodeURIComponent(encodedPath);
      // 等待文章列表加载完成后再加载文章
      if (postsFlat.length > 0) {
        loadPost(postPath);
      } else {
        // 如果文章列表还没加载，等待加载完成
        const checkInterval = setInterval(() => {
          if (postsFlat.length > 0) {
            clearInterval(checkInterval);
            loadPost(postPath);
          }
        }, 100);
        // 5秒后超时
        setTimeout(() => clearInterval(checkInterval), 5000);
      }
    } catch (error) {
      console.error(i18n.t('client.pathDecodeFailed'), error);
      showNotification(i18n.t('client.pathParseFailed'), 'error');
    }
  }
}

// 设置事件监听
function setupEventListeners() {
  // 标题点击回到首页
  if (siteLogo) {
    siteLogo.style.cursor = 'pointer';
    siteLogo.addEventListener('click', () => {
      goToHome();
    });
  }

  // Header 中的标题点击回到首页
  document.addEventListener('click', (e) => {
    const headerTitle = e.target.closest('.site-title');
    if (headerTitle) {
      e.preventDefault();
      goToHome();
    }
  });

  // 移动端菜单按钮
  if (mobileMenuBtn && sidebar) {
    mobileMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      isMobileMenuOpen = !isMobileMenuOpen;
      if (isMobileMenuOpen) {
        sidebar.classList.add('open');
        if (sidebarOverlay) {
          sidebarOverlay.classList.add('active');
        }
        document.body.style.overflow = 'hidden'; // 防止背景滚动
        // 添加触摸事件防止滚动穿透
        document.addEventListener('touchmove', preventScroll, { passive: false });
      } else {
        closeMobileMenu();
      }
    });
  }

  // 点击遮罩关闭侧边栏
  if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', () => {
      closeMobileMenu();
    });
  }

  // 点击文档后关闭移动端侧边栏
  document.addEventListener('click', (e) => {
    if (e.target.closest('.nav-item-file')) {
      if (window.innerWidth <= 768) {
        closeMobileMenu();
      }
    }
  });

  // 窗口大小改变时处理
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768 && isMobileMenuOpen) {
      closeMobileMenu();
    }
  });

  // 一键收起/展开所有目录
  const collapseAllBtn = document.getElementById('collapseAllBtn');
  if (collapseAllBtn) {
    let isCollapsed = false;
    collapseAllBtn.addEventListener('click', () => {
      const allDirs = postList.querySelectorAll('.nav-dir');
      if (isCollapsed) {
        // 展开所有目录
        allDirs.forEach(dirElement => {
          dirElement.classList.add('expanded');
          const children = dirElement.querySelector('.nav-dir-children');
          if (children) {
            children.style.display = 'block';
          }
        });
        collapseAllBtn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>${i18n.t('client.collapseAll')}</span>
        `;
        collapseAllBtn.title = i18n.t('client.collapseDirs');
        isCollapsed = false;
      } else {
        // 收起所有目录
        allDirs.forEach(dirElement => {
          dirElement.classList.remove('expanded');
          const children = dirElement.querySelector('.nav-dir-children');
          if (children) {
            children.style.display = 'none';
          }
        });
        collapseAllBtn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M10.5 8.75L7 5.25L3.5 8.75" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>${i18n.t('client.expandAll')}</span>
        `;
        collapseAllBtn.title = i18n.t('client.expandDirs');
        isCollapsed = true;
      }
    });
  }
}

// 处理浏览器前进后退
window.addEventListener('popstate', (e) => {
  if (e.state && e.state.path) {
    loadPost(e.state.path);
  } else {
    homeView.classList.add('active');
    postView.classList.remove('active');
    currentPost = null;

    // 更新 SEO meta 标签（首页）
    if (siteConfig) {
      const homeTitle = `${siteConfig.siteTitle || 'PowerWiki'} - ${siteConfig.siteDescription || '知识库'}`;
      document.title = homeTitle;
      updateSEOMetaTags({
        title: homeTitle,
        description: siteConfig.siteDescription || 'PowerWiki - 一个现代化的知识库系统',
        keywords: '知识库,文档,Markdown,Wiki',
        url: window.location.origin,
        type: 'website'
      });
    }

    // 检查首页是否有 README 内容，有则显示目录
    const homeContent = document.getElementById('homeContent');
    if (homeContent && homeContent.innerHTML.trim() !== '') {
      generateHomeTOC();
      // 为首页的代码块和图片也添加功能
      addCopyButtonsToCodeBlocks(homeContent);
      addImageZoomFeature(homeContent);
      renderMermaidBlocks(homeContent);
    } else {
      const tocSidebar = document.getElementById('tocSidebar');
      if (tocSidebar) {
        tocSidebar.style.display = 'none';
      }
    }
  }
});

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  setupNotificationAnimations(); // 添加通知动画样式

  ThemeManager.init(); // 初始化主题
  await i18n.init(); // 初始化国际化（异步）
  i18n.initElements(); // 初始化页面元素的翻译

  loadConfig();
  await loadPosts(); // 等待文章列表加载完成

  // header 加载完成后再设置主题切换事件
  setupThemeToggle();

  setupSearchEvents(); // 搜索事件
  setupEventListeners();
  setupTOCCollapseEvents(); // 目录折叠事件
  setupRouting(); // 然后设置路由
  setupBackToTop(); // 设置返回顶部按钮
});
