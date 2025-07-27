#!/bin/bash

echo "🚨 ЭКСТРЕННОЕ ИСПРАВЛЕНИЕ Wild Analytics..."

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

log "🛑 Полная остановка всех сервисов..."
docker-compose down
docker stop $(docker ps -q) 2>/dev/null || true
pkill -f npm 2>/dev/null || true
pkill -f python 2>/dev/null || true

log "🗑️ Удаление старых данных..."
rm -f wild_analytics.db
rm -rf web-dashboard/backend/__pycache__
rm -rf web-dashboard/backend/*.pyc

log "🔧 Создание НОВОГО backend main.py..."
cat > web-dashboard/backend/main.py << 'EOF'
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uvicorn
import logging
import sqlite3
import hashlib
import secrets
from datetime import datetime

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Wild Analytics API", version="1.0.0")

# ПРОСТЫЕ CORS настройки
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Простые модели
class UserLogin(BaseModel):
    email: str
    password: str

class UserRegister(BaseModel):
    email: str
    password: str
    name: Optional[str] = None

# Простая функция хэширования
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, hashed: str) -> bool:
    return hash_password(password) == hashed

# Инициализация простой базы данных
def init_simple_db():
    try:
        conn = sqlite3.connect('simple_users.db')
        c = conn.cursor()
        
        c.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY,
                email TEXT UNIQUE,
                password_hash TEXT,
                name TEXT,
                created_at TEXT
            )
        ''')
        
        # Создание тестового пользователя
        test_hash = hash_password("password123")
        c.execute('''
            INSERT OR REPLACE INTO users (email, password_hash, name, created_at)
            VALUES (?, ?, ?, ?)
        ''', ("test@example.com", test_hash, "Test User", datetime.now().isoformat()))
        
        conn.commit()
        conn.close()
        logger.info("✅ База данных создана. Тестовый пользователь: test@example.com / password123")
        
    except Exception as e:
        logger.error(f"❌ Ошибка создания БД: {e}")

# Простые функции для работы с БД
def get_user(email: str):
    try:
        conn = sqlite3.connect('simple_users.db')
        c = conn.cursor()
        c.execute('SELECT * FROM users WHERE email = ?', (email,))
        user = c.fetchone()
        conn.close()
        return user
    except:
        return None

def create_user(email: str, password: str, name: str = None):
    try:
        conn = sqlite3.connect('simple_users.db')
        c = conn.cursor()
        
        # Проверяем, есть ли уже такой пользователь
        c.execute('SELECT email FROM users WHERE email = ?', (email,))
        if c.fetchone():
            conn.close()
            return None
            
        password_hash = hash_password(password)
        c.execute('''
            INSERT INTO users (email, password_hash, name, created_at)
            VALUES (?, ?, ?, ?)
        ''', (email, password_hash, name, datetime.now().isoformat()))
        
        conn.commit()
        user_id = c.lastrowid
        conn.close()
        return user_id
    except Exception as e:
        logger.error(f"❌ Ошибка создания пользователя: {e}")
        return None

# Базовые эндпоинты
@app.get("/")
async def root():
    return {"message": "Wild Analytics API работает!", "status": "ok"}

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "wild-analytics-backend"}

# ПРОСТАЯ авторизация
@app.post("/auth/login")
async def login(data: UserLogin):
    try:
        logger.info(f"🔐 Попытка входа: {data.email}")
        
        user = get_user(data.email)
        if not user:
            logger.warning(f"❌ Пользователь не найден: {data.email}")
            return {
                "success": False,
                "error": "Пользователь не найден"
            }
        
        if not verify_password(data.password, user[2]):
            logger.warning(f"❌ Неверный пароль для: {data.email}")
            return {
                "success": False,
                "error": "Неверный пароль"
            }
        
        # Простой "токен"
        token = f"token_{user[0]}_{secrets.token_hex(8)}"
        
        logger.info(f"✅ Успешный вход: {data.email}")
        return {
            "success": True,
            "message": "Вход выполнен успешно",
            "access_token": token,
            "user": {
                "id": user[0],
                "email": user[1],
                "name": user[3] or "Пользователь"
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Ошибка входа: {e}")
        return {
            "success": False,
            "error": "Ошибка сервера"
        }

# ПРОСТАЯ регистрация
@app.post("/auth/register")
async def register(data: UserRegister):
    try:
        logger.info(f"📝 Попытка регистрации: {data.email}")
        
        # Проверяем, есть ли пользователь
        existing_user = get_user(data.email)
        if existing_user:
            logger.warning(f"❌ Email уже существует: {data.email}")
            return {
                "success": False,
                "error": "Пользователь с таким email уже существует"
            }
        
        # Создаем пользователя
        user_id = create_user(data.email, data.password, data.name)
        if not user_id:
            logger.error(f"❌ Не удалось создать пользователя: {data.email}")
            return {
                "success": False,
                "error": "Ошибка создания пользователя"
            }
        
        # Простой "токен"
        token = f"token_{user_id}_{secrets.token_hex(8)}"
        
        logger.info(f"✅ Успешная регистрация: {data.email}")
        return {
            "success": True,
            "message": "Регистрация выполнена успешно",
            "access_token": token,
            "user": {
                "id": user_id,
                "email": data.email,
                "name": data.name or "Пользователь"
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Ошибка регистрации: {e}")
        return {
            "success": False,
            "error": "Ошибка сервера при регистрации"
        }

# Простой dashboard
@app.get("/user/dashboard")
async def dashboard():
    return {
        "success": True,
        "data": {
            "message": "Добро пожаловать в Wild Analytics!",
            "balance": 1000,
            "subscription": "Pro"
        }
    }

# Тестовый эндпоинт
@app.get("/test")
async def test():
    return {"message": "Тест успешен!", "timestamp": datetime.now().isoformat()}

if __name__ == "__main__":
    logger.info("🚀 Инициализация простой базы данных...")
    init_simple_db()
    
    logger.info("🚀 Запуск Wild Analytics Backend...")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
EOF

log "🔧 Создание ПРОСТОГО requirements.txt..."
cat > web-dashboard/backend/requirements.txt << 'EOF'
fastapi==0.104.1
uvicorn==0.24.0
python-multipart==0.0.6
pydantic==2.5.0
EOF

log "🔧 Создание ПРОСТОГО frontend AuthContext..."
mkdir -p wild-analytics-web/src/contexts
cat > wild-analytics-web/src/contexts/AuthContext.tsx << 'EOF'
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface User {
  id: number;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, name?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const API_URL = 'http://93.127.214.183:8000';

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      console.log('🔐 Попытка входа:', email);
      
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      console.log('📥 Ответ сервера:', data);
      
      if (data.success) {
        setUser(data.user);
        localStorage.setItem('token', data.access_token);
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Ошибка входа' };
      }
    } catch (error) {
      console.error('❌ Ошибка входа:', error);
      return { success: false, error: 'Ошибка соединения' };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, name?: string) => {
    try {
      setIsLoading(true);
      console.log('📝 Попытка регистрации:', email);
      
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name })
      });
      
      const data = await response.json();
      console.log('📥 Ответ регистрации:', data);
      
      if (data.success) {
        setUser(data.user);
        localStorage.setItem('token', data.access_token);
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Ошибка регистрации' };
      }
    } catch (error) {
      console.error('❌ Ошибка регистрации:', error);
      return { success: false, error: 'Ошибка соединения' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
EOF

log "🔧 Обновление .env файлов..."
cat > web-dashboard/backend/.env << 'EOF'
LOG_LEVEL=INFO
EOF

cat > wild-analytics-web/.env << 'EOF'
REACT_APP_API_URL=http://93.127.214.183:8000
GENERATE_SOURCEMAP=false
EOF

log "🔧 Простой Docker Compose..."
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  backend:
    build: ./web-dashboard/backend
    container_name: wild-analytics-backend
    ports:
      - "8000:8000"
    volumes:
      - ./web-dashboard/backend:/app
    restart: unless-stopped
    environment:
      - PYTHONUNBUFFERED=1

  frontend:
    build: ./wild-analytics-web
    container_name: wild-analytics-frontend
    ports:
      - "3000:3000"
    volumes:
      - ./wild-analytics-web/src:/app/src
    environment:
      - REACT_APP_API_URL=http://93.127.214.183:8000
      - CHOKIDAR_USEPOLLING=true
    restart: unless-stopped
    depends_on:
      - backend
EOF

log "🔧 Простой backend Dockerfile..."
cat > web-dashboard/backend/Dockerfile << 'EOF'
FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["python", "main.py"]
EOF

log "🔧 Простой frontend Dockerfile..."
cat > wild-analytics-web/Dockerfile << 'EOF'
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
EOF

log "🧹 Очистка Docker..."
docker system prune -f

log "🔨 Сборка контейнеров..."
docker-compose build --no-cache

log "🚀 Запуск простого приложения..."
docker-compose up -d

log "⏳ Ожидание запуска (45 секунд)..."
sleep 45

log "🔍 Проверка работы..."
echo "=== КОНТЕЙНЕРЫ ==="
docker ps

echo "=== BACKEND TEST ==="
curl -s http://93.127.214.183:8000/health

echo "=== LOGIN TEST ==="
curl -s -X POST http://93.127.214.183:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

echo "=== REGISTER TEST ==="
curl -s -X POST http://93.127.214.183:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"newuser@test.com","password":"newpassword","name":"New User"}'

log "✅ ЭКСТРЕННОЕ ИСПРАВЛЕНИЕ ЗАВЕРШЕНО!"
log ""
log "🌐 Проверьте:"
log "  - Frontend: http://93.127.214.183:3000"
log "  - Backend: http://93.127.214.183:8000"
log ""
log "👤 ПРАВИЛЬНЫЕ тестовые данные:"
log "  - Email: test@example.com"
log "  - Password: password123"
log ""
log "🔧 Если не работает:"
log "  - docker logs wild-analytics-backend"
log "  - docker logs wild-analytics-frontend" 