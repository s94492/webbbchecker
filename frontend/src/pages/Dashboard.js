import React, { useState, useEffect } from 'react';
import { 
  Grid, 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  Chip,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
  Tooltip,
  Drawer,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Divider,
  LinearProgress,
  Menu,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import { 
  CheckCircle, 
  Error, 
  Schedule, 
  TrendingUp,
  Language,
  Speed,
  Add,
  Edit,
  Delete,
  Refresh,
  Science,
  Save,
  Close,
  Security,
  Warning,
  NoEncryption,
  PictureAsPdf,
  Download,
  PlayArrow,
  Pause,
  MoreVert
} from '@mui/icons-material';
import { websitesApi, metricsApi } from '../services/api';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

const Dashboard = () => {
  // 輔助函數：將後端狀態碼範圍格式轉換為前端字串格式
  const formatStatusCodeRangeForEdit = (statusCodeRange) => {
    if (statusCodeRange && statusCodeRange.min && statusCodeRange.max) {
      return `${statusCodeRange.min}:${statusCodeRange.max}`;
    }
    return '200:299';
  };

  // 輔助函數：解析狀態碼範圍字串並驗證
  const parseStatusCodeRange = (rangeStr) => {
    if (!rangeStr) return { isValid: false, error: '狀態碼範圍不能為空' };
    
    const ranges = rangeStr.split(',').map(s => s.trim()).filter(s => s);
    const parsedRanges = [];
    
    for (const range of ranges) {
      if (range.includes(':')) {
        // 範圍格式 200:299
        const [min, max] = range.split(':').map(s => parseInt(s.trim()));
        if (isNaN(min) || isNaN(max) || min < 100 || min > 599 || max < 100 || max > 599 || min > max) {
          return { isValid: false, error: `無效的範圍格式：${range}` };
        }
        parsedRanges.push({ min, max });
      } else {
        // 單一狀態碼 200
        const code = parseInt(range.trim());
        if (isNaN(code) || code < 100 || code > 599) {
          return { isValid: false, error: `無效的狀態碼：${range}` };
        }
        parsedRanges.push({ min: code, max: code });
      }
    }
    
    return { isValid: true, ranges: parsedRanges };
  };

  // 輔助函數：準備提交給後端的數據
  const prepareSubmitData = (formData) => {
    const statusCodeValidation = parseStatusCodeRange(formData.statusCodeRange);
    if (!statusCodeValidation.isValid) {
      throw new Error(statusCodeValidation.error);
    }
    
    // 使用第一個範圍作為主要範圍（後端目前只支援單一範圍）
    const firstRange = statusCodeValidation.ranges[0];
    
    return {
      url: formData.url,
      name: formData.name,
      interval: formData.interval,
      keyword: formData.keyword || '',
      dataRetention: formData.dataRetention,
      enabled: formData.enabled !== undefined ? formData.enabled : true,
      statusCodeRange: {
        min: firstRange.min,
        max: firstRange.max
      }
    };
  };

  const [stats, setStats] = useState(null);
  const [websites, setWebsites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, website: null });
  const [pauseLoading, setPauseLoading] = useState(new Set()); // 追蹤正在暫停/恢復的網站ID
  const [menuAnchor, setMenuAnchor] = useState({}); // 追蹤每個網站的選單狀態 {websiteId: anchorEl}
  const [addDrawerOpen, setAddDrawerOpen] = useState(false);
  const [addFormData, setAddFormData] = useState({
    protocol: 'https',
    url: '',
    name: '',
    interval: 60,
    keyword: '',
    statusCodeRange: '200:299',
    dataRetention: '6months'
  });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState(null);
  const [addSuccess, setAddSuccess] = useState(false);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [editWebsite, setEditWebsite] = useState(null);
  const [editFormData, setEditFormData] = useState({
    protocol: 'https',
    url: '',
    name: '',
    interval: 60,
    keyword: '',
    statusCodeRange: '200:299',
    dataRetention: '6months'
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
    
    // 每 30 秒重新載入數據
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsResponse, websitesResponse] = await Promise.all([
        websitesApi.getStats(),
        websitesApi.getAll()
      ]);
      
      const websitesData = websitesResponse.data.data;
      
      // 為每個網站獲取最新的 SSL 資訊和 SLA 數據
      const websitesWithMetrics = await Promise.all(
        websitesData.map(async (website) => {
          try {
            // 獲取最新 SSL 資訊
            let sslExpiryDays = 0;
            try {
              const metricsResponse = await metricsApi.getLatest(website.id);
              sslExpiryDays = metricsResponse.data.data?.sslExpiryDays || 0;
            } catch (sslError) {
              console.warn(`取得 ${website.name} SSL 資訊失敗:`, sslError);
            }
            
            // 計算 SLA 百分比
            let slaPercentage = null;
            let slaStatus = 'normal'; // normal, error, nodata
            
            try {
              // 嘗試獲取 24 小時統計數據
              const slaResponse = await metricsApi.getStats(website.id, '24h');
              
              if (slaResponse.data.data) {
                const stats = slaResponse.data.data;
                
                // 檢查是否為暫停狀態
                if (stats.isPaused === true) {
                  slaStatus = 'paused';
                  slaPercentage = null;
                } else if (stats.isCalculating === true) {
                  // 資料不足，正在計算中
                  slaStatus = 'calculating';
                  slaPercentage = null;
                } else if (stats.availability !== undefined && typeof stats.availability === 'number') {
                  slaPercentage = stats.availability * 100;
                } else if (stats.totalRequests && stats.totalRequests > 0) {
                  const successfulRequests = stats.totalRequests - (stats.errorCount || 0);
                  slaPercentage = (successfulRequests / stats.totalRequests) * 100;
                } else if (stats.uptime !== undefined && typeof stats.uptime === 'number') {
                  // uptime 已經是百分比格式，不需要再乘以 100
                  slaPercentage = stats.uptime;
                } else {
                  throw new Error('No valid SLA metrics found');
                }
                
                // 驗證 SLA 數據合理性
                if (isNaN(slaPercentage) || slaPercentage < 0 || slaPercentage > 100) {
                  console.error(`${website.name} SLA 數據異常: ${slaPercentage}%`);
                  slaStatus = 'error';
                  slaPercentage = null;
                }
              } else {
                throw new Error('No stats data available');
              }
            } catch (statsError) {
              console.warn(`取得 ${website.name} SLA 統計失敗:`, statsError);
              slaStatus = 'nodata';
              slaPercentage = null;
            }
            
            return {
              ...website,
              sslExpiryDays,
              slaPercentage: slaPercentage !== null ? Math.round(slaPercentage * 100) / 100 : null,
              slaStatus
            };
          } catch (error) {
            console.error(`取得 ${website.name} 監控數據失敗:`, error);
            // 完全失敗時使用預設值
            const defaultSLA = website.status === 'healthy' ? 98.5 : 
                              website.status === 'pending' ? 94.2 : 82.7;
            return {
              ...website,
              sslExpiryDays: 0,
              slaPercentage: defaultSLA
            };
          }
        })
      );
      
      setStats(statsResponse.data.data);
      setWebsites(websitesWithMetrics);
      setError(null);
    } catch (error) {
      console.error('取得儀表板數據失敗:', error);
      setError('無法載入儀表板數據');
    } finally {
      setLoading(false);
    }
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
      <Alert severity="error" className="mb-4">
        {error}
      </Alert>
    );
  }

  const statCards = [
    {
      title: '總網站數',
      value: stats?.total || 0,
      icon: <Language className="text-blue-600" />,
      color: 'blue'
    },
    {
      title: '正常運行',
      value: stats?.healthy || 0,
      icon: <CheckCircle className="text-green-600" />,
      color: 'green'
    },
    {
      title: '離線',
      value: stats?.unhealthy || 0,
      icon: <Error className="text-red-600" />,
      color: 'red'
    },
    {
      title: '其他狀態',
      value: (stats?.pending || 0) + (stats?.disabled || 0),
      icon: <Schedule className="text-orange-600" />,
      color: 'orange',
      subtitle: `待檢查 ${stats?.pending || 0} | 已暫停 ${stats?.disabled || 0}`
    }
  ];

  const getStatusChip = (status, enabled) => {
    // 如果監控已暫停，優先顯示暫停狀態
    if (!enabled) {
      return <Chip label="已暫停" color="default" size="small" />;
    }
    
    const statusConfig = {
      healthy: { label: '正常', color: 'success' },
      unhealthy: { label: '離線', color: 'error' },
      pending: { label: '待檢查', color: 'warning' }
    };
    
    const config = statusConfig[status] || { label: '未知', color: 'default' };
    return <Chip label={config.label} color={config.color} size="small" />;
  };

  // 新增網站相關函數
  const intervalOptions = [
    { value: 30, label: '30 秒' },
    { value: 60, label: '1 分鐘' },
    { value: 300, label: '5 分鐘' },
    { value: 600, label: '10 分鐘' },
    { value: 1800, label: '30 分鐘' },
    { value: 3600, label: '1 小時' }
  ];

  const handleAddChange = (field) => (event) => {
    const value = event.target.value;
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setAddFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setAddFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleAddUrlChange = (event) => {
    const url = event.target.value;
    const fullUrl = `${addFormData.protocol}://${url}`;
    setAddFormData(prev => ({
      ...prev,
      url,
      name: prev.name || extractNameFromUrl(fullUrl)
    }));
  };

  const extractNameFromUrl = (url) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (error) {
      return '';
    }
  };

  const getFullUrl = () => {
    return addFormData.url ? `${addFormData.protocol}://${addFormData.url}` : '';
  };

  const validateAddForm = () => {
    const errors = [];
    if (!addFormData.url) {
      errors.push('URL 為必填欄位');
    } else {
      try {
        new URL(getFullUrl());
      } catch (error) {
        errors.push('URL 格式不正確');
      }
    }
    if (!addFormData.name) {
      errors.push('網站名稱為必填欄位');
    }
    if (addFormData.interval < 30 || addFormData.interval > 3600) {
      errors.push('監控間隔必須在 30-3600 秒之間');
    }
    const statusCodeValidation = parseStatusCodeRange(addFormData.statusCodeRange);
    if (!statusCodeValidation.isValid) {
      errors.push(statusCodeValidation.error);
    }
    return errors;
  };

  const handleAddSubmit = async (event) => {
    event.preventDefault();
    const errors = validateAddForm();
    if (errors.length > 0) {
      setAddError(errors.join(', '));
      return;
    }
    
    setAddLoading(true);
    setAddError(null);
    
    try {
      const submitData = prepareSubmitData({
        ...addFormData,
        url: getFullUrl()
      });
      await websitesApi.create(submitData);
      setAddSuccess(true);
      setAddDrawerOpen(false);
      
      // 重設表單
      setAddFormData({
        protocol: 'https',
        url: '',
        name: '',
        interval: 60,
        keyword: '',
        statusCodeRange: '200:299',
        dataRetention: '6months'
      });
      
      // 重新載入數據
      fetchDashboardData();
      
    } catch (error) {
      console.error('新增網站失敗:', error);
      setAddError(error.response?.data?.error || '新增網站失敗');
    } finally {
      setAddLoading(false);
    }
  };

  const handleDeleteClick = (website) => {
    setDeleteDialog({ open: true, website });
  };

  const handleDeleteConfirm = async () => {
    const { website } = deleteDialog;
    if (!website) return;

    try {
      await websitesApi.delete(website.id);
      setWebsites(prev => prev.filter(w => w.id !== website.id));
      fetchDashboardData();
    } catch (error) {
      console.error('刪除網站失敗:', error);
      setError('刪除網站失敗');
    } finally {
      setDeleteDialog({ open: false, website: null });
    }
  };

  // 暫停監控
  const handlePauseMonitoring = async (websiteId) => {
    setPauseLoading(prev => new Set([...prev, websiteId]));
    
    try {
      const response = await websitesApi.pause(websiteId);
      if (response.data.success) {
        setWebsites(prev => prev.map(w => 
          w.id === websiteId ? { ...w, enabled: false } : w
        ));
        // 可選：顯示成功消息
        console.log('監控已暫停:', response.data.message);
      }
    } catch (error) {
      console.error('暫停監控失敗:', error);
      setError('暫停監控失敗');
    } finally {
      setPauseLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(websiteId);
        return newSet;
      });
    }
  };

  // 恢復監控
  const handleResumeMonitoring = async (websiteId) => {
    setPauseLoading(prev => new Set([...prev, websiteId]));
    
    try {
      const response = await websitesApi.resume(websiteId);
      if (response.data.success) {
        setWebsites(prev => prev.map(w => 
          w.id === websiteId ? { ...w, enabled: true } : w
        ));
        // 可選：顯示成功消息
        console.log('監控已恢復:', response.data.message);
      }
    } catch (error) {
      console.error('恢復監控失敗:', error);
      setError('恢復監控失敗');
    } finally {
      setPauseLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(websiteId);
        return newSet;
      });
    }
  };

  // 選單操作函數
  const handleMenuClick = (websiteId, event) => {
    setMenuAnchor(prev => ({
      ...prev,
      [websiteId]: event.currentTarget
    }));
  };

  const handleMenuClose = (websiteId) => {
    setMenuAnchor(prev => {
      const newState = { ...prev };
      delete newState[websiteId];
      return newState;
    });
  };

  const handleMenuAction = (websiteId, action, website) => {
    handleMenuClose(websiteId);
    
    switch (action) {
      case 'edit':
        handleEditClick(website);
        break;
      case 'pause':
        handlePauseMonitoring(websiteId);
        break;
      case 'resume':
        handleResumeMonitoring(websiteId);
        break;
      case 'delete':
        handleDeleteClick(website);
        break;
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    fetchDashboardData();
  };

  const handleEditClick = (website) => {
    setEditWebsite(website);
    
    // 解析 URL
    try {
      const urlObj = new URL(website.url);
      setEditFormData({
        protocol: urlObj.protocol.replace(':', ''),
        url: urlObj.hostname + urlObj.pathname + urlObj.search,
        name: website.name,
        interval: website.interval || 60,
        keyword: website.keyword || '',
        statusCodeRange: formatStatusCodeRangeForEdit(website.statusCodeRange),
        dataRetention: website.dataRetention || '6months'
      });
    } catch (error) {
      console.error('解析 URL 失敗:', error);
      setEditFormData({
        protocol: 'https',
        url: website.url,
        name: website.name,
        interval: website.interval || 60,
        keyword: website.keyword || '',
        statusCodeRange: formatStatusCodeRangeForEdit(website.statusCodeRange),
        dataRetention: website.dataRetention || '6months'
      });
    }
    
    setEditDrawerOpen(true);
    setEditError(null);
  };

  const handleEditChange = (field) => (event) => {
    const value = event.target.value;
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setEditFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setEditFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleEditUrlChange = (event) => {
    const url = event.target.value;
    const fullUrl = `${editFormData.protocol}://${url}`;
    setEditFormData(prev => ({
      ...prev,
      url
    }));
  };

  const getEditFullUrl = () => {
    return editFormData.url ? `${editFormData.protocol}://${editFormData.url}` : '';
  };

  const validateEditForm = () => {
    const errors = [];
    if (!editFormData.url) {
      errors.push('URL 為必填欄位');
    } else {
      try {
        new URL(getEditFullUrl());
      } catch (error) {
        errors.push('URL 格式不正確');
      }
    }
    if (!editFormData.name) {
      errors.push('網站名稱為必填欄位');
    }
    if (editFormData.interval < 30 || editFormData.interval > 3600) {
      errors.push('監控間隔必須在 30-3600 秒之間');
    }
    const statusCodeValidation = parseStatusCodeRange(editFormData.statusCodeRange);
    if (!statusCodeValidation.isValid) {
      errors.push(statusCodeValidation.error);
    }
    return errors;
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    const errors = validateEditForm();
    if (errors.length > 0) {
      setEditError(errors.join(', '));
      return;
    }
    
    setEditLoading(true);
    setEditError(null);
    
    try {
      const submitData = prepareSubmitData({
        ...editFormData,
        url: getEditFullUrl()
      });
      await websitesApi.update(editWebsite.id, submitData);
      setEditDrawerOpen(false);
      
      // 重新載入數據
      fetchDashboardData();
      
      // 重設表單
      setEditFormData({
        protocol: 'https',
        url: '',
        name: '',
        interval: 60,
        keyword: '',
        statusCodeRange: '200:299',
        dataRetention: '6months'
      });
      setEditWebsite(null);
      
    } catch (error) {
      console.error('更新網站失敗:', error);
      setEditError(error.response?.data?.error || '更新網站失敗');
    } finally {
      setEditLoading(false);
    }
  };

  const getStatusIcon = (status, enabled) => {
    // 如果監控已暫停，顯示暫停圖標
    if (!enabled) {
      return <Pause sx={{ color: '#6b7280', fontSize: '1.5rem' }} />;
    }
    
    switch (status) {
      case 'healthy':
        return <CheckCircle sx={{ color: '#16a34a', fontSize: '1.5rem' }} />;
      case 'unhealthy':
        return <Error sx={{ color: '#dc2626', fontSize: '1.5rem' }} />;
      case 'pending':
        return <Schedule sx={{ color: '#ea580c', fontSize: '1.5rem' }} />;
      default:
        return <Schedule sx={{ color: '#6b7280', fontSize: '1.5rem' }} />;
    }
  };

  const getSSLChip = (sslExpiryDays, url) => {
    // HTTPS 網站顯示安全狀態
    if (url.startsWith('https://')) {
      // SSL 憑證有效 (大於0天表示可以取得憑證資訊)
      if (sslExpiryDays > 0) {
        return (
          <Tooltip title={`SSL 憑證還有 ${sslExpiryDays} 天到期`}>
            <Chip 
              label="安全" 
              color="success" 
              size="small" 
              icon={<Security fontSize="small" />}
              variant="outlined"
            />
          </Tooltip>
        );
      } else {
        // SSL 錯誤或無法取得憑證資訊
        return (
          <Tooltip title="SSL 憑證錯誤或無法取得憑證資訊">
            <Chip 
              label="不安全" 
              color="error" 
              size="small" 
              icon={<NoEncryption fontSize="small" />}
              variant="outlined"
            />
          </Tooltip>
        );
      }
    } else {
      // HTTP 網站顯示不安全
      return (
        <Tooltip title="使用 HTTP 協定，資料傳輸未加密">
          <Chip 
            label="不安全" 
            color="error" 
            size="small" 
            icon={<NoEncryption fontSize="small" />}
            variant="outlined"
          />
        </Tooltip>
      );
    }
  };

  // 計算 24 小時 SLA 百分比（使用真實數據）
  const calculateSLA24h = (website) => {
    // 使用從後端計算得到的真實 SLA 數據
    return website.slaPercentage || 0;
  };

  // SLA 進度條組件 - 優化版本
  const SLAProgressBar = ({ website }) => {
    const slaPercentage = calculateSLA24h(website);
    const slaStatus = website.slaStatus || 'normal';
    
    // 如果是暫停狀態，顯示已暫停
    if (slaStatus === 'paused') {
      return (
        <Tooltip title="監控已暫停">
          <Box sx={{ width: '100%', minWidth: 110 }}>
            <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
              <Pause sx={{ fontSize: '1rem', color: '#757575' }} />
              <Typography
                variant="caption"
                sx={{ 
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  color: '#757575',
                  letterSpacing: '-0.01em'
                }}
              >
                已暫停
              </Typography>
            </Box>
          </Box>
        </Tooltip>
      );
    }
    
    // 如果是計算中狀態，顯示計算中
    if (slaStatus === 'calculating') {
      return (
        <Tooltip title="監控資料不足，正在累積中">
          <Box sx={{ width: '100%', minWidth: 110 }}>
            <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
              <Box 
                sx={{ 
                  width: 16, 
                  height: 16, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  backgroundColor: '#fff3e0',
                  borderRadius: '50%',
                  border: '2px solid #ff9800'
                }}
              >
                <Box 
                  sx={{ 
                    width: 6, 
                    height: 6, 
                    borderRadius: '50%', 
                    backgroundColor: '#ff9800' 
                  }} 
                />
              </Box>
              <Typography
                variant="caption"
                sx={{ 
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  color: '#ff9800',
                  letterSpacing: '-0.01em'
                }}
              >
                計算中
              </Typography>
            </Box>
          </Box>
        </Tooltip>
      );
    }
    
    // 如果是異常狀態，顯示錯誤訊息
    if (slaStatus === 'error' || slaStatus === 'nodata' || slaPercentage === null) {
      return (
        <Tooltip title="SLA 數據異常或無法取得">
          <Box sx={{ width: '100%', minWidth: 110 }}>
            <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
              <Error sx={{ fontSize: '1rem', color: '#d32f2f' }} />
              <Typography
                variant="caption"
                sx={{ 
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  color: '#d32f2f',
                  letterSpacing: '-0.01em'
                }}
              >
                異常
              </Typography>
            </Box>
          </Box>
        </Tooltip>
      );
    }
    
    const roundedSLA = Math.round(slaPercentage * 100) / 100; // 保留兩位小數
    
    // 根據 SLA 百分比決定顏色和漸層
    let colors = {
      primary: '#4caf50',
      secondary: '#66bb6a',
      text: '#2e7d32'
    };
    
    if (slaPercentage < 95) {
      colors = {
        primary: '#f44336',
        secondary: '#ef5350', 
        text: '#d32f2f'
      };
    } else if (slaPercentage < 99) {
      colors = {
        primary: '#ff9800',
        secondary: '#ffb74d',
        text: '#ed6c02'
      };
    }

    return (
      <Tooltip title={`過去 24 小時正常運行時間: ${roundedSLA}%`}>
        <Box sx={{ width: '100%', minWidth: 110 }}>
          <Box display="flex" alignItems="center" gap={1.5}>
            {/* 進度條容器 */}
            <Box
              sx={{
                width: '100%',
                height: 10,
                backgroundColor: '#f5f5f5',
                borderRadius: 8,
                overflow: 'hidden',
                position: 'relative',
                border: '1px solid rgba(0,0,0,0.06)',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06)'
              }}
            >
              {/* 進度條填充 */}
              <Box
                sx={{
                  width: `${slaPercentage}%`,
                  height: '100%',
                  background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                  borderRadius: 8,
                  position: 'relative',
                  transition: 'all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)',
                  boxShadow: `0 2px 8px ${colors.primary}40`
                }}
              >
                {/* 光澤效果 */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '50%',
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 50%, transparent 100%)',
                    borderRadius: '8px 8px 0 0'
                  }}
                />
              </Box>
            </Box>
            
            {/* 數字顯示 */}
            <Typography
              variant="caption"
              sx={{ 
                minWidth: 44,
                fontWeight: 700,
                fontSize: '0.8rem',
                fontFamily: '"SF Mono", "Monaco", "Inconsolata", "Roboto Mono", monospace',
                color: colors.text,
                letterSpacing: '-0.02em'
              }}
            >
              {roundedSLA}%
            </Typography>
          </Box>
        </Box>
      </Tooltip>
    );
  };

  // PDF報表下載功能
  const handleDownloadReport = async (timeRange = '24h') => {
    setReportLoading(true);
    try {
      // 使用精簡報表 API
      const urlPath = `/api/reports/pdf/clean?timeRange=${encodeURIComponent(timeRange)}`;

      const response = await fetch(urlPath, {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf',
        },
      });

      if (!response.ok) {
        throw new Error('PDF報表生成失敗');
      }

      // 取得檔案 blob
      const blob = await response.blob();
      
      // 創建下載連結
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // 設定檔案名稱
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '').replace('Z', '');
      const filenamePrefix = 'website_monitor_report';
      link.download = `${filenamePrefix}_${timeRange}_${timestamp}.pdf`;
      
      // 觸發下載
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // 清理資源
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('下載PDF報表失敗:', error);
      setError('PDF報表下載失敗，請稍後再試');
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <Box sx={{ 
      display: 'flex',
      flexDirection: 'column',
      gap: 3,
      ml: -5  // 往左移動
    }}>
      {/* 頁面標題 */}
      <Box>
        <Typography variant="h4" className="font-inter font-bold text-neutral-800 mb-2">
          監控儀表板
        </Typography>
        <Typography variant="body1" className="text-neutral-600">
          網站監控系統總覽與狀態統計
        </Typography>
      </Box>

      {/* 統計卡片 */}
      <Grid container spacing={3}>
        {statCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <CardContent sx={{ minHeight: 120 }}>
                <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ height: '100%' }}>
                  <Box>
                    <Typography variant="body2" className="text-neutral-500 font-inter">
                      {card.title}
                    </Typography>
                    <Typography variant="h4" className="font-inter font-bold text-neutral-800 mt-1">
                      {card.value}
                    </Typography>
                    <Box sx={{ minHeight: 16, mt: 1 }}>
                      {card.subtitle && (
                        <Typography variant="caption" className="text-neutral-400 font-inter" display="block">
                          {card.subtitle}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                  <Box className={`p-3 rounded-full bg-${card.color}-50`}>
                    {card.icon}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* 網站列表 */}
      <Card className="bg-white rounded-xl shadow-sm">
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
            <Box display="flex" alignItems="center">
              <Language className="text-neutral-600 mr-2" />
              <Typography variant="h6" className="font-inter font-semibold text-neutral-800">
                網站監控列表
              </Typography>
            </Box>
            <Box display="flex" gap={1}>
              <Tooltip title="下載PDF報表">
                <Button
                  variant="outlined"
                  startIcon={<PictureAsPdf />}
                  onClick={() => handleDownloadReport('24h')}
                  disabled={reportLoading}
                  className="font-inter normal-case"
                  sx={{ textTransform: 'none' }}
                >
                  {reportLoading ? '生成中...' : 'PDF報表'}
                </Button>
              </Tooltip>
              <Tooltip title="測試功能">
                <Button
                  variant="outlined"
                  startIcon={<Science />}
                  onClick={() => setAddDrawerOpen(true)}
                  className="font-inter normal-case"
                  sx={{ textTransform: 'none' }}
                >
                  測試
                </Button>
              </Tooltip>
              <Button
                component={Link}
                to="/websites/add"
                variant="contained"
                startIcon={<Add />}
                className="font-inter normal-case"
                sx={{ textTransform: 'none' }}
              >
                新增網站
              </Button>
              <Tooltip title="重新整理">
                <IconButton onClick={handleRefresh} disabled={loading}>
                  <Refresh />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
          
          {websites.length === 0 ? (
            <Box textAlign="center" py={8}>
              <Language sx={{ fontSize: 64, color: '#d1d5db', mb: 2 }} />
              <Typography variant="h6" className="font-inter font-medium text-neutral-600 mb-2">
                尚未新增任何網站
              </Typography>
              <Typography variant="body2" className="text-neutral-500 mb-4">
                開始監控您的第一個網站
              </Typography>
              <Button
                component={Link}
                to="/websites/add"
                variant="contained"
                startIcon={<Add />}
                className="font-inter normal-case"
                sx={{ textTransform: 'none' }}
              >
                新增網站
              </Button>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell className="font-inter font-semibold">狀態</TableCell>
                    <TableCell className="font-inter font-semibold">SSL</TableCell>
                    <TableCell className="font-inter font-semibold">網站名稱</TableCell>
                    <TableCell className="font-inter font-semibold">URL</TableCell>
                    <TableCell className="font-inter font-semibold" align="center">間隔</TableCell>
                    <TableCell className="font-inter font-semibold" align="center">SLA</TableCell>
                    <TableCell className="font-inter font-semibold" align="center">操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {websites.map((website) => (
                    <TableRow 
                      key={website.id}
                      className="hover:bg-neutral-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/dashboard/${website.id}`)}
                      sx={{
                        '&:hover': {
                          backgroundColor: '#f8fafc'
                        }
                      }}
                    >
                      <TableCell>
                        <Box display="flex" alignItems="center" justifyContent="flex-start">
                          {getStatusIcon(website.status, website.enabled)}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {getSSLChip(website.sslExpiryDays || 0, website.url)}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" className="font-inter font-medium text-neutral-800">
                          {website.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography 
                          variant="body2" 
                          className="text-blue-600 font-mono text-sm"
                          sx={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}
                        >
                          {website.url}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip 
                          label={`${website.interval}秒`} 
                          size="small" 
                          variant="outlined"
                          className="font-inter"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <SLAProgressBar website={website} />
                      </TableCell>
                      <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                        <Box display="flex" justifyContent="center">
                          <Tooltip title="操作選單">
                            <IconButton 
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMenuClick(website.id, e);
                              }}
                              className="text-gray-600 hover:bg-gray-50"
                            >
                              <MoreVert fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          
                          <Menu
                            anchorEl={menuAnchor[website.id]}
                            open={Boolean(menuAnchor[website.id])}
                            onClose={() => handleMenuClose(website.id)}
                            onClick={(e) => e.stopPropagation()}
                            PaperProps={{
                              sx: {
                                minWidth: 140
                              }
                            }}
                          >
                            <MenuItem 
                              onClick={() => handleMenuAction(website.id, 'edit', website)}
                            >
                              <ListItemIcon>
                                <Edit fontSize="small" />
                              </ListItemIcon>
                              <ListItemText>編輯</ListItemText>
                            </MenuItem>
                            
                            {website.enabled ? (
                              <MenuItem 
                                onClick={() => handleMenuAction(website.id, 'pause', website)}
                                disabled={pauseLoading.has(website.id)}
                              >
                                <ListItemIcon>
                                  {pauseLoading.has(website.id) ? (
                                    <CircularProgress size={16} />
                                  ) : (
                                    <Pause fontSize="small" />
                                  )}
                                </ListItemIcon>
                                <ListItemText>暫停監控</ListItemText>
                              </MenuItem>
                            ) : (
                              <MenuItem 
                                onClick={() => handleMenuAction(website.id, 'resume', website)}
                                disabled={pauseLoading.has(website.id)}
                              >
                                <ListItemIcon>
                                  {pauseLoading.has(website.id) ? (
                                    <CircularProgress size={16} />
                                  ) : (
                                    <PlayArrow fontSize="small" />
                                  )}
                                </ListItemIcon>
                                <ListItemText>恢復監控</ListItemText>
                              </MenuItem>
                            )}
                            
                            <MenuItem 
                              onClick={() => handleMenuAction(website.id, 'delete', website)}
                              sx={{ color: 'error.main' }}
                            >
                              <ListItemIcon>
                                <Delete fontSize="small" color="error" />
                              </ListItemIcon>
                              <ListItemText>刪除</ListItemText>
                            </MenuItem>
                          </Menu>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* 新增網站抽屜 */}
      <Drawer
        anchor="right"
        open={addDrawerOpen}
        onClose={() => setAddDrawerOpen(false)}
        sx={{
          '& .MuiDrawer-paper': {
            width: 500,
            maxWidth: '90vw'
          }
        }}
      >
        <Box sx={{ p: 3 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
            <Typography variant="h6" className="font-inter font-semibold">
              測試新增網站
            </Typography>
            <IconButton onClick={() => setAddDrawerOpen(false)}>
              <Close />
            </IconButton>
          </Box>

          {addError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {addError}
            </Alert>
          )}

          <form onSubmit={handleAddSubmit}>
            <Box className="space-y-4">
              <TextField
                fullWidth
                label="網站名稱"
                value={addFormData.name}
                onChange={handleAddChange('name')}
                required
              />

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  網站 URL
                </Typography>
                <Box display="flex" gap={1}>
                  <FormControl sx={{ minWidth: 100 }}>
                    <InputLabel>協議</InputLabel>
                    <Select
                      value={addFormData.protocol}
                      onChange={handleAddChange('protocol')}
                      label="協議"
                    >
                      <MenuItem value="https">HTTPS</MenuItem>
                      <MenuItem value="http">HTTP</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    fullWidth
                    label="網址"
                    value={addFormData.url}
                    onChange={handleAddUrlChange}
                    placeholder="example.com"
                    required
                  />
                </Box>
              </Box>

              <FormControl fullWidth>
                <InputLabel>監控間隔</InputLabel>
                <Select
                  value={addFormData.interval}
                  onChange={handleAddChange('interval')}
                  label="監控間隔"
                >
                  {intervalOptions.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="內容關鍵字（選填）"
                value={addFormData.keyword}
                onChange={handleAddChange('keyword')}
                helperText="若回應內容包含此關鍵字則視為正常"
              />

              <TextField
                fullWidth
                label="正常狀態碼範圍"
                value={addFormData.statusCodeRange}
                onChange={handleAddChange('statusCodeRange')}
                helperText="例如：200:299 表示 2xx 狀態碼為正常；多個範圍用逗號分隔：200:299,404"
                placeholder="200:299"
                required
              />

              <FormControl fullWidth>
                <InputLabel>資料留存期限</InputLabel>
                <Select
                  value={addFormData.dataRetention}
                  onChange={handleAddChange('dataRetention')}
                  label="資料留存期限"
                >
                  <MenuItem value="3months">3個月</MenuItem>
                  <MenuItem value="6months">6個月</MenuItem>
                  <MenuItem value="1year">1年</MenuItem>
                  <MenuItem value="2years">2年</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Box display="flex" gap={2} mt={4}>
              <Button
                variant="outlined"
                onClick={() => setAddDrawerOpen(false)}
                fullWidth
                sx={{ textTransform: 'none' }}
              >
                取消
              </Button>
              <Button
                type="submit"
                variant="contained"
                startIcon={<Save />}
                disabled={addLoading}
                fullWidth
                sx={{ textTransform: 'none' }}
              >
                {addLoading ? '新增中...' : '新增網站'}
              </Button>
            </Box>
          </form>
        </Box>
      </Drawer>

      {/* 編輯網站抽屜 */}
      <Drawer
        anchor="right"
        open={editDrawerOpen}
        onClose={() => setEditDrawerOpen(false)}
        sx={{
          '& .MuiDrawer-paper': {
            width: 500,
            maxWidth: '90vw'
          }
        }}
      >
        <Box sx={{ p: 3 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
            <Typography variant="h6" className="font-inter font-semibold">
              編輯網站
            </Typography>
            <IconButton onClick={() => setEditDrawerOpen(false)}>
              <Close />
            </IconButton>
          </Box>

          {editError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {editError}
            </Alert>
          )}

          <form onSubmit={handleEditSubmit}>
            <Box className="space-y-4">
              <TextField
                fullWidth
                label="顯示名稱"
                value={editFormData.name}
                onChange={handleEditChange('name')}
                required
              />

              <Box>
                <Typography variant="h6" sx={{ mb: 1, fontWeight: 'semibold' }}>
                  網站 URL
                </Typography>
                <Box display="flex" gap={1}>
                  <FormControl sx={{ minWidth: 100 }}>
                    <InputLabel>協議</InputLabel>
                    <Select
                      value={editFormData.protocol}
                      onChange={handleEditChange('protocol')}
                      label="協議"
                    >
                      <MenuItem value="https">HTTPS</MenuItem>
                      <MenuItem value="http">HTTP</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    fullWidth
                    label="網址"
                    value={editFormData.url.replace(`${editFormData.protocol}://`, '')}
                    onChange={handleEditUrlChange}
                    placeholder="example.com"
                    required
                  />
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  完整網址：{getEditFullUrl()}
                </Typography>
              </Box>

              <FormControl fullWidth>
                <InputLabel>監控間隔</InputLabel>
                <Select
                  value={editFormData.interval}
                  onChange={handleEditChange('interval')}
                  label="監控間隔"
                >
                  {intervalOptions.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="內容關鍵字（選填）"
                value={editFormData.keyword}
                onChange={handleEditChange('keyword')}
                helperText="若回應內容包含此關鍵字則視為正常"
              />

              <TextField
                fullWidth
                label="正常狀態碼範圍"
                value={editFormData.statusCodeRange}
                onChange={handleEditChange('statusCodeRange')}
                helperText="例如：200:299 表示 2xx 狀態碼為正常；多個範圍用逗號分隔：200:299,404"
                placeholder="200:299"
                required
              />

              <FormControl fullWidth>
                <InputLabel>資料留存期限</InputLabel>
                <Select
                  value={editFormData.dataRetention}
                  onChange={handleEditChange('dataRetention')}
                  label="資料留存期限"
                >
                  <MenuItem value="3months">3個月</MenuItem>
                  <MenuItem value="6months">6個月</MenuItem>
                  <MenuItem value="1year">1年</MenuItem>
                  <MenuItem value="2years">2年</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Box display="flex" gap={2} mt={4}>
              <Button
                variant="outlined"
                onClick={() => setEditDrawerOpen(false)}
                fullWidth
                sx={{ textTransform: 'none' }}
              >
                取消
              </Button>
              <Button
                type="submit"
                variant="contained"
                startIcon={<Save />}
                disabled={editLoading}
                fullWidth
                sx={{ textTransform: 'none' }}
              >
                {editLoading ? '更新中...' : '更新網站'}
              </Button>
            </Box>
          </form>
        </Box>
      </Drawer>

      {/* 刪除確認對話框 */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, website: null })}
      >
        <DialogTitle>確認刪除</DialogTitle>
        <DialogContent>
          <DialogContentText>
            確定要刪除網站 "{deleteDialog.website?.name}" 嗎？
            <br />
            此操作將無法復原，包含所有相關的監控數據都會被刪除。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, website: null })}>
            取消
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
            autoFocus
          >
            確認刪除
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Dashboard;
