#!/usr/bin/env python3
"""
Утилиты для работы с MPSTATS API в браузерном стиле
"""
import asyncio
import aiohttp
import logging
from datetime import datetime, timedelta
from config import MPSTATS_API_KEY

logger = logging.getLogger(__name__)

def get_mpstats_headers():
    """Возвращает правильные заголовки для MPSTATS API как в браузере"""
    return {
        "X-Mpstats-TOKEN": MPSTATS_API_KEY,
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8",
        "Referer": "https://mpstats.io/"
    }

async def mpstats_api_request(url, params=None, timeout=30, max_retries: int = 3, backoff_base: float = 1.0):
    """ Универсальная функция запросов к MPSTATS API с экспоненциальным повтором.
    Args:
        url: URL для запроса
        params: query-параметры
        timeout: таймаут одной попытки
        max_retries: сколько всего попыток сделать (включая первую)
        backoff_base: базовый интервал (сек) для экспоненциальной задержки
    Returns:
        dict | None – JSON ответа либо None при окончательной неудаче
    """
    headers = get_mpstats_headers()

    attempt = 0
    while attempt < max_retries:
        attempt += 1
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    url,
                    headers=headers,
                    params=params,
                    timeout=aiohttp.ClientTimeout(total=timeout),
                ) as response:
                    if response.status == 200:
                        try:
                            data = await response.json()
                            logger.info(f"✅ MPSTATS API успешно (attempt {attempt}): {url}")
                            return data
                        except Exception as e:
                            logger.warning(
                                f"⚠️  Ошибка JSON от MPSTATS (attempt {attempt}): {e}")
                    else:
                        # 4xx/5xx – логируем warning, не error, чтобы не спамить
                        text_preview = (await response.text())[:200]
                        logger.warning(
                            f"MPSTATS API {response.status} (attempt {attempt}): {text_preview}")
        except asyncio.TimeoutError:
            logger.warning(f"⏱️  Таймаут MPSTATS (attempt {attempt}): {url}")
        except Exception as e:
            logger.warning(f"⚠️  Ошибка запроса к MPSTATS (attempt {attempt}): {e}")

        # Если это была не последняя попытка – ждём экспоненциальную паузу
        if attempt < max_retries:
            sleep_seconds = backoff_base * 2 ** (attempt - 1)
            await asyncio.sleep(sleep_seconds)

    logger.error(f"❌ MPSTATS API неудача после {max_retries} попыток: {url}")
    return None

async def get_category_data_browser(category_path, start_date, end_date):
    """
    Получение данных по категории в браузерном стиле
    
    Args:
        category_path: Путь к категории (например, "Женщинам/Одежда")
        start_date: Дата начала (YYYY-MM-DD)
        end_date: Дата окончания (YYYY-MM-DD)
    
    Returns:
        dict: Данные категории или None
    """
    url = "https://mpstats.io/api/wb/get/category"
    params = {
        "d1": start_date,
        "d2": end_date,
        "path": category_path
    }
    
    data = await mpstats_api_request(url, params)
    if data and data.get('data'):
        logger.info(f"Получено товаров в категории {category_path}: {len(data['data'])}")
    
    return data

async def get_item_sales_browser(article, start_date, end_date):
    """
    Получение данных продаж товара в браузерном стиле
    
    Args:
        article: Артикул товара
        start_date: Дата начала (YYYY-MM-DD)
        end_date: Дата окончания (YYYY-MM-DD)
    
    Returns:
        dict: Данные продаж или None
    """
    url = f"https://mpstats.io/api/wb/get/item/{article}/sales"
    params = {
        "d1": start_date,
        "d2": end_date
    }
    
    return await mpstats_api_request(url, params)

async def get_item_info_browser(article):
    """
    Получение информации о товаре в браузерном стиле
    
    Args:
        article: Артикул товара
    
    Returns:
        dict: Информация о товаре или None
    """
    url = f"https://mpstats.io/api/wb/get/items/by/id"
    params = {"id": article}
    
    # Пробуем POST запрос (иногда API требует POST)
    headers = get_mpstats_headers()
    headers["Content-Type"] = "application/json"
    
    try:
        async with aiohttp.ClientSession() as session:
            # Сначала пробуем GET
            async with session.get(url, headers=headers, params=params) as response:
                if response.status == 200:
                    try:
                        data = await response.json()
                        logger.info(f"✅ GET успех для товара {article}")
                        return data
                    except Exception:
                        pass
            
            # Если GET не работает, пробуем POST
            async with session.post(url, headers=headers, json={"id": article}) as response:
                if response.status == 200:
                    try:
                        data = await response.json()
                        logger.info(f"✅ POST успех для товара {article}")
                        return data
                    except Exception:
                        pass
                else:
                    text = await response.text()
                    logger.error(f"❌ POST ошибка {response.status}: {text[:200]}...")
    except Exception as e:
        logger.error(f"❌ Ошибка получения информации о товаре {article}: {e}")
    
    return None

async def get_seasonality_annual_browser(category_path, period="day"):
    """
    Получение годовых данных сезонности в браузерном стиле
    
    Args:
        category_path: Путь к категории
        period: Период анализа ("day" или "week")
    
    Returns:
        dict: Данные сезонности или None
    """
    url = "https://mpstats.io/api/wb/get/ds/category/annual"
    params = {
        "path": category_path,
        "period": period
    }
    
    return await mpstats_api_request(url, params)

async def get_seasonality_weekly_browser(category_path):
    """
    Получение недельных данных сезонности в браузерном стиле
    
    Args:
        category_path: Путь к категории
    
    Returns:
        dict: Данные сезонности или None
    """
    url = "https://mpstats.io/api/wb/get/ds/category/weekly"
    params = {"path": category_path}
    
    return await mpstats_api_request(url, params)

async def search_products_browser(keyword, start_date, end_date):
    """
    Поиск товаров по ключевому слову через категории (стабильный подход)
    
    Args:
        keyword: Ключевое слово для поиска
        start_date: Дата начала (YYYY-MM-DD)
        end_date: Дата окончания (YYYY-MM-DD)
    
    Returns:
        dict: Результаты поиска или None
    """
    # Используем тот же подход что и в Oracle Queries - поиск через популярные категории
    popular_categories = [
        "Электроника",
        "Мужчинам/Одежда", 
        "Женщинам/Одежда",
        "Красота",
        "Детские товары",
        "Дом и сад",
        "Спорт",
        "Автотовары"
    ]
    
    logger.info(f"Поиск товаров по запросу '{keyword}' через категории...")
    
    found_products = []
    keyword_lower = keyword.lower()
    
    for category in popular_categories:
        try:
            category_data = await get_category_data_browser(category, start_date, end_date)
            
            if category_data and category_data.get('data'):
                # Ищем товары содержащие ключевое слово в названии
                for product in category_data['data']:
                    if isinstance(product, dict):
                        name = product.get('name', '').lower()
                        if keyword_lower in name:
                            product['found_in_category'] = category
                            found_products.append(product)
                            
                            # Ограничиваем количество найденных товаров
                            if len(found_products) >= 10:
                                break
                
                if len(found_products) >= 10:
                    break
                    
        except Exception as e:
            logger.error(f"Ошибка поиска в категории {category}: {e}")
            continue
    
    if found_products:
        result = {
            "items": found_products,
            "total": len(found_products),
            "search_method": "category_search"
        }
        logger.info(f"Найдено {len(found_products)} товаров по запросу '{keyword}'")
        return result
    else:
        logger.warning(f"Товары по запросу '{keyword}' не найдены")
        return None

def format_date_for_mpstats(date_obj):
    """
    Форматирует дату для MPSTATS API
    
    Args:
        date_obj: datetime объект
    
    Returns:
        str: Дата в формате YYYY-MM-DD
    """
    return date_obj.strftime("%Y-%m-%d")

def get_date_range_30_days():
    """
    Возвращает диапазон дат за последние 30 дней
    
    Returns:
        tuple: (start_date, end_date) в формате YYYY-MM-DD
    """
    today = datetime.now()
    month_ago = today - timedelta(days=30)
    return format_date_for_mpstats(month_ago), format_date_for_mpstats(today)

def get_date_range_month(year, month):
    """
    Возвращает диапазон дат для конкретного месяца
    
    Args:
        year: Год
        month: Месяц (1-12)
    
    Returns:
        tuple: (start_date, end_date) в формате YYYY-MM-DD
    """
    from calendar import monthrange
    
    start_date = datetime(year, month, 1)
    last_day = monthrange(year, month)[1]
    end_date = datetime(year, month, last_day)
    
    return format_date_for_mpstats(start_date), format_date_for_mpstats(end_date) 