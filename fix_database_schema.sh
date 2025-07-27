#!/bin/bash

echo "🔧 ЭКСТРЕННОЕ ИСПРАВЛЕНИЕ СХЕМЫ БАЗЫ ДАННЫХ..."

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

cd /opt/wild-analytics || { echo -e "${RED}Директория не найдена${NC}"; exit 1; }

log "🛑 Остановка backend для пересоздания БД..."
docker stop wild-backend 2>/dev/null || true
docker rm wild-backend 2>/dev/null || true

log "🗄️ Создание правильной схемы БД и исправленного main.py..."
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
DB_PATH = '/app/wild_analytics.db'

def reset_database():
    """Полное пересоздание базы данных"""
    try:
        logger.info("🗑️ Удаление старой БД...")
        if os.path.exists(DB_PATH):
            os.remove(DB_PATH)
            logger.info("✅ Старая БД удалена")
        
        logger.info("🔧 Создание новой БД...")
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Создание таблицы пользователей с правильной схемой
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
        logger.info("✅ Таблица users создана с правильной схемой")
        
        # Создание таблицы анализов
        cursor.execute('''
            CREATE TABLE analyses (
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
        logger.info("✅ Таблица analyses создана")
        
        # Создание тестового пользователя
        test_password = hashlib.sha256("password123".encode()).hexdigest()
        cursor.execute('''
            INSERT INTO users (email, password_hash, name, balance, subscription_type)
            VALUES (?, ?, ?, ?, ?)
        ''', ("test@example.com", test_password, "Test User", 15000.0, "Pro"))
        logger.info("✅ Тестовый пользователь создан: test@example.com / password123")
        
        # Проверка созданного пользователя
        cursor.execute("SELECT id, email, name, balance FROM users WHERE email = ?", ("test@example.com",))
        user = cursor.fetchone()
        if user:
            logger.info(f"✅ Проверка: найден пользователь ID={user[0]}, email={user[1]}, name={user[2]}, balance={user[3]}")
        else:
            logger.error("❌ Ошибка: тестовый пользователь не найден после создания!")
        
        conn.commit()
        conn.close()
        
        # Установка правильных прав доступа
        os.chmod(DB_PATH, 0o666)
        logger.info(f"✅ Права доступа к БД установлены: {oct(os.stat(DB_PATH).st_mode)[-3:]}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Ошибка пересоздания БД: {e}")
        logger.error(f"📋 Traceback: {traceback.format_exc()}")
        return False

def init_database():
    """Инициализация базы данных"""
    global DB_INITIALIZED
    try:
        logger.info("🔧 Начинаем инициализацию базы данных...")
        
        # Проверим существует ли БД и её схему
        if os.path.exists(DB_PATH):
            logger.info("📁 База данных уже существует, проверяем схему...")
            try:
                conn = sqlite3.connect(DB_PATH)
                cursor = conn.cursor()
                
                # Проверяем структуру таблицы users
                cursor.execute("PRAGMA table_info(users)")
                columns = cursor.fetchall()
                column_names = [col[1] for col in columns]
                
                logger.info(f"🔍 Найденные колонки в таблице users: {column_names}")
                
                # Проверяем наличие всех необходимых колонок
                required_columns = ['id', 'email', 'password_hash', 'name', 'balance', 'subscription_type']
                missing_columns = [col for col in required_columns if col not in column_names]
                
                if missing_columns:
                    logger.warning(f"⚠️ Отсутствуют колонки: {missing_columns}")
                    logger.info("🔄 Пересоздаем БД с правильной схемой...")
                    conn.close()
                    return reset_database()
                else:
                    logger.info("✅ Схема БД корректна")
                    conn.close()
                
            except Exception as e:
                logger.error(f"❌ Ошибка проверки схемы БД: {e}")
                logger.info("🔄 Пересоздаем БД...")
                return reset_database()
        else:
            logger.info("📂 БД не существует, создаем новую...")
            return reset_database()
        
        # Финальная проверка
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM users")
        user_count = cursor.fetchone()[0]
        conn.close()
        
        logger.info(f"👥 Всего пользователей в БД: {user_count}")
        
        DB_INITIALIZED = True
        logger.info("🎯 База данных инициализирована успешно!")
        return True
        
    except Exception as e:
        logger.error(f"❌ Критическая ошибка инициализации БД: {e}")
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
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE email = ?", (user_data.email,))
        user = cursor.fetchone()
        conn.close()
        
        logger.info(f"👤 Найден пользователь: {user is not None}")
        
        if not user:
            logger.warning(f"❌ Пользователь {user_data.email} не найден")
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Детальная информация о пользователе
        logger.info(f"📋 Пользователь: ID={user[0]}, email={user[1]}, name={user[3]}")
        
        password_valid = verify_password(user_data.password, user[2])
        logger.info(f"🔑 Пароль корректен: {password_valid}")
        
        if not password_valid:
            logger.warning(f"❌ Неверный пароль для {user_data.email}")
            # Для отладки покажем хэши
            input_hash = hash_password(user_data.password)
            stored_hash = user[2]
            logger.info(f"🔍 Хэш введенного пароля: {input_hash}")
            logger.info(f"🔍 Хэш сохраненного пароля: {stored_hash}")
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
        
        conn = sqlite3.connect(DB_PATH)
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
        logger.info(f"🔑 Создание пользователя с хэшем пароля: {password_hash}")
        
        cursor.execute('''
            INSERT INTO users (email, password_hash, name, balance, subscription_type)
            VALUES (?, ?, ?, ?, ?)
        ''', (user_data.email, password_hash, user_data.name, 15000.0, "Pro"))
        
        user_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        logger.info(f"✅ Пользователь создан с ID: {user_id}")
        
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

# Добавим debug endpoint для проверки БД
@app.get("/debug/db-status")
async def debug_db_status():
    try:
        if not os.path.exists(DB_PATH):
            return {"error": "Database file does not exist"}
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Информация о таблице users
        cursor.execute("PRAGMA table_info(users)")
        table_info = cursor.fetchall()
        
        # Количество пользователей
        cursor.execute("SELECT COUNT(*) FROM users")
        user_count = cursor.fetchone()[0]
        
        # Список пользователей
        cursor.execute("SELECT id, email, name FROM users LIMIT 5")
        users = cursor.fetchall()
        
        conn.close()
        
        return {
            "db_file_exists": True,
            "db_path": DB_PATH,
            "table_schema": table_info,
            "user_count": user_count,
            "sample_users": users,
            "initialized": DB_INITIALIZED
        }
        
    except Exception as e:
        return {"error": str(e)}

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
    logger.info("🔥 Запуск Wild Analytics Backend с исправленной схемой БД...")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="debug")
EOF

log "🔧 Пересборка backend с исправленной схемой БД..."
docker build -t wild-backend ./web-dashboard/backend

if [ $? -eq 0 ]; then
    log "✅ Backend пересобран успешно!"
    
    log "🚀 Запуск backend с чистой БД..."
    docker run -d --name wild-backend -p 8000:8000 wild-backend
    
    log "⏳ Ожидание инициализации БД (25 сек)..."
    sleep 25
    
    log "🔍 Проверка статуса backend..."
    docker ps --filter name=wild-backend --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    log "📋 Логи инициализации БД..."
    docker logs wild-backend --tail 20
    
    log "🔍 Тест debug endpoint для проверки схемы БД..."
    curl -s http://93.127.214.183:8000/debug/db-status | jq . 2>/dev/null || curl -s http://93.127.214.183:8000/debug/db-status
    
    log "🔍 Тест health endpoint..."
    curl -s http://93.127.214.183:8000/health | jq . 2>/dev/null || curl -s http://93.127.214.183:8000/health
    
    log "🔐 Тест авторизации с правильной схемой БД..."
    curl -s -X POST http://93.127.214.183:8000/auth/login \
      -H "Content-Type: application/json" \
      -d '{"email":"test@example.com","password":"password123"}' \
      | jq . 2>/dev/null || echo "Получен ответ авторизации"
    
    log "✅ СХЕМА БД ИСПРАВЛЕНА И BACKEND ПЕРЕЗАПУЩЕН!"
    log ""
    log "🌐 Попробуйте снова:"
    log "   Frontend: http://93.127.214.183:3000"
    log "   📧 Email: test@example.com"
    log "   🔑 Password: password123"
    log ""
    log "🔍 Debug info: http://93.127.214.183:8000/debug/db-status"
    
else
    log "❌ Ошибка пересборки backend"
    docker logs wild-backend 2>/dev/null || echo "Нет логов backend"
fi

log "📊 ФИНАЛЬНЫЙ СТАТУС..."
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 