const express = require('express');
const router = express.Router();

let alertService; // 會在 app.js 中設定

// 設定 AlertService 實例
router.setAlertService = (service) => {
  alertService = service;
};

// 取得告警設定
router.get('/settings', async (req, res) => {
  try {
    const settings = alertService.getSettings();
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 更新告警設定
router.put('/settings', async (req, res) => {
  try {
    const settings = await alertService.updateSettings(req.body);
    res.json({
      success: true,
      data: settings,
      message: '告警設定已更新'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 測試 Email 連線
router.post('/test/email', async (req, res) => {
  try {
    await alertService.testEmailConnection();
    res.json({
      success: true,
      message: 'Email 連線測試成功'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// 測試 Slack 連線
router.post('/test/slack', async (req, res) => {
  try {
    await alertService.testSlackConnection();
    res.json({
      success: true,
      message: 'Slack 連線測試成功'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// 發送測試告警
router.post('/test/send', async (req, res) => {
  try {
    const testWebsite = {
      id: 'test-001',
      name: '測試網站',
      url: 'https://example.com'
    };
    
    const testMetrics = {
      responseTime: 1234,
      statusCode: 200,
      errorMessage: '這是一個測試告警'
    };

    await alertService.sendAlert(
      testWebsite,
      'failure',
      '測試告警訊息',
      testMetrics
    );

    res.json({
      success: true,
      message: '測試告警已發送'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;