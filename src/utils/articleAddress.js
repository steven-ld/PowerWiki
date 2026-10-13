const { generateCode } = require('./shortlink');

const encodePath = value => value.split('/').map(encodeURIComponent).join('/');

function articleAddress(file, frontmatter = {}) {
  const slug = frontmatter.slug || '';
  if (slug && (typeof slug !== 'string' || !/^[\p{L}\p{N}_-]+$/u.test(slug))) {
    throw new Error(`Invalid article slug: ${file.path}`);
  }
  const url = slug ? `/article/${encodeURIComponent(slug)}` : `/post/${encodePath(file.path)}`;
  const aliases = frontmatter.aliases || [];
  if (!Array.isArray(aliases)) throw new Error(`aliases must be an array: ${file.path}`);
  const routes = [`/post/${file.path}`, ...(slug ? [`/article/${slug}`] : []), ...aliases];
  for (const route of routes) {
    if (typeof route !== 'string' || !/^\/(post|article)\/[^?#\\]+$/.test(route) || route.split('/').some(p => p === '.' || p === '..')) {
      throw new Error(`Invalid article alias: ${route}`);
    }
  }
  return { slug, url, routes: [...new Set(routes)], code: generateCode(slug ? `slug:${slug}` : file.path) };
}

function buildAddressIndex(files) {
  const routes = new Map();
  const codes = new Map();
  function add(map, key, file) {
    if (map.has(key) && map.get(key).path !== file.path) throw new Error(`Article address collision: ${key}`);
    map.set(key, file);
  }
  for (const file of files) {
    for (const route of file.routes) {
      add(routes, route, file);
      add(codes, generateCode(route.startsWith('/post/') ? route.slice(6) : `slug:${route.slice(9)}`), file);
    }
    add(codes, file.code, file);
  }
  return { routes, codes };
}

module.exports = { articleAddress, buildAddressIndex, encodePath };
