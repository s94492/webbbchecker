const { InfluxDB, Point } = require('@influxdata/influxdb-client');

class InfluxService {
  constructor() {
    this.influxDB = new InfluxDB({
      url: process.env.INFLUXDB_URL || 'http://localhost:8086',
      token: process.env.INFLUXDB_TOKEN || 'mytoken',
    });
    
    this.org = process.env.INFLUXDB_ORG || 'myorg';
    this.bucket = process.env.INFLUXDB_BUCKET || 'website-monitor';
    
    // 資料留存設定
    this.dataRetentionDays = parseInt(process.env.DATA_RETENTION_DAYS) || 180;
    this.dataRetentionPolicy = process.env.DATA_RETENTION_POLICY || '6months';
    this.autoCleanupEnabled = process.env.AUTO_CLEANUP_ENABLED === 'true';
    
    this.writeApi = this.influxDB.getWriteApi(this.org, this.bucket);
    this.queryApi = this.influxDB.getQueryApi(this.org);
    
    console.log(`InfluxDB 服務已初始化 - 資料留存: ${this.dataRetentionPolicy} (${this.dataRetentionDays}天)`);
    
    // 初始化留存策略
    this.initializeRetentionPolicy();
  }

  async initializeRetentionPolicy() {
    if (this.autoCleanupEnabled) {
      try {
        await this.updateBucketRetention();
        console.log(`資料留存策略已設定: ${this.dataRetentionDays}天`);
      } catch (error) {
        console.error('設定資料留存策略失敗:', error.message);
      }
    }
  }

  async updateBucketRetention() {
    const retentionSeconds = this.dataRetentionDays * 24 * 60 * 60;
    
    try {
      // 取得 bucket ID
      const bucketsApi = new (require('@influxdata/influxdb-client-apis').BucketsAPI)(this.influxDB);
      const buckets = await bucketsApi.getBuckets({ org: this.org, name: this.bucket });
      
      if (buckets.buckets && buckets.buckets.length > 0) {
        const bucketId = buckets.buckets[0].id;
        
        // 更新留存規則
        const updateBucket = {
          retentionRules: [{
            type: 'expire',
            everySeconds: retentionSeconds
          }]
        };
        
        await bucketsApi.patchBucketsID({ bucketID: bucketId, body: updateBucket });
        return true;
      }
    } catch (error) {
      console.error('更新 Bucket 留存策略失敗:', error.message);
      return false;
    }
  }

  getRetentionInfo() {
    return {
      days: this.dataRetentionDays,
      policy: this.dataRetentionPolicy,
      autoCleanup: this.autoCleanupEnabled
    };
  }

  async writeMetrics(websiteId, url, metrics) {
    try {
      const point = new Point('website_metrics')
        .tag('website_id', websiteId)
        .tag('url', url)
        .floatField('response_time', metrics.responseTime || 0)
        .intField('status_code', metrics.statusCode || 0)
        .floatField('dns_time', metrics.dnsTime || 0)
        .floatField('connect_time', metrics.connectTime || 0)
        .floatField('ssl_handshake_time', metrics.sslHandshakeTime || 0)
        .floatField('time_to_first_byte', metrics.timeToFirstByte || 0)
        .floatField('download_time', metrics.downloadTime || 0)
        .floatField('transfer_rate', metrics.transferRate || 0)
        .intField('ssl_expiry_days', metrics.sslExpiryDays || 0)
        .booleanField('is_healthy', metrics.isHealthy || false)
        .stringField('error_message', metrics.errorMessage || '')
        .timestamp(new Date());

      this.writeApi.writePoint(point);
      await this.writeApi.flush();
      
      console.log(`寫入 ${url} 的監控數據到 InfluxDB`);
    } catch (error) {
      console.error('寫入 InfluxDB 失敗:', error);
      throw error;
    }
  }

  async getMetrics(websiteId, range = '1h') {
    try {
      const query = `
        from(bucket: "${this.bucket}")
          |> range(start: -${range})
          |> filter(fn: (r) => r._measurement == "website_metrics")
          |> filter(fn: (r) => r.website_id == "${websiteId}")
          |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
          |> sort(columns: ["_time"])
      `;

      const rows = [];
      return new Promise((resolve, reject) => {
        this.queryApi.queryRows(query, {
          next: (row, tableMeta) => {
            const record = tableMeta.toObject(row);
            rows.push({
              time: record._time,
              responseTime: record.response_time || 0,
              statusCode: record.status_code || 0,
              dnsTime: record.dns_time || 0,
              connectTime: record.connect_time || 0,
              sslHandshakeTime: record.ssl_handshake_time || 0,
              timeToFirstByte: record.time_to_first_byte || 0,
              downloadTime: record.download_time || 0,
              transferRate: record.transfer_rate || 0,
              sslExpiryDays: record.ssl_expiry_days || 0,
              isHealthy: record.is_healthy || false,
              errorMessage: record.error_message || ''
            });
          },
          error: (error) => {
            console.error('查詢 InfluxDB 失敗:', error);
            reject(error);
          },
          complete: () => {
            console.log(`取得 ${websiteId} 的 ${rows.length} 筆監控記錄`);
            resolve(rows);
          }
        });
      });
    } catch (error) {
      console.error('查詢 InfluxDB 失敗:', error);
      throw error;
    }
  }

  async getLatestMetrics(websiteId) {
    try {
      const query = `
        from(bucket: "${this.bucket}")
          |> range(start: -1h)
          |> filter(fn: (r) => r._measurement == "website_metrics")
          |> filter(fn: (r) => r.website_id == "${websiteId}")
          |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
          |> sort(columns: ["_time"], desc: true)
          |> limit(n: 1)
      `;

      const rows = [];
      return new Promise((resolve, reject) => {
        this.queryApi.queryRows(query, {
          next: (row, tableMeta) => {
            const record = tableMeta.toObject(row);
            rows.push({
              time: record._time,
              responseTime: record.response_time || 0,
              statusCode: record.status_code || 0,
              dnsTime: record.dns_time || 0,
              connectTime: record.connect_time || 0,
              sslHandshakeTime: record.ssl_handshake_time || 0,
              timeToFirstByte: record.time_to_first_byte || 0,
              downloadTime: record.download_time || 0,
              transferRate: record.transfer_rate || 0,
              sslExpiryDays: record.ssl_expiry_days || 0,
              isHealthy: record.is_healthy || false,
              errorMessage: record.error_message || ''
            });
          },
          error: (error) => {
            console.error('查詢最新 InfluxDB 資料失敗:', error);
            reject(error);
          },
          complete: () => {
            resolve(rows[0] || null);
          }
        });
      });
    } catch (error) {
      console.error('查詢最新 InfluxDB 資料失敗:', error);
      throw error;
    }
  }
}

module.exports = InfluxService;