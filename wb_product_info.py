import logging
import json
import requests
import asyncio
from datetime import datetime, timedelta
from functools import lru_cache

# Настройка логирования
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

from mpstats_browser_utils import get_item_sales_browser  # type: ignore

# Простейший in-memory cache на 10 минут
_CACHE: dict[str, tuple[float, dict]] = {}
_CACHE_TTL = 600  # сек

async def get_wb_product_info(article):
    """Получает информацию о товаре через API Wildberries + MPSTATS.
    Добавлены:
    • Кэш на 10 минут
    • Подтягивание продаж из MPSTATS, если WB не даёт данных
    • Fallback к card.json для sellability (history sales можно расширить)
    • Корректный расчёт скидки через цены
    """

    # ---------- CACHE ----------
    cached = _CACHE.get(str(article))
    if cached and (datetime.utcnow().timestamp() - cached[0] < _CACHE_TTL):
        logger.info(f"Return product info from cache for {article}")
        return cached[1]

    try:
        logger.info(f"Getting product info for article {article}")
        
        # API для получения цен и основной информации
        price_url = f"https://card.wb.ru/cards/v1/detail?appType=1&curr=rub&dest=-1257786&spp=27&nm={article}&locale=ru&lang=ru"
        logger.info(f"Making request to price API: {price_url}")
        
        headers = {
            'Accept': '*/*',
            'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
            'Connection': 'keep-alive',
            'Origin': 'https://www.wildberries.ru',
            'Referer': f'https://www.wildberries.ru/catalog/{article}/detail.aspx',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        }
        
        price_response = requests.get(price_url, headers=headers, timeout=10)
        logger.info(f"Price API response status: {price_response.status_code}")
        
        product_data = None
        if price_response.status_code == 200:
            price_data = price_response.json()
            logger.info(f"Price API response data: {json.dumps(price_data, indent=2)}")
            
            if price_data.get('data', {}).get('products'):
                product_data = price_data['data']['products'][0]
                logger.info(f"Found product: {product_data.get('name')}")
        else:
            logger.warning(f"WB API returned {price_response.status_code}, will try MPStats fallback")
        
        # Если WB API не дал данных, создаем базовую структуру для MPStats
        if not product_data:
            logger.info(f"Creating fallback structure for MPStats data for article {article}")
            product_data = {
                'name': f'Товар {article}',
                'brand': 'Неизвестный бренд',
                'salePriceU': 0,
                'priceU': 0,
                'rating': 0,
                'feedbacks': 0,
                'sizes': []
            }
        
        # Подсчитываем общее количество товара на складах
        total_stock = 0
        stocks_by_size = {}
        
        for size in product_data.get('sizes', []):
            size_name = size.get('name', 'Unknown')
            size_stock = sum(stock.get('qty', 0) for stock in size.get('stocks', []))
            stocks_by_size[size_name] = size_stock
            total_stock += size_stock
        
        # API для получения статистики продаж
        sales_today = 0
        total_sales = 0
        
        # Пробуем получить статистику через API статистики продавца
        stats_url = f"https://catalog.wb.ru/sellers/v1/analytics-data?nm={article}"
        try:
            logger.info(f"Making request to seller stats API: {stats_url}")
            stats_response = requests.get(stats_url, headers=headers, timeout=10)
            logger.info(f"Seller stats API response status: {stats_response.status_code}")
            
            if stats_response.status_code == 200:
                stats_data = stats_response.json()
                logger.info(f"Seller stats API response data: {json.dumps(stats_data, indent=2)}")
                
                if 'data' in stats_data:
                    for stat in stats_data['data']:
                        if str(stat.get('nmId')) == str(article):
                            sales_today = stat.get('sales', {}).get('today', 0)
                            total_sales = stat.get('sales', {}).get('total', 0)
                            break
        except Exception as e:
            logger.error(f"Error getting seller stats: {str(e)}")
        
        # Если не получили данные через статистику продавца, пробуем через API заказов
        if sales_today == 0:
            orders_url = f"https://catalog.wb.ru/sellers/v1/orders-data?nm={article}"
            try:
                logger.info(f"Making request to orders API: {orders_url}")
                orders_response = requests.get(orders_url, headers=headers, timeout=10)
                logger.info(f"Orders API response status: {orders_response.status_code}")
                
                if orders_response.status_code == 200:
                    orders_data = orders_response.json()
                    logger.info(f"Orders API response data: {json.dumps(orders_data, indent=2)}")
                    
                    if 'data' in orders_data:
                        for order in orders_data['data']:
                            if str(order.get('nmId')) == str(article):
                                sales_today = order.get('ordersToday', 0)
                                total_sales = order.get('ordersTotal', 0)
                                break
            except Exception as e:
                logger.error(f"Error getting orders data: {str(e)}")
        
        # Если все еще нет данных, пробуем через старый API
        if sales_today == 0:
            old_sales_url = f"https://product-order-qnt.wildberries.ru/by-nm/?nm={article}"
            try:
                logger.info(f"Making request to old sales API: {old_sales_url}")
                old_sales_response = requests.get(old_sales_url, headers=headers, timeout=10)
                logger.info(f"Old sales API response status: {old_sales_response.status_code}")
                
                if old_sales_response.status_code == 200:
                    old_sales_data = old_sales_response.json()
                    logger.info(f"Old sales API response data: {json.dumps(old_sales_data, indent=2)}")
                    
                    # Обработка как списка
                    if isinstance(old_sales_data, list):
                        for item in old_sales_data:
                            if str(item.get('nmId')) == str(article):
                                sales_today = item.get('qnt', 0)
                                break
                    # Обработка как словаря
                    elif isinstance(old_sales_data, dict):
                        sales_today = old_sales_data.get(str(article), {}).get('qnt', 0)
            except Exception as e:
                logger.error(f"Error getting old sales data: {str(e)}")
        
        # Рассчитываем примерную выручку и прибыль
        current_price = product_data.get('salePriceU', 0) / 100
        
        # Рассчитываем выручку
        daily_revenue = sales_today * current_price
        weekly_revenue = daily_revenue * 7
        monthly_revenue = daily_revenue * 30
        total_revenue = total_sales * current_price
        
        # Рассчитываем прибыль (приблизительно 85% от выручки)
        profit_margin = 0.85
        daily_profit = daily_revenue * profit_margin
        weekly_profit = weekly_revenue * profit_margin
        monthly_profit = monthly_revenue * profit_margin
        
        # Собираем все данные
        original_price = product_data.get('priceU', 0) / 100
        
        # Рассчитываем скидку корректно
        discount_percent = 0
        if original_price > 0 and current_price > 0:
            discount_percent = round((1 - current_price / original_price) * 100)

        # Формируем базовый результат
        result = {
            'name': product_data.get('name', ''),
            'brand': product_data.get('brand', ''),
            'price': {
                'current': current_price,
                'original': original_price,
                'discount': discount_percent
            },
            'rating': product_data.get('rating', 0),
            'feedbacks': product_data.get('feedbacks', 0),
            'stocks': {
                'total': total_stock,
                'by_size': stocks_by_size
            },
            'sales': {
                'today': sales_today,
                'total': total_sales or product_data.get('ordersCount', 0) or product_data.get('salesPerMonth', 0) or 0,
                'revenue': {
                    'daily': daily_revenue,
                    'weekly': weekly_revenue,
                    'monthly': monthly_revenue,
                    'total': total_revenue
                },
                'profit': {
                    'daily': daily_profit,
                    'weekly': weekly_profit,
                    'monthly': monthly_profit
                }
            }
        }

        # ---------- MPSTATS fallback ----------
        if total_sales == 0:
            try:
                logger.info(f"Trying MPStats fallback for article {article}")
                today = datetime.utcnow().date()
                d2 = today.strftime("%Y-%m-%d")
                d1 = (today - timedelta(days=30)).strftime("%Y-%m-%d")
                sales_data = await get_item_sales_browser(article, d1, d2)
                
                if sales_data and isinstance(sales_data, list) and len(sales_data) > 0:
                    # суммируем продажи за 30 дней
                    total_sales = sum(day.get("sales", 0) for day in sales_data if day.get("sales"))
                    # продажи today – последняя точка
                    sales_today = sales_data[-1].get("sales", 0) if sales_data else 0
                    
                    # Если есть данные о продажах, попробуем получить актуальную цену из нескольких источников
                    if total_sales > 0 and current_price == 0:
                        logger.info(f"Product has {total_sales} sales but price is 0, trying alternative price sources")
                        
                        # Источник 1: card.json
                        try:
                            vol = int(article) // 100000
                            part = int(article) // 1000
                            card_url = f"https://static-basket-01.wb.ru/vol{vol}/part{part}/{article}/info/ru/card.json"
                            resp = requests.get(card_url, timeout=10)
                            if resp.status_code == 200:
                                card_json = resp.json()
                                if card_json.get('options'):
                                    option = card_json['options'][0]
                                    current_price = option.get('price', 0) / 100 if option.get('price') else 0
                                    logger.info(f"Got price from card.json: {current_price}")
                                    
                                # Обновляем название товара если получили
                                if card_json.get('imt_name'):
                                    result['name'] = card_json['imt_name']
                                if card_json.get('selling', {}).get('brand_name'):
                                    result['brand'] = card_json['selling']['brand_name']
                        except Exception as e:
                            logger.warning(f"Could not get price from card.json: {e}")
                        
                        # Источник 2: Альтернативный WB API если цена все еще 0
                        if current_price == 0:
                            try:
                                alt_url = f"https://card.wb.ru/cards/detail?curr=rub&dest=-1257786&regions=80,64,83,4,38,33,70,82,69,30,86,75,40,1,66,48,110,31,22,71,114&nm={article}"
                                alt_response = requests.get(alt_url, headers=headers, timeout=10)
                                if alt_response.status_code == 200:
                                    alt_data = alt_response.json()
                                    if alt_data.get('data', {}).get('products'):
                                        alt_product = alt_data['data']['products'][0]
                                        current_price = alt_product.get('salePriceU', 0) / 100 or alt_product.get('priceU', 0) / 100
                                        if current_price > 0:
                                            logger.info(f"Got price from alternative WB API: {current_price}")
                                            
                                            # Обновляем основные данные если получили лучшую информацию
                                            if alt_product.get('name'):
                                                result['name'] = alt_product['name']
                                            if alt_product.get('brand'):
                                                result['brand'] = alt_product['brand']
                            except Exception as e:
                                logger.warning(f"Could not get price from alternative WB API: {e}")
                        
                        # Источник 3: Оценка по revenue от MPStats если цена все еще 0
                        if current_price == 0 and total_sales > 0:
                            try:
                                # Если у нас есть данные о продажах с revenue, можем оценить цену
                                total_revenue_mpstats = sum(day.get("revenue", 0) for day in sales_data if day.get("revenue"))
                                if total_revenue_mpstats > 0:
                                    estimated_price = total_revenue_mpstats / total_sales
                                    current_price = estimated_price
                                    logger.info(f"Estimated price from MPStats revenue: {current_price}")
                            except Exception as e:
                                logger.warning(f"Could not estimate price from MPStats revenue: {e}")
                        
                        # Источник 4: Минимальная разумная цена если все еще 0 но есть продажи
                        if current_price == 0 and total_sales > 0:
                            current_price = 100.0  # Минимальная разумная цена для товара с продажами
                            logger.info(f"Using minimum reasonable price: {current_price}")
                    
                    # Обновляем цену в основной структуре данных
                    if current_price > 0:
                        result['price']['current'] = current_price
                        # Если оригинальная цена также 0, устанавливаем её чуть выше текущей
                        if result['price']['original'] == 0:
                            result['price']['original'] = current_price * 1.2  # Предполагаем 20% скидку
                            result['price']['discount'] = 17  # Примерная скидка
                    
                    # Рассчитываем выручку с обновленной ценой
                    total_revenue = total_sales * current_price
                    daily_revenue = sales_today * current_price
                    weekly_revenue = (sum(day.get("sales", 0) for day in sales_data[-7:] if day.get("sales"))) * current_price
                    monthly_revenue = total_revenue
                    
                    logger.info(f"MPStats success: total_sales={total_sales}, today={sales_today}, price={current_price}")
                    
                    # Обновляем result
                    result['sales']['today'] = sales_today
                    result['sales']['total'] = total_sales
                    result['sales']['revenue']['daily'] = daily_revenue
                    result['sales']['revenue']['weekly'] = weekly_revenue
                    result['sales']['revenue']['monthly'] = monthly_revenue
                    result['sales']['revenue']['total'] = total_revenue
                    result['sales']['profit']['daily'] = daily_revenue * profit_margin
                    result['sales']['profit']['weekly'] = weekly_revenue * profit_margin
                    result['sales']['profit']['monthly'] = monthly_revenue * profit_margin
                    result['price']['current'] = current_price
                else:
                    logger.warning(f"MPStats returned no sales data for {article}")
            except Exception as e:
                logger.warning(f"Could not fetch MPSTATS sales for {article}: {e}")

        # ---------- card.json Fallback for extra fields ----------
        try:
            vol = int(article) // 100000
            part = int(article) // 1000
            card_url = f"https://static-basket-01.wb.ru/vol{vol}/part{part}/{article}/info/ru/card.json"
            resp = requests.get(card_url, timeout=10)
            if resp.status_code == 200:
                card_json = resp.json()
                # В card.json есть, например, "sellability", "supplierId" – можно сохранить при необходимости
                sellability = card_json.get("sellability")
                if sellability is not None:
                    # добавляем в результат
                    extra = result.setdefault("extra", {})
                    extra["sellability"] = sellability
        except Exception as e:
            logger.debug(f"card.json not fetched for {article}: {e}")

        # сохраняем результат в кэш
        _CACHE[str(article)] = (datetime.utcnow().timestamp(), result)

        logger.info(f"Final product info: {json.dumps(result, indent=2)}")
        return result
        
    except Exception as e:
        logger.error(f"Error getting WB product info: {str(e)}", exc_info=True)
        return None 