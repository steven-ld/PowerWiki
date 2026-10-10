const fs = require('fs');
const path = require('path');
const { createHash } = require('crypto');

function createAssetManager(publicDir, pdfDir) {
  const hashes = new Map();
  const urls = new Map();
  function add(filePath, url) {
    const hash = createHash('sha256').update(fs.readFileSync(filePath)).digest('hex').slice(0, 16);
    hashes.set(path.resolve(filePath), hash);
    urls.set(url, `${url}?v=${hash}`);
  }
  function scan(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const filePath = path.join(dir, entry.name);
      if (entry.isDirectory()) scan(filePath);
      else if (/\.(js|css)$/.test(entry.name)) {
        add(filePath, '/' + path.relative(publicDir, filePath).split(path.sep).join('/'));
      }
    }
  }
  scan(publicDir);
  for (const name of ['pdf.min.mjs', 'pdf.worker.min.mjs']) {
    add(path.join(pdfDir, 'build', name), `/pdfjs/build/${name}`);
  }
  const pdfUrls = { module: urls.get('/pdfjs/build/pdf.min.mjs'), worker: urls.get('/pdfjs/build/pdf.worker.min.mjs') };
  return {
    versionHtml(html) {
      return html.replace(/(["'])(\/(?:css\/[^"'?]+\.css|js\/[^"'?]+\.js|app\.js))\1/g,
        (match, quote, url) => `${quote}${urls.get(url) || url}${quote}`)
        .replace('</head>', `<script>window.__PDFJS_URLS__ = ${JSON.stringify(pdfUrls)};</script></head>`);
    },
    setHeaders(res, filePath) {
      const hash = hashes.get(path.resolve(filePath));
      const immutable = hash && res.req.query.v === hash;
      res.setHeader('Cache-Control', immutable ? 'public, max-age=31536000, immutable' : 'public, max-age=0, must-revalidate');
    }
  };
}

module.exports = { createAssetManager };
