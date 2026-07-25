import { useEffect } from 'react'
import { motion } from 'framer-motion'
import HomePage from './HomePage/HomePage'
import LandingPage from './LandingPage/LandingPage'
import ClientPage from './ClientPage/ClientPage'
import PlanningPage from './PlanningPage/PlanningPage'
import MessagesPage from './MessagesPage/MessagesPage'
import SideBar from './components/SideBar'
import Header from './components/Header'
import SettingsPage from './SettingsPage/SettingsPage'
import RapportsPage from './RapportsPage/RapportsPage'
import ComptabilityPage from './ComptabilityPage/ComptabilityPage'
import FacturesPage from './FacturesPage/FacturesPage'
import DevisPage from './DevisPage/DevisPage'
import PremiumPage from './PremiumPage/PremiumPage'
import CataloguePage from './CataloguePage.jsx/CataloguePage'
import SignatureQuote from './PublicPages/SignatureQuote'
import PayInvoice from './PublicPages/PayInvoice'
import PublicContact from './PublicPages/PublicContact'
import SuperAdminPanel from './AdminPage/AdminPage'
import './App.css'

import { Routes, Route, useLocation } from 'react-router-dom'

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

// Helper component to prevent browser back gesture / navigation on main pages when no modal is active
const MAIN_APP_ROUTES = [
  "/home",
  "/client",
  "/planning",
  "/messages",
  "/factures",
  "/devis",
  "/rapports",
  "/comptabilite",
  "/catalogue",
  "/premium"
];

function PreventMainPageBack() {
  const { pathname } = useLocation();

  useEffect(() => {
    const currentPath = pathname.toLowerCase();
    if (!MAIN_APP_ROUTES.includes(currentPath)) return;

    // Lock main page history entry so back button/swipe stays on the page when no modal is active
    window.history.pushState({ mainLock: true, path: currentPath }, "", window.location.href);

    const handlePopState = () => {
      // Re-push main lock entry if back is pressed on main page without modal
      window.history.pushState({ mainLock: true, path: currentPath }, "", window.location.href);
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [pathname]);

  return null;
}

function App() {
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  return (
    <>
      <ScrollToTop />
      <PreventMainPageBack />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/client" element={<ClientPage />} />
        <Route path="/planning" element={<PlanningPage />} />
        <Route path="/messages" element={<MessagesPage />} />

        {/* Placeholders for secondary routes to show styling and active states */}
        {/* Factures, Devis, and Premium Pages */}
        <Route path="/factures" element={<FacturesPage />} />
        <Route path="/devis" element={<DevisPage />} />
        <Route path="/rapports" element={<RapportsPage />} />
        <Route path="/comptabilite" element={<ComptabilityPage />} />
        <Route path="/catalogue" element={<CataloguePage />} />
        <Route path="/premium" element={<PremiumPage />} />
        <Route path="/settings" element={<SettingsPage />} />

        {/* Public Pages */}
        <Route path="/sign/quote/:token" element={<SignatureQuote />} />
        <Route path="/pay/invoice/:token" element={<PayInvoice />} />
        <Route path="/contact/:slug" element={<PublicContact />} />

        {/* Admin Page */}
        <Route path="/admin" element={<SuperAdminPanel />} />
      </Routes>
    </>
  )
}

export default App;
