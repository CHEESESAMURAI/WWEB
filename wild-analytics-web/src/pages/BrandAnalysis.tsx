import React, { useState, useCallback } from 'react';
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
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface BrandAnalysisData {
  brand_info: {
    name: string;
    total_products: number;
    total_revenue: number;
    total_sales: number;
    average_price: number;
    average_turnover_days: number;
    date_range: string;
  };
  top_products: Array<{
    name: string;
    category: string;
    final_price: number;
    rating: number;
    sales: number;
    revenue: number;
    url: string;
    thumb_url: string;
    article: string;
    comments: number;
  }>;
  all_products: Array<{
    name: string;
    category: string;
    final_price: number;
    sales: number;
    revenue: number;
    rating: number;
    balance: number;
    purchase: number;
    turnover_days: number;
    comments: number;
    sku_first_date: string;
    basic_sale: number;
    promo_sale: number;
    client_sale: number;
    start_price: number;
    basic_price: number;
    client_price: number;
    category_position: number;
    country: string;
    gender: string;
    picscount: number;
    hasvideo: boolean;
    has3d: boolean;
    article: string;
    url: string;
    is_fbs: boolean;
    thumb_url?: string; // Добавляем thumb_url как опциональное поле
  }>;
  aggregated_charts: {
    sales_graph: { dates: string[]; values: number[] };
    stocks_graph: { dates: string[]; values: number[] };
    price_graph: { dates: string[]; values: number[] };
    visibility_graph: { dates: string[]; values: number[] };
  };
  brand_metrics: {
    products_with_sales: number;
    products_with_sales_percentage: number;
    average_rating: number;
    total_comments: number;
    fbs_percentage: number;
    video_products_count: number;
    d3_products_count: number;
    top_categories: Array<{ name: string; count: number }>;
  };
  metadata: {
    request_params: any;
    processing_info: any;
  };
}

export default function BrandAnalysis() {
  const [brandName, setBrandName] = useState('');
  const [data, setData] = useState<BrandAnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    fbs: 0,
    newsmode: 30,
    period: 30
  });
  const [tableView, setTableView] = useState<'basic' | 'detailed'>('basic');
  const [sortField, setSortField] = useState<string>('revenue');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const getDateRange = useCallback((days: number) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);
    
    return {
      date_from: startDate.toISOString().split('T')[0],
      date_to: endDate.toISOString().split('T')[0]
    };
  }, []);

  const analyzeBrand = async () => {
    if (!brandName.trim()) {
      setError('Введите название бренда');
      return;
    }

    setLoading(true);
    setError('');
    setData(null);

    try {
      const dateRange = getDateRange(filters.period);
      
      const response = await fetch('http://localhost:8000/brand/brand-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brand_name: brandName,
          date_from: dateRange.date_from,
          date_to: dateRange.date_to,
          fbs: filters.fbs,
          newsmode: filters.newsmode
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        let errorMessage = `HTTP error! status: ${response.status}`;
        
        if (errorData?.detail) {
          errorMessage = errorData.detail;
        } else {
          switch (response.status) {
            case 401:
              errorMessage = 'Ошибка авторизации MPStats API. Проверьте API токен.';
              break;
            case 404:
              errorMessage = `Бренд "${brandName}" не найден. Проверьте правильность названия.`;
              break;
            case 408:
              errorMessage = 'Timeout запроса. MPStats API недоступен.';
              break;
            case 500:
              errorMessage = 'Внутренняя ошибка сервера. Попробуйте позже.';
              break;
            default:
              errorMessage = `Ошибка API: ${response.status}`;
          }
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      // Проверяем, что получили данные
      if (!result.brand_info || result.brand_info.total_products === 0) {
        throw new Error(`Нет данных для бренда "${brandName}" за указанный период. Попробуйте изменить фильтры или период.`);
      }
      
      setData(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Произошла неизвестная ошибка при анализе бренда';
      setError(errorMessage);
      console.error('Brand analysis error:', err);
    } finally {
      setLoading(false);
    }
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

  const getSortedProducts = () => {
    if (!data) return [];
    
    const products = [...data.all_products];
    return products.sort((a, b) => {
      const aVal = a[sortField as keyof typeof a] as number;
      const bVal = b[sortField as keyof typeof b] as number;
      
      if (sortDirection === 'desc') {
        return (bVal || 0) - (aVal || 0);
      } else {
        return (aVal || 0) - (bVal || 0);
      }
    });
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
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
          🏢 Анализ бренда
        </h1>
        <p style={{ fontSize: '1.1rem', opacity: 0.9 }}>
          Комплексная аналитика бренда с использованием MPStats API
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
        <div style={{ display: 'flex', gap: '15px', alignItems: 'end', flexWrap: 'wrap' }}>
          <div style={{ flex: '1', minWidth: '250px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              Название бренда
            </label>
            <input
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="Например: Mango, Zara, H&M"
              style={{
                width: '100%',
                padding: '12px 15px',
                border: '2px solid #e5e7eb',
                borderRadius: '10px',
                fontSize: '16px'
              }}
              onKeyPress={(e) => e.key === 'Enter' && analyzeBrand()}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              Период
            </label>
            <select
              value={filters.period}
              onChange={(e) => setFilters({...filters, period: parseInt(e.target.value)})}
              style={{
                padding: '12px 15px',
                border: '2px solid #e5e7eb',
                borderRadius: '10px',
                fontSize: '16px'
              }}
            >
              <option value={7}>7 дней</option>
              <option value={14}>14 дней</option>
              <option value={30}>30 дней</option>
              <option value={90}>90 дней</option>
            </select>
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              FBS
            </label>
            <select
              value={filters.fbs}
              onChange={(e) => setFilters({...filters, fbs: parseInt(e.target.value)})}
              style={{
                padding: '12px 15px',
                border: '2px solid #e5e7eb',
                borderRadius: '10px',
                fontSize: '16px'
              }}
            >
              <option value={0}>Все товары</option>
              <option value={1}>Только FBS</option>
            </select>
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              Новинки
            </label>
            <select
              value={filters.newsmode}
              onChange={(e) => setFilters({...filters, newsmode: parseInt(e.target.value)})}
              style={{
                padding: '12px 15px',
                border: '2px solid #e5e7eb',
                borderRadius: '10px',
                fontSize: '16px'
              }}
            >
              <option value={0}>Все товары</option>
              <option value={7}>За 7 дней</option>
              <option value={14}>За 14 дней</option>
              <option value={30}>За 30 дней</option>
            </select>
          </div>
          
          <button 
            onClick={analyzeBrand}
            disabled={loading}
            style={{
              padding: '12px 25px',
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

      {data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          {/* KPI блок - Общая информация о бренде */}
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '30px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ fontSize: '1.8rem', color: '#1f2937', marginBottom: '25px', textAlign: 'center' }}>
              🏢 {data.brand_info.name} - Общие показатели
            </h2>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '20px'
            }}>
              <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                padding: '20px',
                borderRadius: '15px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '5px' }}>
                  {formatNumber(data.brand_info.total_products)}
                </div>
                <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>Товаров в ассортименте</div>
              </div>
              
              <div style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                padding: '20px',
                borderRadius: '15px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '5px' }}>
                  {formatPrice(data.brand_info.total_revenue).replace('₽', '')}
                </div>
                <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>Общая выручка (₽)</div>
              </div>
              
              <div style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: 'white',
                padding: '20px',
                borderRadius: '15px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '5px' }}>
                  {formatNumber(data.brand_info.total_sales)}
                </div>
                <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>Общие продажи (шт.)</div>
              </div>
              
              <div style={{
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: 'white',
                padding: '20px',
                borderRadius: '15px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '5px' }}>
                  {formatPrice(data.brand_info.average_price).replace('₽', '')}
                </div>
                <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>Средняя цена (₽)</div>
              </div>
              
              <div style={{
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                color: 'white',
                padding: '20px',
                borderRadius: '15px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '5px' }}>
                  {data.brand_info.average_turnover_days.toFixed(1)}
                </div>
                <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>Средняя оборачиваемость (дни)</div>
              </div>
              
              <div style={{
                background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                color: 'white',
                padding: '20px',
                borderRadius: '15px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '5px' }}>
                  {data.brand_metrics.average_rating.toFixed(1)}
                </div>
                <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>Средний рейтинг</div>
              </div>
            </div>
          </div>

          {/* Топ-5 товаров */}
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '30px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ margin: '0 0 25px 0', color: '#1f2937', fontSize: '1.5rem', textAlign: 'center' }}>
              🏆 Топ-5 товаров по выручке
            </h3>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '20px'
            }}>
              {data.top_products.map((product, index) => (
                <div key={index} style={{
                  background: '#f9fafb',
                  borderRadius: '15px',
                  padding: '20px',
                  border: '2px solid #e5e7eb',
                  position: 'relative'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '15px',
                    right: '15px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    padding: '5px 12px',
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    fontWeight: '600'
                  }}>
                    #{index + 1}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '15px', alignItems: 'start' }}>
                    {product.thumb_url && (
                      <img
                        src={product.thumb_url}
                        alt={product.name}
                        style={{
                          width: '80px',
                          height: '80px',
                          objectFit: 'cover',
                          borderRadius: '10px',
                          flexShrink: 0
                        }}
                        onError={(e) => {
                          const img = e.target as HTMLImageElement;
                          img.style.display = 'none';
                        }}
                      />
                    )}
                    
                    <div style={{ flex: 1 }}>
                      <h4 style={{ 
                        margin: '0 0 10px 0',
                        fontSize: '1rem',
                        fontWeight: '600',
                        lineHeight: '1.3',
                        color: '#1f2937'
                      }}>
                        {product.name}
                      </h4>
                      
                      <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '10px' }}>
                        {product.category}
                      </div>
                      
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '8px',
                        fontSize: '0.85rem'
                      }}>
                        <div>
                          <strong style={{ color: '#10b981' }}>
                            {formatPrice(product.final_price)}
                          </strong>
                        </div>
                        <div>
                          ⭐ {product.rating}/5
                        </div>
                        <div>
                          📦 {formatNumber(product.sales)} шт.
                        </div>
                        <div>
                          💰 {formatPrice(product.revenue)}
                        </div>
                      </div>
                      
                      {product.url && (
                        <a
                          href={product.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-block',
                            marginTop: '10px',
                            color: '#667eea',
                            textDecoration: 'none',
                            fontSize: '0.8rem'
                          }}
                        >
                          Перейти к товару →
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Динамика продаж */}
          {data && data.aggregated_charts && data.aggregated_charts.sales_graph && (
            <div style={{
              background: 'white',
              borderRadius: '20px',
              padding: '30px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ margin: '0 0 25px 0', color: '#1f2937', fontSize: '1.5rem', textAlign: 'center' }}>
                📈 Динамика продаж
              </h3>
              <Line
                data={{
                  labels: data.aggregated_charts.sales_graph.dates,
                  datasets: [
                    {
                      label: 'Продажи (шт.)',
                      data: data.aggregated_charts.sales_graph.values,
                      borderColor: '#3b82f6',
                      backgroundColor: 'rgba(59, 130, 246, 0.1)',
                      tension: 0.1,
                      fill: true
                    }
                  ]
                }}
                options={{
                  responsive: true,
                  interaction: {
                    mode: 'index',
                    intersect: false,
                  },
                  scales: {
                    x: {
                      display: true,
                      title: {
                        display: true,
                        text: 'Дата'
                      }
                    },
                    y: {
                      type: 'linear',
                      display: true,
                      position: 'left',
                      title: {
                        display: true,
                        text: 'Продажи (шт.)'
                      },
                      ticks: {
                        color: '#3b82f6'
                      }
                    }
                  },
                  plugins: {
                    legend: {
                      position: 'top' as const,
                    },
                    title: {
                      display: true,
                      text: 'Динамика продаж бренда за выбранный период'
                    }
                  }
                }}
              />
            </div>
          )}

          {/* Динамика цен */}
          {data && data.aggregated_charts && data.aggregated_charts.price_graph && (
            <div style={{
              background: 'white',
              borderRadius: '20px',
              padding: '30px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ margin: '0 0 25px 0', color: '#1f2937', fontSize: '1.5rem', textAlign: 'center' }}>
                📈 Динамика цен
              </h3>
              <Line
                data={{
                  labels: data.aggregated_charts.price_graph.dates,
                  datasets: [
                    {
                      label: 'Цена (₽)',
                      data: data.aggregated_charts.price_graph.values,
                      borderColor: '#8b5cf6',
                      backgroundColor: 'rgba(139, 92, 246, 0.1)',
                      tension: 0.1,
                      fill: true
                    }
                  ]
                }}
                options={{
                  responsive: true,
                  interaction: {
                    mode: 'index',
                    intersect: false,
                  },
                  scales: {
                    x: {
                      display: true,
                      title: {
                        display: true,
                        text: 'Дата'
                      }
                    },
                    y: {
                      type: 'linear',
                      display: true,
                      position: 'left',
                      title: {
                        display: true,
                        text: 'Цена (₽)'
                      },
                      ticks: {
                        color: '#8b5cf6'
                      }
                    }
                  },
                  plugins: {
                    legend: {
                      position: 'top' as const,
                    },
                    title: {
                      display: true,
                      text: 'Динамика цен на товары бренда за выбранный период'
                    }
                  }
                }}
              />
            </div>
          )}

          {/* Динамика остатков */}
          {data && data.aggregated_charts && data.aggregated_charts.stocks_graph && (
            <div style={{
              background: 'white',
              borderRadius: '20px',
              padding: '30px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ margin: '0 0 25px 0', color: '#1f2937', fontSize: '1.5rem', textAlign: 'center' }}>
                📈 Динамика остатков
              </h3>
              <Line
                data={{
                  labels: data.aggregated_charts.stocks_graph.dates,
                  datasets: [
                    {
                      label: 'Остатки (шт.)',
                      data: data.aggregated_charts.stocks_graph.values,
                      borderColor: '#10b981',
                      backgroundColor: 'rgba(16, 185, 129, 0.1)',
                      tension: 0.1,
                      fill: true
                    }
                  ]
                }}
                options={{
                  responsive: true,
                  interaction: {
                    mode: 'index',
                    intersect: false,
                  },
                  scales: {
                    x: {
                      display: true,
                      title: {
                        display: true,
                        text: 'Дата'
                      }
                    },
                    y: {
                      type: 'linear',
                      display: true,
                      position: 'left',
                      title: {
                        display: true,
                        text: 'Остатки (шт.)'
                      },
                      ticks: {
                        color: '#10b981'
                      }
                    }
                  },
                  plugins: {
                    legend: {
                      position: 'top' as const,
                    },
                    title: {
                      display: true,
                      text: 'Динамика остатков товаров бренда за выбранный период'
                    }
                  }
                }}
              />
            </div>
          )}

          {/* Динамика видимости */}
          {data && data.aggregated_charts && data.aggregated_charts.visibility_graph && (
            <div style={{
              background: 'white',
              borderRadius: '20px',
              padding: '30px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ margin: '0 0 25px 0', color: '#1f2937', fontSize: '1.5rem', textAlign: 'center' }}>
                📈 Динамика видимости
              </h3>
              <Line
                data={{
                  labels: data.aggregated_charts.visibility_graph.dates,
                  datasets: [
                    {
                      label: 'Видимость (%)',
                      data: data.aggregated_charts.visibility_graph.values,
                      borderColor: '#f59e0b',
                      backgroundColor: 'rgba(245, 158, 11, 0.1)',
                      tension: 0.1,
                      fill: true
                    }
                  ]
                }}
                options={{
                  responsive: true,
                  interaction: {
                    mode: 'index',
                    intersect: false,
                  },
                  scales: {
                    x: {
                      display: true,
                      title: {
                        display: true,
                        text: 'Дата'
                      }
                    },
                    y: {
                      type: 'linear',
                      display: true,
                      position: 'left',
                      title: {
                        display: true,
                        text: 'Видимость (%)'
                      },
                      ticks: {
                        color: '#f59e0b'
                      }
                    }
                  },
                  plugins: {
                    legend: {
                      position: 'top' as const,
                    },
                    title: {
                      display: true,
                      text: 'Динамика видимости товаров бренда за выбранный период'
                    }
                  }
                }}
              />
            </div>
          )}

          {/* Топ-категории */}
          {data && data.brand_metrics && data.brand_metrics.top_categories && data.brand_metrics.top_categories.length > 0 && (
            <div style={{
              background: 'white',
              borderRadius: '20px',
              padding: '30px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ margin: '0 0 25px 0', color: '#1f2937', fontSize: '1.5rem', textAlign: 'center' }}>
                📊 Топ-категории
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'center' }}>
                {data.brand_metrics.top_categories.map((category, index) => (
                  <span key={index} style={{
                    padding: '10px 20px',
                    background: '#e0e7ff',
                    color: '#3730a3',
                    borderRadius: '20px',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}>
                    {category.name} ({category.count})
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Топ-продукты (по выручке) */}
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '30px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ margin: '0 0 25px 0', color: '#1f2937', fontSize: '1.5rem', textAlign: 'center' }}>
              🏆 Топ-продукты по выручке
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '20px'
            }}>
              {data.top_products.map((product, index) => (
                <div key={index} style={{
                  background: '#f9fafb',
                  borderRadius: '15px',
                  padding: '20px',
                  border: '2px solid #e5e7eb',
                  position: 'relative'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '15px',
                    right: '15px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    padding: '5px 12px',
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    fontWeight: '600'
                  }}>
                    #{index + 1}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '15px', alignItems: 'start' }}>
                    {product.thumb_url && (
                      <img
                        src={product.thumb_url}
                        alt={product.name}
                        style={{
                          width: '80px',
                          height: '80px',
                          objectFit: 'cover',
                          borderRadius: '10px',
                          flexShrink: 0
                        }}
                        onError={(e) => {
                          const img = e.target as HTMLImageElement;
                          img.style.display = 'none';
                        }}
                      />
                    )}
                    
                    <div style={{ flex: 1 }}>
                      <h4 style={{ 
                        margin: '0 0 10px 0',
                        fontSize: '1rem',
                        fontWeight: '600',
                        lineHeight: '1.3',
                        color: '#1f2937'
                      }}>
                        {product.name}
                      </h4>
                      
                      <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '10px' }}>
                        {product.category}
                      </div>
                      
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '8px',
                        fontSize: '0.85rem'
                      }}>
                        <div>
                          <strong style={{ color: '#10b981' }}>
                            {formatPrice(product.final_price)}
                          </strong>
                        </div>
                        <div>
                          ⭐ {product.rating}/5
                        </div>
                        <div>
                          📦 {formatNumber(product.sales)} шт.
                        </div>
                        <div>
                          💰 {formatPrice(product.revenue)}
                        </div>
                      </div>
                      
                      {product.url && (
                        <a
                          href={product.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-block',
                            marginTop: '10px',
                            color: '#667eea',
                            textDecoration: 'none',
                            fontSize: '0.8rem'
                          }}
                        >
                          Перейти к товару →
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Графики бренда */}
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
              {/* График продаж */}
              {data.aggregated_charts.sales_graph && data.aggregated_charts.sales_graph.dates.length > 0 && (
                <div style={{
                  background: '#f9fafb',
                  borderRadius: '15px',
                  padding: '25px',
                  border: '2px solid #e5e7eb'
                }}>
                  <h4 style={{ margin: '0 0 20px 0', color: '#1f2937', textAlign: 'center', fontSize: '1.2rem' }}>
                    📈 Динамика продаж
                  </h4>
                  <Line
                    data={{
                      labels: data.aggregated_charts.sales_graph.dates.map(date => 
                        new Date(date).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' })
                      ),
                      datasets: [{
                        label: 'Продажи (шт.)',
                        data: data.aggregated_charts.sales_graph.values,
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.4,
                        fill: true
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

              {/* График остатков */}
              {data.aggregated_charts.stocks_graph && data.aggregated_charts.stocks_graph.dates.length > 0 && (
                <div style={{
                  background: '#f9fafb',
                  borderRadius: '15px',
                  padding: '25px',
                  border: '2px solid #e5e7eb'
                }}>
                  <h4 style={{ margin: '0 0 20px 0', color: '#1f2937', textAlign: 'center', fontSize: '1.2rem' }}>
                    📦 Динамика остатков
                  </h4>
                  <Line
                    data={{
                      labels: data.aggregated_charts.stocks_graph.dates.map(date => 
                        new Date(date).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' })
                      ),
                      datasets: [{
                        label: 'Остатки (шт.)',
                        data: data.aggregated_charts.stocks_graph.values,
                        borderColor: '#8b5cf6',
                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                        tension: 0.4,
                        fill: true
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
              {data.aggregated_charts.price_graph && data.aggregated_charts.price_graph.dates.length > 0 && (
                <div style={{
                  background: '#f9fafb',
                  borderRadius: '15px',
                  padding: '25px',
                  border: '2px solid #e5e7eb'
                }}>
                  <h4 style={{ margin: '0 0 20px 0', color: '#1f2937', textAlign: 'center', fontSize: '1.2rem' }}>
                    💰 Динамика средних цен
                  </h4>
                  <Line
                    data={{
                      labels: data.aggregated_charts.price_graph.dates.map(date => 
                        new Date(date).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' })
                      ),
                      datasets: [{
                        label: 'Средняя цена (₽)',
                        data: data.aggregated_charts.price_graph.values,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.4,
                        fill: true
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

              {/* График видимости */}
              {data.aggregated_charts.visibility_graph && data.aggregated_charts.visibility_graph.dates.length > 0 && (
                <div style={{
                  background: '#f9fafb',
                  borderRadius: '15px',
                  padding: '25px',
                  border: '2px solid #e5e7eb'
                }}>
                  <h4 style={{ margin: '0 0 20px 0', color: '#1f2937', textAlign: 'center', fontSize: '1.2rem' }}>
                    👁️ Видимость товаров
                  </h4>
                  <Line
                    data={{
                      labels: data.aggregated_charts.visibility_graph.dates.map(date => 
                        new Date(date).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' })
                      ),
                      datasets: [{
                        label: 'Видимость',
                        data: data.aggregated_charts.visibility_graph.values,
                        borderColor: '#f59e0b',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        tension: 0.4,
                        fill: true
                      }]
                    }}
                    options={{
                      responsive: true,
                      plugins: {
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              return `Видимость: ${context.parsed.y}`;
                            }
                          }
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          title: {
                            display: true,
                            text: 'Показатель видимости'
                          }
                        }
                      }
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Дополнительные метрики бренда */}
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '30px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ margin: '0 0 25px 0', color: '#1f2937', fontSize: '1.5rem', textAlign: 'center' }}>
              📋 Дополнительные метрики
            </h3>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '20px'
            }}>
              <div style={{
                background: '#f9fafb',
                padding: '20px',
                borderRadius: '15px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📊</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937', marginBottom: '5px' }}>
                  {data.brand_metrics.products_with_sales_percentage}%
                </div>
                <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                  Товаров с продажами
                </div>
              </div>
              
              <div style={{
                background: '#f9fafb',
                padding: '20px',
                borderRadius: '15px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '10px' }}>💬</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937', marginBottom: '5px' }}>
                  {formatNumber(data.brand_metrics.total_comments)}
                </div>
                <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                  Всего отзывов
                </div>
              </div>
              
              <div style={{
                background: '#f9fafb',
                padding: '20px',
                borderRadius: '15px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📦</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937', marginBottom: '5px' }}>
                  {data.brand_metrics.fbs_percentage}%
                </div>
                <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                  Товаров FBS
                </div>
              </div>
              
              <div style={{
                background: '#f9fafb',
                padding: '20px',
                borderRadius: '15px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🎥</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937', marginBottom: '5px' }}>
                  {data.brand_metrics.video_products_count}
                </div>
                <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                  Товаров с видео
                </div>
              </div>
            </div>
          </div>

          {/* Таблица товаров */}
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '30px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '25px',
              flexWrap: 'wrap',
              gap: '15px'
            }}>
              <h3 style={{ margin: 0, color: '#1f2937', fontSize: '1.5rem' }}>
                📋 Все товары бренда ({data.all_products.length})
              </h3>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setTableView('basic')}
                  style={{
                    padding: '8px 16px',
                    background: tableView === 'basic' ? '#667eea' : '#f3f4f6',
                    color: tableView === 'basic' ? 'white' : '#374151',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  Основные данные
                </button>
                <button
                  onClick={() => setTableView('detailed')}
                  style={{
                    padding: '8px 16px',
                    background: tableView === 'detailed' ? '#667eea' : '#f3f4f6',
                    color: tableView === 'detailed' ? 'white' : '#374151',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  Детальные данные
                </button>
              </div>
            </div>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    <th style={tableHeaderStyle} onClick={() => handleSort('name')}>
                      Товар {sortField === 'name' && (sortDirection === 'desc' ? '↓' : '↑')}
                    </th>
                    <th style={tableHeaderStyle} onClick={() => handleSort('category')}>
                      Категория {sortField === 'category' && (sortDirection === 'desc' ? '↓' : '↑')}
                    </th>
                    <th style={tableHeaderStyle} onClick={() => handleSort('final_price')}>
                      Цена {sortField === 'final_price' && (sortDirection === 'desc' ? '↓' : '↑')}
                    </th>
                    <th style={tableHeaderStyle} onClick={() => handleSort('sales')}>
                      Продажи {sortField === 'sales' && (sortDirection === 'desc' ? '↓' : '↑')}
                    </th>
                    <th style={tableHeaderStyle} onClick={() => handleSort('revenue')}>
                      Выручка {sortField === 'revenue' && (sortDirection === 'desc' ? '↓' : '↑')}
                    </th>
                    <th style={tableHeaderStyle} onClick={() => handleSort('rating')}>
                      Рейтинг {sortField === 'rating' && (sortDirection === 'desc' ? '↓' : '↑')}
                    </th>
                    <th style={tableHeaderStyle} onClick={() => handleSort('balance')}>
                      Остаток {sortField === 'balance' && (sortDirection === 'desc' ? '↓' : '↑')}
                    </th>
                    {tableView === 'detailed' && (
                      <>
                        <th style={tableHeaderStyle} onClick={() => handleSort('purchase')}>
                          Выкуп % {sortField === 'purchase' && (sortDirection === 'desc' ? '↓' : '↑')}
                        </th>
                        <th style={tableHeaderStyle} onClick={() => handleSort('turnover_days')}>
                          Оборот (дни) {sortField === 'turnover_days' && (sortDirection === 'desc' ? '↓' : '↑')}
                        </th>
                        <th style={tableHeaderStyle} onClick={() => handleSort('comments')}>
                          Отзывы {sortField === 'comments' && (sortDirection === 'desc' ? '↓' : '↑')}
                        </th>
                        <th style={tableHeaderStyle}>Дополнительно</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {getSortedProducts().map((product, index) => (
                    <tr key={index} style={{
                      borderBottom: '1px solid #e5e7eb'
                    }}>
                      <td style={tableCellStyle}>
                        <div style={{ maxWidth: '200px' }}>
                          <div style={{ fontWeight: '600', fontSize: '0.9rem', marginBottom: '2px' }}>
                            {product.name}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                            {product.article}
                          </div>
                        </div>
                      </td>
                      <td style={tableCellStyle}>{product.category}</td>
                      <td style={tableCellStyle}>{formatPrice(product.final_price)}</td>
                      <td style={tableCellStyle}>{formatNumber(product.sales)}</td>
                      <td style={tableCellStyle}>{formatPrice(product.revenue)}</td>
                      <td style={tableCellStyle}>
                        <span style={{
                          color: product.rating >= 4.5 ? '#10b981' : product.rating >= 4 ? '#f59e0b' : '#ef4444'
                        }}>
                          {product.rating}/5
                        </span>
                      </td>
                      <td style={tableCellStyle}>{formatNumber(product.balance)}</td>
                      {tableView === 'detailed' && (
                        <>
                          <td style={tableCellStyle}>{product.purchase}%</td>
                          <td style={tableCellStyle}>{product.turnover_days}</td>
                          <td style={tableCellStyle}>{formatNumber(product.comments)}</td>
                          <td style={tableCellStyle}>
                            <div style={{ fontSize: '0.8rem' }}>
                              {product.is_fbs && <span style={{ color: '#10b981' }}>FBS </span>}
                              {product.hasvideo && <span style={{ color: '#f59e0b' }}>📹 </span>}
                              {product.has3d && <span style={{ color: '#8b5cf6' }}>3️⃣ </span>}
                              <br />
                              {product.country && <span style={{ color: '#6b7280' }}>{product.country}</span>}
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const tableHeaderStyle = {
  padding: '12px',
  textAlign: 'left' as const,
  fontWeight: '600',
  color: '#374151',
  fontSize: '0.9rem',
  cursor: 'pointer',
  userSelect: 'none' as const,
  border: '1px solid #e5e7eb'
};

const tableCellStyle = {
  padding: '12px',
  fontSize: '0.85rem',
  color: '#1f2937',
  border: '1px solid #e5e7eb'
}; 