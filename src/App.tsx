import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import MainLayout from './components/Layout/MainLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import LoadingSpinner from './components/UI/LoadingSpinner';

// Analytics pages
import ProductAnalysis from './pages/Analytics/ProductAnalysis';
import BrandAnalysis from './pages/Analytics/BrandAnalysis';
import NicheAnalysis from './pages/Analytics/NicheAnalysis';
import SupplierAnalysis from './pages/Analytics/SupplierAnalysis';
import SeasonalityAnalysis from './pages/Analytics/SeasonalityAnalysis';
import ExternalAnalysis from './pages/Analytics/ExternalAnalysis';
import CategoryAnalysis from './pages/Analytics/CategoryAnalysis';

// Planning pages
import SupplyPlanning from './pages/Planning/SupplyPlanning';
import AdMonitoring from './pages/Planning/AdMonitoring';

// Search pages
import GlobalSearch from './pages/Search/GlobalSearch';
import BloggerSearch from './pages/Search/BloggerSearch';

// AI pages
import AIGeneration from './pages/AI/AIGeneration';
import OracleQueries from './pages/AI/OracleQueries';

// Account pages
import Profile from './pages/Profile';
import Subscription from './pages/Subscription';
import Settings from './pages/Settings';

// Create a query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Protected Route component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Загрузка..." />
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

// Public Route component (redirect to dashboard if already authenticated)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Загрузка..." />
      </div>
    );
  }

  return !isAuthenticated ? <>{children}</> : <Navigate to="/dashboard" replace />;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="App">
            <Routes>
              {/* Public routes */}
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                }
              />
              <Route
                path="/register"
                element={
                  <PublicRoute>
                    <Register />
                  </PublicRoute>
                }
              />

              {/* Protected routes */}
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <MainLayout />
                  </ProtectedRoute>
                }
              >
                {/* Dashboard */}
                <Route path="dashboard" element={<Dashboard />} />

                {/* Analytics routes */}
                <Route path="analytics/product" element={<ProductAnalysis />} />
                <Route path="analytics/brand" element={<BrandAnalysis />} />
                <Route path="analytics/niche" element={<NicheAnalysis />} />
                <Route path="analytics/supplier" element={<SupplierAnalysis />} />
                <Route path="analytics/seasonality" element={<SeasonalityAnalysis />} />
                <Route path="analytics/external" element={<ExternalAnalysis />} />
                <Route path="analytics/category" element={<CategoryAnalysis />} />

                {/* Planning routes */}
                <Route path="planning/supply" element={<SupplyPlanning />} />
                <Route path="planning/ads" element={<AdMonitoring />} />

                {/* Search routes */}
                <Route path="search/global" element={<GlobalSearch />} />
                <Route path="search/bloggers" element={<BloggerSearch />} />

                {/* AI routes */}
                <Route path="ai/generate" element={<AIGeneration />} />
                <Route path="ai/oracle" element={<OracleQueries />} />

                {/* Account routes */}
                <Route path="profile" element={<Profile />} />
                <Route path="subscription" element={<Subscription />} />
                <Route path="settings" element={<Settings />} />
              </Route>

              {/* Default redirect */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App; 