import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  TextField, 
  Button, 
  FormControl,
  Select,
  MenuItem,
  Chip,
  Alert,
  Paper,
  Divider,
  FormHelperText
} from '@mui/material';
import { Add, Language } from '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom';
import { websitesApi } from '../services/api';

const AddWebsite = () => {
  const navigate = useNavigate();
  
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
      ...formData,
      statusCodeRange: {
        min: firstRange.min,
        max: firstRange.max
      }
    };
  };
  
  const [formData, setFormData] = useState({
    protocol: 'https',
    url: '',
    name: '',
    interval: 60,
    keyword: '',
    statusCodeRange: '200:299',
    dataRetention: '6months'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (field) => (event) => {
    const value = event.target.value;
    
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleUrlChange = (event) => {
    const url = event.target.value;
    const fullUrl = `${formData.protocol}://${url}`;
    setFormData(prev => ({
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
    return formData.url ? `${formData.protocol}://${formData.url}` : '';
  };

  const validateForm = () => {
    const errors = [];
    
    if (!formData.url) {
      errors.push('URL 為必填欄位');
    } else {
      try {
        new URL(getFullUrl());
      } catch (error) {
        errors.push('URL 格式不正確');
      }
    }
    
    if (!formData.name) {
      errors.push('網站名稱為必填欄位');
    }
    
    if (formData.interval < 30 || formData.interval > 3600) {
      errors.push('監控間隔必須在 30-3600 秒之間');
    }
    
    const statusCodeValidation = parseStatusCodeRange(formData.statusCodeRange);
    if (!statusCodeValidation.isValid) {
      errors.push(statusCodeValidation.error);
    }
    
    return errors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    const errors = validateForm();
    if (errors.length > 0) {
      setError(errors.join(', '));
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const submitData = prepareSubmitData({
        ...formData,
        url: getFullUrl()
      });
      await websitesApi.create(submitData);
      setSuccess(true);
      
      setTimeout(() => {
        navigate('/websites');
      }, 2000);
      
    } catch (error) {
      console.error('新增網站失敗:', error);
      setError(error.response?.data?.error || '新增網站失敗');
    } finally {
      setLoading(false);
    }
  };

  const intervalOptions = [
    { value: 30, label: '30 秒' },
    { value: 60, label: '1 分鐘' },
    { value: 300, label: '5 分鐘' },
    { value: 600, label: '10 分鐘' },
    { value: 1800, label: '30 分鐘' },
    { value: 3600, label: '1 小時' }
  ];

  if (success) {
    return (
      <Box className="space-y-6">
        <Card className="bg-white rounded-xl shadow-sm">
          <CardContent className="text-center py-8">
            <Language className="text-green-600 mb-4" style={{ fontSize: 64 }} />
            <Typography variant="h5" className="font-inter font-bold text-green-600 mb-2">
              網站新增成功！
            </Typography>
            <Typography variant="body1" className="text-neutral-600 mb-4">
              正在重新導向到網站列表...
            </Typography>
            <Button
              component={Link}
              to="/dashboard"
              variant="contained"
              className="font-inter normal-case"
              sx={{ textTransform: 'none' }}
            >
              立即查看
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      display: 'flex',
      flexDirection: 'column',
      gap: 3,
      ml: -5  // 往左移動
    }}>
      {/* 頁面標題 */}
      <Box>
        <Box display="flex" alignItems="center" mb={2}>
          <Typography variant="h4" className="font-inter font-bold text-neutral-800">
            新增監控網站
          </Typography>
        </Box>
        <Typography variant="body1" className="text-neutral-600">
          設定新的網站監控項目
        </Typography>
      </Box>

      {error && (
        <Alert severity="error">
          {error}
        </Alert>
      )}

      {/* 主要內容區域 - 響應式布局 */}
      <Box sx={{ 
        display: 'flex', 
        gap: 3,
        flexDirection: { xs: 'column', lg: 'row' }
      }}>
        {/* 左側表單區域 */}
        <Box sx={{ 
          flex: 1, 
          maxWidth: { xs: '100%', lg: '60%' },
          minWidth: 0
        }}>
          {/* 新增表單 */}
      <form onSubmit={handleSubmit}>
        <Card className="bg-white rounded-xl shadow-sm">
          <CardContent className="p-6">
            <Typography variant="h5" className="font-inter font-semibold text-neutral-800 mb-2">
              基本設定
            </Typography>
            <Box mb={4} />
            
            <Box className="space-y-6">
              {/* 網站名稱 */}
              <Box display="flex" alignItems="center" sx={{ 
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { xs: 'flex-start', sm: 'center' },
                gap: { xs: 0, sm: 0 }
              }}>
                <Typography variant="body1" className="font-medium text-neutral-700" sx={{ 
                  minWidth: { xs: 'auto', sm: '100px' },
                  mr: { xs: 0, sm: 2 },
                  width: { xs: '100%', sm: 'auto' }
                }}>
                  網站名稱 *
                </Typography>
                <TextField
                  value={formData.name}
                  onChange={handleChange('name')}
                  placeholder="網站名稱"
                  required
                  helperText="用於識別的網站名稱"
                  sx={{ flex: 1, width: { xs: '100%', sm: 'auto' } }}
                  FormHelperTextProps={{
                    sx: { fontSize: '0.8rem' }
                  }}
                />
              </Box>

              {/* URL */}
              <Box display="flex" sx={{ 
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { xs: 'flex-start', sm: 'flex-start' },
                gap: { xs: 0, sm: 0 }
              }}>
                <Typography variant="body1" className="font-medium text-neutral-700" sx={{ 
                  minWidth: { xs: 'auto', sm: '100px' },
                  mr: { xs: 0, sm: 2 },
                  width: { xs: '100%', sm: 'auto' },
                  mt: { xs: 0, sm: 2 }
                }}>
                  網站 URL *
                </Typography>
                <Box display="flex" gap={2} sx={{ 
                  flex: 1, 
                  width: { xs: '100%', sm: 'auto' },
                  flexDirection: { xs: 'column', sm: 'row' },
                  alignItems: { xs: 'stretch', sm: 'flex-start' }
                }}>
                  <FormControl sx={{ minWidth: { xs: '100%', sm: '100px' } }}>
                    <Select
                      value={formData.protocol}
                      onChange={handleChange('protocol')}
                      displayEmpty
                      size="medium"
                    >
                      <MenuItem value="https">HTTPS</MenuItem>
                      <MenuItem value="http">HTTP</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    value={formData.url}
                    onChange={handleUrlChange}
                    placeholder="example.com"
                    required
                    helperText="請輸入不含協議的網址"
                    sx={{ flex: 1 }}
                    FormHelperTextProps={{
                      sx: { fontSize: '0.8rem' }
                    }}
                  />
                </Box>
              </Box>

              {/* 監控間隔 */}
              <Box display="flex" alignItems="center" sx={{ 
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { xs: 'flex-start', sm: 'center' },
                gap: { xs: 0, sm: 0 }
              }}>
                <Typography variant="body1" className="font-medium text-neutral-700" sx={{ 
                  minWidth: { xs: 'auto', sm: '100px' },
                  mr: { xs: 0, sm: 2 },
                  width: { xs: '100%', sm: 'auto' }
                }}>
                  監控間隔
                </Typography>
                <FormControl sx={{ minWidth: { xs: '100%', sm: '150px' } }}>
                  <Select
                    value={formData.interval}
                    onChange={handleChange('interval')}
                    displayEmpty
                  >
                    {intervalOptions.map(option => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Box>

            <Box mb={6} />
            <Divider />
            <Box mb={4} />

            <Typography variant="h5" className="font-inter font-semibold text-neutral-800 mb-2">
              進階設定
            </Typography>
            <Box mb={4} />

            <Box className="space-y-6">
              {/* 內容關鍵字 */}
              <Box display="flex" alignItems="center" sx={{ 
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { xs: 'flex-start', sm: 'center' },
                gap: { xs: 0, sm: 0 }
              }}>
                <Typography variant="body1" className="font-medium text-neutral-700" sx={{ 
                  minWidth: { xs: 'auto', sm: '100px' },
                  mr: { xs: 0, sm: 2 },
                  width: { xs: '100%', sm: 'auto' }
                }}>
                  內容關鍵字
                </Typography>
                <TextField
                  value={formData.keyword}
                  onChange={handleChange('keyword')}
                  placeholder="關鍵字"
                  helperText="若回應內容包含此關鍵字則視為正常，留空則不檢查"
                  sx={{ flex: 1, width: { xs: '100%', sm: 'auto' } }}
                  FormHelperTextProps={{
                    sx: { fontSize: '0.8rem' }
                  }}
                />
              </Box>

              {/* 狀態碼範圍 */}
              <Box display="flex" alignItems="center" sx={{ 
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { xs: 'flex-start', sm: 'center' },
                gap: { xs: 0, sm: 0 }
              }}>
                <Typography variant="body1" className="font-medium text-neutral-700" sx={{ 
                  minWidth: { xs: 'auto', sm: '100px' },
                  mr: { xs: 0, sm: 2 },
                  width: { xs: '100%', sm: 'auto' }
                }}>
                  狀態碼範圍 *
                </Typography>
                <TextField
                  value={formData.statusCodeRange}
                  onChange={handleChange('statusCodeRange')}
                  helperText="例如：200:299 表示 2xx 狀態碼為正常；多個範圍用逗號分隔：200:299,404"
                  placeholder="200:299"
                  required
                  sx={{ flex: 1, width: { xs: '100%', sm: 'auto' } }}
                  FormHelperTextProps={{
                    sx: { fontSize: '0.8rem' }
                  }}
                />
              </Box>

              {/* 資料留存設定 */}
              <Box display="flex" alignItems="center" sx={{ 
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { xs: 'flex-start', sm: 'center' },
                gap: { xs: 0, sm: 0 }
              }}>
                <Typography variant="body1" className="font-medium text-neutral-700" sx={{ 
                  minWidth: { xs: 'auto', sm: '100px' },
                  mr: { xs: 0, sm: 2 },
                  width: { xs: '100%', sm: 'auto' }
                }}>
                  資料留存期限
                </Typography>
                <Box sx={{ flex: 1, width: { xs: '100%', sm: 'auto' } }}>
                  <FormControl sx={{ minWidth: { xs: '100%', sm: '200px' } }}>
                    <Select
                      value={formData.dataRetention}
                      onChange={handleChange('dataRetention')}
                      displayEmpty
                    >
                      <MenuItem value="3months">3個月</MenuItem>
                      <MenuItem value="6months">6個月 (建議)</MenuItem>
                      <MenuItem value="1year">1年</MenuItem>
                      <MenuItem value="2years">2年</MenuItem>
                    </Select>
                    <FormHelperText sx={{ fontSize: '0.8rem' }}>
                      監控資料將依此期限自動清理
                    </FormHelperText>
                  </FormControl>
                </Box>
              </Box>
            </Box>

            {/* 提交按鈕 */}
            <Box display="flex" gap={2} justifyContent="flex-end" className="mt-6" sx={{
              flexDirection: { xs: 'column-reverse', sm: 'row' },
              gap: { xs: 2, sm: 2 }
            }}>
              <Button
                component={Link}
                to="/dashboard"
                variant="outlined"
                className="font-inter normal-case px-6"
                sx={{ textTransform: 'none' }}
                fullWidth={{ xs: true, sm: false }}
              >
                取消
              </Button>
              <Button
                type="submit"
                variant="contained"
                startIcon={<Add />}
                loading={loading}
                disabled={loading}
                className="font-inter normal-case px-6 bg-blue-600 hover:bg-blue-700"
                sx={{ textTransform: 'none' }}
                fullWidth={{ xs: true, sm: false }}
              >
                {loading ? '新增中...' : '新增網站'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </form>
        </Box>

        {/* 右側預覽區域 - 響應式設計 */}
        <Box sx={{ 
          width: { xs: '100%', lg: '400px' },
          minWidth: { xs: 'auto', lg: '400px' },
          maxWidth: { xs: '100%', lg: '400px' }
        }}>
          <Card className="bg-white rounded-xl shadow-sm" sx={{ 
            position: { xs: 'static', lg: 'sticky' },
            top: { xs: 'auto', lg: 20 }
          }}>
            <CardContent className="p-6">
              <Typography variant="h6" className="font-inter font-semibold text-neutral-800 mb-3">
                設定預覽
              </Typography>
              <Paper className="bg-neutral-50 p-4 rounded-lg">
                <Box className="space-y-2">
                  <Box display="flex" alignItems="center" gap={2}>
                    <Typography variant="body2" className="text-neutral-600 min-w-20 text-sm">
                      網站：
                    </Typography>
                    <Typography variant="body2" className="font-medium text-sm">
                      {formData.name || '未設定'}
                    </Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Typography variant="body2" className="text-neutral-600 min-w-20 text-sm">
                      URL：
                    </Typography>
                    <Typography variant="body2" className="font-medium text-blue-600 text-sm break-all">
                      {getFullUrl() || '未設定'}
                    </Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Typography variant="body2" className="text-neutral-600 min-w-20 text-sm">
                      間隔：
                    </Typography>
                    <Chip 
                      label={`每 ${formData.interval} 秒`} 
                      size="small" 
                      color="primary" 
                      variant="outlined"
                      sx={{ fontSize: '0.8rem', height: 24 }}
                    />
                  </Box>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Typography variant="body2" className="text-neutral-600 min-w-20 text-sm">
                      狀態碼：
                    </Typography>
                    <Chip 
                      label={formData.statusCodeRange} 
                      size="small" 
                      color="success" 
                      variant="outlined"
                      sx={{ fontSize: '0.8rem', height: 24 }}
                    />
                  </Box>
                  {formData.keyword && (
                    <Box display="flex" alignItems="center" gap={2}>
                      <Typography variant="body2" className="text-neutral-600 min-w-20 text-sm">
                        關鍵字：
                      </Typography>
                      <Chip 
                        label={formData.keyword} 
                        size="small" 
                        color="info" 
                        variant="outlined"
                        sx={{ fontSize: '0.8rem', height: 24 }}
                      />
                    </Box>
                  )}
                  <Box display="flex" alignItems="center" gap={2}>
                    <Typography variant="body2" className="text-neutral-600 min-w-20 text-sm">
                      資料留存：
                    </Typography>
                    <Chip 
                      label={
                        formData.dataRetention === '3months' ? '3個月' :
                        formData.dataRetention === '6months' ? '6個月' :
                        formData.dataRetention === '1year' ? '1年' :
                        formData.dataRetention === '2years' ? '2年' : formData.dataRetention
                      } 
                      size="small" 
                      color="warning" 
                      variant="outlined"
                      sx={{ fontSize: '0.8rem', height: 24 }}
                    />
                  </Box>
                </Box>
              </Paper>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
};

export default AddWebsite;