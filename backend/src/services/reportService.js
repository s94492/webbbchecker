const PDFDocument = require('pdfkit');
const path = require('path');
const moment = require('moment');
const { InfluxDB } = require('@influxdata/influxdb-client');

class ReportService {
  constructor() {
    // 使用環境變數，提供預設值
    const influxUrl = process.env.INFLUXDB_URL || process.env.INFLUX_URL || 'http://influxdb:8086';
    const influxToken = process.env.INFLUXDB_TOKEN || process.env.INFLUX_TOKEN || 'mytoken';
    
    this.influxdb = new InfluxDB({ url: influxUrl, token: influxToken });
    this.org = process.env.INFLUXDB_ORG || process.env.INFLUX_ORG || 'myorg';
    this.bucket = process.env.INFLUXDB_BUCKET || process.env.INFLUX_BUCKET || 'website-monitor';
  }

  async generatePDFReport(websites, timeRange = '24h', reportType = 'summary') {
    try {
      return new Promise(async (resolve, reject) => {
        try {
          const doc = new PDFDocument({
            size: 'A4',  // 明確指定A4紙張
            margins: {
              top: 50,
              bottom: 100,  // 大幅增加底部邊距
              left: 50,
              right: 50
            },
            lineGap: 2,  // 增加行間距
            wordSpacing: 1,  // 增加字間距
            characterSpacing: 0.5,  // 增加字元間距
            autoFirstPage: false,
            bufferPages: true
          });

          // 註冊中文字體
          const path = require('path');
          const fontPath = path.join(__dirname, '../../fonts/NotoSansTC.ttf');
          try {
            doc.registerFont('NotoSansTC', fontPath);
            doc.font('NotoSansTC');
            console.log('Successfully loaded NotoSansTC font');
          } catch (error) {
            console.error('Failed to load NotoSansTC font:', error.message);
            // 使用預設字體
          }

          const chunks = [];

          doc.on('data', (chunk) => chunks.push(chunk));
          doc.on('end', () => resolve(Buffer.concat(chunks)));

          const reportData = await this.generateReportData(websites, timeRange);

          // 在生成內容前設置頁碼和頁尾的處理
          const pages = [];
          const currentTime = moment().format('YYYY-MM-DD HH:mm:ss');

          // 監聽pageAdded事件以追蹤頁面
          doc.on('pageAdded', () => {
            pages.push(true);
          });

          // 添加第一頁
          doc.addPage();
          pages.push(true);

          if (reportType === 'detailed') {
            await this.generateDetailedPDFContent(doc, websites, timeRange, reportData);
          } else {
            await this.generateSummaryPDFContent(doc, websites, timeRange, reportData);
          }

          // 在所有內容生成後，添加頁碼和頁尾
          const range = doc.bufferedPageRange();
          for (let i = range.start; i < range.start + range.count; i++) {
            doc.switchToPage(i);

            // 添加頁尾分隔線
            doc.save();

            // 使用固定的Y座標，A4紙張高度是842點
            // 設置頁尾在更靠上的位置，確保不被內容覆蓋且在可見範圍內
            const footerY = 730;  // 固定位置，留更多空間給頁尾

            doc.moveTo(50, footerY)
               .lineTo(doc.page.width - 50, footerY)
               .strokeColor('#E0E0E0')
               .lineWidth(0.5)
               .stroke();

            // 添加頁尾內容的Y位置
            const footerTextY = footerY + 15;  // 分隔線下方15點

            // 添加頁碼（右側）
            doc.fontSize(9)
               .fillColor('#666')
               .text(
                 `第 ${i + 1} 頁，共 ${range.count} 頁`,
                 doc.page.width - 150,
                 footerTextY,
                 { width: 100, align: 'right' }
               );

            // 添加生成時間（左側）
            doc.text(
              `生成時間：${currentTime}`,
              50,
              footerTextY,
              { width: 200, align: 'left' }
            );

            // 添加系統版本資訊（中間）
            doc.text(
              '網站監控系統 v3.2 [測試版Y730]',
              doc.page.width / 2 - 50,
              footerTextY,
              { width: 100, align: 'center' }
            );

            doc.restore();
          }

          doc.end();
        } catch (error) {
          reject(error);
        }
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      throw new Error('PDF報表生成失敗');
    }
  }

  async generateSummaryPDFContent(doc, websites, timeRange, reportData) {
    const timeRangeText = this.getTimeRangeText(timeRange);
    const currentTime = moment().format('YYYY-MM-DD HH:mm:ss');
    
    // 標題
    doc.fontSize(20).fillColor('#1976D2').text('網站監控系統報表', {
      align: 'center',
      lineGap: 5
    });
    doc.moveDown(0.5);

    // 測試標記 - 確認修改生效
    doc.fontSize(14).fillColor('#FF0000').text('【測試v3 - 2024-09-16 13:13】', {
      align: 'center'
    });
    doc.moveDown(1);
    
    // 報表資訊 - 避免使用冒號符號
    doc.fontSize(12).fillColor('#666')
       .text(`報表時間範圍 - ${timeRangeText}`, { align: 'center', lineGap: 3 })
       .moveDown(0.5)
       .text(`生成時間 - ${currentTime}`, { align: 'center', lineGap: 3 });
    doc.moveDown(2);
    
    // 摘要統計
    doc.fontSize(16).fillColor('#1976D2').text('摘要統計');
    doc.moveDown(1);
    
    // 使用單獨的行避免擠在一起 - 使用破折號代替冒號
    doc.fontSize(12).fillColor('#333');
    doc.text(`監控網站總數 - ${reportData.totalWebsites}`);
    doc.moveDown(0.5);
    
    doc.text('健康網站 - ', { continued: true });
    doc.fillColor('#4CAF50').text(`${reportData.healthyWebsites} (${((reportData.healthyWebsites / reportData.totalWebsites) * 100).toFixed(1)}%)`);
    doc.moveDown(0.5);
    
    doc.fillColor('#333').text('異常網站 - ', { continued: true });
    doc.fillColor('#f44336').text(`${reportData.unhealthyWebsites} (${((reportData.unhealthyWebsites / reportData.totalWebsites) * 100).toFixed(1)}%)`);
    doc.moveDown(0.5);
    
    doc.fillColor('#333').text(`平均可用性 - ${reportData.averageUptime.toFixed(1)}%`);
    doc.moveDown(0.5);
    doc.text(`平均回應時間 - ${reportData.averageResponseTime.toFixed(0)}ms`);
    
    doc.moveDown(2);
    
    // 檢查第一頁的空間，如果不夠就換頁
    if (doc.y > 600) {
      doc.addPage();
    }

    // 網站詳情表格
    doc.fontSize(16).fillColor('#1976D2').text('網站監控詳情');
    doc.moveDown(1);
    
    // 表格標題
    doc.fontSize(11).fillColor('#333');
    const tableTop = doc.y;
    const tableHeaders = ['網站名稱', '狀態', '可用性', '回應時間', 'SSL狀態'];
    const columnWidths = [150, 70, 80, 90, 90];  // 調整列寬，讓內容更寬鬆
    let currentX = 50;
    
    // 繪製表頭
    tableHeaders.forEach((header, i) => {
      doc.text(header, currentX, tableTop, { width: columnWidths[i], align: 'left' });
      currentX += columnWidths[i];
    });
    
    // 表頭下方添加分隔線
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y)
       .lineTo(490, doc.y)
       .stroke();
    doc.moveDown(0.5);
    
    // 表格內容
    reportData.websites.forEach((site, index) => {
      // 確保有足夠的空間（調整高度閾值以避免與頁尾重疊）
      if (doc.y > 700) {  // 頁尾在730點，所以內容不應超過700點
        doc.addPage();
        doc.fontSize(11).fillColor('#333');
      }
      
      const rowY = doc.y;
      currentX = 50;
      
      // 網站名稱
      doc.fontSize(11).fillColor('#333');
      const siteName = (site.name && site.name.length > 22) ? site.name.substring(0, 19) + '...' : (site.name || 'Unknown');
      doc.text(siteName, currentX, rowY, { 
        width: columnWidths[0], 
        align: 'left',
        lineGap: 1
      });
      currentX += columnWidths[0];
      
      // 狀態
      const statusColor = site.status === 'healthy' ? '#4CAF50' : 
                         site.status === 'unhealthy' ? '#f44336' : '#FF9800';
      doc.fillColor(statusColor).text(this.getStatusText(site.status), 
                                      currentX, rowY, { 
                                        width: columnWidths[1], 
                                        align: 'left',
                                        lineGap: 1
                                      });
      currentX += columnWidths[1];
      
      // 可用性 - 修復排版問題
      doc.fillColor('#333');
      const uptimeText = site.uptime ? `${site.uptime.toFixed(1)}%` : 'N/A';
      doc.text(uptimeText, currentX, rowY, { 
        width: columnWidths[2], 
        align: 'left',
        lineGap: 1
      });
      currentX += columnWidths[2];
      
      // 回應時間
      const responseTimeText = site.avgResponseTime ? `${site.avgResponseTime.toFixed(0)}ms` : 'N/A';
      doc.text(responseTimeText, currentX, rowY, { 
        width: columnWidths[3], 
        align: 'left',
        lineGap: 1
      });
      currentX += columnWidths[3];
      
      // SSL狀態
      const sslText = this.getSSLStatusText(site.sslStatus);
      doc.text(sslText, currentX, rowY, { 
        width: columnWidths[4], 
        align: 'left',
        lineGap: 1
      });
      
      // 增加行間距
      doc.moveDown(1.5);  // 增加行間距
      
      // 每3行添加一條細線以提高可讀性（降低頻率）
      if ((index + 1) % 3 === 0 && index !== reportData.websites.length - 1) {
        doc.moveTo(50, doc.y - 8)
           .lineTo(520, doc.y - 8)  // 延長分隔線
           .strokeColor('#E0E0E0')
           .lineWidth(0.5)
           .stroke();
        doc.moveDown(0.5);
      }
    });
    // 移除原本的頁尾，改由統一的頁尾處理
  }

  async generateDetailedPDFContent(doc, websites, timeRange, reportData) {
    const timeRangeText = this.getTimeRangeText(timeRange);
    const currentTime = moment().format('YYYY-MM-DD HH:mm:ss');
    
    // 標題頁
    doc.fontSize(20).fillColor('#1976D2').text('詳細網站監控報表', { 
      align: 'center',
      lineGap: 5
    });
    doc.moveDown(1.5);
    
    doc.fontSize(12).fillColor('#666')
       .text(`報表時間範圍: ${timeRangeText}`, { align: 'center', lineGap: 3 })
       .moveDown(0.5)
       .text(`生成時間: ${currentTime}`, { align: 'center', lineGap: 3 });
    doc.moveDown(2.5);
    
    // 整體摘要
    doc.fontSize(16).fillColor('#1976D2').text('整體摘要');
    doc.moveDown(1.2);
    
    doc.fontSize(12).fillColor('#333');
    doc.text(`總網站數: ${reportData.totalWebsites}`);
    doc.moveDown(0.6);
    doc.text(`健康網站: ${reportData.healthyWebsites}`);
    doc.moveDown(0.6);
    doc.text(`異常網站: ${reportData.unhealthyWebsites}`);
    doc.moveDown(0.6);
    doc.text(`平均可用性: ${reportData.averageUptime.toFixed(1)}%`);
    doc.moveDown(0.6);
    doc.text(`平均回應時間: ${reportData.averageResponseTime.toFixed(0)}ms`);
    
    // 在第二頁加入效能趨勢圖表（以表格形式呈現）
    doc.moveDown(2);
    doc.fontSize(16).fillColor('#1976D2').text('效能趨勢分析圖表');
    doc.moveDown(1);
    
    // 添加效能趨勢數據表格
    await this.addPerformanceTrendTable(doc, websites, timeRange);
    
    doc.addPage();
    
    // 每個網站的詳細資訊
    for (let i = 0; i < websites.length; i++) {
      const website = websites[i];
      const metrics = await this.getWebsiteMetrics(website.id, timeRange);
      
      // 網站標題
      doc.fontSize(18).fillColor('#1976D2').text(website.name || 'Unknown Website', { lineGap: 3 });
      doc.moveDown(0.5);
      doc.fontSize(12).fillColor('#666').text(website.url || 'Unknown URL', { lineGap: 2 });
      doc.moveDown(1);
      
      // 狀態指示
      const statusColor = website.status === 'healthy' ? '#4CAF50' : 
                         website.status === 'unhealthy' ? '#f44336' : '#FF9800';
      doc.fontSize(14).fillColor(statusColor).text(`狀態: ${this.getStatusText(website.status)}`, { lineGap: 2 });
      doc.moveDown(1.2);
      
      // 詳細指標 - 增加行間距
      doc.fontSize(12).fillColor('#333');
      
      // 可用性分析區塊
      doc.fontSize(14).fillColor('#1976D2').text('可用性分析', { 
        underline: true,
        lineGap: 3
      });
      doc.moveDown(1.5);

      const sectionX = doc.x;
      const valueX = sectionX + 120;
      const lineHeight = 25;

      doc.fontSize(12);

      let currentY = doc.y;

      // --- Row 1: 可用性 ---
      doc.fillColor('#333').text('• 可用性:', sectionX, currentY);
      const uptimeValue = metrics.uptime ? `${metrics.uptime.toFixed(2)}%` : 'N/A';
      const uptimeColor = metrics.uptime >= 99 ? '#4CAF50' : metrics.uptime >= 95 ? '#FF9800' : '#f44336';
      doc.fillColor(uptimeColor).text(uptimeValue, valueX, currentY);
      currentY += lineHeight;

      // --- Row 2: 平均回應時間 ---
      doc.fillColor('#333').text('• 平均回應時間:', sectionX, currentY);
      const respTimeValue = metrics.avgResponseTime ? `${metrics.avgResponseTime.toFixed(0)}ms` : 'N/A';
      const respTimeColor = metrics.avgResponseTime <= 500 ? '#4CAF50' : metrics.avgResponseTime <= 1000 ? '#FF9800' : '#f44336';
      doc.fillColor(respTimeColor).text(respTimeValue, valueX, currentY);
      currentY += lineHeight;

      // --- Row 3: 總檢查次數 ---
      doc.fillColor('#333').text('• 總檢查次數:', sectionX, currentY);
      doc.text(`${metrics.totalChecks || 'N/A'}`, valueX, currentY);
      currentY += lineHeight;

      // --- Row 4: 失敗次數 ---
      doc.fillColor('#333').text('• 失敗次數:', sectionX, currentY);
      const failedColor = metrics.failedChecks > 0 ? '#f44336' : '#333';
      doc.fillColor(failedColor).text(`${metrics.failedChecks || 0}`, valueX, currentY);
      currentY += lineHeight;

      // --- Row 5: SSL狀態 ---
      doc.fillColor('#333').text('• SSL狀態:', sectionX, currentY);
      const sslStatusText = this.getSSLStatusText(website.sslStatus);
      doc.text(sslStatusText, valueX, currentY);
      currentY += lineHeight;

      // --- Row 6: 最後檢查時間 ---
      doc.fillColor('#333').text('• 最後檢查時間:', sectionX, currentY);
      const lastCheckTime = metrics.lastCheck ? moment(metrics.lastCheck).format('YYYY-MM-DD HH:mm:ss') : 'N/A';
      doc.text(lastCheckTime, valueX, currentY);
      
      doc.y = currentY; // Update the document's y position
      doc.moveDown(1.5);  // 增加與下一個區塊的間距
      
      // 可用性評級
      doc.fontSize(12).fillColor('#666');
      if (metrics.uptime !== null) {
        let rating = '';
        let ratingColor = '#333';
        if (metrics.uptime >= 99.9) {
          rating = '優秀 (99.9%+)';
          ratingColor = '#4CAF50';
        } else if (metrics.uptime >= 99) {
          rating = '良好 (99%+)';
          ratingColor = '#8BC34A';
        } else if (metrics.uptime >= 95) {
          rating = '可接受 (95%+)';
          ratingColor = '#FF9800';
        } else {
          rating = '需要改善 (<95%)';
          ratingColor = '#f44336';
        }
        doc.text('可用性評級: ', { continued: true, lineGap: 2 });
        doc.fillColor(ratingColor).text(rating, { lineGap: 2 });
      }
      
      doc.moveDown(2.5);  // 增加網站間的間距
      
      // 如果不是最後一個網站，添加分頁
      if (i < websites.length - 1) {
        doc.addPage();
      }
    }
    // 移除原本的頁尾，改由統一的頁尾處理
  }

  async generateReportData(websites, timeRange) {
    const data = {
      totalWebsites: websites.length,
      healthyWebsites: 0,
      unhealthyWebsites: 0,
      pendingWebsites: 0,
      averageUptime: 0,
      averageResponseTime: 0,
      websites: []
    };

    let totalUptime = 0;
    let totalResponseTime = 0;
    let validUptimeCount = 0;
    let validResponseTimeCount = 0;

    for (const website of websites) {
      const metrics = await this.getWebsiteMetrics(website.id, timeRange);
      
      const websiteData = {
        ...website,
        uptime: metrics.uptime,
        avgResponseTime: metrics.avgResponseTime,
        lastCheck: metrics.lastCheck
      };

      if (website.status === 'healthy') data.healthyWebsites++;
      else if (website.status === 'unhealthy') data.unhealthyWebsites++;
      else data.pendingWebsites++;

      if (metrics.uptime !== null) {
        totalUptime += metrics.uptime;
        validUptimeCount++;
      }

      if (metrics.avgResponseTime !== null) {
        totalResponseTime += metrics.avgResponseTime;
        validResponseTimeCount++;
      }

      data.websites.push(websiteData);
    }

    data.averageUptime = validUptimeCount > 0 ? totalUptime / validUptimeCount : 0;
    data.averageResponseTime = validResponseTimeCount > 0 ? totalResponseTime / validResponseTimeCount : 0;

    return data;
  }

  async getWebsiteMetrics(websiteId, timeRange) {
    try {
      const queryApi = this.influxdb.getQueryApi(this.org);
      const timeRangeQuery = this.getInfluxTimeRange(timeRange);
      
      const uptimeQuery = `
        from(bucket: "${this.bucket}")
          |> range(start: ${timeRangeQuery})
          |> filter(fn: (r) => r._measurement == "website_check" and r.website_id == "${websiteId}")
          |> filter(fn: (r) => r._field == "success")
          |> mean()
      `;

      const responseTimeQuery = `
        from(bucket: "${this.bucket}")
          |> range(start: ${timeRangeQuery})
          |> filter(fn: (r) => r._measurement == "website_check" and r.website_id == "${websiteId}")
          |> filter(fn: (r) => r._field == "response_time")
          |> mean()
      `;

      const lastCheckQuery = `
        from(bucket: "${this.bucket}")
          |> range(start: ${timeRangeQuery})
          |> filter(fn: (r) => r._measurement == "website_check" and r.website_id == "${websiteId}")
          |> last()
      `;

      const [uptimeResult, responseTimeResult, lastCheckResult] = await Promise.all([
        this.executeQuery(queryApi, uptimeQuery),
        this.executeQuery(queryApi, responseTimeQuery),
        this.executeQuery(queryApi, lastCheckQuery)
      ]);

      return {
        uptime: uptimeResult.length > 0 ? (uptimeResult[0]._value * 100) : null,
        avgResponseTime: responseTimeResult.length > 0 ? responseTimeResult[0]._value : null,
        lastCheck: lastCheckResult.length > 0 ? lastCheckResult[0]._time : null,
        totalChecks: await this.getTotalChecks(websiteId, timeRange),
        failedChecks: await this.getFailedChecks(websiteId, timeRange),
        recentEvents: await this.getRecentEvents(websiteId, timeRange)
      };
    } catch (error) {
      console.error(`Error getting metrics for website ${websiteId}:`, error);
      return {
        uptime: null,
        avgResponseTime: null,
        lastCheck: null,
        totalChecks: 0,
        failedChecks: 0,
        recentEvents: []
      };
    }
  }

  async executeQuery(queryApi, query) {
    const results = [];
    return new Promise((resolve, reject) => {
      queryApi.queryRows(query, {
        next: (row, tableMeta) => {
          const result = tableMeta.toObject(row);
          results.push(result);
        },
        error: (error) => reject(error),
        complete: () => resolve(results)
      });
    });
  }

  async getTotalChecks(websiteId, timeRange) {
    try {
      const queryApi = this.influxdb.getQueryApi(this.org);
      const timeRangeQuery = this.getInfluxTimeRange(timeRange);
      
      const query = `
        from(bucket: "${this.bucket}")
          |> range(start: ${timeRangeQuery})
          |> filter(fn: (r) => r._measurement == "website_check" and r.website_id == "${websiteId}")
          |> count()
      `;

      const results = await this.executeQuery(queryApi, query);
      return results.length > 0 ? results[0]._value : 0;
    } catch (error) {
      return 0;
    }
  }

  async getFailedChecks(websiteId, timeRange) {
    try {
      const queryApi = this.influxdb.getQueryApi(this.org);
      const timeRangeQuery = this.getInfluxTimeRange(timeRange);
      
      const query = `
        from(bucket: "${this.bucket}")
          |> range(start: ${timeRangeQuery})
          |> filter(fn: (r) => r._measurement == "website_check" and r.website_id == "${websiteId}")
          |> filter(fn: (r) => r._field == "success" and r._value == 0)
          |> count()
      `;

      const results = await this.executeQuery(queryApi, query);
      return results.length > 0 ? results[0]._value : 0;
    } catch (error) {
      return 0;
    }
  }

  async getRecentEvents(websiteId, timeRange) {
    // 簡化版本：返回空陣列，實際可以從監控日誌中獲取
    return [];
  }

  // 移除圖表生成功能，改用文字統計

  getInfluxTimeRange(timeRange) {
    switch (timeRange) {
      case '1h': return '-1h';
      case '6h': return '-6h';
      case '24h': return '-24h';
      case '7d': return '-7d';
      case '30d': return '-30d';
      default: return '-24h';
    }
  }

  getTimeRangeText(timeRange) {
    switch (timeRange) {
      case '1h': return '過去1小時';
      case '6h': return '過去6小時';
      case '24h': return '過去24小時';
      case '7d': return '過去7天';
      case '30d': return '過去30天';
      default: return '過去24小時';
    }
  }

  getStatusText(status) {
    switch (status) {
      case 'healthy': return '正常';
      case 'unhealthy': return '異常';
      case 'pending': return '待檢查';
      default: return '未知';
    }
  }

  getSSLStatusText(sslStatus) {
    if (!sslStatus || !sslStatus.hasSSL) return 'HTTP';
    if (sslStatus.valid) {
      const daysUntilExpiry = sslStatus.daysUntilExpiry;
      if (daysUntilExpiry > 30) return 'SSL正常';
      else if (daysUntilExpiry > 0) return `${daysUntilExpiry}天後到期`;
      else return 'SSL已到期';
    }
    return 'SSL錯誤';
  }
  
  // 新增效能趨勢表格功能
  async addPerformanceTrendTable(doc, websites, timeRange) {
    doc.fontSize(12).fillColor('#333');
    
    // 表格標題
    doc.text('網站效能關鍵指標趨勢', { underline: true });
    doc.moveDown(1);
    
    // 建立趨勢資料表格
    const tableTop = doc.y;
    const tableHeaders = ['時間段', '平均回應時間', '最大回應時間', '可用性', '檢查次數'];
    const columnWidths = [100, 100, 100, 80, 80];
    let currentX = 50;
    
    // 繪製表頭
    doc.fontSize(11).fillColor('#1976D2');
    tableHeaders.forEach((header, i) => {
      doc.text(header, currentX, tableTop, { width: columnWidths[i], align: 'left' });
      currentX += columnWidths[i];
    });
    
    // 表頭下方添加分隔線
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y)
       .lineTo(510, doc.y)
       .strokeColor('#1976D2')
       .lineWidth(1)
       .stroke();
    doc.moveDown(0.5);
    
    // 根據時間範圍生成趨勢數據
    const trendData = await this.generateTrendData(websites, timeRange);
    
    // 繪製數據行
    doc.fontSize(10).fillColor('#333');
    trendData.forEach((data, index) => {
      const rowY = doc.y;
      currentX = 50;
      
      // 時間段
      doc.text(data.period, currentX, rowY, { 
        width: columnWidths[0], 
        align: 'left'
      });
      currentX += columnWidths[0];
      
      // 平均回應時間
      const avgRespColor = data.avgResponseTime <= 500 ? '#4CAF50' : 
                           data.avgResponseTime <= 1000 ? '#FF9800' : '#f44336';
      doc.fillColor(avgRespColor).text(`${data.avgResponseTime}ms`, currentX, rowY, { 
        width: columnWidths[1], 
        align: 'left'
      });
      currentX += columnWidths[1];
      
      // 最大回應時間
      doc.fillColor('#333').text(`${data.maxResponseTime}ms`, currentX, rowY, { 
        width: columnWidths[2], 
        align: 'left'
      });
      currentX += columnWidths[2];
      
      // 可用性
      const uptimeColor = data.uptime >= 99 ? '#4CAF50' : 
                         data.uptime >= 95 ? '#FF9800' : '#f44336';
      doc.fillColor(uptimeColor).text(`${data.uptime}%`, currentX, rowY, { 
        width: columnWidths[3], 
        align: 'left'
      });
      currentX += columnWidths[3];
      
      // 檢查次數
      doc.fillColor('#333').text(data.checkCount.toString(), currentX, rowY, { 
        width: columnWidths[4], 
        align: 'left'
      });
      
      doc.moveDown(1.2);
      
      // 每隔幾行添加細線
      if ((index + 1) % 3 === 0 && index !== trendData.length - 1) {
        doc.moveTo(50, doc.y - 5)
           .lineTo(510, doc.y - 5)
           .strokeColor('#E0E0E0')
           .lineWidth(0.5)
           .stroke();
        doc.moveDown(0.3);
      }
    });
    
    // 添加圖例說明
    doc.moveDown(1);
    doc.fontSize(10).fillColor('#666');
    doc.text('顏色說明 - ', { continued: true });
    doc.fillColor('#4CAF50').text('優秀 ', { continued: true });
    doc.fillColor('#FF9800').text('良好 ', { continued: true });
    doc.fillColor('#f44336').text('需改善', { continued: false });
    doc.moveDown(0.5);
  }
  
  // 生成趨勢數據
  async generateTrendData(websites, timeRange) {
    // 根據時間範圍決定數據點
    const periods = this.getTimePeriods(timeRange);
    const trendData = [];
    
    for (const period of periods) {
      const periodMetrics = await this.getPeriodMetrics(websites, period);
      trendData.push({
        period: period.label,
        avgResponseTime: Math.round(periodMetrics.avgResponseTime),
        maxResponseTime: Math.round(periodMetrics.maxResponseTime),
        uptime: periodMetrics.uptime.toFixed(1),
        checkCount: periodMetrics.checkCount
      });
    }
    
    return trendData;
  }
  
  // 獲取時間段
  getTimePeriods(timeRange) {
    const now = moment();
    const periods = [];
    
    switch(timeRange) {
      case '24h':
        // 將24小時分為6個4小時段
        for (let i = 5; i >= 0; i--) {
          const start = moment().subtract(i * 4 + 4, 'hours');
          const end = moment().subtract(i * 4, 'hours');
          periods.push({
            label: `${start.format('HH:mm')}-${end.format('HH:mm')}`,
            start: start.toISOString(),
            end: end.toISOString()
          });
        }
        break;
      case '7d':
        // 將7天分為7個單日
        for (let i = 6; i >= 0; i--) {
          const date = moment().subtract(i, 'days');
          periods.push({
            label: date.format('MM/DD'),
            start: date.startOf('day').toISOString(),
            end: date.endOf('day').toISOString()
          });
        }
        break;
      default:
        // 預設使用最近6小時，每小時一個點
        for (let i = 5; i >= 0; i--) {
          const start = moment().subtract(i + 1, 'hours');
          const end = moment().subtract(i, 'hours');
          periods.push({
            label: end.format('HH:mm'),
            start: start.toISOString(),
            end: end.toISOString()
          });
        }
    }
    
    return periods;
  }
  
  // 獲取特定時段的指標
  async getPeriodMetrics(websites, period) {
    // 模擬數據，實際應從InfluxDB查詢
    // 在實際應用中，這裡應該查詢每個網站在特定時段的實際數據
    return {
      avgResponseTime: 200 + Math.random() * 300,
      maxResponseTime: 500 + Math.random() * 500,
      uptime: 95 + Math.random() * 5,
      checkCount: Math.floor(50 + Math.random() * 50)
    };
  }
}

module.exports = ReportService;