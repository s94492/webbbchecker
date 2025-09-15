# Website Monitor System 部署指南

## 🚨 網路問題診斷與解決

### 問題分析

您的環境遇到的 `EAI_AGAIN` 錯誤是典型的 DNS 解析問題：

1. **Docker DNS 問題**: Docker 容器無法正確解析外部域名
2. **NPM Registry 存取**: 無法連接到 npmjs.org 或 npmmirror.com
3. **網路環境限制**: 可能是公司內網或 VPN 環境導致

### 解決方案選項

#### 方案一：修復 Docker DNS 設定（推薦）

```bash
# 1. 執行 DNS 修復腳本
sudo ./fix-dns.sh

# 2. 使用 DNS 修復版本啟動
docker-compose -f docker-compose-dns.yml up --build -d
```

#### 方案二：手動設定 Docker daemon

```bash
# 1. 編輯 Docker daemon 配置
sudo nano /etc/docker/daemon.json

# 2. 添加以下內容：
{
  "dns": ["8.8.8.8", "114.114.114.114", "223.5.5.5"],
  "registry-mirrors": [
    "https://registry.docker-cn.com",
    "https://docker.mirrors.ustc.edu.cn"
  ]
}

# 3. 重啟 Docker 服務
sudo systemctl restart docker
```

#### 方案三：使用 Host 網路模式

```bash
# 修改 docker-compose.yml，所有服務加入：
network_mode: "host"
```

#### 方案四：離線安裝（適用於完全隔離環境）

```bash
# 1. 在有網路的機器上預先下載映像
docker pull node:20-slim
docker pull nginx:alpine  
docker pull influxdb:2.7-alpine
docker pull grafana/grafana:latest

# 2. 導出映像
docker save -o images.tar node:20-slim nginx:alpine influxdb:2.7-alpine grafana/grafana:latest

# 3. 在目標機器上導入
docker load -i images.tar
```

## 📋 系統已完成項目

### ✅ **架構設計**
- [x] Docker Compose 多服務編排
- [x] Nginx 反向代理配置
- [x] 網路隔離與安全設定
- [x] Volume 資料持久化

### ✅ **後端服務**
- [x] Express.js API 框架
- [x] RESTful API 路由設計
- [x] InfluxDB 時間序列整合
- [x] 監控排程器實作
- [x] 網站健康檢查邏輯
- [x] DNS/SSL 監控功能

### ✅ **前端應用**
- [x] React 18 + TypeScript 架構
- [x] Material-UI 設計系統
- [x] Tailwind CSS 樣式框架
- [x] Recharts 圖表元件
- [x] 響應式 RWD 設計
- [x] 完整頁面路由

### ✅ **資料處理**
- [x] InfluxDB 資料庫設定
- [x] Grafana 儀表板配置
- [x] 監控指標收集
- [x] 時間序列查詢API

### ✅ **部署工具**
- [x] 自動化啟動腳本
- [x] 系統狀態檢查
- [x] 日誌管理工具
- [x] DNS 問題修復腳本

## 🌐 當前可用服務

即使前端建置有問題，以下服務仍可正常使用：

### 1. InfluxDB + Grafana 組合
```bash
# 單獨啟動資料庫和視覺化
docker run -d --name influxdb -p 8086:8086 \
  -e DOCKER_INFLUXDB_INIT_MODE=setup \
  -e DOCKER_INFLUXDB_INIT_USERNAME=admin \
  -e DOCKER_INFLUXDB_INIT_PASSWORD=password123 \
  -e DOCKER_INFLUXDB_INIT_ORG=myorg \
  -e DOCKER_INFLUXDB_INIT_BUCKET=website-monitor \
  influxdb:2.7-alpine

docker run -d --name grafana -p 3000:3000 \
  -e GF_SECURITY_ADMIN_PASSWORD=admin \
  --link influxdb:influxdb \
  grafana/grafana:latest
```

### 2. 純 API 後端
```bash
# 在有 Node.js 的環境下直接運行
cd backend
npm install --registry https://registry.npmmirror.com
npm start
```

### 3. 靜態前端版本
```bash
# 使用簡單的 HTML 版本
nginx -c /path/to/nginx-minimal.conf
```

## 🔧 網路環境檢測

### 檢測腳本
```bash
#!/bin/bash
echo "🌐 網路連線檢測"

# 檢測 DNS 解析
echo "📡 DNS 解析測試："
nslookup registry.npmjs.org
nslookup registry.npmmirror.com

# 檢測網路連線
echo "🔗 網路連線測試："
curl -I https://registry.npmjs.org
curl -I https://registry.npmmirror.com

# 檢測 Docker 網路
echo "🐳 Docker 網路測試："
docker run --rm alpine nslookup google.com
```

## 📖 替代部署方法

### 方法一：使用預建映像
如果網路環境允許，可以使用已經包含所有依賴的預建映像：

```bash
# 拉取預建映像（如果可用）
docker pull website-monitor:frontend-v1.0.0
docker pull website-monitor:backend-v1.0.0
```

### 方法二：本地開發環境
在有網路連線的開發機器上：

```bash
# 1. 安裝前端依賴
cd frontend && npm install

# 2. 安裝後端依賴  
cd ../backend && npm install

# 3. 本地運行
npm run dev  # 前端
cd ../backend && npm start  # 後端
```

### 方法三：漸進式部署
1. **階段一**: 先啟動基礎設施（InfluxDB + Grafana）
2. **階段二**: 網路問題解決後啟動後端API
3. **階段三**: 最後啟動前端應用

## 🎯 成功部署檢查清單

- [ ] Docker 服務正常運行
- [ ] DNS 解析正常工作
- [ ] NPM registry 可以存取
- [ ] Docker 映像成功建置
- [ ] 所有容器正常啟動
- [ ] 網路連通性測試通過
- [ ] API 端點回應正常
- [ ] 前端頁面正常載入

## 📞 技術支援

如果遇到問題，請提供：
1. 作業系統版本
2. Docker 版本
3. 網路環境描述（公司內網/VPN等）
4. 錯誤訊息完整內容
5. `docker-compose logs` 輸出

系統設計已經完成，主要需要解決網路連線問題即可正常運行！