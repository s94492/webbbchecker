# 完整修復 PDF 報表時間範圍顯示

## 發布日期
2025-09-17 10:34

## 版本
v1.0.8-patch

## 修復內容

### 問題描述
- 選擇 7 天時間範圍，PDF 報表仍顯示 24 小時
- `getInfluxTimeRange` 和 `getTimeRangeText` 方法未支援所有時間範圍

### 解決方案
更新兩個關鍵方法以支援所有時間範圍：

#### getInfluxTimeRange 方法
```javascript
case '1h': return '-1h';
case '3h': return '-3h';
case '6h': return '-6h';
case '12h': return '-12h';
case '24h': return '-24h';
case '2d': return '-2d';
case '7d': return '-7d';
case '14d': return '-14d';
case '30d': return '-30d';
case '90d': return '-90d';
```

#### getTimeRangeText 方法
支援中文顯示：
- 過去1小時、過去3小時、過去6小時...
- 過去7天、過去14天、過去30天、過去90天

## 技術細節

### 修改檔案
- `backend/src/services/reportService.js`
  - 更新 `getInfluxTimeRange()` 方法
  - 更新 `getTimeRangeText()` 方法

## 測試結果
- ✅ 1小時報表：顯示「過去1小時」
- ✅ 7天報表：顯示「過去7天」
- ✅ 30天報表：顯示「過去30天」
- ✅ 所有時間範圍正確對應

## 影響範圍
- PDF 報表標題和內容正確顯示選擇的時間範圍
- 資料查詢範圍與顯示文字一致
- 支援所有前端可選的時間範圍選項