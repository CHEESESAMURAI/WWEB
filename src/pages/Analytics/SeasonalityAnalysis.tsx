import React, { useState } from 'react';
import { analysisAPI } from '../../services/api';
import { SeasonalityData } from '../../types';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { Calendar, Search } from 'lucide-react';

// Chart.js imports
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

const weekdays = [
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
  'Воскресенье',
];

const SeasonalityAnalysis: React.FC = () => {
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SeasonalityData | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category.trim()) return;

    setLoading(true);
    setError('');
    setData(null);

    try {
      const response = await analysisAPI.analyzeSeasonality(category.trim());
      if (response.success && response.data) {
        setData(response.data as SeasonalityData);
      } else {
        setError(response.error || 'Ошибка анализа сезонности');
      }
    } catch (err) {
      setError('Ошибка анализа сезонности');
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart datasets
  const annualChart = () => {
    if (!data) return null;
    const labels = data.annualData.map((d: any) => d.noyeardate);
    const revenue = data.annualData.map((d: any) => d.season_revenue);
    const sales = data.annualData.map((d: any) => d.season_sales);

    const chartData = {
      labels,
      datasets: [
        {
          label: 'Выручка, %',
          data: revenue,
          borderColor: '#2E86AB',
          backgroundColor: 'rgba(46,134,171,0.2)',
          tension: 0.3,
        },
        {
          label: 'Продажи, %',
          data: sales,
          borderColor: '#A23B72',
          backgroundColor: 'rgba(162,59,114,0.2)',
          tension: 0.3,
        },
      ],
    };

    const options = {
      responsive: true,
      plugins: {
        legend: { position: 'top' as const },
        title: { display: true, text: `Годовая сезонность: ${category}` },
      },
      scales: {
        x: { display: false },
      },
    };

    return <Line options={options} data={chartData} />;
  };

  const weeklyChart = () => {
    if (!data) return null;
    const revenue = data.weeklyData.map((d: any) => d.weekly_revenue);
    const sales = data.weeklyData.map((d: any) => d.weekly_sales);

    const chartData = {
      labels: weekdays,
      datasets: [
        {
          label: 'Выручка, %',
          data: revenue,
          backgroundColor: '#2E86AB',
        },
        {
          label: 'Продажи, %',
          data: sales,
          backgroundColor: '#A23B72',
        },
      ],
    };

    const options = {
      responsive: true,
      plugins: {
        legend: { position: 'top' as const },
        title: { display: true, text: `Недельная сезонность: ${category}` },
      },
    };

    return <Bar options={options} data={chartData} />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Calendar className="w-6 h-6 mr-2 text-primary-600" />
            Анализ сезонности
          </h1>
          <p className="text-gray-600 mt-1">
            Выявите пики и спады продаж по категориям Wildberries
          </p>
        </div>
        <div className="text-sm text-gray-500">Стоимость: 30₽</div>
      </div>

      {/* Input Form */}
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
              Путь категории Wildberries
            </label>
            <div className="flex space-x-4">
              <div className="flex-1">
                <input
                  type="text"
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Пример: Женщинам/Платья/Коктейльные"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <Button
                type="submit"
                loading={loading}
                disabled={!category.trim()}
                icon={<Search className="w-4 h-4" />}
              >
                Анализировать
              </Button>
            </div>
          </div>
        </form>
      </Card>

      {/* Loading */}
      {loading && (
        <Card>
          <div className="flex flex-col items-center justify-center py-12">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-600">Анализируем сезонность...</p>
          </div>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card>
          <div className="text-center py-8">
            <div className="text-red-600 text-lg font-medium mb-2">Ошибка анализа</div>
            <p className="text-gray-600">{error}</p>
          </div>
        </Card>
      )}

      {/* Results */}
      {data && !loading && (
        <div className="space-y-6">
          {/* Annual chart */}
          <Card>{annualChart()}</Card>
          {/* Weekly chart */}
          <Card>{weeklyChart()}</Card>
        </div>
      )}
    </div>
  );
};

export default SeasonalityAnalysis; 