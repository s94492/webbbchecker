import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Chip,
  Grid,
  Paper,
  CircularProgress,
  Alert,
  ButtonGroup,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  Tabs,
  Tab
} from '@mui/material';
import { 
  Refresh, 
  TrendingUp,
  Speed,
  Dns,
  Security,
  CheckCircle,
  Error,
  Schedule,
  Language,
  AccessTime,
  GetApp,
  PictureAsPdf,
  TableChart,
  Pause
} from '@mui/icons-material';
import { Link, useParams } from 'react-router-dom';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { format } from 'date-fns';
import { websitesApi, metricsApi, reportsApi } from '../services/api';
import EventTimeline from '../components/EventTimeline';
import StackedAreaChart from '../components/StackedAreaChart';

const WebsiteDetail = () => {
  const { id } = useParams();
  const [website, setWebsite] = useState(null);
  const [metrics, setMetrics] = useState([]);
  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('24h');
  const [reportLoading, setReportLoading] = useState({ pdf: false, csv: false });
  const [activeTab, setActiveTab] = useState(0); // 新增：Tab 狀態

  const timeRanges = [
    { value: '1h', label: '最近 1 小時' },
    { value: '3h', label: '最近 3 小時' },
    { value: '6h', label: '最近 6 小時' },
    { value: '12h', label: '最近 12 小時' },
    { value: '24h', label: '最近 24 小時' },
    { value: '2d', label: '最近 2 天' },
    { value: '7d', label: '最近 7 天' },
    { value: '14d', label: '最近 14 天' },
    { value: '30d', label: '最近 30 天' },
    { value: '90d', label: '最近 90 天' }
  ];

  useEffect(() => {
    fetchWebsiteData();
  }, [id, timeRange]);

  const fetchWebsiteData = async () => {
    try {
      setLoading(true);
      const [websiteResponse, metricsResponse, statsResponse, eventsResponse] = await Promise.all([
        websitesApi.getById(id),
        metricsApi.getMetrics(id, timeRange),
        metricsApi.getStats(id, timeRange),
        metricsApi.getEvents(id, timeRange)
      ]);
      
      setWebsite(websiteResponse.data.data);
      setMetrics(metricsResponse.data.data);
      setStats(statsResponse.data.data);
      setEvents(eventsResponse.data.data);
      setError(null);
    } catch (error) {
      console.error('取得網站詳情失敗:', error);
      setError('無法載入網站詳情');
    } finally {
      setLoading(false);
    }
  };

  // 文件下載幫助函數
  const downloadFile = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  // 下載 PDF 報表
  const handleDownloadPDF = async () => {
    try {
      setReportLoading(prev => ({ ...prev, pdf: true }));
      const response = await reportsApi.downloadPDF(id, timeRange);
      const timeRangeText = timeRanges.find(r => r.value === timeRange)?.label || '未知範圍';
      const filename = `${website.name}_監控報表_${timeRangeText}_${format(new Date(), 'yyyyMMdd')}.pdf`;
      downloadFile(response.data, filename);
    } catch (error) {
      console.error('下載 PDF 報表失敗:', error);
      setError('下載 PDF 報表失敗');
    } finally {
      setReportLoading(prev => ({ ...prev, pdf: false }));
    }
  };

  // 下載 CSV 報表
  const handleDownloadCSV = async () => {
    try {
      setReportLoading(prev => ({ ...prev, csv: true }));
      const response = await reportsApi.downloadCSV(id, timeRange);
      const timeRangeText = timeRanges.find(r => r.value === timeRange)?.label || '未知範圍';
      const filename = `${website.name}_監控數據_${timeRangeText}_${format(new Date(), 'yyyyMMdd')}.csv`;
      downloadFile(response.data, filename);
    } catch (error) {
      console.error('下載 CSV 報表失敗:', error);
      setError('下載 CSV 報表失敗');
    } finally {
      setReportLoading(prev => ({ ...prev, csv: false }));
    }
  };

  const getStatusChip = (status, enabled) => {
    // 如果監控已暫停，優先顯示暫停狀態
    if (!enabled) {
      return (
        <Chip 
          label="已暫停" 
          color="default" 
          icon={<Pause fontSize="small" />}
          className="font-inter"
        />
      );
    }
    
    const statusConfig = {
      healthy: { label: '正常運行', color: 'success', icon: <CheckCircle fontSize="small" /> },
      unhealthy: { label: '離線', color: 'error', icon: <Error fontSize="small" /> },
      pending: { label: '待檢查', color: 'warning', icon: <Schedule fontSize="small" /> }
    };
    
    const config = statusConfig[status] || { label: '未知', color: 'default', icon: null };
    return (
      <Chip 
        label={config.label} 
        color={config.color} 
        icon={config.icon}
        className="font-inter"
      />
    );
  };

  const formatMetricsData = (metrics) => {
    return metrics.map(metric => ({
      time: format(new Date(metric.time), 'HH:mm'),
      fullTime: format(new Date(metric.time), 'yyyy/MM/dd HH:mm:ss'),
      responseTime: metric.responseTime,
      statusCode: metric.statusCode,
      dnsTime: metric.dnsTime,
      connectTime: metric.connectTime || 0,
      sslHandshakeTime: metric.sslHandshakeTime || 0,
      timeToFirstByte: metric.timeToFirstByte || 0,
      downloadTime: metric.downloadTime || 0,
      transferRate: metric.transferRate,
      isHealthy: metric.isHealthy
    }));
  };

  const chartData = formatMetricsData(metrics);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Paper className="p-3 shadow-lg">
          <Typography variant="subtitle2" className="font-inter font-medium mb-2">
            {data.fullTime}
          </Typography>
          {payload.map((entry, index) => (
            <Box key={index} display="flex" alignItems="center" gap={1}>
              <Box 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <Typography variant="body2" className="text-neutral-600">
                {entry.name}: {entry.value}ms
              </Typography>
            </Box>
          ))}
        </Paper>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ 
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        ml: -5  // 往左移動，參照儀表板設定
      }}>
        <Alert severity="error">
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      display: 'flex',
      flexDirection: 'column',
      gap: 3,
      ml: -5  // 往左移動，參照儀表板設定
    }}>
      {/* 頁面標題 */}
      <Box>
        <Box display="flex" alignItems="center" mb={2}>
          <Typography variant="h4" className="font-inter font-bold text-neutral-800">
            {website.name}
          </Typography>
        </Box>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={2}>
            <Language className="text-blue-600" />
            <Typography 
              variant="body1" 
              className="text-blue-600 hover:text-blue-800 cursor-pointer"
              onClick={() => window.open(website.url, '_blank')}
            >
              {website.url}
            </Typography>
            {getStatusChip(website.status, website.enabled)}
          </Box>
          
          <Box display="flex" alignItems="center" gap={2}>
            {/* 報表下載按鈕組 */}
            <ButtonGroup variant="outlined" size="small">
              <Button
                startIcon={reportLoading.pdf ? <Box sx={{ width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#e3f2fd', borderRadius: '50%', border: '2px solid #1976d2' }}><Box sx={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: '#1976d2' }} /></Box> : <PictureAsPdf />}
                onClick={handleDownloadPDF}
                disabled={reportLoading.pdf || reportLoading.csv}
                sx={{ textTransform: 'none' }}
              >
                PDF 報表
              </Button>
              <Button
                startIcon={reportLoading.csv ? <Box sx={{ width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#e3f2fd', borderRadius: '50%', border: '2px solid #1976d2' }}><Box sx={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: '#1976d2' }} /></Box> : <TableChart />}
                onClick={handleDownloadCSV}
                disabled={reportLoading.pdf || reportLoading.csv}
                sx={{ textTransform: 'none' }}
              >
                CSV 數據
              </Button>
            </ButtonGroup>
            
            {/* 時間範圍選擇器 */}
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel id="time-range-select-label">時間範圍</InputLabel>
              <Select
                labelId="time-range-select-label"
                id="time-range-select"
                value={timeRange}
                label="時間範圍"
                onChange={(e) => setTimeRange(e.target.value)}
              >
                {timeRanges.map((range) => (
                  <MenuItem key={range.value} value={range.value}>
                    {range.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>
      </Box>

      {/* 基本資訊 */}
      <Card className="bg-white rounded-xl shadow-sm">
        <CardContent>
          <Typography variant="h6" className="font-inter font-semibold text-neutral-800 mb-4">
            基本資訊
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Box className="space-y-3">
                <Box display="flex" alignItems="center" gap={2}>
                  <AccessTime className="text-neutral-500" fontSize="small" />
                  <Typography variant="body2" className="text-neutral-600">
                    監控間隔：{website.interval} 秒
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={2}>
                  <CheckCircle className="text-neutral-500" fontSize="small" />
                  <Typography variant="body2" className="text-neutral-600">
                    狀態碼範圍：{website.statusCodeRange.min}-{website.statusCodeRange.max}
                  </Typography>
                </Box>
                {website.keyword && (
                  <Box display="flex" alignItems="center" gap={2}>
                    <Typography variant="body2" className="text-neutral-600">
                      關鍵字：
                    </Typography>
                    <Chip label={website.keyword} size="small" color="info" variant="outlined" />
                  </Box>
                )}
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box className="space-y-3">
                <Box display="flex" alignItems="center" gap={2}>
                  <Typography variant="body2" className="text-neutral-600">
                    建立時間：{format(new Date(website.createdAt), 'yyyy/MM/dd HH:mm')}
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={2}>
                  <Typography variant="body2" className="text-neutral-600">
                    最後更新：{format(new Date(website.updatedAt), 'yyyy/MM/dd HH:mm')}
                  </Typography>
                </Box>
                {website.lastCheck && (
                  <Box display="flex" alignItems="center" gap={2}>
                    <Typography variant="body2" className="text-neutral-600">
                      最後檢查：{format(new Date(website.lastCheck), 'yyyy/MM/dd HH:mm')}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* 統計摘要 */}
      {stats && (
        <Card className="bg-white rounded-xl shadow-sm">
          <CardContent>
            <Typography variant="h6" className="font-inter font-semibold text-neutral-800 mb-4">
              {timeRanges.find(r => r.value === timeRange)?.label} 統計摘要
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                <Paper className="bg-blue-50 p-4 rounded-lg">
                  <Box display="flex" alignItems="center" gap={2}>
                    <TrendingUp className="text-blue-600" />
                    <Box>
                      <Typography variant="caption" className="text-blue-600">
                        平均回應時間
                      </Typography>
                      <Typography variant="h6" className="font-inter font-bold text-blue-800">
                        {stats.avgResponseTime > 10000 ? 
                          `${(stats.avgResponseTime/1000).toFixed(1)}s` : 
                          `${stats.avgResponseTime}ms`
                        }
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper className="bg-green-50 p-4 rounded-lg">
                  <Box display="flex" alignItems="center" gap={2}>
                    <CheckCircle className="text-green-600" />
                    <Box>
                      <Typography variant="caption" className="text-green-600">
                        可用性
                      </Typography>
                      <Typography variant="h6" className="font-inter font-bold text-green-800">
                        {stats.isPaused ? '已暫停' : 
                         stats.isCalculating ? '計算中' : 
                         `${stats.uptime}%`}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper className="bg-orange-50 p-4 rounded-lg">
                  <Box display="flex" alignItems="center" gap={2}>
                    <Speed className="text-orange-600" />
                    <Box>
                      <Typography variant="caption" className="text-orange-600">
                        最大回應時間
                      </Typography>
                      <Typography variant="h6" className="font-inter font-bold text-orange-800">
                        {stats.maxResponseTime >= 25000 ? 
                          `${(stats.maxResponseTime/1000).toFixed(1)}s (異常)` : 
                          `${stats.maxResponseTime}ms`
                        }
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper className="bg-purple-50 p-4 rounded-lg">
                  <Box display="flex" alignItems="center" gap={2}>
                    <Error className="text-purple-600" />
                    <Box>
                      <Typography variant="caption" className="text-purple-600">
                        停機時間
                      </Typography>
                      <Typography variant="h6" className="font-inter font-bold text-purple-800">
                        {stats.downtime || '0m'}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* 異常事件時間線 */}
      <EventTimeline events={events} loading={loading} />

      {/* 時間範圍選擇器與圖表 */}
      <Card className="bg-white rounded-xl shadow-sm">
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
            <Typography variant="h6" className="font-inter font-semibold text-neutral-800">
              監控圖表
            </Typography>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={fetchWebsiteData}
              className="font-inter normal-case"
              sx={{ textTransform: 'none' }}
            >
              刷新
            </Button>
          </Box>

          {chartData.length === 0 ? (
            <Box textAlign="center" py={8}>
              <Typography variant="body1" className="text-neutral-500">
                尚無監控數據
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={4}>
              {/* 合併的堆疊區域圖 - 回應時間組成分析 */}
              <Grid item xs={12}>
                <StackedAreaChart 
                  data={chartData} 
                  title="回應時間組成分析 (ms)" 
                />
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default WebsiteDetail;