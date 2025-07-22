#!/bin/bash

echo "🔒 Настройка SSL сертификата и домена..."

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

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

# Проверка аргументов
if [ $# -eq 0 ]; then
    error "Укажите домен: ./setup_ssl_domain.sh your-domain.com"
    exit 1
fi

DOMAIN=$1
EMAIL="admin@$DOMAIN"

log "🌐 Настройка домена: $DOMAIN"

# Установка Certbot
log "🔧 Установка Certbot..."
apt update
apt install -y certbot python3-certbot-nginx

# Переходим в директорию проекта
cd /opt/wild-analytics

# Обновление nginx конфигурации для домена
log "🌐 Обновление Nginx конфигурации..."
cat > nginx/nginx.conf << EOF
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
    limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone \$binary_remote_addr zone=login:10m rate=5r/m;

    # HTTP -> HTTPS redirect
    server {
        listen 80;
        server_name $DOMAIN;
        return 301 https://\$server_name\$request_uri;
    }

    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name $DOMAIN;

        # SSL configuration
        ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;
        add_header Content-Security-Policy "default-src 'self' https: data: blob: 'unsafe-inline'" always;
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        # Frontend
        location / {
            proxy_pass http://frontend;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }

        # Backend API
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://backend/;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
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

# Обновление .env файлов
log "🔧 Обновление .env файлов..."

# Backend .env
cat > web-dashboard/backend/.env << EOF
# Database
DATABASE_URL=postgresql://wild_analytics:wild_analytics_pass@postgres:5432/wild_analytics

# Security
SECRET_KEY=wild-analytics-secret-key-2024-production
ALGORITHM=HS256

# API Keys
MPSTATS_API_KEY=your_mpstats_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# CORS
ALLOWED_ORIGINS=https://$DOMAIN,http://localhost:3000

# Logging
LOG_LEVEL=INFO
EOF

# Frontend .env
cat > wild-analytics-web/.env << EOF
REACT_APP_API_URL=https://$DOMAIN/api
REACT_APP_ENVIRONMENT=production
EOF

# Получение SSL сертификата
log "🔒 Получение SSL сертификата..."
certbot certonly --standalone -d $DOMAIN --email $EMAIL --agree-tos --non-interactive

if [ $? -eq 0 ]; then
    log "✅ SSL сертификат получен успешно!"
else
    error "❌ Ошибка получения SSL сертификата"
    log "Проверьте:"
    log "1. Домен указывает на этот сервер"
    log "2. Порт 80 открыт"
    log "3. DNS записи настроены правильно"
    exit 1
fi

# Создание скрипта для обновления сертификата
log "🔄 Создание скрипта обновления сертификата..."
cat > renew_ssl.sh << 'EOF'
#!/bin/bash

# Обновление SSL сертификата
certbot renew --quiet

# Перезапуск nginx контейнера
cd /opt/wild-analytics
docker-compose -f docker-compose.prod.yml restart nginx

echo "SSL certificate renewed: $(date)"
EOF

chmod +x renew_ssl.sh

# Добавление cron задачи для обновления сертификата
log "⏰ Настройка автоматического обновления сертификата..."
(crontab -l 2>/dev/null; echo "0 12 * * * /opt/wild-analytics/renew_ssl.sh") | crontab -

# Перезапуск сервисов
log "🔄 Перезапуск сервисов..."
systemctl restart wild-analytics

# Проверка работы
log "🔍 Проверка работы..."
sleep 10

# Проверка SSL
log "🔒 Проверка SSL сертификата..."
curl -I https://$DOMAIN/health

# Проверка редиректа HTTP -> HTTPS
log "🔄 Проверка редиректа HTTP -> HTTPS..."
curl -I http://$DOMAIN

log "✅ Настройка SSL и домена завершена!"
log ""
log "🌐 Доступ:"
log "- Frontend: https://$DOMAIN"
log "- Backend API: https://$DOMAIN/api"
log "- Health check: https://$DOMAIN/health"
log ""
log "🔒 SSL сертификат будет автоматически обновляться"
log "📋 Логи SSL: /var/log/letsencrypt/" 