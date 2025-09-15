const nodemailer = require('nodemailer');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class AlertService {
  constructor() {
    this.settingsFile = path.join(__dirname, '../data/alert-settings.json');
    this.settings = {
      email: {
        enabled: false,
        smtp: {
          host: '',
          port: 587,
          secure: false,
          auth: {
            user: '',
            pass: ''
          }
        },
        from: '',
        to: []
      },
      slack: {
        enabled: false,
        botToken: '',
        channel: '#alerts',
        username: 'Website Monitor'
      }
    };
    this.transporter = null;
    this.loadSettings();
  }

  async loadSettings() {
    try {
      const data = await fs.readFile(this.settingsFile, 'utf8');
      this.settings = { ...this.settings, ...JSON.parse(data) };
      console.log('告警設定已載入');
      
      // 初始化 email transporter
      if (this.settings.email.enabled) {
        this.initializeEmailTransporter();
      }
    } catch (error) {
      console.log('使用預設告警設定');
      await this.saveSettings();
    }
  }

  async saveSettings() {
    try {
      // 確保目錄存在
      const dir = path.dirname(this.settingsFile);
      await fs.mkdir(dir, { recursive: true });
      
      await fs.writeFile(this.settingsFile, JSON.stringify(this.settings, null, 2));
      console.log('告警設定已儲存');
    } catch (error) {
      console.error('儲存告警設定失敗:', error);
    }
  }

  async updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    
    // 重新初始化 email transporter
    if (this.settings.email.enabled) {
      this.initializeEmailTransporter();
    } else {
      this.transporter = null;
    }
    
    await this.saveSettings();
    return this.settings;
  }

  initializeEmailTransporter() {
    try {
      this.transporter = nodemailer.createTransporter({
        host: this.settings.email.smtp.host,
        port: this.settings.email.smtp.port,
        secure: this.settings.email.smtp.secure,
        auth: {
          user: this.settings.email.smtp.auth.user,
          pass: this.settings.email.smtp.auth.pass
        }
      });
      
      console.log('Email transporter 已初始化');
    } catch (error) {
      console.error('初始化 Email transporter 失敗:', error);
      this.transporter = null;
    }
  }

  async sendAlert(website, alertType, message, metrics = {}) {
    const alertData = {
      website,
      alertType,
      message,
      timestamp: new Date().toISOString(),
      metrics
    };

    const promises = [];

    // 發送 Email
    if (this.settings.email.enabled && this.transporter) {
      promises.push(this.sendEmailAlert(alertData));
    }

    // 發送 Slack
    if (this.settings.slack.enabled && this.settings.slack.botToken) {
      promises.push(this.sendSlackAlert(alertData));
    }

    // 發送所有通知
    const results = await Promise.allSettled(promises);
    
    // 記錄結果
    results.forEach((result, index) => {
      const type = index === 0 ? 'Email' : 'Slack';
      if (result.status === 'fulfilled') {
        console.log(`✓ ${type} 告警發送成功: ${website.name}`);
      } else {
        console.error(`✗ ${type} 告警發送失敗:`, result.reason);
      }
    });

    return results;
  }

  async sendEmailAlert(alertData) {
    const { website, alertType, message, timestamp, metrics } = alertData;
    
    const isFailure = alertType === 'failure';
    const subject = `${isFailure ? '🚨' : '✅'} ${website.name} - ${message}`;
    
    const html = this.generateEmailTemplate(alertData);
    
    const mailOptions = {
      from: this.settings.email.from,
      to: this.settings.email.to.join(', '),
      subject,
      html
    };

    return await this.transporter.sendMail(mailOptions);
  }

  async sendSlackAlert(alertData) {
    const { website, alertType, message, timestamp, metrics } = alertData;
    
    const isFailure = alertType === 'failure';
    const emoji = isFailure ? '🚨' : '✅';
    
    // 構建訊息內容
    let text = `${emoji} *${message}*\n\n`;
    text += `*網站:* ${website.name}\n`;
    text += `*URL:* ${website.url}\n`;
    text += `*時間:* ${new Date(timestamp).toLocaleString('zh-TW')}\n`;
    text += `*狀態:* ${isFailure ? '異常' : '恢復'}\n`;
    
    if (isFailure && metrics.errorMessage) {
      text += `*錯誤訊息:* ${metrics.errorMessage}\n`;
    }
    
    if (metrics.responseTime) {
      text += `*回應時間:* ${metrics.responseTime}ms\n`;
    }
    
    if (metrics.statusCode) {
      text += `*狀態碼:* ${metrics.statusCode}\n`;
    }

    const payload = {
      channel: this.settings.slack.channel,
      text: text,
      username: this.settings.slack.username,
      icon_emoji: ':robot_face:'
    };

    // 使用 Slack Bot API 發送訊息
    const response = await axios.post('https://slack.com/api/chat.postMessage', payload, {
      headers: {
        'Authorization': `Bearer ${this.settings.slack.botToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.data.ok) {
      throw new Error(`Slack API 錯誤: ${response.data.error}`);
    }

    return response;
  }

  generateEmailTemplate(alertData) {
    const { website, alertType, message, timestamp, metrics } = alertData;
    const isFailure = alertType === 'failure';
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; }
            .header { 
                background: ${isFailure ? '#dc3545' : '#28a745'}; 
                color: white; 
                padding: 20px; 
                text-align: center;
                border-radius: 8px 8px 0 0;
            }
            .content { 
                background: #f8f9fa; 
                padding: 20px; 
                border-radius: 0 0 8px 8px;
                border: 1px solid #dee2e6;
            }
            .info-row { 
                display: flex; 
                justify-content: space-between; 
                margin: 10px 0; 
                padding: 8px 0;
                border-bottom: 1px solid #e9ecef;
            }
            .label { font-weight: bold; color: #495057; }
            .value { color: #212529; }
            .footer { 
                text-align: center; 
                margin-top: 20px; 
                color: #6c757d; 
                font-size: 0.9em;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>${isFailure ? '🚨' : '✅'} ${message}</h1>
            </div>
            <div class="content">
                <div class="info-row">
                    <span class="label">網站名稱:</span>
                    <span class="value">${website.name}</span>
                </div>
                <div class="info-row">
                    <span class="label">URL:</span>
                    <span class="value">${website.url}</span>
                </div>
                <div class="info-row">
                    <span class="label">時間:</span>
                    <span class="value">${new Date(timestamp).toLocaleString('zh-TW')}</span>
                </div>
                <div class="info-row">
                    <span class="label">狀態:</span>
                    <span class="value">${isFailure ? '服務異常' : '服務恢復'}</span>
                </div>
                ${metrics.errorMessage ? `
                <div class="info-row">
                    <span class="label">錯誤訊息:</span>
                    <span class="value">${metrics.errorMessage}</span>
                </div>
                ` : ''}
                ${metrics.responseTime ? `
                <div class="info-row">
                    <span class="label">回應時間:</span>
                    <span class="value">${metrics.responseTime}ms</span>
                </div>
                ` : ''}
            </div>
            <div class="footer">
                <p>此郵件由 Website Monitor 系統自動發送</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  async testEmailConnection() {
    if (!this.transporter) {
      throw new Error('Email 設定未啟用或配置不正確');
    }
    
    return await this.transporter.verify();
  }

  async testSlackConnection() {
    if (!this.settings.slack.enabled || !this.settings.slack.botToken) {
      throw new Error('Slack 設定未啟用或 Bot Token 未設定');
    }

    const testPayload = {
      channel: this.settings.slack.channel,
      text: '🧪 *Website Monitor 連線測試*\n\n✅ Bot Token 連線測試成功\n告警系統運作正常',
      username: this.settings.slack.username,
      icon_emoji: ':robot_face:'
    };

    const response = await axios.post('https://slack.com/api/chat.postMessage', testPayload, {
      headers: {
        'Authorization': `Bearer ${this.settings.slack.botToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.data.ok) {
      throw new Error(`Slack API 錯誤: ${response.data.error}`);
    }

    return response;
  }

  getSettings() {
    // 返回設定但隱藏敏感資訊
    const safeSettings = JSON.parse(JSON.stringify(this.settings));
    if (safeSettings.email && safeSettings.email.smtp && safeSettings.email.smtp.auth && safeSettings.email.smtp.auth.pass) {
      safeSettings.email.smtp.auth.pass = '****';
    }
    if (safeSettings.slack && safeSettings.slack.botToken) {
      safeSettings.slack.botToken = '****';
    }
    return safeSettings;
  }
}

module.exports = AlertService;