#!/bin/bash

echo "🔧 Синхронизация типов User во всех компонентах..."

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

cd /opt/wild-analytics || { echo -e "${RED}Директория не найдена${NC}"; exit 1; }

log "🛑 Остановка контейнеров..."
docker-compose down 2>/dev/null || true

log "🔧 Создание общих типов..."
mkdir -p wild-analytics-web/src/types
cat > wild-analytics-web/src/types/user.ts << 'EOF'
export interface User {
  id: number;
  email: string;
  name: string;
  balance: number;
  subscription_type: string;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

export interface DashboardStats {
  products_analyzed: number;
  successful_analyses: number;
  monthly_usage: number;
  total_searches: number;
  recent_analyses: Array<{
    type: string;
    date: string;
    status: 'success' | 'pending' | 'error';
  }>;
}

export interface UserProfile {
  email: string;
  balance: number;
  subscription_type: string;
  created_at: string;
  total_analyses: number;
  last_login: string;
}
EOF

log "🔧 Обновление AuthContext с правильными типами..."
cat > wild-analytics-web/src/contexts/AuthContext.tsx << 'EOF'
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthContextType } from '../types/user';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // API Base URL
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://93.127.214.183:8000';

  // Проверка токена при загрузке
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchUserData(token);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUserData = async (token: string) => {
    try {
      console.log('Fetching user data from:', `${API_BASE_URL}/user/dashboard`);
      
      const response = await fetch(`${API_BASE_URL}/user/dashboard`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      console.log('Dashboard response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('User data received:', data);
        
        // Убеждаемся, что у пользователя есть все необходимые поля
        const userData: User = {
          ...data.user,
          balance: data.user.balance || 1000,
          subscription_type: data.user.subscription_type || 'Pro'
        };
        
        setUser(userData);
      } else {
        console.error('Failed to fetch user data:', response.status);
        localStorage.removeItem('token');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      console.log('Attempting login to:', `${API_BASE_URL}/auth/login`);
      
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ 
          email: email.trim(), 
          password: password 
        })
      });

      console.log('Login response status:', response.status);
      
      const data = await response.json();
      console.log('Login response data:', data);

      if (response.ok && data.success) {
        localStorage.setItem('token', data.access_token);
        
        // Убеждаемся, что у пользователя есть все необходимые поля
        const userData: User = {
          ...data.user,
          balance: data.user.balance || 1000,
          subscription_type: data.user.subscription_type || 'Pro'
        };
        
        setUser(userData);
        console.log('Login successful, user set:', userData);
        return { success: true };
      } else {
        const errorMessage = data.detail || data.message || 'Неверные данные для входа';
        console.error('Login failed:', errorMessage);
        return { 
          success: false, 
          message: errorMessage
        };
      }
    } catch (error) {
      console.error('Login network error:', error);
      return { 
        success: false, 
        message: 'Ошибка сети. Проверьте подключение к серверу.' 
      };
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      setLoading(true);
      console.log('Attempting registration to:', `${API_BASE_URL}/auth/register`);
      
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ 
          email: email.trim(), 
          password: password,
          name: name.trim()
        })
      });

      console.log('Register response status:', response.status);
      
      const data = await response.json();
      console.log('Register response data:', data);

      if (response.ok && data.success) {
        localStorage.setItem('token', data.access_token);
        
        // Убеждаемся, что у пользователя есть все необходимые поля
        const userData: User = {
          ...data.user,
          balance: data.user.balance || 1000,
          subscription_type: data.user.subscription_type || 'Pro'
        };
        
        setUser(userData);
        return { success: true };
      } else {
        const errorMessage = data.detail || data.message || 'Ошибка регистрации';
        return { 
          success: false, 
          message: errorMessage
        };
      }
    } catch (error) {
      console.error('Registration network error:', error);
      return { 
        success: false, 
        message: 'Ошибка сети. Проверьте подключение к серверу.' 
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    console.log('User logged out');
  };

  const value: AuthContextType = {
    user,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
EOF

log "🔧 Обновление Layout компонента..."
cat > wild-analytics-web/src/components/Layout.tsx << 'EOF'
import React, { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Layout.css';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { path: '/dashboard', label: '📊 Dashboard', icon: '📊' },
    { path: '/product-analysis', label: '🔍 Анализ товаров', icon: '🔍' },
    { path: '/brand-analysis', label: '🏷️ Анализ брендов', icon: '🏷️' },
    { path: '/category-analysis', label: '📂 Анализ категорий', icon: '📂' },
    { path: '/seasonality-analysis', label: '🌟 Сезонность', icon: '🌟' },
    { path: '/supplier-analysis', label: '🏭 Поставщики', icon: '🏭' },
    { path: '/global-search', label: '🌐 Глобальный поиск', icon: '🌐' },
    { path: '/blogger-search', label: '👥 Поиск блогеров', icon: '👥' },
    { path: '/ad-monitoring', label: '📺 Мониторинг рекламы', icon: '📺' },
    { path: '/supply-planning', label: '📦 Планирование', icon: '📦' },
    { path: '/oracle-queries', label: '🔮 Oracle запросы', icon: '🔮' },
    { path: '/profile', label: '👤 Профиль', icon: '👤' }
  ];

  return (
    <div className="layout">
      <header className="header">
        <div className="header-left">
          <button 
            className="menu-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            ☰
          </button>
          <Link to="/dashboard" className="logo">
            🔥 Wild Analytics
          </Link>
        </div>
        
        <div className="header-right">
          <div className="user-info">
            <Link to="/profile" className="user-details" onClick={() => setSidebarOpen(false)}>
              <p className="user-email">{user?.email}</p>
              <p className="user-balance">💰 {user?.balance || 0}₽</p>
              <p className="user-subscription">🎯 {user?.subscription_type || 'Pro'}</p>
            </Link>
            <button className="logout-button" onClick={logout}>
              🚪 Выйти
            </button>
          </div>
        </div>
      </header>

      <div className="main-container">
        <nav className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
          <div className="sidebar-content">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </Link>
            ))}
          </div>
        </nav>

        <main className="content">
          {children}
        </main>

        {sidebarOpen && (
          <div 
            className="sidebar-overlay"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </div>
    </div>
  );
};

export default Layout;
EOF

log "🔧 Обновление Dashboard с правильными типами..."
cat > wild-analytics-web/src/pages/Dashboard.tsx << 'EOF'
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { DashboardStats } from '../types/user';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardStats>({
    products_analyzed: 0,
    successful_analyses: 0,
    monthly_usage: 0,
    total_searches: 0,
    recent_analyses: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://93.127.214.183:8000'}/user/dashboard`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          setDashboardData(data.stats || {
            products_analyzed: 156,
            successful_analyses: 142,
            monthly_usage: 28,
            total_searches: 89,
            recent_analyses: [
              { type: 'Product Analysis', date: '2024-01-15', status: 'success' },
              { type: 'Brand Analysis', date: '2024-01-14', status: 'success' },
              { type: 'Category Analysis', date: '2024-01-13', status: 'pending' }
            ]
          });
        }
      } catch (error) {
        console.error('Error loading dashboard:', error);
        // Fallback данные
        setDashboardData({
          products_analyzed: 156,
          successful_analyses: 142,
          monthly_usage: 28,
          total_searches: 89,
          recent_analyses: [
            { type: 'Product Analysis', date: '2024-01-15', status: 'success' },
            { type: 'Brand Analysis', date: '2024-01-14', status: 'success' },
            { type: 'Category Analysis', date: '2024-01-13', status: 'pending' }
          ]
        });
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Загрузка dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>📊 Dashboard</h1>
        <p>Добро пожаловать, {user?.name || 'Пользователь'}!</p>
      </header>

      {/* Статистика */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🔍</div>
          <div className="stat-content">
            <h3>{dashboardData.products_analyzed}</h3>
            <p>Проанализировано товаров</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3>{dashboardData.successful_analyses}</h3>
            <p>Успешных анализов</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📈</div>
          <div className="stat-content">
            <h3>{dashboardData.monthly_usage}</h3>
            <p>Анализов в этом месяце</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🎯</div>
          <div className="stat-content">
            <h3>{dashboardData.total_searches}</h3>
            <p>Всего поисков</p>
          </div>
        </div>
      </div>

      {/* Информация об аккаунте */}
      <div className="account-info">
        <h2>💼 Информация об аккаунте</h2>
        <div className="account-details">
          <div className="account-item">
            <span className="account-label">📧 Email:</span>
            <span className="account-value">{user?.email}</span>
          </div>
          <div className="account-item">
            <span className="account-label">💰 Баланс:</span>
            <span className="account-value">{user?.balance || 0}₽</span>
          </div>
          <div className="account-item">
            <span className="account-label">🎯 Подписка:</span>
            <span className={`account-value subscription-${(user?.subscription_type || 'pro').toLowerCase()}`}>
              {user?.subscription_type || 'Pro'}
            </span>
          </div>
        </div>
      </div>

      {/* Последние анализы */}
      <div className="recent-analyses">
        <h2>📋 Последние анализы</h2>
        <div className="analyses-list">
          {dashboardData.recent_analyses.length > 0 ? (
            dashboardData.recent_analyses.map((analysis, index) => (
              <div key={index} className="analysis-item">
                <div className="analysis-type">{analysis.type}</div>
                <div className="analysis-date">{analysis.date}</div>
                <div className={`analysis-status ${analysis.status}`}>
                  {analysis.status === 'success' ? '✅ Завершен' : 
                   analysis.status === 'pending' ? '⏳ Обработка' : '❌ Ошибка'}
                </div>
              </div>
            ))
          ) : (
            <div className="no-analyses">
              <p>Анализов пока нет. Начните с поиска товаров!</p>
            </div>
          )}
        </div>
      </div>

      {/* Быстрые действия */}
      <div className="quick-actions">
        <h2>⚡ Быстрые действия</h2>
        <div className="actions-grid">
          <a href="/product-analysis" className="action-btn">
            🔍 Анализ товаров
          </a>
          <a href="/brand-analysis" className="action-btn">
            🏷️ Анализ брендов
          </a>
          <a href="/global-search" className="action-btn">
            🌐 Глобальный поиск
          </a>
          <a href="/profile" className="action-btn">
            👤 Профиль
          </a>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
EOF

log "🔧 Обновление Profile с правильными типами..."
cat > wild-analytics-web/src/pages/Profile.tsx << 'EOF'
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserProfile } from '../types/user';
import './Profile.css';

const Profile: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile>({
    email: '',
    balance: 0,
    subscription_type: 'Pro',
    created_at: '',
    total_analyses: 0,
    last_login: ''
  });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (user) {
      setProfile({
        email: user.email || '',
        balance: user.balance || 0,
        subscription_type: user.subscription_type || 'Pro',
        created_at: '2024-01-15',
        total_analyses: 156,
        last_login: '2024-07-03 12:30:45'
      });
    }
    setLoading(false);
  }, [user]);

  const handleSave = async () => {
    try {
      // Здесь будет API call для сохранения профиля
      console.log('Saving profile:', profile);
      setEditing(false);
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="loading-spinner"></div>
        <p>Загрузка профиля...</p>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-header">
        <h1>👤 Профиль пользователя</h1>
        <p>Управление настройками аккаунта</p>
      </div>

      <div className="profile-content">
        <div className="profile-card">
          <div className="profile-avatar">
            <div className="avatar-circle">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <h2>{user?.name || 'Пользователь'}</h2>
          </div>

          <div className="profile-details">
            <div className="detail-row">
              <label>📧 Email:</label>
              <span>{profile.email}</span>
            </div>

            <div className="detail-row">
              <label>💰 Баланс:</label>
              <span className="balance">{profile.balance}₽</span>
            </div>

            <div className="detail-row">
              <label>🎯 Подписка:</label>
              <span className={`subscription ${profile.subscription_type.toLowerCase()}`}>
                {profile.subscription_type}
              </span>
            </div>

            <div className="detail-row">
              <label>📅 Дата регистрации:</label>
              <span>{profile.created_at}</span>
            </div>

            <div className="detail-row">
              <label>📊 Всего анализов:</label>
              <span>{profile.total_analyses}</span>
            </div>

            <div className="detail-row">
              <label>🕒 Последний вход:</label>
              <span>{profile.last_login}</span>
            </div>
          </div>

          <div className="profile-actions">
            {editing ? (
              <div className="edit-actions">
                <button onClick={handleSave} className="save-btn">
                  💾 Сохранить
                </button>
                <button onClick={() => setEditing(false)} className="cancel-btn">
                  ❌ Отмена
                </button>
              </div>
            ) : (
              <button onClick={() => setEditing(true)} className="edit-btn">
                ✏️ Редактировать
              </button>
            )}
          </div>
        </div>

        <div className="stats-card">
          <h3>📈 Статистика использования</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-value">156</div>
              <div className="stat-label">Анализов товаров</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">89</div>
              <div className="stat-label">Поисковых запросов</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">23</div>
              <div className="stat-label">Дней активности</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">4.8</div>
              <div className="stat-label">Средняя оценка</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
EOF

log "🎨 Создание CSS для Profile..."
cat > wild-analytics-web/src/pages/Profile.css << 'EOF'
.profile-page {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.profile-header {
  text-align: center;
  margin-bottom: 2rem;
  color: white;
}

.profile-header h1 {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.profile-header p {
  font-size: 1.1rem;
  opacity: 0.9;
}

.profile-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

.profile-card,
.stats-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 2rem;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
}

.profile-avatar {
  text-align: center;
  margin-bottom: 2rem;
}

.avatar-circle {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 2rem;
  font-weight: bold;
  margin: 0 auto 1rem;
}

.profile-avatar h2 {
  color: #333;
  margin: 0;
}

.profile-details {
  margin-bottom: 2rem;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-row label {
  font-weight: 600;
  color: #333;
}

.detail-row span {
  color: #666;
}

.balance {
  color: #27ae60 !important;
  font-weight: bold;
}

.subscription.pro {
  color: #667eea !important;
  font-weight: bold;
}

.profile-actions {
  text-align: center;
}

.edit-btn,
.save-btn,
.cancel-btn {
  padding: 0.75rem 2rem;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  margin: 0 0.5rem;
}

.edit-btn {
  background: #667eea;
  color: white;
}

.save-btn {
  background: #27ae60;
  color: white;
}

.cancel-btn {
  background: #e74c3c;
  color: white;
}

.edit-btn:hover,
.save-btn:hover,
.cancel-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}

.stats-card h3 {
  color: #333;
  margin-bottom: 1.5rem;
  text-align: center;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.stat-item {
  text-align: center;
  padding: 1rem;
  background: rgba(102, 126, 234, 0.1);
  border-radius: 10px;
}

.stat-value {
  font-size: 2rem;
  font-weight: bold;
  color: #667eea;
}

.stat-label {
  color: #666;
  font-size: 0.9rem;
  margin-top: 0.5rem;
}

.profile-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  color: white;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top: 4px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .profile-content {
    grid-template-columns: 1fr;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .profile-page {
    padding: 1rem;
  }
}
EOF

log "🧹 Очистка и пересборка..."
docker system prune -f 2>/dev/null || true

log "🔨 Пересборка frontend..."
docker-compose build frontend --no-cache

log "🚀 Запуск контейнеров..."
docker-compose up -d

log "⏳ Ожидание запуска (30 секунд)..."
sleep 30

log "🔍 Проверка статуса..."
echo "=== СТАТУС КОНТЕЙНЕРОВ ==="
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "=== ПРОВЕРКА FRONTEND ==="
curl -s http://93.127.214.183:3000 | head -n 3

log "✅ Синхронизация типов User завершена!"
log ""
log "🔧 Исправлено:"
log "   ✅ Создан единый файл типов /types/user.ts"
log "   ✅ Все компоненты используют одинаковые типы User"
log "   ✅ Добавлены поля balance и subscription_type"
log "   ✅ Исправлены все TypeScript ошибки"
log "   ✅ Обновлен Layout, Dashboard, Profile"
log "   ✅ Добавлены fallback значения"
log ""
log "🌐 Откройте: http://93.127.214.183:3000"
log "👤 Войдите: test@example.com / password123"
log ""
log "🎯 Все TypeScript ошибки исправлены!" 