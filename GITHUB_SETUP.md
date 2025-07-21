# 🔐 Настройка GitHub аутентификации

## Создание Personal Access Token

1. **Перейдите на GitHub**: https://github.com/settings/tokens

2. **Создайте новый токен**:
   - Нажмите "Generate new token (classic)"
   - Выберите "Generate new token (classic)"
   - Введите описание: "WWEB Repository Access"
   - Выберите срок действия (рекомендуется 90 дней)
   - Выберите права доступа:
     - ✅ `repo` (полный доступ к репозиториям)
     - ✅ `workflow` (если планируете использовать GitHub Actions)

3. **Скопируйте токен** и сохраните его в безопасном месте

## Настройка Git для использования токена

### Вариант 1: Настройка через Git Credential Manager
```bash
# Настройка учетных данных
git config --global credential.helper store

# При следующем push введите:
# Username: ваш_github_username
# Password: ваш_personal_access_token
```

### Вариант 2: Использование токена в URL
```bash
# Изменить remote URL для использования токена
git remote set-url origin https://YOUR_TOKEN@github.com/CHEESESAMURAI/WWEB.git

# Пример:
git remote set-url origin https://ghp_xxxxxxxxxxxxxxxx@github.com/CHEESESAMURAI/WWEB.git
```

### Вариант 3: Настройка через SSH (рекомендуется)
```bash
# 1. Генерация SSH ключа
ssh-keygen -t ed25519 -C "your_email@example.com"

# 2. Добавление ключа в ssh-agent
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# 3. Копирование публичного ключа
cat ~/.ssh/id_ed25519.pub

# 4. Добавление ключа в GitHub:
# - Перейдите в Settings > SSH and GPG keys
# - Нажмите "New SSH key"
# - Вставьте скопированный ключ

# 5. Изменение remote URL на SSH
git remote set-url origin git@github.com:CHEESESAMURAI/WWEB.git
```

## Проверка подключения

```bash
# Проверка remote URL
git remote -v

# Тест подключения (для HTTPS)
git ls-remote origin

# Тест подключения (для SSH)
ssh -T git@github.com
```

## Отправка кода в репозиторий

После настройки аутентификации:

```bash
# Отправка в новый репозиторий
git push -u origin main

# Проверка статуса
git status
```

## 🔒 Безопасность

- **Никогда не коммитьте токены в код**
- **Используйте переменные окружения для токенов**
- **Регулярно обновляйте токены**
- **Используйте минимально необходимые права доступа**

## 🛠️ Устранение проблем

### Ошибка "Authentication failed"
1. Проверьте правильность токена
2. Убедитесь, что токен не истек
3. Проверьте права доступа токена

### Ошибка "Permission denied"
1. Проверьте права доступа к репозиторию
2. Убедитесь, что репозиторий существует
3. Проверьте настройки SSH ключей

### Ошибка "Repository not found"
1. Проверьте правильность URL репозитория
2. Убедитесь, что репозиторий создан на GitHub
3. Проверьте права доступа к репозиторию 