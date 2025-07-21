import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import './Dashboard.css';

interface DashboardData {
  user: {
    email: string;
    balance: number;
    subscription_type: string;
  };
  stats: {
    products_analyzed: number;
    brands_analyzed: number;
    ai_helper_uses: number;
    total_savings: number;
  };
  recent_activity: Array<{
    type: string;
    item: string;
    date: string;
  }>;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';
        const response = await axios.get(`${API_BASE}/user/dashboard`);
        setDashboardData(response.data);
      } catch (error) {
        console.error('Ошибка загрузки данных dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return <div className="loading">Загрузка данных...</div>;
  }

  const quickActions = [
    {
      title: '🔍 Анализ товара',
      description: 'Получите детальную аналитику по любому товару',
      link: '/product-analysis',
      color: '#3498db'
    },
    {
      title: '📈 Мониторинг рекламы',
      description: 'Отслеживайте эффективность рекламных кампаний',
      link: '/ad-monitoring',
      color: '#e74c3c'
    },
    {
      title: '🎯 Анализ ниш',
      description: 'Исследуйте прибыльные ниши и категории',
      link: '/niche-analysis',
      color: '#2ecc71'
    },
    {
      title: '🏢 Анализ брендов',
      description: 'Изучите конкурентов и их стратегии',
      link: '/brand-analysis',
      color: '#f39c12'
    }
  ];

  return (
    <div className="dashboard">
      <div className="welcome-section">
        <h1>Добро пожаловать, {user?.email}! 👋</h1>
        <p>Управляйте вашим бизнесом на Wildberries с помощью профессиональной аналитики</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-4 stats-grid" style={{ marginBottom: '35px' }}>
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-info">
            <h3>{dashboardData?.stats.products_analyzed || 0}</h3>
            <p>Товаров проанализировано</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">🏢</div>
          <div className="stat-info">
            <h3>{dashboardData?.stats.brands_analyzed || 0}</h3>
            <p>Брендов изучено</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">🤖</div>
          <div className="stat-info">
            <h3>{dashboardData?.stats.ai_helper_uses || 0}</h3>
            <p>Помощи от ИИ</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-info">
            <h3>{dashboardData?.stats.total_savings?.toLocaleString() || 0}₽</h3>
            <p>Сэкономлено</p>
          </div>
        </div>
      </div>

      <div className="grid grid-2">
        {/* Quick Actions */}
        <div className="card">
          <h3>🚀 Быстрые действия</h3>
          <div className="quick-actions">
            {quickActions.map((action, index) => (
              <Link 
                key={index}
                to={action.link}
                className="quick-action"
                style={{ borderLeftColor: action.color }}
              >
                <h4>{action.title}</h4>
                <p>{action.description}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <h3>📋 Последняя активность</h3>
          <div className="activity-list">
            {dashboardData?.recent_activity?.map((activity, index) => (
              <div key={index} className="activity-item">
                <div className="activity-type">
                  {activity.type === 'product' && '🔍'}
                  {activity.type === 'brand' && '🏢'}
                  {activity.type === 'niche' && '🎯'}
                </div>
                <div className="activity-details">
                  <p className="activity-title">{activity.item}</p>
                  <p className="activity-date">{activity.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Account Info */}
      <div className="card">
        <h3>👤 Информация об аккаунте</h3>
        <div className="account-info">
          <div className="account-item">
            <span className="account-label">📧 Email:</span>
            <span className="account-value">{user?.email}</span>
          </div>
          <div className="account-item">
            <span className="account-label">💰 Баланс:</span>
            <span className="account-value">{user?.balance}₽</span>
          </div>
          <div className="account-item">
            <span className="account-label">🎯 Подписка:</span>
            <span className={`account-value subscription-${user?.subscription_type?.toLowerCase()}`}>
              {user?.subscription_type}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 