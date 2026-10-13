import { useEffect, lazy, Suspense } from 'react'
import { motion } from 'framer-motion'
import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { isAuthenticated, isSuperAdmin } from './utils/auth'
import { startProactiveTokenRefresh, stopProactiveTokenRefresh } from './utils/api'
import { SubscriptionProvider } from './utils/useSubscription'
import { UserProvider, useUser } from './utils/useUser'
import { initTheme, getEffectiveTheme } from './utils/theme'

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
import PaymentsPage from './PaymentsPage/PaymentsPage'
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
import OAuthCallbackPage from './AuthPage/OAuthCallbackPage'
import SuperAdminPanel from './AdminPage/AdminPage'

import CookieConsentBanner from './components/CookieConsentBanner'
import SubscriptionExpiredModal from './components/SubscriptionExpiredModal'
import PlanUpgradeModal from './components/PlanUpgradeModal'
import PWASplashScreen from './components/PWASplashScreen'

// Lazy loaded Stripe & Public pages
const CheckoutSubscriptionPage = lazy(() => import('./PublicPages/CheckoutSubscriptionPage'))
const SubscriptionSuccessPage = lazy(() => import('./PublicPages/SubscriptionSuccessPage').then(m => ({ default: m.SubscriptionSuccessPage })))
const SubscriptionCancelPage = lazy(() => import('./PublicPages/SubscriptionSuccessPage').then(m => ({ default: m.SubscriptionCancelPage })))
const PayInvoice = lazy(() => import('./PublicPages/PayInvoice'))
const SignatureQuote = lazy(() => import('./PublicPages/SignatureQuote'))
const PublicContact = lazy(() => import('./PublicPages/PublicContact'))
const PaySuccessPage = lazy(() => import('./PublicPages/PaySuccessPage'))

// Legal Pages (Standalone Minimalist Pages)
const MentionsLegalesPage = lazy(() => import('./LegalPages/MentionsLegalesPage'))
const CguPage = lazy(() => import('./LegalPages/CguPage'))
const ConfidentialitePage = lazy(() => import('./LegalPages/ConfidentialitePage'))
const DpaPage = lazy(() => import('./LegalPages/DpaPage'))
const CookiesPage = lazy(() => import('./LegalPages/CookiesPage'))

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

// Route Guard for Manager / Owner Pages (Blocks Technicians from financial/administrative pages)
function ManagerOrOwnerRoute({ children }) {
  const { role, loading } = useUser();
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  if (isSuperAdmin()) {
    return <Navigate to="/admin" replace />;
  }
  if (!loading && role === "TECHNICIAN") {
    return <Navigate to="/interventions/today" replace />;
  }
  return children;
}

// Route Guard for Technician Pages (Redirects Owners/Admins back to /home)
function TechnicianRoute({ children }) {
  const { role, loading } = useUser();
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  if (isSuperAdmin()) {
    return <Navigate to="/admin" replace />;
  }
  if (!loading && role !== "TECHNICIAN") {
    return <Navigate to="/home" replace />;
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

// Route Guard for Public Auth Pages (Redirects to /home or role dashboard if already logged in)
function PublicOnlyRoute({ children }) {
  const { role, loading } = useUser();
  if (isAuthenticated()) {
    if (isSuperAdmin()) {
      return <Navigate to="/admin" replace />;
    }
    if (!loading && role === "TECHNICIAN") {
      return <Navigate to="/interventions/today" replace />;
    }
    return <Navigate to="/home" replace />;
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

  // Handle BFCache (browser Back/Forward cache navigation) to prevent stale role/session display
  useEffect(() => {
    const handlePageShow = (event) => {
      if (event.persisted) {
        window.dispatchEvent(new CustomEvent('userProfileChanged'));
        const publicRoutes = ['/login', '/register', '/forgot-password', '/reset-password', '/'];
        const isAuth = isAuthenticated();
        if (!isAuth && !publicRoutes.includes(location.pathname) && !location.pathname.startsWith('/pay/') && !location.pathname.startsWith('/sign/') && !location.pathname.startsWith('/contact/')) {
          window.location.replace('/login');
        } else if (isAuth && (location.pathname === '/login' || location.pathname === '/register' || location.pathname === '/forgot-password' || location.pathname === '/reset-password')) {
          window.location.replace('/home');
        }
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, [location.pathname]);

  // Fix iOS Safari virtual keyboard: after input blur, scroll body back to top
  // This prevents the "grey gap at bottom" when the virtual keyboard hides
  useEffect(() => {
    const handleFocusOut = (event) => {
      const tag = event.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        setTimeout(() => {
          document.documentElement.scrollTop = 0;
          document.body.scrollTop = 0;
        }, 100);
      }
    };
    document.addEventListener('focusout', handleFocusOut);
    return () => document.removeEventListener('focusout', handleFocusOut);
  }, []);

  // Initialize theme and system OS theme listener globally
  useEffect(() => {
    initTheme();
  }, []);

  // Ensure theme applies correctly across page navigation (always light for landing & auth pages)
  useEffect(() => {
    const isAlwaysLight =
      location.pathname === "/" ||
      location.pathname.startsWith("/login") ||
      location.pathname.startsWith("/register") ||
      location.pathname.startsWith("/forgot-password") ||
      location.pathname.startsWith("/reset-password") ||
      location.pathname.startsWith("/verify-email") ||
      location.pathname.startsWith("/auth") ||
      location.pathname.startsWith("/mentions") ||
      location.pathname.startsWith("/cgu") ||
      location.pathname.startsWith("/cgv") ||
      location.pathname.startsWith("/terms") ||
      location.pathname.startsWith("/confidentialite") ||
      location.pathname.startsWith("/rgpd") ||
      location.pathname.startsWith("/privacy") ||
      location.pathname.startsWith("/cookies");

    if (isAlwaysLight) {
      document.documentElement.classList.remove("dark");
    } else {
      const mode = localStorage.getItem("theme_mode") || (localStorage.getItem("theme") === "dark" ? "dark" : (localStorage.getItem("theme") === "light" ? "light" : "system"));
      if (getEffectiveTheme(mode) === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  }, [location.pathname]);

  return (
    <SubscriptionProvider>
      <UserProvider>
        <PWASplashScreen />
        <ScrollToTop />
        <CookieConsentBanner />
        <SubscriptionExpiredModal />
        <PlanUpgradeModal />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public Landing Page (Redirects to /home if already logged in) */}
            <Route path="/" element={<PublicOnlyRoute><LandingPage /></PublicOnlyRoute>} />

            {/* Protected Private App Routes */}
            <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
            <Route path="/client" element={<ProtectedRoute><ClientPage /></ProtectedRoute>} />
            <Route path="/planning" element={<ProtectedRoute><PlanningPage /></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
            <Route path="/factures" element={<ManagerOrOwnerRoute><FacturesPage /></ManagerOrOwnerRoute>} />
            <Route path="/payments" element={<ManagerOrOwnerRoute><PaymentsPage /></ManagerOrOwnerRoute>} />
            <Route path="/devis" element={<ManagerOrOwnerRoute><DevisPage /></ManagerOrOwnerRoute>} />
            <Route path="/rapports" element={<ManagerOrOwnerRoute><RapportsPage /></ManagerOrOwnerRoute>} />
            <Route path="/comptabilite" element={<ManagerOrOwnerRoute><ComptabilityPage /></ManagerOrOwnerRoute>} />
            <Route path="/catalogue" element={<ProtectedRoute><CataloguePage /></ProtectedRoute>} />
            <Route path="/techniciens" element={<ManagerOrOwnerRoute><TechniciensPage /></ManagerOrOwnerRoute>} />
            <Route path="/interventions/today" element={<TechnicianRoute><TechnicianInterventionsPage /></TechnicianRoute>} />
            <Route path="/premium" element={<ManagerOrOwnerRoute><PremiumPage /></ManagerOrOwnerRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            <Route path="/admin" element={<AdminProtectedRoute><SuperAdminPanel /></AdminProtectedRoute>} />

            {/* Auth Pages */}
            <Route path="/auth/callback" element={<OAuthCallbackPage />} />
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

            {/* Public Client Portals (No login required) */}
            <Route path="/pay/invoice/:token" element={<PayInvoice />} />
            <Route path="/factures/:id" element={<PayInvoice />} />
            <Route path="/pay/success" element={<PaySuccessPage />} />
            <Route path="/sign/quote/:token" element={<SignatureQuote />} />
            <Route path="/sign/success" element={<PaySuccessPage />} />
            <Route path="/devis/:id" element={<SignatureQuote />} />
            <Route path="/contact/:companySlug" element={<PublicContact />} />
            {/* Standalone Legal Pages (Publicly accessible) */}
            <Route path="/mentions-legales" element={<MentionsLegalesPage />} />
            <Route path="/mentions" element={<MentionsLegalesPage />} />
            <Route path="/cgu" element={<CguPage />} />
            <Route path="/cgv" element={<CguPage />} />
            <Route path="/terms" element={<CguPage />} />
            <Route path="/confidentialite" element={<ConfidentialitePage />} />
            <Route path="/rgpd" element={<ConfidentialitePage />} />
            <Route path="/privacy" element={<ConfidentialitePage />} />
            <Route path="/dpa" element={<DpaPage />} />
            <Route path="/accord-sous-traitance" element={<DpaPage />} />
            <Route path="/cookies" element={<CookiesPage />} />

            {/* Catch-all Fallback */}
            <Route path="*" element={<Navigate to={isAuthenticated() ? "/home" : "/login"} replace />} />
          </Routes>
        </Suspense>
      </UserProvider>
    </SubscriptionProvider>
  )
}

export default App;
