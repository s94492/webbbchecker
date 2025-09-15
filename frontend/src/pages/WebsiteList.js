import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  Button, 
  Chip, 
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
  CircularProgress,
  Alert,
  Tooltip,
  Drawer,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Divider
} from '@mui/material';
import { 
  Add, 
  Edit, 
  Delete, 
  CheckCircle,
  Error,
  Schedule,
  Speed,
  Language,
  Refresh,
  Security,
  Warning,
  Save,
  Close,
  Science
} from '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { websitesApi, metricsApi } from '../services/api';

const WebsiteList = () => {
  const [websites, setWebsites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, website: null });
  const [editDrawer, setEditDrawer] = useState({ open: false, website: null });
  const [editFormData, setEditFormData] = useState({
    url: '',
    name: '',
    interval: 60,
    keyword: '',
    statusCodeRange: { min: 200, max: 299 }
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState(null);
  
  // 新增網站抽屜狀態
  const [addDrawerOpen, setAddDrawerOpen] = useState(false);
  const [addFormData, setAddFormData] = useState({
    protocol: 'https',
    url: '',
    name: '',
    interval: 60,
    keyword: '',
    statusCodeRange: { min: 200, max: 299 }
  });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState(null);
  const [addSuccess, setAddSuccess] = useState(false);
  const navigate = useNavigate();

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
    
    const { min, max } = addFormData.statusCodeRange;
    if (min < 100 || min > 599 || max < 100 || max > 599 || min > max) {
      errors.push('狀態碼範圍不正確');
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
      await websitesApi.create({
        ...addFormData,
        url: getFullUrl()
      });
      setAddSuccess(true);
      
      // 重新載入網站列表
      fetchWebsites();
      
      // 2秒後關閉抽屜並重設表單
      setTimeout(() => {
        setAddDrawerOpen(false);
        setAddSuccess(false);
        setAddFormData({
          protocol: 'https',
          url: '',
          name: '',
          interval: 60,
          keyword: '',
          statusCodeRange: { min: 200, max: 299 }
        });
      }, 2000);
      
    } catch (error) {
      console.error('新增網站失敗:', error);
      setAddError(error.response?.data?.error || '新增網站失敗');
    } finally {
      setAddLoading(false);
    }
  };

  const handleAddDrawerClose = () => {
    setAddDrawerOpen(false);
    setAddError(null);
    setAddSuccess(false);
  };

  useEffect(() => {
    fetchWebsites();
  }, []);

  const fetchWebsites = async () => {
    try {
      setLoading(true);
      const response = await websitesApi.getAll();
      const websitesData = response.data.data;
      
      // 為每個網站獲取最新的 SSL 資訊
      const websitesWithSSL = await Promise.all(
        websitesData.map(async (website) => {
          try {
            const metricsResponse = await metricsApi.getLatest(website.id);
            return {
              ...website,
              sslExpiryDays: metricsResponse.data.data?.sslExpiryDays || 0
            };
          } catch (error) {
            console.error(`取得 ${website.name} SSL 資訊失敗:`, error);
            return {
              ...website,
              sslExpiryDays: 0
            };
          }
        })
      );
      
      setWebsites(websitesWithSSL);
      setError(null);
    } catch (error) {
      console.error('取得網站列表失敗:', error);
      setError('無法載入網站列表');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await websitesApi.delete(deleteDialog.website.id);
      setWebsites(websites.filter(w => w.id !== deleteDialog.website.id));
      setDeleteDialog({ open: false, website: null });
    } catch (error) {
      console.error('刪除網站失敗:', error);
      setError('刪除網站失敗');
    }
  };

  const handleEditOpen = (website) => {
    setEditFormData({
      url: website.url,
      name: website.name,
      interval: website.interval,
      keyword: website.keyword || '',
      statusCodeRange: {
        min: website.statusCodeRange.min,
        max: website.statusCodeRange.max
      }
    });
    setEditDrawer({ open: true, website });
    setEditError(null);
  };

  const handleEditClose = () => {
    setEditDrawer({ open: false, website: null });
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

  const validateEditForm = () => {
    const errors = [];
    
    if (!editFormData.url) {
      errors.push('URL 為必填欄位');
    } else {
      try {
        new URL(editFormData.url);
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
    
    const { min, max } = editFormData.statusCodeRange;
    if (min < 100 || min > 599 || max < 100 || max > 599 || min > max) {
      errors.push('狀態碼範圍不正確');
    }
    
    return errors;
  };

  const handleEditSubmit = async () => {
    const errors = validateEditForm();
    if (errors.length > 0) {
      setEditError(errors.join(', '));
      return;
    }
    
    setEditLoading(true);
    setEditError(null);
    
    try {
      const response = await websitesApi.update(editDrawer.website.id, editFormData);
      const updatedWebsite = response.data.data;
      
      setWebsites(websites.map(w => 
        w.id === editDrawer.website.id ? updatedWebsite : w
      ));
      
      handleEditClose();
    } catch (error) {
      console.error('更新網站失敗:', error);
      setEditError(error.response?.data?.error || '更新網站失敗');
    } finally {
      setEditLoading(false);
    }
  };

  const getStatusChip = (status) => {
    const statusConfig = {
      healthy: { label: '正常', color: 'success', icon: <CheckCircle fontSize="small" /> },
      unhealthy: { label: '異常', color: 'error', icon: <Error fontSize="small" /> },
      pending: { label: '待檢查', color: 'warning', icon: <Schedule fontSize="small" /> }
    };
    
    const config = statusConfig[status] || { label: '未知', color: 'default', icon: null };
    return (
      <Chip 
        label={config.label} 
        color={config.color} 
        size="small" 
        icon={config.icon}
        variant="outlined"
      />
    );
  };

  const getSSLChip = (sslExpiryDays, url) => {
    // 只對 HTTPS 網站顯示 SSL 資訊
    if (!url.startsWith('https://')) {
      return (
        <Chip 
          label="HTTP" 
          color="default" 
          size="small" 
          variant="outlined"
        />
      );
    }

    if (sslExpiryDays === 0) {
      return (
        <Chip 
          label="SSL 錯誤" 
          color="error" 
          size="small" 
          icon={<Error fontSize="small" />}
          variant="outlined"
        />
      );
    } else if (sslExpiryDays < 30) {
      return (
        <Tooltip title={`SSL 憑證將在 ${sslExpiryDays} 天後到期`}>
          <Chip 
            label={`${sslExpiryDays}天到期`} 
            color="warning" 
            size="small" 
            icon={<Warning fontSize="small" />}
            variant="outlined"
          />
        </Tooltip>
      );
    } else {
      return (
        <Tooltip title={`SSL 憑證還有 ${sslExpiryDays} 天到期`}>
          <Chip 
            label="SSL 安全" 
            color="success" 
            size="small" 
            icon={<Security fontSize="small" />}
            variant="outlined"
          />
        </Tooltip>
      );
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'yyyy/MM/dd HH:mm');
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box className="space-y-6">
      {/* 頁面標題與操作 */}
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="h4" className="font-inter font-bold text-neutral-800 mb-2">
            網站監控列表
          </Typography>
          <Typography variant="body1" className="text-neutral-600">
            管理所有監控中的網站
          </Typography>
        </Box>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchWebsites}
            className="font-inter normal-case"
            sx={{ textTransform: 'none' }}
          >
            重新載入
          </Button>
          <Button
            variant="outlined"
            startIcon={<Science />}
            onClick={() => setAddDrawerOpen(true)}
            className="font-inter normal-case border-green-600 text-green-600 hover:bg-green-50"
            sx={{ 
              textTransform: 'none',
              borderColor: '#059669',
              color: '#059669',
              '&:hover': {
                borderColor: '#047857',
                backgroundColor: '#f0fdf4'
              }
            }}
          >
            測試功能
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            component={Link}
            to="/websites/add"
            className="font-inter normal-case bg-blue-600 hover:bg-blue-700"
            sx={{ textTransform: 'none' }}
          >
            新增網站
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" className="mb-4">
          {error}
        </Alert>
      )}

      {/* 網站列表 */}
      <Card className="bg-white rounded-xl shadow-sm">
        <CardContent className="p-0">
          {websites.length === 0 ? (
            <Box textAlign="center" py={8}>
              <Language className="text-neutral-300 mb-4" style={{ fontSize: 64 }} />
              <Typography variant="h6" className="text-neutral-500 mb-2">
                尚未新增任何網站
              </Typography>
              <Typography variant="body2" className="text-neutral-400 mb-4">
                開始新增網站來監控其運行狀態
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                component={Link}
                to="/websites/add"
                className="font-inter normal-case"
                sx={{ textTransform: 'none' }}
              >
                新增第一個網站
              </Button>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead className="bg-neutral-50">
                  <TableRow>
                    <TableCell className="font-inter font-semibold">網站名稱</TableCell>
                    <TableCell className="font-inter font-semibold">URL</TableCell>
                    <TableCell className="font-inter font-semibold">狀態</TableCell>
                    <TableCell className="font-inter font-semibold">SSL 狀態</TableCell>
                    <TableCell className="font-inter font-semibold">監控間隔</TableCell>
                    <TableCell className="font-inter font-semibold">最後檢查</TableCell>
                    <TableCell className="font-inter font-semibold">操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {websites.map((website) => (
                    <TableRow 
                      key={website.id}
                      onClick={() => navigate(`/websites/${website.id}`)}
                      sx={{
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: '#f8fafc',
                          '& .action-buttons': {
                            opacity: 1
                          }
                        },
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <TableCell>
                        <Box>
                          <Typography 
                            variant="subtitle2" 
                            className="font-inter font-medium text-neutral-800"
                          >
                            {website.name}
                          </Typography>
                          {website.keyword && (
                            <Typography variant="caption" className="text-neutral-500">
                              關鍵字: {website.keyword}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography 
                          variant="body2" 
                          className="text-blue-600 hover:text-blue-800 cursor-pointer"
                          onClick={() => window.open(website.url, '_blank')}
                        >
                          {website.url}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {getStatusChip(website.status)}
                      </TableCell>
                      <TableCell>
                        {getSSLChip(website.sslExpiryDays, website.url)}
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          <Speed className="text-neutral-400 mr-1" fontSize="small" />
                          <Typography variant="body2">
                            {website.interval}秒
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" className="text-neutral-600">
                          {formatDate(website.lastCheck)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={1} className="action-buttons" sx={{ opacity: 0.6, transition: 'opacity 0.2s ease' }}>
                          <Tooltip title="編輯">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditOpen(website);
                              }}
                              className="text-neutral-600 hover:bg-neutral-50"
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="刪除">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteDialog({ open: true, website });
                              }}
                              className="text-red-600 hover:bg-red-50"
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Tooltip>
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

      {/* 刪除確認對話框 */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, website: null })}
      >
        <DialogTitle>確認刪除</DialogTitle>
        <DialogContent>
          <DialogContentText>
            您確定要刪除網站 "{deleteDialog.website?.name}" 嗎？
            此操作將永久刪除該網站的所有監控數據。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteDialog({ open: false, website: null })}
            className="font-inter normal-case"
            sx={{ textTransform: 'none' }}
          >
            取消
          </Button>
          <Button 
            onClick={handleDelete} 
            color="error" 
            variant="contained"
            className="font-inter normal-case"
            sx={{ textTransform: 'none' }}
          >
            刪除
          </Button>
        </DialogActions>
      </Dialog>

      {/* 編輯抽屜 */}
      <Drawer
        anchor="right"
        open={editDrawer.open}
        onClose={handleEditClose}
        sx={{
          '& .MuiDrawer-paper': {
            width: 480,
            padding: 0
          }
        }}
      >
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* 標題列 */}
          <Box sx={{ 
            p: 3, 
            borderBottom: '1px solid #e0e0e0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <Typography variant="h6" className="font-inter font-semibold text-neutral-800">
              編輯監控網站
            </Typography>
            <IconButton onClick={handleEditClose} size="small">
              <Close />
            </IconButton>
          </Box>

          {/* 表單內容 */}
          <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
            {editError && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {editError}
              </Alert>
            )}

            <Box className="space-y-4">
              {/* URL */}
              <TextField
                fullWidth
                label="網站 URL"
                value={editFormData.url}
                onChange={handleEditChange('url')}
                placeholder="https://example.com"
                required
                helperText="請輸入完整的 URL，包含 http:// 或 https://"
              />

              {/* 網站名稱 */}
              <TextField
                fullWidth
                label="網站名稱"
                value={editFormData.name}
                onChange={handleEditChange('name')}
                placeholder="網站名稱"
                required
                helperText="用於識別的網站名稱"
              />

              {/* 監控間隔 */}
              <FormControl fullWidth>
                <InputLabel>監控間隔</InputLabel>
                <Select
                  value={editFormData.interval}
                  onChange={handleEditChange('interval')}
                  label="監控間隔"
                >
                  <MenuItem value={30}>30 秒</MenuItem>
                  <MenuItem value={60}>1 分鐘</MenuItem>
                  <MenuItem value={300}>5 分鐘</MenuItem>
                  <MenuItem value={600}>10 分鐘</MenuItem>
                  <MenuItem value={1800}>30 分鐘</MenuItem>
                  <MenuItem value={3600}>1 小時</MenuItem>
                </Select>
              </FormControl>

              <Divider sx={{ my: 3 }} />

              {/* 內容關鍵字 */}
              <TextField
                fullWidth
                label="內容關鍵字（選填）"
                value={editFormData.keyword}
                onChange={handleEditChange('keyword')}
                placeholder="關鍵字"
                helperText="若回應內容包含此關鍵字則視為正常，留空則不檢查"
              />

              {/* 狀態碼範圍 */}
              <Box>
                <Typography variant="subtitle2" className="font-inter font-medium text-neutral-700" sx={{ mb: 3 }}>
                  正常狀態碼範圍
                </Typography>
                <Box display="flex" gap={2} alignItems="center">
                  <TextField
                    type="number"
                    label="最小值"
                    value={editFormData.statusCodeRange.min}
                    onChange={handleEditChange('statusCodeRange.min')}
                    inputProps={{ min: 100, max: 599 }}
                    sx={{ width: 120 }}
                  />
                  <Typography variant="body2" className="text-neutral-500">
                    到
                  </Typography>
                  <TextField
                    type="number"
                    label="最大值"
                    value={editFormData.statusCodeRange.max}
                    onChange={handleEditChange('statusCodeRange.max')}
                    inputProps={{ min: 100, max: 599 }}
                    sx={{ width: 120 }}
                  />
                </Box>
                <Typography variant="caption" className="text-neutral-500">
                  例如：200-299 表示 2xx 狀態碼為正常
                </Typography>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* 設定預覽 */}
              <Box>
                <Typography variant="subtitle2" className="font-inter font-medium text-neutral-700 mb-2">
                  設定預覽
                </Typography>
                <Paper sx={{ p: 2, bgcolor: '#f8f9fa', borderRadius: 2 }}>
                  <Box className="space-y-2">
                    <Box display="flex" alignItems="center" gap={2}>
                      <Typography variant="body2" className="text-neutral-600 min-w-20">
                        網站：
                      </Typography>
                      <Typography variant="body2" className="font-medium">
                        {editFormData.name || '未設定'}
                      </Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Typography variant="body2" className="text-neutral-600 min-w-20">
                        URL：
                      </Typography>
                      <Typography variant="body2" className="font-medium text-blue-600" sx={{ wordBreak: 'break-all' }}>
                        {editFormData.url || '未設定'}
                      </Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Typography variant="body2" className="text-neutral-600 min-w-20">
                        間隔：
                      </Typography>
                      <Chip 
                        label={`每 ${editFormData.interval} 秒`} 
                        size="small" 
                        color="primary" 
                        variant="outlined" 
                      />
                    </Box>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Typography variant="body2" className="text-neutral-600 min-w-20">
                        狀態碼：
                      </Typography>
                      <Chip 
                        label={`${editFormData.statusCodeRange.min}-${editFormData.statusCodeRange.max}`} 
                        size="small" 
                        color="success" 
                        variant="outlined" 
                      />
                    </Box>
                    {editFormData.keyword && (
                      <Box display="flex" alignItems="center" gap={2}>
                        <Typography variant="body2" className="text-neutral-600 min-w-20">
                          關鍵字：
                        </Typography>
                        <Chip 
                          label={editFormData.keyword} 
                          size="small" 
                          color="info" 
                          variant="outlined" 
                        />
                      </Box>
                    )}
                  </Box>
                </Paper>
              </Box>
            </Box>
          </Box>

          {/* 操作按鈕 */}
          <Box sx={{ 
            p: 3, 
            borderTop: '1px solid #e0e0e0',
            display: 'flex',
            gap: 2,
            justifyContent: 'flex-end'
          }}>
            <Button
              variant="outlined"
              onClick={handleEditClose}
              disabled={editLoading}
              className="font-inter normal-case"
              sx={{ textTransform: 'none' }}
            >
              取消
            </Button>
            <Button
              variant="contained"
              startIcon={<Save />}
              onClick={handleEditSubmit}
              disabled={editLoading}
              className="font-inter normal-case bg-blue-600 hover:bg-blue-700"
              sx={{ textTransform: 'none' }}
            >
              {editLoading ? '更新中...' : '儲存變更'}
            </Button>
          </Box>
        </Box>
      </Drawer>

      {/* 新增網站抽屜 */}
      <Drawer
        anchor="right"
        open={addDrawerOpen}
        onClose={handleAddDrawerClose}
        PaperProps={{
          sx: { width: { xs: '100%', sm: 500 } }
        }}
      >
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" className="font-inter font-semibold mb-6">
            測試功能 - 新增網站
          </Typography>
          
          {addError && (
            <Alert severity="error" className="mb-4">
              {addError}
            </Alert>
          )}
          
          {addSuccess && (
            <Alert severity="success" className="mb-4">
              網站新增成功！
            </Alert>
          )}
          
          <Box component="form" onSubmit={handleAddSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* 網站名稱 */}
            <TextField
              fullWidth
              label="網站名稱"
              value={addFormData.name}
              onChange={handleAddChange('name')}
              placeholder="我的網站"
              required
              helperText="用於識別的網站名稱"
              FormHelperTextProps={{
                sx: { fontSize: '0.8rem' }
              }}
            />

            {/* URL */}
            <Box>
              <Typography variant="subtitle2" className="font-inter font-medium text-neutral-700" sx={{ mb: 4 }}>
                網站 URL
              </Typography>
              <Box display="flex" gap={2} alignItems="flex-start">
                <FormControl sx={{ minWidth: 120 }}>
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
                  helperText="請輸入不含協議的網址"
                  FormHelperTextProps={{
                    sx: { fontSize: '0.8rem' }
                  }}
                />
              </Box>
            </Box>

            {/* 監控間隔 */}
            <FormControl fullWidth>
              <InputLabel>監控間隔</InputLabel>
              <Select
                value={addFormData.interval}
                onChange={handleAddChange('interval')}
                label="監控間隔"
              >
                {intervalOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* 關鍵字檢查 */}
            <TextField
              fullWidth
              label="內容關鍵字 (選填)"
              value={addFormData.keyword}
              onChange={handleAddChange('keyword')}
              placeholder="關鍵字"
              helperText="若回應內容包含此關鍵字則視為正常，留空則不檢查"
            />

            {/* 狀態碼範圍 */}
            <Box>
              <Typography variant="subtitle2" className="font-inter font-medium text-neutral-700" sx={{ mb: 3 }}>
                正常狀態碼範圍
              </Typography>
              <Box display="flex" gap={2} alignItems="center">
                <TextField
                  type="number"
                  label="最小值"
                  value={addFormData.statusCodeRange.min}
                  onChange={handleAddChange('statusCodeRange.min')}
                  inputProps={{ min: 100, max: 599 }}
                  sx={{ width: 120 }}
                />
                <Typography variant="body2" className="text-neutral-500">
                  到
                </Typography>
                <TextField
                  type="number"
                  label="最大值"
                  value={addFormData.statusCodeRange.max}
                  onChange={handleAddChange('statusCodeRange.max')}
                  inputProps={{ min: 100, max: 599 }}
                  sx={{ width: 120 }}
                />
              </Box>
            </Box>

            {/* 預覽 URL */}
            {addFormData.url && (
              <Box sx={{ p: 2, backgroundColor: '#f8f9fa', borderRadius: 1, border: '1px solid #e9ecef' }}>
                <Typography variant="body2" className="text-neutral-600 mb-1">
                  完整 URL 預覽：
                </Typography>
                <Typography variant="body2" className="font-mono text-blue-600">
                  {getFullUrl()}
                </Typography>
              </Box>
            )}
          </Box>
          
          <Divider sx={{ my: 3 }} />
          
          <Box sx={{
            display: 'flex',
            gap: 2,
            justifyContent: 'flex-end'
          }}>
            <Button
              variant="outlined"
              onClick={handleAddDrawerClose}
              disabled={addLoading}
              className="font-inter normal-case"
              sx={{ textTransform: 'none' }}
            >
              取消
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleAddSubmit}
              disabled={addLoading}
              className="font-inter normal-case bg-blue-600 hover:bg-blue-700"
              sx={{ textTransform: 'none' }}
            >
              {addLoading ? '新增中...' : '新增網站'}
            </Button>
          </Box>
        </Box>
      </Drawer>
    </Box>
  );
};

export default WebsiteList;