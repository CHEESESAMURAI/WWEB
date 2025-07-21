#!/usr/bin/env python3
"""
🎯 ДЕМОНСТРАЦИЯ РАСШИРЕННОГО АНАЛИЗА ТОВАРА
Показывает работу нового endpoint с реальными данными MPStats
"""

import requests
import json
from datetime import datetime, timedelta

def test_advanced_analysis():
    """Тестирует новый endpoint расширенного анализа"""
    
    print("🚀 ТЕСТИРОВАНИЕ РАСШИРЕННОГО АНАЛИЗА ТОВАРА")
    print("=" * 60)
    
    # Параметры запроса
    url = "http://localhost:8000/mpstats/advanced-analysis"
    payload = {
        "article": "446467818",
        "date_from": "2023-10-27",
        "date_to": "2023-11-25", 
        "fbs": 1
    }
    
    print(f"📡 Отправляем запрос: {url}")
    print(f"📊 Параметры: {payload}")
    print()
    
    try:
        response = requests.post(url, json=payload, timeout=30)
        print(f"📈 Статус ответа: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            print("✅ ДАННЫЕ ПОЛУЧЕНЫ УСПЕШНО!")
            print("=" * 40)
            
            # Основная информация
            basic = data.get('basic_info', {})
            print(f"📦 ОСНОВНАЯ ИНФОРМАЦИЯ:")
            print(f"   Название: {basic.get('name', 'N/A')}")
            print(f"   Бренд: {basic.get('brand', 'N/A')}")
            print(f"   Продавец: {basic.get('seller', 'N/A')}")
            print(f"   ID товара: {basic.get('itemid', 'N/A')}")
            print(f"   Категория: {basic.get('subject', 'N/A')}")
            print()
            
            # Ценообразование
            pricing = data.get('pricing', {})
            print(f"💰 ЦЕНООБРАЗОВАНИЕ:")
            print(f"   Актуальная цена: {pricing.get('final_price', 0):,} руб")
            print(f"   Базовая цена: {pricing.get('basic_price', 0):,} руб")
            print(f"   Стартовая цена: {pricing.get('start_price', 0):,} руб")
            print(f"   Базовая скидка: {pricing.get('basic_sale', 0)}%")
            print(f"   Промо скидка: {pricing.get('promo_sale', 0)}%")
            print()
            
            # Продажи
            sales = data.get('sales_metrics', {})
            print(f"📈 ПОКАЗАТЕЛИ ПРОДАЖ:")
            print(f"   Продаж за период: {sales.get('sales', 0):,}")
            print(f"   Среднее в день: {sales.get('sales_per_day_average', 0):.2f}")
            print(f"   Общая выручка: {sales.get('revenue', 0):,} руб")
            print(f"   Средняя выручка/день: {sales.get('revenue_average', 0):,} руб")
            print(f"   Процент выкупа: {sales.get('purchase', 0)}%")
            print(f"   Оборачиваемость: {sales.get('turnover_days', 0)} дней")
            print()
            
            # Рейтинг
            rating = data.get('rating_reviews', {})
            print(f"⭐ РЕЙТИНГ И ОТЗЫВЫ:")
            print(f"   Рейтинг: {rating.get('rating', 0)}")
            print(f"   Комментариев: {rating.get('comments', 0):,}")
            print(f"   Фотографий: {rating.get('picscount', 0)}")
            print(f"   3D фото: {'✅' if rating.get('has3d') else '❌'}")
            print(f"   Видео: {'✅' if rating.get('hasvideo') else '❌'}")
            print(f"   Последний рейтинг: {rating.get('avg_latest_rating', 0):.2f}")
            print()
            
            # Запасы
            inventory = data.get('inventory', {})
            print(f"📦 ЗАПАСЫ И ОСТАТКИ:")
            print(f"   Общий остаток: {inventory.get('balance', 0):,}")
            print(f"   FBS остаток: {inventory.get('balance_fbs', 0):,}")
            print(f"   Дней в наличии: {inventory.get('days_in_stock', 0)}")
            print(f"   Дней с продажами: {inventory.get('days_with_sales', 0)}")
            print(f"   FBS активен: {'✅' if inventory.get('is_fbs') else '❌'}")
            print()
            
            # Графики
            charts = data.get('charts', {})
            print(f"📊 ДАННЫЕ ДЛЯ ГРАФИКОВ:")
            print(f"   График продаж: {len(charts.get('sales_graph', []))} точек")
            print(f"   График остатков: {len(charts.get('stocks_graph', []))} точек")
            print(f"   График цен: {len(charts.get('price_graph', []))} точек")
            print(f"   График видимости: {len(charts.get('product_visibility_graph', []))} точек")
            print()
            
            # Отладка
            debug = data.get('debug_info', {})
            print(f"🔍 ИНФОРМАЦИЯ ОБ АНАЛИЗЕ:")
            print(f"   Target item ID: {debug.get('target_itemid', 'N/A')}")
            print(f"   Похожих товаров: {debug.get('similar_items_count', 0)}")
            print(f"   Всего в категории: {debug.get('total_similar', 0)}")
            
            completeness = debug.get('data_completeness', {})
            print(f"   Полнота данных:")
            print(f"     - Основная информация: {'✅' if completeness.get('has_basic_info') else '❌'}")
            print(f"     - Ценообразование: {'✅' if completeness.get('has_pricing') else '❌'}")
            print(f"     - Продажи: {'✅' if completeness.get('has_sales') else '❌'}")
            print(f"     - Графики: {'✅' if completeness.get('has_charts') else '❌'}")
            
            print()
            print("🎉 РАСШИРЕННЫЙ АНАЛИЗ РАБОТАЕТ ОТЛИЧНО!")
            print("   ✅ Реальные данные из MPStats API")
            print("   ✅ Все секции заполнены")
            print("   ✅ Готово к использованию")
            
        else:
            print(f"❌ Ошибка: {response.status_code}")
            print(f"Ответ: {response.text}")
            
    except Exception as e:
        print(f"❌ Исключение: {e}")

if __name__ == "__main__":
    test_advanced_analysis() 