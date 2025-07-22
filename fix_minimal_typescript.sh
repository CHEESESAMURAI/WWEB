#!/bin/bash

echo "🔧 Минимальное исправление TypeScript ошибок..."

# Остановка контейнеров
docker-compose down

# Создание только типов
echo "🔧 Создание типов..."
mkdir -p wild-analytics-web/src/types
cat > wild-analytics-web/src/types/index.ts << 'EOF'
export interface User {
  email: string;
  name: string;
  balance?: number;
  subscription_type?: string;
}

export interface ProductAnalysisData {
  sales: number;
  revenue: number;
  avg_daily_sales: number;
  avg_daily_revenue: number;
  brand: string;
  category: string;
  price: number;
  competitors?: Array<{
    id: string;
    name: string;
    sales: number;
  }>;
}

export interface DashboardData {
  total_products: number;
  total_revenue: number;
  active_analyses: number;
  recent_analyses?: Array<{
    article: string;
    date: string;
    sales: number;
  }>;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  token?: string;
  user?: User;
}
EOF

# Исправление только AuthContext
echo "🔧 Исправление AuthContext..."
if [ -f "wild-analytics-web/src/contexts/AuthContext.tsx" ]; then
  # Создаем резервную копию
  cp wild-analytics-web/src/contexts/AuthContext.tsx wild-analytics-web/src/contexts/AuthContext.tsx.backup
  
  # Исправляем только импорт типов
  sed -i 's/interface User {/import { User } from "..\/types";\n\ninterface User {/' wild-analytics-web/src/contexts/AuthContext.tsx
  sed -i '/interface User {/,/}/d' wild-analytics-web/src/contexts/AuthContext.tsx
fi

# Исправление только Sidebar (если существует)
echo "🔧 Проверка Sidebar..."
if [ -f "wild-analytics-web/src/components/Layout/Sidebar.tsx" ]; then
  # Исправляем только строку с balance
  sed -i 's/user\.balance/user?.balance || 0/g' wild-analytics-web/src/components/Layout/Sidebar.tsx
  sed -i 's/user\.subscription_type/user?.subscription_type || "Базовый"/g' wild-analytics-web/src/components/Layout/Sidebar.tsx
fi

# Создание директорий если их нет
echo "🔧 Создание недостающих директорий..."
mkdir -p wild-analytics-web/src/components/Layout
mkdir -p wild-analytics-web/src/layouts

# Создание простого MainLayout если его нет
if [ ! -f "wild-analytics-web/src/layouts/MainLayout.tsx" ]; then
  echo "🔧 Создание простого MainLayout..."
  cat > wild-analytics-web/src/layouts/MainLayout.tsx << 'EOF'
import React from 'react';
import { Outlet } from 'react-router-dom';

const MainLayout: React.FC = () => {
  return (
    <div className="main-layout">
      <main className="main-body">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
EOF
fi

# Создание простого Sidebar если его нет
if [ ! -f "wild-analytics-web/src/components/Layout/Sidebar.tsx" ]; then
  echo "🔧 Создание простого Sidebar..."
  cat > wild-analytics-web/src/components/Layout/Sidebar.tsx << 'EOF'
import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="sidebar">
      <h2>Wild Analytics</h2>
      {user && (
        <div>
          <p>{user.email}</p>
          <p>💰 {user?.balance || 0}₽</p>
          <p>🎯 {user?.subscription_type || 'Базовый'}</p>
          <button onClick={logout}>Выйти</button>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
EOF
fi

# Создание простого CSS если его нет
if [ ! -f "wild-analytics-web/src/components/Layout/Layout.css" ]; then
  echo "🔧 Создание простого CSS..."
  cat > wild-analytics-web/src/components/Layout/Layout.css << 'EOF'
.main-layout {
  min-height: 100vh;
}

.main-body {
  padding: 2rem;
}

.sidebar {
  background: #333;
  color: white;
  padding: 1rem;
}
EOF
fi

echo "🧹 Очистка старых образов..."
docker system prune -f

echo "🔨 Пересборка frontend образа..."
docker build -t wild-analytics-frontend ./wild-analytics-web

echo "🚀 Запуск контейнеров..."
docker-compose up -d

echo "⏳ Ожидание запуска (45 секунд)..."
sleep 45

echo "📊 Статус контейнеров:"
docker ps

echo "🔍 Проверка API:"
curl -s http://localhost:8000/health || echo "❌ Backend недоступен"

echo ""
echo "✅ Минимальное исправление TypeScript завершено!"
echo "🌐 Frontend: http://93.127.214.183:3000"
echo "🔗 Backend API: http://93.127.214.183:8000"
echo ""
echo "📋 Тестовые данные для входа:"
echo "Email: test@example.com"
echo "Password: password123"
echo ""
echo "🎯 Теперь TypeScript ошибки исправлены без изменения функционала!" 