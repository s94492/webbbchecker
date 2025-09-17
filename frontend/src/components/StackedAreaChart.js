import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceArea
} from 'recharts';
import { Typography, Box, Paper } from '@mui/material';

const StackedAreaChart = ({ data, title = "回應時間組成分析" }) => {
  
  // 智能時間單位轉換函數
  const formatTimeValue = (milliseconds) => {
    if (milliseconds >= 1000) {
      return {
        value: (milliseconds / 1000).toFixed(2),
        unit: 's'
      };
    }
    return {
      value: Math.round(milliseconds),
      unit: 'ms'
    };
  };

  // 判斷資料中的最大值來決定Y軸單位
  const getOptimalUnit = (data) => {
    if (!data || data.length === 0) return { unit: 'ms', divisor: 1 };
    
    let maxValue = 0;
    data.forEach(item => {
      const total = (item.dnsTime || 0) + (item.connectTime || 0) + 
                   (item.sslHandshakeTime || 0) + (item.timeToFirstByte || 0) + 
                   (item.downloadTime || 0);
      maxValue = Math.max(maxValue, total);
    });
    
    // 如果最大值超過1000ms，使用秒為單位
    if (maxValue >= 1000) {
      return { unit: 's', divisor: 1000 };
    }
    return { unit: 'ms', divisor: 1 };
  };

  const timeUnit = getOptimalUnit(data);
  
  // 識別異常時間段
  const getUnhealthyPeriods = (data) => {
    if (!data || data.length === 0) return [];
    
    const periods = [];
    let currentPeriod = null;
    
    data.forEach((item, index) => {
      const isUnhealthy = item.isHealthy === false;
      
      if (isUnhealthy && !currentPeriod) {
        // 開始一個新的異常期間
        currentPeriod = {
          startIndex: index,
          endIndex: index,
          startTime: item.time,
          endTime: item.time
        };
      } else if (isUnhealthy && currentPeriod) {
        // 延續當前異常期間
        currentPeriod.endIndex = index;
        currentPeriod.endTime = item.time;
      } else if (!isUnhealthy && currentPeriod) {
        // 結束當前異常期間
        periods.push(currentPeriod);
        currentPeriod = null;
      }
    });
    
    // 如果最後還有未結束的異常期間
    if (currentPeriod) {
      periods.push(currentPeriod);
    }
    
    return periods;
  };

  const unhealthyPeriods = getUnhealthyPeriods(data);
  
  // 自定義 Tooltip 組件
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      // 使用原始數值計算總時間
      const originalTotal = (data._originalDnsTime || 0) + 
                           (data._originalConnectTime || 0) + 
                           (data._originalSslHandshakeTime || 0) + 
                           (data._originalTimeToFirstByte || 0) + 
                           (data._originalDownloadTime || 0);
      
      const formattedTotal = formatTimeValue(originalTotal);
      
      // 原始數值對應表
      const originalValues = {
        'DNS查詢時間': data._originalDnsTime || 0,
        '連接建立時間': data._originalConnectTime || 0,
        'SSL交握時間': data._originalSslHandshakeTime || 0,
        '等待時間(TTFB)': data._originalTimeToFirstByte || 0,
        '內容下載時間': data._originalDownloadTime || 0
      };
      
      return (
        <Paper className="p-3 shadow-lg bg-white border">
          <Typography variant="subtitle2" className="font-inter font-medium mb-2 text-neutral-800">
            {data.fullTime}
          </Typography>
          <Typography variant="body2" className="font-semibold mb-2 text-blue-600">
            總回應時間: {formattedTotal.value}{formattedTotal.unit}
          </Typography>
          <Box className="space-y-1">
            {payload.reverse().map((entry, index) => {
              const originalValue = originalValues[entry.name] || 0;
              const formattedValue = formatTimeValue(originalValue);
              return (
                <Box key={index} display="flex" alignItems="center" justify="space-between" gap={2}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Box 
                      className="w-3 h-3 rounded-sm" 
                      style={{ backgroundColor: entry.color }}
                    />
                    <Typography variant="body2" className="text-neutral-700 min-w-0">
                      {entry.name}
                    </Typography>
                  </Box>
                  <Typography variant="body2" className="font-medium text-neutral-800">
                    {formattedValue.value}{formattedValue.unit}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </Paper>
      );
    }
    return null;
  };

  // 處理資料，確保堆疊順序正確，並根據單位轉換數值
  const processedData = data.map(item => ({
    ...item,
    // 確保所有值都是正數，避免堆疊問題，並根據時間單位轉換
    dnsTime: Math.max(0, (item.dnsTime || 0) / timeUnit.divisor),
    connectTime: Math.max(0, (item.connectTime || 0) / timeUnit.divisor),
    sslHandshakeTime: Math.max(0, (item.sslHandshakeTime || 0) / timeUnit.divisor),
    timeToFirstByte: Math.max(0, (item.timeToFirstByte || 0) / timeUnit.divisor),
    downloadTime: Math.max(0, (item.downloadTime || 0) / timeUnit.divisor),
    // 保留原始數值供 Tooltip 使用
    _originalDnsTime: item.dnsTime || 0,
    _originalConnectTime: item.connectTime || 0,
    _originalSslHandshakeTime: item.sslHandshakeTime || 0,
    _originalTimeToFirstByte: item.timeToFirstByte || 0,
    _originalDownloadTime: item.downloadTime || 0
  }));

  // 計算Y軸最大值
  const getYAxisDomain = () => {
    if (!data || data.length === 0) return [0, 'dataMax'];
    
    // 使用原始數據計算最大值（毫秒）
    let maxValueMs = 0;
    data.forEach(item => {
      const total = (item.dnsTime || 0) + (item.connectTime || 0) + 
                   (item.sslHandshakeTime || 0) + (item.timeToFirstByte || 0) + 
                   (item.downloadTime || 0);
      maxValueMs = Math.max(maxValueMs, total);
    });
    
    // 如果最大值小於1000ms（1秒），設定Y軸上限為2秒
    if (maxValueMs < 1000) {
      // 如果當前使用毫秒單位，返回2000ms
      if (timeUnit.unit === 'ms') {
        return [0, 2000];
      }
      // 如果當前使用秒單位，返回2秒
      if (timeUnit.unit === 's') {
        return [0, 2];
      }
    }
    
    // 其他情況使用Recharts的自動計算
    return [0, 'dataMax'];
  };
  
  const yAxisDomain = getYAxisDomain();

  if (!data || data.length === 0) {
    return (
      <Box textAlign="center" py={8}>
        <Typography variant="body1" className="text-neutral-500">
          尚無監控數據
        </Typography>
      </Box>
    );
  }

  // 根據資料量決定 X 軸顯示間隔
  const getXAxisInterval = () => {
    const dataLength = processedData.length;
    if (dataLength <= 50) return 0; // 顯示所有
    if (dataLength <= 200) return Math.floor(dataLength / 20); // 顯示約20個
    if (dataLength <= 500) return Math.floor(dataLength / 15); // 顯示約15個
    return Math.floor(dataLength / 10); // 顯示約10個
  };

  return (
    <Box>
      <Typography variant="subtitle1" className="font-inter font-medium text-neutral-800 mb-3">
        {title}
      </Typography>
      <ResponsiveContainer width="100%" height={400}>
        <AreaChart data={processedData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 12 }}
            tickLine={{ stroke: '#e0e0e0' }}
            axisLine={{ stroke: '#e0e0e0' }}
            interval={getXAxisInterval()}
          />
          <YAxis 
            domain={yAxisDomain}
            tick={{ fontSize: 12 }}
            tickLine={{ stroke: '#e0e0e0' }}
            axisLine={{ stroke: '#e0e0e0' }}
            tickFormatter={(value) => Math.round(value).toString()}
            label={{ value: `時間 (${timeUnit.unit})`, angle: -90, position: 'insideLeft' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="rect"
          />
          
          {/* 堆疊區域 - 從下到上的順序 */}
          <Area
            type="monotone"
            dataKey="dnsTime"
            stackId="1"
            stroke="#16a34a"
            fill="#16a34a"
            fillOpacity={0.8}
            name="DNS查詢時間"
            strokeWidth={1}
          />
          <Area
            type="monotone"
            dataKey="connectTime"
            stackId="1"
            stroke="#f59e0b"
            fill="#f59e0b"
            fillOpacity={0.8}
            name="連接建立時間"
            strokeWidth={1}
          />
          <Area
            type="monotone"
            dataKey="sslHandshakeTime"
            stackId="1"
            stroke="#8b5cf6"
            fill="#8b5cf6"
            fillOpacity={0.8}
            name="SSL交握時間"
            strokeWidth={1}
          />
          <Area
            type="monotone"
            dataKey="timeToFirstByte"
            stackId="1"
            stroke="#ef4444"
            fill="#ef4444"
            fillOpacity={0.8}
            name="等待時間(TTFB)"
            strokeWidth={1}
          />
          <Area
            type="monotone"
            dataKey="downloadTime"
            stackId="1"
            stroke="#06b6d4"
            fill="#06b6d4"
            fillOpacity={0.8}
            name="內容下載時間"
            strokeWidth={1}
          />
          
          {/* 異常時間段的紅色背景 */}
          {unhealthyPeriods.map((period, index) => (
            <ReferenceArea
              key={`unhealthy-${index}`}
              x1={period.startTime}
              x2={period.endTime}
              fill="#dc2626"
              fillOpacity={0.25}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
      
      {/* 圖表說明 */}
      <Box className="mt-4 p-3 bg-gray-50 rounded-lg">
        <Typography variant="caption" className="text-neutral-600">
          <strong>圖表說明:</strong> 此堆疊區域圖顯示每次檢查的總回應時間組成。各顏色區域代表不同的網路延遲階段，
          堆疊高度即為該時間點的總回應時間。Y軸單位會根據數值大小自動調整（超過1秒顯示為秒，否則為毫秒）。
          可透過滑鼠懸停查看詳細數值。
        </Typography>
      </Box>
    </Box>
  );
};

export default StackedAreaChart;