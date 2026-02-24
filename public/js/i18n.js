// 国际化 (i18n) 支持 - 复用服务器端翻译
const i18n = {
  locale: document.documentElement.lang || 'zh-CN',
  translations: {},

  async init() {
    // 优先从 window.__I18N__ 获取翻译（首页注入）
    if (window.__I18N__ && Object.keys(window.__I18N__).length > 0) {
      this.translations = window.__I18N__;
      return;
    }

    // 否则从 API 获取翻译（其他页面）
    try {
      const response = await fetch('/api/i18n');
      this.translations = await response.json();
    } catch (error) {
      console.error('Failed to load translations:', error);
      this.translations = {};
    }
  },

  t(key) {
    const keys = key.split('.');
    let result = this.translations;

    for (const k of keys) {
      if (result && result[k] !== undefined) {
        result = result[k];
      } else {
        return key; // 返回 key 如果翻译不存在
      }
    }

    return result;
  },

  // 初始化页面元素的 i18n 属性
  initElements() {
    // 设置带 data-i18n 属性的元素文本
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.textContent = this.t(key);
    });

    // 设置带 data-i18n-placeholder 属性的 placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      el.placeholder = this.t(key);
    });

    // 设置带 data-i18n-title 属性的 title
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      el.title = this.t(key);
    });
  },

  // 格式化翻译（支持参数替换）
  tf(key, ...args) {
    let text = this.t(key);
    args.forEach((arg, index) => {
      text = text.replace(`{${index}}`, arg);
    });
    return text;
  }
};
