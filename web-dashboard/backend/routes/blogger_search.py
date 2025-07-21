import logging
import statistics
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import asyncio
from io import BytesIO
import aiohttp
import re

# Настройка логирования
logger = logging.getLogger(__name__)

router = APIRouter(tags=["blogger_search"])

# Импорт конфигурации
try:
    from config import SERPER_API_KEY
except ImportError:
    # Fallback если config.py не найден
    SERPER_API_KEY = "your_serper_api_key_here"

# === Модели данных ===

class BloggerSearchRequest(BaseModel):
    keyword: str
    platforms: List[str] = ["youtube", "instagram", "tiktok", "telegram"]
    min_followers: Optional[int] = None
    max_followers: Optional[int] = None
    min_budget: Optional[int] = None
    max_budget: Optional[int] = None
    country: Optional[str] = None

class BloggerContact(BaseModel):
    telegram: Optional[str] = None
    email: Optional[str] = None
    instagram_dm: Optional[str] = None
    whatsapp: Optional[str] = None

class BloggerStats(BaseModel):
    avg_views: int
    avg_likes: int
    avg_comments: int
    engagement_rate: float
    posts_per_month: int
    wb_mentions: int

class AudienceInsights(BaseModel):
    age_18_24: float = 0.0
    age_25_34: float = 0.0
    age_35_44: float = 0.0
    age_45_plus: float = 0.0
    male_percentage: float = 0.0
    female_percentage: float = 0.0
    top_countries: List[str] = []

class BloggerDetail(BaseModel):
    id: int
    name: str
    platform: str
    profile_url: str
    avatar_url: Optional[str] = None
    category: str
    followers: int
    verified: bool = False
    has_wb_content: bool = False
    budget_min: int
    budget_max: int
    contacts: BloggerContact
    stats: BloggerStats
    audience: AudienceInsights
    content_examples: List[str] = []
    country: Optional[str] = None
    description: Optional[str] = None
    is_top_blogger: bool = False
    brand_friendly: bool = False

class BloggerAnalytics(BaseModel):
    total_bloggers: int
    platform_distribution: Dict[str, int]
    avg_followers: float
    avg_budget: float
    top_categories: List[Dict[str, Any]]
    wb_content_percentage: float
    top_countries: List[str]

class AIRecommendations(BaseModel):
    best_bloggers: List[str]
    recommended_platforms: List[str]
    budget_strategy: str
    content_suggestions: List[str]
    negotiation_tips: List[str]
    campaign_strategy: str
    expected_roi: str

class BloggerSearchResponse(BaseModel):
    bloggers: List[BloggerDetail]
    analytics: BloggerAnalytics
    ai_recommendations: AIRecommendations
    total_found: int

# === Функции реального поиска блогеров ===

async def search_youtube_bloggers(query: str) -> List[Dict[str, Any]]:
    """Поиск блогеров на YouTube через Serper API"""
    logger.info(f"🎬 Поиск блогеров на YouTube: {query}")
    
    bloggers = []
    
    try:
        search_query = f"{query} wildberries обзор OR распаковка OR отзыв site:youtube.com"
        
        async with aiohttp.ClientSession() as session:
            headers = {
                'X-API-KEY': SERPER_API_KEY,
                'Content-Type': 'application/json'
            }
            
            payload = {
                'q': search_query,
                'type': 'search',
                'engine': 'google',
                'num': 20
            }
            
            async with session.post('https://google.serper.dev/search', 
                                  headers=headers, 
                                  json=payload) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    for result in data.get('organic', []):
                        blogger = parse_youtube_result(result, query)
                        if blogger:
                            bloggers.append(blogger)
                else:
                    logger.warning(f"Serper API error: {response.status}")
                
    except Exception as e:
        logger.error(f"Ошибка поиска на YouTube: {e}")
    
    logger.info(f"📊 Найдено {len(bloggers)} блогеров на YouTube")
    return bloggers

async def search_instagram_bloggers(query: str) -> List[Dict[str, Any]]:
    """Поиск блогеров в Instagram через Serper API"""
    logger.info(f"📷 Поиск блогеров в Instagram: {query}")
    
    bloggers = []
    
    try:
        search_query = f"{query} wildberries отзыв OR обзор site:instagram.com"
        
        async with aiohttp.ClientSession() as session:
            headers = {
                'X-API-KEY': SERPER_API_KEY,
                'Content-Type': 'application/json'
            }
            
            payload = {
                'q': search_query,
                'type': 'search',
                'engine': 'google',
                'num': 20
            }
            
            async with session.post('https://google.serper.dev/search', 
                                  headers=headers, 
                                  json=payload) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    for result in data.get('organic', []):
                        blogger = parse_instagram_result(result, query)
                        if blogger:
                            bloggers.append(blogger)
                else:
                    logger.warning(f"Serper API error: {response.status}")
                
    except Exception as e:
        logger.error(f"Ошибка поиска в Instagram: {e}")
    
    logger.info(f"📊 Найдено {len(bloggers)} блогеров в Instagram")
    return bloggers

async def search_tiktok_bloggers(query: str) -> List[Dict[str, Any]]:
    """Поиск блогеров в TikTok через Serper API"""
    logger.info(f"🎵 Поиск блогеров в TikTok: {query}")
    
    bloggers = []
    
    try:
        search_query = f"{query} wildberries отзыв OR обзор site:tiktok.com"
        
        async with aiohttp.ClientSession() as session:
            headers = {
                'X-API-KEY': SERPER_API_KEY,
                'Content-Type': 'application/json'
            }
            
            payload = {
                'q': search_query,
                'type': 'search',
                'engine': 'google',
                'num': 20
            }
            
            async with session.post('https://google.serper.dev/search', 
                                  headers=headers, 
                                  json=payload) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    for result in data.get('organic', []):
                        blogger = parse_tiktok_result(result, query)
                        if blogger:
                            bloggers.append(blogger)
                else:
                    logger.warning(f"Serper API error: {response.status}")
                
    except Exception as e:
        logger.error(f"Ошибка поиска в TikTok: {e}")
    
    logger.info(f"📊 Найдено {len(bloggers)} блогеров в TikTok")
    return bloggers

async def search_telegram_bloggers(query: str) -> List[Dict[str, Any]]:
    """Поиск блогеров в Telegram через Serper API"""
    logger.info(f"✈️ Поиск блогеров в Telegram: {query}")
    
    bloggers = []
    
    try:
        search_query = f"{query} wildberries отзыв OR обзор site:t.me"
        
        async with aiohttp.ClientSession() as session:
            headers = {
                'X-API-KEY': SERPER_API_KEY,
                'Content-Type': 'application/json'
            }
            
            payload = {
                'q': search_query,
                'type': 'search',
                'engine': 'google',
                'num': 20
            }
            
            async with session.post('https://google.serper.dev/search', 
                                  headers=headers, 
                                  json=payload) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    for result in data.get('organic', []):
                        blogger = parse_telegram_result(result, query)
                        if blogger:
                            bloggers.append(blogger)
                else:
                    logger.warning(f"Serper API error: {response.status}")
                
    except Exception as e:
        logger.error(f"Ошибка поиска в Telegram: {e}")
    
    logger.info(f"📊 Найдено {len(bloggers)} блогеров в Telegram")
    return bloggers

# === Функции парсинга результатов ===

def parse_youtube_result(result: Dict, query: str) -> Optional[Dict]:
    """Парсинг результата поиска YouTube"""
    try:
        url = result.get('link', '')
        if 'youtube.com' not in url:
            return None
        
        title = result.get('title', '')
        snippet = result.get('snippet', '')
        
        # Извлекаем данные
        channel_name = extract_youtube_channel(title, url)
        views = extract_views_from_snippet(snippet)
        audience = estimate_audience_youtube(views)
        followers = estimate_followers_from_audience(audience)
        
        blogger = {
            "name": channel_name,
            "username": extract_youtube_username(url),
            "platform": "youtube",
            "url": url,
            "post_title": title,
            "post_snippet": snippet,
            "estimated_audience": audience,
            "views": views,
            "followers": followers,
            "topic": classify_topic(title + " " + snippet),
            "has_wb_content": check_wb_mentions(title + " " + snippet),
            "budget_range": estimate_collaboration_budget("YouTube", views),
            "contacts": extract_contacts(snippet),
            "engagement_rate": estimate_engagement_rate(views, followers)
        }
        
        return blogger
        
    except Exception as e:
        logger.error(f"Ошибка парсинга YouTube результата: {e}")
        return None

def parse_instagram_result(result: Dict, query: str) -> Optional[Dict]:
    """Парсинг результата поиска Instagram"""
    try:
        url = result.get('link', '')
        if 'instagram.com' not in url:
            return None
        
        title = result.get('title', '')
        snippet = result.get('snippet', '')
        
        username = extract_instagram_username(url)
        likes = extract_likes_from_snippet(snippet)
        audience = estimate_audience_instagram(likes)
        followers = estimate_followers_from_audience(audience)
        
        blogger = {
            "name": extract_display_name(title) or username,
            "username": username,
            "platform": "instagram",
            "url": url,
            "post_title": title,
            "post_snippet": snippet,
            "estimated_audience": audience,
            "views": likes,  # Для Instagram используем лайки как метрику
            "followers": followers,
            "topic": classify_topic(title + " " + snippet),
            "has_wb_content": check_wb_mentions(title + " " + snippet),
            "budget_range": estimate_collaboration_budget("Instagram", likes),
            "contacts": extract_contacts(snippet),
            "engagement_rate": estimate_engagement_rate(likes, followers)
        }
        
        return blogger
        
    except Exception as e:
        logger.error(f"Ошибка парсинга Instagram результата: {e}")
        return None

def parse_tiktok_result(result: Dict, query: str) -> Optional[Dict]:
    """Парсинг результата поиска TikTok"""
    try:
        url = result.get('link', '')
        if 'tiktok.com' not in url:
            return None
        
        title = result.get('title', '')
        snippet = result.get('snippet', '')
        
        username = extract_tiktok_username(url)
        views = extract_views_from_snippet(snippet)
        audience = estimate_audience_tiktok(views)
        followers = estimate_followers_from_audience(audience)
        
        blogger = {
            "name": extract_display_name(title) or username,
            "username": username,
            "platform": "tiktok",
            "url": url,
            "post_title": title,
            "post_snippet": snippet,
            "estimated_audience": audience,
            "views": views,
            "followers": followers,
            "topic": classify_topic(title + " " + snippet),
            "has_wb_content": check_wb_mentions(title + " " + snippet),
            "budget_range": estimate_collaboration_budget("TikTok", views),
            "contacts": extract_contacts(snippet),
            "engagement_rate": estimate_engagement_rate(views, followers)
        }
        
        return blogger
        
    except Exception as e:
        logger.error(f"Ошибка парсинга TikTok результата: {e}")
        return None

def parse_telegram_result(result: Dict, query: str) -> Optional[Dict]:
    """Парсинг результата поиска Telegram"""
    try:
        url = result.get('link', '')
        if 't.me/' not in url:
            return None
        
        title = result.get('title', '')
        snippet = result.get('snippet', '')
        
        username = extract_telegram_username(url)
        views = extract_views_from_snippet(snippet)
        audience = "Не определено"
        followers = 1000  # Базовое значение для Telegram
        
        blogger = {
            "name": extract_display_name(title) or username,
            "username": username,
            "platform": "telegram",
            "url": url,
            "post_title": title,
            "post_snippet": snippet,
            "estimated_audience": audience,
            "views": views,
            "followers": followers,
            "topic": classify_topic(title + " " + snippet),
            "has_wb_content": check_wb_mentions(title + " " + snippet),
            "budget_range": estimate_collaboration_budget("Telegram", views),
            "contacts": extract_contacts(snippet),
            "engagement_rate": estimate_engagement_rate(views, followers)
        }
        
        return blogger
        
    except Exception as e:
        logger.error(f"Ошибка парсинга Telegram результата: {e}")
        return None

# === Вспомогательные функции ===

def extract_youtube_channel(title: str, url: str) -> str:
    """Извлечение названия канала YouTube"""
    try:
        # Убираем "- YouTube" из конца
        if title.endswith(" - YouTube"):
            title = title[:-10]
        
        # Ищем паттерн "video_title - Channel Name"
        if " - " in title:
            parts = title.split(" - ")
            return parts[-1]  # Последняя часть обычно название канала
        
        return title
    except:
        return "YouTube Channel"

def extract_youtube_username(url: str) -> str:
    """Извлечение username YouTube канала"""
    try:
        if '/channel/' in url:
            return url.split('/channel/')[-1].split('/')[0]
        elif '/@' in url:
            return url.split('/@')[-1].split('/')[0]
        elif '/c/' in url:
            return url.split('/c/')[-1].split('/')[0]
        elif '/user/' in url:
            return url.split('/user/')[-1].split('/')[0]
        else:
            return "youtube_user"
    except:
        return "youtube_user"

def extract_instagram_username(url: str) -> str:
    """Извлечение username Instagram"""
    try:
        if 'instagram.com/' in url:
            username = url.split('instagram.com/')[-1].split('/')[0]
            return username if username else "instagram_user"
        return "instagram_user"
    except:
        return "instagram_user"

def extract_tiktok_username(url: str) -> str:
    """Извлечение username TikTok"""
    try:
        if 'tiktok.com/@' in url:
            return url.split('tiktok.com/@')[-1].split('/')[0]
        return "tiktok_user"
    except:
        return "tiktok_user"

def extract_telegram_username(url: str) -> str:
    """Извлечение username Telegram"""
    try:
        if 't.me/' in url:
            return url.split('t.me/')[-1].split('/')[0]
        return "telegram_user"
    except:
        return "telegram_user"

def extract_display_name(title: str) -> Optional[str]:
    """Извлечение отображаемого имени"""
    try:
        # Убираем общие суффиксы
        title = title.replace(" - YouTube", "").replace(" • Instagram", "").replace(" - TikTok", "")
        
        # Ищем имя в скобках
        if "(" in title and ")" in title:
            name_match = re.search(r'\(([^)]+)\)', title)
            if name_match:
                return name_match.group(1)
        
        # Берем первые 2-3 слова как имя
        words = title.split()[:3]
        return " ".join(words) if words else None
    except:
        return None

def extract_views_from_snippet(snippet: str) -> int:
    """Извлечение количества просмотров"""
    try:
        patterns = [
            r'(\d+(?:\.\d+)?)\s*[kK]\s*просмотр',
            r'(\d+(?:\.\d+)?)\s*[mM]\s*просмотр',
            r'(\d+(?:,\d+)*)\s*просмотр',
            r'(\d+(?:\.\d+)?)\s*[kK]\s*view',
            r'(\d+(?:\.\d+)?)\s*[mM]\s*view',
            r'(\d+(?:,\d+)*)\s*view'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, snippet, re.IGNORECASE)
            if match:
                value = match.group(1).replace(',', '')
                if 'K' in match.group(0).upper() or 'К' in match.group(0).upper():
                    return int(float(value) * 1000)
                elif 'M' in match.group(0).upper() or 'М' in match.group(0).upper():
                    return int(float(value) * 1000000)
                else:
                    return int(float(value))
        
        return 0
    except:
        return 0

def extract_likes_from_snippet(snippet: str) -> int:
    """Извлечение количества лайков"""
    try:
        patterns = [
            r'(\d+(?:\.\d+)?)\s*[kK]\s*лайк',
            r'(\d+(?:\.\d+)?)\s*[mM]\s*лайк',
            r'(\d+(?:,\d+)*)\s*лайк',
            r'(\d+(?:\.\d+)?)\s*[kK]\s*like',
            r'(\d+(?:\.\d+)?)\s*[mM]\s*like',
            r'(\d+(?:,\d+)*)\s*like'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, snippet, re.IGNORECASE)
            if match:
                value = match.group(1).replace(',', '')
                if 'K' in match.group(0).upper() or 'К' in match.group(0).upper():
                    return int(float(value) * 1000)
                elif 'M' in match.group(0).upper() or 'М' in match.group(0).upper():
                    return int(float(value) * 1000000)
                else:
                    return int(float(value))
        
        return 0
    except:
        return 0

def classify_topic(text: str) -> str:
    """Классификация тематики блогера"""
    text_lower = text.lower()
    
    if any(word in text_lower for word in ['мода', 'одежда', 'стиль', 'fashion', 'outfit']):
        return "Мода и стиль"
    elif any(word in text_lower for word in ['косметика', 'beauty', 'макияж', 'skincare', 'красота']):
        return "Красота и косметика"
    elif any(word in text_lower for word in ['дети', 'детск', 'ребенок', 'kids', 'baby']):
        return "Детские товары"
    elif any(word in text_lower for word in ['дом', 'интерьер', 'home', 'декор']):
        return "Дом и интерьер"
    elif any(word in text_lower for word in ['спорт', 'фитнес', 'тренировк', 'sport', 'fitness']):
        return "Спорт и фитнес"
    elif any(word in text_lower for word in ['еда', 'кулинар', 'рецепт', 'food', 'cooking']):
        return "Еда и кулинария"
    elif any(word in text_lower for word in ['техник', 'гаджет', 'tech', 'электрон']):
        return "Техника и гаджеты"
    else:
        return "Общая тематика"

def check_wb_mentions(text: str) -> bool:
    """Проверка упоминаний Wildberries"""
    text_lower = text.lower()
    wb_keywords = ['wildberries', 'вайлдберриз', 'wb', 'вб', 'вайлдбериз']
    return any(keyword in text_lower for keyword in wb_keywords)

def estimate_audience_youtube(views: int) -> str:
    """Оценка аудитории YouTube канала по просмотрам"""
    if views > 1000000:
        return "1M+ подписчиков"
    elif views > 100000:
        return "100K-1M подписчиков"
    elif views > 10000:
        return "10K-100K подписчиков"
    elif views > 1000:
        return "1K-10K подписчиков"
    else:
        return "Менее 1K подписчиков"

def estimate_audience_instagram(likes: int) -> str:
    """Оценка аудитории Instagram по лайкам"""
    if likes > 50000:
        return "500K+ подписчиков"
    elif likes > 5000:
        return "50K-500K подписчиков"
    elif likes > 500:
        return "5K-50K подписчиков"
    elif likes > 50:
        return "500-5K подписчиков"
    else:
        return "Менее 500 подписчиков"

def estimate_audience_tiktok(views: int) -> str:
    """Оценка аудитории TikTok по просмотрам"""
    if views > 500000:
        return "500K+ подписчиков"
    elif views > 50000:
        return "50K-500K подписчиков"
    elif views > 5000:
        return "5K-50K подписчиков"
    elif views > 500:
        return "500-5K подписчиков"
    else:
        return "Менее 500 подписчиков"

def estimate_followers_from_audience(audience_str: str) -> int:
    """Преобразование строки аудитории в число подписчиков"""
    try:
        if "1M+" in audience_str:
            return 1500000
        elif "100K-1M" in audience_str:
            return 500000
        elif "500K+" in audience_str:
            return 750000
        elif "50K-500K" in audience_str:
            return 200000
        elif "10K-100K" in audience_str:
            return 50000
        elif "5K-50K" in audience_str:
            return 25000
        elif "1K-10K" in audience_str:
            return 5000
        elif "500-5K" in audience_str:
            return 2500
        else:
            return 1000
    except:
        return 1000

def estimate_collaboration_budget(platform: str, engagement: int) -> tuple:
    """Оценка бюджета сотрудничества"""
    if platform == "YouTube":
        if engagement > 100000:
            return (50000, 200000)
        elif engagement > 10000:
            return (10000, 50000)
        elif engagement > 1000:
            return (3000, 10000)
        else:
            return (0, 3000)
    
    elif platform == "Instagram":
        if engagement > 10000:
            return (15000, 50000)
        elif engagement > 1000:
            return (5000, 15000)
        else:
            return (0, 5000)
    
    elif platform == "TikTok":
        if engagement > 50000:
            return (20000, 100000)
        elif engagement > 5000:
            return (5000, 20000)
        else:
            return (0, 5000)
    
    elif platform == "Telegram":
        return (3000, 15000)
    
    return (1000, 5000)

def estimate_engagement_rate(views: int, followers: int) -> float:
    """Оценка процента вовлеченности"""
    try:
        if followers > 0:
            rate = (views / followers) * 100
            return min(rate, 100.0)  # Максимум 100%
        return 0.0
    except:
        return 0.0

def extract_contacts(text: str) -> List[str]:
    """Извлечение контактной информации"""
    contacts = []
    
    # Email
    email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    emails = re.findall(email_pattern, text)
    contacts.extend(emails)
    
    # Telegram
    telegram_pattern = r'@[\w\d_]+'
    telegrams = re.findall(telegram_pattern, text)
    contacts.extend(telegrams)
    
    return contacts

# === Функции обработки данных ===

async def search_real_bloggers(keyword: str, platforms: List[str]) -> List[Dict[str, Any]]:
    """Поиск реальных блогеров через API"""
    
    all_bloggers = []
    
    # Запускаем поиск параллельно на всех платформах
    tasks = []
    
    if "youtube" in platforms:
        tasks.append(search_youtube_bloggers(keyword))
    if "instagram" in platforms:
        tasks.append(search_instagram_bloggers(keyword))
    if "tiktok" in platforms:
        tasks.append(search_tiktok_bloggers(keyword))
    if "telegram" in platforms:
        tasks.append(search_telegram_bloggers(keyword))
    
    # Выполняем все поиски параллельно
    if tasks:
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for result in results:
            if isinstance(result, list):
                all_bloggers.extend(result)
            elif isinstance(result, Exception):
                logger.error(f"Ошибка в поиске блогеров: {result}")
    
    logger.info(f"🎉 Найдено {len(all_bloggers)} реальных блогеров")
    return all_bloggers

def convert_to_blogger_detail(raw_blogger: Dict, index: int) -> BloggerDetail:
    """Конвертация сырых данных блогера в BloggerDetail"""
    
    budget_range = raw_blogger.get('budget_range', (1000, 5000))
    if isinstance(budget_range, str):
        # Парсим строку бюджета
        if "50,000-200,000" in budget_range:
            budget_min, budget_max = 50000, 200000
        elif "20,000-100,000" in budget_range:
            budget_min, budget_max = 20000, 100000
        elif "10,000-50,000" in budget_range:
            budget_min, budget_max = 10000, 50000
        elif "5,000-30,000" in budget_range or "5,000-20,000" in budget_range:
            budget_min, budget_max = 5000, 20000
        elif "3,000-15,000" in budget_range:
            budget_min, budget_max = 3000, 15000
        else:
            budget_min, budget_max = 1000, 5000
    else:
        budget_min, budget_max = budget_range
    
    contacts_list = raw_blogger.get('contacts', [])
    telegram_contact = None
    email_contact = None
    
    for contact in contacts_list:
        if contact.startswith('@'):
            telegram_contact = contact
        elif '@' in contact and '.' in contact:
            email_contact = contact
    
    engagement_rate = raw_blogger.get('engagement_rate', 0.0)
    if isinstance(engagement_rate, str):
        engagement_rate = 0.0
    
    avg_views = raw_blogger.get('views', 0)
    followers = raw_blogger.get('followers', 1000)
    
    return BloggerDetail(
        id=1000 + index,
        name=raw_blogger.get('name', 'Неизвестный блогер'),
        platform=raw_blogger.get('platform', 'unknown'),
        profile_url=raw_blogger.get('url', ''),
        avatar_url=None,  # Пока не извлекаем аватары
        category=raw_blogger.get('topic', 'Общая тематика'),
        followers=followers,
        verified=False,  # Пока не определяем верификацию
        has_wb_content=raw_blogger.get('has_wb_content', False),
        budget_min=budget_min,
        budget_max=budget_max,
        contacts=BloggerContact(
            telegram=telegram_contact,
            email=email_contact
        ),
        stats=BloggerStats(
            avg_views=avg_views,
            avg_likes=int(avg_views * 0.05),  # Примерно 5% от просмотров
            avg_comments=int(avg_views * 0.01),  # Примерно 1% от просмотров
            engagement_rate=engagement_rate,
            posts_per_month=20,  # Базовое значение
            wb_mentions=1 if raw_blogger.get('has_wb_content', False) else 0
        ),
        audience=AudienceInsights(
            age_18_24=30.0,
            age_25_34=40.0,
            age_35_44=20.0,
            age_45_plus=10.0,
            male_percentage=45.0,
            female_percentage=55.0,
            top_countries=["Россия", "Казахстан"]
        ),
        content_examples=[raw_blogger.get('url', '')],
        country="Россия",
        description=raw_blogger.get('post_snippet', '')[:200] + "..." if raw_blogger.get('post_snippet') else None,
        is_top_blogger=False,
        brand_friendly=True
    )

def generate_analytics(bloggers: List[BloggerDetail]) -> BloggerAnalytics:
    """Генерация аналитики по найденным блогерам"""
    
    if not bloggers:
        return BloggerAnalytics(
            total_bloggers=0,
            platform_distribution={},
            avg_followers=0,
            avg_budget=0,
            top_categories=[],
            wb_content_percentage=0,
            top_countries=[]
        )
    
    # Распределение по платформам
    platform_dist = {}
    for blogger in bloggers:
        platform_dist[blogger.platform] = platform_dist.get(blogger.platform, 0) + 1
    
    # Топ категории
    category_count = {}
    for blogger in bloggers:
        category_count[blogger.category] = category_count.get(blogger.category, 0) + 1
    
    top_categories = [
        {"name": cat, "count": count} 
        for cat, count in sorted(category_count.items(), key=lambda x: x[1], reverse=True)[:5]
    ]
    
    # Средние значения
    avg_followers = statistics.mean([b.followers for b in bloggers])
    avg_budget = statistics.mean([(b.budget_min + b.budget_max) / 2 for b in bloggers])
    
    # WB контент
    wb_content_count = sum(1 for b in bloggers if b.has_wb_content)
    wb_content_percentage = (wb_content_count / len(bloggers)) * 100
    
    # Топ страны
    country_count = {}
    for blogger in bloggers:
        if blogger.country:
            country_count[blogger.country] = country_count.get(blogger.country, 0) + 1
    
    top_countries = [country for country, _ in sorted(country_count.items(), key=lambda x: x[1], reverse=True)[:5]]
    
    return BloggerAnalytics(
        total_bloggers=len(bloggers),
        platform_distribution=platform_dist,
        avg_followers=avg_followers,
        avg_budget=avg_budget,
        top_categories=top_categories,
        wb_content_percentage=wb_content_percentage,
        top_countries=top_countries
    )

async def generate_ai_recommendations(keyword: str, bloggers: List[BloggerDetail], analytics: BloggerAnalytics) -> AIRecommendations:
    """Генерация AI рекомендаций для кампании с блогерами"""
    
    try:
        from openai import OpenAI
        
        client = OpenAI(api_key="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")
        
        # Топ блогеры для анализа
        top_bloggers = sorted(bloggers, key=lambda x: x.stats.engagement_rate, reverse=True)[:5]
        
        context = f"""
Поисковый запрос: {keyword}
Найдено реальных блогеров: {analytics.total_bloggers}
Средние подписчики: {analytics.avg_followers:,.0f}
Средний бюджет: {analytics.avg_budget:,.0f} ₽
Процент с WB контентом: {analytics.wb_content_percentage:.1f}%

Распределение по платформам:
{chr(10).join([f"- {platform}: {count} блогеров" for platform, count in analytics.platform_distribution.items()])}

Топ-5 блогеров по вовлеченности:
{chr(10).join([f"{i+1}. {blogger.name} ({blogger.platform}): {blogger.followers:,} подписчиков, {blogger.stats.engagement_rate:.1f}% вовлеченность, {blogger.budget_min:,}-{blogger.budget_max:,} ₽" for i, blogger in enumerate(top_bloggers)])}

Топ категории:
{chr(10).join([f"- {cat['name']}: {cat['count']} блогеров" for cat in analytics.top_categories[:3]])}
"""

        response = await asyncio.to_thread(
            client.chat.completions.create,
            model="gpt-3.5-turbo",
            messages=[
                {
                    "role": "system",
                    "content": "Ты - эксперт по инфлюенсер-маркетингу и рекламе в социальных сетях. Дай профессиональные рекомендации по выбору блогеров и стратегии продвижения на русском языке на основе РЕАЛЬНЫХ данных найденных блогеров."
                },
                {
                    "role": "user",
                    "content": f"{context}\n\nНа основе данных дай рекомендации:\n1. Какие 3-5 блогеров наиболее подходят\n2. На каких платформах лучше запустить кампанию\n3. Стратегия бюджета и количество интеграций\n4. Типы контента (обзор, анбоксинг, челлендж)\n5. Советы по переговорам\n6. Общая стратегия кампании\n7. Ожидаемый ROI"
                }
            ],
            max_tokens=1000,
            temperature=0.7
        )
        
        ai_text = response.choices[0].message.content
        
        # Парсим ответ и извлекаем рекомендации
        return parse_ai_blogger_recommendations(ai_text, top_bloggers)
        
    except Exception as e:
        logger.warning(f"Failed to generate AI recommendations: {e}")
        return generate_fallback_blogger_recommendations(keyword, bloggers, analytics)

def parse_ai_blogger_recommendations(ai_text: str, top_bloggers: List[BloggerDetail]) -> AIRecommendations:
    """Парсинг AI ответа в структурированные рекомендации"""
    
    try:
        # Извлекаем рекомендуемых блогеров
        best_bloggers = [blogger.name for blogger in top_bloggers[:3]]
        
        # Определяем платформы
        platforms = []
        if "youtube" in ai_text.lower() or "ютуб" in ai_text.lower():
            platforms.append("YouTube")
        if "instagram" in ai_text.lower() or "инстаграм" in ai_text.lower():
            platforms.append("Instagram")
        if "tiktok" in ai_text.lower() or "тикток" in ai_text.lower():
            platforms.append("TikTok")
        if "telegram" in ai_text.lower() or "телеграм" in ai_text.lower():
            platforms.append("Telegram")
        
        if not platforms:
            platforms = ["YouTube", "Instagram"]  # Дефолт
        
        # Извлекаем советы по контенту
        content_suggestions = []
        if "обзор" in ai_text.lower():
            content_suggestions.append("Детальные обзоры товаров")
        if "анбоксинг" in ai_text.lower() or "распаковк" in ai_text.lower():
            content_suggestions.append("Анбоксинг и первые впечатления")
        if "челлендж" in ai_text.lower():
            content_suggestions.append("Тематические челленджи")
        if "сравнен" in ai_text.lower():
            content_suggestions.append("Сравнение с конкурентами")
        
        if not content_suggestions:
            content_suggestions = ["Обзоры товаров", "Интеграция в lifestyle контент"]
        
        return AIRecommendations(
            best_bloggers=best_bloggers,
            recommended_platforms=platforms,
            budget_strategy="Рекомендуем начать с найденных блогеров с реальной аудиторией и опытом работы с WB",
            content_suggestions=content_suggestions,
            negotiation_tips=[
                "Изучите реальные примеры контента блогера",
                "Предложите долгосрочное сотрудничество",
                "Обеспечьте промокоды и скидки для аудитории",
                "Предложите бонусы за высокие показатели"
            ],
            campaign_strategy="Фокус на блогерах с реальным опытом работы с Wildberries",
            expected_roi="ROI зависит от качества контента и релевантности аудитории блогера"
        )
        
    except Exception as e:
        logger.warning(f"Failed to parse AI recommendations: {e}")
        return generate_fallback_blogger_recommendations("", [], BloggerAnalytics(
            total_bloggers=0, platform_distribution={}, avg_followers=0, 
            avg_budget=0, top_categories=[], wb_content_percentage=0, top_countries=[]
        ))

def generate_fallback_blogger_recommendations(keyword: str, bloggers: List[BloggerDetail], analytics: BloggerAnalytics) -> AIRecommendations:
    """Fallback рекомендации при недоступности AI"""
    
    top_bloggers = sorted(bloggers, key=lambda x: x.stats.engagement_rate, reverse=True)[:3]
    
    return AIRecommendations(
        best_bloggers=[blogger.name for blogger in top_bloggers],
        recommended_platforms=list(analytics.platform_distribution.keys())[:2] if analytics.platform_distribution else ["YouTube", "Instagram"],
        budget_strategy=f"Рекомендуемый бюджет: {analytics.avg_budget:,.0f} ₽ на блогера",
        content_suggestions=["Обзоры товаров", "Интеграция в lifestyle", "Сравнения"],
        negotiation_tips=[
            "Изучите предыдущие работы блогера",
            "Предложите взаимовыгодные условия",
            "Обсудите метрики эффективности"
        ],
        campaign_strategy="Смешанная стратегия: крупные блогеры для охвата + микро для конверсии",
        expected_roi="ROI зависит от качества контента и таргетинга"
    )

def apply_filters(bloggers: List[BloggerDetail], request: BloggerSearchRequest) -> List[BloggerDetail]:
    """Применение фильтров к списку блогеров"""
    
    filtered = bloggers
    
    # Фильтр по платформам
    if request.platforms:
        filtered = [b for b in filtered if b.platform in request.platforms]
    
    # Фильтр по подписчикам
    if request.min_followers:
        filtered = [b for b in filtered if b.followers >= request.min_followers]
    if request.max_followers:
        filtered = [b for b in filtered if b.followers <= request.max_followers]
    
    # Фильтр по бюджету
    if request.min_budget:
        filtered = [b for b in filtered if b.budget_max >= request.min_budget]
    if request.max_budget:
        filtered = [b for b in filtered if b.budget_min <= request.max_budget]
    
    # Фильтр по стране
    if request.country:
        filtered = [b for b in filtered if b.country and request.country.lower() in b.country.lower()]
    
    return filtered

@router.post("/search", response_model=BloggerSearchResponse)
async def search_bloggers(request: BloggerSearchRequest):
    """Поиск реальных блогеров с фильтрами и AI рекомендациями"""
    
    try:
        logger.info(f"🔍 Real blogger search request: {request.keyword}")
        
        # Поиск реальных блогеров через API
        raw_bloggers = await search_real_bloggers(request.keyword, request.platforms)
        
        if not raw_bloggers:
            logger.warning(f"⚠️ No real bloggers found for: {request.keyword}")
            raise HTTPException(status_code=404, detail=f"No real bloggers found for '{request.keyword}' with specified filters.")
        
        # Конвертируем в BloggerDetail
        all_bloggers = [convert_to_blogger_detail(raw, idx) for idx, raw in enumerate(raw_bloggers)]
        
        # Применяем фильтры
        filtered_bloggers = apply_filters(all_bloggers, request)
        
        if not filtered_bloggers:
            logger.warning(f"⚠️ No bloggers found after applying filters for: {request.keyword}")
            raise HTTPException(status_code=404, detail=f"No bloggers found for '{request.keyword}' with specified filters.")
        
        logger.info(f"📊 Found {len(filtered_bloggers)} real bloggers for keyword: {request.keyword}")
        
        # Генерируем аналитику
        analytics = generate_analytics(filtered_bloggers)
        
        # Генерируем AI рекомендации
        ai_recommendations = await generate_ai_recommendations(request.keyword, filtered_bloggers, analytics)
        
        logger.info(f"✅ Real blogger search completed successfully for: {request.keyword}")
        
        return BloggerSearchResponse(
            bloggers=filtered_bloggers,
            analytics=analytics,
            ai_recommendations=ai_recommendations,
            total_found=len(filtered_bloggers)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error in real blogger search: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/export")
async def export_bloggers_xlsx(request: BloggerSearchRequest):
    """Экспорт данных реальных блогеров в XLSX файл"""
    
    try:
        import pandas as pd
        
        # Получаем данные блогеров
        raw_bloggers = await search_real_bloggers(request.keyword, request.platforms)
        all_bloggers = [convert_to_blogger_detail(raw, idx) for idx, raw in enumerate(raw_bloggers)]
        filtered_bloggers = apply_filters(all_bloggers, request)
        
        if not filtered_bloggers:
            raise HTTPException(status_code=404, detail="No bloggers found for export")
        
        # Подготавливаем данные для экспорта
        export_data = []
        for blogger in filtered_bloggers:
            export_data.append({
                'Name': blogger.name,
                'Platform': blogger.platform,
                'Category': blogger.category,
                'Followers': blogger.followers,
                'Verified': 'Yes' if blogger.verified else 'No',
                'WB_Content': 'Yes' if blogger.has_wb_content else 'No',
                'Budget_Min': blogger.budget_min,
                'Budget_Max': blogger.budget_max,
                'Engagement_Rate': blogger.stats.engagement_rate,
                'Avg_Views': blogger.stats.avg_views,
                'Avg_Likes': blogger.stats.avg_likes,
                'Avg_Comments': blogger.stats.avg_comments,
                'Posts_Per_Month': blogger.stats.posts_per_month,
                'WB_Mentions': blogger.stats.wb_mentions,
                'Country': blogger.country or '',
                'Female_Percentage': blogger.audience.female_percentage,
                'Male_Percentage': blogger.audience.male_percentage,
                'Age_18_24': blogger.audience.age_18_24,
                'Age_25_34': blogger.audience.age_25_34,
                'Age_35_44': blogger.audience.age_35_44,
                'Age_45_Plus': blogger.audience.age_45_plus,
                'Top_Countries': ', '.join(blogger.audience.top_countries),
                'Profile_URL': blogger.profile_url,
                'Telegram': blogger.contacts.telegram or '',
                'Email': blogger.contacts.email or '',
                'Instagram_DM': blogger.contacts.instagram_dm or '',
                'Description': blogger.description or '',
                'Top_Blogger': 'Yes' if blogger.is_top_blogger else 'No',
                'Brand_Friendly': 'Yes' if blogger.brand_friendly else 'No'
            })
        
        # Создаем DataFrame
        df = pd.DataFrame(export_data)
        
        # Создаем XLSX файл в памяти
        output = BytesIO()
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            df.to_excel(writer, sheet_name='Real_Bloggers', index=False)
            
            # Получаем workbook и worksheet для форматирования
            workbook = writer.book
            worksheet = writer.sheets['Real_Bloggers']
            
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
        filename = f"real_bloggers_{request.keyword}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        
        return StreamingResponse(
            BytesIO(output.getvalue()), 
            media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            headers={'Content-Disposition': f'attachment; filename="{filename}"'}
        )
        
    except ImportError:
        raise HTTPException(status_code=500, detail="Excel export requires pandas and xlsxwriter packages")
    except Exception as e:
        logger.error(f"Error in real blogger export: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error in real blogger export: {str(e)}")

@router.get("/platforms")
async def get_available_platforms():
    """Получение списка доступных платформ"""
    return {
        "platforms": [
            {"id": "youtube", "name": "YouTube", "icon": "🎬"},
            {"id": "instagram", "name": "Instagram", "icon": "📷"},
            {"id": "tiktok", "name": "TikTok", "icon": "🎵"},
            {"id": "telegram", "name": "Telegram", "icon": "✈️"}
        ]
    }

@router.get("/categories")
async def get_available_categories():
    """Получение списка доступных категорий"""
    return {
        "categories": [
            "Спорт и фитнес",
            "Красота и косметика", 
            "Дом и интерьер",
            "Технологии",
            "Еда и кулинария",
            "Мода и стиль",
            "Путешествия",
            "Авто",
            "Игры",
            "Образование"
        ]
    } 