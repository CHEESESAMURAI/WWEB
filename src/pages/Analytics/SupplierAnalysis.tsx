import React, { useState } from 'react';
import { Truck, Search, Package, Sparkles, CheckCircle } from 'lucide-react';
import { analysisAPI } from '../../services/api';
import { SupplierAnalysis as SupplierAnalysisType } from '../../types';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import LoadingSpinner from '../../components/UI/LoadingSpinner';

const SupplierAnalysis: React.FC = () => {
  const [supplier, setSupplier] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SupplierAnalysisType | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplier.trim()) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await analysisAPI.analyzeSupplier(supplier.trim());
      if (res.success && res.data) {
        setResult(res.data as SupplierAnalysisType);
        console.log("Supplier Analysis Result:", res.data);
      } else {
        setError(res.error || 'Ошибка анализа поставщика');
      }
    } catch (e) {
      setError('Ошибка анализа поставщика');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (n: number) => n.toLocaleString('ru-RU');
  const formatPrice = (p: number) => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0 }).format(p);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Truck className="w-6 h-6 mr-2 text-primary-600" /> Анализ поставщика
          </h1>
          <p className="text-gray-600 mt-1">Статистика поставщика и топ-товары</p>
        </div>
        <div className="text-sm text-gray-500">Стоимость: 30₽</div>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Название или ИНН поставщика</label>
            <div className="flex space-x-4">
              <input
                type="text"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="ООО Ромашка или 1234567890"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
              <Button type="submit" loading={loading} disabled={!supplier.trim()} icon={<Search className="w-4 h-4" />}>Анализировать</Button>
            </div>
          </div>
          <p className="text-sm text-gray-500">Получите общий объём продаж, топ-товары и распределение по категориям.</p>
        </form>
      </Card>

      {loading && (
        <Card>
          <div className="flex flex-col items-center py-12">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-600">Анализируем поставщика...</p>
          </div>
        </Card>
      )}

      {error && (
        <Card>
          <div className="text-center py-8 text-red-600 font-medium">{error}</div>
        </Card>
      )}

      {result && (
        <div className="space-y-6">
          <Card>
            <h2 className="text-xl font-semibold mb-4">📊 Основное</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            </div>
          </Card>

          {/* Top Products */}
          {result.topProducts && result.topProducts.length > 0 && (
            <Card>
              <h3 className="text-lg font-semibold mb-4 flex items-center"><Package className="w-5 h-5 mr-2 text-primary-600" /> Топ-товары</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Артикул</th>
                      <th className="px-4 py-2 text-left">Название</th>
                      <th className="px-4 py-2 text-right">Продаж</th>
                      <th className="px-4 py-2 text-right">Выручка</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {result.topProducts.map((p) => (
                      <tr key={p.article} className="hover:bg-gray-50">
                        <td className="px-4 py-2 whitespace-nowrap font-medium">
                          {p.article}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">{p.name}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-right">{formatNumber(p.sales)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-right">{formatPrice(p.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Recommendations */}
          {result.recommendations && result.recommendations.length > 0 && (
            <Card>
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <Sparkles className="w-5 h-5 mr-2 text-primary-600" /> Рекомендации по развитию
                </h3>
                <ul className="space-y-3 text-gray-700">
                    {result.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start">
                            <CheckCircle className="w-5 h-5 mr-3 text-green-500 mt-1 flex-shrink-0" />
                            <span>{rec}</span>
                        </li>
                    ))}
                </ul>
            </Card>
          )}

        </div>
      )}
    </div>
  );
};

export default SupplierAnalysis; 