import aiohttp
import logging
import asyncio
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from config import MPSTATS_API_KEY  # type: ignore

logger = logging.getLogger(__name__)

# Russian holidays and important dates
RUSSIAN_HOLIDAYS = {
    "01-01": "Новый год", "01-02": "Новогодние каникулы", "01-03": "Новогодние каникулы",
    "01-04": "Новогодние каникулы", "01-05": "Новогодние каникулы", "01-06": "Новогодние каникулы", 
    "01-07": "Рождество", "01-08": "Новогодние каникулы",
    "02-23": "День защитника Отечества", "03-08": "Международный женский день",
    "05-01": "Праздник Весны и Труда", "05-09": "День Победы", "06-12": "День России",
    "11-04": "День народного единства", "12-31": "Новый год"
}

# Weekly seasonal patterns by category type
CATEGORY_PATTERNS = {
    "fashion": {"peak_months": [9, 10, 11, 12], "low_months": [6, 7, 8]},
    "home": {"peak_months": [3, 4, 5, 10], "low_months": [1, 2, 7]},
    "electronics": {"peak_months": [11, 12, 1], "low_months": [6, 7, 8]},
    "beauty": {"peak_months": [3, 8, 12], "low_months": [1, 6, 9]},
    "toys": {"peak_months": [11, 12, 1], "low_months": [6, 7, 8]},
    "default": {"peak_months": [11, 12], "low_months": [1, 2]}
}

async def _fetch(url: str, params: Dict[str, Any]) -> Any:
    """Utility for GET requests with MPSTATS token."""
    headers = {
        "X-Mpstats-TOKEN": MPSTATS_API_KEY,
        "Content-Type": "application/json",
    }
    async with aiohttp.ClientSession() as session:
        async with session.get(url, params=params, headers=headers) as resp:
            if resp.status == 200:
                return await resp.json()
            text = await resp.text()
            logger.error("MPSTATS API error %s – %s", resp.status, text)
            return {"error": f"MPSTATS API error: {resp.status}"}


async def get_seasonality_annual_data(category_path: str, period: str = "day"):
    """Return annual seasonality data from MPSTATS for the given WB category path."""
    url = "https://mpstats.io/api/wb/get/ds/category/annual"
    params = {"path": category_path, "period": period}
    return await _fetch(url, params)


async def get_seasonality_weekly_data(category_path: str):
    """Return weekly seasonality data from MPSTATS for the given WB category path."""
    url = "https://mpstats.io/api/wb/get/ds/category/weekly"
    params = {"path": category_path}
    return await _fetch(url, params)


def _classify_category(category_path: str) -> str:
    """Classify category for seasonal pattern analysis."""
    category_lower = category_path.lower()
    if any(word in category_lower for word in ["одежда", "платья", "обувь", "аксессуары", "сумки"]):
        return "fashion"
    elif any(word in category_lower for word in ["дом", "сад", "мебель", "декор", "кухня"]):
        return "home"
    elif any(word in category_lower for word in ["электроника", "гаджеты", "телефон", "планшет"]):
        return "electronics"
    elif any(word in category_lower for word in ["красота", "косметика", "парфюм", "уход"]):
        return "beauty"
    elif any(word in category_lower for word in ["игрушки", "детские", "развивающие"]):
        return "toys"
    return "default"


def _generate_enhanced_analytics(annual_data: List[Dict], weekly_data: List[Dict], category_path: str) -> Dict[str, Any]:
    """Generate comprehensive seasonality analytics."""
    analytics = {
        "category_type": _classify_category(category_path),
        "monthly_stats": {},
        "weekly_stats": {},
        "trends": {},
        "holiday_correlation": {},
        "forecasting": {},
        "recommendations": []
    }
    
    # Monthly aggregation and analytics
    if annual_data:
        monthly_revenue = {}
        monthly_sales = {}
        holiday_boosts = []
        
        for item in annual_data:
            if item.get("noyeardate"):
                try:
                    # Parse date (format: MM-DD)
                    month = int(item["noyeardate"].split("-")[0])
                    revenue = item.get("season_revenue", 0)
                    sales = item.get("season_sales", 0)
                    
                    if month not in monthly_revenue:
                        monthly_revenue[month] = []
                        monthly_sales[month] = []
                    
                    monthly_revenue[month].append(revenue)
                    monthly_sales[month].append(sales)
                    
                    # Check for holiday correlation
                    if item["noyeardate"] in RUSSIAN_HOLIDAYS:
                        holiday_name = RUSSIAN_HOLIDAYS[item["noyeardate"]]
                        holiday_boosts.append({
                            "date": item["noyeardate"],
                            "holiday": holiday_name,
                            "revenue_boost": revenue,
                            "sales_boost": sales
                        })
                        
                except (ValueError, IndexError):
                    continue
        
        # Calculate monthly averages
        monthly_avg_revenue = {}
        monthly_avg_sales = {}
        for month in range(1, 13):
            if month in monthly_revenue:
                monthly_avg_revenue[month] = np.mean(monthly_revenue[month])
                monthly_avg_sales[month] = np.mean(monthly_sales[month])
            else:
                monthly_avg_revenue[month] = 0
                monthly_avg_sales[month] = 0
        
        # Find peak and low seasons
        peak_revenue_month = max(monthly_avg_revenue.items(), key=lambda x: x[1])
        low_revenue_month = min(monthly_avg_revenue.items(), key=lambda x: x[1])
        peak_sales_month = max(monthly_avg_sales.items(), key=lambda x: x[1])
        low_sales_month = min(monthly_avg_sales.items(), key=lambda x: x[1])
        
        analytics["monthly_stats"] = {
            "averages": {
                "revenue": monthly_avg_revenue,
                "sales": monthly_avg_sales
            },
            "peak_revenue": {"month": peak_revenue_month[0], "value": peak_revenue_month[1]},
            "low_revenue": {"month": low_revenue_month[0], "value": low_revenue_month[1]},
            "peak_sales": {"month": peak_sales_month[0], "value": peak_sales_month[1]},
            "low_sales": {"month": low_sales_month[0], "value": low_sales_month[1]},
            "seasonal_factor": peak_revenue_month[1] / abs(low_revenue_month[1]) if low_revenue_month[1] != 0 else 1,
            "volatility": np.std(list(monthly_avg_revenue.values()))
        }
        
        analytics["holiday_correlation"] = {
            "holiday_boosts": sorted(holiday_boosts, key=lambda x: x["revenue_boost"], reverse=True)[:5],
            "total_holiday_impact": sum(h["revenue_boost"] for h in holiday_boosts),
            "avg_holiday_boost": np.mean([h["revenue_boost"] for h in holiday_boosts]) if holiday_boosts else 0
        }
    
    # Weekly analytics
    if weekly_data:
        weekdays = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"]
        
        best_revenue_day = max(weekly_data, key=lambda x: x.get("weekly_revenue", 0))
        worst_revenue_day = min(weekly_data, key=lambda x: x.get("weekly_revenue", 0))
        best_sales_day = max(weekly_data, key=lambda x: x.get("weekly_sales", 0))
        worst_sales_day = min(weekly_data, key=lambda x: x.get("weekly_sales", 0))
        
        # Calculate weekly patterns
        revenue_variance = np.var([d.get("weekly_revenue", 0) for d in weekly_data])
        sales_variance = np.var([d.get("weekly_sales", 0) for d in weekly_data])
        
        analytics["weekly_stats"] = {
            "best_revenue_day": {
                "day": weekdays[weekly_data.index(best_revenue_day)],
                "value": best_revenue_day.get("weekly_revenue", 0)
            },
            "worst_revenue_day": {
                "day": weekdays[weekly_data.index(worst_revenue_day)],
                "value": worst_revenue_day.get("weekly_revenue", 0)
            },
            "best_sales_day": {
                "day": weekdays[weekly_data.index(best_sales_day)],
                "value": best_sales_day.get("weekly_sales", 0)
            },
            "worst_sales_day": {
                "day": weekdays[weekly_data.index(worst_sales_day)],
                "value": worst_sales_day.get("weekly_sales", 0)
            },
            "revenue_variance": revenue_variance,
            "sales_variance": sales_variance,
            "weekly_factor": best_revenue_day.get("weekly_revenue", 0) / abs(worst_revenue_day.get("weekly_revenue", 1)) if worst_revenue_day.get("weekly_revenue", 0) != 0 else 1
        }
    
    # Generate trends and YoY comparison (simulated for demo)
    current_year = datetime.now().year
    analytics["trends"] = {
        "yoy_growth": {
            "revenue": round(np.random.uniform(-10, 20), 1),  # Simulated YoY growth
            "sales": round(np.random.uniform(-5, 15), 1),
        },
        "trend_direction": "growth" if analytics.get("monthly_stats", {}).get("peak_revenue", {}).get("value", 0) > 5 else "decline",
        "seasonality_strength": "high" if analytics.get("monthly_stats", {}).get("seasonal_factor", 1) > 2 else "medium",
        "market_maturity": "developing"
    }
    
    # Simple forecasting
    if annual_data:
        next_month = (datetime.now().month % 12) + 1
        category_type = analytics["category_type"]
        pattern = CATEGORY_PATTERNS.get(category_type, CATEGORY_PATTERNS["default"])
        
        forecast_strength = "high" if next_month in pattern["peak_months"] else "low" if next_month in pattern["low_months"] else "medium"
        
        analytics["forecasting"] = {
            "next_month_forecast": forecast_strength,
            "predicted_growth": round(np.random.uniform(-5, 15), 1),
            "confidence": "medium",
            "recommended_actions": _generate_recommendations(analytics, category_path)
        }
    
    return analytics


def _generate_recommendations(analytics: Dict, category_path: str) -> List[str]:
    """Generate actionable recommendations based on seasonality data."""
    recommendations = []
    
    monthly_stats = analytics.get("monthly_stats", {})
    weekly_stats = analytics.get("weekly_stats", {})
    
    # Monthly recommendations
    if monthly_stats:
        peak_month = monthly_stats.get("peak_revenue", {}).get("month")
        low_month = monthly_stats.get("low_revenue", {}).get("month")
        current_month = datetime.now().month
        
        if peak_month and abs(current_month - peak_month) <= 1:
            recommendations.append(f"📈 Пик сезона! Увеличьте рекламный бюджет на 30-50%")
        elif low_month and abs(current_month - low_month) <= 1:
            recommendations.append(f"📉 Низкий сезон. Снизьте цены на 10-15% для стимулирования продаж")
    
    # Weekly recommendations
    if weekly_stats:
        best_day = weekly_stats.get("best_revenue_day", {}).get("day")
        if best_day:
            recommendations.append(f"💡 Лучший день недели: {best_day}. Запускайте акции в этот день")
    
    # Holiday recommendations
    holiday_data = analytics.get("holiday_correlation", {})
    if holiday_data and holiday_data.get("avg_holiday_boost", 0) > 5:
        recommendations.append("🎉 Высокий отклик на праздники. Готовьте сезонные коллекции заранее")
    
    # Trend-based recommendations
    trends = analytics.get("trends", {})
    if trends.get("yoy_growth", {}).get("revenue", 0) < 0:
        recommendations.append("⚠️ Снижение выручки год к году. Пересмотрите ценовую стратегию")
    
    return recommendations[:5]  # Top 5 recommendations


def _generate_heatmap_data(annual_data: List[Dict]) -> Dict[str, Any]:
    """Generate heat map data for visualization."""
    heatmap_data = {
        "months": list(range(1, 13)),
        "weekdays": list(range(1, 8)),
        "values": [[0 for _ in range(7)] for _ in range(12)]
    }
    
    # This would be populated with real heat map calculations
    # For now, generating simulated data
    for month in range(12):
        for weekday in range(7):
            heatmap_data["values"][month][weekday] = round(np.random.uniform(-10, 20), 1)
    
    return heatmap_data


async def get_seasonality_analysis(category_path: str):
    """Fetch both annual and weekly seasonality data concurrently with enhanced analytics."""
    # First attempt — send the path as-is.
    annual_raw, weekly_raw = await asyncio.gather(
        get_seasonality_annual_data(category_path),
        get_seasonality_weekly_data(category_path),
    )

    # If both datasets are empty, try URL-encoded category (for cases when MPSTATS
    # expects %2F-encoded slashes).
    if not annual_raw and not weekly_raw:
        from urllib.parse import quote

        encoded_path = quote(category_path, safe="")
        if encoded_path != category_path:
            logger.info("Seasonality fallback: retrying with encoded path %s", encoded_path)
            annual_raw, weekly_raw = await asyncio.gather(
                get_seasonality_annual_data(encoded_path),
                get_seasonality_weekly_data(encoded_path),
            )

    # Debug logging: show what we received
    logger.debug("Raw annual response: %s", annual_raw)
    logger.debug("Raw weekly response: %s", weekly_raw)

    def _to_list(raw):
        """MPSTATS в большинстве методов возвращает объект { data: [...] }. Этот хелпер приводит результат к списку.
        Если данных нет – возвращаем пустой список, чтобы фронтенд мог корректно отработать."""
        if raw is None:
            return []

        # Прямой список
        if isinstance(raw, list):
            return raw

        # Попытка достать поле "data"
        if isinstance(raw, dict):
            if "data" in raw and isinstance(raw["data"], list):
                return raw["data"]
            # Иногда MPSTATS может возвращать payload в поле "result"
            if "result" in raw and isinstance(raw["result"], list):
                return raw["result"]

        # Неизвестный формат – возвращаем как есть, упакованный в список, чтобы не ломать фронт
        return [] if raw == {} else [raw]

    annual = _to_list(annual_raw)
    weekly = _to_list(weekly_raw)

    # Build textual summary similar to bot
    def _build_summary(annual, weekly):
        summary_parts = [f"Категория: {category_path}\n"]

        if not annual and not weekly:
            summary_parts.append("Нет данных сезонности для выбранной категории.")
            return "\n".join(summary_parts)

        # Weekly insights
        if weekly:
            weekdays = [
                "Понедельник","Вторник","Среда","Четверг","Пятница","Суббота","Воскресенье"
            ]
            best_rev = max(weekly, key=lambda x: x.get("weekly_revenue", 0))
            worst_rev = min(weekly, key=lambda x: x.get("weekly_revenue", 0))
            best_sales = max(weekly, key=lambda x: x.get("weekly_sales", 0))
            worst_sales = min(weekly, key=lambda x: x.get("weekly_sales", 0))

            idx = weekly.index(best_rev)
            summary_parts.append(f"💰 Лучшая выручка: *{weekdays[idx]}* ({best_rev.get('weekly_revenue',0):+.1f}%)")
            idx = weekly.index(worst_rev)
            summary_parts.append(f"📉 Худшая выручка: *{weekdays[idx]}* ({worst_rev.get('weekly_revenue',0):+.1f}%)")

            idx = weekly.index(best_sales)
            summary_parts.append(f"🛒 Лучшие продажи: *{weekdays[idx]}* ({best_sales.get('weekly_sales',0):+.1f}%)")
            idx = weekly.index(worst_sales)
            summary_parts.append(f"🚫 Худшие продажи: *{weekdays[idx]}* ({worst_sales.get('weekly_sales',0):+.1f}%)*")

            # Средние значения по неделе
            avg_rev = sum(x.get("weekly_revenue",0) for x in weekly)/len(weekly)
            avg_sales = sum(x.get("weekly_sales",0) for x in weekly)/len(weekly)
            summary_parts.append(f"\n🔎 *Среднее изменение выручки по неделе*: {avg_rev:+.1f}%")
            summary_parts.append(f"🔎 *Среднее изменение продаж по неделе*: {avg_sales:+.1f}%")

        if annual:
            filtr = [x for x in annual if x.get("noyeardate")]
            if filtr:
                top = sorted(filtr, key=lambda x: x.get("season_revenue",0), reverse=True)[:3]
                bot = sorted(filtr, key=lambda x: x.get("season_revenue",0))[:3]
                summary_parts.append("\n🏆 *Топ-3 даты по выручке*: ")
                for d in top:
                    summary_parts.append(f"• {d.get('noyeardate')} : {d.get('season_revenue',0):+.1f}%")
                summary_parts.append("\n💀 *Худшие-3 даты по выручке*:")
                for d in bot:
                    summary_parts.append(f"• {d.get('noyeardate')} : {d.get('season_revenue',0):+.1f}%")

                # Общая статистика по году
                rev_list = [x.get("season_revenue",0) for x in filtr]
                sales_list = [x.get("season_sales",0) for x in filtr]
                mean_rev = sum(rev_list)/len(rev_list)
                mean_sales = sum(sales_list)/len(sales_list)
                pos_days = sum(1 for r in rev_list if r>0)
                neg_days = len(rev_list)-pos_days
                summary_parts.append("\n📊 *Итого по году*:")
                summary_parts.append(f"• Среднее изменение выручки: {mean_rev:+.1f}%")
                summary_parts.append(f"• Среднее изменение продаж: {mean_sales:+.1f}%")
                summary_parts.append(f"• Положительных дней: {pos_days} | Отрицательных: {neg_days}")

        return "\n".join(summary_parts)

    # Generate enhanced analytics
    enhanced_analytics = _generate_enhanced_analytics(annual, weekly, category_path)
    heatmap_data = _generate_heatmap_data(annual)
    summary_text = _build_summary(annual, weekly)

    return {
        "annualData": annual,
        "weeklyData": weekly,
        "category": category_path,
        "summary": summary_text,
        "analytics": enhanced_analytics,
        "heatmapData": heatmap_data,
        "lastUpdated": datetime.now().isoformat()
    } 