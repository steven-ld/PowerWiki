// 客户端缓存管理
const ClientCache = {
  // 缓存版本号（当服务器更新时，可以改变版本号来清除所有缓存）
  CACHE_VERSION: '1.0.0',
  PREFIX: 'powerwiki_cache_',

  // 默认缓存时间（毫秒）
  DEFAULT_TTL: {
    posts: Infinity,           // 内容缓存仅按服务器版本失效
    post: Infinity,
    config: Infinity,
    stats: 1 * 60 * 1000         // 统计数据：1分钟
  },

  version: null,
  pendingVersion: null,

  adoptVersion(version) {
    if (!version) return false;
    let previous = this.version;
    try { previous = previous || localStorage.getItem('powerwiki_content_version'); } catch (_) {}
    const changed = previous !== version;
    if (changed) ['posts', 'post', 'config'].forEach(type => this.delete(type));
    this.version = version;
    try { localStorage.setItem('powerwiki_content_version', version); } catch (_) {}
    return changed;
  },

  async ensureVersion() {
    if (this.pendingVersion) return this.pendingVersion;
    this.pendingVersion = (async () => {
      try {
        const response = await fetch('/api/version', { cache: 'no-store' });
        if (!response.ok) throw new Error('Content version unavailable');
        const data = await response.json();
        return this.adoptVersion(data.version);
      } catch (error) {
        try { this.version = this.version || localStorage.getItem('powerwiki_content_version'); } catch (_) {}
        console.warn('内容版本检查失败，保留本地缓存:', error);
        return false;
      }
    })();
    try { return await this.pendingVersion; } finally { this.pendingVersion = null; }
  },

  /**
   * 获取缓存键
   */
  getKey(type, id = '') {
    return `${this.PREFIX}${this.CACHE_VERSION}_${type}_${id}`;
  },

  /**
   * 获取缓存
   */
  get(type, id = '') {
    try {
      const key = this.getKey(type, id);
      const cached = localStorage.getItem(key);

      if (!cached) {
        return null;
      }

      const data = JSON.parse(cached);
      if (['posts', 'post', 'config'].includes(type) && data.version !== this.version) return null;

      // 检查是否过期
      if (data.expiresAt !== null && Date.now() > data.expiresAt) {
        localStorage.removeItem(key);
        return null;
      }

      return data.value;
    } catch (error) {
      console.warn(i18n.t('client.readCacheFailed'), error);
      return null;
    }
  },

  /**
   * 设置缓存
   */
  set(type, id = '', value, ttl = null) {
    // JSON 解析期间版本可能已改变，旧响应不能写入新版本缓存。
    const contentCache = ['posts', 'post', 'config'].includes(type);
    const version = contentCache && value.version ? value.version : this.version;
    if (contentCache && version !== this.version) return;
    try {
      const key = this.getKey(type, id);
      const duration = ttl || this.DEFAULT_TTL[type] || 5 * 60 * 1000;
      const expiresAt = duration === Infinity ? null : Date.now() + duration;

      const data = {
        value,
        version,
        expiresAt,
        createdAt: Date.now()
      };

      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      // 如果存储空间不足，清除旧缓存
      if (error.name === 'QuotaExceededError') {
        console.warn(i18n.t('client.storageFull'));
        this.clearExpired();
        // 重试一次
        try {
          const key = this.getKey(type, id);
          const duration = ttl || this.DEFAULT_TTL[type] || 5 * 60 * 1000;
          const expiresAt = duration === Infinity ? null : Date.now() + duration;
          localStorage.setItem(key, JSON.stringify({ value, version, expiresAt, createdAt: Date.now() }));
        } catch (e) {
          console.error(i18n.t('client.cacheSetFailed'), e);
        }
      } else {
        console.error(i18n.t('client.cacheSetFailed'), error);
      }
    }
  },

  /**
   * 删除缓存
   */
  delete(type, id = null) {
    if (id === null) {
      // 删除该类型的所有缓存
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(`${this.PREFIX}${this.CACHE_VERSION}_${type}_`)) {
          localStorage.removeItem(key);
        }
      });
    } else {
      const key = this.getKey(type, id);
      localStorage.removeItem(key);
    }
  },

  /**
   * 清除所有缓存
   */
  clear() {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  },

  /**
   * 清除过期缓存
   */
  clearExpired() {
    const keys = Object.keys(localStorage);
    const now = Date.now();
    let cleared = 0;

    keys.forEach(key => {
      if (key.startsWith(this.PREFIX)) {
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const data = JSON.parse(cached);
            if (data.expiresAt !== null && now > data.expiresAt) {
              localStorage.removeItem(key);
              cleared++;
            }
          }
        } catch (e) {
          // 如果解析失败，删除该缓存
          localStorage.removeItem(key);
          cleared++;
        }
      }
    });

    return cleared;
  },

  /**
   * 检查缓存是否存在且未过期
   */
  has(type, id = '') {
    const cached = this.get(type, id);
    return cached !== null;
  }
};

// 定期清理过期缓存（每5分钟）
setInterval(() => {
  const cleared = ClientCache.clearExpired();
  if (cleared > 0) {
    console.log(`🧹 ${i18n.tf('client.clearedCacheItems', cleared)}`);
  }
}, 5 * 60 * 1000);
