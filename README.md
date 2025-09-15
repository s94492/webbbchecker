# Website Monitor System

## 系統概述

Website Monitor System 是一個基於 Docker 的網站監控系統，能夠監控多達 500 個網站，支援 HTTP/HTTPS/DNS/SSL 監控，並提供豐富的視覺化功能。

## 系統架構

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Nginx Proxy   │───▶│  React Frontend │───▶│  Express API    │
│   (Port 80/443) │    │  (Port 3000)    │    │  (Port 3001)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
                       ┌─────────────────┐    ┌─────────────────┐
                       │     Grafana     │    │    InfluxDB     │
                       │   (Port 3000)   │◀───│   (Port 8086)   │
                       └─────────────────┘    └─────────────────┘
```

## 核心功能

### 🌐 網站監控
- 支援 HTTP/HTTPS 協議監控
- DNS 查詢時間測量
- SSL 憑證到期檢查
- 自訂監控間隔（30秒 - 1小時）
- 內容關鍵字檢查
- 可自訂正常狀態碼範圍

### 📊 監控指標
- **response_time**: 網站回應時間 (ms)
- **status_code**: HTTP 狀態碼
- **dns_time**: DNS 查詢時間 (ms)
- **transfer_rate**: 傳輸速率 (kbps)
- **ssl_expiry_days**: SSL 憑證剩餘天數
- **is_healthy**: 健康狀態 (boolean)

### 📈 資料視覺化
- **React 前端**: 響應式管理介面
- **Recharts 圖表**: 歷史數據圖表 (1h/6h/12h/24h/1w/1m)
- **Grafana 儀表板**: 專業監控面板
- **即時更新**: 30秒自動刷新

### 💾 資料儲存
- **InfluxDB**: 時間序列數據庫
- **JSON 檔案**: 網站配置存儲
- **自動備份**: Docker Volume 持久化

## 快速開始

### 系統需求

- Docker >= 20.0
- Docker Compose >= 2.0
- 2GB 可用記憶體
- 1GB 可用磁碟空間

### 安裝步驟

1. **複製專案**
   ```bash
   git clone <repository-url>
   cd website-monitor-system
   ```

2. **設定環境變數**
   ```bash
   cp .env.example .env
   # 編輯 .env 檔案設定主機 IP
   ```

3. **啟動系統**
   ```bash
   ./start.sh
   ```

4. **訪問服務**
   - 前端管理介面: http://localhost
   - Grafana 儀表板: http://localhost/grafana (admin/admin)
   - API 文檔: http://localhost/api/health

### 管理腳本

```bash
./start.sh   # 啟動所有服務
./stop.sh    # 停止所有服務
./status.sh  # 檢查系統狀態
./logs.sh    # 查看系統日誌
./logs.sh backend  # 查看特定服務日誌
```

## 使用說明

### 新增監控網站

1. 訪問 http://localhost
2. 點擊「新增網站」
3. 填寫網站資訊：
   - **URL**: 完整網址 (https://example.com)
   - **名稱**: 識別名稱
   - **監控間隔**: 30秒-1小時
   - **關鍵字**: 內容檢查關鍵字（選填）
   - **狀態碼範圍**: 正常狀態碼範圍

### 查看監控報表

1. **前端圖表**:
   - 進入網站詳情頁面
   - 切換時間範圍 (1h/6h/12h/24h/1w/1m)
   - 查看回應時間、DNS時間、傳輸速率圖表

2. **Grafana 儀表板**:
   - 訪問 http://localhost/grafana
   - 使用 admin/admin 登入
   - 查看預設儀表板

## API 文檔

### 網站管理 API

```
GET    /api/websites           # 取得所有網站
GET    /api/websites/:id       # 取得單一網站
POST   /api/websites           # 新增網站
PUT    /api/websites/:id       # 更新網站
DELETE /api/websites/:id       # 刪除網站
GET    /api/websites/stats/overview  # 取得統計概覽
```

### 監控指標 API

```
GET    /api/metrics/:id                    # 取得監控指標
GET    /api/metrics/:id/latest             # 取得最新指標
GET    /api/metrics/:id/stats              # 取得統計資料
```

### 請求範例

```bash
# 新增網站
curl -X POST http://localhost/api/websites \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "name": "範例網站",
    "interval": 60,
    "keyword": "Example",
    "statusCodeRange": {"min": 200, "max": 299}
  }'

# 取得監控數據
curl "http://localhost/api/metrics/website-id?range=1h"
```

## 配置說明

### 環境變數

| 變數名 | 說明 | 預設值 |
|--------|------|--------|
| HOST_IP | 主機 IP 位址 | http://localhost |
| INFLUXDB_TOKEN | InfluxDB 存取權杖 | mytoken |
| INFLUXDB_ORG | InfluxDB 組織名稱 | myorg |
| INFLUXDB_BUCKET | InfluxDB 儲存桶 | website-monitor |

### Docker 網路

系統使用自訂網路 `172.20.0.0/16`，確保服務間通訊隔離。

### 資料持久化

以下資料會持久化儲存：
- InfluxDB 時間序列資料
- Grafana 設定與儀表板
- 網站配置 JSON 檔案

## 故障排除

### 常見問題

1. **服務無法啟動**
   ```bash
   # 檢查 Docker 狀態
   docker info
   
   # 重新建置
   docker-compose up --build --force-recreate
   ```

2. **前端無法載入**
   ```bash
   # 檢查 Nginx 配置
   docker-compose logs nginx
   
   # 檢查前端服務
   docker-compose logs frontend
   ```

3. **監控數據缺失**
   ```bash
   # 檢查後端服務
   docker-compose logs backend
   
   # 檢查 InfluxDB 連線
   docker-compose logs influxdb
   ```

4. **Grafana 無法訪問**
   ```bash
   # 重置 Grafana 密碼
   docker-compose exec grafana grafana-cli admin reset-admin-password admin
   ```

### 日誌檢查

```bash
# 查看所有服務日誌
./logs.sh

# 查看特定服務日誌
./logs.sh backend
./logs.sh frontend  
./logs.sh grafana
./logs.sh influxdb
./logs.sh nginx
```

### 效能調優

1. **記憶體使用**
   - 預設配置適用於監控 500 個網站
   - 可調整監控間隔以減少資源使用

2. **磁碟空間**
   - InfluxDB 會定期清理舊數據
   - 建議定期備份重要數據

3. **網路頻寬**
   - 監控間隔影響網路使用量
   - 可依需求調整間隔時間

## 開發指南

### 專案結構

```
website-monitor-system/
├── docker-compose.yml           # Docker 服務定義
├── .env                        # 環境變數
├── start.sh / stop.sh          # 管理腳本
├── frontend/                   # React 前端
│   ├── src/
│   │   ├── components/         # UI 元件
│   │   ├── pages/             # 頁面元件  
│   │   ├── services/          # API 服務
│   │   └── utils/             # 工具函數
│   └── package.json
├── backend/                    # Express 後端
│   ├── src/
│   │   ├── routes/            # API 路由
│   │   ├── services/          # 業務邏輯
│   │   ├── models/            # 資料模型
│   │   └── utils/             # 工具函數
│   └── package.json
├── nginx/                      # 反向代理
│   └── nginx.conf
└── grafana/                    # Grafana 配置
    ├── provisioning/
    └── dashboards/
```

### 開發環境

```bash
# 前端開發
cd frontend
npm install
npm start

# 後端開發  
cd backend
npm install
npm run dev
```

### 建置部署

```bash
# 建置生產版本
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up --build

# 推送至容器倉庫
docker-compose push
```

## 授權與支援

- **版本**: v1.0.0
- **作者**: System Engineer
- **授權**: MIT License
- **支援**: 請提交 Issue 或 Pull Request

## 更新日誌

### v1.0.0 (2025-09-01)

#### ✨ 新功能
- 完整的網站監控系統
- React + MUI 前端介面
- Express.js API 後端
- InfluxDB 時間序列資料庫
- Grafana 視覺化儀表板
- Docker 容器化部署
- Nginx 反向代理
- SSL 憑證監控
- DNS 查詢時間測量
- 自訂監控間隔與參數

#### 🔧 技術特點
- Tailwind CSS + Inter 字體設計系統
- Recharts 圖表元件
- 響應式 RWD 設計
- RESTful API 架構
- 容器網路隔離
- 資料持久化儲存

#### 📦 部署功能
- 一鍵啟動腳本
- 健康檢查機制
- 自動重啟策略
- 日誌管理工具
- 系統狀態監控