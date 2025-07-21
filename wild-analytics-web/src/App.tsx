import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import BloggerSearch from './pages/BloggerSearch';
import BrandAnalysis from './pages/BrandAnalysis';
import CategoryAnalysis from './pages/CategoryAnalysis';
import SeasonalityAnalysis from './pages/SeasonalityAnalysis';
import SellerAnalysis from './pages/SupplierAnalysis';
import ProductAnalysis from './pages/ProductAnalysis';
import Register from './pages/Register';
import Login from './pages/Login';
import Profile from './pages/Profile';
import AdMonitoring from './pages/AdMonitoring';
import AIHelper from './pages/AIHelper';
import OracleQueries from './pages/OracleQueries';
import SupplyPlanningEnhanced from './pages/SupplyPlanningEnhanced';
import GlobalSearch from './pages/GlobalSearch';
import ExternalAnalysis from './pages/ExternalAnalysis';
import { AuthProvider } from './contexts/AuthContext';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/blogger-search" element={<BloggerSearch />} />
            <Route path="/brand-analysis" element={<BrandAnalysis />} />
            <Route path="/category-analysis" element={<CategoryAnalysis />} />
            <Route path="/seasonality-analysis" element={<SeasonalityAnalysis />} />
            <Route path="/supplier-analysis" element={<SellerAnalysis />} />
            <Route path="/product-analysis" element={<ProductAnalysis />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/ad-monitoring" element={<AdMonitoring />} />
            <Route path="/ai-helper" element={<AIHelper />} />
            <Route path="/oracle-queries" element={<OracleQueries />} />
            <Route path="/supply-planning" element={<SupplyPlanningEnhanced />} />
            <Route path="/global-search" element={<GlobalSearch />} />
            <Route path="/external-analysis" element={<ExternalAnalysis />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
