const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const moment = require('moment');
const WebsiteService = require('../services/WebsiteStorage');

const websiteService = new WebsiteService();

// 生成UTF-8編碼的PDF報表
router.get('/pdf/utf8', async (req, res) => {
  try {
    const { timeRange = '24h', type = 'summary' } = req.query;

    console.log(`Generating UTF-8 PDF report with ${timeRange} time range`);

    // 獲取網站列表
    const websites = await websiteService.getAll();

    if (websites.length === 0) {
      return res.status(404).json({
        error: '找不到要生成報表的網站'
      });
    }

    // 生成PDF
    const pdfBuffer = await generateUTF8PDF(websites, timeRange);

    // 設定檔案名稱
    const timestamp = moment().format('YYYYMMDD_HHmmss');
    const filename = `website_monitor_report_utf8_${timestamp}.pdf`;

    // 設定回應標頭支援UTF-8
    res.setHeader('Content-Type', 'application/pdf; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename*=utf-8''${encodeURIComponent(filename)}`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // 發送PDF
    res.send(pdfBuffer);

    console.log(`UTF-8 PDF report generated successfully: ${filename}`);

  } catch (error) {
    console.error('UTF-8 PDF report generation failed:', error);
    res.status(500).json({
      error: 'PDF報表生成失敗',
      message: error.message
    });
  }
});

// UTF-8 PDF生成函數
async function generateUTF8PDF(websites, timeRange) {
  return new Promise((resolve, reject) => {
    try {
      // 使用支援Unicode的PDFDocument配置
      const doc = new PDFDocument({ 
        margin: 50,
        autoFirstPage: false,  // 手動控制頁面
        bufferPages: true,     // 緩存頁面
        info: {
          Title: 'Website Monitor Report',
          Author: 'Website Monitor System',
          Subject: 'Website Monitoring Data Report',
          Creator: 'Website Monitor v3.2'
        }
      });

      // 使用您提供的 Noto Sans TC 字體
      try {
        const fontPath = './src/fonts/NotoSansTC-VariableFont_wght.ttf';
        doc.registerFont('NotoSansTC', fontPath);
        doc.font('NotoSansTC');
        console.log('成功載入 Noto Sans TC 字體');
      } catch (error) {
        console.log('載入 Noto Sans TC 字體失敗，使用預設字體:', error.message);
      }
      
      const chunks = [];
      
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      
      // 添加頁面
      doc.addPage();
      
      const timeRangeText = getTimeRangeText(timeRange);
      const currentTime = moment().format('YYYY-MM-DD HH:mm:ss');
      
      // 標題 - 使用英文避免字體問題
      doc.fontSize(24).fillColor('#1976D2').text('Website Monitor Report', { align: 'center' });
      doc.fontSize(18).fillColor('#1976D2').text('网站监控系统报表', { align: 'center' });
      doc.moveDown();
      
      // 報表資訊
      doc.fontSize(12).fillColor('#666')
         .text(`Time Range | 时间范围: ${timeRangeText}`, { align: 'center' })
         .text(`Generated | 生成时间: ${currentTime}`, { align: 'center' });
      doc.moveDown(2);
      
      // 摘要統計
      const stats = calculateStats(websites);
      doc.fontSize(16).fillColor('#1976D2').text('Summary | 摘要统计');
      doc.moveDown();
      
      doc.fontSize(12).fillColor('#333')
         .text(`Total Websites | 监控网站总数: ${stats.total}`)
         .text(`Healthy | 健康网站: ${stats.healthy} (${((stats.healthy / stats.total) * 100).toFixed(1)}%)`)
         .text(`Unhealthy | 异常网站: ${stats.unhealthy} (${((stats.unhealthy / stats.total) * 100).toFixed(1)}%)`)
         .text(`Pending | 待检查网站: ${stats.pending}`);
      
      doc.moveDown(2);
      
      // 網站詳情表格
      doc.fontSize(16).fillColor('#1976D2').text('Website Details | 网站监控详情');
      doc.moveDown();
      
      // 表格標題
      doc.fontSize(10).fillColor('#333');
      const tableTop = doc.y;
      const tableHeaders = ['Website | 网站名称', 'Status | 状态', 'URL'];
      const columnWidths = [180, 100, 200];
      let currentX = 50;
      
      // 畫表格標題背景
      doc.rect(40, tableTop - 5, 490, 20).fillColor('#f5f5f5').fill();
      
      // 表格標題文字
      tableHeaders.forEach((header, i) => {
        doc.fillColor('#333').text(header, currentX, tableTop, { width: columnWidths[i], align: 'left' });
        currentX += columnWidths[i];
      });
      
      doc.moveDown();
      
      // 表格內容
      websites.forEach((site, index) => {
        const rowY = doc.y;
        currentX = 50;
        
        // 交替行背景
        if (index % 2 === 1) {
          doc.rect(40, rowY - 2, 490, 16).fillColor('#fafafa').fill();
        }
        
        // 網站名稱 (截斷過長名稱)
        const siteName = site.name.length > 20 ? site.name.substring(0, 17) + '...' : site.name;
        doc.fillColor('#333').text(siteName, currentX, rowY, { width: columnWidths[0], align: 'left' });
        currentX += columnWidths[0];
        
        // 狀態 (雙語)
        const statusText = getStatusText(site.status);
        const statusColor = site.status === 'healthy' ? '#4CAF50' : 
                           site.status === 'unhealthy' ? '#f44336' : '#FF9800';
        doc.fillColor(statusColor).text(statusText, currentX, rowY, { width: columnWidths[1], align: 'left' });
        currentX += columnWidths[1];
        
        // URL (截斷過長URL)
        const url = site.url.length > 35 ? site.url.substring(0, 32) + '...' : site.url;
        doc.fillColor('#333').text(url, currentX, rowY, { width: columnWidths[2], align: 'left' });
        
        doc.moveDown(0.5);
        
        // 分頁處理
        if (doc.y > 700) {
          doc.addPage();
        }
      });
      
      // 頁尾
      doc.moveDown(2);
      doc.fontSize(10).fillColor('#666')
         .text('Generated by Website Monitor System v3.2 | 网站监控系统自动生成', { align: 'center' });
      
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
  const ranges = {
    '1h': 'Past 1 Hour | 过去1小时',
    '6h': 'Past 6 Hours | 过去6小时',
    '24h': 'Past 24 Hours | 过去24小时',
    '7d': 'Past 7 Days | 过去7天',
    '30d': 'Past 30 Days | 过去30天'
  };
  return ranges[timeRange] || 'Past 24 Hours | 过去24小时';
}

function getStatusText(status) {
  const statusMap = {
    'healthy': 'Normal | 正常',
    'unhealthy': 'Error | 异常', 
    'pending': 'Pending | 待检查'
  };
  return statusMap[status] || 'Unknown | 未知';
}

module.exports = router;