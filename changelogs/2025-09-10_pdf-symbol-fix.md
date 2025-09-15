# 版本更新日誌 - 2025-09-10

## 修復 PDF 符號亂碼問題

### 更新內容
1. **問題描述**
   - PDF 報表生成時，冒號符號會導致中文亂碼
   - 部分特殊符號在 PDF 中無法正確渲染

2. **修復方案**
   - 將所有冒號符號（:）替換為破折號（-）
   - 正確配置 NotoSansTC 中文字體
   - 修復 ReportService 的 InfluxDB 連線設定

### 修改的檔案
- `/backend/src/services/reportService.js`
  - 替換所有冒號為破折號
  - 新增字體註冊程式碼
  - 修復 InfluxDB 環境變數設定
  
- `/backend/src/app.js`
  - 啟用原始 reports 路由
  - 調整路由載入順序

### 測試結果
- ✅ 單一網站 PDF 報表生成正常
- ✅ 綜合 PDF 報表生成正常
- ✅ 中文顯示正常，無亂碼
- ✅ 符號顯示正常

### API 端點
- 單一網站報表: `GET /api/reports/{websiteId}/pdf?range={timeRange}`
- 綜合報表: `GET /api/reports/pdf/comprehensive?timeRange={timeRange}&type={reportType}`

### 注意事項
- PDF 使用 NotoSansTC.ttf 字體檔案
- 字體檔案位置: `/backend/fonts/NotoSansTC.ttf`
- 確保 Docker 容器內字體檔案正確複製

## 更新者
系統工程師

## 更新時間
2025-09-10 10:56