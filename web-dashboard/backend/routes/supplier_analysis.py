import logging
import statistics
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import asyncio
import aiohttp
from io import BytesIO

# Настройка логирования
logger = logging.getLogger(__name__)

router = APIRouter(tags=["seller_analysis"])

# === Модели данных ===

class SellerAnalysisRequest(BaseModel):
    brand: str
    date_from: str
    date_to: str
    fbs: int = 0

class SellerDetail(BaseModel):
    name: str
    seller_id: int
    items: int
    items_with_sells: int
    items_with_sells_percent: float
    brands_count: int
    brands_with_sells: int
    brands_with_sells_percent: float
    sales: int
    revenue: float
    avg_sales_per_item: float
    avg_sales_per_item_with_sells: float
    avg_revenue_per_item: float
    avg_revenue_per_item_with_sells: float
    stock_end_period: int
    avg_price: float
    avg_rating: float
    avg_feedbacks: float
    position: int
    sales_graph: List[float]
    graph_dates: List[str]
    status: str  # 🔥 Топ-продавец, 🚀 Перспективный, 📉 Слабая динамика
    profit_margin: float

class SellerAnalytics(BaseModel):
    total_sellers: int
    total_revenue: float
    total_sales: int
    avg_items_per_seller: float
    avg_revenue_per_seller: float
    top_seller_revenue: float
    avg_rating: float
    sellers_with_sales_percentage: float

class SellerRecommendations(BaseModel):
    recommended_sellers: List[str]
    avoid_sellers: List[str]
    budget_recommendations: str
    high_margin_sellers: List[str]
    low_risk_sellers: List[str]
    expansion_opportunities: List[str]
    optimization_suggestions: List[str]

class SellerAnalysisResponse(BaseModel):
    sellers: List[SellerDetail]
    analytics: SellerAnalytics
    recommendations: SellerRecommendations
    top_5_sellers: List[SellerDetail]
    total_found: int
    search_params: SellerAnalysisRequest

# === Функции работы с MPStats API ===

async def fetch_mpstats_sellers_data(brand: str, date_from: str, date_to: str, fbs: int) -> Dict[str, Any]:
    """Получение данных продавцов из MPStats API"""
    
    url = "https://mpstats.io/api/wb/get/brand"
    headers = {
        'X-Mpstats-TOKEN': '68431d2ac72ea4.96910328a56006b24a55daf65db03835d5fe5b4d',
        'Content-Type': 'application/json'
    }
    params = {
        'd1': date_from,
        'd2': date_to,
        'path': brand,
        'fbs': fbs
    }
    
    logger.info(f"🚀 Starting seller analysis for brand: {brand}")
    logger.info(f"🚀 Fetching sellers data: {url} with params {params}")
    
    async with aiohttp.ClientSession() as session:
        async with session.get(url, headers=headers, params=params) as response:
            logger.info(f"📊 MPStats sellers API response: {response.status}")
            
            if response.status == 200:
                data = await response.json()
                logger.info(f"✅ Successfully fetched sellers data: {len(data.get('data', []))} sellers")
                return data
            else:
                error_text = await response.text()
                logger.error(f"❌ Error fetching sellers data: {response.status} - {error_text}")
                raise HTTPException(status_code=response.status, detail=f"Failed to fetch sellers data: {error_text}")

def generate_dates_for_period(date_from: str, date_to: str, data_length: int = 30) -> List[str]:
    """Генерирует список дат для указанного периода"""
    
    try:
        start_date = datetime.fromisoformat(date_from)
        end_date = datetime.fromisoformat(date_to)
        
        period_days = (end_date - start_date).days + 1
        actual_length = min(data_length, period_days, 30)
        
        dates = []
        for i in range(actual_length):
            current_date = end_date - timedelta(days=actual_length - 1 - i)
            dates.append(current_date.strftime("%Y-%m-%d"))
        
        return dates
    except Exception as e:
        logger.warning(f"Error generating dates: {e}")
        today = datetime.now()
        return [(today - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(29, -1, -1)]

def determine_seller_status(seller: Dict, avg_revenue: float, avg_sales: float) -> str:
    """Определение статуса продавца"""
    
    revenue = seller.get('revenue', 0)
    sales = seller.get('sales', 0)
    rating = seller.get('avg_rating', 0)
    items_with_sells_percent = seller.get('items_with_sells_percent', 0)
    
    # Топ-продавец: выручка выше средней на 50%+ и хороший рейтинг
    if revenue > avg_revenue * 1.5 and rating >= 4.0 and items_with_sells_percent > 60:
        return "🔥 Топ-продавец"
    
    # Перспективный: выше среднего по продажам или высокий процент товаров с продажами
    elif (revenue > avg_revenue or items_with_sells_percent > 70) and rating >= 3.8:
        return "🚀 Перспективный"
    
    # Слабая динамика: низкие показатели
    elif revenue < avg_revenue * 0.5 or items_with_sells_percent < 30:
        return "📉 Слабая динамика"
    
    # Стабильный: средние показатели
    else:
        return "📊 Стабильный"

def calculate_profit_margin(seller: Dict) -> float:
    """Расчет примерной маржинальности продавца"""
    
    avg_price = seller.get('avg_price', 0)
    avg_sales_per_item = seller.get('avg_sales_per_item_with_sells', 0)
    
    if avg_price > 0 and avg_sales_per_item > 0:
        # Простая оценка маржинальности на основе цены и оборачиваемости
        if avg_price > 2000 and avg_sales_per_item > 10:
            return 0.35  # Высокая маржинальность
        elif avg_price > 1000 and avg_sales_per_item > 5:
            return 0.25  # Средняя маржинальность
        elif avg_price > 500:
            return 0.15  # Низкая маржинальность
        else:
            return 0.10  # Очень низкая маржинальность
    
    return 0.20  # Дефолтная оценка

def process_sellers_data(raw_data: Dict, date_from: str, date_to: str) -> List[SellerDetail]:
    """Обработка данных продавцов"""
    
    sellers_data = raw_data.get('data', [])
    
    if not sellers_data:
        return []
    
    # Вычисляем средние значения для определения статусов
    avg_revenue = statistics.mean([s.get('revenue', 0) for s in sellers_data])
    avg_sales = statistics.mean([s.get('sales', 0) for s in sellers_data])
    
    processed_sellers = []
    
    for idx, seller in enumerate(sellers_data):
        # Обработка графика продаж
        sales_graph_data = seller.get('graph', [])
        if isinstance(sales_graph_data, list):
            sales_graph = [float(val) if val else 0.0 for val in sales_graph_data[:30]]
        else:
            sales_graph = [0.0] * 30
        
        # Генерируем даты для графика
        graph_dates = generate_dates_for_period(date_from, date_to, len(sales_graph))
        
        # Ensure lists are same length
        if len(sales_graph) != len(graph_dates):
            min_length = min(len(sales_graph), len(graph_dates))
            sales_graph = sales_graph[:min_length]
            graph_dates = graph_dates[:min_length]
        
        # Безопасное извлечение данных с дефолтными значениями
        items = seller.get('items', 0)
        items_with_sells = seller.get('items_with_sells', 0)
        brands_count = seller.get('brands_count', 0)
        brands_with_sells = seller.get('brands_with_sells', 0)
        
        # Расчет процентов
        items_with_sells_percent = (items_with_sells / items * 100) if items > 0 else 0
        brands_with_sells_percent = (brands_with_sells / brands_count * 100) if brands_count > 0 else 0
        
        # Средние значения
        sales = seller.get('sales', 0)
        revenue = seller.get('revenue', 0)
        avg_sales_per_item = sales / items if items > 0 else 0
        avg_sales_per_item_with_sells = sales / items_with_sells if items_with_sells > 0 else 0
        avg_revenue_per_item = revenue / items if items > 0 else 0
        avg_revenue_per_item_with_sells = revenue / items_with_sells if items_with_sells > 0 else 0
        
        processed_seller = SellerDetail(
            name=seller.get('name', f'Продавец {idx + 1}'),
            seller_id=seller.get('supplierid', idx),
            items=items,
            items_with_sells=items_with_sells,
            items_with_sells_percent=round(items_with_sells_percent, 1),
            brands_count=brands_count,
            brands_with_sells=brands_with_sells,
            brands_with_sells_percent=round(brands_with_sells_percent, 1),
            sales=sales,
            revenue=revenue,
            avg_sales_per_item=round(avg_sales_per_item, 1),
            avg_sales_per_item_with_sells=round(avg_sales_per_item_with_sells, 1),
            avg_revenue_per_item=round(avg_revenue_per_item, 2),
            avg_revenue_per_item_with_sells=round(avg_revenue_per_item_with_sells, 2),
            stock_end_period=seller.get('stock_end_period', 0),
            avg_price=round(seller.get('avg_price', 0), 2),
            avg_rating=round(seller.get('avg_rating', 0), 1),
            avg_feedbacks=round(seller.get('avg_feedbacks', 0), 1),
            position=seller.get('position', idx + 1),
            sales_graph=sales_graph,
            graph_dates=graph_dates,
            status=determine_seller_status(seller, avg_revenue, avg_sales),
            profit_margin=calculate_profit_margin(seller)
        )
        
        processed_sellers.append(processed_seller)
    
    # Сортируем по выручке
    processed_sellers.sort(key=lambda x: x.revenue, reverse=True)
    
    return processed_sellers

def generate_seller_analytics(sellers: List[SellerDetail]) -> SellerAnalytics:
    """Генерация общей аналитики по продавцам"""
    
    if not sellers:
        return SellerAnalytics(
            total_sellers=0,
            total_revenue=0,
            total_sales=0,
            avg_items_per_seller=0,
            avg_revenue_per_seller=0,
            top_seller_revenue=0,
            avg_rating=0,
            sellers_with_sales_percentage=0
        )
    
    total_sellers = len(sellers)
    total_revenue = sum(s.revenue for s in sellers)
    total_sales = sum(s.sales for s in sellers)
    avg_items_per_seller = statistics.mean([s.items for s in sellers])
    avg_revenue_per_seller = total_revenue / total_sellers
    top_seller_revenue = max(s.revenue for s in sellers)
    
    ratings = [s.avg_rating for s in sellers if s.avg_rating > 0]
    avg_rating = statistics.mean(ratings) if ratings else 0
    
    sellers_with_sales = sum(1 for s in sellers if s.sales > 0)
    sellers_with_sales_percentage = (sellers_with_sales / total_sellers) * 100
    
    return SellerAnalytics(
        total_sellers=total_sellers,
        total_revenue=total_revenue,
        total_sales=total_sales,
        avg_items_per_seller=round(avg_items_per_seller, 1),
        avg_revenue_per_seller=round(avg_revenue_per_seller, 2),
        top_seller_revenue=top_seller_revenue,
        avg_rating=round(avg_rating, 1),
        sellers_with_sales_percentage=round(sellers_with_sales_percentage, 1)
    )

async def generate_seller_recommendations(
    brand: str, 
    sellers: List[SellerDetail], 
    analytics: SellerAnalytics
) -> SellerRecommendations:
    """Генерация AI рекомендаций по продавцам"""
    
    try:
        from openai import OpenAI
        
        client = OpenAI(api_key="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")
        
        # Топ продавцы для анализа
        top_sellers = sellers[:5]
        worst_sellers = sellers[-3:] if len(sellers) > 3 else []
        
        context = f"""
Анализ продавцов для бренда: {brand}
Общая статистика:
- Найдено продавцов: {analytics.total_sellers}
- Общая выручка: {analytics.total_revenue:,.0f} ₽
- Общие продажи: {analytics.total_sales:,} шт.
- Средняя выручка на продавца: {analytics.avg_revenue_per_seller:,.0f} ₽
- Средний рейтинг: {analytics.avg_rating:.1f}/5
- Продавцов с продажами: {analytics.sellers_with_sales_percentage:.1f}%

Топ-5 продавцов:
{chr(10).join([f"{i+1}. {s.name}: {s.revenue:,.0f} ₽ выручки, {s.items} товаров, {s.avg_rating:.1f}★, {s.status}" for i, s in enumerate(top_sellers)])}

Слабые продавцы:
{chr(10).join([f"- {s.name}: {s.revenue:,.0f} ₽ выручки, {s.items_with_sells_percent:.1f}% товаров с продажами" for s in worst_sellers])}
"""

        response = await asyncio.to_thread(
            client.chat.completions.create,
            model="gpt-3.5-turbo",
            messages=[
                {
                    "role": "system",
                    "content": "Ты - эксперт по анализу продавцов и управлению ассортиментом маркетплейсов. Дай профессиональные рекомендации по работе с продавцами на русском языке."
                },
                {
                    "role": "user",
                    "content": f"{context}\n\nНа основе данных дай рекомендации:\n1. С какими продавцами усилить сотрудничество\n2. От каких продавцов стоит отказаться\n3. Рекомендуемый бюджет на тестирование\n4. Продавцы с высокой маржинальностью\n5. Продавцы с низким риском\n6. Возможности расширения ассортимента\n7. Предложения по оптимизации"
                }
            ],
            max_tokens=1000,
            temperature=0.7
        )
        
        ai_text = response.choices[0].message.content
        
        return parse_seller_recommendations(ai_text, sellers)
        
    except Exception as e:
        logger.warning(f"Failed to generate AI recommendations: {e}")
        return generate_fallback_seller_recommendations(sellers, analytics)

def parse_seller_recommendations(ai_text: str, sellers: List[SellerDetail]) -> SellerRecommendations:
    """Парсинг AI рекомендаций"""
    
    try:
        # Извлекаем рекомендуемых продавцов (топ по выручке)
        recommended = [s.name for s in sellers[:3] if s.status in ["🔥 Топ-продавец", "🚀 Перспективный"]]
        
        # Продавцов для избежания (слабые показатели)
        avoid = [s.name for s in sellers if s.status == "📉 Слабая динамика"][:3]
        
        # Высокомаржинальные продавцы
        high_margin = [s.name for s in sellers if s.profit_margin > 0.25][:3]
        
        # Низкорисковые продавцы (стабильные продажи и остатки)
        low_risk = [s.name for s in sellers if s.avg_rating >= 4.0 and s.items_with_sells_percent > 60][:3]
        
        return SellerRecommendations(
            recommended_sellers=recommended,
            avoid_sellers=avoid,
            budget_recommendations="Рекомендуемый бюджет на тестирование нового продавца: 50-150К ₽",
            high_margin_sellers=high_margin,
            low_risk_sellers=low_risk,
            expansion_opportunities=[
                f"Расширить ассортимент у {sellers[0].name}" if sellers else "Нет данных",
                "Добавить товары в перспективных категориях",
                "Протестировать новые бренды у топ-продавцов"
            ],
            optimization_suggestions=[
                "Убрать неликвидные товары у слабых продавцов",
                "Увеличить закупки у топ-продавцов",
                "Пересмотреть условия с продавцами низкой эффективности"
            ]
        )
        
    except Exception as e:
        logger.warning(f"Failed to parse AI recommendations: {e}")
        return generate_fallback_seller_recommendations(sellers, SellerAnalytics(
            total_sellers=0, total_revenue=0, total_sales=0,
            avg_items_per_seller=0, avg_revenue_per_seller=0,
            top_seller_revenue=0, avg_rating=0, sellers_with_sales_percentage=0
        ))

def generate_fallback_seller_recommendations(sellers: List[SellerDetail], analytics: SellerAnalytics) -> SellerRecommendations:
    """Fallback рекомендации при недоступности AI"""
    
    recommended = [s.name for s in sellers[:3]]
    avoid = [s.name for s in sellers if s.revenue < analytics.avg_revenue_per_seller * 0.3][:2]
    high_margin = [s.name for s in sellers if s.profit_margin > 0.25][:3]
    low_risk = [s.name for s in sellers if s.avg_rating >= 4.0][:3]
    
    return SellerRecommendations(
        recommended_sellers=recommended,
        avoid_sellers=avoid,
        budget_recommendations=f"Средний бюджет на продавца: {analytics.avg_revenue_per_seller:,.0f} ₽",
        high_margin_sellers=high_margin,
        low_risk_sellers=low_risk,
        expansion_opportunities=["Расширить работу с топ-продавцами", "Добавить новые категории"],
        optimization_suggestions=["Пересмотреть слабых продавцов", "Увеличить закупки у лидеров"]
    )

def apply_seller_filters(sellers: List[SellerDetail], filters: Dict[str, Any]) -> List[SellerDetail]:
    """Применение фильтров к продавцам"""
    
    filtered = sellers
    
    if filters.get('min_items'):
        filtered = [s for s in filtered if s.items >= filters['min_items']]
    
    if filters.get('min_revenue'):
        filtered = [s for s in filtered if s.revenue >= filters['min_revenue']]
    
    if filters.get('min_rating'):
        filtered = [s for s in filtered if s.avg_rating >= filters['min_rating']]
    
    if filters.get('max_stock'):
        filtered = [s for s in filtered if s.stock_end_period <= filters['max_stock']]
    
    if filters.get('min_sells_percent'):
        filtered = [s for s in filtered if s.items_with_sells_percent >= filters['min_sells_percent']]
    
    return filtered

@router.post("/analyze", response_model=SellerAnalysisResponse)
async def analyze_sellers(request: SellerAnalysisRequest):
    """Анализ продавцов по бренду"""
    
    try:
        logger.info(f"🎯 Seller analysis request for brand: {request.brand}")
        
        # Получаем данные из MPStats API
        raw_data = await fetch_mpstats_sellers_data(
            request.brand, 
            request.date_from, 
            request.date_to, 
            request.fbs
        )
        
        # Обрабатываем данные продавцов
        sellers = process_sellers_data(raw_data, request.date_from, request.date_to)
        
        if not sellers:
            logger.warning(f"⚠️ No sellers found for brand: {request.brand}")
            raise HTTPException(status_code=404, detail=f"No sellers found for brand '{request.brand}' in the specified period.")
        
        logger.info(f"📊 Processing {len(sellers)} sellers for brand analysis")
        
        # Генерируем аналитику
        analytics = generate_seller_analytics(sellers)
        
        # Генерируем AI рекомендации
        recommendations = await generate_seller_recommendations(request.brand, sellers, analytics)
        
        # Топ-5 продавцов
        top_5_sellers = sellers[:5]
        
        logger.info(f"✅ Seller analysis completed successfully for brand: {request.brand}")
        
        return SellerAnalysisResponse(
            sellers=sellers,
            analytics=analytics,
            recommendations=recommendations,
            top_5_sellers=top_5_sellers,
            total_found=len(sellers),
            search_params=request
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error in seller analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/export")
async def export_sellers_xlsx(request: SellerAnalysisRequest):
    """Экспорт данных продавцов в XLSX файл"""
    
    try:
        import pandas as pd
        
        # Получаем данные продавцов
        raw_data = await fetch_mpstats_sellers_data(
            request.brand, 
            request.date_from, 
            request.date_to, 
            request.fbs
        )
        
        sellers = process_sellers_data(raw_data, request.date_from, request.date_to)
        
        if not sellers:
            raise HTTPException(status_code=404, detail="No sellers found for export")
        
        # Подготавливаем данные для экспорта
        export_data = []
        for seller in sellers:
            export_data.append({
                'Name': seller.name,
                'Seller_ID': seller.seller_id,
                'Items': seller.items,
                'Items_With_Sells': seller.items_with_sells,
                'Items_With_Sells_Percent': seller.items_with_sells_percent,
                'Brands_Count': seller.brands_count,
                'Brands_With_Sells': seller.brands_with_sells,
                'Brands_With_Sells_Percent': seller.brands_with_sells_percent,
                'Sales': seller.sales,
                'Revenue': seller.revenue,
                'Avg_Sales_Per_Item': seller.avg_sales_per_item,
                'Avg_Sales_Per_Item_With_Sells': seller.avg_sales_per_item_with_sells,
                'Avg_Revenue_Per_Item': seller.avg_revenue_per_item,
                'Avg_Revenue_Per_Item_With_Sells': seller.avg_revenue_per_item_with_sells,
                'Stock_End_Period': seller.stock_end_period,
                'Avg_Price': seller.avg_price,
                'Avg_Rating': seller.avg_rating,
                'Avg_Feedbacks': seller.avg_feedbacks,
                'Position': seller.position,
                'Status': seller.status,
                'Profit_Margin': seller.profit_margin
            })
        
        # Создаем DataFrame
        df = pd.DataFrame(export_data)
        
        # Создаем XLSX файл в памяти
        output = BytesIO()
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            df.to_excel(writer, sheet_name='Sellers_Analysis', index=False)
            
            # Получаем workbook и worksheet для форматирования
            workbook = writer.book
            worksheet = writer.sheets['Sellers_Analysis']
            
            # Форматирование заголовков
            header_format = workbook.add_format({
                'bold': True,
                'text_wrap': True,
                'valign': 'top',
                'fg_color': '#667eea',
                'font_color': 'white',
                'border': 1
            })
            
            # Применяем форматирование к заголовкам
            for col_num, value in enumerate(df.columns.values):
                worksheet.write(0, col_num, value, header_format)
                
            # Автоширина колонок
            for i, col in enumerate(df.columns):
                max_length = max(
                    df[col].astype(str).str.len().max(),
                    len(str(col))
                )
                worksheet.set_column(i, i, min(max_length + 2, 50))
        
        output.seek(0)
        
        # Возвращаем файл
        filename = f"sellers_{request.brand}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        
        return StreamingResponse(
            BytesIO(output.getvalue()), 
            media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            headers={'Content-Disposition': f'attachment; filename="{filename}"'}
        )
        
    except ImportError:
        raise HTTPException(status_code=500, detail="Excel export requires pandas and xlsxwriter packages")
    except Exception as e:
        logger.error(f"Error in seller export: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error in seller export: {str(e)}")

@router.get("/brands")
async def get_popular_brands():
    """Получение списка популярных брендов для анализа"""
    return {
        "brands": [
            "Nike", "Adidas", "Apple", "Samsung", "Xiaomi",
            "H&M", "Zara", "Uniqlo", "IKEA", "Philips",
            "Sony", "LG", "Bosch", "Siemens", "Panasonic"
        ]
    } 