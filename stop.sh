#!/bin/bash

echo "🛑 停止 Website Monitor System..."

# 停止所有服務
docker-compose down

echo "✅ 所有服務已停止"