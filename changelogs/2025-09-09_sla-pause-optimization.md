# SLA 暫停功能優化 - v1.3.1

**發布日期**: 2025-09-09  
**版本**: v1.3.1  
**類型**: 功能優化

## 📋 修改概覽

優化暫停監控功能的 SLA 計算與顯示邏輯，確保暫停的網站正確顯示「已暫停」狀態而非「異常」。

## 🔧 技術修改

### 後端修改

**檔案**: `/backend/src/routes/metrics.js`
- **SLA 統計 API 優化**: 新增暫停狀態檢測邏輯
- **特殊狀態回應**: 暫停網站回傳 `isPaused: true` 標記
- **服務實例統一**: 修復 `app.locals.websiteStorage` 未設置問題

**檔案**: `/backend/src/app.js`
```javascript
// 新增共享 websiteStorage 實例
app.locals.websiteStorage = monitorService.websiteStorage;
```

**檔案**: `/backend/src/routes/websites.js`
- **統一服務實例**: 移除本地 websiteStorage 實例，改用共享實例
- **直接調用優化**: 使用 `req.app.locals.websiteStorage` 直接調用

### 前端修改

**檔案**: `/frontend/src/pages/Dashboard.js`
- **SLA 計算邏輯**: 新增 `isPaused` 狀態檢測
- **進度條顯示**: 暫停網站顯示「已暫停」而非「異常」
- **狀態分類**: 區分 `paused`、`error`、`nodata` 三種狀態

```javascript
// 檢查是否為暫停狀態
if (stats.isPaused === true) {
  slaStatus = 'paused';
  slaPercentage = null;
}
```

**檔案**: `/frontend/src/pages/WebsiteDetail.js`
- **可用性顯示**: 暫停網站顯示「已暫停」而非百分比
- **條件渲染**: 使用 `stats.isPaused` 判斷顯示內容

## 📊 SLA 處理邏輯

### 暫停狀態處理方式（排除法）

| 狀態 | uptime 值 | 顯示內容 | 說明 |
|------|-----------|----------|------|
| **暫停** | `null` | 「已暫停」 | 暫停期間完全排除在 SLA 計算外 |
| **正常** | `0-100` | `XX.X%` | 基於監控記錄計算正常 uptime |
| **異常** | `null` | 「異常」 | API 錯誤或資料問題 |

### 暫停功能工作流程

1. **暫停監控**: `enabled: false`，停止定時器
2. **API 檢測**: 回傳 `isPaused: true`
3. **前端顯示**: Dashboard 和詳細頁面顯示「已暫停」
4. **恢復監控**: `enabled: true`，重新開始監控
5. **歷史計算**: 基於恢復後的監控記錄計算 SLA

## 🧪 測試結果

### API 回應格式

**暫停狀態**:
```json
{
  "success": true,
  "data": {
    "uptime": null,
    "downtime": "監控已暫停",
    "isPaused": true,
    "successfulChecks": 0
  }
}
```

**正常狀態**:
```json
{
  "success": true,
  "data": {
    "uptime": 100,
    "downtime": "0m",
    "isPaused": false,
    "successfulChecks": 91
  }
}
```

### 前端顯示效果

- **Dashboard SLA 進度條**: 暫停網站顯示灰色「已暫停」圖標
- **詳細頁面可用性**: 顯示「已暫停」而非百分比
- **統計卡片**: 停機時間顯示「監控已暫停」

## ✅ 驗證項目

- [x] 暫停網站 API 回傳正確格式
- [x] Dashboard SLA 進度條顯示「已暫停」
- [x] 詳細頁面可用性顯示正確
- [x] 恢復監控後 SLA 正常計算
- [x] 統一 websiteStorage 服務實例
- [x] 修復語法錯誤和重複宣告

## 🔄 使用者體驗改善

**修改前**: 暫停的網站在 Dashboard 顯示紅色「異常」，容易造成誤解  
**修改後**: 暫停的網站顯示灰色「已暫停」，語意清晰且視覺友好

**修改前**: 詳細頁面可用性仍顯示歷史百分比，與暫停狀態不符  
**修改後**: 詳細頁面明確顯示「已暫停」，狀態一致性更好

## 🚀 影響範圍

- **後端**: 統計 API 和服務實例管理
- **前端**: Dashboard 和詳細頁面的 SLA 顯示邏輯
- **使用體驗**: 暫停監控的視覺回饋更準確
- **資料一致性**: 統一服務實例避免資料不同步

## 💡 技術亮點

1. **智能狀態判斷**: 利用 `isPaused` 標記區分暫停和異常狀態
2. **服務架構優化**: 統一 websiteStorage 實例提升資料一致性
3. **使用者友好**: 直觀的狀態顯示提升操作體驗
4. **維護性提升**: 清晰的狀態分離便於後續功能擴展

---
*此版本主要解決用戶反饋的「暫停監控顯示異常」問題，提升系統狀態顯示的準確性和使用者體驗。*