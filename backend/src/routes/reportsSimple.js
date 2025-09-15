const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const moment = require('moment');
const WebsiteService = require('../services/WebsiteStorage');

const websiteService = new WebsiteService();

// 生成簡化版PDF報表
router.get('/pdf/simple', async (req, res) => {
  try {
    const { timeRange = '24h', type = 'summary' } = req.query;

    console.log(`Generating simple PDF report with ${timeRange} time range`);

    // 獲取網站列表
    const websites = await websiteService.getAll();

    if (websites.length === 0) {
      return res.status(404).json({
        error: '找不到要生成報表的網站'
      });
    }

    // 生成PDF
    const pdfBuffer = await generateSimplePDF(websites, timeRange);

    // 設定檔案名稱
    const timestamp = moment().format('YYYYMMDD_HHmmss');
    const filename = `website_monitor_report_${timestamp}.pdf`;

    // 設定回應標頭
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // 發送PDF
    res.send(pdfBuffer);

    console.log(`Simple PDF report generated successfully: ${filename}`);

  } catch (error) {
    console.error('Simple PDF report generation failed:', error);
    res.status(500).json({
      error: 'PDF報表生成失敗',
      message: error.message
    });
  }
});

// 獲取報表選項
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

// 簡化版PDF生成函數
async function generateSimplePDF(websites, timeRange) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        margin: 50,
        info: {
          Title: '網站監控系統報表',
          Author: 'Website Monitor System',
          Subject: '網站監控數據報表',
          Creator: 'Website Monitor v2.8'
        }
      });
      const chunks = [];
      
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      
      // 設定字體編碼和中文支援
      // PDFKit 預設支援 UTF-8，直接使用內建字體但確保編碼正確
      console.log('PDF 生成使用 UTF-8 編碼');
      
      const timeRangeText = getTimeRangeText(timeRange);
      const currentTime = moment().format('YYYY-MM-DD HH:mm:ss');
      
      // 標題
      doc.fontSize(20).fillColor('#1976D2').text('網站監控系統報表', { align: 'center' });
      doc.moveDown();
      
      // 報表資訊
      doc.fontSize(12).fillColor('#666')
         .text(`報表時間範圍: ${timeRangeText}`, { align: 'center' })
         .text(`生成時間: ${currentTime}`, { align: 'center' });
      doc.moveDown(2);
      
      // 摘要統計
      const stats = calculateStats(websites);
      doc.fontSize(16).fillColor('#1976D2').text('摘要統計');
      doc.moveDown();
      
      doc.fontSize(12).fillColor('#333')
         .text(`監控網站總數: ${stats.total}`)
         .text(`健康網站: ${stats.healthy}`, { continued: true })
         .fillColor('#4CAF50').text(` (${((stats.healthy / stats.total) * 100).toFixed(1)}%)`)
         .fillColor('#333').text(`異常網站: ${stats.unhealthy}`, { continued: true })
         .fillColor('#f44336').text(` (${((stats.unhealthy / stats.total) * 100).toFixed(1)}%)`)
         .fillColor('#333').text(`待檢查網站: ${stats.pending}`);
      
      doc.moveDown(2);
      
      // 網站詳情表格
      doc.fontSize(16).fillColor('#1976D2').text('網站監控詳情');
      doc.moveDown();
      
      // 表格標題
      doc.fontSize(10).fillColor('#333');
      const tableTop = doc.y;
      const tableHeaders = ['網站名稱', '狀態', 'URL'];
      const columnWidths = [180, 80, 220];
      let currentX = 50;
      
      tableHeaders.forEach((header, i) => {
        doc.text(header, currentX, tableTop, { width: columnWidths[i], align: 'left' });
        currentX += columnWidths[i];
      });
      
      doc.moveDown();
      
      // 表格內容
      websites.forEach((site) => {
        const rowY = doc.y;
        currentX = 50;
        
        // 網站名稱
        doc.fillColor('#333').text(site.name.length > 25 ? site.name.substring(0, 22) + '...' : site.name, 
                     currentX, rowY, { width: columnWidths[0], align: 'left' });
        currentX += columnWidths[0];
        
        // 狀態
        const statusColor = site.status === 'healthy' ? '#4CAF50' : 
                           site.status === 'unhealthy' ? '#f44336' : '#FF9800';
        doc.fillColor(statusColor).text(getStatusText(site.status), 
                                        currentX, rowY, { width: columnWidths[1], align: 'left' });
        currentX += columnWidths[1];
        
        // URL
        doc.fillColor('#333').text(site.url.length > 40 ? site.url.substring(0, 37) + '...' : site.url, 
                     currentX, rowY, { width: columnWidths[2], align: 'left' });
        
        doc.moveDown(0.5);
        
        // 分頁處理
        if (doc.y > 700) {
          doc.addPage();
        }
      });
      
      // 頁尾
      doc.moveDown(2);
      doc.fontSize(10).fillColor('#666')
         .text('本報表由網站監控系統自動生成 | 系統版本: v2.8', { align: 'center' });
      
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

function calculateStats(websites) {
  return {
    total: websites.length,
    healthy: websites.filter(w => w.status === 'healthy').length,
    unhealthy: websites.filter(w => w.status === 'unhealthy').length,
    pending: websites.filter(w => w.status === 'pending').length
  };
}

function getTimeRangeText(timeRange) {
  switch (timeRange) {
    case '1h': return '過去1小時';
    case '6h': return '過去6小時';
    case '24h': return '過去24小時';
    case '7d': return '過去7天';
    case '30d': return '過去30天';
    default: return '過去24小時';
  }
}

function getStatusText(status) {
  switch (status) {
    case 'healthy': return '正常';
    case 'unhealthy': return '異常';
    case 'pending': return '待檢查';
    default: return '未知';
  }
}

module.exports = router;