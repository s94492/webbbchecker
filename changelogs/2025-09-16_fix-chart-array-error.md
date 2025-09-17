# 版本更新日誌 - 2025-09-16

## 修復項目：StackedAreaChart 組件陣列錯誤

### 更新時間
2025-09-16 15:02

### 版本號
v3.2.8

### 問題描述
- 頁面顯示 "data.forEach is not a function" 執行時錯誤
- TypeError 在 StackedAreaChart 組件中發生
- 影響監控圖表的顯示功能

### 問題原因
StackedAreaChart 組件接收到的 data 參數可能不是陣列，導致無法呼叫陣列方法 forEach。

### 修復方案
1. **設定預設參數**
   - 為 data 參數設定預設值為空陣列
   - 使用 `data = []` 確保始終有值

2. **陣列類型檢查**
   - 使用 `Array.isArray()` 檢查 data 是否為陣列
   - 建立 `chartData` 變數確保資料為陣列格式

3. **統一使用新變數**
   - 將所有使用 `data` 的地方改為使用 `chartData`
   - 確保所有函數都接收正確的陣列參數

### 修改檔案
- `/root/0901newwww/frontend/src/components/StackedAreaChart.js`

### 技術細節
```javascript
// 修正前
const StackedAreaChart = ({ data, title = "回應時間組成分析" }) => {
  // 直接使用 data
  const getOptimalUnit = (data) => {
    data.forEach(item => { // 可能出錯

// 修正後
const StackedAreaChart = ({ data = [], title = "回應時間組成分析" }) => {
  // 確保 data 是陣列
  const chartData = Array.isArray(data) ? data : [];

  const getOptimalUnit = (dataArray) => {
    dataArray.forEach(item => { // 安全使用
```

### 測試結果
- ✅ data.forEach 錯誤已解決
- ✅ 圖表組件正常渲染
- ✅ 資料處理邏輯正常運作
- ✅ 空值狀態正確處理

### 影響範圍
- WebsiteDetail 頁面的監控圖表功能
- 不影響其他組件和功能

### 後續建議
- 在父組件傳遞資料時確保類型正確
- 考慮使用 PropTypes 或 TypeScript 進行類型檢查
- 建立統一的資料驗證工具

### 瀏覽器快取提醒
如果錯誤仍然出現，請清除瀏覽器快取：
- Windows/Linux: `Ctrl + F5`
- Mac: `Cmd + Shift + R`

---
更新人員：系統管理員
更新狀態：已完成