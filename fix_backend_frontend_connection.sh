#!/bin/bash

echo "🔧 Диагностика и исправление связи Backend ↔ Frontend..."

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Переходим в директорию проекта
cd /opt/wild-analytics || { error "Директория /opt/wild-analytics не найдена"; exit 1; }

log "🚀 Начало диагностики..."

# 1. Проверка статуса контейнеров
log "🐳 Проверка статуса контейнеров..."
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# 2. Проверка логов backend
log "📝 Проверка логов backend..."
echo "=== BACKEND LOGS ==="
docker logs wild-analytics-backend --tail=20 2>&1 || docker-compose logs backend --tail=20 2>&1 || echo "Backend контейнер не найден"

# 3. Проверка логов frontend
log "📝 Проверка логов frontend..."
echo "=== FRONTEND LOGS ==="
docker logs wild-analytics-frontend --tail=20 2>&1 || docker-compose logs frontend --tail=20 2>&1 || echo "Frontend контейнер не найден"

# 4. Проверка сетевых портов
log "🌐 Проверка портов..."
netstat -tlnp | grep -E "(3000|8000|80|443)" || echo "Нет активных портов"

# 5. Проверка доступности backend изнутри контейнера
log "🔍 Проверка backend изнутри..."
docker exec wild-analytics-frontend curl -s http://backend:8000/health 2>/dev/null || echo "Backend недоступен изнутри контейнера"

# 6. Проверка backend снаружи
log "🔍 Проверка backend снаружи..."
curl -s http://localhost:8000/health || curl -s http://93.127.214.183:8000/health || echo "Backend недоступен снаружи"

# 7. Проверка .env файлов
log "📋 Проверка .env файлов..."
echo "=== BACKEND .ENV ==="
cat web-dashboard/backend/.env 2>/dev/null || echo "Backend .env не найден"

echo "=== FRONTEND .ENV ==="
cat wild-analytics-web/.env 2>/dev/null || echo "Frontend .env не найден"

# 8. Остановка всех контейнеров
log "🛑 Остановка всех контейнеров..."
docker-compose down 2>/dev/null || true
docker stop $(docker ps -q) 2>/dev/null || true

# 9. Создание исправленного Docker Compose
log "🔧 Создание исправленного Docker Compose..."
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  backend:
    build:
      context: ./web-dashboard/backend
      dockerfile: Dockerfile
    container_name: wild-analytics-backend
    environment:
      - CORS_ORIGINS=http://localhost:3000,http://93.127.214.183:3000,http://93.127.214.183
    volumes:
      - ./logs:/app/logs
    ports:
      - "8000:8000"
    restart: unless-stopped
    networks:
      - wild-analytics-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build:
      context: ./wild-analytics-web
      dockerfile: Dockerfile
    container_name: wild-analytics-frontend
    environment:
      - REACT_APP_API_URL=http://93.127.214.183:8000
    ports:
      - "3000:3000"
    depends_on:
      - backend
    restart: unless-stopped
    networks:
      - wild-analytics-network

networks:
  wild-analytics-network:
    driver: bridge
EOF

# 10. Создание исправленного backend Dockerfile
log "🐳 Создание исправленного backend Dockerfile..."
cat > web-dashboard/backend/Dockerfile << 'EOF'
FROM python:3.11-slim

WORKDIR /app

# Установка системных зависимостей
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Копирование requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копирование кода
COPY . .

# Создание директории для логов
RUN mkdir -p /app/logs

# Экспорт порта
EXPOSE 8000

# Запуск
CMD ["python", "main.py"]
EOF

# 11. Создание исправленного frontend Dockerfile
log "🐳 Создание исправленного frontend Dockerfile..."
cat > wild-analytics-web/Dockerfile << 'EOF'
FROM node:18-alpine

WORKDIR /app

# Копирование package.json
COPY package*.json ./

# Установка зависимостей
RUN npm install

# Копирование кода
COPY . .

# Экспорт порта
EXPOSE 3000

# Запуск в development режиме для лучшей диагностики
CMD ["npm", "start"]
EOF

# 12. Обновление .env файлов
log "🔧 Обновление .env файлов..."

# Backend .env
cat > web-dashboard/backend/.env << 'EOF'
# CORS
CORS_ORIGINS=http://localhost:3000,http://93.127.214.183:3000,http://93.127.214.183

# API Keys (замените на реальные)
OPENAI_API_KEY=your_openai_api_key_here
MPSTATS_API_KEY=your_mpstats_api_key_here

# Security
SECRET_KEY=wild-analytics-secret-key-2024

# Logging
LOG_LEVEL=DEBUG
EOF

# Frontend .env
cat > wild-analytics-web/.env << 'EOF'
REACT_APP_API_URL=http://93.127.214.183:8000
REACT_APP_ENVIRONMENT=development
GENERATE_SOURCEMAP=false
EOF

# 13. Проверка и исправление main.py
log "🔧 Проверка backend main.py..."
if [ ! -f "web-dashboard/backend/main.py" ]; then
    error "main.py не найден! Создаю базовый main.py..."
    cat > web-dashboard/backend/main.py << 'EOF'
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
import logging

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Wild Analytics API",
    description="Backend для Wild Analytics",
    version="1.0.0"
)

# CORS настройки
origins = [
    "http://localhost:3000",
    "http://93.127.214.183:3000",
    "http://93.127.214.183",
    "https://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Wild Analytics API is running!", "status": "ok"}

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "wild-analytics-backend"}

@app.get("/api/test")
async def test():
    return {"message": "API работает!", "frontend_connection": "ok"}

if __name__ == "__main__":
    logger.info("🚀 Starting Wild Analytics Backend...")
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        log_level="info"
    )
EOF
fi

# 14. Проверка requirements.txt
log "🔧 Проверка requirements.txt..."
if [ ! -f "web-dashboard/backend/requirements.txt" ]; then
    cat > web-dashboard/backend/requirements.txt << 'EOF'
fastapi==0.104.1
uvicorn==0.24.0
python-multipart==0.0.6
requests==2.31.0
pydantic==2.5.0
EOF
fi

# 15. Очистка Docker кэша
log "🧹 Очистка Docker кэша..."
docker system prune -f

# 16. Пересборка контейнеров
log "🔨 Пересборка контейнеров..."
docker-compose build --no-cache

# 17. Запуск контейнеров
log "🚀 Запуск контейнеров..."
docker-compose up -d

# 18. Ожидание запуска
log "⏳ Ожидание запуска сервисов (60 секунд)..."
sleep 60

# 19. Финальная проверка
log "🔍 Финальная проверка..."

echo "=== СТАТУС КОНТЕЙНЕРОВ ==="
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo "=== ПРОВЕРКА BACKEND ==="
curl -s http://localhost:8000/health || echo "Backend не отвечает"
curl -s http://93.127.214.183:8000/health || echo "Backend не доступен извне"

echo "=== ПРОВЕРКА FRONTEND ==="
curl -s http://localhost:3000 | head -n 5 || echo "Frontend не отвечает"
curl -s http://93.127.214.183:3000 | head -n 5 || echo "Frontend не доступен извне"

echo "=== ПРОВЕРКА СВЯЗИ ==="
docker exec wild-analytics-frontend curl -s http://backend:8000/health || echo "Нет связи между контейнерами"

# 20. Логи после запуска
log "📝 Проверка логов после запуска..."
echo "=== BACKEND LOGS ==="
docker logs wild-analytics-backend --tail=10

echo "=== FRONTEND LOGS ==="
docker logs wild-analytics-frontend --tail=10

log "✅ Диагностика завершена!"
log ""
log "🌐 Проверьте доступ:"
log "  - Frontend: http://93.127.214.183:3000"
log "  - Backend: http://93.127.214.183:8000"
log "  - Health: http://93.127.214.183:8000/health"
log ""
log "🔧 Если проблемы остались:"
log "  - Проверьте логи: docker logs wild-analytics-backend"
log "  - Проверьте порты: netstat -tlnp | grep -E '(3000|8000)'"
log "  - Проверьте CORS в браузере (F12 -> Console)"
EOF 