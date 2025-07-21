import asyncio
import logging
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException, Body
from pydantic import BaseModel
import uvicorn
import json
from typing import Dict, List, Optional
from main import ProductCardAnalyzer, TrendAnalyzer
from niche_analyzer import NicheAnalyzer
import sqlite3
import sys
import os
import aiohttp

# Добавляем текущий каталог в путь поиска модулей
sys.path.append(os.path.dirname(os.path.realpath(__file__)))

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('api_server.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Инициализация анализаторов
try:
    product_analyzer = ProductCardAnalyzer()
    trend_analyzer = TrendAnalyzer()
    niche_analyzer = NicheAnalyzer()
    # Импортируем функции из new_bot.py для работы с MPSTAT
    from new_bot import get_wb_product_info, global_search_serper_detailed, get_mpsta_data, format_mpsta_results
    logger.info("Анализаторы успешно инициализированы")
except Exception as e:
    logger.error(f"Ошибка при инициализации анализаторов: {str(e)}")
    product_analyzer = None
    trend_analyzer = None
    niche_analyzer = None

app = FastAPI()

# Модели данных
class ProductRequest(BaseModel):
    article: str

class NicheRequest(BaseModel):
    keyword: str

class CategoryAnalysisRequest(BaseModel):
    category_path: str
    date_from: str
    date_to: str
    fbs: int = 0

class SearchRequest(BaseModel):
    query: str
    max_results: int = 10
    include_social: bool = True
    include_news: bool = False
    include_images: bool = False

class TrackRequest(BaseModel):
    user_id: int
    article: str

class RefreshRequest(BaseModel):
    user_id: int
    article_id: int

# Добавляем асинхронную функцию для работы с MPStats API категорий
async def fetch_mpstats_category_data(category_path: str, date_from: str, date_to: str, fbs: int) -> Dict:
    """Получение данных категории из MPStats API"""
    
    url = "https://mpstats.io/api/wb/get/category"
    params = {
        "d1": date_from,
        "d2": date_to,
        "path": category_path,
        "fbs": fbs
    }
    
    headers = {
        "X-Mpstats-TOKEN": "68431d2ac72ea4.96910328a56006b24a55daf65db03835d5fe5b4d",
        "Content-Type": "application/json"
    }
    
    logger.info(f"🚀 Fetching category data for {category_path}: {url} with params {params}")
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params, headers=headers, timeout=aiohttp.ClientTimeout(total=30)) as response:
                logger.info(f"📊 MPStats category response: {response.status}")
                
                if response.status == 401:
                    error_data = await response.json()
                    logger.error(f"❌ MPStats API unauthorized: {error_data}")
                    raise HTTPException(status_code=401, detail="MPStats API authorization failed. Please check your API token.")
                
                elif response.status == 404:
                    logger.error(f"❌ Category not found: {category_path}")
                    raise HTTPException(status_code=404, detail=f"Category '{category_path}' not found in MPStats.")
                
                elif response.status != 200:
                    error_text = await response.text()
                    logger.error(f"❌ MPStats API error {response.status}: {error_text}")
                    raise HTTPException(status_code=500, detail=f"MPStats API error: {response.status}")
                
                data = await response.json()
                logger.info(f"✅ Successfully fetched category data: {len(data.get('data', []))} products")
                return data
                
    except aiohttp.ClientError as e:
        logger.error(f"❌ Network error: {e}")
        raise HTTPException(status_code=500, detail=f"Network error when connecting to MPStats API: {str(e)}")
    except Exception as e:
        logger.error(f"❌ Unexpected error: {e}")
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

def process_category_analysis(category_path: str, date_from: str, date_to: str, products: List[Dict]) -> Dict:
    """Обработка анализа категории"""
    
    import statistics
    
    if not products:
        return {
            "category_info": {
                "name": category_path,
                "period": f"{date_from} - {date_to}",
                "total_products": 0,
                "total_revenue": 0,
                "total_sales": 0,
                "average_price": 0,
                "average_rating": 0,
                "average_purchase": 0,
                "average_turnover_days": 0
            },
            "top_products": [],
            "all_products": [],
            "category_metrics": {
                "revenue_per_product": 0,
                "sales_per_product": 0,
                "products_with_sales_percentage": 0,
                "fbs_percentage": 0,
                "average_comments": 0,
                "top_brands_count": 0,
                "price_range_min": 0,
                "price_range_max": 0
            },
            "aggregated_charts": {
                "sales_graph": {"dates": [], "values": []},
                "stocks_graph": {"dates": [], "values": []},
                "price_graph": {"dates": [], "values": []},
                "visibility_graph": {"dates": [], "values": []}
            },
            "metadata": {
                "processing_info": {
                    "data_source": "MPStats API",
                    "processing_timestamp": datetime.now().isoformat(),
                    "total_products_found": 0,
                    "period": f"{date_from} to {date_to}",
                }
            }
        }
    
    total_products = len(products)
    total_revenue = sum(product.get('revenue', 0) for product in products)
    total_sales = sum(product.get('sales', 0) for product in products)
    
    prices = [product.get('final_price', 0) for product in products if product.get('final_price', 0) > 0]
    average_price = statistics.mean(prices) if prices else 0
    
    ratings = [product.get('rating', 0) for product in products if product.get('rating', 0) > 0]
    average_rating = statistics.mean(ratings) if ratings else 0
    
    purchases = [product.get('purchase', 0) for product in products if product.get('purchase', 0) > 0]
    average_purchase = statistics.mean(purchases) if purchases else 0
    
    turnover_days = [product.get('turnover_days', 0) for product in products if product.get('turnover_days', 0) > 0]
    average_turnover_days = statistics.mean(turnover_days) if turnover_days else 0
    
    # Топ товары по выручке
    sorted_products = sorted(products, key=lambda x: x.get('revenue', 0), reverse=True)
    top_products = sorted_products[:10]
    
    # Метрики
    products_with_sales = len([p for p in products if p.get('sales', 0) > 0])
    products_with_sales_percentage = (products_with_sales / total_products) * 100
    
    fbs_products = len([p for p in products if p.get('fbs', False)])
    fbs_percentage = (fbs_products / total_products) * 100
    
    total_comments = sum(product.get('comments', 0) for product in products)
    average_comments = total_comments / total_products
    
    brands = set(product.get('brand', '') for product in products if product.get('brand'))
    top_brands_count = len(brands)
    
    price_range_min = min(prices) if prices else 0
    price_range_max = max(prices) if prices else 0
    
    # Агрегированные графики
    all_dates = set()
    for product in products:
        if 'graph' in product and isinstance(product['graph'], dict):
            all_dates.update(product['graph'].keys())
    
    sorted_dates = sorted(list(all_dates))
    
    sales_data = []
    stocks_data = []
    price_data = []
    visibility_data = []
    
    for date in sorted_dates:
        # Продажи
        daily_sales = sum(
            product.get('graph', {}).get(date, 0) 
            for product in products 
            if isinstance(product.get('graph'), dict)
        )
        sales_data.append(daily_sales)
        
        # Остатки
        daily_stocks = sum(
            product.get('stocks_graph', {}).get(date, 0) 
            for product in products 
            if isinstance(product.get('stocks_graph'), dict)
        )
        stocks_data.append(daily_stocks)
        
        # Цены (средние)
        daily_prices = [
            product.get('price_graph', {}).get(date, 0)
            for product in products 
            if isinstance(product.get('price_graph'), dict) and product.get('price_graph', {}).get(date, 0) > 0
        ]
        avg_price = statistics.mean(daily_prices) if daily_prices else 0
        price_data.append(avg_price)
        
        # Видимость
        daily_visibility = sum(
            product.get('product_visibility_graph', {}).get(date, 0) 
            for product in products 
            if isinstance(product.get('product_visibility_graph'), dict)
        )
        visibility_data.append(daily_visibility)
    
    return {
        "category_info": {
            "name": category_path,
            "period": f"{date_from} - {date_to}",
            "total_products": total_products,
            "total_revenue": total_revenue,
            "total_sales": total_sales,
            "average_price": round(average_price, 2),
            "average_rating": round(average_rating, 2),
            "average_purchase": round(average_purchase, 2),
            "average_turnover_days": round(average_turnover_days, 1)
        },
        "top_products": top_products,
        "all_products": products,
        "category_metrics": {
            "revenue_per_product": round(total_revenue / total_products, 2),
            "sales_per_product": round(total_sales / total_products, 2),
            "products_with_sales_percentage": round(products_with_sales_percentage, 1),
            "fbs_percentage": round(fbs_percentage, 1),
            "average_comments": round(average_comments, 1),
            "top_brands_count": top_brands_count,
            "price_range_min": price_range_min,
            "price_range_max": price_range_max
        },
        "aggregated_charts": {
            "sales_graph": {"dates": sorted_dates, "values": sales_data},
            "stocks_graph": {"dates": sorted_dates, "values": stocks_data},
            "price_graph": {"dates": sorted_dates, "values": price_data},
            "visibility_graph": {"dates": sorted_dates, "values": visibility_data}
        },
        "metadata": {
            "processing_info": {
                "data_source": "MPStats API",
                "processing_timestamp": datetime.now().isoformat(),
                "total_products_found": len(products),
                "period": f"{date_from} to {date_to}",
            }
        }
    }

# Инициализация БД для отслеживания товаров
def init_db():
    try:
        conn = sqlite3.connect('tracked_articles.db')
        cursor = conn.cursor()
        
        # Создаем таблицу для отслеживаемых товаров
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS tracked_articles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            article TEXT,
            name TEXT,
            price REAL,
            stock INTEGER,
            sales_total INTEGER,
            sales_per_day REAL,
            last_updated TEXT,
            UNIQUE(user_id, article)
        )
        ''')
        
        conn.commit()
        conn.close()
        logger.info("База данных успешно инициализирована")
    except Exception as e:
        logger.error(f"Ошибка при инициализации базы данных: {str(e)}")

# Эндпоинты API

@app.get("/health")
async def health_check():
    """Проверка работоспособности сервера"""
    return {
        "status": "ok", 
        "timestamp": datetime.now().isoformat(),
        "analyzers": {
            "product_analyzer": product_analyzer is not None,
            "trend_analyzer": trend_analyzer is not None,
            "niche_analyzer": niche_analyzer is not None
        }
    }

@app.get("/extended_analysis/{article}")
async def get_product_analysis(article: str):
    """Анализ товара по артикулу"""
    try:
        logger.info(f"Запрос расширенного анализа товара: {article}")
        
        # Сначала получаем данные через API Wildberries
        result = await get_wb_product_info(article)
        if not result:
            logger.error(f"Товар с артикулом {article} не найден")
            raise HTTPException(status_code=404, detail=f"Товар с артикулом {article} не найден в базе Wildberries")
        
        # Если возможно, обогащаем данными из MPSTAT
        try:
            mpsta_data = await get_mpsta_data(article)
            if mpsta_data and not mpsta_data.get("error"):
                mpsta_formatted = format_mpsta_results(mpsta_data)
                # Объединяем данные
                result.update({
                    "mpstat_data": mpsta_formatted
                })
                logger.info(f"Данные MPSTAT добавлены к анализу товара {article}")
        except Exception as mpsta_error:
            logger.warning(f"Не удалось получить данные MPSTAT для товара {article}: {str(mpsta_error)}")
        
        return result
    except HTTPException as he:
        logger.error(f"HTTP ошибка при анализе товара {article}: {str(he.detail)}")
        raise he
    except Exception as e:
        logger.error(f"Error analyzing product {article}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze_niche")
async def analyze_niche(request: NicheRequest):
    """Анализ ниши по ключевому слову"""
    try:
        logger.info(f"Запрос анализа ниши: {request.keyword}")
        if not niche_analyzer:
            raise HTTPException(status_code=503, detail="Анализатор ниш недоступен")
            
        result = await niche_analyzer.analyze_category(request.keyword)
        if not result:
            raise HTTPException(status_code=404, detail="Ниша не найдена")
        
        # Обогащаем данными из MPSTAT
        try:
            mpsta_data = await get_mpsta_data(request.keyword)
            if mpsta_data and not mpsta_data.get("error"):
                mpsta_formatted = format_mpsta_results(mpsta_data)
                # Объединяем данные
                result.update({
                    "mpstat_data": mpsta_formatted
                })
                logger.info(f"Данные MPSTAT добавлены к анализу ниши {request.keyword}")
        except Exception as mpsta_error:
            logger.warning(f"Не удалось получить данные MPSTAT для ниши {request.keyword}: {str(mpsta_error)}")
        
        return result
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error analyzing niche {request.keyword}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze_category")
async def analyze_category(request: NicheRequest):
    """Анализ категории по ключевому слову"""
    try:
        logger.info(f"Запрос анализа категории: {request.keyword}")
        if not niche_analyzer:
            raise HTTPException(status_code=503, detail="Анализатор ниш недоступен")
            
        result = await niche_analyzer.analyze_category(request.keyword)
        if not result:
            raise HTTPException(status_code=404, detail="Категория не найдена")
        
        # Обогащаем данными из MPSTAT
        try:
            mpsta_data = await get_mpsta_data(request.keyword)
            if mpsta_data and not mpsta_data.get("error"):
                mpsta_formatted = format_mpsta_results(mpsta_data)
                # Объединяем данные
                result.update({
                    "mpstat_data": mpsta_formatted
                })
                logger.info(f"Данные MPSTAT добавлены к анализу категории {request.keyword}")
        except Exception as mpsta_error:
            logger.warning(f"Не удалось получить данные MPSTAT для категории {request.keyword}: {str(mpsta_error)}")
        
        return result
    except Exception as e:
        logger.error(f"Error analyzing category {request.keyword}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/category-analysis")
async def comprehensive_category_analysis(request: CategoryAnalysisRequest):
    """Полноценный анализ категории с данными MPStats"""
    try:
        logger.info(f"🎯 Comprehensive category analysis request: {request.category_path}")
        
        # Получаем данные из MPStats API
        mpstats_data = await fetch_mpstats_category_data(
            request.category_path, 
            request.date_from, 
            request.date_to, 
            request.fbs
        )
        
        products = mpstats_data.get('data', [])
        
        if not products:
            logger.warning(f"⚠️ No products found for category: {request.category_path}")
            raise HTTPException(status_code=404, detail=f"No products found for category '{request.category_path}' in the specified period.")
        
        logger.info(f"📊 Processing {len(products)} products for category analysis")
        
        # Обрабатываем данные
        result = process_category_analysis(request.category_path, request.date_from, request.date_to, products)
        
        logger.info(f"✅ Category analysis completed successfully for: {request.category_path}")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error in category analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.post("/search")
async def search(request: SearchRequest):
    """Глобальный поиск товаров"""
    try:
        logger.info(f"Глобальный поиск по запросу: {request.query}")
        # Напрямую используем функцию для глобального поиска из new_bot.py
        result = await global_search_serper_detailed(request.query)
        return result
    except Exception as e:
        logger.error(f"Error searching for {request.query}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/tracked_items")
async def get_tracked_items(user_id: int):
    """Получение отслеживаемых товаров пользователя"""
    try:
        conn = sqlite3.connect('tracked_articles.db')
        cursor = conn.cursor()
        
        cursor.execute('''
        SELECT id, article, name, price, stock, sales_total, sales_per_day, last_updated 
        FROM tracked_articles 
        WHERE user_id = ?
        ''', (user_id,))
        
        items = []
        for row in cursor.fetchall():
            items.append({
                'id': row[0],
                'article': row[1],
                'name': row[2],
                'price': row[3],
                'stock': row[4],
                'salesTotal': row[5],
                'salesPerDay': row[6],
                'lastUpdated': row[7]
            })
        
        conn.close()
        return items
    except Exception as e:
        logger.error(f"Error getting tracked items for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/track_item")
async def track_item(request: TrackRequest):
    """Добавление товара для отслеживания"""
    try:
        # Получаем информацию о товаре через функцию из new_bot.py
        product_info = await get_wb_product_info(request.article)
        if not product_info:
            raise HTTPException(status_code=404, detail="Товар не найден")
        
        conn = sqlite3.connect('tracked_articles.db')
        cursor = conn.cursor()
        
        # Проверяем, не отслеживается ли уже этот товар
        cursor.execute('SELECT id FROM tracked_articles WHERE user_id = ? AND article = ?', 
                      (request.user_id, request.article))
        
        if cursor.fetchone():
            conn.close()
            raise HTTPException(status_code=400, detail="Этот товар уже отслеживается")
        
        # Получаем текущую цену из product_info
        price = product_info.get('price', {}).get('current', 0)
        if isinstance(product_info.get('price'), (int, float)):
            price = product_info.get('price', 0)
            
        # Получаем данные о продажах
        sales_total = product_info.get('sales', {}).get('total', 0)
        sales_per_day = product_info.get('sales', {}).get('today', 0)
        
        # Получаем данные об остатках
        stock = product_info.get('stocks', {}).get('total', 0)
        
        # Добавляем товар в отслеживаемые
        cursor.execute('''
        INSERT INTO tracked_articles (user_id, article, name, price, stock, sales_total, sales_per_day, last_updated)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            request.user_id,
            request.article,
            product_info.get('name', f'Товар {request.article}'),
            price,
            stock,
            sales_total,
            sales_per_day,
            datetime.now().isoformat()
        ))
        
        conn.commit()
        last_id = cursor.lastrowid
        
        # Получаем добавленный товар
        cursor.execute('''
        SELECT id, article, name, price, stock, sales_total, sales_per_day, last_updated 
        FROM tracked_articles 
        WHERE id = ?
        ''', (last_id,))
        
        row = cursor.fetchone()
        conn.close()
        
        return {
            'id': row[0],
            'article': row[1],
            'name': row[2],
            'price': row[3],
            'stock': row[4],
            'salesTotal': row[5],
            'salesPerDay': row[6],
            'lastUpdated': row[7]
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error tracking item {request.article}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/untrack_item")
async def untrack_item(user_id: int, article_id: int):
    """Удаление товара из отслеживаемых"""
    try:
        conn = sqlite3.connect('tracked_articles.db')
        cursor = conn.cursor()
        
        # Удаляем товар
        cursor.execute('DELETE FROM tracked_articles WHERE user_id = ? AND id = ?', 
                      (user_id, article_id))
        
        if cursor.rowcount == 0:
            conn.close()
            raise HTTPException(status_code=404, detail="Товар не найден")
        
        conn.commit()
        conn.close()
        
        return {"success": True}
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error untracking item {article_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/refresh_tracked_item")
async def refresh_tracked_item(request: RefreshRequest):
    """Обновление данных отслеживаемого товара"""
    try:
        conn = sqlite3.connect('tracked_articles.db')
        cursor = conn.cursor()
        
        # Получаем артикул для обновления
        cursor.execute('SELECT article FROM tracked_articles WHERE id = ? AND user_id = ?', 
                      (request.article_id, request.user_id))
        
        row = cursor.fetchone()
        if not row:
            conn.close()
            raise HTTPException(status_code=404, detail="Товар не найден")
        
        article = row[0]
        
        # Получаем актуальную информацию о товаре через функцию из new_bot.py
        product_info = await get_wb_product_info(article)
        if not product_info:
            raise HTTPException(status_code=404, detail="Не удалось получить информацию о товаре")
        
        # Получаем текущую цену из product_info
        price = product_info.get('price', {}).get('current', 0)
        if isinstance(product_info.get('price'), (int, float)):
            price = product_info.get('price', 0)
            
        # Получаем данные о продажах
        sales_total = product_info.get('sales', {}).get('total', 0)
        sales_per_day = product_info.get('sales', {}).get('today', 0)
        
        # Получаем данные об остатках
        stock = product_info.get('stocks', {}).get('total', 0)
        
        # Обновляем данные
        cursor.execute('''
        UPDATE tracked_articles 
        SET price = ?, stock = ?, sales_total = ?, sales_per_day = ?, last_updated = ?
        WHERE id = ? AND user_id = ?
        ''', (
            price,
            stock,
            sales_total,
            sales_per_day,
            datetime.now().isoformat(),
            request.article_id,
            request.user_id
        ))
        
        conn.commit()
        
        # Получаем обновленные данные
        cursor.execute('''
        SELECT id, article, name, price, stock, sales_total, sales_per_day, last_updated 
        FROM tracked_articles 
        WHERE id = ?
        ''', (request.article_id,))
        
        row = cursor.fetchone()
        conn.close()
        
        return {
            'id': row[0],
            'article': row[1],
            'name': row[2],
            'price': row[3],
            'stock': row[4],
            'salesTotal': row[5],
            'salesPerDay': row[6],
            'lastUpdated': row[7]
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error refreshing item {request.article_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    init_db()
    uvicorn.run(app, host="0.0.0.0", port=8000) 