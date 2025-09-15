const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

// GPT 服務 - 可選模組
let gptAnalysisService = null;
try {
  gptAnalysisService = require('../services/gptAnalysisService');
} catch (error) {
  console.log('⚠️ GPT 服務不可用於狀態檢查:', error.message);
}

// OpenAI 設定文件路徑
const OPENAI_SETTINGS_FILE = path.join(__dirname, '../../data/openai-settings.json');

// AI 服務狀態檢查
router.get('/status', async (req, res) => {
  try {
    const status = gptAnalysisService ? gptAnalysisService.getStatus() : {
      configured: false,
      model: 'unavailable',
      fallbackEnabled: true,
      status: 'gpt_service_unavailable'
    };
    
    res.json({
      success: true,
      ...status,
      message: status.configured ? 
        'GPT AI 服務已配置並可用' : 
        '需要設置 OPENAI_API_KEY 環境變數啟用 GPT AI',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 測試 GPT 分析功能
router.post('/test-analysis', async (req, res) => {
  try {
    const { websiteName = 'Test Website' } = req.body;
    
    // 模擬測試數據
    const mockStats = {
      avgResponseTime: 150,
      minResponseTime: 80,
      maxResponseTime: 450,
      uptime: 99.8
    };
    
    const mockMetrics = Array.from({ length: 100 }, (_, i) => ({
      responseTime: 100 + Math.random() * 200,
      timestamp: Date.now() - (i * 5 * 60 * 1000), // 每5分鐘一個數據點
      status: 'up'
    }));
    
    if (!gptAnalysisService) {
      return res.json({
        success: false,
        message: 'GPT 服務不可用，回退到規則引擎',
        timestamp: new Date().toISOString()
      });
    }
    
    console.log('🧪 測試 GPT 分析功能...');
    const analysis = await gptAnalysisService.generateAnalysis(mockStats, mockMetrics, websiteName);
    
    res.json({
      success: true,
      analysis,
      message: `GPT 分析${analysis.source === 'gpt' ? '成功' : '回退到規則引擎'}`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('GPT 分析測試失敗:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 儲存 OpenAI 設定
router.post('/settings', async (req, res) => {
  try {
    const settings = req.body;
    
    // 驗證設定格式
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({
        success: false,
        error: '無效的設定格式',
        timestamp: new Date().toISOString()
      });
    }

    // 確保 data 目錄存在
    const dataDir = path.dirname(OPENAI_SETTINGS_FILE);
    await fs.mkdir(dataDir, { recursive: true });

    // 如果前端沒有提供 API Key（避免遮蔽版本覆蓋），則保持現有的 API Key
    let finalSettings = { ...settings };
    if (!settings.apiKey) {
      try {
        const existingData = await fs.readFile(OPENAI_SETTINGS_FILE, 'utf8');
        const existingSettings = JSON.parse(existingData);
        if (existingSettings.apiKey) {
          finalSettings.apiKey = existingSettings.apiKey;
          console.log('保持現有的 API Key');
        }
      } catch (error) {
        console.log('無現有設定檔，使用新設定');
      }
    }

    // 儲存設定
    await fs.writeFile(OPENAI_SETTINGS_FILE, JSON.stringify(finalSettings, null, 2), 'utf8');

    // 重新載入 GPT 服務設定
    if (gptAnalysisService) {
      // 清除 require 快取並重新載入模組
      delete require.cache[require.resolve('../services/gptAnalysisService')];
      gptAnalysisService = require('../services/gptAnalysisService');
      console.log('🔧 OpenAI 設定已更新並重載 GPT 服務（清除快取）');
    } else {
      console.log('🔧 OpenAI 設定已更新（GPT 服務不可用）');
    }

    res.json({
      success: true,
      message: 'OpenAI 設定已儲存',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('儲存 OpenAI 設定失敗:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 載入 OpenAI 設定
router.get('/settings', async (req, res) => {
  try {
    let settings = {
      enabled: false,
      apiKey: '',
      model: 'gpt-3.5-turbo',
      temperature: 0.3,
      maxTokens: 500
    };

    try {
      const data = await fs.readFile(OPENAI_SETTINGS_FILE, 'utf8');
      const savedSettings = JSON.parse(data);
      settings = { ...settings, ...savedSettings };
    } catch (error) {
      // 文件不存在或讀取失敗，使用預設設定
      console.log('使用預設 OpenAI 設定');
    }

    // 出於安全考慮，不返回完整 API Key，只返回遮蔽版本
    const maskedSettings = {
      ...settings,
      apiKey: settings.apiKey ? `sk-...${settings.apiKey.slice(-4)}` : ''
    };

    res.json({
      success: true,
      settings: maskedSettings,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('載入 OpenAI 設定失敗:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;