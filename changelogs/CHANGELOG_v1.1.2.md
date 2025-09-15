# 變更日誌 - v1.1.2

## 🚀 新增功能

### 異常事件時間線 (Event Timeline)

- **新增 API 端點**: `GET /api/metrics/:websiteId/events`
  - 支援時間範圍查詢（1h, 6h, 12h, 24h, 1w, 1m）
  - 自動檢測服務狀態變化點
  - 區分 `outage` (服務異常) 和 `recovery` (服務恢復) 事件

- **前端時間線組件**: 
  - 位於網站詳情頁面，統計摘要下方、監控圖表上方
  - 視覺化事件時間線設計，包含：
    - 彩色狀態點（紅色異常、綠色恢復）  
    - 事件詳細描述
    - 時間戳記和相對時間
    - 狀態碼和回應時間資訊
  - 最多顯示10個最近事件

- **智能事件檢測**: 
  - 監控資料狀態變化點分析
  - 區分嚴重程度（error, warning, info）
  - 自動生成事件描述和標題

## 🔧 技術實作

### 後端更新
- 修改 `src/routes/metrics.js` 增加事件查詢邏輯
- 狀態變化演算法實現
- 事件資料結構標準化

### 前端更新  
- 新增 `src/components/EventTimeline.js` 組件
- 更新 `src/services/api.js` 支援事件API
- 整合到 `src/pages/WebsiteDetail.js`
- 使用 Material-UI + Tailwind CSS 設計

### API 架構
```
GET /api/metrics/:websiteId/events?range=24h
Response: {
  "success": true,
  "data": [
    {
      "id": "website-id-timestamp",
      "time": "2025-09-02T05:00:00.000Z",
      "type": "outage|recovery", 
      "severity": "error|warning|info",
      "title": "服務異常|服務恢復",
      "description": "詳細事件描述",
      "statusCode": 500,
      "responseTime": 5000,
      "isHealthy": false
    }
  ],
  "count": 5,
  "range": "24h"
}
```

## 📊 功能特色

- **直觀視覺化**: 時間線形式展示事件歷程
- **詳細資訊**: 每個事件包含完整監控資料
- **自動更新**: 隨時間範圍變更同步更新
- **響應式設計**: 支援各種螢幕尺寸
- **效能最佳化**: 限制顯示事件數量，避免介面過載

## 🚦 服務狀態

✅ **測試完成**: 所有服務正常運行
- 後端 API 端點測試通過
- 前端組件整合完成  
- Docker 服務重啟成功
- 功能表已更新

## 📝 使用方式

1. 進入任一網站詳情頁面
2. 在統計摘要下方可看到「異常事件時間線」
3. 切換時間範圍會同步更新事件資料
4. 點擊刷新按鈕可手動重新載入

## 🔄 版本資訊

- **版本**: v1.1.2
- **發布日期**: 2025-09-02
- **相容性**: 向下相容，無破壞性變更
- **Docker**: 已重啟相關服務應用變更

---

🔧 **系統工程師備註**: 此功能增強了監控系統的可觀測性，幫助快速識別和分析服務異常模式。