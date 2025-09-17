const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const WebsiteService = require('../services/WebsiteStorage');
const aiAnalysisService = require('../services/aiAnalysisService');
const { getLogoConfig } = require('./settings');
// GPT 服務 - 可選模組
let gptAnalysisService = null;
try {
  gptAnalysisService = require('../services/gptAnalysisService');
} catch (error) {
  console.log('⚠️ GPT 服務不可用，使用規則引擎:', error.message);
}
const axios = require('axios');

const websiteService = new WebsiteService();

// 生成單個網站的 PDF 報表
router.get('/:websiteId/pdf', async (req, res) => {
  try {
    const { websiteId } = req.params;
    const { range = '24h' } = req.query;

    console.log(`生成網站 ${websiteId} 的 PDF 報表，時間範圍: ${range}`);

    // 獲取網站資訊
    const website = await websiteService.getById(websiteId);
    if (!website) {
      return res.status(404).json({
        error: '找不到指定網站'
      });
    }

    // 獲取網站統計數據
    let stats = null;
    let metrics = [];
    try {
      const statsResponse = await axios.get(`http://localhost:3001/api/metrics/${websiteId}/stats?range=${range}`);
      stats = statsResponse.data.data;
      
      const metricsResponse = await axios.get(`http://localhost:3001/api/metrics/${websiteId}?range=${range}`);
      metrics = metricsResponse.data.data || [];
    } catch (error) {
      console.log('獲取統計數據失敗，使用預設值:', error.message);
    }

    // 使用2頁精華版PDF生成
    console.log('使用2頁精華版PDF生成模式');
    const pdfBuffer = await generateWebsitePDF(website, stats, metrics, range);

    // 設定檔案名稱
    const timestamp = moment().format('YYYYMMDD_HHmmss');
    const filename = `${website.name}_report_${range}_${timestamp}.pdf`;

    // 設定回應標頭
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // 發送PDF
    res.send(pdfBuffer);

    console.log(`PDF報表生成成功: ${filename}`);

  } catch (error) {
    console.error('PDF報表生成失敗:', error);
    res.status(500).json({
      error: 'PDF報表生成失敗',
      message: error.message
    });
  }
});

// PDF生成函數 - 2頁精華版
async function generateWebsitePDF(website, stats, metrics, timeRange) {
  return new Promise(async (resolve, reject) => {
    try {
      // 生成 AI 智能分析（GPT 或規則引擎）
      let aiAnalysis;
      
      // 動態重新載入 GPT 服務以獲取最新設定
      try {
        delete require.cache[require.resolve('../services/gptAnalysisService')];
        gptAnalysisService = require('../services/gptAnalysisService');
      } catch (error) {
        gptAnalysisService = null;
      }
      
      if (gptAnalysisService) {
        console.log('🤖 啟動 GPT 智能分析...');
        aiAnalysis = await gptAnalysisService.generateAnalysis(stats, metrics, website.name);
      } else {
        console.log('🔧 使用規則引擎分析...');
        aiAnalysis = aiAnalysisService.generateAnalysis(stats, metrics, website.name);
      }
      
      const doc = new PDFDocument({ 
        margin: 0,
        lineGap: 2,
        wordSpacing: 1,
        characterSpacing: 0.5,
        info: {
          Title: `${website.name} 監控報表`,
          Author: 'Website Monitor System',
          Subject: '網站監控數據報表',
          Keywords: '監控, 性能, 可用性, 報表'
        }
      });
      const chunks = [];
      
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      
      // 註冊中文字體
      const fontPath = '/app/fonts/NotoSansTC.ttf';
      if (fs.existsSync(fontPath)) {
        console.log('使用 Noto Sans TC 中文字體');
        doc.registerFont('NotoSansTC', fontPath);
        doc.font('NotoSansTC');
      } else {
        console.log('找不到中文字體檔案，使用預設字體');
      }
      
      // 動態計算頁面佈局，確保真正對稱
      const pageWidth = doc.page.width;
      const contentWidth = 500;
      const marginX = (pageWidth - contentWidth) / 2;
      
      const timeRangeText = getTimeRangeText(timeRange);
      const currentTime = moment().utc().utcOffset(8).format('YYYY-MM-DD HH:mm:ss');
      
      // ========== 第1頁：執行摘要 ==========
      
      // 頁首設計 - 簡潔樣式
      doc.rect(0, 0, doc.page.width, 3).fill('#1976D2');
      
      // 獲取Logo配置
      const logoConfig = getLogoConfig();
      
      // 如果有Logo，在左上角顯示
      if (logoConfig && logoConfig.enabled && logoConfig.path) {
        try {
          if (fs.existsSync(logoConfig.path)) {
            doc.image(logoConfig.path, 30, 15, {
              width: 120,
              height: 60,
              fit: [120, 60],
              align: 'left',
              valign: 'top'
            });
          }
        } catch (error) {
          console.log('Logo載入失敗:', error.message);
        }
      }
      
      // 主標題 - 網站名稱-監控報表（調整位置避免與Logo重疊）
      const titleY = logoConfig && logoConfig.enabled ? 45 : 40;
      doc.fontSize(28).fillColor('#1976D2')
         .font('NotoSansTC')
         .text(`${website.name}-監控報表`, marginX, titleY, { align: 'center', width: contentWidth });
      
      doc.fontSize(14).fillColor('#666')
         .text(website.url, marginX, 75, { align: 'center', width: contentWidth });
      
      // 分隔線 - 居中對稱
      doc.moveTo(marginX, 140)
         .lineTo(marginX + contentWidth, 140)
         .strokeColor('#E0E0E0')
         .lineWidth(0.5)
         .stroke();
      
      // 執行摘要區塊
      doc.fontSize(18).fillColor('#333')
         .font('NotoSansTC')
         .text('執行摘要', marginX, 160);
      
      // 狀態總結（大卡片）
      const summaryBoxY = 190;
      const statusColor = stats.uptime >= 99.9 ? '#4CAF50' : 
                         stats.uptime >= 99 ? '#FF9800' : '#F44336';
      const statusText = stats.uptime >= 99.9 ? '系統運行優秀' : 
                        stats.uptime >= 99 ? '系統運行穩定' : '系統需要關注';
      const statusIcon = stats.uptime >= 99.9 ? '●' : 
                        stats.uptime >= 99 ? '▲' : '■';
      
      // 狀態背景框（增加高度）
      doc.roundedRect(marginX, summaryBoxY, contentWidth, 80, 5)
         .fillAndStroke('#FAFAFA', statusColor);
      
      // 調整文字位置，確保充分間距
      doc.fontSize(18).fillColor(statusColor)
         .text(`${statusIcon} ${statusText}`, marginX + 20, summaryBoxY + 20, { width: contentWidth - 40, align: 'left' });
      
      doc.fontSize(11).fillColor('#666')
         .text(`基於${timeRangeText}的監控數據分析`, marginX + 20, summaryBoxY + 50, { width: contentWidth - 40, align: 'left' });
      
      // 關鍵績效指標
      doc.fontSize(18).fillColor('#333')
         .font('NotoSansTC')
         .text('關鍵績效指標', marginX, 280);
      
      if (stats) {
        const kpiY = 320;
        const kpiCards = [
          {
            title: '系統可用性',
            value: `${stats.uptime}%`,
            subtitle: stats.uptime >= 99.9 ? 'SLA達標' : stats.uptime >= 99 ? '接近目標' : '低於標準',
            color: stats.uptime >= 99.9 ? '#4CAF50' : stats.uptime >= 99 ? '#FF9800' : '#F44336',
            icon: '●'
          },
          {
            title: '平均響應時間',
            value: formatResponseTime(stats.avgResponseTime),
            subtitle: stats.avgResponseTime < 700 ? '性能優秀' : stats.avgResponseTime < 1200 ? '性能良好' : '需要關注',
            color: stats.avgResponseTime < 1200 ? '#4CAF50' : '#FF9800',  // 綠色或橙色，不使用紅色
            icon: stats.avgResponseTime < 700 ? '●' : stats.avgResponseTime < 1200 ? '▲' : '!'
          },
          {
            title: '監控覆蓋率',
            value: stats.count || '0',
            subtitle: '檢查次數',
            color: '#2196F3',
            icon: '■'
          }
        ];
        
        kpiCards.forEach((kpi, index) => {
          const cardX = 50 + (index * 170);
          const cardWidth = 160;
          const cardHeight = 100;
          
          // 卡片背景
          doc.roundedRect(cardX, kpiY, cardWidth, cardHeight, 8)
             .lineWidth(2)
             .strokeColor(kpi.color)
             .fillAndStroke('#FFFFFF', kpi.color);
          
          // 標題（上方置中）
          doc.fontSize(12).fillColor('#666')
             .text(kpi.title, cardX + 5, kpiY + 12, { width: cardWidth - 10, align: 'center' });
          
          // 圖標（置中）
          doc.fontSize(18).fillColor(kpi.color)
             .text(kpi.icon, cardX + (cardWidth/2) - 10, kpiY + 35);
             
          // 主要數值（置中）
          doc.fontSize(22).fillColor(kpi.color)
             .font('NotoSansTC')
             .text(kpi.value, cardX + 5, kpiY + 55, { width: cardWidth - 10, align: 'center' });
          
          // 副標題（下方置中）
          doc.fontSize(10).fillColor('#888')
             .text(kpi.subtitle, cardX + 5, kpiY + 80, { width: cardWidth - 10, align: 'center' });
        });
        
        // 監控洞察區塊
        const issueY = 440;
        doc.fontSize(18).fillColor('#333')
           .font('NotoSansTC')
           .text('監控洞察', marginX, issueY);
        
        // 洞察框 - 增加高度容納完整文字
        doc.roundedRect(marginX, issueY + 30, contentWidth, 110, 5)
           .fillAndStroke('#F8F9FA', '#E0E0E0');
        
      // AI 分析已在函數開頭生成
        
        // 提取關鍵洞察和建議
        const keyInsights = [];
        
        // 加入性能洞察
        if (aiAnalysis.performanceInsights && aiAnalysis.performanceInsights.length > 0) {
          const topInsight = aiAnalysis.performanceInsights[0];
          keyInsights.push(`- ${topInsight.message}`);
        }
        
        // 加入趨勢分析
        if (aiAnalysis.trendAnalysis && aiAnalysis.trendAnalysis.length > 0) {
          const trendInsight = aiAnalysis.trendAnalysis[0];
          keyInsights.push(`- ${trendInsight.message}`);
        }
        
        // 加入預測性洞察
        if (aiAnalysis.predictiveInsights && aiAnalysis.predictiveInsights.length > 0) {
          const predictiveInsight = aiAnalysis.predictiveInsights[0];
          keyInsights.push(`- ${predictiveInsight.message}`);
        }
        
        // 如果沒有 AI 分析結果，使用預設內容
        if (keyInsights.length === 0) {
          keyInsights.push('- AI 正在分析系統表現');
          keyInsights.push('- 建議持續監控關鍵指標');
        }
        
        // 限制顯示數量
        const maxInsights = 3;
        const displayInsights = keyInsights.slice(0, maxInsights);
        
        doc.fontSize(11).fillColor('#333').font('NotoSansTC');
        let insightY = issueY + 40;
        displayInsights.forEach(insight => {
          // 計算文字實際高度，支援自動換行
          const textHeight = doc.heightOfString(insight, { width: 450, lineGap: 4 });
          doc.text(insight, 65, insightY, { width: 450, lineGap: 4 });
          insightY += Math.max(textHeight + 8, 24); // 動態間距，至少24px
        });
        
        // 頁尾資訊（調整到更安全位置）- 修正Y座標到750
        doc.fontSize(8).fillColor('#999')
           .text(`報表生成時間：${currentTime} [v8.0]`, marginX, 750)  // 升級到版本號v8.0
           .text('第 1 頁，共 2 頁', 450, 750);  // 絕對位置，不設置寬度和對齊
        
        // ========== 第2頁：性能分析 ==========
        doc.addPage();
        
        // 頁首
        doc.rect(0, 0, doc.page.width, 3).fill('#1976D2');
        
        // 頁面標題
        doc.fontSize(18).fillColor('#333')
           .font('NotoSansTC')
           .text('性能趨勢分析', marginX, 60, { align: 'center', width: contentWidth });
        
        // 回應時間趨勢圖表
        if (metrics && metrics.length > 0) {
          doc.fontSize(14).fillColor('#666')
             .font('NotoSansTC')
             .text('24小時響應時間趨勢', marginX, 110);
          
          drawEnhancedResponseChart(doc, metrics, marginX, 140, timeRange);
          
          // 圖表說明已整合在圖例中，移除重複文字
        }
        
        // 性能指標詳情
        const metricsDetailY = 400;
        doc.fontSize(18).fillColor('#333')
           .font('NotoSansTC')
           .text('詳細性能指標', marginX, metricsDetailY);
        
        // 創建性能指標表格
        const perfData = [
          { label: '最快響應時間', value: formatResponseTimeSimple(stats.minResponseTime), status: '最佳' },
          { label: '平均響應時間', value: formatResponseTimeSimple(stats.avgResponseTime), status: '典型' },
          { label: '最慢響應時間', value: formatResponseTimeSimple(stats.maxResponseTime), status: '最差' },
          { label: '成功率', value: `${((stats.successfulChecks/stats.count)*100).toFixed(2)}%`, status: stats.successfulChecks/stats.count > 0.999 ? '優秀' : '需改善' },
          { label: '故障次數', value: `${calculateFailureCount(metrics)} 次`, status: calculateFailureCount(metrics) === 0 ? '無故障' : '需關注' },
          { label: '連續運行時間', value: calculateContinuousUptime(metrics), status: '當前' }
        ];
        
        // 表格背景 - 縮小高度
        doc.roundedRect(marginX, metricsDetailY + 30, contentWidth, 120, 5)
           .fillAndStroke('#FAFAFA', '#E0E0E0');
        
        // 表格內容 - 縮小行高和字體
        doc.fontSize(10);
        perfData.forEach((item, index) => {
          const rowY = metricsDetailY + 45 + (index * 18);
          
          // 標籤
          doc.fillColor('#666')
             .text(item.label, 70, rowY, { width: 150, height: 16, lineGap: 0 });
          
          // 數值 - 調整位置確保完全置中
          doc.fillColor('#333')
             .font('NotoSansTC')
             .text(item.value, 220, rowY, { width: 180, align: 'center', height: 16, lineGap: 0 });
          
          // 狀態 - 調整位置確保完全置中
          const statusColor = item.status === '優秀' || item.status === '無故障' ? '#4CAF50' :
                             item.status === '需改善' || item.status === '需關注' ? '#FF9800' : '#666';
          doc.fillColor(statusColor)
             .text(item.status, 420, rowY, { width: 110, align: 'center', height: 16, lineGap: 0 });
        });
        
        // 數據一致性說明 - 增加底部間距
        doc.fontSize(9).fillColor('#888')
           .text('* 故障次數統計包含所有異常事件，可用性計算採用智能SLA邏輯過濾瞬間網絡抖動',
                 70, metricsDetailY + 160, { width: 460, align: 'left' });

        // 加入額外空行間距
        doc.moveDown();
      }

      // AI 智能建議區塊
      const aiSectionY = 580;
      doc.fontSize(18).fillColor('#333')
         .font('NotoSansTC')
         .text('AI 智能建議', marginX, aiSectionY);
      
      // AI 建議框 - 增加高度容納完整內容
      doc.roundedRect(marginX, aiSectionY + 25, contentWidth, 110, 5)
         .fillAndStroke('#F0F8FF', '#B3D4FC');
      
      // 獲取優先建議
      const recommendations = aiAnalysis.recommendations || [];
      const topRecommendation = recommendations.find(r => r.priority === 'high') || 
                               recommendations.find(r => r.priority === 'medium') || 
                               recommendations[0];
      
      if (topRecommendation) {
        // 建議標題
        doc.fontSize(12).fillColor('#1565C0')
           .font('NotoSansTC')
           .text(topRecommendation.title, 65, aiSectionY + 40);
        
        // 建議描述 - 藍色標題下空一行
        doc.fontSize(10).fillColor('#333')
           .font('NotoSansTC')
           .text(topRecommendation.description, 65, aiSectionY + 70, { 
             width: 470, 
             lineGap: 4,
             wordSpacing: 1,
             characterSpacing: 0.3
           });
        
        // 預期效果 - 黑色描述下空一行
        if (topRecommendation.expectedImpact) {
          doc.fontSize(9).fillColor('#4CAF50')
             .font('NotoSansTC')
             .text(topRecommendation.expectedImpact, 65, aiSectionY + 110, {
               width: 470,
               lineGap: 3,
               wordSpacing: 1,
               characterSpacing: 0.2
             });
        }
      } else {
        // 使用 AI 執行摘要 - 改善文字間距
        doc.fontSize(11).fillColor('#333')
           .font('NotoSansTC')
           .text(aiAnalysis.summary || '系統運行穩定，建議維持當前監控策略。', 
                 65, aiSectionY + 45, { 
                   width: 470, 
                   lineGap: 4,
                   wordSpacing: 1,
                   characterSpacing: 0.3
                 });
      }
      
      // 頁尾 - 統一固定在頁底（與第一頁相同位置）
      const footerY = 750; // 統一使用固定Y座標750，貼在頁底

      doc.fontSize(8).fillColor('#999')
         .font('NotoSansTC')
         .text(`報表生成時間：${currentTime} [v8.0]`, marginX, footerY)  // 升級到版本號v8.0
         .text('第 2 頁，共 2 頁', 450, footerY);  // 統一絕對位置，不設置寬度和對齊
      
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

// 輔助函數
function getTimeRangeText(timeRange) {
  const ranges = {
    '1h': '過去1小時',
    '3h': '過去3小時', 
    '6h': '過去6小時',
    '12h': '過去12小時',
    '24h': '過去24小時',
    '2d': '過去2天',
    '7d': '過去7天',
    '14d': '過去14天',
    '30d': '過去30天',
    '90d': '過去90天'
  };
  return ranges[timeRange] || '過去24小時';
}

function formatResponseTime(ms, includeLevel = false) {
  if (!ms) return 'N/A';
  
  let result = '';
  if (ms >= 1000) {
    result = `${(ms / 1000).toFixed(2)}s`;
  } else {
    result = `${Math.round(ms)}ms`;
  }
  
  // 只在需要時添加等級標示
  if (includeLevel) {
    let level = '';
    if (ms <= 200) {
      level = ' (極快)';
    } else if (ms <= 500) {
      level = ' (快速)';
    } else if (ms <= 1000) {
      level = ' (正常)';
    } else if (ms <= 2000) {
      level = ' (緩慢)';
    } else {
      level = ' (很慢)';
    }
    result += level;
  }
  
  return result;
}

// 為詳細表格提供簡潔版本
function formatResponseTimeSimple(ms) {
  return formatResponseTime(ms, false);
}

// 為洞察分析提供帶等級的版本
function formatResponseTimeWithLevel(ms) {
  return formatResponseTime(ms, true);
}

function calculateFailureCount(metrics) {
  if (!metrics || metrics.length === 0) return 0;
  return metrics.filter(m => m.status === 'down' || m.isHealthy === false).length;
}

function calculateContinuousUptime(metrics) {
  if (!metrics || metrics.length === 0) {
    // 如果沒有數據，假設運行時間至少24小時
    return '1天 0小時 0分';
  }
  
  // 查找最近的故障記錄
  const recentMetrics = metrics.slice(-288); // 24小時數據 (每5分鐘一次)
  const lastFailureIndex = recentMetrics.findIndex(m => m.status === 'down' || m.isHealthy === false);
  
  let uptimeMinutes = 0;
  
  if (lastFailureIndex === -1) {
    // 沒有故障記錄，計算總運行時間
    uptimeMinutes = recentMetrics.length * 5; // 每個檢查間隔5分鐘
    if (uptimeMinutes < 1440) { // 少於24小時
      uptimeMinutes = 1440; // 至少顯示24小時
    }
  } else {
    // 從最後一次故障後計算
    const continuousCount = recentMetrics.length - lastFailureIndex - 1;
    uptimeMinutes = continuousCount * 5;
  }
  
  // 轉換為天、小時、分鐘
  const days = Math.floor(uptimeMinutes / 1440);
  const hours = Math.floor((uptimeMinutes % 1440) / 60);
  const minutes = uptimeMinutes % 60;
  
  // 格式化顯示
  let result = '';
  if (days > 0) {
    result += `${days}天`;
    if (hours > 0 || minutes > 0) result += ' ';
  }
  if (hours > 0 || days > 0) {
    result += `${hours}小時`;
    if (minutes > 0) result += ' ';
  }
  if (minutes > 0 || (days === 0 && hours === 0)) {
    result += `${minutes}分`;
  }
  
  return result || '0分';
}

// 增強版圖表繪製函數
function drawEnhancedResponseChart(doc, metrics, x, y, timeRange) {
  const chartWidth = 500; // 統一寬度與其他頁框一致
  const chartHeight = 180;
  const padding = 40;
  
  // 繪製漂亮的背景 - 漸層效果
  doc.rect(x, y, chartWidth, chartHeight)
     .fillOpacity(0.8)
     .fillAndStroke('#FBFCFD', '#E1E8ED');
  
  doc.fillOpacity(1);
  
  if (metrics.length > 0) {
    const maxResponseTime = Math.max(...metrics.map(m => m.responseTime || 0));
    const minResponseTime = Math.min(...metrics.map(m => m.responseTime || 0));
    const stepX = chartWidth / Math.max(metrics.length - 1, 1);
    
    // 計算安全的Y軸範圍（加10%邊距避免截斷）
    const valueRange = maxResponseTime - minResponseTime;
    const safeMaxValue = maxResponseTime + (valueRange * 0.1);
    const safeMinValue = Math.max(0, minResponseTime - (valueRange * 0.05));
    const safeRange = safeMaxValue - safeMinValue;
    
    // 繪製優雅的網格線 (水平) - 淡雅色彩
    doc.strokeColor('#E8EDF2').lineWidth(0.5);
    for (let i = 1; i <= 3; i++) { // 只畫內部線條，不畫邊框
      const gridY = y + (chartHeight / 4) * i;
      doc.moveTo(x + 10, gridY).lineTo(x + chartWidth - 10, gridY).stroke();
    }
    
    // 繪製優雅的網格線 (垂直) - 每3小時一條
    const timeSteps = 8; // 24小時除以3小時 = 8個時間段
    doc.strokeColor('#F0F3F6').lineWidth(0.5);
    for (let i = 1; i <= 7; i++) { // 畫7條內部線條
      const gridX = x + (chartWidth / timeSteps) * i;
      doc.moveTo(gridX, y + 10).lineTo(gridX, y + chartHeight - 10).stroke();
    }
    
    // 計算移動平均線數據 (3點平均)
    const movingAverageData = [];
    const windowSize = 3;
    
    for (let i = 0; i < metrics.length; i++) {
      let sum = 0;
      let count = 0;
      
      for (let j = Math.max(0, i - windowSize + 1); j <= i; j++) {
        sum += metrics[j].responseTime || 0;
        count++;
      }
      
      movingAverageData.push(sum / count);
    }
    
    // 準備數據點
    const plotPoints = [];
    metrics.forEach((metric, index) => {
      const plotX = x + 5 + ((index * stepX) * ((chartWidth - 10) / chartWidth)); // 左右留邊距
      const responseTime = metric.responseTime || 0;
      const plotY = y + 5 + (chartHeight - 10) - (((responseTime - safeMinValue) / safeRange) * (chartHeight - 10));
      plotPoints.push({ x: plotX, y: plotY, responseTime });
    });
    
    // 繪製即時數據漸層區塊 (淺藍色系)
    if (plotPoints.length > 0) {
      const fillGradient = doc.linearGradient(x, y, x, y + chartHeight);
      fillGradient.stop(0, '#BBDEFB', 0.5)  // 淺藍色，50%透明度
                  .stop(1, '#BBDEFB', 0.1); // 極淺藍色，10%透明度
      
      doc.moveTo(plotPoints[0].x, y + chartHeight - 5); // 從底部開始
      doc.lineTo(plotPoints[0].x, plotPoints[0].y);
      
      // 繪製平滑曲線 (貝茲曲線)
      for (let i = 1; i < plotPoints.length; i++) {
        const prev = plotPoints[i - 1];
        const curr = plotPoints[i];
        const next = plotPoints[i + 1] || curr;
        
        // 計算控制點
        const cp1x = prev.x + (curr.x - prev.x) * 0.3;
        const cp1y = prev.y;
        const cp2x = curr.x - (next.x - prev.x) * 0.3;
        const cp2y = curr.y;
        
        doc.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, curr.x, curr.y);
      }
      
      // 完成填充區域
      doc.lineTo(plotPoints[plotPoints.length - 1].x, y + chartHeight - 5);
      doc.closePath();
      doc.fill(fillGradient);
    }
    
    // 繪製即時數據點 (淺藍色點，40%透明度)
    if (plotPoints.length > 0) {
      doc.fillOpacity(0.4); // 40%透明度
      doc.fillColor('#90CAF9'); // 淺藍色點
      
      plotPoints.forEach(point => {
        doc.circle(point.x, point.y, 1.5).fill(); // 改為1.5，更細緻
      });
      
      doc.fillOpacity(1); // 恢復不透明
    }
    
    // 準備移動平均線數據點
    const avgPlotPoints = [];
    movingAverageData.forEach((avgValue, index) => {
      const plotX = x + 5 + ((index * stepX) * ((chartWidth - 10) / chartWidth));
      const plotY = y + 5 + (chartHeight - 10) - (((avgValue - safeMinValue) / safeRange) * (chartHeight - 10));
      avgPlotPoints.push({ x: plotX, y: plotY });
    });
    
    // 繪製趨勢線漸層區塊 (深藍色系)
    if (avgPlotPoints.length > 0) {
      const avgFillGradient = doc.linearGradient(x, y, x, y + chartHeight);
      avgFillGradient.stop(0, '#1565C0', 0.3)  // 深藍色，30%透明度
                     .stop(1, '#1565C0', 0.05); // 更淡，5%透明度
      
      doc.moveTo(avgPlotPoints[0].x, y + chartHeight - 5); // 從底部開始
      doc.lineTo(avgPlotPoints[0].x, avgPlotPoints[0].y);
      
      // 平滑曲線填充
      for (let i = 1; i < avgPlotPoints.length; i++) {
        const prev = avgPlotPoints[i - 1];
        const curr = avgPlotPoints[i];
        const next = avgPlotPoints[i + 1] || curr;
        
        const cp1x = prev.x + (curr.x - prev.x) * 0.3;
        const cp1y = prev.y;
        const cp2x = curr.x - (next.x - prev.x) * 0.3;
        const cp2y = curr.y;
        
        doc.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, curr.x, curr.y);
      }
      
      doc.lineTo(avgPlotPoints[avgPlotPoints.length - 1].x, y + chartHeight - 5);
      doc.closePath();
      doc.fill(avgFillGradient);
    }
    
    // 繪製趨勢線 (深藍色，高飽和度)
    doc.strokeColor('#0D47A1').lineWidth(2); // 深藍色，稍粗一些突出重點
    
    if (avgPlotPoints.length > 0) {
      doc.moveTo(avgPlotPoints[0].x, avgPlotPoints[0].y);
      
      // 平滑曲線
      for (let i = 1; i < avgPlotPoints.length; i++) {
        const prev = avgPlotPoints[i - 1];
        const curr = avgPlotPoints[i];
        const next = avgPlotPoints[i + 1] || curr;
        
        const cp1x = prev.x + (curr.x - prev.x) * 0.3;
        const cp1y = prev.y;
        const cp2x = curr.x - (next.x - prev.x) * 0.3;
        const cp2y = curr.y;
        
        doc.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, curr.x, curr.y);
      }
      doc.stroke();
    }
    
    // Y軸標籤 (使用安全範圍)
    doc.fontSize(10).fillColor('#555').font('NotoSansTC');
    for (let i = 0; i <= 4; i++) {
      const labelValue = safeMinValue + ((safeRange) / 4) * (4 - i); // 從上到下
      const labelY = y + ((chartHeight / 4) * i);
      doc.text(`${Math.round(labelValue)}ms`, x - 40, labelY - 5);
    }
    
    // X軸時間標籤 - 每3小時顯示一次
    const currentTime = new Date();
    doc.fontSize(9).fillColor('#666').font('NotoSansTC');
    for (let i = 0; i <= timeSteps; i++) {
      const timeOffset = (24 / timeSteps) * (timeSteps - i); // 每3小時
      const timeLabel = new Date(currentTime.getTime() - (timeOffset * 60 * 60 * 1000));
      const labelX = x + (chartWidth / timeSteps) * i;
      
      doc.text(timeLabel.getHours().toString().padStart(2, '0') + ':00', 
               labelX - 12, y + chartHeight + 8);
    }
    
    // 圖例放置在圖表中央下方，增加與圖表的間距
    const legendY = y + chartHeight + 35;
    const legendCenterX = x + (chartWidth / 2); // 圖表中央位置
    doc.fontSize(9).fillColor('#666').font('NotoSansTC');
    
    // 計算兩個圖例的總寬度以便居中
    const legend1Width = 80; // "實時數據" 圖例寬度
    const legend2Width = 70; // "趨勢線" 圖例寬度  
    const spacing = 40; // 兩個圖例之間的間距
    const totalWidth = legend1Width + spacing + legend2Width;
    const startX = legendCenterX - (totalWidth / 2);
    
    // 即時數據圖例 - 淺藍色點
    doc.fillOpacity(0.4);
    doc.fillColor('#90CAF9');
    doc.circle(startX + 10, legendY, 1.5).fill(); // 圖例中也改為1.5
    doc.fillOpacity(1);
    doc.fillColor('#555').text('即時數據', startX + 20, legendY - 4);
    
    // 趨勢線圖例 - 深藍色線
    const legend2X = startX + legend1Width + spacing;
    doc.strokeColor('#0D47A1').lineWidth(2);
    doc.moveTo(legend2X, legendY).lineTo(legend2X + 20, legendY).stroke();
    doc.fillColor('#555').text('趨勢線', legend2X + 25, legendY - 4);
  }
}

module.exports = router;