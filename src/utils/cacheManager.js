/**
 * Cache Manager
 *
 * 缓存管理模块
 * 负责管理服务器端的内存缓存
 *
 * @module cacheManager
 */

const { t } = require('../config/i18n');

class CacheManager {
  constructor(options = {}) {
    this.defaultTTL = options.defaultTTL || 5 * 60 * 1000;
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
  }

  getCacheKey(type, key = '') {
    return `cache:${type}:${key}`;
  }

  get(type, key = '') {
    const cacheKey = this.getCacheKey(type, key);
    const item = this.cache.get(cacheKey);

    if (!item) {
      this.stats.misses++;
      return null;
    }

    if (Date.now() > item.expiresAt) {
      this.cache.delete(cacheKey);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return item.value;
  }

  set(type, key = '', value, ttl = null) {
    const cacheKey = this.getCacheKey(type, key);
    const expiresAt = Date.now() + (ttl || this.defaultTTL);

    this.cache.set(cacheKey, {
      value,
      expiresAt,
      createdAt: Date.now()
    });

    this.stats.sets++;
  }

  delete(type, key = null) {
    if (key === null) {
      const keysToDelete = [];
      for (const [cacheKey] of this.cache) {
        if (cacheKey.startsWith(`cache:${type}:`)) {
          keysToDelete.push(cacheKey);
        }
      }
      keysToDelete.forEach(k => {
        this.cache.delete(k);
        this.stats.deletes++;
      });
    } else {
      const cacheKey = this.getCacheKey(type, key);
      if (this.cache.delete(cacheKey)) {
        this.stats.deletes++;
      }
    }
  }

  clear() {
    const size = this.cache.size;
    this.cache.clear();
    this.stats.deletes += size;
  }

  clearExpired() {
    const now = Date.now();
    const keysToDelete = [];

    for (const [key, item] of this.cache) {
      if (now > item.expiresAt) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      this.cache.delete(key);
      this.stats.deletes++;
    });

    return keysToDelete.length;
  }

  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total * 100).toFixed(2) : 0;

    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: `${hitRate}%`,
      totalRequests: total
    };
  }

  has(type, key = '') {
    const cacheKey = this.getCacheKey(type, key);
    const item = this.cache.get(cacheKey);

    if (!item) {
      return false;
    }

    if (Date.now() > item.expiresAt) {
      this.cache.delete(cacheKey);
      return false;
    }

    return true;
  }
}

// 创建单例实例
const cacheManager = new CacheManager({
  defaultTTL: 5 * 60 * 1000
});

// 定期清理过期缓存
setInterval(() => {
  const cleared = cacheManager.clearExpired();
  if (cleared > 0) {
    console.log(`🧹 ${t('cache.clearedExpiredItems', cleared)}`);
  }
}, 10 * 60 * 1000).unref();

module.exports = cacheManager;
