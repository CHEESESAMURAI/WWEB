import React, { useState } from 'react';
import { Line, Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface ProductAnalysisData {
  article: string;
  name: string;
  brand: string;
  photo_url?: string;
  subject_name?: string;
  created_date?: string;
  colors_info?: {
    total_colors: number;
    color_names: string[];
    current_color: string;
    revenue_share_percent: number;
    stock_share_percent: number;
  };
  supplier_info?: {
    id: number;
    name: string;
  };
  price: {
    current: number;
    original: number;
    discount: number;
    average?: number;
  };
  rating?: number;
  reviews_count?: number;
  stocks?: {
    total: number;
    by_size: { [key: string]: number };
  };
  sales?: {
    today: number;
    weekly: number;
    monthly: number;
    total: number;
    revenue: {
      daily: number;
      weekly: number;
      monthly: number;
      total: number;
    };
    profit: {
      daily: number;
      weekly: number;
      monthly: number;
    };
  };
  analytics?: {
    purchase_rate: number;
    purchase_after_return: number;
    turnover_days: number;
    days_in_stock: number;
    days_with_sales: number;
    conversion_rate: number;
    cart_add_rate: number;
    avg_position: number;
    keyword_density: number;
    competitor_price_diff: number;
    market_share: number;
    seasonal_factor: number;
  };
  chart_data?: {
    dates: string[];
    revenue: number[];
    orders: number[];
    stock: number[];
    search_frequency: number[];
    ads_impressions: number[];
    brand_competitors: Array<{
      name: string;
      items: number;
      sales: number;
    }>;
    brand_categories: Array<{
      name: string;
      percentage: number;
    }>;
    brand_top_items: Array<{
      name: string;
      sales: number;
      revenue: number;
    }>;
  };
  competition?: {
    level: string;
    competitor_count: number;
    avg_competitor_price: number;
    price_position: string;
    market_saturation: number;
  };
  recommendations?: string[];
  // Extended MPStats data
  mpstats_data?: {
    basic_info: {
      name: string;
      brand: string;
      seller: string;
      subject: string;
      itemid: number;
      photos_count: number;
      thumb_middle?: string;
      thumb?: string;
    };
    pricing: {
      final_price: number;
      basic_price: number;
      start_price: number;
      basic_sale: number;
      promo_sale: number;
      real_discount: number;
    };
    sales_metrics: {
      sales: number;
      sales_per_day_average: number;
      revenue: number;
      revenue_average: number;
      purchase: number;
      turnover_days: number;
      profit: number;
      profit_daily: number;
    };
    rating_reviews: {
      rating: number;
      comments: number;
      picscount: number;
      has3d: boolean;
      hasvideo: boolean;
      avg_latest_rating: number;
    };
    inventory: {
      balance: number;
      balance_fbs: number;
      days_in_stock: number;
      average_if_in_stock: number;
      days_with_sales: number;
      frozen_stocks: number;
      frozen_stocks_cost: number;
      frozen_stocks_percent: number;
      is_fbs: boolean;
    };
    charts: {
      sales_graph: Array<{date: string; value: number}>;
      stocks_graph: Array<{date: string; value: number}>;
      price_graph: Array<{date: string; value: number}>;
      product_visibility_graph: Array<{date: string; value: number}>;
    };
  };
}

export default function ProductAnalysis() {
  const [article, setArticle] = useState('');
  const [analysis, setAnalysis] = useState<ProductAnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Вспомогательная функция для проверки корректности chart_data
  const isChartDataValid = (chartData: any): boolean => {
    console.log('🔍 Checking chart_data validity:', chartData);
    
    if (!chartData) {
      console.log('❌ chartData is null/undefined');
      return false;
    }
    
    // Проверяем только основные массивы для графиков товара
    const requiredArrays = ['dates', 'revenue', 'orders', 'stock', 'search_frequency'];
    
    const validationResults = requiredArrays.map(key => {
      const exists = chartData[key];
      const isArray = Array.isArray(chartData[key]);
      const hasLength = chartData[key]?.length > 0;
      
      console.log(`🔍 Field '${key}':`, {
        exists: !!exists,
        isArray,
        length: chartData[key]?.length,
        hasLength,
        value: chartData[key]
      });
      
      return exists && isArray && hasLength;
    });
    
    const isValid = validationResults.every(result => result);
    console.log('✅ Overall chart_data validation result:', isValid);
    
    return isValid;
  };

  const analyzeProduct = async () => {
    if (!article.trim()) {
      setError('Введите артикул товара');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      
      // Получаем основные данные из старого endpoint
      const response = await fetch('http://localhost:8000/analysis/product', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ article })
      });

      if (!response.ok) {
        throw new Error('Ошибка при анализе товара');
      }

      const data = await response.json();
      
      // Получаем расширенные данные из MPStats endpoint
      try {
        const advancedResponse = await fetch('http://localhost:8000/mpstats/advanced-analysis', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            article: article,
            date_from: getDateFrom(),
            date_to: new Date().toISOString().split('T')[0],
            fbs: 1
          }),
        });

        if (advancedResponse.ok) {
          const mpstatsData = await advancedResponse.json();
          console.log('🎯 MPStats extended data received:', mpstatsData);
          
          // Объединяем данные
          data.mpstats_data = mpstatsData;
          
          // Обновляем основные данные более точными из MPStats
          if (mpstatsData.basic_info) {
            data.name = mpstatsData.basic_info.name || data.name;
            data.brand = mpstatsData.basic_info.brand || data.brand;
            
            // Исправляем URL фотографии из MPStats
            if (mpstatsData.basic_info.thumb_middle) {
              const photoUrl = mpstatsData.basic_info.thumb_middle;
              data.photo_url = photoUrl.startsWith('//') ? `https:${photoUrl}` : photoUrl;
            } else if (mpstatsData.basic_info.thumb) {
              const photoUrl = mpstatsData.basic_info.thumb;
              data.photo_url = photoUrl.startsWith('//') ? `https:${photoUrl}` : photoUrl;
            }
          }
          
          if (mpstatsData.pricing) {
            data.price.current = mpstatsData.pricing.final_price || data.price.current;
          }
          
          // Обновляем рейтинг и отзывы из MPStats
          if (mpstatsData.rating_reviews) {
            data.rating = mpstatsData.rating_reviews.rating || data.rating;
            data.reviews_count = mpstatsData.rating_reviews.comments || data.reviews_count;
          }
          
          // Обновляем продажи из MPStats
          if (mpstatsData.sales_metrics) {
            // Инициализируем sales если не существует
            if (!data.sales) {
              data.sales = {
                today: 0,
                weekly: 0,
                monthly: 0,
                total: 0,
                revenue: { daily: 0, weekly: 0, monthly: 0, total: 0 },
                profit: { daily: 0, weekly: 0, monthly: 0 }
              };
            }
            
            // Обновляем продажи
            const dailySales = Math.round(mpstatsData.sales_metrics.sales_per_day_average || 0);
            data.sales.today = dailySales;
            data.sales.weekly = dailySales * 7;
            data.sales.monthly = dailySales * 30;
            data.sales.total = mpstatsData.sales_metrics.sales || data.sales.total;
            
            // Обновляем выручку
            const dailyRevenue = Math.round(mpstatsData.sales_metrics.revenue_average || 0);
            data.sales.revenue.daily = dailyRevenue;
            data.sales.revenue.weekly = dailyRevenue * 7;
            data.sales.revenue.monthly = dailyRevenue * 30;
            data.sales.revenue.total = mpstatsData.sales_metrics.revenue || data.sales.revenue.total;
            
            // Рассчитываем прибыль (примерно 25% от выручки)
            const dailyProfit = Math.round(dailyRevenue * 0.25);
            data.sales.profit.daily = dailyProfit;
            data.sales.profit.weekly = dailyProfit * 7;
            data.sales.profit.monthly = dailyProfit * 30;
          }
          
          // Обновляем остатки из MPStats
          if (mpstatsData.inventory) {
            if (!data.stocks) {
              data.stocks = { total: 0, by_size: {} };
            }
            data.stocks.total = mpstatsData.inventory.balance || data.stocks.total;
          }
        } else {
          console.log('⚠️ Advanced analysis unavailable, using basic data only');
        }
      } catch (advancedError) {
        console.log('⚠️ Advanced analysis failed:', advancedError);
      }
      
      console.log('🔍 FULL API Response:', JSON.stringify(data, null, 2));
      setAnalysis(data);
    } catch (err) {
      setError('Произошла ошибка при анализе товара');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getDateFrom = () => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0
    }).format(price);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ru-RU').format(num);
  };

  return (
    <div style={{
      maxWidth: '1400px',
      margin: '0 auto',
      padding: '20px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh'
    }}>
      {/* Заголовок */}
      <div style={{ textAlign: 'center', marginBottom: '30px', color: 'white' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '10px', textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
          📊 Анализ товара
        </h1>
        <p style={{ fontSize: '1.1rem', opacity: 0.9 }}>
          Получите подробную аналитику и графики по товару Wildberries с расширенными данными MPStats
        </p>
      </div>

      {/* Форма анализа */}
      <div style={{
        background: 'white',
        padding: '30px',
        borderRadius: '20px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
        marginBottom: '30px'
      }}>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={article}
            onChange={(e) => setArticle(e.target.value)}
            placeholder="Введите артикул товара (например: 275191790)"
            style={{
              flex: 1,
              minWidth: '300px',
              padding: '15px 20px',
              border: '2px solid #e5e7eb',
              borderRadius: '10px',
              fontSize: '16px'
            }}
            onKeyPress={(e) => e.key === 'Enter' && analyzeProduct()}
          />
          <button 
            onClick={analyzeProduct}
            disabled={loading}
            style={{
              padding: '15px 30px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? '🔄 Анализируем...' : '🔍 Анализировать'}
          </button>
        </div>
        {error && (
          <div style={{
            background: '#fee2e2',
            color: '#dc2626',
            padding: '10px 15px',
            borderRadius: '10px',
            marginTop: '15px'
          }}>
            {error}
          </div>
        )}
      </div>

      {analysis && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          {/* Основная информация о товаре */}
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '30px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ fontSize: '1.8rem', color: '#1f2937', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              📋 Основная информация
            </h2>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: analysis.photo_url ? '300px 1fr' : '1fr',
              gap: '30px',
              alignItems: 'start'
            }}>
              {/* Фотография товара */}
              {analysis.photo_url && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center'
                }}>
                  <img 
                    src={analysis.photo_url} 
                    alt={analysis.name}
                    style={{
                      maxWidth: '100%',
                      height: 'auto',
                      borderRadius: '15px',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                    }}
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      const originalSrc = img.src;
                      
                      // Получаем ID изображения из URL
                      const picIdMatch = originalSrc.match(/\/(\d+)(?:\/|\.)/);
                      if (picIdMatch) {
                        const picId = picIdMatch[1];
                        
                        // Массив форматов для попытки
                        const formats = [
                          `https://basket-01.wbbasket.ru/vol0/part${picId}/${picId}/images/big/1.webp`,
                          `https://basket-02.wbbasket.ru/vol0/part${picId}/${picId}/images/big/1.webp`,
                          `https://basket-03.wbbasket.ru/vol0/part${picId}/${picId}/images/big/1.webp`,
                          `https://images.wbstatic.net/big/${picId}.jpg`,
                          `https://images.wbstatic.net/c516x688/${picId}.jpg`,
                          `https://images.wbstatic.net/c246x328/${picId}.jpg`
                        ];
                        
                        let currentFormatIndex = 0;
                        
                        const tryNextFormat = () => {
                          if (currentFormatIndex < formats.length) {
                            img.src = formats[currentFormatIndex];
                            currentFormatIndex++;
                          } else {
                            // Если все форматы не сработали
                            img.style.display = 'none';
                            const parent = img.parentElement;
                            if (parent) {
                              parent.innerHTML = '<div style="text-align: center; color: #6b7280; padding: 20px;"><span style="font-size: 3rem;">📷</span><br/>Фото недоступно</div>';
                            }
                          }
                        };
                        
                        img.onerror = () => tryNextFormat();
                        tryNextFormat();
                      } else {
                        // Если не можем извлечь ID
                        img.style.display = 'none';
                        const parent = img.parentElement;
                        if (parent) {
                          parent.innerHTML = '<div style="text-align: center; color: #6b7280; padding: 20px;"><span style="font-size: 3rem;">📷</span><br/>Фото недоступно</div>';
                        }
                      }
                    }}
                  />
                </div>
              )}
              
              {/* Информационные поля */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '15px'
              }}>
                <div style={{ padding: '15px', background: '#f9fafb', borderRadius: '10px' }}>
                  <div style={{ fontWeight: '600', color: '#6b7280', marginBottom: '5px' }}>🏷️ Артикул:</div>
                  <div style={{ fontWeight: '700', color: '#1f2937', fontSize: '1.1rem' }}>{analysis.article}</div>
                </div>
                
                <div style={{ padding: '15px', background: '#f9fafb', borderRadius: '10px' }}>
                  <div style={{ fontWeight: '600', color: '#6b7280', marginBottom: '5px' }}>📝 Название:</div>
                  <div style={{ fontWeight: '700', color: '#1f2937', lineHeight: '1.3' }}>{analysis.name}</div>
                </div>
                
                {analysis.subject_name && (
                  <div style={{ padding: '15px', background: '#f9fafb', borderRadius: '10px' }}>
                    <div style={{ fontWeight: '600', color: '#6b7280', marginBottom: '5px' }}>📂 Предмет:</div>
                    <div style={{ fontWeight: '700', color: '#1f2937' }}>{analysis.subject_name}</div>
                  </div>
                )}
                
                {analysis.created_date && (
                  <div style={{ padding: '15px', background: '#f9fafb', borderRadius: '10px' }}>
                    <div style={{ fontWeight: '600', color: '#6b7280', marginBottom: '5px' }}>📅 Дата появления на ВБ:</div>
                    <div style={{ fontWeight: '700', color: '#1f2937' }}>{analysis.created_date}</div>
                  </div>
                )}
                
                <div style={{ padding: '15px', background: '#f9fafb', borderRadius: '10px' }}>
                  <div style={{ fontWeight: '600', color: '#6b7280', marginBottom: '5px' }}>💰 Цена реализации:</div>
                  <div style={{ fontWeight: '700', color: '#667eea', fontSize: '1.2rem' }}>{formatPrice(analysis.price.current)}</div>
                </div>
                
                {analysis.colors_info && (
                  <div style={{ padding: '15px', background: '#f9fafb', borderRadius: '10px' }}>
                    <div style={{ fontWeight: '600', color: '#6b7280', marginBottom: '5px' }}>🎨 Товар представлен в:</div>
                    <div style={{ fontWeight: '700', color: '#1f2937' }}>
                      {analysis.colors_info.total_colors}-х цветах
                      {analysis.colors_info.color_names && Array.isArray(analysis.colors_info.color_names) && analysis.colors_info.color_names.length > 0 && (
                        <div style={{ fontSize: '0.9rem', color: '#6b7280', marginTop: '2px' }}>
                          ({analysis.colors_info.color_names.join(', ')})
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {analysis.colors_info && analysis.colors_info.total_colors > 1 && (
                  <div style={{ padding: '15px', background: '#f9fafb', borderRadius: '10px' }}>
                    <div style={{ fontWeight: '600', color: '#6b7280', marginBottom: '5px' }}>📊 Доля выручки относительно всех цветов:</div>
                    <div style={{ fontWeight: '700', color: '#10b981' }}>{analysis.colors_info.revenue_share_percent}%</div>
                  </div>
                )}
                
                {analysis.colors_info && analysis.colors_info.total_colors > 1 && (
                  <div style={{ padding: '15px', background: '#f9fafb', borderRadius: '10px' }}>
                    <div style={{ fontWeight: '600', color: '#6b7280', marginBottom: '5px' }}>📦 Доля товарных остатков относительно всех цветов:</div>
                    <div style={{ fontWeight: '700', color: '#f59e0b' }}>{analysis.colors_info.stock_share_percent}%</div>
                  </div>
                )}
                
                {analysis.supplier_info && (
                  <div style={{ padding: '15px', background: '#f9fafb', borderRadius: '10px' }}>
                    <div style={{ fontWeight: '600', color: '#6b7280', marginBottom: '5px' }}>🏢 Продавец:</div>
                    <div style={{ fontWeight: '700', color: '#1f2937' }}>{analysis.supplier_info.name}</div>
                  </div>
                )}
                
                <div style={{ padding: '15px', background: '#f9fafb', borderRadius: '10px' }}>
                  <div style={{ fontWeight: '600', color: '#6b7280', marginBottom: '5px' }}>🏷️ Бренд:</div>
                  <div style={{ fontWeight: '700', color: '#8b5cf6' }}>{analysis.brand}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Основная информация */}
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '30px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
              <h2 style={{ fontSize: '1.8rem', color: '#1f2937', margin: 0 }}>
                📦 {analysis.name}
              </h2>
              <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '20px',
                fontWeight: '600'
              }}>
                🏷️ {analysis.brand}
              </div>
            </div>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '20px'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '15px',
                background: '#f9fafb',
                borderRadius: '10px'
              }}>
                <span style={{ fontWeight: '600', color: '#6b7280' }}>💰 Цена:</span>
                <span style={{ fontWeight: '700', color: '#667eea', fontSize: '1.1rem' }}>
                  {formatPrice(analysis.price.current)}
                  {analysis.price.discount > 0 && (
                    <div style={{ fontSize: '0.9rem', color: '#ef4444', fontWeight: '500' }}>
                      -{analysis.price.discount}% (было {formatPrice(analysis.price.original)})
                    </div>
                  )}
                </span>
              </div>
              
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '15px',
                background: '#f9fafb',
                borderRadius: '10px'
              }}>
                <span style={{ fontWeight: '600', color: '#6b7280' }}>⭐ Рейтинг:</span>
                <span style={{ fontWeight: '700', color: '#1f2937' }}>{analysis.rating?.toFixed(1) || 0}/5</span>
              </div>
              
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '15px',
                background: '#f9fafb',
                borderRadius: '10px'
              }}>
                <span style={{ fontWeight: '600', color: '#6b7280' }}>📝 Отзывов:</span>
                <span style={{ fontWeight: '700', color: '#1f2937' }}>{analysis.reviews_count?.toLocaleString('ru-RU') || 0}</span>
              </div>
              
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '15px',
                background: '#f9fafb',
                borderRadius: '10px'
              }}>
                <span style={{ fontWeight: '600', color: '#6b7280' }}>📦 Остатки:</span>
                <span style={{ fontWeight: '700', color: '#1f2937' }}>{analysis.stocks?.total?.toLocaleString('ru-RU') || 0} шт.</span>
              </div>
            </div>
          </div>

          {/* Продажи и выручка */}
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '30px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '20px'
            }}>
              <div style={{
                background: '#f9fafb',
                borderRadius: '15px',
                padding: '25px',
                border: '2px solid #e5e7eb'
              }}>
                <h3 style={{ margin: '0 0 20px 0', color: '#1f2937', fontSize: '1.3rem' }}>
                  📈 Продажи и выручка
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 15px',
                    background: 'white',
                    borderRadius: '10px'
                  }}>
                    <span style={{ fontWeight: '600', color: '#6b7280' }}>За день:</span>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: '700', color: '#1f2937' }}>{analysis.sales?.today || 0} шт.</div>
                      <div style={{ color: '#10b981', fontWeight: '600' }}>{formatPrice(analysis.sales?.revenue?.daily || 0)}</div>
                    </div>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 15px',
                    background: 'white',
                    borderRadius: '10px'
                  }}>
                    <span style={{ fontWeight: '600', color: '#6b7280' }}>За неделю:</span>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: '700', color: '#1f2937' }}>{analysis.sales?.weekly || 0} шт.</div>
                      <div style={{ color: '#10b981', fontWeight: '600' }}>{formatPrice(analysis.sales?.revenue?.weekly || 0)}</div>
                    </div>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 15px',
                    background: 'white',
                    borderRadius: '10px'
                  }}>
                    <span style={{ fontWeight: '600', color: '#6b7280' }}>За месяц:</span>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: '700', color: '#1f2937' }}>{analysis.sales?.monthly || 0} шт.</div>
                      <div style={{ color: '#10b981', fontWeight: '600' }}>{formatPrice(analysis.sales?.revenue?.monthly || 0)}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{
                background: '#f9fafb',
                borderRadius: '15px',
                padding: '25px',
                border: '2px solid #e5e7eb'
              }}>
                <h3 style={{ margin: '0 0 20px 0', color: '#1f2937', fontSize: '1.3rem' }}>
                  💎 Прибыль
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 15px',
                    background: 'white',
                    borderRadius: '10px'
                  }}>
                    <span>За день:</span>
                    <strong style={{ color: '#10b981', fontSize: '1.1rem' }}>
                      {formatPrice(analysis.sales?.profit?.daily || 0)}
                    </strong>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 15px',
                    background: 'white',
                    borderRadius: '10px'
                  }}>
                    <span>За неделю:</span>
                    <strong style={{ color: '#10b981', fontSize: '1.1rem' }}>
                      {formatPrice(analysis.sales?.profit?.weekly || 0)}
                    </strong>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 15px',
                    background: 'white',
                    borderRadius: '10px'
                  }}>
                    <span>За месяц:</span>
                    <strong style={{ color: '#10b981', fontSize: '1.1rem' }}>
                      {formatPrice(analysis.sales?.profit?.monthly || 0)}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Показатели эффективности */}
          {analysis.analytics && (
            <div style={{
              background: 'white',
              borderRadius: '20px',
              padding: '30px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ margin: '0 0 25px 0', color: '#1f2937', fontSize: '1.5rem', textAlign: 'center' }}>
                🎯 Показатели эффективности
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '20px'
              }}>
                <div style={{
                  background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                  borderRadius: '15px',
                  padding: '20px',
                  textAlign: 'center',
                  border: '2px solid #e5e7eb'
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🛒</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937', marginBottom: '5px' }}>
                    {analysis.analytics.purchase_rate || 0}%
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '0.9rem', fontWeight: '500' }}>
                    Процент выкупа
                  </div>
                </div>
                
                <div style={{
                  background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                  borderRadius: '15px',
                  padding: '20px',
                  textAlign: 'center',
                  border: '2px solid #e5e7eb'
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⏱️</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937', marginBottom: '5px' }}>
                    {analysis.analytics.turnover_days || 0}
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '0.9rem', fontWeight: '500' }}>
                    Дней оборачиваемости
                  </div>
                </div>
                
                <div style={{
                  background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                  borderRadius: '15px',
                  padding: '20px',
                  textAlign: 'center',
                  border: '2px solid #e5e7eb'
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🔄</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937', marginBottom: '5px' }}>
                    {analysis.analytics.conversion_rate?.toFixed(1) || 0}%
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '0.9rem', fontWeight: '500' }}>
                    Конверсия
                  </div>
                </div>
                
                <div style={{
                  background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                  borderRadius: '15px',
                  padding: '20px',
                  textAlign: 'center',
                  border: '2px solid #e5e7eb'
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📊</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937', marginBottom: '5px' }}>
                    {analysis.analytics.market_share?.toFixed(1) || 0}%
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '0.9rem', fontWeight: '500' }}>
                    Доля рынка
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Расширенная аналитика MPStats */}
          {analysis.mpstats_data && (
            <div style={{
              background: 'white',
              borderRadius: '20px',
              padding: '30px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ margin: '0 0 25px 0', color: '#1f2937', fontSize: '1.5rem', textAlign: 'center' }}>
                🚀 Расширенная аналитика (MPStats)
              </h3>
              
              {/* Ценообразование и скидки */}
              {analysis.mpstats_data.pricing && (
                <div style={{
                  background: '#f9fafb',
                  borderRadius: '15px',
                  padding: '25px',
                  marginBottom: '20px',
                  border: '2px solid #e5e7eb'
                }}>
                  <h4 style={{ margin: '0 0 20px 0', color: '#1f2937', fontSize: '1.3rem' }}>
                    💰 Ценообразование и скидки
                  </h4>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '15px'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 15px',
                      background: 'white',
                      borderRadius: '10px'
                    }}>
                      <span style={{ fontWeight: '600', color: '#6b7280' }}>Актуальная цена:</span>
                      <span style={{ fontWeight: '700', color: '#10b981' }}>{formatPrice(analysis.mpstats_data.pricing.final_price)}</span>
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 15px',
                      background: 'white',
                      borderRadius: '10px'
                    }}>
                      <span style={{ fontWeight: '600', color: '#6b7280' }}>Базовая цена:</span>
                      <span style={{ fontWeight: '700', color: '#6b7280' }}>{formatPrice(analysis.mpstats_data.pricing.basic_price)}</span>
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 15px',
                      background: 'white',
                      borderRadius: '10px'
                    }}>
                      <span style={{ fontWeight: '600', color: '#6b7280' }}>Базовая скидка:</span>
                      <span style={{ fontWeight: '700', color: '#ef4444' }}>{analysis.mpstats_data.pricing.basic_sale}%</span>
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 15px',
                      background: 'white',
                      borderRadius: '10px'
                    }}>
                      <span style={{ fontWeight: '600', color: '#6b7280' }}>Промо скидка:</span>
                      <span style={{ fontWeight: '700', color: '#f59e0b' }}>{analysis.mpstats_data.pricing.promo_sale}%</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Продажи и эффективность */}
              {analysis.mpstats_data.sales_metrics && (
                <div style={{
                  background: '#f9fafb',
                  borderRadius: '15px',
                  padding: '25px',
                  marginBottom: '20px',
                  border: '2px solid #e5e7eb'
                }}>
                  <h4 style={{ margin: '0 0 20px 0', color: '#1f2937', fontSize: '1.3rem' }}>
                    📈 Продажи и эффективность
                  </h4>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '15px'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 15px',
                      background: 'white',
                      borderRadius: '10px'
                    }}>
                      <span style={{ fontWeight: '600', color: '#6b7280' }}>Продаж за период:</span>
                      <span style={{ fontWeight: '700', color: '#1f2937' }}>{formatNumber(analysis.mpstats_data.sales_metrics.sales)} шт.</span>
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 15px',
                      background: 'white',
                      borderRadius: '10px'
                    }}>
                      <span style={{ fontWeight: '600', color: '#6b7280' }}>Среднее в день:</span>
                      <span style={{ fontWeight: '700', color: '#8b5cf6' }}>{formatNumber(Math.round(analysis.mpstats_data.sales_metrics.sales_per_day_average))} шт.</span>
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 15px',
                      background: 'white',
                      borderRadius: '10px'
                    }}>
                      <span style={{ fontWeight: '600', color: '#6b7280' }}>Общая выручка:</span>
                      <span style={{ fontWeight: '700', color: '#10b981' }}>{formatPrice(analysis.mpstats_data.sales_metrics.revenue)}</span>
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 15px',
                      background: 'white',
                      borderRadius: '10px'
                    }}>
                      <span style={{ fontWeight: '600', color: '#6b7280' }}>Средняя выручка/день:</span>
                      <span style={{ fontWeight: '700', color: '#10b981' }}>{formatPrice(analysis.mpstats_data.sales_metrics.revenue_average)}</span>
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 15px',
                      background: 'white',
                      borderRadius: '10px'
                    }}>
                      <span style={{ fontWeight: '600', color: '#6b7280' }}>Процент выкупа:</span>
                      <span style={{ fontWeight: '700', color: '#f59e0b' }}>{analysis.mpstats_data.sales_metrics.purchase}%</span>
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 15px',
                      background: 'white',
                      borderRadius: '10px'
                    }}>
                      <span style={{ fontWeight: '600', color: '#6b7280' }}>Оборачиваемость:</span>
                      <span style={{ fontWeight: '700', color: '#6366f1' }}>{analysis.mpstats_data.sales_metrics.turnover_days} дней</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Рейтинг и отзывы */}
              {analysis.mpstats_data.rating_reviews && (
                <div style={{
                  background: '#f9fafb',
                  borderRadius: '15px',
                  padding: '25px',
                  marginBottom: '20px',
                  border: '2px solid #e5e7eb'
                }}>
                  <h4 style={{ margin: '0 0 20px 0', color: '#1f2937', fontSize: '1.3rem' }}>
                    ⭐ Рейтинг и отзывы
                  </h4>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '15px'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 15px',
                      background: 'white',
                      borderRadius: '10px'
                    }}>
                      <span style={{ fontWeight: '600', color: '#6b7280' }}>Рейтинг:</span>
                      <span style={{ fontWeight: '700', color: '#f59e0b' }}>{analysis.mpstats_data.rating_reviews.rating.toFixed(1)}/5</span>
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 15px',
                      background: 'white',
                      borderRadius: '10px'
                    }}>
                      <span style={{ fontWeight: '600', color: '#6b7280' }}>Комментариев:</span>
                      <span style={{ fontWeight: '700', color: '#1f2937' }}>{formatNumber(analysis.mpstats_data.rating_reviews.comments)}</span>
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 15px',
                      background: 'white',
                      borderRadius: '10px'
                    }}>
                      <span style={{ fontWeight: '600', color: '#6b7280' }}>Фотографий:</span>
                      <span style={{ fontWeight: '700', color: '#8b5cf6' }}>{analysis.mpstats_data.rating_reviews.picscount}</span>
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 15px',
                      background: 'white',
                      borderRadius: '10px'
                    }}>
                      <span style={{ fontWeight: '600', color: '#6b7280' }}>3D фото:</span>
                      <span style={{ fontWeight: '700', color: analysis.mpstats_data.rating_reviews.has3d ? '#10b981' : '#ef4444' }}>
                        {analysis.mpstats_data.rating_reviews.has3d ? '✅ Есть' : '❌ Нет'}
                      </span>
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 15px',
                      background: 'white',
                      borderRadius: '10px'
                    }}>
                      <span style={{ fontWeight: '600', color: '#6b7280' }}>Видео:</span>
                      <span style={{ fontWeight: '700', color: analysis.mpstats_data.rating_reviews.hasvideo ? '#10b981' : '#ef4444' }}>
                        {analysis.mpstats_data.rating_reviews.hasvideo ? '✅ Есть' : '❌ Нет'}
                      </span>
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 15px',
                      background: 'white',
                      borderRadius: '10px'
                    }}>
                      <span style={{ fontWeight: '600', color: '#6b7280' }}>Последний рейтинг:</span>
                      <span style={{ fontWeight: '700', color: '#6366f1' }}>{analysis.mpstats_data.rating_reviews.avg_latest_rating.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Запасы и остатки */}
              {analysis.mpstats_data.inventory && (
                <div style={{
                  background: '#f9fafb',
                  borderRadius: '15px',
                  padding: '25px',
                  marginBottom: '20px',
                  border: '2px solid #e5e7eb'
                }}>
                  <h4 style={{ margin: '0 0 20px 0', color: '#1f2937', fontSize: '1.3rem' }}>
                    📦 Запасы и остатки
                  </h4>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '15px'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 15px',
                      background: 'white',
                      borderRadius: '10px'
                    }}>
                      <span style={{ fontWeight: '600', color: '#6b7280' }}>Общий остаток:</span>
                      <span style={{ fontWeight: '700', color: '#1f2937' }}>{formatNumber(analysis.mpstats_data.inventory.balance)} шт.</span>
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 15px',
                      background: 'white',
                      borderRadius: '10px'
                    }}>
                      <span style={{ fontWeight: '600', color: '#6b7280' }}>FBS остаток:</span>
                      <span style={{ fontWeight: '700', color: '#8b5cf6' }}>{formatNumber(analysis.mpstats_data.inventory.balance_fbs)} шт.</span>
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 15px',
                      background: 'white',
                      borderRadius: '10px'
                    }}>
                      <span style={{ fontWeight: '600', color: '#6b7280' }}>Дней в наличии:</span>
                      <span style={{ fontWeight: '700', color: '#10b981' }}>{analysis.mpstats_data.inventory.days_in_stock}</span>
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 15px',
                      background: 'white',
                      borderRadius: '10px'
                    }}>
                      <span style={{ fontWeight: '600', color: '#6b7280' }}>Дней с продажами:</span>
                      <span style={{ fontWeight: '700', color: '#f59e0b' }}>{analysis.mpstats_data.inventory.days_with_sales}</span>
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 15px',
                      background: 'white',
                      borderRadius: '10px'
                    }}>
                      <span style={{ fontWeight: '600', color: '#6b7280' }}>Замороженные остатки:</span>
                      <span style={{ fontWeight: '700', color: '#ef4444' }}>{formatNumber(analysis.mpstats_data.inventory.frozen_stocks)} шт.</span>
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 15px',
                      background: 'white',
                      borderRadius: '10px'
                    }}>
                      <span style={{ fontWeight: '600', color: '#6b7280' }}>FBS активен:</span>
                      <span style={{ fontWeight: '700', color: analysis.mpstats_data.inventory.is_fbs ? '#10b981' : '#6b7280' }}>
                        {analysis.mpstats_data.inventory.is_fbs ? '✅ Да' : '❌ Нет'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Дополнительные графики MPStats */}
              {analysis.mpstats_data.charts && (
                <div style={{
                  background: '#f9fafb',
                  borderRadius: '15px',
                  padding: '25px',
                  border: '2px solid #e5e7eb'
                }}>
                  <h4 style={{ margin: '0 0 20px 0', color: '#1f2937', fontSize: '1.3rem' }}>
                    📊 Дополнительные графики MPStats
                  </h4>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                    gap: '20px'
                  }}>
                    {/* График остатков */}
                    {analysis.mpstats_data.charts.stocks_graph && analysis.mpstats_data.charts.stocks_graph.length > 0 && (
                      <div style={{
                        background: 'white',
                        borderRadius: '10px',
                        padding: '20px'
                      }}>
                        <h5 style={{ margin: '0 0 15px 0', color: '#1f2937', textAlign: 'center' }}>
                          📦 График остатков
                        </h5>
                        <Line
                          data={{
                            labels: analysis.mpstats_data!.charts.stocks_graph.map((_, index) => {
                              const date = new Date();
                              date.setDate(date.getDate() - (analysis.mpstats_data!.charts.stocks_graph.length - 1 - index));
                              return date.toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' });
                            }),
                            datasets: [{
                              label: 'Остатки (шт.)',
                              data: analysis.mpstats_data!.charts.stocks_graph,
                              borderColor: '#8b5cf6',
                              backgroundColor: 'rgba(139, 92, 246, 0.1)',
                              tension: 0.4,
                            }]
                          }}
                          options={{
                            responsive: true,
                            plugins: {
                              tooltip: {
                                callbacks: {
                                  label: function(context) {
                                    return `Остатки: ${context.parsed.y} шт.`;
                                  }
                                }
                              }
                            },
                            scales: {
                              y: {
                                beginAtZero: true,
                                title: {
                                  display: true,
                                  text: 'Количество (шт.)'
                                }
                              }
                            }
                          }}
                        />
                      </div>
                    )}

                    {/* График цен */}
                    {analysis.mpstats_data.charts.price_graph && analysis.mpstats_data.charts.price_graph.length > 0 && (
                      <div style={{
                        background: 'white',
                        borderRadius: '10px',
                        padding: '20px'
                      }}>
                        <h5 style={{ margin: '0 0 15px 0', color: '#1f2937', textAlign: 'center' }}>
                          💰 График цен
                        </h5>
                        <Line
                          data={{
                            labels: analysis.mpstats_data!.charts.price_graph.map((_, index) => {
                              const date = new Date();
                              date.setDate(date.getDate() - (analysis.mpstats_data!.charts.price_graph.length - 1 - index));
                              return date.toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' });
                            }),
                            datasets: [{
                              label: 'Цена (₽)',
                              data: analysis.mpstats_data!.charts.price_graph,
                              borderColor: '#10b981',
                              backgroundColor: 'rgba(16, 185, 129, 0.1)',
                              tension: 0.4,
                            }]
                          }}
                          options={{
                            responsive: true,
                            plugins: {
                              tooltip: {
                                callbacks: {
                                  label: function(context) {
                                    return `Цена: ${formatPrice(context.parsed.y)}`;
                                  }
                                }
                              }
                            },
                            scales: {
                              y: {
                                beginAtZero: false,
                                title: {
                                  display: true,
                                  text: 'Цена (₽)'
                                }
                              }
                            }
                          }}
                        />
                      </div>
                    )}

                    {/* График продаж */}
                    {analysis.mpstats_data.charts.sales_graph && analysis.mpstats_data.charts.sales_graph.length > 0 && (
                      <div style={{
                        background: 'white',
                        borderRadius: '10px',
                        padding: '20px'
                      }}>
                        <h5 style={{ margin: '0 0 15px 0', color: '#1f2937', textAlign: 'center' }}>
                          📈 График продаж MPStats
                        </h5>
                        <Line
                          data={{
                            labels: analysis.mpstats_data!.charts.sales_graph.map((_, index) => {
                              const date = new Date();
                              date.setDate(date.getDate() - (analysis.mpstats_data!.charts.sales_graph.length - 1 - index));
                              return date.toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' });
                            }),
                            datasets: [{
                              label: 'Продажи (шт.)',
                              data: analysis.mpstats_data!.charts.sales_graph,
                              borderColor: '#f59e0b',
                              backgroundColor: 'rgba(245, 158, 11, 0.1)',
                              tension: 0.4,
                            }]
                          }}
                          options={{
                            responsive: true,
                            plugins: {
                              tooltip: {
                                callbacks: {
                                  label: function(context) {
                                    return `Продажи: ${context.parsed.y} шт.`;
                                  }
                                }
                              }
                            },
                            scales: {
                              y: {
                                beginAtZero: true,
                                title: {
                                  display: true,
                                  text: 'Количество (шт.)'
                                }
                              }
                            }
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Графики товара */}
          {(() => {
            console.log('🚀 Trying to render charts block');
            console.log('📊 analysis object:', analysis);
            console.log('📈 analysis.chart_data:', analysis?.chart_data);
            
            const shouldRender = analysis && isChartDataValid(analysis.chart_data);
            console.log('🎯 Should render charts:', shouldRender);
            
            if (!shouldRender) {
              console.log('❌ Not rendering charts - validation failed');
              return null;
            }
            
            console.log('✅ Rendering charts - validation passed');
            const chartData = analysis.chart_data!;
            return (
            <div style={{
              background: 'white',
              borderRadius: '20px',
              padding: '30px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ margin: '0 0 25px 0', color: '#1f2937', fontSize: '1.5rem', textAlign: 'center' }}>
                📊 Графики по товару
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
                gap: '30px'
              }}>
                {/* График выручки */}
                <div style={{
                  background: '#f9fafb',
                  borderRadius: '15px',
                  padding: '25px',
                  border: '2px solid #e5e7eb'
                }}>
                  <h4 style={{ margin: '0 0 20px 0', color: '#1f2937', textAlign: 'center', fontSize: '1.2rem' }}>
                    📈 График выручки
                  </h4>
                  <Line
                    data={{
                      labels: chartData.dates.map(date => 
                        new Date(date).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' })
                      ),
                      datasets: [{
                        label: 'Выручка (₽)',
                        data: chartData.revenue,
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        fill: true,
                        tension: 0.4
                      }]
                    }}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: { position: 'top' },
                        title: {
                          display: true,
                          text: 'Динамика дневной выручки за последний месяц'
                        }
                      }
                    }}
                  />
                </div>

                {/* График заказов */}
                <div style={{
                  background: '#f9fafb',
                  borderRadius: '15px',
                  padding: '25px',
                  border: '2px solid #e5e7eb'
                }}>
                  <h4 style={{ margin: '0 0 20px 0', color: '#1f2937', textAlign: 'center', fontSize: '1.2rem' }}>
                    📊 График заказов
                  </h4>
                  <Line
                    data={{
                      labels: chartData.dates.map(date => 
                        new Date(date).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' })
                      ),
                      datasets: [{
                        label: 'Заказы (шт.)',
                        data: chartData.orders,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        fill: true,
                        tension: 0.4
                      }]
                    }}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: { position: 'top' },
                        title: {
                          display: true,
                          text: 'Количество заказов товара по дням'
                        }
                      }
                    }}
                  />
                </div>

                {/* График остатков */}
                <div style={{
                  background: '#f9fafb',
                  borderRadius: '15px',
                  padding: '25px',
                  border: '2px solid #e5e7eb'
                }}>
                  <h4 style={{ margin: '0 0 20px 0', color: '#1f2937', textAlign: 'center', fontSize: '1.2rem' }}>
                    📦 График товарных остатков
                  </h4>
                  <Line
                    data={{
                      labels: chartData.dates.map(date => 
                        new Date(date).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' })
                      ),
                      datasets: [{
                        label: 'Остатки (шт.)',
                        data: chartData.stock,
                        borderColor: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        fill: true,
                        tension: 0.4
                      }]
                    }}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: { position: 'top' },
                        title: {
                          display: true,
                          text: 'Изменение остатков на складах'
                        }
                      }
                    }}
                  />
                </div>

                {/* График частотности */}
                <div style={{
                  background: '#f9fafb',
                  borderRadius: '15px',
                  padding: '25px',
                  border: '2px solid #e5e7eb'
                }}>
                  <h4 style={{ margin: '0 0 20px 0', color: '#1f2937', textAlign: 'center', fontSize: '1.2rem' }}>
                    🔍 График частотности артикула
                  </h4>
                  <Line
                    data={{
                      labels: chartData.dates.map(date => 
                        new Date(date).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' })
                      ),
                      datasets: [{
                        label: 'Частотность',
                        data: chartData.search_frequency,
                        borderColor: '#8b5cf6',
                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                        fill: true,
                        tension: 0.4
                      }]
                    }}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: { position: 'top' },
                        title: {
                          display: true,
                          text: 'Востребованность товара в поиске'
                        }
                      }
                    }}
                  />
                </div>
              </div>
            </div>
            );
          })()}

          {/* Графики бренда */}
          {analysis && analysis.chart_data && analysis.chart_data.brand_competitors && 
           Array.isArray(analysis.chart_data.brand_competitors) && analysis.chart_data.brand_competitors.length > 0 && (
            <div style={{
              background: 'white',
              borderRadius: '20px',
              padding: '30px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ margin: '0 0 25px 0', color: '#1f2937', fontSize: '1.5rem', textAlign: 'center' }}>
                📊 Графики по бренду
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
                gap: '30px'
              }}>
                {/* Сравнение с конкурентами */}
                <div style={{
                  background: '#f9fafb',
                  borderRadius: '15px',
                  padding: '25px',
                  border: '2px solid #e5e7eb'
                }}>
                  <h4 style={{ margin: '0 0 20px 0', color: '#1f2937', textAlign: 'center', fontSize: '1.2rem' }}>
                    🥊 Сравнение с конкурентами
                  </h4>
                  <Bar
                    data={{
                      labels: analysis.chart_data.brand_competitors.map(c => c.name),
                      datasets: [
                        {
                          label: 'Количество товаров',
                          data: analysis.chart_data.brand_competitors.map(c => c.items),
                          backgroundColor: 'rgba(59, 130, 246, 0.8)',
                        },
                        {
                          label: 'Продажи',
                          data: analysis.chart_data.brand_competitors.map(c => c.sales),
                          backgroundColor: 'rgba(16, 185, 129, 0.8)',
                        }
                      ]
                    }}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: { position: 'top' },
                        title: {
                          display: true,
                          text: 'Конкуренты по количеству товаров и продажам'
                        }
                      }
                    }}
                  />
                </div>

                {/* Распределение по категориям */}
                {analysis.chart_data.brand_categories && Array.isArray(analysis.chart_data.brand_categories) && analysis.chart_data.brand_categories.length > 0 && (
                  <div style={{
                    background: '#f9fafb',
                    borderRadius: '15px',
                    padding: '25px',
                    border: '2px solid #e5e7eb'
                  }}>
                    <h4 style={{ margin: '0 0 20px 0', color: '#1f2937', textAlign: 'center', fontSize: '1.2rem' }}>
                      📂 Распределение бренда по категориям
                    </h4>
                    <Pie
                      data={{
                        labels: analysis.chart_data.brand_categories.map(c => c.name),
                        datasets: [{
                          data: analysis.chart_data.brand_categories.map(c => c.percentage),
                          backgroundColor: [
                            'rgba(59, 130, 246, 0.8)',
                            'rgba(16, 185, 129, 0.8)',
                            'rgba(245, 158, 11, 0.8)',
                            'rgba(239, 68, 68, 0.8)',
                            'rgba(139, 92, 246, 0.8)'
                          ]
                        }]
                      }}
                      options={{
                        responsive: true,
                        plugins: {
                          legend: { position: 'right' },
                          title: {
                            display: true,
                            text: 'Процентное распределение товаров по категориям'
                          }
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Рекомендации */}
          {analysis.recommendations && Array.isArray(analysis.recommendations) && analysis.recommendations.length > 0 && (
            <div style={{
              background: 'white',
              borderRadius: '20px',
              padding: '30px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
              marginBottom: '30px'
            }}>
              <h3 style={{ margin: '0 0 20px 0', color: '#1f2937', fontSize: '1.3rem' }}>
                📝 Рекомендации
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {analysis.recommendations.map((rec, index) => (
                  <div key={index} style={{
                    padding: '12px 15px',
                    background: '#f9fafb',
                    borderRadius: '8px',
                    borderLeft: '4px solid #667eea'
                  }}>
                    {rec}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Расширенная аналитика */}
          <div className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white p-6 rounded-lg shadow-lg">
            <div className="flex items-center justify-center text-center">
              <span className="text-4xl mr-4">🎯</span>
              <div>
                <h3 className="text-2xl font-bold mb-2">Расширенная аналитика активна!</h3>
                <p className="text-purple-100">
                  Теперь анализ товаров включает все данные и графики как в Telegram боте: показатели эффективности, графики по товару и бренду, анализ конкуренции и рекомендации.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
