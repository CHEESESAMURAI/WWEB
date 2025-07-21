import React, { useState } from 'react';
import { Target, Search, BarChart3, Package } from 'lucide-react';
import { analysisAPI } from '../../services/api';
import { BrandAnalysis as BrandAnalysisType } from '../../types';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import LoadingSpinner from '../../components/UI/LoadingSpinner';

const BrandAnalysis: React.FC = () => {
  const [brand, setBrand] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BrandAnalysisType | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brand.trim()) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await analysisAPI.analyzeBrand(brand.trim());
      if (response.success && response.data) {
        setResult(response.data as BrandAnalysisType);
      } else {
        setError(response.error || 'Ошибка анализа бренда');
      }
    } catch (err) {
      setError('Ошибка анализа бренда');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (n: number) => n.toLocaleString('ru-RU');
  const formatPrice = (p: number) => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0 }).format(p);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Target className="w-6 h-6 mr-2 text-primary-600" />
            Анализ бренда
          </h1>
          <p className="text-gray-600 mt-1">Подробный анализ бренда на Wildberries</p>
        </div>
        <div className="text-sm text-gray-500">Стоимость: 25₽</div>
      </div>

      {/* Form */}
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Название бренда</label>
            <div className="flex space-x-4">
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Напр.: Nike"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
              <Button type="submit" loading={loading} disabled={!brand.trim()} icon={<Search className="w-4 h-4" />}>Анализировать</Button>
            </div>
          </div>
          <p className="text-sm text-gray-500">
            Анализ включает общее количество товаров, среднюю цену, суммарные продажи и распределение по категориям.
          </p>
        </form>
      </Card>

      {/* Loading */}
      {loading && (
        <Card>
          <div className="flex flex-col items-center justify-center py-12">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-600">Анализируем бренд...</p>
          </div>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card>
          <div className="text-center py-8 text-red-600 font-medium">{error}</div>
        </Card>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6">
          <Card>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">📊 Основные показатели</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <p className="text-sm text-blue-600">Товаров</p>
                <p className="text-2xl font-bold text-blue-900">{formatNumber(result.totalProducts)}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <p className="text-sm text-green-600">Средняя цена</p>
                <p className="text-2xl font-bold text-green-900">{formatPrice(result.averagePrice)}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg text-center">
                <p className="text-sm text-purple-600">Продажи</p>
                <p className="text-2xl font-bold text-purple-900">{formatNumber(result.totalSales)}</p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg text-center">
                <p className="text-sm text-yellow-600">Категорий</p>
                <p className="text-2xl font-bold text-yellow-900">{Object.keys(result.categories).length}</p>
              </div>
            </div>
          </Card>

          {/* Category distribution */}
          <Card>
            <h3 className="text-lg font-semibold mb-4 flex items-center"><Package className="w-5 h-5 mr-2 text-primary-600" /> Товары по категориям</h3>
            <ul className="space-y-1 text-gray-700 text-sm">
              {Object.entries(result.categories).map(([cat, count]) => (
                <li key={cat} className="flex justify-between">
                  <span>{cat}</span>
                  <span className="font-medium">{formatNumber(count as number)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
};

export default BrandAnalysis; 