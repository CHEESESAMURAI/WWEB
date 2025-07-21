import os
import logging
from typing import List, Dict, Any
import aiohttp
import datetime
import re
from urllib.parse import urlparse, parse_qs
import json
import requests
from bs4 import BeautifulSoup

# Try to take API keys from config.py if present, otherwise from env var
try:
    from config import SERPER_API_KEY, MPSTATS_API_KEY, VK_API_TOKEN, YOUTUBE_API_KEY  # type: ignore
except (ImportError, AttributeError):
    SERPER_API_KEY = os.getenv("SERPER_API_KEY", "")
    MPSTATS_API_KEY = os.getenv("MPSTATS_API_KEY", "")
    VK_API_TOKEN = os.getenv("VK_API_TOKEN", "")
    YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY", "")

logger = logging.getLogger(__name__)

async def get_wb_product_info(article: str) -> Dict[str, Any]:
    """Получение информации о товаре из WB API"""
    try:
        # Получаем базовую информацию о товаре
        url = f"https://card.wb.ru/cards/detail?nm={article}"
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                if response.status == 200:
                    data = await response.json()
                    if data.get('data', {}).get('products'):
                        product = data['data']['products'][0]
                        
                        # Получаем информацию о продажах
                        sales_url = f"https://product-order-qnt.wildberries.ru/by-nm/?nm={article}"
                        async with session.get(sales_url) as sales_response:
                            sales_today = 0
                            if sales_response.status == 200:
                                sales_data = await sales_response.json()
                                sales_today = sales_data.get(str(article), {}).get('qnt', 0)
                        
                        # Получаем информацию о складах
                        stocks_url = f"https://card.wb.ru/cards/detail?nm={article}&curr=rub&dest=-1257786"
                        async with session.get(stocks_url) as stocks_response:
                            total_stock = 0
                            if stocks_response.status == 200:
                                stocks_data = await stocks_response.json()
                                if stocks_data.get('data', {}).get('products'):
                                    stock_product = stocks_data['data']['products'][0]
                                    sizes = stock_product.get('sizes', [])
                                    for size in sizes:
                                        stocks = size.get('stocks', [])
                                        total_stock += sum(stock.get('qty', 0) for stock in stocks)
                        
                        return {
                            'name': product.get('name', ''),
                            'brand': product.get('brand', ''),
                            'avg_price': product.get('salePriceU', 0) / 100,
                            'orders': product.get('ordersCount', 0) or product.get('salesPerMonth', 0) or 0,
                            'revenue': (product.get('salePriceU', 0) / 100) * (product.get('ordersCount', 0) or product.get('salesPerMonth', 0) or 0),
                            'rating': product.get('rating', 0),
                            'feedbacks': product.get('feedbacks', 0),
                            'stocks': total_stock,
                            'sales_today': sales_today
                        }
    except Exception as e:
        logger.error(f"Error getting WB product info: {str(e)}")
    return {
        'name': '',
        'brand': '',
        'avg_price': 0,
        'orders': 0,
        'revenue': 0,
        'rating': 0,
        'feedbacks': 0,
        'stocks': 0,
        'sales_today': 0
    }

async def get_mpstats_info(article: str) -> Dict[str, Any]:
    """Получение информации о товаре из MPStats API"""
    try:
        url = f"https://mpstats.io/api/wb/get/item/{article}"
        headers = {"X-Mpstats-TOKEN": MPSTATS_API_KEY}
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers) as response:
                if response.status == 200:
                    data = await response.json()
                    sales_data = data.get('sales', [])
                    if sales_data:
                        # Берем данные за последние 30 дней
                        recent_sales = sales_data[-30:]
                        total_sales = sum(day.get('sales', 0) for day in recent_sales)
                        total_revenue = sum(day.get('revenue', 0) for day in recent_sales)
                        
                        # Рассчитываем рост
                        prev_sales = sum(day.get('sales', 0) for day in sales_data[-60:-30])
                        prev_revenue = sum(day.get('revenue', 0) for day in sales_data[-60:-30])
                        
                        sales_growth = ((total_sales - prev_sales) / prev_sales * 100) if prev_sales > 0 else 0
                        revenue_growth = ((total_revenue - prev_revenue) / prev_revenue * 100) if prev_revenue > 0 else 0
                        
                        # Получаем данные о категории
                        category_info = data.get('category', {})
                        
                        return {
                            'orders': total_sales,
                            'revenue': total_revenue,
                            'sales_growth': sales_growth,
                            'revenue_growth': revenue_growth,
                            'category': {
                                'name': category_info.get('name', ''),
                                'path': category_info.get('path', '')
                            }
                        }
    except Exception as e:
        logger.error(f"Error getting MPStats info: {str(e)}")
    return {
        'orders': 0,
        'revenue': 0,
        'sales_growth': 0,
        'revenue_growth': 0,
        'category': {'name': '', 'path': ''}
    }

async def get_vk_post_info(url: str) -> Dict[str, Any]:
    """Получение информации о посте ВКонтакте"""
    try:
        # Извлекаем owner_id и post_id из URL
        path_parts = urlparse(url).path.split('/')
        if 'wall' in url:
            post_id = path_parts[-1].split('_')
            owner_id = post_id[0].replace('wall', '')
            post_id = post_id[1]
        else:
            return {'author': '', 'views': 0, 'likes': 0}

        # Получаем информацию о посте через VK API
        api_url = f"https://api.vk.com/method/wall.getById"
        params = {
            'posts': f"{owner_id}_{post_id}",
            'access_token': VK_API_TOKEN,
            'v': '5.131'
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(api_url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    if data.get('response'):
                        post = data['response'][0]
                        
                        # Получаем информацию об авторе
                        author = ''
                        if post.get('owner_id') < 0:  # Группа
                            group_url = f"https://api.vk.com/method/groups.getById"
                            group_params = {
                                'group_id': str(abs(post['owner_id'])),
                                'access_token': VK_API_TOKEN,
                                'v': '5.131'
                            }
                            async with session.get(group_url, params=group_params) as group_response:
                                if group_response.status == 200:
                                    group_data = await group_response.json()
                                    if group_data.get('response'):
                                        author = group_data['response'][0].get('name', '')
                        else:  # Пользователь
                            user_url = f"https://api.vk.com/method/users.get"
                            user_params = {
                                'user_ids': str(post['owner_id']),
                                'access_token': VK_API_TOKEN,
                                'v': '5.131'
                            }
                            async with session.get(user_url, params=user_params) as user_response:
                                if user_response.status == 200:
                                    user_data = await user_response.json()
                                    if user_data.get('response'):
                                        user = user_data['response'][0]
                                        author = f"{user.get('first_name', '')} {user.get('last_name', '')}"
                        
                        return {
                            'author': author.strip(),
                            'views': post.get('views', {}).get('count', 0),
                            'likes': post.get('likes', {}).get('count', 0),
                            'reposts': post.get('reposts', {}).get('count', 0),
                            'comments': post.get('comments', {}).get('count', 0),
                            'date': datetime.datetime.fromtimestamp(post.get('date', 0)).strftime('%Y-%m-%d %H:%M:%S')
                        }
    except Exception as e:
        logger.error(f"Error getting VK post info: {str(e)}")
    return {
        'author': '',
        'views': 0,
        'likes': 0,
        'reposts': 0,
        'comments': 0,
        'date': ''
    }

async def get_youtube_video_info(url: str) -> Dict[str, Any]:
    """Получение информации о видео на YouTube"""
    try:
        video_id = parse_qs(urlparse(url).query).get('v', [None])[0]
        if not video_id:
            return {'author': '', 'views': 0, 'likes': 0}

        # Используем YouTube Data API для получения полной информации
        api_url = f"https://www.googleapis.com/youtube/v3/videos"
        params = {
            'id': video_id,
            'part': 'snippet,statistics',
            'key': YOUTUBE_API_KEY
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(api_url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    if data.get('items'):
                        video = data['items'][0]
                        snippet = video.get('snippet', {})
                        statistics = video.get('statistics', {})
                        
                        return {
                            'author': snippet.get('channelTitle', ''),
                            'views': int(statistics.get('viewCount', 0)),
                            'likes': int(statistics.get('likeCount', 0)),
                            'comments': int(statistics.get('commentCount', 0)),
                            'date': datetime.datetime.strptime(
                                snippet.get('publishedAt', '')[:10],
                                '%Y-%m-%d'
                            ).strftime('%Y-%m-%d %H:%M:%S')
                        }
    except Exception as e:
        logger.error(f"Error getting YouTube video info: {str(e)}")
    return {
        'author': '',
        'views': 0,
        'likes': 0,
        'comments': 0,
        'date': ''
    }

async def get_telegram_post_info(url: str) -> Dict[str, Any]:
    """Получение информации о посте в Telegram"""
    try:
        # Извлекаем username и post_id из URL
        path_parts = urlparse(url).path.split('/')
        if len(path_parts) >= 2:
            channel_name = path_parts[1]
            
            # Получаем информацию о канале через веб-скрапинг
            async with aiohttp.ClientSession() as session:
                async with session.get(f"https://t.me/s/{channel_name}") as response:
                    if response.status == 200:
                        html = await response.text()
                        soup = BeautifulSoup(html, 'html.parser')
                        
                        # Получаем название канала
                        channel_title = soup.find('meta', property='og:title')
                        channel_name = channel_title.get('content', '') if channel_title else ''
                        
                        # Получаем описание канала
                        channel_description = soup.find('meta', property='og:description')
                        description = channel_description.get('content', '') if channel_description else ''
                        
                        # Получаем количество подписчиков (если доступно)
                        subscribers_elem = soup.find('div', class_='tgme_channel_info_counter')
                        subscribers = 0
                        if subscribers_elem:
                            subscribers_text = subscribers_elem.get_text()
                            subscribers_match = re.search(r'\d+', subscribers_text)
                            if subscribers_match:
                                subscribers = int(subscribers_match.group())
                        
                        return {
                            'author': channel_name,
                            'description': description,
                            'subscribers': subscribers,
                            'views': 0,  # Telegram не предоставляет эту информацию публично
                            'likes': 0    # Telegram не предоставляет эту информацию публично
                        }
    except Exception as e:
        logger.error(f"Error getting Telegram post info: {str(e)}")
    return {
        'author': '',
        'description': '',
        'subscribers': 0,
        'views': 0,
        'likes': 0
    }

def estimate_impact(engagement_data: Dict[str, Any]) -> Dict[str, Any]:
    """Оценка влияния поста на основе метрик вовлеченности"""
    try:
        views = engagement_data.get('views', 0)
        likes = engagement_data.get('likes', 0)
        comments = engagement_data.get('comments', 0)
        reposts = engagement_data.get('reposts', 0)
        subscribers = engagement_data.get('subscribers', 0)
        
        # Рассчитываем общий engagement rate
        total_engagement = likes + comments * 2 + reposts * 3  # Придаем больший вес комментариям и репостам
        engagement_rate = (total_engagement / views * 100) if views > 0 else 0
        
        # Рассчитываем потенциальный охват
        potential_reach = views + (reposts * 100)  # Предполагаем, что каждый репост дает дополнительные 100 просмотров
        
        # Определяем уровень влияния
        impact_level = 'low'
        if engagement_rate > 5:
            impact_level = 'high'
        elif engagement_rate > 2:
            impact_level = 'medium'
        
        return {
            'engagement_rate': round(engagement_rate, 2),
            'potential_reach': potential_reach,
            'impact_level': impact_level,
            'total_engagement': total_engagement
        }
    except Exception as e:
        logger.error(f"Error estimating impact: {str(e)}")
        return {
            'engagement_rate': 0,
            'potential_reach': 0,
            'impact_level': 'low',
            'total_engagement': 0
        }

async def verify_url(url: str) -> bool:
    """Проверка доступности URL"""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.head(url, allow_redirects=True, timeout=5) as response:
                return response.status == 200
    except Exception:
        return False

async def global_search_serper(query: str) -> List[Dict[Any, Any]]:
    """Получение данных из глобального поиска через Serper API"""
    try:
        logger.info(f"Starting global search for: {query}")
        
        # Получаем информацию о товаре
        wb_info = await get_wb_product_info(query)
        mpstats_info = await get_mpstats_info(query)
        
        url = "https://google.serper.dev/search"
        headers = {
            "X-API-KEY": SERPER_API_KEY,
            "Content-Type": "application/json"
        }
        payload = {
            "q": f"{query} site:vk.com OR site:instagram.com OR site:facebook.com OR site:twitter.com OR site:t.me OR site:youtube.com",
            "gl": "ru",
            "hl": "ru",
            "num": 10
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(url, headers=headers, json=payload) as response:
                if response.status == 200:
                    data = await response.json()
                    logger.info("Successfully received search data")
                    
                    results = []
                    processed_urls = set()
                    
                    for result in data.get('organic', []):
                        url = result.get('link', '')
                        
                        # Проверяем URL перед обработкой
                        if url and url not in processed_urls and await verify_url(url):
                            processed_urls.add(url)
                            
                            # Определяем платформу и получаем информацию
                            platform_info = {'author': '', 'views': 0, 'likes': 0}
                            platform = 'unknown'
                            
                            if 'vk.com' in url:
                                platform = 'vk'
                                platform_info = await get_vk_post_info(url)
                            elif 'youtube.com' in url:
                                platform = 'youtube'
                                platform_info = await get_youtube_video_info(url)
                            elif 't.me' in url:
                                platform = 'telegram'
                                platform_info = await get_telegram_post_info(url)
                            
                            # Оцениваем влияние поста
                            impact = estimate_impact(platform_info)
                            
                            # Формируем результат
                            search_result = {
                                'platform': platform,
                                'url': url,
                                'title': result.get('title', ''),
                                'snippet': result.get('snippet', ''),
                                'date': platform_info.get('date', ''),
                                'author': platform_info.get('author', ''),
                                'engagement': {
                                    'views': platform_info.get('views', 0),
                                    'likes': platform_info.get('likes', 0),
                                    'comments': platform_info.get('comments', 0),
                                    'reposts': platform_info.get('reposts', 0)
                                },
                                'impact': impact
                            }
                            
                            # Добавляем информацию о товаре только к первому результату
                            if not results:
                                search_result['product_info'] = {
                                    'wb': wb_info,
                                    'mpstats': mpstats_info
                                }
                            
                            results.append(search_result)
                            logger.info(f"Added result: {url}")
                    
                    logger.info(f"Search completed successfully, found {len(results)} results")
                    return results
                else:
                    logger.error(f"Serper API error: {response.status}")
                    return []
                    
    except Exception as e:
        logger.error(f"Error in global search: {str(e)}")
        return []
