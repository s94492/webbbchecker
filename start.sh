#!/bin/bash

echo "🚀 啟動 Website Monitor System..."

# 檢查 Docker 是否運行
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker 未運行，請先啟動 Docker"
    exit 1
fi

# 檢查 Docker Compose 是否存在
if ! docker-compose --version > /dev/null 2>&1; then
    echo "❌ Docker Compose 未安裝"
    exit 1
fi

# 建立必要目錄
echo "📁 建立必要目錄..."
mkdir -p backend/data
mkdir -p nginx/ssl

# 複製環境變數檔案
if [ ! -f .env ]; then
    echo "📄 複製 .env 檔案..."
    cp .env.example .env
fi

# 停止現有服務
echo "🛑 停止現有服務..."
docker-compose down

# 清理舊映像 (可選)
echo "🧹 清理舊映像..."
docker-compose rm -f

# 建置並啟動服務
echo "🔨 建置並啟動服務..."
docker-compose up --build -d

# 等待服務啟動
echo "⏳ 等待服務啟動..."
sleep 30

# 檢查服務狀態
echo "🔍 檢查服務狀態..."
docker-compose ps

# 檢查後端 API 健康狀態
echo "🏥 檢查後端 API..."
for i in {1..10}; do
    if curl -s http://localhost/api/health > /dev/null; then
        echo "✅ 後端 API 正常運行"
        break
    else
        echo "⏳ 等待後端 API 啟動... ($i/10)"
        sleep 5
    fi
done

# 顯示訪問資訊
echo ""
echo "🎉 Website Monitor System 啟動完成！"
echo ""
echo "📊 服務訪問地址："
echo "  - 前端應用: http://localhost"
echo "  - 後端 API: http://localhost/api"
echo "  - Grafana: http://localhost/grafana (admin/admin)"
echo "  - InfluxDB: http://localhost:8086"
echo ""
echo "💡 使用說明："
echo "  1. 訪問前端應用開始新增監控網站"
echo "  2. 查看 Grafana 儀表板監控圖表"
echo "  3. 使用 './stop.sh' 停止服務"
echo "  4. 使用 './logs.sh' 查看服務日誌"
echo ""