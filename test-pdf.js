const PDFDocument = require('pdfkit');
const fs = require('fs');
const moment = require('moment');

// 建立測試PDF
const doc = new PDFDocument({ margin: 50 });
const outputPath = '/root/0901newwww/test-report.pdf';

doc.pipe(fs.createWriteStream(outputPath));

// 模擬報表數據
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
  sslStatus: 'valid'
};

// 標題
doc.fontSize(20).fillColor('#1976D2').text('測試報表 - 可用性分析', { align: 'center' });
doc.moveDown(2);

// 網站資訊
doc.fontSize(18).fillColor('#1976D2').text(mockWebsite.name);
doc.fontSize(12).fillColor('#666').text(mockWebsite.url);
doc.moveDown();

// 可用性分析區塊
doc.fontSize(14).fillColor('#1976D2').text('可用性分析', { underline: true });
doc.moveDown(1);

// 測試不同的排版方式
doc.fontSize(12);

// 方式1: 簡單字串組合
doc.fillColor('#333').text(`• 可用性: ${mockMetrics.uptime.toFixed(2)}%`);
doc.moveDown(0.8);

doc.fillColor('#333').text(`• 平均回應時間: ${mockMetrics.avgResponseTime}ms`);
doc.moveDown(0.8);

doc.fillColor('#333').text(`• 總檢查次數: ${mockMetrics.totalChecks}`);
doc.moveDown(0.8);

doc.fillColor('#333').text(`• 失敗次數: ${mockMetrics.failedChecks}`);
doc.moveDown(0.8);

doc.fillColor('#333').text(`• 最後檢查時間: ${moment(mockMetrics.lastCheck).format('YYYY-MM-DD HH:mm:ss')}`);
doc.moveDown(2);

// 方式2: 使用表格式排版
doc.fontSize(14).fillColor('#1976D2').text('表格式排版測試', { underline: true });
doc.moveDown(1);

const leftCol = 50;
const rightCol = 200;
let currentY = doc.y;

doc.fontSize(12).fillColor('#333');
doc.text('可用性:', leftCol, currentY);
doc.text(`${mockMetrics.uptime.toFixed(2)}%`, rightCol, currentY);
currentY += 25;

doc.text('平均回應時間:', leftCol, currentY);
doc.text(`${mockMetrics.avgResponseTime}ms`, rightCol, currentY);
currentY += 25;

doc.text('總檢查次數:', leftCol, currentY);
doc.text(`${mockMetrics.totalChecks}`, rightCol, currentY);
currentY += 25;

doc.text('失敗次數:', leftCol, currentY);
doc.text(`${mockMetrics.failedChecks}`, rightCol, currentY);
currentY += 25;

doc.text('最後檢查時間:', leftCol, currentY);
doc.text(moment(mockMetrics.lastCheck).format('YYYY-MM-DD HH:mm:ss'), rightCol, currentY);

doc.end();

console.log(`測試PDF已生成: ${outputPath}`);