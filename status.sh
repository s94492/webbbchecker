#!/bin/bash

echo "📊 Website Monitor System 狀態檢查"
echo ""

# 檢查 Docker Compose 服務狀態
echo "🐳 Docker 服務狀態："
docker-compose ps

echo ""
echo "🌐 服務健康檢查："

# 檢查前端
echo -n "前端 (http://localhost): "
if curl -s http://localhost > /dev/null; then
    echo "✅ 正常"
else
    echo "❌ 異常"
fi

# 檢查後端 API
echo -n "後端 API (http://localhost/api/health): "
if curl -s http://localhost/api/health | grep -q "healthy"; then
    echo "✅ 正常"
else
    echo "❌ 異常"
fi

# 檢查 Grafana
echo -n "Grafana (http://localhost/grafana): "
if curl -s http://localhost/grafana/api/health > /dev/null; then
    echo "✅ 正常"
else
    echo "❌ 異常"
fi

# 檢查 InfluxDB
echo -n "InfluxDB (http://localhost:8086): "
if curl -s http://localhost:8086/health > /dev/null; then
    echo "✅ 正常"
else
    echo "❌ 異常"
fi

echo ""
echo "💾 磁碟使用情況："
docker system df

echo ""
echo "🔄 如果發現異常，請執行 './start.sh' 重新啟動服務"