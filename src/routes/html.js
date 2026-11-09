/**
 * HTML Routes
 *
 * 仓库 HTML 页面和 Markdown 一样作为文章收录与渲染。这里负责：
 * - 把 `/docs/page`、`/docs/page.html`、`/docs/` 这类地址统一跳到文章地址
 *   `/post/docs/page.html`，由文章渲染链路输出同一种阅读界面
 * - 提供页面引用的 `static/` 静态资源（同级 `static/` 与仓库顶层 `static/`）
 * - 集中处理这些用户可控文件的路径穿越防护与安全响应头
 *
 * @module routes/html
 */

const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const { t } = require('../config/i18n');
const {
  ASSET_EXTENSIONS,
  HTML_EXTENSIONS,
  MARKDOWN_EXTENSIONS,
  extensionOf,
  resolveRepoFile,
  safeDecodePath
} = require('../utils/safePath');
const { encodePath } = require('../utils/articleAddress');

// 这些前缀属于应用自身路由，仓库文件不能覆盖。
const RESERVED_TOP_LEVEL = new Set(['api', 'stats', 'post', 'article', 's', 'pdfjs']);

const DEFAULT_SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Cross-Origin-Opener-Policy': 'same-origin'
};

function htmlSettings(config) {
  const options = (config && config.html) || {};
  return {
    enabled: options.enabled !== false,
    // 默认清洗正文；html.sanitize 显式关闭（或旧的 sandbox:false）才按可信内容原样输出。
    sanitize: options.sanitize !== undefined ? options.sanitize !== false : options.sandbox !== false,
    sandbox: options.sandbox !== false,
    csp: typeof options.csp === 'string' && options.csp.trim() ? options.csp.trim() : null
  };
}

/**
 * 配置的 404 页面仍作为独立文档输出，使用这里的默认 CSP 并放进沙箱，
 * 使其无法读取 Wiki 的 Cookie、localStorage 或同源接口。
 * 该页面确实需要同源能力时，可在 config.json 设置 "html": { "sandbox": false }。
 */
function buildCsp(sandbox) {
  const resources = [
    "default-src 'self' http: https: data: blob:",
    "img-src 'self' http: https: data: blob:",
    "media-src 'self' http: https: data: blob:",
    "font-src 'self' http: https: data:",
    "style-src 'unsafe-inline' http: https:",
    "script-src 'unsafe-inline' 'unsafe-eval' http: https:",
    "connect-src http: https:",
    "form-action 'self' http: https:",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'self'"
  ];
  return (sandbox ? 'sandbox allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads allow-top-navigation-by-user-activation; ' : '') + resources.join('; ');
}

function applyDocumentHeaders(res, settings) {
  for (const [name, value] of Object.entries(DEFAULT_SECURITY_HEADERS)) {
    res.setHeader(name, value);
  }
  res.setHeader('Content-Security-Policy', settings.csp || buildCsp(settings.sandbox));
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
}

function sendFile(res, file, headers, status = 200) {
  res.status(status);
  for (const [name, value] of Object.entries(headers)) {
    res.setHeader(name, value);
  }
  return new Promise((resolve, reject) => {
    // 路径已经由 resolveRepoFile 校验；缓存目录名可能带点（如 .git-cache），
    // dotfiles:'deny' 会把所有仓库文件误判成隐藏文件并返回 403。
    res.sendFile(file.absolute, { dotfiles: 'allow' }, error => {
      if (error) reject(error);
      else resolve();
    });
  });
}

const cleanUrlPath = value => String(value || '').replace(/\\/g, '/').replace(/\/+/g, '/');

function hasUnsafeSegment(segments) {
  return segments.some(segment => !segment || segment === '.' || segment === '..' || segment.startsWith('.'));
}

/**
 * 生成 HTML 候选路径。省略扩展名时优先 `.html`，其次目录下的 `index.html`。
 */
function htmlCandidates(pathname) {
  const decoded = safeDecodePath(pathname);
  if (decoded === null) return [];
  const clean = cleanUrlPath(decoded);
  const trailingSlash = clean.endsWith('/');
  const segments = clean.split('/').filter(Boolean);
  if (!segments.length || hasUnsafeSegment(segments)) return [];

  const base = segments.join('/');
  const extension = extensionOf(base);
  if (extension === '.html' || extension === '.htm') return [base];
  // 已知的非页面扩展名直接拒绝；未知扩展名可能只是页面名里带点
  // （如 release-1.0），继续尝试补全 .html。
  if (extension && (ASSET_EXTENSIONS.has(extension) || MARKDOWN_EXTENSIONS.has(extension))) return [];

  if (trailingSlash) return [`${base}/index.html`, `${base}/index.htm`];
  return [`${base}.html`, `${base}.htm`, `${base}/index.html`, `${base}/index.htm`];
}

/**
 * 从 Referer 中推断引用页面所在目录，用于优先命中同级 static。
 */
function refererDirectory(req) {
  const referer = req.get('referer');
  if (!referer) return null;

  let pathname;
  try {
    pathname = new URL(referer).pathname;
  } catch (error) {
    return null;
  }

  const decoded = safeDecodePath(pathname);
  if (decoded === null) return null;
  const clean = cleanUrlPath(decoded);
  const segments = clean.split('/').filter(Boolean);
  if (!segments.length || hasUnsafeSegment(segments)) return null;

  // 文章页 /post/<仓库路径> 的 Referer 需要映射回仓库目录，
  // 这样页面里的根绝对 /static/... 仍能优先命中同级 static/。
  if (segments[0] === 'post') {
    segments.shift();
    segments.pop(); // 文章文件本身
    if (!segments.length || hasUnsafeSegment(segments)) return null;
    return segments.join('/');
  }
  if (RESERVED_TOP_LEVEL.has(segments[0])) return null;

  // 引用页面本身是普通页面时去掉文件名；引用的是目录则保留目录。
  if (!clean.endsWith('/')) segments.pop();
  return segments.length ? segments.join('/') : null;
}

/**
 * 生成静态资源候选路径。
 * `/static/a.css` 会先尝试引用页面同级的 `<dir>/static/a.css`，再回退到顶层 `static/a.css`。
 * `/<dir>/static/a.css` 直接按仓库路径解析，天然就是“同级优先”。
 */
function assetCandidates(pathname, req) {
  const decoded = safeDecodePath(pathname);
  if (decoded === null) return [];
  const segments = cleanUrlPath(decoded).split('/').filter(Boolean);
  if (!segments.length || hasUnsafeSegment(segments)) return [];

  if (segments[0] === 'static') {
    const rest = segments.slice(1).join('/');
    if (!rest) return [];
    const candidates = [];
    const directory = refererDirectory(req);
    if (directory) candidates.push(`${directory}/static/${rest}`);
    candidates.push(`static/${rest}`);
    return [...new Set(candidates)];
  }

  // 非 static 目录的资源只允许“引用页面的同级文件”或任意层级的 static 目录，
  // 避免仓库中的 package.json、配置文件等被当作静态资源直接下载。
  const directory = refererDirectory(req);
  const requestedDirectory = segments.slice(0, -1).join('/');
  const inStaticDirectory = segments.includes('static');
  if (!inStaticDirectory && (!directory || requestedDirectory !== directory)) return [];
  return [segments.join('/')];
}

async function firstExisting(repoPath, candidates, extensions) {
  // 候选路径已经由 htmlCandidates/assetCandidates 解码，不能再解一次。
  for (const candidate of candidates) {
    const file = await resolveRepoFile(repoPath, candidate, { extensions, decoded: true });
    if (file) return file;
  }
  return null;
}

function isInsideReservedPath(pathname) {
  const decoded = safeDecodePath(pathname);
  if (decoded === null) return true;
  const segments = cleanUrlPath(decoded).split('/').filter(Boolean);
  return segments.length > 0 && RESERVED_TOP_LEVEL.has(segments[0]);
}

/**
 * 仓库 HTML/静态资源路由。未命中时调用 next()，由后续 404 处理器接管。
 */
function createHtmlRoutes({ gitManager, config }) {
  const router = express.Router();

  router.use(async (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (isInsideReservedPath(req.path)) return next();

    try {
      const settings = htmlSettings(config);
      if (!settings.enabled) return next();
      const extension = extensionOf(req.path);

      if (ASSET_EXTENSIONS.has(extension)) {
        const file = await firstExisting(gitManager.repoPath, assetCandidates(req.path, req), ASSET_EXTENSIONS);
        if (!file) return next();

        const headers = {
          'X-Content-Type-Options': 'nosniff',
          'Cache-Control': 'public, max-age=0, must-revalidate',
          'Cross-Origin-Resource-Policy': 'same-site'
        };
        // 直接打开 SVG 时禁止脚本执行。
        if (extension === '.svg') headers['Content-Security-Policy'] = "default-src 'none'; style-src 'unsafe-inline'; sandbox";
        await sendFile(res, file, headers);
        return;
      }

      const file = await firstExisting(gitManager.repoPath, htmlCandidates(req.path), HTML_EXTENSIONS);
      if (!file) return next();

      // HTML 页面不再独立输出：统一跳到文章地址，与 Markdown 共用文章渲染链路。
      const queryIndex = req.originalUrl.indexOf('?');
      const query = queryIndex === -1 ? '' : req.originalUrl.slice(queryIndex);
      return res.redirect(301, `/post/${encodePath(file.relative)}${query}`);
    } catch (error) {
      console.error(`❌ ${t('static.serveHtmlFailed')}:`, error);
      if (!res.headersSent) next(error);
    }
  });

  return router;
}

// 缺失的 404 配置路径：只提示一次，避免 404 扫描导致日志刷屏。
const warnedMissingNotFound = new Set();

let defaultNotFoundTemplate;
function readDefaultNotFoundTemplate() {
  if (!defaultNotFoundTemplate) {
    const templatePath = path.join(__dirname, '..', '..', 'templates', '404.html');
    try {
      defaultNotFoundTemplate = fs.readFileSync(templatePath, 'utf8');
    } catch (error) {
      defaultNotFoundTemplate = '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8">' +
        '<meta name="robots" content="noindex"><title>404 - {{title}}</title></head><body>' +
        '<h1>404</h1><p>页面不存在</p><a href="/">返回首页</a></body></html>';
    }
  }
  return defaultNotFoundTemplate;
}

function notFoundContent() {
  return `<h1>404</h1><p class="not-found-description">${t('notFound.description')}</p>` +
    `<a class="not-found-home" href="/">${t('notFound.backHome')}</a>`;
}

function renderDefaultNotFound(content = notFoundContent()) {
  return readDefaultNotFoundTemplate()
    .replace('{{title}}', () => t('notFound.title'))
    .replace('{{content}}', () => content);
}

/**
 * 404 处理器：优先返回配置的 pages.notFound，未配置或文件不可用时返回默认页面。
 */
function createNotFoundHandler({ gitManager, config }) {
  return async function notFoundHandler(req, res, next) {
    if (res.headersSent) return next();

    if (req.path === '/api' || req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'Not found' });
    }

    const configuredPage = (config.pages && config.pages.notFound) || config.notFound;
    if (configuredPage) {
      try {
        const file = await resolveRepoFile(gitManager.repoPath, configuredPage, {
          extensions: new Set([...HTML_EXTENSIONS, ...MARKDOWN_EXTENSIONS]),
          decoded: true
        });
        if (file) {
          const settings = htmlSettings(config);
          if (MARKDOWN_EXTENSIONS.has(file.extension)) {
            const { parseMarkdown } = require('../utils/markdownParser');
            const markdown = await fs.readFile(file.absolute, 'utf8');
            const parsed = parseMarkdown(markdown, file.relative);
            applyDocumentHeaders(res, settings);
            res.status(404).send(renderDefaultNotFound(parsed.html));
          } else {
            applyDocumentHeaders(res, settings);
            await sendFile(res, file, {}, 404);
          }
          return;
        }
        // 每个缺失路径只告警一次，避免被大量 404 请求刷屏。
        if (!warnedMissingNotFound.has(configuredPage)) {
          warnedMissingNotFound.add(configuredPage);
          console.warn(`⚠️  ${t('notFound.configuredMissing')}: ${configuredPage}`);
        }
      } catch (error) {
        console.error(`❌ ${t('notFound.renderFailed')}:`, error);
      }
    }

    res.status(404);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(renderDefaultNotFound());
  };
}

module.exports = {
  createHtmlRoutes,
  createNotFoundHandler,
  applyDocumentHeaders,
  buildCsp,
  htmlSettings,
  renderDefaultNotFound
};
