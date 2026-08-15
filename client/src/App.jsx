import { useEffect, lazy, Suspense } from 'react'
import { motion } from 'framer-motion'
import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { isAuthenticated, isSuperAdmin } from './utils/auth'
import { startProactiveTokenRefresh, stopProactiveTokenRefresh } from './utils/api'
import { SubscriptionProvider } from './utils/useSubscription'
import { UserProvider } from './utils/useUser'

// Static imports for instant landing & core components
import LandingPage from './LandingPage/LandingPage'
import SideBar from './components/SideBar'
import Header from './components/Header'
import './App.css'

// Core page route imports (Instant load, zero refresh shift)
import HomePage from './HomePage/HomePage'
import ClientPage from './ClientPage/ClientPage'
import PlanningPage from './PlanningPage/PlanningPage'
import MessagesPage from './MessagesPage/MessagesPage'
import SettingsPage from './SettingsPage/SettingsPage'
import RapportsPage from './RapportsPage/RapportsPage'
import ComptabilityPage from './ComptabilityPage/ComptabilityPage'
import FacturesPage from './FacturesPage/FacturesPage'
import DevisPage from './DevisPage/DevisPage'
import PremiumPage from './PremiumPage/PremiumPage'
import CataloguePage from './CataloguePage.jsx/CataloguePage'
import TechniciensPage from './TechniciensPage/TechniciensPage'
import TechnicianInterventionsPage from './TechniciensPage/TechnicianInterventionsPage'
import RegisterPage from './AuthPage/RegisterPage'
import LoginPage from './AuthPage/LoginPage'
import ForgotPasswordPage from './AuthPage/ForgotPasswordPage'
import ResetPasswordPage from './AuthPage/ResetPasswordPage'
import VerifyEmailPage from './AuthPage/VerifyEmailPage'
import SuperAdminPanel from './AdminPage/AdminPage'

import CookieConsentBanner from './components/CookieConsentBanner'
import SubscriptionExpiredModal from './components/SubscriptionExpiredModal'

// Lazy loaded Stripe & Public pages
const CheckoutSubscriptionPage = lazy(() => import('./PublicPages/CheckoutSubscriptionPage'))
const SubscriptionSuccessPage = lazy(() => import('./PublicPages/SubscriptionSuccessPage').then(m => ({ default: m.SubscriptionSuccessPage })))
const SubscriptionCancelPage = lazy(() => import('./PublicPages/SubscriptionSuccessPage').then(m => ({ default: m.SubscriptionCancelPage })))

// Route Guard for Private Pages (Requires valid Auth Token)
function ProtectedRoute({ children }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  if (isSuperAdmin()) {
    return <Navigate to="/admin" replace />;
  }
  return children;
}

// Route Guard for Super Admin Panel (Strictly khalid.cizdoev777@gmail.com or SUPERADMIN)
function AdminProtectedRoute({ children }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  if (!isSuperAdmin()) {
    return <Navigate to="/home" replace />;
  }
  return children;
}

// Route Guard for Public Auth Pages (Redirects to /home if already logged in)
function PublicOnlyRoute({ children }) {
  if (isAuthenticated()) {
    return <Navigate to={isSuperAdmin() ? "/admin" : "/home"} replace />;
  }
  return children;
}

// Smooth Loading Fallback Spinner
function PageLoader() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      width: '100%',
      background: 'var(--background, #0F172A)',
      color: 'var(--foreground, #F8FAFC)',
      gap: 16
    }}>
      <div style={{
        width: 38,
        height: 38,
        border: '3px solid rgba(255,255,255,0.15)',
        borderTopColor: '#3B82F6',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }} />
      <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--muted-foreground, #94A3B8)' }}>
        Chargement de l'application...
      </span>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// Helper component to scroll to top on route navigation
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function App() {
  const location = useLocation();

  // Start proactive token refresh on app load (if already authenticated)
  useEffect(() => {
    if (isAuthenticated()) {
      startProactiveTokenRefresh();
    }
    return () => stopProactiveTokenRefresh();
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark" && location.pathname !== "/") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [location.pathname]);

  return (
    <SubscriptionProvider>
      <UserProvider>
        <ScrollToTop />
        <CookieConsentBanner />
        <SubscriptionExpiredModal />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public Landing Page */}
            <Route path="/" element={<LandingPage />} />

            {/* Protected Private App Routes */}
            <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
            <Route path="/client" element={<ProtectedRoute><ClientPage /></ProtectedRoute>} />
            <Route path="/planning" element={<ProtectedRoute><PlanningPage /></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
            <Route path="/factures" element={<ProtectedRoute><FacturesPage /></ProtectedRoute>} />
            <Route path="/devis" element={<ProtectedRoute><DevisPage /></ProtectedRoute>} />
            <Route path="/rapports" element={<ProtectedRoute><RapportsPage /></ProtectedRoute>} />
            <Route path="/comptabilite" element={<ProtectedRoute><ComptabilityPage /></ProtectedRoute>} />
            <Route path="/catalogue" element={<ProtectedRoute><CataloguePage /></ProtectedRoute>} />
            <Route path="/techniciens" element={<ProtectedRoute><TechniciensPage /></ProtectedRoute>} />
            <Route path="/interventions/today" element={<ProtectedRoute><TechnicianInterventionsPage /></ProtectedRoute>} />
            <Route path="/premium" element={<ProtectedRoute><PremiumPage /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            <Route path="/admin" element={<AdminProtectedRoute><SuperAdminPanel /></AdminProtectedRoute>} />

            {/* Auth Pages (Only accessible if NOT logged in) */}
            <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
            <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />
            <Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPasswordPage /></PublicOnlyRoute>} />
            <Route path="/reset-password" element={<PublicOnlyRoute><ResetPasswordPage /></PublicOnlyRoute>} />
            <Route path="/verify-email" element={<PublicOnlyRoute><VerifyEmailPage /></PublicOnlyRoute>} />

            {/* Subscription Stripe Pages */}
            <Route path="/checkout" element={<ProtectedRoute><CheckoutSubscriptionPage /></ProtectedRoute>} />
            <Route path="/subscription" element={<ProtectedRoute><CheckoutSubscriptionPage /></ProtectedRoute>} />
            <Route path="/subscription/success" element={<ProtectedRoute><SubscriptionSuccessPage /></ProtectedRoute>} />
            <Route path="/subscription/cancel" element={<ProtectedRoute><SubscriptionCancelPage /></ProtectedRoute>} />

            {/* Catch-all Fallback */}
            <Route path="*" element={<Navigate to={isAuthenticated() ? "/home" : "/login"} replace />} />
          </Routes>
        </Suspense>
      </UserProvider>
    </SubscriptionProvider>
  )
}

export default App;
