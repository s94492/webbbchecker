const { v4: uuidv4 } = require('uuid');

class Website {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.url = data.url;
    this.name = data.name || this.extractNameFromUrl(data.url);
    this.interval = data.interval || 60; // 秒
    this.keyword = data.keyword || '';
    this.statusCodeRange = data.statusCodeRange || { min: 200, max: 299 };
    this.enabled = data.enabled !== false;
    this.dataRetention = data.dataRetention || '6months'; // 3months, 6months, 1year, 2years, custom
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
    this.lastCheck = data.lastCheck || null;
    this.status = data.status || 'pending'; // pending, healthy, unhealthy
    
    // SLA 計算用的時間戳
    // 只有明確提供時才設定，否則保持 null（表示從未暫停過）
    this.lastEnabledAt = data.lastEnabledAt || null;
    this.lastDisabledAt = data.lastDisabledAt || null;
  }

  extractNameFromUrl(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (error) {
      return url;
    }
  }

  toJSON() {
    return {
      id: this.id,
      url: this.url,
      name: this.name,
      interval: this.interval,
      keyword: this.keyword,
      statusCodeRange: this.statusCodeRange,
      enabled: this.enabled,
      dataRetention: this.dataRetention,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      lastCheck: this.lastCheck,
      status: this.status,
      lastEnabledAt: this.lastEnabledAt,
      lastDisabledAt: this.lastDisabledAt
    };
  }

  static validate(data) {
    const errors = [];

    if (!data.url) {
      errors.push('URL 為必填欄位');
    } else {
      try {
        new URL(data.url);
      } catch (error) {
        errors.push('URL 格式不正確');
      }
    }

    if (data.interval && (data.interval < 30 || data.interval > 3600)) {
      errors.push('監控間隔必須在 30-3600 秒之間');
    }

    if (data.statusCodeRange) {
      const { min, max } = data.statusCodeRange;
      if (min < 100 || min > 599 || max < 100 || max > 599 || min > max) {
        errors.push('狀態碼範圍格式不正確');
      }
    }

    return errors;
  }
}

module.exports = Website;