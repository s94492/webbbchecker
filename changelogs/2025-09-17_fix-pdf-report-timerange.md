# 修復 PDF 報表時間範圍支援

## 發布日期
2025-09-17 10:28

## 版本
v1.0.7-patch

## 修復內容

### 問題描述
- PDF 報表的效能趨勢圖表只支援 24h 和 7d
- 圖表資料使用模擬數據而非真實查詢
- 時間範圍選項與前端不一致

### 解決方案

#### 1. 支援完整時間範圍
擴展 `getTimePeriods` 方法支援所有時間範圍：
- **1小時**：6個10分鐘段
- **3小時**：6個30分鐘段
- **6小時**：6個1小時段
- **12小時**：6個2小時段
- **24小時**：6個4小時段
- **2天**：6個8小時段
- **7天**：7個單日
- **14天**：7個2天段
- **30天**：6個5天段
- **90天**：6個15天段

#### 2. 實作真實資料查詢
修改 `getPeriodMetrics` 方法：
- 使用 InfluxService 查詢真實數據
- 計算每個時段的實際統計值
- 支援多網站聚合統計

## 技術細節

### 修改檔案
- `backend/src/services/reportService.js`
  - 新增 InfluxService 引用
  - 更新 `getTimePeriods()` 支援所有時間範圍
  - 重寫 `getPeriodMetrics()` 使用真實查詢

### 資料查詢邏輯
```javascript
// 使用 InfluxService 查詢指定時間範圍的數據
const metrics = await this.influxService.getMetrics(website.id, period.range);

// 計算統計數據
avgResponseTime: 平均回應時間
maxResponseTime: 最大回應時間
uptime: 可用性百分比
checkCount: 檢查次數
```

## 測試結果
- ✅ 1小時報表：62KB，正常生成
- ✅ 24小時報表：62KB，正常生成
- ✅ 7天報表：72KB，正常生成
- ✅ 30天報表：70KB，正常生成
- ✅ 資料為真實查詢結果，非模擬數據

## 影響範圍
- PDF 報表生成功能完全支援所有時間範圍
- 報表數據準確性大幅提升
- 效能趨勢表格顯示真實監控資料