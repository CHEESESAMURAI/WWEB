import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  Package,
  Target,
  TrendingUp,
  Calendar,
  Users,
  Brain,
  Globe,
  Truck,
  Monitor,
  Plus,
  ArrowRight,
  Activity,
  DollarSign,
  ShoppingCart,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { userAPI } from '../services/api';
import { DashboardData, TrackedItem } from '../types';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import LoadingSpinner from '../components/UI/LoadingSpinner';

interface QuickAction {
  name: string;
  href: string;
  icon: React.ElementType;
  description: string;
  color: string;
  cost?: number;
}

const Dashboard: React.FC = () => {
  const { user, subscriptionStats } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await userAPI.getDashboardData();
        if (response.success && response.data) {
          setDashboardData(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const quickActions: QuickAction[] = [
    {
      name: 'Анализ товара',
      href: '/analytics/product',
      icon: Package,
      description: 'Подробный анализ конкретного товара',
      color: 'bg-blue-500',
      cost: 10,
    },
    {
      name: 'Анализ бренда',
      href: '/analytics/brand',
      icon: Target,
      description: 'Исследование бренда и конкурентов',
      color: 'bg-purple-500',
      cost: 20,
    },
    {
      name: 'Анализ ниши',
      href: '/analytics/niche',
      icon: TrendingUp,
      description: 'Изучение рыночной ниши',
      color: 'bg-green-500',
      cost: 25,
    },
    {
      name: 'План поставок',
      href: '/planning/supply',
      icon: Truck,
      description: 'Планирование пополнения товаров',
      color: 'bg-orange-500',
      cost: 30,
    },
    {
      name: 'Мониторинг рекламы',
      href: '/planning/ads',
      icon: Monitor,
      description: 'Анализ эффективности рекламы',
      color: 'bg-red-500',
      cost: 35,
    },
    {
      name: 'ИИ помощник',
      href: '/ai/generate',
      icon: Brain,
      description: 'Генерация контента с помощью ИИ',
      color: 'bg-indigo-500',
      cost: 15,
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" text="Загрузка дашборда..." />
      </div>
    );
  }

  const getSubscriptionColor = (subscription: string) => {
    switch (subscription) {
      case 'business':
        return 'text-yellow-600 bg-yellow-100';
      case 'pro':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              Добро пожаловать, {user?.username || 'Пользователь'}!
            </h1>
            <p className="text-primary-100 mt-1">
              Ваш персональный центр аналитики Wildberries
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-primary-100">Баланс</div>
            <div className="text-2xl font-bold">{user?.balance}₽</div>
            <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSubscriptionColor(user?.subscription || 'free')}`}>
              {user?.subscription.toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <BarChart3 className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Всего анализов
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {dashboardData?.recentAnalyses.length || 0}
                </dd>
              </dl>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ShoppingCart className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Отслеживаемых товаров
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {dashboardData?.trackedItems.length || 0}
                </dd>
              </dl>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Activity className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Активность
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  Высокая
                </dd>
              </dl>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DollarSign className="h-8 w-8 text-orange-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Экономия
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {Math.floor(Math.random() * 50000)}₽
                </dd>
              </dl>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Quick Actions */}
        <div className="lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">
                Быстрые действия
              </h3>
              <Link
                to="/analytics"
                className="text-sm text-primary-600 hover:text-primary-500 font-medium"
              >
                Все инструменты
              </Link>
            </div>
            
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  to={action.href}
                  className="relative group bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                >
                  <div className="flex items-start">
                    <div className={`flex-shrink-0 w-8 h-8 ${action.color} rounded-lg flex items-center justify-center`}>
                      <action.icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="ml-4 flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-900">
                          {action.name}
                        </h4>
                        {action.cost && (
                          <span className="text-xs text-gray-500">
                            {action.cost}₽
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        {action.description}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors duration-200" />
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        </div>

        {/* Recent Activity & Tracked Items */}
        <div className="space-y-6">
          {/* Recent Analyses */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Последние анализы
              </h3>
              <Link
                to="/profile"
                className="text-sm text-primary-600 hover:text-primary-500"
              >
                Все
              </Link>
            </div>
            
            {dashboardData?.recentAnalyses.length ? (
              <div className="space-y-3">
                {dashboardData.recentAnalyses.slice(0, 5).map((analysis, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-primary-400 rounded-full" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate">
                        {analysis.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(analysis.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  Анализов пока нет
                </h3>
                <p className="mt-1 text-xs text-gray-500">
                  Начните с анализа товара или бренда
                </p>
                <div className="mt-3">
                  <Button size="sm" variant="primary">
                    <Plus className="w-4 h-4 mr-2" />
                    Новый анализ
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* Tracked Items */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Отслеживаемые товары
              </h3>
              <Link
                to="/tracking"
                className="text-sm text-primary-600 hover:text-primary-500"
              >
                Все
              </Link>
            </div>
            
            {dashboardData?.trackedItems.length ? (
              <div className="space-y-3">
                {dashboardData.trackedItems.slice(0, 3).map((item) => (
                  <div key={item.article} className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate">
                        {item.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        Арт. {item.article}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {item.price}₽
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.stock} шт.
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <Package className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  Товаров нет
                </h3>
                <p className="mt-1 text-xs text-gray-500">
                  Добавьте товары для отслеживания
                </p>
                <div className="mt-3">
                  <Button size="sm" variant="primary">
                    <Plus className="w-4 h-4 mr-2" />
                    Добавить товар
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Subscription Limits */}
      {subscriptionStats && (
        <Card>
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Использование лимитов подписки
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(subscriptionStats.actions).map(([action, data]) => {
              const percentage = data.limit === 'unlimited' ? 0 : (data.used / (data.limit as number)) * 100;
              return (
                <div key={action} className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-700 capitalize">
                      {action.replace('_', ' ')}
                    </h4>
                    <span className="text-sm text-gray-500">
                      {data.used}/{data.limit === 'unlimited' ? '∞' : data.limit}
                    </span>
                  </div>
                  {data.limit !== 'unlimited' && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          percentage > 80 ? 'bg-red-500' : percentage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
};

export default Dashboard; 