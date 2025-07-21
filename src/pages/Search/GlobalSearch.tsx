import React, { useState } from 'react';
import { analysisAPI } from '../../services/api';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import Card from '../../components/UI/Card';

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

const GlobalSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await analysisAPI.globalSearch(query.trim());
      if (res.success && res.data) {
        setResults(res.data.results || []);
      } else {
        setError(res.message || 'Ошибка получения данных');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  const platformColors: { [key: string]: string } = {
    instagram: 'bg-pink-500',
    vk: 'bg-blue-500',
    youtube: 'bg-red-600',
    telegram: 'bg-cyan-500',
    facebook: 'bg-blue-700',
    twitter: 'bg-blue-400',
    unknown: 'bg-gray-400',
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-500 to-purple-700 min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-lg">🌐 Глобальный поиск и анализ рекламы</h1>
          <p className="text-indigo-100">Поиск и анализ рекламных размещений в социальных сетях</p>
        </div>

        <div className="grid gap-6 mb-8">
          <Card>
            <div className="bg-white rounded-lg">
              <div className="p-6">
                <div className="mb-6">
                  <p className="text-gray-700 mb-4">
                    Введите артикул товара или название для анализа.<br />
                    Например: <code className="bg-gray-100 px-2 py-1 rounded text-primary-600">176409037</code> или <code className="bg-gray-100 px-2 py-1 rounded text-primary-600">Носки</code>
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-semibold mb-2">🔍 Анализ включает в себя:</h3>
                      <ul className="list-disc list-inside space-y-1 text-gray-600">
                        <li>Данные о продажах товара</li>
                        <li>Статистика рекламных кампаний</li>
                        <li>Эффективность блогеров</li>
                        <li>Прирост заказов и выручки после рекламы</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold mb-2">📊 Метрики в отчете:</h3>
                      <ul className="list-disc list-inside space-y-1 text-gray-600">
                        <li>Суммарная частотность и выручка</li>
                        <li>Прирост количества заказов</li>
                        <li>Эффективность рекламных публикаций</li>
                        <li>Рекомендации по блогерам</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Введите артикул товара или название"
                    className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                  />
                  <button
                    onClick={handleSearch}
                    disabled={loading}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? 'Поиск...' : 'Поиск'}
                  </button>
                </div>
              </div>
            </div>
          </Card>

          {loading && (
            <Card>
              <div className="flex flex-col items-center justify-center p-8 space-y-4">
                <LoadingSpinner />
                <div className="text-gray-600">
                  <p className="font-semibold mb-2">Выполняется комплексный анализ рекламных данных...</p>
                  <ul className="space-y-1 text-sm">
                    <li>⚙️ Этап 1: Запрос данных</li>
                    <li>⏳ Этап 2: Анализ социальных сетей</li>
                    <li>🔄 Этап 3: Объединение результатов</li>
                    <li>📊 Этап 4: Генерация рекомендаций</li>
                  </ul>
                </div>
              </div>
            </Card>
          )}

          {error && (
            <Card>
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            </Card>
          )}

          {results.length > 0 && (
            <Card>
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Найдено результатов: {results.length}
                  </h2>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">Сортировка по:</span>
                    <select className="text-sm border rounded-md px-2 py-1">
                      <option value="date">Дате</option>
                      <option value="revenue">Выручке</option>
                      <option value="orders">Заказам</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-6">
                  {results.map((item, idx) => (
                    <div
                      key={idx}
                      className="transform transition-all duration-200 hover:scale-[1.02]"
                    >
                      <div className="bg-white border rounded-xl shadow-sm hover:shadow-md transition-shadow p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <span
                              className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${
                                platformColors[item.platform] || platformColors.unknown
                              }`}
                            >
                              <span className="text-white text-lg">
                                {item.platform === 'instagram' && '📸'}
                                {item.platform === 'vk' && '💬'}
                                {item.platform === 'youtube' && '🎥'}
                                {item.platform === 'telegram' && '📱'}
                                {item.platform === 'facebook' && '👥'}
                                {item.platform === 'twitter' && '🐦'}
                                {!['instagram', 'vk', 'youtube', 'telegram', 'facebook', 'twitter'].includes(item.platform) && '🌐'}
                              </span>
                            </span>
                            <div>
                              <h3 className="font-semibold text-gray-900 capitalize">
                                {item.platform}
                              </h3>
                              <p className="text-sm text-gray-500">{item.date}</p>
                            </div>
                          </div>
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-600 hover:text-primary-700 font-medium text-sm flex items-center space-x-1"
                          >
                            <span>Открыть</span>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        </div>

                        <div className="mb-6">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-gray-600">Автор:</span>
                            <span className="font-medium text-gray-900">{item.author}</span>
                          </div>
                          <p className="text-sm text-gray-600 break-all">{item.url}</p>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                          <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-sm text-gray-500 mb-1">Охват</p>
                            <p className="text-lg font-semibold text-gray-900">
                              {item.sales_impact.frequency.toLocaleString()}
                            </p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-sm text-gray-500 mb-1">Заказы</p>
                            <p className="text-lg font-semibold text-gray-900">
                              {item.sales_impact.orders.toLocaleString()}
                            </p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-sm text-gray-500 mb-1">Выручка</p>
                            <p className="text-lg font-semibold text-gray-900">
                              {item.sales_impact.revenue.toLocaleString()}₽
                            </p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-sm text-gray-500 mb-1">Средняя цена</p>
                            <p className="text-lg font-semibold text-gray-900">
                              {item.sales_impact.avg_price.toLocaleString()}₽
                            </p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div>
                              <p className="text-sm text-gray-500 mb-1">Рост продаж</p>
                              <div className="flex items-center space-x-2">
                                <p className={`text-lg font-semibold ${
                                  item.sales_impact.orders_growth_percent > 0
                                    ? 'text-green-600'
                                    : 'text-red-600'
                                }`}>
                                  {item.sales_impact.orders_growth_percent > 0 ? '+' : ''}
                                  {item.sales_impact.orders_growth_percent}%
                                </p>
                                <span className={`text-xl ${
                                  item.sales_impact.orders_growth_percent > 0
                                    ? 'text-green-600'
                                    : 'text-red-600'
                                }`}>
                                  {item.sales_impact.orders_growth_percent > 0 ? '📈' : '📉'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {results.length === 0 && !loading && !error && (
            <Card>
              <div className="text-center text-gray-500 p-8">
                Введите артикул товара или название и нажмите «Поиск»
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default GlobalSearch; 