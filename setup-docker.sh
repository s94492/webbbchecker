#!/bin/bash

# Docker 網站監控系統設置腳本
# 確保在任何主機上都能正常運行

echo "=== Docker 網站監控系統設置 ==="

# 檢查Docker是否安裝
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安裝，請先安裝Docker"
    exit 1
fi

# 檢查docker-compose是否安裝
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose 未安裝，請先安裝docker-compose"
    exit 1
fi

echo "✅ Docker 和 docker-compose 已安裝"

# 確保Docker服務運行
sudo systemctl start docker
sudo systemctl enable docker
echo "✅ Docker 服務已啟動"

# 檢查並設置必要的系統參數
echo "🔧 檢查系統網路配置..."

# 啟用IP轉發
if [[ $(sysctl net.ipv4.ip_forward | cut -d' ' -f3) != "1" ]]; then
    echo "設置 IP 轉發..."
    echo 'net.ipv4.ip_forward=1' | sudo tee -a /etc/sysctl.conf
    sudo sysctl -p
fi

# 檢查iptables是否阻擋Docker
echo "🔧 檢查防火牆設定..."

# 創建Docker友好的iptables規則
sudo iptables -I FORWARD -j ACCEPT 2>/dev/null || true
sudo iptables -I DOCKER -j ACCEPT 2>/dev/null || true

# 配置IP白名單防火牆
if [[ -f configure-firewall.sh ]]; then
    echo "🛡️ 配置IP白名單防火牆..."
    sudo ./configure-firewall.sh
else
    echo "⚠️ 未找到 configure-firewall.sh，跳過IP白名單配置"
    # 如果有iptables-persistent，保存規則
    if command -v iptables-save &> /dev/null && [[ -d /etc/iptables ]]; then
        sudo iptables-legacy-save | sudo tee /etc/iptables/rules.v4 > /dev/null
        echo "✅ 基本防火牆規則已保存"
    fi
fi

# 重啟Docker確保配置生效
sudo systemctl restart docker
echo "✅ Docker 已重啟"

echo ""
echo "🚀 設置完成！現在可以啟動服務："
echo "   docker-compose up -d"
echo ""
echo "📝 服務將在以下端口運行："
echo "   - 網站前端: http://localhost"
echo "   - API: http://localhost/api"
echo "   - Grafana: http://localhost/grafana"
echo "   - InfluxDB: http://localhost:8086"