#!/bin/bash

echo "🔧 Исправление docker-compose.yml для использования порта 3000..."

# Создание исправленного docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  backend:
    build: ./web-dashboard/backend
    ports:
      - "8000:8000"
    environment:
      - CORS_ORIGINS=http://localhost:3000,http://93.127.214.183:3000
    volumes:
      - ./web-dashboard/backend:/app
    networks:
      - wild-analytics

  frontend:
    build: ./wild-analytics-web
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_API_URL=http://93.127.214.183:8000
    depends_on:
      - backend
    networks:
      - wild-analytics

networks:
  wild-analytics:
    driver: bridge
EOF

echo "✅ docker-compose.yml исправлен"
echo "🔄 Перезапуск контейнеров..."

# Остановка всех контейнеров
docker-compose down

# Удаление старых образов
docker system prune -f

# Запуск с новой конфигурацией
docker-compose up --build -d

echo "✅ Готово! Приложение доступно по адресу http://93.127.214.183:3000" 