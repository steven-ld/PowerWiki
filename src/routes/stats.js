const express = require('express');
const router = express.Router();
const cacheManager = require('../../utils/cacheManager');
const { readStats, readAccessLog } = require('../services/statsService');

router.get('/', (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=30');

  const cached = cacheManager.get('stats');
  if (cached) {
    res.json(cached);
    return;
  }

  const stats = readStats();

  cacheManager.set('stats', '', stats, 30 * 1000);

  res.json(stats);
});

router.get('/detail', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  try {
    const stats = readStats();
    const accessLog = readAccessLog();

    const ipStats = {};
    const postStats = {};
    const dateStats = {};
    const hourStats = {};
    const browserStats = {};
    const weekdayStats = {};

    accessLog.forEach(record => {
      if (!ipStats[record.ip]) {
        ipStats[record.ip] = {
          ip: record.ip,
          count: 0,
          posts: new Set(),
          firstVisit: record.timestamp,
          lastVisit: record.timestamp
        };
      }
      ipStats[record.ip].count++;
      ipStats[record.ip].posts.add(record.filePath);
      if (record.timestamp < ipStats[record.ip].firstVisit) {
        ipStats[record.ip].firstVisit = record.timestamp;
      }
      if (record.timestamp > ipStats[record.ip].lastVisit) {
        ipStats[record.ip].lastVisit = record.timestamp;
      }

      if (!postStats[record.filePath]) {
        postStats[record.filePath] = {
          filePath: record.filePath,
          count: 0,
          uniqueIPs: new Set()
        };
      }
      postStats[record.filePath].count++;
      postStats[record.filePath].uniqueIPs.add(record.ip);

      const date = record.timestamp.split('T')[0];
      dateStats[date] = (dateStats[date] || 0) + 1;

      const hour = new Date(record.timestamp).getHours();
      hourStats[hour] = (hourStats[hour] || 0) + 1;

      const browser = record.browser || '未知';
      browserStats[browser] = (browserStats[browser] || 0) + 1;

      const weekday = new Date(record.timestamp).getDay();
      weekdayStats[weekday] = (weekdayStats[weekday] || 0) + 1;
    });

    Object.keys(ipStats).forEach(ip => {
      ipStats[ip].posts = ipStats[ip].posts.size;
    });

    Object.keys(postStats).forEach(filePath => {
      postStats[filePath].uniqueIPs = postStats[filePath].uniqueIPs.size;
    });

    const ipStatsArray = Object.values(ipStats)
      .sort((a, b) => b.count - a.count);

    const postStatsArray = Object.values(postStats)
      .sort((a, b) => b.count - a.count);

    const dateChartData = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dateChartData.push({
        date: dateStr,
        count: dateStats[dateStr] || 0
      });
    }

    const hourChartData = [];
    for (let i = 0; i < 24; i++) {
      hourChartData.push({
        hour: i,
        count: hourStats[i] || 0
      });
    }

    const browserChartData = Object.entries(browserStats)
      .map(([browser, count]) => ({ browser, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const weekdayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekdayChartData = [];
    for (let i = 0; i < 7; i++) {
      weekdayChartData.push({
        weekday: weekdayNames[i],
        count: weekdayStats[i] || 0
      });
    }

    const popularPostsChartData = postStatsArray.slice(0, 10).map(post => ({
      name: post.filePath.length > 30 ? post.filePath.substring(0, 30) + '...' : post.filePath,
      count: post.count
    }));

    res.json({
      summary: {
        totalViews: stats.totalViews,
        totalPosts: Object.keys(stats.postViews).length,
        totalIPs: ipStatsArray.length,
        totalRecords: accessLog.length
      },
      ipStats: ipStatsArray,
      postStats: postStatsArray,
      dateChart: dateChartData,
      hourChart: hourChartData,
      browserChart: browserChartData,
      weekdayChart: weekdayChartData,
      popularPostsChart: popularPostsChartData,
      recentLogs: accessLog.slice(-50).reverse()
    });
  } catch (error) {
    console.error('获取管理统计失败:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
