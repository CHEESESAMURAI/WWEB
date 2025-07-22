#!/bin/bash

echo "🔧 Исправление типизации всех API ответов..."

# Остановка контейнеров
docker-compose down

# Создание полных типов
echo "🔧 Создание полных типов..."
mkdir -p wild-analytics-web/src/types
cat > wild-analytics-web/src/types/index.ts << 'EOF'
export interface User {
  email: string;
  name: string;
  balance?: number;
  subscription_type?: string;
}

export interface ProductAnalysisData {
  sales: number;
  revenue: number;
  avg_daily_sales: number;
  avg_daily_revenue: number;
  brand: string;
  category: string;
  price: number;
  competitors?: Array<{
    id: string;
    name: string;
    sales: number;
  }>;
}

export interface DashboardData {
  total_products: number;
  total_revenue: number;
  active_analyses: number;
  recent_analyses?: Array<{
    article: string;
    date: string;
    sales: number;
  }>;
}

export interface AdvancedAnalysisData {
  similar_items: number;
  competitors: number;
  market_share: number;
  trend: string;
  recommendations: string[];
}

export interface BrandAnalysisData {
  total_products: number;
  total_revenue: number;
  avg_rating: number;
  top_products: Array<{
    article: string;
    sales: number;
    revenue: number;
  }>;
}

export interface CategoryAnalysisData {
  total_products: number;
  avg_price: number;
  trend: string;
  top_brands: string[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  token?: string;
  user?: User;
}

export interface LoginResponse {
  success: boolean;
  token: string;
  user: User;
}

export interface RegisterResponse {
  success: boolean;
  token: string;
  user: User;
}

export interface UserResponse {
  success: boolean;
  user: User;
}

export interface ProductAnalysisResponse {
  success: boolean;
  article: string;
  data: ProductAnalysisData;
  message: string;
}

export interface DashboardResponse {
  success: boolean;
  data: DashboardData;
}

export interface AdvancedAnalysisResponse {
  success: boolean;
  article: string;
  advanced_data: AdvancedAnalysisData;
  message: string;
}

export interface BrandAnalysisResponse {
  success: boolean;
  brand: string;
  data: BrandAnalysisData;
}

export interface CategoryAnalysisResponse {
  success: boolean;
  category: string;
  data: CategoryAnalysisData;
}
EOF

# Исправление AuthContext с правильной типизацией
echo "🔧 Исправление AuthContext..."
cat > wild-analytics-web/src/contexts/AuthContext.tsx << 'EOF'
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService } from '../services/api';
import { User, LoginResponse, RegisterResponse, UserResponse } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = apiService.getToken();
      if (token) {
        try {
          const response = await apiService.getCurrentUser() as UserResponse;
          if (response.success && response.user) {
            setUser(response.user);
          } else {
            apiService.clearToken();
          }
        } catch (error) {
          console.error('Failed to get current user:', error);
          apiService.clearToken();
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await apiService.login(email, password) as LoginResponse;
      if (response.success && response.token && response.user) {
        apiService.setToken(response.token);
        setUser(response.user);
      } else {
        throw new Error('Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      const response = await apiService.register(email, password, name) as RegisterResponse;
      if (response.success && response.token && response.user) {
        apiService.setToken(response.token);
        setUser(response.user);
      } else {
        throw new Error('Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const logout = () => {
    apiService.clearToken();
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
EOF

# Исправление API service с полной типизацией
echo "🔧 Исправление API service с полной типизацией..."
cat > wild-analytics-web/src/services/api.ts << 'EOF'
import { 
  LoginResponse, 
  RegisterResponse, 
  UserResponse, 
  ProductAnalysisResponse, 
  DashboardResponse, 
  AdvancedAnalysisResponse, 
  BrandAnalysisResponse, 
  CategoryAnalysisResponse 
} from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://93.127.214.183:8000';

class ApiService {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('token');
    }
    return this.token;
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = this.getToken();
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        if (response.status === 401) {
          this.clearToken();
          window.location.href = '/login';
          throw new Error('Unauthorized');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Auth endpoints
  async login(email: string, password: string): Promise<LoginResponse> {
    return this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(email: string, password: string, name: string): Promise<RegisterResponse> {
    return this.request<RegisterResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  }

  async getCurrentUser(): Promise<UserResponse> {
    return this.request<UserResponse>('/auth/me');
  }

  // Analysis endpoints
  async analyzeProduct(article: string): Promise<ProductAnalysisResponse> {
    return this.request<ProductAnalysisResponse>('/analysis/product', {
      method: 'POST',
      body: JSON.stringify({ article }),
    });
  }

  async advancedAnalysis(article: string): Promise<AdvancedAnalysisResponse> {
    return this.request<AdvancedAnalysisResponse>('/mpstats/advanced-analysis', {
      method: 'POST',
      body: JSON.stringify({ article }),
    });
  }

  async getDashboard(): Promise<DashboardResponse> {
    return this.request<DashboardResponse>('/user/dashboard');
  }

  async analyzeBrand(brandName: string): Promise<BrandAnalysisResponse> {
    return this.request<BrandAnalysisResponse>(`/brand/analysis/${encodeURIComponent(brandName)}`);
  }

  async analyzeCategory(category: string): Promise<CategoryAnalysisResponse> {
    return this.request<CategoryAnalysisResponse>(`/category/analysis/${encodeURIComponent(category)}`);
  }
}

export const apiService = new ApiService();
EOF

# Создание простого Dashboard с правильной типизацией
echo "🔧 Создание Dashboard с правильной типизацией..."
mkdir -p wild-analytics-web/src/pages
cat > wild-analytics-web/src/pages/Dashboard.tsx << 'EOF'
import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { DashboardData } from '../types';

const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await apiService.getDashboard();
        if (response.success && response.data) {
          setData(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard:', error);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (loading) {
    return <div>Loading dashboard...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!data) {
    return <div>No data available</div>;
  }

  return (
    <div>
      <h2>Dashboard</h2>
      <div>
        <p>Total Products: {data.total_products}</p>
        <p>Total Revenue: {data.total_revenue}</p>
        <p>Active Analyses: {data.active_analyses}</p>
      </div>
    </div>
  );
};

export default Dashboard;
EOF

# Создание простого ProductAnalysis с правильной типизацией
echo "🔧 Создание ProductAnalysis с правильной типизацией..."
cat > wild-analytics-web/src/pages/ProductAnalysis.tsx << 'EOF'
import React, { useState } from 'react';
import { apiService } from '../services/api';
import { ProductAnalysisData } from '../types';

const ProductAnalysis: React.FC = () => {
  const [article, setArticle] = useState('');
  const [data, setData] = useState<ProductAnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!article.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await apiService.analyzeProduct(article);
      if (response.success && response.data) {
        setData(response.data);
      }
    } catch (error) {
      console.error('Failed to analyze product:', error);
      setError('Failed to analyze product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Product Analysis</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={article}
          onChange={(e) => setArticle(e.target.value)}
          placeholder="Enter article number"
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Analyzing...' : 'Analyze'}
        </button>
      </form>

      {error && <div>Error: {error}</div>}

      {data && (
        <div>
          <h3>Results for {article}</h3>
          <p>Sales: {data.sales}</p>
          <p>Revenue: {data.revenue}</p>
          <p>Brand: {data.brand}</p>
          <p>Category: {data.category}</p>
        </div>
      )}
    </div>
  );
};

export default ProductAnalysis;
EOF

# Создание простого App.tsx
echo "🔧 Создание простого App.tsx..."
cat > wild-analytics-web/src/App.tsx << 'EOF'
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ProductAnalysis from './pages/ProductAnalysis';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            } />
            <Route path="/product-analysis" element={
              <PrivateRoute>
                <ProductAnalysis />
              </PrivateRoute>
            } />
            <Route path="/" element={<Navigate to="/dashboard" />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;
EOF

# Создание простых страниц авторизации
echo "🔧 Создание страниц авторизации..."
cat > wild-analytics-web/src/pages/Login.tsx << 'EOF'
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (error) {
      setError('Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      {error && <div>Error: {error}</div>}
      <p>
        Don't have an account? <Link to="/register">Register</Link>
      </p>
    </div>
  );
};

export default Login;
EOF

cat > wild-analytics-web/src/pages/Register.tsx << 'EOF'
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register(email, password, name);
      navigate('/dashboard');
    } catch (error) {
      setError('Failed to register');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Register</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          required
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Registering...' : 'Register'}
        </button>
      </form>
      {error && <div>Error: {error}</div>}
      <p>
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </div>
  );
};

export default Register;
EOF

echo "🧹 Очистка старых образов..."
docker system prune -f

echo "🔨 Пересборка frontend образа..."
docker build -t wild-analytics-frontend ./wild-analytics-web

echo "🚀 Запуск контейнеров..."
docker-compose up -d

echo "⏳ Ожидание запуска (45 секунд)..."
sleep 45

echo "📊 Статус контейнеров:"
docker ps

echo "🔍 Проверка API:"
curl -s http://localhost:8000/health || echo "❌ Backend недоступен"

echo ""
echo "✅ Исправление типизации всех API ответов завершено!"
echo "🌐 Frontend: http://93.127.214.183:3000"
echo "🔗 Backend API: http://93.127.214.183:8000"
echo ""
echo "📋 Тестовые данные для входа:"
echo "Email: test@example.com"
echo "Password: password123"
echo ""
echo "🎯 Теперь все API ответы правильно типизированы!" 