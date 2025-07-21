import logging
import aiohttp
import json
from typing import Dict, Optional, List, Any
from datetime import datetime, timedelta
import random
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
import pandas as pd
from io import BytesIO
import base64

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# API ключи
MPSTATS_API_KEY = "68431d2ac72ea4.96910328a56006b24a55daf65db03835d5fe5b4d"

async def get_product_info(article: str) -> Dict[str, Any]:
    """Получает информацию о товаре из Wildberries API."""
    try:
        async with aiohttp.ClientSession() as session:
            # API для получения основной информации о товаре
            card_url = f"https://card.wb.ru/cards/v1/detail?appType=1&curr=rub&dest=-1257786&spp=30&nm={article}"
            
            async with session.get(card_url) as response:
                if response.status != 200:
                    logger.error(f"Card API request failed with status: {response.status}")
                    return None
                
                data = await response.json()
                if not data.get("data") or not data["data"].get("products"):
                    logger.error("No products found in card API response")
                    return None
                
                product = data["data"]["products"][0]
                
                # Извлекаем основную информацию
                name = product.get("name", "")
                brand = product.get("brand", "")
                
                # Цены
                price_current = product.get("salePriceU", 0) / 100
                price_original = product.get("priceU", 0) / 100
                discount = round((1 - price_current / price_original) * 100) if price_original > 0 else 0
                
                # Рейтинг и отзывы
                rating = product.get("rating", 0)
                feedbacks = product.get("feedbacks", 0)
                
                # Остатки товара
                total_stock = 0
                stock_by_size = {}
                
                sizes = product.get("sizes", [])
                for size in sizes:
                    size_name = size.get("name", "")
                    stocks = size.get("stocks", [])
                    size_stock = sum(stock.get("qty", 0) for stock in stocks)
                    
                    total_stock += size_stock
                    if size_stock > 0:
                        stock_by_size[size_name] = size_stock
                
                # Получаем данные о продажах
                sales_url = f"https://product-order-qnt.wildberries.ru/by-nm/?nm={article}"
                async with session.get(sales_url) as sales_response:
                    sales_data = {}
                    if sales_response.status == 200:
                        sales_json = await sales_response.json()
                        if sales_json and len(sales_json) > 0:
                            sales_data = sales_json[0]
                
                # Формируем итоговый результат
                return {
                    "name": name,
                    "brand": brand,
                    "article": article,
                    "price": {
                        "current": price_current,
                        "original": price_original,
                        "discount": discount
                    },
                    "rating": rating,
                    "feedbacks": feedbacks,
                    "stocks": {
                        "total": total_stock,
                        "by_size": stock_by_size
                    },
                    "sales": {
                        "today": sales_data.get("qnt", 0),
                        "total": sales_data.get("qnt", 0),
                        "revenue": {
                            "daily": price_current * sales_data.get("qnt", 0),
                            "weekly": price_current * sales_data.get("qnt", 0) * 7,
                            "monthly": price_current * sales_data.get("qnt", 0) * 30
                        }
                    }
                }
                
    except Exception as e:
        logger.error(f"Error fetching product info: {str(e)}")
        return None

async def get_mpstats_data(article: str) -> Dict[str, Any]:
    """Получает данные о товаре из MPSTATS API."""
    try:
        headers = {
            "X-Mpstats-TOKEN": MPSTATS_API_KEY,
            "Content-Type": "application/json"
        }
        
        async with aiohttp.ClientSession() as session:
            url = f"https://mpstats.io/api/wb/get/item/{article}"
            async with session.get(url, headers=headers) as response:
                if response.status == 200:
                    data = await response.json()
                    return data
                else:
                    logger.error(f"MPSTATS API error: {response.status}")
                    return None
    except Exception as e:
        logger.error(f"Error fetching MPSTATS data: {str(e)}")
        return None

def generate_sales_chart(sales_data: List[Dict[str, Any]]) -> str:
    """Генерирует график продаж."""
    try:
        # Создаем DataFrame
        df = pd.DataFrame(sales_data)
        
        # Создаем график
        plt.figure(figsize=(10, 6))
        sns.lineplot(data=df, x='date', y='sales')
        plt.title('Динамика продаж')
        plt.xlabel('Дата')
        plt.ylabel('Продажи')
        plt.xticks(rotation=45)
        
        # Сохраняем график в base64
        buffer = BytesIO()
        plt.savefig(buffer, format='png', bbox_inches='tight')
        buffer.seek(0)
        image_png = buffer.getvalue()
        buffer.close()
        plt.close()
        
        return base64.b64encode(image_png).decode()
    except Exception as e:
        logger.error(f"Error generating sales chart: {str(e)}")
        return None

def format_product_analysis(product_data: Dict[str, Any]) -> str:
    """Форматирует данные о товаре в текстовое сообщение."""
    try:
        if not product_data:
            return "❌ Не удалось получить данные о товаре"

        message = [
            f"📊 Анализ товара: {product_data['name']}",
            f"Артикул: {product_data['article']}",
            f"Бренд: {product_data['brand']}",
            "",
            "💰 Цены:",
            f"• Текущая: {product_data['price']['current']:,.2f} ₽",
            f"• Изначальная: {product_data['price']['original']:,.2f} ₽",
            f"• Скидка: {product_data['price']['discount']}%",
            "",
            "⭐ Рейтинг и отзывы:",
            f"• Рейтинг: {product_data['rating']}/5",
            f"• Отзывов: {product_data['feedbacks']}",
            "",
            "📦 Остатки:",
            f"• Всего: {product_data['stocks']['total']} шт.",
        ]

        if product_data['stocks']['by_size']:
            message.append("• По размерам:")
            for size, qty in product_data['stocks']['by_size'].items():
                message.append(f"  - {size}: {qty} шт.")

        message.extend([
            "",
            "📈 Продажи:",
            f"• Сегодня: {product_data['sales']['today']} шт.",
            f"• Всего: {product_data['sales']['total']} шт.",
            "",
            "💵 Выручка:",
            f"• За день: {product_data['sales']['revenue']['daily']:,.2f} ₽",
            f"• За неделю: {product_data['sales']['revenue']['weekly']:,.2f} ₽",
            f"• За месяц: {product_data['sales']['revenue']['monthly']:,.2f} ₽"
        ])

        return "\n".join(message)
    except Exception as e:
        logger.error(f"Error formatting product analysis: {str(e)}")
        return "❌ Ошибка при форматировании данных о товаре"
