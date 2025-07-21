import axios, { AxiosResponse } from 'axios';
import {
  ApiResponse,
  User,
  SubscriptionStats,
  ProductAnalysis,
  BrandAnalysis,
  NicheAnalysis,
  SupplierAnalysis,
  SupplyPlanning,
  AdMonitoring,
  SeasonalityData,
  BloggerSearchResult,
  OracleQuery,
  GlobalSearchResult,
  TrackedItem,
  AIGenerationRequest,
  ExternalAnalysis,
  PaymentHistory,
  UserStats,
  DashboardData,
  BalanceOperation,
} from '../types';

// Base API configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Enable sending cookies
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors and other errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    } else if (error.response?.data?.detail) {
      // Handle API error messages
      console.error('API Error:', error.response.data.detail);
      return Promise.reject(new Error(error.response.data.detail));
    } else if (error.message) {
      // Handle network or other errors
      console.error('Request Error:', error.message);
      return Promise.reject(new Error('Ошибка сервера. Пожалуйста, попробуйте позже.'));
    }
    return Promise.reject(error);
  }
);

// Authentication API
export const authAPI = {
  login: async (email: string, password: string): Promise<ApiResponse<{
    token: string;
    user: User;
    subscriptionStats: SubscriptionStats;
  }>> => {
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data;
  },

  loginWithTelegram: async (telegramData: any): Promise<ApiResponse<{
    token: string;
    user: User;
    subscriptionStats: SubscriptionStats;
  }>> => {
    const response = await apiClient.post('/auth/telegram', telegramData);
    return response.data;
  },

  register: async (email: string, password: string, username?: string): Promise<ApiResponse<{
    token: string;
    user: User;
    subscriptionStats: SubscriptionStats;
  }>> => {
    const response = await apiClient.post('/auth/register', { email, password, username });
    return response.data;
  },

  verifyToken: async (): Promise<ApiResponse<{
    user: User;
    subscriptionStats: SubscriptionStats;
  }>> => {
    const response = await apiClient.get('/auth/verify');
    return response.data;
  },

  getCurrentUser: async (): Promise<ApiResponse<{
    user: User;
    subscriptionStats: SubscriptionStats;
  }>> => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },
};

// Analysis API
export const analysisAPI = {
  // Product Analysis
  analyzeProduct: async (article: string): Promise<ApiResponse<ProductAnalysis>> => {
    const response = await apiClient.post('/analysis/product', { article });
    return response.data;
  },

  // Brand Analysis
  analyzeBrand: async (brandName: string): Promise<ApiResponse<BrandAnalysis>> => {
    // Backend expects `brand_name` field
    const response = await apiClient.post('/analysis/brand', { brand_name: brandName });
    return response.data;
  },

  // Niche Analysis
  analyzeNiche: async (niche: string): Promise<ApiResponse<NicheAnalysis>> => {
    const response = await apiClient.post('/analysis/niche', { niche });
    return response.data;
  },

  // Supplier Analysis
  analyzeSupplier: async (supplierName: string): Promise<ApiResponse<SupplierAnalysis>> => {
    // Backend expects `supplier_name` field
    const response = await apiClient.post('/analysis/supplier', { supplier_name: supplierName });
    return response.data;
  },

  // Category Analysis
  analyzeCategory: async (categoryName: string): Promise<ApiResponse<any>> => {
    // Backend expects `category_name` field
    const response = await apiClient.post('/analysis/category', { category_name: categoryName });
    return response.data;
  },

  // External Analysis
  analyzeExternal: async (query: string): Promise<ApiResponse<ExternalAnalysis>> => {
    const response = await apiClient.post('/analysis/external', { query });
    return response.data;
  },

  // Seasonality Analysis
  analyzeSeasonality: async (category: string): Promise<ApiResponse<SeasonalityData>> => {
    const response = await apiClient.post('/analysis/seasonality', { category });
    return response.data;
  },

  // Global Search
  globalSearch: async (query: string): Promise<ApiResponse<GlobalSearchResult>> => {
    const response = await apiClient.post('/analysis/global-search', { query });
    return response.data;
  },

  // Oracle Queries (main analysis)
  analyzeOracleQueries: async (
    queriesCount: number,
    month: string,
    minRevenue: number,
    minFrequency: number
  ): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/analysis/oracle-queries', {
      queries_count: queriesCount,
      month,
      min_revenue: minRevenue,
      min_frequency: minFrequency,
    });
    return response.data;
  },
};

// Planning API
export const planningAPI = {
  // Supply Planning
  getSupplyPlanning: async (articles: string[]): Promise<ApiResponse<SupplyPlanning[]>> => {
    const response = await apiClient.post('/planning/supply', { articles });
    return response.data;
  },

  // Ad Monitoring
  getAdMonitoring: async (articles: string[], manualData?: any): Promise<ApiResponse<AdMonitoring[]>> => {
    const response = await apiClient.post('/planning/ad-monitoring', { articles, manualData });
    return response.data;
  },
};

// AI and Tools API
export const toolsAPI = {
  // AI Content Generation
  generateAIContent: async (request: AIGenerationRequest): Promise<ApiResponse<string>> => {
    const response = await apiClient.post('/tools/ai-generate', request);
    return response.data;
  },

  // Blogger Search
  searchBloggers: async (query: string): Promise<ApiResponse<BloggerSearchResult[]>> => {
    const response = await apiClient.post('/tools/blogger-search', { query });
    return response.data;
  },

  // Oracle Queries
  sendOracleQuery: async (query: string, category?: string): Promise<ApiResponse<OracleQuery>> => {
    const response = await apiClient.post('/tools/oracle', { query, category });
    return response.data;
  },

  getOracleHistory: async (): Promise<ApiResponse<OracleQuery[]>> => {
    const response = await apiClient.get('/tools/oracle/history');
    return response.data;
  },
};

// Tracking API
export const trackingAPI = {
  // Get tracked items
  getTrackedItems: async (): Promise<ApiResponse<TrackedItem[]>> => {
    const response = await apiClient.get('/tracking/items');
    return response.data;
  },

  // Add tracked item
  addTrackedItem: async (article: string): Promise<ApiResponse<TrackedItem>> => {
    const response = await apiClient.post('/tracking/items', { article });
    return response.data;
  },

  // Remove tracked item
  removeTrackedItem: async (article: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete(`/tracking/items/${article}`);
    return response.data;
  },

  // Refresh tracked items
  refreshTrackedItems: async (): Promise<ApiResponse<TrackedItem[]>> => {
    const response = await apiClient.post('/tracking/refresh');
    return response.data;
  },
};

// User and Subscription API
export const userAPI = {
  // Get dashboard data
  getDashboardData: async (): Promise<ApiResponse<DashboardData>> => {
    const response = await apiClient.get('/user/dashboard');
    return response.data;
  },

  // Get user stats
  getUserStats: async (): Promise<ApiResponse<UserStats>> => {
    const response = await apiClient.get('/user/stats');
    return response.data;
  },

  // Update balance
  updateBalance: async (operation: BalanceOperation): Promise<ApiResponse<{ newBalance: number }>> => {
    const response = await apiClient.post('/user/balance', operation);
    return response.data;
  },

  // Get payment history
  getPaymentHistory: async (): Promise<ApiResponse<PaymentHistory[]>> => {
    const response = await apiClient.get('/user/payments');
    return response.data;
  },

  // Subscribe
  subscribe: async (subscriptionType: string): Promise<ApiResponse<SubscriptionStats>> => {
    const response = await apiClient.post('/user/subscribe', { subscriptionType });
    return response.data;
  },

  // Get subscription plans
  getSubscriptionPlans: async (): Promise<ApiResponse<any[]>> => {
    const response = await apiClient.get('/user/subscription-plans');
    return response.data;
  },
};

// Charts and Files API
export const filesAPI = {
  // Get chart/image
  getChart: async (filename: string): Promise<Blob> => {
    const response = await apiClient.get(`/files/charts/${filename}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Upload file
  uploadFile: async (file: File, type: string): Promise<ApiResponse<{ url: string }>> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    
    const response = await apiClient.post('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

// Export default API client for custom requests
export default apiClient; 