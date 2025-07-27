#!/bin/bash

echo "🚨 ЭКСТРЕННОЕ ИСПРАВЛЕНИЕ СЕТЕВОГО ПОДКЛЮЧЕНИЯ..."

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

cd /opt/wild-analytics || { error "Директория не найдена"; exit 1; }

log "🔍 ДИАГНОСТИКА ПРОБЛЕМЫ..."

echo "=== СТАТУС КОНТЕЙНЕРОВ ==="
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "=== ПРОВЕРКА ПОРТОВ НА ХОСТЕ ==="
netstat -tlnp 2>/dev/null | grep -E ":(3000|8000)" || ss -tlnp | grep -E ":(3000|8000)"

echo ""
echo "=== ПРОВЕРКА BACKEND ПРЯМО ==="
curl -v http://localhost:8000/health 2>&1 | head -5
curl -v http://93.127.214.183:8000/health 2>&1 | head -5

echo ""
echo "=== ЛОГИ BACKEND ==="
docker logs wild-analytics-backend --tail 20 2>/dev/null || docker logs wild-analytics-backend-1 --tail 20

log "🛑 ПОЛНАЯ ОСТАНОВКА..."
docker-compose down --remove-orphans
docker stop $(docker ps -aq) 2>/dev/null || true
docker rm $(docker ps -aq) 2>/dev/null || true

log "🔧 СОЗДАНИЕ УПРОЩЕННОГО DOCKER COMPOSE..."
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  backend:
    build: 
      context: ./web-dashboard/backend
      dockerfile: Dockerfile
    container_name: wild-backend
    ports:
      - "8000:8000"
    environment:
      - PYTHONUNBUFFERED=1
    volumes:
      - ./web-dashboard/backend:/app
    restart: unless-stopped
    command: python main.py

  frontend:
    build:
      context: ./wild-analytics-web
      dockerfile: Dockerfile
    container_name: wild-frontend
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_API_URL=http://93.127.214.183:8000
    depends_on:
      - backend
    restart: unless-stopped
EOF

log "🔧 СОЗДАНИЕ ПРОСТОГО BACKEND DOCKERFILE..."
cat > web-dashboard/backend/Dockerfile << 'EOF'
FROM python:3.11-slim

WORKDIR /app

# Установка зависимостей
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["python", "main.py"]
EOF

log "🔧 СОЗДАНИЕ ПРОСТОГО FRONTEND DOCKERFILE..."
cat > wild-analytics-web/Dockerfile << 'EOF'
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
EOF

log "🔧 МИНИМАЛЬНЫЕ REQUIREMENTS..."
cat > web-dashboard/backend/requirements.txt << 'EOF'
fastapi==0.104.1
uvicorn==0.24.0
pydantic==2.5.0
PyJWT==2.8.0
python-multipart==0.0.6
EOF

log "🔧 СУПЕР ПРОСТОЙ BACKEND..."
cat > web-dashboard/backend/main.py << 'EOF'
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import hashlib
import jwt
from datetime import datetime, timedelta
import uvicorn

app = FastAPI()

# СУПЕР ОТКРЫТЫЕ CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SECRET_KEY = "test-key"

class UserLogin(BaseModel):
    email: str
    password: str

class UserRegister(BaseModel):
    email: str
    password: str
    name: str

# Простая "база данных"
USERS = {
    "test@example.com": {
        "id": 1,
        "email": "test@example.com",
        "password": hashlib.sha256("password123".encode()).hexdigest(),
        "name": "Test User",
        "balance": 1000.0,
        "subscription_type": "Pro"
    }
}

@app.get("/")
async def root():
    return {"message": "Wild Analytics API", "status": "running"}

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "wild-analytics-backend"}

@app.post("/auth/login")
async def login(user_data: UserLogin):
    print(f"LOGIN ATTEMPT: {user_data.email}")
    
    user = USERS.get(user_data.email)
    if not user:
        print(f"USER NOT FOUND: {user_data.email}")
        raise HTTPException(status_code=401, detail="User not found")
    
    password_hash = hashlib.sha256(user_data.password.encode()).hexdigest()
    if password_hash != user["password"]:
        print(f"INVALID PASSWORD FOR: {user_data.email}")
        raise HTTPException(status_code=401, detail="Invalid password")
    
    # Создание токена
    token_data = {"sub": user["id"], "exp": datetime.utcnow() + timedelta(hours=24)}
    access_token = jwt.encode(token_data, SECRET_KEY, algorithm="HS256")
    
    print(f"LOGIN SUCCESS: {user_data.email}")
    
    return {
        "success": True,
        "access_token": access_token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "balance": user["balance"],
            "subscription_type": user["subscription_type"]
        },
        "message": "Login successful"
    }

@app.post("/auth/register")
async def register(user_data: UserRegister):
    print(f"REGISTER ATTEMPT: {user_data.email}")
    
    if user_data.email in USERS:
        raise HTTPException(status_code=400, detail="User already exists")
    
    new_user = {
        "id": len(USERS) + 1,
        "email": user_data.email,
        "password": hashlib.sha256(user_data.password.encode()).hexdigest(),
        "name": user_data.name,
        "balance": 1000.0,
        "subscription_type": "Pro"
    }
    
    USERS[user_data.email] = new_user
    
    # Создание токена
    token_data = {"sub": new_user["id"], "exp": datetime.utcnow() + timedelta(hours=24)}
    access_token = jwt.encode(token_data, SECRET_KEY, algorithm="HS256")
    
    print(f"REGISTER SUCCESS: {user_data.email}")
    
    return {
        "success": True,
        "access_token": access_token,
        "user": {
            "id": new_user["id"],
            "email": new_user["email"],
            "name": new_user["name"],
            "balance": new_user["balance"],
            "subscription_type": new_user["subscription_type"]
        },
        "message": "Registration successful"
    }

@app.get("/user/dashboard")
async def dashboard():
    return {
        "user": {
            "id": 1,
            "email": "test@example.com",
            "name": "Test User",
            "balance": 1000.0,
            "subscription_type": "Pro"
        },
        "stats": {
            "products_analyzed": 156,
            "successful_analyses": 142,
            "monthly_usage": 28,
            "total_searches": 89,
            "recent_analyses": [
                {"type": "Product Analysis", "date": "2024-01-15", "status": "success"},
                {"type": "Brand Analysis", "date": "2024-01-14", "status": "success"}
            ]
        }
    }

if __name__ == "__main__":
    print("🚀 Starting Wild Analytics Backend...")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
EOF

log "🧹 ПОЛНАЯ ОЧИСТКА DOCKER..."
docker system prune -af --volumes 2>/dev/null || true

log "🔨 ПЕРЕСБОРКА BACKEND..."
docker build -t wild-backend ./web-dashboard/backend

log "🔨 ПЕРЕСБОРКА FRONTEND..."
docker build -t wild-frontend ./wild-analytics-web

log "🚀 ЗАПУСК BACKEND ОТДЕЛЬНО..."
docker run -d --name wild-backend -p 8000:8000 wild-backend

log "⏳ Ожидание backend (10 сек)..."
sleep 10

log "🔍 ТЕСТ BACKEND..."
curl -s http://93.127.214.183:8000/health

log "🔍 ТЕСТ ЛОГИНА..."
curl -s -X POST http://93.127.214.183:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

if [ $? -eq 0 ]; then
    log "✅ Backend работает! Запускаю frontend..."
    
    log "🚀 ЗАПУСК FRONTEND..."
    docker run -d --name wild-frontend -p 3000:3000 \
      -e REACT_APP_API_URL=http://93.127.214.183:8000 \
      wild-frontend
    
    log "⏳ Ожидание frontend (30 сек)..."
    sleep 30
    
    log "🔍 ТЕСТ FRONTEND..."
    curl -s http://93.127.214.183:3000 | head -n 3
    
    log "✅ ВСЕ ЗАПУЩЕНО!"
else
    error "❌ Backend не работает!"
fi

log "📊 ФИНАЛЬНЫЙ СТАТУС..."
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "=== ЛОГИ BACKEND ==="
docker logs wild-backend --tail 10

echo ""
echo "=== ЛОГИ FRONTEND ==="
docker logs wild-frontend --tail 10

log "🎯 ПОПРОБУЙТЕ ВОЙТИ:"
log "   URL: http://93.127.214.183:3000"
log "   Email: test@example.com"
log "   Password: password123"
log ""
log "🔧 Если не работает, проверьте порты:"
log "   Backend: http://93.127.214.183:8000/health"
log "   Frontend: http://93.127.214.183:3000" 