const express = require('express');
const router = express.Router();
const ReportService = require('../services/reportService');
const WebsiteService = require('../services/WebsiteStorage');
const moment = require('moment');

const reportService = new ReportService();
const websiteService = new WebsiteService();

// 匯出 CSV 監控數據
router.get('/:websiteId/csv', async (req, res) => {
  try {
    const { websiteId } = req.params;
    const { range = '24h', format = 'csv' } = req.query;
    
    // 驗證時間範圍
    const validRanges = ['1h', '6h', '12h', '24h', '1w', '1m'];
    if (!validRanges.includes(range)) {
      return res.status(400).json({
        success: false,
        error: '無效的時間範圍',
        validRanges
      });
    }

    const website = await websiteService.getById(websiteId);
    const csvData = await reportService.generateCSVReport(websiteId, range);
    
    if (!website) {
      return res.status(404).json({
        success: false,
        error: '找不到指定網站'
      });
    }

    // 設定 CSV 檔案下載標頭
    const filename = `${website.name}_監控報告_${range}_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    
    // 添加 UTF-8 BOM 讓 Excel 正確識別中文
    res.write('\uFEFF');
    res.end(csvData);
    
  } catch (error) {
    console.error(`生成 CSV 報表失敗:`, error);
    res.status(500).json({
      success: false,
      error: '生成 CSV 報表失敗'
    });
  }
});

// 匯出 PDF 報表
router.get('/:websiteId/pdf', async (req, res) => {
  try {
    const { websiteId } = req.params;
    const { range = '24h' } = req.query;
    
    // 驗證時間範圍
    const validRanges = ['1h', '6h', '12h', '24h', '1w', '1m'];
    if (!validRanges.includes(range)) {
      return res.status(400).json({
        success: false,
        error: '無效的時間範圍',
        validRanges
      });
    }

    const website = await websiteService.getById(websiteId);
    const pdfBuffer = await reportService.generatePDFReport([website], range, 'summary');
    
    if (!website) {
      return res.status(404).json({
        success: false,
        error: '找不到指定網站'
      });
    }

    // 設定 PDF 檔案下載標頭
    const filename = `${website.name}_監控報告_${range}_${new Date().toISOString().split('T')[0]}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    
    res.end(pdfBuffer);
    
  } catch (error) {
    console.error(`生成 PDF 報表失敗:`, error);
    res.status(500).json({
      success: false,
      error: '生成 PDF 報表失敗'
    });
  }
});

// 匯出所有網站的統計摘要 CSV
router.get('/summary/csv', async (req, res) => {
  try {
    const { range = '24h' } = req.query;
    
    const csvData = await reportService.generateSummaryCSVReport(range);
    
    // 設定 CSV 檔案下載標頭
    const filename = `所有網站統計摘要_${range}_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    
    // 添加 UTF-8 BOM
    res.write('\uFEFF');
    res.end(csvData);
    
  } catch (error) {
    console.error(`生成摘要 CSV 報表失敗:`, error);
    res.status(500).json({
      success: false,
      error: '生成摘要 CSV 報表失敗'
    });
  }
});

// 預覽報表數據
router.get('/:websiteId/preview', async (req, res) => {
  try {
    const { websiteId } = req.params;
    const { range = '24h' } = req.query;
    
    const preview = await reportService.generateReportPreview(websiteId, range);
    
    res.json({
      success: true,
      data: preview
    });
    
  } catch (error) {
    console.error(`生成報表預覽失敗:`, error);
    res.status(500).json({
      success: false,
      error: '生成報表預覽失敗'
    });
  }
});

// 生成多網站綜合PDF報表
router.get('/pdf/comprehensive', async (req, res) => {
  try {
    const { websites: websiteIds, timeRange = '24h', type = 'summary' } = req.query;

    // 驗證時間範圍
    const validTimeRanges = ['1h', '6h', '24h', '7d', '30d'];
    if (!validTimeRanges.includes(timeRange)) {
      return res.status(400).json({
        error: '無效的時間範圍',
        validRanges: validTimeRanges
      });
    }

    // 驗證報表類型
    const validTypes = ['summary', 'detailed'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: '無效的報表類型',
        validTypes: validTypes
      });
    }

    // 獲取要包含在報表中的網站
    let websites;
    if (websiteIds) {
      const ids = websiteIds.split(',').map(id => id.trim()).filter(id => id);
      websites = await Promise.all(
        ids.map(async (id) => {
          try {
            return await websiteService.getById(id);
          } catch (error) {
            console.warn(`Website ${id} not found:`, error.message);
            return null;
          }
        })
      );
      websites = websites.filter(w => w !== null);
    } else {
      websites = await websiteService.getAll();
    }

    if (websites.length === 0) {
      return res.status(404).json({
        error: '找不到要生成報表的網站'
      });
    }

    console.log(`Generating comprehensive ${type} PDF report for ${websites.length} websites with ${timeRange} time range`);

    // 使用新的報表服務生成PDF
    const newReportService = require('../services/reportService');
    const newReportServiceInstance = new newReportService();
    const pdfBuffer = await newReportServiceInstance.generatePDFReport(websites, timeRange, type);

    // 設定檔案名稱
    const timestamp = moment().format('YYYYMMDD_HHmmss');
    const filename = `comprehensive_monitor_report_${type}_${timeRange}_${timestamp}.pdf`;

    // 設定回應標頭
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // 發送PDF
    res.send(pdfBuffer);

    console.log(`Comprehensive PDF report generated successfully: ${filename}`);

  } catch (error) {
    console.error('Comprehensive PDF report generation failed:', error);
    res.status(500).json({
      error: 'PDF報表生成失敗',
      message: error.message
    });
  }
});

// 獲取報表生成選項
router.get('/options', async (req, res) => {
  try {
    const websites = await websiteService.getAll();
    
    res.json({
      success: true,
      data: {
        timeRanges: [
          { value: '1h', label: '過去1小時' },
          { value: '6h', label: '過去6小時' },
          { value: '24h', label: '過去24小時' },
          { value: '7d', label: '過去7天' },
          { value: '30d', label: '過去30天' }
        ],
        reportTypes: [
          { value: 'summary', label: '摘要報表' },
          { value: 'detailed', label: '詳細報表' }
        ],
        websites: websites.map(w => ({
          id: w.id,
          name: w.name,
          url: w.url,
          status: w.status
        }))
      }
    });
  } catch (error) {
    console.error('Failed to get report options:', error);
    res.status(500).json({
      error: '獲取報表選項失敗',
      message: error.message
    });
  }
});

module.exports = router;