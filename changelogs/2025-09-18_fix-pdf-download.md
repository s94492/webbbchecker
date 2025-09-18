# 修復PDF下載錯誤

## 日期
2025-09-18

## 問題描述
網站監控報表的PDF下載功能失敗，錯誤訊息為 "ReferenceError: range is not defined"

## 修復內容
1. 修正 `/backend/src/routes/websiteReports.js` 中的變數命名錯誤
   - 在 `generateWebsitePDF` 函數中，參數名稱為 `timeRange`
   - 但函數內部錯誤地使用了 `range` 變數
   - 將所有 `range` 改為 `timeRange`（第206和207行）

2. 重新建置 Docker 映像檔
   - 執行 `docker-compose build backend --no-cache`
   - 重新啟動容器以套用修正

## 影響檔案
- `/root/0901newwww/backend/src/routes/websiteReports.js`

## 測試結果
- PDF 成功生成（檔案大小約67KB，包含2頁）
- 可以透過後端直接存取：`http://localhost:3001/api/reports/{websiteId}/pdf`
- 可以透過前端存取：`http://103.17.11.177/api/reports/{websiteId}/pdf`

## 版本號
Backend v8.0 -> v8.1