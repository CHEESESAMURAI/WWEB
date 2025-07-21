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

export default function ExternalAnalysis() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<{ summary: string; results?: any } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const analyzeExternal = async () => {
    if (!query.trim()) {
      setError('Введите артикул, бренд или ключевое слово');
      return;
    }
    setError('');
    setLoading(true);
    setResult(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/analysis/external', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error('Ошибка анализа внешней рекламы');
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

  // форматируем summary жирным ключ: значение
  const formattedSummary = useMemo(() => {
    if (!result) return [] as React.ReactElement[];
    const clean = result.summary.replace(/\*/g, '');
    return clean.split(/\n+/).filter(Boolean).map((line, idx) => {
      if (line.includes(':')) {
        const [left, right] = line.split(/:(.*)/, 2);
        return (
          <p key={idx} style={{ marginBottom: 4 }}><strong>{left.trim()}:</strong>{right}</p>
        );
      }
      return <p key={idx} style={{ marginBottom: 4 }}>{line}</p>;
    });
  }, [result]);

  // График прироста продаж по публикациям (топ 10)
  const growthChart = useMemo(() => {
    const items = result?.results?.items || [];
    if (!Array.isArray(items) || items.length === 0) return null;
    const sorted = items
      .filter((it:any)=>typeof it.sales_growth_percent==='number')
      .sort((a:any,b:any)=> b.sales_growth_percent - a.sales_growth_percent)
      .slice(0,10);
    if (sorted.length === 0) return null;
    const labels = sorted.map((it:any,i:number)=> it.blogger?.name || `Pub ${i+1}`);
    const dataVals = sorted.map((it:any)=> it.sales_growth_percent);
    const data = {
      labels,
      datasets:[{
        label: 'Прирост продаж, %',
        data: dataVals,
        backgroundColor: '#2E86AB',
      }],
    };
    const options={
      responsive:true,
      plugins:{
        legend:{position:'top' as const},
        title:{display:true,text:'Топ публикаций по приросту продаж'},
      },
    };
    return <Bar data={data} options={options}/>;
  }, [result]);

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
          📣 Анализ внешки
        </h1>
        <p style={{ fontSize: '1.1rem', opacity: 0.9 }}>
          Проанализируйте влияние рекламы и постов вне Wildberries на продажи
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
        <div className="form-row" style={{ marginTop: '10px' }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Введите артикул товара или ключевое слово"
            className="article-input"
          />

          <button
            onClick={analyzeExternal}
            disabled={loading}
            className="analyze-button"
          >
            {loading ? 'Анализируем...' : 'Показать анализ'}
          </button>
        </div>
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
          lineHeight:1.6,
          color:'#374151'
        }}>
          {formattedSummary}
        </div>
      )}

      {/* Chart */}
      {growthChart && (
        <div style={{
          background: 'white',
          padding: '30px',
          borderRadius: '20px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          marginBottom:'30px'
        }}>
          {growthChart}
        </div>
      )}
    </div>
  );
} 