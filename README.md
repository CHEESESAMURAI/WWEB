# 🐺 Wild Analytics - Веб-приложение для анализа Wildberries

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/)
[![React](https://img.shields.io/badge/react-18+-blue.svg)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/fastapi-0.104+-green.svg)](https://fastapi.tiangolo.com/)

Современное веб-приложение для комплексного анализа данных Wildberries с использованием AI и машинного обучения.

## 🚀 Быстрый старт

### Локальная разработка

```bash
# Клонирование репозитория
git clone https://github.com/CHEESESAMURAI/WWEB.git
cd WWEB

# Запуск backend
cd web-dashboard/backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
# или venv\Scripts\activate  # Windows
pip install -r requirements.txt
python main.py

# Запуск frontend (в новом терминале)
cd wild-analytics-web
npm install
npm start
```

### Развертывание на сервере

```bash
# Клонирование и настройка
git clone https://github.com/CHEESESAMURAI/WWEB.git
cd WWEB

# Настройка конфигурации
cp config.example.py config.py
# Отредактируйте config.py с вашими API ключами

# Запуск с Docker
./deploy.sh
```

## 📋 Возможности

### 🔍 Анализ продуктов
- Детальный анализ товаров Wildberries
- Анализ конкурентов и цен
- Прогнозирование трендов
- Анализ сезонности

### 🏢 Анализ брендов
- Комплексный анализ брендов
- Сравнение с конкурентами
- Анализ позиционирования
- Рекомендации по развитию

### 📊 Анализ категорий
- Анализ категорий товаров
- Тренды и сезонность
- Конкурентный анализ
- Прогнозирование спроса

### 🤖 AI помощник
- Генерация описаний товаров
- Создание карточек товаров
- Анализ отзывов
- Рекомендации по оптимизации

### 📈 Планирование поставок
- Автоматическое планирование
- Анализ остатков
- Прогнозирование спроса
- Оптимизация логистики

### 🔎 Поиск блогеров
- Поиск рекламных блогеров
- Анализ аудитории
- Оценка эффективности
- Контактная информация

## 🛠️ Технологии

### Backend
- **FastAPI** - современный веб-фреймворк
- **Python 3.8+** - основной язык
- **SQLite** - база данных
- **JWT** - аутентификация
- **OpenAI API** - AI функциональность
- **MPStats API** - данные Wildberries

### Frontend
- **React 18** - пользовательский интерфейс
- **TypeScript** - типизация
- **Material-UI** - компоненты
- **Chart.js** - графики и диаграммы
- **Axios** - HTTP клиент

### DevOps
- **Docker** - контейнеризация
- **Docker Compose** - оркестрация
- **Nginx** - reverse proxy
- **GitHub Actions** - CI/CD

## 📁 Структура проекта

```
WWEB/
├── web-dashboard/backend/     # Backend API
│   ├── main.py               # Основной файл FastAPI
│   ├── routes/               # API маршруты
│   ├── requirements.txt      # Python зависимости
│   └── Dockerfile           # Docker для backend
├── wild-analytics-web/       # Frontend React
│   ├── src/                 # Исходный код
│   ├── package.json         # Node.js зависимости
│   └── Dockerfile          # Docker для frontend
├── docker-compose.yml       # Оркестрация контейнеров
├── nginx.conf              # Конфигурация Nginx
├── deploy.sh               # Скрипт развертывания
└── README_DEPLOYMENT.md    # Документация по развертыванию
```

## 🔧 Конфигурация

### Обязательные API ключи
```python
# config.py
OPENAI_API_KEY = "sk-your-openai-key"
SERPER_API_KEY = "your-serper-key"
MPSTATS_API_KEY = "your-mpstats-key"
YOUTUBE_API_KEY = "your-youtube-key"  # опционально
```

### Переменные окружения
```bash
# Frontend (.env)
REACT_APP_API_URL=http://localhost:8000
REACT_APP_ENVIRONMENT=production

# Backend
HOST=0.0.0.0
PORT=8000
DEBUG=false
```

## 🚀 Развертывание

### Docker (рекомендуется)
```bash
# Автоматическое развертывание
./deploy.sh

# Ручное развертывание
docker-compose up --build -d
```

### Ручное развертывание
```bash
# Backend
cd web-dashboard/backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py

# Frontend
cd wild-analytics-web
npm install
npm run build
npm start
```

## 📊 API документация

После запуска backend доступна автоматическая документация:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🔐 Аутентификация

По умолчанию доступен тестовый аккаунт:
- **Email**: `test@example.com`
- **Пароль**: `testpassword`

## 📈 Мониторинг

### Логи
```bash
# Docker
docker-compose logs -f

# Ручное развертывание
tail -f logs/app.log
```

### Статус сервисов
```bash
# Docker
docker-compose ps

# Системные сервисы
systemctl status wild-analytics-backend
```

## 🛠️ Разработка

### Установка зависимостей разработки
```bash
# Backend
cd web-dashboard/backend
pip install -r requirements.txt
pip install pytest black flake8

# Frontend
cd wild-analytics-web
npm install
npm install --save-dev @types/node
```

### Запуск тестов
```bash
# Backend
cd web-dashboard/backend
pytest

# Frontend
cd wild-analytics-web
npm test
```

### Линтинг
```bash
# Backend
cd web-dashboard/backend
black .
flake8 .

# Frontend
cd wild-analytics-web
npm run lint
```

## 🤝 Вклад в проект

1. Fork репозитория
2. Создайте feature branch (`git checkout -b feature/amazing-feature`)
3. Commit изменения (`git commit -m 'Add amazing feature'`)
4. Push в branch (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

## 📄 Лицензия

Проект распространяется под лицензией MIT. См. файл [LICENSE](LICENSE) для подробностей.

## 📞 Поддержка

- **Issues**: [GitHub Issues](https://github.com/CHEESESAMURAI/WWEB/issues)
- **Документация**: [README_DEPLOYMENT.md](README_DEPLOYMENT.md)
- **Email**: support@wildanalytics.com

## 🙏 Благодарности

- [FastAPI](https://fastapi.tiangolo.com/) - за отличный веб-фреймворк
- [React](https://reactjs.org/) - за современный UI
- [Material-UI](https://mui.com/) - за компоненты
- [OpenAI](https://openai.com/) - за AI API
- [MPStats](https://mpstats.io/) - за данные Wildberries

---

⭐ Если проект вам понравился, поставьте звездочку!
