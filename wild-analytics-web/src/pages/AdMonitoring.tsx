import React, { useState } from 'react';
import axios from 'axios';
import './Analysis.css';

interface AdResult {
  article: string;
  name: string;
  spend: number;
  revenue: number;
  roi: number;
  clicks: number;
  impressions: number;
  ctr: number;
  status: string;
}

interface AdSummary {
  total_campaigns: number;
  profitable_campaigns: number;
  total_spend: number;
  total_revenue: number;
  total_roi: number;
  average_roi: number;
}

interface AdMonitoringResult {
  results: AdResult[];
  summary: AdSummary;
  recommendations: string[];
}

const AdMonitoring: React.FC = () => {
  const [articles, setArticles] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AdMonitoringResult | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!articles.trim()) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const articlesList = articles.split(',').map(a => a.trim()).filter(a => a);
      const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const response = await axios.post(`${API_BASE}/planning/ad-monitoring`, {
        articles: articlesList
      });
      setResult(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка мониторинга рекламы');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    if (status.includes('🟢')) return '#2ecc71';
    if (status.includes('🟡')) return '#f39c12';
    if (status.includes('🔴')) return '#e74c3c';
    return '#95a5a6';
  };

  return (
    <div className="analysis-page">
      <div className="page-header">
        <h1>📈 Мониторинг рекламы</h1>
        <p>Отслеживайте эффективность ваших рекламных кампаний</p>
      </div>

      <div className="card">
        <h3>Артикулы для мониторинга</h3>
        <form onSubmit={handleSubmit} className="analysis-form">
          <div className="form-group">
            <textarea
              value={articles}
              onChange={(e) => setArticles(e.target.value)}
              placeholder="Введите артикулы через запятую (например: 123456789, 987654321, 555666777)"
              className="articles-textarea"
              rows={3}
              disabled={loading}
            />
          </div>
          <button 
            type="submit" 
            className="analyze-button"
            disabled={loading || !articles.trim()}
          >
            {loading ? 'Анализируем...' : 'Начать мониторинг'}
          </button>
        </form>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
      </div>

      {result && (
        <div className="results-section">
          {/* Summary */}
          <div className="card">
            <h3>📊 Общая статистика</h3>
            <div className="grid grid-4">
              <div className="summary-card">
                <div className="summary-icon">📈</div>
                <div className="summary-info">
                  <h5>Общий ROI</h5>
                  <p className={result.summary.total_roi >= 0 ? 'positive' : 'negative'}>
                    {result.summary.total_roi.toFixed(1)}%
                  </p>
                </div>
              </div>
              
              <div className="summary-card">
                <div className="summary-icon">💰</div>
                <div className="summary-info">
                  <h5>Общие расходы</h5>
                  <p>{result.summary.total_spend.toLocaleString()}₽</p>
                </div>
              </div>
              
              <div className="summary-card">
                <div className="summary-icon">💵</div>
                <div className="summary-info">
                  <h5>Общая выручка</h5>
                  <p>{result.summary.total_revenue.toLocaleString()}₽</p>
                </div>
              </div>
              
              <div className="summary-card">
                <div className="summary-icon">🎯</div>
                <div className="summary-info">
                  <h5>Прибыльных кампаний</h5>
                  <p>{result.summary.profitable_campaigns}/{result.summary.total_campaigns}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Campaigns Details */}
          <div className="card">
            <h3>📋 Детали кампаний</h3>
            <div className="campaigns-list">
              {result.results.map((campaign, index) => (
                <div key={index} className="campaign-card">
                  <div className="campaign-header">
                    <h4>{campaign.name}</h4>
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(campaign.status) }}
                    >
                      {campaign.status}
                    </span>
                  </div>
                  
                  <div className="campaign-metrics">
                    <div className="metric">
                      <span className="metric-label">ROI:</span>
                      <span className={`metric-value ${campaign.roi >= 0 ? 'positive' : 'negative'}`}>
                        {campaign.roi.toFixed(1)}%
                      </span>
                    </div>
                    
                    <div className="metric">
                      <span className="metric-label">Расходы:</span>
                      <span className="metric-value">{campaign.spend.toLocaleString()}₽</span>
                    </div>
                    
                    <div className="metric">
                      <span className="metric-label">Выручка:</span>
                      <span className="metric-value">{campaign.revenue.toLocaleString()}₽</span>
                    </div>
                    
                    <div className="metric">
                      <span className="metric-label">CTR:</span>
                      <span className="metric-value">{campaign.ctr}%</span>
                    </div>
                    
                    <div className="metric">
                      <span className="metric-label">Клики:</span>
                      <span className="metric-value">{campaign.clicks.toLocaleString()}</span>
                    </div>
                    
                    <div className="metric">
                      <span className="metric-label">Показы:</span>
                      <span className="metric-value">{campaign.impressions.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          <div className="card">
            <h3>💡 Рекомендации по оптимизации</h3>
            <div className="recommendations">
              {result.recommendations.map((recommendation, index) => (
                <div key={index} className="recommendation-item">
                  <span className="recommendation-icon">💡</span>
                  <span>{recommendation}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdMonitoring; 