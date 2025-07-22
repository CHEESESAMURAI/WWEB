#!/bin/bash

echo "🔧 Исправление зависимостей frontend..."

# Переходим в директорию frontend
cd wild-analytics-web

echo "🔍 Проверка package.json..."
if [ ! -f "package.json" ]; then
    echo "❌ package.json не найден!"
    exit 1
fi

echo "📦 Установка зависимостей..."
npm install

echo "🔍 Проверка react-scripts..."
if ! npm list react-scripts; then
    echo "📦 Установка react-scripts..."
    npm install react-scripts
fi

echo "🔍 Проверка других необходимых зависимостей..."
npm install react react-dom react-router-dom @types/react @types/react-dom

echo "✅ Зависимости установлены!"
echo ""
echo "🚀 Теперь можно запустить frontend:"
echo "npm start"
echo ""
echo "🌐 Frontend будет доступен по адресу:"
echo "http://93.127.214.183:3000" 