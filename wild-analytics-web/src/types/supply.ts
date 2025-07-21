// Enhanced Supply Planning Types

export interface SalesTrend {
  trend: 'growth' | 'decline' | 'stable' | 'unknown';
  trend_emoji: string;
  trend_text: string;
  trend_percentage: number;
}

export interface EnhancedSKU {
  // Базовая информация (метрики 1-3)
  article: string;
  brand: string;
  product_name: string;
  
  // Остатки (метрики 4-5)
  total_stock: number;
  reserved_stock: number;
  available_stock: number;
  
  // Продажи (метрики 6-9)
  sales_7d_units: number;
  sales_30d_units: number;
  sales_60d_units: number;
  sales_90d_units: number;
  
  // Метрика 10 - Средние продажи в день
  avg_daily_sales: number;
  
  // Метрики 11 - Прогноз продаж
  forecast_30d_units: number;
  forecast_30d_revenue: number;
  
  // Метрика 12 - Оборачиваемость
  turnover_days: number;
  
  // Метрика 13 - Рекомендуемая поставка
  recommended_supply: number;
  
  // Метрики 14-15 - Дни до OOS и запас
  days_until_oos: number;
  available_days: number;
  
  // Метрика 16 - Тренд продаж
  sales_trend: SalesTrend;
  
  // Метрика 17 - Маржа
  estimated_margin: number;
  margin_percentage: number;
  
  // Метрика 18 - Реклама
  is_advertised: boolean;
  ad_percentage: number;
  ad_ctr: number;
  ad_cpc: number;
  ad_revenue: number;
  
  // Метрика 19 - Последняя поставка
  last_supply_date: string;
  
  // Метрика 20 - Выручка по периодам
  revenue_7d: number;
  revenue_30d: number;
  revenue_60d: number;
  revenue_90d: number;
  
  // Статусы и индикаторы
  stock_status: 'critical' | 'warning' | 'good';
  stock_status_emoji: string;
  stock_status_text: string;
  
  supply_priority: 'high' | 'medium' | 'low';
  supply_priority_emoji: string;
  supply_priority_text: string;
  
  estimated_oos_date: string;
  
  // Дополнительная информация
  price_current: number;
  price_old: number;
  discount: number;
  rating: number;
  reviews_count: number;
  category: string;
  supplier: string;
}

export interface SupplySummaryAnalytics {
  total_skus: number;
  critical_skus: number;
  warning_skus: number;
  good_skus: number;
  critical_percentage: number;
  warning_percentage: number;
  good_percentage: number;
  
  total_stock_value: number;
  total_recommended_supply: number;
  avg_turnover_days: number;
  total_forecast_30d: number;
  total_forecast_revenue_30d: number;
}

export interface EnhancedSupplyPlanningRequest {
  articles: string[];
  target_stock_days?: number;
}

export interface EnhancedSupplyPlanningResponse {
  success: boolean;
  data: {
    skus: EnhancedSKU[];
    summary: SupplySummaryAnalytics;
    formatted_report: string;
    total_skus: number;
    target_stock_days: number;
  };
}

export interface SupplyExportResponse {
  success: boolean;
  data: {
    csv_content: string;
    filename: string;
    total_records: number;
  };
}

// Для графиков и визуализации
export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
  emoji?: string;
}

export interface SupplyChartData {
  stockStatus: ChartDataPoint[];
  salesTrends: ChartDataPoint[];
  priorities: ChartDataPoint[];
  turnoverDistribution: ChartDataPoint[];
}

// Фильтры для таблицы
export interface SupplyFilters {
  search: string;
  stockStatus: string[];
  supplyPriority: string[];
  salesTrend: string[];
  brand: string[];
  category: string[];
  minStock: number | null;
  maxStock: number | null;
  minDaysToOOS: number | null;
  maxDaysToOOS: number | null;
}

// Настройки отображения
export interface SupplyDisplaySettings {
  itemsPerPage: number;
  sortField: keyof EnhancedSKU;
  sortDirection: 'asc' | 'desc';
  visibleColumns: string[];
  showCharts: boolean;
  showSummaryCards: boolean;
} 