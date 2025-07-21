import React, { useState } from 'react';
import { Brain, Search } from 'lucide-react';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { analysisAPI } from '../../services/api';

interface OracleResult {
  category: string;
  total_revenue: number;
  total_sales: number;
  avg_price: number;
  monopoly_level: number;
  ad_percentage: number;
  top_products: Array<{
    name: string;
    revenue: number;
    sales: number;
    price: number;
  }>;
}

const OracleQueries: React.FC = () => {
  const [queriesCount, setQueriesCount] = useState(3);
  const [month, setMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [minRevenue, setMinRevenue] = useState(0);
  const [minFrequency, setMinFrequency] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<OracleResult[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (queriesCount < 1 || queriesCount > 5) {
      setError('Количество запросов должно быть от 1 до 5');
      return;
    }

    setLoading(true);
    setError('');
    setResults([]);

    try {
      const response = await analysisAPI.analyzeOracleQueries(
        queriesCount,
        month,
        minRevenue,
        minFrequency
      );

      if (response.success && response.data && (response.data as any).results) {
        setResults((response.data as any).results);
      } else {
        setError(response.error || 'Нет данных для отображения');
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка сервера');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Brain className="w-6 h-6 mr-2 text-primary-600" />
            Оракул запросов
          </h1>
          <p className="text-gray-600 mt-1">
            Детальный анализ поисковых запросов на Wildberries
          </p>
        </div>
        <div className="text-sm text-gray-500">Стоимость: 50₽</div>
      </div>

      {/* Form */}
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Количество запросов (1-5)
              </label>
              <input
                type="number"
                min={1}
                max={5}
                value={queriesCount}
                onChange={(e) => setQueriesCount(Number(e.target.value))}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Месяц (YYYY-MM)</label>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Минимальная выручка (₽)
              </label>
              <input
                type="number"
                value={minRevenue}
                onChange={(e) => setMinRevenue(Number(e.target.value))}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Минимальная частотность
              </label>
              <input
                type="number"
                value={minFrequency}
                onChange={(e) => setMinFrequency(Number(e.target.value))}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
          <Button type="submit" icon={<Search className="w-4 h-4" />} loading={loading}>
            Анализировать
          </Button>
        </form>
      </Card>

      {/* Loading */}
      {loading && (
        <Card>
          <div className="flex flex-col items-center justify-center py-12">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-600">Оракул анализирует запросы...</p>
            <p className="text-sm text-gray-500 mt-2">Это может занять до 1 минуты</p>
          </div>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card>
          <div className="text-center py-8">
            <div className="text-red-600 text-lg font-medium mb-2">Ошибка</div>
            <p className="text-gray-600">{error}</p>
          </div>
        </Card>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-6">
          {results.map((res, idx) => (
            <Card key={idx}>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="mr-2 text-xl">🏆</span>
                {idx + 1}. Категория: {res.category}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-700">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-xs text-blue-600 font-medium">Общая выручка</div>
                  <div className="text-xl font-bold text-blue-900">
                    {formatPrice(res.total_revenue)}
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-xs text-green-600 font-medium">Продаж</div>
                  <div className="text-xl font-bold text-green-900">
                    {res.total_sales.toLocaleString('ru-RU')}
                  </div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="text-xs text-yellow-600 font-medium">Средняя цена</div>
                  <div className="text-xl font-bold text-yellow-900">
                    {formatPrice(res.avg_price)}
                  </div>
                </div>
              </div>

              {/* Extra metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="flex items-center space-x-2 text-sm text-gray-700">
                  <span>🎯 Монополизация:</span>
                  <span className="font-semibold">{res.monopoly_level.toFixed(1)}%</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-700">
                  <span>📢 Реклама:</span>
                  <span className="font-semibold">{res.ad_percentage.toFixed(1)}%</span>
                </div>
              </div>

              {/* Top products */}
              {res.top_products?.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-md font-medium text-gray-900 mb-2">Топ товары</h4>
                  <div className="space-y-2 text-sm">
                    {res.top_products.map((p, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span>
                          {i + 1}. {p.name}
                        </span>
                        <span className="text-gray-600">
                          {formatPrice(p.revenue)} / {p.sales.toLocaleString()} шт.
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default OracleQueries; 