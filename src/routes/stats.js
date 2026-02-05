const express = require('express');
const router = express.Router();
const cacheManager = require('../../utils/cacheManager');
const { readStats, readAccessLog } = require('../services/statsService');
const { t } = require('../../config/i18n');

router.get('/stats', (req, res) => {
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

router.get('/stats/detail', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  try {
    const stats = readStats();
    const accessLog = readAccessLog();

    // 确保accessLog是数组
    if (!Array.isArray(accessLog) || accessLog.length === 0) {
      return res.json({
        summary: {
          totalViews: stats.totalViews || 0,
          totalPosts: Object.keys(stats.postViews || {}).length,
          totalIPs: 0,
          totalRecords: 0,
          returningUsers: 0,
          retentionRate: 0,
          avgDepth: 0
        },
        ipStats: [],
        postStats: [],
        dateChart: [],
        hourChart: [],
        browserChart: [],
        weekdayChart: [],
        deviceChart: [],
        depthChart: [],
        referrerChart: [],
        popularPostsChart: [],
        recentLogs: []
      });
    }

    // 按IP统计
    const ipStats = {};
    // 按文章统计
    const postStats = {};
    // 按日期统计
    const dateStats = {};
    // 按小时统计
    const hourStats = {};
    // 按浏览器统计
    const browserStats = {};
    // 按星期统计
    const weekdayStats = {};
    // 按设备类型统计
    const deviceStats = {};
    // 按访问深度统计
    const depthStats = {};
    // 回访用户统计
    const returningUsers = {};
    // 访问来源统计
    const referrerStats = {};

    accessLog.forEach(record => {
      // 确保record存在且有必要的字段
      if (!record || !record.ip || !record.filePath || !record.timestamp) {
        return;
      }
      // IP统计
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

      // 文章统计
      if (!postStats[record.filePath]) {
        postStats[record.filePath] = {
          filePath: record.filePath,
          count: 0,
          uniqueIPs: new Set()
        };
      }
      postStats[record.filePath].count++;
      postStats[record.filePath].uniqueIPs.add(record.ip);

      // 日期统计
      const date = record.timestamp.split('T')[0];
      dateStats[date] = (dateStats[date] || 0) + 1;

      // 小时统计
      const hour = new Date(record.timestamp).getHours();
      hourStats[hour] = (hourStats[hour] || 0) + 1;

      // 浏览器统计
      const browser = record.browser || '未知';
      browserStats[browser] = (browserStats[browser] || 0) + 1;

      // 星期统计
      const weekday = new Date(record.timestamp).getDay();
      weekdayStats[weekday] = (weekdayStats[weekday] || 0) + 1;

      // 设备类型统计
      const userAgent = record.userAgent || '';
      let deviceType = 'Desktop';
      if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
        deviceType = /iPad/.test(userAgent) ? 'Tablet' : 'Mobile';
      }
      deviceStats[deviceType] = (deviceStats[deviceType] || 0) + 1;

      // 访问来源统计
      const referrer = record.referrer || 'Direct';
      let referrerType = 'Direct';
      if (referrer !== 'Direct') {
        if (referrer.includes('google')) referrerType = 'Google';
        else if (referrer.includes('baidu')) referrerType = 'Baidu';
        else if (referrer.includes('bing')) referrerType = 'Bing';
        else if (referrer.includes('github')) referrerType = 'GitHub';
        else referrerType = 'Other';
      }
      referrerStats[referrerType] = (referrerStats[referrerType] || 0) + 1;
    });

    // 计算访问深度和回访用户
    Object.keys(ipStats).forEach(ip => {
      const visitCount = ipStats[ip].count;
      const postCount = ipStats[ip].posts.size; // 获取 Set 的大小
      
      // 访问深度统计
      let depth = 'shallow';
      if (postCount >= 5) depth = 'deep';
      else if (postCount >= 2) depth = 'medium';
      depthStats[depth] = (depthStats[depth] || 0) + 1;
      
      // 回访用户统计
      if (visitCount > 1) {
        returningUsers[ip] = visitCount;
      }
      
      // 转换 Set 为数字
      ipStats[ip].posts = postCount;
    });

    // 转换 postStats 中的 Set 为数字
    Object.keys(postStats).forEach(filePath => {
      postStats[filePath].uniqueIPs = postStats[filePath].uniqueIPs.size;
    });

    // 转换为数组并排序
    const ipStatsArray = Object.values(ipStats)
      .sort((a, b) => b.count - a.count);

    const postStatsArray = Object.values(postStats)
      .sort((a, b) => b.count - a.count);

    // 准备日期图表数据（最近30天）
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

    // 准备小时图表数据
    const hourChartData = [];
    for (let i = 0; i < 24; i++) {
      hourChartData.push({
        hour: i,
        count: hourStats[i] || 0
      });
    }

    // 准备浏览器图表数据（Top 8）
    const browserChartData = Object.entries(browserStats)
      .map(([browser, count]) => ({ browser, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // 准备星期图表数据
    const weekdayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekdayChartData = [];
    for (let i = 0; i < 7; i++) {
      weekdayChartData.push({
        weekday: weekdayNames[i],
        count: weekdayStats[i] || 0
      });
    }

    // 准备最受欢迎文章图表数据（Top 10）
    const popularPostsChartData = postStatsArray.slice(0, 10).map(post => ({
      name: post.filePath.length > 30 ? post.filePath.substring(0, 30) + '...' : post.filePath,
      count: post.count
    }));

    // 准备设备类型图表数据
    const deviceChartData = Object.entries(deviceStats)
      .map(([device, count]) => ({ device, count }))
      .sort((a, b) => b.count - a.count);

    // 准备访问深度图表数据
    const depthChartData = Object.entries(depthStats)
      .map(([depth, count]) => ({ depth, count }));

    // 准备访问来源图表数据
    const referrerChartData = Object.entries(referrerStats)
      .map(([referrer, count]) => ({ referrer, count }))
      .sort((a, b) => b.count - a.count);

    // 计算用户留存率
    const totalUsers = ipStatsArray.length;
    const returningUserCount = Object.keys(returningUsers).length;
    const retentionRate = totalUsers > 0 ? ((returningUserCount / totalUsers) * 100).toFixed(1) : 0;

    // 计算平均访问深度
    const avgDepth = totalUsers > 0 ? (Object.values(ipStats).reduce((sum, user) => sum + user.posts, 0) / totalUsers).toFixed(1) : 0;

    res.json({
      summary: {
        totalViews: stats.totalViews,
        totalPosts: Object.keys(stats.postViews).length,
        totalIPs: ipStatsArray.length,
        totalRecords: accessLog.length,
        returningUsers: returningUserCount,
        retentionRate: retentionRate,
        avgDepth: avgDepth
      },
      ipStats: ipStatsArray,
      postStats: postStatsArray,
      dateChart: dateChartData,
      hourChart: hourChartData,
      browserChart: browserChartData,
      weekdayChart: weekdayChartData,
      deviceChart: deviceChartData,
      depthChart: depthChartData,
      referrerChart: referrerChartData,
      popularPostsChart: popularPostsChartData,
      recentLogs: accessLog.slice(-50).reverse() // 最近50条记录
    });
  } catch (error) {
    console.error('获取管理统计失败:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
