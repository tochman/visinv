import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import Suppliers from './pages/Suppliers';
import Products from './pages/Products';
import Accounts from './pages/Accounts';
import JournalEntries from './pages/JournalEntries';
import GeneralLedger from './pages/GeneralLedger';
import BalanceSheet from './pages/BalanceSheet';
import IncomeStatement from './pages/IncomeStatement';
import VATReport from './pages/VATReport';
import SieImport from './pages/SieImport';
import Templates from './pages/Templates';
import TemplateEditor from './pages/TemplateEditor';
import Teams from './pages/Teams';
import Settings from './pages/Settings';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import CookiePolicy from './pages/CookiePolicy';

// Components
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminRoute from './components/auth/AdminRoute';
import CookieBanner from './components/common/CookieBanner';
import CookieSettings from './components/common/CookieSettings';
import NpsModal from './components/common/NpsModal';

function App() {
  const dispatch = useDispatch();
  const { initialized, loading } = useSelector((state) => state.auth);
  const [showLoader, setShowLoader] = useState(true);
  
  // Derive animation state from conditions instead of using effect
  const shouldAnimate = initialized && !loading && showLoader;

  useEffect(() => {
    dispatch(checkSession());
  }, [dispatch]);

  // When loading is done, hide loader after animation completes
  useEffect(() => {
    if (shouldAnimate) {
      const timer = setTimeout(() => {
        setShowLoader(false);
      }, 600); // Match animation duration
      return () => clearTimeout(timer);
    }
  }, [shouldAnimate]);

  // Show loader while checking session or during exit animation
  if (showLoader) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className={shouldAnimate ? 'animate-logo-to-corner' : ''}>
          <img 
            src="/svethna_logo.svg" 
            alt="VisInv" 
            className={`h-16 w-auto dark:invert-0 invert ${!shouldAnimate ? 'animate-pulse' : ''}`}
          />
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <OrganizationProvider>
        <BrowserRouter>
        <CookieBanner />
        <CookieSettings />
        <NpsModal />
        <Routes>
          {/* Public Routes */}
          <Route path="/cookie-policy" element={<CookiePolicy />} />

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
            <Route path="/suppliers" element={<Suppliers />} />
            <Route path="/products" element={<Products />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/journal-entries" element={<JournalEntries />} />
            <Route path="/general-ledger" element={<GeneralLedger />} />
            <Route path="/reports/balance-sheet" element={<BalanceSheet />} />
            <Route path="/reports/income-statement" element={<IncomeStatement />} />
            <Route path="/reports/vat-report" element={<VATReport />} />
            <Route path="/import/sie" element={<SieImport />} />
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
      </BrowserRouter>
    </OrganizationProvider>
    </ToastProvider>
  );
}

export default App;
