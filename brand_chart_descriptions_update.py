#!/usr/bin/env python3
import re

# Читаем файл
with open("new_bot.py", "r") as f:
    content = f.read()

# Новый словарь с описаниями
new_descriptions = """        # Словарь с описаниями графиков бренда
        brand_chart_descriptions = {
            'brand_sales_chart': "📈 Динамика продаж бренда — изменение объема продаж и выручки по дням с трендами и средними значениями",
            'brand_competitors_chart': "🥊 Сравнение с конкурентами — сопоставление по количеству товаров и продажам",
            'brand_categories_chart': "📁 Распределение по категориям — показывает долю товаров бренда в разных категориях",
            'brand_top_items_chart': "🏆 Топ товары бренда — самые продаваемые позиции с показателями продаж и выручки",
            'brand_radar_chart': "📊 Ключевые показатели бренда — интегральная оценка характеристик бренда на рынке"
        }"""

# Шаблон для поиска словаря
pattern = r"        # Словарь с описаниями графиков бренда\s+brand_chart_descriptions = \{[^}]+\}"

# Заменяем старый словарь на новый
updated_content = re.sub(pattern, new_descriptions, content, flags=re.DOTALL)

# Записываем обновленный файл
with open("new_bot.py", "w") as f:
    f.write(updated_content)

print("Файл обновлен!") 