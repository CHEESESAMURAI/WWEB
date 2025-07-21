"""
🧪 Простой тест исправленного MPStats API
Без зависимостей - только стандартные библиотеки Python
"""

import asyncio
import logging
from datetime import datetime

# Настройка логирования
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

async def test_fixed_mpstats():
    """Тестирует исправленный MPStats API"""
    logger.info("🧪 Starting MPStats API test...")
    
    test_results = {}
    
    try:
        # Тестируем исправленную функцию получения данных товара
        logger.info("📦 Testing product data...")
        
        from wb_api_fixed import get_mpstats_product_data_fixed
        
        test_article = "446467818"
        data = await get_mpstats_product_data_fixed(test_article)
        
        if data and isinstance(data, dict):
            logger.info(f"✅ Product test PASSED for {test_article}")
            logger.info(f"   Daily sales: {data.get('daily_sales', 0)}")
            logger.info(f"   Daily revenue: {data.get('daily_revenue', 0):.2f}")
            logger.info(f"   Has raw data: {bool(data.get('raw_data'))}")
            logger.info(f"   Purchase rate: {data.get('purchase_rate', 0):.1f}%")
            
            test_results['product'] = {
                'status': 'PASSED',
                'daily_sales': data.get('daily_sales', 0),
                'daily_revenue': data.get('daily_revenue', 0),
                'has_data': bool(data.get('raw_data'))
            }
        else:
            logger.error("❌ Product test FAILED - No data received")
            test_results['product'] = {'status': 'FAILED', 'reason': 'no_data'}
            
    except Exception as e:
        logger.error(f"❌ Product test FAILED with error: {e}")
        test_results['product'] = {'status': 'FAILED', 'reason': str(e)}
    
    try:
        # Тестируем комплексную функцию
        logger.info("🔧 Testing comprehensive product info...")
        
        from wb_api_fixed import get_wb_product_info_fixed
        
        data = await get_wb_product_info_fixed(test_article)
        
        if data and isinstance(data, dict):
            logger.info(f"✅ Comprehensive test PASSED for {test_article}")
            logger.info(f"   Name: {data.get('name', 'N/A')}")
            logger.info(f"   Price: {data.get('price', {}).get('current', 0):.2f}₽")
            logger.info(f"   Sales today: {data.get('sales', {}).get('today', 0)}")
            
            test_results['comprehensive'] = {
                'status': 'PASSED',
                'name': data.get('name', ''),
                'price': data.get('price', {}).get('current', 0),
                'sales_today': data.get('sales', {}).get('today', 0)
            }
        else:
            logger.error("❌ Comprehensive test FAILED - No data received")
            test_results['comprehensive'] = {'status': 'FAILED', 'reason': 'no_data'}
            
    except Exception as e:
        logger.error(f"❌ Comprehensive test FAILED with error: {e}")
        test_results['comprehensive'] = {'status': 'FAILED', 'reason': str(e)}
    
    try:
        # Тестируем брендовые данные
        logger.info("🏢 Testing brand data...")
        
        from wb_api_fixed import get_brand_info_mpstats_fixed
        
        test_brand = "Nike"
        data = await get_brand_info_mpstats_fixed(test_brand)
        
        if data and isinstance(data, dict):
            logger.info(f"✅ Brand test PASSED for {test_brand}")
            logger.info(f"   Total items: {data.get('total_items', 0)}")
            
            test_results['brand'] = {
                'status': 'PASSED',
                'total_items': data.get('total_items', 0)
            }
        else:
            logger.warning("⚠️ Brand test - No data (expected for some brands)")
            test_results['brand'] = {'status': 'NO_DATA', 'reason': 'brand_not_found'}
            
    except Exception as e:
        logger.error(f"❌ Brand test FAILED with error: {e}")
        test_results['brand'] = {'status': 'FAILED', 'reason': str(e)}
    
    # Генерируем отчет
    logger.info("📋 Test Report:")
    logger.info("=" * 50)
    
    total_tests = len(test_results)
    passed_tests = sum(1 for result in test_results.values() if result.get('status') == 'PASSED')
    failed_tests = sum(1 for result in test_results.values() if result.get('status') == 'FAILED')
    
    logger.info(f"Total tests: {total_tests}")
    logger.info(f"Passed: {passed_tests}")
    logger.info(f"Failed: {failed_tests}")
    logger.info(f"Success rate: {(passed_tests/total_tests*100):.1f}%")
    
    for test_name, result in test_results.items():
        status = result.get('status', 'UNKNOWN')
        emoji = "✅" if status == "PASSED" else "❌" if status == "FAILED" else "⚠️"
        logger.info(f"{emoji} {test_name.upper()}: {status}")
    
    logger.info("=" * 50)
    
    if failed_tests == 0:
        logger.info("🎉 ALL TESTS PASSED! MPStats API integration is working correctly.")
        return True
    else:
        logger.error(f"😞 {failed_tests} test(s) failed. Check the errors above.")
        return False

async def test_api_structure():
    """Тестирует структуру API без реальных запросов"""
    logger.info("🔧 Testing API structure...")
    
    try:
        from mpstats_api_fixed import MPStatsAPI
        
        # Создаем экземпляр API
        api = MPStatsAPI()
        
        # Проверяем заголовки
        headers = api._get_headers()
        
        required_headers = ["X-Mpstats-TOKEN", "Content-Type", "Accept", "User-Agent"]
        
        for header in required_headers:
            if header not in headers:
                logger.error(f"❌ Missing header: {header}")
                return False
        
        # Проверяем токен
        token = headers["X-Mpstats-TOKEN"]
        if len(token) < 20:
            logger.error("❌ API token seems invalid")
            return False
        
        logger.info("✅ API structure test PASSED")
        logger.info(f"   Token length: {len(token)} chars")
        logger.info(f"   Content-Type: {headers['Content-Type']}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ API structure test FAILED: {e}")
        return False

async def main():
    """Главная функция для запуска всех тестов"""
    logger.info("🚀 Starting MPStats API Fixed Tests")
    logger.info(f"Timestamp: {datetime.now().isoformat()}")
    logger.info("-" * 60)
    
    # Тест структуры API
    structure_ok = await test_api_structure()
    
    # Основные тесты
    api_ok = await test_fixed_mpstats()
    
    logger.info("-" * 60)
    
    if structure_ok and api_ok:
        logger.info("🎉 ALL TESTS COMPLETED SUCCESSFULLY!")
        logger.info("✅ MPStats API integration is fully functional")
        return True
    else:
        logger.error("❌ Some tests failed. Check the logs above.")
        return False

if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1) 