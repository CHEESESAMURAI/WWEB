import React, { useState, useCallback } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
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

interface SellerDetail {
  name: string;
  seller_id: number;
  items: number;
  items_with_sells: number;
  items_with_sells_percent: number;
  brands_count: number;
  brands_with_sells: number;
  brands_with_sells_percent: number;
  sales: number;
  revenue: number;
  avg_sales_per_item: number;
  avg_sales_per_item_with_sells: number;
  avg_revenue_per_item: number;
  avg_revenue_per_item_with_sells: number;
  stock_end_period: number;
  avg_price: number;
  avg_rating: number;
  avg_feedbacks: number;
  position: number;
  sales_graph: number[];
  graph_dates: string[];
  status: string;
  profit_margin: number;
}

interface SellerAnalytics {
  total_sellers: number;
  total_revenue: number;
  total_sales: number;
  avg_items_per_seller: number;
  avg_revenue_per_seller: number;
  top_seller_revenue: number;
  avg_rating: number;
  sellers_with_sales_percentage: number;
}

interface SellerRecommendations {
  recommended_sellers: string[];
  avoid_sellers: string[];
  budget_recommendations: string;
  high_margin_sellers: string[];
  low_risk_sellers: string[];
  expansion_opportunities: string[];
  optimization_suggestions: string[];
}

interface SellerAnalysisData {
  sellers: SellerDetail[];
  analytics: SellerAnalytics;
  recommendations: SellerRecommendations;
  top_5_sellers: SellerDetail[];
  total_found: number;
}

const SellerAnalysis: React.FC = () => {
  const [brand, setBrand] = useState('');
  const [dateFrom, setDateFrom] = useState('2024-06-01');
  const [dateTo, setDateTo] = useState('2024-07-01');
  const [fbs, setFbs] = useState(0);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SellerAnalysisData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Фильтры
  const [minItems, setMinItems] = useState<number | null>(null);
  const [minRevenue, setMinRevenue] = useState<number | null>(null);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [maxStock, setMaxStock] = useState<number | null>(null);
  const [minSellsPercent, setMinSellsPercent] = useState<number | null>(null);
  
  // Сортировка и отображение
  const [sortBy, setSortBy] = useState<string>('revenue');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [expandedSeller, setExpandedSeller] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('ru-RU').format(num);
  };

  const formatPrice = (num: number): string => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0
    }).format(num);
  };

  const analyzeSellers = useCallback(async () => {
    if (!brand.trim()) {
      setError('Введите название бренда для анализа');
      return;
    }

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const response = await fetch('http://localhost:8000/seller/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brand,
          date_from: dateFrom,
          date_to: dateTo,
          fbs
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
  }, [brand, dateFrom, dateTo, fbs]);

  const exportToXLSX = useCallback(async () => {
    if (!data) return;
    
    try {
      const response = await fetch('http://localhost:8000/seller/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brand,
          date_from: dateFrom,
          date_to: dateTo,
          fbs
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sellers_${brand}_${new Date().toISOString().slice(0, 10)}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        setError('Ошибка при экспорте данных');
      }
    } catch (err) {
      setError('Ошибка сети при экспорте');
      console.error('Export error:', err);
    }
  }, [brand, dateFrom, dateTo, fbs, data]);

  const getFilteredAndSortedSellers = () => {
    if (!data) return [];
    
    let filtered = [...data.sellers];
    
    // Применяем фильтры
    if (minItems !== null) {
      filtered = filtered.filter(s => s.items >= minItems);
    }
    if (minRevenue !== null) {
      filtered = filtered.filter(s => s.revenue >= minRevenue);
    }
    if (minRating !== null) {
      filtered = filtered.filter(s => s.avg_rating >= minRating);
    }
    if (maxStock !== null) {
      filtered = filtered.filter(s => s.stock_end_period <= maxStock);
    }
    if (minSellsPercent !== null) {
      filtered = filtered.filter(s => s.items_with_sells_percent >= minSellsPercent);
    }
    
    // Сортировка
    filtered.sort((a, b) => {
      const aVal = (a as any)[sortBy] || 0;
      const bVal = (b as any)[sortBy] || 0;
      
      if (sortOrder === 'desc') {
        return bVal - aVal;
      } else {
        return aVal - bVal;
      }
    });
    
    return filtered;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '🔥 Топ-продавец': return '#ef4444';
      case '🚀 Перспективный': return '#10b981';
      case '📊 Стабильный': return '#3b82f6';
      case '📉 Слабая динамика': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getAnalyticsCharts = () => {
    if (!data) return { statusChart: null, revenueChart: null };
    
    // График по статусам продавцов
    const statusCount: Record<string, number> = {};
    data.sellers.forEach(seller => {
      statusCount[seller.status] = (statusCount[seller.status] || 0) + 1;
    });
    
    const statusChart = {
      labels: Object.keys(statusCount),
      datasets: [{
        data: Object.values(statusCount),
        backgroundColor: Object.keys(statusCount).map(status => getStatusColor(status)),
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    };
    
    // График топ-10 продавцов по выручке
    const top10 = data.sellers.slice(0, 10);
    const revenueChart = {
      labels: top10.map(s => s.name.length > 20 ? s.name.substring(0, 20) + '...' : s.name),
      datasets: [{
        label: 'Выручка (₽)',
        data: top10.map(s => s.revenue),
        backgroundColor: 'rgba(102, 126, 234, 0.8)',
        borderColor: '#667eea',
        borderWidth: 2
      }]
    };
    
    return { statusChart, revenueChart };
  };

  const { statusChart, revenueChart } = getAnalyticsCharts();
  const filteredSellers = getFilteredAndSortedSellers();

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          font: { size: 12, weight: 'bold' as const },
          color: '#374151',
          padding: 15
        }
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleColor: '#F9FAFB',
        bodyColor: '#F9FAFB',
        borderColor: '#6B7280',
        borderWidth: 1,
        cornerRadius: 8
      }
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #f0f9ff 0%, #e0e7ff 100%)',
      padding: '20px 0'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 20px' }}>
        {/* Заголовок */}
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
              🏪 Анализ продавцов
            </h1>
            <p style={{ 
              color: '#6b7280', 
              fontSize: '1.2rem', 
              margin: '0',
              fontWeight: '500'
            }}>
              Полный анализ продавцов бренда с AI-рекомендациями и детальной аналитикой
            </p>
          </div>
          
          {/* Форма поиска */}
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
                🏷️ Бренд
              </label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Nike, Adidas, Apple..."
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
                📅 Дата начала
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
                📅 Дата окончания
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
                📦 FBS фильтр
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
                <option value={0}>Все продавцы</option>
                <option value={1}>Только FBS</option>
              </select>
            </div>
          </div>

          <button
            onClick={analyzeSellers}
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
                Анализируем продавцов...
              </span>
            ) : (
              '🔍 Анализировать продавцов'
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
            {/* Общая аналитика */}
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
                justifyContent: 'center'
              }}>
                📊 Общая аналитика по продавцам
              </h2>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '20px',
                marginBottom: '30px'
              }}>
                <div style={{
                  background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                  borderRadius: '15px',
                  padding: '20px',
                  textAlign: 'center',
                  border: '2px solid #e5e7eb'
                }}>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#667eea', marginBottom: '5px' }}>
                    {data.analytics.total_sellers}
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '0.9rem', fontWeight: '500' }}>
                    Всего продавцов
                  </div>
                </div>

                <div style={{
                  background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                  borderRadius: '15px',
                  padding: '20px',
                  textAlign: 'center',
                  border: '2px solid #e5e7eb'
                }}>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#10b981', marginBottom: '5px' }}>
                    {formatPrice(data.analytics.total_revenue)}
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '0.9rem', fontWeight: '500' }}>
                    Общая выручка
                  </div>
                </div>

                <div style={{
                  background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                  borderRadius: '15px',
                  padding: '20px',
                  textAlign: 'center',
                  border: '2px solid #e5e7eb'
                }}>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#f59e0b', marginBottom: '5px' }}>
                    {formatNumber(data.analytics.total_sales)}
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '0.9rem', fontWeight: '500' }}>
                    Общие продажи
                  </div>
                </div>

                <div style={{
                  background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                  borderRadius: '15px',
                  padding: '20px',
                  textAlign: 'center',
                  border: '2px solid #e5e7eb'
                }}>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#8b5cf6', marginBottom: '5px' }}>
                    {data.analytics.avg_rating.toFixed(1)}★
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '0.9rem', fontWeight: '500' }}>
                    Средний рейтинг
                  </div>
                </div>
              </div>

              {/* Графики */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
                gap: '30px'
              }}>
                {statusChart && (
                  <div style={{ height: '300px' }}>
                    <h3 style={{ textAlign: 'center', marginBottom: '20px', color: '#374151' }}>
                      Распределение по статусам
                    </h3>
                    <Doughnut data={statusChart} options={chartOptions} />
                  </div>
                )}

                {revenueChart && (
                  <div style={{ height: '300px' }}>
                    <h3 style={{ textAlign: 'center', marginBottom: '20px', color: '#374151' }}>
                      Топ-10 продавцов по выручке
                    </h3>
                    <Bar data={revenueChart} options={chartOptions} />
                  </div>
                )}
              </div>
            </div>

            {/* AI Рекомендации */}
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
                justifyContent: 'center'
              }}>
                🤖 AI Рекомендации по продавцам
              </h2>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                gap: '25px'
              }}>
                {/* Рекомендуемые продавцы */}
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
                    ✅ Рекомендуемые продавцы
                  </h3>
                  <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.6' }}>
                    {data.recommendations.recommended_sellers.map((seller, idx) => (
                      <li key={idx} style={{ marginBottom: '8px', color: '#166534' }}>
                        {seller}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Избегать продавцов */}
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
                    ❌ Избегать продавцов
                  </h3>
                  <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.6' }}>
                    {data.recommendations.avoid_sellers.map((seller, idx) => (
                      <li key={idx} style={{ marginBottom: '8px', color: '#dc2626' }}>
                        {seller}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Бюджетные рекомендации */}
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
                    💰 Бюджетные рекомендации
                  </h3>
                  <p style={{ margin: 0, color: '#d97706', lineHeight: '1.6' }}>
                    {data.recommendations.budget_recommendations}
                  </p>
                </div>

                {/* Высокомаржинальные продавцы */}
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
                    📈 Высокая маржинальность
                  </h3>
                  <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.6' }}>
                    {data.recommendations.high_margin_sellers.map((seller, idx) => (
                      <li key={idx} style={{ marginBottom: '8px', color: '#7c3aed' }}>
                        {seller}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Низкорисковые продавцы */}
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
                    🛡️ Низкорисковые продавцы
                  </h3>
                  <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.6' }}>
                    {data.recommendations.low_risk_sellers.map((seller, idx) => (
                      <li key={idx} style={{ marginBottom: '8px', color: '#1e40af' }}>
                        {seller}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Возможности расширения */}
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
                    🚀 Возможности расширения
                  </h3>
                  <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.6' }}>
                    {data.recommendations.expansion_opportunities.map((opportunity, idx) => (
                      <li key={idx} style={{ marginBottom: '8px', color: '#047857' }}>
                        {opportunity}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Фильтры и управление */}
            <div style={{
              background: 'white',
              borderRadius: '20px',
              padding: '20px 30px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '20px'
            }}>
              <button
                onClick={() => setShowFilters(!showFilters)}
                style={{
                  padding: '10px 20px',
                  background: showFilters ? '#667eea' : '#f3f4f6',
                  color: showFilters ? 'white' : '#374151',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                🔍 Фильтры
              </button>

              <div>
                <label style={{ fontWeight: '600', color: '#374151', marginRight: '10px' }}>
                  Сортировка:
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    marginRight: '10px'
                  }}
                >
                  <option value="revenue">По выручке</option>
                  <option value="items">По количеству товаров</option>
                  <option value="sales">По продажам</option>
                  <option value="avg_price">По средней цене</option>
                  <option value="avg_rating">По рейтингу</option>
                </select>
                
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                  style={{
                    padding: '8px 12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                >
                  <option value="desc">По убыванию</option>
                  <option value="asc">По возрастанию</option>
                </select>
              </div>
              
              <button
                onClick={exportToXLSX}
                disabled={!data}
                style={{
                  padding: '10px 20px',
                  background: data ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#9ca3af',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: data ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                📊 Экспорт в Excel
              </button>
              
              <div style={{ marginLeft: 'auto', fontWeight: '600', color: '#6b7280' }}>
                Показано: {filteredSellers.length} из {data.total_found}
              </div>
            </div>

            {/* Панель фильтров */}
            {showFilters && (
              <div style={{
                background: 'white',
                borderRadius: '20px',
                padding: '25px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '20px'
              }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                    Мин. товаров
                  </label>
                  <input
                    type="number"
                    value={minItems || ''}
                    onChange={(e) => setMinItems(e.target.value ? Number(e.target.value) : null)}
                    placeholder="0"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                    Мин. выручка (₽)
                  </label>
                  <input
                    type="number"
                    value={minRevenue || ''}
                    onChange={(e) => setMinRevenue(e.target.value ? Number(e.target.value) : null)}
                    placeholder="0"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                    Мин. рейтинг
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={minRating || ''}
                    onChange={(e) => setMinRating(e.target.value ? Number(e.target.value) : null)}
                    placeholder="0"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                    Макс. остаток
                  </label>
                  <input
                    type="number"
                    value={maxStock || ''}
                    onChange={(e) => setMaxStock(e.target.value ? Number(e.target.value) : null)}
                    placeholder="1000"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                    Мин. % продаж
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={minSellsPercent || ''}
                    onChange={(e) => setMinSellsPercent(e.target.value ? Number(e.target.value) : null)}
                    placeholder="0"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                
                <div style={{ display: 'flex', alignItems: 'end' }}>
                  <button
                    onClick={() => {
                      setMinItems(null);
                      setMinRevenue(null);
                      setMinRating(null);
                      setMaxStock(null);
                      setMinSellsPercent(null);
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: '#f3f4f6',
                      color: '#374151',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Сбросить фильтры
                  </button>
                </div>
              </div>
            )}

            {/* Топ-5 продавцов */}
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
                justifyContent: 'center'
              }}>
                🏆 Топ-5 продавцов
              </h2>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '20px'
              }}>
                {data.top_5_sellers.map((seller, index) => (
                  <div key={seller.seller_id} style={{
                    background: index === 0 ? 'linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%)' : 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                    borderRadius: '15px',
                    padding: '20px',
                    border: index === 0 ? '2px solid #f59e0b' : '2px solid #e5e7eb',
                    position: 'relative'
                  }}>
                    {index === 0 && (
                      <div style={{
                        position: 'absolute',
                        top: '-10px',
                        right: '15px',
                        background: '#f59e0b',
                        color: 'white',
                        padding: '5px 15px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '700'
                      }}>
                        👑 #1
                      </div>
                    )}
                    
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '15px',
                      marginBottom: '15px'
                    }}>
                      <div style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: '50%',
                        background: getStatusColor(seller.status),
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px',
                        fontWeight: '700'
                      }}>
                        #{index + 1}
                      </div>
                      
                      <div style={{ flex: 1 }}>
                        <h3 style={{
                          margin: '0 0 5px 0',
                          fontSize: '1.1rem',
                          color: '#1f2937',
                          fontWeight: '700'
                        }}>
                          {seller.name.length > 30 ? seller.name.substring(0, 30) + '...' : seller.name}
                        </h3>
                        <div style={{
                          fontSize: '12px',
                          color: getStatusColor(seller.status),
                          fontWeight: '600'
                        }}>
                          {seller.status}
                        </div>
                      </div>
                    </div>
                    
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '10px',
                      fontSize: '14px'
                    }}>
                      <div>
                        <span style={{ color: '#6b7280' }}>Выручка:</span>
                        <div style={{ fontWeight: '700', color: '#10b981' }}>
                          {formatPrice(seller.revenue)}
                        </div>
                      </div>
                      
                      <div>
                        <span style={{ color: '#6b7280' }}>Товаров:</span>
                        <div style={{ fontWeight: '700', color: '#3b82f6' }}>
                          {formatNumber(seller.items)}
                        </div>
                      </div>
                      
                      <div>
                        <span style={{ color: '#6b7280' }}>Рейтинг:</span>
                        <div style={{ fontWeight: '700', color: '#f59e0b' }}>
                          {seller.avg_rating.toFixed(1)}★
                        </div>
                      </div>
                      
                      <div>
                        <span style={{ color: '#6b7280' }}>% продаж:</span>
                        <div style={{ fontWeight: '700', color: '#8b5cf6' }}>
                          {seller.items_with_sells_percent.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Детальная таблица продавцов */}
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
                justifyContent: 'center'
              }}>
                📋 Детальная таблица продавцов
              </h2>
              
              <div style={{ overflowX: 'auto' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '14px'
                }}>
                  <thead>
                    <tr style={{ background: '#f9fafb' }}>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Продавец</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#374151' }}>Товары</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#374151' }}>% продаж</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#374151' }}>Выручка</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#374151' }}>Продажи</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#374151' }}>Рейтинг</th>
                      <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#374151' }}>Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSellers.map((seller) => (
                      <tr 
                        key={seller.seller_id}
                        style={{
                          borderBottom: '1px solid #e5e7eb',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        onClick={() => setExpandedSeller(expandedSeller === seller.seller_id ? null : seller.seller_id)}
                      >
                        <td style={{ padding: '12px' }}>
                          <div>
                            <div style={{ fontWeight: '600', color: '#1f2937' }}>
                              {seller.name.length > 40 ? seller.name.substring(0, 40) + '...' : seller.name}
                            </div>
                            <div style={{ fontSize: '12px', color: '#6b7280' }}>
                              ID: {seller.seller_id}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>
                          <div>{formatNumber(seller.items)}</div>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>
                            {formatNumber(seller.items_with_sells)} с продажами
                          </div>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#8b5cf6' }}>
                          {seller.items_with_sells_percent.toFixed(1)}%
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#10b981' }}>
                          {formatPrice(seller.revenue)}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#3b82f6' }}>
                          {formatNumber(seller.sales)}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#f59e0b' }}>
                          {seller.avg_rating.toFixed(1)}★
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <span style={{
                            background: getStatusColor(seller.status) + '20',
                            color: getStatusColor(seller.status),
                            padding: '4px 8px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}>
                            {seller.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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

export default SellerAnalysis; 