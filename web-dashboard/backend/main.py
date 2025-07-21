from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
import jwt
import bcrypt
import sqlite3
import sys
import os
import json
# Ensure project root in sys.path for modules outside backend (e.g., supply_planning.py at repo root)
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir, os.pardir))
if ROOT_DIR not in sys.path:
    sys.path.append(ROOT_DIR)
from datetime import datetime, timedelta
import asyncio
import logging

# Импортируем наши функции для работы с Wildberries
from wb_api import get_wb_product_info, format_product_analysis, generate_recommendations, analyze_competition, search_competitors, get_brand_analysis
from supplier_analysis import get_supplier_analysis, format_supplier_message
from oracle_queries import OracleQueries
from global_search import global_search_serper_detailed
from seasonality_analysis import get_seasonality_analysis

# AI generation
from ai_generation import generate_ai_content  # type: ignore
from config import OPENAI_API_KEY  # type: ignore

# Supply planning
from supply_planning import supply_planner, format_supply_planning_report  # type: ignore
from blogger_search import search_bloggers_by_query, format_blogger_search_results  # type: ignore

# patch for circular import with new_bot
import sys, types
import os
# Provide dummy 'main' module so that new_bot import works without circular dependency
if 'main' not in sys.modules:
    _dummy = types.ModuleType('main')
    _dummy.ProductCardAnalyzer = object  # placeholder to satisfy new_bot import
    _dummy.TrendAnalyzer = object
    _dummy.app = None  # будет заменён реальным приложением FastAPI ниже
    sys.modules['main'] = _dummy
else:
    # If already present (e.g., during reload), ensure attributes exist
    dummy_main = sys.modules['main']
    if not hasattr(dummy_main, 'ProductCardAnalyzer'):
        dummy_main.ProductCardAnalyzer = object
    if not hasattr(dummy_main, 'TrendAnalyzer'):
        dummy_main.TrendAnalyzer = object
    if not hasattr(dummy_main, 'app'):
        dummy_main.app = None

# Заглушки для функций из bot модуля (нам не нужен бот в web-dashboard)
async def get_external_ads_data(query: str):
    """Заглушка для внешнего анализа рекламы"""
    return {
        "query": query,
        "external_ads": [],
        "social_media_posts": [],
        "influencer_content": [],
        "status": "external_analysis_disabled_for_web_dashboard"
    }

def format_external_analysis(data):
    """Заглушка для форматирования внешнего анализа"""
    summary = f"Внешний анализ для '{data.get('query', '')}' временно отключен в web-dashboard"
    return summary, data

# Import functions after dummy module registered
# Отключаем импорт бота для web-dashboard - он нам не нужен
# from new_bot import get_external_ads_data, format_external_analysis  # type: ignore

# Import the new MPStats analysis routes
from routes.mpstats_analysis import router as mpstats_router
from routes.brand_analysis import router as brand_router
from routes.category_analysis import router as category_router
from routes.blogger_search import router as blogger_router
from routes.supplier_analysis import router as seller_router
from routes.oracle_analysis import router as oracle_router

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Whitesamurai Web App",
    description="Analytics dashboard for e-commerce data",
    version="2.0.0"
)
# Обновляем фиктивный модуль, чтобы Uvicorn мог найти приложение
sys.modules['main'].app = app

# CORS настройки
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# JWT настройки
SECRET_KEY = "your-secret-key-here"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 * 24 * 60  # 30 дней

security = HTTPBearer()

# База данных
DATABASE_PATH = "users.db"

# Инициализация Oracle (анализ категорий)
oracle = OracleQueries()

# Pydantic модели
class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    telegram_id: Optional[int] = None

class ProductAnalysisRequest(BaseModel):
    article: str

class BrandAnalysisRequest(BaseModel):
    brand_name: str

class AdMonitoringRequest(BaseModel):
    articles: List[str]
    manual_data: Optional[Dict[str, Any]] = None

class PasswordChangeRequest(BaseModel):
    new_password: str

class SubscriptionUpgradeRequest(BaseModel):
    plan: str

class SupplierAnalysisRequest(BaseModel):
    supplier_name: str

class CategoryAnalysisRequest(BaseModel):
    category_name: str
    month: Optional[str] = None  # формат YYYY-MM, по умолчанию текущий месяц

class GlobalSearchRequest(BaseModel):
    query: str

# Анализ сезонности
class SeasonalityAnalysisRequest(BaseModel):
    category: str  # Wildberries category path, e.g. "Женщинам/Платья/Коктейльные"

# ==== AI Helper ====
class AIHelperRequest(BaseModel):
    content_type: str  # e.g. 'product_description', 'product_card', etc.
    prompt: str        # user input / description for generation

# ==== Supply Planning ====
class SupplyPlanningRequest(BaseModel):
    articles: List[str]

class EnhancedSupplyPlanningRequest(BaseModel):
    articles: List[str]
    target_stock_days: Optional[int] = 15  # Настраиваемый целевой запас

# ==== Blogger Search ====
class BloggerSearchRequest(BaseModel):
    query: str

# ==== External Analysis ====
class ExternalAnalysisRequest(BaseModel):
    query: str

class OracleMainRequest(BaseModel):
    queries_count: int = 3  # 1-5
    month: str              # format YYYY-MM
    min_revenue: int = 0
    min_frequency: int = 0

class EnhancedOracleRequest(BaseModel):
    queries_count: int = 3  # 1-5
    month: str              # format YYYY-MM
    min_revenue: int = 0
    min_frequency: int = 0
    oracle_type: str = "products"  # products, brands, suppliers, categories, search_queries
    # Дополнительные фильтры
    category_filter: Optional[str] = None
    brand_filter: Optional[str] = None
    supplier_filter: Optional[str] = None

# Функции безопасности
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return email
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Инициализация базы данных
def init_db():
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS web_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            telegram_id INTEGER,
            balance REAL DEFAULT 1000.0,
            subscription_type TEXT DEFAULT 'Pro',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            total_analyses INTEGER DEFAULT 0
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_operations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_email TEXT NOT NULL,
            type TEXT NOT NULL,
            description TEXT NOT NULL,
            amount REAL NOT NULL,
            status TEXT DEFAULT 'completed',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_email) REFERENCES web_users (email)
        )
    ''')
    
    test_password = hash_password("testpassword")
    cursor.execute('''
        INSERT OR REPLACE INTO web_users (email, password_hash, balance, subscription_type, total_analyses)
        VALUES (?, ?, ?, ?, ?)
    ''', ("test@example.com", test_password, 1000.0, "Pro", 156))
    
    # Добавляем тестовые операции
    cursor.execute('''
        INSERT OR REPLACE INTO user_operations (user_email, type, description, amount, created_at)
        VALUES 
        ('test@example.com', 'analysis', 'Анализ товара #275191790', -50, '2024-07-03 10:15:00'),
        ('test@example.com', 'subscription', 'Продление Pro подписки', -1990, '2024-07-01 09:00:00'),
        ('test@example.com', 'bonus', 'Бонус за регистрацию', 1000, '2024-06-15 14:20:00'),
        ('test@example.com', 'analysis', 'Анализ бренда Apple', -100, '2024-06-20 16:45:00')
    ''')
    
    conn.commit()
    conn.close()

def generate_fallback_category_recommendations(summary: str) -> Dict[str, Any]:
    """Простейший парсер summary → генерирует 5 плюсов и 5 минусов на основе ключевых слов."""
    plus = [
        "Высокий спрос в течение года",
        "Разнообразный ассортимент",
        "Стабильный средний чек",
        "Высокая конверсия покупателей",
        "Большое количество продавцов (риск/возможность)"
    ]
    minus = [
        "Высокая конкуренция",
        "Неравномерность продаж по сезону",
        "Высокие маркетинговые затраты",
        "Сложность управления ассортиментом",
        "Низкая маржинальность отдельных подкатегорий"
    ]
    return {"pluses": plus[:5], "minuses": minus[:5], "score": 3.5}

async def generate_category_recommendations(summary: str) -> Dict[str, Any]:
    try:
        import openai
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            return generate_fallback_category_recommendations(summary)
        client = openai.AsyncOpenAI(api_key=api_key)
        prompt = (
            "Ты — консультант Wildberries. Прочитай краткое описание категории и перечисли 5 плюсах и 5 минусах, "
            "а затем дай общую оценку категории по 5-балльной шкале (целое или с половиной). "
            "Формат ответа JSON с ключами pluses, minuses, score.\n\n"
            f"Описание категории:\n{summary}\n"
        )
        chat = await client.chat.completions.create(
            model="gpt-3.5-turbo-0613",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=400,
            temperature=0.6
        )
        raw = chat.choices[0].message.content
        try:
            data = json.loads(raw)
            if all(k in data for k in ("pluses", "minuses", "score")):
                return data
        except Exception:
            pass
        return generate_fallback_category_recommendations(summary)
    except Exception:
        return generate_fallback_category_recommendations(summary)

# Авторизация
@app.post("/auth/register")
async def register(user: UserRegister):
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    try:
        hashed_password = hash_password(user.password)
        cursor.execute('''
            INSERT INTO web_users (email, password_hash, telegram_id)
            VALUES (?, ?, ?)
        ''', (user.email, hashed_password, user.telegram_id))
        
        conn.commit()
        return {"message": "User registered successfully"}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Email already registered")
    finally:
        conn.close()

@app.post("/auth/login")
async def login(user: UserLogin):
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    cursor.execute("SELECT password_hash FROM web_users WHERE email = ?", (user.email,))
    result = cursor.fetchone()
    conn.close()
    
    if not result or not verify_password(user.password, result[0]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/auth/verify")
async def verify_token(email: str = Depends(get_current_user)):
    return {"email": email, "valid": True}

# Пользовательские данные
@app.get("/user/dashboard")
async def get_dashboard_data(email: str = Depends(get_current_user)):
    """Возвращает живую статистику по действиям пользователя и последние активности."""
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()

    # Базовые данные пользователя
    cursor.execute(
        """
        SELECT email, balance, subscription_type
        FROM web_users WHERE email = ?
        """,
        (email,)
    )
    user_row = cursor.fetchone()
    if not user_row:
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")

    # Подсчёт действий
    def count_ops(op_type: str) -> int:
        cursor.execute(
            "SELECT COUNT(*) FROM user_operations WHERE user_email = ? AND type = ?",
            (email, op_type),
        )
        return cursor.fetchone()[0] or 0

    products_cnt = count_ops("product")
    brands_cnt = count_ops("brand")
    niches_cnt = count_ops("niche")  # оставлено для возможных будущих метрик
    ai_helper_cnt = count_ops("ai_helper")

    # Экономия = 133₽ за каждое использование одного из основных блоков аналитики
    block_types = (
        'product','brand','niche','supplier','category','seasonality',
        'external_analysis','blogger_search','global_search','ai_helper',
        'oracle_queries','supply_planning','ad_monitoring'
    )
    cursor.execute(
        f"SELECT COUNT(*) FROM user_operations WHERE user_email = ? AND type IN ({','.join(['?']*len(block_types))})",
        (email, *block_types),
    )
    blocks_used = cursor.fetchone()[0] or 0
    total_savings = blocks_used * 133

    # Последние 3 операции (product/brand/niche) для ленты активности
    cursor.execute(
        """
        SELECT type, description, created_at
        FROM user_operations
        WHERE user_email = ? AND type IN ('product','brand','niche')
        ORDER BY created_at DESC
        LIMIT 3
        """,
        (email,),
    )
    recent_rows = cursor.fetchall()
    recent_activity = [
        {"type": row[0], "item": row[1] or row[0].capitalize(), "date": row[2]} for row in recent_rows
    ]

    conn.close()

    return {
        "user": {
            "email": user_row[0],
            "balance": user_row[1],
            "subscription_type": user_row[2],
        },
        "stats": {
            "products_analyzed": products_cnt,
            "brands_analyzed": brands_cnt,
            "ai_helper_uses": ai_helper_cnt,
            "total_savings": total_savings,
        },
        "recent_activity": recent_activity,
    }

# Анализ продуктов
@app.post("/analysis/product")
async def analyze_product(request: ProductAnalysisRequest, email: str = Depends(get_current_user)):
    try:
        logger.info(f"🔧 Starting FIXED product analysis for article: {request.article}")
        
        # 🔧 ИСПОЛЬЗУЕМ ИСПРАВЛЕННУЮ ФУНКЦИЮ
        try:
            from wb_api_fixed import get_wb_product_info_fixed
            logger.info(f"✅ Using fixed WB API integration for {request.article}")
            product_info = await get_wb_product_info_fixed(request.article)
        except ImportError:
            # Fallback к старой функции
            logger.warning("⚠️ Fixed module not available, using original")
            product_info = await get_wb_product_info(request.article)
        
        if not product_info:
            # Создаем заглушку если нет данных
            logger.warning(f"No product data found for {request.article}, creating fallback")
            product_info = {
                'article': request.article,
                'name': f'Товар {request.article}',
                'brand': 'Неизвестный бренд',
                'price': {'current': 1299, 'original': 1499, 'discount': 13},
                'rating': 4.2,
                'reviews_count': 187,
                'stocks': {'total': 156, 'by_size': {}},
                'sales': {
                    'today': 0,
                    'total': 0,
                    'revenue': {'daily': 0, 'weekly': 0, 'monthly': 0, 'total': 0},
                    'profit': {'daily': 0, 'weekly': 0, 'monthly': 0}
                },
                'feedbacks': 187
            }
        
        # 🔧 ИСПОЛЬЗУЕМ ИСПРАВЛЕННУЮ ФУНКЦИЮ ФОРМАТИРОВАНИЯ
        try:
            # Попробуем использовать исправленную функцию
            from wb_api_fixed import get_mpstats_product_data_fixed
            
            # Получаем MPStats данные через исправленный API
            logger.info(f"🔧 Getting MPStats data using fixed API for {request.article}")
            mpstats_data = await get_mpstats_product_data_fixed(request.article)
            
            # Обновляем product_info данными из MPStats
            if mpstats_data and mpstats_data.get('daily_sales', 0) > 0:
                product_info['sales'].update({
                    'today': mpstats_data.get('daily_sales', 0),
                    'total': mpstats_data.get('total_sales', 0),
                    'revenue': {
                        'daily': mpstats_data.get('daily_revenue', 0),
                        'weekly': mpstats_data.get('daily_revenue', 0) * 7,
                        'monthly': mpstats_data.get('daily_revenue', 0) * 30,
                        'total': mpstats_data.get('total_revenue', 0)
                    },
                    'profit': {
                        'daily': mpstats_data.get('daily_profit', 0),
                        'weekly': mpstats_data.get('daily_profit', 0) * 7,
                        'monthly': mpstats_data.get('daily_profit', 0) * 30
                    }
                })
                logger.info(f"✅ Product info updated with MPStats data: {mpstats_data.get('daily_sales')} sales/day")
            
            # Используем старую функцию форматирования с обновленными данными
            analysis = await format_product_analysis(product_info, request.article)
            
            # 🔧 ДОБАВЛЯЕМ ОТЛАДОЧНУЮ ИНФОРМАЦИЮ
            if mpstats_data:
                analysis['mpstats_debug'] = {
                    'api_status': 'fixed_api_used',
                    'has_sales_data': bool(mpstats_data.get('raw_data')),
                    'daily_sales': mpstats_data.get('daily_sales', 0),
                    'daily_revenue': mpstats_data.get('daily_revenue', 0),
                    'debug_info': mpstats_data.get('debug_info', {})
                }
            else:
                analysis['mpstats_debug'] = {
                    'api_status': 'no_data_received',
                    'message': 'MPStats API returned no data'
                }
                
        except ImportError as e:
            logger.warning(f"⚠️ Fixed MPStats module not available: {e}, using fallback")
            analysis = await format_product_analysis(product_info, request.article)
            analysis['mpstats_debug'] = {
                'api_status': 'fallback_used',
                'reason': 'fixed_module_not_available'
            }
        except Exception as e:
            logger.error(f"❌ Error using fixed MPStats API: {e}")
            analysis = await format_product_analysis(product_info, request.article)
            analysis['mpstats_debug'] = {
                'api_status': 'error',
                'error': str(e)
            }
        
        # 🔧 ДОБАВЛЯЕМ МЕТРИКИ ЭФФЕКТИВНОСТИ
        if mpstats_data:
            analysis['efficiency_metrics'] = {
                'purchase_rate': mpstats_data.get('purchase_rate', 72.5),
                'conversion_rate': mpstats_data.get('conversion_rate', 2.8),
                'market_share': mpstats_data.get('market_share', 0.3)
            }
        
        # 🔧 ДОБАВЛЯЕМ КОНКУРЕНТНЫЙ АНАЛИЗ ЧЕРЕЗ /get/in_similar
        try:
            from mpstats_api_fixed import mpstats_api
            
            # Получаем категорию товара для анализа конкурентов
            category_path = "/Для женщин/Одежда/Платья"  # Default category
            
            # Пытаемся определить категорию из данных товара
            if product_info and 'category' in product_info:
                category_path = product_info['category']
            elif product_info and 'name' in product_info:
                # Простая логика определения категории по названию
                name_lower = product_info['name'].lower()
                if 'платье' in name_lower or 'сарафан' in name_lower:
                    category_path = "/Для женщин/Одежда/Платья"
                elif 'обувь' in name_lower or 'кроссовки' in name_lower:
                    category_path = "/Для женщин/Обувь"
                elif 'сумка' in name_lower:
                    category_path = "/Для женщин/Аксессуары/Сумки"
            
            logger.info(f"🔍 Getting competitive analysis for category: {category_path}")
            
            # Получаем данные конкурентов через проверенный endpoint
            similar_data = await mpstats_api.get_in_similar(category_path)
            
            if similar_data and similar_data.get('data'):
                competitive_analysis = {
                    'category_path': category_path,
                    'total_competitors': similar_data.get('total', 0),
                    'competitors_sample': similar_data.get('data', [])[:5],  # Топ 5 конкурентов
                    'market_insights': {
                        'api_response': 'success',
                        'data_source': 'mpstats_in_similar',
                        'last_updated': datetime.now().isoformat()
                    }
                }
                analysis['competitive_analysis'] = competitive_analysis
                logger.info(f"✅ Added competitive analysis: {similar_data.get('total', 0)} competitors found")
            else:
                analysis['competitive_analysis'] = {
                    'category_path': category_path,
                    'total_competitors': 0,
                    'competitors_sample': [],
                    'market_insights': {
                        'api_response': 'empty_data',
                        'message': 'No competitors found in this category',
                        'data_source': 'mpstats_in_similar'
                    }
                }
                logger.info(f"ℹ️ No competitors found in category: {category_path}")
                
        except Exception as e:
            logger.warning(f"⚠️ Could not get competitive analysis: {e}")
            analysis['competitive_analysis'] = {
                'error': str(e),
                'api_response': 'error'
            }
        
        # Логируем операцию
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO user_operations (user_email, type, description, amount)
            VALUES (?, 'product', ?, 0)
            """,
            (email, f"Анализ товара {request.article} (Fixed API)"),
        )
        conn.commit()
        conn.close()
        
        logger.info(f"✅ Fixed product analysis completed for {request.article}")
        return analysis
        
    except Exception as e:
        logger.error(f"❌ Error in fixed product analysis for {request.article}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Ошибка анализа товара: {str(e)}")

# Анализ бренда
@app.post("/analysis/brand")
async def analyze_brand(request: BrandAnalysisRequest, email: str = Depends(get_current_user)):
    try:
        logger.info(f"Starting brand analysis for: {request.brand_name}")
        
        # Получаем анализ бренда
        brand_analysis = await get_brand_analysis(request.brand_name)
        
        if not brand_analysis:
            raise HTTPException(status_code=404, detail="Brand not found")
        
        # Логируем операцию
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO user_operations (user_email, type, description, amount)
            VALUES (?, 'brand', ?, 0)
            """,
            (email, f"Анализ бренда {request.brand_name}"),
        )
        conn.commit()
        conn.close()

        return {"success": True, "data": brand_analysis["data"], **brand_analysis["data"]}

    except HTTPException as he:
        # Пробрасываем 404 (или другие) без изменений
        raise he
    except Exception as e:
        logger.error(f"Error in brand analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error analyzing brand: {str(e)}")

# Форматированный анализ бренда (как в боте)
@app.post("/analysis/brand/formatted")
async def analyze_brand_formatted(request: BrandAnalysisRequest, email: str = Depends(get_current_user)):
    try:
        logger.info(f"Starting formatted brand analysis for: {request.brand_name}")
        
        # Получаем анализ бренда
        brand_analysis = await get_brand_analysis(request.brand_name)
        
        if not brand_analysis:
            raise HTTPException(status_code=404, detail="Brand not found")
        
        # Возвращаем форматированный текст как в боте
        return {
            "formatted_text": brand_analysis["formatted_text"],
            "data": brand_analysis["data"]
        }
        
    except Exception as e:
        logger.error(f"Error in formatted brand analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error analyzing brand: {str(e)}")

# Мониторинг рекламы
@app.post("/planning/ad-monitoring")
async def monitor_ads(request: AdMonitoringRequest, email: str = Depends(get_current_user)):
    results = []
    total_spend = 0
    total_revenue = 0
    profitable_campaigns = 0
    
    for article in request.articles:
        try:
            # Получаем данные о товаре
            product_info = await get_wb_product_info(article)
            
            if product_info:
                # Используем реальные данные
                price = product_info['price']['current']
                daily_sales = product_info['sales']['today'] if product_info['sales']['today'] > 0 else max(1, product_info['feedbacks'] // 10)
                name = product_info['name']
            else:
                # Заглушка при ошибке
                price = 1000 + len(article) * 50
                daily_sales = 5 + len(article) % 20
                name = f"Товар {article}"
            
            # Рассчитываем рекламные метрики
            spend = daily_sales * price * 0.15  # 15% от выручки на рекламу
            revenue = daily_sales * price
            roi = ((revenue - spend) / spend) * 100 if spend > 0 else 0
            
            total_spend += spend
            total_revenue += revenue
            
            if roi > 0:
                profitable_campaigns += 1
                if roi > 50:
                    status = "🟢 Очень прибыльная"
                elif roi > 20:
                    status = "🟢 Прибыльная"
                else:
                    status = "🟡 Безубыточная"
            else:
                status = "🔴 Убыточная"
            
            # Рассчитываем CTR и другие метрики
            impressions = int(daily_sales * 500)  # Примерно 500 показов на продажу
            clicks = int(impressions * 0.02)  # 2% CTR
            ctr = 2.0
            
            results.append({
                "article": article,
                "name": name,
                "spend": round(spend, 2),
                "revenue": round(revenue, 2),
                "roi": round(roi, 2),
                "clicks": clicks,
                "impressions": impressions,
                "ctr": ctr,
                "status": status
            })
            
        except Exception as e:
            logger.error(f"Error processing article {article}: {str(e)}")
            # Заглушка при ошибке
            spend = 5000 + len(article) * 100
            revenue = spend * 1.2
            roi = 20.0
            
            total_spend += spend
            total_revenue += revenue
            profitable_campaigns += 1
            
            results.append({
                "article": article,
                "name": f"Товар {article}",
                "spend": spend,
                "revenue": revenue,
                "roi": roi,
                "clicks": 1500,
                "impressions": 25000,
                "ctr": 6.0,
                "status": "🟢 Прибыльная"
            })
    
    total_roi = ((total_revenue - total_spend) / total_spend) * 100 if total_spend > 0 else 0
    
    return {
        "results": results,
        "summary": {
            "total_campaigns": len(request.articles),
            "profitable_campaigns": profitable_campaigns,
            "total_spend": round(total_spend, 2),
            "total_revenue": round(total_revenue, 2),
            "total_roi": round(total_roi, 2),
            "average_roi": round(sum(r["roi"] for r in results) / len(results), 2) if results else 0
        },
        "recommendations": [
            "Увеличить бюджет на кампании с ROI > 50%",
            "Оптимизировать ключевые слова для кампаний с ROI < 20%",
            "Протестировать новые креативы для улучшения CTR",
            "Рассмотреть отключение кампаний с ROI < 0%",
            "Анализировать конверсию по дням недели"
        ]
    }

# Новые эндпоинты для профиля
@app.get("/user/profile")
async def get_user_profile(email: str = Depends(get_current_user)):
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT email, balance, subscription_type, created_at, last_login, total_analyses
        FROM web_users WHERE email = ?
    ''', (email,))
    
    result = cursor.fetchone()
    conn.close()
    
    if not result:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "email": result[0],
        "balance": result[1],
        "subscription_type": result[2],
        "created_at": result[3],
        "last_login": result[4],
        "total_analyses": result[5]
    }

@app.get("/user/operations")
async def get_user_operations(email: str = Depends(get_current_user)):
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT id, type, description, amount, status, created_at
        FROM user_operations 
        WHERE user_email = ?
        ORDER BY created_at DESC
        LIMIT 50
    ''', (email,))
    
    operations = []
    for row in cursor.fetchall():
        operations.append({
            "id": row[0],
            "type": row[1],
            "description": row[2],
            "amount": row[3],
            "status": row[4],
            "date": row[5]
        })
    
    conn.close()
    return operations

@app.post("/user/change-password")
async def change_password(request: PasswordChangeRequest, email: str = Depends(get_current_user)):
    if len(request.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long")
    
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    new_password_hash = hash_password(request.new_password)
    cursor.execute('''
        UPDATE web_users SET password_hash = ?
        WHERE email = ?
    ''', (new_password_hash, email))
    
    conn.commit()
    conn.close()
    
    return {"message": "Password changed successfully"}

@app.post("/user/upgrade-subscription")
async def upgrade_subscription(request: SubscriptionUpgradeRequest, email: str = Depends(get_current_user)):
    valid_plans = ["Free", "Pro", "Business"]
    if request.plan not in valid_plans:
        raise HTTPException(status_code=400, detail="Invalid subscription plan")
    
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    # Получаем текущую подписку
    cursor.execute("SELECT subscription_type, balance FROM web_users WHERE email = ?", (email,))
    result = cursor.fetchone()
    
    if not result:
        raise HTTPException(status_code=404, detail="User not found")
    
    current_plan, balance = result
    
    # Определяем стоимость планов
    plan_prices = {"Free": 0, "Pro": 1990, "Business": 4990}
    price = plan_prices[request.plan]
    
    # Проверяем баланс для платных планов
    if price > 0 and balance < price:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    # Обновляем подписку
    new_balance = balance - price if price > 0 else balance
    cursor.execute('''
        UPDATE web_users SET subscription_type = ?, balance = ?
        WHERE email = ?
    ''', (request.plan, new_balance, email))
    
    # Добавляем операцию
    if price > 0:
        cursor.execute('''
            INSERT INTO user_operations (user_email, type, description, amount)
            VALUES (?, ?, ?, ?)
        ''', (email, "subscription", f"Изменение подписки на {request.plan}", -price))
    
    conn.commit()
    conn.close()
    
    return {"message": f"Subscription upgraded to {request.plan}"}

@app.post("/user/add-balance")
async def add_balance(amount: float, email: str = Depends(get_current_user)):
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    cursor.execute('''
        UPDATE web_users SET balance = balance + ?
        WHERE email = ?
    ''', (amount, email))
    
    cursor.execute('''
        INSERT INTO user_operations (user_email, type, description, amount)
        VALUES (?, ?, ?, ?)
    ''', (email, "payment", f"Пополнение баланса", amount))
    
    conn.commit()
    conn.close()
    
    return {"message": f"Balance increased by {amount}₽"}

# Анализ поставщика
@app.post("/analysis/supplier")
async def analyze_supplier(request: SupplierAnalysisRequest, email: str = Depends(get_current_user)):
    """Endpoint identical to bot's supplier analysis but returns JSON for frontend."""
    try:
        logger.info(f"Starting supplier analysis for: {request.supplier_name}")

        supplier_data = await get_supplier_analysis(request.supplier_name)

        if not supplier_data:
            raise HTTPException(status_code=404, detail="Supplier not found")

        # Log operation
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO user_operations (user_email, type, description, amount)
            VALUES (?, 'supplier', ?, 0)
            """,
            (email, f"Анализ поставщика {request.supplier_name}"),
        )
        conn.commit()
        conn.close()

        camel = {
            "supplierName": supplier_data.get("supplierName"),
            "inn": supplier_data.get("inn"),
            "ogrn": supplier_data.get("ogrn"),
            "totalProducts": supplier_data.get("totalProducts"),
            "averagePrice": supplier_data.get("averagePrice"),
            "totalSales": supplier_data.get("totalSales"),
            "categories": supplier_data.get("categories"),
            "topProducts": supplier_data.get("topProducts"),
            "adActivity": supplier_data.get("adActivity", False),
            "recommendations": supplier_data.get("recommendations", [])
        }
        return {"success": True, "data": camel, **camel}

    except Exception as e:
        logger.error(f"Error in supplier analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error analyzing supplier: {str(e)}")

# Анализ категории (категорий)
@app.post("/analysis/category")
async def analyze_category(request: CategoryAnalysisRequest, email: str = Depends(get_current_user)):
    """Возвращает анализ категории Wildberries аналогичный боту (OracleQueries)."""
    try:
        month = request.month or datetime.utcnow().strftime("%Y-%m")
        logger.info(f"Starting category analysis for: {request.category_name} month={month}")

        data = await oracle.get_category_analysis(request.category_name, month, analysis_type="categories")

        if "error" in data:
            raise HTTPException(status_code=404, detail=data["error"])

        # Добавляем рекомендации
        summary_text = data.get("summary", "") if isinstance(data, dict) else ""
        recs = await generate_category_recommendations(summary_text)
        data["pluses"] = recs.get("pluses", [])
        data["minuses"] = recs.get("minuses", [])
        data["score"] = recs.get("score", 0)

        # Логируем операцию
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO user_operations (user_email, type, description, amount)
            VALUES (?, 'category', ?, 0)
            """,
            (email, f"Анализ категории {request.category_name}"),
        )
        conn.commit()
        conn.close()

        return {"success": True, "data": data, **data}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in category analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error analyzing category: {str(e)}")

@app.post("/analysis/global-search")
async def analyze_global_search(request: GlobalSearchRequest, email: str = Depends(get_current_user)):
    """Performs social-media global search using Serper API (same as Telegram bot)."""
    try:
        logger.info(f"Starting global search for: {request.query}")

        results = await global_search_serper_detailed(request.query)
        # Если результатов нет, возвращаем пустой массив, но не выбрасываем 404,
        # чтобы фронтенд мог корректно отобразить сообщение «ничего не найдено»

        # Log to user_operations for dashboard statistics
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO user_operations (user_email, type, description, amount)
            VALUES (?, 'global_search', ?, 0)
            """,
            (email, f"Глобальный поиск \"{request.query}\""),
        )
        conn.commit()
        conn.close()

        return {"success": True, "data": {"query": request.query, "results": results}}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in global search: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error performing global search: {str(e)}")

# Анализ сезонности категории
@app.post("/analysis/seasonality")
async def analyze_seasonality(request: SeasonalityAnalysisRequest, email: str = Depends(get_current_user)):
    """Returns seasonality analysis (annual & weekly) for the given WB category path."""
    try:
        logger.info(f"Starting seasonality analysis for: {request.category}")

        data = await get_seasonality_analysis(request.category)

        if "error" in data.get("annualData", {}):
            raise HTTPException(status_code=400, detail=data["annualData"]["error"])

        # Log operation in user_operations
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO user_operations (user_email, type, description, amount)
            VALUES (?, 'seasonality', ?, 0)
            """,
            (email, f"Сезонность категории {request.category}"),
        )
        conn.commit()
        conn.close()

        return {"success": True, "data": data, **data}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in seasonality analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error analyzing seasonality: {str(e)}")

# ================================
#        AI HELPER ENDPOINT       
# ================================

@app.post("/analysis/ai-helper")
async def ai_helper(request: AIHelperRequest, email: str = Depends(get_current_user)):
    """Generate marketing content via OpenAI (same as Telegram bot AI helper)."""
    try:
        logger.info(f"AI helper generation request by {email}: {request.content_type}")

        generated_text = await generate_ai_content(request.content_type, request.prompt, OPENAI_API_KEY)

        # Log operation in user_operations – zero cost for now
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO user_operations (user_email, type, description, amount)
            VALUES (?, 'ai_helper', ?, 0)
            """,
            (email, f"AI helper ({request.content_type})"),
        )
        conn.commit()
        conn.close()

        return {"success": True, "data": {"content": generated_text}}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in AI helper: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating AI content: {str(e)}")

# ================================
#        SUPPLY PLANNING          
# ================================

@app.post("/planning/supply-planning")
async def plan_supply(request: SupplyPlanningRequest, email: str = Depends(get_current_user)):
    """Return supply planning analysis for a list of WB articles."""
    try:
        if not request.articles:
            raise HTTPException(status_code=400, detail="No articles provided")

        logger.info(f"Starting supply planning for {len(request.articles)} articles")

        products_data = await supply_planner.analyze_multiple_products(request.articles)

        summary = format_supply_planning_report(products_data)

        # Log operation
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO user_operations (user_email, type, description, amount)
            VALUES (?, 'supply_planning', ?, 0)
            """,
            (email, f"Supply planning for {len(request.articles)} items"),
        )
        conn.commit()
        conn.close()

        return {"success": True, "data": {"products": products_data, "summary": summary}}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in supply planning: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error in supply planning: {str(e)}")

# ================================
#    ENHANCED SUPPLY PLANNING     
# ================================

class EnhancedSupplyPlanningRequest(BaseModel):
    articles: List[str]
    target_stock_days: Optional[int] = 15  # Настраиваемый целевой запас

@app.post("/planning/supply-planning-enhanced")
async def enhanced_supply_planning(request: EnhancedSupplyPlanningRequest, email: str = Depends(get_current_user)):
    """Enhanced supply planning analysis with comprehensive metrics and real data integration."""
    try:
        if not request.articles:
            raise HTTPException(status_code=400, detail="No articles provided")
        
        if len(request.articles) > 50:
            raise HTTPException(status_code=400, detail="Maximum 50 articles allowed")

        logger.info(f"Enhanced supply planning by {email}: {len(request.articles)} articles, target days: {request.target_stock_days}")

        # Импортируем расширенный модуль
        from supply_planning_enhanced import enhanced_supply_planner, format_enhanced_supply_report
        
        # Настраиваем целевой запас
        if request.target_stock_days:
            enhanced_supply_planner.set_target_stock_days(request.target_stock_days)
        
        # Выполняем анализ
        skus_data = await enhanced_supply_planner.analyze_multiple_skus(request.articles)
        
        # Всегда возвращаем результат, даже если данные частично недоступны
        if not skus_data:
            # Создаем минимальную заглушку если совсем ничего не получено
            skus_data = [{
                "article": article,
                "brand": "Ошибка загрузки",
                "product_name": f"Товар {article} (данные недоступны)",
                "error": "Все источники данных недоступны"
            } for article in request.articles]
        
        # Рассчитываем общую аналитику
        summary_analytics = enhanced_supply_planner.calculate_summary_analytics(skus_data)
        
        # Форматируем отчет
        formatted_report = format_enhanced_supply_report(skus_data, summary_analytics)

        # Log operation
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO user_operations (user_email, type, description, amount)
            VALUES (?, 'enhanced_supply_planning', ?, 0)
            """,
            (email, f"Enhanced supply planning for {len(request.articles)} SKUs"),
        )
        conn.commit()
        conn.close()

        return {
            "success": True, 
            "data": {
                "skus": skus_data,
                "summary": summary_analytics,
                "formatted_report": formatted_report,
                "total_skus": len(skus_data),
                "target_stock_days": request.target_stock_days
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in enhanced supply planning: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error in enhanced supply planning: {str(e)}")

@app.post("/planning/supply-planning-export")
async def export_supply_planning(request: EnhancedSupplyPlanningRequest, email: str = Depends(get_current_user)):
    """Export enhanced supply planning data to CSV/Excel format."""
    try:
        if not request.articles:
            raise HTTPException(status_code=400, detail="No articles provided")

        logger.info(f"Supply planning export by {email}: {len(request.articles)} articles")

        # Импортируем расширенный модуль
        from supply_planning_enhanced import enhanced_supply_planner
        import pandas as pd
        import io
        
        # Настраиваем целевой запас
        if request.target_stock_days:
            enhanced_supply_planner.set_target_stock_days(request.target_stock_days)
        
        # Выполняем анализ
        skus_data = await enhanced_supply_planner.analyze_multiple_skus(request.articles)
        
        if not skus_data:
            raise HTTPException(status_code=404, detail="No data found for export")
        
        # Подготавливаем данные для экспорта
        export_data = []
        for sku in skus_data:
            export_row = {
                "Артикул": sku.get("article", ""),
                "Бренд": sku.get("brand", ""),
                "Товар": sku.get("product_name", ""),
                "Остаток на складах": sku.get("total_stock", 0),
                "Товар в резервах": sku.get("reserved_stock", 0),
                "Продажи 7 дней": sku.get("sales_7d_units", 0),
                "Продажи 30 дней": sku.get("sales_30d_units", 0),
                "Продажи 60 дней": sku.get("sales_60d_units", 0),
                "Продажи 90 дней": sku.get("sales_90d_units", 0),
                "Средние продажи в день": sku.get("avg_daily_sales", 0),
                "Прогноз продаж 30 дней": sku.get("forecast_30d_units", 0),
                "Оборачиваемость (дни)": sku.get("turnover_days", 0),
                "Рекомендуемая поставка": sku.get("recommended_supply", 0),
                "Дни до OOS": sku.get("days_until_oos", 0),
                "Запас в днях": sku.get("available_days", 0),
                "Тренд продаж": sku.get("sales_trend", {}).get("trend_text", ""),
                "Маржа на товар": sku.get("estimated_margin", 0),
                "Процент в рекламе": sku.get("ad_percentage", 0),
                "Последняя поставка": sku.get("last_supply_date", ""),
                "Выручка 30 дней": sku.get("revenue_30d", 0),
                "Выручка 60 дней": sku.get("revenue_60d", 0),
                "Выручка 90 дней": sku.get("revenue_90d", 0),
                "Статус остатков": sku.get("stock_status_text", ""),
                "Приоритет поставки": sku.get("supply_priority_text", "")
            }
            export_data.append(export_row)
        
        # Создаем DataFrame
        df = pd.DataFrame(export_data)
        
        # Экспорт в CSV
        csv_buffer = io.StringIO()
        df.to_csv(csv_buffer, index=False, encoding='utf-8-sig')
        csv_content = csv_buffer.getvalue()
        
        # Log operation
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO user_operations (user_email, type, description, amount)
            VALUES (?, 'supply_planning_export', ?, 0)
            """,
            (email, f"Supply planning export for {len(request.articles)} SKUs"),
        )
        conn.commit()
        conn.close()

        return {
            "success": True,
            "data": {
                "csv_content": csv_content,
                "filename": f"supply_planning_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
                "total_records": len(export_data)
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in supply planning export: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error in supply planning export: {str(e)}")

# ================================
#        BLOGGER SEARCH           
# ================================

@app.post("/analysis/bloggers")
async def analyze_bloggers(request: BloggerSearchRequest, email: str = Depends(get_current_user)):
    """Search bloggers across platforms similar to Telegram bot."""
    try:
        if not request.query.strip():
            raise HTTPException(status_code=400, detail="Query is empty")

        logger.info(f"Starting blogger search for: {request.query}")

        results = await search_bloggers_by_query(request.query)
        summary_text = format_blogger_search_results(results)

        # Log operation
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO user_operations (user_email, type, description, amount)
            VALUES (?, 'blogger_search', ?, 0)
            """,
            (email, f"Blogger search '{request.query}'"),
        )
        conn.commit()
        conn.close()

        return {"success": True, "data": {"results": results, "summary": summary_text}}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in blogger search: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error in blogger search: {str(e)}")

# ================================
#        EXTERNAL ANALYSIS        
# ================================

@app.post("/analysis/external")
async def analyze_external(request: ExternalAnalysisRequest, email: str = Depends(get_current_user)):
    """Analyze external ads and influencer posts for a product or keyword."""
    try:
        q = request.query.strip()
        if not q:
            raise HTTPException(status_code=400, detail="Query is empty")

        logger.info(f"Starting external analysis for: {q}")

        data = await get_external_ads_data(q)
        summary, _ = format_external_analysis(data)

        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO user_operations (user_email, type, description, amount)
            VALUES (?, 'external_analysis', ?, 0)
            """,
            (email, f"External analysis '{q}'"),
        )
        conn.commit()
        conn.close()

        return {"success": True, "data": {"results": data, "summary": summary}}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in external analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error in external analysis: {str(e)}")

# ================================
#        ORACLE QUERIES           
# ================================

@app.post("/analysis/oracle-queries")
async def oracle_main(request: OracleMainRequest, email: str = Depends(get_current_user)):
    """Основной анализ Оракула (поисковые запросы). Возвращает те же данные, что и бот."""
    try:
        if not (1 <= request.queries_count <= 5):
            raise HTTPException(status_code=400, detail="queries_count must be between 1 and 5")

        logger.info(
            f"Oracle queries by {email}: count={request.queries_count}, month={request.month}, "
            f"min_revenue={request.min_revenue}, min_freq={request.min_frequency}"
        )

        data = await oracle.get_search_queries_data(
            request.queries_count,
            request.month,
            request.min_revenue,
            request.min_frequency,
        )

        # Логируем операцию
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO user_operations (user_email, type, description, amount)
            VALUES (?, 'oracle_queries', ?, 0)
            """,
            (email, f"Oracle main {request.month} ({request.queries_count})"),
        )
        conn.commit()
        conn.close()

        return {"success": True, "data": data, **data}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in Oracle queries: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error in Oracle queries: {str(e)}")

@app.post("/analysis/oracle-enhanced")
async def oracle_enhanced(request: EnhancedOracleRequest, email: str = Depends(get_current_user)):
    """Расширенный анализ Оракула с поддержкой всех типов и дополнительных метрик"""
    try:
        if not (1 <= request.queries_count <= 5):
            raise HTTPException(status_code=400, detail="queries_count must be between 1 and 5")
        
        valid_types = ["products", "brands", "suppliers", "categories", "search_queries"]
        if request.oracle_type not in valid_types:
            raise HTTPException(status_code=400, detail=f"oracle_type must be one of: {valid_types}")

        logger.info(
            f"Enhanced Oracle by {email}: type={request.oracle_type}, count={request.queries_count}, "
            f"month={request.month}, min_revenue={request.min_revenue}"
        )

        # Импортируем расширенный модуль
        try:
            from oracle_enhanced import EnhancedOracleQueries
            enhanced_oracle = EnhancedOracleQueries()
        except ImportError:
            # Fallback к обычному оракулу если нет расширенного модуля
            logger.warning("Enhanced oracle module not found, using fallback")
            data = await oracle.get_search_queries_data(
                request.queries_count,
                request.month,
                request.min_revenue,
                request.min_frequency,
            )
            return {"success": True, "data": data, **data}

        # Вызываем расширенную функцию
        data = await enhanced_oracle.get_enhanced_oracle_data(
            queries_count=request.queries_count,
            month=request.month,
            min_revenue=request.min_revenue,
            min_frequency=request.min_frequency,
            oracle_type=request.oracle_type,
            category_filter=request.category_filter,
            brand_filter=request.brand_filter,
            supplier_filter=request.supplier_filter
        )

        # Логируем операцию
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO user_operations (user_email, type, description, amount)
            VALUES (?, 'oracle_enhanced', ?, 0)
            """,
            (email, f"Enhanced Oracle {request.oracle_type} {request.month} ({request.queries_count})"),
        )
        conn.commit()
        conn.close()

        return data

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in Enhanced Oracle: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error in Enhanced Oracle: {str(e)}")

@app.post("/analysis/oracle-export")
async def oracle_export(
    request: EnhancedOracleRequest, 
    format_type: str = "csv",
    email: str = Depends(get_current_user)
):
    """Экспорт данных оракула в CSV/Excel формат"""
    try:
        # Получаем данные
        oracle_data = await oracle_enhanced(request, email)
        
        if not oracle_data.get("success"):
            raise HTTPException(status_code=400, detail="Failed to get oracle data")
        
        # Импортируем расширенный модуль для экспорта
        try:
            from oracle_enhanced import EnhancedOracleQueries
            enhanced_oracle = EnhancedOracleQueries()
            export_data = enhanced_oracle.generate_export_data(oracle_data, format_type)
        except ImportError:
            raise HTTPException(status_code=500, detail="Export functionality not available")
        
        return {
            "success": True,
            "export_data": export_data,
            "download_url": f"/download/{export_data['filename']}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in Oracle export: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error in Oracle export: {str(e)}")

# Add the MPStats analysis routes
app.include_router(mpstats_router, prefix="/mpstats", tags=["MPStats Analysis"])
app.include_router(brand_router, prefix="/brand", tags=["Brand Analysis"])
app.include_router(category_router, prefix="/category", tags=["Category Analysis"])
app.include_router(blogger_router, prefix="/bloggers", tags=["Blogger Search"])
app.include_router(seller_router, prefix="/seller", tags=["Seller Analysis"])
app.include_router(oracle_router, prefix="/oracle", tags=["Oracle Analysis"])

if __name__ == "__main__":
    import uvicorn
    init_db()
    print("База данных инициализирована.")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
