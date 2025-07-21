import React, { useState } from 'react';
import { Monitor, Plus, BarChart3, DollarSign, Target, Eye, MousePointer, TrendingUp, AlertTriangle } from 'lucide-react';
import { planningAPI } from '../../services/api';
import { AdMonitoring as AdMonitoringType } from '../../types';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import LoadingSpinner from '../../components/UI/LoadingSpinner';

interface ManualAdData {
  [article: string]: {
    ad_spend: number;
    revenue_from_ads: number;
    sales_from_ads: number;
    impressions: number;
    clicks: number;
    ad_active: boolean;
  };
}

const AdMonitoring: React.FC = () => {
  const [articles, setArticles] = useState<string[]>(['']);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AdMonitoringType[] | null>(null);
  const [error, setError] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualData, setManualData] = useState<ManualAdData>({});

  const handleAddArticle = () => {
    setArticles([...articles, '']);
  };

  const handleRemoveArticle = (index: number) => {
    const newArticles = articles.filter((_, i) => i !== index);
    setArticles(newArticles.length === 0 ? [''] : newArticles);
  };

  const handleArticleChange = (index: number, value: string) => {
    const newArticles = [...articles];
    newArticles[index] = value;
    setArticles(newArticles);
  };

  const handleManualDataChange = (article: string, field: string, value: string | boolean) => {
    setManualData(prev => ({
      ...prev,
      [article]: {
        ...prev[article],
        [field]: value
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validArticles = articles.filter(a => a.trim());
    if (validArticles.length === 0) return;

    setLoading(true);
    setError('');
    setResults(null);

    try {
      const response = await planningAPI.getAdMonitoring(
        validArticles,
        showManualInput ? manualData : undefined
      );
      
      if (response.success && response.data) {
        setResults(response.data);
      } else {
        setError(response.error || 'Произошла ошибка при анализе рекламы');
      }
    } catch (err) {
      setError('Произошла ошибка при анализе рекламы');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'profitable':
        return { bg: 'bg-green-100', text: 'text-green-800', emoji: '🟢' };
      case 'breakeven':
        return { bg: 'bg-yellow-100', text: 'text-yellow-800', emoji: '🟡' };
      case 'loss':
        return { bg: 'bg-red-100', text: 'text-red-800', emoji: '🔴' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-800', emoji: '⚪' };
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'profitable':
        return 'Прибыльная';
      case 'breakeven':
        return 'В ноль';
      case 'loss':
        return 'Убыточная';
      default:
        return 'Неизвестно';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const calculateSummary = () => {
    if (!results) return null;

    const totalCampaigns = results.length;
    const profitable = results.filter(r => r.status === 'profitable').length;
    const breakeven = results.filter(r => r.status === 'breakeven').length;
    const loss = results.filter(r => r.status === 'loss').length;
    const totalSpend = results.reduce((sum, r) => sum + r.adSpend, 0);
    const totalRevenue = results.reduce((sum, r) => sum + r.revenue, 0);
    const totalOrders = results.reduce((sum, r) => sum + r.orders, 0);
    const totalROI = totalSpend > 0 ? ((totalRevenue - totalSpend) / totalSpend) * 100 : 0;

    return {
      totalCampaigns,
      profitable,
      breakeven,
      loss,
      totalSpend,
      totalRevenue,
      totalOrders,
      totalROI
    };
  };

  const summary = calculateSummary();

  return (
    <div className="bg-gradient-to-br from-indigo-500 to-purple-700 min-h-screen py-8 px-4 space-y-6">
      <div className="flex flex-col items-center text-center space-y-4 mb-6">
        <h1 className="text-4xl font-bold text-white drop-shadow-lg">📈 Мониторинг рекламы</h1>
        <p className="text-indigo-100">Отслеживание рекламных кампаний на Wildberries</p>
      </div>

      {/* Input Form */}
      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Артикулы товаров для анализа
            </label>
            
            <div className="space-y-3">
              {articles.map((article, index) => (
                <div key={index} className="flex space-x-2">
                  <input
                    type="text"
                    value={article}
                    onChange={(e) => handleArticleChange(index, e.target.value)}
                    placeholder={`Артикул ${index + 1}`}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                  {articles.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleRemoveArticle(index)}
                    >
                      ✕
                    </Button>
                  )}
                </div>
              ))}
              
              <Button
                type="button"
                variant="outline"
                onClick={handleAddArticle}
                icon={<Plus className="w-4 h-4" />}
                size="sm"
              >
                Добавить артикул
              </Button>
            </div>
          </div>

          {/* Manual Data Input Toggle */}
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showManualInput}
                onChange={(e) => setShowManualInput(e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">
                Ввести данные рекламы вручную
              </span>
            </label>
            <p className="text-xs text-gray-500 mt-1">
              Если API MPStats не работает, вы можете ввести данные самостоятельно
            </p>
          </div>

          {/* Manual Data Input */}
          {showManualInput && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-900">Ручной ввод данных</h3>
              
              {articles.filter(a => a.trim()).map((article, index) => (
                <Card key={index} padding="sm">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">
                    Артикул: {article}
                  </h4>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Расходы на рекламу (₽)</label>
                      <input
                        type="number"
                        min="0"
                        value={manualData[article]?.ad_spend || ''}
                        onChange={(e) => handleManualDataChange(article, 'ad_spend', Number(e.target.value))}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Выручка с рекламы (₽)</label>
                      <input
                        type="number"
                        min="0"
                        value={manualData[article]?.revenue_from_ads || ''}
                        onChange={(e) => handleManualDataChange(article, 'revenue_from_ads', Number(e.target.value))}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Заказы с рекламы</label>
                      <input
                        type="number"
                        min="0"
                        value={manualData[article]?.sales_from_ads || ''}
                        onChange={(e) => handleManualDataChange(article, 'sales_from_ads', Number(e.target.value))}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Показы</label>
                      <input
                        type="number"
                        min="0"
                        value={manualData[article]?.impressions || ''}
                        onChange={(e) => handleManualDataChange(article, 'impressions', Number(e.target.value))}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Клики</label>
                      <input
                        type="number"
                        min="0"
                        value={manualData[article]?.clicks || ''}
                        onChange={(e) => handleManualDataChange(article, 'clicks', Number(e.target.value))}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                      />
                    </div>
                    
                    <div className="flex items-end">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={manualData[article]?.ad_active || false}
                          onChange={(e) => handleManualDataChange(article, 'ad_active', e.target.checked)}
                          className="h-3 w-3 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <span className="ml-1 text-xs text-gray-700">
                          Реклама активна
                        </span>
                      </label>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <div className="text-sm text-gray-500">
            <strong>Что вы получите:</strong>
            <ul className="mt-1 list-disc list-inside space-y-1">
              <li>ROI и окупаемость каждой рекламной кампании</li>
              <li>CTR (отношение кликов к показам)</li>
              <li>Статистику расходов и выручки</li>
              <li>Рекомендации по оптимизации</li>
              <li>Цветовую индикацию эффективности</li>
            </ul>
          </div>

          <Button
            type="submit"
            loading={loading}
            disabled={articles.filter(a => a.trim()).length === 0}
            fullWidth
          >
            Анализировать рекламу
          </Button>
        </form>
      </Card>

      {/* Loading */}
      {loading && (
        <Card>
          <div className="flex flex-col items-center justify-center py-12">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-600">Анализируем рекламные кампании...</p>
            <p className="text-sm text-gray-500 mt-2">Получаем данные из MPStats API</p>
          </div>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card>
          <div className="text-center py-8">
            <AlertTriangle className="w-12 h-12 mx-auto text-red-500 mb-4" />
            <div className="text-red-600 text-lg font-medium mb-2">
              Ошибка анализа
            </div>
            <p className="text-gray-600">{error}</p>
          </div>
        </Card>
      )}

      {/* Results */}
      {results && summary && (
        <div className="space-y-6">
          {/* Summary */}
          <Card>
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              📊 Общая статистика
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{summary.totalCampaigns}</div>
                <div className="text-sm text-gray-600">Всего кампаний</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">🟢 {summary.profitable}</div>
                <div className="text-sm text-gray-600">Прибыльных</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">🟡 {summary.breakeven}</div>
                <div className="text-sm text-gray-600">В ноль</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">🔴 {summary.loss}</div>
                <div className="text-sm text-gray-600">Убыточных</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
              <div>
                <div className="flex items-center text-gray-600 mb-1">
                  <DollarSign className="w-4 h-4 mr-1" />
                  <span className="text-sm">Общие расходы</span>
                </div>
                <div className="text-lg font-semibold">{formatCurrency(summary.totalSpend)}</div>
              </div>
              
              <div>
                <div className="flex items-center text-gray-600 mb-1">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  <span className="text-sm">Общая выручка</span>
                </div>
                <div className="text-lg font-semibold">{formatCurrency(summary.totalRevenue)}</div>
              </div>
              
              <div>
                <div className="flex items-center text-gray-600 mb-1">
                  <Target className="w-4 h-4 mr-1" />
                  <span className="text-sm">Общий ROI</span>
                </div>
                <div className={`text-lg font-semibold ${summary.totalROI > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {summary.totalROI.toFixed(1)}%
                </div>
              </div>
              
              <div>
                <div className="flex items-center text-gray-600 mb-1">
                  <span className="text-sm">Всего заказов</span>
                </div>
                <div className="text-lg font-semibold">{summary.totalOrders}</div>
              </div>
            </div>
          </Card>

          {/* Individual Campaign Results */}
          <Card>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              📋 Детальная информация по кампаниям
            </h2>
            
            <div className="space-y-4">
              {results.map((result, index) => {
                const statusInfo = getStatusColor(result.status);
                return (
                  <div key={result.article} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-medium text-gray-900 flex items-center">
                          {statusInfo.emoji} Артикул {result.article}
                        </h3>
                        {result.productName && (
                          <p className="text-sm text-gray-600 mt-1">{result.productName}</p>
                        )}
                      </div>
                      
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.bg} ${statusInfo.text}`}>
                        {getStatusText(result.status)}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <div className="text-sm text-gray-600">ROI</div>
                        <div className={`text-lg font-semibold ${result.roi > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {result.roi.toFixed(1)}%
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-sm text-gray-600">Расходы</div>
                        <div className="text-lg font-semibold">{formatCurrency(result.adSpend)}</div>
                      </div>
                      
                      <div>
                        <div className="text-sm text-gray-600">Выручка</div>
                        <div className="text-lg font-semibold">{formatCurrency(result.revenue)}</div>
                      </div>
                      
                      <div>
                        <div className="text-sm text-gray-600">Заказы</div>
                        <div className="text-lg font-semibold">{result.orders}</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center">
                        <Eye className="w-4 h-4 mr-1 text-gray-500" />
                        <span>Показы: {result.impressions.toLocaleString()}</span>
                      </div>
                      
                      <div className="flex items-center">
                        <MousePointer className="w-4 h-4 mr-1 text-gray-500" />
                        <span>Клики: {result.clicks.toLocaleString()}</span>
                      </div>
                      
                      <div className="flex items-center">
                        <Target className="w-4 h-4 mr-1 text-gray-500" />
                        <span>CTR: {result.ctr.toFixed(2)}%</span>
                      </div>
                    </div>
                    
                    {result.recommendations && result.recommendations.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="text-sm font-medium text-gray-900 mb-2">💡 Рекомендации:</div>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {result.recommendations.map((rec, i) => (
                            <li key={i}>• {rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* General Conclusions */}
          <Card>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              🎯 Общие выводы
            </h2>
            
            <div className="space-y-3">
              {summary.totalROI > 100 && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-800 text-sm">
                    ✅ <strong>Отлично!</strong> Реклама прибыльна. ROI {summary.totalROI.toFixed(1)}% показывает хорошую окупаемость.
                  </p>
                </div>
              )}
              
              {summary.totalROI >= 0 && summary.totalROI <= 100 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800 text-sm">
                    ⚠️ <strong>Внимание:</strong> Реклама работает в ноль. ROI {summary.totalROI.toFixed(1)}% требует оптимизации.
                  </p>
                </div>
              )}
              
              {summary.totalROI < 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 text-sm">
                    ❌ <strong>Критично:</strong> Реклама убыточна. ROI {summary.totalROI.toFixed(1)}% требует срочных мер.
                  </p>
                </div>
              )}
              
              {summary.loss > 0 && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-orange-800 text-sm">
                    🔧 Оптимизируйте {summary.loss} кампаний с убытками
                  </p>
                </div>
              )}
              
              {summary.breakeven > 0 && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-blue-800 text-sm">
                    💡 Улучшите {summary.breakeven} кампаний, работающих в ноль
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

export default AdMonitoring; 