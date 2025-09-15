const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cron = require('node-cron');
const path = require('path');

const websiteRoutes = require('./routes/websites');
const metricsRoutes = require('./routes/metrics');
const alertRoutes = require('./routes/alerts');
const websiteReportsRoutes = require('./routes/websiteReports');
const reportRoutes = require('./routes/reports');
const reportUTF8Routes = require('./routes/reportsUTF8');
const reportCleanRoutes = require('./routes/reportsClean');
const settingsRoutes = require('./routes/settings');
const MonitorService = require('./services/MonitorService');
const InfluxService = require('./services/InfluxService');

const app = express();
const PORT = process.env.PORT || 3001;

// 中介軟體
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 靜態文件服務 - 提供上傳的文件
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 路由 - 優先處理 websiteReports 路由（單一網站報表）
app.use('/api/websites', websiteRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/reports', websiteReportsRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/reports', reportUTF8Routes);
app.use('/api/reports', reportCleanRoutes);

// 測試PDF路由
const testPdfRoutes = require('./routes/testPdf');
app.use('/api/test-pdf', testPdfRoutes);

// AI 狀態和測試路由
const aiStatusRoutes = require('./routes/aiStatus');
app.use('/api/ai', aiStatusRoutes);

// 健康檢查
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// 監控統計
app.get('/api/monitoring/stats', (req, res) => {
  try {
    const stats = monitorService.getMonitoringStats();
    res.json({
      success: true,
      data: {
        ...stats,
        timestamp: new Date().toISOString(),
        initialized: monitorInitialized
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 初始化服務
const influxService = new InfluxService();
const monitorService = new MonitorService(influxService);

// 將服務設為 app.locals 供路由使用
app.locals.monitorService = monitorService;
app.locals.websiteStorage = monitorService.websiteStorage;

// 設定 AlertService 到路由中
alertRoutes.setAlertService(monitorService.alertService);

// 平衡監控初始化 - 每5分鐘檢查一次是否有新網站需要初始化
let monitorInitialized = false;

// 立即初始化監控
(async () => {
  try {
    console.log('初始化平衡監控系統...');
    await monitorService.checkAllWebsites();
    monitorInitialized = true;
    console.log('平衡監控系統初始化完成');
  } catch (error) {
    console.error('監控初始化錯誤:', error);
  }
})();

// 定期檢查新網站並初始化監控
cron.schedule('*/5 * * * *', async () => {
  try {
    if (monitorInitialized) {
      console.log('檢查新網站並初始化監控...');
      await monitorService.checkAllWebsites();
    }
  } catch (error) {
    console.error('監控檢查錯誤:', error);
  }
});

// 錯誤處理
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: '伺服器內部錯誤',
    message: process.env.NODE_ENV === 'production' ? '請稍後再試' : err.message
  });
});

// 404 處理
app.use('*', (req, res) => {
  res.status(404).json({ error: '找不到請求的資源' });
});

app.listen(PORT, () => {
  console.log(`Website Monitor Backend 已啟動於 port ${PORT}`);
  console.log(`環境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`監控統計: ${process.env.NODE_ENV === 'development' ? 'http://localhost:' + PORT + '/api/monitoring/stats' : ''}`);
});

// 優雅關閉處理
process.on('SIGTERM', () => {
  console.log('收到 SIGTERM 信號，準備關閉服務...');
  monitorService.cleanup();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('收到 SIGINT 信號，準備關閉服務...');
  monitorService.cleanup();
  process.exit(0);
});