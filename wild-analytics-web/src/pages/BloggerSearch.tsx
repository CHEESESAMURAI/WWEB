import React, { useState, useCallback } from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface BloggerContact {
  telegram?: string;
  email?: string;
  instagram_dm?: string;
  whatsapp?: string;
}

interface BloggerStats {
  avg_views: number;
  avg_likes: number;
  avg_comments: number;
  engagement_rate: number;
  posts_per_month: number;
  wb_mentions: number;
}

interface AudienceInsights {
  age_18_24: number;
  age_25_34: number;
  age_35_44: number;
  age_45_plus: number;
  male_percentage: number;
  female_percentage: number;
  top_countries: string[];
}

interface BloggerDetail {
  id: number;
  name: string;
  platform: string;
  profile_url: string;
  avatar_url?: string;
  category: string;
  followers: number;
  verified: boolean;
  has_wb_content: boolean;
  budget_min: number;
  budget_max: number;
  contacts: BloggerContact;
  stats: BloggerStats;
  audience: AudienceInsights;
  content_examples: string[];
  country?: string;
  description?: string;
  is_top_blogger: boolean;
  brand_friendly: boolean;
}

interface BloggerAnalytics {
  total_bloggers: number;
  platform_distribution: Record<string, number>;
  avg_followers: number;
  avg_budget: number;
  top_categories: Array<{name: string; count: number}>;
  wb_content_percentage: number;
  top_countries: string[];
}

interface AIRecommendations {
  best_bloggers: string[];
  recommended_platforms: string[];
  budget_strategy: string;
  content_suggestions: string[];
  negotiation_tips: string[];
  campaign_strategy: string;
  expected_roi: string;
}

interface BloggerSearchData {
  bloggers: BloggerDetail[];
  analytics: BloggerAnalytics;
  ai_recommendations: AIRecommendations;
  total_found: number;
}

const BloggerSearch: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['youtube', 'instagram', 'tiktok', 'telegram']);
  const [minFollowers, setMinFollowers] = useState<number | null>(null);
  const [maxFollowers, setMaxFollowers] = useState<number | null>(null);
  const [minBudget, setMinBudget] = useState<number | null>(null);
  const [maxBudget, setMaxBudget] = useState<number | null>(null);
  const [country, setCountry] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<BloggerSearchData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>('engagement');
  const [filterWbContent, setFilterWbContent] = useState<boolean | null>(null);
  const [expandedBlogger, setExpandedBlogger] = useState<number | null>(null);

  const platforms = [
    { id: 'youtube', name: 'YouTube', icon: '🎬', color: '#FF0000' },
    { id: 'instagram', name: 'Instagram', icon: '📷', color: '#E4405F' },
    { id: 'tiktok', name: 'TikTok', icon: '🎵', color: '#000000' },
    { id: 'telegram', name: 'Telegram', icon: '✈️', color: '#0088CC' }
  ];

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const formatPrice = (num: number): string => {
    return new Intl.NumberFormat('ru-RU').format(num);
  };

  const searchBloggers = useCallback(async () => {
    if (!keyword.trim()) {
      setError('Введите ключевое слово для поиска');
      return;
    }

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const response = await fetch('http://localhost:8000/bloggers/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keyword,
          platforms: selectedPlatforms,
          min_followers: minFollowers,
          max_followers: maxFollowers,
          min_budget: minBudget,
          max_budget: maxBudget,
          country: country || null
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
  }, [keyword, selectedPlatforms, minFollowers, maxFollowers, minBudget, maxBudget, country]);

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platformId) 
        ? prev.filter(p => p !== platformId)
        : [...prev, platformId]
    );
  };

  const getPlatformIcon = (platform: string) => {
    const platformData = platforms.find(p => p.id === platform);
    return platformData ? platformData.icon : '📱';
  };

  const getPlatformColor = (platform: string) => {
    const platformData = platforms.find(p => p.id === platform);
    return platformData ? platformData.color : '#666666';
  };

  const getFilteredAndSortedBloggers = () => {
    if (!data) return [];
    
    let filtered = [...data.bloggers];
    
    // Фильтр по WB контенту
    if (filterWbContent !== null) {
      filtered = filtered.filter(blogger => blogger.has_wb_content === filterWbContent);
    }
    
    // Сортировка
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'followers':
          return b.followers - a.followers;
        case 'engagement':
          return b.stats.engagement_rate - a.stats.engagement_rate;
        case 'budget':
          return (a.budget_min + a.budget_max) / 2 - (b.budget_min + b.budget_max) / 2;
        case 'wb_content':
          return Number(b.has_wb_content) - Number(a.has_wb_content);
        default:
          return 0;
      }
    });
    
    return filtered;
  };

  const getChartData = () => {
    if (!data) return { platformChart: null, categoryChart: null };
    
    const platformChart = {
      labels: Object.keys(data.analytics.platform_distribution),
      datasets: [{
        label: 'Количество блогеров',
        data: Object.values(data.analytics.platform_distribution),
        backgroundColor: Object.keys(data.analytics.platform_distribution).map(platform => getPlatformColor(platform)),
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    };
    
    const categoryChart = {
      labels: data.analytics.top_categories.map(cat => cat.name),
      datasets: [{
        label: 'Блогеров в категории',
        data: data.analytics.top_categories.map(cat => cat.count),
        backgroundColor: [
          '#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe',
          '#43e97b', '#fa709a', '#ffecd2', '#fcb69f', '#a8edea'
        ],
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    };
    
    return { platformChart, categoryChart };
  };

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

  const { platformChart, categoryChart } = getChartData();
  const filteredBloggers = getFilteredAndSortedBloggers();

  const exportToXLSX = useCallback(async () => {
    if (!data) return;
    
    try {
      const response = await fetch('http://localhost:8000/bloggers/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keyword,
          platforms: selectedPlatforms,
          min_followers: minFollowers,
          max_followers: maxFollowers,
          min_budget: minBudget,
          max_budget: maxBudget,
          country: country || null
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bloggers_${keyword}_${new Date().toISOString().slice(0, 10)}.xlsx`;
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
  }, [keyword, selectedPlatforms, minFollowers, maxFollowers, minBudget, maxBudget, country, data]);

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
              🔍 Поиск блогеров
            </h1>
            <p style={{ 
              color: '#6b7280', 
              fontSize: '1.2rem', 
              margin: '0',
              fontWeight: '500'
            }}>
              Найдите идеальных блогеров для продвижения ваших товаров с AI-рекомендациями
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
                🎯 Ключевое слово
              </label>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Спорт, Красота, Электроника..."
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
                👥 Мин. подписчики
              </label>
              <input
                type="number"
                value={minFollowers || ''}
                onChange={(e) => setMinFollowers(e.target.value ? Number(e.target.value) : null)}
                placeholder="1000"
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
                👥 Макс. подписчики
              </label>
              <input
                type="number"
                value={maxFollowers || ''}
                onChange={(e) => setMaxFollowers(e.target.value ? Number(e.target.value) : null)}
                placeholder="1000000"
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
                💰 Мин. бюджет (₽)
              </label>
              <input
                type="number"
                value={minBudget || ''}
                onChange={(e) => setMinBudget(e.target.value ? Number(e.target.value) : null)}
                placeholder="5000"
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
                💰 Макс. бюджет (₽)
              </label>
              <input
                type="number"
                value={maxBudget || ''}
                onChange={(e) => setMaxBudget(e.target.value ? Number(e.target.value) : null)}
                placeholder="200000"
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
                🌍 Страна
              </label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Россия, Казахстан..."
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '10px',
                  fontSize: '16px'
                }}
              />
            </div>
          </div>

          {/* Выбор платформ */}
          <div style={{ marginBottom: '25px' }}>
            <label style={{ 
              display: 'block', 
              fontWeight: '600', 
              color: '#374151', 
              marginBottom: '15px' 
            }}>
              📱 Платформы
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
              {platforms.map(platform => (
                <button
                  key={platform.id}
                  onClick={() => togglePlatform(platform.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 20px',
                    background: selectedPlatforms.includes(platform.id) 
                      ? `linear-gradient(135deg, ${platform.color}20, ${platform.color}10)` 
                      : '#f9fafb',
                    border: `2px solid ${selectedPlatforms.includes(platform.id) ? platform.color : '#e5e7eb'}`,
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: selectedPlatforms.includes(platform.id) ? platform.color : '#374151',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <span style={{ fontSize: '18px' }}>{platform.icon}</span>
                  {platform.name}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={searchBloggers}
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
                Поиск блогеров...
              </span>
            ) : (
              '🔍 Найти блогеров'
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

        {/* Результаты поиска */}
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
                📊 Аналитика поиска
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
                    {data.analytics.total_bloggers}
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '0.9rem', fontWeight: '500' }}>
                    Найдено блогеров
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
                    {formatNumber(data.analytics.avg_followers)}
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '0.9rem', fontWeight: '500' }}>
                    Средние подписчики
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
                    {formatPrice(data.analytics.avg_budget)} ₽
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '0.9rem', fontWeight: '500' }}>
                    Средний бюджет
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
                    {data.analytics.wb_content_percentage.toFixed(1)}%
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '0.9rem', fontWeight: '500' }}>
                    С WB контентом
                  </div>
                </div>
              </div>

              {/* Графики */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
                gap: '30px'
              }}>
                {platformChart && (
                  <div style={{ height: '300px' }}>
                    <h3 style={{ textAlign: 'center', marginBottom: '20px', color: '#374151' }}>
                      Распределение по платформам
                    </h3>
                    <Bar data={platformChart} options={chartOptions} />
                  </div>
                )}

                {categoryChart && (
                  <div style={{ height: '300px' }}>
                    <h3 style={{ textAlign: 'center', marginBottom: '20px', color: '#374151' }}>
                      Топ категории
                    </h3>
                    <Pie data={categoryChart} options={chartOptions} />
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
                🤖 AI Рекомендации по кампании
              </h2>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                gap: '25px'
              }}>
                {/* Лучшие блогеры */}
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
                    🏆 Рекомендуемые блогеры
                  </h3>
                  <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.6' }}>
                    {data.ai_recommendations.best_bloggers.map((blogger, idx) => (
                      <li key={idx} style={{ marginBottom: '8px', color: '#1e40af' }}>
                        {blogger}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Платформы */}
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
                    📱 Рекомендуемые платформы
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {data.ai_recommendations.recommended_platforms.map((platform, idx) => (
                      <span key={idx} style={{
                        background: '#166534',
                        color: 'white',
                        padding: '5px 12px',
                        borderRadius: '20px',
                        fontSize: '14px',
                        fontWeight: '600'
                      }}>
                        {platform}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Бюджетная стратегия */}
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
                    💰 Бюджетная стратегия
                  </h3>
                  <p style={{ margin: 0, color: '#d97706', lineHeight: '1.6' }}>
                    {data.ai_recommendations.budget_strategy}
                  </p>
                </div>

                {/* Контент */}
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
                    🎥 Типы контента
                  </h3>
                  <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.6' }}>
                    {data.ai_recommendations.content_suggestions.map((suggestion, idx) => (
                      <li key={idx} style={{ marginBottom: '8px', color: '#7c3aed' }}>
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Советы по переговорам */}
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
                    🤝 Советы по переговорам
                  </h3>
                  <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.6' }}>
                    {data.ai_recommendations.negotiation_tips.map((tip, idx) => (
                      <li key={idx} style={{ marginBottom: '8px', color: '#dc2626' }}>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* ROI */}
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
                    📈 Ожидаемый ROI
                  </h3>
                  <p style={{ margin: 0, color: '#047857', lineHeight: '1.6', fontWeight: '600' }}>
                    {data.ai_recommendations.expected_roi}
                  </p>
                </div>
              </div>
            </div>

            {/* Фильтры и сортировка */}
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
                    fontSize: '14px'
                  }}
                >
                  <option value="engagement">По вовлеченности</option>
                  <option value="followers">По подписчикам</option>
                  <option value="budget">По бюджету</option>
                  <option value="wb_content">По WB контенту</option>
                </select>
              </div>
              
              <div>
                <label style={{ fontWeight: '600', color: '#374151', marginRight: '10px' }}>
                  WB контент:
                </label>
                <select
                  value={filterWbContent === null ? '' : filterWbContent.toString()}
                  onChange={(e) => setFilterWbContent(e.target.value === '' ? null : e.target.value === 'true')}
                  style={{
                    padding: '8px 12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                >
                  <option value="">Все блогеры</option>
                  <option value="true">Только с WB</option>
                  <option value="false">Без WB</option>
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
                Показано: {filteredBloggers.length} из {data.total_found}
              </div>
            </div>

            {/* Карточки блогеров */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
              gap: '25px'
            }}>
              {filteredBloggers.map(blogger => (
                <div key={blogger.id} style={{
                  background: 'white',
                  borderRadius: '20px',
                  padding: '25px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                  transition: 'all 0.2s',
                  cursor: 'pointer',
                  border: expandedBlogger === blogger.id ? '3px solid #667eea' : '3px solid transparent'
                }}
                onMouseOver={(e) => {
                  if (expandedBlogger !== blogger.id) {
                    e.currentTarget.style.transform = 'translateY(-5px)';
                    e.currentTarget.style.boxShadow = '0 15px 40px rgba(0,0,0,0.15)';
                  }
                }}
                onMouseOut={(e) => {
                  if (expandedBlogger !== blogger.id) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.1)';
                  }
                }}
                onClick={() => setExpandedBlogger(expandedBlogger === blogger.id ? null : blogger.id)}>
                  {/* Заголовок карточки */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                    <div style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      background: blogger.avatar_url 
                        ? `url(${blogger.avatar_url})` 
                        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '24px',
                      fontWeight: '700'
                    }}>
                      {!blogger.avatar_url && blogger.name.charAt(0)}
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                        <h3 style={{ 
                          margin: 0, 
                          color: '#1f2937', 
                          fontSize: '1.2rem', 
                          fontWeight: '700' 
                        }}>
                          {blogger.name}
                        </h3>
                        {blogger.verified && (
                          <span style={{
                            background: '#3b82f6',
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}>
                            ✓
                          </span>
                        )}
                        {blogger.is_top_blogger && (
                          <span style={{
                            background: '#f59e0b',
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}>
                            🏆 ТОП
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ 
                          fontSize: '20px',
                          color: getPlatformColor(blogger.platform)
                        }}>
                          {getPlatformIcon(blogger.platform)}
                        </span>
                        <span style={{ color: '#6b7280', fontSize: '14px' }}>
                          {blogger.category}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Основные метрики */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '15px',
                    marginBottom: '20px'
                  }}>
                    <div style={{
                      background: '#f9fafb',
                      borderRadius: '10px',
                      padding: '15px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#667eea', marginBottom: '5px' }}>
                        {formatNumber(blogger.followers)}
                      </div>
                      <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                        Подписчики
                      </div>
                    </div>
                    
                    <div style={{
                      background: '#f9fafb',
                      borderRadius: '10px',
                      padding: '15px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#10b981', marginBottom: '5px' }}>
                        {blogger.stats.engagement_rate.toFixed(1)}%
                      </div>
                      <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                        Вовлеченность
                      </div>
                    </div>
                  </div>

                  {/* Бюджет и WB контент */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '20px'
                  }}>
                    <div>
                      <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '5px' }}>
                        Бюджет интеграции
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: '#f59e0b' }}>
                        {formatPrice(blogger.budget_min)} - {formatPrice(blogger.budget_max)} ₽
                      </div>
                    </div>
                    
                    {blogger.has_wb_content && (
                      <div style={{
                        background: '#dcfce7',
                        color: '#166534',
                        padding: '8px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        ✅ WB контент
                      </div>
                    )}
                  </div>

                  {/* Контакты */}
                  <div style={{
                    display: 'flex',
                    gap: '10px',
                    marginBottom: '15px',
                    flexWrap: 'wrap'
                  }}>
                    {blogger.contacts.telegram && (
                      <span style={{
                        background: '#0088cc20',
                        color: '#0088cc',
                        padding: '5px 10px',
                        borderRadius: '15px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        ✈️ {blogger.contacts.telegram}
                      </span>
                    )}
                    {blogger.contacts.email && (
                      <span style={{
                        background: '#66666620',
                        color: '#666666',
                        padding: '5px 10px',
                        borderRadius: '15px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        📧 Email
                      </span>
                    )}
                  </div>

                  {/* Расширенная информация */}
                  {expandedBlogger === blogger.id && (
                    <div style={{
                      borderTop: '2px solid #e5e7eb',
                      paddingTop: '20px',
                      marginTop: '20px'
                    }}>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '15px',
                        marginBottom: '20px'
                      }}>
                        <div>
                          <h4 style={{ margin: '0 0 10px 0', color: '#374151' }}>📊 Статистика</h4>
                          <div style={{ fontSize: '14px', lineHeight: '1.6', color: '#6b7280' }}>
                            <div>👀 Средние просмотры: {formatNumber(blogger.stats.avg_views)}</div>
                            <div>❤️ Средние лайки: {formatNumber(blogger.stats.avg_likes)}</div>
                            <div>💬 Средние комментарии: {formatNumber(blogger.stats.avg_comments)}</div>
                            <div>📅 Постов в месяц: {blogger.stats.posts_per_month}</div>
                            <div>🛒 Упоминания WB: {blogger.stats.wb_mentions}</div>
                          </div>
                        </div>
                        
                        <div>
                          <h4 style={{ margin: '0 0 10px 0', color: '#374151' }}>👥 Аудитория</h4>
                          <div style={{ fontSize: '14px', lineHeight: '1.6', color: '#6b7280' }}>
                            <div>👩 Женщины: {blogger.audience.female_percentage.toFixed(1)}%</div>
                            <div>👨 Мужчины: {blogger.audience.male_percentage.toFixed(1)}%</div>
                            <div>🎂 18-24: {blogger.audience.age_18_24.toFixed(1)}%</div>
                            <div>🎂 25-34: {blogger.audience.age_25_34.toFixed(1)}%</div>
                            <div>🌍 Страны: {blogger.audience.top_countries.join(', ')}</div>
                          </div>
                        </div>
                      </div>
                      
                      {blogger.description && (
                        <div style={{ marginBottom: '15px' }}>
                          <h4 style={{ margin: '0 0 10px 0', color: '#374151' }}>📝 Описание</h4>
                          <p style={{ margin: 0, fontSize: '14px', color: '#6b7280', lineHeight: '1.6' }}>
                            {blogger.description}
                          </p>
                        </div>
                      )}
                      
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <a
                          href={blogger.profile_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            padding: '10px 20px',
                            borderRadius: '10px',
                            textDecoration: 'none',
                            fontSize: '14px',
                            fontWeight: '600',
                            transition: 'all 0.2s'
                          }}
                        >
                          🔗 Открыть профиль
                        </a>
                        
                        {blogger.content_examples.length > 0 && (
                          <a
                            href={blogger.content_examples[0]}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              background: '#f3f4f6',
                              color: '#374151',
                              padding: '10px 20px',
                              borderRadius: '10px',
                              textDecoration: 'none',
                              fontSize: '14px',
                              fontWeight: '600',
                              border: '2px solid #e5e7eb'
                            }}
                          >
                            🎥 Пример контента
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  <div style={{
                    textAlign: 'center',
                    marginTop: '15px',
                    color: '#6b7280',
                    fontSize: '12px'
                  }}>
                    {expandedBlogger === blogger.id ? '🔼 Скрыть детали' : '🔽 Показать детали'}
                  </div>
                </div>
              ))}
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

export default BloggerSearch; 