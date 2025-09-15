const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const moment = require('moment');
const WebsiteService = require('../services/WebsiteStorage');

const websiteService = new WebsiteService();

// 生成清潔版UTF-8編碼的PDF報表（使用英文為主，中文為輔）
router.get('/pdf/clean', async (req, res) => {
  try {
    const { timeRange = '24h', type = 'summary' } = req.query;

    console.log(`Generating clean UTF-8 PDF report with ${timeRange} time range`);

    // 獲取網站列表
    const websites = await websiteService.getAll();

    if (websites.length === 0) {
      return res.status(404).json({
        error: '找不到要生成報表的網站'
      });
    }

    // 生成PDF
    const pdfBuffer = await generateCleanPDF(websites, timeRange);

    // 設定檔案名稱
    const timestamp = moment().format('YYYYMMDD_HHmmss');
    const filename = `website_monitor_report_${timestamp}.pdf`;

    // 設定回應標頭支援UTF-8
    res.setHeader('Content-Type', 'application/pdf; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename*=utf-8''${encodeURIComponent(filename)}`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // 發送PDF
    res.send(pdfBuffer);

    console.log(`Clean UTF-8 PDF report generated successfully: ${filename}`);

  } catch (error) {
    console.error('Clean PDF report generation failed:', error);
    res.status(500).json({
      error: 'PDF報表生成失敗',
      message: error.message
    });
  }
});

// 清潔版PDF生成函數（主要使用英文，避免字體問題）
async function generateCleanPDF(websites, timeRange) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        margin: 50,
        bufferPages: true,
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
        console.log('Clean PDF: 成功載入 Noto Sans TC 字體');
      } catch (error) {
        console.log('Clean PDF: 載入 Noto Sans TC 字體失敗，使用預設字體:', error.message);
      }
      
      const chunks = [];
      
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      
      const timeRangeText = getTimeRangeText(timeRange);
      const currentTime = moment().format('YYYY-MM-DD HH:mm:ss');
      
      // 標題
      doc.fontSize(24).fillColor('#1976D2').text('網站監控系統報表', { align: 'center' });
      doc.fontSize(14).fillColor('#666').text('Website Monitoring System Report', { align: 'center' });
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
         .text(`健康網站: ${stats.healthy} (${((stats.healthy / stats.total) * 100).toFixed(1)}%)`)
         .text(`異常網站: ${stats.unhealthy} (${((stats.unhealthy / stats.total) * 100).toFixed(1)}%)`)
         .text(`待檢查: ${stats.pending}`);
      
      doc.moveDown(2);
      
      // 網站詳情表格
      doc.fontSize(16).fillColor('#1976D2').text('網站監控詳情');
      doc.moveDown();
      
      // 表格標題
      doc.fontSize(10).fillColor('#333');
      const tableTop = doc.y;
      const tableHeaders = ['網站名稱', '狀態', 'URL', '協議'];
      const columnWidths = [140, 70, 220, 60];
      let currentX = 50;
      
      // 表格標題背景
      doc.rect(40, tableTop - 5, 490, 20).fillColor('#f5f5f5').fill().stroke();
      
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
        
        // 網站名稱 (現在可以顯示中文)
        const siteName = site.name.length > 18 ? site.name.substring(0, 15) + '...' : site.name;
        doc.fillColor('#333').text(siteName, currentX, rowY, { width: columnWidths[0], align: 'left' });
        currentX += columnWidths[0];
        
        // 狀態
        const statusText = getStatusText(site.status);
        const statusColor = getStatusColor(site.status);
        doc.fillColor(statusColor).text(statusText, currentX, rowY, { width: columnWidths[1], align: 'left' });
        currentX += columnWidths[1];
        
        // URL (截斷過長URL)
        const url = site.url.length > 30 ? site.url.substring(0, 27) + '...' : site.url;
        doc.fillColor('#333').text(url, currentX, rowY, { width: columnWidths[2], align: 'left' });
        currentX += columnWidths[2];
        
        // 協議類型
        const protocol = site.url.startsWith('https://') ? 'HTTPS' : 'HTTP';
        doc.fillColor(site.url.startsWith('https://') ? '#4CAF50' : '#FF9800')
           .text(protocol, currentX, rowY, { width: columnWidths[3], align: 'left' });
        
        doc.moveDown(0.5);
        
        // 分頁處理
        if (doc.y > 700) {
          doc.addPage();
        }
      });
      
      // 狀態說明
      doc.moveDown(2);
      doc.fontSize(12).fillColor('#1976D2').text('狀態說明:');
      doc.fontSize(10).fillColor('#333')
         .text('• 正常: 網站回應正常')
         .text('• 異常: 網站無回應或回傳錯誤')
         .text('• 檢查中: 網站狀態驗證中');
      
      // 頁尾
      doc.moveDown(2);
      const footerY = doc.page.height - 80;
      doc.fontSize(10).fillColor('#666')
         .text('本報表由網站監控系統 v3.2 自動生成', 50, footerY, { align: 'center', width: doc.page.width - 100 });
      
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
    '1h': '過去1小時',
    '6h': '過去6小時', 
    '24h': '過去24小時',
    '7d': '過去7天',
    '30d': '過去30天'
  };
  return ranges[timeRange] || '過去24小時';
}

function getStatusText(status) {
  const statusMap = {
    'healthy': '正常',
    'unhealthy': '異常',
    'pending': '檢查中'
  };
  return statusMap[status] || '未知';
}

function getStatusColor(status) {
  const colors = {
    'healthy': '#4CAF50',
    'unhealthy': '#f44336',
    'pending': '#FF9800'
  };
  return colors[status] || '#666666';
}

// 清理文字，移除可能導致字體問題的字符
function cleanText(text, maxLength = 50) {
  // 移除非ASCII字符，替換為可讀的描述
  let cleaned = text.replace(/[^\x20-\x7E]/g, '?');
  
  // 如果包含太多非ASCII字符，使用URL作為替代
  const questionMarks = (cleaned.match(/\?/g) || []).length;
  if (questionMarks > cleaned.length * 0.3) {
    cleaned = 'Website ' + (Math.random().toString(36).substring(7));
  }
  
  return cleaned.length > maxLength ? cleaned.substring(0, maxLength - 3) + '...' : cleaned;
}

module.exports = router;