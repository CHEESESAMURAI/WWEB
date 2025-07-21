import React, { useState } from 'react';
import { BookOpen, Search } from 'lucide-react';
import { analysisAPI } from '../../services/api';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import LoadingSpinner from '../../components/UI/LoadingSpinner';

const CategoryAnalysis: React.FC = () => {
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await analysisAPI.analyzeCategory(category.trim());
      if (res.success && res.data) {
        setResult(res.data);
      } else {
        setError(res.error || 'Ошибка анализа категории');
      }
    } catch (e) {
      setError('Ошибка анализа категории');
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
          <h1 className="text-2xl font-bold text-gray-900 flex items-center"><BookOpen className="w-6 h-6 mr-2 text-primary-600" /> Анализ категории</h1>
          <p className="text-gray-600 mt-1">Анализ спроса и предложений в выбранной категории Wildberries</p>
        </div>
        <div className="text-sm text-gray-500">Стоимость: 20₽</div>
      </div>
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Путь категории (Женщинам/Платья)</label>
            <div className="flex space-x-4">
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Женщинам/Платья"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
              <Button type="submit" loading={loading} disabled={!category.trim()} icon={<Search className="w-4 h-4" />}>Анализировать</Button>
            </div>
          </div>
          <p className="text-sm text-gray-500">Категорию можно скопировать из адресной строки WB после перехода в нужный раздел каталога.</p>
        </form>
      </Card>

      {loading && (
        <Card><div className="flex flex-col items-center py-12"><LoadingSpinner size="lg" /><p className="mt-4 text-gray-600">Анализируем категорию...</p></div></Card>
      )}

      {error && (
        <Card><div className="text-center py-8 text-red-600 font-medium">{error}</div></Card>
      )}

      {result && (
        <Card>
          {
            /* Extract products with fallback to backend's `top_15` key */
          }
          {(() => {
            // Normalize products array
            const topProducts = (result.topProducts ?? result.top_15) as any[] | undefined;
            return (
              <>
                <h2 className="text-xl font-semibold mb-4">📊 Основные показатели</h2>
                {result.summary && (
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-4 rounded-lg overflow-x-auto">{result.summary}</pre>
                )}
                {topProducts && (
                  <div className="mt-6 space-y-4">
                    <div>
                      <h3 className="font-semibold mb-2">Топ&nbsp;товаров (кратко)</h3>
                      <ul className="space-y-1 text-gray-700 text-sm">
                        {topProducts.slice(0, 10).map((p: any, idx: number) => (
                          <li key={idx}>{idx + 1}. {p.name ?? p.product_name} — {formatPrice(p.revenue)} / {formatNumber(p.sales ?? p.orders)}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">📋 Детальная таблица&nbsp;товаров</h3>
                      <div className="overflow-x-auto rounded-lg border border-gray-200">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left font-medium text-gray-600">#</th>
                              <th className="px-4 py-2 text-left font-medium text-gray-600">Товар</th>
                              <th className="px-4 py-2 text-right font-medium text-gray-600">Выручка</th>
                              <th className="px-4 py-2 text-right font-medium text-gray-600">Продаж</th>
                              <th className="px-4 py-2 text-right font-medium text-gray-600">Сред. цена</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {topProducts.map((p: any, idx: number) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-4 py-2 whitespace-nowrap">{idx + 1}</td>
                                <td className="px-4 py-2 whitespace-nowrap max-w-xs truncate" title={p.name}>{p.name}</td>
                                <td className="px-4 py-2 text-right whitespace-nowrap">{formatPrice(p.revenue)}</td>
                                <td className="px-4 py-2 text-right whitespace-nowrap">{formatNumber(p.sales ?? p.orders)}</td>
                                <td className="px-4 py-2 text-right whitespace-nowrap">{p.avg_price ? formatPrice(p.avg_price) : p.avgPrice ? formatPrice(p.avgPrice) : p.price ? formatPrice(p.price) : '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Плюсы / минусы / оценка */}
                {(result.pluses || result.minuses) && (
                  <div className="mt-8 grid md:grid-cols-2 gap-6">
                    {result.pluses && (
                      <Card>
                        <h3 className="font-semibold mb-3">🟢 5&nbsp;плюсов&nbsp;категории</h3>
                        <ul className="list-disc list-inside space-y-1 text-sm text-green-700">
                          {result.pluses.map((p: string, i: number) => (
                            <li key={i}>{p}</li>
                          ))}
                        </ul>
                      </Card>
                    )}
                    {result.minuses && (
                      <Card>
                        <h3 className="font-semibold mb-3">🔴 5&nbsp;минусов&nbsp;категории</h3>
                        <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                          {result.minuses.map((m: string, i: number) => (
                            <li key={i}>{m}</li>
                          ))}
                        </ul>
                      </Card>
                    )}
                  </div>
                )}

                {result.score !== undefined && (
                  <div className="mt-6 text-lg font-medium">
                    Общая оценка категории: <span className="text-primary-600">{result.score}/5</span>
                  </div>
                )}
              </>
            );
          })()}
        </Card>
      )}
    </div>
  );
};

export default CategoryAnalysis; 