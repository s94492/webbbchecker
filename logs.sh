#!/bin/bash

echo "📋 Website Monitor System 服務日誌"
echo "按 Ctrl+C 退出日誌檢視"
echo ""

if [ $# -eq 0 ]; then
    # 顯示所有服務日誌
    docker-compose logs -f
else
    # 顯示指定服務日誌
    docker-compose logs -f $1
fi