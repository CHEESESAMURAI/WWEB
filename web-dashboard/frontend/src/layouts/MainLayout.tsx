import React from 'react';
import { Outlet } from 'react-router-dom';

const MainLayout: React.FC = () => {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <div className="sidebar">
        <h2>Wild Analytics</h2>
        <nav>
          <a href="/dashboard" className="nav-item">Дашборд</a>
          <a href="/product-analysis" className="nav-item">Анализ товаров</a>
          <a href="/niche-analysis" className="nav-item">Анализ ниш</a>
        </nav>
      </div>
      <div className="main-content">
        <Outlet />
      </div>
    </div>
  );
};

export default MainLayout;
