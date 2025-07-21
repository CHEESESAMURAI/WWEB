import os
import logging
from typing import List, Dict, Any, Optional, Tuple
import aiohttp
from datetime import datetime
import json
from bs4 import BeautifulSoup
import asyncio

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# API ключи
try:
    from config import SERPER_API_KEY, MPSTATS_API_KEY  # type: ignore
except ImportError:
    SERPER_API_KEY = os.getenv("SERPER_API_KEY", "")
    MPSTATS_API_KEY = os.getenv("MPSTATS_API_KEY", "")

# -----------------------------
#   In-memory cache for Serper
# -----------------------------

_SERPER_CACHE: Dict[str, Tuple[float, List[Dict[str, Any]]]] = {}
_CACHE_TTL = 600  # секунд (10 минут)

async def fetch_json_with_retry(session: aiohttp.ClientSession, url: str, *, headers: Optional[Dict[str, str]] = None, params: Optional[Dict[str, Any]] = None, retries: int = 3, backoff: float = 1.0) -> Optional[Dict[str, Any]]:
    """Запрашивает URL с экспоненциальными повторами и возвращает JSON либо None."""
    attempt = 0
    while attempt < retries:
        attempt += 1
        try:
            async with session.get(url, headers=headers, params=params) as resp:
                if resp.status == 200:
                    try:
                        return await resp.json()
                    except Exception as e:
                        logger.warning(f"JSON parse error on attempt {attempt}: {e}")
                else:
                    logger.warning(f"WB/MPSTATS {resp.status} on {url} (attempt {attempt})")
        except aiohttp.ClientError as e:
            logger.warning(f"HTTP error on {url} (attempt {attempt}): {e}")

        if attempt < retries:
            await asyncio.sleep(backoff * 2 ** (attempt - 1))

    logger.error(f"Failed to fetch {url} after {retries} attempts")
    return None

async def get_real_sales_impact(url: str, query: str) -> Dict[str, Any]:
    """Получает реальные данные о влиянии на продажи из API Wildberries и MPStats."""
    # Инициализируем значения по умолчанию, чтобы избежать UnboundLocalError
    current_sales: int = 0
    sale_price_u: int = 0  # Цена в копейках

    try:
        async with aiohttp.ClientSession() as session:
            # Базовая информация о товаре
            wb_url = f"https://card.wb.ru/cards/detail?nm={query}"
            wb_data = await fetch_json_with_retry(session, wb_url)
            if wb_data and wb_data.get('data', {}).get('products'):
                product = wb_data['data']['products'][0]
                sale_price_u = product.get('salePriceU', 0)

            # Данные о продажах из WB
            sales_url = f"https://product-order-qnt.wildberries.ru/by-nm/?nm={query}"
            sales_data = await fetch_json_with_retry(session, sales_url)
            if sales_data:
                current_sales = sales_data.get(str(query), {}).get('qnt', 0)

            # Исторические данные MPSTATS
            if MPSTATS_API_KEY:
                mpstats_url = f"https://mpstats.io/api/wb/get/item/{query}"
                mpstats_headers = {"X-Mpstats-TOKEN": MPSTATS_API_KEY}
                mpstats_data = await fetch_json_with_retry(session, mpstats_url, headers=mpstats_headers)
                if mpstats_data:
                    sales_history = mpstats_data.get('sales', [])
                    if sales_history:
                        recent_sales = sales_history[-30:]
                        total_revenue = sum(day.get('revenue', 0) for day in recent_sales)
                        avg_daily_sales = sum(day.get('sales', 0) for day in recent_sales) / 30

                        return {
                            "frequency": int(avg_daily_sales * 30),
                            "orders": current_sales,
                            "revenue": total_revenue,
                            "growth": calculate_growth_rate(sales_history),
                        }
        
        # Если не удалось получить данные, возвращаем базовые метрики
        avg_price_rub = sale_price_u / 100 if sale_price_u else 0
        return {
            "frequency": current_sales * 30,
            "orders": current_sales,
            "revenue": current_sales * avg_price_rub,
            "growth": 0
        }
                                
    except Exception as e:
        logger.error(f"Error getting real sales impact: {str(e)}")
        return {
            "frequency": 0,
            "orders": 0,
            "revenue": 0,
            "growth": 0
        }

def calculate_growth_rate(sales_history: List[Dict[str, Any]]) -> float:
    """Рассчитывает процент роста продаж."""
    try:
        if len(sales_history) >= 60:
            # Сравниваем последние 30 дней с предыдущими 30 днями
            recent = sum(day.get('sales', 0) for day in sales_history[-30:])
            previous = sum(day.get('sales', 0) for day in sales_history[-60:-30])
            
            if previous > 0:
                growth = ((recent - previous) / previous) * 100
                return round(growth, 2)
    except Exception as e:
        logger.error(f"Error calculating growth rate: {str(e)}")
    
    return 0.0

async def global_search_serper_detailed(query: str) -> List[Dict[str, Any]]:
    """Run Serper social-media focused search and return structured list of results."""

    # --- CACHE CHECK ---
    ts_now = datetime.utcnow().timestamp()
    cached = _SERPER_CACHE.get(query.lower())
    if cached and (ts_now - cached[0] < _CACHE_TTL):
        logger.info("Using cached Serper results for query '%s'", query)
        return cached[1]

    if not SERPER_API_KEY:
        logger.error("SERPER_API_KEY is not set. Global search disabled.")
        return []

    url = "https://google.serper.dev/search"
    headers = {
        "X-API-KEY": SERPER_API_KEY,
        "Content-Type": "application/json",
    }
    
    # Сначала получаем информацию о продукте
    product_info = await get_real_sales_impact("", query)
    
    # Делаем два запроса: один для соцсетей, другой для общего поиска
    social_payload = {
        "q": f"{query} site:vk.com OR site:instagram.com OR site:facebook.com OR site:twitter.com OR site:t.me OR site:youtube.com",
        "gl": "ru",
        "hl": "ru",
        "num": 5,
    }
    
    general_payload = {
        "q": f"{query} wildberries отзывы обзор",
        "gl": "ru",
        "hl": "ru",
        "num": 5,
    }

    results: List[Dict[str, Any]] = []
    processed_urls: set[str] = set()

    try:
        async with aiohttp.ClientSession() as session:
            # Поиск по соцсетям
            async with session.post(url, headers=headers, json=social_payload) as response:
                if response.status == 200:
                    social_data = await response.json()
                    for item in social_data.get("organic", []):
                        link = item.get("link", "")
                        if not link or link in processed_urls:
                            continue
                        processed_urls.add(link)

                        platform = "unknown"
                        for substr, name in {
                            "instagram.com": "instagram",
                            "vk.com": "vk",
                            "youtube.com": "youtube",
                            "t.me": "telegram",
                            "facebook.com": "facebook",
                            "twitter.com": "twitter",
                        }.items():
                            if substr in link:
                                platform = name
                                break

                        author = item.get("author", "")
                        if not author:
                            snippet = item.get("snippet", "")
                            if "by" in snippet.lower():
                                author = snippet.split("by")[-1].strip()
                            else:
                                author = item.get("title", "").split("-")[0].strip()

                        results.append({
                            "platform": platform,
                            "type": "social",
                            "date": datetime.now().strftime("%Y-%m-%d"),
                            "url": link,
                            "author": author,
                            "title": item.get("title", ""),
                            "snippet": item.get("snippet", ""),
                            "sales_impact": product_info
                        })

            # Общий поиск
            async with session.post(url, headers=headers, json=general_payload) as response:
                if response.status == 200:
                    general_data = await response.json()
                    for item in general_data.get("organic", []):
                        link = item.get("link", "")
                        if not link or link in processed_urls:
                            continue
                        processed_urls.add(link)

                        results.append({
                            "platform": "web",
                            "type": "review",
                            "date": datetime.now().strftime("%Y-%m-%d"),
                            "url": link,
                            "author": item.get("title", "").split("-")[0].strip(),
                            "title": item.get("title", ""),
                            "snippet": item.get("snippet", ""),
                            "sales_impact": product_info
                        })

        # --- SAVE TO CACHE ---
        _SERPER_CACHE[query.lower()] = (ts_now, results.copy())

    except Exception as exc:
        logger.error(f"Global search failed: {exc}")
 
    return results 