import React, { useState, useCallback, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface CategoryRecommendations {
  insights: string[];
  opportunities: string[];
  threats: string[];
  recommendations: string[];
  market_trends: string[];
  competitive_advantages: string[];
}

interface CategoryAnalysisData {
  category_info: {
    name: string;
    period: string;
    total_products: number;
    total_revenue: number;
    total_sales: number;
    average_price: number;
    average_rating: number;
    average_purchase: number;
    average_turnover_days: number;
  };
  top_products: Array<{
    id: number;
    name: string;
    brand?: string;
    seller?: string;
    final_price: number;
    sales: number;
    revenue: number;
    rating: number;
    comments: number;
    purchase: number;
    balance: number;
    country?: string;
    gender?: string;
    thumb_middle?: string;
    url?: string;
    // Расширенные данные
    basic_sale?: number;
    promo_sale?: number;
    client_sale?: number;
    client_price?: number;
    start_price?: number;
    final_price_max?: number;
    final_price_min?: number;
    average_if_in_stock?: number;
    category_position?: number;
    sku_first_date?: string;
    firstcommentdate?: string;
    picscount?: number;
    hasvideo?: boolean;
    has3d?: boolean;
  }>;
  all_products: Array<any>;
  category_metrics: {
    revenue_per_product: number;
    sales_per_product: number;
    products_with_sales_percentage: number;
    fbs_percentage: number;
    average_comments: number;
    top_brands_count: number;
    price_range_min: number;
    price_range_max: number;
  };
  aggregated_charts: {
    sales_graph: { dates: string[]; values: number[] };
    stocks_graph: { dates: string[]; values: number[] };
    price_graph: { dates: string[]; values: number[] };
    visibility_graph: { dates: string[]; values: number[] };
  };
  ai_recommendations: CategoryRecommendations;
  metadata: any;
}

const CategoryAnalysis: React.FC = () => {
  const [categoryPath, setCategoryPath] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [fbs, setFbs] = useState(0);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CategoryAnalysisData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedProduct, setExpandedProduct] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortField, setSortField] = useState<string>('revenue');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [brandFilter, setBrandFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');

  // Устанавливаем даты по умолчанию
  useEffect(() => {
    const today = new Date();
    const oneMonthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
    
    setDateTo(today.toISOString().split('T')[0]);
    setDateFrom(oneMonthAgo.toISOString().split('T')[0]);
  }, []);

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('ru-RU').format(Math.round(num));
  };

  const setQuickDateRange = (days: number) => {
    const today = new Date();
    const pastDate = new Date(today.getTime() - days * 24 * 60 * 60 * 1000);
    
    setDateTo(today.toISOString().split('T')[0]);
    setDateFrom(pastDate.toISOString().split('T')[0]);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const analyzeCategory = useCallback(async () => {
    if (!categoryPath.trim()) {
      setError('Введите путь категории');
      return;
    }

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const response = await fetch('http://localhost:8000/category/category-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category_path: categoryPath,
          date_from: dateFrom,
          date_to: dateTo,
          fbs: fbs
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setData(result);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || `Ошибка HTTP ${response.status}`);
      }
    } catch (err) {
      setError('Ошибка сети. Убедитесь, что сервер запущен на порту 8000.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }, [categoryPath, dateFrom, dateTo, fbs]);

  const getChartData = (chartData: { dates: string[]; values: number[] }, label: string, color: string) => {
    // Проверяем, что данные корректны
    if (!chartData || !chartData.dates || !chartData.values || chartData.dates.length === 0) {
      return {
        labels: [],
        datasets: [{
          label,
          data: [],
          borderColor: color,
          backgroundColor: color + '20',
          tension: 0.4,
          fill: true,
        }]
      };
    }

    return {
      labels: chartData.dates,
      datasets: [
        {
          label,
          data: chartData.values,
          borderColor: color,
          backgroundColor: color + '20',
          tension: 0.4,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 8,
          pointBackgroundColor: color,
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: {
            size: 14,
            weight: 'bold' as const
          },
          color: '#374151'
        }
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleColor: '#F9FAFB',
        bodyColor: '#F9FAFB',
        borderColor: '#6B7280',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: '#E5E7EB',
          drawBorder: false,
        },
        ticks: {
          color: '#6B7280',
          font: {
            size: 12
          }
        }
      },
      x: {
        grid: {
          color: '#E5E7EB',
          drawBorder: false,
        },
        ticks: {
          color: '#6B7280',
          font: {
            size: 12
          }
        }
      },
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
  };

  // Фильтрация и сортировка товаров
  const filteredProducts = data ? data.all_products.filter(product => {
    const brandMatch = !brandFilter || (product.brand && product.brand.toLowerCase().includes(brandFilter.toLowerCase()));
    const countryMatch = !countryFilter || (product.country && product.country.toLowerCase().includes(countryFilter.toLowerCase()));
    const genderMatch = !genderFilter || (product.gender && product.gender.toLowerCase().includes(genderFilter.toLowerCase()));
    
    return brandMatch && countryMatch && genderMatch;
  }).sort((a, b) => {
    const aValue = a[sortField] || 0;
    const bValue = b[sortField] || 0;
    
    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  }) : [];

  // Пагинация
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

  const toggleProductDetails = (productId: number) => {
    setExpandedProduct(expandedProduct === productId ? null : productId);
  };

  const sortTable = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #f0f9ff 0%, #e0e7ff 100%)',
      padding: '20px 0'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
        {/* Заголовок и форма ввода */}
        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '30px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
          marginBottom: '30px'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h1 style={{ 
              fontSize: '3rem', 
              margin: '0 0 15px 0', 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontWeight: '800',
              letterSpacing: '-1px'
            }}>
              📊 Анализ категории
            </h1>
            <p style={{ 
              color: '#6b7280', 
              fontSize: '1.2rem', 
              margin: '0',
              fontWeight: '500'
            }}>
              Детальная аналитика категорий Wildberries с интеллектуальными рекомендациями
            </p>
          </div>
          
          {/* Форма ввода */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px',
            marginBottom: '25px'
          }}>
            <div>
              <label style={{ 
                display: 'block', 
                fontWeight: '600', 
                color: '#374151', 
                marginBottom: '8px' 
              }}>
                📂 Путь категории
              </label>
              <input
                type="text"
                value={categoryPath}
                onChange={(e) => setCategoryPath(e.target.value)}
                placeholder="Спорт, Красота, Дом"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '10px',
                  fontSize: '16px',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>
            
            <div>
              <label style={{ 
                display: 'block', 
                fontWeight: '600', 
                color: '#374151', 
                marginBottom: '8px' 
              }}>
                📅 Дата от
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '10px',
                  fontSize: '16px'
                }}
              />
            </div>
            
            <div>
              <label style={{ 
                display: 'block', 
                fontWeight: '600', 
                color: '#374151', 
                marginBottom: '8px' 
              }}>
                📅 Дата до
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '10px',
                  fontSize: '16px'
                }}
              />
            </div>
            
            <div>
              <label style={{ 
                display: 'block', 
                fontWeight: '600', 
                color: '#374151', 
                marginBottom: '8px' 
              }}>
                📦 FBS
              </label>
              <select
                value={fbs}
                onChange={(e) => setFbs(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '10px',
                  fontSize: '16px'
                }}
              >
                <option value={0}>Все товары</option>
                <option value={1}>Только FBS</option>
              </select>
            </div>
          </div>

          {/* Быстрый выбор периода */}
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '10px', 
            marginBottom: '25px',
            justifyContent: 'center'
          }}>
            {[7, 14, 30, 90].map((days) => (
              <button
                key={days}
                onClick={() => setQuickDateRange(days)}
                style={{
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                  border: '2px solid #d1d5db',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                  e.currentTarget.style.color = 'white';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)';
                  e.currentTarget.style.color = '#374151';
                }}
              >
                {days} дней
              </button>
            ))}
          </div>

          <button
            onClick={analyzeCategory}
            disabled={loading}
            style={{
              width: '100%',
              padding: '15px 30px',
              background: loading ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '18px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                <div style={{
                  width: '20px',
                  height: '20px',
                  border: '2px solid #ffffff',
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                Анализируется...
              </span>
            ) : (
              '🔍 Анализировать категорию'
            )}
          </button>
        </div>

        {/* Ошибка */}
        {error && (
          <div style={{
            background: '#fee2e2',
            color: '#dc2626',
            padding: '15px 20px',
            borderRadius: '10px',
            marginBottom: '30px',
            border: '2px solid #fecaca'
          }}>
            <strong>❌ Ошибка:</strong> {error}
          </div>
        )}

        {/* Результаты анализа */}
        {data && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            {/* Основная информация о категории */}
            <div style={{
              background: 'white',
              borderRadius: '20px',
              padding: '30px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
            }}>
              <h2 style={{ 
                fontSize: '1.8rem', 
                color: '#1f2937', 
                marginBottom: '25px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px',
                textAlign: 'center',
                justifyContent: 'center'
              }}>
                📋 Общая информация о категории
              </h2>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '20px'
              }}>
                <div style={{
                  background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                  borderRadius: '15px',
                  padding: '25px',
                  textAlign: 'center',
                  border: '2px solid #e5e7eb'
                }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>📦</div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#1f2937', marginBottom: '5px' }}>
                    {formatNumber(data.category_info.total_products)}
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '1rem', fontWeight: '500' }}>
                    Товаров в категории
                  </div>
                </div>

                <div style={{
                  background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                  borderRadius: '15px',
                  padding: '25px',
                  textAlign: 'center',
                  border: '2px solid #e5e7eb'
                }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>💰</div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#10b981', marginBottom: '5px' }}>
                    {formatNumber(data.category_info.total_revenue)} ₽
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '1rem', fontWeight: '500' }}>
                    Общая выручка
                  </div>
                </div>

                <div style={{
                  background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                  borderRadius: '15px',
                  padding: '25px',
                  textAlign: 'center',
                  border: '2px solid #e5e7eb'
                }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>📈</div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#667eea', marginBottom: '5px' }}>
                    {formatNumber(data.category_info.total_sales)}
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '1rem', fontWeight: '500' }}>
                    Общие продажи
                  </div>
                </div>

                <div style={{
                  background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                  borderRadius: '15px',
                  padding: '25px',
                  textAlign: 'center',
                  border: '2px solid #e5e7eb'
                }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🏷️</div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#f59e0b', marginBottom: '5px' }}>
                    {formatNumber(data.category_info.average_price)} ₽
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '1rem', fontWeight: '500' }}>
                    Средняя цена
                  </div>
                </div>

                <div style={{
                  background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                  borderRadius: '15px',
                  padding: '25px',
                  textAlign: 'center',
                  border: '2px solid #e5e7eb'
                }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>⭐</div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#8b5cf6', marginBottom: '5px' }}>
                    {data.category_info.average_rating.toFixed(1)}/5
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '1rem', fontWeight: '500' }}>
                    Средний рейтинг
                  </div>
                </div>

                <div style={{
                  background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                  borderRadius: '15px',
                  padding: '25px',
                  textAlign: 'center',
                  border: '2px solid #e5e7eb'
                }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🎯</div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#ef4444', marginBottom: '5px' }}>
                    {data.category_info.average_purchase.toFixed(1)}%
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '1rem', fontWeight: '500' }}>
                    Средний выкуп
                  </div>
                </div>

                <div style={{
                  background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                  borderRadius: '15px',
                  padding: '25px',
                  textAlign: 'center',
                  border: '2px solid #e5e7eb'
                }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🔄</div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#06b6d4', marginBottom: '5px' }}>
                    {data.category_info.average_turnover_days.toFixed(1)}
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '1rem', fontWeight: '500' }}>
                    Дней оборачиваемости
                  </div>
                </div>

                <div style={{
                  background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                  borderRadius: '15px',
                  padding: '25px',
                  textAlign: 'center',
                  border: '2px solid #e5e7eb'
                }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🏢</div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#64748b', marginBottom: '5px' }}>
                    {data.category_metrics.top_brands_count}
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '1rem', fontWeight: '500' }}>
                    Брендов в категории
                  </div>
                </div>
              </div>
            </div>

            {/* Графики */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
              gap: '30px'
            }}>
              <div style={{
                background: 'white',
                borderRadius: '20px',
                padding: '30px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ 
                  margin: '0 0 20px 0', 
                  color: '#1f2937', 
                  fontSize: '1.3rem',
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px'
                }}>
                  📈 Продажи
                </h3>
                <div style={{ height: '300px' }}>
                  <Line
                    data={getChartData(data.aggregated_charts.sales_graph, 'Продажи', '#3B82F6')}
                    options={chartOptions}
                  />
                </div>
              </div>

              <div style={{
                background: 'white',
                borderRadius: '20px',
                padding: '30px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ 
                  margin: '0 0 20px 0', 
                  color: '#1f2937', 
                  fontSize: '1.3rem',
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px'
                }}>
                  📦 Остатки
                </h3>
                <div style={{ height: '300px' }}>
                  <Line
                    data={getChartData(data.aggregated_charts.stocks_graph, 'Остатки', '#10B981')}
                    options={chartOptions}
                  />
                </div>
              </div>

              <div style={{
                background: 'white',
                borderRadius: '20px',
                padding: '30px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ 
                  margin: '0 0 20px 0', 
                  color: '#1f2937', 
                  fontSize: '1.3rem',
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px'
                }}>
                  💰 Цены
                </h3>
                <div style={{ height: '300px' }}>
                  <Line
                    data={getChartData(data.aggregated_charts.price_graph, 'Средняя цена', '#F59E0B')}
                    options={chartOptions}
                  />
                </div>
              </div>

              <div style={{
                background: 'white',
                borderRadius: '20px',
                padding: '30px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ 
                  margin: '0 0 20px 0', 
                  color: '#1f2937', 
                  fontSize: '1.3rem',
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px'
                }}>
                  🔍 Видимость
                </h3>
                <div style={{ height: '300px' }}>
                  <Line
                    data={getChartData(data.aggregated_charts.visibility_graph, 'Видимость', '#8B5CF6')}
                    options={chartOptions}
                  />
                </div>
              </div>
            </div>

            {/* AI Рекомендации */}
            {data.ai_recommendations && (
              <div style={{
                background: 'white',
                borderRadius: '20px',
                padding: '30px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
              }}>
                <h2 style={{ 
                  fontSize: '1.8rem', 
                  color: '#1f2937', 
                  marginBottom: '25px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px',
                  textAlign: 'center',
                  justifyContent: 'center'
                }}>
                  🤖 Интеллектуальные рекомендации
                </h2>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                  gap: '25px'
                }}>
                  {/* Ключевые инсайты */}
                  {data.ai_recommendations.insights.length > 0 && (
                    <div style={{
                      background: 'linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 100%)',
                      borderRadius: '15px',
                      padding: '20px',
                      border: '2px solid #bae6fd'
                    }}>
                      <h3 style={{
                        margin: '0 0 15px 0',
                        color: '#0c4a6e',
                        fontSize: '1.2rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        💡 Ключевые инсайты
                      </h3>
                      <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.6' }}>
                        {data.ai_recommendations.insights.map((insight, idx) => (
                          <li key={idx} style={{ marginBottom: '8px', color: '#1e40af' }}>
                            {insight}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Возможности */}
                  {data.ai_recommendations.opportunities.length > 0 && (
                    <div style={{
                      background: 'linear-gradient(135deg, #dcfce7 0%, #f0fdf4 100%)',
                      borderRadius: '15px',
                      padding: '20px',
                      border: '2px solid #bbf7d0'
                    }}>
                      <h3 style={{
                        margin: '0 0 15px 0',
                        color: '#14532d',
                        fontSize: '1.2rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        🚀 Возможности роста
                      </h3>
                      <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.6' }}>
                        {data.ai_recommendations.opportunities.map((opportunity, idx) => (
                          <li key={idx} style={{ marginBottom: '8px', color: '#166534' }}>
                            {opportunity}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Рекомендации */}
                  {data.ai_recommendations.recommendations.length > 0 && (
                    <div style={{
                      background: 'linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%)',
                      borderRadius: '15px',
                      padding: '20px',
                      border: '2px solid #fde68a'
                    }}>
                      <h3 style={{
                        margin: '0 0 15px 0',
                        color: '#92400e',
                        fontSize: '1.2rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        🎯 Рекомендации
                      </h3>
                      <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.6' }}>
                        {data.ai_recommendations.recommendations.map((recommendation, idx) => (
                          <li key={idx} style={{ marginBottom: '8px', color: '#d97706' }}>
                            {recommendation}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Угрозы */}
                  {data.ai_recommendations.threats.length > 0 && (
                    <div style={{
                      background: 'linear-gradient(135deg, #fee2e2 0%, #fef2f2 100%)',
                      borderRadius: '15px',
                      padding: '20px',
                      border: '2px solid #fecaca'
                    }}>
                      <h3 style={{
                        margin: '0 0 15px 0',
                        color: '#991b1b',
                        fontSize: '1.2rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        ⚠️ Потенциальные угрозы
                      </h3>
                      <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.6' }}>
                        {data.ai_recommendations.threats.map((threat, idx) => (
                          <li key={idx} style={{ marginBottom: '8px', color: '#dc2626' }}>
                            {threat}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Рыночные тренды */}
                  {data.ai_recommendations.market_trends.length > 0 && (
                    <div style={{
                      background: 'linear-gradient(135deg, #f3e8ff 0%, #faf5ff 100%)',
                      borderRadius: '15px',
                      padding: '20px',
                      border: '2px solid #e9d5ff'
                    }}>
                      <h3 style={{
                        margin: '0 0 15px 0',
                        color: '#6b21a8',
                        fontSize: '1.2rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        📊 Рыночные тренды
                      </h3>
                      <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.6' }}>
                        {data.ai_recommendations.market_trends.map((trend, idx) => (
                          <li key={idx} style={{ marginBottom: '8px', color: '#7c3aed' }}>
                            {trend}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Конкурентные преимущества */}
                  {data.ai_recommendations.competitive_advantages.length > 0 && (
                    <div style={{
                      background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdfa 100%)',
                      borderRadius: '15px',
                      padding: '20px',
                      border: '2px solid #a7f3d0'
                    }}>
                      <h3 style={{
                        margin: '0 0 15px 0',
                        color: '#065f46',
                        fontSize: '1.2rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        🏆 Конкурентные преимущества
                      </h3>
                      <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.6' }}>
                        {data.ai_recommendations.competitive_advantages.map((advantage, idx) => (
                          <li key={idx} style={{ marginBottom: '8px', color: '#047857' }}>
                            {advantage}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ТОП-10 товаров */}
            <div style={{
              background: 'white',
              borderRadius: '20px',
              padding: '30px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
            }}>
              <h2 style={{ 
                fontSize: '1.8rem', 
                color: '#1f2937', 
                marginBottom: '25px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px',
                textAlign: 'center',
                justifyContent: 'center'
              }}>
                🏆 ТОП-10 товаров по выручке
              </h2>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '20px'
              }}>
                {data.top_products.slice(0, 10).map((product, index) => (
                  <div key={product.id} style={{
                    background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                    borderRadius: '15px',
                    padding: '20px',
                    border: '2px solid #e5e7eb',
                    transition: 'all 0.2s',
                    cursor: 'pointer'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-5px)';
                    e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.15)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      marginBottom: '15px' 
                    }}>
                      <span style={{ 
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        padding: '5px 12px',
                        borderRadius: '20px',
                        fontSize: '14px',
                        fontWeight: '700'
                      }}>
                        #{index + 1}
                      </span>
                      <span style={{ 
                        background: '#fef3c7',
                        color: '#d97706',
                        padding: '3px 8px',
                        borderRadius: '10px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        ⭐ {product.rating}
                      </span>
                    </div>
                    
                    {product.thumb_middle && (
                      <img
                        src={product.thumb_middle}
                        alt={product.name}
                        style={{
                          width: '100%',
                          height: '150px',
                          objectFit: 'cover',
                          borderRadius: '10px',
                          marginBottom: '15px'
                        }}
                      />
                    )}
                    
                    <h3 style={{ 
                      fontSize: '14px', 
                      fontWeight: '600', 
                      color: '#1f2937', 
                      marginBottom: '10px',
                      lineHeight: '1.3',
                      height: '40px',
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical'
                    }}>
                      {product.name}
                    </h3>
                    
                    <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>
                      🏢 {product.brand || 'Неизвестно'}
                    </div>
                    <div style={{ fontSize: '13px', color: '#10b981', fontWeight: '600', marginBottom: '8px' }}>
                      💰 {formatNumber(product.final_price)} ₽
                    </div>
                    <div style={{ fontSize: '13px', color: '#667eea', marginBottom: '8px' }}>
                      📦 {formatNumber(product.sales)} шт.
                    </div>
                    <div style={{ fontSize: '13px', color: '#ef4444', fontWeight: '600', marginBottom: '15px' }}>
                      💸 {formatNumber(product.revenue)} ₽
                    </div>
                    
                    {product.url && (
                      <a
                        href={product.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-block',
                          padding: '8px 16px',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: 'white',
                          textDecoration: 'none',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: '600',
                          transition: 'all 0.2s'
                        }}
                      >
                        🔗 Открыть WB
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Таблица всех товаров */}
            <div style={{
              background: 'white',
              borderRadius: '20px',
              padding: '30px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
            }}>
              <h2 style={{ 
                fontSize: '1.8rem', 
                color: '#1f2937', 
                marginBottom: '25px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px',
                textAlign: 'center',
                justifyContent: 'center'
              }}>
                📋 Полная таблица товаров
              </h2>
              
              {/* Фильтры */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '15px',
                marginBottom: '25px'
              }}>
                <input
                  type="text"
                  placeholder="🔍 Поиск по бренду..."
                  value={brandFilter}
                  onChange={(e) => setBrandFilter(e.target.value)}
                  style={{
                    padding: '12px 16px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '10px',
                    fontSize: '14px'
                  }}
                />
                <input
                  type="text"
                  placeholder="🌍 Поиск по стране..."
                  value={countryFilter}
                  onChange={(e) => setCountryFilter(e.target.value)}
                  style={{
                    padding: '12px 16px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '10px',
                    fontSize: '14px'
                  }}
                />
                <input
                  type="text"
                  placeholder="👥 Поиск по полу..."
                  value={genderFilter}
                  onChange={(e) => setGenderFilter(e.target.value)}
                  style={{
                    padding: '12px 16px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '10px',
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* Таблица */}
              <div style={{ 
                overflowX: 'auto',
                border: '2px solid #e5e7eb',
                borderRadius: '15px'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)' }}>
                    <tr>
                      <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Фото</th>
                      <th 
                        style={{ 
                          padding: '15px', 
                          textAlign: 'left', 
                          fontWeight: '600', 
                          color: '#374151',
                          cursor: 'pointer'
                        }}
                        onClick={() => sortTable('name')}
                      >
                        Название {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th 
                        style={{ 
                          padding: '15px', 
                          textAlign: 'left', 
                          fontWeight: '600', 
                          color: '#374151',
                          cursor: 'pointer'
                        }}
                        onClick={() => sortTable('brand')}
                      >
                        Бренд {sortField === 'brand' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th 
                        style={{ 
                          padding: '15px', 
                          textAlign: 'left', 
                          fontWeight: '600', 
                          color: '#374151',
                          cursor: 'pointer'
                        }}
                        onClick={() => sortTable('final_price')}
                      >
                        Цена {sortField === 'final_price' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th 
                        style={{ 
                          padding: '15px', 
                          textAlign: 'left', 
                          fontWeight: '600', 
                          color: '#374151',
                          cursor: 'pointer'
                        }}
                        onClick={() => sortTable('sales')}
                      >
                        Продажи {sortField === 'sales' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th 
                        style={{ 
                          padding: '15px', 
                          textAlign: 'left', 
                          fontWeight: '600', 
                          color: '#374151',
                          cursor: 'pointer'
                        }}
                        onClick={() => sortTable('revenue')}
                      >
                        Выручка {sortField === 'revenue' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th 
                        style={{ 
                          padding: '15px', 
                          textAlign: 'left', 
                          fontWeight: '600', 
                          color: '#374151',
                          cursor: 'pointer'
                        }}
                        onClick={() => sortTable('rating')}
                      >
                        Рейтинг {sortField === 'rating' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Детали</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedProducts.map((product, idx) => (
                      <React.Fragment key={product.id}>
                        <tr style={{ 
                          background: idx % 2 === 0 ? '#ffffff' : '#f9fafb',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f0f9ff'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#ffffff' : '#f9fafb'}>
                          <td style={{ padding: '15px', borderBottom: '1px solid #e5e7eb' }}>
                            {product.thumb_middle && (
                              <img
                                src={product.thumb_middle}
                                alt={product.name}
                                style={{
                                  width: '60px',
                                  height: '60px',
                                  objectFit: 'cover',
                                  borderRadius: '10px'
                                }}
                              />
                            )}
                          </td>
                          <td style={{ padding: '15px', borderBottom: '1px solid #e5e7eb' }}>
                            <div style={{ maxWidth: '200px' }}>
                              <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '5px' }}>
                                {product.name.length > 50 ? product.name.substring(0, 50) + '...' : product.name}
                              </div>
                              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                {product.seller}
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '15px', borderBottom: '1px solid #e5e7eb', color: '#374151' }}>
                            {product.brand || '-'}
                          </td>
                          <td style={{ padding: '15px', borderBottom: '1px solid #e5e7eb', fontWeight: '600', color: '#10b981' }}>
                            {formatNumber(product.final_price)} ₽
                          </td>
                          <td style={{ padding: '15px', borderBottom: '1px solid #e5e7eb', color: '#374151' }}>
                            {formatNumber(product.sales)}
                          </td>
                          <td style={{ padding: '15px', borderBottom: '1px solid #e5e7eb', fontWeight: '600', color: '#667eea' }}>
                            {formatNumber(product.revenue)} ₽
                          </td>
                          <td style={{ padding: '15px', borderBottom: '1px solid #e5e7eb', color: '#374151' }}>
                            ⭐ {product.rating}
                          </td>
                          <td style={{ padding: '15px', borderBottom: '1px solid #e5e7eb' }}>
                            <button
                              onClick={() => toggleProductDetails(product.id)}
                              style={{
                                background: expandedProduct === product.id ? '#ef4444' : '#667eea',
                                color: 'white',
                                border: 'none',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '600',
                                cursor: 'pointer'
                              }}
                            >
                              {expandedProduct === product.id ? '🔼 Скрыть' : '🔽 Показать'}
                            </button>
                          </td>
                        </tr>
                        
                        {/* Расширенная информация */}
                        {expandedProduct === product.id && (
                          <tr>
                            <td colSpan={8} style={{ 
                              padding: '25px', 
                              background: 'linear-gradient(135deg, #f0f9ff 0%, #e0e7ff 100%)',
                              borderBottom: '1px solid #e5e7eb'
                            }}>
                              <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                                gap: '20px'
                              }}>
                                <div style={{
                                  background: 'white',
                                  borderRadius: '15px',
                                  padding: '20px',
                                  border: '2px solid #e5e7eb'
                                }}>
                                  <h4 style={{ 
                                    margin: '0 0 15px 0', 
                                    color: '#1f2937', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '8px' 
                                  }}>
                                    💰 Цены
                                  </h4>
                                  <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                                    <div><strong>Стартовая:</strong> {product.start_price ? formatNumber(product.start_price) + ' ₽' : '-'}</div>
                                    <div><strong>Максимальная:</strong> {product.final_price_max ? formatNumber(product.final_price_max) + ' ₽' : '-'}</div>
                                    <div><strong>Минимальная:</strong> {product.final_price_min ? formatNumber(product.final_price_min) + ' ₽' : '-'}</div>
                                  </div>
                                </div>
                                
                                <div style={{
                                  background: 'white',
                                  borderRadius: '15px',
                                  padding: '20px',
                                  border: '2px solid #e5e7eb'
                                }}>
                                  <h4 style={{ 
                                    margin: '0 0 15px 0', 
                                    color: '#1f2937', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '8px' 
                                  }}>
                                    🎯 Скидки
                                  </h4>
                                  <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                                    <div><strong>Базовая:</strong> {product.basic_sale ? product.basic_sale + '%' : '-'}</div>
                                    <div><strong>Промо:</strong> {product.promo_sale ? product.promo_sale + '%' : '-'}</div>
                                    <div><strong>СПП:</strong> {product.client_sale ? product.client_sale + '%' : '-'}</div>
                                  </div>
                                </div>
                                
                                <div style={{
                                  background: 'white',
                                  borderRadius: '15px',
                                  padding: '20px',
                                  border: '2px solid #e5e7eb'
                                }}>
                                  <h4 style={{ 
                                    margin: '0 0 15px 0', 
                                    color: '#1f2937', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '8px' 
                                  }}>
                                    📊 Информация
                                  </h4>
                                  <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                                    <div><strong>Страна:</strong> {product.country || '-'}</div>
                                    <div><strong>Пол:</strong> {product.gender || '-'}</div>
                                    <div><strong>Фото:</strong> {product.picscount || 0}</div>
                                    <div><strong>Видео:</strong> {product.hasvideo ? 'Да' : 'Нет'}</div>
                                    <div><strong>3D:</strong> {product.has3d ? 'Да' : 'Нет'}</div>
                                  </div>
                                </div>
                              </div>
                              
                              {product.url && (
                                <div style={{ textAlign: 'center', marginTop: '20px' }}>
                                  <a
                                    href={product.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      display: 'inline-block',
                                      padding: '12px 24px',
                                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                      color: 'white',
                                      textDecoration: 'none',
                                      borderRadius: '10px',
                                      fontWeight: '600',
                                      transition: 'all 0.2s'
                                    }}
                                  >
                                    🔗 Открыть на Wildberries
                                  </a>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Пагинация */}
              {totalPages > 1 && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginTop: '25px',
                  gap: '15px'
                }}>
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    style={{
                      padding: '10px 20px',
                      background: currentPage === 1 ? '#f3f4f6' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: currentPage === 1 ? '#9ca3af' : 'white',
                      border: '2px solid #e5e7eb',
                      borderRadius: '10px',
                      fontWeight: '600',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    ← Предыдущая
                  </button>
                  
                  <span style={{
                    padding: '10px 20px',
                    background: '#f0f9ff',
                    color: '#1e40af',
                    borderRadius: '10px',
                    fontWeight: '600',
                    border: '2px solid #dbeafe'
                  }}>
                    {currentPage} из {totalPages}
                  </span>
                  
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    style={{
                      padding: '10px 20px',
                      background: currentPage === totalPages ? '#f3f4f6' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: currentPage === totalPages ? '#9ca3af' : 'white',
                      border: '2px solid #e5e7eb',
                      borderRadius: '10px',
                      fontWeight: '600',
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Следующая →
                  </button>
                </div>
              )}
            </div>

            {/* Дополнительные метрики */}
            <div style={{
              background: 'white',
              borderRadius: '20px',
              padding: '30px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
            }}>
              <h2 style={{ 
                fontSize: '1.8rem', 
                color: '#1f2937', 
                marginBottom: '25px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px',
                textAlign: 'center',
                justifyContent: 'center'
              }}>
                📊 Дополнительные метрики
              </h2>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '20px',
                marginBottom: '25px'
              }}>
                <div style={{
                  background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                  borderRadius: '15px',
                  padding: '20px',
                  textAlign: 'center',
                  border: '2px solid #e5e7eb'
                }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#10b981', marginBottom: '5px' }}>
                    {formatNumber(data.category_metrics.revenue_per_product)} ₽
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '0.9rem', fontWeight: '500' }}>
                    Выручка на товар
                  </div>
                </div>

                <div style={{
                  background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                  borderRadius: '15px',
                  padding: '20px',
                  textAlign: 'center',
                  border: '2px solid #e5e7eb'
                }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#667eea', marginBottom: '5px' }}>
                    {data.category_metrics.sales_per_product.toFixed(1)} шт.
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '0.9rem', fontWeight: '500' }}>
                    Продаж на товар
                  </div>
                </div>

                <div style={{
                  background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                  borderRadius: '15px',
                  padding: '20px',
                  textAlign: 'center',
                  border: '2px solid #e5e7eb'
                }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#8b5cf6', marginBottom: '5px' }}>
                    {data.category_metrics.products_with_sales_percentage.toFixed(1)}%
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '0.9rem', fontWeight: '500' }}>
                    Товаров с продажами
                  </div>
                </div>

                <div style={{
                  background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                  borderRadius: '15px',
                  padding: '20px',
                  textAlign: 'center',
                  border: '2px solid #e5e7eb'
                }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#f59e0b', marginBottom: '5px' }}>
                    {data.category_metrics.fbs_percentage.toFixed(1)}%
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '0.9rem', fontWeight: '500' }}>
                    FBS товаров
                  </div>
                </div>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                borderRadius: '15px',
                padding: '20px',
                textAlign: 'center',
                border: '2px solid #e5e7eb'
              }}>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                  gap: '20px',
                  fontSize: '14px',
                  color: '#374151'
                }}>
                  <div><strong>📊 Диапазон цен:</strong> {formatNumber(data.category_metrics.price_range_min)} ₽ - {formatNumber(data.category_metrics.price_range_max)} ₽</div>
                  <div><strong>💬 Среднее отзывов:</strong> {data.category_metrics.average_comments.toFixed(1)}</div>
                  <div><strong>🏢 Количество брендов:</strong> {data.category_metrics.top_brands_count}</div>
                </div>
                <div style={{ 
                  marginTop: '15px', 
                  fontSize: '12px', 
                  color: '#6b7280',
                  borderTop: '1px solid #e5e7eb',
                  paddingTop: '15px'
                }}>
                  🔧 <strong>Источник данных:</strong> {data.metadata.processing_info.data_source} | 
                  ⏰ <strong>Обработано:</strong> {new Date(data.metadata.processing_info.processing_timestamp).toLocaleString('ru-RU')}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CSS для анимации спиннера */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default CategoryAnalysis; 