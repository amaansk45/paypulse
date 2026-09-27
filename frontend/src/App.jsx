import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';

// Layout & Protected Route
import AppLayout from './layouts/AppLayout';
import ProtectedRoute from './components/common/ProtectedRoute';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import VerifyOTP from './pages/auth/VerifyOTP';
import ForgotPassword from './pages/auth/ForgotPassword';

// App Pages
import Dashboard from './pages/dashboard/Dashboard';
import WalletPage from './pages/wallet/WalletPage';
import SendMoneyPage from './pages/payments/SendMoneyPage';
import RequestsPage from './pages/payments/RequestsPage';
import MyQRPage from './pages/qr/MyQRPage';
import ScanPayPage from './pages/qr/ScanPayPage';
import TransactionsPage from './pages/transactions/TransactionsPage';
import NotificationsPage from './pages/notifications/NotificationsPage';
import ProfilePage from './pages/profile/ProfilePage';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminTransactions from './pages/admin/AdminTransactions';
import AdminRefunds from './pages/admin/AdminRefunds';
import AdminAuditLogs from './pages/admin/AdminAuditLogs';

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Authentication Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/verify-otp" element={<VerifyOTP />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />

              {/* Protected User Dashboard Routes */}
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/wallet" element={<WalletPage />} />
                <Route path="/send" element={<SendMoneyPage />} />
                <Route path="/requests" element={<RequestsPage />} />
                <Route path="/scan-pay" element={<ScanPayPage />} />
                <Route path="/my-qr" element={<MyQRPage />} />
                <Route path="/transactions" element={<TransactionsPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/profile" element={<ProfilePage />} />

                {/* Admin Operations Routes */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute adminOnly={true}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/users"
                  element={
                    <ProtectedRoute adminOnly={true}>
                      <AdminUsers />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/transactions"
                  element={
                    <ProtectedRoute adminOnly={true}>
                      <AdminTransactions />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/refunds"
                  element={
                    <ProtectedRoute adminOnly={true}>
                      <AdminRefunds />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/audit-logs"
                  element={
                    <ProtectedRoute adminOnly={true}>
                      <AdminAuditLogs />
                    </ProtectedRoute>
                  }
                />
              </Route>

              {/* Catch-all redirect */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
