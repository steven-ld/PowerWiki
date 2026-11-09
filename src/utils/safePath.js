/**
 * Safe Path
 *
 * 将仓库内的相对路径解析为绝对路径，并保证结果始终位于仓库目录内。
 * 这里集中处理路径穿越、绝对路径、空字节、隐藏文件与扩展名白名单，
 * 供 HTML 页面、静态资源以及既有图片/PDF 接口共用。
 *
 * @module safePath
 */

const path = require('path');
const fs = require('fs-extra');

const HTML_EXTENSIONS = new Set(['.html', '.htm']);
const MARKDOWN_EXTENSIONS = new Set(['.md', '.markdown']);
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico', '.avif', '.bmp']);
// 数据类文件可能包含配置或私密内容，只在显式的 static/ 资源目录里提供，
// 不接受“与引用页面同级”这一条宽松规则。
const DATA_EXTENSIONS = new Set(['.json', '.txt', '.xml', '.csv', '.yaml', '.yml', '.toml']);

const ASSET_EXTENSIONS = new Set([
  ...IMAGE_EXTENSIONS,
  '.css', '.js', '.mjs',
  '.woff', '.woff2', '.ttf', '.otf', '.eot',
  ...DATA_EXTENSIONS,
  '.mp3', '.wav', '.ogg', '.m4a',
  '.mp4', '.webm', '.ogv',
  '.pdf', '.wasm'
]);

// 单个文件上限，避免用超大仓库文件耗尽内存或阻塞事件循环。
const MAX_FILE_SIZE = 50 * 1024 * 1024;

const extensionOf = value => path.extname(String(value || '')).toLowerCase();

function tryDecode(value) {
  if (typeof value !== 'string' || value.includes('\0')) return null;
  try {
    return decodeURIComponent(value);
  } catch (error) {
    return null;
  }
}

/**
 * 解码 URL 路径；失败或包含空字节时返回 null。
 */
function safeDecodePath(value) {
  return tryDecode(value);
}

/**
 * 归一化仓库内相对路径。隐藏文件、`.`、`..`、绝对路径和盘符一律拒绝。
 * @param {string} value
 * @param {{decoded?: boolean}} [options] decoded=true 表示调用方已完成 URL 解码
 * @returns {string|null}
 */
function normalizeRelativePath(value, options = {}) {
  const decoded = options.decoded ? value : tryDecode(value);
  if (typeof decoded !== 'string' || decoded === null) return null;
  if (/[\u0000-\u001f\u007f]/.test(decoded)) return null;
  if (/^[a-zA-Z]:/.test(decoded)) return null;

  const normalized = decoded.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!normalized) return null;

  const segments = normalized.split('/');
  for (const segment of segments) {
    if (!segment || segment === '.' || segment === '..') return null;
    // 拒绝 .git、.env、.DS_Store 等隐藏文件/目录。
    if (segment.startsWith('.')) return null;
  }
  return segments.join('/');
}

function isInside(root, target) {
  const rootPath = path.resolve(root);
  const targetPath = path.resolve(target);
  return targetPath === rootPath || targetPath.startsWith(rootPath + path.sep);
}

/**
 * 解析仓库内文件。
 *
 * @param {string} root 仓库根目录
 * @param {string} relativePath 用户提供的相对路径（可含 URL 编码）
 * @param {Object} [options]
 * @param {Set<string>} [options.extensions] 允许的扩展名（小写，含点）
 * @param {boolean} [options.decoded] 输入是否已经完成 URL 解码
 * @returns {Promise<{absolute:string, relative:string, size:number, extension:string}|null>}
 */
async function resolveRepoFile(root, relativePath, options = {}) {
  const relative = normalizeRelativePath(relativePath, { decoded: Boolean(options.decoded) });
  if (!relative) return null;

  const extension = extensionOf(relative);
  if (options.extensions && !options.extensions.has(extension)) return null;

  let realRoot;
  try {
    realRoot = await fs.realpath(root);
  } catch (error) {
    return null;
  }

  const absolute = path.resolve(realRoot, relative);
  if (!isInside(realRoot, absolute)) return null;

  let realTarget;
  let stats;
  try {
    // realpath 同时解析符号链接，防止仓库内软链接指向仓库外。
    realTarget = await fs.realpath(absolute);
    if (!isInside(realRoot, realTarget)) return null;
    stats = await fs.stat(realTarget);
  } catch (error) {
    return null;
  }

  if (!stats.isFile() || stats.size > MAX_FILE_SIZE) return null;
  return { absolute: realTarget, relative, size: stats.size, extension };
}

/**
 * 解析来自 Express 路由参数的路径。
 *
 * `req.params` 已经被 Express 解码过一次，但历史上部分接口允许再解一层
 * （例如 `%2520` 形式的文件名）。两种解释都经过同一套安全校验，
 * 优先采用解码后的路径，找不到时再按字面路径查找。
 *
 * @param {string} root 仓库根目录
 * @param {string} value 路由参数
 * @param {Object} [options] 同 resolveRepoFile
 */
async function resolveRequestFile(root, value, options = {}) {
  const decoded = safeDecodePath(value);
  if (decoded !== null && decoded !== value) {
    const file = await resolveRepoFile(root, decoded, { ...options, decoded: true });
    if (file) return file;
  }
  return resolveRepoFile(root, value, { ...options, decoded: true });
}

module.exports = {
  HTML_EXTENSIONS,
  MARKDOWN_EXTENSIONS,
  IMAGE_EXTENSIONS,
  ASSET_EXTENSIONS,
  DATA_EXTENSIONS,
  MAX_FILE_SIZE,
  extensionOf,
  isInside,
  normalizeRelativePath,
  resolveRepoFile,
  resolveRequestFile,
  safeDecodePath
};
