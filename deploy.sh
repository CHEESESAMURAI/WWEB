#!/bin/bash

# Скрипт развертывания Wild Analytics
# Использование: ./deploy.sh [production|development]

set -e

ENVIRONMENT=${1:-production}
echo "🚀 Развертывание Wild Analytics в режиме: $ENVIRONMENT"

# Проверка наличия Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен. Установите Docker и попробуйте снова."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose не установлен. Установите Docker Compose и попробуйте снова."
    exit 1
fi

# Создание необходимых директорий
echo "📁 Создание директорий..."
mkdir -p logs
mkdir -p ssl

# Проверка конфигурации
if [ ! -f "config.py" ]; then
    echo "⚠️  Файл config.py не найден. Создайте его на основе config.example.py"
    echo "cp config.example.py config.py"
    echo "Затем отредактируйте config.py с вашими API ключами"
    exit 1
fi

# Остановка существующих контейнеров
echo "🛑 Остановка существующих контейнеров..."
docker-compose down

# Сборка и запуск контейнеров
echo "🔨 Сборка и запуск контейнеров..."
docker-compose up --build -d

# Ожидание запуска сервисов
echo "⏳ Ожидание запуска сервисов..."
sleep 30

# Проверка статуса
echo "🔍 Проверка статуса сервисов..."
docker-compose ps

# Проверка доступности
echo "🌐 Проверка доступности..."
if curl -f http://localhost/api/docs > /dev/null 2>&1; then
    echo "✅ Backend API доступен"
else
    echo "❌ Backend API недоступен"
fi

if curl -f http://localhost > /dev/null 2>&1; then
    echo "✅ Frontend доступен"
else
    echo "❌ Frontend недоступен"
fi

echo "🎉 Развертывание завершено!"
echo "📱 Frontend: http://localhost"
echo "🔧 Backend API: http://localhost/api"
echo "📚 API документация: http://localhost/api/docs"
echo ""
echo "📋 Полезные команды:"
echo "  Просмотр логов: docker-compose logs -f"
echo "  Остановка: docker-compose down"
echo "  Перезапуск: docker-compose restart" 