const fs = require('fs-extra');
const path = require('path');
const { t } = require('../../config/i18n');
const env = require('../../config/env');

const statsFilePath = path.join(env.DATA_DIR, '.stats.json');
const accessLogFilePath = path.join(env.DATA_DIR, '.access-log.json');

function readStats() {
  try {
    if (fs.existsSync(statsFilePath)) {
      const data = fs.readFileSync(statsFilePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error(t('error.readStatsFailed', error.message));
  }
  return {
    totalViews: 0,
    postViews: {}
  };
}

function saveStats(stats) {
  try {
    fs.writeFileSync(statsFilePath, JSON.stringify(stats, null, 2), 'utf-8');
  } catch (error) {
    console.error(t('error.saveStatsFailed', error.message));
  }
}

function readAccessLog() {
  try {
    if (fs.existsSync(accessLogFilePath)) {
      const data = fs.readFileSync(accessLogFilePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error(t('error.readLogFailed', error.message));
  }
  return [];
}

function saveAccessLog(log) {
  try {
    const maxRecords = 10000;
    const trimmedLog = log.slice(-maxRecords);
    fs.writeFileSync(accessLogFilePath, JSON.stringify(trimmedLog, null, 2), 'utf-8');
  } catch (error) {
    console.error(t('error.saveLogFailed', error.message));
  }
}

function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.ip ||
    'unknown';
}

function parseBrowser(userAgent) {
  if (!userAgent || userAgent === 'unknown') {
    return t('browser.unknown');
  }

  const ua = userAgent.toLowerCase();

  if (ua.includes('micromessenger')) {
    return t('browser.wechat');
  }

  if (ua.includes('edg') || (ua.includes('edge') && !ua.includes('edgechromium'))) {
    return 'Edge';
  }

  if (ua.includes('opr') || ua.includes('opera')) {
    return 'Opera';
  }

  if (ua.includes('chrome') && !ua.includes('edg') && !ua.includes('opr')) {
    return 'Chrome';
  }

  if (ua.includes('firefox')) {
    return 'Firefox';
  }

  if (ua.includes('safari') && !ua.includes('chrome')) {
    if (ua.includes('iphone') || ua.includes('ipad')) {
      return 'Safari (iOS)';
    }
    return 'Safari';
  }

  if (ua.includes('msie') || ua.includes('trident')) {
    return 'Internet Explorer';
  }

  if (ua.includes('mobile')) {
    if (ua.includes('android')) {
      return t('browser.android');
    }
  }

  if (ua.includes('bot') || ua.includes('crawler') || ua.includes('spider')) {
    return t('browser.crawler');
  }

  return t('browser.other');
}

function recordPostView(filePath, req) {
  const stats = readStats();
  stats.totalViews = (stats.totalViews || 0) + 1;
  stats.postViews = stats.postViews || {};
  stats.postViews[filePath] = (stats.postViews[filePath] || 0) + 1;
  saveStats(stats);

  const accessLog = readAccessLog();
  const ip = getClientIP(req);
  const userAgent = req.headers['user-agent'] || 'unknown';
  const browser = parseBrowser(userAgent);
  const timestamp = new Date().toISOString();

  accessLog.push({
    timestamp,
    ip,
    filePath,
    userAgent,
    browser
  });

  saveAccessLog(accessLog);

  return stats.postViews[filePath];
}

module.exports = {
  readStats,
  saveStats,
  readAccessLog,
  saveAccessLog,
  getClientIP,
  parseBrowser,
  recordPostView
};
