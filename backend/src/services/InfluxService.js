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

  getAggregationWindow(range) {
    // 根據不同時間範圍返回適當的聚合窗口
    // 目標：控制資料點在 100-200 個之間
    const windowMap = {
      '1h': '1m',    // 1小時：60個資料點
      '3h': '3m',    // 3小時：60個資料點
      '6h': '5m',    // 6小時：72個資料點
      '12h': '10m',  // 12小時：72個資料點
      '24h': '15m',  // 24小時：96個資料點
      '2d': '30m',   // 2天：96個資料點
      '7d': '2h',    // 7天：84個資料點（原本1h會有168個）
      '14d': '4h',   // 14天：84個資料點（原本2h會有168個）
      '30d': '6h',   // 30天：120個資料點（原本4h會有180個）
      '90d': '24h'   // 90天：90個資料點（原本12h會有180個）
    };

    return windowMap[range] || '5m';
  }

  async getMetrics(websiteId, range = '1h') {
    try {
      // 簡化查詢，先獲取所有資料
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
            // 在應用層進行資料聚合
            const aggregatedData = this.aggregateData(rows, range);
            console.log(`取得 ${websiteId} 的 ${rows.length} 筆原始記錄，聚合後 ${aggregatedData.length} 筆 (時間範圍: ${range})`);
            resolve(aggregatedData);
          }
        });
      });
    } catch (error) {
      console.error('查詢 InfluxDB 失敗:', error);
      throw error;
    }
  }

  // 在應用層進行資料聚合
  aggregateData(data, range) {
    // 根據時間範圍決定聚合策略
    const aggregationConfig = {
      '1h': 1,      // 不聚合
      '3h': 3,      // 每3筆聚合
      '6h': 5,      // 每5筆聚合
      '12h': 10,    // 每10筆聚合
      '24h': 15,    // 每15筆聚合
      '2d': 30,     // 每30筆聚合
      '7d': 20,     // 每20筆聚合（目標約100個點）
      '14d': 40,    // 每40筆聚合（目標約85個點）
      '30d': 50,    // 每50筆聚合（目標約70個點）
      '90d': 100    // 每100筆聚合（目標約90個點）
    };

    const interval = aggregationConfig[range] || 1;

    // 如果不需要聚合，直接返回
    if (interval === 1) {
      return data;
    }

    // 進行聚合，計算每個區間的平均值
    const aggregatedData = [];
    for (let i = 0; i < data.length; i += interval) {
      const endIndex = Math.min(i + interval, data.length);
      const chunk = data.slice(i, endIndex);

      if (chunk.length > 0) {
        // 計算該區間內所有數值的平均值
        const avgData = {
          // 使用區間第一個資料的時間作為聚合後的時間點
          time: chunk[0].time,

          // 計算數值型欄位的平均值
          responseTime: Math.round(
            chunk.reduce((sum, d) => sum + d.responseTime, 0) / chunk.length
          ),
          statusCode: Math.round(
            chunk.reduce((sum, d) => sum + d.statusCode, 0) / chunk.length
          ),
          dnsTime: Math.round(
            chunk.reduce((sum, d) => sum + d.dnsTime, 0) / chunk.length
          ),
          connectTime: Math.round(
            chunk.reduce((sum, d) => sum + d.connectTime, 0) / chunk.length
          ),
          sslHandshakeTime: Math.round(
            chunk.reduce((sum, d) => sum + d.sslHandshakeTime, 0) / chunk.length
          ),
          timeToFirstByte: Math.round(
            chunk.reduce((sum, d) => sum + d.timeToFirstByte, 0) / chunk.length
          ),
          downloadTime: Math.round(
            chunk.reduce((sum, d) => sum + d.downloadTime, 0) / chunk.length
          ),
          transferRate: Math.round(
            chunk.reduce((sum, d) => sum + d.transferRate, 0) / chunk.length
          ),
          sslExpiryDays: Math.round(
            chunk.reduce((sum, d) => sum + d.sslExpiryDays, 0) / chunk.length
          ),

          // 健康狀態：保守策略，只要有一個不健康就標記為不健康
          isHealthy: chunk.every(d => d.isHealthy),

          // 錯誤訊息：取最後一個非空的錯誤訊息
          errorMessage: chunk.reduce((msg, d) => d.errorMessage || msg, '')
        };

        aggregatedData.push(avgData);
      }
    }

    return aggregatedData;
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