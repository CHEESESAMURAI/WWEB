#!/bin/bash

echo "🔄 Полная синхронизация сервера с локальным кодом..."

# Остановка всех процессов
echo "🛑 Остановка процессов..."
pkill -f "npm start" || true
pkill -f "python main.py" || true
docker-compose down

# Очистка и подготовка
echo "🧹 Очистка старых файлов..."
cd /opt/wild-analytics
rm -rf wild-analytics-web/node_modules
rm -rf web-dashboard/backend/venv

# Клонирование свежего кода
echo "📥 Клонирование свежего кода..."
cd /opt
rm -rf wild-analytics
git clone https://github.com/CHEESESAMURAI/WWEB.git wild-analytics
cd wild-analytics

# Настройка backend
echo "🔧 Настройка backend..."
cd web-dashboard/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ../..

# Настройка frontend
echo "🔧 Настройка frontend..."
cd wild-analytics-web
npm install
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
echo "📋 Тестовые данные для входа:"
echo "Email: test@example.com"
echo "Password: password123"
echo ""
echo "🎯 Теперь на сервере будет точно такой же функционал, как локально!" 