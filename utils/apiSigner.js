/**
 * API Signer
 * 
 * 接口签名验证工具
 * 用于防止未授权访问 API 接口
 * 
 * @module apiSigner
 */

const crypto = require('crypto');

/**
 * 生成签名
 * @param {string} secret - 签名密钥
 * @param {string} method - HTTP 方法
 * @param {string} path - 请求路径
 * @param {Object} params - 请求参数（query + body）
 * @param {number} timestamp - 时间戳（毫秒）
 * @returns {string} 签名字符串
 */
function generateSignature(secret, method, path, params = {}, timestamp) {
  // 将参数按 key 排序后拼接
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${encodeURIComponent(String(params[key]))}`)
    .join('&');
  
  // 构建签名字符串：method + path + sortedParams + timestamp + secret
  const signString = `${method.toUpperCase()}\n${path}\n${sortedParams}\n${timestamp}\n${secret}`;
  
  // 使用 SHA-256 生成签名
  const signature = crypto
    .createHash('sha256')
    .update(signString, 'utf8')
    .digest('hex');
  
  return signature;
}

/**
 * 验证签名
 * @param {string} secret - 签名密钥
 * @param {string} method - HTTP 方法
 * @param {string} path - 请求路径
 * @param {Object} params - 请求参数
 * @param {number} timestamp - 时间戳
 * @param {string} receivedSignature - 接收到的签名
 * @param {number} maxAge - 签名最大有效期（毫秒），默认 5 分钟
 * @returns {boolean} 验证是否通过
 */
function verifySignature(secret, method, path, params, timestamp, receivedSignature, maxAge = 5 * 60 * 1000) {
  // 检查时间戳是否在有效期内
  const now = Date.now();
  const age = Math.abs(now - timestamp);
  
  if (age > maxAge) {
    return false; // 签名已过期
  }
  
  // 生成期望的签名
  const expectedSignature = generateSignature(secret, method, path, params, timestamp);
  
  // 使用时间安全比较防止时序攻击
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(receivedSignature, 'hex')
  );
}

/**
 * 从请求中提取参数（query + body）
 * @param {Object} req - Express 请求对象
 * @returns {Object} 合并后的参数对象
 */
function extractParams(req) {
  const params = { ...req.query, ...req.body };
  // 移除签名相关参数
  delete params.signature;
  delete params.timestamp;
  return params;
}

/**
 * Express 中间件：验证 API 签名
 * @param {string} secret - 签名密钥
 * @param {Object} options - 配置选项
 * @returns {Function} Express 中间件函数
 */
function signatureMiddleware(secret, options = {}) {
  const {
    maxAge = 5 * 60 * 1000, // 默认 5 分钟有效期
    skipPaths = [] // 跳过验证的路径
  } = options;
  
  return (req, res, next) => {
    // 跳过静态资源和特定路径
    if (req.path.startsWith('/pdfjs/') || 
        req.path === '/' || 
        req.path.startsWith('/post/') && !req.path.startsWith('/api/')) {
      return next();
    }
    
    // 检查是否在跳过列表中
    if (skipPaths.some(path => req.path.startsWith(path))) {
      return next();
    }
    
    // 只验证 API 路径
    if (!req.path.startsWith('/api/')) {
      return next();
    }
    
    // 获取签名和时间戳
    const signature = req.headers['x-api-signature'] || req.query.signature;
    const timestamp = parseInt(req.headers['x-api-timestamp'] || req.query.timestamp || '0');
    
    if (!signature || !timestamp) {
      return res.status(401).json({ 
        error: '缺少签名或时间戳',
        code: 'MISSING_SIGNATURE'
      });
    }
    
    // 提取请求参数
    const params = extractParams(req);
    
    // 验证签名
    const isValid = verifySignature(
      secret,
      req.method,
      req.path,
      params,
      timestamp,
      signature,
      maxAge
    );
    
    if (!isValid) {
      return res.status(403).json({ 
        error: '签名验证失败',
        code: 'INVALID_SIGNATURE'
      });
    }
    
    next();
  };
}

module.exports = {
  generateSignature,
  verifySignature,
  signatureMiddleware,
  extractParams
};

