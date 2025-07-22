#!/bin/bash

echo "🔧 Исправление CSS файлов на сервере..."

# Создание упрощенного Analysis.css
cat > wild-analytics-web/src/pages/Analysis.css << 'EOF'
/* Упрощенный Analysis.css без проблемных классов */

.error-message {
  padding: 1rem;
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 0.5rem;
  color: #dc2626;
}

.loader {
  border: 3px solid #f3f3f3;
  border-radius: 50%;
  border-top: 3px solid #3b82f6;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Grid and Flexbox */
.grid {
  display: grid;
}

.grid-cols-1 {
  grid-template-columns: repeat(1, minmax(0, 1fr));
}

.grid-cols-2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

@media (min-width: 768px) {
  .md-grid-cols-2 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  
  .md-grid-cols-5 {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}

.gap-6 { gap: 1.5rem; }
.gap-4 { gap: 1rem; }
.gap-2 { gap: 0.5rem; }

.mb-6 { margin-bottom: 1.5rem; }
.mb-4 { margin-bottom: 1rem; }
.mb-2 { margin-bottom: 0.5rem; }

.space-y-1 > * + * { margin-top: 0.25rem; }
.space-y-6 > * + * { margin-top: 1.5rem; }

/* Typography */
.text-lg { font-size: 1.125rem; }
.text-sm { font-size: 0.875rem; }
.text-xl { font-size: 1.25rem; }
.text-2xl { font-size: 1.5rem; }

.font-semibold { font-weight: 600; }

.text-gray-600 { color: #4b5563; }
.text-gray-500 { color: #6b7280; }
.text-white { color: white; }
.text-white-opacity { color: rgba(255, 255, 255, 0.8); }
.text-green-600 { color: #059669; }
.text-red-600 { color: #dc2626; }

/* Flexbox */
.flex { display: flex; }
.items-center { align-items: center; }
.justify-center { justify-content: center; }
.justify-between { justify-content: space-between; }

/* Text alignment */
.text-center { text-align: center; }

/* Padding */
.p-8 { padding: 2rem; }
.p-4 { padding: 1rem; }
.py-12 { padding-top: 3rem; padding-bottom: 3rem; }

/* Lists */
.list-disc { list-style-type: disc; }
.list-inside { list-style-position: inside; }

/* Word break */
.break-all { word-break: break-all; }

/* Transitions */
.transition-colors {
  transition-property: color, background-color, border-color;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
}

.hover-text-white-opacity:hover {
  color: rgba(255, 255, 255, 0.8);
}

/* Analysis page specific styles */
.analysis-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  box-sizing: border-box;
}

.page-header {
  text-align: center;
  margin-bottom: 30px;
}

.page-header h1 {
  color: #ffffff;
  font-size: 2.2rem;
  margin-bottom: 10px;
}

.page-header p {
  color: rgba(255, 255, 255, 0.85);
  font-size: 1.1rem;
}

.analysis-form {
  margin-bottom: 20px;
}

.form-row {
  display: flex;
  gap: 15px;
  align-items: flex-end;
}

.article-input {
  flex: 1;
  padding: 12px 16px;
  border: 2px solid #e1e8ed;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.3s ease;
}

.article-input:focus {
  outline: none;
  border-color: #3498db;
}

.articles-textarea {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e1e8ed;
  border-radius: 8px;
  font-size: 16px;
  font-family: inherit;
  resize: vertical;
  transition: border-color 0.3s ease;
}

.articles-textarea:focus {
  outline: none;
  border-color: #3498db;
}

.analyze-button {
  background: linear-gradient(135deg, #3498db, #2980b9);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.analyze-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(52, 152, 219, 0.4);
}

.analyze-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

/* Product Analysis Styles */
.product-info {
  margin-top: 20px;
}

.product-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
  padding-bottom: 15px;
  border-bottom: 2px solid #e1e8ed;
}

.product-header h4 {
  color: #2c3e50;
  font-size: 1.4rem;
  margin: 0;
}

.article-badge {
  background: #3498db;
  color: white;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 500;
}

.metric-card {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 10px;
  padding: 20px;
  display: flex;
  align-items: center;
  transition: transform 0.3s ease;
}

.metric-card:hover {
  transform: translateY(-3px);
}

.metric-icon {
  font-size: 2rem;
  margin-right: 15px;
  width: 50px;
  text-align: center;
}

.metric-info h5 {
  margin: 0 0 5px 0;
  color: #7f8c8d;
  font-size: 0.9rem;
  font-weight: 500;
}

.metric-info p {
  margin: 0;
  color: #2c3e50;
  font-size: 1.3rem;
  font-weight: 700;
}
EOF

# Создание упрощенного GlobalSearch.css
cat > wild-analytics-web/src/pages/GlobalSearch.css << 'EOF'
/* Упрощенный GlobalSearch.css без проблемных классов */

.error-message {
  padding: 1rem;
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 0.5rem;
  color: #dc2626;
}

.loader {
  border: 3px solid #f3f3f3;
  border-radius: 50%;
  border-top: 3px solid #3b82f6;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Grid and Flexbox */
.grid {
  display: grid;
}

.grid-cols-1 {
  grid-template-columns: repeat(1, minmax(0, 1fr));
}

.grid-cols-2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

@media (min-width: 768px) {
  .md-grid-cols-2 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  
  .md-grid-cols-5 {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}

.gap-6 { gap: 1.5rem; }
.gap-4 { gap: 1rem; }
.gap-3 { gap: 0.75rem; }
.gap-2 { gap: 0.5rem; }

.mb-6 { margin-bottom: 1.5rem; }
.mb-4 { margin-bottom: 1rem; }
.mb-2 { margin-bottom: 0.5rem; }

.space-y-1 > * + * { margin-top: 0.25rem; }
.space-y-6 > * + * { margin-top: 1.5rem; }

/* Typography */
.text-lg { font-size: 1.125rem; }
.text-sm { font-size: 0.875rem; }
.text-xl { font-size: 1.25rem; }
.text-2xl { font-size: 1.5rem; }

.font-semibold { font-weight: 600; }

.text-gray-600 { color: #4b5563; }
.text-gray-500 { color: #6b7280; }
.text-white { color: white; }
.text-white-opacity { color: rgba(255, 255, 255, 0.8); }
.text-green-600 { color: #059669; }
.text-red-600 { color: #dc2626; }

/* Flexbox */
.flex { display: flex; }
.items-center { align-items: center; }
.justify-center { justify-content: center; }
.justify-between { justify-content: space-between; }

/* Text alignment */
.text-center { text-align: center; }

/* Padding */
.p-8 { padding: 2rem; }
.p-4 { padding: 1rem; }
.py-12 { padding-top: 3rem; padding-bottom: 3rem; }

/* Lists */
.list-disc { list-style-type: disc; }
.list-inside { list-style-position: inside; }

/* Word break */
.break-all { word-break: break-all; }

/* Transitions */
.transition-colors {
  transition-property: color, background-color, border-color;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
}

.hover-text-white-opacity:hover {
  color: rgba(255, 255, 255, 0.8);
}

/* Global Search specific styles */
.global-search-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  box-sizing: border-box;
}

.search-header {
  text-align: center;
  margin-bottom: 30px;
}

.search-header h1 {
  color: #ffffff;
  font-size: 2.2rem;
  margin-bottom: 10px;
}

.search-header p {
  color: rgba(255, 255, 255, 0.85);
  font-size: 1.1rem;
}

.search-form {
  margin-bottom: 20px;
}

.search-input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e1e8ed;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.3s ease;
}

.search-input:focus {
  outline: none;
  border-color: #3498db;
}

.search-button {
  background: linear-gradient(135deg, #3498db, #2980b9);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.search-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(52, 152, 219, 0.4);
}

.search-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.result-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  overflow: hidden;
  transition: all 0.2s;
  margin-bottom: 20px;
}

.result-card:hover {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.result-header {
  padding: 1rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: white;
}

.stat-card {
  background: #f9fafb;
  padding: 1rem;
  border-radius: 0.5rem;
  text-align: center;
}

.stat-label {
  color: #6b7280;
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
}

.stat-value {
  color: #111827;
  font-weight: 600;
  font-size: 1.125rem;
}
EOF

echo "✅ CSS файлы заменены на упрощенные версии"
echo "🔄 Перезапуск Docker контейнеров..."

# Перезапуск контейнеров
docker-compose down
docker-compose up --build -d

echo "✅ Готово! Проверьте приложение по адресу http://93.127.214.183" 