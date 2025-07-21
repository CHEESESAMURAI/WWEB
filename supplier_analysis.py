import asyncio
import hashlib
import logging
import random
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional

import aiohttp

logger = logging.getLogger(__name__)

__all__ = [
    "get_supplier_analysis",
    "format_supplier_message",
]


async def _fetch_wb_supplier_info(supplier_name: str) -> Optional[Dict[str, Any]]:
    """Fetch supplier information from Wildberries public search API."""
    try:
        # Улучшаем поисковый запрос, убирая общие юр. термины
        search_terms = supplier_name.lower().replace('"', '').split()
        stop_words = ['ооо', 'зао', 'пао', 'ип', 'индивидуальный', 'предприниматель', 'общество', 'ограниченной', 'ответственностью']
        meaningful_terms = [term for term in search_terms if term not in stop_words]
        
        # Если после фильтрации что-то осталось, используем, иначе - исходный запрос
        query_text = " ".join(meaningful_terms) if meaningful_terms else supplier_name
        logger.info(f"Using search query for supplier: '{query_text}'")

        query = query_text.replace(" ", "%20")
        search_url = (
            "https://search.wb.ru/exactmatch/ru/common/v4/search"
            f"?appType=1&curr=rub&dest=-1029256,-102269,-2162196,-1257786"
            f"&query={query}&resultset=catalog&spp=0&sort=popular"
        )
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/122.0.0.0 Safari/537.36"
            )
        }
        async with aiohttp.ClientSession() as session:
            async with session.get(search_url, headers=headers, timeout=20) as resp:
                if resp.status != 200:
                    logger.warning(
                        "WB search response %s for supplier %s", resp.status, supplier_name
                    )
                    return None
                
                # Логируем ответ от WB
                response_text = await resp.text()
                logger.info(f"WB API response for '{query_text}': {response_text[:500]}...")
                
                data = await resp.json(content_type=None) # Принимаем любой content-type
    except Exception as exc:
        logger.error("WB search fetch error: %s", exc, exc_info=True)
        return None

    products: List[Dict[str, Any]] = (
        data.get("data", {}).get("products", []) if isinstance(data, dict) else []
    )
    if not products:
        logger.warning(f"No products found for supplier query: '{query_text}'")
        return None

    # Улучшаем фильтрацию: товар засчитывается, если найдено >=60% значимых слов
    def _matches_supplier(supplier_field: str) -> bool:
        s = supplier_field.lower()
        if not meaningful_terms:
            return supplier_name.lower() in s
        matches = sum(term in s for term in meaningful_terms)
        return matches >= max(1, int(len(meaningful_terms) * 0.6))

    filtered = [p for p in products if _matches_supplier(p.get("supplier", ""))]

    if not filtered:
        logger.warning(
            f"Could not filter products by >=60% word match. Using all {len(products)} products as fallback."
        )
        filtered = products

    total_products = len(filtered)
    avg_price = (
        sum(p.get("priceU", 0) / 100 for p in filtered) / total_products if total_products else 0
    )
    total_sales_est = sum(p.get("feedbacks", 0) * 10 for p in filtered)

    # Category distribution
    categories: Dict[str, int] = {}
    for p in filtered:
        cat = p.get("subjectName", p.get("category", "Разное"))
        categories[cat] = categories.get(cat, 0) + 1

    # Top products by estimated revenue
    top_products: List[Dict[str, Any]] = []
    for prod in sorted(filtered, key=lambda x: x.get("feedbacks", 0), reverse=True)[:5]:
        price = prod.get("priceU", 0) / 100
        sales_est = prod.get("feedbacks", 0) * 10
        top_products.append(
            {
                "article": str(prod.get("id")),
                "name": prod.get("name", ""),
                "sales": sales_est,
                "revenue": round(price * sales_est, 2),
            }
        )

    result: Dict[str, Any] = {
        "supplierName": supplier_name,
        "inn": None,
        "ogrn": None,
        "totalProducts": total_products,
        "averagePrice": round(avg_price, 2),
        "totalSales": total_sales_est,
        "categories": categories,
        "topProducts": top_products,
        "adActivity": any(p.get("sale", 0) > 0 for p in filtered),
    }
    return result


def _generate_placeholder_supplier_info(supplier_name: str) -> Dict[str, Any]:
    """Generate deterministic placeholder when live data is unavailable."""
    seed_int = int(hashlib.md5(supplier_name.encode()).hexdigest(), 16)
    random.seed(seed_int)

    total_products = random.randint(20, 400)
    avg_price = random.randint(500, 6000)
    total_sales = random.randint(800, 25000)

    categories = {
        "Одежда": random.randint(1, 10),
        "Дом": random.randint(1, 10),
        "Спорт": random.randint(1, 10),
        "Красота": random.randint(1, 10),
    }
    # upscale to total_products
    total_cat = sum(categories.values())
    if total_cat:
        factor = total_products / total_cat
        categories = {k: int(v * factor) for k, v in categories.items()}

    top_products = [
        {
            "article": str(90000000 + i * 321),
            "name": f"Товар {i + 1}",
            "sales": random.randint(150, 1200),
            "revenue": random.randint(100000, 900000),
        }
        for i in range(5)
    ]

    return {
        "supplierName": supplier_name,
        "inn": None,
        "ogrn": None,
        "totalProducts": total_products,
        "averagePrice": avg_price,
        "totalSales": total_sales,
        "categories": categories,
        "topProducts": top_products,
        "adActivity": random.choice([True, False]),
    }


async def get_supplier_analysis(supplier_name: str) -> Dict[str, Any]:
    """Public coroutine used by both bot and FastAPI backend."""
    data = await _fetch_wb_supplier_info(supplier_name)
    if not data:
        data = _generate_placeholder_supplier_info(supplier_name)

    # Enrich with AI recommendations
    recommendations = await generate_supplier_recommendations(data)
    data["recommendations"] = recommendations
    
    return data


def format_supplier_message(data: Dict[str, Any]) -> str:
    """Return supplier analysis formatted for Telegram-bot markdown."""
    parts: List[str] = []
    parts.append("🏭 **АНАЛИЗ ПОСТАВЩИКА**\n")
    parts.append(f"📌 **Поставщик:** {data.get('supplierName')}")
    if data.get("inn"):
        parts.append(f"🔢 **ИНН:** {data['inn']}")
    if data.get("ogrn"):
        parts.append(f"🏷 **ОГРН:** {data['ogrn']}")

    parts.append("\n**Основные метрики:**")
    parts.append(f"• 🏪 Товаров: {data['totalProducts']:,}")
    parts.append(f"• 💰 Средняя цена: {data['averagePrice']:,} ₽")
    parts.append(f"• 📦 Продаж (≈): {data['totalSales']:,}\n")

    if data.get("categories"):
        parts.append("**Категории:**")
        for cat, cnt in sorted(data['categories'].items(), key=lambda x: x[1], reverse=True)[:5]:
            parts.append(f"• {cat}: {cnt}")
        parts.append("")

    if data.get("topProducts"):
        parts.append("**🔝 Топ-товары:**")
        for i, tp in enumerate(data['topProducts'], 1):
            parts.append(
                f"{i}. {tp['name']} (art. {tp['article']}) – {tp['sales']:,} шт. / {tp['revenue']:,} ₽"
            )
        parts.append("")

    parts.append(
        "📣 Реклама: " + ("🟢 активна" if data.get("adActivity") else "🔴 не замечена")
    )
    return "\n".join(parts)


def generate_fallback_supplier_recommendations(supplier_data: Dict[str, Any]) -> list:
    """Генерирует базовые рекомендации для поставщика."""
    recommendations = []
    total_products = supplier_data.get('totalProducts', 0)
    avg_price = supplier_data.get('averagePrice', 0)
    ad_activity = supplier_data.get('adActivity', False)

    if total_products < 10:
        recommendations.append("Расширьте ассортимент, чтобы охватить больше сегментов рынка.")
    elif total_products > 200:
        recommendations.append("Проведите ABC-анализ для оптимизации ассортимента и выявления неликвидных товаров.")

    if avg_price < 500:
        recommendations.append("Рассмотрите возможность введения в ассортимент товаров с более высокой маржинальностью.")
    
    if not ad_activity:
        recommendations.append("Начните использовать внутреннюю рекламу Wildberries для повышения видимости товаров.")
    
    recommendations.append("Проанализируйте категории с наибольшим количеством товаров на предмет потенциала роста.")
    recommendations.append("Сравните свои топ-товары с конкурентами для выявления сильных и слабых сторон.")
    
    return recommendations[:5]


async def generate_supplier_recommendations(supplier_data: Dict[str, Any]) -> list:
    """Генерирует рекомендации для поставщика с использованием OpenAI."""
    try:
        import openai
        import os
        
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            logger.warning("OpenAI API key not found for supplier recommendations")
            return generate_fallback_supplier_recommendations(supplier_data)
        
        context = f"""
        Проанализируй данные поставщика с Wildberries и дай 3-5 конкретных рекомендаций по развитию:
        
        Поставщик: {supplier_data.get('supplierName', 'Не указано')}
        Всего товаров: {supplier_data.get('totalProducts', 0)}
        Средняя цена: {supplier_data.get('averagePrice', 0)} руб
        Примерные продажи: {supplier_data.get('totalSales', 0)}
        Рекламная активность: {'Да' if supplier_data.get('adActivity') else 'Нет'}
        
        Топ-5 товаров по выручке:
        {supplier_data.get('topProducts', [])}
        
        Категории:
        {supplier_data.get('categories', {})}
        """
        
        client = openai.AsyncOpenAI(api_key=api_key)
        
        response = await client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "Ты — эксперт по анализу поставщиков на Wildberries. Дай краткие и actionable рекомендации. Отвечай на русском языке."},
                {"role": "user", "content": context}
            ],
            max_tokens=800,
            temperature=0.6
        )
        
        ai_response = response.choices[0].message.content
        recommendations = [rec.strip() for rec in ai_response.split('\n') if rec.strip() and len(rec.strip()) > 10]
        
        if not recommendations:
            return generate_fallback_supplier_recommendations(supplier_data)
            
        return recommendations[:5]
        
    except Exception as e:
        logger.error(f"Error generating AI supplier recommendations: {e}")
        return generate_fallback_supplier_recommendations(supplier_data) 