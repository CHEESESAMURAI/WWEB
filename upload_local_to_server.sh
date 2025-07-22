#!/bin/bash

echo "📤 Загрузка локального кода на сервер..."

# Проверяем что мы в правильной директории
if [ ! -d "wild-analytics-web" ] || [ ! -d "web-dashboard" ]; then
    echo "❌ Ошибка: Запустите скрипт из директории с wild-analytics-web и web-dashboard"
    exit 1
fi

# Создаем архив с локальным кодом
echo "📦 Создание архива с локальным кодом..."
tar -czf wild-analytics-local.tar.gz wild-analytics-web/ web-dashboard/

# Загружаем на сервер
echo "📤 Загрузка на сервер..."
scp wild-analytics-local.tar.gz root@93.127.214.183:/tmp/

# Создаем скрипт для распаковки на сервере
cat > deploy_local.sh << 'EOF'
#!/bin/bash

echo "📥 Распаковка локального кода на сервере..."

# Остановка процессов
echo "🛑 Остановка процессов..."
pkill -f "npm start" || true
pkill -f "python main.py" || true
pkill -f "uvicorn" || true
pkill -f "node" || true

# Переходим в /opt
cd /opt

# Удаляем старую версию
echo "🗑️ Удаление старой версии..."
rm -rf wild-analytics

# Создаем новую директорию
mkdir wild-analytics
cd wild-analytics

# Распаковываем локальный код
echo "📦 Распаковка локального кода..."
tar -xzf /tmp/wild-analytics-local.tar.gz

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

cd ../..

# Настройка frontend
echo "🔧 Настройка frontend..."
cd wild-analytics-web

# Установка зависимостей
echo "🔧 Установка npm зависимостей..."
npm install

cd ..

echo "✅ Локальный код успешно развернут!"
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
EOF

# Загружаем скрипт развертывания
scp deploy_local.sh root@93.127.214.183:/tmp/

# Выполняем развертывание на сервере
echo "🚀 Выполнение развертывания на сервере..."
ssh root@93.127.214.183 "chmod +x /tmp/deploy_local.sh && /tmp/deploy_local.sh"

# Очистка
echo "🧹 Очистка временных файлов..."
rm wild-analytics-local.tar.gz
rm deploy_local.sh

echo "✅ Локальный код успешно загружен на сервер!"
echo ""
echo "🔍 Проверка на сервере:"
echo "ssh root@93.127.214.183"
echo "cd /opt/wild-analytics"
echo "ls -la" 