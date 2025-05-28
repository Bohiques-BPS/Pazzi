import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import DashboardPage from './pages/DashboardPage';
import ProjectsPage from './pages/ProjectsPage';
import EmployeesPage from './pages/EmployeesPage';
import CalendarPage from './pages/CalendarPage';
import MessagesPage from './pages/MessagesPage';
import POSDashboardPage from './pages/pos/POSDashboardPage';
import POSSalesPage from './pages/pos/POSSalesPage';
import POSProductsPage from './pages/pos/POSProductsPage';
import POSInventoryPage from './pages/pos/POSInventoryPage';
import POSSuppliersPage from './pages/pos/POSSuppliersPage';
import POSCustomersPage from './pages/pos/POSCustomersPage';
import StoreDashboardPage from './pages/store/StoreDashboardPage';
import StoreProductsPage from './pages/store/StoreProductsPage';
import StoreOrdersPage from './pages/store/StoreOrdersPage';
import StoreCustomersPage from './pages/store/StoreCustomersPage';
import Layout from './components/layout/Layout';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-teal-500 rounded-full border-t-transparent"></div>
      </div>
    );
  }
  
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            {/* Project Management Routes */}
            <Route index element={<DashboardPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="employees" element={<EmployeesPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="messages" element={<MessagesPage />} />

            {/* POS Routes */}
            <Route path="pos" element={<POSDashboardPage />} />
            <Route path="pos/sales" element={<POSSalesPage />} />
            <Route path="pos/products" element={<POSProductsPage />} />
            <Route path="pos/inventory" element={<POSInventoryPage />} />
            <Route path="pos/suppliers" element={<POSSuppliersPage />} />
            <Route path="pos/customers" element={<POSCustomersPage />} />

            {/* E-commerce Routes */}
            <Route path="store" element={<StoreDashboardPage />} />
            <Route path="store/products" element={<StoreProductsPage />} />
            <Route path="store/orders" element={<StoreOrdersPage />} />
            <Route path="store/customers" element={<StoreCustomersPage />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;