#!/bin/bash

echo "🚀 Правильный запуск Wild Analytics..."

# Остановка Docker контейнеров
echo "🛑 Остановка Docker контейнеров..."
docker-compose down

# Проверка зависимостей
echo "🔍 Проверка зависимостей..."

# Backend зависимости
if [ ! -d "web-dashboard/backend/venv" ]; then
    echo "🔧 Создание виртуального окружения для backend..."
    cd web-dashboard/backend
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    cd ../..
else
    echo "✅ Backend виртуальное окружение найдено"
fi

# Frontend зависимости
if [ ! -d "wild-analytics-web/node_modules" ]; then
    echo "🔧 Установка frontend зависимостей..."
    cd wild-analytics-web
    npm install
    cd ..
else
    echo "✅ Frontend зависимости найдены"
fi

echo ""
echo "🎯 Запуск приложения:"
echo ""
echo "📋 ВАЖНО: Запустите в РАЗНЫХ терминалах!"
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
echo "✅ После запуска:"
echo "🌐 Frontend: http://93.127.214.183:3000"
echo "🔗 Backend API: http://93.127.214.183:8000"
echo ""
echo "📋 Тестовые данные для входа:"
echo "Email: test@example.com"
echo "Password: password123"
echo ""
echo "🎯 Теперь приложение будет работать с полным функционалом!" 