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

// 目录折叠事件
function setupTOCCollapseEvents() {
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
}
