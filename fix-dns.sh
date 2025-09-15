#!/bin/bash

echo "🔧 修復 Docker DNS 問題..."

# 備份原始 Docker daemon 配置
if [ -f /etc/docker/daemon.json ]; then
    echo "📄 備份原始 Docker daemon 配置"
    sudo cp /etc/docker/daemon.json /etc/docker/daemon.json.backup
fi

# 應用新的 DNS 配置
echo "🌐 設定 Docker DNS"
sudo cp daemon.json /etc/docker/daemon.json

# 重啟 Docker 服務
echo "🔄 重啟 Docker 服務"
sudo systemctl restart docker

# 等待 Docker 啟動
sleep 5

# 檢查 Docker 狀態
if docker info > /dev/null 2>&1; then
    echo "✅ Docker 服務已恢復正常"
else
    echo "❌ Docker 服務異常"
    exit 1
fi

echo ""
echo "📋 現在可以嘗試以下命令："
echo "  ./start.sh                           # 啟動完整系統"
echo "  docker-compose -f docker-compose-dns.yml up -d  # 使用DNS修復版本"
echo ""