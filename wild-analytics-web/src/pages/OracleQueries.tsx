import React, { useState, useCallback } from 'react';
import { Line, Bar, Doughnut, Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
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
  RadialLinearScale,
  Title,
  Tooltip,
  Legend
);

interface QueryDetail {
  query: string;
  rank: number;
  frequency_30d: number;
  dynamics_30d: number;
  dynamics_60d: number;
  dynamics_90d: number;
  revenue_30d: number;
  avg_revenue: number;
  missed_revenue_percent: number;
  monopoly_percent: number;
  avg_price: number;
  ads_percent: number;
  growth_graph: number[];
  graph_dates: string[];
}

interface DetailItem {
  name: string;
  article: string | null;
  brand: string;
  supplier: string;
  revenue: number;
  missed_revenue: number;
  orders: number;
  category: string;
  rating: number;
  position: number;
}

interface CategorySummary {
  name: string;
  revenue: number;
  sales: number;
  monopoly_percent: number;
  ads_percent: number;
  top_products: string[];
  growth_chart: number[];
  growth_percent: number;
  product_count: number;
}

interface AIRecommendations {
  market_insights: string;
  growth_opportunities: string;
  risk_analysis: string;
  strategic_recommendations: string;
  trend_analysis: string;
}

interface OracleAnalytics {
  total_queries: number;
  total_revenue: number;
  total_missed_revenue: number;
  avg_monopoly: number;
  avg_ads_percent: number;
  fastest_growing_category: string;
  most_monopoly_category: string;
  highest_missed_revenue_category: string;
  ai_recommendations?: AIRecommendations;
}

interface OracleAnalysisData {
  queries: QueryDetail[];
  detail_items: DetailItem[];
  category_summaries: CategorySummary[];
  analytics: OracleAnalytics;
  analysis_type: string;
  analysis_month: string;
  total_found: number;
}

const OracleQueries: React.FC = () => {
  const [categoriesCount, setCategoriesCount] = useState(10);
  const [analysisMonth, setAnalysisMonth] = useState('2024-07');
  const [minRevenue, setMinRevenue] = useState(10000);
  const [minFrequency, setMinFrequency] = useState(100);
  const [analysisType, setAnalysisType] = useState('queries');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OracleAnalysisData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // UI состояния
  const [activeTab, setActiveTab] = useState<'queries' | 'details' | 'categories' | 'charts' | 'ai'>('queries');
  const [sortBy, setSortBy] = useState<string>('revenue_30d');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

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

  const formatPercent = (num: number): string => {
    return `${num.toFixed(1)}%`;
  };

  const analyzeOracle = useCallback(async () => {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const response = await fetch('http://localhost:8000/oracle/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          categories_count: categoriesCount,
          analysis_month: analysisMonth,
          min_revenue: minRevenue,
          min_frequency: minFrequency,
          analysis_type: analysisType
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
  }, [categoriesCount, analysisMonth, minRevenue, minFrequency, analysisType]);

  const exportToXLSX = useCallback(async () => {
    if (!data) return;
    
    try {
      const response = await fetch('http://localhost:8000/oracle/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          categories_count: categoriesCount,
          analysis_month: analysisMonth,
          min_revenue: minRevenue,
          min_frequency: minFrequency,
          analysis_type: analysisType
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `oracle_analysis_${analysisMonth}_${new Date().toISOString().slice(0, 10)}.xlsx`;
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
  }, [categoriesCount, analysisMonth, minRevenue, minFrequency, analysisType, data]);

  const getSortedQueries = () => {
    if (!data) return [];
    
    return [...data.queries].sort((a, b) => {
      const aVal = (a as any)[sortBy] || 0;
      const bVal = (b as any)[sortBy] || 0;
      
      if (sortOrder === 'desc') {
        return bVal - aVal;
      } else {
        return aVal - bVal;
      }
    });
  };

  const getGrowthColor = (growth: number) => {
    if (growth > 20) return '#10b981'; // Зеленый
    if (growth > 10) return '#f59e0b'; // Желтый
    return '#ef4444'; // Красный
  };

  const getSparklineChart = (data: number[], dates: string[]) => {
    return {
      labels: dates,
      datasets: [{
        data: data,
        borderColor: '#667eea',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4
      }]
    };
  };

  const sparklineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false }
    },
    scales: {
      x: { display: false },
      y: { display: false }
    },
    elements: {
      point: { radius: 0 }
    }
  };

  const getBigChartsData = () => {
    if (!data) return { revenueChart: null, monopolyChart: null, growthChart: null, radarChart: null };
    
    // Большой график выручки по категориям
    const revenueChart = {
      labels: data.category_summaries.map(c => c.name),
      datasets: [{
        label: 'Выручка (млн ₽)',
        data: data.category_summaries.map(c => c.revenue / 1000000),
        backgroundColor: data.category_summaries.map((_, i) => 
          `hsla(${220 + i * 25}, 70%, ${60 + i * 5}%, 0.8)`
        ),
        borderColor: data.category_summaries.map((_, i) => 
          `hsla(${220 + i * 25}, 70%, ${40 + i * 5}%, 1)`
        ),
        borderWidth: 2,
        borderRadius: 6
      }]
    };
    
    // График монополизации
    const monopolyChart = {
      labels: data.category_summaries.map(c => c.name),
      datasets: [{
        data: data.category_summaries.map(c => c.monopoly_percent),
        backgroundColor: [
          '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6',
          '#ec4899', '#f97316', '#84cc16', '#06b6d4', '#6366f1'
        ],
        borderWidth: 3,
        borderColor: '#ffffff',
        hoverBorderWidth: 4
      }]
    };
    
    // График роста категорий
    const growthChart = {
      labels: data.category_summaries.map(c => c.name),
      datasets: [{
        label: 'Рост (%)',
        data: data.category_summaries.map(c => c.growth_percent),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8
      }]
    };
    
    // Радар-чарт для комплексного анализа
    const topCategories = data.category_summaries.slice(0, 5);
    const radarChart = {
      labels: ['Выручка', 'Рост', 'Монополия', 'Реклама', 'Товары'],
      datasets: topCategories.map((cat, index) => ({
        label: cat.name,
        data: [
          Math.min(cat.revenue / 1000000000 * 100, 100), // Нормализация выручки
          cat.growth_percent,
          cat.monopoly_percent,
          cat.ads_percent,
          Math.min(cat.product_count / 100 * 100, 100) // Нормализация количества товаров
        ],
        borderColor: `hsla(${index * 72}, 70%, 50%, 1)`,
        backgroundColor: `hsla(${index * 72}, 70%, 50%, 0.2)`,
        borderWidth: 2,
        pointBackgroundColor: `hsla(${index * 72}, 70%, 50%, 1)`,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2
      }))
    };
    
    return { revenueChart, monopolyChart, growthChart, radarChart };
  };

  const { revenueChart, monopolyChart, growthChart, radarChart } = getBigChartsData();
  const sortedQueries = getSortedQueries();

  const bigChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          font: { size: 14, weight: 'bold' as const },
          color: '#374151',
          padding: 20,
          usePointStyle: true
        }
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleColor: '#F9FAFB',
        bodyColor: '#F9FAFB',
        borderColor: '#6B7280',
        borderWidth: 1,
        cornerRadius: 12,
        titleFont: { size: 14, weight: 'bold' as const },
        bodyFont: { size: 13 }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(156, 163, 175, 0.3)'
        },
        ticks: {
          font: { size: 12 },
          color: '#6B7280'
        }
      },
      x: {
        grid: {
          color: 'rgba(156, 163, 175, 0.3)'
        },
        ticks: {
          font: { size: 12 },
          color: '#6B7280',
          maxRotation: 45
        }
      }
    }
  };

  const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          font: { size: 12, weight: 'bold' as const },
          padding: 15
        }
      }
    },
    scales: {
      r: {
        angleLines: {
          color: 'rgba(156, 163, 175, 0.3)'
        },
        grid: {
          color: 'rgba(156, 163, 175, 0.3)'
        },
        pointLabels: {
          font: { size: 12, weight: 'bold' as const },
          color: '#374151'
        },
        ticks: {
          beginAtZero: true,
          max: 100,
          stepSize: 20,
          color: '#6B7280',
          backdropColor: 'transparent'
        }
      }
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #f0f9ff 0%, #e0e7ff 100%)',
      padding: '20px 0'
    }}>
      <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '0 20px' }}>
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
              🧠 Оракул запросов
            </h1>
            <p style={{ 
              color: '#6b7280', 
              fontSize: '1.2rem', 
              margin: '0',
              fontWeight: '500'
            }}>
              Интеллектуальный анализ поисковых запросов с AI-рекомендациями
            </p>
          </div>
          
          {/* Параметры анализа */}
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
                📊 Количество категорий
              </label>
              <select
                value={categoriesCount}
                onChange={(e) => setCategoriesCount(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '10px',
                  fontSize: '16px'
                }}
              >
                {[5, 7, 10, 12, 15].map(num => (
                  <option key={num} value={num}>{num} категорий</option>
                ))}
              </select>
            </div>
            
            <div>
              <label style={{ 
                display: 'block', 
                fontWeight: '600', 
                color: '#374151', 
                marginBottom: '8px' 
              }}>
                📅 Месяц анализа
              </label>
              <input
                type="month"
                value={analysisMonth}
                onChange={(e) => setAnalysisMonth(e.target.value)}
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
                💰 Мин. выручка (₽)
              </label>
              <input
                type="number"
                value={minRevenue}
                onChange={(e) => setMinRevenue(Number(e.target.value))}
                placeholder="10000"
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
                🔍 Мин. частотность
              </label>
              <input
                type="number"
                value={minFrequency}
                onChange={(e) => setMinFrequency(Number(e.target.value))}
                placeholder="100"
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
                🎯 Тип анализа
              </label>
              <select
                value={analysisType}
                onChange={(e) => setAnalysisType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '10px',
                  fontSize: '16px'
                }}
              >
                <option value="queries">🔍 По запросам</option>
                <option value="products">📦 По товарам</option>
                <option value="brands">🏷️ По брендам</option>
                <option value="suppliers">🤝 По поставщикам</option>
                <option value="categories">📂 По категориям</option>
              </select>
            </div>
          </div>

          <button
            onClick={analyzeOracle}
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
                Анализирую данные...
              </span>
            ) : (
              '🧠 Запустить анализ оракула'
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
                📊 Общая аналитика за {data.analysis_month}
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
                    {data.analytics.total_queries}
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '0.9rem', fontWeight: '500' }}>
                    Всего запросов
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
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#ef4444', marginBottom: '5px' }}>
                    {formatPrice(data.analytics.total_missed_revenue)}
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '0.9rem', fontWeight: '500' }}>
                    Упущенная выручка
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
                    {formatPercent(data.analytics.avg_monopoly)}
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '0.9rem', fontWeight: '500' }}>
                    Средняя монополия
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
                    {data.category_summaries.length}
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '0.9rem', fontWeight: '500' }}>
                    Категорий найдено
                  </div>
                </div>
              </div>
            </div>

            {/* AI Рекомендации */}
            {data.analytics.ai_recommendations && (
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
                  🤖 AI-рекомендации
                </h2>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                  gap: '20px'
                }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%)',
                    borderRadius: '15px',
                    padding: '20px',
                    border: '2px solid #bfdbfe'
                  }}>
                    <h3 style={{
                      margin: '0 0 15px 0',
                      color: '#1e40af',
                      fontSize: '1.1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      📊 Рыночные инсайты
                    </h3>
                    <p style={{ color: '#374151', fontSize: '14px', lineHeight: '1.5', margin: 0 }}>
                      {data.analytics.ai_recommendations.market_insights}
                    </p>
                  </div>

                  <div style={{
                    background: 'linear-gradient(135deg, #dcfce7 0%, #f0fdf4 100%)',
                    borderRadius: '15px',
                    padding: '20px',
                    border: '2px solid #bbf7d0'
                  }}>
                    <h3 style={{
                      margin: '0 0 15px 0',
                      color: '#14532d',
                      fontSize: '1.1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      🚀 Возможности роста
                    </h3>
                    <p style={{ color: '#374151', fontSize: '14px', lineHeight: '1.5', margin: 0 }}>
                      {data.analytics.ai_recommendations.growth_opportunities}
                    </p>
                  </div>

                  <div style={{
                    background: 'linear-gradient(135deg, #fee2e2 0%, #fef2f2 100%)',
                    borderRadius: '15px',
                    padding: '20px',
                    border: '2px solid #fecaca'
                  }}>
                    <h3 style={{
                      margin: '0 0 15px 0',
                      color: '#991b1b',
                      fontSize: '1.1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      ⚠️ Анализ рисков
                    </h3>
                    <p style={{ color: '#374151', fontSize: '14px', lineHeight: '1.5', margin: 0 }}>
                      {data.analytics.ai_recommendations.risk_analysis}
                    </p>
                  </div>

                  <div style={{
                    background: 'linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%)',
                    borderRadius: '15px',
                    padding: '20px',
                    border: '2px solid #fde68a'
                  }}>
                    <h3 style={{
                      margin: '0 0 15px 0',
                      color: '#92400e',
                      fontSize: '1.1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      💡 Стратегические рекомендации
                    </h3>
                    <p style={{ color: '#374151', fontSize: '14px', lineHeight: '1.5', margin: 0 }}>
                      {data.analytics.ai_recommendations.strategic_recommendations}
                    </p>
                  </div>

                  <div style={{
                    background: 'linear-gradient(135deg, #e0e7ff 0%, #f5f3ff 100%)',
                    borderRadius: '15px',
                    padding: '20px',
                    border: '2px solid #c7d2fe',
                    gridColumn: data.analytics.ai_recommendations ? 'span 1' : '1'
                  }}>
                    <h3 style={{
                      margin: '0 0 15px 0',
                      color: '#5b21b6',
                      fontSize: '1.1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      📈 Трендовый анализ
                    </h3>
                    <p style={{ color: '#374151', fontSize: '14px', lineHeight: '1.5', margin: 0 }}>
                      {data.analytics.ai_recommendations.trend_analysis}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Навигация и управление */}
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
              <div style={{ display: 'flex', gap: '10px' }}>
                {(['queries', 'details', 'categories', 'charts', 'ai'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      padding: '10px 20px',
                      background: activeTab === tab ? '#667eea' : '#f3f4f6',
                      color: activeTab === tab ? 'white' : '#374151',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    {tab === 'queries' && '🔍 Запросы'}
                    {tab === 'details' && '📋 Детали'}
                    {tab === 'categories' && '📂 Категории'}
                    {tab === 'charts' && '📊 Большие графики'}
                    {tab === 'ai' && '🤖 AI анализ'}
                  </button>
                ))}
              </div>

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
                  <option value="revenue_30d">По выручке</option>
                  <option value="frequency_30d">По частотности</option>
                  <option value="dynamics_30d">По росту</option>
                  <option value="monopoly_percent">По монополии</option>
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
                Найдено: {data.total_found} элементов
              </div>
            </div>

            {/* Большие графики */}
            {activeTab === 'charts' && (
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
                  📊 Большие аналитические графики
                </h2>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
                  gap: '40px'
                }}>
                  {revenueChart && (
                    <div style={{ 
                      height: '400px',
                      background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                      borderRadius: '15px',
                      padding: '20px',
                      border: '2px solid #e5e7eb'
                    }}>
                      <h3 style={{ textAlign: 'center', marginBottom: '20px', color: '#374151' }}>
                        💰 Выручка по категориям (млн ₽)
                      </h3>
                      <div style={{ height: '320px' }}>
                        <Bar data={revenueChart} options={bigChartOptions} />
                      </div>
                    </div>
                  )}

                  {monopolyChart && (
                    <div style={{ 
                      height: '400px',
                      background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                      borderRadius: '15px',
                      padding: '20px',
                      border: '2px solid #e5e7eb'
                    }}>
                      <h3 style={{ textAlign: 'center', marginBottom: '20px', color: '#374151' }}>
                        👑 Монополизация рынка (%)
                      </h3>
                      <div style={{ height: '320px' }}>
                        <Doughnut data={monopolyChart} options={bigChartOptions} />
                      </div>
                    </div>
                  )}

                  {growthChart && (
                    <div style={{ 
                      height: '400px',
                      background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                      borderRadius: '15px',
                      padding: '20px',
                      border: '2px solid #e5e7eb'
                    }}>
                      <h3 style={{ textAlign: 'center', marginBottom: '20px', color: '#374151' }}>
                        📈 Динамика роста категорий (%)
                      </h3>
                      <div style={{ height: '320px' }}>
                        <Line data={growthChart} options={bigChartOptions} />
                      </div>
                    </div>
                  )}

                  {radarChart && (
                    <div style={{ 
                      height: '400px',
                      background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                      borderRadius: '15px',
                      padding: '20px',
                      border: '2px solid #e5e7eb'
                    }}>
                      <h3 style={{ textAlign: 'center', marginBottom: '20px', color: '#374151' }}>
                        🎯 Комплексный анализ ТОП-5 категорий
                      </h3>
                      <div style={{ height: '320px' }}>
                        <Radar data={radarChart} options={radarOptions} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Карточки категорий */}
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
                📂 Анализ категорий ({data.category_summaries.length} найдено)
              </h2>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                gap: '20px'
              }}>
                {data.category_summaries.map((category, index) => (
                  <div key={category.name} style={{
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
                    
                    <h3 style={{
                      margin: '0 0 15px 0',
                      fontSize: '1.3rem',
                      color: '#1f2937',
                      fontWeight: '700'
                    }}>
                      {category.name}
                    </h3>
                    
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '15px',
                      marginBottom: '15px'
                    }}>
                      <div>
                        <span style={{ color: '#6b7280', fontSize: '14px' }}>Выручка:</span>
                        <div style={{ fontWeight: '700', color: '#10b981', fontSize: '16px' }}>
                          {formatPrice(category.revenue)}
                        </div>
                      </div>
                      
                      <div>
                        <span style={{ color: '#6b7280', fontSize: '14px' }}>Продажи:</span>
                        <div style={{ fontWeight: '700', color: '#3b82f6', fontSize: '16px' }}>
                          {formatNumber(category.sales)}
                        </div>
                      </div>
                      
                      <div>
                        <span style={{ color: '#6b7280', fontSize: '14px' }}>Товаров:</span>
                        <div style={{ fontWeight: '700', color: '#6366f1', fontSize: '16px' }}>
                          {formatNumber(category.product_count)}
                        </div>
                      </div>
                      
                      <div>
                        <span style={{ color: '#6b7280', fontSize: '14px' }}>Рост:</span>
                        <div style={{ fontWeight: '700', color: getGrowthColor(category.growth_percent), fontSize: '16px' }}>
                          {formatPercent(category.growth_percent)}
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ marginBottom: '15px' }}>
                      <span style={{ color: '#6b7280', fontSize: '14px', fontWeight: '600' }}>ТОП-3 товара:</span>
                      <ul style={{ margin: '5px 0 0 0', paddingLeft: '20px', fontSize: '13px' }}>
                        {category.top_products.map((product, idx) => (
                          <li key={idx} style={{ marginBottom: '3px', color: '#374151' }}>
                            {product}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div style={{ height: '60px' }}>
                      <Line 
                        data={getSparklineChart(category.growth_chart, category.growth_chart.map((_, i) => `День ${i+1}`))} 
                        options={sparklineOptions} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Таблица запросов */}
            {activeTab === 'queries' && (
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
                  🔍 Популярные запросы ({sortedQueries.length} найдено)
                </h2>
                
                <div style={{ overflowX: 'auto' }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '14px'
                  }}>
                    <thead>
                      <tr style={{ background: '#f9fafb' }}>
                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Запрос</th>
                        <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#374151' }}>Рейтинг</th>
                        <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#374151' }}>Частотность</th>
                        <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#374151' }}>Динамика</th>
                        <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#374151' }}>Выручка</th>
                        <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#374151' }}>Монополия</th>
                        <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#374151' }}>Средняя цена</th>
                        <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#374151' }}>График</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedQueries.map((query, index) => (
                        <tr 
                          key={`${query.query}-${index}`}
                          style={{
                            borderBottom: '1px solid #e5e7eb',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                          onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <td style={{ padding: '12px' }}>
                            <div style={{ fontWeight: '600', color: '#1f2937' }}>
                              {query.query}
                            </div>
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#8b5cf6' }}>
                            #{query.rank}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#3b82f6' }}>
                            {formatNumber(query.frequency_30d)}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '3px'
                            }}>
                              <span style={{
                                color: getGrowthColor(query.dynamics_30d),
                                fontWeight: '600',
                                fontSize: '12px'
                              }}>
                                30д: {formatPercent(query.dynamics_30d)}
                              </span>
                              <span style={{ color: '#6b7280', fontSize: '11px' }}>
                                60д: {formatPercent(query.dynamics_60d)}
                              </span>
                              <span style={{ color: '#6b7280', fontSize: '11px' }}>
                                90д: {formatPercent(query.dynamics_90d)}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#10b981' }}>
                            {formatPrice(query.revenue_30d)}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#f59e0b' }}>
                            {formatPercent(query.monopoly_percent)}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#6b7280' }}>
                            {formatPrice(query.avg_price)}
                          </td>
                          <td style={{ padding: '12px' }}>
                            <div style={{ height: '40px', width: '100px' }}>
                              <Line 
                                data={getSparklineChart(query.growth_graph, query.graph_dates)} 
                                options={sparklineOptions} 
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Детальная таблица */}
            {activeTab === 'details' && (
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
                  📋 Детальная информация ({data.detail_items.length} товаров)
                </h2>
                
                <div style={{ overflowX: 'auto' }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '14px'
                  }}>
                    <thead>
                      <tr style={{ background: '#f9fafb' }}>
                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Название</th>
                        <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#374151' }}>Артикул</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Бренд</th>
                        <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#374151' }}>Выручка</th>
                        <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#374151' }}>Упущено</th>
                        <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#374151' }}>Заказы</th>
                        <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#374151' }}>Рейтинг</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.detail_items.slice(0, 30).map((item, index) => (
                        <tr 
                          key={`${item.article || 'unknown'}-${index}`}
                          style={{
                            borderBottom: '1px solid #e5e7eb',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                          onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <td style={{ padding: '12px' }}>
                            <div style={{ fontWeight: '600', color: '#1f2937' }}>
                              {item.name.length > 40 ? item.name.substring(0, 40) + '...' : item.name}
                            </div>
                            <div style={{ fontSize: '12px', color: '#6b7280' }}>
                              {item.category}
                            </div>
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#8b5cf6' }}>
                            {item.article || '-'}
                          </td>
                          <td style={{ padding: '12px' }}>
                            <div style={{ fontWeight: '600', color: '#1f2937' }}>
                              {item.brand}
                            </div>
                            <div style={{ fontSize: '12px', color: '#6b7280' }}>
                              {item.supplier.length > 20 ? item.supplier.substring(0, 20) + '...' : item.supplier}
                            </div>
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#10b981' }}>
                            {formatPrice(item.revenue)}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#ef4444' }}>
                            {formatPrice(item.missed_revenue)}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#3b82f6' }}>
                            {formatNumber(item.orders)}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#f59e0b' }}>
                            {item.rating.toFixed(1)}★
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
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

export default OracleQueries; 