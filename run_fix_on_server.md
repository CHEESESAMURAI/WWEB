# 🔧 Запустите исправление на сервере

Подключитесь к серверу и выполните:

```bash
ssh root@93.127.214.183
cd /opt/wild-analytics

# Скачайте и запустите скрипт исправления
curl -o fix_registration_error.sh https://raw.githubusercontent.com/CHEESESAMURAI/WWEB/main/fix_registration_error.sh
chmod +x fix_registration_error.sh
./fix_registration_error.sh
```

## Что исправит скрипт:

1. ✅ **Правильная обработка паролей** с bcrypt
2. ✅ **Корректные API ответы** вместо object Object
3. ✅ **Детальное логирование** для отладки
4. ✅ **Исправление базы данных** SQLite
5. ✅ **Обновление frontend** API сервиса

## После запуска:

- Регистрация будет работать корректно
- Вход с test@example.com / password123 
- Все ошибки будут отображаться нормально
- Можно создавать новых пользователей

## Проверка:

1. Откройте http://93.127.214.183:3000/register
2. Зарегистрируйте нового пользователя
3. Войдите с test@example.com / password123

## Если нужна помощь:

```bash
# Проверить логи
docker logs wild-analytics-backend --tail=20

# Проверить статус
docker ps

# Перезапустить
docker-compose restart
``` 