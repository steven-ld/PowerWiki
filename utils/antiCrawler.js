/**
 * Anti-Crawler Manager
 * 
 * 防爬虫管理模块
 * 负责检测和阻止爬虫访问，包括 User-Agent 检测和请求频率限制
 * 
 * @module antiCrawler
 */

class AntiCrawler {
  constructor(options = {}) {
    // 请求记录：IP -> { count: 次数, resetTime: 重置时间, blocked: 是否被阻止 }
    this.requestRecords = new Map();
    
    // 被阻止的 IP 列表：IP -> 解封时间
    this.blockedIPs = new Map();
    
    // 配置选项
    this.config = {
      // 时间窗口（毫秒），默认 1 分钟
      timeWindow: options.timeWindow || 60 * 1000,
      
      // 时间窗口内最大请求数，默认 60 次
      maxRequests: options.maxRequests || 60,
      
      // IP 被阻止的时间（毫秒），默认 10 分钟
      blockDuration: options.blockDuration || 10 * 60 * 1000,
      
      // 是否启用 User-Agent 检测
      enableUserAgentCheck: options.enableUserAgentCheck !== false,
      
      // 是否启用频率限制
      enableRateLimit: options.enableRateLimit !== false,
      
      // 白名单 IP（不受限制）
      whitelistIPs: options.whitelistIPs || [],
      
      // 黑名单 IP（永久阻止）
      blacklistIPs: options.blacklistIPs || []
    };
    
    // 常见的爬虫 User-Agent 列表
    this.crawlerUserAgents = [
      // 搜索引擎爬虫（可选，根据需要启用）
      // 'Googlebot',
      // 'Bingbot',
      // 'Slurp',
      // 'DuckDuckBot',
      // 'Baiduspider',
      // 'YandexBot',
      // 'Sogou',
      // 'Exabot',
      // 'facebot',
      // 'ia_archiver',
      
      // 恶意爬虫和工具
      'Scrapy',
      'curl',
      'wget',
      'python-requests',
      'Go-http-client',
      'Java/',
      'Apache-HttpClient',
      'okhttp',
      'PostmanRuntime',
      'insomnia',
      'HTTPie',
      'node-fetch',
      'axios',
      'got/',
      'rest-client',
      'PycURL',
      'libwww-perl',
      'LWP::Simple',
      'WWW-Mechanize',
      'mechanize',
      'HttpClient',
      'ApacheBench',
      'ab',
      'masscan',
      'nmap',
      'nikto',
      'sqlmap',
      'dirb',
      'gobuster',
      'dirbuster',
      'wfuzz',
      'burp',
      'zap',
      'nessus',
      'openvas',
      'masscan',
      'nmap',
      'masscan',
      'nikto',
      'sqlmap',
      'dirb',
      'gobuster',
      'dirbuster',
      'wfuzz',
      'burp',
      'zap',
      'nessus',
      'openvas',
      // 空 User-Agent
      ''
    ];
    
    // 定期清理过期记录（每5分钟）
    setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * 获取客户端 IP 地址
   * @param {Object} req - Express 请求对象
   * @returns {string} IP 地址
   */
  getClientIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
           req.headers['x-real-ip'] ||
           req.connection?.remoteAddress ||
           req.socket?.remoteAddress ||
           req.ip ||
           'unknown';
  }

  /**
   * 检查 User-Agent 是否为爬虫
   * @param {string} userAgent - User-Agent 字符串
   * @returns {boolean} 是否为爬虫
   */
  isCrawlerUserAgent(userAgent) {
    if (!userAgent) {
      return true; // 空 User-Agent 视为可疑
    }
    
    const ua = userAgent.toLowerCase();
    return this.crawlerUserAgents.some(crawlerUA => {
      if (!crawlerUA) return false;
      return ua.includes(crawlerUA.toLowerCase());
    });
  }

  /**
   * 检查 IP 是否在白名单
   * @param {string} ip - IP 地址
   * @returns {boolean} 是否在白名单
   */
  isWhitelisted(ip) {
    return this.config.whitelistIPs.includes(ip);
  }

  /**
   * 检查 IP 是否在黑名单
   * @param {string} ip - IP 地址
   * @returns {boolean} 是否在黑名单
   */
  isBlacklisted(ip) {
    return this.config.blacklistIPs.includes(ip);
  }

  /**
   * 检查 IP 是否被阻止
   * @param {string} ip - IP 地址
   * @returns {boolean} 是否被阻止
   */
  isBlocked(ip) {
    const blockUntil = this.blockedIPs.get(ip);
    if (!blockUntil) {
      return false;
    }
    
    if (Date.now() > blockUntil) {
      // 已过期，移除阻止记录
      this.blockedIPs.delete(ip);
      return false;
    }
    
    return true;
  }

  /**
   * 阻止 IP
   * @param {string} ip - IP 地址
   */
  blockIP(ip) {
    const blockUntil = Date.now() + this.config.blockDuration;
    this.blockedIPs.set(ip, blockUntil);
    console.log(`🚫 已阻止 IP: ${ip}，解封时间: ${new Date(blockUntil).toLocaleString()}`);
  }

  /**
   * 记录请求
   * @param {string} ip - IP 地址
   * @returns {boolean} 是否超过限制
   */
  recordRequest(ip) {
    const now = Date.now();
    const record = this.requestRecords.get(ip);
    
    if (!record || now > record.resetTime) {
      // 创建新记录或重置过期记录
      this.requestRecords.set(ip, {
        count: 1,
        resetTime: now + this.config.timeWindow,
        firstRequest: now
      });
      return false;
    }
    
    // 增加计数
    record.count++;
    
    // 检查是否超过限制
    if (record.count > this.config.maxRequests) {
      // 阻止该 IP
      this.blockIP(ip);
      return true;
    }
    
    return false;
  }

  /**
   * 清理过期记录
   */
  cleanup() {
    const now = Date.now();
    
    // 清理请求记录
    for (const [ip, record] of this.requestRecords.entries()) {
      if (now > record.resetTime) {
        this.requestRecords.delete(ip);
      }
    }
    
    // 清理过期的阻止记录
    for (const [ip, blockUntil] of this.blockedIPs.entries()) {
      if (now > blockUntil) {
        this.blockedIPs.delete(ip);
      }
    }
  }

  /**
   * 检查请求是否应该被阻止
   * @param {Object} req - Express 请求对象
   * @returns {Object} { blocked: boolean, reason: string }
   */
  checkRequest(req) {
    const ip = this.getClientIP(req);
    const userAgent = req.headers['user-agent'] || '';
    
    // 检查白名单
    if (this.isWhitelisted(ip)) {
      return { blocked: false, reason: 'whitelisted' };
    }
    
    // 检查黑名单
    if (this.isBlacklisted(ip)) {
      return { blocked: true, reason: 'blacklisted' };
    }
    
    // 检查是否已被阻止
    if (this.isBlocked(ip)) {
      return { blocked: true, reason: 'rate_limit_blocked' };
    }
    
    // User-Agent 检测
    if (this.config.enableUserAgentCheck && this.isCrawlerUserAgent(userAgent)) {
      this.blockIP(ip);
      return { blocked: true, reason: 'crawler_user_agent' };
    }
    
    // 频率限制检测
    if (this.config.enableRateLimit) {
      const exceeded = this.recordRequest(ip);
      if (exceeded) {
        return { blocked: true, reason: 'rate_limit_exceeded' };
      }
    }
    
    return { blocked: false, reason: 'allowed' };
  }

  /**
   * Express 中间件
   * @param {Object} req - Express 请求对象
   * @param {Object} res - Express 响应对象
   * @param {Function} next - 下一个中间件
   */
  middleware() {
    return (req, res, next) => {
      const check = this.checkRequest(req);
      
      if (check.blocked) {
        const ip = this.getClientIP(req);
        console.warn(`🚫 阻止请求: ${ip} - ${check.reason} - ${req.path}`);
        
        res.status(403).json({
          error: '访问被拒绝',
          message: '您的请求频率过高或检测到可疑行为，请稍后再试',
          reason: check.reason
        });
        return;
      }
      
      next();
    };
  }

  /**
   * 获取统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      blockedIPs: this.blockedIPs.size,
      activeRecords: this.requestRecords.size,
      config: {
        timeWindow: this.config.timeWindow,
        maxRequests: this.config.maxRequests,
        blockDuration: this.config.blockDuration
      }
    };
  }

  /**
   * 解封 IP
   * @param {string} ip - IP 地址
   */
  unblockIP(ip) {
    this.blockedIPs.delete(ip);
    this.requestRecords.delete(ip);
    console.log(`✅ 已解封 IP: ${ip}`);
  }

  /**
   * 清除所有记录
   */
  clearAll() {
    this.requestRecords.clear();
    this.blockedIPs.clear();
    console.log('🧹 已清除所有防爬虫记录');
  }
}

module.exports = AntiCrawler;



