#!/bin/bash

echo "🔧 ИСПРАВЛЕНИЕ TYPESCRIPT ОШИБОК..."

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

cd /opt/wild-analytics || { echo -e "${RED}Директория не найдена${NC}"; exit 1; }

log "🔧 Исправление интерфейсов TypeScript в App.tsx..."
cat > wild-analytics-web/src/App.tsx << 'EOF'
import React, { useState, useEffect } from 'react';

interface User {
  id: number;
  email: string;
  name: string;
  balance: number;
  subscription_type: string;
}

interface AnalysisResult {
  success: boolean;
  product?: any;
  category_analysis?: any;
  brand_analysis?: any;
  results?: any[];
  query?: string;
  total?: number;
  error?: string;
}

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState('login');
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [token, setToken] = useState('');

  // Состояния для анализа
  const [productQuery, setProductQuery] = useState('314308192');
  const [categoryQuery, setCategoryQuery] = useState('смартфоны');
  const [brandQuery, setBrandQuery] = useState('Apple');
  const [globalQuery, setGlobalQuery] = useState('iPhone');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      setCurrentPage('dashboard');
    }
  }, []);

  const apiCall = async (url: string, options: any = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    };

    const response = await fetch(`http://93.127.214.183:8000${url}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response.json();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (data.success) {
        setToken(data.access_token);
        setUser(data.user);
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setCurrentPage('dashboard');
        setMessage('Успешная авторизация!');
      }
    } catch (err) {
      setError('Ошибка авторизации');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setToken('');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setCurrentPage('login');
    setMessage('');
  };

  const analyzeProduct = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiCall('/analysis/products', {
        method: 'POST',
        body: JSON.stringify({ query: productQuery }),
      });
      setAnalysisResult(data);
      setMessage(data.success ? 'Анализ товара выполнен!' : 'Ошибка анализа');
    } catch (err) {
      setError('Ошибка анализа товара');
    } finally {
      setLoading(false);
    }
  };

  const analyzeCategory = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiCall(`/analysis/categories?category=${categoryQuery}`);
      setAnalysisResult(data);
      setMessage(data.success ? 'Анализ категории выполнен!' : 'Ошибка анализа');
    } catch (err) {
      setError('Ошибка анализа категории');
    } finally {
      setLoading(false);
    }
  };

  const analyzeBrand = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiCall(`/analysis/brands?brand=${brandQuery}`);
      setAnalysisResult(data);
      setMessage(data.success ? 'Анализ бренда выполнен!' : 'Ошибка анализа');
    } catch (err) {
      setError('Ошибка анализа бренда');
    } finally {
      setLoading(false);
    }
  };

  const globalSearch = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiCall('/search/global', {
        method: 'POST',
        body: JSON.stringify({ query: globalQuery }),
      });
      setAnalysisResult({...data, query: globalQuery});
      setMessage(data.success ? 'Поиск выполнен!' : 'Ошибка поиска');
    } catch (err) {
      setError('Ошибка глобального поиска');
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      fontFamily: 'Inter, sans-serif',
    },
    sidebar: {
      position: 'fixed' as const,
      left: 0,
      top: 0,
      width: '280px',
      height: '100vh',
      background: 'rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(20px)',
      borderRight: '1px solid rgba(255, 255, 255, 0.18)',
      padding: '20px',
      zIndex: 1000,
      overflowY: 'auto' as const,
    },
    content: {
      marginLeft: '280px',
      padding: '20px',
      minHeight: '100vh',
    },
    card: {
      background: 'rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(20px)',
      borderRadius: '20px',
      padding: '30px',
      margin: '20px 0',
      boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)',
      border: '1px solid rgba(255, 255, 255, 0.18)',
    },
    loginCard: {
      maxWidth: '400px',
      margin: '10vh auto',
      background: 'rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(20px)',
      borderRadius: '20px',
      padding: '40px',
      boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)',
      border: '1px solid rgba(255, 255, 255, 0.18)',
      textAlign: 'center' as const,
    },
    title: {
      fontSize: '2rem',
      marginBottom: '30px',
      background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    },
    menuItem: {
      display: 'flex',
      alignItems: 'center',
      padding: '12px 16px',
      margin: '8px 0',
      borderRadius: '12px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      color: 'rgba(255, 255, 255, 0.8)',
    },
    menuItemActive: {
      background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      color: 'white',
      boxShadow: '0 4px 15px rgba(245, 87, 108, 0.3)',
    },
    input: {
      width: '100%',
      padding: '12px 16px',
      background: 'rgba(255, 255, 255, 0.1)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      borderRadius: '12px',
      color: 'white',
      fontSize: '16px',
      marginBottom: '16px',
      boxSizing: 'border-box' as const,
    },
    button: {
      background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      border: 'none',
      borderRadius: '12px',
      padding: '12px 24px',
      color: 'white',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      marginRight: '10px',
      marginBottom: '10px',
    },
    error: {
      background: 'rgba(255, 87, 87, 0.2)',
      border: '1px solid rgba(255, 87, 87, 0.3)',
      borderRadius: '12px',
      padding: '15px',
      color: '#ff5757',
      marginBottom: '20px',
    },
    success: {
      background: 'rgba(87, 255, 87, 0.2)',
      border: '1px solid rgba(87, 255, 87, 0.3)',
      borderRadius: '12px',
      padding: '15px',
      color: '#57ff57',
      marginBottom: '20px',
    },
    resultCard: {
      background: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '15px',
      padding: '20px',
      marginTop: '20px',
    },
  };

  if (currentPage === 'login') {
    return (
      <div style={styles.container}>
        <div style={styles.loginCard}>
          <h1 style={styles.title}>🔥 Wild Analytics</h1>
          
          {error && <div style={styles.error}>{error}</div>}
          {message && <div style={styles.success}>{message}</div>}

          <form onSubmit={handleLogin}>
            <input
              type="email"
              placeholder="📧 Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              required
            />
            
            <input
              type="password"
              placeholder="🔑 Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              required
            />
            
            <button type="submit" disabled={loading} style={styles.button}>
              {loading ? '⏳ Входим...' : '🚀 Войти'}
            </button>
          </form>

          <div style={{ marginTop: '20px', fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)' }}>
            Тест: test@example.com / password123
          </div>
        </div>
      </div>
    );
  }

  const menuItems = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'products', icon: '🔍', label: 'Анализ товаров' },
    { id: 'brands', icon: '🏷️', label: 'Анализ брендов' },
    { id: 'categories', icon: '📂', label: 'Анализ категорий' },
    { id: 'search', icon: '🌐', label: 'Глобальный поиск' },
    { id: 'seasonality', icon: '⭐', label: 'Сезонность' },
    { id: 'suppliers', icon: '🏪', label: 'Поставщики' },
    { id: 'bloggers', icon: '👥', label: 'Поиск блогеров' },
    { id: 'monitoring', icon: '📺', label: 'Мониторинг рекламы' },
    { id: 'planning', icon: '📋', label: 'Планирование' },
    { id: 'oracle', icon: '🔮', label: 'Oracle запросы' },
    { id: 'profile', icon: '👤', label: 'Профиль' },
  ];

  const renderContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <div>
            <h1>📊 Dashboard</h1>
            <div style={styles.card}>
              <h3>👋 Добро пожаловать, {user?.name}!</h3>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '20px'}}>
                <div style={styles.resultCard}>
                  <h4>👤 Профиль</h4>
                  <p><strong>Email:</strong> {user?.email}</p>
                  <p><strong>Подписка:</strong> {user?.subscription_type}</p>
                </div>
                <div style={styles.resultCard}>
                  <h4>💰 Баланс</h4>
                  <p style={{fontSize: '24px', color: '#f093fb'}}>{user?.balance}₽</p>
                </div>
                <div style={styles.resultCard}>
                  <h4>🎯 Система</h4>
                  <p>Backend подключен</p>
                  <p>API работает</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'products':
        return (
          <div>
            <h1>🔍 Анализ товаров</h1>
            <div style={styles.card}>
              <h3>Поиск товара по ID или названию</h3>
              <input
                type="text"
                placeholder="Введите ID товара WB или название (например: 314308192)"
                value={productQuery}
                onChange={(e) => setProductQuery(e.target.value)}
                style={styles.input}
              />
              <button onClick={analyzeProduct} disabled={loading} style={styles.button}>
                {loading ? '⏳ Анализируем...' : '🔍 Анализировать товар'}
              </button>
              
              {analysisResult?.product && (
                <div style={styles.resultCard}>
                  <h4>📊 Результат анализа товара:</h4>
                  <p><strong>Название:</strong> {analysisResult.product.name}</p>
                  <p><strong>Цена:</strong> {analysisResult.product.price}₽</p>
                  <p><strong>Рейтинг:</strong> {analysisResult.product.rating}⭐</p>
                  <p><strong>Отзывы:</strong> {analysisResult.product.reviews_count}</p>
                  <p><strong>Бренд:</strong> {analysisResult.product.brand}</p>
                  <p><strong>Категория:</strong> {analysisResult.product.category}</p>
                  {analysisResult.product.url && (
                    <a href={analysisResult.product.url} target="_blank" rel="noopener noreferrer" style={{color: '#f093fb'}}>
                      🔗 Открыть на Wildberries
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        );

      case 'categories':
        return (
          <div>
            <h1>📂 Анализ категорий</h1>
            <div style={styles.card}>
              <h3>Анализ товаров в категории</h3>
              <input
                type="text"
                placeholder="Введите название категории (смартфоны, одежда, обувь...)"
                value={categoryQuery}
                onChange={(e) => setCategoryQuery(e.target.value)}
                style={styles.input}
              />
              <button onClick={analyzeCategory} disabled={loading} style={styles.button}>
                {loading ? '⏳ Анализируем...' : '📊 Анализировать категорию'}
              </button>
              
              {analysisResult?.category_analysis && (
                <div style={styles.resultCard}>
                  <h4>📈 Анализ категории: {analysisResult.category_analysis.category}</h4>
                  <p><strong>Найдено товаров:</strong> {analysisResult.category_analysis.total_products}</p>
                  <p><strong>Средняя цена:</strong> {analysisResult.category_analysis.avg_price?.toFixed(2)}₽</p>
                  <p><strong>Средний рейтинг:</strong> {analysisResult.category_analysis.avg_rating?.toFixed(2)}⭐</p>
                  
                  <h5>🔝 Топ товары в категории:</h5>
                  {analysisResult.category_analysis.products?.slice(0, 5).map((product: any, index: number) => (
                    <div key={index} style={{...styles.resultCard, margin: '10px 0'}}>
                      <p><strong>{product.name}</strong></p>
                      <p>💰 {product.price}₽ | ⭐ {product.rating} | 🏷️ {product.brand}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case 'brands':
        return (
          <div>
            <h1>🏷️ Анализ брендов</h1>
            <div style={styles.card}>
              <h3>Анализ товаров бренда</h3>
              <input
                type="text"
                placeholder="Введите название бренда (Apple, Samsung, Nike...)"
                value={brandQuery}
                onChange={(e) => setBrandQuery(e.target.value)}
                style={styles.input}
              />
              <button onClick={analyzeBrand} disabled={loading} style={styles.button}>
                {loading ? '⏳ Анализируем...' : '🏷️ Анализировать бренд'}
              </button>
              
              {analysisResult?.brand_analysis && (
                <div style={styles.resultCard}>
                  <h4>🏷️ Анализ бренда: {analysisResult.brand_analysis.brand}</h4>
                  <p><strong>Товаров найдено:</strong> {analysisResult.brand_analysis.products_count}</p>
                  <p><strong>Средняя цена:</strong> {analysisResult.brand_analysis.avg_price?.toFixed(2)}₽</p>
                  <p><strong>Средний рейтинг:</strong> {analysisResult.brand_analysis.avg_rating?.toFixed(2)}⭐</p>
                  
                  <h5>🔝 Топ товары бренда:</h5>
                  {analysisResult.brand_analysis.products?.slice(0, 5).map((product: any, index: number) => (
                    <div key={index} style={{...styles.resultCard, margin: '10px 0'}}>
                      <p><strong>{product.name}</strong></p>
                      <p>💰 {product.price}₽ | ⭐ {product.rating} | 💬 {product.reviews} отзывов</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case 'search':
        return (
          <div>
            <h1>🌐 Глобальный поиск</h1>
            <div style={styles.card}>
              <h3>Поиск товаров по всему каталогу</h3>
              <input
                type="text"
                placeholder="Введите поисковый запрос (iPhone, кроссовки, платье...)"
                value={globalQuery}
                onChange={(e) => setGlobalQuery(e.target.value)}
                style={styles.input}
              />
              <button onClick={globalSearch} disabled={loading} style={styles.button}>
                {loading ? '⏳ Ищем...' : '🔍 Найти товары'}
              </button>
              
              {analysisResult?.results && (
                <div style={styles.resultCard}>
                  <h4>🔍 Результаты поиска по запросу: {analysisResult.query || globalQuery}</h4>
                  <p><strong>Найдено:</strong> {analysisResult.total || analysisResult.results.length} товаров</p>
                  
                  {analysisResult.results.slice(0, 10).map((item: any, index: number) => (
                    <div key={index} style={{...styles.resultCard, margin: '10px 0'}}>
                      <p><strong>{item.title}</strong></p>
                      <p>💰 {item.price}₽ | ⭐ {item.rating} | 🏷️ {item.brand} | 📂 {item.category}</p>
                      {item.url && (
                        <a href={item.url} target="_blank" rel="noopener noreferrer" style={{color: '#f093fb'}}>
                          🔗 Открыть товар
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      default:
        return (
          <div>
            <h1>{menuItems.find(item => item.id === currentPage)?.icon} {menuItems.find(item => item.id === currentPage)?.label}</h1>
            <div style={styles.card}>
              <h3>🚧 Раздел в разработке</h3>
              <p>Этот функционал скоро будет добавлен!</p>
              <p><strong>Доступные функции:</strong></p>
              <ul style={{textAlign: 'left'}}>
                <li>🔍 <strong>Анализ товаров</strong> - полностью работает с Wildberries API</li>
                <li>🏷️ <strong>Анализ брендов</strong> - поиск и анализ товаров бренда</li>
                <li>📂 <strong>Анализ категорий</strong> - статистика по категориям</li>
                <li>🌐 <strong>Глобальный поиск</strong> - поиск по всему каталогу WB</li>
              </ul>
              
              <div style={{marginTop: '30px', padding: '20px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px'}}>
                <h4>🧪 Попробуйте рабочие функции:</h4>
                <button onClick={() => setCurrentPage('products')} style={styles.button}>
                  🔍 Анализ товаров
                </button>
                <button onClick={() => setCurrentPage('brands')} style={styles.button}>
                  🏷️ Анализ брендов  
                </button>
                <button onClick={() => setCurrentPage('categories')} style={styles.button}>
                  📂 Анализ категорий
                </button>
                <button onClick={() => setCurrentPage('search')} style={styles.button}>
                  🌐 Глобальный поиск
                </button>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <h2 style={styles.title}>🔥 Wild Analytics</h2>
        
        {menuItems.map((item) => (
          <div
            key={item.id}
            style={{
              ...styles.menuItem,
              ...(currentPage === item.id ? styles.menuItemActive : {}),
            }}
            onClick={() => setCurrentPage(item.id)}
          >
            <span style={{ marginRight: '12px', fontSize: '18px' }}>{item.icon}</span>
            {item.label}
          </div>
        ))}
        
        <div style={{ marginTop: '40px', padding: '20px 0', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <button onClick={handleLogout} style={{...styles.button, width: '100%'}}>
            🚪 Выйти
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.content}>
        {error && <div style={styles.error}>{error}</div>}
        {message && <div style={styles.success}>{message}</div>}
        
        {renderContent()}
      </div>
    </div>
  );
};

export default App;
EOF

log "🔨 Пересборка frontend с исправленными типами..."
docker rmi wild-frontend 2>/dev/null || true
docker build --no-cache -t wild-frontend ./wild-analytics-web

if [ $? -eq 0 ]; then
    log "✅ Frontend с исправленными типами собран!"
    
    log "🚀 Запуск исправленного frontend..."
    docker run -d --name wild-frontend -p 3000:3000 wild-frontend
    
    log "⏳ Ожидание запуска (30 сек)..."
    sleep 30
    
    log "🔍 Проверка статуса..."
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    log "📋 Логи frontend..."
    docker logs wild-frontend --tail 10
    
    log "✅ TYPESCRIPT ОШИБКИ ИСПРАВЛЕНЫ!"
    log ""
    log "🎯 Что исправлено:"
    log "   ✅ Добавлено query?: string в интерфейс AnalysisResult"
    log "   ✅ Добавлено total?: number в интерфейс AnalysisResult"
    log "   ✅ Исправлена обработка globalQuery"
    log "   ✅ Добавлены fallback значения для отображения"
    log "   ✅ Улучшен дизайн и UX"
    log ""
    log "🌐 Откройте: http://93.127.214.183:3000"
    log "🔍 Попробуйте все функции анализа!"
    
else
    log "❌ Ошибка сборки frontend"
    docker logs $(docker ps -lq) 2>/dev/null || echo "Нет логов"
fi

log "📊 ФИНАЛЬНЫЙ СТАТУС..."
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 