const express = require('express');
const router = express.Router();
const Website = require('../models/Website');
const WebsiteStorage = require('../services/WebsiteStorage');

// websiteStorage 將由 app.locals 提供

// 取得所有網站
router.get('/', async (req, res) => {
  try {
        const websites = await req.app.locals.websiteStorage.getAll();
    res.json({
      success: true,
      data: websites.map(w => w.toJSON()),
      count: websites.length
    });
  } catch (error) {
    console.error('取得網站列表失敗:', error);
    res.status(500).json({
      success: false,
      error: '取得網站列表失敗'
    });
  }
});

// 取得單一網站
router.get('/:id', async (req, res) => {
  try {
        const website = await req.app.locals.websiteStorage.getById(req.params.id);
    
    if (!website) {
      return res.status(404).json({
        success: false,
        error: '找不到指定的網站'
      });
    }
    
    res.json({
      success: true,
      data: website.toJSON()
    });
  } catch (error) {
    console.error('取得網站資料失敗:', error);
    res.status(500).json({
      success: false,
      error: '取得網站資料失敗'
    });
  }
});

// 新增網站
router.post('/', async (req, res) => {
  try {
        const { url, name, interval, keyword, statusCodeRange, dataRetention } = req.body;
    
    // 驗證輸入資料
    const errors = Website.validate(req.body);
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: '輸入資料驗證失敗',
        details: errors
      });
    }
    
        const website = await req.app.locals.websiteStorage.create({
      url,
      name,
      interval,
      keyword,
      statusCodeRange,
      dataRetention
    });
    
    res.status(201).json({
      success: true,
      message: '網站新增成功',
      data: website.toJSON()
    });
    
  } catch (error) {
    console.error('新增網站失敗:', error);
    
    if (error.message === '此 URL 已存在於監控列表中') {
      return res.status(409).json({
        success: false,
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      error: '新增網站失敗'
    });
  }
});

// 更新網站
router.put('/:id', async (req, res) => {
  try {
    const { url, name, interval, keyword, statusCodeRange, enabled, dataRetention } = req.body;
    
    // 驗證輸入資料
    const errors = Website.validate(req.body);
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: '輸入資料驗證失敗',
        details: errors
      });
    }
    
        const website = await req.app.locals.websiteStorage.update(req.params.id, {
      url,
      name,
      interval,
      keyword,
      statusCodeRange,
      enabled,
      dataRetention
    });
    
    res.json({
      success: true,
      message: '網站更新成功',
      data: website.toJSON()
    });
    
  } catch (error) {
    console.error('更新網站失敗:', error);
    
    if (error.message === '找不到指定的網站') {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      error: '更新網站失敗'
    });
  }
});

// 暫停監控
router.post('/:id/pause', async (req, res) => {
  try {
        const website = await req.app.locals.websiteStorage.getById(req.params.id);
    if (!website) {
      return res.status(404).json({
        success: false,
        error: '找不到指定的網站'
      });
    }

    if (!website.enabled) {
      return res.json({
        success: true,
        message: '網站監控已經是暫停狀態',
        data: website.toJSON()
      });
    }

        const updatedWebsite = await req.app.locals.websiteStorage.update(req.params.id, {
      enabled: false,
      lastDisabledAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    // 通知監控服務停止此網站的監控
    const app = req.app;
    if (app.locals.monitorService) {
      app.locals.monitorService.stopMonitoring(req.params.id);
    }
    
    res.json({
      success: true,
      message: '網站監控已暫停',
      data: updatedWebsite.toJSON()
    });
    
  } catch (error) {
    console.error('暫停網站監控失敗:', error);
    res.status(500).json({
      success: false,
      error: '暫停網站監控失敗'
    });
  }
});

// 恢復監控
router.post('/:id/resume', async (req, res) => {
  try {
        const website = await req.app.locals.websiteStorage.getById(req.params.id);
    if (!website) {
      return res.status(404).json({
        success: false,
        error: '找不到指定的網站'
      });
    }

    if (website.enabled) {
      return res.json({
        success: true,
        message: '網站監控已經在運行中',
        data: website.toJSON()
      });
    }

        const updatedWebsite = await req.app.locals.websiteStorage.update(req.params.id, {
      enabled: true,
      lastEnabledAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    // 通知監控服務開始此網站的監控
    const app = req.app;
    if (app.locals.monitorService) {
      app.locals.monitorService.startMonitoring(updatedWebsite);
    }
    
    res.json({
      success: true,
      message: '網站監控已恢復',
      data: updatedWebsite.toJSON()
    });
    
  } catch (error) {
    console.error('恢復網站監控失敗:', error);
    res.status(500).json({
      success: false,
      error: '恢復網站監控失敗'
    });
  }
});

// 刪除網站
router.delete('/:id', async (req, res) => {
  try {
        const website = await req.app.locals.websiteStorage.delete(req.params.id);
    
    // 通知監控服務停止此網站的監控
    const app = req.app;
    if (app.locals.monitorService) {
      app.locals.monitorService.stopMonitoring(req.params.id);
    }
    
    res.json({
      success: true,
      message: '網站刪除成功',
      data: website.toJSON()
    });
    
  } catch (error) {
    console.error('刪除網站失敗:', error);
    
    if (error.message === '找不到指定的網站') {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      error: '刪除網站失敗'
    });
  }
});

// 取得統計資料
router.get('/stats/overview', async (req, res) => {
  try {
        const stats = await req.app.locals.websiteStorage.getStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('取得統計資料失敗:', error);
    res.status(500).json({
      success: false,
      error: '取得統計資料失敗'
    });
  }
});

module.exports = router;