#!/bin/bash

echo "🚀 Продакшн развертывание Wild Analytics..."

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция для логирования
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Проверка что мы root
if [ "$EUID" -ne 0 ]; then
    error "Запустите скрипт от имени root: sudo ./production_deployment.sh"
    exit 1
fi

# Остановка всех процессов
log "🛑 Остановка всех процессов..."
pkill -f "npm start" || true
pkill -f "python main.py" || true
pkill -f "uvicorn" || true
pkill -f "node" || true
docker-compose down 2>/dev/null || true

# Обновление системы
log "📦 Обновление системы..."
apt update && apt upgrade -y

# Установка необходимых пакетов
log "🔧 Установка необходимых пакетов..."
apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release

# Установка Docker
log "🐳 Установка Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt update
    apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    systemctl enable docker
    systemctl start docker
fi

# Установка Docker Compose
log "🐳 Установка Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# Установка Node.js 18+
log "📦 Установка Node.js 18+..."
if ! command -v node &> /dev/null || [[ $(node --version | cut -d'v' -f2 | cut -d'.' -f1) -lt 18 ]]; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
fi

# Установка Python 3.10+
log "🐍 Установка Python 3.10+..."
if ! command -v python3 &> /dev/null; then
    apt install -y python3 python3-pip python3-venv
fi

# Установка Nginx
log "🌐 Установка Nginx..."
apt install -y nginx
systemctl enable nginx
systemctl start nginx

# Установка PostgreSQL
log "🗄️ Установка PostgreSQL..."
apt install -y postgresql postgresql-contrib
systemctl enable postgresql
systemctl start postgresql

# Установка UFW
log "🔥 Установка UFW Firewall..."
apt install -y ufw
ufw --force enable
ufw allow ssh
ufw allow 80
ufw allow 443
ufw allow 3000
ufw allow 8000

# Установка Fail2Ban
log "🛡️ Установка Fail2Ban..."
apt install -y fail2ban
systemctl enable fail2ban
systemctl start fail2ban

# Создание пользователя для приложения
log "👤 Создание пользователя wild-analytics..."
if ! id "wild-analytics" &>/dev/null; then
    useradd -m -s /bin/bash wild-analytics
    usermod -aG docker wild-analytics
    usermod -aG sudo wild-analytics
fi

# Переходим в /opt
cd /opt

# Удаляем старую версию
log "🗑️ Удаление старой версии..."
rm -rf wild-analytics

# Клонируем проект
log "📥 Клонирование проекта..."
git clone https://github.com/CHEESESAMURAI/WWEB.git wild-analytics
cd wild-analytics

# Создание .env файлов
log "🔧 Создание .env файлов..."

# Backend .env
cat > web-dashboard/backend/.env << 'EOF'
# Database
DATABASE_URL=postgresql://wild_analytics:wild_analytics_pass@localhost:5432/wild_analytics

# Security
SECRET_KEY=wild-analytics-secret-key-2024-production
ALGORITHM=HS256

# API Keys
MPSTATS_API_KEY=your_mpstats_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://93.127.214.183:3000,https://your-domain.com

# Logging
LOG_LEVEL=INFO
EOF

# Frontend .env
cat > wild-analytics-web/.env << 'EOF'
REACT_APP_API_URL=http://93.127.214.183:8000
REACT_APP_ENVIRONMENT=production
EOF

# Создание Docker Compose для продакшена
log "🐳 Создание Docker Compose для продакшена..."
cat > docker-compose.prod.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:15
    container_name: wild-analytics-postgres
    environment:
      POSTGRES_DB: wild_analytics
      POSTGRES_USER: wild_analytics
      POSTGRES_PASSWORD: wild_analytics_pass
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    ports:
      - "5432:5432"
    restart: unless-stopped
    networks:
      - wild-analytics-network

  backend:
    build:
      context: ./web-dashboard/backend
      dockerfile: Dockerfile.prod
    container_name: wild-analytics-backend
    environment:
      - DATABASE_URL=postgresql://wild_analytics:wild_analytics_pass@postgres:5432/wild_analytics
    volumes:
      - ./web-dashboard/backend:/app
      - ./logs:/app/logs
    ports:
      - "8000:8000"
    depends_on:
      - postgres
    restart: unless-stopped
    networks:
      - wild-analytics-network

  frontend:
    build:
      context: ./wild-analytics-web
      dockerfile: Dockerfile.prod
    container_name: wild-analytics-frontend
    ports:
      - "3000:80"
    depends_on:
      - backend
    restart: unless-stopped
    networks:
      - wild-analytics-network

  nginx:
    image: nginx:alpine
    container_name: wild-analytics-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
      - ./logs/nginx:/var/log/nginx
    depends_on:
      - frontend
      - backend
    restart: unless-stopped
    networks:
      - wild-analytics-network

volumes:
  postgres_data:

networks:
  wild-analytics-network:
    driver: bridge
EOF

# Создание Dockerfile для backend
log "🐳 Создание Dockerfile для backend..."
cat > web-dashboard/backend/Dockerfile.prod << 'EOF'
FROM python:3.11-slim

WORKDIR /app

# Установка системных зависимостей
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Копирование requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копирование кода
COPY . .

# Создание пользователя
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Запуск
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
EOF

# Создание Dockerfile для frontend
log "🐳 Создание Dockerfile для frontend..."
cat > wild-analytics-web/Dockerfile.prod << 'EOF'
# Build stage
FROM node:18-alpine as build

WORKDIR /app

# Копирование package.json
COPY package*.json ./
RUN npm ci --only=production

# Копирование кода
COPY . .

# Сборка
RUN npm run build

# Production stage
FROM nginx:alpine

# Копирование собранного приложения
COPY --from=build /app/build /usr/share/nginx/html

# Копирование nginx конфигурации
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
EOF

# Создание nginx конфигурации
log "🌐 Создание Nginx конфигурации..."
mkdir -p nginx
cat > nginx/nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server backend:8000;
    }

    upstream frontend {
        server frontend:80;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

    server {
        listen 80;
        server_name _;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;
        add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

        # Frontend
        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Backend API
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://backend/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Health check
        location /health {
            proxy_pass http://backend/health;
        }

        # Gzip compression
        gzip on;
        gzip_vary on;
        gzip_min_length 1024;
        gzip_proxied expired no-cache no-store private must-revalidate auth;
        gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss;
    }
}
EOF

# Создание nginx.conf для frontend контейнера
cat > wild-analytics-web/nginx.conf << 'EOF'
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Создание директорий для логов
log "📝 Создание директорий для логов..."
mkdir -p logs/nginx logs/backend logs/frontend backups

# Создание скрипта для бэкапов
log "💾 Создание скрипта для бэкапов..."
cat > backup.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/opt/wild-analytics/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Бэкап базы данных
docker exec wild-analytics-postgres pg_dump -U wild_analytics wild_analytics > $BACKUP_DIR/db_backup_$DATE.sql

# Бэкап файлов
tar -czf $BACKUP_DIR/files_backup_$DATE.tar.gz /opt/wild-analytics/web-dashboard /opt/wild-analytics/wild-analytics-web

# Удаление старых бэкапов (оставляем последние 7)
find $BACKUP_DIR -name "db_backup_*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "files_backup_*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

chmod +x backup.sh

# Создание systemd сервиса для автозапуска
log "🔧 Создание systemd сервиса..."
cat > /etc/systemd/system/wild-analytics.service << 'EOF'
[Unit]
Description=Wild Analytics Application
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/wild-analytics
ExecStart=/usr/local/bin/docker-compose -f docker-compose.prod.yml up -d
ExecStop=/usr/local/bin/docker-compose -f docker-compose.prod.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

# Создание cron задачи для бэкапов
log "⏰ Создание cron задачи для бэкапов..."
echo "0 2 * * * /opt/wild-analytics/backup.sh" | crontab -

# Настройка прав доступа
log "🔐 Настройка прав доступа..."
chown -R wild-analytics:wild-analytics /opt/wild-analytics
chmod -R 755 /opt/wild-analytics

# Создание инструкций
log "📋 Создание инструкций..."
cat > DEPLOYMENT_INSTRUCTIONS.md << 'EOF'
# 🚀 Wild Analytics - Инструкции по развертыванию

## 📋 Системные требования
- Ubuntu 22.04 LTS
- Docker + Docker Compose
- Nginx
- PostgreSQL
- Python 3.10+
- Node.js 18+

## 🔧 Установка

1. Клонируйте репозиторий:
```bash
git clone https://github.com/CHEESESAMURAI/WWEB.git
cd WWEB
```

2. Запустите скрипт развертывания:
```bash
sudo ./production_deployment.sh
```

## 🚀 Запуск

### Автоматический запуск:
```bash
sudo systemctl enable wild-analytics
sudo systemctl start wild-analytics
```

### Ручной запуск:
```bash
cd /opt/wild-analytics
docker-compose -f docker-compose.prod.yml up -d
```

## 🔍 Проверка работы

- Frontend: http://93.127.214.183:3000
- Backend API: http://93.127.214.183:8000
- Health check: http://93.127.214.183:8000/health

## 📝 Логи

- Nginx: `/opt/wild-analytics/logs/nginx/`
- Backend: `/opt/wild-analytics/logs/backend/`
- Frontend: `/opt/wild-analytics/logs/frontend/`

## 💾 Бэкапы

Бэкапы создаются автоматически каждый день в 2:00
Расположение: `/opt/wild-analytics/backups/`

## 🔧 Обновление

1. Остановите сервисы:
```bash
sudo systemctl stop wild-analytics
```

2. Обновите код:
```bash
cd /opt/wild-analytics
git pull origin main
```

3. Пересоберите и запустите:
```bash
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build
sudo systemctl start wild-analytics
```

## 🔐 Безопасность

- UFW Firewall настроен
- Fail2Ban активен
- SSL сертификат (требуется настройка домена)
- Rate limiting на API

## 📞 Поддержка

При возникновении проблем проверьте:
1. Логи: `docker-compose -f docker-compose.prod.yml logs`
2. Статус сервисов: `sudo systemctl status wild-analytics`
3. Статус контейнеров: `docker ps`
EOF

log "✅ Продакшн развертывание завершено!"
log ""
log "🚀 Следующие шаги:"
log "1. Настройте домен и SSL сертификат"
log "2. Обновите .env файлы с реальными API ключами"
log "3. Запустите приложение: sudo systemctl start wild-analytics"
log ""
log "📋 Инструкции сохранены в: /opt/wild-analytics/DEPLOYMENT_INSTRUCTIONS.md"
log ""
log "🌐 Доступ:"
log "- Frontend: http://93.127.214.183:3000"
log "- Backend API: http://93.127.214.183:8000" 