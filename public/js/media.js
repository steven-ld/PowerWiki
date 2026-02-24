// 更新footer统计信息
async function updateFooterStats(forceRefresh = false) {
  try {
    // 如果强制刷新，跳过缓存
    if (!forceRefresh) {
      const cached = ClientCache.get('stats');
      if (cached) {
        updateStatsUI(cached);
        // 后台更新统计数据
        updateStatsInBackground();
        return;
      }
    }

    // 添加时间戳防止浏览器缓存
    const response = await fetch('/api/stats?t=' + Date.now(), {
      cache: 'no-store'
    });
    const stats = await response.json();

    // 缓存统计数据（缩短缓存时间到30秒）
    ClientCache.set('stats', '', stats, 30 * 1000);

    updateStatsUI(stats);
  } catch (error) {
    console.error(i18n.t('client.updateStatsFailed'), error);
  }
}

// 更新统计信息UI
function updateStatsUI(stats) {
  const totalViewsEl = document.getElementById('totalViews');
  const totalPostsEl = document.getElementById('totalPosts');

  if (totalViewsEl) {
    totalViewsEl.textContent = stats.totalViews || 0;
  }
  if (totalPostsEl) {
    totalPostsEl.textContent = stats.postViews ? Object.keys(stats.postViews).length : 0;
  }
}

// 后台更新统计数据
async function updateStatsInBackground() {
  try {
    // 添加时间戳防止浏览器缓存
    const response = await fetch('/api/stats?t=' + Date.now(), {
      cache: 'no-store'
    });
    const stats = await response.json();
    ClientCache.set('stats', '', stats, 30 * 1000);
    updateStatsUI(stats);
  } catch (error) {
    console.warn(i18n.t('client.backgroundUpdateStatsFailed'), error);
  }
}

// 渲染 PDF 为图片（无任何控件，200dpi 高清）
async function renderPdfAsImages(pdfUrl) {
  const pagesContainer = document.getElementById('pdfPages');
  if (!pagesContainer) return;

  pagesContainer.innerHTML = `<div class="pdf-loading">${i18n.t('client.pdfLoading')}</div>`;

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
    console.error(i18n.t('client.pdfLoadFailed'), error);
    pagesContainer.innerHTML = `<div class="pdf-error">${i18n.t('client.pdfLoadFailed')}</div>`;
  }
}

// 图片查看器（PDF）
function openImageViewer(imageSrc, currentPage, totalPages) {
  // 创建遮罩层
  const overlay = document.createElement('div');
  overlay.className = 'image-viewer-overlay';
  overlay.innerHTML = `
    <div class="image-viewer-header">
      <span class="image-viewer-info">${i18n.tf('client.pageOf', currentPage, totalPages)}</span>
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

// 渲染 Mermaid 图表（将 code.language-mermaid 替换为可渲染的 div）
async function renderMermaidBlocks(container = null) {
  if (typeof mermaid === 'undefined') return;
  const target = container || postBody;
  if (!target) return;

  const mermaidBlocks = target.querySelectorAll('code.language-mermaid');
  if (mermaidBlocks.length === 0) return;

  mermaidBlocks.forEach(code => {
    const pre = code.parentElement;
    const div = document.createElement('div');
    div.className = 'mermaid';
    const source = code.textContent;
    div.textContent = source;
    div.setAttribute('data-mermaid-source', source);
    pre.replaceWith(div);
  });

  try {
    await mermaid.run({ nodes: target.querySelectorAll('.mermaid') });
  } catch (err) {
    console.error('Mermaid render error:', err);
  }
}

// 为代码块添加复制按钮
function addCopyButtonsToCodeBlocks(container = null) {
  const targetContainer = container || postBody;
  if (!targetContainer) return;

  const codeBlocks = targetContainer.querySelectorAll('pre code');
  codeBlocks.forEach((codeBlock) => {
    const pre = codeBlock.parentElement;
    // 避免重复添加
    if (pre.querySelector('.code-copy-btn')) return;

    // 创建复制按钮
    const copyBtn = document.createElement('button');
    copyBtn.className = 'code-copy-btn';
    copyBtn.title = i18n.t('client.copyCode');
    copyBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" stroke-width="1.2"/>
        <path d="M3 11V3a2 2 0 0 1 2-2h8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
      </svg>
      <span class="copy-text">${i18n.t('client.copy')}</span>
    `;

    // 设置 pre 为相对定位
    pre.style.position = 'relative';

    // 添加点击事件
    copyBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const code = codeBlock.textContent || codeBlock.innerText;

      try {
        await navigator.clipboard.writeText(code);
        copyBtn.classList.add('copied');
        const copyText = copyBtn.querySelector('.copy-text');
        if (copyText) {
          copyText.textContent = i18n.t('client.copied');
        }
        setTimeout(() => {
          copyBtn.classList.remove('copied');
          if (copyText) {
            copyText.textContent = i18n.t('client.copy');
          }
        }, 2000);
      } catch (err) {
        // 降级方案：使用传统方法
        const textarea = document.createElement('textarea');
        textarea.value = code;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
          document.execCommand('copy');
          copyBtn.classList.add('copied');
          const copyText = copyBtn.querySelector('.copy-text');
          if (copyText) {
            copyText.textContent = i18n.t('client.copied');
          }
          setTimeout(() => {
            copyBtn.classList.remove('copied');
            if (copyText) {
              copyText.textContent = i18n.t('client.copy');
            }
          }, 2000);
        } catch (err2) {
          showNotification(i18n.t('client.copyFailed'), 'error');
        }
        document.body.removeChild(textarea);
      }
    });

    pre.appendChild(copyBtn);
  });
}

// 为图片添加点击放大功能
function addImageZoomFeature(container = null) {
  const targetContainer = container || postBody;
  if (!targetContainer) return;

  const images = targetContainer.querySelectorAll('img:not(.pdf-page-img)');
  images.forEach((img) => {
    // 避免重复添加事件
    if (img.dataset.zoomEnabled === 'true') return;
    img.dataset.zoomEnabled = 'true';

    // 添加可点击样式
    img.style.cursor = 'zoom-in';

    img.addEventListener('click', (e) => {
      e.stopPropagation();
      openImageModal(img.src, img.alt || '图片');
    });
  });
}

// 打开图片模态框
function openImageModal(imageSrc, imageAlt) {
  // 创建遮罩层
  const overlay = document.createElement('div');
  overlay.className = 'image-modal-overlay';
  overlay.innerHTML = `
    <div class="image-modal-header">
      <span class="image-modal-title">${escapeHtml(imageAlt)}</span>
      <button class="image-modal-close" title="关闭">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
    <div class="image-modal-content">
      <img src="${imageSrc}" alt="${escapeHtml(imageAlt)}" />
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  // 关闭事件
  const closeModal = () => {
    overlay.remove();
    document.body.style.overflow = '';
  };

  overlay.querySelector('.image-modal-close').addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target.classList.contains('image-modal-content')) {
      closeModal();
    }
  });

  // ESC 键关闭
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
}

// 设置返回顶部按钮
function setupBackToTop() {
  const backToTopBtn = document.getElementById('backToTopBtn');
  if (!backToTopBtn) return;

  // 初始隐藏按钮
  backToTopBtn.style.display = 'none';

  // 滚动监听
  let ticking = false;
  const handleScroll = () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        if (scrollTop > 300) {
          backToTopBtn.style.display = 'flex';
        } else {
          backToTopBtn.style.display = 'none';
        }
        ticking = false;
      });
      ticking = true;
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });

  // 点击返回顶部
  backToTopBtn.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
}
