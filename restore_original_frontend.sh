#!/bin/bash

echo "🔧 Восстановление оригинального frontend..."

# Остановка всех процессов
echo "🛑 Остановка процессов..."
pkill -f "npm start" || true
pkill -f "python main.py" || true

# Переходим в директорию frontend
cd wild-analytics-web

echo "🔍 Проверка оригинальных файлов..."
if [ -f "src/App.tsx.backup" ]; then
    echo "✅ Найден backup оригинального App.tsx"
    cp src/App.tsx.backup src/App.tsx
else
    echo "❌ Backup не найден, восстанавливаем из git..."
    git checkout HEAD -- src/App.tsx
fi

# Восстановление оригинальных страниц
echo "🔧 Восстановление оригинальных страниц..."
pages=("BrandAnalysis" "SupplierAnalysis" "CategoryAnalysis" "SeasonalityAnalysis" "AIHelper" "OracleQueries" "SupplyPlanning" "BloggerSearch" "ExternalAnalysis" "AdMonitoring" "GlobalSearch" "Profile")

for page in "${pages[@]}"; do
    if [ -f "src/pages/${page}.tsx.backup" ]; then
        echo "✅ Восстанавливаем ${page}.tsx"
        cp src/pages/${page}.tsx.backup src/pages/${page}.tsx
    else
        echo "🔍 Проверяем ${page}.tsx в git..."
        git checkout HEAD -- src/pages/${page}.tsx 2>/dev/null || echo "⚠️ ${page}.tsx не найден в git"
    fi
done

# Восстановление оригинальных компонентов
echo "🔧 Восстановление оригинальных компонентов..."
if [ -d "src/components" ]; then
    git checkout HEAD -- src/components/ 2>/dev/null || echo "⚠️ components не найден в git"
fi

if [ -d "src/layouts" ]; then
    git checkout HEAD -- src/layouts/ 2>/dev/null || echo "⚠️ layouts не найден в git"
fi

# Восстановление оригинальных стилей
echo "🔧 Восстановление оригинальных стилей..."
if [ -f "src/pages/Analysis.css.backup" ]; then
    cp src/pages/Analysis.css.backup src/pages/Analysis.css
fi

if [ -f "src/pages/GlobalSearch.css.backup" ]; then
    cp src/pages/GlobalSearch.css.backup src/pages/GlobalSearch.css
fi

# Восстановление оригинальных сервисов
echo "🔧 Восстановление оригинальных сервисов..."
if [ -f "src/services/api.ts.backup" ]; then
    cp src/services/api.ts.backup src/services/api.ts
fi

# Восстановление оригинального AuthContext
echo "🔧 Восстановление оригинального AuthContext..."
if [ -f "src/contexts/AuthContext.tsx.backup" ]; then
    cp src/contexts/AuthContext.tsx.backup src/contexts/AuthContext.tsx
fi

echo "📦 Установка зависимостей..."
npm install

echo ""
echo "✅ Оригинальный frontend восстановлен!"
echo ""
echo "🚀 Запуск приложения:"
echo ""
echo "🔧 Терминал 1 (Backend):"
echo "cd /opt/wild-analytics/web-dashboard/backend"
echo "source venv/bin/activate"
echo "python main.py"
echo ""
echo "🌐 Терминал 2 (Frontend):"
echo "cd /opt/wild-analytics/wild-analytics-web"
echo "npm start"
echo ""
echo "🌐 Frontend: http://93.127.214.183:3000"
echo "🔗 Backend API: http://93.127.214.183:8000"
echo ""
echo "📋 Тестовые данные для входа:"
echo "Email: test@example.com"
echo "Password: password123"
echo ""
echo "🎯 Теперь будет работать ваш оригинальный функционал!" 