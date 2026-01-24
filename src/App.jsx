import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { checkSession } from './features/auth/authSlice';
import { OrganizationProvider } from './contexts/OrganizationContext';
import { ToastProvider } from './context/ToastContext';

// Layout
import MainLayout from './components/layout/MainLayout';
import AuthLayout from './components/layout/AuthLayout';

// Auth Pages
import SignIn from './pages/auth/SignIn';
import SignUp from './pages/auth/SignUp';
import AuthCallback from './pages/auth/AuthCallback';
import AcceptInvitation from './pages/auth/AcceptInvitation';

// Main Pages
import Dashboard from './pages/Dashboard';
import Invoices from './pages/Invoices';
import InvoiceDetail from './pages/InvoiceDetail';
import Clients from './pages/Clients';
import Products from './pages/Products';
import Templates from './pages/Templates';
import TemplateEditor from './pages/TemplateEditor';
import Teams from './pages/Teams';
import Settings from './pages/Settings';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';

// Components
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminRoute from './components/auth/AdminRoute';

function App() {
  const dispatch = useDispatch();
  const { initialized, loading } = useSelector((state) => state.auth);
  const [showLoader, setShowLoader] = useState(true);
  const [animateOut, setAnimateOut] = useState(false);

  useEffect(() => {
    dispatch(checkSession());
  }, [dispatch]);

  // When loading is done, trigger exit animation then hide loader
  useEffect(() => {
    if (initialized && !loading && showLoader) {
      // Start exit animation
      setAnimateOut(true);
      // Hide loader after animation completes
      const timer = setTimeout(() => {
        setShowLoader(false);
      }, 600); // Match animation duration
      return () => clearTimeout(timer);
    }
  }, [initialized, loading, showLoader]);

  // Show loader while checking session or during exit animation
  if (showLoader) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className={animateOut ? 'animate-logo-to-corner' : ''}>
          <img 
            src="/visinv_logo.svg" 
            alt="VisInv" 
            className={`h-16 w-auto dark:invert-0 invert ${!animateOut ? 'animate-pulse' : ''}`}
          />
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <OrganizationProvider>
        <Router>
        <Routes>
          {/* Auth Routes */}
          <Route element={<AuthLayout />}>
            <Route path="/auth/signin" element={<SignIn />} />
            <Route path="/auth/signup" element={<SignUp />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/invite/:token" element={<AcceptInvitation />} />
          </Route>

          {/* Protected Routes */}
          <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/invoices/:id" element={<InvoiceDetail />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/products" element={<Products />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/templates/new" element={<TemplateEditor />} />
            <Route path="/templates/edit/:id" element={<TemplateEditor />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          {/* Admin Routes */}
          <Route element={<AdminRoute><MainLayout /></AdminRoute>}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminUsers />} />
          </Route>

          {/* Redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </OrganizationProvider>
    </ToastProvider>
  );
}

export default App;
