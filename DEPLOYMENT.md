# 網站監控系統部署指南

## 系統需求
- Docker 20.10+
- docker-compose 1.29+
- Linux 系統（推薦 Ubuntu 20.04+）

## 快速部署

### 方法一：自動設置（推薦）
```bash
# 執行自動設置腳本
chmod +x setup-docker.sh
sudo ./setup-docker.sh

# 啟動服務
docker-compose up -d
```

### 方法二：手動設置
1. **確保Docker服務運行**
   ```bash
   sudo systemctl start docker
   sudo systemctl enable docker
   ```

2. **設置網路轉發**
   ```bash
   echo 'net.ipv4.ip_forward=1' | sudo tee -a /etc/sysctl.conf
   sudo sysctl -p
   ```

3. **配置防火牆（如果遇到連線問題）**
   ```bash
   # 允許Docker容器流量
   sudo iptables -I FORWARD -j ACCEPT
   sudo iptables -I DOCKER -j ACCEPT
   
   # 保存規則（Ubuntu/Debian）
   sudo iptables-save | sudo tee /etc/iptables/rules.v4
   ```

4. **啟動服務**
   ```bash
   docker-compose up -d
   ```

## 驗證部署
訪問以下地址確認服務正常：
- 前端介面: http://localhost
- API文檔: http://localhost/api/websites
- Grafana: http://localhost/grafana
- InfluxDB: http://localhost:8086

## 常見問題

### Q: 容器無法相互通訊
A: 執行 `sudo ./setup-docker.sh` 或手動配置iptables規則

### Q: 在其他主機上無法運行
A: 確保目標主機已安裝Docker，並執行setup-docker.sh腳本

### Q: 權限不足錯誤
A: 確保使用sudo執行涉及系統配置的命令

## 環境變數配置
複製並編輯環境變數檔案：
```bash
cp .env.example .env
# 編輯 .env 檔案設定所需參數
```

## 資料持久化
系統使用Docker volumes來保存資料：
- `influxdb_data`: InfluxDB資料庫檔案
- `influxdb_config`: InfluxDB配置檔案  
- `grafana_data`: Grafana儀表板和設定