#!/bin/bash

echo "🔍 Мониторинг и тестирование Wild Analytics..."

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

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Функция для проверки статуса
check_status() {
    local service=$1
    local url=$2
    local description=$3
    
    log "🔍 Проверка $description..."
    if curl -s -f "$url" > /dev/null; then
        log "✅ $description работает"
        return 0
    else
        error "❌ $description не отвечает"
        return 1
    fi
}

# Функция для тестирования производительности
test_performance() {
    local url=$1
    local description=$2
    
    log "⚡ Тестирование производительности $description..."
    
    # Тест с Apache Bench
    if command -v ab &> /dev/null; then
        log "📊 Apache Bench тест (10 запросов, 2 параллельных):"
        ab -n 10 -c 2 "$url" 2>/dev/null | grep -E "(Requests per second|Time per request|Failed requests)"
    else
        warn "Apache Bench не установлен. Установите: apt install apache2-utils"
    fi
    
    # Простой тест времени ответа
    local start_time=$(date +%s%N)
    curl -s "$url" > /dev/null
    local end_time=$(date +%s%N)
    local response_time=$(( (end_time - start_time) / 1000000 ))
    log "⏱️ Время ответа: ${response_time}ms"
}

# Переходим в директорию проекта
cd /opt/wild-analytics

log "🚀 Начало мониторинга и тестирования..."

# Проверка статуса контейнеров
log "🐳 Проверка статуса Docker контейнеров..."
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Проверка использования ресурсов
log "💾 Проверка использования ресурсов..."
echo "CPU и память:"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"

echo "Дисковое пространство:"
df -h /opt/wild-analytics

# Проверка логов
log "📝 Проверка логов..."
echo "Последние логи backend:"
docker-compose -f docker-compose.prod.yml logs --tail=10 backend

echo "Последние логи frontend:"
docker-compose -f docker-compose.prod.yml logs --tail=10 frontend

echo "Последние логи nginx:"
docker-compose -f docker-compose.prod.yml logs --tail=10 nginx

# Проверка базы данных
log "🗄️ Проверка базы данных..."
if docker exec wild-analytics-postgres pg_isready -U wild_analytics > /dev/null 2>&1; then
    log "✅ PostgreSQL работает"
    
    # Проверка размера базы данных
    local db_size=$(docker exec wild-analytics-postgres psql -U wild_analytics -d wild_analytics -t -c "SELECT pg_size_pretty(pg_database_size('wild_analytics'));" 2>/dev/null | xargs)
    log "📊 Размер базы данных: $db_size"
    
    # Проверка количества записей
    local user_count=$(docker exec wild-analytics-postgres psql -U wild_analytics -d wild_analytics -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | xargs)
    log "👥 Количество пользователей: $user_count"
    
    local analysis_count=$(docker exec wild-analytics-postgres psql -U wild_analytics -d wild_analytics -t -c "SELECT COUNT(*) FROM analyses;" 2>/dev/null | xargs)
    log "📊 Количество анализов: $analysis_count"
else
    error "❌ PostgreSQL не отвечает"
fi

# Проверка сетевых портов
log "🌐 Проверка сетевых портов..."
netstat -tlnp | grep -E "(3000|8000|80|443)"

# Проверка SSL сертификата (если есть домен)
if [ -f "/etc/letsencrypt/live/$(hostname)/fullchain.pem" ]; then
    log "🔒 Проверка SSL сертификата..."
    local cert_expiry=$(openssl x509 -enddate -noout -in /etc/letsencrypt/live/$(hostname)/fullchain.pem | cut -d= -f2)
    log "📅 Сертификат действителен до: $cert_expiry"
fi

# Проверка бэкапов
log "💾 Проверка бэкапов..."
local backup_count=$(find /opt/wild-analytics/backups -name "*.sql" -o -name "*.tar.gz" | wc -l)
log "📦 Количество бэкапов: $backup_count"

if [ $backup_count -gt 0 ]; then
    local latest_backup=$(find /opt/wild-analytics/backups -name "*.sql" -o -name "*.tar.gz" -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)
    log "🕒 Последний бэкап: $latest_backup"
fi

# Тестирование API эндпоинтов
log "🔗 Тестирование API эндпоинтов..."

# Определяем базовый URL
if [ -f "/etc/letsencrypt/live/$(hostname)/fullchain.pem" ]; then
    BASE_URL="https://$(hostname)"
else
    BASE_URL="http://93.127.214.183:8000"
fi

# Тестирование основных эндпоинтов
check_status "health" "$BASE_URL/health" "Health check"
check_status "root" "$BASE_URL/" "Root endpoint"

# Тестирование производительности
test_performance "$BASE_URL/health" "Health endpoint"

# Проверка frontend
log "🌐 Проверка frontend..."
if [ -f "/etc/letsencrypt/live/$(hostname)/fullchain.pem" ]; then
    FRONTEND_URL="https://$(hostname)"
else
    FRONTEND_URL="http://93.127.214.183:3000"
fi

check_status "frontend" "$FRONTEND_URL" "Frontend"
test_performance "$FRONTEND_URL" "Frontend"

# Проверка безопасности
log "🛡️ Проверка безопасности..."

# Проверка UFW
if ufw status | grep -q "Status: active"; then
    log "✅ UFW Firewall активен"
else
    warn "⚠️ UFW Firewall не активен"
fi

# Проверка Fail2Ban
if systemctl is-active --quiet fail2ban; then
    log "✅ Fail2Ban активен"
else
    warn "⚠️ Fail2Ban не активен"
fi

# Проверка SSH конфигурации
if grep -q "PermitRootLogin no" /etc/ssh/sshd_config; then
    log "✅ Root login отключен"
else
    warn "⚠️ Root login включен"
fi

# Проверка обновлений системы
log "📦 Проверка обновлений системы..."
local updates_available=$(apt list --upgradable 2>/dev/null | wc -l)
if [ $updates_available -gt 1 ]; then
    warn "⚠️ Доступно обновлений: $((updates_available - 1))"
else
    log "✅ Система обновлена"
fi

# Создание отчета
log "📋 Создание отчета..."
cat > monitoring_report.txt << EOF
# Wild Analytics - Отчет мониторинга
Дата: $(date)

## Статус сервисов
$(docker ps --format "table {{.Names}}\t{{.Status}}")

## Использование ресурсов
$(docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}")

## Дисковое пространство
$(df -h /opt/wild-analytics)

## База данных
- Статус: $(docker exec wild-analytics-postgres pg_isready -U wild_analytics > /dev/null 2>&1 && echo "OK" || echo "ERROR")
- Размер: $(docker exec wild-analytics-postgres psql -U wild_analytics -d wild_analytics -t -c "SELECT pg_size_pretty(pg_database_size('wild_analytics'));" 2>/dev/null | xargs)
- Пользователи: $(docker exec wild-analytics-postgres psql -U wild_analytics -d wild_analytics -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | xargs)
- Анализы: $(docker exec wild-analytics-postgres psql -U wild_analytics -d wild_analytics -t -c "SELECT COUNT(*) FROM analyses;" 2>/dev/null | xargs)

## Бэкапы
- Количество: $backup_count
- Последний: $latest_backup

## Безопасность
- UFW: $(ufw status | grep "Status" | cut -d' ' -f2)
- Fail2Ban: $(systemctl is-active fail2ban)
- Root SSH: $(grep "PermitRootLogin" /etc/ssh/sshd_config | cut -d' ' -f2)

## Доступ
- Frontend: $FRONTEND_URL
- Backend: $BASE_URL
- Health: $BASE_URL/health
EOF

log "✅ Мониторинг завершен!"
log "📋 Отчет сохранен в: /opt/wild-analytics/monitoring_report.txt"

# Рекомендации
log ""
log "💡 Рекомендации:"
if [ $updates_available -gt 1 ]; then
    log "  - Обновите систему: apt update && apt upgrade"
fi
if ! ufw status | grep -q "Status: active"; then
    log "  - Включите UFW: ufw enable"
fi
if ! systemctl is-active --quiet fail2ban; then
    log "  - Включите Fail2Ban: systemctl start fail2ban"
fi
if [ $backup_count -eq 0 ]; then
    log "  - Создайте первый бэкап: ./backup.sh"
fi

log ""
log "🔍 Для детального анализа используйте:"
log "  - Логи: docker-compose -f docker-compose.prod.yml logs"
log "  - Статус: systemctl status wild-analytics"
log "  - Мониторинг: htop, iotop, nethogs" 