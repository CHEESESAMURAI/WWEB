# 🔗 РУКОВОДСТВО ПО ИНТЕГРАЦИИ С MPSTATS API

## 🎯 **Цель интеграции**

Система анализа бренда теперь работает **исключительно с реальными данными** из MPStats API. Демо-данные полностью удалены для обеспечения точности аналитики.

---

## 🔑 **Настройка MPStats API Token**

### **1. Получение токена**
- Зарегистрируйтесь на [https://mpstats.io](https://mpstats.io)
- Получите API токен в личном кабинете
- Токен имеет формат: `mp_xxx...` или аналогичный

### **2. Установка токена в системе**

#### **Метод 1: Переменная окружения (рекомендуется)**
```bash
export MPSTATS_TOKEN="your-real-mpstats-token-here"
python main.py
```

#### **Метод 2: В коде (для разработки)**
```python
# В файле web-dashboard/backend/routes/brand_analysis.py
headers = {
    "X-Mpstats-TOKEN": "your-real-mpstats-token-here",
    "Content-Type": "application/json"
}
```

#### **Метод 3: .env файл (продакшн)**
```bash
# Создайте файл .env в директории backend/
echo "MPSTATS_TOKEN=your-real-mpstats-token-here" > .env
```

---

## 📊 **API Endpoints MPStats**

### **Основной endpoint для анализа бренда:**
```
GET https://mpstats.io/api/wb/get/brand
```

### **Параметры запроса:**
| Параметр | Описание | Пример |
|----------|----------|---------|
| `d1` | Начальная дата | `2023-10-01` |
| `d2` | Конечная дата | `2023-11-01` |
| `path` | Название бренда | `Mango` |
| `fbs` | Фильтр FBS (0/1) | `0` |
| `newsmode` | Новинки (0/7/14/30) | `30` |

### **Заголовки:**
```json
{
  "X-Mpstats-TOKEN": "your-token-here",
  "Content-Type": "application/json"
}
```

---

## 🏗️ **Структура данных MPStats**

### **Ответ API:**
```json
{
  "d1": "2023-10-01",
  "d2": "2023-11-01",
  "data": [
    {
      "id": "123456789",
      "name": "Товар Example",
      "category": "Категория/Подкатегория",
      "final_price": 2500,
      "rating": 4.5,
      "sales": 150,
      "revenue": 375000,
      "balance": 200,
      "purchase": 85,
      "turnover_days": 30,
      "comments": 45,
      "sku_first_date": "2023-09-01",
      "url": "https://wildberries.ru/catalog/123456789/detail.aspx",
      "thumb_middle": "//images.wildberries.ru/tm/new/1234/123456789-1.jpg",
      
      "basic_sale": 15,
      "promo_sale": 5,
      "client_sale": 20,
      "start_price": 3000,
      "basic_price": 2800,
      "client_price": 2500,
      "category_position": 12,
      "country": "Турция",
      "gender": "женский",
      "picscount": 6,
      "hasvideo": true,
      "has3d": false,
      "is_fbs": true,
      
      "graph": [10, 15, 12, 18, 20, ...],
      "stocks_graph": [200, 190, 185, 180, ...],
      "price_graph": [2500, 2450, 2500, 2500, ...],
      "product_visibility_graph": [85, 90, 88, 92, ...]
    }
  ]
}
```

---

## 🔧 **Обработка ошибок**

### **Коды ошибок и их обработка:**

#### **401 Unauthorized**
```json
{"code": 401, "message": "Authorization Required"}
```
**Решение:** Проверьте корректность API токена

#### **404 Not Found**
```json
{"code": 404, "message": "Brand not found"}
```
**Решение:** Проверьте правильность названия бренда

#### **408 Timeout**
**Причина:** MPStats API недоступен
**Решение:** Повторите запрос позже

#### **500 Internal Server Error**
**Причина:** Ошибка на стороне MPStats
**Решение:** Обратитесь в поддержку MPStats

---

## 🎯 **Тестирование интеграции**

### **1. Проверка токена**
```bash
curl -H "X-Mpstats-TOKEN: your-token" \
     "https://mpstats.io/api/wb/get/brand?d1=2023-10-01&d2=2023-11-01&path=Mango"
```

### **2. Тест через систему**
```bash
curl -X POST "http://localhost:8000/brand/brand-analysis" \
  -H "Content-Type: application/json" \
  -d '{
    "brand_name": "Mango",
    "date_from": "2023-10-01",
    "date_to": "2023-11-01",
    "fbs": 0,
    "newsmode": 30
  }'
```

### **3. Ожидаемые результаты**
✅ **Успех (200):** Полные данные бренда с товарами и графиками
❌ **Ошибка (401):** "MPStats API authorization failed"
❌ **Ошибка (404):** "Brand 'BrandName' not found"

---

## 📋 **Популярные бренды для тестирования**

### **Известные бренды на Wildberries:**
- `Mango`
- `Zara`
- `H&M`
- `Adidas`
- `Nike`
- `LC Waikiki`
- `Gloria Jeans`
- `Твое`
- `Befree`
- `O'stin`

---

## ⚙️ **Производственная настройка**

### **1. Переменные окружения**
```bash
# В production используйте:
export MPSTATS_TOKEN="prod-token-here"
export ENVIRONMENT="production"
```

### **2. Логирование**
```python
# Все запросы к MPStats API логируются:
logger.info(f"🚀 Fetching brand data for {brand_name}")
logger.info(f"📊 MPStats brand response: {response.status}")
```

### **3. Кэширование (будущая версия)**
```python
# Планируется добавить:
# - Redis кэш для повторных запросов
# - TTL = 1 час для одинаковых параметров
# - Уменьшение нагрузки на MPStats API
```

---

## 🚨 **Важные моменты**

### **1. Демо-данные удалены**
- ❌ Система **НЕ генерирует** фальшивые данные
- ✅ Только **реальные данные** из MPStats API
- ⚠️ При ошибке API - четкое сообщение об ошибке

### **2. Валидация данных**
- Проверка наличия товаров в ответе
- Валидация структуры данных через Pydantic
- Graceful обработка отсутствующих полей

### **3. Производительность**
- Timeout запросов: 30 секунд
- Асинхронная обработка через aiohttp
- Детальное логирование для отладки

---

## 📊 **Результат интеграции**

### **При успешном запросе:**
```json
{
  "brand_info": {
    "name": "Mango",
    "total_products": 45,
    "total_revenue": 12500000,
    "total_sales": 2850,
    "average_price": 4385.50,
    "average_turnover_days": 28.5
  },
  "top_products": [...],
  "all_products": [...],
  "aggregated_charts": {
    "sales_graph": {"dates": [...], "values": [...]},
    "stocks_graph": {"dates": [...], "values": [...]},
    "price_graph": {"dates": [...], "values": [...]},
    "visibility_graph": {"dates": [...], "values": [...]}
  },
  "brand_metrics": {
    "products_with_sales_percentage": 82.2,
    "average_rating": 4.3,
    "total_comments": 1250,
    "fbs_percentage": 67.8
  },
  "metadata": {
    "data_source": "MPStats API",
    "processing_timestamp": "2025-07-19T13:45:00"
  }
}
```

### **При ошибке:**
```json
{
  "detail": "Brand 'UnknownBrand' not found. Please check the brand name and try again."
}
```

---

## 🎉 **Готовность системы**

### ✅ **Готовые компоненты:**
- Backend API с MPStats интеграцией
- Frontend с обработкой ошибок
- Pydantic валидация данных
- Детальное логирование
- Graceful error handling

### 🔧 **Для запуска требуется:**
1. Действующий MPStats API токен
2. Установка токена в переменную `MPSTATS_TOKEN`
3. Перезапуск backend сервера

### 🎯 **Результат:**
**Полностью функциональная система анализа брендов с реальными данными MPStats!** 