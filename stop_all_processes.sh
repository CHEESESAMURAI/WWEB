#!/bin/bash

echo "🛑 Полная остановка всех процессов Wild Analytics..."

# Остановка npm процессов
echo "🛑 Остановка npm процессов..."
pkill -f "npm start" || echo "npm start не найден"
pkill -f "npm run" || echo "npm run не найден"
pkill -f "react-scripts" || echo "react-scripts не найден"

# Остановка Python процессов
echo "🛑 Остановка Python процессов..."
pkill -f "python main.py" || echo "python main.py не найден"
pkill -f "uvicorn" || echo "uvicorn не найден"
pkill -f "fastapi" || echo "fastapi не найден"

# Остановка Node.js процессов
echo "🛑 Остановка Node.js процессов..."
pkill -f "node" || echo "node не найден"

# Остановка процессов по портам
echo "🛑 Остановка процессов на портах..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || echo "Порт 3000 свободен"
lsof -ti:8000 | xargs kill -9 2>/dev/null || echo "Порт 8000 свободен"
lsof -ti:80 | xargs kill -9 2>/dev/null || echo "Порт 80 свободен"

# Остановка Docker контейнеров
echo "🛑 Остановка Docker контейнеров..."
docker stop $(docker ps -q) 2>/dev/null || echo "Docker контейнеры не найдены"
docker-compose down 2>/dev/null || echo "docker-compose не найден"

# Остановка всех процессов Wild Analytics
echo "🛑 Остановка процессов Wild Analytics..."
pkill -f "wild-analytics" || echo "wild-analytics процессы не найдены"
pkill -f "WWEB" || echo "WWEB процессы не найдены"

# Проверка что порты свободны
echo "🔍 Проверка портов..."
echo "Порт 3000:"
lsof -i:3000 || echo "Свободен"
echo "Порт 8000:"
lsof -i:8000 || echo "Свободен"

echo "✅ Все процессы остановлены!"
echo ""
echo "🚀 Теперь можно запустить приложение заново:"
echo "./fix_and_start_complete.sh" 