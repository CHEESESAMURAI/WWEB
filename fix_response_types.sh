#!/bin/bash

echo "🔧 Исправление типизации response..."

# Остановка контейнеров
docker-compose down

# Создание типов если их нет
echo "🔧 Создание типов..."
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

# Исправление API service с правильной типизацией
echo "🔧 Исправление API service..."
cat > wild-analytics-web/src/services/api.ts << 'EOF'
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
  async login(email: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(email: string, password: string, name: string) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  // Analysis endpoints
  async analyzeProduct(article: string) {
    return this.request('/analysis/product', {
      method: 'POST',
      body: JSON.stringify({ article }),
    });
  }

  async advancedAnalysis(article: string) {
    return this.request('/mpstats/advanced-analysis', {
      method: 'POST',
      body: JSON.stringify({ article }),
    });
  }

  async getDashboard() {
    return this.request('/user/dashboard');
  }

  async analyzeBrand(brandName: string) {
    return this.request(`/brand/analysis/${encodeURIComponent(brandName)}`);
  }

  async analyzeCategory(category: string) {
    return this.request(`/category/analysis/${encodeURIComponent(category)}`);
  }
}

export const apiService = new ApiService();
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
echo "✅ Исправление типизации response завершено!"
echo "🌐 Frontend: http://93.127.214.183:3000"
echo "🔗 Backend API: http://93.127.214.183:8000"
echo ""
echo "📋 Тестовые данные для входа:"
echo "Email: test@example.com"
echo "Password: password123"
echo ""
echo "🎯 Теперь все типы правильно определены!" 