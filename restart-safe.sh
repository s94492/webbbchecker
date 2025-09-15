#!/bin/bash

# 安全重啟腳本 - 保證資料不會遺失
# 這個腳本可以安全地重啟所有服務，而不會刪除任何資料

echo "=== 安全重啟 Docker 服務 ==="
echo "📌 此操作將保留所有資料庫資料"
echo ""

# 停止服務（不加 -v 參數，保留 volumes）
echo "⏸️  停止服務..."
docker-compose down

echo ""
echo "✅ 服務已停止，資料完整保留在 volumes 中"
echo ""

# 列出資料 volumes 確認存在
echo "📊 檢查資料 volumes："
docker volume ls | grep 0901newwww
echo ""

# 重新啟動服務
echo "🚀 重新啟動服務..."
docker-compose up -d --build

echo ""
echo "⏳ 等待服務完全啟動..."
sleep 10

# 檢查服務狀態
echo ""
echo "📋 服務狀態："
docker-compose ps

echo ""
echo "✅ 服務已成功重啟！"
echo "💾 資料庫資料完整保留"
echo ""
echo "訪問系統: http://$(hostname -I | awk '{print $1}')"