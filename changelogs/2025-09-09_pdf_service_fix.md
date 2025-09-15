# PDF下載服務修復

## 版本資訊
- 日期: 2025-09-09
- 版本: v1.4.3
- 修復類型: 服務修復

## 問題描述
前台PDF下載功能顯示舊版本，服務重啟後未生效

## 解決方案

### 1. 服務重新部署
- 停止所有Docker容器
- 重建所有映像檔以載入最新程式碼
- 重啟所有服務

### 2. 確認PDF API路徑
- PDF下載API正確路徑: `/api/reports/:websiteId/pdf`
- 測試確認API回應正常 (33KB PDF檔案)
- 檔案名稱格式: `{網站名稱}_report_{時間範圍}_{時間戳}.pdf`

### 3. 服務狀態確認
- Backend服務: ✅ 正常運行
- Frontend服務: ✅ 正常運行  
- Nginx代理: ✅ 正確路由API請求
- PDF生成: ✅ 生成33KB專業報表

## 技術詳情
- 使用PDFKit生成2頁精華版報表
- 包含中文字體支援 (Noto Sans TC)
- 執行摘要、KPI指標、性能分析完整呈現
- 支援多種時間範圍 (1h-90d)

## 測試結果
```bash
curl "http://103.17.11.177/api/reports/dc2c74c5-4578-471a-bfb3-ef5b4c509b86/pdf"
# 回應: HTTP 200, Content-Type: application/pdf, 33146 bytes
```

## 影響範圍
- 所有網站的PDF報表下載功能已恢復正常
- 前台介面現已載入最新版本

## 備註
Docker服務已完全重建，確保所有程式碼更新生效