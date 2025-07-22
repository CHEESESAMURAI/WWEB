#!/bin/bash

echo "🔄 Полная синхронизация функционала Wild Analytics..."

# Остановка всех процессов
echo "🛑 Остановка всех процессов..."
pkill -f "npm start" || true
pkill -f "python main.py" || true
pkill -f "uvicorn" || true
pkill -f "node" || true
docker-compose down 2>/dev/null || true

# Переходим в /opt
cd /opt

# Удаляем старую версию
echo "🗑️ Удаление старой версии..."
rm -rf wild-analytics

# Клонируем свежую версию
echo "📥 Клонирование свежей версии..."
git clone https://github.com/CHEESESAMURAI/WWEB.git wild-analytics
cd wild-analytics

# Проверяем структуру
echo "🔍 Проверка структуры..."
ls -la
echo "wild-analytics-web содержимое:"
ls -la wild-analytics-web/src/pages/ || echo "wild-analytics-web не найден"
echo "web-dashboard содержимое:"
ls -la web-dashboard/backend/ || echo "web-dashboard не найден"

# Настройка backend
echo "🔧 Настройка backend..."
cd web-dashboard/backend

# Создание виртуального окружения
if [ ! -d "venv" ]; then
    echo "🔧 Создание виртуального окружения..."
    python3 -m venv venv
fi

# Активация и установка зависимостей
echo "🔧 Установка Python зависимостей..."
source venv/bin/activate
pip install --upgrade pip
pip install fastapi uvicorn pydantic requests python-multipart PyJWT python-jose[cryptography]

# Проверяем main.py
echo "🔍 Проверка main.py..."
if [ -f "main.py" ]; then
    echo "✅ main.py найден"
    head -20 main.py
else
    echo "❌ main.py не найден! Создаем базовый..."
    cat > main.py << 'EOF'
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Wild Analytics Backend is running!"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
EOF
fi

cd ../..

# Настройка frontend
echo "🔧 Настройка frontend..."
cd wild-analytics-web

# Проверяем package.json
echo "🔍 Проверка package.json..."
if [ -f "package.json" ]; then
    echo "✅ package.json найден"
    cat package.json
else
    echo "❌ package.json не найден!"
    exit 1
fi

# Установка зависимостей
echo "🔧 Установка npm зависимостей..."
npm install

# Проверяем структуру src
echo "🔍 Проверка структуры src..."
ls -la src/
echo "Pages:"
ls -la src/pages/ || echo "pages не найден"
echo "Components:"
ls -la src/components/ || echo "components не найден"

cd ..

echo "✅ Синхронизация завершена!"
echo ""
echo "🚀 Запуск приложения:"
echo ""
echo "🔧 Терминал 1 (Backend):"
echo "cd /opt/wild-analytics/web-dashboard/backend"
echo "source venv/bin/activate"
echo "python main.py"
echo ""
echo "🌐 Терминал 2 (Frontend):"
echo "cd /opt/wild-analytics/wild-analytics-web"
echo "npm start"
echo ""
echo "🌐 Frontend: http://93.127.214.183:3000"
echo "🔗 Backend API: http://93.127.214.183:8000"
echo ""
echo "🔍 Проверка работы:"
echo "curl http://93.127.214.183:8000/health" 