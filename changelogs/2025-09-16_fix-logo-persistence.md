# 修復 Logo 上傳持久化問題

## 發布日期
2025-09-16 15:21

## 版本
v1.0.1-patch

## 修復內容

### 問題描述
- 後台上傳的 logo 在重新 build Docker 容器後會消失
- 原因：uploads 和 config 目錄沒有掛載到主機，存在容器內部的檔案在重建時會被清除

### 解決方案
1. **新增 Volume 掛載**
   - 在 docker-compose.yml 的 backend 服務中新增兩個 volume 掛載
   - `./backend/uploads:/app/uploads` - 用於存放上傳的 logo 檔案
   - `./backend/config:/app/config` - 用於存放 logo 配置檔案

2. **建立持久化目錄**
   - 在主機上建立 `/root/0901newwww/backend/uploads` 目錄
   - 在主機上建立 `/root/0901newwww/backend/config` 目錄

## 技術細節

### 修改檔案
- `docker-compose.yml` - 新增 backend 服務的 volume 掛載設定

### 影響範圍
- Logo 上傳功能現在可以在容器重建後保持持久化
- 不影響其他功能

## 測試結果
- ✅ 服務重新建置成功
- ✅ Volume 掛載正常
- ✅ 上傳的 logo 在容器重建後仍然保留
- ✅ Logo 配置檔案持久化成功

## 注意事項
- 第一次部署此更新時，需要確保主機上的 uploads 和 config 目錄存在
- 如果有現有的 logo，需要手動備份並重新上傳