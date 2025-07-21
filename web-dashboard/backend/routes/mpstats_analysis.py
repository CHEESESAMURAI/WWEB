"""
🔧 MPStats Advanced Product Analysis Routes
Расширенный анализ товара через MPStats API /get/in_similar
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import aiohttp
import asyncio
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

router = APIRouter()

# MPStats API configuration
MPSTATS_API_KEY = "68431d2ac72ea4.96910328a56006b24a55daf65db03835d5fe5b4d"
MPSTATS_BASE_URL = "https://mpstats.io/api/wb"

class AdvancedProductAnalysisRequest(BaseModel):
    article: str
    date_from: Optional[str] = None  # Format: YYYY-MM-DD
    date_to: Optional[str] = None    # Format: YYYY-MM-DD
    fbs: Optional[int] = 1           # FBS filter (0/1)

class AdvancedProductAnalysisResponse(BaseModel):
    article: str
    basic_info: Dict[str, Any]
    pricing: Dict[str, Any]
    sales_metrics: Dict[str, Any]
    rating_reviews: Dict[str, Any]
    inventory: Dict[str, Any]
    charts: Dict[str, Any]
    debug_info: Dict[str, Any]

async def get_mpstats_similar_items(article: str, date_from: str, date_to: str, fbs: int = 1) -> Optional[Dict]:
    """
    Получает данные о похожих товарах через MPStats API /get/in_similar
    """
    headers = {
        "X-Mpstats-TOKEN": MPSTATS_API_KEY,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
    
    url = f"{MPSTATS_BASE_URL}/get/in_similar"
    params = {
        "d1": date_from,
        "d2": date_to,
        "path": article,  # Используем артикул как path
        "fbs": fbs
    }
    
    logger.info(f"🔍 MPStats similar items request: {url} with params: {params}")
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers, params=params, timeout=30) as resp:
                logger.info(f"📊 MPStats similar items response: {resp.status}")
                
                if resp.status == 200:
                    data = await resp.json()
                    
                    if isinstance(data, dict):
                        items = data.get('data', [])
                        total = data.get('total', 0)
                        
                        logger.info(f"✅ Retrieved {len(items)} items from {total} total similar items")
                        
                        # Ищем товар с точным совпадением артикула или берем первый
                        target_item = None
                        for item in items:
                            if str(item.get('itemid', '')) == str(article):
                                target_item = item
                                break
                        
                        if not target_item and items:
                            target_item = items[0]  # Берем первый как пример
                            logger.info(f"🎯 Using first item as target: {target_item.get('itemid', 'unknown')}")
                        
                        return {
                            "target_item": target_item,
                            "similar_items": items,
                            "total_similar": total,
                            "api_response": data
                        }
                    else:
                        logger.warning(f"⚠️ Unexpected MPStats response structure: {type(data)}")
                        return None
                else:
                    error_text = await resp.text()
                    logger.error(f"❌ MPStats API error {resp.status}: {error_text}")
                    return None
                    
    except Exception as e:
        logger.error(f"❌ MPStats API exception: {e}")
        return None

def extract_basic_info(item: Dict) -> Dict[str, Any]:
    """Извлекает основную информацию о товаре"""
    if not item:
        return {}
    
    return {
        "name": item.get("name", ""),
        "brand": item.get("brand", ""),
        "seller": item.get("seller", ""),
        "supplier_id": item.get("supplier_id", ""),
        "subject": item.get("subject", ""),
        "category": item.get("category", ""),
        "country": item.get("country", ""),
        "gender": item.get("gender", ""),
        "sku_first_date": item.get("sku_first_date", ""),
        "firstcommentdate": item.get("firstcommentdate", ""),
        "url": item.get("url", ""),
        "thumb_middle": item.get("thumb_middle", ""),
        "thumb": item.get("thumb", ""),
        "itemid": item.get("itemid", ""),
        "id": item.get("id", "")
    }

def extract_pricing(item: Dict) -> Dict[str, Any]:
    """Извлекает информацию о ценообразовании"""
    if not item:
        return {}
    
    return {
        "final_price": item.get("final_price", 0),
        "basic_price": item.get("basic_price", 0),
        "start_price": item.get("start_price", 0),
        "final_price_max": item.get("final_price_max", 0),
        "final_price_min": item.get("final_price_min", 0),
        "final_price_average": item.get("final_price_average", 0),
        "final_price_median": item.get("final_price_median", 0),
        "basic_sale": item.get("basic_sale", 0),
        "promo_sale": item.get("promo_sale", 0),
        "client_sale": item.get("client_sale", 0),
        "client_price": item.get("client_price", 0),
        "wallet_price": item.get("wallet_price", 0)
    }

def extract_sales_metrics(item: Dict) -> Dict[str, Any]:
    """Извлекает показатели продаж и эффективности"""
    if not item:
        return {}
    
    return {
        "sales": item.get("sales", 0),
        "sales_per_day_average": item.get("sales_per_day_average", 0),
        "revenue": item.get("revenue", 0),
        "revenue_potential": item.get("revenue_potential", 0),
        "revenue_average": item.get("revenue_average", 0),
        "lost_profit": item.get("lost_profit", 0),
        "lost_profit_percent": item.get("lost_profit_percent", 0),
        "purchase": item.get("purchase", 0),
        "purchase_after_return": item.get("purchase_after_return", 0),
        "turnover_days": item.get("turnover_days", 0),
        "turnover_once": item.get("turnover_once", 0),
        "percent_from_revenue": item.get("percent_from_revenue", 0),
        "days_in_site": item.get("days_in_site", 0),
        "days_with_sales": item.get("days_with_sales", 0)
    }

def extract_rating_reviews(item: Dict) -> Dict[str, Any]:
    """Извлекает данные о рейтинге и отзывах"""
    if not item:
        return {}
    
    return {
        "rating": item.get("rating", 0),
        "comments": item.get("comments", 0),
        "picscount": item.get("picscount", 0),
        "has3d": bool(item.get("has3d", 0)),
        "hasvideo": bool(item.get("hasvideo", 0)),
        "commentsvaluation": item.get("commentsvaluation", 0),
        "cardratingval": item.get("cardratingval", 0),
        "avg_latest_rating": item.get("avg_latest_rating", 0),
        "latest_negative_comments_percent": item.get("latest_negative_comments_percent", 0),
        "sales_per_comments": item.get("sales_per_comments", 0)
    }

def extract_inventory(item: Dict) -> Dict[str, Any]:
    """Извлекает данные о запасах и остатках"""
    if not item:
        return {}
    
    return {
        "balance": item.get("balance", 0),
        "balance_fbs": item.get("balance_fbs", 0),
        "days_in_stock": item.get("days_in_stock", 0),
        "average_if_in_stock": item.get("average_if_in_stock", 0),
        "days_with_sales": item.get("days_with_sales", 0),
        "frozen_stocks": item.get("frozen_stocks", 0),
        "frozen_stocks_cost": item.get("frozen_stocks_cost", 0),
        "frozen_stocks_percent": item.get("frozen_stocks_percent", 0),
        "is_fbs": bool(item.get("is_fbs", 0))
    }

def extract_charts(item: Dict) -> Dict[str, Any]:
    """Извлекает данные для графиков"""
    if not item:
        return {}
    
    return {
        "sales_graph": item.get("graph", []),
        "stocks_graph": item.get("stocks_graph", []),
        "price_graph": item.get("price_graph", []),
        "product_visibility_graph": item.get("product_visibility_graph", []),
        "category_graph": item.get("category_graph", []),
        "category_position_graph": item.get("category_position_graph", []),
        "search_position_graph": item.get("search_position_graph", []),
        "warehouses_count_graph": item.get("warehouses_count_graph", []),
        "size_count_in_stock_graph": item.get("size_count_in_stock_graph", [])
    }

@router.post("/advanced-analysis", response_model=AdvancedProductAnalysisResponse)
async def get_advanced_product_analysis(request: AdvancedProductAnalysisRequest):
    """
    🎯 Расширенный анализ товара через MPStats API
    Возвращает полную информацию о товаре из /get/in_similar endpoint
    """
    logger.info(f"🚀 Starting advanced product analysis for article: {request.article}")
    
    # Устанавливаем дефолтные даты если не указаны
    if not request.date_from or not request.date_to:
        end_date = datetime.now()
        start_date = end_date - timedelta(days=30)
        date_from = request.date_from or start_date.strftime("%Y-%m-%d")
        date_to = request.date_to or end_date.strftime("%Y-%m-%d")
    else:
        date_from = request.date_from
        date_to = request.date_to
    
    logger.info(f"📅 Analysis period: {date_from} to {date_to}")
    
    # Получаем данные из MPStats API
    mpstats_data = await get_mpstats_similar_items(
        article=request.article,
        date_from=date_from,
        date_to=date_to,
        fbs=request.fbs
    )
    
    if not mpstats_data:
        raise HTTPException(
            status_code=404, 
            detail=f"Could not retrieve data for article {request.article}"
        )
    
    target_item = mpstats_data.get("target_item", {})
    similar_items = mpstats_data.get("similar_items", [])
    
    logger.info(f"✅ Processing target item: {target_item.get('itemid', 'unknown')}")
    
    # Извлекаем структурированные данные
    basic_info = extract_basic_info(target_item)
    pricing = extract_pricing(target_item)
    sales_metrics = extract_sales_metrics(target_item)
    rating_reviews = extract_rating_reviews(target_item)
    inventory = extract_inventory(target_item)
    charts = extract_charts(target_item)
    
    # Отладочная информация
    debug_info = {
        "target_itemid": target_item.get("itemid", "") if target_item else "",
        "similar_items_count": len(similar_items),
        "total_similar": mpstats_data.get("total_similar", 0),
        "api_params": {
            "article": request.article,
            "date_from": date_from,
            "date_to": date_to,
            "fbs": request.fbs
        },
        "data_completeness": {
            "has_basic_info": bool(basic_info.get("name")),
            "has_pricing": bool(pricing.get("final_price", 0) > 0),
            "has_sales": bool(sales_metrics.get("sales", 0) > 0),
            "has_charts": bool(charts.get("sales_graph"))
        }
    }
    
    logger.info(f"🎉 Advanced analysis completed for {request.article}")
    
    return AdvancedProductAnalysisResponse(
        article=request.article,
        basic_info=basic_info,
        pricing=pricing,
        sales_metrics=sales_metrics,
        rating_reviews=rating_reviews,
        inventory=inventory,
        charts=charts,
        debug_info=debug_info
    )

@router.get("/similar-items/{article}")
async def get_similar_items(article: str, limit: int = 10):
    """
    📊 Получает список похожих товаров
    """
    end_date = datetime.now()
    start_date = end_date - timedelta(days=30)
    
    mpstats_data = await get_mpstats_similar_items(
        article=article,
        date_from=start_date.strftime("%Y-%m-%d"),
        date_to=end_date.strftime("%Y-%m-%d"),
        fbs=1
    )
    
    if not mpstats_data:
        raise HTTPException(status_code=404, detail="Similar items not found")
    
    similar_items = mpstats_data.get("similar_items", [])
    
    # Ограничиваем количество возвращаемых товаров
    limited_items = similar_items[:limit]
    
    # Возвращаем краткую информацию о каждом товаре
    result = []
    for item in limited_items:
        result.append({
            "itemid": item.get("itemid", ""),
            "name": item.get("name", ""),
            "brand": item.get("brand", ""),
            "final_price": item.get("final_price", 0),
            "sales": item.get("sales", 0),
            "revenue": item.get("revenue", 0),
            "rating": item.get("rating", 0),
            "thumb": item.get("thumb", ""),
            "url": item.get("url", "")
        })
    
    return {
        "similar_items": result,
        "total_found": len(similar_items),
        "total_available": mpstats_data.get("total_similar", 0)
    } 