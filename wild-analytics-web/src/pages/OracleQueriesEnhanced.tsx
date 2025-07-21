import React, { useState } from 'react';

interface OracleMainResult {
  query: string;
  query_rank: number;
  frequency_30d: number;
  dynamics_30d: number;
  dynamics_60d: number;
  dynamics_90d: number;
  revenue_30d_top3pages: number;
  avg_revenue_30d_top3pages: number;
  lost_revenue_percent_30d: number;
  monopoly_percent: number;
  avg_price_top3pages: number;
  ads_percent_first_page: number;
  trend_indicator: 'up' | 'down' | 'stable';
  hotness_score: number;
  competition_level: string;
  growth_potential: string;
}

interface OracleDetailedResult {
  name: string;
  article_id: string;
  brand: string;
  supplier: string;
  revenue: number;
  lost_revenue: number;
  orders_count: number;
  price: number;
  rating: number;
  reviews_count: number;
  parent_query: string;
}

interface OracleApiResponse {
  success: boolean;
  oracle_type: string;
  oracle_type_name: string;
  main_results: OracleMainResult[];
  detailed_results: OracleDetailedResult[];
  summary: {
    total_queries: number;
    period: string;
    filters_applied: {
      min_revenue: number;
      min_frequency: number;
    };
  };
  error?: string;
}

const OracleQueriesEnhanced: React.FC = () => {
  // State для параметров фильтрации
  const [queriesCount, setQueriesCount] = useState(3);
  const [month, setMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [minRevenue, setMinRevenue] = useState(100000);
  const [minFrequency, setMinFrequency] = useState(1000);
  const [oracleType, setOracleType] = useState('products');

  // State для результатов
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<OracleApiResponse | null>(null);
  const [activeTable, setActiveTable] = useState<'main' | 'detailed'>('main');

  const oracleTypes = [
    { value: 'products', label: 'По товарам', icon: '📦' },
    { value: 'brands', label: 'По брендам', icon: '🏷️' },
    { value: 'suppliers', label: 'По поставщикам', icon: '🏢' },
    { value: 'categories', label: 'По категориям', icon: '📂' },
    { value: 'search_queries', label: 'По поисковым запросам', icon: '🔍' }
  ];

  const analyzeOracle = async () => {
    if (queriesCount < 1 || queriesCount > 5) {
      setError('Количество запросов должно быть от 1 до 5');
      return;
    }

    setLoading(true);
    setError('');
    setData(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/analysis/oracle-enhanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          queries_count: queriesCount,
          month: month,
          min_revenue: minRevenue,
          min_frequency: minFrequency,
          oracle_type: oracleType
        })
      });

      if (!response.ok) {
        throw new Error('Ошибка при анализе');
      }

      const result = await response.json();
      if (result.success) {
        setData(result);
      } else {
        setError(result.error || 'Нет данных для отображения');
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка сервера');
    } finally {
      setLoading(false);
    }
  };

  const exportData = async (format: 'csv' | 'excel') => {
    if (!data) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8000/analysis/oracle-export?format_type=${format}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          queries_count: queriesCount,
          month: month,
          min_revenue: minRevenue,
          min_frequency: minFrequency,
          oracle_type: oracleType
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `oracle_export_${Date.now()}.${format === 'csv' ? 'csv' : 'xlsx'}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0
    }).format(price);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ru-RU').format(num);
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return '📈';
      case 'down': return '📉';
      default: return '➡️';
    }
  };

  const getTrendColor = (value: number) => {
    if (value > 0) return '#10b981';
    if (value < 0) return '#ef4444';
    return '#6b7280';
  };

  const getHotnessColor = (score: number) => {
    if (score >= 8) return '#ef4444';
    if (score >= 6) return '#f59e0b';
    if (score >= 4) return '#10b981';
    return '#6b7280';
  };

  // Метрические карточки
  const MetricCard = ({ title, value, subtitle, icon, color, trend }: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: string;
    color: string;
    trend?: 'up' | 'down' | 'neutral';
  }) => (
    <div style={{
      background: 'white',
      padding: '20px',
      borderRadius: '15px',
      boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
      border: `3px solid ${color}`,
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute',
        top: '-10px',
        right: '-10px',
        width: '40px',
        height: '40px',
        background: color,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.2rem'
      }}>
        {icon}
      </div>
      <div style={{ marginBottom: '10px', color: '#6b7280', fontWeight: '600' }}>
        {title}
      </div>
      <div style={{ 
        fontSize: '1.8rem', 
        fontWeight: '700', 
        color: '#1f2937',
        marginBottom: '5px'
      }}>
        {value}
        {trend && (
          <span style={{ 
            fontSize: '1rem', 
            marginLeft: '8px',
            color: trend === 'up' ? '#10b981' : trend === 'down' ? '#ef4444' : '#6b7280'
          }}>
            {trend === 'up' ? '↗️' : trend === 'down' ? '↘️' : '→'}
          </span>
        )}
      </div>
      {subtitle && (
        <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>
          {subtitle}
        </div>
      )}
    </div>
  );

  return (
    <div style={{
      maxWidth: '1600px',
      margin: '0 auto',
      padding: '20px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh'
    }}>
      {/* Заголовок */}
      <div style={{ textAlign: 'center', marginBottom: '30px', color: 'white' }}>
        <h1 style={{ 
          fontSize: '2.5rem', 
          marginBottom: '10px', 
          textShadow: '2px 2px 4px rgba(0,0,0,0.3)' 
        }}>
          🧠 Оракул Запросов (Расширенный)
        </h1>
        <p style={{ fontSize: '1.1rem', opacity: 0.9 }}>
          Глубокая аналитика популярных запросов с прогнозированием и рекомендациями
        </p>
      </div>

      {/* Панель фильтров */}
      <div style={{
        background: 'white',
        padding: '30px',
        borderRadius: '20px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
        marginBottom: '30px'
      }}>
        <h2 style={{ 
          fontSize: '1.5rem', 
          color: '#1f2937', 
          marginBottom: '25px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          ⚙️ Параметры фильтрации
        </h2>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px',
          marginBottom: '25px'
        }}>
          {/* Количество запросов */}
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: '600', 
              color: '#374151' 
            }}>
              📊 Количество запросов (1-5)
            </label>
            <input
              type="number"
              min="1"
              max="5"
              value={queriesCount}
              onChange={(e) => setQueriesCount(parseInt(e.target.value) || 1)}
              style={{
                width: '100%',
                padding: '12px 15px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '16px'
              }}
            />
          </div>

          {/* Месяц */}
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: '600', 
              color: '#374151' 
            }}>
              📅 Месяц анализа
            </label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 15px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '16px'
              }}
            />
          </div>

          {/* Минимальная выручка */}
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: '600', 
              color: '#374151' 
            }}>
              💰 Мин. выручка за 30 дней (₽)
            </label>
            <input
              type="number"
              min="0"
              step="10000"
              value={minRevenue}
              onChange={(e) => setMinRevenue(parseInt(e.target.value) || 0)}
              style={{
                width: '100%',
                padding: '12px 15px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '16px'
              }}
            />
          </div>

          {/* Минимальная частотность */}
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: '600', 
              color: '#374151' 
            }}>
              🔍 Мин. частотность за 30 дней
            </label>
            <input
              type="number"
              min="0"
              step="100"
              value={minFrequency}
              onChange={(e) => setMinFrequency(parseInt(e.target.value) || 0)}
              style={{
                width: '100%',
                padding: '12px 15px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '16px'
              }}
            />
          </div>
        </div>

        {/* Тип оракула */}
        <div style={{ marginBottom: '25px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '12px', 
            fontWeight: '600', 
            color: '#374151',
            fontSize: '1.1rem'
          }}>
            🔮 Тип оракула
          </label>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '10px'
          }}>
            {oracleTypes.map((type) => (
              <button
                key={type.value}
                onClick={() => setOracleType(type.value)}
                style={{
                  padding: '15px 20px',
                  border: 'none',
                  borderRadius: '10px',
                  background: oracleType === type.value ? '#667eea' : '#f3f4f6',
                  color: oracleType === type.value ? 'white' : '#374151',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span style={{ fontSize: '1.2rem' }}>{type.icon}</span>
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Кнопки действий */}
        <div style={{ 
          display: 'flex', 
          gap: '15px', 
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <button 
            onClick={analyzeOracle}
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
              opacity: loading ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {loading ? '🔄 Анализируем...' : '🚀 Запустить анализ'}
          </button>

          {data && (
            <>
              <button
                onClick={() => exportData('csv')}
                style={{
                  padding: '15px 25px',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                📊 Экспорт CSV
              </button>
              <button
                onClick={() => exportData('excel')}
                style={{
                  padding: '15px 25px',
                  background: '#059669',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                📈 Экспорт Excel
              </button>
            </>
          )}
        </div>

        {error && (
          <div style={{
            background: '#fee2e2',
            color: '#dc2626',
            padding: '15px 20px',
            borderRadius: '10px',
            marginTop: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* Состояние загрузки */}
      {loading && (
        <div style={{
          background: 'white',
          padding: '50px',
          borderRadius: '20px',
          textAlign: 'center',
          boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
          marginBottom: '30px'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🧠</div>
          <div style={{ fontSize: '1.2rem', color: '#6b7280', marginBottom: '10px' }}>
            Оракул анализирует данные...
          </div>
          <div style={{ fontSize: '1rem', color: '#9ca3af' }}>
            Это может занять 1-2 минуты
          </div>
        </div>
      )}

      {/* Результаты анализа */}
      {data && data.success && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          {/* Метрические карточки */}
          {data.main_results.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '20px'
            }}>
              <MetricCard
                title="Всего запросов найдено"
                value={data.summary.total_queries}
                subtitle={`за период ${data.summary.period}`}
                icon="🔍"
                color="#667eea"
              />
              <MetricCard
                title="Средняя частотность"
                value={formatNumber(Math.round(data.main_results.reduce((sum, item) => sum + item.frequency_30d, 0) / data.main_results.length))}
                subtitle="запросов в месяц"
                icon="📊"
                color="#10b981"
              />
              <MetricCard
                title="Общая выручка ТОП-3"
                value={formatPrice(data.main_results.reduce((sum, item) => sum + item.revenue_30d_top3pages, 0))}
                subtitle="за 30 дней"
                icon="💰"
                color="#f59e0b"
              />
              <MetricCard
                title="Средняя конкуренция"
                value={data.main_results.filter(item => item.competition_level === 'Высокая').length > data.main_results.length / 2 ? 'Высокая' : 'Средняя'}
                subtitle="в выбранных нишах"
                icon="⚔️"
                color="#ef4444"
              />
            </div>
          )}

          {/* Навигация между таблицами */}
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '15px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
          }}>
            <div style={{ 
              display: 'flex', 
              gap: '10px', 
              marginBottom: '20px',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={() => setActiveTable('main')}
                style={{
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '8px',
                  background: activeTable === 'main' ? '#667eea' : '#f3f4f6',
                  color: activeTable === 'main' ? 'white' : '#6b7280',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                📋 Основная таблица результатов
              </button>
              <button
                onClick={() => setActiveTable('detailed')}
                style={{
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '8px',
                  background: activeTable === 'detailed' ? '#667eea' : '#f3f4f6',
                  color: activeTable === 'detailed' ? 'white' : '#6b7280',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                📦 Детальная информация
              </button>
            </div>

            {/* Основная таблица результатов */}
            {activeTable === 'main' && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ 
                  width: '100%', 
                  borderCollapse: 'collapse',
                  minWidth: '1200px'
                }}>
                  <thead>
                    <tr style={{ background: '#f9fafb' }}>
                      <th style={{ padding: '15px 10px', textAlign: 'left', fontWeight: '700', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>
                        🔍 Запрос
                      </th>
                      <th style={{ padding: '15px 10px', textAlign: 'center', fontWeight: '700', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>
                        📊 Рейтинг
                      </th>
                      <th style={{ padding: '15px 10px', textAlign: 'center', fontWeight: '700', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>
                        🔍 Частотность 30д
                      </th>
                      <th style={{ padding: '15px 10px', textAlign: 'center', fontWeight: '700', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>
                        📈 Динамика 30д
                      </th>
                      <th style={{ padding: '15px 10px', textAlign: 'center', fontWeight: '700', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>
                        📈 Динамика 60д
                      </th>
                      <th style={{ padding: '15px 10px', textAlign: 'center', fontWeight: '700', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>
                        📈 Динамика 90д
                      </th>
                      <th style={{ padding: '15px 10px', textAlign: 'center', fontWeight: '700', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>
                        💰 Выручка 30д
                      </th>
                      <th style={{ padding: '15px 10px', textAlign: 'center', fontWeight: '700', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>
                        💎 Средняя выручка
                      </th>
                      <th style={{ padding: '15px 10px', textAlign: 'center', fontWeight: '700', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>
                        ❌ % упущенной выручки
                      </th>
                      <th style={{ padding: '15px 10px', textAlign: 'center', fontWeight: '700', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>
                        👑 Монопольность
                      </th>
                      <th style={{ padding: '15px 10px', textAlign: 'center', fontWeight: '700', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>
                        💰 Средняя цена
                      </th>
                      <th style={{ padding: '15px 10px', textAlign: 'center', fontWeight: '700', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>
                        📺 % рекламы
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.main_results.map((item, index) => (
                      <tr key={index} style={{ 
                        borderBottom: '1px solid #e5e7eb',
                        backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb'
                      }}>
                        <td style={{ padding: '15px 10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '1.2rem' }}>{getTrendIcon(item.trend_indicator)}</span>
                            <div>
                              <div style={{ fontWeight: '600', color: '#1f2937' }}>
                                {item.query}
                              </div>
                              <div style={{ 
                                fontSize: '0.8rem', 
                                color: getHotnessColor(item.hotness_score),
                                fontWeight: '600'
                              }}>
                                🔥 Горячность: {item.hotness_score}/10
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '15px 10px', textAlign: 'center' }}>
                          <span style={{ 
                            background: '#667eea',
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontSize: '0.9rem',
                            fontWeight: '600'
                          }}>
                            #{item.query_rank}
                          </span>
                        </td>
                        <td style={{ padding: '15px 10px', textAlign: 'center', fontWeight: '600' }}>
                          {formatNumber(item.frequency_30d)}
                        </td>
                        <td style={{ padding: '15px 10px', textAlign: 'center' }}>
                          <span style={{ 
                            color: getTrendColor(item.dynamics_30d),
                            fontWeight: '700'
                          }}>
                            {item.dynamics_30d > 0 ? '+' : ''}{item.dynamics_30d}%
                          </span>
                        </td>
                        <td style={{ padding: '15px 10px', textAlign: 'center' }}>
                          <span style={{ 
                            color: getTrendColor(item.dynamics_60d),
                            fontWeight: '700'
                          }}>
                            {item.dynamics_60d > 0 ? '+' : ''}{item.dynamics_60d}%
                          </span>
                        </td>
                        <td style={{ padding: '15px 10px', textAlign: 'center' }}>
                          <span style={{ 
                            color: getTrendColor(item.dynamics_90d),
                            fontWeight: '700'
                          }}>
                            {item.dynamics_90d > 0 ? '+' : ''}{item.dynamics_90d}%
                          </span>
                        </td>
                        <td style={{ padding: '15px 10px', textAlign: 'center', fontWeight: '700', color: '#10b981' }}>
                          {formatPrice(item.revenue_30d_top3pages)}
                        </td>
                        <td style={{ padding: '15px 10px', textAlign: 'center', fontWeight: '600' }}>
                          {formatPrice(item.avg_revenue_30d_top3pages)}
                        </td>
                        <td style={{ padding: '15px 10px', textAlign: 'center' }}>
                          <span style={{ 
                            color: '#ef4444',
                            fontWeight: '700'
                          }}>
                            {item.lost_revenue_percent_30d}%
                          </span>
                        </td>
                        <td style={{ padding: '15px 10px', textAlign: 'center' }}>
                          <span style={{ 
                            background: item.monopoly_percent > 60 ? '#fee2e2' : item.monopoly_percent > 30 ? '#fef3c7' : '#dcfce7',
                            color: item.monopoly_percent > 60 ? '#dc2626' : item.monopoly_percent > 30 ? '#d97706' : '#16a34a',
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontSize: '0.9rem',
                            fontWeight: '600'
                          }}>
                            {item.monopoly_percent}%
                          </span>
                        </td>
                        <td style={{ padding: '15px 10px', textAlign: 'center', fontWeight: '600' }}>
                          {formatPrice(item.avg_price_top3pages)}
                        </td>
                        <td style={{ padding: '15px 10px', textAlign: 'center' }}>
                          <span style={{ 
                            color: '#8b5cf6',
                            fontWeight: '700'
                          }}>
                            {item.ads_percent_first_page}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Детальная таблица */}
            {activeTable === 'detailed' && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ 
                  width: '100%', 
                  borderCollapse: 'collapse',
                  minWidth: '900px'
                }}>
                  <thead>
                    <tr style={{ background: '#f9fafb' }}>
                      <th style={{ padding: '15px 10px', textAlign: 'left', fontWeight: '700', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>
                        📦 Название
                      </th>
                      <th style={{ padding: '15px 10px', textAlign: 'center', fontWeight: '700', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>
                        🏷️ Артикул
                      </th>
                      <th style={{ padding: '15px 10px', textAlign: 'center', fontWeight: '700', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>
                        🏪 Бренд
                      </th>
                      <th style={{ padding: '15px 10px', textAlign: 'center', fontWeight: '700', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>
                        🏢 Поставщик
                      </th>
                      <th style={{ padding: '15px 10px', textAlign: 'center', fontWeight: '700', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>
                        💰 Выручка
                      </th>
                      <th style={{ padding: '15px 10px', textAlign: 'center', fontWeight: '700', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>
                        ❌ Упущенная выручка
                      </th>
                      <th style={{ padding: '15px 10px', textAlign: 'center', fontWeight: '700', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>
                        📦 Кол-во заказов
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.detailed_results.map((item, index) => (
                      <tr key={index} style={{ 
                        borderBottom: '1px solid #e5e7eb',
                        backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb'
                      }}>
                        <td style={{ padding: '15px 10px' }}>
                          <div>
                            <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>
                              {item.name}
                            </div>
                            <div style={{ 
                              fontSize: '0.8rem', 
                              color: '#6b7280',
                              background: '#f3f4f6',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              display: 'inline-block'
                            }}>
                              {item.parent_query}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '15px 10px', textAlign: 'center' }}>
                          <span style={{ 
                            fontFamily: 'monospace',
                            background: '#f3f4f6',
                            padding: '4px 6px',
                            borderRadius: '4px',
                            fontSize: '0.9rem'
                          }}>
                            {item.article_id}
                          </span>
                        </td>
                        <td style={{ padding: '15px 10px', textAlign: 'center', fontWeight: '600' }}>
                          {item.brand}
                        </td>
                        <td style={{ padding: '15px 10px', textAlign: 'center', fontWeight: '600' }}>
                          {item.supplier}
                        </td>
                        <td style={{ padding: '15px 10px', textAlign: 'center', fontWeight: '700', color: '#10b981' }}>
                          {formatPrice(item.revenue)}
                        </td>
                        <td style={{ padding: '15px 10px', textAlign: 'center', fontWeight: '700', color: '#ef4444' }}>
                          {formatPrice(item.lost_revenue)}
                        </td>
                        <td style={{ padding: '15px 10px', textAlign: 'center', fontWeight: '600' }}>
                          {formatNumber(item.orders_count)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OracleQueriesEnhanced; 