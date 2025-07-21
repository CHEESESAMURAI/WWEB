#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Обработчики для функции "Оракул запросов"
Этот код должен быть добавлен в файл new_bot.py
"""

import logging
from aiogram import types
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.enums import ParseMode

logger = logging.getLogger(__name__)

# Добавить эти состояния в класс UserStates:
"""
waiting_for_oracle_queries = State()  # Состояние для ожидания параметров Оракула
waiting_for_oracle_category = State()  # Состояние для выбора категории анализа
"""

# Добавить стоимость в COSTS:
"""
'oracle_queries': 50  # Добавляем стоимость Оракула запросов
"""

# Обработчики для добавления в new_bot.py:

def add_oracle_handlers(dp, get_user_balance, update_user_balance, COSTS):
    """Функция для регистрации обработчиков Оракула"""
    
    try:
        from oracle_queries import OracleQueries, format_oracle_results
        oracle = OracleQueries()
    except ImportError:
        logger.error("Модуль oracle_queries не найден!")
        return

    @dp.callback_query(lambda c: c.data == "oracle_queries")
    async def handle_oracle_queries(callback_query: types.CallbackQuery, state: FSMContext):
        """Обработчик кнопки Оракула запросов"""
        try:
            user_id = callback_query.from_user.id
            
            # Проверяем баланс
            user_balance = get_user_balance(user_id)
            cost = COSTS.get('oracle_queries', 50)
            
            if user_balance < cost:
                await callback_query.message.edit_text(
                    f"💰 Недостаточно средств для анализа!\n\n"
                    f"Стоимость: {cost}₽\n"
                    f"Ваш баланс: {user_balance}₽\n"
                    f"Нужно: {cost - user_balance}₽",
                    reply_markup=back_keyboard()
                )
                return

            # Создаем клавиатуру с параметрами
            keyboard = InlineKeyboardMarkup(inline_keyboard=[
                [
                    InlineKeyboardButton(text="🔍 Анализ запросов", callback_data="oracle_main_analysis"),
                    InlineKeyboardButton(text="📊 По категориям", callback_data="oracle_category_analysis")
                ],
                [InlineKeyboardButton(text="◀️ Назад", callback_data="back_to_main")]
            ])
            
            oracle_text = (
                "🔮 *Оракул запросов*\n\n"
                "Выберите тип анализа:\n\n"
                "🔍 *Анализ запросов* - детальный анализ поисковых запросов с:\n"
                "• Частотностью и динамикой\n"
                "• Выручкой топ товаров\n"
                "• Монопольностью ниши\n"
                "• Процентом рекламы\n\n"
                "📊 *По категориям* - анализ товаров, брендов, поставщиков\n\n"
                f"💰 *Стоимость:* {cost}₽"
            )
            
            await callback_query.message.edit_text(
                oracle_text,
                parse_mode=ParseMode.MARKDOWN,
                reply_markup=keyboard
            )
            
        except Exception as e:
            logger.error(f"Ошибка в handle_oracle_queries: {e}")
            await callback_query.message.edit_text(
                "❌ Ошибка при инициализации Оракула. Попробуйте позже.",
                reply_markup=back_keyboard()
            )

    @dp.callback_query(lambda c: c.data == "oracle_main_analysis")
    async def handle_oracle_main_analysis(callback_query: types.CallbackQuery, state: FSMContext):
        """Обработчик основного анализа Оракула"""
        try:
            from new_bot import UserStates
            await state.set_state(UserStates.waiting_for_oracle_queries)
            
            oracle_text = (
                "🔮 *Оракул запросов - Основной анализ*\n\n"
                "Укажите параметры для анализа в формате:\n"
                "`количество_запросов | месяц | мин_выручка | мин_частотность`\n\n"
                "*Примеры:*\n"
                "• `3 | 2024-01 | 100000 | 1000`\n"
                "• `5 | 2024-02 | 50000 | 500`\n\n"
                "*Параметры:*\n"
                "• Количество запросов: 1-5\n"
                "• Месяц: YYYY-MM (например, 2024-01)\n"
                "• Минимальная выручка за 30 дней (₽)\n"
                "• Минимальная частотность за 30 дней\n\n"
                "📝 Отправьте параметры:"
            )
            
            await callback_query.message.edit_text(
                oracle_text,
                parse_mode=ParseMode.MARKDOWN,
                reply_markup=back_keyboard()
            )
            
        except Exception as e:
            logger.error(f"Ошибка в handle_oracle_main_analysis: {e}")
            await callback_query.message.edit_text(
                "❌ Ошибка. Попробуйте позже.",
                reply_markup=back_keyboard()
            )

    @dp.callback_query(lambda c: c.data == "oracle_category_analysis")
    async def handle_oracle_category_analysis(callback_query: types.CallbackQuery, state: FSMContext):
        """Обработчик анализа по категориям"""
        try:
            from new_bot import UserStates
            await state.set_state(UserStates.waiting_for_oracle_category)
            
            keyboard = InlineKeyboardMarkup(inline_keyboard=[
                [
                    InlineKeyboardButton(text="📦 По товарам", callback_data="oracle_cat_products"),
                    InlineKeyboardButton(text="🏢 По брендам", callback_data="oracle_cat_brands")
                ],
                [
                    InlineKeyboardButton(text="🏭 По поставщикам", callback_data="oracle_cat_suppliers"),
                    InlineKeyboardButton(text="📂 По категориям", callback_data="oracle_cat_categories")
                ],
                [
                    InlineKeyboardButton(text="🔍 По запросам", callback_data="oracle_cat_queries")
                ],
                [InlineKeyboardButton(text="◀️ Назад", callback_data="oracle_queries")]
            ])
            
            oracle_text = (
                "🔮 *Оракул запросов - Анализ по категориям*\n\n"
                "Выберите тип анализа:\n\n"
                "📦 *По товарам* - топ товары по запросу\n"
                "🏢 *По брендам* - анализ брендов\n"
                "🏭 *По поставщикам* - анализ поставщиков\n"
                "📂 *По категориям* - анализ категорий\n"
                "🔍 *По запросам* - связанные запросы"
            )
            
            await callback_query.message.edit_text(
                oracle_text,
                parse_mode=ParseMode.MARKDOWN,
                reply_markup=keyboard
            )
            
        except Exception as e:
            logger.error(f"Ошибка в handle_oracle_category_analysis: {e}")

    @dp.callback_query(lambda c: c.data.startswith("oracle_cat_"))
    async def handle_oracle_category_type(callback_query: types.CallbackQuery, state: FSMContext):
        """Обработчик выбора типа категории"""
        try:
            category_type = callback_query.data.replace("oracle_cat_", "")
            await state.update_data(oracle_category_type=category_type)
            
            type_names = {
                "products": "товарам",
                "brands": "брендам",
                "suppliers": "поставщикам", 
                "categories": "категориям",
                "queries": "запросам"
            }
            
            type_name = type_names.get(category_type, category_type)
            
            oracle_text = (
                f"🔮 *Оракул по {type_name}*\n\n"
                "Укажите параметры в формате:\n"
                "`запрос/категория | месяц`\n\n"
                "*Примеры:*\n"
                "• `телефон | 2024-01`\n"
                "• `косметика | 2024-02`\n"
                "• `Электроника/Смартфоны и гаджеты | 2024-01`\n\n"
                "📝 Отправьте параметры:"
            )
            
            await callback_query.message.edit_text(
                oracle_text,
                parse_mode=ParseMode.MARKDOWN,
                reply_markup=back_keyboard()
            )
            
        except Exception as e:
            logger.error(f"Ошибка в handle_oracle_category_type: {e}")

    def back_keyboard():
        """Клавиатура 'Назад'"""
        keyboard = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="◀️ Назад", callback_data="back_to_main")]
        ])
        return keyboard

    @dp.message(lambda message: message.text and message.text.strip(), UserStates.waiting_for_oracle_queries)
    async def handle_oracle_queries_input(message: types.Message, state: FSMContext):
        """Обработчик ввода параметров для основного анализа Оракула"""
        try:
            user_id = message.from_user.id
            user_input = message.text.strip()
            
            # Парсим входные данные
            parts = [p.strip() for p in user_input.split('|')]
            
            if len(parts) != 4:
                await message.reply(
                    "❌ Неверный формат! Используйте:\n"
                    "`количество | месяц | мин_выручка | мин_частотность`\n\n"
                    "Пример: `3 | 2024-01 | 100000 | 1000`"
                )
                return
            
            try:
                queries_count = int(parts[0])
                month = parts[1]
                min_revenue = int(parts[2])
                min_frequency = int(parts[3])
                
                # Валидация
                if not (1 <= queries_count <= 5):
                    raise ValueError("Количество запросов должно быть от 1 до 5")
                    
            except ValueError as e:
                await message.reply(f"❌ Ошибка в параметрах: {e}")
                return
            
            # Проверяем и списываем средства
            user_balance = get_user_balance(user_id)
            cost = COSTS.get('oracle_queries', 50)
            
            if user_balance < cost:
                await message.reply(
                    f"💰 Недостаточно средств!\n"
                    f"Нужно: {cost}₽, у вас: {user_balance}₽"
                )
                return
            
            # Списываем средства
            update_user_balance(user_id, -cost)
            await state.clear()
            
            # Отправляем уведомление о начале анализа
            loading_msg = await message.reply(
                "🔮 *Оракул приступает к анализу...*\n\n"
                f"📊 Запросов: {queries_count}\n"
                f"📅 Месяц: {month}\n"
                f"💰 Мин. выручка: {min_revenue:,}₽\n"
                f"🔍 Мин. частотность: {min_frequency:,}\n\n"
                "⏳ Это может занять 1-2 минуты...",
                parse_mode=ParseMode.MARKDOWN
            )
            
            # Выполняем анализ
            oracle_data = await oracle.get_search_queries_data(
                queries_count, month, min_revenue, min_frequency
            )
            
            # Форматируем и отправляем результат
            result_text = format_oracle_results(oracle_data)
            
            # Удаляем сообщение загрузки
            await loading_msg.delete()
            
            # Отправляем результат
            await message.reply(
                result_text,
                parse_mode=ParseMode.MARKDOWN,
                reply_markup=back_keyboard()
            )
            
            # Логируем использование
            logger.info(f"Oracle analysis completed for user {user_id}, cost: {cost}₽")
            
        except Exception as e:
            logger.error(f"Ошибка в oracle queries input: {e}")
            await state.clear()
            await message.reply(
                "❌ Ошибка при анализе. Попробуйте позже.\n"
                "Средства возвращены на баланс.",
                reply_markup=back_keyboard()
            )
            # Возвращаем средства при ошибке
            update_user_balance(user_id, COSTS.get('oracle_queries', 50))

    @dp.message(lambda message: message.text and message.text.strip(), UserStates.waiting_for_oracle_category)
    async def handle_oracle_category_input(message: types.Message, state: FSMContext):
        """Обработчик ввода параметров для анализа по категориям"""
        try:
            user_id = message.from_user.id
            user_input = message.text.strip()
            
            # Получаем тип анализа из состояния
            data = await state.get_data()
            category_type = data.get('oracle_category_type', 'products')
            
            # Парсим входные данные
            parts = [p.strip() for p in user_input.split('|')]
            
            if len(parts) != 2:
                await message.reply(
                    "❌ Неверный формат! Используйте:\n"
                    "`запрос/категория | месяц`\n\n"
                    "Пример: `телефон | 2024-01`"
                )
                return
            
            query_category = parts[0]
            month = parts[1]
            
            # Проверяем и списываем средства
            user_balance = get_user_balance(user_id)
            cost = COSTS.get('oracle_queries', 50)
            
            if user_balance < cost:
                await message.reply(f"💰 Недостаточно средств! Нужно: {cost}₽")
                return
            
            # Списываем средства
            update_user_balance(user_id, -cost)
            await state.clear()
            
            # Отправляем уведомление о начале анализа
            loading_msg = await message.reply(
                f"🔮 *Анализ по {category_type}...*\n\n"
                f"🔍 Запрос: {query_category}\n"
                f"📅 Месяц: {month}\n\n"
                "⏳ Анализирую данные...",
                parse_mode=ParseMode.MARKDOWN
            )
            
            # Выполняем анализ
            oracle_data = await oracle.get_oracle_by_category(
                query_category, month, category_type
            )
            
            # Форматируем и отправляем результат
            result_text = format_oracle_results(oracle_data)
            
            # Удаляем сообщение загрузки
            await loading_msg.delete()
            
            # Отправляем результат
            await message.reply(
                result_text,
                parse_mode=ParseMode.MARKDOWN,
                reply_markup=back_keyboard()
            )
            
            # Логируем использование
            logger.info(f"Oracle category analysis completed for user {user_id}, type: {category_type}")
            
        except Exception as e:
            logger.error(f"Ошибка в oracle category input: {e}")
            await state.clear()
            await message.reply(
                "❌ Ошибка при анализе. Средства возвращены.",
                reply_markup=back_keyboard()
            )
            # Возвращаем средства при ошибке
            update_user_balance(user_id, COSTS.get('oracle_queries', 50))

if __name__ == "__main__":
    print("Обработчики Оракула запросов готовы!")
    print("\nДля интеграции:")
    print("1. Добавить состояния в UserStates")
    print("2. Добавить стоимость в COSTS")
    print("3. Вызвать add_oracle_handlers(dp, get_user_balance, update_user_balance, COSTS)")
    print("4. Убедиться что oracle_queries.py в том же каталоге") 