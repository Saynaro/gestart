import { useEffect, lazy, Suspense } from 'react'
import { motion } from 'framer-motion'
import { Routes, Route, useLocation } from 'react-router-dom'

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
import RegisterPage from './AuthPage/RegisterPage'
import LoginPage from './AuthPage/LoginPage'
import ForgotPasswordPage from './AuthPage/ForgotPasswordPage'
import ResetPasswordPage from './AuthPage/ResetPasswordPage'
import VerifyEmailPage from './AuthPage/VerifyEmailPage'
import SuperAdminPanel from './AdminPage/AdminPage'

// Lazy loaded Stripe & Public pages
const SubscriptionSuccessPage = lazy(() => import('./PublicPages/SubscriptionSuccessPage').then(m => ({ default: m.SubscriptionSuccessPage })))
const SubscriptionCancelPage = lazy(() => import('./PublicPages/SubscriptionSuccessPage').then(m => ({ default: m.SubscriptionCancelPage })))

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

function PlaceholderPage({ title, subtitle }) {
  return (
    <div className="home-page">
      <SideBar />
      <div className="main-content">
        <Header />
        <motion.div
          className="page-content"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="content-header">
            <h1 className="content-title">{title}</h1>
            <p className="content-subtitle">{subtitle || "Cette page est en cours de développement."}</p>
          </div>
          <div className="timeline-container" style={{ padding: '40px', textAlign: 'center', color: 'var(--muted-foreground)' }}>
            Fonctionnalité bientôt disponible !
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function App() {
  const location = useLocation();

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark" && location.pathname !== "/") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [location.pathname]);

  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/client" element={<ClientPage />} />
          <Route path="/planning" element={<PlanningPage />} />
          <Route path="/messages" element={<MessagesPage />} />

          {/* Factures, Devis, and Premium Pages */}
          <Route path="/factures" element={<FacturesPage />} />
          <Route path="/devis" element={<DevisPage />} />
          <Route path="/rapports" element={<RapportsPage />} />
          <Route path="/comptabilite" element={<ComptabilityPage />} />
          <Route path="/catalogue" element={<CataloguePage />} />
          <Route path="/premium" element={<PremiumPage />} />
          <Route path="/settings" element={<SettingsPage />} />

          {/* Auth Pages */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />

          {/* Subscription Stripe Pages */}
          <Route path="/subscription/success" element={<SubscriptionSuccessPage />} />
          <Route path="/subscription/cancel" element={<SubscriptionCancelPage />} />

          {/* Admin Page */}
          <Route path="/admin" element={<SuperAdminPanel />} />
        </Routes>
      </Suspense>
    </>
  )
}

export default App;
