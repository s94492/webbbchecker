# 版本更新日誌 - 2025-09-16

## 修復項目：EventTimeline 組件陣列錯誤

### 更新時間
2025-09-16 14:49

### 版本號
v3.2.6

### 問題描述
- 頁面顯示 "events.slice is not a function" 執行時錯誤
- TypeError 在 EventTimeline 組件中發生
- 影響異常事件時間線的顯示

### 問題原因
1. API 返回的資料結構是 `{ success: true, data: events }` 物件
2. 前端錯誤地將整個回應物件設定為 events 狀態
3. EventTimeline 組件嘗試對非陣列物件呼叫 slice 方法

### 修復方案
1. **修正資料擷取邏輯**
   - 從 API 回應中正確提取 events 陣列
   - 使用 `eventsRes.data?.data` 來獲取實際的事件陣列

2. **加強組件防護**
   - 為 EventTimeline 組件的 events 參數設定預設值為空陣列
   - 使用 `Array.isArray()` 檢查並確保 events 是陣列
   - 統一使用 eventsList 變數來避免錯誤

### 修改檔案
- `/root/0901newwww/frontend/src/pages/WebsiteDetail.js`
- `/root/0901newwww/frontend/src/pages/WebsiteDetailWithTabs.js`
- `/root/0901newwww/frontend/src/components/EventTimeline.js`

### 技術細節
```javascript
// 修正前 - WebsiteDetail.js
setEvents(eventsRes.data || []);

// 修正後 - WebsiteDetail.js
setEvents(eventsRes.data?.data || eventsRes.data || []);

// 修正前 - EventTimeline.js
const EventTimeline = ({ events, loading = false }) => {
  // ...
  {events.slice(0, 10).map((event, index) => {

// 修正後 - EventTimeline.js
const EventTimeline = ({ events = [], loading = false }) => {
  const eventsList = Array.isArray(events) ? events : [];
  // ...
  {eventsList.slice(0, 10).map((event, index) => {
```

### 測試結果
- ✅ events.slice 錯誤已解決
- ✅ 異常事件時間線正常顯示
- ✅ 陣列方法正常執行
- ✅ 空值狀態正確處理

### 影響範圍
- WebsiteDetail 頁面的異常事件時間線功能
- 不影響其他組件

### 後續建議
- 統一 API 回應格式，避免資料結構不一致
- 建立統一的資料擷取工具函數
- 使用 TypeScript 定義資料類型

---
更新人員：系統管理員
更新狀態：已完成