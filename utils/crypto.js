/**
 * Crypto Utility
 * 
 * 加密工具模块
 * 提供数据加密和解密功能，使用 AES-256-GCM 算法
 * 
 * @module crypto
 */

const crypto = require('crypto');

// 默认加密算法
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 对于 GCM，IV 长度通常是 12 字节，但为了兼容性使用 16
const SALT_LENGTH = 32;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32; // AES-256 需要 32 字节密钥

/**
 * 从密码派生密钥
 * @param {string} password - 密码
 * @param {Buffer} salt - 盐值
 * @returns {Buffer} 派生密钥
 */
function deriveKey(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, KEY_LENGTH, 'sha256');
}

/**
 * 生成随机密钥（用于客户端）
 * @returns {string} Base64 编码的密钥
 */
function generateKey() {
  return crypto.randomBytes(KEY_LENGTH).toString('base64');
}

/**
 * 加密数据
 * @param {string} text - 要加密的文本
 * @param {string} password - 加密密码（如果未提供，将使用环境变量或默认密钥）
 * @returns {string} 加密后的数据（Base64 编码）
 */
function encrypt(text, password = null) {
  try {
    // 如果没有提供密码，尝试从环境变量获取，否则使用默认密钥
    const encryptionKey = password || process.env.ENCRYPTION_KEY || 'powerwiki-default-key-change-in-production';

    // 生成随机盐值
    const salt = crypto.randomBytes(SALT_LENGTH);

    // 派生密钥
    const key = deriveKey(encryptionKey, salt);

    // 生成随机 IV
    const iv = crypto.randomBytes(IV_LENGTH);

    // 创建加密器
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // 加密数据
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    // 获取认证标签
    const tag = cipher.getAuthTag();

    // 组合：salt + iv + tag + encrypted
    const combined = Buffer.concat([
      salt,
      iv,
      tag,
      Buffer.from(encrypted, 'base64')
    ]);

    return combined.toString('base64');
  } catch (error) {
    console.error('加密失败:', error);
    throw new Error('数据加密失败');
  }
}

/**
 * 解密数据
 * @param {string} encryptedData - 加密的数据（Base64 编码）
 * @param {string} password - 解密密码（如果未提供，将使用环境变量或默认密钥）
 * @returns {string} 解密后的文本
 */
function decrypt(encryptedData, password = null) {
  try {
    // 如果没有提供密码，尝试从环境变量获取，否则使用默认密钥
    const encryptionKey = password || process.env.ENCRYPTION_KEY || 'powerwiki-default-key-change-in-production';

    // 解码 Base64
    const combined = Buffer.from(encryptedData, 'base64');

    // 提取各部分
    const salt = combined.slice(0, SALT_LENGTH);
    const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = combined.slice(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const encrypted = combined.slice(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

    // 派生密钥
    const key = deriveKey(encryptionKey, salt);

    // 创建解密器
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    // 解密数据
    let decrypted = decipher.update(encrypted, null, 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('解密失败:', error);
    throw new Error('数据解密失败');
  }
}

/**
 * 加密 JSON 对象
 * @param {Object} obj - 要加密的对象
 * @param {string} password - 加密密码
 * @returns {string} 加密后的数据（Base64 编码）
 */
function encryptJSON(obj, password = null) {
  const jsonString = JSON.stringify(obj);
  return encrypt(jsonString, password);
}

/**
 * 解密 JSON 对象
 * @param {string} encryptedData - 加密的数据
 * @param {string} password - 解密密码
 * @returns {Object} 解密后的对象
 */
function decryptJSON(encryptedData, password = null) {
  const jsonString = decrypt(encryptedData, password);
  return JSON.parse(jsonString);
}

/**
 * 哈希数据（用于验证，不可逆）
 * @param {string} text - 要哈希的文本
 * @returns {string} 哈希值（SHA-256）
 */
function hash(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

module.exports = {
  encrypt,
  decrypt,
  encryptJSON,
  decryptJSON,
  hash,
  generateKey
};

