// User types
export interface User {
  id: number;
  username?: string;
  email?: string;
  balance: number;
  subscription: SubscriptionType;
  subscriptionExpiry?: string;
  registeredAt: string;
}

export type SubscriptionType = 'free' | 'pro' | 'business';

export interface SubscriptionPlan {
  type: SubscriptionType;
  name: string;
  price: number;
  features: string[];
  limits: {
    [key: string]: number | 'unlimited';
  };
}

export interface SubscriptionStats {
  subscription: SubscriptionType;
  expiryDate?: string;
  actions: {
    [key: string]: {
      used: number;
      limit: number | 'unlimited';
    };
  };
}

// Analysis types based on bot functions
export interface ProductAnalysis {
  article: string;
  name: string;
  brand: string;
  price: {
    current: number;
    original: number;
    discount: number;
  };
  rating: number;
  feedbacks: number;
  stocks: {
    total: number;
    bySize: { [size: string]: number };
  };
  sales: {
    today: number;
    weekly: number;
    monthly: number;
    total: number;
    revenue: {
      daily: number;
      weekly: number;
      monthly: number;
      total: number;
    };
    profit: {
      daily: number;
      weekly: number;
      monthly: number;
    };
  };
  charts?: string[];
}

export interface BrandAnalysis {
  brandName: string;
  totalProducts: number;
  averagePrice: number;
  totalSales: number;
  categories: { [category: string]: number };
  competitors: Array<{
    name: string;
    products: number;
    sales: number;
  }>;
  charts: string[];
}

export interface NicheAnalysis {
  niche: string;
  totalRevenue: number;
  averagePrice: number;
  competitorCount: number;
  growthTrend: 'rising' | 'stable' | 'declining';
  subcategories: Array<{
    name: string;
    revenue: number;
    products: number;
  }>;
  charts: string[];
}

export interface SupplierAnalysis {
  supplierName: string;
  inn?: string;
  ogrn?: string;
  totalProducts: number;
  averagePrice: number;
  totalSales: number;
  categories: { [category: string]: number };
  topProducts: Array<{
    article: string;
    name: string;
    sales: number;
    revenue: number;
  }>;
  adActivity: boolean;
  recommendations?: string[];
}

export interface SupplyPlanning {
  article: string;
  productName: string;
  currentStock: number;
  dailySales: number;
  daysLeft: number;
  recommendedSupply: number;
  status: 'good' | 'warning' | 'critical';
  charts: string[];
}

export interface AdMonitoring {
  article: string;
  productName: string;
  roi: number;
  adSpend: number;
  revenue: number;
  orders: number;
  impressions: number;
  clicks: number;
  ctr: number;
  status: 'profitable' | 'breakeven' | 'loss';
  recommendations: string[];
}

export interface SeasonalityData {
  category: string;
  annualData: Array<{
    month: string;
    revenue: number;
    sales: number;
  }>;
  weeklyData: Array<{
    day: string;
    activity: number;
  }>;
  recommendations: string[];
  charts: string[];
}

export interface BloggerSearchResult {
  platform: 'youtube' | 'instagram' | 'tiktok' | 'telegram';
  author: string;
  url: string;
  audienceSize: number;
  engagement: number;
  estimatedCost: number;
  hasWbContent: boolean;
}

export interface OracleQuery {
  id: string;
  query: string;
  response: string;
  timestamp: string;
  category?: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Search and Global types
export interface GlobalSearchResult {
  query: string;
  results: Array<{
    platform: string;
    url: string;
    author: string;
    date: string;
    sales_impact: {
      frequency: number;
      revenue: number;
      orders: number;
      avg_price: number;
      orders_growth_percent: number;
      revenue_growth_percent: number;
    };
  }>;
  charts: string[];
}

export interface TrackedItem {
  article: string;
  name: string;
  price: number;
  stock: number;
  sales: number;
  addedAt: string;
}

// AI Generation types
export type AIContentType = 
  | 'product_description' 
  | 'seo_text' 
  | 'social_media' 
  | 'email_campaign' 
  | 'blog_post';

export interface AIGenerationRequest {
  contentType: AIContentType;
  input: string;
  additionalParams?: Record<string, any>;
}

// External Analysis
export interface ExternalAnalysis {
  query: string;
  competitorData: Array<{
    name: string;
    price: number;
    sales: number;
    rating: number;
  }>;
  recommendations: string[];
  charts: string[];
}

// Payment and Balance
export interface PaymentHistory {
  id: string;
  amount: number;
  type: 'deposit' | 'withdrawal' | 'subscription' | 'analysis';
  description: string;
  timestamp: string;
  status: 'completed' | 'pending' | 'failed';
}

export interface BalanceOperation {
  type: 'add' | 'subtract';
  amount: number;
  description: string;
}

// Analytics and Statistics
export interface UserStats {
  totalAnalyses: number;
  trackedItems: number;
  totalSpent: number;
  mostUsedFeature: string;
  activityByMonth: Array<{
    month: string;
    count: number;
  }>;
}

// Dashboard data
export interface DashboardData {
  user: User;
  recentAnalyses: Array<{
    type: string;
    timestamp: string;
    title: string;
  }>;
  trackedItems: TrackedItem[];
  subscriptionStats: SubscriptionStats;
  notifications: Array<{
    id: string;
    type: 'info' | 'warning' | 'success' | 'error';
    message: string;
    timestamp: string;
  }>;
} 