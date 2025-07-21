import React, { useState, useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import './Analysis.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface ProductSupply {
  article: string;
  name: string;
  current_stock: number;
  daily_sales: number;
  days_until_zero: number;
  recommended_supply: number;
  stock_status: string;
  status_emoji: string;
}

export default function SupplyPlanning() {
  const [articlesInput, setArticlesInput] = useState('');
  const [result, setResult] = useState<{ products: ProductSupply[]; summary: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const analyzeSupply = async () => {
    const list = articlesInput
      .split(/[,\n ]+/)
      .map((a) => a.trim())
      .filter(Boolean);

    if (list.length === 0) {
      setError('Введите хотя бы один артикул');
      return;
    }
    setError('');
    setLoading(true);
    setResult(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/planning/supply-planning', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ articles: list }),
      });

      if (!response.ok) {
        throw new Error('Ошибка при анализе плана поставок');
      }

      const data = await response.json();
      setResult(data.data);
    } catch (err) {
      console.error(err);
      setError('Произошла ошибка при анализе');
    } finally {
      setLoading(false);
    }
  };

  // Чистим текст отчёта от markdown символов
  const cleanSummary = useMemo(() => {
    if (!result) return '';
    return result.summary.replace(/\*/g, '');
  }, [result]);

  // Данные для графика (остаток vs рекомендованная поставка)
  const chartData = useMemo(() => {
    if (!result || result.products.length === 0) return null;
    const labels = result.products.map((p) => p.article);
    return {
      labels,
      datasets: [
        {
          label: 'Текущий остаток',
          data: result.products.map((p) => p.current_stock),
          backgroundColor: '#2E86AB',
        },
        {
          label: 'Рекоменд. поставка',
          data: result.products.map((p) => p.recommended_supply),
          backgroundColor: '#A23B72',
        },
      ],
    };
  }, [result]);

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' as const },
      title: { display: true, text: 'Остаток vs Поставка' },
    },
  };

  return (
    <div style={{
      maxWidth: '1400px',
      margin: '0 auto',
      padding: '20px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '30px', color: 'white' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '10px', textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
          🚚 План поставок
        </h1>
        <p style={{ fontSize: '1.1rem', opacity: 0.9 }}>
          Определите, сколько единиц товара нужно довезти, опираясь на продажи и остатки
        </p>
      </div>

      {/* Form */}
      <div style={{
        background: 'white',
        padding: '30px',
        borderRadius: '20px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
        marginBottom: '30px'
      }}>
        <textarea
          value={articlesInput}
          onChange={(e) => setArticlesInput(e.target.value)}
          placeholder="Введите артикулы через запятую или с новой строки"
          rows={3}
          className="articles-textarea"
          style={{ marginBottom: '15px' }}
        />

        <button
          onClick={analyzeSupply}
          disabled={loading}
          className="analyze-button"
        >
          {loading ? 'Анализируем...' : 'Рассчитать план'}
        </button>
        {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
      </div>

      {/* Summary */}
      {result && (
        <div style={{
          background: 'white',
          padding: '30px',
          borderRadius: '20px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          marginBottom: '30px',
          lineHeight: 1.6,
          color: '#374151',
          whiteSpace: 'pre-line'
        }}>
          {cleanSummary}
        </div>
      )}

      {/* Table */}
      {result && result.products.length > 0 && (
        <div style={{
          background: 'white',
          padding: '30px',
          borderRadius: '20px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          overflowX: 'auto'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f5f5f5' }}>
                <th style={{ padding: '8px' }}>Статус</th>
                <th style={{ padding: '8px' }}>Артикул</th>
                <th style={{ padding: '8px' }}>Название</th>
                <th style={{ padding: '8px' }}>Остаток</th>
                <th style={{ padding: '8px' }}>Дни до 0</th>
                <th style={{ padding: '8px' }}>Рекоменд. поставка</th>
              </tr>
            </thead>
            <tbody>
              {result.products.map((p) => (
                <tr key={p.article} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px', textAlign: 'center' }}>{p.status_emoji}</td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>{p.article}</td>
                  <td style={{ padding: '8px' }}>{p.name}</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>{p.current_stock}</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>{p.days_until_zero.toFixed(1)}</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>{p.recommended_supply}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Chart */}
      {chartData && (
        <div style={{
          background: 'white',
          padding: '30px',
          borderRadius: '20px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          marginTop: '30px'
        }}>
          <Bar options={chartOptions} data={chartData} />
        </div>
      )}
    </div>
  );
} 