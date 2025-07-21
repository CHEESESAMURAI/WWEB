from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import aiohttp
import asyncio
import logging
from datetime import datetime, timedelta
import os

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

class ChartData(BaseModel):
    dates: List[str]
    values: List[float]

class BrandAnalysisRequest(BaseModel):
    brand_name: str
    date_from: str
    date_to: str
    fbs: Optional[int] = 0
    newsmode: Optional[int] = 30

class BrandAnalysisResponse(BaseModel):
    brand_info: Dict[str, Any]
    top_products: List[Dict[str, Any]]
    all_products: List[Dict[str, Any]]
    aggregated_charts: Dict[str, ChartData]
    brand_metrics: Dict[str, Any]
    metadata: Dict[str, Any]

async def fetch_mpstats_brand_data(brand_name: str, date_from: str, date_to: str, fbs: int = 0, newsmode: int = 30) -> Dict[str, Any]:
    """
    Получает данные о бренде из MPStats API
    """
    try:
        url = "https://mpstats.io/api/wb/get/brand"
        headers = {
            "X-Mpstats-TOKEN": "68431d2ac72ea4.96910328a56006b24a55daf65db03835d5fe5b4d",
            "Content-Type": "application/json"
        }
        
        params = {
            "d1": date_from,
            "d2": date_to,
            "path": brand_name,
            "fbs": fbs,
            "newsmode": newsmode
        }
        
        logger.info(f"🚀 Fetching brand data for {brand_name}: {url} with params {params}")
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers, params=params, timeout=30) as response:
                logger.info(f"📊 MPStats brand response: {response.status}")
                
                if response.status == 200:
                    data = await response.json()
                    products_count = len(data.get('data', []))
                    logger.info(f"✅ Retrieved {products_count} products for brand {brand_name}")
                    
                    if products_count == 0:
                        raise HTTPException(
                            status_code=404, 
                            detail=f"No products found for brand '{brand_name}'. Please check the brand name and try again."
                        )
                    
                    return data
                elif response.status == 401:
                    error_text = await response.text()
                    logger.error(f"❌ MPStats API unauthorized: {error_text}")
                    raise HTTPException(
                        status_code=401, 
                        detail="MPStats API authorization failed. Please check your API token."
                    )
                elif response.status == 404:
                    logger.error(f"❌ Brand '{brand_name}' not found in MPStats")
                    raise HTTPException(
                        status_code=404, 
                        detail=f"Brand '{brand_name}' not found. Please check the brand name and try again."
                    )
                else:
                    error_text = await response.text()
                    logger.error(f"❌ MPStats API error {response.status}: {error_text}")
                    raise HTTPException(
                        status_code=response.status, 
                        detail=f"MPStats API error: {error_text}"
                    )
                    
    except asyncio.TimeoutError:
        logger.error(f"⏰ Timeout fetching brand data for {brand_name}")
        raise HTTPException(
            status_code=408, 
            detail="Request timeout. MPStats API is not responding."
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"💥 Error fetching brand data: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to fetch brand data: {str(e)}"
        )

def process_brand_info(data: Dict[str, Any], brand_name: str) -> Dict[str, Any]:
    """
    Обрабатывает общую информацию о бренде
    """
    products = data.get("data", [])
    
    if not products:
        return {
            "name": brand_name,
            "total_products": 0,
            "total_revenue": 0,
            "total_sales": 0,
            "average_price": 0,
            "average_turnover_days": 0,
            "date_range": f"{data.get('d1', '')} - {data.get('d2', '')}"
        }
    
    # Агрегируем данные по бренду
    total_revenue = sum(product.get("revenue", 0) for product in products)
    total_sales = sum(product.get("sales", 0) for product in products)
    
    # Средняя цена (только по товарам с ценой > 0)
    prices = [p.get("final_price", 0) for p in products if p.get("final_price", 0) > 0]
    average_price = sum(prices) / len(prices) if prices else 0
    
    # Средняя оборачиваемость (только по товарам с данными)
    turnover_days = [p.get("turnover_days", 0) for p in products if p.get("turnover_days", 0) > 0]
    average_turnover_days = sum(turnover_days) / len(turnover_days) if turnover_days else 0
    
    return {
        "name": brand_name,
        "total_products": len(products),
        "total_revenue": int(total_revenue),
        "total_sales": int(total_sales),
        "average_price": round(average_price, 2),
        "average_turnover_days": round(average_turnover_days, 1),
        "date_range": f"{data.get('d1', '')} - {data.get('d2', '')}"
    }

def get_top_products(products: List[Dict[str, Any]], limit: int = 5) -> List[Dict[str, Any]]:
    """
    Получает топ товаров по выручке
    """
    # Сортируем по выручке
    sorted_products = sorted(products, key=lambda x: x.get("revenue", 0), reverse=True)
    
    top_products = []
    for product in sorted_products[:limit]:
        # Исправляем URL фотографии
        thumb_url = product.get("thumb_middle", "") or product.get("thumb", "")
        if thumb_url and thumb_url.startswith("//"):
            thumb_url = f"https:{thumb_url}"
        
        top_products.append({
            "name": product.get("name", "Без названия"),
            "category": product.get("category", ""),
            "final_price": product.get("final_price", 0),
            "rating": product.get("rating", 0),
            "sales": product.get("sales", 0),
            "revenue": product.get("revenue", 0),
            "url": product.get("url", ""),
            "thumb_url": thumb_url,
            "article": product.get("id", ""),
            "comments": product.get("comments", 0)
        })
    
    return top_products

def prepare_products_table(products: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Подготавливает данные для таблицы всех товаров
    """
    table_data = []
    
    for product in products:
        # Исправляем URL фотографии для таблицы
        thumb_url = product.get("thumb_middle", "") or product.get("thumb", "")
        if thumb_url and thumb_url.startswith("//"):
            thumb_url = f"https:{thumb_url}"
            
        table_data.append({
            "name": product.get("name", "Без названия"),
            "category": product.get("category", ""),
            "final_price": product.get("final_price", 0),
            "sales": product.get("sales", 0),
            "revenue": product.get("revenue", 0),
            "rating": product.get("rating", 0),
            "balance": product.get("balance", 0),
            "purchase": product.get("purchase", 0),
            "turnover_days": product.get("turnover_days", 0),
            "comments": product.get("comments", 0),
            "sku_first_date": product.get("sku_first_date", ""),
            
            # Дополнительные поля
            "basic_sale": product.get("basic_sale", 0),
            "promo_sale": product.get("promo_sale", 0),
            "client_sale": product.get("client_sale", 0),
            "start_price": product.get("start_price", 0),
            "basic_price": product.get("basic_price", 0),
            "client_price": product.get("client_price", 0),
            "category_position": product.get("category_position", 0),
            "country": product.get("country", ""),
            "gender": product.get("gender", ""),
            "picscount": product.get("picscount", 0),
            "hasvideo": product.get("hasvideo", False),
            "has3d": product.get("has3d", False),
            "article": product.get("id", ""),
            "url": product.get("url", ""),
            "is_fbs": product.get("is_fbs", False),
            "thumb_url": thumb_url
        })
    
    # Сортируем по выручке по умолчанию
    table_data.sort(key=lambda x: x["revenue"], reverse=True)
    
    return table_data

def aggregate_charts_data(products: List[Dict[str, Any]]) -> Dict[str, ChartData]:
    """
    Агрегирует данные графиков по всем товарам бренда
    """
    if not products:
        return {
            "sales_graph": ChartData(dates=[], values=[]),
            "stocks_graph": ChartData(dates=[], values=[]),
            "price_graph": ChartData(dates=[], values=[]),
            "visibility_graph": ChartData(dates=[], values=[])
        }
    
    # Определяем максимальную длину графиков
    max_length = 0
    for product in products:
        for graph_type in ["graph", "stocks_graph", "price_graph", "product_visibility_graph"]:
            graph_data = product.get(graph_type, [])
            if isinstance(graph_data, list):
                max_length = max(max_length, len(graph_data))
    
    if max_length == 0:
        return {
            "sales_graph": ChartData(dates=[], values=[]),
            "stocks_graph": ChartData(dates=[], values=[]),
            "price_graph": ChartData(dates=[], values=[]),
            "visibility_graph": ChartData(dates=[], values=[])
        }
    
    # Инициализируем агрегированные массивы
    aggregated_sales = [0.0] * max_length
    aggregated_stocks = [0.0] * max_length
    aggregated_prices = []
    aggregated_visibility = [0.0] * max_length
    
    # Агрегируем данные
    for i in range(max_length):
        sales_sum = 0.0
        stocks_sum = 0.0
        prices_for_avg = []
        visibility_sum = 0.0
        
        for product in products:
            # Продажи - суммируем
            sales_graph = product.get("graph", [])
            if isinstance(sales_graph, list) and i < len(sales_graph):
                sales_sum += float(sales_graph[i] or 0)
            
            # Остатки - суммируем
            stocks_graph = product.get("stocks_graph", [])
            if isinstance(stocks_graph, list) and i < len(stocks_graph):
                stocks_sum += float(stocks_graph[i] or 0)
            
            # Цены - берем для усреднения
            price_graph = product.get("price_graph", [])
            if isinstance(price_graph, list) and i < len(price_graph):
                price = float(price_graph[i] or 0)
                if price > 0:
                    prices_for_avg.append(price)
            
            # Видимость - суммируем
            visibility_graph = product.get("product_visibility_graph", [])
            if isinstance(visibility_graph, list) and i < len(visibility_graph):
                visibility_sum += float(visibility_graph[i] or 0)
        
        aggregated_sales[i] = sales_sum
        aggregated_stocks[i] = stocks_sum
        aggregated_visibility[i] = visibility_sum
        
        # Средняя цена
        avg_price = sum(prices_for_avg) / len(prices_for_avg) if prices_for_avg else 0.0
        aggregated_prices.append(round(avg_price, 2))
    
    # Генерируем даты для графиков
    dates = []
    today = datetime.now()
    for i in range(max_length):
        date = today - timedelta(days=max_length - 1 - i)
        dates.append(date.strftime("%Y-%m-%d"))
    
    return {
        "sales_graph": ChartData(dates=dates, values=aggregated_sales),
        "stocks_graph": ChartData(dates=dates, values=aggregated_stocks),
        "price_graph": ChartData(dates=dates, values=aggregated_prices),
        "visibility_graph": ChartData(dates=dates, values=aggregated_visibility)
    }

def calculate_brand_metrics(products: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Рассчитывает дополнительные метрики бренда
    """
    if not products:
        return {
            "products_with_sales": 0,
            "products_with_sales_percentage": 0.0,
            "average_rating": 0.0,
            "total_comments": 0,
            "fbs_percentage": 0.0,
            "video_products_count": 0,
            "d3_products_count": 0,
            "top_categories": []
        }
    
    # Товары с продажами
    products_with_sales = [p for p in products if p.get("sales", 0) > 0]
    
    # Средний рейтинг (по товарам с рейтингом)
    ratings = [p.get("rating", 0) for p in products if p.get("rating", 0) > 0]
    avg_rating = sum(ratings) / len(ratings) if ratings else 0.0
    
    # Общее количество отзывов
    total_comments = sum(p.get("comments", 0) for p in products)
    
    # Процент товаров с FBS
    fbs_products = len([p for p in products if p.get("is_fbs", False)])
    fbs_percentage = (fbs_products / len(products) * 100) if products else 0.0
    
    # Количество товаров с видео/3D
    video_products = len([p for p in products if p.get("hasvideo", False)])
    d3_products = len([p for p in products if p.get("has3d", False)])
    
    # Распределение по категориям (топ-5)
    categories = {}
    for product in products:
        category = product.get("category", "Без категории")
        categories[category] = categories.get(category, 0) + 1
    
    top_categories = sorted(categories.items(), key=lambda x: x[1], reverse=True)[:5]
    
    return {
        "products_with_sales": len(products_with_sales),
        "products_with_sales_percentage": round(len(products_with_sales) / len(products) * 100, 1) if products else 0.0,
        "average_rating": round(avg_rating, 2),
        "total_comments": total_comments,
        "fbs_percentage": round(fbs_percentage, 1),
        "video_products_count": video_products,
        "d3_products_count": d3_products,
        "top_categories": [{"name": cat, "count": count} for cat, count in top_categories]
    }

@router.post("/brand-analysis", response_model=BrandAnalysisResponse)
async def analyze_brand(request: BrandAnalysisRequest):
    """
    Выполняет комплексный анализ бренда через MPStats API
    """
    logger.info(f"🚀 Starting brand analysis for: {request.brand_name}")
    
    try:
        # Получаем данные из MPStats
        mpstats_data = await fetch_mpstats_brand_data(
            brand_name=request.brand_name,
            date_from=request.date_from,
            date_to=request.date_to,
            fbs=request.fbs,
            newsmode=request.newsmode
        )
        
        products = mpstats_data.get("data", [])
        
        if not products:
            raise HTTPException(
                status_code=404, 
                detail=f"No products found for brand '{request.brand_name}' in the specified period. Try adjusting the date range or filters."
            )
        
        # Обрабатываем данные
        brand_info = process_brand_info(mpstats_data, request.brand_name)
        top_products = get_top_products(products)
        all_products = prepare_products_table(products)
        aggregated_charts = aggregate_charts_data(products)
        brand_metrics = calculate_brand_metrics(products)
        
        # Метаданные
        metadata = {
            "request_params": {
                "brand_name": request.brand_name,
                "date_from": request.date_from,
                "date_to": request.date_to,
                "fbs": request.fbs,
                "newsmode": request.newsmode
            },
            "processing_info": {
                "total_products_found": len(products),
                "top_products_count": len(top_products),
                "charts_data_points": len(aggregated_charts.get("sales_graph").dates),
                "processing_timestamp": datetime.now().isoformat(),
                "data_source": "MPStats API"
            }
        }
        
        logger.info(f"✅ Brand analysis completed for {request.brand_name}: {len(products)} products processed")
        
        return BrandAnalysisResponse(
            brand_info=brand_info,
            top_products=top_products,
            all_products=all_products,
            aggregated_charts=aggregated_charts,
            brand_metrics=brand_metrics,
            metadata=metadata
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"💥 Unexpected error in brand analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Brand analysis failed: {str(e)}") 