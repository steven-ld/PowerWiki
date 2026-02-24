// 全局状态
let postsTree = {};
let postsFlat = [];
let currentPost = null;
let isMobileMenuOpen = false;
let siteConfig = null; // 存储站点配置

// DOM 元素
const postList = document.getElementById('postList');
const searchInput = document.getElementById('searchInput');

// 加载文章列表
async function loadPosts() {
  try {
    // 检查缓存
    const cached = ClientCache.get('posts');
    if (cached) {
      postsTree = cached.tree || {};
      postsFlat = cached.flat || [];
      renderPostsTree(postsTree);
      // 后台更新数据
      updatePostsInBackground();
      return;
    }

    postList.innerHTML = `<li class="nav-item loading">
      <div class="loading-dots"><span></span><span></span><span></span></div>
      <span style="margin-left: 8px;">${i18n.t('client.loading')}</span>
    </li>`;
    const response = await fetch('/api/posts');
    const data = await response.json();
    postsTree = data.tree || {};
    postsFlat = data.flat || [];

    // 缓存数据
    ClientCache.set('posts', '', data);

    renderPostsTree(postsTree);
  } catch (error) {
    postList.innerHTML = `<li class="nav-item loading">${i18n.t('client.loadPostsFailed')}</li>`;
    console.error(i18n.t('client.loadPostsFailed'), error);
  }
}

// 后台更新文章列表（不阻塞UI）
async function updatePostsInBackground() {
  try {
    const response = await fetch('/api/posts');
    const data = await response.json();

    // 检查数据是否有变化
    const cached = ClientCache.get('posts');
    if (cached && JSON.stringify(cached) !== JSON.stringify(data)) {
      // 数据有更新，更新缓存和UI
      postsTree = data.tree || {};
      postsFlat = data.flat || [];
      ClientCache.set('posts', '', data);

      // 如果当前没有选中文章，更新UI
      if (!currentPost) {
        renderPostsTree(postsTree);
      }
    } else {
      // 数据没有变化，只更新缓存时间
      ClientCache.set('posts', '', data);
    }
  } catch (error) {
    console.warn(i18n.t('client.backgroundUpdatePostsFailed'), error);
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
    postList.innerHTML = `<li class="nav-item loading" style="color: var(--text-placeholder);">${i18n.t('client.noArticles')}</li>`;
    return;
  }

  postList.innerHTML = renderTreeNodes(tree, '', true); // 传入 true 表示这是根级别

  // 添加点击事件
  postList.querySelectorAll('.nav-item-file').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const path = item.dataset.path;
      if (path) {
        loadPost(path);
        // 更新 URL
        window.history.pushState({ path }, '', `/post/${encodePath(path)}`);
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
        window.history.pushState({ path: readmePath }, '', `/post/${encodePath(readmePath)}`);

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

  // 默认展开所有目录
  const allDirs = postList.querySelectorAll('.nav-dir');
  allDirs.forEach(dirElement => {
    dirElement.classList.add('expanded');
    const children = dirElement.querySelector('.nav-dir-children');
    if (children) {
      children.style.display = 'block';
    }
  });

  // 如果当前有文章，高亮对应项
  if (currentPost) {
    const currentItem = postList.querySelector(`[data-path="${currentPost.path}"]`);
    if (currentItem) {
      currentItem.classList.add('active');
      // 确保所有父目录都是展开的
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

  // 渲染目录（保持服务器端已排序的顺序，不进行字母排序）
  if (node.dirs) {
    const dirNames = Object.keys(node.dirs);
    dirNames.forEach(dirName => {
      const dirNode = node.dirs[dirName];
      const dirPath = prefix ? `${prefix}/${dirName}` : dirName;
      const hasReadme = dirNode.readme ? 'true' : 'false';
      const readmePath = dirNode.readme ? dirNode.readme.path : '';
      const hasChildren = (dirNode.dirs && Object.keys(dirNode.dirs).length > 0)
                       || (dirNode.files && dirNode.files.length > 0);

      if (!hasChildren && dirNode.readme) {
        // 仅含 README 的目录：渲染为普通文档项
        const fileIcon = `<svg class="nav-file-icon" width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" stroke-width="1.5"/><path d="M7 8h10M7 12h7M7 16h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;
        html += `
          <li class="nav-item-file" data-path="${readmePath}" data-type="markdown">
            ${fileIcon}
            <span class="nav-item-title">${escapeHtml(dirName)}</span>
          </li>
        `;
      } else {
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
      }
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

// 搜索事件监听
function setupSearchEvents() {
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      filterPosts(e.target.value);
    });
  }
}
