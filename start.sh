#!/bin/bash

# 🚀 Wild Analytics Web Dashboard - Скрипт запуска

echo "🌐 Запуск Wild Analytics Web Dashboard"
echo "======================================"

# Проверка Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен. Запускаем локально..."
    
    # Запуск без Docker
    echo "📦 Установка зависимостей Frontend..."
    cd web-dashboard/frontend
    npm install
    
    echo "🔧 Установка зависимостей Backend..."
    cd ../backend
    pip install -r requirements.txt
    
    echo "🚀 Запуск приложений..."
    
    # Запуск Backend в фоне
    python main.py &
    BACKEND_PID=$!
    
    # Запуск Frontend
    cd ../frontend
    npm start &
    FRONTEND_PID=$!
    
    echo "✅ Приложение запущено!"
    echo "🌐 Frontend: http://localhost:3000"
    echo "⚙️ Backend API: http://localhost:8000"
    echo "📖 API Docs: http://localhost:8000/docs"
    echo ""
    echo "Тестовые данные для входа:"
    echo "Email: test@example.com"
    echo "Пароль: testpassword"
    echo ""
    echo "Нажмите Ctrl+C для остановки..."
    
    # Ожидание прерывания
    trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
    wait
    
else
    echo "🐳 Docker обнаружен. Запуск через Docker Compose..."
    
    cd web-dashboard
    
    # Проверка docker-compose
    if command -v docker-compose &> /dev/null; then
        COMPOSE_CMD="docker-compose"
    elif docker compose version &> /dev/null; then
        COMPOSE_CMD="docker compose"
    else
        echo "❌ Docker Compose не найден!"
        exit 1
    fi
    
    echo "📦 Сборка и запуск контейнеров..."
    $COMPOSE_CMD up --build -d
    
    # Ожидание запуска сервисов
    echo "⏳ Ожидание запуска сервисов..."
    sleep 10
    
    # Проверка статуса
    echo "📊 Статус сервисов:"
    $COMPOSE_CMD ps
    
    echo ""
    echo "✅ Приложение запущено!"
    echo "🌐 Frontend: http://localhost:3000"
    echo "⚙️ Backend API: http://localhost:8000"
    echo "📖 API Docs: http://localhost:8000/docs"
    echo "🗄️ PostgreSQL: localhost:5432"
    echo "🔴 Redis: localhost:6379"
    echo ""
    echo "Тестовые данные для входа:"
    echo "Email: test@example.com"
    echo "Пароль: testpassword"
    echo ""
    echo "Команды управления:"
    echo "🛑 Остановка: $COMPOSE_CMD down"
    echo "📋 Логи: $COMPOSE_CMD logs -f"
    echo "🔄 Перезапуск: $COMPOSE_CMD restart"
    echo ""
    echo "💡 Для остановки выполните: cd web-dashboard && $COMPOSE_CMD down"
fi 