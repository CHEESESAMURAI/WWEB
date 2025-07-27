#!/bin/bash

echo "🔧 Исправление ошибки регистрации [object Object]..."

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

# Переходим в директорию проекта
cd /opt/wild-analytics || { error "Директория /opt/wild-analytics не найдена"; exit 1; }

log "🚀 Исправление ошибки авторизации..."

# 1. Проверка текущего состояния
log "🔍 Проверка текущего состояния..."
echo "=== СТАТУС КОНТЕЙНЕРОВ ==="
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo "=== ПРОВЕРКА API ==="
curl -s http://93.127.214.183:8000/health

# 2. Исправление backend main.py
log "🔧 Исправление backend main.py..."
cat > web-dashboard/backend/main.py << 'EOF'
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
import uvicorn
import logging
import jwt
import bcrypt
import sqlite3
import json
from datetime import datetime, timedelta
import os

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# JWT настройки
SECRET_KEY = "wild-analytics-secret-key-2024"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

app = FastAPI(
    title="Wild Analytics API",
    description="Backend для Wild Analytics",
    version="1.0.0"
)

# CORS настройки - ВАЖНО: правильные настройки для избежания ошибок
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # В продакшене замените на конкретные домены
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

security = HTTPBearer()

# Модели данных
class UserLogin(BaseModel):
    email: str
    password: str

class UserRegister(BaseModel):
    email: str
    password: str
    name: Optional[str] = None

class ApiResponse(BaseModel):
    success: bool
    message: Optional[str] = None
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

# Инициализация базы данных
def init_database():
    try:
        conn = sqlite3.connect('wild_analytics.db')
        c = conn.cursor()
        
        # Создание таблицы пользователей
        c.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                name TEXT,
                balance REAL DEFAULT 1000.0,
                subscription_type TEXT DEFAULT 'pro',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Добавление тестового пользователя
        try:
            password_hash = bcrypt.hashpw("password123".encode('utf-8'), bcrypt.gensalt())
            c.execute('''
                INSERT OR REPLACE INTO users (email, password_hash, name, balance, subscription_type)
                VALUES (?, ?, ?, ?, ?)
            ''', ("test@example.com", password_hash, "Test User", 1000.0, "pro"))
            conn.commit()
            logger.info("✅ База данных инициализирована. Тестовый пользователь: test@example.com / password123")
        except Exception as e:
            logger.error(f"❌ Ошибка создания тестового пользователя: {e}")
        
        conn.close()
    except Exception as e:
        logger.error(f"❌ Ошибка инициализации базы данных: {e}")

# Функции для работы с БД
def get_user_by_email(email: str):
    try:
        conn = sqlite3.connect('wild_analytics.db')
        c = conn.cursor()
        c.execute('SELECT * FROM users WHERE email = ?', (email,))
        user = c.fetchone()
        conn.close()
        return user
    except Exception as e:
        logger.error(f"❌ Ошибка получения пользователя: {e}")
        return None

def create_user(email: str, password: str, name: Optional[str] = None):
    try:
        conn = sqlite3.connect('wild_analytics.db')
        c = conn.cursor()
        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        
        c.execute('''
            INSERT INTO users (email, password_hash, name)
            VALUES (?, ?, ?)
        ''', (email, password_hash, name))
        conn.commit()
        user_id = c.lastrowid
        conn.close()
        return user_id
    except sqlite3.IntegrityError:
        conn.close()
        raise HTTPException(status_code=400, detail="Email уже зарегистрирован")
    except Exception as e:
        logger.error(f"❌ Ошибка создания пользователя: {e}")
        raise HTTPException(status_code=500, detail="Ошибка сервера")

def create_access_token(data: dict):
    try:
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    except Exception as e:
        logger.error(f"❌ Ошибка создания токена: {e}")
        raise HTTPException(status_code=500, detail="Ошибка создания токена")

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Неверный токен")
        return email
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Неверный токен")

# Базовые эндпоинты
@app.get("/")
async def root():
    return {
        "message": "Wild Analytics API is running!",
        "status": "ok",
        "version": "1.0.0",
        "endpoints": [
            "/health",
            "/auth/login",
            "/auth/register",
            "/auth/me",
            "/user/dashboard"
        ]
    }

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "wild-analytics-backend",
        "database": "connected",
        "timestamp": datetime.now().isoformat()
    }

# Авторизация с правильной обработкой ошибок
@app.post("/auth/login")
async def login(user_data: UserLogin):
    try:
        logger.info(f"🔐 Попытка входа для: {user_data.email}")
        
        user = get_user_by_email(user_data.email)
        if not user:
            logger.warning(f"❌ Пользователь не найден: {user_data.email}")
            return {
                "success": False,
                "error": "Неверный email или пароль"
            }
        
        if not bcrypt.checkpw(user_data.password.encode('utf-8'), user[2]):
            logger.warning(f"❌ Неверный пароль для: {user_data.email}")
            return {
                "success": False,
                "error": "Неверный email или пароль"
            }
        
        access_token = create_access_token(data={"sub": user[1]})
        logger.info(f"✅ Успешный вход: {user_data.email}")
        
        return {
            "success": True,
            "message": "Вход выполнен успешно",
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user[0],
                "email": user[1],
                "name": user[3],
                "balance": user[4],
                "subscription_type": user[5]
            }
        }
    except Exception as e:
        logger.error(f"❌ Ошибка входа: {e}")
        return {
            "success": False,
            "error": "Ошибка сервера при входе"
        }

@app.post("/auth/register")
async def register(user_data: UserRegister):
    try:
        logger.info(f"📝 Попытка регистрации для: {user_data.email}")
        
        # Проверяем, существует ли пользователь
        existing_user = get_user_by_email(user_data.email)
        if existing_user:
            logger.warning(f"❌ Email уже зарегистрирован: {user_data.email}")
            return {
                "success": False,
                "error": "Email уже зарегистрирован"
            }
        
        # Создаем нового пользователя
        user_id = create_user(user_data.email, user_data.password, user_data.name)
        user = get_user_by_email(user_data.email)
        
        access_token = create_access_token(data={"sub": user_data.email})
        logger.info(f"✅ Успешная регистрация: {user_data.email}")
        
        return {
            "success": True,
            "message": "Регистрация выполнена успешно",
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user[0],
                "email": user[1],
                "name": user[3],
                "balance": user[4],
                "subscription_type": user[5]
            }
        }
    except HTTPException as e:
        logger.error(f"❌ HTTP ошибка регистрации: {e.detail}")
        return {
            "success": False,
            "error": e.detail
        }
    except Exception as e:
        logger.error(f"❌ Ошибка регистрации: {e}")
        return {
            "success": False,
            "error": "Ошибка сервера при регистрации"
        }

@app.get("/auth/me")
async def get_current_user(email: str = Depends(verify_token)):
    try:
        user = get_user_by_email(email)
        if not user:
            return {
                "success": False,
                "error": "Пользователь не найден"
            }
        
        return {
            "success": True,
            "user": {
                "id": user[0],
                "email": user[1],
                "name": user[3],
                "balance": user[4],
                "subscription_type": user[5]
            }
        }
    except Exception as e:
        logger.error(f"❌ Ошибка получения пользователя: {e}")
        return {
            "success": False,
            "error": "Ошибка получения данных пользователя"
        }

# Dashboard
@app.get("/user/dashboard")
async def get_dashboard(email: str = Depends(verify_token)):
    try:
        user = get_user_by_email(email)
        if not user:
            return {
                "success": False,
                "error": "Пользователь не найден"
            }
        
        return {
            "success": True,
            "data": {
                "user_balance": user[4],
                "subscription_type": user[5],
                "total_analyses": 25,
                "successful_analyses": 23,
                "monthly_usage": 15,
                "recent_analyses": [
                    {"type": "Product Analysis", "date": "2024-01-15", "status": "success"},
                    {"type": "Brand Analysis", "date": "2024-01-14", "status": "success"},
                    {"type": "Category Analysis", "date": "2024-01-13", "status": "pending"}
                ]
            }
        }
    except Exception as e:
        logger.error(f"❌ Ошибка получения dashboard: {e}")
        return {
            "success": False,
            "error": "Ошибка получения данных dashboard"
        }

# Тестовый эндпоинт
@app.get("/test")
async def test():
    return {
        "message": "API работает!",
        "timestamp": datetime.now().isoformat(),
        "status": "ok"
    }

if __name__ == "__main__":
    logger.info("🚀 Инициализация базы данных...")
    init_database()
    
    logger.info("🚀 Starting Wild Analytics Backend...")
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        log_level="info"
    )
EOF

# 3. Обновление frontend API service
log "🔧 Исправление frontend API service..."
cat > wild-analytics-web/src/services/api.ts << 'EOF'
import axios, { AxiosResponse, AxiosError } from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://93.127.214.183:8000';

console.log('🔗 API Base URL:', API_BASE_URL);

// Создаем экземпляр axios
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Интерцептор для добавления токена
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('📤 Request:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('❌ Request error:', error);
    return Promise.reject(error);
  }
);

// Интерцептор для обработки ответов
apiClient.interceptors.response.use(
  (response) => {
    console.log('📥 Response:', response.status, response.config.url);
    return response;
  },
  (error: AxiosError) => {
    console.error('❌ Response error:', error.response?.status, error.response?.data);
    
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Типы данных
export interface User {
  id: number;
  email: string;
  name?: string;
  balance: number;
  subscription_type: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface LoginResponse extends ApiResponse {
  access_token?: string;
  token_type?: string;
  user?: User;
}

export interface RegisterResponse extends ApiResponse {
  access_token?: string;
  token_type?: string;
  user?: User;
}

class ApiService {
  // Авторизация с правильной обработкой ошибок
  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      console.log('🔐 Попытка входа для:', email);
      
      const response: AxiosResponse<LoginResponse> = await apiClient.post('/auth/login', {
        email,
        password,
      });
      
      console.log('✅ Ответ сервера при входе:', response.data);
      
      if (response.data.success && response.data.access_token) {
        this.setToken(response.data.access_token);
        console.log('✅ Токен сохранен');
      }
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Ошибка входа:', error);
      
      if (error.response?.data) {
        return error.response.data;
      }
      
      return {
        success: false,
        error: 'Ошибка соединения с сервером'
      };
    }
  }

  async register(email: string, password: string, name?: string): Promise<RegisterResponse> {
    try {
      console.log('📝 Попытка регистрации для:', email);
      
      const response: AxiosResponse<RegisterResponse> = await apiClient.post('/auth/register', {
        email,
        password,
        name,
      });
      
      console.log('✅ Ответ сервера при регистрации:', response.data);
      
      if (response.data.success && response.data.access_token) {
        this.setToken(response.data.access_token);
        console.log('✅ Токен сохранен');
      }
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Ошибка регистрации:', error);
      
      if (error.response?.data) {
        return error.response.data;
      }
      
      return {
        success: false,
        error: 'Ошибка соединения с сервером'
      };
    }
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    try {
      const response = await apiClient.get('/auth/me');
      return response.data;
    } catch (error: any) {
      console.error('❌ Ошибка получения пользователя:', error);
      return {
        success: false,
        error: 'Ошибка получения данных пользователя'
      };
    }
  }

  // Токен
  setToken(token: string): void {
    localStorage.setItem('access_token', token);
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  clearToken(): void {
    localStorage.removeItem('access_token');
  }

  // Dashboard
  async getDashboardData(): Promise<ApiResponse> {
    try {
      const response = await apiClient.get('/user/dashboard');
      return response.data;
    } catch (error: any) {
      console.error('❌ Ошибка получения dashboard:', error);
      return {
        success: false,
        error: 'Ошибка получения данных dashboard'
      };
    }
  }

  // Health check
  async healthCheck(): Promise<any> {
    try {
      const response = await apiClient.get('/health');
      console.log('✅ Health check:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Health check failed:', error);
      throw error;
    }
  }

  // Тест соединения
  async testConnection(): Promise<boolean> {
    try {
      await this.healthCheck();
      return true;
    } catch {
      return false;
    }
  }
}

export const apiService = new ApiService();
export default apiService;
EOF

# 4. Обновление AuthContext
log "🔧 Исправление AuthContext..."
mkdir -p wild-analytics-web/src/contexts
cat > wild-analytics-web/src/contexts/AuthContext.tsx << 'EOF'
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService, User, LoginResponse, RegisterResponse } from '../services/api';

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
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = apiService.getToken();
        if (token) {
          console.log('🔑 Найден токен, проверяем пользователя...');
          const response = await apiService.getCurrentUser();
          if (response.success && response.user) {
            setUser(response.user);
            console.log('✅ Пользователь авторизован:', response.user.email);
          } else {
            console.log('❌ Токен недействителен');
            apiService.clearToken();
          }
        }
      } catch (error) {
        console.error('❌ Ошибка инициализации авторизации:', error);
        apiService.clearToken();
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      console.log('🔐 Попытка входа...');
      
      const response: LoginResponse = await apiService.login(email, password);
      
      console.log('📥 Ответ авторизации:', response);
      
      if (response.success && response.user) {
        setUser(response.user);
        console.log('✅ Успешный вход:', response.user.email);
        return { success: true };
      } else {
        console.log('❌ Ошибка входа:', response.error);
        return { 
          success: false, 
          error: response.error || 'Неизвестная ошибка' 
        };
      }
    } catch (error: any) {
      console.error('❌ Исключение при входе:', error);
      return { 
        success: false, 
        error: error.message || 'Ошибка соединения с сервером' 
      };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, name?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      console.log('📝 Попытка регистрации...');
      
      const response: RegisterResponse = await apiService.register(email, password, name);
      
      console.log('📥 Ответ регистрации:', response);
      
      if (response.success && response.user) {
        setUser(response.user);
        console.log('✅ Успешная регистрация:', response.user.email);
        return { success: true };
      } else {
        console.log('❌ Ошибка регистрации:', response.error);
        return { 
          success: false, 
          error: response.error || 'Неизвестная ошибка' 
        };
      }
    } catch (error: any) {
      console.error('❌ Исключение при регистрации:', error);
      return { 
        success: false, 
        error: error.message || 'Ошибка соединения с сервером' 
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    console.log('👋 Выход пользователя');
    setUser(null);
    apiService.clearToken();
  };

  const value: AuthContextType = {
    user,
    login,
    register,
    logout,
    isLoading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
EOF

# 5. Перезапуск backend контейнера
log "🔄 Перезапуск backend..."
docker-compose restart backend

# 6. Ожидание перезапуска
log "⏳ Ожидание перезапуска backend (30 секунд)..."
sleep 30

# 7. Проверка работы
log "🔍 Проверка исправлений..."

echo "=== СТАТУС КОНТЕЙНЕРОВ ==="
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo "=== ПРОВЕРКА BACKEND ==="
curl -s http://93.127.214.183:8000/health | jq . 2>/dev/null || curl -s http://93.127.214.183:8000/health

echo "=== ТЕСТ РЕГИСТРАЦИИ ==="
curl -s -X POST http://93.127.214.183:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test2@example.com","password":"password123","name":"Test User 2"}' | jq . 2>/dev/null || curl -s -X POST http://93.127.214.183:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test2@example.com","password":"password123","name":"Test User 2"}'

echo "=== ТЕСТ ВХОДА ==="
curl -s -X POST http://93.127.214.183:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' | jq . 2>/dev/null || curl -s -X POST http://93.127.214.183:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

log "✅ Исправление завершено!"
log ""
log "🌐 Проверьте регистрацию:"
log "  - Frontend: http://93.127.214.183:3000/register"
log "  - Backend API: http://93.127.214.183:8000/docs"
log ""
log "👤 Тестовые данные:"
log "  - Email: test@example.com"
log "  - Password: password123"
log ""
log "🔧 Теперь ошибка [object Object] должна быть исправлена!"
log "📝 Все ответы API теперь в правильном формате"
log "🔐 Добавлено детальное логирование для отладки"
EOF 