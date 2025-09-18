# 修復狀態碼嚴重性判斷邏輯

## 發布日期
2025-09-17 14:35

## 版本
v1.0.19-patch

## 問題描述
- 狀態碼 208 (Already Reported) 被誤判為嚴重錯誤，實際上它是有效的 2xx 狀態碼
- 未考慮每個網站自定義的 statusCodeRange 設定

## 修復內容

### 1. 改進事件嚴重性判斷邏輯
修改 `backend/src/routes/metrics.js`：
- 先取得網站的 statusCodeRange 設定
- 根據網站自定義的狀態碼範圍判斷嚴重性
- 新的判斷邏輯：
  - 在網站設定範圍內但其他檢查失敗（如關鍵字、SSL）: warning
  - 5xx 伺服器錯誤: error
  - 4xx 客戶端錯誤: warning
  - 3xx 或其他: warning
  - 恢復狀態: info

### 2. 技術細節
```javascript
// 取得網站設定以獲取 statusCodeRange
const websiteStorage = req.app.locals.websiteStorage;
const website = await websiteStorage.getById(websiteId);

// 根據網站設定的狀態碼範圍判斷嚴重性
let severity = 'info';
if (currentStatus !== 'healthy') {
  const { min, max } = website.statusCodeRange || { min: 200, max: 299 };

  if (metric.statusCode >= min && metric.statusCode <= max) {
    severity = 'warning'; // 在接受範圍內但其他檢查失敗
  } else if (metric.statusCode >= 500) {
    severity = 'error'; // 5xx 伺服器錯誤
  } else if (metric.statusCode >= 400) {
    severity = 'warning'; // 4xx 客戶端錯誤
  } else {
    severity = 'warning'; // 3xx 或其他
  }
}
```

## 測試結果
- ✅ 狀態碼 208 不再被標記為 error
- ✅ 正確使用網站自定義的 statusCodeRange
- ✅ 正確區分不同狀態碼範圍的嚴重性
- ✅ 支援每個網站的個別設定