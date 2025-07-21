import React, { useState } from 'react';
import axios from 'axios';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

interface SeasonalityAnalysisData {
  category: string;
  annualData: Array<{
    noyeardate: string;
    season_revenue: number;
    season_sales: number;
  }>;
  weeklyData: Array<{
    day: number;
    weekly_revenue: number;
    weekly_sales: number;
  }>;
  analytics?: {
    category_type: string;
    monthly_stats: {
      peak_revenue: { month: number; value: number };
      low_revenue: { month: number; value: number };
      peak_sales: { month: number; value: number };
      low_sales: { month: number; value: number };
      seasonal_factor: number;
      volatility: number;
    };
    weekly_stats: {
      best_revenue_day: { day: string; value: number };
      worst_revenue_day: { day: string; value: number };
      best_sales_day: { day: string; value: number };
      worst_sales_day: { day: string; value: number };
      weekly_factor: number;
    };
    trends: {
      yoy_growth: { revenue: number; sales: number };
      trend_direction: string;
      seasonality_strength: string;
    };
    holiday_correlation: {
      holiday_boosts: Array<{
        date: string;
        holiday: string;
        revenue_boost: number;
      }>;
      avg_holiday_boost: number;
    };
    forecasting: {
      next_month_forecast: string;
      predicted_growth: number;
      recommended_actions: string[];
    };
  };
  heatmapData?: {
    months: number[];
    weekdays: number[];
    values: number[][];
  };
  summary: string;
}

const monthNames = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

const weekdays = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

const SeasonalityAnalysis: React.FC = () => {
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SeasonalityAnalysisData | null>(null);
  const [error, setError] = useState('');
  const [activeChart, setActiveChart] = useState<'annual' | 'weekly' | 'forecast' | 'heatmap'>('annual');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category.trim()) return;
    
    setLoading(true);
    setError('');
    setData(null);
    
    try {
      const res = await axios.post(
        `${API_BASE}/analysis/seasonality`,
        { category: category.trim() },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      const payload = res.data.data || res.data;
      const annual = payload.annualData?.data ?? payload.annualData;
      const weeklyRaw = payload.weeklyData?.data ?? payload.weeklyData;
      
      // Normalize weekly data
      const nameToNum: Record<string, number> = {
        'Понедельник': 1, 'Пн': 1, 'Вторник': 2, 'Вт': 2,
        'Среда': 3, 'Ср': 3, 'Четверг': 4, 'Чт': 4,
        'Пятница': 5, 'Пт': 5, 'Суббота': 6, 'Сб': 6,
        'Воскресенье': 7, 'Вс': 7,
      };
      
      const weeklyUniform = (Array.isArray(weeklyRaw) ? weeklyRaw : []).map((item: any, idx: number) => {
        let dayNumber = item.day ?? item.weekday;
        if (typeof dayNumber === 'string') dayNumber = nameToNum[dayNumber] || undefined;
        if (typeof dayNumber !== 'number') dayNumber = idx + 1;
        return { ...item, day: dayNumber };
      }).sort((a: any, b: any) => (a.day - b.day));
      
      setData({ 
        ...payload, 
        annualData: annual, 
        weeklyData: weeklyUniform,
        analytics: payload.analytics,
        heatmapData: payload.heatmapData
      });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка сервера');
    } finally {
      setLoading(false);
    }
  };

  const formatPercent = (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;

  // Metric Cards Component
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
      overflow: 'hidden',
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
        fontSize: '1.2rem',
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

  // Enhanced Charts
  const renderAnnualChart = () => {
    if (!data?.annualData?.length) return null;
    
    const labels = data.annualData.map(d => d.noyeardate);
    const revenue = data.annualData.map(d => d.season_revenue);
    const sales = data.annualData.map(d => d.season_sales);

    const chartData = {
      labels,
      datasets: [
        {
          label: 'Выручка, %',
          data: revenue,
          borderColor: '#667eea',
          backgroundColor: 'rgba(102,126,234,0.1)',
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#667eea',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 4,
        },
        {
          label: 'Продажи, %',
          data: sales,
          borderColor: '#f093fb',
          backgroundColor: 'rgba(240,147,251,0.1)',
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#f093fb',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 4,
        },
      ],
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { 
          position: 'top' as const,
          labels: { usePointStyle: true, padding: 20 }
        },
        tooltip: {
          mode: 'index' as const,
          intersect: false,
          backgroundColor: 'rgba(0,0,0,0.8)',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          borderColor: '#667eea',
          borderWidth: 1,
        },
      },
      scales: {
        x: { 
          display: false,
          grid: { display: false }
        },
        y: {
          grid: { color: 'rgba(0,0,0,0.05)' },
          ticks: { callback: (value: any) => `${value}%` }
        }
      },
      interaction: {
        mode: 'nearest' as const,
        axis: 'x' as const,
        intersect: false,
      },
    };

    return (
      <div style={{ height: '400px' }}>
        <Line data={chartData} options={options} />
      </div>
    );
  };

  const renderWeeklyChart = () => {
    if (!data?.weeklyData?.length) return null;
    
    const revenue = data.weeklyData.map(d => d.weekly_revenue);
    const sales = data.weeklyData.map(d => d.weekly_sales);

    const chartData = {
      labels: weekdays,
      datasets: [
        {
          label: 'Выручка, %',
          data: revenue,
          backgroundColor: 'rgba(102,126,234,0.8)',
          borderColor: '#667eea',
          borderWidth: 2,
          borderRadius: 8,
        },
        {
          label: 'Продажи, %',
          data: sales,
          backgroundColor: 'rgba(240,147,251,0.8)',
          borderColor: '#f093fb',
          borderWidth: 2,
          borderRadius: 8,
        },
      ],
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { 
          position: 'top' as const,
          labels: { usePointStyle: true, padding: 20 }
        },
        tooltip: {
          backgroundColor: 'rgba(0,0,0,0.8)',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
        },
      },
      scales: {
        y: {
          grid: { color: 'rgba(0,0,0,0.05)' },
          ticks: { callback: (value: any) => `${value}%` }
        },
        x: {
          grid: { display: false }
        }
      },
    };

    return (
      <div style={{ height: '350px' }}>
        <Bar data={chartData} options={options} />
      </div>
    );
  };

  const renderForecastChart = () => {
    if (!data?.analytics?.forecasting) return null;
    
    // Simulated forecast data
    const forecastData = {
      labels: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'],
      datasets: [
        {
          label: 'Прогноз роста, %',
          data: Array.from({length: 12}, () => Math.random() * 20 - 5),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16,185,129,0.1)',
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#10b981',
          borderDash: [5, 5],
        },
      ],
    };

    return (
      <div style={{ height: '350px' }}>
        <Line data={forecastData} options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top' as const },
            tooltip: { backgroundColor: 'rgba(0,0,0,0.8)' },
          },
          scales: {
            y: { ticks: { callback: (value: any) => `${value}%` } }
          },
        }} />
      </div>
    );
  };

  // Heat Map Visualization
  const renderHeatMap = () => {
    if (!data?.heatmapData) return null;

    const { months, weekdays, values } = data.heatmapData;
    const weekdayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    const monthNamesShort = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

    const getHeatColor = (value: number) => {
      const intensity = Math.abs(value) / 20; // Normalize to 0-1 range
      if (value > 0) {
        return `rgba(16, 185, 129, ${Math.min(intensity, 1)})`;
      } else if (value < 0) {
        return `rgba(239, 68, 68, ${Math.min(intensity, 1)})`;
      }
      return 'rgba(156, 163, 175, 0.3)';
    };

    return (
      <div style={{
        background: 'white',
        padding: '20px',
        borderRadius: '15px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
        overflowX: 'auto'
      }}>
        <h3 style={{ marginBottom: '20px', color: '#1f2937', fontSize: '1.3rem' }}>
          🔥 Тепловая карта сезонности
        </h3>
        <div style={{ minWidth: '800px' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '2px' }}>
            <thead>
              <tr>
                <th style={{ 
                  padding: '8px', 
                  background: '#f3f4f6', 
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  fontWeight: '600'
                }}>
                  Месяц/День
                </th>
                {weekdayNames.map((day, index) => (
                  <th key={index} style={{ 
                    padding: '8px', 
                    background: '#f3f4f6', 
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    textAlign: 'center'
                  }}>
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {months.map((month, monthIndex) => (
                <tr key={month}>
                  <td style={{ 
                    padding: '8px', 
                    background: '#f3f4f6', 
                    borderRadius: '6px',
                    fontWeight: '600',
                    fontSize: '0.9rem'
                  }}>
                    {monthNamesShort[monthIndex]}
                  </td>
                  {weekdays.map((weekday, weekdayIndex) => {
                    const value = values[monthIndex]?.[weekdayIndex] || 0;
                    return (
                      <td
                        key={`${month}-${weekday}`}
                        style={{
                          padding: '8px',
                          background: getHeatColor(value),
                          borderRadius: '6px',
                          textAlign: 'center',
                          fontSize: '0.8rem',
                          fontWeight: '600',
                          color: Math.abs(value) > 10 ? 'white' : '#374151',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          border: '1px solid rgba(255,255,255,0.2)',
                        }}
                        title={`${monthNamesShort[monthIndex]} ${weekdayNames[weekdayIndex]}: ${formatPercent(value)}`}
                        onMouseEnter={(e) => {
                          (e.target as HTMLElement).style.transform = 'scale(1.1)';
                          (e.target as HTMLElement).style.zIndex = '10';
                          (e.target as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
                        }}
                        onMouseLeave={(e) => {
                          (e.target as HTMLElement).style.transform = 'scale(1)';
                          (e.target as HTMLElement).style.zIndex = '1';
                          (e.target as HTMLElement).style.boxShadow = 'none';
                        }}
                      >
                        {formatPercent(value)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          
          {/* Heat Map Legend */}
          <div style={{ 
            marginTop: '15px', 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            gap: '15px',
            fontSize: '0.9rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ 
                width: '20px', 
                height: '20px', 
                background: 'rgba(239, 68, 68, 0.8)', 
                borderRadius: '4px' 
              }}></div>
              <span>Спад продаж</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ 
                width: '20px', 
                height: '20px', 
                background: 'rgba(156, 163, 175, 0.3)', 
                borderRadius: '4px' 
              }}></div>
              <span>Нейтрально</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ 
                width: '20px', 
                height: '20px', 
                background: 'rgba(16, 185, 129, 0.8)', 
                borderRadius: '4px' 
              }}></div>
              <span>Рост продаж</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{
      maxWidth: '1400px',
      margin: '0 auto',
      padding: '20px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '30px', color: 'white' }}>
        <h1 style={{ 
          fontSize: '2.5rem', 
          marginBottom: '10px', 
          textShadow: '2px 2px 4px rgba(0,0,0,0.3)' 
        }}>
          📅 Анализ сезонности (Расширенный)
        </h1>
        <p style={{ fontSize: '1.1rem', opacity: 0.9 }}>
          Полный анализ сезонных трендов с прогнозированием и рекомендациями
        </p>
      </div>

      {/* Search Form */}
      <div style={{
        background: 'white',
        padding: '30px',
        borderRadius: '20px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
        marginBottom: '30px'
      }}>
        <form onSubmit={handleSubmit} style={{ 
          display: 'flex', 
          gap: '15px', 
          alignItems: 'center', 
          flexWrap: 'wrap' 
        }}>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Введите категорию (например: Электроника, Женщинам/Платья)"
            style={{
              flex: 1,
              minWidth: '300px',
              padding: '15px 20px',
              border: '2px solid #e5e7eb',
              borderRadius: '10px',
              fontSize: '16px'
            }}
            onKeyPress={(e) => e.key === 'Enter' && handleSubmit(e)}
          />
          <button 
            type="submit"
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
        </form>
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

      {/* Loading State */}
      {loading && (
        <div style={{
          background: 'white',
          padding: '50px',
          borderRadius: '20px',
          textAlign: 'center',
          boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '20px' }}>📊</div>
          <div style={{ fontSize: '1.2rem', color: '#6b7280' }}>
            Анализируем сезонные тренды...
          </div>
        </div>
      )}

      {/* Results */}
      {data && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          {/* Key Metrics Cards */}
          {data.analytics && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '20px'
            }}>
              <MetricCard
                title="Лучший месяц"
                value={monthNames[data.analytics.monthly_stats.peak_revenue.month - 1]}
                subtitle={`+${data.analytics.monthly_stats.peak_revenue.value.toFixed(1)}% выручки`}
                icon="🏆"
                color="#10b981"
                trend="up"
              />
              <MetricCard
                title="Худший месяц"
                value={monthNames[data.analytics.monthly_stats.low_revenue.month - 1]}
                subtitle={`${data.analytics.monthly_stats.low_revenue.value.toFixed(1)}% выручки`}
                icon="📉"
                color="#ef4444"
                trend="down"
              />
              <MetricCard
                title="Лучший день недели"
                value={data.analytics.weekly_stats.best_revenue_day.day}
                subtitle={`+${data.analytics.weekly_stats.best_revenue_day.value.toFixed(1)}% выручки`}
                icon="📅"
                color="#8b5cf6"
                trend="up"
              />
              <MetricCard
                title="Рост YoY"
                value={`${data.analytics.trends.yoy_growth.revenue > 0 ? '+' : ''}${data.analytics.trends.yoy_growth.revenue}%`}
                subtitle="год к году"
                icon="📈"
                color="#f59e0b"
                trend={data.analytics.trends.yoy_growth.revenue > 0 ? 'up' : 'down'}
              />
              <MetricCard
                title="Сезонный фактор"
                value={data.analytics.monthly_stats.seasonal_factor.toFixed(1)}
                subtitle={data.analytics.trends.seasonality_strength}
                icon="🌊"
                color="#06b6d4"
                trend="neutral"
              />
              <MetricCard
                title="Прогноз на месяц"
                value={data.analytics.forecasting.next_month_forecast}
                subtitle={`${data.analytics.forecasting.predicted_growth > 0 ? '+' : ''}${data.analytics.forecasting.predicted_growth}%`}
                icon="🔮"
                color="#ec4899"
                trend={data.analytics.forecasting.predicted_growth > 0 ? 'up' : 'down'}
              />
            </div>
          )}

          {/* Chart Navigation */}
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
              {[
                { key: 'annual', label: '📊 Годовой тренд', color: '#667eea' },
                { key: 'weekly', label: '📅 Недельный паттерн', color: '#f093fb' },
                { key: 'forecast', label: '🔮 Прогноз', color: '#10b981' },
                { key: 'heatmap', label: '🔥 Тепловая карта', color: '#f59e0b' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveChart(tab.key as any)}
                  style={{
                    padding: '10px 20px',
                    border: 'none',
                    borderRadius: '8px',
                    background: activeChart === tab.key ? tab.color : '#f3f4f6',
                    color: activeChart === tab.key ? 'white' : '#6b7280',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeChart === 'annual' && renderAnnualChart()}
            {activeChart === 'weekly' && renderWeeklyChart()}
            {activeChart === 'forecast' && renderForecastChart()}
            {activeChart === 'heatmap' && renderHeatMap()}
          </div>

          {/* Recommendations */}
          {data.analytics?.forecasting?.recommended_actions && (
            <div style={{
              background: 'white',
              padding: '30px',
              borderRadius: '20px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
            }}>
              <h2 style={{ 
                fontSize: '1.8rem', 
                color: '#1f2937', 
                marginBottom: '25px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                💡 Рекомендации
              </h2>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '15px'
              }}>
                {data.analytics.forecasting.recommended_actions.map((rec, index) => (
                  <div key={index} style={{
                    padding: '15px',
                    background: '#f9fafb',
                    borderRadius: '10px',
                    borderLeft: '4px solid #667eea'
                  }}>
                    {rec}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Holiday Correlation */}
          {data.analytics?.holiday_correlation?.holiday_boosts && 
           Array.isArray(data.analytics.holiday_correlation.holiday_boosts) && 
           data.analytics.holiday_correlation.holiday_boosts.length > 0 && (
            <div style={{
              background: 'white',
              padding: '30px',
              borderRadius: '20px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
            }}>
              <h2 style={{ 
                fontSize: '1.8rem', 
                color: '#1f2937', 
                marginBottom: '25px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                🎉 Корреляция с праздниками
              </h2>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '15px'
              }}>
                {data.analytics?.holiday_correlation?.holiday_boosts?.slice(0, 5).map((holiday, index) => (
                  <div key={index} style={{
                    padding: '15px',
                    background: '#f0f9ff',
                    borderRadius: '10px',
                    border: '2px solid #0ea5e9'
                  }}>
                    <div style={{ fontWeight: '700', color: '#0c4a6e', marginBottom: '5px' }}>
                      {holiday.holiday}
                    </div>
                    <div style={{ color: '#0369a1' }}>
                      {holiday.date}: +{holiday.revenue_boost.toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SeasonalityAnalysis; 