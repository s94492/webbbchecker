const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const moment = require('moment');

// 測試PDF生成路由
router.get('/test', async (req, res) => {
  try {
    const doc = new PDFDocument({ margin: 50 });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="test-report.pdf"');
    
    doc.pipe(res);
    
    // 模擬數據
    const mockMetrics = {
      uptime: 98.5,
      avgResponseTime: 245,
      totalChecks: 1440,
      failedChecks: 22,
      lastCheck: new Date()
    };
    
    const mockWebsite = {
      name: 'Test Website',
      url: 'https://example.com',
      status: 'healthy',
      sslStatus: { valid: true, hasSSL: true }
    };
    
    // 標題
    doc.fontSize(20).fillColor('#1976D2').text('測試報表 - 可用性分析', { align: 'center' });
    doc.moveDown(2);
    
    // 網站資訊
    doc.fontSize(18).fillColor('#1976D2').text(mockWebsite.name);
    doc.fontSize(12).fillColor('#666').text(mockWebsite.url);
    doc.moveDown();
    
    // 可用性分析區塊 - 與reportService.js相同的格式
    doc.fontSize(14).fillColor('#1976D2').text('可用性分析', { underline: true });
    doc.moveDown(1);
    
    // 使用與reportService相同的排版方式
    doc.fontSize(12);
    
    // 可用性
    const uptimeValue = mockMetrics.uptime ? `${mockMetrics.uptime.toFixed(2)}%` : 'N/A';
    doc.fillColor('#333').text(`• 可用性: ${uptimeValue}`);
    doc.moveDown(0.8);
    
    // 平均回應時間
    const respTimeValue = mockMetrics.avgResponseTime ? `${mockMetrics.avgResponseTime.toFixed(0)}ms` : 'N/A';
    doc.fillColor('#333').text(`• 平均回應時間: ${respTimeValue}`);
    doc.moveDown(0.8);
    
    // 總檢查次數
    doc.fillColor('#333').text(`• 總檢查次數: ${mockMetrics.totalChecks || 'N/A'}`);
    doc.moveDown(0.8);
    
    // 失敗次數
    doc.fillColor('#333').text(`• 失敗次數: ${mockMetrics.failedChecks || 0}`);
    doc.moveDown(0.8);
    
    // SSL狀態
    const sslStatusText = mockWebsite.sslStatus.valid ? 'SSL正常' : 'SSL錯誤';
    doc.fillColor('#333').text(`• SSL狀態: ${sslStatusText}`);
    doc.moveDown(0.8);
    
    // 最後檢查時間
    const lastCheckTime = moment(mockMetrics.lastCheck).format('YYYY-MM-DD HH:mm:ss');
    doc.fillColor('#333').text(`• 最後檢查時間: ${lastCheckTime}`);
    doc.moveDown(2);
    
    // 分隔線
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(2);
    
    // 測試表格式排版
    doc.fontSize(14).fillColor('#1976D2').text('表格式排版測試', { underline: true });
    doc.moveDown(1);
    
    // 使用表格方式
    const tableData = [
      ['指標', '數值'],
      ['可用性', `${mockMetrics.uptime.toFixed(2)}%`],
      ['平均回應時間', `${mockMetrics.avgResponseTime}ms`],
      ['總檢查次數', `${mockMetrics.totalChecks}`],
      ['失敗次數', `${mockMetrics.failedChecks}`],
      ['SSL狀態', sslStatusText],
      ['最後檢查時間', lastCheckTime]
    ];
    
    const startX = 50;
    let startY = doc.y;
    const colWidth = 200;
    const rowHeight = 25;
    
    doc.fontSize(12);
    
    // 繪製表格
    tableData.forEach((row, rowIndex) => {
      const y = startY + (rowIndex * rowHeight);
      
      // 表頭使用粗體
      if (rowIndex === 0) {
        doc.font('Helvetica-Bold');
      } else {
        doc.font('Helvetica');
      }
      
      // 左欄
      doc.fillColor('#333').text(row[0], startX, y, {
        width: colWidth,
        align: 'left'
      });
      
      // 右欄
      doc.text(row[1], startX + colWidth, y, {
        width: colWidth,
        align: 'left'
      });
      
      // 添加橫線
      if (rowIndex === 0) {
        doc.moveTo(startX, y + 20)
           .lineTo(startX + colWidth * 2, y + 20)
           .stroke();
      }
    });
    
    doc.end();
    
  } catch (error) {
    console.error('PDF生成錯誤:', error);
    res.status(500).json({ error: 'PDF生成失敗', details: error.message });
  }
});

module.exports = router;