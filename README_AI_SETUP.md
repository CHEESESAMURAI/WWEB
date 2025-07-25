# 🤖 ИНСТРУКЦИЯ ПО НАСТРОЙКЕ AI HELPER

## 🎯 Что нового?
Бот теперь поддерживает **реальную генерацию контента** через OpenAI GPT-4o-mini!

## ⚙️ Настройка OpenAI API

### 1. Получение API ключа
1. Перейдите на [platform.openai.com](https://platform.openai.com)
2. Зарегистрируйтесь или войдите в аккаунт
3. Перейдите в **API Keys** → **Create new secret key**
4. Скопируйте полученный ключ (начинается с `sk-proj-...`)

### 2. Пополнение баланса
1. В левом меню выберите **Billing**
2. Добавьте платежный метод
3. Пополните баланс на **$5-10** (хватит на тысячи запросов)

### 3. Настройка бота
В файле `new_bot.py` найдите строку:
```python
OPENAI_API_KEY = "sk-YOUR_KEY_HERE"  # Замените на ваш OpenAI ключ
```

Замените `sk-YOUR_KEY_HERE` на ваш реальный ключ:
```python
OPENAI_API_KEY = "sk-proj-ваш-ключ-здесь"  # Ваш OpenAI ключ
```

## 🎨 Возможности AI Helper

### 8 типов контента:
1. **📝 Описания товаров** - продающие тексты для карточек
2. **🏷️ Карточки товаров** - полное оформление со всеми деталями
3. **💰 Продающие тексты** - по формуле AIDA
4. **📢 Рекламные объявления** - для таргетированной рекламы
5. **📱 Посты для соцсетей** - с хештегами и призывами
6. **📧 Email-рассылки** - персонализированные письма
7. **🌐 Лендинги** - структура посадочных страниц
8. **🔍 SEO-контент** - оптимизированные тексты

### Специальные промпты:
- ✅ Оптимизированы для **Wildberries маркетплейса**
- ✅ Учитывают специфику российского рынка
- ✅ Генерируют **профессиональный контент**
- ✅ Включают **SEO-оптимизацию**

## 💰 Стоимость

- **В боте:** 20₽ за генерацию (списывается с баланса)
- **OpenAI:** ~$0.01-0.03 за запрос (очень дешево!)
- **Модель:** GPT-4o-mini (экономичная версия GPT-4)

## 🛡️ Система Fallback

Если OpenAI недоступен или закончились средства:
- ✅ Бот автоматически переключается на **качественные шаблоны**
- ✅ Показывает **понятные сообщения** об ошибке
- ✅ Дает **инструкции по решению** проблемы

## 🚀 Как использовать

1. Запустите бота: `/start`
2. Выберите **🤖 Помощь с нейронкой**
3. Выберите **тип контента**
4. Опишите **детально** что нужно создать
5. Получите **профессиональный контент**!

## ⚠️ Безопасность

**НИКОГДА не загружайте реальный API ключ на GitHub!**
- Храните ключ только локально
- Используйте переменные окружения для продакшена
- Следите за расходами в OpenAI Dashboard

## 🆘 Поддержка

Если возникли проблемы:
1. Проверьте баланс на OpenAI
2. Убедитесь что ключ скопирован правильно
3. Проверьте логи бота на наличие ошибок

---

**🎉 Теперь ваш бот умеет создавать профессиональный контент с помощью нейросети!** 