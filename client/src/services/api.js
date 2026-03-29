import axios from 'axios';

const API_BASE_URL = '/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  signup: (userData) => api.post('/auth/signup', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  getMe: () => api.get('/auth/me'),
  getCountries: () => api.get('/auth/countries'),
};

// Users API (Admin)
export const usersAPI = {
  getUsers: () => api.get('/users'),
  getManagers: () => api.get('/users/managers'),
  createUser: (userData) => api.post('/users', userData),
  updateUser: (id, userData) => api.put(`/users/${id}`, userData),
  deleteUser: (id) => api.delete(`/users/${id}`),
};

// Expenses API
export const expensesAPI = {
  createExpense: (expenseData) => api.post('/expenses', expenseData),
  getExpenses: () => api.get('/expenses'),
  getExpense: (id) => api.get(`/expenses/${id}`),
  approveExpense: (id, decision, comment) =>
    api.post(`/expenses/${id}/approve`, { decision, comment }),
  getFraudAlerts: () => api.get('/expenses/fraud-check'),
};

// Company / Admin API
export const companyAPI = {
  getApprovalRules: () => api.get('/company/approval-rules'),
  updateApprovalRules: (data) => api.put('/company/approval-rules', data),
  updateBudget: (data) => api.put('/company/budget', data),
};

// Dashboard API
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
};

// Audit Logs API
export const auditAPI = {
  getLogs: (params) => api.get('/audit-logs', { params }),
};

// Analytics API
export const analyticsAPI = {
  getKPIs: (params) => api.get('/analytics/kpis', { params }),
  getTimeseries: (params) => api.get('/analytics/timeseries', { params }),
  getCategories: (params) => api.get('/analytics/categories', { params }),
  getTopMerchants: (params) => api.get('/analytics/top-merchants', { params }),
  getApprovalFunnel: (params) => api.get('/analytics/approval-funnel', { params }),
  getOCRConfidence: (params) => api.get('/analytics/ocr-confidence', { params }),
  getOutliers: (params) => api.get('/analytics/outliers', { params }),
  exportData: (data) => api.post('/analytics/export', data),
};

// Integration API
export const integrationAPI = {
  getCountries: () => api.get('/integration/countries'),
  getExchangeRates: (base = 'USD') => api.get(`/integration/exchange?base=${base}`),
};

export default api;
