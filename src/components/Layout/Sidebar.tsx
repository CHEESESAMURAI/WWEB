import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  BarChart3,
  Search,
  TrendingUp,
  Package,
  Target,
  Brain,
  Users,
  Calendar,
  Globe,
  Sparkles,
  Settings,
  User,
  CreditCard,
  Home,
  BookOpen,
  Truck,
  Monitor,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  emoji?: string;
  badge?: string;
  children?: NavItem[];
}

const Sidebar: React.FC = () => {
  const { user, subscriptionStats } = useAuth();

  const navigation: NavItem[] = [
    {
      name: 'Дашборд',
      href: '/dashboard',
      icon: Home,
      emoji: '📊',
    },
    {
      name: 'Аналитика',
      href: '/analytics',
      icon: BarChart3,
      emoji: '📈',
      children: [
        { name: 'Анализ товара', href: '/analytics/product', icon: Package, emoji: '📦' },
        { name: 'Анализ бренда', href: '/analytics/brand', icon: Target, emoji: '🎯' },
        { name: 'Анализ ниши', href: '/analytics/niche', icon: TrendingUp, emoji: '📊' },
        { name: 'Анализ поставщика', href: '/analytics/supplier', icon: Truck, emoji: '🚚' },
        { name: 'Анализ категории', href: '/analytics/category', icon: BookOpen, emoji: '📚' },
        { name: 'Анализ сезонности', href: '/analytics/seasonality', icon: Calendar, emoji: '📅' },
        { name: 'Анализ внешки', href: '/analytics/external', icon: Globe, emoji: '🌐' },
      ],
    },
    {
      name: 'Планирование',
      href: '/planning',
      icon: Calendar,
      emoji: '📅',
      children: [
        { name: 'План поставок', href: '/planning/supply', icon: Package, emoji: '📦' },
        { name: 'Мониторинг рекламы', href: '/planning/ads', icon: Monitor, emoji: '📊' },
      ],
    },
    {
      name: 'Поиск',
      href: '/search',
      icon: Search,
      emoji: '🔍',
      children: [
        { name: 'Глобальный поиск', href: '/search/global', icon: Globe, emoji: '🌐' },
        { name: 'Поиск блогеров', href: '/search/bloggers', icon: Users, emoji: '👥' },
      ],
    },
    {
      name: 'ИИ помощник',
      href: '/ai',
      icon: Brain,
      emoji: '🤖',
      children: [
        { name: 'Генерация контента', href: '/ai/generate', icon: Sparkles, emoji: '✨' },
        { name: 'Оракул запросов', href: '/ai/oracle', icon: Brain, emoji: '🧠' },
      ],
    },
  ];

  const accountNavigation: NavItem[] = [
    { name: 'Профиль', href: '/profile', icon: User, emoji: '👤' },
    { name: 'Подписка', href: '/subscription', icon: CreditCard, emoji: '💳' },
    { name: 'Настройки', href: '/settings', icon: Settings, emoji: '⚙️' },
  ];

  const NavItem: React.FC<{ item: NavItem; level?: number }> = ({ item, level = 0 }) => {
    const hasChildren = item.children && item.children.length > 0;
    
    return (
      <div>
        <NavLink
          to={item.href}
          className={({ isActive }) =>
            `group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
              level === 0 ? 'pl-3' : 'pl-8'
            } ${
              isActive
                ? 'bg-primary-600 text-white'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`
          }
        >
          {item.emoji && <span className="mr-2 text-lg">{item.emoji}</span>}
          <item.icon
            className={`mr-3 flex-shrink-0 h-5 w-5 ${
              level === 0 ? '' : 'h-4 w-4'
            }`}
            aria-hidden="true"
          />
          {item.name}
          {item.badge && (
            <span className="ml-auto inline-block py-0.5 px-2 text-xs font-medium rounded-full bg-primary-100 text-primary-600">
              {item.badge}
            </span>
          )}
        </NavLink>
        
        {hasChildren && (
          <div className="mt-1 space-y-1">
            {item.children!.map((child) => (
              <NavItem key={child.href} item={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  const getSubscriptionColor = (subscription: string) => {
    switch (subscription) {
      case 'business':
        return 'bg-yellow-100 text-yellow-800';
      case 'pro':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center flex-shrink-0 px-4 py-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="ml-3">
            <p className="text-lg font-semibold text-gray-900">
              Wild Analytics
            </p>
          </div>
        </div>
      </div>

      {/* User info */}
      {user && (
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-gray-600" />
              </div>
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user.username || user.email}
              </p>
              <div className="flex items-center mt-1">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getSubscriptionColor(
                    user.subscription
                  )}`}
                >
                  {user.subscription.toUpperCase()}
                </span>
                <span className="ml-2 text-xs text-gray-500">
                  {user.balance}₽
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => (
          <NavItem key={item.href} item={item} />
        ))}
      </nav>

      {/* Account navigation */}
      <div className="border-t border-gray-200 pt-4 pb-4">
        <nav className="px-2 space-y-1">
          {accountNavigation.map((item) => (
            <NavItem key={item.href} item={item} />
          ))}
        </nav>
      </div>

      {/* Subscription limits */}
      {subscriptionStats && (
        <div className="px-4 py-3 border-t border-gray-200">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Лимиты
          </h4>
          <div className="mt-2 space-y-2">
            {Object.entries(subscriptionStats.actions).slice(0, 3).map(([action, data]) => {
              const percentage = data.limit === 'unlimited' ? 0 : (data.used / (data.limit as number)) * 100;
              return (
                <div key={action} className="flex items-center justify-between text-xs">
                  <span className="text-gray-600 truncate">{action}</span>
                  <div className="flex items-center ml-2">
                    <span className="text-gray-900">
                      {data.used}/{data.limit === 'unlimited' ? '∞' : data.limit}
                    </span>
                    {data.limit !== 'unlimited' && (
                      <div className="ml-2 w-8 bg-gray-200 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${
                            percentage > 80 ? 'bg-red-500' : percentage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar; 