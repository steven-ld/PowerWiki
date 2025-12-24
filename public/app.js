// 全局状态
let postsTree = {};
let postsFlat = [];
let currentPost = null;
let isMobileMenuOpen = false;

// DOM 元素
const postList = document.getElementById('postList');
const searchInput = document.getElementById('searchInput');
const siteLogo = document.getElementById('siteLogo');
const homeView = document.getElementById('homeView');
const postView = document.getElementById('postView');
const postTitle = document.getElementById('postTitle');
const postBody = document.getElementById('postBody');
const postDate = document.getElementById('postDate');
const postSize = document.getElementById('postSize');
const siteHeader = document.getElementById('siteHeader');
const siteFooter = document.getElementById('siteFooter');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  loadConfig();
  await loadPosts(); // 等待文章列表加载完成
  setupEventListeners();
  setupRouting(); // 然后设置路由
});

// 加载网站配置和模板
async function loadConfig() {
  try {
    const response = await fetch('/api/config');
    const config = await response.json();
    
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
            
            // 为标题添加 ID 并生成目录（如果有标题）
            generateHomeTOC();
          }
        } catch (error) {
          console.error('加载首页内容失败:', error);
          // 如果出错，显示默认欢迎页面
          const homeWelcome = document.getElementById('homeWelcome');
          if (homeWelcome) {
            homeWelcome.style.display = 'block';
          }
        }
      }
    }
    
    // 更新页面标题
    document.title = `${config.siteTitle || 'PowerWiki'} - ${config.siteDescription || '知识库'}`;
  } catch (error) {
    console.error('加载配置失败:', error);
  }
}

// 设置事件监听
function setupEventListeners() {
  // 搜索功能
  searchInput.addEventListener('input', (e) => {
    filterPosts(e.target.value);
  });

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

  // 目录收缩/展开按钮
  const tocToggleBtn = document.getElementById('tocToggleBtn');
  const tocExpandBtn = document.getElementById('tocExpandBtn');
  const tocSidebar = document.getElementById('tocSidebar');

  if (tocToggleBtn && tocSidebar && tocExpandBtn) {
    // 收起目录
    tocToggleBtn.addEventListener('click', () => {
      tocSidebar.classList.add('collapsed');
      tocExpandBtn.classList.add('show');
      // 保存状态到 localStorage
      localStorage.setItem('tocCollapsed', 'true');
    });

    // 展开目录
    tocExpandBtn.addEventListener('click', () => {
      tocSidebar.classList.remove('collapsed');
      tocExpandBtn.classList.remove('show');
      // 保存状态到 localStorage
      localStorage.setItem('tocCollapsed', 'false');
    });

    // 恢复上次的状态
    const tocCollapsed = localStorage.getItem('tocCollapsed');
    if (tocCollapsed === 'true') {
      tocSidebar.classList.add('collapsed');
      tocExpandBtn.classList.add('show');
    }
  }

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
}

// 回到首页
function goToHome() {
  try {
    homeView.classList.add('active');
    postView.classList.remove('active');
    currentPost = null;
    window.history.pushState({}, '', '/');

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
    console.error('返回首页失败:', error);
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
      console.error('路径解码失败:', error);
      showNotification('路径解析失败', 'error');
    }
  }
}

// 加载文章列表
async function loadPosts() {
  try {
    postList.innerHTML = `<li class="nav-item loading">
      <div class="loading-dots"><span></span><span></span><span></span></div>
    </li>`;
    const response = await fetch('/api/posts');
    const data = await response.json();
    postsTree = data.tree || {};
    postsFlat = data.flat || [];
    renderPostsTree(postsTree);
  } catch (error) {
    postList.innerHTML = '<li class="nav-item loading">加载失败</li>';
    console.error('加载文章列表失败:', error);
  }
}

// 切换目录展开/折叠状态
function toggleDirExpand(dirItem) {
  const children = dirItem.querySelector('.nav-dir-children');
  if (children) {
    const isExpanded = dirItem.classList.contains('expanded');
    if (isExpanded) {
      dirItem.classList.remove('expanded');
      children.style.display = 'none';
    } else {
      dirItem.classList.add('expanded');
      children.style.display = 'block';
    }
  }
}

// 渲染目录树
function renderPostsTree(tree) {
  if (!tree || (Object.keys(tree.dirs || {}).length === 0 && (tree.files || []).length === 0)) {
    postList.innerHTML = '<li class="nav-item loading" style="color: var(--text-placeholder);">暂无文章</li>';
    return;
  }

  postList.innerHTML = renderTreeNodes(tree, '', true); // 传入 true 表示这是根级别

  // 只展开最新修改的文件夹（第一个目录）
  const firstDir = postList.querySelector('.nav-dir');
  if (firstDir) {
    firstDir.classList.add('expanded');
    const children = firstDir.querySelector('.nav-dir-children');
    if (children) {
      children.style.display = 'block';
    }
  }

  // 添加点击事件
  postList.querySelectorAll('.nav-item-file').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const path = item.dataset.path;
      if (path) {
        loadPost(path);
        // 更新 URL
        window.history.pushState({ path }, '', `/post/${encodeURIComponent(path)}`);
        // 更新活动状态（清除所有文件和文件夹的选中状态）
        postList.querySelectorAll('.nav-item-file').forEach(i => i.classList.remove('active'));
        postList.querySelectorAll('.nav-dir').forEach(d => d.classList.remove('active'));
        item.classList.add('active');
      }
    });
  });

  // 添加目录折叠/展开事件（点击箭头图标）
  postList.querySelectorAll('.nav-dir-toggle').forEach(toggle => {
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const dirItem = toggle.closest('.nav-dir');
      toggleDirExpand(dirItem);
    });
  });

  // 添加目录名称点击事件（点击目录名称：有 README 则加载，同时展开/折叠）
  postList.querySelectorAll('.nav-dir-name').forEach(dirName => {
    dirName.addEventListener('click', (e) => {
      e.stopPropagation();
      const dirItem = dirName.closest('.nav-dir');
      const readmePath = dirName.dataset.readmePath;
      
      // 如果有 README，且不是当前已加载的文章，才加载
      if (readmePath && (!currentPost || currentPost.path !== readmePath)) {
        loadPost(readmePath);
        window.history.pushState({ path: readmePath }, '', `/post/${encodeURIComponent(readmePath)}`);
        
        // 高亮当前目录
        postList.querySelectorAll('.nav-item-file').forEach(i => i.classList.remove('active'));
        postList.querySelectorAll('.nav-dir').forEach(d => d.classList.remove('active'));
        dirItem.classList.add('active');
      }
      
      // 同时展开/折叠目录
      toggleDirExpand(dirItem);
    });
  });
  
  // 目录头部整体点击事件（用于没有 README 的目录）
  postList.querySelectorAll('.nav-dir-header').forEach(header => {
    header.addEventListener('click', (e) => {
      // 如果点击的是 toggle 或 name，让它们各自的事件处理
      if (e.target.closest('.nav-dir-toggle') || e.target.closest('.nav-dir-name')) {
        return;
      }
      e.stopPropagation();
      const dirItem = header.closest('.nav-dir');
      toggleDirExpand(dirItem);
    });
  });

  // 如果当前有文章，高亮对应项并展开父目录
  if (currentPost) {
    const currentItem = postList.querySelector(`[data-path="${currentPost.path}"]`);
    if (currentItem) {
      currentItem.classList.add('active');
      // 展开所有父目录
      let parent = currentItem.parentElement;
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
  }
}

// 递归渲染树节点
function renderTreeNodes(node, prefix = '') {
  let html = '';

  // 渲染目录
  if (node.dirs) {
    const dirNames = Object.keys(node.dirs).sort();
    dirNames.forEach(dirName => {
      const dirNode = node.dirs[dirName];
      const dirPath = prefix ? `${prefix}/${dirName}` : dirName;
      const hasReadme = dirNode.readme ? 'true' : 'false';
      const readmePath = dirNode.readme ? dirNode.readme.path : '';
      
      html += `
        <li class="nav-dir" data-has-readme="${hasReadme}" data-readme-path="${readmePath}">
          <div class="nav-dir-header">
            <span class="nav-dir-toggle">▶</span>
            <span class="nav-dir-name${dirNode.readme ? ' has-readme' : ''}" ${dirNode.readme ? `data-readme-path="${readmePath}"` : ''}>${escapeHtml(dirName)}</span>
          </div>
          <ul class="nav-dir-children" style="display: none;">
            ${renderTreeNodes(dirNode, dirPath)}
          </ul>
        </li>
      `;
    });
  }

  // 渲染文件
  if (node.files) {
    node.files.forEach(file => {
      const fileType = file.type || (file.path.endsWith('.pdf') ? 'pdf' : 'markdown');
      const fileIcon = fileType === 'pdf' 
        ? `<svg class="nav-file-icon" width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="1.5"/><path d="M14 2v6h6M10 12h4M10 16h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`
        : `<svg class="nav-file-icon" width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" stroke-width="1.5"/><path d="M7 8h10M7 12h7M7 16h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;
      html += `
        <li class="nav-item-file" data-path="${file.path}" data-type="${fileType}">
          ${fileIcon}
          <span class="nav-item-title">${escapeHtml(file.name)}</span>
        </li>
      `;
    });
  }

  return html;
}

// 过滤文章
function filterPosts(keyword) {
  if (!keyword.trim()) {
    renderPostsTree(postsTree);
    return;
  }

  // 搜索时使用扁平列表
  const filtered = postsFlat.filter(post => {
    const fileName = post.name.replace(/\.(md|markdown|pdf)$/i, '');
    const searchText = `${fileName} ${post.name} ${post.path}`.toLowerCase();
    return searchText.includes(keyword.toLowerCase());
  });

  // 构建过滤后的树结构
  const filteredTree = buildDirectoryTree(filtered);
  renderPostsTree(filteredTree);
}

// 构建目录树（用于搜索过滤）
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
        if (!current.files) {
          current.files = [];
        }
        current.files.push({
          name: fileName,
          path: file.path,
          fullName: file.name,
          modified: file.modified,
          size: file.size,
          type: file.type || (file.path.endsWith('.pdf') ? 'pdf' : 'markdown')
        });
      } else {
        if (!current.dirs) {
          current.dirs = {};
        }
        if (!current.dirs[part]) {
          current.dirs[part] = {};
        }
        current = current.dirs[part];
      }
    }
  });

  return tree;
}

// 加载单篇文章
async function loadPost(filePath) {
  try {
    postView.classList.remove('active');
    homeView.classList.remove('active');

    const response = await fetch(`/api/post/${encodeURIComponent(filePath)}`);
    if (!response.ok) {
      throw new Error('文章不存在');
    }

    const post = await response.json();
    currentPost = post;

    // 渲染文章
    postTitle.textContent = post.title;

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
    const fileType = post.type || (filePath.endsWith('.pdf') ? 'pdf' : 'markdown');
    
    if (fileType === 'pdf') {
      // PDF 文件：渲染成图片，无任何控件
      const pdfUrl = `/api/pdf/${encodeURIComponent(filePath)}`;
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

    // 格式化日期
    const date = new Date(post.fileInfo.modified);
    const dateText = date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    // 追加文字到现有的 SVG 图标后
    const existingDateText = postDate.querySelector('span.date-text');
    if (existingDateText) {
      existingDateText.textContent = dateText;
    } else {
      const dateSpan = document.createElement('span');
      dateSpan.className = 'date-text';
      dateSpan.textContent = dateText;
      postDate.appendChild(dateSpan);
    }

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

    // 更新footer统计信息
    updateFooterStats();

    // 滚动到顶部
    window.scrollTo(0, 0);

    // 更新导航栏活动状态（清除所有选中状态）
    postList.querySelectorAll('.nav-item-file').forEach(i => i.classList.remove('active'));
    postList.querySelectorAll('.nav-dir').forEach(d => d.classList.remove('active'));
    
    // 高亮当前文件
    postList.querySelectorAll('.nav-item-file').forEach(item => {
      if (item.dataset.path === filePath) {
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

  } catch (error) {
    console.error('加载文章失败:', error);
    showNotification('加载文章失败: ' + error.message, 'error');
  }
}

// 转义 HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 显示通知
function showNotification(message, type = 'info') {
  // 创建通知元素
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 24px;
    background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
    color: white;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    z-index: 1000;
    animation: slideIn 0.3s ease-out;
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 3000);
}

// 添加 CSS 动画
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// 生成首页目录（如果首页有 README 内容）
function generateHomeTOC() {
  const homeContent = document.getElementById('homeContent');
  const tocNav = document.getElementById('tocNav');
  const tocSidebar = document.getElementById('tocSidebar');
  
  if (!homeContent || !tocNav || !tocSidebar) return;
  
  const headings = homeContent.querySelectorAll('h1, h2, h3, h4, h5, h6');
  
  if (headings.length === 0) {
    tocSidebar.style.display = 'none';
    return;
  }

  // 显示目录栏
  tocSidebar.style.display = 'flex';

  let tocHTML = '<ul>';
  let tocItems = [];

  // 为标题添加 ID 并收集目录项
  headings.forEach((heading, index) => {
    const id = `home-heading-${index}`;
    const text = heading.textContent.trim();
    const level = parseInt(heading.tagName.substring(1));
    
    heading.id = id;
    tocItems.push({ id, text, level });
  });

  // 渲染目录
  tocItems.forEach(item => {
    const className = `toc-h${item.level}`;
    tocHTML += `<li class="${className}"><a href="#${item.id}" data-id="${item.id}">${escapeHtml(item.text)}</a></li>`;
  });

  tocHTML += '</ul>';
  tocNav.innerHTML = tocHTML;

  // 添加目录点击事件
  tocNav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href').substring(1);
      const targetElement = document.getElementById(targetId);
      if (targetElement) {
        const elementPosition = targetElement.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - 20;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });

        window.history.pushState({}, '', `#${targetId}`);
        updateTOCActive(targetId);
      }
    });
  });

  // 设置滚动监听
  setupHomeTOCScroll();
}

// 设置首页目录滚动高亮
function setupHomeTOCScroll() {
  const homeContent = document.getElementById('homeContent');
  if (!homeContent) return;
  
  const headings = homeContent.querySelectorAll('h1, h2, h3, h4, h5, h6');
  if (headings.length === 0) return;

  let ticking = false;
  
  const handleScroll = () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        let currentHeading = null;
        
        headings.forEach(heading => {
          const rect = heading.getBoundingClientRect();
          if (rect.top <= 100) {
            currentHeading = heading;
          }
        });

        if (currentHeading) {
          updateTOCActive(currentHeading.id);
        }
        
        ticking = false;
      });
      ticking = true;
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
}

// 生成文章目录
function generateTOC() {
  const tocNav = document.getElementById('tocNav');
  const tocSidebar = document.getElementById('tocSidebar');
  const headings = postBody.querySelectorAll('h1, h2, h3, h4, h5, h6');

  if (headings.length === 0) {
    tocSidebar.style.display = 'none';
    return;
  }

  tocSidebar.style.display = 'flex';

  let tocHTML = '<ul>';
  let tocItems = [];

  headings.forEach((heading, index) => {
    const id = `heading-${index}`;
    const text = heading.textContent.trim();
    const level = parseInt(heading.tagName.substring(1));

    // 为标题添加 ID
    heading.id = id;

    // 创建目录项
    tocItems.push({ id, text, level });
  });

  // 渲染目录
  tocItems.forEach(item => {
    const className = `toc-h${item.level}`;
    tocHTML += `<li class="${className}"><a href="#${item.id}" data-id="${item.id}">${escapeHtml(item.text)}</a></li>`;
  });

  tocHTML += '</ul>';
  tocNav.innerHTML = tocHTML;

  // 添加目录点击事件
  tocNav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href').substring(1);
      const targetElement = document.getElementById(targetId);
      if (targetElement) {
        // 计算目标位置（考虑固定头部等偏移）
        const elementPosition = targetElement.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - 20;

        // 平滑滚动
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });

        // 更新 URL（不触发页面跳转）
        window.history.pushState({}, '', `#${targetId}`);

        // 立即更新高亮状态
        updateTOCActive(targetId);
      }
    });
  });
}

// 更新目录高亮状态
function updateTOCActive(activeId) {
  const tocLinks = document.querySelectorAll('.toc-nav a');
  tocLinks.forEach(link => {
    const linkId = link.getAttribute('data-id');
    if (linkId === activeId) {
      link.classList.add('active');
      // 滚动目录到可见区域
      link.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      link.classList.remove('active');
    }
  });
}

// 设置目录滚动高亮
function setupTOCScroll() {
  const tocLinks = document.querySelectorAll('.toc-nav a');
  const headings = postBody.querySelectorAll('h1, h2, h3, h4, h5, h6');

  if (tocLinks.length === 0) return;

  function updateActiveTOC() {
    let currentActive = null;
    const offset = 100; // 偏移量

    // 从下往上查找当前应该高亮的标题
    for (let i = headings.length - 1; i >= 0; i--) {
      const heading = headings[i];
      const rect = heading.getBoundingClientRect();

      if (rect.top <= offset + 50) {
        currentActive = heading.id;
        break;
      }
    }

    // 如果没有找到，高亮第一个
    if (!currentActive && headings.length > 0) {
      currentActive = headings[0].id;
    }

    // 更新高亮状态
    if (currentActive) {
      updateTOCActive(currentActive);
    }
  }

  // 监听滚动事件
  let ticking = false;
  const scrollHandler = () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        updateActiveTOC();
        ticking = false;
      });
      ticking = true;
    }
  };

  window.addEventListener('scroll', scrollHandler, { passive: true });

  // 初始更新
  setTimeout(updateActiveTOC, 100);
}

// 更新footer统计信息
async function updateFooterStats() {
  try {
    const response = await fetch('/api/stats');
    const stats = await response.json();
    
    const totalViewsEl = document.getElementById('totalViews');
    const totalPostsEl = document.getElementById('totalPosts');
    
    if (totalViewsEl) {
      totalViewsEl.textContent = stats.totalViews || 0;
    }
    if (totalPostsEl) {
      totalPostsEl.textContent = stats.postViews ? Object.keys(stats.postViews).length : 0;
    }
  } catch (error) {
    console.error('更新统计信息失败:', error);
  }
}

// 渲染 PDF 为图片（无任何控件，200dpi 高清）
async function renderPdfAsImages(pdfUrl) {
  const pagesContainer = document.getElementById('pdfPages');
  if (!pagesContainer) return;

  pagesContainer.innerHTML = '<div class="pdf-loading">加载中...</div>';

  try {
    // 动态导入 PDF.js
    const pdfjsLib = await import('/pdfjs/build/pdf.min.mjs');
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdfjs/build/pdf.worker.min.mjs';

    // 加载 PDF
    const pdfDoc = await pdfjsLib.getDocument(pdfUrl).promise;
    pagesContainer.innerHTML = '';

    // 计算缩放比例（适应容器宽度）
    const containerWidth = pagesContainer.clientWidth || 800;
    // 300dpi / 72dpi ≈ 4.17，使用 4x 渲染以获得高清效果
    const dpiScale = 4;
    
    // 渲染每一页
    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1 });
      
      // 计算显示宽度
      const displayWidth = Math.min(containerWidth - 20, viewport.width * 2);
      const displayScale = displayWidth / viewport.width;
      
      // 高分辨率渲染
      const renderScale = displayScale * dpiScale;
      const renderViewport = page.getViewport({ scale: renderScale });

      const canvas = document.createElement('canvas');
      canvas.className = 'pdf-page-img';
      canvas.width = renderViewport.width;
      canvas.height = renderViewport.height;
      canvas.dataset.page = pageNum;
      // 设置 CSS 显示尺寸（缩小到实际显示大小）
      canvas.style.width = displayWidth + 'px';
      canvas.style.height = (displayWidth / viewport.width * viewport.height) + 'px';

      const context = canvas.getContext('2d');
      await page.render({ canvasContext: context, viewport: renderViewport }).promise;

      // 点击放大查看
      canvas.addEventListener('click', () => {
        openImageViewer(canvas.toDataURL('image/png'), pageNum, pdfDoc.numPages);
      });

      pagesContainer.appendChild(canvas);
    }
  } catch (error) {
    console.error('PDF 加载失败:', error);
    pagesContainer.innerHTML = '<div class="pdf-error">PDF 加载失败</div>';
  }
}

// 图片查看器
function openImageViewer(imageSrc, currentPage, totalPages) {
  // 创建遮罩层
  const overlay = document.createElement('div');
  overlay.className = 'image-viewer-overlay';
  overlay.innerHTML = `
    <div class="image-viewer-header">
      <span class="image-viewer-info">${currentPage} / ${totalPages}</span>
      <button class="image-viewer-close" title="关闭">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
    <div class="image-viewer-content">
      <img src="${imageSrc}" alt="PDF 页面 ${currentPage}" />
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  // 关闭事件
  const closeViewer = () => {
    overlay.remove();
    document.body.style.overflow = '';
  };

  overlay.querySelector('.image-viewer-close').addEventListener('click', closeViewer);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target.classList.contains('image-viewer-content')) {
      closeViewer();
    }
  });

  // ESC 键关闭
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      closeViewer();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
}

// 处理浏览器前进后退
window.addEventListener('popstate', (e) => {
  if (e.state && e.state.path) {
    loadPost(e.state.path);
  } else {
    homeView.classList.add('active');
    postView.classList.remove('active');
    currentPost = null;
    // 检查首页是否有 README 内容，有则显示目录
    const homeContent = document.getElementById('homeContent');
    if (homeContent && homeContent.innerHTML.trim() !== '') {
      generateHomeTOC();
    } else {
      const tocSidebar = document.getElementById('tocSidebar');
      if (tocSidebar) {
        tocSidebar.style.display = 'none';
      }
    }
  }
});

