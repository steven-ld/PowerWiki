// 路径编码函数：保留 / 不编码，只编码路径中的其他特殊字符
function encodePath(path) {
  return path.split('/').map(part => encodeURIComponent(part)).join('/');
}

// 转义 HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 主题管理
const ThemeManager = {
  STORAGE_KEY: 'powerwiki_theme',
  MANUAL_KEY: 'powerwiki_theme_manual',
  MANUAL_DATE_KEY: 'powerwiki_theme_manual_date',

  init() {
    const manualDate = localStorage.getItem(this.MANUAL_DATE_KEY);
    const today = new Date().toDateString();
    const isManual = localStorage.getItem(this.MANUAL_KEY) === 'true' && manualDate === today;
    let theme;

    if (isManual) {
      theme = localStorage.getItem(this.STORAGE_KEY) || 'light';
    } else {
      theme = this.getAutoTheme();
      localStorage.setItem(this.STORAGE_KEY, theme);
      localStorage.removeItem(this.MANUAL_KEY);
    }

    document.documentElement.setAttribute('data-theme', theme);
    setTimeout(() => this.updateToggleIcon(theme), 0);
  },

  getAutoTheme() {
    const hour = new Date().getHours();
    return (hour >= 22 || hour < 5) ? 'dark' : 'light';
  },

  setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(this.STORAGE_KEY, theme);
    this.updateToggleIcon(theme);

    // 同步 Mermaid 主题并重新渲染已有图表
    if (typeof mermaid !== 'undefined') {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose'
      });
      // 重新渲染当前页面上的 Mermaid 图表
      const mermaidEls = document.querySelectorAll('.mermaid[data-mermaid-source]');
      if (mermaidEls.length > 0) {
        mermaidEls.forEach(el => {
          el.removeAttribute('data-processed');
          el.innerHTML = el.getAttribute('data-mermaid-source');
        });
        try {
          mermaid.run({ nodes: mermaidEls });
        } catch (err) {
          console.error('Mermaid re-render error:', err);
        }
      }
    }
  },

  toggle() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'light' ? 'dark' : 'light';
    this.setTheme(next);
    localStorage.setItem(this.MANUAL_KEY, 'true');
    localStorage.setItem(this.MANUAL_DATE_KEY, new Date().toDateString());
  },

  updateToggleIcon(theme) {
    const btn = document.querySelector('.theme-toggle-btn');
    if (!btn) return;

    btn.innerHTML = theme === 'dark'
      ? '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
      : '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  }
};

// 初始化 Mermaid 图表渲染
if (typeof mermaid !== 'undefined') {
  mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    securityLevel: 'loose'
  });
}

// 主题切换事件监听
function setupThemeToggle() {
  const themeToggleBtn = document.querySelector('.theme-toggle-btn');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      ThemeManager.toggle();
    });
  }
}
