# 版本更新日誌 - 2025-09-16

## 修復項目：網站數據載入失敗問題

### 更新時間
2025-09-16 14:35

### 版本號
v3.2.4

### 問題描述
- WebsiteDetail 頁面顯示「無法載入網站數據」錯誤
- API 呼叫返回 404 錯誤

### 問題原因
前端使用了錯誤的 API 端點路徑：
- 錯誤：`/api/statistics/website/:id/stats`
- 錯誤：`/api/metrics/website/:id/history`
- 錯誤：`/api/events/website/:id`

### 修復方案
更正 API 端點路徑為：
- 正確：`/api/metrics/:id/stats`
- 正確：`/api/metrics/:id`
- 正確：`/api/metrics/:id/events`

### 修改檔案
- `/root/0901newwww/frontend/src/pages/WebsiteDetail.js`
- `/root/0901newwww/frontend/src/pages/WebsiteDetailWithTabs.js`

### 技術細節
```javascript
// 修正前
const [websiteRes, statsRes, metricsRes, eventsRes] = await Promise.all([
  axios.get(`/api/websites/${id}`),
  axios.get(`/api/statistics/website/${id}/stats?range=${timeRange}`),
  axios.get(`/api/metrics/website/${id}/history?range=${timeRange}`),
  axios.get(`/api/events/website/${id}?range=${timeRange}`)
]);

// 修正後
const [websiteRes, statsRes, metricsRes, eventsRes] = await Promise.all([
  axios.get(`/api/websites/${id}`),
  axios.get(`/api/metrics/${id}/stats?range=${timeRange}`),
  axios.get(`/api/metrics/${id}?range=${timeRange}`),
  axios.get(`/api/metrics/${id}/events?range=${timeRange}`)
]);
```

### 測試結果
- ✅ API 呼叫成功（狀態碼 304）
- ✅ 網站數據正常載入
- ✅ 統計資料正常顯示
- ✅ 事件列表正常顯示
- ✅ 圖表數據正常渲染

### 影響範圍
- 網站詳細資訊頁面的數據載入功能
- 不影響其他頁面

### 後續建議
- 建立 API 端點文檔，避免類似錯誤
- 考慮使用 TypeScript 或 API 客戶端生成工具
- 加入 API 端點測試

---
更新人員：系統管理員
更新狀態：已完成