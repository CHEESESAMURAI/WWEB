import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import './Profile.css';

interface UserProfile {
  email: string;
  balance: number;
  subscription_type: string;
  created_at: string;
  total_analyses: number;
  last_login: string;
}

interface OperationHistory {
  id: number;
  type: string;
  description: string;
  amount: number;
  date: string;
  status: string;
}

interface SubscriptionPlan {
  name: string;
  price: number;
  features: string[];
  limits: {
    products_per_day: number;
    brands_per_day: number;
    ad_campaigns: number;
  };
}

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const Profile: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [operations, setOperations] = useState<OperationHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const subscriptionPlans: SubscriptionPlan[] = [
    {
      name: 'Free',
      price: 0,
      features: [
        'Анализ до 5 товаров в день',
        'Базовая статистика',
        'Стандартная поддержка'
      ],
      limits: {
        products_per_day: 5,
        brands_per_day: 2,
        ad_campaigns: 1
      }
    },
    {
      name: 'Pro',
      price: 1990,
      features: [
        'Неограниченный анализ товаров',
        'Анализ брендов и ниш',
        'Мониторинг рекламы',
        'AI-помощник',
        'Экспорт данных',
        'Приоритетная поддержка'
      ],
      limits: {
        products_per_day: -1,
        brands_per_day: -1,
        ad_campaigns: -1
      }
    },
    {
      name: 'Business',
      price: 4990,
      features: [
        'Все возможности Pro',
        'API доступ',
        'Белый лейбл',
        'Персональный менеджер',
        'Кастомная интеграция'
      ],
      limits: {
        products_per_day: -1,
        brands_per_day: -1,
        ad_campaigns: -1
      }
    }
  ];

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      const [profileResponse, operationsResponse] = await Promise.all([
        axios.get(`${API_BASE}/user/profile`),
        axios.get(`${API_BASE}/user/operations`)
      ]);
      
      setProfile(profileResponse.data);
      setOperations(operationsResponse.data);
    } catch (error) {
      console.error('Error fetching profile data:', error);
      // Моковые данные для демо
      setProfile({
        email: user?.email || '',
        balance: user?.balance || 0,
        subscription_type: user?.subscription_type || 'Pro',
        created_at: '2024-01-15',
        total_analyses: 156,
        last_login: '2024-07-03 12:30:45'
      });
      
      setOperations([
        {
          id: 1,
          type: 'analysis',
          description: 'Анализ товара #275191790',
          amount: -50,
          date: '2024-07-03 10:15:00',
          status: 'completed'
        },
        {
          id: 2,
          type: 'subscription',
          description: 'Продление Pro подписки',
          amount: -1990,
          date: '2024-07-01 09:00:00',
          status: 'completed'
        },
        {
          id: 3,
          type: 'bonus',
          description: 'Бонус за регистрацию',
          amount: 1000,
          date: '2024-06-15 14:20:00',
          status: 'completed'
        },
        {
          id: 4,
          type: 'analysis',
          description: 'Анализ бренда Apple',
          amount: -100,
          date: '2024-06-20 16:45:00',
          status: 'completed'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    if (newPassword.length < 6) {
      setError('Пароль должен содержать минимум 6 символов');
      return;
    }

    try {
      const response = await axios.post(`${API_BASE}/user/change-password`, {
        new_password: newPassword
      });
      
      setSuccess('Пароль успешно изменен');
      setNewPassword('');
      setConfirmPassword('');
      setEditMode(false);
      setError('');
    } catch (error) {
      setError('Ошибка при изменении пароля');
    }
  };

  const handleSubscriptionUpgrade = async (planName: string) => {
    try {
      await axios.post(`${API_BASE}/user/upgrade-subscription`, {
        plan: planName
      });
      
      setSuccess(`Подписка успешно изменена на ${planName}`);
      fetchProfileData();
    } catch (error) {
      setError('Ошибка при изменении подписки');
    }
  };

  const getOperationIcon = (type: string) => {
    switch (type) {
      case 'analysis': return '🔍';
      case 'subscription': return '⭐';
      case 'bonus': return '🎁';
      case 'payment': return '💳';
      default: return '📄';
    }
  };

  const getOperationColor = (type: string, amount: number) => {
    if (amount > 0) return 'positive';
    return type === 'subscription' ? 'subscription' : 'negative';
  };

  if (loading) {
    return <div className="loading">Загрузка профиля...</div>;
  }

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="profile-info">
          <div className="avatar">
            <span>{user?.email?.charAt(0).toUpperCase()}</span>
          </div>
          <div className="user-details">
            <h1>{profile?.email}</h1>
            <div className="subscription-badge">
              <span className={`badge ${profile?.subscription_type?.toLowerCase()}`}>
                {profile?.subscription_type}
              </span>
            </div>
            <p className="member-since">
              Пользователь с {new Date(profile?.created_at || '').toLocaleDateString('ru-RU')}
            </p>
          </div>
        </div>
        
        <div className="profile-stats">
          <div className="stat-card">
            <div className="stat-value">{profile?.balance}₽</div>
            <div className="stat-label">Баланс</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{profile?.total_analyses}</div>
            <div className="stat-label">Анализов</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {profile?.last_login ? new Date(profile.last_login).toLocaleDateString('ru-RU') : 'Сегодня'}
            </div>
            <div className="stat-label">Последний вход</div>
          </div>
        </div>
      </div>

      <div className="profile-tabs">
        <button 
          className={`tab ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          👤 Профиль
        </button>
        <button 
          className={`tab ${activeTab === 'subscription' ? 'active' : ''}`}
          onClick={() => setActiveTab('subscription')}
        >
          ⭐ Подписка
        </button>
        <button 
          className={`tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📊 История операций
        </button>
        <button 
          className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          ⚙️ Настройки
        </button>
      </div>

      <div className="profile-content">
        {activeTab === 'profile' && (
          <div className="tab-content">
            <div className="card">
              <h3>Информация о профиле</h3>
              
              {error && <div className="error-message">{error}</div>}
              {success && <div className="success-message">{success}</div>}
              
              <div className="profile-form">
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={profile?.email} disabled />
                </div>
                
                <div className="form-group">
                  <label>Тип подписки</label>
                  <input type="text" value={profile?.subscription_type} disabled />
                </div>
                
                <div className="form-group">
                  <label>Дата регистрации</label>
                  <input 
                    type="text" 
                    value={new Date(profile?.created_at || '').toLocaleDateString('ru-RU')} 
                    disabled 
                  />
                </div>
                
                {editMode ? (
                  <div className="password-change">
                    <div className="form-group">
                      <label>Новый пароль</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Введите новый пароль"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Подтвердите пароль</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Повторите новый пароль"
                      />
                    </div>
                    
                    <div className="form-actions">
                      <button className="btn btn-primary" onClick={handlePasswordChange}>
                        Сохранить пароль
                      </button>
                      <button className="btn btn-secondary" onClick={() => setEditMode(false)}>
                        Отмена
                      </button>
                    </div>
                  </div>
                ) : (
                  <button className="btn btn-primary" onClick={() => setEditMode(true)}>
                    Изменить пароль
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'subscription' && (
          <div className="tab-content">
            <div className="subscription-plans">
              {subscriptionPlans.map((plan) => (
                <div 
                  key={plan.name}
                  className={`plan-card ${plan.name.toLowerCase()} ${profile?.subscription_type === plan.name ? 'current' : ''}`}
                >
                  <div className="plan-header">
                    <h3>{plan.name}</h3>
                    <div className="plan-price">
                      {plan.price === 0 ? 'Бесплатно' : `${plan.price}₽/мес`}
                    </div>
                    {profile?.subscription_type === plan.name && (
                      <span className="current-plan">Текущий план</span>
                    )}
                  </div>
                  
                  <div className="plan-features">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="feature">
                        <span className="feature-icon">✅</span>
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="plan-limits">
                    <h4>Лимиты:</h4>
                    <p>Товары в день: {plan.limits.products_per_day === -1 ? '∞' : plan.limits.products_per_day}</p>
                    <p>Бренды в день: {plan.limits.brands_per_day === -1 ? '∞' : plan.limits.brands_per_day}</p>
                    <p>Рекламные кампании: {plan.limits.ad_campaigns === -1 ? '∞' : plan.limits.ad_campaigns}</p>
                  </div>
                  
                  {profile?.subscription_type !== plan.name && (
                    <button 
                      className="btn btn-primary plan-button"
                      onClick={() => handleSubscriptionUpgrade(plan.name)}
                    >
                      {plan.price > 0 ? 'Перейти на план' : 'Понизить до Free'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="tab-content">
            <div className="card">
              <h3>История операций</h3>
              <div className="operations-list">
                {operations.map((operation) => (
                  <div key={operation.id} className="operation-item">
                    <div className="operation-icon">
                      {getOperationIcon(operation.type)}
                    </div>
                    <div className="operation-details">
                      <div className="operation-description">{operation.description}</div>
                      <div className="operation-date">
                        {new Date(operation.date).toLocaleString('ru-RU')}
                      </div>
                    </div>
                    <div className={`operation-amount ${getOperationColor(operation.type, operation.amount)}`}>
                      {operation.amount > 0 ? '+' : ''}{operation.amount}₽
                    </div>
                    <div className={`operation-status ${operation.status}`}>
                      {operation.status === 'completed' ? '✅' : '⏳'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="tab-content">
            <div className="card">
              <h3>Настройки аккаунта</h3>
              
              <div className="settings-section">
                <h4>Безопасность</h4>
                <div className="setting-item">
                  <span>Двухфакторная аутентификация</span>
                  <button className="btn btn-secondary">Настроить</button>
                </div>
                <div className="setting-item">
                  <span>Активные сессии</span>
                  <button className="btn btn-secondary">Просмотреть</button>
                </div>
              </div>
              
              <div className="settings-section">
                <h4>Уведомления</h4>
                <div className="setting-item">
                  <label className="checkbox-label">
                    <input type="checkbox" defaultChecked />
                    <span>Email уведомления</span>
                  </label>
                </div>
                <div className="setting-item">
                  <label className="checkbox-label">
                    <input type="checkbox" defaultChecked />
                    <span>Уведомления о новых функциях</span>
                  </label>
                </div>
              </div>
              
              <div className="settings-section">
                <h4>Экспорт данных</h4>
                <div className="setting-item">
                  <span>Скачать все ваши данные</span>
                  <button className="btn btn-secondary">Экспорт</button>
                </div>
              </div>
              
              <div className="settings-section danger-zone">
                <h4>Опасная зона</h4>
                <div className="setting-item">
                  <span>Удалить аккаунт</span>
                  <button className="btn btn-danger">Удалить</button>
                </div>
                <div className="setting-item">
                  <span>Выйти из аккаунта</span>
                  <button className="btn btn-secondary" onClick={logout}>Выйти</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile; 