"""
🔧 Test MPStats /get/in_similar endpoint
Testing the exact endpoint and parameters mentioned by the user
"""

import asyncio
import aiohttp
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional

# Настройка логирования
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# MPStats API ключ
MPSTATS_API_KEY = "68431d2ac72ea4.96910328a56006b24a55daf65db03835d5fe5b4d"

async def test_in_similar_endpoint():
    """
    Тестирует endpoint /get/in_similar с параметрами из примера пользователя
    """
    # Параметры из примера пользователя
    url = "https://mpstats.io/api/wb/get/in_similar"
    
    today = datetime.now()
    d2 = today.strftime("%Y-%m-%d")
    d1 = (today - timedelta(days=30)).strftime("%Y-%m-%d")
    
    params = {
        "path": "/Для женщин/Одежда/Платья",  # Путь категории
        "d1": d1,  # Дата начала
        "d2": d2,  # Дата конца  
        "fbs": 0   # FBS параметр (0 или 1)
    }
    
    headers = {
        "X-Mpstats-TOKEN": MPSTATS_API_KEY,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
    
    logger.info(f"🔍 Testing /get/in_similar endpoint")
    logger.info(f"URL: {url}")
    logger.info(f"Params: {params}")
    logger.info(f"Headers: {headers}")
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers, params=params, timeout=30) as response:
                status = response.status
                response_text = await response.text()
                
                logger.info(f"Response Status: {status}")
                logger.info(f"Response Headers: {dict(response.headers)}")
                
                if status == 200:
                    try:
                        data = json.loads(response_text)
                        logger.info("✅ SUCCESS! Got JSON response:")
                        logger.info(json.dumps(data, indent=2, ensure_ascii=False)[:1000] + "...")
                        return data
                    except json.JSONDecodeError as e:
                        logger.error(f"❌ JSON decode error: {e}")
                        logger.info(f"Raw response: {response_text[:500]}...")
                        return None
                else:
                    logger.error(f"❌ HTTP Error {status}")
                    logger.error(f"Response: {response_text[:500]}...")
                    return None
                    
    except Exception as e:
        logger.error(f"❌ Request failed: {e}")
        return None

async def test_similar_endpoints():
    """
    Тестирует различные похожие endpoints для поиска рабочего
    """
    base_url = "https://mpstats.io/api/wb"
    today = datetime.now()
    d2 = today.strftime("%Y-%m-%d")
    d1 = (today - timedelta(days=7)).strftime("%Y-%m-%d")
    
    # Различные варианты endpoints
    endpoints_to_test = [
        {
            "name": "in_similar (original)",
            "path": "/get/in_similar",
            "params": {
                "path": "/Для женщин/Одежда/Платья",
                "d1": d1,
                "d2": d2,
                "fbs": 0
            }
        },
        {
            "name": "category summary",
            "path": "/get/category/summary", 
            "params": {
                "path": "/Для женщин/Одежда/Платья",
                "d1": d1,
                "d2": d2
            }
        },
        {
            "name": "category items",
            "path": "/get/category/items",
            "params": {
                "path": "/Для женщин/Одежда/Платья",
                "limit": 50
            }
        },
        {
            "name": "category brands",
            "path": "/get/category/brands",
            "params": {
                "path": "/Для женщин/Одежда/Платья",
                "d1": d1,
                "d2": d2,
                "fbs": 0
            }
        }
    ]
    
    headers = {
        "X-Mpstats-TOKEN": MPSTATS_API_KEY,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
    
    results = {}
    
    for endpoint in endpoints_to_test:
        logger.info(f"\n🔍 Testing endpoint: {endpoint['name']}")
        url = base_url + endpoint['path']
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=headers, params=endpoint['params'], timeout=30) as response:
                    status = response.status
                    
                    if status == 200:
                        try:
                            data = await response.json()
                            logger.info(f"✅ {endpoint['name']}: SUCCESS")
                            logger.info(f"   Data type: {type(data)}")
                            if isinstance(data, list):
                                logger.info(f"   Items count: {len(data)}")
                            elif isinstance(data, dict):
                                logger.info(f"   Keys: {list(data.keys())}")
                            results[endpoint['name']] = {
                                "status": "success",
                                "data": data
                            }
                        except json.JSONDecodeError:
                            response_text = await response.text()
                            logger.warning(f"⚠️ {endpoint['name']}: Valid response but not JSON")
                            results[endpoint['name']] = {
                                "status": "non_json",
                                "text": response_text[:200]
                            }
                    else:
                        error_text = await response.text()
                        logger.error(f"❌ {endpoint['name']}: HTTP {status}")
                        logger.error(f"   Error: {error_text[:200]}")
                        results[endpoint['name']] = {
                            "status": "error",
                            "code": status,
                            "error": error_text[:200]
                        }
                        
        except Exception as e:
            logger.error(f"❌ {endpoint['name']}: Exception {e}")
            results[endpoint['name']] = {
                "status": "exception",
                "error": str(e)
            }
    
    return results

async def get_in_similar_data(category_path: str, d1: str = None, d2: str = None, fbs: int = 0) -> Optional[List[Dict]]:
    """
    Получает данные с endpoint /get/in_similar
    Возвращает список товаров в формате MPStats
    """
    if not d1:
        d1 = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
    if not d2:
        d2 = datetime.now().strftime("%Y-%m-%d")
    
    url = "https://mpstats.io/api/wb/get/in_similar"
    params = {
        "path": category_path,
        "d1": d1,
        "d2": d2,
        "fbs": fbs
    }
    
    headers = {
        "X-Mpstats-TOKEN": MPSTATS_API_KEY,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
    
    logger.info(f"🔍 Getting in_similar data for category: {category_path}")
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers, params=params, timeout=30) as response:
                if response.status == 200:
                    data = await response.json()
                    logger.info(f"✅ Successfully got {len(data) if isinstance(data, list) else 'unknown'} items")
                    return data
                else:
                    error_text = await response.text()
                    logger.warning(f"❌ Error {response.status}: {error_text[:200]}")
                    return None
    except Exception as e:
        logger.error(f"❌ Exception getting in_similar data: {e}")
        return None

async def integrate_in_similar_to_product_analysis(article: str) -> Dict[str, Any]:
    """
    Интегрирует данные /get/in_similar в анализ товара
    Получает похожие товары и их метрики для сравнения
    """
    # Сначала получаем информацию о товаре для определения категории
    try:
        # Пробуем получить категорию товара
        item_url = f"https://mpstats.io/api/wb/get/item/{article}/card"
        headers = {
            "X-Mpstats-TOKEN": MPSTATS_API_KEY,
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        
        category_path = "/Для женщин/Одежда/Платья"  # Default category
        
        async with aiohttp.ClientSession() as session:
            async with session.get(item_url, headers=headers, timeout=30) as response:
                if response.status == 200:
                    card_data = await response.json()
                    # Извлекаем путь категории если есть
                    if isinstance(card_data, dict) and 'category' in card_data:
                        category_path = card_data['category'].get('path', category_path)
                    elif isinstance(card_data, dict) and 'path' in card_data:
                        category_path = card_data['path']
        
        # Получаем похожие товары
        similar_items = await get_in_similar_data(category_path)
        
        if similar_items:
            # Анализируем конкурентов
            competitor_analysis = {
                "category_path": category_path,
                "total_competitors": len(similar_items),
                "similar_items": similar_items[:10],  # Топ 10 для анализа
                "market_insights": _analyze_market_data(similar_items, article)
            }
            
            logger.info(f"✅ Found {len(similar_items)} similar items in category {category_path}")
            return competitor_analysis
        else:
            logger.warning(f"⚠️ No similar items found for article {article}")
            return {
                "category_path": category_path,
                "total_competitors": 0,
                "similar_items": [],
                "market_insights": {},
                "error": "No similar items data available"
            }
            
    except Exception as e:
        logger.error(f"❌ Error integrating in_similar data: {e}")
        return {
            "error": str(e),
            "total_competitors": 0,
            "similar_items": [],
            "market_insights": {}
        }

def _analyze_market_data(similar_items: List[Dict], target_article: str) -> Dict[str, Any]:
    """
    Анализирует рыночные данные на основе похожих товаров
    """
    if not similar_items:
        return {}
    
    # Извлекаем метрики
    prices = []
    sales = []
    ratings = []
    
    for item in similar_items:
        if isinstance(item, dict):
            # Извлекаем цену
            price = item.get('price', 0) or item.get('final_price', 0)
            if price:
                prices.append(price)
            
            # Извлекаем продажи
            sales_count = item.get('sales', 0) or item.get('sales_count', 0)
            if sales_count:
                sales.append(sales_count)
            
            # Извлекаем рейтинг
            rating = item.get('rating', 0) or item.get('review_rating', 0)
            if rating:
                ratings.append(rating)
    
    # Вычисляем статистики
    analysis = {}
    
    if prices:
        analysis['price_analysis'] = {
            'avg_price': sum(prices) / len(prices),
            'min_price': min(prices),
            'max_price': max(prices),
            'median_price': sorted(prices)[len(prices)//2]
        }
    
    if sales:
        analysis['sales_analysis'] = {
            'avg_sales': sum(sales) / len(sales),
            'total_market_sales': sum(sales),
            'top_performer_sales': max(sales),
            'market_competition': len([s for s in sales if s > 0])
        }
    
    if ratings:
        analysis['quality_analysis'] = {
            'avg_rating': sum(ratings) / len(ratings),
            'high_rated_count': len([r for r in ratings if r >= 4.5]),
            'quality_benchmark': max(ratings)
        }
    
    return analysis

async def main():
    """Основная функция для тестирования"""
    logger.info("🚀 Starting MPStats /get/in_similar endpoint testing")
    
    print("\n" + "="*60)
    print("🔍 TESTING SINGLE in_similar ENDPOINT")
    print("="*60)
    
    # Тест 1: Основной endpoint
    result = await test_in_similar_endpoint()
    
    print("\n" + "="*60)
    print("🔍 TESTING MULTIPLE SIMILAR ENDPOINTS")
    print("="*60)
    
    # Тест 2: Несколько похожих endpoints
    results = await test_similar_endpoints()
    
    print("\n📊 SUMMARY OF TESTS:")
    for name, result in results.items():
        status = result.get('status', 'unknown')
        if status == 'success':
            print(f"✅ {name}: SUCCESS")
        elif status == 'error':
            print(f"❌ {name}: ERROR {result.get('code')}")
        elif status == 'exception':
            print(f"💥 {name}: EXCEPTION")
        else:
            print(f"⚠️ {name}: {status.upper()}")
    
    print("\n" + "="*60)
    print("🔍 TESTING INTEGRATION WITH PRODUCT ANALYSIS")
    print("="*60)
    
    # Тест 3: Интеграция с анализом товара
    test_article = "360832704"  # Тестовый артикул
    integration_result = await integrate_in_similar_to_product_analysis(test_article)
    
    if integration_result.get('error'):
        print(f"❌ Integration failed: {integration_result['error']}")
    else:
        print(f"✅ Integration successful:")
        print(f"   Category: {integration_result.get('category_path')}")
        print(f"   Competitors: {integration_result.get('total_competitors')}")
        print(f"   Market insights: {len(integration_result.get('market_insights', {}))}")

if __name__ == "__main__":
    asyncio.run(main()) 