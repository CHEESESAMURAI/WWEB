import React, { useState, useMemo, useCallback } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

// Types
interface SalesTrend {
  trend: 'growth' | 'decline' | 'stable' | 'unknown';
  trend_emoji: string;
  trend_text: string;
  trend_percentage: number;
}

interface EnhancedSKU {
  article: string;
  brand: string;
  product_name: string;
  total_stock: number;
  reserved_stock: number;
  available_stock: number;
  sales_7d_units: number;
  sales_30d_units: number;
  sales_60d_units: number;
  sales_90d_units: number;
  avg_daily_sales: number;
  forecast_30d_units: number;
  forecast_30d_revenue: number;
  turnover_days: number;
  recommended_supply: number;
  days_until_oos: number;
  available_days: number;
  sales_trend: SalesTrend;
  estimated_margin: number;
  margin_percentage: number;
  is_advertised: boolean;
  ad_percentage: number;
  last_supply_date: string;
  revenue_7d: number;
  revenue_30d: number;
  revenue_60d: number;
  revenue_90d: number;
  stock_status: 'critical' | 'warning' | 'good';
  stock_status_emoji: string;
  stock_status_text: string;
  supply_priority: 'high' | 'medium' | 'low';
  supply_priority_emoji: string;
  supply_priority_text: string;
  estimated_oos_date: string;
  price_current: number;
  price_old: number;
  discount: number;
  rating: number;
  reviews_count: number;
  category: string;
  supplier: string;
}

interface SupplySummaryAnalytics {
  total_skus: number;
  critical_skus: number;
  warning_skus: number;
  good_skus: number;
  critical_percentage: number;
  warning_percentage: number;
  good_percentage: number;
  total_stock_value: number;
  total_recommended_supply: number;
  avg_turnover_days: number;
  total_forecast_30d: number;
  total_forecast_revenue_30d: number;
}

const SupplyPlanningEnhanced: React.FC = () => {
  // State
  const [skus, setSKUs] = useState<EnhancedSKU[]>([]);
  const [summary, setSummary] = useState<SupplySummaryAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [articlesInput, setArticlesInput] = useState('');
  const [targetStockDays, setTargetStockDays] = useState(15);
  
  // Filters
  const [filters, setFilters] = useState({
    search: '',
    stockStatus: [] as string[],
    supplyPriority: [] as string[],
    minStock: null as number | null,
    maxDaysToOOS: null as number | null
  });

  // Analysis function
  const analyzeSupplyPlanning = useCallback(async () => {
    const articlesList = articlesInput
      .split(/[,\n\s]+/)
      .map(a => a.trim())
      .filter(Boolean);

    if (articlesList.length === 0) {
      setError('Введите хотя бы один артикул');
      return;
    }

    if (articlesList.length > 50) {
      setError('Максимум 50 артикулов за раз');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/planning/supply-planning-enhanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          articles: articlesList,
          target_stock_days: targetStockDays
        }),
      });

      if (!response.ok) {
        throw new Error('Ошибка при анализе планирования поставок');
      }

      const data = await response.json();
      setSKUs(data.data.skus);
      setSummary(data.data.summary);
      setActiveTab(1);
    } catch (err) {
      console.error(err);
      setError('Произошла ошибка при анализе');
    } finally {
      setLoading(false);
    }
  }, [articlesInput, targetStockDays]);

  // Export function
  const exportData = useCallback(async () => {
    const articlesList = articlesInput
      .split(/[,\n\s]+/)
      .map(a => a.trim())
      .filter(Boolean);

    if (articlesList.length === 0) {
      setError('Сначала выполните анализ');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/planning/supply-planning-export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          articles: articlesList,
          target_stock_days: targetStockDays
        }),
      });

      if (!response.ok) {
        throw new Error('Ошибка при экспорте данных');
      }

      const data = await response.json();
      
      const blob = new Blob([data.data.csv_content], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = data.data.filename;
      link.click();
      
    } catch (err) {
      console.error(err);
      setError('Ошибка при экспорте данных');
    }
  }, [articlesInput, targetStockDays]);

  // Filtered data
  const filteredSKUs = useMemo(() => {
    return skus.filter(sku => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (!sku.article.toLowerCase().includes(searchLower) &&
            !sku.product_name.toLowerCase().includes(searchLower) &&
            !sku.brand.toLowerCase().includes(searchLower)) {
          return false;
        }
      }

      if (filters.stockStatus.length > 0 && !filters.stockStatus.includes(sku.stock_status)) {
        return false;
      }

      if (filters.supplyPriority.length > 0 && !filters.supplyPriority.includes(sku.supply_priority)) {
        return false;
      }

      if (filters.minStock !== null && sku.total_stock < filters.minStock) {
        return false;
      }

      if (filters.maxDaysToOOS !== null && sku.days_until_oos > filters.maxDaysToOOS) {
        return false;
      }

      return true;
    });
  }, [skus, filters]);

  // Chart data
  const chartData = useMemo(() => {
    if (!skus.length) return null;

    const stockStatusData = [
      { name: 'Критический', value: skus.filter(s => s.stock_status === 'critical').length, color: '#ef4444' },
      { name: 'Внимание', value: skus.filter(s => s.stock_status === 'warning').length, color: '#f59e0b' },
      { name: 'Хорошо', value: skus.filter(s => s.stock_status === 'good').length, color: '#10b981' },
    ];

    const priorityData = [
      { name: 'Высокий', value: skus.filter(s => s.supply_priority === 'high').length },
      { name: 'Средний', value: skus.filter(s => s.supply_priority === 'medium').length },
      { name: 'Низкий', value: skus.filter(s => s.supply_priority === 'low').length },
    ];

    const turnoverData = skus.slice(0, 10).map(sku => ({
      name: sku.article,
      turnover: sku.turnover_days,
      stock: sku.total_stock,
      recommended: sku.recommended_supply
    }));

    return { stockStatus: stockStatusData, priority: priorityData, turnover: turnoverData };
  }, [skus]);

  // Render summary cards
  const renderSummaryCards = () => {
    if (!summary) return null;

    const cards = [
      { title: 'Всего SKU', value: summary.total_skus, emoji: '📦', color: '#3b82f6' },
      { title: 'Критические', value: summary.critical_skus, emoji: '🔴', color: '#ef4444', subtitle: `${summary.critical_percentage}%` },
      { title: 'Внимание', value: summary.warning_skus, emoji: '🟡', color: '#f59e0b', subtitle: `${summary.warning_percentage}%` },
      { title: 'В норме', value: summary.good_skus, emoji: '🟢', color: '#10b981', subtitle: `${summary.good_percentage}%` },
      { title: 'Стоимость остатков', value: `${(summary.total_stock_value / 1000000).toFixed(1)}М ₽`, emoji: '💰', color: '#8b5cf6' },
      { title: 'К поставке', value: summary.total_recommended_supply.toLocaleString(), emoji: '🚚', color: '#06b6d4' },
      { title: 'Прогноз продаж', value: summary.total_forecast_30d.toLocaleString(), emoji: '📈', color: '#84cc16' },
      { title: 'Оборачиваемость', value: `${summary.avg_turnover_days} дн.`, emoji: '⏱️', color: '#f97316' }
    ];

    return (
      <div className="analytics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        {cards.map((card, index) => (
          <div 
            key={index} 
            className="analytics-card"
            style={{
              background: 'white',
              padding: '24px',
              borderRadius: '16px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              border: `2px solid ${card.color}20`,
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = `0 8px 30px ${card.color}30`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)';
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: card.color, marginBottom: '8px' }}>
                  {card.value}
                </div>
                <div style={{ fontSize: '1rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                  {card.title}
                </div>
                {card.subtitle && (
                  <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    {card.subtitle}
                  </div>
                )}
              </div>
              <div style={{ fontSize: '2rem', opacity: 0.7 }}>
                {card.emoji}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render charts
  const renderCharts = () => {
    if (!chartData) return null;

    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
        <div style={{ background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginBottom: '20px', color: '#1f2937' }}>Статусы остатков</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData.stockStatus}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.stockStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <RechartsTooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginBottom: '20px', color: '#1f2937' }}>Приоритеты поставок</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData.priority}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <RechartsTooltip />
              <Bar dataKey="value" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ gridColumn: '1 / -1', background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginBottom: '20px', color: '#1f2937' }}>Оборачиваемость и рекомендации (Топ-10)</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData.turnover}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <RechartsTooltip />
              <Legend />
              <Bar dataKey="turnover" fill="#8884d8" name="Оборачиваемость (дни)" />
              <Bar dataKey="stock" fill="#82ca9d" name="Текущий остаток" />
              <Bar dataKey="recommended" fill="#ffc658" name="Рекомендуемая поставка" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  // Get status chip style
  const getStatusStyle = (status: string) => {
    const styles = {
      critical: { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' },
      warning: { background: '#fffbeb', color: '#d97706', border: '1px solid #fed7aa' },
      good: { background: '#f0fdf4', color: '#059669', border: '1px solid #bbf7d0' }
    };
    return styles[status as keyof typeof styles] || styles.good;
  };

  // Get trend icon
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'growth': return '📈';
      case 'decline': return '📉';
      case 'stable': return '➡️';
      default: return '❓';
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px', color: 'white' }}>
          <h1 style={{ fontSize: '3rem', marginBottom: '10px', fontWeight: 'bold', textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
            📦 Расширенный план поставок
          </h1>
          <p style={{ fontSize: '1.2rem', opacity: 0.9 }}>
            Комплексный анализ остатков, продаж и прогнозирование поставок с интеграцией MPStats + Wildberries API
          </p>
        </div>

        {/* Tabs */}
        <div style={{ background: 'white', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', marginBottom: '20px' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb' }}>
            <button
              onClick={() => setActiveTab(0)}
              style={{
                flex: 1,
                padding: '16px 24px',
                border: 'none',
                background: activeTab === 0 ? '#3b82f6' : 'transparent',
                color: activeTab === 0 ? 'white' : '#374151',
                borderRadius: activeTab === 0 ? '20px 20px 0 0' : '0',
                cursor: 'pointer',
                fontSize: '1.1rem',
                fontWeight: '600'
              }}
            >
              📊 Настройки анализа
            </button>
            <button
              onClick={() => setActiveTab(1)}
              disabled={!skus.length}
              style={{
                flex: 1,
                padding: '16px 24px',
                border: 'none',
                background: activeTab === 1 ? '#3b82f6' : 'transparent',
                color: activeTab === 1 ? 'white' : skus.length ? '#374151' : '#9ca3af',
                borderRadius: activeTab === 1 ? '20px 20px 0 0' : '0',
                cursor: skus.length ? 'pointer' : 'not-allowed',
                fontSize: '1.1rem',
                fontWeight: '600'
              }}
            >
              📦 Результаты анализа
            </button>
            <button
              onClick={() => setActiveTab(2)}
              disabled={!skus.length}
              style={{
                flex: 1,
                padding: '16px 24px',
                border: 'none',
                background: activeTab === 2 ? '#3b82f6' : 'transparent',
                color: activeTab === 2 ? 'white' : skus.length ? '#374151' : '#9ca3af',
                borderRadius: activeTab === 2 ? '20px 20px 0 0' : '0',
                cursor: skus.length ? 'pointer' : 'not-allowed',
                fontSize: '1.1rem',
                fontWeight: '600'
              }}
            >
              📈 Аналитика и графики
            </button>
          </div>

          {/* Tab Content */}
          <div style={{ padding: '30px' }}>
            {/* Tab 1: Settings */}
            {activeTab === 0 && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '30px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>
                      Артикулы товаров
                    </label>
                    <textarea
                      value={articlesInput}
                      onChange={(e) => setArticlesInput(e.target.value)}
                      placeholder="Введите артикулы через запятую, пробел или с новой строки&#10;Пример: 123456789, 987654321&#10;Или каждый с новой строки"
                      rows={4}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '2px solid #e5e7eb',
                        borderRadius: '12px',
                        fontSize: '16px',
                        fontFamily: 'inherit',
                        resize: 'vertical'
                      }}
                    />
                    <small style={{ color: '#6b7280', fontSize: '14px' }}>
                      {articlesInput.split(/[,\n\s]+/).filter(Boolean).length} артикулов (максимум 50)
                    </small>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>
                      Целевой запас (дни)
                    </label>
                    <input
                      type="number"
                      value={targetStockDays}
                      onChange={(e) => setTargetStockDays(parseInt(e.target.value) || 15)}
                      min="1"
                      max="90"
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '2px solid #e5e7eb',
                        borderRadius: '12px',
                        fontSize: '16px'
                      }}
                    />
                    <small style={{ color: '#6b7280', fontSize: '14px' }}>
                      На сколько дней держать запас
                    </small>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <button
                    onClick={analyzeSupplyPlanning}
                    disabled={loading}
                    style={{
                      padding: '16px 32px',
                      background: loading ? '#9ca3af' : 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    {loading ? '🔄 Анализируем...' : '📊 Запустить анализ'}
                  </button>
                  
                  <button
                    onClick={() => setArticlesInput('')}
                    style={{
                      padding: '16px 32px',
                      background: 'transparent',
                      color: '#374151',
                      border: '2px solid #d1d5db',
                      borderRadius: '12px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    🔄 Очистить
                  </button>
                </div>

                {error && (
                  <div style={{ 
                    marginTop: '20px',
                    padding: '16px',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '12px',
                    color: '#dc2626'
                  }}>
                    ❌ {error}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Results */}
            {activeTab === 1 && (
              <div>
                {renderSummaryCards()}

                {/* Filters */}
                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
                  <h3 style={{ marginBottom: '16px', color: '#1f2937' }}>Фильтры и поиск</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <input
                      type="text"
                      placeholder="🔍 Поиск по артикулу, названию, бренду..."
                      value={filters.search}
                      onChange={(e) => setFilters({...filters, search: e.target.value})}
                      style={{
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px'
                      }}
                    />
                    <input
                      type="number"
                      placeholder="Мин. остаток"
                      value={filters.minStock || ''}
                      onChange={(e) => setFilters({...filters, minStock: e.target.value ? parseInt(e.target.value) : null})}
                      style={{
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px'
                      }}
                    />
                    <input
                      type="number"
                      placeholder="Макс. дни до OOS"
                      value={filters.maxDaysToOOS || ''}
                      onChange={(e) => setFilters({...filters, maxDaysToOOS: e.target.value ? parseInt(e.target.value) : null})}
                      style={{
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ color: '#1f2937' }}>Найдено: {filteredSKUs.length} SKU</h3>
                  <button
                    onClick={exportData}
                    style={{
                      padding: '12px 24px',
                      background: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    📥 Экспорт CSV
                  </button>
                </div>

                {/* Main Table */}
                <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                  <div style={{ overflowX: 'auto', maxHeight: '600px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                      <thead style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
                        <tr>
                          <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '600', borderBottom: '2px solid #e5e7eb' }}>Статус</th>
                          <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '600', borderBottom: '2px solid #e5e7eb' }}>Артикул</th>
                          <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '600', borderBottom: '2px solid #e5e7eb' }}>Товар</th>
                          <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '600', borderBottom: '2px solid #e5e7eb' }}>Бренд</th>
                          <th style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '600', borderBottom: '2px solid #e5e7eb' }}>Остаток</th>
                          <th style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '600', borderBottom: '2px solid #e5e7eb' }}>Резерв</th>
                          <th style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '600', borderBottom: '2px solid #e5e7eb' }}>Продажи 30д</th>
                          <th style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '600', borderBottom: '2px solid #e5e7eb' }}>Средние/день</th>
                          <th style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '600', borderBottom: '2px solid #e5e7eb' }}>Дни до OOS</th>
                          <th style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '600', borderBottom: '2px solid #e5e7eb' }}>К поставке</th>
                          <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: '600', borderBottom: '2px solid #e5e7eb' }}>Тренд</th>
                          <th style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '600', borderBottom: '2px solid #e5e7eb' }}>Прогноз 30д</th>
                          <th style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '600', borderBottom: '2px solid #e5e7eb' }}>Оборачиваемость</th>
                          <th style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '600', borderBottom: '2px solid #e5e7eb' }}>Выручка 30д</th>
                          <th style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '600', borderBottom: '2px solid #e5e7eb' }}>Цена</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSKUs.map((sku, index) => (
                          <tr 
                            key={sku.article}
                            style={{ 
                              borderBottom: '1px solid #f3f4f6',
                              backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb'
                            }}
                          >
                            <td style={{ padding: '12px 8px' }}>
                              <span
                                style={{
                                  ...getStatusStyle(sku.stock_status),
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: '500',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                {sku.stock_status_emoji} {sku.stock_status_text}
                              </span>
                            </td>
                            <td style={{ padding: '12px 8px', fontWeight: '500', color: '#3b82f6' }}>
                              {sku.article}
                            </td>
                            <td style={{ padding: '12px 8px', maxWidth: '200px' }}>
                              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {sku.product_name.length > 40 ? `${sku.product_name.substring(0, 40)}...` : sku.product_name}
                              </div>
                            </td>
                            <td style={{ padding: '12px 8px' }}>{sku.brand}</td>
                            <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '500' }}>
                              {sku.total_stock.toLocaleString()}
                            </td>
                            <td style={{ padding: '12px 8px', textAlign: 'right', color: '#6b7280' }}>
                              {sku.reserved_stock.toLocaleString()}
                            </td>
                            <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                              {sku.sales_30d_units.toLocaleString()}
                            </td>
                            <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '500' }}>
                              {sku.avg_daily_sales.toFixed(1)}
                            </td>
                            <td 
                              style={{ 
                                padding: '12px 8px', 
                                textAlign: 'right', 
                                fontWeight: '500',
                                color: sku.days_until_oos < 3 ? '#dc2626' : sku.days_until_oos < 10 ? '#d97706' : '#059669'
                              }}
                            >
                              {sku.days_until_oos === Infinity ? '∞' : sku.days_until_oos.toFixed(1)}
                            </td>
                            <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '500', color: '#3b82f6' }}>
                              {sku.recommended_supply.toLocaleString()}
                            </td>
                            <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                <span>{getTrendIcon(sku.sales_trend.trend)}</span>
                                <span style={{ fontSize: '12px' }}>
                                  {sku.sales_trend.trend_percentage > 0 ? '+' : ''}
                                  {sku.sales_trend.trend_percentage.toFixed(0)}%
                                </span>
                              </div>
                            </td>
                            <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                              {sku.forecast_30d_units.toLocaleString()}
                            </td>
                            <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                              {sku.turnover_days.toFixed(1)} дн.
                            </td>
                            <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                              {(sku.revenue_30d / 1000).toFixed(0)}к ₽
                            </td>
                            <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                              <div>
                                {sku.price_current.toLocaleString()} ₽
                                {sku.discount > 0 && (
                                  <div style={{ fontSize: '12px', color: '#dc2626' }}>
                                    -{sku.discount}%
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Charts */}
            {activeTab === 2 && renderCharts()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupplyPlanningEnhanced; 