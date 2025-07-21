import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

interface DashboardStats {
  balance: number;
  subscription_tier: string;
  analyses_used: number;
  analyses_limit: number;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/user/dashboard');
        setStats(response.data);
      } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return <div className="container">Загрузка...</div>;
  }

  return (
    <div className="container">
      <h1>Дашборд Wild Analytics</h1>
      
      <div className="grid grid-cols-2" style={{ marginTop: '20px' }}>
        <div className="card">
          <h3>Добро пожаловать, {user?.username}!</h3>
          <p>Email: {user?.email}</p>
          {stats && (
            <>
              <p>Баланс: {stats.balance}₽</p>
              <p>Подписка: {stats.subscription_tier}</p>
              <p>Анализов использовано: {stats.analyses_used}/{stats.analyses_limit}</p>
            </>
          )}
        </div>
        
        <div className="card">
          <h3>Быстрые действия</h3>
          <div className="space-y-4">
            <button className="btn" style={{ width: '100%', marginBottom: '10px' }}>
              Анализ товара
            </button>
            <button className="btn" style={{ width: '100%', marginBottom: '10px' }}>
              Анализ ниши
            </button>
            <button className="btn" style={{ width: '100%' }}>
              Мониторинг рекламы
            </button>
          </div>
        </div>
      </div>
      
      <div className="card" style={{ marginTop: '20px' }}>
        <h3>Последняя активность</h3>
        <p>Здесь будет отображаться история анализов и действий пользователя</p>
      </div>
    </div>
  );
};

export default Dashboard;
