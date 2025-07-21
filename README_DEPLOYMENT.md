# 🚀 Wild Analytics - Руководство по развертыванию

## 📋 Обзор проекта

Wild Analytics - это веб-приложение для анализа данных Wildberries, состоящее из:
- **Frontend**: React приложение (`wild-analytics-web`)
- **Backend**: FastAPI сервер (`web-dashboard/backend`)
- **Nginx**: Reverse proxy для маршрутизации

## 🛠️ Требования к серверу

- **ОС**: Ubuntu 20.04+ / CentOS 7+ / Debian 10+
- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **RAM**: минимум 2GB
- **Диск**: минимум 5GB свободного места

## 🚀 Быстрое развертывание

### 1. Клонирование репозитория
```bash
git clone https://github.com/CHEESESAMURAI/WWEB.git
cd WWEB
```

### 2. Настройка конфигурации
```bash
# Копирование примера конфигурации
cp config.example.py config.py

# Редактирование конфигурации
nano config.py
```

**Обязательно заполните в config.py:**
- `OPENAI_API_KEY` - ключ OpenAI API
- `SERPER_API_KEY` - ключ Serper API
- `MPSTATS_API_KEY` - ключ MPStats API
- `YOUTUBE_API_KEY` - ключ YouTube API (опционально)

### 3. Запуск приложения
```bash
# Автоматическое развертывание
./deploy.sh

# Или вручную
docker-compose up --build -d
```

### 4. Проверка доступности
- **Frontend**: http://your-server-ip
- **Backend API**: http://your-server-ip/api
- **API документация**: http://your-server-ip/api/docs

## 🔧 Ручное развертывание

### Установка Docker
```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# CentOS/RHEL
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
```

### Установка Docker Compose
```bash
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### Настройка файрвола
```bash
# Открытие необходимых портов
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 8000/tcp
sudo ufw enable
```

## 🔐 Настройка SSL (опционально)

### 1. Установка Certbot
```bash
sudo apt install certbot python3-certbot-nginx -y
```

### 2. Получение сертификата
```bash
sudo certbot --nginx -d your-domain.com
```

### 3. Обновление nginx.conf
Раскомментируйте HTTPS секцию в `nginx.conf` и укажите ваш домен.

## 📊 Мониторинг и логи

### Просмотр логов
```bash
# Все сервисы
docker-compose logs -f

# Только backend
docker-compose logs -f backend

# Только frontend
docker-compose logs -f frontend
```

### Проверка статуса
```bash
# Статус контейнеров
docker-compose ps

# Использование ресурсов
docker stats
```

## 🔄 Обновление приложения

### 1. Получение обновлений
```bash
git pull origin main
```

### 2. Пересборка и перезапуск
```bash
docker-compose down
docker-compose up --build -d
```

### 3. Проверка обновления
```bash
docker-compose ps
curl http://localhost/api/docs
```

## 🛠️ Устранение неполадок

### Проблемы с подключением к API
1. Проверьте правильность API ключей в `config.py`
2. Убедитесь, что все ключи активны и имеют достаточные лимиты
3. Проверьте логи: `docker-compose logs backend`

### Проблемы с frontend
1. Проверьте переменные окружения в `wild-analytics-web/.env`
2. Убедитесь, что API URL указан правильно
3. Проверьте логи: `docker-compose logs frontend`

### Проблемы с Nginx
1. Проверьте конфигурацию: `docker-compose exec nginx nginx -t`
2. Перезапустите Nginx: `docker-compose restart nginx`
3. Проверьте логи: `docker-compose logs nginx`

## 📝 Полезные команды

```bash
# Остановка всех сервисов
docker-compose down

# Перезапуск конкретного сервиса
docker-compose restart backend

# Просмотр логов в реальном времени
docker-compose logs -f

# Вход в контейнер
docker-compose exec backend bash
docker-compose exec frontend sh

# Очистка неиспользуемых ресурсов
docker system prune -a

# Резервное копирование базы данных
docker-compose exec backend cp wild_analytics.db /backup/
```

## 🔒 Безопасность

### Рекомендации по безопасности
1. **Измените все пароли по умолчанию**
2. **Используйте HTTPS в продакшене**
3. **Регулярно обновляйте зависимости**
4. **Настройте файрвол**
5. **Используйте сильные API ключи**

### Настройка файрвола
```bash
# Базовые настройки UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## 📞 Поддержка

При возникновении проблем:
1. Проверьте логи: `docker-compose logs`
2. Убедитесь в правильности конфигурации
3. Проверьте доступность API ключей
4. Создайте issue в репозитории с подробным описанием проблемы

## 📄 Лицензия

Проект распространяется под лицензией MIT. 