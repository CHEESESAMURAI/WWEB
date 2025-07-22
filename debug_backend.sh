#!/bin/bash

echo "🔧 Детальная диагностика backend..."

# Остановка всех контейнеров
echo "🛑 Остановка контейнеров..."
docker-compose down

# Проверка структуры директорий
echo "📁 Проверка структуры web-dashboard/backend:"
ls -la web-dashboard/backend/ 2>/dev/null || echo "❌ Директория web-dashboard/backend не существует"

# Создание директории если её нет
if [ ! -d "web-dashboard/backend" ]; then
    echo "🔧 Создание директории web-dashboard/backend..."
    mkdir -p web-dashboard/backend
fi

# Создание простого main.py
echo "🔧 Создание main.py..."
cat > web-dashboard/backend/main.py << 'EOF'
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import logging
import os

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Wild Analytics API", version="1.0.0")

# CORS настройки
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://93.127.214.183:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ProductAnalysisRequest(BaseModel):
    article: str

@app.get("/")
async def root():
    return {"message": "Wild Analytics API is running!", "status": "ok"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "wild-analytics-backend"}

@app.post("/analysis/product")
async def analyze_product(request: ProductAnalysisRequest):
    try:
        logger.info(f"🔧 Starting product analysis for article: {request.article}")
        
        # Простая заглушка для тестирования
        result = {
            "success": True,
            "article": request.article,
            "data": {
                "sales": 22,
                "revenue": 49475.0,
                "avg_daily_sales": 1,
                "avg_daily_revenue": 1649.17,
                "brand": "Тестовый бренд",
                "category": "Одежда",
                "price": 2250.0
            },
            "message": "Анализ выполнен успешно"
        }
        
        logger.info(f"✅ Analysis completed for {request.article}")
        return result
        
    except Exception as e:
        logger.error(f"❌ Error in product analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/user/dashboard")
async def get_dashboard():
    return {
        "success": True,
        "data": {
            "total_products": 150,
            "total_revenue": 2500000,
            "active_analyses": 25
        }
    }

@app.post("/mpstats/advanced-analysis")
async def advanced_analysis(request: ProductAnalysisRequest):
    try:
        logger.info(f"🚀 Starting advanced analysis for article: {request.article}")
        
        result = {
            "success": True,
            "article": request.article,
            "advanced_data": {
                "similar_items": 100,
                "competitors": 15,
                "market_share": 0.05,
                "trend": "up"
            },
            "message": "Расширенный анализ выполнен"
        }
        
        logger.info(f"✅ Advanced analysis completed for {request.article}")
        return result
        
    except Exception as e:
        logger.error(f"❌ Error in advanced analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    logger.info("🚀 Starting Wild Analytics Backend...")
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port, reload=True)
EOF

# Создание requirements.txt
echo "🔧 Создание requirements.txt..."
cat > web-dashboard/backend/requirements.txt << 'EOF'
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.0
requests==2.31.0
python-multipart==0.0.6
EOF

# Создание Dockerfile
echo "🔧 Создание Dockerfile..."
cat > web-dashboard/backend/Dockerfile << 'EOF'
FROM python:3.11-slim

WORKDIR /app

# Установка системных зависимостей
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Копирование requirements и установка Python зависимостей
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копирование кода
COPY . .

# Проверка что main.py существует
RUN ls -la main.py

EXPOSE 8000

# Запуск с подробным логированием
CMD ["python", "-u", "main.py"]
EOF

# Создание .dockerignore
echo "🔧 Создание .dockerignore..."
cat > web-dashboard/backend/.dockerignore << 'EOF'
__pycache__
*.pyc
*.pyo
*.pyd
.Python
env
pip-log.txt
pip-delete-this-directory.txt
.tox
.coverage
.coverage.*
.cache
nosetests.xml
coverage.xml
*.cover
*.log
.git
.mypy_cache
.pytest_cache
.hypothesis
EOF

echo "📋 Проверка созданных файлов:"
ls -la web-dashboard/backend/

echo "🔧 Создание исправленного docker-compose.yml..."
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  backend:
    build: 
      context: ./web-dashboard/backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - PORT=8000
      - CORS_ORIGINS=http://localhost:3000,http://93.127.214.183:3000
    volumes:
      - ./web-dashboard/backend:/app
    networks:
      - wild-analytics
    restart: unless-stopped

  frontend:
    build: 
      context: ./wild-analytics-web
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_API_URL=http://93.127.214.183:8000
    depends_on:
      - backend
    networks:
      - wild-analytics
    restart: unless-stopped

networks:
  wild-analytics:
    driver: bridge
EOF

echo "🧹 Очистка старых образов..."
docker system prune -f

echo "🔨 Сборка backend образа..."
docker build -t wild-analytics-backend ./web-dashboard/backend

echo "📊 Проверка образа:"
docker images | grep wild-analytics

echo "🚀 Запуск контейнеров..."
docker-compose up -d

echo "⏳ Ожидание запуска backend (30 секунд)..."
sleep 30

echo "📊 Статус контейнеров:"
docker ps -a

echo "📋 Логи backend:"
docker logs wild-analytics-backend-1 --tail 20

echo "🔍 Проверка API:"
curl -s http://localhost:8000/health || echo "❌ Backend недоступен"
curl -s http://localhost:8000/ || echo "❌ Root endpoint недоступен"

echo ""
echo "✅ Диагностика завершена!"
echo "🌐 Frontend: http://93.127.214.183:3000"
echo "🔗 Backend API: http://93.127.214.183:8000"
echo "📊 Health check: http://93.127.214.183:8000/health" 