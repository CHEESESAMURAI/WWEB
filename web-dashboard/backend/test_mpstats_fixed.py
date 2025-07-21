"""
🧪 Unit тесты для исправленного MPStats API
Проверяет корректность работы исправленных endpoints
"""

import pytest
import asyncio
import logging
from datetime import datetime
from typing import Dict, Any

# Настройка логирования для тестов
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Тестовые артикулы и данные
TEST_ARTICLES = [
    "446467818",  # Артикул из скриншотов
    "275191790",  # Альтернативный артикул
    "123456789"   # Несуществующий артикул
]

TEST_BRANDS = [
    "Nike",
    "Adidas",
    "H&M",
    "Неизвестный бренд"
]

TEST_CATEGORIES = [
    "Женщинам/Одежда",
    "Мужчинам/Обувь",
    "Детям/Игрушки"
]

class TestFixedMPStatsAPI:
    """Класс для тестирования исправленного MPStats API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Настройка перед каждым тестом"""
        self.test_results = {}
        
    async def test_product_data_endpoints(self):
        """Тестирует endpoints для получения данных товаров"""
        logger.info("🧪 Testing product data endpoints...")
        
        try:
            from wb_api_fixed import get_mpstats_product_data_fixed
            
            for article in TEST_ARTICLES:
                logger.info(f"Testing article: {article}")
                
                # Тестируем получение данных
                data = await get_mpstats_product_data_fixed(article)
                
                # Проверяем структуру ответа
                assert isinstance(data, dict), f"Response should be dict for {article}"
                
                # Проверяем обязательные поля
                required_fields = [
                    'raw_data', 'daily_sales', 'daily_revenue', 'daily_profit',
                    'total_sales', 'total_revenue', 'purchase_rate', 
                    'conversion_rate', 'market_share'
                ]
                
                for field in required_fields:
                    assert field in data, f"Missing field {field} for {article}"
                
                # Проверяем типы данных
                assert isinstance(data['raw_data'], list), f"raw_data should be list for {article}"
                assert isinstance(data['daily_sales'], int), f"daily_sales should be int for {article}"
                assert isinstance(data['daily_revenue'], (int, float)), f"daily_revenue should be numeric for {article}"
                
                # Проверяем логичность значений
                assert data['daily_sales'] >= 0, f"daily_sales should be non-negative for {article}"
                assert data['daily_revenue'] >= 0, f"daily_revenue should be non-negative for {article}"
                assert 0 <= data['purchase_rate'] <= 100, f"purchase_rate should be 0-100 for {article}"
                assert 0 <= data['conversion_rate'] <= 100, f"conversion_rate should be 0-100 for {article}"
                
                self.test_results[f"product_{article}"] = {
                    "success": True,
                    "has_data": bool(data.get('raw_data')),
                    "daily_sales": data.get('daily_sales', 0),
                    "daily_revenue": data.get('daily_revenue', 0)
                }
                
                logger.info(f"✅ Product test passed for {article}: {data['daily_sales']} sales/day")
                
        except Exception as e:
            logger.error(f"❌ Product data test failed: {e}")
            pytest.fail(f"Product data test failed: {e}")
    
    async def test_brand_data_endpoints(self):
        """Тестирует endpoints для получения данных брендов"""
        logger.info("🧪 Testing brand data endpoints...")
        
        try:
            from wb_api_fixed import get_brand_info_mpstats_fixed
            
            for brand in TEST_BRANDS:
                logger.info(f"Testing brand: {brand}")
                
                # Тестируем получение данных
                data = await get_brand_info_mpstats_fixed(brand)
                
                if data:
                    # Проверяем структуру ответа
                    assert isinstance(data, dict), f"Response should be dict for {brand}"
                    
                    # Проверяем обязательные поля
                    required_fields = ['brand_name', 'total_items', 'items', 'timestamp']
                    
                    for field in required_fields:
                        assert field in data, f"Missing field {field} for {brand}"
                    
                    # Проверяем типы данных
                    assert isinstance(data['items'], list), f"items should be list for {brand}"
                    assert isinstance(data['total_items'], int), f"total_items should be int for {brand}"
                    assert data['total_items'] >= 0, f"total_items should be non-negative for {brand}"
                    
                    self.test_results[f"brand_{brand}"] = {
                        "success": True,
                        "total_items": data.get('total_items', 0)
                    }
                    
                    logger.info(f"✅ Brand test passed for {brand}: {data['total_items']} items")
                else:
                    self.test_results[f"brand_{brand}"] = {
                        "success": False,
                        "message": "No data returned"
                    }
                    logger.warning(f"⚠️ No data for brand {brand}")
                
        except Exception as e:
            logger.error(f"❌ Brand data test failed: {e}")
            pytest.fail(f"Brand data test failed: {e}")
    
    async def test_category_data_endpoints(self):
        """Тестирует endpoints для получения данных категорий"""
        logger.info("🧪 Testing category data endpoints...")
        
        try:
            from wb_api_fixed import get_category_data_mpstats_fixed
            
            for category in TEST_CATEGORIES:
                logger.info(f"Testing category: {category}")
                
                # Тестируем получение данных
                data = await get_category_data_mpstats_fixed(category)
                
                if data:
                    # Проверяем структуру ответа
                    assert isinstance(data, dict), f"Response should be dict for {category}"
                    
                    # Проверяем обязательные поля
                    required_fields = ['category_path', 'summary', 'items', 'timestamp']
                    
                    for field in required_fields:
                        assert field in data, f"Missing field {field} for {category}"
                    
                    # Проверяем типы данных
                    assert isinstance(data['items'], list), f"items should be list for {category}"
                    
                    self.test_results[f"category_{category}"] = {
                        "success": True,
                        "items_count": len(data.get('items', []))
                    }
                    
                    logger.info(f"✅ Category test passed for {category}: {len(data['items'])} items")
                else:
                    self.test_results[f"category_{category}"] = {
                        "success": False,
                        "message": "No data returned"
                    }
                    logger.warning(f"⚠️ No data for category {category}")
                
        except Exception as e:
            logger.error(f"❌ Category data test failed: {e}")
            pytest.fail(f"Category data test failed: {e}")
    
    async def test_comprehensive_product_info(self):
        """Тестирует комплексную функцию получения информации о товаре"""
        logger.info("🧪 Testing comprehensive product info...")
        
        try:
            from wb_api_fixed import get_wb_product_info_fixed
            
            test_article = TEST_ARTICLES[0]  # Первый тестовый артикул
            
            # Тестируем получение данных
            data = await get_wb_product_info_fixed(test_article)
            
            # Проверяем структуру ответа
            assert isinstance(data, dict), "Response should be dict"
            
            # Проверяем обязательные поля
            required_fields = [
                'name', 'brand', 'article', 'price', 'rating', 
                'feedbacks', 'stocks', 'sales'
            ]
            
            for field in required_fields:
                assert field in data, f"Missing field {field}"
            
            # Проверяем структуру price
            price = data['price']
            assert 'current' in price, "Missing current price"
            assert 'original' in price, "Missing original price"
            assert 'discount' in price, "Missing discount"
            
            # Проверяем структуру sales
            sales = data['sales']
            assert 'today' in sales, "Missing today sales"
            assert 'total' in sales, "Missing total sales"
            assert 'revenue' in sales, "Missing revenue data"
            assert 'profit' in sales, "Missing profit data"
            
            # Проверяем типы данных
            assert isinstance(data['price']['current'], (int, float)), "Price should be numeric"
            assert isinstance(data['sales']['today'], int), "Today sales should be int"
            assert isinstance(data['rating'], (int, float)), "Rating should be numeric"
            
            self.test_results['comprehensive_product'] = {
                "success": True,
                "has_price": bool(data['price']['current']),
                "has_sales": bool(data['sales']['today']),
                "has_stocks": bool(data['stocks']['total'])
            }
            
            logger.info(f"✅ Comprehensive product test passed for {test_article}")
            
        except Exception as e:
            logger.error(f"❌ Comprehensive product test failed: {e}")
            pytest.fail(f"Comprehensive product test failed: {e}")
    
    async def test_error_handling(self):
        """Тестирует обработку ошибок"""
        logger.info("🧪 Testing error handling...")
        
        try:
            from wb_api_fixed import get_mpstats_product_data_fixed
            
            # Тестируем с некорректным артикулом
            invalid_articles = ["", "invalid", "0", "999999999999"]
            
            for article in invalid_articles:
                data = await get_mpstats_product_data_fixed(article)
                
                # Функция должна вернуть словарь с нулевыми значениями, а не None
                assert isinstance(data, dict), f"Should return dict for invalid article {article}"
                assert 'daily_sales' in data, f"Should have daily_sales field for {article}"
                
            logger.info("✅ Error handling test passed")
            
        except Exception as e:
            logger.error(f"❌ Error handling test failed: {e}")
            pytest.fail(f"Error handling test failed: {e}")
    
    def test_api_request_structure(self):
        """Тестирует структуру запросов к API (без реальных вызовов)"""
        logger.info("🧪 Testing API request structure...")
        
        try:
            from mpstats_api_fixed import MPStatsAPI
            
            # Создаем экземпляр API
            api = MPStatsAPI()
            
            # Проверяем заголовки
            headers = api._get_headers()
            
            assert "X-Mpstats-TOKEN" in headers, "Missing MPStats token header"
            assert "Content-Type" in headers, "Missing Content-Type header"
            assert "Accept" in headers, "Missing Accept header"
            assert "User-Agent" in headers, "Missing User-Agent header"
            
            # Проверяем корректность токена
            assert len(headers["X-Mpstats-TOKEN"]) > 20, "Token seems too short"
            assert headers["Content-Type"] == "application/json", "Wrong Content-Type"
            assert headers["Accept"] == "application/json", "Wrong Accept type"
            
            logger.info("✅ API request structure test passed")
            
        except Exception as e:
            logger.error(f"❌ API request structure test failed: {e}")
            pytest.fail(f"API request structure test failed: {e}")
    
    def generate_test_report(self):
        """Генерирует отчет о результатах тестирования"""
        logger.info("📋 Generating test report...")
        
        report = {
            "timestamp": datetime.now().isoformat(),
            "total_tests": len(self.test_results),
            "passed_tests": sum(1 for result in self.test_results.values() if result.get("success", False)),
            "failed_tests": sum(1 for result in self.test_results.values() if not result.get("success", True)),
            "details": self.test_results
        }
        
        logger.info(f"📊 Test Report Summary:")
        logger.info(f"  Total tests: {report['total_tests']}")
        logger.info(f"  Passed: {report['passed_tests']}")
        logger.info(f"  Failed: {report['failed_tests']}")
        logger.info(f"  Success rate: {(report['passed_tests']/report['total_tests']*100):.1f}%")
        
        return report

# =================================================================
# 🏃‍♂️ ФУНКЦИИ ДЛЯ ЗАПУСКА ТЕСТОВ
# =================================================================

async def run_all_tests():
    """Запускает все тесты"""
    logger.info("🚀 Starting MPStats API tests...")
    
    tester = TestFixedMPStatsAPI()
    tester.setup()
    
    try:
        # Запускаем все тесты
        await tester.test_product_data_endpoints()
        await tester.test_brand_data_endpoints()
        await tester.test_category_data_endpoints()
        await tester.test_comprehensive_product_info()
        await tester.test_error_handling()
        tester.test_api_request_structure()
        
        # Генерируем отчет
        report = tester.generate_test_report()
        
        logger.info("✅ All tests completed!")
        return report
        
    except Exception as e:
        logger.error(f"❌ Test suite failed: {e}")
        return {"error": str(e), "timestamp": datetime.now().isoformat()}

def run_quick_test():
    """Быстрый тест основных функций"""
    async def quick_test():
        logger.info("⚡ Running quick test...")
        
        try:
            from wb_api_fixed import get_mpstats_product_data_fixed
            
            # Тестируем один артикул
            test_article = "446467818"
            data = await get_mpstats_product_data_fixed(test_article)
            
            success = bool(data and isinstance(data, dict))
            
            logger.info(f"Quick test result: {'✅ PASSED' if success else '❌ FAILED'}")
            
            if success:
                logger.info(f"  Daily sales: {data.get('daily_sales', 0)}")
                logger.info(f"  Daily revenue: {data.get('daily_revenue', 0):.2f}")
                logger.info(f"  Has raw data: {bool(data.get('raw_data'))}")
            
            return success
            
        except Exception as e:
            logger.error(f"❌ Quick test failed: {e}")
            return False
    
    return asyncio.run(quick_test())

# =================================================================
# 🧪 PYTEST ИНТЕГРАЦИЯ
# =================================================================

@pytest.mark.asyncio
async def test_mpstats_product_endpoints():
    """Pytest тест для продуктовых endpoints"""
    tester = TestFixedMPStatsAPI()
    await tester.test_product_data_endpoints()

@pytest.mark.asyncio
async def test_mpstats_brand_endpoints():
    """Pytest тест для брендовых endpoints"""
    tester = TestFixedMPStatsAPI()
    await tester.test_brand_data_endpoints()

@pytest.mark.asyncio
async def test_mpstats_comprehensive():
    """Pytest тест для комплексной функции"""
    tester = TestFixedMPStatsAPI()
    await tester.test_comprehensive_product_info()

def test_mpstats_api_structure():
    """Pytest тест для структуры API"""
    tester = TestFixedMPStatsAPI()
    tester.test_api_request_structure()

# =================================================================
# 🚀 ТОЧКА ВХОДА
# =================================================================

if __name__ == "__main__":
    # Для запуска из командной строки
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "quick":
        # Быстрый тест
        success = run_quick_test()
        sys.exit(0 if success else 1)
    else:
        # Полный набор тестов
        report = asyncio.run(run_all_tests())
        
        if "error" in report:
            sys.exit(1)
        elif report["failed_tests"] > 0:
            sys.exit(1)
        else:
            sys.exit(0) 