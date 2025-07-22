#!/bin/bash

echo "🚀 Запуск полного Wild Analytics приложения..."

# Остановка всех процессов
echo "🛑 Остановка процессов..."
pkill -f "npm start" || true
pkill -f "python main.py" || true

# Проверка backend
echo "🔧 Проверка backend..."
cd web-dashboard/backend

if [ ! -f "main.py" ]; then
    echo "❌ main.py не найден! Запустите сначала fix_auth_and_database.sh"
    exit 1
fi

if [ ! -d "venv" ]; then
    echo "🔧 Создание виртуального окружения..."
    python3 -m venv venv
fi

echo "🔧 Активация виртуального окружения..."
source venv/bin/activate

echo "📦 Проверка зависимостей..."
pip install -r requirements.txt

echo "✅ Backend готов!"
cd ../..

# Проверка frontend
echo "🌐 Проверка frontend..."
cd wild-analytics-web

if [ ! -f "package.json" ]; then
    echo "❌ package.json не найден!"
    exit 1
fi

if [ ! -d "node_modules" ]; then
    echo "📦 Установка frontend зависимостей..."
    npm install
fi

echo "✅ Frontend готов!"
cd ..

echo ""
echo "🎯 Приложение готово к запуску!"
echo ""
echo "📋 ИНСТРУКЦИЯ ЗАПУСКА:"
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
echo "🎯 Теперь у вас будет:"
echo "✅ Полноценная авторизация"
echo "✅ Реальная база данных"
echo "✅ Личный кабинет с балансом"
echo "✅ История анализов"
echo "✅ Все функции Wild Analytics" 