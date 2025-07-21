import React, { useState } from 'react';
import './Analysis.css';

export default function AIHelper() {
  const [contentType, setContentType] = useState('product_description');
  const [prompt, setPrompt] = useState('');
  const [generated, setGenerated] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const contentOptions: { value: string; label: string }[] = [
    { value: 'product_description', label: 'Описание товара' },
    { value: 'product_card', label: 'Карточка товара' },
    { value: 'sales_text', label: 'Продающий текст (AIDA)' },
    { value: 'ad_copy', label: 'Рекламный текст' },
    { value: 'social_post', label: 'Пост для соцсетей' },
    { value: 'email_marketing', label: 'Email-рассылка' },
    { value: 'landing_page', label: 'Структура лендинга' },
    { value: 'seo_content', label: 'SEO-контент' },
  ];

  const generateContent = async () => {
    if (!prompt.trim()) {
      setError('Введите описание/задание для генерации');
      return;
    }
    setError('');
    setLoading(true);
    setGenerated(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/analysis/ai-helper', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ content_type: contentType, prompt }),
      });

      if (!response.ok) {
        throw new Error('Ошибка генерации контента');
      }

      const data = await response.json();
      setGenerated(data.data?.content || '');
    } catch (err) {
      console.error(err);
      setError('Произошла ошибка при генерации контента');
    } finally {
      setLoading(false);
    }
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
          🤖 Помощь с нейронкой
        </h1>
        <p style={{ fontSize: '1.1rem', opacity: 0.9 }}>
          Сгенерируйте продающий контент так же, как в Telegram-боте
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
        <p style={{ marginBottom: '15px', color: '#4b5563' }}>
          1. Выберите тип контента в выпадающем списке.<br />
          2. В поле ниже опишите задачу или товар (например: «Описание для спортивной бутылки 650&nbsp;мл»).<br />
          3. Нажмите «Сгенерировать» – текст появится ниже.
        </p>

        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <select
            value={contentType}
            onChange={(e) => setContentType(e.target.value)}
            className="article-input"
            style={{ flex: '0 0 250px' }}
          >
            {contentOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Опишите, что сгенерировать..."
            className="article-input"
            style={{ flex: 1, minWidth: '250px' }}
          />

          <button
            onClick={generateContent}
            disabled={loading}
            className="analyze-button"
          >
            {loading ? 'Генерируем...' : 'Сгенерировать'}
          </button>
        </div>
        {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
      </div>

      {/* Generated Content */}
      {generated && (
        <div style={{
          background: 'white',
          padding: '30px',
          borderRadius: '20px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          whiteSpace: 'pre-wrap',
          lineHeight: 1.5,
          fontSize: '1rem'
        }}>
          {generated}
        </div>
      )}
    </div>
  );
} 