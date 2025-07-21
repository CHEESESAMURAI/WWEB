import React, { useState } from 'react';
import './GlobalSearch.css';
import FormattedNumber from '../components/UI/FormattedNumber';

interface SalesImpact {
  frequency: number;
  revenue: number;
  orders: number;
  avg_price: number;
  orders_growth_percent: number;
  revenue_growth_percent: number;
}

interface SearchResult {
  platform: string;
  url: string;
  date: string;
  author: string;
  sales_impact: SalesImpact;
}

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const GlobalSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    setResults([]);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/analysis/global-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ query: query.trim() }),
      });

      if (!response.ok) {
        throw new Error('Ошибка при выполнении поиска');
      }

      const data = await response.json();
      setResults(data.data.results || []);
    } catch (err: any) {
      setError(err.message || 'Ошибка при выполнении поиска');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const platformColors: { [key: string]: string } = {
    instagram: 'bg-gradient-to-r from-purple-500 to-pink-500',
    vk: 'bg-gradient-to-r from-blue-500 to-blue-600',
    youtube: 'bg-gradient-to-r from-red-500 to-red-600',
    telegram: 'bg-gradient-to-r from-blue-400 to-blue-500',
    facebook: 'bg-gradient-to-r from-blue-600 to-blue-700',
    twitter: 'bg-gradient-to-r from-blue-400 to-blue-500',
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'instagram': return '📸';
      case 'vk': return '💬';
      case 'youtube': return '🎥';
      case 'telegram': return '📱';
      case 'facebook': return '👥';
      case 'twitter': return '🐦';
      default: return '🌐';
    }
  };

  return (
    <div className="analysis-container">
      <div className="analysis-header">
        <h1>🌐 Глобальный поиск</h1>
        <p className="analysis-description">
          Поиск и анализ упоминаний товаров в социальных сетях и медиа
        </p>
      </div>

      <div className="analysis-card">
        <div className="card-content">
          <div className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">🔍 Возможности поиска:</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>Поиск по артикулу товара</li>
                  <li>Поиск по названию бренда</li>
                  <li>Анализ рекламных размещений</li>
                  <li>Оценка эффективности публикаций</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">📊 Метрики анализа:</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>Охват и вовлеченность</li>
                  <li>Влияние на продажи</li>
                  <li>Рост заказов после рекламы</li>
                  <li>Эффективность площадок</li>
                </ul>
              </div>
            </div>

            <div className="search-box">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Введите артикул товара или название бренда..."
                className="search-input"
              />
              <button
                onClick={handleSearch}
                disabled={loading}
                className="search-button"
              >
                {loading ? 'Поиск...' : 'Найти'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div className="analysis-card">
          <div className="card-content flex items-center justify-center p-8">
            <div className="text-center">
              <div className="loader mb-4"></div>
              <p className="text-gray-600">Выполняется поиск и анализ данных...</p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="analysis-card">
          <div className="card-content">
            <div className="error-message">
              {error}
            </div>
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="analysis-card">
          <div className="card-content">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">
                Найдено результатов: {results.length}
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Сортировка: </span>
                <select className="select-input">
                  <option value="date">По дате</option>
                  <option value="impact">По влиянию</option>
                </select>
              </div>
            </div>

            <div className="space-y-6">
              {results.map((item, idx) => (
                <div key={idx} className="result-card">
                  <div className={`result-header ${platformColors[item.platform.toLowerCase()] || 'bg-gradient-to-r from-gray-500 to-gray-600'}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getPlatformIcon(item.platform)}</span>
                      <div>
                        <h3 className="text-lg font-semibold text-white">
                          {item.platform}
                        </h3>
                        <p className="text-sm text-white/80">{item.date}</p>
                      </div>
                    </div>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white hover:text-white/80 transition-colors"
                    >
                      Открыть ↗
                    </a>
                  </div>

                  <div className="p-4">
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-gray-600">Автор: </span>
                        <span className="font-medium">{item.author}</span>
                      </div>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 break-all"
                      >
                        {item.url}
                      </a>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="stat-card">
                        <p className="stat-label">Охват: </p>
                        <p className="stat-value">
                          <FormattedNumber value={item.sales_impact.frequency} />
                        </p>
                      </div>
                      <div className="stat-card">
                        <p className="stat-label">Заказы: </p>
                        <p className="stat-value">
                          <FormattedNumber value={item.sales_impact.orders} />
                        </p>
                      </div>
                      <div className="stat-card">
                        <p className="stat-label">Выручка: </p>
                        <p className="stat-value">
                          <FormattedNumber value={item.sales_impact.revenue} suffix="₽" />
                        </p>
                      </div>
                      <div className="stat-card">
                        <p className="stat-label">Средний чек: </p>
                        <p className="stat-value">
                          <FormattedNumber value={item.sales_impact.avg_price} suffix="₽" />
                        </p>
                      </div>
                      <div className="stat-card">
                        <p className="stat-label">Рост продаж: </p>
                        <div className="flex items-center gap-2">
                          <p className={`stat-value ${
                            item.sales_impact.orders_growth_percent > 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}>
                            {item.sales_impact.orders_growth_percent > 0 ? '+' : ''}
                            <FormattedNumber value={item.sales_impact.orders_growth_percent} suffix="%" />
                          </p>
                          <span className="text-xl">
                            {item.sales_impact.orders_growth_percent > 0 ? '📈' : '📉'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {results.length === 0 && !loading && !error && (
        <div className="analysis-card">
          <div className="card-content text-center py-12">
            <p className="text-gray-500">
              Введите артикул товара или название бренда и нажмите «Найти»
            </p>
            <p className="text-gray-400 mt-2">
              Например: <code className="text-primary-600">176409037</code> или <code className="text-primary-600">ZARA</code>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalSearch; 