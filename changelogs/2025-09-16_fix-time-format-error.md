# 版本更新日誌 - 2025-09-16

## 修復項目：時間格式化錯誤 (Invalid time value)

### 更新時間
2025-09-16 14:46

### 版本號
v3.2.5

### 問題描述
- 頁面顯示 "Invalid time value" 執行時錯誤
- RangeError 在 format 函數執行時發生
- 影響網站詳細資訊頁面的時間顯示

### 問題原因
部分網站資料的時間欄位可能為 null 或 undefined，直接傳入 `new Date()` 和 `format()` 函數會造成錯誤。

### 修復方案
為所有時間格式化操作加入空值檢查：
1. 檢查日期值是否存在
2. 若存在則正常格式化
3. 若不存在則顯示預設文字或空字串

### 修改檔案
- `/root/0901newwww/frontend/src/pages/WebsiteDetail.js`
- `/root/0901newwww/frontend/src/pages/WebsiteDetailWithTabs.js`

### 技術細節
```javascript
// 修正前
建立時間：{format(new Date(website.createdAt), 'yyyy/MM/dd HH:mm')}

// 修正後
建立時間：{website.createdAt ? format(new Date(website.createdAt), 'yyyy/MM/dd HH:mm') : '未知'}
```

修正的時間欄位包括：
- lastStatusChange（最後狀態變更）
- createdAt（建立時間）
- updatedAt（更新時間）
- lastCheck（最後檢查）
- item.time（檢查記錄時間）

### 測試結果
- ✅ 時間格式化錯誤已解決
- ✅ 頁面正常載入
- ✅ 時間資訊正確顯示
- ✅ 空值狀態正確處理

### 影響範圍
- 網站詳細資訊頁面的所有時間顯示
- 不影響其他功能

### 後續建議
- 在後端確保時間欄位有預設值
- 考慮建立統一的時間格式化工具函數
- 加入更完善的錯誤邊界處理

---
更新人員：系統管理員
更新狀態：已完成