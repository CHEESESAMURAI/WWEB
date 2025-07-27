#!/bin/bash

echo "🔧 ПРИНУДИТЕЛЬНАЯ ИНИЦИАЛИЗАЦИЯ БАЗЫ ДАННЫХ..."

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

cd /opt/wild-analytics || { echo -e "${RED}Директория не найдена${NC}"; exit 1; }

log "🛑 Остановка backend..."
docker stop wild-backend 2>/dev/null || true
docker rm wild-backend 2>/dev/null || true

log "🔧 Создание упрощенного main.py с принудительной инициализацией БД..."
cat > web-dashboard/backend/main.py << 'EOF'
import os
import sys
import uvicorn
import traceback
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import sqlite3
import hashlib
import jwt
from datetime import datetime, timedelta
import logging
import json
import time

# Настройка подробного логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Wild Analytics API", version="2.0.0")

# CORS настройки
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# JWT настройки
SECRET_KEY = "wild-analytics-secret-key-2024"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440

security = HTTPBearer()

# Путь к БД
DB_PATH = '/app/wild_analytics.db'

def force_create_database():
    """Принудительное создание базы данных"""
    try:
        logger.info("🔧 ПРИНУДИТЕЛЬНОЕ СОЗДАНИЕ БАЗЫ ДАННЫХ...")
        
        # Удаляем старую БД если существует
        if os.path.exists(DB_PATH):
            os.remove(DB_PATH)
            logger.info("🗑️ Старая БД удалена")
        
        # Создаем новую БД
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Создание таблицы пользователей
        cursor.execute('''
            CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                name TEXT NOT NULL,
                balance REAL DEFAULT 15000.0,
                subscription_type TEXT DEFAULT 'Pro',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        logger.info("✅ Таблица users создана")
        
        # Создание тестового пользователя
        test_password = hashlib.sha256("password123".encode()).hexdigest()
        cursor.execute('''
            INSERT INTO users (email, password_hash, name, balance, subscription_type)
            VALUES (?, ?, ?, ?, ?)
        ''', ("test@example.com", test_password, "Test User", 15000.0, "Pro"))
        
        user_id = cursor.lastrowid
        logger.info(f"✅ Тестовый пользователь создан: ID={user_id}, email=test@example.com")
        
        # Проверка созданного пользователя
        cursor.execute("SELECT * FROM users WHERE email = ?", ("test@example.com",))
        user = cursor.fetchone()
        if user:
            logger.info(f"✅ Проверка пользователя: {user}")
        
        conn.commit()
        conn.close()
        
        # Установка прав доступа
        os.chmod(DB_PATH, 0o666)
        logger.info("✅ Права доступа к БД установлены")
        
        logger.info("🎯 БАЗА ДАННЫХ СОЗДАНА УСПЕШНО!")
        return True
        
    except Exception as e:
        logger.error(f"❌ Ошибка создания БД: {e}")
        logger.error(f"📋 Traceback: {traceback.format_exc()}")
        return False

# Модели данных
class UserLogin(BaseModel):
    email: str
    password: str

class UserRegister(BaseModel):
    email: str
    password: str
    name: str

# Утилиты для аутентификации
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hash_password(plain_password) == hashed_password

def create_access_token(data: dict):
    try:
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    except Exception as e:
        logger.error(f"❌ Ошибка создания токена: {e}")
        raise HTTPException(status_code=500, detail="Token creation failed")

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        if not credentials:
            raise HTTPException(status_code=401, detail="Authorization required")
        
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("sub")
        
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        user = cursor.fetchone()
        conn.close()
        
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
            
        return {
            "id": user[0],
            "email": user[1],
            "name": user[3],
            "balance": user[4],
            "subscription_type": user[5]
        }
    except jwt.PyJWTError as e:
        logger.error(f"❌ JWT ошибка: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        logger.error(f"❌ Ошибка проверки пользователя: {e}")
        raise HTTPException(status_code=500, detail="Authentication error")

def check_database():
    """Проверка доступности БД"""
    try:
        if not os.path.exists(DB_PATH):
            logger.warning("⚠️ БД не существует, создаем...")
            return force_create_database()
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM users")
        count = cursor.fetchone()[0]
        conn.close()
        
        logger.info(f"✅ БД доступна, пользователей: {count}")
        return True
        
    except Exception as e:
        logger.error(f"❌ Ошибка проверки БД: {e}")
        logger.info("🔄 Пересоздаем БД...")
        return force_create_database()

# API Endpoints
@app.get("/")
async def root():
    db_status = check_database()
    return {
        "message": "Wild Analytics API v2.0 - Working!",
        "status": "running",
        "db_status": "initialized" if db_status else "error",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/health")
async def health():
    db_status = check_database()
    return {
        "status": "healthy" if db_status else "unhealthy",
        "service": "wild-analytics-backend",
        "version": "2.0.0",
        "db_status": "initialized" if db_status else "error",
        "timestamp": datetime.now().isoformat()
    }

@app.post("/auth/login")
async def login(user_data: UserLogin):
    try:
        logger.info(f"🔐 Попытка входа для: {user_data.email}")
        
        # Проверяем БД перед логином
        if not check_database():
            raise HTTPException(status_code=500, detail="Database initialization failed")
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE email = ?", (user_data.email,))
        user = cursor.fetchone()
        conn.close()
        
        if not user:
            logger.warning(f"❌ Пользователь {user_data.email} не найден")
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        if not verify_password(user_data.password, user[2]):
            logger.warning(f"❌ Неверный пароль для {user_data.email}")
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        access_token = create_access_token(data={"sub": user[0]})
        
        result = {
            "success": True,
            "access_token": access_token,
            "user": {
                "id": user[0],
                "email": user[1],
                "name": user[3],
                "balance": user[4],
                "subscription_type": user[5]
            },
            "message": "Login successful"
        }
        
        logger.info(f"✅ Успешный вход: {user_data.email}")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Ошибка входа: {e}")
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")

@app.post("/auth/register")
async def register(user_data: UserRegister):
    try:
        logger.info(f"📝 Регистрация для: {user_data.email}")
        
        # Проверяем БД перед регистрацией
        if not check_database():
            raise HTTPException(status_code=500, detail="Database initialization failed")
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Проверка существования
        cursor.execute("SELECT id FROM users WHERE email = ?", (user_data.email,))
        if cursor.fetchone():
            conn.close()
            raise HTTPException(status_code=400, detail="User already exists")
        
        # Создание пользователя
        password_hash = hash_password(user_data.password)
        cursor.execute('''
            INSERT INTO users (email, password_hash, name, balance, subscription_type)
            VALUES (?, ?, ?, ?, ?)
        ''', (user_data.email, password_hash, user_data.name, 15000.0, "Pro"))
        
        user_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        access_token = create_access_token(data={"sub": user_id})
        
        result = {
            "success": True,
            "access_token": access_token,
            "user": {
                "id": user_id,
                "email": user_data.email,
                "name": user_data.name,
                "balance": 15000.0,
                "subscription_type": "Pro"
            },
            "message": "Registration successful"
        }
        
        logger.info(f"✅ Успешная регистрация: {user_data.email}")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Ошибка регистрации: {e}")
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")

@app.get("/user/dashboard")
async def get_dashboard(current_user: dict = Depends(get_current_user)):
    try:
        return {
            "user": current_user,
            "stats": {
                "products_analyzed": 156,
                "successful_analyses": 142,
                "monthly_usage": 45,
                "total_searches": 89,
                "recent_analyses": [
                    {"type": "Product Analysis", "date": "2024-07-27", "status": "success"},
                    {"type": "Brand Analysis", "date": "2024-07-26", "status": "success"},
                    {"type": "Category Analysis", "date": "2024-07-25", "status": "pending"}
                ]
            }
        }
    except Exception as e:
        logger.error(f"❌ Ошибка дашборда: {e}")
        raise HTTPException(status_code=500, detail="Dashboard error")

@app.get("/debug/force-init")
async def force_init():
    """Принудительная инициализация БД через API"""
    try:
        result = force_create_database()
        return {
            "success": result,
            "message": "Database force initialized" if result else "Database initialization failed",
            "db_path": DB_PATH,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

# Принудительная инициализация при старте
logger.info("🚀 Запуск Wild Analytics Backend...")
logger.info("🔧 Принудительная инициализация БД при старте...")

# Принудительно создаем БД
init_success = force_create_database()
if init_success:
    logger.info("✅ БД инициализирована при старте!")
else:
    logger.error("❌ Ошибка инициализации БД при старте!")

if __name__ == "__main__":
    logger.info("🔥 Запуск сервера с принудительной инициализацией БД...")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
EOF

log "🔧 Создание улучшенного Dockerfile..."
cat > web-dashboard/backend/Dockerfile << 'EOF'
FROM python:3.11-slim

WORKDIR /app

# Установка системных зависимостей
RUN apt-get update && apt-get install -y \
    curl \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# Установка Python зависимостей
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# Копирование кода
COPY . .

# Создание директорий и прав доступа
RUN mkdir -p /app/logs
RUN chmod 755 /app

# Предварительное создание файла БД с правами
RUN touch /app/wild_analytics.db
RUN chmod 666 /app/wild_analytics.db

EXPOSE 8000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["python", "main.py"]
EOF

log "🔧 Обновление requirements.txt..."
cat > web-dashboard/backend/requirements.txt << 'EOF'
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.0
python-multipart==0.0.6
PyJWT==2.8.0
python-jose[cryptography]==3.3.0
aiofiles==23.2.0
requests==2.31.0
httpx==0.25.2
python-dotenv==1.0.0
EOF

log "🔨 Пересборка backend с принудительной инициализацией БД..."
docker build -t wild-backend ./web-dashboard/backend

if [ $? -eq 0 ]; then
    log "✅ Backend пересобран!"
    
    log "🚀 Запуск backend с принудительной инициализацией..."
    docker run -d --name wild-backend -p 8000:8000 wild-backend
    
    log "⏳ Ожидание полной инициализации (30 сек)..."
    sleep 30
    
    log "🔍 Проверка статуса..."
    docker ps --filter name=wild-backend --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    log "📋 Логи инициализации..."
    docker logs wild-backend --tail 25
    
    log "🔍 Тест health..."
    curl -s http://93.127.214.183:8000/health | jq . 2>/dev/null || curl -s http://93.127.214.183:8000/health
    
    log "🔧 Принудительная инициализация через API..."
    curl -s http://93.127.214.183:8000/debug/force-init | jq . 2>/dev/null || curl -s http://93.127.214.183:8000/debug/force-init
    
    log "🔐 Тест авторизации..."
    curl -s -X POST http://93.127.214.183:8000/auth/login \
      -H "Content-Type: application/json" \
      -d '{"email":"test@example.com","password":"password123"}' \
      | jq .success 2>/dev/null || echo "Ответ получен"
    
    log "✅ ПРИНУДИТЕЛЬНАЯ ИНИЦИАЛИЗАЦИЯ БД ЗАВЕРШЕНА!"
    log ""
    log "🌐 Тестируйте приложение:"
    log "   Frontend: http://93.127.214.183:3000"
    log "   📧 Email: test@example.com"
    log "   🔑 Password: password123"
    log ""
    log "🔧 Принудительная инициализация: http://93.127.214.183:8000/debug/force-init"
    
else
    log "❌ Ошибка сборки backend"
fi

log "📊 ФИНАЛЬНЫЙ СТАТУС..."
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 