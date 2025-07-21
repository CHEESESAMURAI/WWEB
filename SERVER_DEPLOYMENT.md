# 🚀 Развертывание Wild Analytics на сервере 93.127.214.183

## 📋 Подготовка сервера

### 1. Подключение к серверу
```bash
ssh root@93.127.214.183
```

### 2. Обновление системы
```bash
apt update && apt upgrade -y
```

### 3. Установка необходимых пакетов
```bash
# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
usermod -aG docker $USER

# Установка Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Установка дополнительных инструментов
apt install -y git curl wget nano htop
```

## 📦 Загрузка проекта

### Вариант 1: Загрузка архива
```bash
# Создание рабочей директории
mkdir -p /opt/wild-analytics
cd /opt/wild-analytics

# Загрузка архива (выполнить на локальной машине)
scp wild-analytics-deploy.tar.gz root@93.127.214.183:/opt/wild-analytics/

# Распаковка архива
tar -xzf wild-analytics-deploy.tar.gz
mv "WILD-BOT 6"/* .
rmdir "WILD-BOT 6"
```

### Вариант 2: Клонирование из GitHub (после настройки токена)
```bash
cd /opt
git clone https://github.com/CHEESESAMURAI/WWEB.git wild-analytics
cd wild-analytics
```

## ⚙️ Настройка конфигурации

### 1. Создание конфигурационного файла
```bash
cp config.example.py config.py
nano config.py
```

### 2. Заполнение API ключей в config.py
```python
# Обязательные ключи (замените на реальные)
OPENAI_API_KEY = "sk-your-openai-key-here"
SERPER_API_KEY = "your-serper-key-here"
MPSTATS_API_KEY = "your-mpstats-key-here"
YOUTUBE_API_KEY = "your-youtube-key-here"  # опционально

# Настройки сервера
HOST = "0.0.0.0"
PORT = 8000
DEBUG = False

# Безопасность
SECRET_KEY = "your-secret-key-here"
JWT_SECRET_KEY = "your-jwt-secret-key-here"
```

### 3. Настройка переменных окружения для frontend
```bash
cd wild-analytics-web
cat > .env << EOF
REACT_APP_API_URL=http://93.127.214.183:8000
REACT_APP_ENVIRONMENT=production
EOF
cd ..
```

## 🚀 Развертывание

### 1. Автоматическое развертывание
```bash
# Сделать скрипт исполняемым
chmod +x deploy.sh

# Запуск развертывания
./deploy.sh
```

### 2. Ручное развертывание
```bash
# Сборка и запуск контейнеров
docker-compose up --build -d

# Проверка статуса
docker-compose ps
```

## 🔧 Настройка Nginx (опционально)

### 1. Установка Nginx
```bash
apt install -y nginx
```

### 2. Создание конфигурации
```bash
cp nginx.conf /etc/nginx/nginx.conf
nginx -t
systemctl restart nginx
systemctl enable nginx
```

### 3. Настройка файрвола
```bash
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 8000/tcp
ufw allow 3000/tcp
ufw enable
```

## 🔐 Настройка SSL (рекомендуется)

### 1. Установка Certbot
```bash
apt install -y certbot python3-certbot-nginx
```

### 2. Получение SSL сертификата
```bash
# Если у вас есть домен, указывающий на сервер
certbot --nginx -d your-domain.com

# Или создание самоподписанного сертификата
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/nginx-selfsigned.key \
  -out /etc/ssl/certs/nginx-selfsigned.crt
```

## 📊 Мониторинг

### 1. Просмотр логов
```bash
# Все сервисы
docker-compose logs -f

# Только backend
docker-compose logs -f backend

# Только frontend
docker-compose logs -f frontend
```

### 2. Проверка статуса
```bash
# Статус контейнеров
docker-compose ps

# Использование ресурсов
docker stats

# Проверка доступности
curl http://93.127.214.183:8000/api/docs
curl http://93.127.214.183:3000
```

## 🔄 Обновление приложения

### 1. Остановка сервисов
```bash
docker-compose down
```

### 2. Обновление кода
```bash
# Если используете Git
git pull origin main

# Если используете архив
# Загрузите новый архив и распакуйте
```

### 3. Перезапуск
```bash
docker-compose up --build -d
```

## 🛠️ Устранение неполадок

### Проблемы с Docker
```bash
# Перезапуск Docker
systemctl restart docker

# Очистка неиспользуемых ресурсов
docker system prune -a
```

### Проблемы с портами
```bash
# Проверка занятых портов
netstat -tulpn | grep :8000
netstat -tulpn | grep :3000

# Убийство процессов
kill -9 <PID>
```

### Проблемы с памятью
```bash
# Проверка использования памяти
free -h
df -h

# Очистка кэша
sync && echo 3 > /proc/sys/vm/drop_caches
```

## 📱 Доступ к приложению

После успешного развертывания приложение будет доступно по адресам:

- **Frontend**: http://93.127.214.183:3000
- **Backend API**: http://93.127.214.183:8000
- **API документация**: http://93.127.214.183:8000/docs

## 🔐 Тестовые данные для входа

- **Email**: `test@example.com`
- **Пароль**: `testpassword`

## 📋 Полезные команды

```bash
# Перезапуск конкретного сервиса
docker-compose restart backend
docker-compose restart frontend

# Вход в контейнер
docker-compose exec backend bash
docker-compose exec frontend sh

# Резервное копирование базы данных
docker-compose exec backend cp wild_analytics.db /backup/

# Просмотр конфигурации
docker-compose config

# Остановка всех сервисов
docker-compose down
```

## 🔒 Безопасность

### Рекомендации
1. **Измените все пароли по умолчанию**
2. **Используйте HTTPS в продакшене**
3. **Настройте файрвол**
4. **Регулярно обновляйте систему**
5. **Используйте сильные API ключи**

### Настройка файрвола
```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 8000/tcp
ufw allow 3000/tcp
ufw enable
```

## 📞 Поддержка

При возникновении проблем:
1. Проверьте логи: `docker-compose logs`
2. Убедитесь в правильности конфигурации
3. Проверьте доступность API ключей
4. Создайте issue в репозитории 