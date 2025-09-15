# 版本更新日誌 - 2025-09-10

## 修復 PDF 報表下載失敗問題

### 問題描述
- PDF 報表下載時出現 500 錯誤
- `Cannot read properties of undefined (reading 'length')` 錯誤
- `reportService.getWebsiteInfo is not a function` 錯誤

### 修復內容

#### 1. 修復空值檢查問題
- **檔案**: `/backend/src/services/reportService.js`
- **修復**: 對 `site.name` 和 `website.name` 進行空值檢查
- **變更**:
  ```javascript
  // 修復前
  const siteName = site.name.length > 22 ? site.name.substring(0, 19) + '...' : site.name;
  
  // 修復後  
  const siteName = (site.name && site.name.length > 22) ? site.name.substring(0, 19) + '...' : (site.name || 'Unknown');
  ```

#### 2. 修復方法調用問題
- **檔案**: `/backend/src/routes/reports.js`
- **問題**: 調用不存在的 `reportService.getWebsiteInfo()` 方法
- **修復**: 使用正確的 `websiteService.getById()` 方法
- **變更**:
  ```javascript
  // 修復前
  const website = await reportService.getWebsiteInfo(websiteId);
  
  // 修復後
  const website = await websiteService.getById(websiteId);
  ```

#### 3. 修復路由衝突問題
- **檔案**: `/backend/src/app.js`
- **問題**: 多個報表路由衝突導致錯誤路由被調用
- **修復**: 調整路由載入順序，優先處理 websiteReports 路由

### 測試結果
- ✅ 單一網站 PDF 報表下載正常 (31KB)
- ✅ 綜合 PDF 報表下載正常 (17KB)  
- ✅ 瀏覽器下載功能正常
- ✅ Content-Disposition 標頭設定正確
- ✅ 中文檔名編碼正常

### API 端點狀態
- ✅ `GET /api/reports/{websiteId}/pdf?range={timeRange}` - 單一網站報表
- ✅ `GET /api/reports/pdf/comprehensive?timeRange={timeRange}&type={reportType}` - 綜合報表

### 技術細節
- 使用 `websiteReports.js` 處理單一網站 PDF 報表
- 使用 `reports.js` 處理綜合 PDF 報表
- NotoSansTC 字體正確載入，中文顯示正常
- 移除符號亂碼問題（冒號改為破折號）

## 更新者
系統工程師

## 更新時間
2025-09-10 11:02