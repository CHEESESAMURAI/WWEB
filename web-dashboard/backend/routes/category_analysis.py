import logging
import statistics
from datetime import datetime, timedelta
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import aiohttp
import asyncio
import openai
import os

# Настройка логирования
logger = logging.getLogger(__name__)

# Настройка OpenAI
openai.api_key = "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"

router = APIRouter(tags=["category_analysis"])

# === Модели данных ===

class ChartData(BaseModel):
    dates: List[str]
    values: List[float]

class CategoryAnalysisRequest(BaseModel):
    category_path: str
    date_from: str
    date_to: str
    fbs: int = 0

class ProductDetail(BaseModel):
    id: int
    name: str
    brand: str = None
    seller: str = None
    final_price: float
    sales: int
    revenue: float
    rating: float
    comments: int
    purchase: float
    balance: int
    country: str = None
    gender: str = None
    thumb_middle: str = None
    url: str = None
    # Расширенные данные
    basic_sale: float = None
    promo_sale: float = None
    client_sale: float = None
    client_price: float = None
    start_price: float = None
    final_price_max: float = None
    final_price_min: float = None
    average_if_in_stock: float = None
    category_position: int = None
    sku_first_date: str = None
    firstcommentdate: str = None
    picscount: int = None
    hasvideo: bool = None
    has3d: bool = None

class CategoryInfo(BaseModel):
    name: str
    period: str
    total_products: int
    total_revenue: float
    total_sales: int
    average_price: float
    average_rating: float
    average_purchase: float
    average_turnover_days: float

class CategoryMetrics(BaseModel):
    revenue_per_product: float
    sales_per_product: float
    products_with_sales_percentage: float
    fbs_percentage: float
    average_comments: float
    top_brands_count: int
    price_range_min: float
    price_range_max: float

class CategoryCharts(BaseModel):
    sales_graph: ChartData
    stocks_graph: ChartData
    price_graph: ChartData
    visibility_graph: ChartData

class CategoryRecommendations(BaseModel):
    insights: List[str]
    opportunities: List[str]
    threats: List[str]
    recommendations: List[str]
    market_trends: List[str]
    competitive_advantages: List[str]

class CategoryAnalysisResponse(BaseModel):
    category_info: CategoryInfo
    top_products: List[ProductDetail]
    all_products: List[ProductDetail]
    category_metrics: CategoryMetrics
    aggregated_charts: CategoryCharts
    ai_recommendations: CategoryRecommendations
    metadata: Dict[str, Any]

# === Функции обработки данных ===

async def fetch_mpstats_category_data(category_path: str, date_from: str, date_to: str, fbs: int) -> Dict[str, Any]:
    """Получение данных категории из MPStats API"""
    
    url = "https://mpstats.io/api/wb/get/category"
    headers = {
        'X-Mpstats-TOKEN': '68431d2ac72ea4.96910328a56006b24a55daf65db03835d5fe5b4d',
        'Content-Type': 'application/json'
    }
    params = {
        'd1': date_from,
        'd2': date_to,
        'path': category_path,
        'fbs': fbs
    }
    
    logger.info(f"🚀 Starting category analysis for: {category_path}")
    logger.info(f"🚀 Fetching category data for {category_path}: {url} with params {params}")
    
    async with aiohttp.ClientSession() as session:
        async with session.get(url, headers=headers, params=params) as response:
            logger.info(f"📊 MPStats API category response: {response.status}")
            
            if response.status == 200:
                data = await response.json()
                logger.info(f"✅ Successfully fetched category data: {len(data.get('data', []))} products")
                return data
            else:
                error_text = await response.text()
                logger.error(f"❌ Error fetching category data: {response.status} - {error_text}")
                raise HTTPException(status_code=response.status, detail=f"Failed to fetch category data: {error_text}")

def generate_dates_for_period(date_from: str, date_to: str, data_length: int = 30) -> List[str]:
    """Генерирует список дат для указанного периода"""
    
    try:
        start_date = datetime.fromisoformat(date_from)
        end_date = datetime.fromisoformat(date_to)
        
        # Если данных меньше чем дней в периоде, используем данные
        period_days = (end_date - start_date).days + 1
        actual_length = min(data_length, period_days, 30)  # Ограничиваем 30 днями
        
        dates = []
        for i in range(actual_length):
            current_date = end_date - timedelta(days=actual_length - 1 - i)
            dates.append(current_date.strftime("%Y-%m-%d"))
        
        return dates
    except Exception as e:
        logger.warning(f"Error generating dates: {e}")
        # Возвращаем последние 30 дней
        today = datetime.now()
        return [(today - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(29, -1, -1)]

def process_category_info(category_path: str, date_from: str, date_to: str, products: List[Dict]) -> CategoryInfo:
    """Обработка общей информации о категории"""
    
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
    
    return CategoryInfo(
        name=category_path,
        period=f"{date_from} - {date_to}",
        total_products=total_products,
        total_revenue=total_revenue,
        total_sales=total_sales,
        average_price=round(average_price, 2),
        average_rating=round(average_rating, 2),
        average_purchase=round(average_purchase, 2),
        average_turnover_days=round(average_turnover_days, 1)
    )

def process_top_products(products: List[Dict], limit: int = 10) -> List[ProductDetail]:
    """Обработка топ товаров по выручке"""
    
    # Сортируем по выручке
    sorted_products = sorted(products, key=lambda x: x.get('revenue', 0), reverse=True)
    top_products = sorted_products[:limit]
    
    result = []
    for product in top_products:
        result.append(ProductDetail(
            id=product.get('id', 0),
            name=product.get('name', ''),
            brand=product.get('brand'),
            seller=product.get('seller'),
            final_price=product.get('final_price', 0),
            sales=product.get('sales', 0),
            revenue=product.get('revenue', 0),
            rating=product.get('rating', 0),
            comments=product.get('comments', 0),
            purchase=product.get('purchase', 0),
            balance=product.get('balance', 0),
            country=product.get('country'),
            gender=product.get('gender'),
            thumb_middle=product.get('thumb_middle'),
            url=product.get('url'),
            # Расширенные данные
            basic_sale=product.get('basic_sale'),
            promo_sale=product.get('promo_sale'),
            client_sale=product.get('client_sale'),
            client_price=product.get('client_price'),
            start_price=product.get('start_price'),
            final_price_max=product.get('final_price_max'),
            final_price_min=product.get('final_price_min'),
            average_if_in_stock=product.get('average_if_in_stock'),
            category_position=product.get('category_position'),
            sku_first_date=product.get('sku_first_date'),
            firstcommentdate=product.get('firstcommentdate'),
            picscount=product.get('picscount'),
            hasvideo=product.get('hasvideo'),
            has3d=product.get('has3d')
        ))
    
    return result

def process_all_products(products: List[Dict]) -> List[ProductDetail]:
    """Обработка всех товаров для таблицы"""
    
    result = []
    for product in products:
        result.append(ProductDetail(
            id=product.get('id', 0),
            name=product.get('name', ''),
            brand=product.get('brand'),
            seller=product.get('seller'),
            final_price=product.get('final_price', 0),
            sales=product.get('sales', 0),
            revenue=product.get('revenue', 0),
            rating=product.get('rating', 0),
            comments=product.get('comments', 0),
            purchase=product.get('purchase', 0),
            balance=product.get('balance', 0),
            country=product.get('country'),
            gender=product.get('gender'),
            thumb_middle=product.get('thumb_middle'),
            url=product.get('url'),
            # Расширенные данные
            basic_sale=product.get('basic_sale'),
            promo_sale=product.get('promo_sale'),
            client_sale=product.get('client_sale'),
            client_price=product.get('client_price'),
            start_price=product.get('start_price'),
            final_price_max=product.get('final_price_max'),
            final_price_min=product.get('final_price_min'),
            average_if_in_stock=product.get('average_if_in_stock'),
            category_position=product.get('category_position'),
            sku_first_date=product.get('sku_first_date'),
            firstcommentdate=product.get('firstcommentdate'),
            picscount=product.get('picscount'),
            hasvideo=product.get('hasvideo'),
            has3d=product.get('has3d')
        ))
    
    return result

def process_category_metrics(products: List[Dict]) -> CategoryMetrics:
    """Обработка дополнительных метрик категории"""
    
    total_products = len(products)
    if total_products == 0:
        return CategoryMetrics(
            revenue_per_product=0,
            sales_per_product=0,
            products_with_sales_percentage=0,
            fbs_percentage=0,
            average_comments=0,
            top_brands_count=0,
            price_range_min=0,
            price_range_max=0
        )
    
    total_revenue = sum(product.get('revenue', 0) for product in products)
    total_sales = sum(product.get('sales', 0) for product in products)
    
    products_with_sales = len([p for p in products if p.get('sales', 0) > 0])
    products_with_sales_percentage = (products_with_sales / total_products) * 100
    
    fbs_products = len([p for p in products if p.get('fbs', False)])
    fbs_percentage = (fbs_products / total_products) * 100
    
    total_comments = sum(product.get('comments', 0) for product in products)
    average_comments = total_comments / total_products
    
    brands = set(product.get('brand', '') for product in products if product.get('brand'))
    top_brands_count = len(brands)
    
    prices = [product.get('final_price', 0) for product in products if product.get('final_price', 0) > 0]
    price_range_min = min(prices) if prices else 0
    price_range_max = max(prices) if prices else 0
    
    return CategoryMetrics(
        revenue_per_product=round(total_revenue / total_products, 2),
        sales_per_product=round(total_sales / total_products, 2),
        products_with_sales_percentage=round(products_with_sales_percentage, 1),
        fbs_percentage=round(fbs_percentage, 1),
        average_comments=round(average_comments, 1),
        top_brands_count=top_brands_count,
        price_range_min=price_range_min,
        price_range_max=price_range_max
    )

def process_aggregated_charts(products: List[Dict], date_from: str, date_to: str) -> CategoryCharts:
    """Обработка агрегированных графиков с исправленной логикой"""
    
    if not products:
        empty_dates = generate_dates_for_period(date_from, date_to, 30)
        empty_values = [0.0] * len(empty_dates)
        return CategoryCharts(
            sales_graph=ChartData(dates=empty_dates, values=empty_values),
            stocks_graph=ChartData(dates=empty_dates, values=empty_values),
            price_graph=ChartData(dates=empty_dates, values=empty_values),
            visibility_graph=ChartData(dates=empty_dates, values=empty_values)
        )
    
    # Определяем максимальную длину графиков
    max_length = 0
    for product in products:
        for graph_type in ["graph", "stocks_graph", "price_graph", "product_visibility_graph"]:
            graph_data = product.get(graph_type, [])
            if isinstance(graph_data, list):
                max_length = max(max_length, len(graph_data))
    
    # Если нет данных графиков, создаем пустые
    if max_length == 0:
        dates = generate_dates_for_period(date_from, date_to, 30)
        values = [0.0] * len(dates)
        return CategoryCharts(
            sales_graph=ChartData(dates=dates, values=values),
            stocks_graph=ChartData(dates=dates, values=values),
            price_graph=ChartData(dates=dates, values=values),
            visibility_graph=ChartData(dates=dates, values=values)
        )
    
    # Ограничиваем длину графика 30 днями
    max_length = min(max_length, 30)
    
    # Генерируем даты для графиков
    dates = generate_dates_for_period(date_from, date_to, max_length)
    
    # Инициализируем агрегированные массивы
    aggregated_sales = [0.0] * max_length
    aggregated_stocks = [0.0] * max_length
    aggregated_prices = []
    aggregated_visibility = [0.0] * max_length
    
    # Агрегируем данные по дням
    for i in range(max_length):
        sales_sum = 0.0
        stocks_sum = 0.0
        prices_for_avg = []
        visibility_sum = 0.0
        
        for product in products:
            # Продажи - суммируем (graph - это массив)
            sales_graph = product.get("graph", [])
            if isinstance(sales_graph, list) and i < len(sales_graph):
                sales_val = sales_graph[i] or 0
                sales_sum += float(sales_val)
            
            # Остатки - суммируем (stocks_graph - это массив)
            stocks_graph = product.get("stocks_graph", [])
            if isinstance(stocks_graph, list) and i < len(stocks_graph):
                stocks_val = stocks_graph[i] or 0
                stocks_sum += float(stocks_val)
            
            # Цены - берем для усреднения (price_graph - это массив)
            price_graph = product.get("price_graph", [])
            if isinstance(price_graph, list) and i < len(price_graph):
                price = price_graph[i] or 0
                if price > 0:
                    prices_for_avg.append(float(price))
            
            # Видимость - суммируем (product_visibility_graph - это массив)
            visibility_graph = product.get("product_visibility_graph", [])
            if isinstance(visibility_graph, list) and i < len(visibility_graph):
                visibility_val = visibility_graph[i] or 0
                visibility_sum += float(visibility_val)
        
        aggregated_sales[i] = sales_sum
        aggregated_stocks[i] = stocks_sum
        aggregated_visibility[i] = visibility_sum
        
        # Средняя цена
        avg_price = statistics.mean(prices_for_avg) if prices_for_avg else 0.0
        aggregated_prices.append(round(avg_price, 2))
    
    return CategoryCharts(
        sales_graph=ChartData(dates=dates, values=aggregated_sales),
        stocks_graph=ChartData(dates=dates, values=aggregated_stocks),
        price_graph=ChartData(dates=dates, values=aggregated_prices),
        visibility_graph=ChartData(dates=dates, values=aggregated_visibility)
    )

async def generate_ai_recommendations(category_info: CategoryInfo, products: List[Dict], category_metrics: CategoryMetrics) -> CategoryRecommendations:
    """Генерация рекомендаций с использованием OpenAI"""
    
    try:
        from openai import OpenAI
        
        client = OpenAI(api_key="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")
        
        # Формируем контекст для AI
        context = f"""
Категория: {category_info.name}
Период анализа: {category_info.period}
Общее количество товаров: {category_info.total_products}
Общая выручка: {category_info.total_revenue:,.0f} ₽
Общие продажи: {category_info.total_sales:,} шт.
Средняя цена: {category_info.average_price:,.0f} ₽
Средний рейтинг: {category_info.average_rating:.1f}/5
Средний процент выкупа: {category_info.average_purchase:.1f}%
Дни оборачиваемости: {category_info.average_turnover_days:.1f}

Дополнительные метрики:
- Выручка на товар: {category_metrics.revenue_per_product:,.0f} ₽
- Продаж на товар: {category_metrics.sales_per_product:.1f}
- Товаров с продажами: {category_metrics.products_with_sales_percentage:.1f}%
- FBS товаров: {category_metrics.fbs_percentage:.1f}%
- Количество брендов: {category_metrics.top_brands_count}
- Диапазон цен: {category_metrics.price_range_min:,.0f} - {category_metrics.price_range_max:,.0f} ₽

Топ-5 товаров по выручке:
"""
        
        # Добавляем информацию о топ товарах
        top_5_products = sorted(products, key=lambda x: x.get('revenue', 0), reverse=True)[:5]
        for i, product in enumerate(top_5_products, 1):
            context += f"\n{i}. {product.get('name', 'Без названия')[:50]}..."
            context += f"\n   Бренд: {product.get('brand', 'Неизвестно')}"
            context += f"\n   Выручка: {product.get('revenue', 0):,.0f} ₽"
            context += f"\n   Продажи: {product.get('sales', 0):,} шт."
            context += f"\n   Рейтинг: {product.get('rating', 0):.1f}/5"

        # Запрос к OpenAI с новым API
        response = await asyncio.to_thread(
            client.chat.completions.create,
            model="gpt-3.5-turbo",
            messages=[
                {
                    "role": "system",
                    "content": "Ты - эксперт по анализу маркетплейсов и e-commerce аналитике. Проанализируй данные категории Wildberries и дай профессиональные рекомендации на русском языке."
                },
                {
                    "role": "user",
                    "content": f"{context}\n\nНа основе этих данных предоставь:\n1. Ключевые инсайты (3-4 пункта)\n2. Возможности для роста (3-4 пункта)\n3. Потенциальные угрозы (2-3 пункта)\n4. Конкретные рекомендации (4-5 пунктов)\n5. Рыночные тренды (2-3 пункта)\n6. Конкурентные преимущества (2-3 пункта)"
                }
            ],
            max_tokens=1000,
            temperature=0.7
        )
        
        ai_text = response.choices[0].message.content
        
        # Парсим ответ AI и структурируем
        return parse_ai_recommendations(ai_text)
        
    except Exception as e:
        logger.warning(f"Failed to generate AI recommendations: {e}")
        # Fallback к базовым рекомендациям
        return generate_fallback_recommendations(category_info, category_metrics)

def parse_ai_recommendations(ai_text: str) -> CategoryRecommendations:
    """Парсинг ответа от AI в структурированный формат"""
    
    try:
        sections = {
            "insights": [],
            "opportunities": [],
            "threats": [],
            "recommendations": [],
            "market_trends": [],
            "competitive_advantages": []
        }
        
        current_section = None
        
        for line in ai_text.split('\n'):
            line = line.strip()
            if not line:
                continue
                
            # Определяем секцию
            line_lower = line.lower()
            if any(word in line_lower for word in ['инсайт', 'insight', 'ключевые']):
                current_section = "insights"
            elif any(word in line_lower for word in ['возможност', 'opportunity', 'рост']):
                current_section = "opportunities"
            elif any(word in line_lower for word in ['угроз', 'threat', 'риск']):
                current_section = "threats"
            elif any(word in line_lower for word in ['рекомендаци', 'recommend']):
                current_section = "recommendations"
            elif any(word in line_lower for word in ['тренд', 'trend']):
                current_section = "market_trends"
            elif any(word in line_lower for word in ['преимущест', 'advantage']):
                current_section = "competitive_advantages"
            elif line.startswith(('•', '-', '*', '1.', '2.', '3.', '4.', '5.')) and current_section:
                # Убираем маркеры списка
                clean_line = line.lstrip('•-*123456789. ')
                if clean_line:
                    sections[current_section].append(clean_line)
        
        return CategoryRecommendations(**sections)
        
    except Exception as e:
        logger.warning(f"Failed to parse AI recommendations: {e}")
        return CategoryRecommendations(
            insights=["Не удалось обработать рекомендации AI"],
            opportunities=[],
            threats=[],
            recommendations=[],
            market_trends=[],
            competitive_advantages=[]
        )

def generate_fallback_recommendations(category_info: CategoryInfo, category_metrics: CategoryMetrics) -> CategoryRecommendations:
    """Генерация fallback рекомендаций при недоступности AI"""
    
    insights = []
    opportunities = []
    threats = []
    recommendations = []
    market_trends = []
    competitive_advantages = []
    
    # Анализ на основе метрик
    if category_info.average_rating >= 4.5:
        insights.append(f"Высокий рейтинг товаров ({category_info.average_rating:.1f}/5) указывает на качественную продукцию в категории")
    elif category_info.average_rating <= 3.5:
        opportunities.append("Возможность выделиться качеством - средний рейтинг категории невысокий")
    
    if category_info.average_purchase >= 70:
        insights.append(f"Отличный процент выкупа ({category_info.average_purchase:.1f}%) показывает высокий спрос")
    elif category_info.average_purchase <= 40:
        threats.append("Низкий процент выкупа может указывать на проблемы с качеством или ценообразованием")
    
    if category_metrics.products_with_sales_percentage <= 50:
        opportunities.append("Многие товары не продаются - есть возможность захватить их долю рынка")
        
    if category_metrics.fbs_percentage <= 30:
        opportunities.append("Низкая доля FBS товаров - возможность получить преимущество через быструю доставку")
    
    if category_info.average_turnover_days <= 10:
        competitive_advantages.append("Быстрая оборачиваемость товаров в категории")
    elif category_info.average_turnover_days >= 30:
        threats.append("Медленная оборачиваемость может привести к затовариванию")
    
    # Общие рекомендации
    recommendations.extend([
        "Мониторить топ товары и их стратегии ценообразования",
        "Анализировать отзывы лидеров для выявления потребностей покупателей",
        "Отслеживать сезонные колебания спроса",
        "Изучить успешные маркетинговые стратегии конкурентов"
    ])
    
    market_trends.extend([
        "Рост конкуренции в популярных нишах",
        "Важность качественного контента и изображений"
    ])
    
    return CategoryRecommendations(
        insights=insights,
        opportunities=opportunities,
        threats=threats,
        recommendations=recommendations,
        market_trends=market_trends,
        competitive_advantages=competitive_advantages
    )

@router.post("/category-analysis", response_model=CategoryAnalysisResponse)
async def analyze_category(request: CategoryAnalysisRequest):
    """Эндпоинт для анализа категории"""
    
    try:
        logger.info(f"🎯 Category analysis request: {request.category_path}")
        
        # Получаем данные из MPStats API
        external_data = await fetch_mpstats_category_data(
            request.category_path, 
            request.date_from, 
            request.date_to, 
            request.fbs
        )
        
        products = external_data.get('data', [])
        
        if not products:
            logger.warning(f"⚠️ No products found for category: {request.category_path}")
            raise HTTPException(status_code=404, detail=f"No products found for category '{request.category_path}' in the specified period.")
        
        logger.info(f"📊 Processing {len(products)} products for category analysis")
        
        # Обрабатываем данные
        category_info = process_category_info(request.category_path, request.date_from, request.date_to, products)
        top_products = process_top_products(products, 10)
        all_products = process_all_products(products)
        category_metrics = process_category_metrics(products)
        aggregated_charts = process_aggregated_charts(products, request.date_from, request.date_to)
        
        # Генерируем AI рекомендации
        ai_recommendations = await generate_ai_recommendations(category_info, products, category_metrics)
        
        # Метаданные
        metadata = {
            "processing_info": {
                "data_source": "Wild Analytics Intelligence",
                "processing_timestamp": datetime.now().isoformat(),
                "total_products_found": len(products),
                "period": f"{request.date_from} to {request.date_to}",
                "fbs_filter": request.fbs
            }
        }
        
        logger.info(f"✅ Category analysis completed successfully for: {request.category_path}")
        
        return CategoryAnalysisResponse(
            category_info=category_info,
            top_products=top_products,
            all_products=all_products,
            category_metrics=category_metrics,
            aggregated_charts=aggregated_charts,
            ai_recommendations=ai_recommendations,
            metadata=metadata
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error in category analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}") 