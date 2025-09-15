const axios = require('axios');
const dns = require('dns').promises;
const tls = require('tls');
const net = require('net');
const https = require('https');
const http = require('http');
const { URL } = require('url');
const WebsiteStorage = require('./WebsiteStorage');
const AlertService = require('./AlertService');

class MonitorService {
  constructor(influxService) {
    this.influxService = influxService;
    this.websiteStorage = new WebsiteStorage();
    this.activeChecks = new Map(); // 追蹤進行中的檢查
    
    // 平衡監控相關狀態
    this.websiteStates = new Map(); // 網站狀態: normal, suspicious, down
    this.timers = new Map();        // 個別網站的定時器
    this.alerts = new Map();        // 告警狀態記錄
    
    // 初始化告警服務
    this.alertService = new AlertService();
  }

  async checkAllWebsites() {
    const websites = await this.websiteStorage.getAll();
    const enabledWebsites = websites.filter(site => site.enabled);
    
    console.log(`檢查 ${enabledWebsites.length} 個網站的監控排程`);
    
    // 為每個網站初始化個別監控
    enabledWebsites.forEach(website => {
      if (!this.timers.has(website.id)) {
        this.initializeWebsiteMonitoring(website);
      }
    });
  }

  // 初始化網站監控
  initializeWebsiteMonitoring(website) {
    const state = this.websiteStates.get(website.id) || 'normal';
    console.log(`初始化監控: ${website.name} (間隔: ${website.interval}秒, 狀態: ${state})`);
    this.scheduleNextCheck(website, state);
  }

  // 計算檢查間隔
  calculateInterval(website, state) {
    const baseInterval = website.interval * 1000; // 用戶設定間隔（毫秒）
    const oneMinute = 60 * 1000; // 1分鐘
    
    switch(state) {
      case 'normal':
        return baseInterval;
        
      case 'suspicious':
        // 確認間隔 = 基礎間隔÷5，但最少1分鐘
        return Math.max(Math.floor(baseInterval / 5), oneMinute);
        
      case 'down':
        // 恢復檢查固定1分鐘
        return oneMinute;
        
      default:
        return baseInterval;
    }
  }

  // 排程下次檢查
  scheduleNextCheck(website, state) {
    // 清除現有定時器
    if (this.timers.has(website.id)) {
      clearTimeout(this.timers.get(website.id));
    }
    
    const interval = this.calculateInterval(website, state);
    
    const timer = setTimeout(() => {
      this.checkWebsite(website);
    }, interval);
    
    this.timers.set(website.id, timer);
    
    console.log(`${website.name}: 下次檢查在 ${interval/1000} 秒後 (狀態: ${state})`);
  }

  async checkWebsite(website) {
    if (this.activeChecks.has(website.id)) {
      console.log(`${website.url} 檢查進行中，略過`);
      return;
    }

    this.activeChecks.set(website.id, true);
    
    try {
      // 重新載入最新的網站資料以確保設定是最新的
      const latestWebsite = await this.websiteStorage.getById(website.id);
      if (!latestWebsite) {
        console.log(`網站 ${website.name} 已被刪除，停止監控`);
        return;
      }
      
      console.log(`[平衡監控] 檢查網站: ${latestWebsite.name}`);
      
      const currentState = this.websiteStates.get(website.id) || 'normal';
      const metrics = await this.performCheck(latestWebsite);
      
      // 狀態轉換邏輯
      const newState = this.determineNewState(currentState, metrics.isHealthy);
      const shouldAlert = this.shouldSendAlert(currentState, newState);
      
      // 更新狀態
      if (newState !== currentState) {
        this.websiteStates.set(website.id, newState);
        console.log(`${latestWebsite.name}: 狀態轉換 ${currentState} -> ${newState}`);
      }
      
      // 寫入 InfluxDB
      await this.influxService.writeMetrics(latestWebsite.id, latestWebsite.url, metrics);
      
      // 更新網站狀態 (只更新監控相關欄位)
      const updateData = {
        lastCheck: new Date().toISOString(),
        status: metrics.isHealthy ? 'healthy' : 'unhealthy',
        updatedAt: new Date().toISOString()
      };
      
      await this.websiteStorage.update(latestWebsite.id, updateData);
      
      // 發送告警
      if (shouldAlert) {
        try {
          await this.sendAlert(latestWebsite, this.getAlertType(currentState, newState), metrics);
        } catch (error) {
          console.error('發送告警時發生錯誤:', error);
        }
      }
      
      console.log(`${latestWebsite.name} 檢查完成 - 狀態: ${metrics.isHealthy ? 'healthy' : 'unhealthy'} (監控狀態: ${newState})`);
      
      // 排程下次檢查
      this.scheduleNextCheck(latestWebsite, newState);
      
    } catch (error) {
      console.error(`檢查 ${website.url} 時發生錯誤:`, error);
      
      // 嘗試重新載入網站資料，如果失敗就使用原本的
      let errorWebsite = website;
      try {
        const latestWebsite = await this.websiteStorage.getById(website.id);
        if (latestWebsite) {
          errorWebsite = latestWebsite;
        }
      } catch (e) {
        // 忽略載入錯誤，使用原本的website
      }
      
      const currentState = this.websiteStates.get(website.id) || 'normal';
      
      // 狀態轉換邏輯（錯誤視為失敗）
      const newState = this.determineNewState(currentState, false);
      const shouldAlert = this.shouldSendAlert(currentState, newState);
      
      // 更新狀態
      if (newState !== currentState) {
        this.websiteStates.set(website.id, newState);
        console.log(`${website.name}: 狀態轉換 ${currentState} -> ${newState} (錯誤)`);
      }
      
      // 記錄錯誤到 InfluxDB
      const errorMetrics = {
        responseTime: 0,
        statusCode: 0,
        dnsTime: 0,
        connectTime: 0,
        sslHandshakeTime: 0,
        timeToFirstByte: 0,
        downloadTime: 0,
        transferRate: 0,
        sslExpiryDays: 0,
        isHealthy: false,
        errorMessage: error.message
      };
      
      await this.influxService.writeMetrics(website.id, website.url, errorMetrics);
      
      // 更新網站狀態 (只更新監控相關欄位)
      const updateData = {
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await this.websiteStorage.update(website.id, updateData);
      
      // 發送告警
      if (shouldAlert) {
        try {
          await this.sendAlert(website, this.getAlertType(currentState, newState), errorMetrics);
        } catch (error) {
          console.error('發送告警時發生錯誤:', error);
        }
      }
      
      // 排程下次檢查
      this.scheduleNextCheck(website, newState);
      
    } finally {
      this.activeChecks.delete(website.id);
    }
  }

  async performCheck(website) {
    const startTime = Date.now();
    const url = new URL(website.url);
    
    try {
      // DNS 查詢時間
      const dnsStartTime = Date.now();
      await dns.lookup(url.hostname);
      const dnsTime = Date.now() - dnsStartTime;

      // 詳細效能指標測量
      const performanceMetrics = await this.measureDetailedPerformance(url);

      // HTTP 請求
      const response = await axios.get(website.url, {
        timeout: 30000,
        validateStatus: () => true, // 接受所有狀態碼
        maxRedirects: 5,
        headers: {
          'User-Agent': 'Website-Monitor/1.0'
        }
      });

      const responseTime = Date.now() - startTime;
      const transferRate = this.calculateTransferRate(response, responseTime);
      
      // 檢查狀態碼是否在正常範圍
      const isStatusCodeValid = response.status >= website.statusCodeRange.min && 
                               response.status <= website.statusCodeRange.max;
      
      // 檢查關鍵字
      const isKeywordValid = website.keyword ? 
        response.data.toString().includes(website.keyword) : true;
      
      // SSL 憑證檢查（僅適用於 HTTPS）
      let sslExpiryDays = 0;
      if (url.protocol === 'https:') {
        sslExpiryDays = await this.checkSSLCertificate(url.hostname, url.port || 443);
      }

      const isHealthy = isStatusCodeValid && isKeywordValid && 
                       (url.protocol !== 'https:' || sslExpiryDays > 0);

      return {
        responseTime,
        statusCode: response.status,
        dnsTime,
        connectTime: performanceMetrics.connectTime,
        sslHandshakeTime: performanceMetrics.sslHandshakeTime,
        timeToFirstByte: performanceMetrics.timeToFirstByte,
        downloadTime: performanceMetrics.downloadTime,
        transferRate,
        sslExpiryDays,
        isHealthy,
        errorMessage: isHealthy ? '' : this.generateErrorMessage(isStatusCodeValid, isKeywordValid, sslExpiryDays, url.protocol)
      };

    } catch (error) {
      throw new Error(`網站檢查失敗: ${error.message}`);
    }
  }

  async measureDetailedPerformance(url) {
    return new Promise((resolve) => {
      const isHttps = url.protocol === 'https:';
      const port = url.port || (isHttps ? 443 : 80);
      const hostname = url.hostname;
      
      let connectStartTime;
      let connectEndTime;
      let sslHandshakeStartTime;
      let sslHandshakeEndTime;
      let firstByteTime;
      let downloadStartTime;
      let downloadEndTime;
      
      const startTime = Date.now();
      
      // 建立 TCP 連接
      const socket = new net.Socket();
      
      socket.setTimeout(10000);
      
      connectStartTime = Date.now();
      
      socket.connect(port, hostname, () => {
        connectEndTime = Date.now();
        
        if (isHttps) {
          // 進行 SSL 交握
          sslHandshakeStartTime = Date.now();
          
          const tlsSocket = tls.connect({
            socket: socket,
            servername: hostname,
            rejectUnauthorized: false
          }, () => {
            sslHandshakeEndTime = Date.now();
            
            // 發送 HTTP 請求
            const requestPath = url.pathname + (url.search || '');
            const httpRequest = `GET ${requestPath} HTTP/1.1\r\nHost: ${hostname}\r\nUser-Agent: Website-Monitor/1.0\r\nConnection: close\r\n\r\n`;
            
            downloadStartTime = Date.now();
            tlsSocket.write(httpRequest);
            
            let responseReceived = false;
            
            tlsSocket.on('data', (data) => {
              if (!responseReceived) {
                firstByteTime = Date.now();
                responseReceived = true;
              }
            });
            
            tlsSocket.on('end', () => {
              downloadEndTime = Date.now();
              tlsSocket.destroy();
              
              resolve({
                connectTime: connectEndTime - connectStartTime,
                sslHandshakeTime: sslHandshakeEndTime - sslHandshakeStartTime,
                timeToFirstByte: firstByteTime - startTime,
                downloadTime: downloadEndTime - downloadStartTime
              });
            });
          });
          
          tlsSocket.on('error', () => {
            socket.destroy();
            resolve({
              connectTime: connectEndTime ? connectEndTime - connectStartTime : 0,
              sslHandshakeTime: 0,
              timeToFirstByte: 0,
              downloadTime: 0
            });
          });
          
        } else {
          // HTTP 請求
          const requestPath = url.pathname + (url.search || '');
          const httpRequest = `GET ${requestPath} HTTP/1.1\r\nHost: ${hostname}\r\nUser-Agent: Website-Monitor/1.0\r\nConnection: close\r\n\r\n`;
          
          downloadStartTime = Date.now();
          socket.write(httpRequest);
          
          let responseReceived = false;
          
          socket.on('data', (data) => {
            if (!responseReceived) {
              firstByteTime = Date.now();
              responseReceived = true;
            }
          });
          
          socket.on('end', () => {
            downloadEndTime = Date.now();
            socket.destroy();
            
            resolve({
              connectTime: connectEndTime - connectStartTime,
              sslHandshakeTime: 0,
              timeToFirstByte: firstByteTime - startTime,
              downloadTime: downloadEndTime - downloadStartTime
            });
          });
        }
      });
      
      socket.on('error', () => {
        socket.destroy();
        resolve({
          connectTime: 0,
          sslHandshakeTime: 0,
          timeToFirstByte: 0,
          downloadTime: 0
        });
      });
      
      socket.on('timeout', () => {
        socket.destroy();
        resolve({
          connectTime: 0,
          sslHandshakeTime: 0,
          timeToFirstByte: 0,
          downloadTime: 0
        });
      });
    });
  }

  calculateTransferRate(response, responseTime) {
    try {
      const contentLength = response.headers['content-length'];
      if (contentLength && responseTime > 0) {
        const bytes = parseInt(contentLength);
        const kbps = (bytes * 8) / (responseTime / 1000) / 1024;
        return Math.round(kbps * 100) / 100;
      }
      return 0;
    } catch (error) {
      return 0;
    }
  }

  async checkSSLCertificate(hostname, port) {
    return new Promise((resolve) => {
      const options = {
        port: port,
        host: hostname,
        rejectUnauthorized: false,
        servername: hostname // 確保 SNI 正確設定
      };
      
      const socket = tls.connect(options, () => {
        try {
          const cert = socket.getPeerCertificate(true);
          if (!cert || !cert.valid_to) {
            console.log(`${hostname}: 無法取得 SSL 憑證資訊`);
            socket.destroy();
            resolve(0);
            return;
          }
          
          const expiryDate = new Date(cert.valid_to);
          const now = new Date();
          const daysLeft = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
          
          console.log(`${hostname}: SSL 憑證到期日: ${cert.valid_to}, 剩餘天數: ${daysLeft}`);
          
          socket.destroy();
          resolve(Math.max(0, daysLeft));
        } catch (error) {
          console.error(`${hostname}: SSL 檢查錯誤:`, error.message);
          socket.destroy();
          resolve(0);
        }
      });

      socket.on('error', (error) => {
        console.error(`${hostname}: SSL 連接錯誤:`, error.message);
        resolve(0);
      });

      socket.setTimeout(10000, () => {
        console.log(`${hostname}: SSL 檢查逾時`);
        socket.destroy();
        resolve(0);
      });
    });
  }

  generateErrorMessage(isStatusCodeValid, isKeywordValid, sslExpiryDays, protocol) {
    const errors = [];
    
    if (!isStatusCodeValid) {
      errors.push('狀態碼不在正常範圍');
    }
    
    if (!isKeywordValid) {
      errors.push('未找到關鍵字');
    }
    
    if (protocol === 'https:' && sslExpiryDays <= 0) {
      errors.push('SSL憑證已過期或無效');
    }
    
    return errors.join(', ');
  }

  // 平衡監控相關方法
  
  // 決定新狀態
  determineNewState(currentState, isHealthy) {
    if (isHealthy) {
      // 檢測成功
      return currentState === 'down' || currentState === 'suspicious' ? 'normal' : currentState;
    } else {
      // 檢測失敗
      if (currentState === 'normal') {
        return 'suspicious';
      } else if (currentState === 'suspicious') {
        return 'down';
      }
      return currentState; // down 狀態保持不變
    }
  }

  // 判斷是否應該發送告警
  shouldSendAlert(oldState, newState) {
    // 只有在狀態轉換時才考慮告警
    if (newState === oldState) return false;
    
    // suspicious -> down: 發送異常告警
    if (newState === 'down' && oldState === 'suspicious') {
      return true;
    }
    
    // down -> normal: 發送恢復告警
    if (newState === 'normal' && oldState === 'down') {
      return true;
    }
    
    return false;
  }

  // 取得告警類型
  getAlertType(oldState, newState) {
    if (newState === 'down' && oldState === 'suspicious') {
      return 'failure';
    }
    if (newState === 'normal' && oldState === 'down') {
      return 'recovery';
    }
    return null;
  }

  // 發送告警
  async sendAlert(website, alertType, metrics = {}) {
    const alertKey = `${website.id}_${alertType}`;
    
    let message;
    let severity;
    
    if (alertType === 'failure') {
      message = `${website.name} 服務異常（經確認）`;
      severity = 'critical';
      this.alerts.set(alertKey, new Date());
    } else if (alertType === 'recovery') {
      message = `${website.name} 服務已恢復正常`;
      severity = 'info';
      this.alerts.set(alertKey, new Date());
      
      // 清除異常告警記錄
      this.alerts.delete(`${website.id}_failure`);
    }
    
    console.log(`📧 [${severity.toUpperCase()}] ${message}`);
    
    // 發送實際告警通知
    try {
      await this.alertService.sendAlert(website, alertType, message, metrics);
    } catch (error) {
      console.error('發送告警失敗:', error);
    }
  }

  // 清理資源方法
  cleanup() {
    // 清除所有定時器
    for (const [websiteId, timer] of this.timers) {
      clearTimeout(timer);
      console.log(`清除網站 ${websiteId} 的定時器`);
    }
    
    this.timers.clear();
    this.websiteStates.clear();
    this.alerts.clear();
    this.activeChecks.clear();
    
    console.log('平衡監控服務已清理');
  }

  // 取得監控統計
  getMonitoringStats() {
    const stats = {
      totalWebsites: this.timers.size, // 使用定時器數量，因為每個網站都有定時器
      stateDistribution: {},
      activeChecks: this.activeChecks.size,
      scheduledChecks: this.timers.size
    };
    
    // 統計各狀態數量，如果沒有狀態記錄則默認為 normal
    const stateCount = { normal: 0, suspicious: 0, down: 0 };
    
    for (const [websiteId, timer] of this.timers) {
      const state = this.websiteStates.get(websiteId) || 'normal';
      stateCount[state]++;
    }
    
    stats.stateDistribution = stateCount;
    
    return stats;
  }

  // 停止特定網站的監控
  stopMonitoring(websiteId) {
    console.log(`停止監控: ${websiteId}`);
    
    // 清除定時器
    if (this.timers.has(websiteId)) {
      clearTimeout(this.timers.get(websiteId));
      this.timers.delete(websiteId);
    }
    
    // 清除網站狀態
    this.websiteStates.delete(websiteId);
    
    // 清除告警狀態
    this.alerts.delete(websiteId);
    
    // 移除進行中的檢查
    if (this.activeChecks.has(websiteId)) {
      this.activeChecks.delete(websiteId);
    }
  }

  // 開始特定網站的監控
  async startMonitoring(website) {
    console.log(`開始監控: ${website.name} (${website.id})`);
    
    // 確保網站已啟用
    if (!website.enabled) {
      console.log(`網站 ${website.name} 未啟用，跳過監控`);
      return;
    }
    
    // 初始化網站狀態
    this.websiteStates.set(website.id, 'normal');
    
    // 開始監控
    this.initializeWebsiteMonitoring(website);
  }

  // 重新加載所有網站的監控狀態
  async reloadMonitoring() {
    console.log('重新加載監控狀態...');
    
    // 清除所有現有的監控
    this.stopAllMonitoring();
    
    // 重新開始所有啟用網站的監控
    await this.checkAllWebsites();
  }

  // 停止所有監控
  stopAllMonitoring() {
    console.log('停止所有監控...');
    
    // 清除所有定時器
    for (const [websiteId, timer] of this.timers) {
      clearTimeout(timer);
    }
    
    // 清空所有狀態
    this.timers.clear();
    this.websiteStates.clear();
    this.alerts.clear();
    this.activeChecks.clear();
  }
}

module.exports = MonitorService;