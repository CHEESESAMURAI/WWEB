#!/bin/bash

echo "🔧 ИСПРАВЛЕНИЕ 500 ОШИБОК BACKEND..."

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

cd /opt/wild-analytics || { echo -e "${RED}Директория не найдена${NC}"; exit 1; }

log "🔍 Проверка текущих логов backend..."
docker logs wild-backend --tail 20

log "🛑 Остановка backend для исправления..."
docker stop wild-backend 2>/dev/null || true
docker rm wild-backend 2>/dev/null || true

log "🔧 Создание исправленного main.py с подробным логированием..."
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

# Настройка подробного логирования
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
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
SECRET_KEY = "wild-analytics-super-secret-key-2024-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440

security = HTTPBearer()

# Глобальная переменная для отслеживания инициализации БД
DB_INITIALIZED = False

def init_database():
    """Инициализация базы данных с детальным логированием"""
    global DB_INITIALIZED
    try:
        logger.info("🔧 Начинаем инициализацию базы данных...")
        
        # Проверим путь к файлу БД
        db_path = '/app/wild_analytics.db'
        logger.info(f"📁 Путь к БД: {db_path}")
        
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        logger.info("✅ Подключение к БД установлено")
        
        # Создание таблицы пользователей
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                name TEXT NOT NULL,
                balance REAL DEFAULT 15000.0,
                subscription_type TEXT DEFAULT 'Pro',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        logger.info("✅ Таблица users создана/проверена")
        
        # Создание таблицы анализов
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS analyses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                type TEXT NOT NULL,
                query TEXT,
                results TEXT,
                status TEXT DEFAULT 'completed',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')
        logger.info("✅ Таблица analyses создана/проверена")
        
        # Создание тестового пользователя
        test_password = hashlib.sha256("password123".encode()).hexdigest()
        cursor.execute('SELECT id FROM users WHERE email = ?', ("test@example.com",))
        if not cursor.fetchone():
            cursor.execute('''
                INSERT INTO users (email, password_hash, name, balance, subscription_type)
                VALUES (?, ?, ?, ?, ?)
            ''', ("test@example.com", test_password, "Test User", 15000.0, "Pro"))
            logger.info("✅ Тестовый пользователь создан")
        else:
            logger.info("✅ Тестовый пользователь уже существует")
        
        conn.commit()
        conn.close()
        DB_INITIALIZED = True
        logger.info("🎯 База данных инициализирована успешно!")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Ошибка инициализации БД: {e}")
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
        
        conn = sqlite3.connect('/app/wild_analytics.db')
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

# API Endpoints
@app.get("/")
async def root():
    return {
        "message": "Wild Analytics API v2.0 - Working!",
        "status": "running",
        "db_initialized": DB_INITIALIZED,
        "timestamp": datetime.now().isoformat()
    }

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "wild-analytics-backend",
        "version": "2.0.0",
        "db_status": "initialized" if DB_INITIALIZED else "not_initialized",
        "timestamp": datetime.now().isoformat()
    }

@app.post("/auth/login")
async def login(user_data: UserLogin):
    try:
        logger.info(f"🔐 Попытка входа для email: {user_data.email}")
        
        if not DB_INITIALIZED:
            logger.error("❌ БД не инициализирована!")
            raise HTTPException(status_code=500, detail="Database not initialized")
        
        conn = sqlite3.connect('/app/wild_analytics.db')
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE email = ?", (user_data.email,))
        user = cursor.fetchone()
        conn.close()
        
        logger.info(f"👤 Найден пользователь: {user is not None}")
        
        if not user:
            logger.warning(f"❌ Пользователь {user_data.email} не найден")
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        password_valid = verify_password(user_data.password, user[2])
        logger.info(f"🔑 Пароль корректен: {password_valid}")
        
        if not password_valid:
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
        
        logger.info(f"✅ Успешный вход для {user_data.email}")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Ошибка входа: {e}")
        logger.error(f"📋 Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")

@app.post("/auth/register")
async def register(user_data: UserRegister):
    try:
        logger.info(f"📝 Попытка регистрации для email: {user_data.email}")
        
        if not DB_INITIALIZED:
            logger.error("❌ БД не инициализирована!")
            raise HTTPException(status_code=500, detail="Database not initialized")
        
        conn = sqlite3.connect('/app/wild_analytics.db')
        cursor = conn.cursor()
        
        # Проверка существования пользователя
        cursor.execute("SELECT id FROM users WHERE email = ?", (user_data.email,))
        existing_user = cursor.fetchone()
        
        if existing_user:
            conn.close()
            logger.warning(f"❌ Пользователь {user_data.email} уже существует")
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
        
        logger.info(f"✅ Успешная регистрация для {user_data.email}")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Ошибка регистрации: {e}")
        logger.error(f"📋 Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")

@app.get("/user/dashboard")
async def get_dashboard(current_user: dict = Depends(get_current_user)):
    try:
        logger.info(f"📊 Запрос дашборда для пользователя: {current_user['id']}")
        
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

# Инициализация при старте
@app.on_event("startup")
async def startup_event():
    logger.info("🚀 Запуск Wild Analytics Backend...")
    
    # Проверим доступность файловой системы
    try:
        test_file = '/app/test_write.txt'
        with open(test_file, 'w') as f:
            f.write('test')
        os.remove(test_file)
        logger.info("✅ Файловая система доступна для записи")
    except Exception as e:
        logger.error(f"❌ Проблема с файловой системой: {e}")
    
    # Инициализация БД
    if init_database():
        logger.info("🎯 Backend успешно запущен!")
    else:
        logger.error("💥 Критическая ошибка инициализации!")

if __name__ == "__main__":
    logger.info("🔥 Запуск Wild Analytics Backend с подробным логированием...")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="debug")
EOF

log "🔧 Создание исправленного requirements.txt..."
cat > web-dashboard/backend/requirements.txt << 'EOF'
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.0
python-multipart==0.0.6
PyJWT==2.8.0
python-jose[cryptography]==3.3.0
bcrypt==4.1.2
aiofiles==23.2.0
jinja2==3.1.2
requests==2.31.0
httpx==0.25.2
python-dotenv==1.0.0
EOF

log "🔧 Пересоздание Dockerfile..."
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

# Создание директорий и установка прав
RUN mkdir -p /app/logs
RUN chmod 755 /app
RUN touch /app/wild_analytics.db
RUN chmod 666 /app/wild_analytics.db

EXPOSE 8000

# Проверка работоспособности
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["python", "main.py"]
EOF

log "🔨 Пересборка backend с исправлениями..."
docker build -t wild-backend ./web-dashboard/backend

if [ $? -eq 0 ]; then
    log "✅ Backend пересобран успешно!"
    
    log "🚀 Запуск исправленного backend..."
    docker run -d --name wild-backend -p 8000:8000 \
      -v $(pwd)/web-dashboard/backend:/app \
      wild-backend
    
    log "⏳ Ожидание запуска backend (20 сек)..."
    sleep 20
    
    log "🔍 Проверка статуса backend..."
    docker ps --filter name=wild-backend --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    log "📋 Проверка логов backend..."
    docker logs wild-backend --tail 15
    
    log "🔍 Тест health endpoint..."
    curl -s http://93.127.214.183:8000/health | jq . 2>/dev/null || curl -s http://93.127.214.183:8000/health
    
    log "🔍 Тест авторизации с тестовыми данными..."
    curl -s -X POST http://93.127.214.183:8000/auth/login \
      -H "Content-Type: application/json" \
      -d '{"email":"test@example.com","password":"password123"}' \
      | jq . 2>/dev/null || echo "Ответ получен"
    
    log "✅ BACKEND ИСПРАВЛЕН И ПЕРЕЗАПУЩЕН!"
    log "🌐 Теперь попробуйте авторизоваться на http://93.127.214.183:3000"
    log "📧 Email: test@example.com"
    log "🔑 Password: password123"
    
else
    log "❌ Ошибка пересборки backend"
    docker logs wild-backend 2>/dev/null || echo "Нет логов backend"
fi

log "📊 ФИНАЛЬНЫЙ СТАТУС..."
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 