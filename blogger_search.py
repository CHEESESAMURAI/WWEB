#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import aiohttp
import asyncio
import logging
from typing import Dict, List, Optional, Any
import re
import json
from urllib.parse import quote_plus
import matplotlib.pyplot as plt
from datetime import datetime
import os
from statistics import mean

logger = logging.getLogger(__name__)

# Импорт конфигурации
try:
    from config import SERPER_API_KEY
except ImportError:
    # Fallback если config.py не найден
    SERPER_API_KEY = "your_serper_api_key_here"

async def search_bloggers_by_query(query: str, platforms: List[str] = None) -> Dict[str, Any]:
    """Основная функция поиска блогеров по запросу с расчётом ER/CPM."""
    if platforms is None:
        platforms = ["YouTube", "Instagram", "TikTok", "Telegram"]
    
    logger.info(f"Начинаем поиск блогеров по запросу: {query}")
    
    results = {
        "query": query,
        "total_found": 0,
        "platforms": {},
        "top_bloggers": [],
        "summary": {}
    }
    
    try:
        # Ищем блогеров на разных платформах
        tasks = []
        
        if "YouTube" in platforms:
            tasks.append(search_youtube_bloggers(query))
        if "Instagram" in platforms:
            tasks.append(search_instagram_bloggers(query))
        if "TikTok" in platforms:
            tasks.append(search_tiktok_bloggers(query))
        if "Telegram" in platforms:
            tasks.append(search_telegram_bloggers(query))
        
        # Выполняем поиск параллельно
        platform_results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Обрабатываем результаты
        platform_names = ["YouTube", "Instagram", "TikTok", "Telegram"]
        for i, platform_result in enumerate(platform_results):
            platform_name = platform_names[i]
            if isinstance(platform_result, Exception):
                logger.error(f"Ошибка поиска на {platform_name}: {platform_result}")
                results["platforms"][platform_name] = {"error": str(platform_result), "bloggers": []}
            else:
                results["platforms"][platform_name] = platform_result
                results["total_found"] += len(platform_result.get("bloggers", []))
        
        # === Дополнительные метрики и сортировка ===
        for platform_name, pdata in results["platforms"].items():
            bloggers = pdata.get("bloggers", [])
            for bl in bloggers:
                likes = bl.get("likes", 0)
                views = bl.get("views", 0)
                # ER (%): likes / views *100
                bl["er"] = round(likes / views * 100, 2) if views and likes else 0
                # Оценочный бюджет -> число (середина диапазона)
                budget_raw = bl.get("estimated_budget", "0")
                bl["budget_estimate"] = _parse_budget(budget_raw)
                # CPM руб/1000 просмотров
                bl["cpm"] = round(bl["budget_estimate"] / views * 1000, 2) if views else 0

            # Сортируем: сначала ER, затем самый низкий CPM, затем просмотры
            bloggers.sort(key=lambda x: (-x.get("er", 0), x.get("cpm", 1e9), -x.get("views", 0)))
            # Сохраняем топ-5 каждого
            pdata["top_bloggers"] = bloggers[:5]

        # Общий топ 10 по тому же принципу
        results["top_bloggers"] = get_top_bloggers(results["platforms"])

        # Обновляем сводку
        results["summary"] = create_summary(results["platforms"])
        
        logger.info(f"Найдено {results['total_found']} блогеров")
        
    except Exception as e:
        logger.error(f"Ошибка при поиске блогеров: {e}")
        results["error"] = str(e)
    
    return results

async def search_youtube_bloggers(query: str) -> Dict[str, Any]:
    """Поиск блогеров на YouTube"""
    logger.info(f"Поиск блогеров на YouTube: {query}")
    
    bloggers = []
    
    try:
        # Используем Serper API для поиска на YouTube
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
                
    except Exception as e:
        logger.error(f"Ошибка поиска на YouTube: {e}")
    
    return {
        "platform": "YouTube",
        "found": len(bloggers),
        "bloggers": bloggers
    }

async def search_instagram_bloggers(query: str) -> Dict[str, Any]:
    """Поиск блогеров в Instagram"""
    logger.info(f"Поиск блогеров в Instagram: {query}")
    
    bloggers = []
    
    try:
        # Поиск через Google с фильтром по Instagram
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
                
    except Exception as e:
        logger.error(f"Ошибка поиска в Instagram: {e}")
    
    return {
        "platform": "Instagram",
        "found": len(bloggers),
        "bloggers": bloggers
    }

async def search_tiktok_bloggers(query: str) -> Dict[str, Any]:
    """Поиск блогеров в TikTok"""
    logger.info(f"Поиск блогеров в TikTok: {query}")
    
    bloggers = []
    
    try:
        # Поиск через Google с фильтром по TikTok
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
                
    except Exception as e:
        logger.error(f"Ошибка поиска в TikTok: {e}")
    
    return {
        "platform": "TikTok",
        "found": len(bloggers),
        "bloggers": bloggers
    }

async def search_telegram_bloggers(query: str) -> Dict[str, Any]:
    """Поиск блогеров в Telegram"""
    logger.info(f"Поиск блогеров в Telegram: {query}")
    
    bloggers = []
    
    try:
        # Поиск через Google с фильтром по Telegram
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
                
    except Exception as e:
        logger.error(f"Ошибка поиска в Telegram: {e}")
    
    return {
        "platform": "Telegram",
        "found": len(bloggers),
        "bloggers": bloggers
    }

def parse_youtube_result(result: Dict, query: str) -> Optional[Dict]:
    """Парсинг результата поиска YouTube"""
    try:
        url = result.get('link', '')
        if 'youtube.com/watch' not in url and 'youtu.be/' not in url:
            return None
        
        title = result.get('title', '')
        snippet = result.get('snippet', '')
        
        # Извлекаем информацию о канале
        channel_name = extract_youtube_channel(url, title)
        views = extract_views_from_snippet(snippet)
        
        blogger = {
            "name": channel_name or "Неизвестный канал",
            "username": extract_youtube_username(url),
            "platform": "YouTube",
            "url": url,
            "post_title": title,
            "post_snippet": snippet,
            "estimated_audience": estimate_audience_youtube(views),
            "views": views,
            "topic": classify_topic(title + " " + snippet),
            "has_wb_content": check_wb_mentions(title + " " + snippet),
            "estimated_budget": estimate_collaboration_budget("YouTube", views),
            "contacts": extract_contacts(snippet),
            "engagement_rate": "Не определено"
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
        
        blogger = {
            "name": extract_display_name(title) or username,
            "username": username,
            "platform": "Instagram",
            "url": url,
            "post_title": title,
            "post_snippet": snippet,
            "estimated_audience": "Не определено",
            "views": extract_likes_from_snippet(snippet),
            "topic": classify_topic(title + " " + snippet),
            "has_wb_content": check_wb_mentions(title + " " + snippet),
            "estimated_budget": estimate_collaboration_budget("Instagram", 0),
            "contacts": extract_contacts(snippet),
            "engagement_rate": "Не определено"
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
        
        blogger = {
            "name": extract_display_name(title) or username,
            "username": username,
            "platform": "TikTok",
            "url": url,
            "post_title": title,
            "post_snippet": snippet,
            "estimated_audience": estimate_audience_tiktok(views),
            "views": views,
            "topic": classify_topic(title + " " + snippet),
            "has_wb_content": check_wb_mentions(title + " " + snippet),
            "estimated_budget": estimate_collaboration_budget("TikTok", views),
            "contacts": extract_contacts(snippet),
            "engagement_rate": "Не определено"
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
        
        blogger = {
            "name": extract_display_name(title) or username,
            "username": username,
            "platform": "Telegram",
            "url": url,
            "post_title": title,
            "post_snippet": snippet,
            "estimated_audience": "Не определено",
            "views": extract_views_from_snippet(snippet),
            "topic": classify_topic(title + " " + snippet),
            "has_wb_content": check_wb_mentions(title + " " + snippet),
            "estimated_budget": estimate_collaboration_budget("Telegram", 0),
            "contacts": extract_contacts(snippet),
            "engagement_rate": "Не определено"
        }
        
        return blogger
        
    except Exception as e:
        logger.error(f"Ошибка парсинга Telegram результата: {e}")
        return None

def extract_youtube_channel(url: str, title: str) -> str:
    """Извлечение названия YouTube канала"""
    try:
        if " - YouTube" in title:
            return title.split(" - YouTube")[0]
        return "Неизвестный канал"
    except:
        return "Неизвестный канал"

def extract_youtube_username(url: str) -> str:
    """Извлечение имени пользователя YouTube"""
    try:
        if '/channel/' in url:
            return url.split('/channel/')[-1].split('?')[0]
        elif '/user/' in url:
            return url.split('/user/')[-1].split('?')[0]
        elif '/c/' in url:
            return url.split('/c/')[-1].split('?')[0]
        return "unknown"
    except:
        return "unknown"

def extract_instagram_username(url: str) -> str:
    """Извлечение имени пользователя Instagram"""
    try:
        username = url.split('instagram.com/')[-1].split('/')[0].split('?')[0]
        return f"@{username}" if username else "unknown"
    except:
        return "unknown"

def extract_tiktok_username(url: str) -> str:
    """Извлечение имени пользователя TikTok"""
    try:
        username = url.split('tiktok.com/@')[-1].split('/')[0].split('?')[0]
        return f"@{username}" if username else "unknown"
    except:
        return "unknown"

def extract_telegram_username(url: str) -> str:
    """Извлечение имени пользователя Telegram"""
    try:
        username = url.split('t.me/')[-1].split('/')[0].split('?')[0]
        return f"@{username}" if username else "unknown"
    except:
        return "unknown"

def extract_display_name(title: str) -> str:
    """Извлечение отображаемого имени"""
    try:
        title = title.replace(" - Instagram", "").replace(" - TikTok", "").replace(" - Telegram", "")
        return title.strip()
    except:
        return ""

def extract_views_from_snippet(snippet: str) -> int:
    """Извлечение количества просмотров из сниппета"""
    try:
        patterns = [
            r'(\d+(?:\.\d+)?)[KkК]\s*(?:views|просмотр)',
            r'(\d+(?:\.\d+)?)[MmМ]\s*(?:views|просмотр)',
            r'(\d+)\s*(?:views|просмотр)',
            r'(\d+(?:,\d+)*)\s*(?:views|просмотр)'
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
                    return int(value)
        
        return 0
    except:
        return 0

def extract_likes_from_snippet(snippet: str) -> int:
    """Извлечение количества лайков из сниппета"""
    try:
        patterns = [
            r'(\d+(?:\.\d+)?)[KkК]\s*(?:likes|лайк)',
            r'(\d+(?:\.\d+)?)[MmМ]\s*(?:likes|лайк)',
            r'(\d+)\s*(?:likes|лайк)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, snippet, re.IGNORECASE)
            if match:
                value = match.group(1)
                if 'K' in match.group(0).upper() or 'К' in match.group(0).upper():
                    return int(float(value) * 1000)
                elif 'M' in match.group(0).upper() or 'М' in match.group(0).upper():
                    return int(float(value) * 1000000)
                else:
                    return int(value)
        
        return 0
    except:
        return 0

def classify_topic(text: str) -> str:
    """Классификация тематики блогера"""
    text_lower = text.lower()
    
    if any(word in text_lower for word in ['мода', 'одежда', 'стиль', 'fashion', 'outfit']):
        return "Мода и стиль"
    elif any(word in text_lower for word in ['косметика', 'beauty', 'макияж', 'skincare']):
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

def estimate_collaboration_budget(platform: str, engagement: int) -> str:
    """Оценка бюджета сотрудничества"""
    if platform == "YouTube":
        if engagement > 100000:
            return "50,000-200,000₽"
        elif engagement > 10000:
            return "10,000-50,000₽"
        elif engagement > 1000:
            return "3,000-10,000₽"
        else:
            return "Бартер - 3,000₽"
    
    elif platform == "Instagram":
        return "5,000-30,000₽"
    
    elif platform == "TikTok":
        if engagement > 50000:
            return "20,000-100,000₽"
        elif engagement > 5000:
            return "5,000-20,000₽"
        else:
            return "Бартер - 5,000₽"
    
    elif platform == "Telegram":
        return "3,000-15,000₽"
    
    return "Не определено"

def extract_contacts(text: str) -> List[str]:
    """Извлечение контактной информации"""
    contacts = []
    
    # Email
    email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    emails = re.findall(email_pattern, text)
    contacts.extend([f"Email: {email}" for email in emails])
    
    # Telegram
    telegram_pattern = r'@[A-Za-z0-9_]+'
    telegrams = re.findall(telegram_pattern, text)
    contacts.extend([f"Telegram: {tg}" for tg in telegrams])
    
    # Упоминания о контактах в профиле
    if any(word in text.lower() for word in ['контакт', 'сотрудничество', 'реклама', 'contact']):
        contacts.append("Контакты в профиле")
    
    return contacts if contacts else ["Контакты не найдены"]

def get_top_bloggers(platforms_data: Dict) -> List[Dict]:
    """Получение топ блогеров из всех платформ"""
    all_bloggers = []
    
    for platform, data in platforms_data.items():
        if isinstance(data, dict) and 'bloggers' in data:
            for blogger in data['bloggers']:
                blogger['score'] = calculate_blogger_score(blogger)
                all_bloggers.append(blogger)
    
    # Сортируем по скору и возвращаем топ-10
    top_bloggers = sorted(all_bloggers, key=lambda x: x.get('score', 0), reverse=True)[:10]
    
    return top_bloggers

def calculate_blogger_score(blogger: Dict) -> int:
    """Расчет скора блогера для ранжирования"""
    score = 0
    
    # Бонус за наличие WB контента
    if blogger.get('has_wb_content'):
        score += 50
    
    # Бонус за количество просмотров/лайков
    views = blogger.get('views', 0)
    if views > 100000:
        score += 30
    elif views > 10000:
        score += 20
    elif views > 1000:
        score += 10
    
    # Бонус за наличие контактов
    contacts = blogger.get('contacts', [])
    if len(contacts) > 1 or (len(contacts) == 1 and "не найдены" not in contacts[0].lower()):
        score += 15
    
    # Бонус за платформу (YouTube и Instagram более ценны)
    platform = blogger.get('platform', '')
    if platform in ['YouTube', 'Instagram']:
        score += 10
    elif platform == 'TikTok':
        score += 8
    elif platform == 'Telegram':
        score += 5
    
    return score

def create_summary(platforms_data: Dict) -> Dict:
    """Создание сводки по результатам поиска"""
    summary = {
        "total_bloggers": 0,
        "platforms_breakdown": {},
        "top_topics": {},
        "with_wb_content": 0,
        "with_contacts": 0,
        "average_engagement": "Не определено"
    }
    
    topics_count = {}
    total_views = 0
    views_count = 0
    
    for platform, data in platforms_data.items():
        if isinstance(data, dict) and 'bloggers' in data:
            bloggers = data['bloggers']
            summary["platforms_breakdown"][platform] = len(bloggers)
            summary["total_bloggers"] += len(bloggers)
            
            for blogger in bloggers:
                # Подсчет тематик
                topic = blogger.get('topic', 'Неизвестно')
                topics_count[topic] = topics_count.get(topic, 0) + 1
                
                # Подсчет блогеров с WB контентом
                if blogger.get('has_wb_content'):
                    summary["with_wb_content"] += 1
                
                # Подсчет блогеров с контактами
                contacts = blogger.get('contacts', [])
                if len(contacts) > 0 and "не найдены" not in str(contacts).lower():
                    summary["with_contacts"] += 1
                
                # Подсчет просмотров для среднего
                views = blogger.get('views', 0)
                if views > 0:
                    total_views += views
                    views_count += 1
    
    # Топ тематики
    summary["top_topics"] = dict(sorted(topics_count.items(), key=lambda x: x[1], reverse=True)[:5])
    
    # Средняя активность
    if views_count > 0:
        avg_views = total_views // views_count
        if avg_views > 1000000:
            summary["average_engagement"] = f"{avg_views//1000000}M просмотров"
        elif avg_views > 1000:
            summary["average_engagement"] = f"{avg_views//1000}K просмотров"
        else:
            summary["average_engagement"] = f"{avg_views} просмотров"
    
    return summary

def format_blogger_search_results(results: Dict) -> str:
    """Форматирование результатов поиска блогеров для отправки пользователю"""
    if "error" in results:
        return f"❌ Ошибка при поиске блогеров: {results['error']}"
    
    query = results.get('query', 'Неизвестный запрос')
    total_found = results.get('total_found', 0)
    
    if total_found == 0:
        return f"🔍 По запросу '*{query}*' блогеры не найдены.\n\nПопробуйте изменить поисковый запрос или использовать более общие термины."
    
    text = f"👥 *Поиск блогеров: {query}*\n\n"
    text += f"📊 *Найдено блогеров: {total_found}*\n\n"
    
    # Сводка по платформам
    platforms = results.get('platforms', {})
    text += "📱 *По платформам:*\n"
    for platform, data in platforms.items():
        if isinstance(data, dict):
            count = len(data.get('bloggers', []))
            text += f"• {platform}: {count}\n"
    text += "\n"
    
    # Топ блогеры
    top_bloggers = results.get('top_bloggers', [])
    if top_bloggers:
        text += "🏆 *Топ блогеры:*\n\n"
        
        for i, blogger in enumerate(top_bloggers[:5], 1):
            name = blogger.get('name', 'Неизвестно')
            username = blogger.get('username', '')
            platform = blogger.get('platform', '')
            url = blogger.get('url', '')
            topic = blogger.get('topic', 'Общая тематика')
            audience = blogger.get('estimated_audience', 'Не определено')
            views = blogger.get('views', 0)
            has_wb = "✅" if blogger.get('has_wb_content') else "❌"
            budget = blogger.get('estimated_budget', 'Не определено')
            contacts = blogger.get('contacts', [])
            
            text += f"*{i}. {name}*\n"
            if username and username != 'unknown':
                text += f"�� {username}\n"
            text += f"📱 {platform}\n"
            text += f"🎯 {topic}\n"
            text += f"👥 {audience}\n"
            if views > 0:
                text += f"👀 {views:,} просмотров\n"
            text += f"🛒 WB контент: {has_wb}\n"
            text += f"💰 Бюджет: {budget}\n"
            
            contact_info = "Не найдены"
            if contacts and len(contacts) > 0 and "не найдены" not in str(contacts).lower():
                contact_info = contacts[0] if len(contacts) == 1 else f"{len(contacts)} контактов"
            text += f"📞 Контакты: {contact_info}\n"
            
            if url:
                text += f"🔗 [Перейти к профилю]({url})\n"
            text += "\n"
    
    # Общая статистика
    summary = results.get('summary', {})
    if summary:
        text += "📈 *Статистика:*\n"
        wb_content = summary.get('with_wb_content', 0)
        with_contacts = summary.get('with_contacts', 0)
        text += f"• С контентом WB: {wb_content}\n"
        text += f"• С контактами: {with_contacts}\n"
        
        avg_engagement = summary.get('average_engagement', 'Не определено')
        if avg_engagement != 'Не определено':
            text += f"• Средняя активность: {avg_engagement}\n"
        
        top_topics = summary.get('top_topics', {})
        if top_topics:
            text += f"\n🎯 *Популярные тематики:*\n"
            for topic, count in list(top_topics.items())[:3]:
                text += f"• {topic}: {count}\n"
    
    text += f"\n💡 *Совет:* Обратите внимание на блогеров с отметкой ✅ - у них уже есть контент о Wildberries!"
    
    return text

def _parse_budget(budget_str: str) -> int:
    """Преобразует строку '5-10K ₽' или 'от 20 000 ₽' в среднее значение (int)."""
    try:
        digits = re.findall(r"\d+[\s\d]*", budget_str.replace(" ", " "))  # заменяем узкие пробелы
        nums = [int(d.replace(" ", "")) for d in digits]
        if not nums:
            return 0
        return int(mean(nums)) if len(nums) > 1 else nums[0]
    except Exception:
        return 0
