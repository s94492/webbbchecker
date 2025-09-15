import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 請求攔截器
api.interceptors.request.use(
  (config) => {
    console.log('API 請求:', config.method.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('API 請求錯誤:', error);
    return Promise.reject(error);
  }
);

// 回應攔截器
api.interceptors.response.use(
  (response) => {
    console.log('API 回應:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('API 回應錯誤:', error.response || error.message);
    return Promise.reject(error);
  }
);

// 網站 API
export const websitesApi = {
  // 取得所有網站
  getAll: () => api.get('/websites'),
  
  // 取得單一網站
  getById: (id) => api.get(`/websites/${id}`),
  
  // 新增網站
  create: (data) => api.post('/websites', data),
  
  // 更新網站
  update: (id, data) => api.put(`/websites/${id}`, data),
  
  // 刪除網站
  delete: (id) => api.delete(`/websites/${id}`),
  
  // 暫停監控
  pause: (id) => api.post(`/websites/${id}/pause`),
  
  // 恢復監控
  resume: (id) => api.post(`/websites/${id}/resume`),
  
  // 取得統計資料
  getStats: () => api.get('/websites/stats/overview'),
};

// 監控指標 API
export const metricsApi = {
  // 取得網站監控指標
  getMetrics: (websiteId, range = '1h') => 
    api.get(`/metrics/${websiteId}`, { params: { range } }),
  
  // 取得最新監控指標
  getLatest: (websiteId) => api.get(`/metrics/${websiteId}/latest`),
  
  // 取得統計資料
  getStats: (websiteId, range = '24h') => 
    api.get(`/metrics/${websiteId}/stats`, { params: { range } }),
  
  // 取得異常事件
  getEvents: (websiteId, range = '24h') => 
    api.get(`/metrics/${websiteId}/events`, { params: { range } }),
};

// 告警設定 API
export const settingsApi = {
  // 取得告警設定
  getAlertSettings: () => api.get('/alerts/settings'),
  
  // 更新告警設定
  updateAlertSettings: (data) => api.put('/alerts/settings', data),
  
  // 測試 Email 連線
  testAlertConnection: (type) => api.post(`/alerts/test/${type}`),
  
  // 發送測試告警
  sendTestAlert: () => api.post('/alerts/test/send'),
};

// 系統 API
export const systemApi = {
  // 健康檢查
  health: () => api.get('/health'),
};

// 報表 API
export const reportsApi = {
  // 下載單一網站的 PDF 報表
  downloadPDF: (websiteId, range = '24h') => {
    return api.get(`/reports/${websiteId}/pdf`, { 
      params: { range },
      responseType: 'blob'
    });
  },
  
  // 下載單一網站的 CSV 報表
  downloadCSV: (websiteId, range = '24h') => {
    return api.get(`/reports/${websiteId}/csv`, { 
      params: { range },
      responseType: 'blob'
    });
  },
  
  // 預覽報表數據
  preview: (websiteId, range = '24h') => 
    api.get(`/reports/${websiteId}/preview`, { params: { range } }),
  
  // 下載綜合 PDF 報表
  downloadComprehensivePDF: (params = {}) => {
    return api.get('/reports/pdf/comprehensive', { 
      params,
      responseType: 'blob'
    });
  },
  
  // 取得報表選項
  getOptions: () => api.get('/reports/options'),
};

export default api;