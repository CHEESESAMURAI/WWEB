import React, { useState } from 'react';
import { Package, Search, BarChart3, Star, TrendingUp, ShoppingCart, Warehouse } from 'lucide-react';
import { analysisAPI } from '../../services/api';
import { ProductAnalysis as ProductAnalysisType } from '../../types';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import LoadingSpinner from '../../components/UI/LoadingSpinner';

const ProductAnalysis: React.FC = () => {
  const [article, setArticle] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProductAnalysisType | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!article.trim()) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await analysisAPI.analyzeProduct(article.trim());
      if (response.success && response.data) {
        setResult(response.data);
      } else {
        setError(response.error || 'Произошла ошибка при анализе товара');
      }
    } catch (err) {
      setError('Произошла ошибка при анализе товара');
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

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { color: 'text-red-600', bg: 'bg-red-100', text: 'Нет в наличии' };
    if (stock < 10) return { color: 'text-orange-600', bg: 'bg-orange-100', text: 'Мало' };
    if (stock < 50) return { color: 'text-yellow-600', bg: 'bg-yellow-100', text: 'Средне' };
    return { color: 'text-green-600', bg: 'bg-green-100', text: 'В наличии' };
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-600';
    if (rating >= 4.0) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Package className="w-6 h-6 mr-2 text-primary-600" />
            Анализ товара
          </h1>
          <p className="text-gray-600 mt-1">
            Подробный анализ товара на Wildberries по артикулу
          </p>
        </div>
        <div className="text-sm text-gray-500">
          Стоимость: 10₽
        </div>
      </div>

      {/* Search Form */}
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="article" className="block text-sm font-medium text-gray-700 mb-2">
              Артикул товара
            </label>
            <div className="flex space-x-4">
              <div className="flex-1">
                <input
                  type="text"
                  id="article"
                  value={article}
                  onChange={(e) => setArticle(e.target.value)}
                  placeholder="Введите артикул товара (например: 123456789)"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <Button
                type="submit"
                loading={loading}
                disabled={!article.trim()}
                icon={<Search className="w-4 h-4" />}
              >
                Анализировать
              </Button>
            </div>
          </div>
          
          <div className="text-sm text-gray-500">
            <strong>Что вы получите:</strong>
            <ul className="mt-1 list-disc list-inside space-y-1">
              <li>Полную информацию о товаре (название, бренд, цена)</li>
              <li>Рейтинг и количество отзывов</li>
              <li>Остатки на складе по размерам</li>
              <li>Статистику продаж (за сегодня и общая)</li>
              <li>Графики и визуализацию данных</li>
            </ul>
          </div>
        </form>
      </Card>

      {/* Loading */}
      {loading && (
        <Card>
          <div className="flex flex-col items-center justify-center py-12">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-600">Анализируем товар...</p>
            <p className="text-sm text-gray-500 mt-2">Это может занять до 30 секунд</p>
          </div>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card>
          <div className="text-center py-8">
            <div className="text-red-600 text-lg font-medium mb-2">
              Ошибка анализа
            </div>
            <p className="text-gray-600">{error}</p>
          </div>
        </Card>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Product Info */}
          <Card>
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {result.name}
                </h2>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span className="flex items-center">
                    <strong>Бренд:</strong> {result.brand}
                  </span>
                  <span className="flex items-center">
                    <strong>Артикул:</strong> {result.article}
                  </span>
                </div>
              </div>
            </div>

            {/* Price and Discount */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm text-blue-600 font-medium">Текущая цена</div>
                <div className="text-2xl font-bold text-blue-900">
                  {formatPrice(result.price.current)}
                </div>
              </div>
              
              {result.price.original > result.price.current && (
                <>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 font-medium">Цена без скидки</div>
                    <div className="text-xl font-semibold text-gray-900 line-through">
                      {formatPrice(result.price.original)}
                    </div>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-sm text-green-600 font-medium">Скидка</div>
                    <div className="text-2xl font-bold text-green-900">
                      -{result.price.discount}%
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Rating and Reviews */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center">
                <Star className={`w-5 h-5 mr-2 ${getRatingColor(result.rating)}`} />
                <span className={`text-lg font-semibold ${getRatingColor(result.rating)}`}>
                  {result.rating.toFixed(1)}
                </span>
                <span className="text-gray-500 ml-2">
                  ({result.feedbacks} отзывов)
                </span>
              </div>
              
              {result.stocks && (
                <div className="flex items-center">
                  <Warehouse className="w-5 h-5 mr-2 text-gray-500" />
                  <span className="text-gray-700">
                    Остаток: {result.stocks.total} шт.
                  </span>
                  <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${getStockStatus(result.stocks.total).bg} ${getStockStatus(result.stocks.total).color}`}>
                    {getStockStatus(result.stocks.total).text}
                  </span>
                </div>
              )}
            </div>
          </Card>

          {/* Sales Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Продажи</h3>
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">За сегодня:</span>
                  <span className="text-xl font-semibold text-gray-900">
                    {result.sales.today}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Всего продаж:</span>
                  <span className="text-xl font-semibold text-gray-900">
                    {result.sales.total.toLocaleString()}
                  </span>
                </div>
                
                <div className="pt-2 border-t">
                  <div className="text-sm text-gray-500">
                    Выручка за сегодня: ~{formatPrice(result.sales.today * result.price.current)}
                  </div>
                </div>
              </div>
            </Card>

            {/* Stock by Size */}
            {result.stocks && Object.keys(result.stocks.bySize).length > 0 && (
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Остатки по размерам</h3>
                  <ShoppingCart className="w-5 h-5 text-blue-600" />
                </div>
                
                <div className="space-y-3">
                  {Object.entries(result.stocks.bySize)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 8)
                    .map(([size, stock]) => (
                      <div key={size} className="flex justify-between items-center">
                        <span className="text-gray-600">Размер {size}:</span>
                        <div className="flex items-center">
                          <span className="text-gray-900 font-medium mr-2">{stock}</span>
                          <div className={`w-2 h-2 rounded-full ${getStockStatus(stock).bg.replace('bg-', 'bg-')}`} />
                        </div>
                      </div>
                    ))}
                </div>
              </Card>
            )}
          </div>

          {/* Charts placeholder */}
          {result.charts && result.charts.length > 0 && (
            <Card>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                Графики и аналитика
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.charts.map((chart, index) => (
                  <div key={index} className="bg-gray-50 p-6 rounded-lg text-center">
                    <BarChart3 className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">График {index + 1}</p>
                    <p className="text-xs text-gray-500 mt-1">{chart}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Recommendations */}
          <Card>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Рекомендации
            </h3>
            
            <div className="space-y-3">
              {result.stocks.total === 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 text-sm">
                    ⚠️ <strong>Критично:</strong> Товар отсутствует на складе. Необходимо срочное пополнение.
                  </p>
                </div>
              )}
              
              {result.stocks.total > 0 && result.stocks.total < 10 && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-orange-800 text-sm">
                    🔶 <strong>Внимание:</strong> Низкий остаток товара. Рекомендуется пополнение.
                  </p>
                </div>
              )}
              
              {result.rating < 4.0 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800 text-sm">
                    💡 <strong>Совет:</strong> Низкий рейтинг товара. Проанализируйте отзывы для улучшения качества.
                  </p>
                </div>
              )}
              
              {result.sales.today > 10 && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-800 text-sm">
                    ✅ <strong>Отлично:</strong> Высокие продажи за сегодня. Товар пользуется спросом.
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ProductAnalysis; 