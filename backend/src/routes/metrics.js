const express = require('express');
const router = express.Router();
const InfluxService = require('../services/InfluxService');

const influxService = new InfluxService();

/**
 * 智能化SLA計算 - 過濾瞬間網絡抖動
 * 業界標準：連續故障或短時間內多次故障才算真實服務中斷
 * 根據監控間隔動態調整檢測邏輯
 */
function calculateSmartSLA(metrics, monitoringInterval = 300) {
  const realOutages = [];
  const filteredMetrics = [];
  
  for (let i = 0; i < metrics.length; i++) {
    const current = metrics[i];
    
    if (current.isHealthy) {
      // 正常狀態直接計入
      filteredMetrics.push(current);
    } else {
      // 故障狀態需要驗證是否為真實故障
      const isRealOutage = validateRealOutage(metrics, i, monitoringInterval);
      
      if (isRealOutage) {
        realOutages.push(current);
        // 真實故障計入SLA
      } else {
        // 瞬間抖動，視為成功（容錯處理）
        filteredMetrics.push({ ...current, isHealthy: true });
      }
    }
  }
  
  return {
    realOutages,
    filteredSuccessfulChecks: filteredMetrics.filter(m => m.isHealthy).length
  };
}

/**
 * 驗證是否為真實服務故障
 * 根據監控間隔動態調整邏輯
 */
function validateRealOutage(metrics, currentIndex, monitoringInterval = 300) {
  const current = metrics[currentIndex];
  
  // 條件1：嚴重錯誤直接算故障（不受監控間隔影響）
  if (current.responseTime > 30000) { // 超過30秒肯定是真實故障
    return true;
  }
  
  if (current.statusCode >= 500 && current.statusCode < 600) { // 5xx服務器錯誤
    return true;
  }
  
  // 條件2：網絡抖動識別（狀態碼0通常是網絡問題）
  if (current.statusCode === 0 && current.responseTime === 0) {
    // 檢查前後狀態來判斷是否為瞬間抖動
    const prev = metrics[currentIndex - 1];
    const next = metrics[currentIndex + 1];
    
    if (prev && next && prev.isHealthy && next.isHealthy) {
      return false; // 前後都正常，視為瞬間網絡抖動
    }
  }
  
  // 條件3：連續故障檢測（業界標準：2-3次連續失敗）
  // 根據監控間隔調整，但遵循業界標準
  let consecutiveFailures = 1; // 當前已經是1次故障
  const maxCheckRange = Math.max(2, Math.ceil(300 / monitoringInterval)); // 最多檢查5分鐘範圍
  
  // 向前檢查
  for (let i = 1; i <= maxCheckRange; i++) {
    const prevMetric = metrics[currentIndex - i];
    if (prevMetric && !prevMetric.isHealthy) {
      consecutiveFailures++;
    } else {
      break;
    }
  }
  
  // 向後檢查
  for (let i = 1; i <= maxCheckRange; i++) {
    const nextMetric = metrics[currentIndex + i];
    if (nextMetric && !nextMetric.isHealthy) {
      consecutiveFailures++;
    } else {
      break;
    }
  }
  
  // 業界標準：2次連續失敗算真實故障（但至少要持續超過單次監控間隔）
  const minConsecutiveFailures = monitoringInterval <= 60 ? 3 : 2; // 1分鐘以下需要3次，其他2次
  if (consecutiveFailures >= minConsecutiveFailures) {
    return true;
  }
  
  // 條件4：時間窗口檢測（業界標準：較短窗口，較低閾值）
  // 調整為更接近業界標準：15分鐘窗口，15%故障率
  const timeWindow = 15 * 60 * 1000; // 15分鐘窗口（業界標準）
  const currentTime = new Date(current.timestamp);
  const windowStart = new Date(currentTime.getTime() - timeWindow);
  const windowEnd = new Date(currentTime.getTime() + timeWindow);
  
  const windowMetrics = metrics.filter(m => {
    const metricTime = new Date(m.timestamp);
    return metricTime >= windowStart && metricTime <= windowEnd;
  });
  
  const failuresInWindow = windowMetrics.filter(m => !m.isHealthy).length;
  const expectedChecksInWindow = Math.ceil(timeWindow / 1000 / monitoringInterval);
  
  // 業界標準：15%故障率，但至少2次故障
  const failureRateThreshold = 0.15; // 15%故障率
  const minAbsoluteFailures = 2; // 至少2次故障
  const failureThreshold = Math.max(minAbsoluteFailures, Math.ceil(expectedChecksInWindow * failureRateThreshold));
  
  // 15分鐘內故障次數超過閾值，認為是真實問題
  if (failuresInWindow >= failureThreshold) {
    return true;
  }
  
  // 預設：單次輕微故障視為網絡抖動
  return false;
}

// 取得資料留存資訊 - 必須在參數路由之前
router.get('/retention-info', async (req, res) => {
  try {
    const retentionInfo = influxService.getRetentionInfo();
    res.json({
      success: true,
      data: retentionInfo
    });
  } catch (error) {
    console.error('取得留存資訊失敗:', error);
    res.status(500).json({
      success: false,
      error: '取得留存資訊失敗'
    });
  }
});

// 計算停機時間
function calculateDowntime(unhealthyChecks, range) {
  if (unhealthyChecks.length === 0) {
    return '0m';
  }
  
  // 估算停機時間（假設每次檢查代表一個時間間隔）
  let intervalMinutes = 1; // 預設1分鐘間隔
  
  // 根據時間範圍調整間隔估算
  switch (range) {
    case '1h': intervalMinutes = 1; break;
    case '3h': intervalMinutes = 1; break;
    case '6h': intervalMinutes = 2; break;
    case '12h': intervalMinutes = 5; break;
    case '24h': intervalMinutes = 5; break;
    case '2d': intervalMinutes = 10; break;
    case '7d': intervalMinutes = 15; break;
    case '14d': intervalMinutes = 30; break;
    case '30d': intervalMinutes = 60; break;
    case '90d': intervalMinutes = 180; break;
  }
  
  const totalDowntimeMinutes = unhealthyChecks.length * intervalMinutes;
  
  if (totalDowntimeMinutes < 60) {
    return `${totalDowntimeMinutes}m`;
  } else if (totalDowntimeMinutes < 1440) {
    const hours = Math.floor(totalDowntimeMinutes / 60);
    const minutes = totalDowntimeMinutes % 60;
    return minutes > 0 ? `${hours}h${minutes}m` : `${hours}h`;
  } else {
    const days = Math.floor(totalDowntimeMinutes / 1440);
    const hours = Math.floor((totalDowntimeMinutes % 1440) / 60);
    return hours > 0 ? `${days}d${hours}h` : `${days}d`;
  }
}

// 取得網站監控指標
router.get('/:websiteId', async (req, res) => {
  try {
    const { websiteId } = req.params;
    const { range = '1h' } = req.query;
    
    // 驗證時間範圍格式
    const validRanges = ['1h', '3h', '6h', '12h', '24h', '2d', '7d', '14d', '30d', '90d'];
    if (!validRanges.includes(range)) {
      return res.status(400).json({
        success: false,
        error: '無效的時間範圍',
        validRanges
      });
    }
    
    const metrics = await influxService.getMetrics(websiteId, range);
    
    res.json({
      success: true,
      data: metrics,
      count: metrics.length,
      range
    });
    
  } catch (error) {
    console.error(`取得網站 ${req.params.websiteId} 的監控指標失敗:`, error);
    res.status(500).json({
      success: false,
      error: '取得監控指標失敗'
    });
  }
});

// 取得網站最新監控指標
router.get('/:websiteId/latest', async (req, res) => {
  try {
    const { websiteId } = req.params;
    
    const metrics = await influxService.getLatestMetrics(websiteId);
    
    res.json({
      success: true,
      data: metrics
    });
    
  } catch (error) {
    console.error(`取得網站 ${req.params.websiteId} 的最新監控指標失敗:`, error);
    res.status(500).json({
      success: false,
      error: '取得最新監控指標失敗'
    });
  }
});

// 取得異常事件
router.get('/:websiteId/events', async (req, res) => {
  try {
    const { websiteId } = req.params;
    const { range = '24h' } = req.query;
    
    // 驗證時間範圍格式
    const validRanges = ['1h', '3h', '6h', '12h', '24h', '2d', '7d', '14d', '30d', '90d'];
    if (!validRanges.includes(range)) {
      return res.status(400).json({
        success: false,
        error: '無效的時間範圍',
        validRanges
      });
    }
    
    const metrics = await influxService.getMetrics(websiteId, range);
    
    // 找出異常事件（狀態變化點）
    const events = [];
    let previousStatus = null;
    
    for (let i = 0; i < metrics.length; i++) {
      const metric = metrics[i];
      const currentStatus = metric.isHealthy ? 'healthy' : 'unhealthy';
      
      // 如果狀態發生變化，記錄事件
      if (previousStatus !== null && previousStatus !== currentStatus) {
        const eventType = currentStatus === 'healthy' ? 'recovery' : 'outage';
        const severity = currentStatus === 'healthy' ? 'info' : 'error';
        
        events.push({
          id: `${websiteId}-${metric.time}`,
          time: metric.time,
          type: eventType,
          severity,
          title: eventType === 'recovery' ? '服務恢復' : '服務異常',
          description: eventType === 'recovery' 
            ? `服務已恢復正常，回應時間 ${metric.responseTime}ms`
            : `服務發生異常，狀態碼 ${metric.statusCode}，回應時間 ${metric.responseTime}ms`,
          statusCode: metric.statusCode,
          responseTime: metric.responseTime,
          isHealthy: metric.isHealthy
        });
      }
      
      previousStatus = currentStatus;
    }
    
    // 按時間倒序排列（最新的在前）
    events.sort((a, b) => new Date(b.time) - new Date(a.time));
    
    res.json({
      success: true,
      data: events,
      count: events.length,
      range
    });
    
  } catch (error) {
    console.error(`取得網站 ${req.params.websiteId} 的異常事件失敗:`, error);
    res.status(500).json({
      success: false,
      error: '取得異常事件失敗'
    });
  }
});

// 取得聚合統計資料
router.get('/:websiteId/stats', async (req, res) => {
  try {
    const { websiteId } = req.params;
    const { range = '24h' } = req.query;
    
    // 檢查網站是否暫停監控
    const websiteStorage = req.app.locals.websiteStorage;
    const website = await websiteStorage.getById(websiteId);
    
    if (!website) {
      return res.status(404).json({
        success: false,
        error: '找不到指定網站'
      });
    }
    
    // 如果網站暫停監控，返回特殊狀態
    if (!website.enabled) {
      return res.json({
        success: true,
        data: {
          count: 0,
          avgResponseTime: 0,
          minResponseTime: 0,
          maxResponseTime: 0,
          uptime: null, // null 表示暫停狀態
          downtime: '監控已暫停',
          successfulChecks: 0,
          isPaused: true
        }
      });
    }
    
    const allMetrics = await influxService.getMetrics(websiteId, range);
    
    // 排除法：只計算網站最後啟用後的監控資料
    // 如果網站從未被暫停過（lastDisabledAt 為 null），則使用所有歷史記錄
    const activeMetrics = (website.lastEnabledAt && website.lastDisabledAt) ? 
      allMetrics.filter(m => new Date(m.time) >= new Date(website.lastEnabledAt)) : 
      allMetrics;
    
    // 最小樣本要求：至少需要12次檢查（約1小時監控資料）
    const MINIMUM_SAMPLE_SIZE = 12;
    
    if (activeMetrics.length < MINIMUM_SAMPLE_SIZE) {
      // 資料不足，無法計算可信的 SLA
      return res.json({
        success: true,
        data: {
          count: activeMetrics.length,
          avgResponseTime: 0,
          minResponseTime: 0,
          maxResponseTime: 0,
          uptime: null, // null 表示資料不足
          downtime: '資料不足',
          successfulChecks: 0,
          isPaused: false,
          isCalculating: true, // 標記為計算中
          sampleSize: activeMetrics.length,
          minimumRequired: MINIMUM_SAMPLE_SIZE,
          excludedCount: allMetrics.length - activeMetrics.length,
          message: `需要至少 ${MINIMUM_SAMPLE_SIZE} 次檢查資料才能計算 SLA`
        }
      });
    }
    
    const responseTimes = activeMetrics.map(m => m.responseTime).filter(rt => rt > 0);
    
    // 智能化SLA計算 - 過濾瞬間抖動（使用網站的監控間隔）
    const monitoringInterval = website.interval || 300; // 使用網站設定的監控間隔（秒）
    const { realOutages, filteredSuccessfulChecks } = calculateSmartSLA(activeMetrics, monitoringInterval);
    const successfulChecks = filteredSuccessfulChecks;
    
    // 計算停機時間（僅基於真實故障）
    const unhealthyChecks = realOutages;
    const downtime = calculateDowntime(unhealthyChecks, range);
    
    const stats = {
      count: activeMetrics.length,
      avgResponseTime: responseTimes.length > 0 ? 
        Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) : 0,
      minResponseTime: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
      maxResponseTime: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
      uptime: activeMetrics.length > 0 ? 
        Math.round((successfulChecks / activeMetrics.length) * 100 * 100) / 100 : 100,
      downtime: downtime,
      successfulChecks,
      isPaused: false,
      excludedCount: allMetrics.length - activeMetrics.length, // 被排除的記錄數
      range
    };
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error(`取得網站 ${req.params.websiteId} 的統計資料失敗:`, error);
    res.status(500).json({
      success: false,
      error: '取得統計資料失敗'
    });
  }
});

module.exports = router;