import wb_api, asyncio
from datetime import datetime, timedelta
from typing import Dict, Any

async def format_product_analysis(product_data: Dict[str, Any], article: str) -> Dict[str, Any]:
    mp = await wb_api.get_mpstats_product_data(article)
    if mp.get('daily_sales',0)==0:
        try:
            from product_mpstat import get_product_mpstat_info
            mp_alt = await get_product_mpstat_info(article)
            if isinstance(mp_alt, dict) and mp_alt.get('daily_sales',0):
                mp = {
                    'daily_sales': mp_alt['daily_sales'],
                    'daily_revenue': mp_alt['daily_revenue'],
                    'daily_profit': mp_alt['daily_profit'],
                    'total_sales': mp_alt['monthly_sales'],
                    'total_revenue': mp_alt['monthly_revenue'],
                    'raw_data': []
                }
        except Exception as _e:
            pass
    raw = mp.get('raw_data', [])
    price = product_data.get('price', {}).get('current', 0)
    if raw:
        data = raw[-30:]
        dates = [d.get('date') for d in data]
        orders = [d.get('sales', 0) for d in data]
        revenue = [d.get('revenue', d.get('sales', 0)*price) for d in data]
    else:
        today = datetime.utcnow().date()
        dates = [(today - timedelta(days=i)).isoformat() for i in range(29,-1,-1)]
        orders = revenue = [0]*30
    ds = mp.get('daily_sales') or (orders[-1] if orders else 0)
    dr = mp.get('daily_revenue') or (revenue[-1] if revenue else 0)
    dp = mp.get('daily_profit') or int(dr*0.25)
    product_data['sales'] = {'today': ds,'total': mp.get('total_sales', ds*30),'revenue':{'daily':dr,'weekly':dr*7,'monthly':dr*30,'total':mp.get('total_revenue', dr*365)},'profit':{'daily':dp,'weekly':dp*7,'monthly':dp*30}}
    stock = product_data.get('stocks', {}).get('total', 0)
    chart = {'dates':dates,'revenue':revenue,'orders':orders,'stock':[stock]*30,'search_frequency':[0]*30,'ads_impressions':[0]*30}
    brand = product_data.get('brand',''); subject = product_data.get('subject_name','')
    comp = await wb_api.generate_real_competitor_data(brand, subject) or []
    cat = await wb_api.get_brand_categories(brand) or []
    top = await wb_api.get_brand_top_items(brand) or []
    return {**product_data,'analytics':{'turnover_days':round(stock/ds,1) if ds else None},'chart_data':{**chart,'brand_competitors':comp,'brand_categories':cat,'brand_top_items':top},'competition':{'competitor_count':len(comp)},'mpstats_data':mp}

wb_api.format_product_analysis = format_product_analysis 