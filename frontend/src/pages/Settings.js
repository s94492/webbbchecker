import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Alert,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  ListItemButton,
  ListItemIcon,
  Divider,
  Snackbar,
  CircularProgress,
  Paper
} from '@mui/material';
import {
  Email,
  Chat,
  Science,
  Save,
  Delete,
  Add,
  Notifications,
  SmartToy,
  Visibility,
  VisibilityOff,
  Settings as SettingsIcon,
  TrendingUp,
  NotificationsActive,
  CloudUpload,
  BusinessCenter
} from '@mui/icons-material';
import { settingsApi, metricsApi } from '../services/api';
import StackedAreaChart from '../components/StackedAreaChart';

const Settings = () => {
  const [selectedCategory, setSelectedCategory] = useState('alerts');
  const [selectedOption, setSelectedOption] = useState('email');
  const [settings, setSettings] = useState({
    email: {
      enabled: false,
      smtp: {
        host: '',
        port: 587,
        secure: false,
        auth: {
          user: '',
          pass: ''
        }
      },
      from: '',
      to: []
    },
    slack: {
      enabled: false,
      botToken: '',
      channel: '#alerts',
      username: 'Website Monitor'
    },
    openai: {
      enabled: false,
      apiKey: '',
      model: 'gpt-3.5-turbo',
      temperature: 0.3,
      maxTokens: 500
    }
  });
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '', open: false });
  const [newEmail, setNewEmail] = useState('');
  const [testLoading, setTestLoading] = useState({ email: false, slack: false, openai: false });
  const [showApiKey, setShowApiKey] = useState(false);
  const [aiStatus, setAiStatus] = useState({ configured: false, model: 'unavailable', status: 'loading' });
  const [chartData, setChartData] = useState([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [logo, setLogo] = useState({ file: null, preview: null, uploaded: null });

  // 三層式導航配置
  const navigationConfig = {
    alerts: {
      label: '告警設定',
      icon: <NotificationsActive />,
      options: {
        email: { label: 'Email 告警', icon: <Email />, component: 'renderEmailSettings' },
        slack: { label: 'Slack 告警', icon: <Chat />, component: 'renderSlackSettings' }
      }
    },
    ai: {
      label: 'AI 智能',
      icon: <SmartToy />,
      options: {
        openai: { label: 'OpenAI 設定', icon: <Science />, component: 'renderOpenAiSettings' }
      }
    },
    branding: {
      label: '品牌設定',
      icon: <BusinessCenter />,
      options: {
        logo: { label: 'Logo 設定', icon: <CloudUpload />, component: 'renderLogoSettings' }
      }
    },
    system: {
      label: '系統監控',
      icon: <TrendingUp />,
      options: {
        status: { label: '服務狀態', icon: <SettingsIcon />, component: 'renderSystemStatus' },
        chart: { label: '效能圖表', icon: <TrendingUp />, component: 'renderPerformanceChart' }
      }
    }
  };

  // 確保選中的選項存在於當前分類中
  useEffect(() => {
    const currentCategoryOptions = navigationConfig[selectedCategory]?.options || {};
    if (!currentCategoryOptions[selectedOption]) {
      const firstOption = Object.keys(currentCategoryOptions)[0];
      if (firstOption) {
        setSelectedOption(firstOption);
      }
    }
  }, [selectedCategory, selectedOption, navigationConfig]);

  useEffect(() => {
    const initializeData = async () => {
      await loadSettings();
      await loadChartData();
      await loadAiStatus();
      await loadLogoSettings();
    };
    initializeData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadChartData = async () => {
    setChartLoading(true);
    try {
      // 先獲取所有網站，使用第一個網站的數據
      const websitesResponse = await fetch('/api/websites');
      const websitesData = await websitesResponse.json();
      
      if (websitesData.success && websitesData.data.length > 0) {
        const firstWebsiteId = websitesData.data[0].id;
        const response = await metricsApi.getMetrics(firstWebsiteId, '24h');
        
        if (response.data && response.data.data) {
          const formattedData = response.data.data.map(metric => ({
            time: new Date(metric.time).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
            fullTime: new Date(metric.time).toLocaleString('zh-TW'),
            responseTime: metric.responseTime,
            dnsTime: metric.dnsTime || 0,
            connectTime: metric.connectTime || 0,
            sslHandshakeTime: metric.sslHandshakeTime || 0,
            timeToFirstByte: metric.timeToFirstByte || 0,
            downloadTime: metric.downloadTime || 0,
            isHealthy: metric.isHealthy
          }));
          setChartData(formattedData);
        } else {
          throw new Error('No metrics data available');
        }
      } else {
        throw new Error('No websites available');
      }
    } catch (error) {
      console.warn('載入圖表數據失敗:', error);
      // 使用模擬數據
      const mockData = generateMockChartData();
      setChartData(mockData);
    } finally {
      setChartLoading(false);
    }
  };

  const generateMockChartData = () => {
    const data = [];
    const now = new Date();
    for (let i = 23; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60 * 60 * 1000);
      data.push({
        time: time.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
        fullTime: time.toLocaleString('zh-TW'),
        responseTime: 200 + Math.random() * 800,
        dnsTime: 10 + Math.random() * 50,
        connectTime: 20 + Math.random() * 100,
        sslHandshakeTime: 30 + Math.random() * 80,
        timeToFirstByte: 100 + Math.random() * 300,
        downloadTime: 50 + Math.random() * 200,
        isHealthy: Math.random() > 0.1
      });
    }
    return data;
  };

  const loadSettings = async () => {
    try {
      const response = await settingsApi.getAlertSettings();
      if (response.data && response.data.success) {
        setSettings(response.data.data);
      } else {
        showMessage('error', '載入設定失敗: ' + (response.data?.error || '未知錯誤'));
      }
    } catch (error) {
      console.error('載入設定錯誤:', error);
      showMessage('error', '載入設定失敗: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await settingsApi.updateAlertSettings(settings);
      // axios 回應格式為 response.data
      if (response.data && response.data.success) {
        showMessage('success', '設定已儲存');
      } else {
        showMessage('error', '儲存失敗: ' + (response.data?.error || '未知錯誤'));
      }
    } catch (error) {
      console.error('儲存設定錯誤:', error);
      showMessage('error', '儲存失敗: ' + (error.response?.data?.error || error.message));
    }
    setLoading(false);
  };

  const handleTest = async (type) => {
    setTestLoading({ ...testLoading, [type]: true });
    try {
      const response = await settingsApi.testAlertConnection(type);
      if (response.data && response.data.success) {
        showMessage('success', `${type === 'email' ? 'Email' : 'Slack'} 測試成功`);
      } else {
        showMessage('error', `測試失敗: ${response.data?.error || '未知錯誤'}`);
      }
    } catch (error) {
      console.error('測試連線錯誤:', error);
      showMessage('error', `測試失敗: ${error.response?.data?.error || error.message}`);
    }
    setTestLoading({ ...testLoading, [type]: false });
  };

  const handleSendTestAlert = async () => {
    try {
      const response = await settingsApi.sendTestAlert();
      if (response.data && response.data.success) {
        showMessage('success', '測試告警已發送');
      } else {
        showMessage('error', '發送測試告警失敗: ' + (response.data?.error || '未知錯誤'));
      }
    } catch (error) {
      console.error('發送測試告警錯誤:', error);
      showMessage('error', '發送測試告警失敗: ' + (error.response?.data?.error || error.message));
    }
  };

  // AI 相關功能
  const loadAiStatus = async () => {
    try {
      const response = await fetch('/api/ai/status');
      const data = await response.json();
      setAiStatus(data);
      
      // 同時載入 AI 設定
      await loadAiSettings();
    } catch (error) {
      console.error('載入 AI 狀態失敗:', error);
      setAiStatus({ configured: false, model: 'unavailable', status: 'error' });
    }
  };

  const loadAiSettings = async () => {
    try {
      const response = await fetch('/api/ai/settings');
      const data = await response.json();
      
      if (data.success && data.settings) {
        setSettings(prev => {
          // 如果載入的 API Key 是遮蔽版本（sk-...xxxx），不要覆蓋現有的完整版本
          const newSettings = { ...data.settings };
          if (newSettings.apiKey && newSettings.apiKey.startsWith('sk-...') && prev.openai?.apiKey && !prev.openai.apiKey.startsWith('sk-...')) {
            // 保持現有的完整 API Key，不被遮蔽版本覆蓋
            newSettings.apiKey = prev.openai.apiKey;
          }
          
          return {
            ...prev,
            openai: { ...prev.openai, ...newSettings }
          };
        });
      }
    } catch (error) {
      console.error('載入 AI 設定失敗:', error);
    }
  };

  const loadLogoSettings = async () => {
    try {
      const response = await fetch('/api/settings/logo');
      const data = await response.json();
      
      if (data.success && data.logo && data.logo.path) {
        setLogo(prev => ({
          ...prev,
          uploaded: data.logo.path
        }));
      }
    } catch (error) {
      console.error('載入 Logo 設定失敗:', error);
    }
  };

  const handleTestAi = async () => {
    setTestLoading({ ...testLoading, openai: true });
    try {
      const response = await fetch('/api/ai/test-analysis', { method: 'POST' });
      const data = await response.json();
      
      if (data.success) {
        showMessage('success', `AI 分析測試成功 (${data.analysis?.source === 'gpt' ? 'GPT' : '規則引擎'})`);
      } else {
        showMessage('error', `AI 測試失敗: ${data.error || '未知錯誤'}`);
      }
    } catch (error) {
      console.error('AI 測試錯誤:', error);
      showMessage('error', `AI 測試失敗: ${error.message}`);
    }
    setTestLoading({ ...testLoading, openai: false });
  };

  const handleSaveAiSettings = async () => {
    try {
      const openaiSettings = settings.openai || {
        enabled: false,
        apiKey: '',
        model: 'gpt-3.5-turbo',
        temperature: 0.3,
        maxTokens: 500
      };
      
      // 準備要儲存的設定
      const settingsToSave = { ...openaiSettings };
      
      // 如果 API Key 是遮蔽版本（sk-...xxxx），從儲存資料中移除，讓後端保持原有的 Key
      if (settingsToSave.apiKey && settingsToSave.apiKey.startsWith('sk-...')) {
        console.log('檢測到遮蔽版本 API Key，保持後端原有設定');
        delete settingsToSave.apiKey; // 不要儲存遮蔽版本
      }
      
      const response = await fetch('/api/ai/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsToSave)
      });
      
      const data = await response.json();
      if (data.success) {
        showMessage('success', 'OpenAI 設定已儲存');
        await loadAiStatus(); // 重新載入狀態
      } else {
        showMessage('error', `儲存失敗: ${data.error || '未知錯誤'}`);
      }
    } catch (error) {
      console.error('儲存 AI 設定錯誤:', error);
      showMessage('error', `儲存失敗: ${error.message}`);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text, open: true });
  };

  const handleCloseMessage = () => {
    setMessage({ ...message, open: false });
  };

  const addEmail = () => {
    if (newEmail && newEmail.includes('@')) {
      setSettings({
        ...settings,
        email: {
          ...settings.email,
          to: [...settings.email.to, newEmail]
        }
      });
      setNewEmail('');
    }
  };

  const removeEmail = (index) => {
    const newEmails = settings.email.to.filter((_, i) => i !== index);
    setSettings({
      ...settings,
      email: {
        ...settings.email,
        to: newEmails
      }
    });
  };

  const renderEmailSettings = () => (
    <Box>
      <FormControlLabel
        control={
          <Switch
            checked={settings.email.enabled}
            onChange={(e) => setSettings({
              ...settings,
              email: { ...settings.email, enabled: e.target.checked }
            })}
          />
        }
        label="啟用 Email 告警"
        sx={{ mb: 3 }}
      />

      {settings.email.enabled && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Typography variant="h6" className="font-inter font-semibold">
            SMTP 設定
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="SMTP 主機"
              value={settings.email.smtp.host}
              onChange={(e) => setSettings({
                ...settings,
                email: {
                  ...settings.email,
                  smtp: { ...settings.email.smtp, host: e.target.value }
                }
              })}
              sx={{ flex: 2 }}
            />
            <TextField
              label="連接埠"
              type="number"
              value={settings.email.smtp.port}
              onChange={(e) => setSettings({
                ...settings,
                email: {
                  ...settings.email,
                  smtp: { ...settings.email.smtp, port: parseInt(e.target.value) }
                }
              })}
              sx={{ flex: 1 }}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="使用者名稱"
              value={settings.email.smtp.auth.user}
              onChange={(e) => setSettings({
                ...settings,
                email: {
                  ...settings.email,
                  smtp: {
                    ...settings.email.smtp,
                    auth: { ...settings.email.smtp.auth, user: e.target.value }
                  }
                }
              })}
              sx={{ flex: 1 }}
            />
            <TextField
              label="密碼"
              type="password"
              value={settings.email.smtp.auth.pass}
              onChange={(e) => setSettings({
                ...settings,
                email: {
                  ...settings.email,
                  smtp: {
                    ...settings.email.smtp,
                    auth: { ...settings.email.smtp.auth, pass: e.target.value }
                  }
                }
              })}
              sx={{ flex: 1 }}
            />
          </Box>

          <TextField
            label="寄件者 Email"
            value={settings.email.from}
            onChange={(e) => setSettings({
              ...settings,
              email: { ...settings.email, from: e.target.value }
            })}
            fullWidth
          />

          <FormControlLabel
            control={
              <Switch
                checked={settings.email.smtp.secure}
                onChange={(e) => setSettings({
                  ...settings,
                  email: {
                    ...settings.email,
                    smtp: { ...settings.email.smtp, secure: e.target.checked }
                  }
                })}
              />
            }
            label="使用 SSL/TLS"
          />

          <Divider />

          <Typography variant="h6" className="font-inter font-semibold">
            收件者清單
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
            <TextField
              label="新增 Email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addEmail()}
              sx={{ flex: 1 }}
            />
            <Button
              variant="outlined"
              startIcon={<Add />}
              onClick={addEmail}
              disabled={!newEmail || !newEmail.includes('@')}
            >
              新增
            </Button>
          </Box>

          {settings.email.to.length > 0 && (
            <List sx={{ bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
              {settings.email.to.map((email, index) => (
                <ListItem key={index}>
                  <ListItemText primary={email} />
                  <ListItemSecondaryAction>
                    <IconButton edge="end" onClick={() => removeEmail(index)}>
                      <Delete />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}

          <Button
            variant="outlined"
            startIcon={testLoading.email ? <CircularProgress size={16} /> : <Science />}
            onClick={() => handleTest('email')}
            disabled={testLoading.email}
            sx={{ alignSelf: 'flex-start' }}
          >
            {testLoading.email ? '測試中...' : '測試 Email 連線'}
          </Button>
        </Box>
      )}
    </Box>
  );

  const renderSlackSettings = () => (
    <Box>
      <FormControlLabel
        control={
          <Switch
            checked={settings.slack.enabled}
            onChange={(e) => setSettings({
              ...settings,
              slack: { ...settings.slack, enabled: e.target.checked }
            })}
          />
        }
        label="啟用 Slack 告警"
        sx={{ mb: 3 }}
      />

      {settings.slack.enabled && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Alert severity="info">
            請在 Slack 中建立 Bot 應用程式，並將 Bot User OAuth Token 貼到下方欄位中。Bot 需要 chat:write 權限。
          </Alert>

          <TextField
            label="Bot User OAuth Token"
            type="password"
            value={settings.slack.botToken}
            onChange={(e) => setSettings({
              ...settings,
              slack: { ...settings.slack, botToken: e.target.value }
            })}
            fullWidth
            placeholder="xoxb-..."
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="頻道"
              value={settings.slack.channel}
              onChange={(e) => setSettings({
                ...settings,
                slack: { ...settings.slack, channel: e.target.value }
              })}
              sx={{ flex: 1 }}
              placeholder="#alerts"
            />
            <TextField
              label="使用者名稱"
              value={settings.slack.username}
              onChange={(e) => setSettings({
                ...settings,
                slack: { ...settings.slack, username: e.target.value }
              })}
              sx={{ flex: 1 }}
              placeholder="Website Monitor"
            />
          </Box>

          <Button
            variant="outlined"
            startIcon={testLoading.slack ? <CircularProgress size={16} /> : <Science />}
            onClick={() => handleTest('slack')}
            disabled={testLoading.slack}
            sx={{ alignSelf: 'flex-start' }}
          >
            {testLoading.slack ? '測試中...' : '測試 Slack 連線'}
          </Button>
        </Box>
      )}
    </Box>
  );

  // OpenAI 設定渲染
  // 系統狀態渲染函數
  const renderSystemStatus = () => {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Typography variant="h5" className="font-inter font-bold">
          服務狀態監控
        </Typography>
        
        <Card>
          <CardContent>
            <Typography variant="h6" className="font-inter font-semibold mb-4">
              告警服務狀態
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Chip
                icon={<Email />}
                label={`Email: ${settings.email.enabled ? '已啟用' : '已停用'}`}
                color={settings.email.enabled ? 'success' : 'default'}
                variant="outlined"
              />
              <Chip
                icon={<Chat />}
                label={`Slack: ${settings.slack.enabled ? '已啟用' : '已停用'}`}
                color={settings.slack.enabled ? 'success' : 'default'}
                variant="outlined"
              />
              <Chip
                icon={<SmartToy />}
                label={`AI 分析: ${settings.openai?.enabled ? (aiStatus.configured ? 'GPT' : '規則引擎') : '已停用'}`}
                color={settings.openai?.enabled ? (aiStatus.configured ? 'primary' : 'warning') : 'default'}
                variant="outlined"
              />
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" className="font-inter font-semibold mb-4">
              快速操作
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                startIcon={<Notifications />}
                onClick={handleSendTestAlert}
                sx={{ textTransform: 'none' }}
              >
                發送測試告警
              </Button>
              
              <Button
                variant="contained"
                startIcon={loading ? <CircularProgress size={16} /> : <Save />}
                onClick={handleSave}
                disabled={loading}
                sx={{ textTransform: 'none' }}
              >
                {loading ? '儲存中...' : '儲存設定'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  };

  // 效能圖表渲染函數
  const renderPerformanceChart = () => {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Typography variant="h5" className="font-inter font-bold">
          效能監控圖表
        </Typography>
        
        <Card>
          <CardContent>
            <Typography variant="h6" className="font-inter font-semibold mb-4">
              24小時效能趋勢
            </Typography>
            
            {chartLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
                <CircularProgress />
              </Box>
            ) : chartData.length > 0 ? (
              <Box sx={{ height: 400 }}>
                <StackedAreaChart data={chartData} />
              </Box>
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
                <Typography variant="body1" color="text.secondary">
                  無效能數據可顯示
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>
    );
  };

  const renderOpenAiSettings = () => {
    // 安全取得 openai 設定，提供預設值
    const openaiSettings = settings.openai || {
      enabled: false,
      apiKey: '',
      model: 'gpt-3.5-turbo',
      temperature: 0.3,
      maxTokens: 500
    };

    return (
      <Box>
        <FormControlLabel
          control={
            <Switch
              checked={openaiSettings.enabled}
              onChange={(e) => setSettings({
                ...settings,
                openai: { ...openaiSettings, enabled: e.target.checked }
              })}
            />
          }
          label="啟用 OpenAI GPT 智能分析"
          sx={{ mb: 3 }}
        />

        {openaiSettings.enabled && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Alert severity="info">
            啟用 OpenAI GPT 後，PDF 報表將使用真正的 AI 進行智能分析。需要有效的 OpenAI API Key。
            沒有 API Key 時將自動使用規則引擎作為回退方案。
          </Alert>

          <TextField
            label="OpenAI API Key"
            type={showApiKey ? "text" : "password"}
            value={openaiSettings.apiKey}
            onChange={(e) => setSettings({
              ...settings,
              openai: { ...openaiSettings, apiKey: e.target.value }
            })}
            fullWidth
            placeholder="sk-..."
            InputProps={{
              endAdornment: (
                <IconButton
                  aria-label="toggle password visibility"
                  onClick={() => setShowApiKey(!showApiKey)}
                  edge="end"
                >
                  {showApiKey ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              ),
            }}
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="GPT 模型"
              select
              value={openaiSettings.model}
              onChange={(e) => setSettings({
                ...settings,
                openai: { ...openaiSettings, model: e.target.value }
              })}
              sx={{ flex: 1 }}
              SelectProps={{ native: true }}
            >
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo (推薦)</option>
              <option value="gpt-4">GPT-4 (更精確但較貴)</option>
              <option value="gpt-4-turbo">GPT-4 Turbo</option>
              <option value="gpt-4o-mini">GPT-4o Mini (高效能)</option>
            </TextField>
            
            <TextField
              label="創意度 (Temperature)"
              type="number"
              value={openaiSettings.temperature}
              onChange={(e) => setSettings({
                ...settings,
                openai: { ...openaiSettings, temperature: parseFloat(e.target.value) }
              })}
              sx={{ flex: 1 }}
              inputProps={{ min: 0, max: 1, step: 0.1 }}
              helperText="0 = 保守, 1 = 創意"
            />
            
            <TextField
              label="最大 Token 數"
              type="number"
              value={openaiSettings.maxTokens}
              onChange={(e) => setSettings({
                ...settings,
                openai: { ...openaiSettings, maxTokens: parseInt(e.target.value) }
              })}
              sx={{ flex: 1 }}
              inputProps={{ min: 100, max: 2000, step: 50 }}
              helperText="影響分析詳細度"
            />
          </Box>

          {/* AI 狀態顯示 */}
          <Box sx={{ 
            p: 2, 
            bgcolor: aiStatus.configured ? '#e8f5e8' : '#fff3e0', 
            borderRadius: 1,
            border: 1,
            borderColor: aiStatus.configured ? '#4caf50' : '#ff9800'
          }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              🤖 AI 服務狀態
            </Typography>
            <Typography variant="body2" color="text.secondary">
              模型: {aiStatus.model} | 狀態: {aiStatus.configured ? '已配置' : '需要 API Key'} | 
              回退: {aiStatus.fallbackEnabled ? '啟用' : '停用'}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={testLoading.openai ? <CircularProgress size={16} /> : <Science />}
              onClick={handleTestAi}
              disabled={testLoading.openai}
            >
              {testLoading.openai ? '測試中...' : '測試 AI 分析'}
            </Button>
            
            <Button
              variant="contained"
              startIcon={<Save />}
              onClick={handleSaveAiSettings}
              sx={{ textTransform: 'none' }}
            >
              儲存 AI 設定
            </Button>
          </Box>
        </Box>
      )}
    </Box>
    );
  };

  // Logo 設定處理函數
  const handleLogoUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      // 檢查檔案格式
      if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
        setMessage({ 
          type: 'error', 
          text: '僅支持 PNG、JPG 格式的圖片', 
          open: true 
        });
        return;
      }
      
      // 檢查檔案大小 (2MB限制)
      if (file.size > 2 * 1024 * 1024) {
        setMessage({ 
          type: 'error', 
          text: '圖片大小不能超過 2MB', 
          open: true 
        });
        return;
      }

      // 創建預覽
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogo(prev => ({
          ...prev,
          file: file,
          preview: e.target.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoSave = async () => {
    if (!logo.file) {
      setMessage({ 
        type: 'error', 
        text: '請先選擇要上傳的Logo', 
        open: true 
      });
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('logo', logo.file);
      
      const response = await fetch('/api/settings/logo', {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        const result = await response.json();
        setLogo(prev => ({
          ...prev,
          uploaded: result.logoPath,
          file: null,
          preview: null
        }));
        await loadLogoSettings(); // 重新載入logo設定
        setMessage({ 
          type: 'success', 
          text: 'Logo 上傳成功！', 
          open: true 
        });
      } else {
        throw new Error('上傳失敗');
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'Logo 上傳失敗：' + error.message, 
        open: true 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogoDelete = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/settings/logo', {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setLogo({ file: null, preview: null, uploaded: null });
        await loadLogoSettings(); // 重新載入logo設定
        setMessage({ 
          type: 'success', 
          text: 'Logo 已刪除', 
          open: true 
        });
      } else {
        throw new Error('刪除失敗');
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'Logo 刪除失敗：' + error.message, 
        open: true 
      });
    } finally {
      setLoading(false);
    }
  };

  // 渲染 Logo 設定
  const renderLogoSettings = () => {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Logo 設定
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          上傳的Logo會顯示在PDF報表的左上角。支持PNG、JPG格式，建議大小不超過2MB。
        </Typography>

        <Card sx={{ p: 3 }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>
              當前Logo
            </Typography>
            
            <Box sx={{
              border: '2px dashed #ccc',
              borderRadius: 2,
              p: 3,
              textAlign: 'center',
              minHeight: 200,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {logo.preview || logo.uploaded ? (
                <Box sx={{ textAlign: 'center' }}>
                  <img 
                    src={logo.preview || logo.uploaded} 
                    alt="Logo預覽" 
                    style={{ 
                      maxWidth: '200px', 
                      maxHeight: '100px', 
                      objectFit: 'contain'
                    }}
                  />
                  <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                    {logo.file ? `新上傳：${logo.file.name}` : '目前設定的 Logo'}
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ textAlign: 'center', color: 'text.secondary' }}>
                  <CloudUpload sx={{ fontSize: 48, mb: 2 }} />
                  <Typography>尚未上傳Logo</Typography>
                </Box>
              )}
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Button
              variant="contained"
              component="label"
              startIcon={<CloudUpload />}
              sx={{ textTransform: 'none' }}
            >
              選擇Logo
              <input
                type="file"
                hidden
                accept="image/png,image/jpeg,image/jpg"
                onChange={handleLogoUpload}
              />
            </Button>

            {logo.file && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<Save />}
                onClick={handleLogoSave}
                disabled={loading}
                sx={{ textTransform: 'none' }}
              >
                {loading ? '上傳中...' : '儲存Logo'}
              </Button>
            )}

            {(logo.uploaded || logo.preview) && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<Delete />}
                onClick={handleLogoDelete}
                disabled={loading}
                sx={{ textTransform: 'none' }}
              >
                刪除Logo
              </Button>
            )}
          </Box>

          <Alert severity="info" sx={{ mt: 2 }}>
            建議Logo尺寸：寬度120px，高度60px。系統會自動調整大小以適應PDF版面。
          </Alert>
        </Card>
      </Box>
    );
  };

  // 渲染當前選中的設定內容
  const renderCurrentSettings = () => {
    const currentOption = navigationConfig[selectedCategory]?.options[selectedOption];
    if (!currentOption) return null;

    switch (currentOption.component) {
      case 'renderEmailSettings':
        return renderEmailSettings();
      case 'renderSlackSettings':
        return renderSlackSettings();
      case 'renderOpenAiSettings':
        return renderOpenAiSettings();
      case 'renderLogoSettings':
        return renderLogoSettings();
      case 'renderSystemStatus':
        return renderSystemStatus();
      case 'renderPerformanceChart':
        return renderPerformanceChart();
      default:
        return null;
    }
  };

  return (
    <Box sx={{
      display: 'flex',
      height: '100vh',
      ml: -5,
      backgroundColor: '#f5f5f5'
    }}>
      {/* 左側導航欄 */}
      <Paper sx={{
        width: 280,
        height: '100%',
        borderRadius: 0,
        borderRight: '1px solid #e0e0e0',
        backgroundColor: '#fafafa'
      }}>
        <Box sx={{ p: 3 }}>
          <Typography variant="h5" className="font-inter font-bold text-neutral-800 mb-1">
            系統設定
          </Typography>
          <Typography variant="body2" className="text-neutral-600 mb-4">
            配置系統參數和服務
          </Typography>
        </Box>
        
        <List sx={{ px: 2 }}>
          {Object.entries(navigationConfig).map(([categoryKey, category]) => (
            <ListItem key={categoryKey} sx={{ px: 0, py: 0.5 }}>
              <ListItemButton
                selected={selectedCategory === categoryKey}
                onClick={() => setSelectedCategory(categoryKey)}
                sx={{
                  borderRadius: 2,
                  '&.Mui-selected': {
                    backgroundColor: 'primary.main',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: 'primary.dark'
                    }
                  }
                }}
              >
                <ListItemIcon sx={{
                  color: selectedCategory === categoryKey ? 'white' : 'text.secondary'
                }}>
                  {category.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={category.label}
                  primaryTypographyProps={{
                    fontSize: '0.95rem',
                    fontWeight: selectedCategory === categoryKey ? 600 : 400
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Paper>

      {/* 中間選項區域 */}
      <Paper sx={{
        width: 320,
        height: '100%',
        borderRadius: 0,
        borderRight: '1px solid #e0e0e0'
      }}>
        <Box sx={{ p: 3, borderBottom: '1px solid #e0e0e0' }}>
          <Typography variant="h6" className="font-inter font-semibold">
            {navigationConfig[selectedCategory]?.label}
          </Typography>
        </Box>
        
        <List sx={{ px: 2, py: 1 }}>
          {Object.entries(navigationConfig[selectedCategory]?.options || {}).map(([optionKey, option]) => (
            <ListItem key={optionKey} sx={{ px: 0, py: 0.5 }}>
              <ListItemButton
                selected={selectedOption === optionKey}
                onClick={() => setSelectedOption(optionKey)}
                sx={{
                  borderRadius: 2,
                  '&.Mui-selected': {
                    backgroundColor: 'primary.light',
                    color: 'primary.main',
                    '&:hover': {
                      backgroundColor: 'primary.light'
                    }
                  }
                }}
              >
                <ListItemIcon sx={{
                  color: selectedOption === optionKey ? 'primary.main' : 'text.secondary'
                }}>
                  {option.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={option.label}
                  primaryTypographyProps={{
                    fontSize: '0.9rem',
                    fontWeight: selectedOption === optionKey ? 500 : 400
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Paper>

      {/* 右側設定面板 */}
      <Box sx={{
        flex: 1,
        height: '100%',
        overflow: 'auto',
        backgroundColor: 'white'
      }}>
        <Box sx={{ p: 4 }}>
          {renderCurrentSettings()}
        </Box>
      </Box>

      {/* Snackbar for messages */}
      <Snackbar
        open={message.open}
        autoHideDuration={6000}
        onClose={() => setMessage({ ...message, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setMessage({ ...message, open: false })} 
          severity={message.type}
          sx={{ width: '100%' }}
        >
          {message.text}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Settings;