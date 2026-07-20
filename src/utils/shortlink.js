/**
 * Shortlink Utilities
 *
 * 短链工具模块
 *
 * 设计要点：
 * - 短链 code 由文章路径（filePath）经 SHA-256 派生，取前 7 位十六进制。
 *   因此同一篇文章的短链是「固定」的、无状态的、可随时重建，无需持久化映射表。
 * - 访问时通过 code 反查 filePath：基于当前文章列表构建 code -> filePath 映射，
 *   在文件被重命名/删除后自动失效，保证「唯一定位到一篇现存文章」。
 *
 * @module utils/shortlink
 */

const crypto = require('crypto');

// 短链 code 长度（十六进制字符数）。7 位 = 16^7 ≈ 2.68 亿空间，足够避免碰撞。
const CODE_LENGTH = 7;

/**
 * 根据文章路径生成固定的短链 code
 * @param {string} filePath - 文章相对路径，例如 "docs/深入理解JVM.md"
 * @returns {string} 短链 code，例如 "a1b2c3d"
 */
function generateCode(filePath) {
  if (!filePath) {
    return '';
  }
  const hash = crypto.createHash('sha256').update(filePath, 'utf8').digest('hex');
  return hash.slice(0, CODE_LENGTH);
}

/**
 * 基于文章路径列表构建 code -> filePath 的反查映射
 * @param {string[]} filePaths - 文章路径数组
 * @returns {Map<string, string>} code 到 filePath 的映射
 */
function buildCodeMap(filePaths) {
  const map = new Map();
  (filePaths || []).forEach(filePath => {
    if (!filePath) {
      return;
    }
    const code = generateCode(filePath);
    // 极小概率碰撞时保留先出现的（保持确定性）
    if (!map.has(code)) {
      map.set(code, filePath);
    }
  });
  return map;
}

module.exports = { generateCode, buildCodeMap, CODE_LENGTH };
