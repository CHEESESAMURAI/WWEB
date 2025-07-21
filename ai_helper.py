"""
AI Helper Module - Блок помощи с нейронкой
Модуль для генерации продажных текстов, описаний товаров, карточек и других материалов
"""

import openai
import asyncio
import logging
from typing import Dict, List, Optional
import json
import re

# Настройка логирования
logger = logging.getLogger(__name__)

class AIHelper:
    """Помощник с искусственным интеллектом для создания продажных материалов"""
    
    def __init__(self, api_key: str):
        """
        Инициализация AI Helper
        
        Args:
            api_key (str): OpenAI API ключ
        """
        self.api_key = api_key
        openai.api_key = api_key
        
        # Базовые промпты для разных типов контента
        self.prompts = {
            'product_description': self._get_product_description_prompt(),
            'product_card': self._get_product_card_prompt(),
            'sales_text': self._get_sales_text_prompt(),
            'ad_copy': self._get_ad_copy_prompt(),
            'social_post': self._get_social_post_prompt(),
            'email_marketing': self._get_email_marketing_prompt(),
            'landing_page': self._get_landing_page_prompt(),
            'seo_content': self._get_seo_content_prompt()
        }
    
    def _get_product_description_prompt(self) -> str:
        """Промпт для описания товара"""
        return """
Ты — эксперт по созданию продающих описаний товаров для маркетплейса Wildberries.

Твоя задача — создать продающее описание товара, которое:
1. Привлекает внимание покупателей
2. Выделяет ключевые преимущества и характеристики
3. Использует эмоциональные триггеры
4. Содержит призыв к действию
5. Оптимизировано для поиска на WB

ОБЯЗАТЕЛЬНЫЕ ЭЛЕМЕНТЫ:
- Заголовок (яркий, цепляющий)
- Основные характеристики
- Преимущества и выгоды
- Область применения
- Призыв к действию
- Ключевые слова для SEO

СТИЛЬ НАПИСАНИЯ:
- Убедительно и эмоционально
- Простым и понятным языком
- С использованием цифр и фактов
- Без воды и лишних слов

Информация о товаре: {product_info}

Создай продающее описание:
"""

    def _get_product_card_prompt(self) -> str:
        """Промпт для карточки товара"""
        return """
Ты — специалист по созданию продающих карточек товаров для Wildberries.

Создай полную карточку товара, включающую:

1. НАЗВАНИЕ ТОВАРА (60-90 символов):
   - Содержит основные ключевые слова
   - Привлекает внимание
   - Соответствует требованиям WB

2. ОПИСАНИЕ (до 5000 символов):
   - Структурированное и читаемое
   - С маркированными списками
   - Выделяет УТП (уникальное торговое предложение)

3. ХАРАКТЕРИСТИКИ:
   - Технические параметры
   - Размеры, вес, материалы
   - Цвета, комплектация

4. ПРЕИМУЩЕСТВА:
   - Что получает покупатель
   - Решение каких проблем
   - Выгоды от покупки

5. ИНФОГРАФИКА (текстовые блоки):
   - Ключевые особенности
   - Сравнения с конкурентами
   - Гарантии и сертификаты

Информация о товаре: {product_info}

Создай полную карточку товара:
"""

    def _get_sales_text_prompt(self) -> str:
        """Промпт для продажного текста"""
        return """
Ты — топовый копирайтер, специализирующийся на прямых продажах.

Создай продающий текст по формуле AIDA:
- ATTENTION (Внимание) - цепляющий заголовок
- INTEREST (Интерес) - проблема и её актуальность  
- DESIRE (Желание) - выгоды и преимущества решения
- ACTION (Действие) - четкий призыв к действию

СТРУКТУРА ТЕКСТА:
1. Заголовок-крючок
2. Проблема (боль клиента)
3. Решение (ваш товар)
4. Преимущества и выгоды
5. Социальные доказательства
6. Ограничение по времени/количеству
7. Призыв к действию

ТЕХНИКИ ВОЗДЕЙСТВИЯ:
- Эмоциональные триггеры
- Принцип дефицита
- Социальное доказательство
- Конкретные цифры и факты

Тема для продажного текста: {topic}
Целевая аудитория: {target_audience}

Создай продающий текст:
"""

    def _get_ad_copy_prompt(self) -> str:
        """Промпт для рекламного текста"""
        return """
Ты — эксперт по созданию рекламных текстов для digital-площадок.

Создай рекламный креатив для размещения в:
- Яндекс.Директ
- Google Ads  
- ВКонтакте
- Telegram
- Одноклассники

ФОРМАТЫ:
1. Короткие объявления (до 90 символов)
2. Расширенные объявления (до 300 символов)
3. Посты для соцсетей
4. Stories (вертикальный формат)

ЭЛЕМЕНТЫ:
- Цепляющий заголовок
- Описание выгоды
- Призыв к действию
- Хештеги (для соцсетей)

ПРИНЦИПЫ:
- Ориентация на целевую аудиторию
- Четкое УТП
- Конкретные выгоды
- Срочность и дефицит

Информация о товаре/услуге: {product_info}
Площадка размещения: {platform}
Целевая аудитория: {target_audience}

Создай рекламные креативы:
"""

    def _get_social_post_prompt(self) -> str:
        """Промпт для соцсетей"""
        return """
Ты — SMM-специалист с экспертизой в создании вирусного контента.

Создай пост для социальных сетей:

ПЛОЩАДКИ:
- ВКонтакте
- Telegram канал
- Одноклассники
- Дзен

ТИПЫ ПОСТОВ:
1. Информационный
2. Развлекательный
3. Продающий
4. Экспертный
5. Вовлекающий

СТРУКТУРА:
- Цепляющее начало
- Полезный контент
- Призыв к действию
- Хештеги

ПРИЕМЫ:
- Эмоциональность
- Сторителлинг
- Интерактивность
- Персонализация

Тема поста: {topic}
Тип поста: {post_type}
Целевая аудитория: {target_audience}

Создай вирусный пост:
"""

    def _get_email_marketing_prompt(self) -> str:
        """Промпт для email-рассылки"""
        return """
Ты — эксперт по email-маркетингу с высоким процентом открываемости писем.

Создай email-письмо для рассылки:

ТИПЫ ПИСЕМ:
1. Приветственное
2. Продающее
3. Информационное
4. Реактивационное
5. Напоминание о корзине

СТРУКТУРА:
- Тема письма (привлекающая внимание)
- Превью текст
- Заголовок
- Основной контент
- Призыв к действию
- PS (постскриптум)

ПРИНЦИПЫ:
- Персонализация
- Четкая структура
- Мобильная адаптивность
- A/B тестирование элементов

Цель письма: {goal}
Тип письма: {email_type}
Целевая аудитория: {target_audience}

Создай email-письмо:
"""

    def _get_landing_page_prompt(self) -> str:
        """Промпт для лендинга"""
        return """
Ты — специалист по созданию высококонверсионных лендинг-страниц.

Создай структуру и тексты для лендинга:

БЛОКИ ЛЕНДИНГА:
1. Заголовок + подзаголовок
2. Главная выгода
3. Проблема
4. Решение
5. Преимущества
6. Как это работает
7. Социальные доказательства
8. Возражения и ответы
9. Призыв к действию
10. Контакты

ПРИНЦИПЫ:
- Одна цель — одно действие
- Убрать когнитивную нагрузку
- Использовать social proof
- Четкие CTA кнопки

ПСИХОЛОГИЧЕСКИЕ ТРИГГЕРЫ:
- Дефицит
- Авторитет
- Социальное доказательство
- Взаимность

Товар/услуга: {product_info}
Целевая аудитория: {target_audience}
Цель лендинга: {goal}

Создай структуру лендинга:
"""

    def _get_seo_content_prompt(self) -> str:
        """Промпт для SEO-контента"""
        return """
Ты — SEO-специалист и контент-маркетолог.

Создай SEO-оптимизированный контент:

ТИПЫ КОНТЕНТА:
1. Информационная статья
2. Коммерческая статья
3. Описание категории
4. FAQ
5. Гайд/инструкция

SEO-ТРЕБОВАНИЯ:
- Плотность ключевых слов 2-4%
- LSI-слова (семантически близкие)
- Структура H1-H6
- Метатеги (title, description)
- Внутренняя перелинковка

СТРУКТУРА:
- Title (до 60 символов)
- Description (до 160 символов)
- H1 заголовок
- Введение
- Основная часть с подзаголовками
- Заключение
- FAQ

Ключевые слова: {keywords}
Тема статьи: {topic}
Целевая аудитория: {target_audience}

Создай SEO-контент:
"""

    async def generate_content(self, content_type: str, **kwargs) -> Dict[str, str]:
        """
        Генерация контента с использованием GPT
        
        Args:
            content_type (str): Тип контента (product_description, sales_text, etc.)
            **kwargs: Дополнительные параметры для промпта
            
        Returns:
            Dict[str, str]: Сгенерированный контент
        """
        try:
            if content_type not in self.prompts:
                raise ValueError(f"Неподдерживаемый тип контента: {content_type}")
            
            # Подготавливаем промпт
            prompt = self.prompts[content_type]
            
            # Заменяем плейсхолдеры на реальные значения
            for key, value in kwargs.items():
                placeholder = f"{{{key}}}"
                prompt = prompt.replace(placeholder, str(value))
            
            # Отправляем запрос к OpenAI
            response = await self._call_openai(prompt)
            
            # Парсим ответ
            result = self._parse_response(response, content_type)
            
            return result
            
        except Exception as e:
            logger.error(f"Ошибка при генерации контента: {str(e)}")
            return {"error": str(e)}

    async def _call_openai(self, prompt: str, model: str = "gpt-3.5-turbo") -> str:
        """
        Асинхронный вызов OpenAI API
        
        Args:
            prompt (str): Промпт для генерации
            model (str): Модель GPT
            
        Returns:
            str: Ответ от API
        """
        try:
            response = await asyncio.to_thread(
                openai.ChatCompletion.create,
                model=model,
                messages=[
                    {"role": "system", "content": "Ты — профессиональный копирайтер и маркетолог с опытом работы в e-commerce. Создаваешь только качественный, продающий контент на русском языке."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=2000,
                temperature=0.7,
                top_p=1.0,
                frequency_penalty=0.0,
                presence_penalty=0.0
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            logger.error(f"Ошибка при обращении к OpenAI API: {str(e)}")
            raise

    def _parse_response(self, response: str, content_type: str) -> Dict[str, str]:
        """
        Парсинг ответа от GPT в структурированный формат
        
        Args:
            response (str): Ответ от GPT
            content_type (str): Тип контента
            
        Returns:
            Dict[str, str]: Структурированный результат
        """
        result = {"content": response}
        
        # Для разных типов контента извлекаем специфичные части
        if content_type == "product_description":
            result.update(self._parse_product_description(response))
        elif content_type == "product_card":
            result.update(self._parse_product_card(response))
        elif content_type == "sales_text":
            result.update(self._parse_sales_text(response))
        elif content_type == "ad_copy":
            result.update(self._parse_ad_copy(response))
        
        return result

    def _parse_product_description(self, response: str) -> Dict[str, str]:
        """Парсинг описания товара"""
        parts = {}
        
        # Извлекаем заголовок
        title_match = re.search(r'(?:ЗАГОЛОВОК|Заголовок)[:\s]*([^\n]+)', response, re.IGNORECASE)
        if title_match:
            parts['title'] = title_match.group(1).strip()
        
        # Извлекаем характеристики
        chars_match = re.search(r'(?:ХАРАКТЕРИСТИКИ|Характеристики)[:\s]*([^А-Я]+?)(?:[А-Я]|$)', response, re.IGNORECASE | re.DOTALL)
        if chars_match:
            parts['characteristics'] = chars_match.group(1).strip()
        
        return parts

    def _parse_product_card(self, response: str) -> Dict[str, str]:
        """Парсинг карточки товара"""
        parts = {}
        
        # Извлекаем название
        name_match = re.search(r'(?:НАЗВАНИЕ|Название)[:\s]*([^\n]+)', response, re.IGNORECASE)
        if name_match:
            parts['name'] = name_match.group(1).strip()
        
        # Извлекаем описание
        desc_match = re.search(r'(?:ОПИСАНИЕ|Описание)[:\s]*([^А-Я]+?)(?:[А-Я]|$)', response, re.IGNORECASE | re.DOTALL)
        if desc_match:
            parts['description'] = desc_match.group(1).strip()
        
        return parts

    def _parse_sales_text(self, response: str) -> Dict[str, str]:
        """Парсинг продажного текста"""
        parts = {}
        
        # Извлекаем заголовок
        headline_match = re.search(r'(?:ЗАГОЛОВОК|Заголовок)[:\s]*([^\n]+)', response, re.IGNORECASE)
        if headline_match:
            parts['headline'] = headline_match.group(1).strip()
        
        return parts

    def _parse_ad_copy(self, response: str) -> Dict[str, str]:
        """Парсинг рекламного текста"""
        parts = {}
        
        # Извлекаем короткие объявления
        short_ads = re.findall(r'(?:КОРОТКОЕ|Короткое)[:\s]*([^\n]+)', response, re.IGNORECASE)
        if short_ads:
            parts['short_ads'] = short_ads
        
        return parts

    def get_content_types(self) -> List[Dict[str, str]]:
        """
        Получить список доступных типов контента
        
        Returns:
            List[Dict[str, str]]: Список типов с описаниями
        """
        return [
            {"id": "product_description", "name": "📝 Описание товара", "description": "Продающее описание для карточки товара"},
            {"id": "product_card", "name": "🛒 Карточка товара", "description": "Полная карточка с названием и характеристиками"},
            {"id": "sales_text", "name": "💰 Продажный текст", "description": "Текст для прямых продаж по формуле AIDA"},
            {"id": "ad_copy", "name": "📺 Рекламный текст", "description": "Креативы для рекламных кампаний"},
            {"id": "social_post", "name": "📱 Пост для соцсетей", "description": "Контент для социальных сетей"},
            {"id": "email_marketing", "name": "📧 Email-письмо", "description": "Письма для email-рассылок"},
            {"id": "landing_page", "name": "🎯 Лендинг-страница", "description": "Тексты для посадочных страниц"},
            {"id": "seo_content", "name": "🔍 SEO-контент", "description": "Оптимизированные для поиска тексты"}
        ]

    async def analyze_competitors(self, product_name: str, count: int = 5) -> Dict[str, List[str]]:
        """
        Анализ конкурентов для вдохновения
        
        Args:
            product_name (str): Название товара
            count (int): Количество примеров
            
        Returns:
            Dict[str, List[str]]: Анализ конкурентов
        """
        prompt = f"""
Ты — аналитик e-commerce. Проанализируй топ-{count} продающих подходов для товара "{product_name}".

Предоставь:
1. Ключевые слова, которые используют конкуренты
2. Популярные продажные фразы
3. Основные выгоды, которые выделяют
4. Эмоциональные триггеры
5. Уникальные торговые предложения

Формат ответа: структурированный список по каждому пункту.
"""
        
        try:
            response = await self._call_openai(prompt)
            
            # Парсим ответ в структурированный формат
            result = {
                "keywords": [],
                "sales_phrases": [],
                "benefits": [],
                "emotional_triggers": [],
                "unique_propositions": []
            }
            
            # Простой парсинг по числовым спискам
            lines = response.split('\n')
            current_section = None
            
            for line in lines:
                line = line.strip()
                if 'ключев' in line.lower():
                    current_section = 'keywords'
                elif 'фраз' in line.lower():
                    current_section = 'sales_phrases'
                elif 'выгод' in line.lower():
                    current_section = 'benefits'
                elif 'триггер' in line.lower():
                    current_section = 'emotional_triggers'
                elif 'предложен' in line.lower():
                    current_section = 'unique_propositions'
                elif line.startswith(('•', '-', '*')) and current_section:
                    clean_line = re.sub(r'^[•\-*]\s*', '', line)
                    if clean_line:
                        result[current_section].append(clean_line)
            
            return result
            
        except Exception as e:
            logger.error(f"Ошибка при анализе конкурентов: {str(e)}")
            return {"error": str(e)}

    async def optimize_for_wb(self, content: str, keywords: List[str]) -> Dict[str, str]:
        """
        Оптимизация контента для Wildberries
        
        Args:
            content (str): Исходный контент
            keywords (List[str]): Ключевые слова
            
        Returns:
            Dict[str, str]: Оптимизированный контент
        """
        keywords_str = ", ".join(keywords)
        
        prompt = f"""
Ты — SEO-специалист по Wildberries. Оптимизируй текст для лучшего ранжирования.

ИСХОДНЫЙ ТЕКСТ:
{content}

КЛЮЧЕВЫЕ СЛОВА:
{keywords_str}

ЗАДАЧИ:
1. Естественно внедри ключевые слова
2. Улучши читаемость
3. Добавь релевантные термины
4. Структурируй текст
5. Сделай более продающим

ТРЕБОВАНИЯ WB:
- Длина названия: 60-90 символов
- Описание: до 5000 символов
- Ключевые слова в начале
- Без переспама

Предоставь оптимизированную версию:
"""
        
        try:
            response = await self._call_openai(prompt)
            
            return {
                "optimized_content": response,
                "keywords_used": keywords,
                "optimization_tips": "Контент оптимизирован для WB поиска"
            }
            
        except Exception as e:
            logger.error(f"Ошибка при оптимизации для WB: {str(e)}")
            return {"error": str(e)} 