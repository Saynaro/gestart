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
            🚀 Fonctionnalité bientôt disponible !
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/client" element={<ClientPage />} />
        <Route path="/planning" element={<PlanningPage />} />
        <Route path="/messages" element={<MessagesPage />} />

        {/* Placeholders for secondary routes to show styling and active states */}
        <Route path="/factures" element={<PlaceholderPage title="Factures" subtitle="Gérez vos factures et règlements clients." />} />
        <Route path="/devis" element={<PlaceholderPage title="Devis" subtitle="Créez et envoyez vos propositions commerciales." />} />
        <Route path="/rapports" element={<PlaceholderPage title="Rapports" subtitle="Analysez les performances de votre activité." />} />
        <Route path="/comptabilite" element={<PlaceholderPage title="Comptabilité" subtitle="Suivi des écritures comptables et bilan." />} />
        <Route path="/catalogue" element={<PlaceholderPage title="Catalogue" subtitle="Gérez vos produits, prestations et tarifs." />} />
        <Route path="/premium" element={<PlaceholderPage title="Premium" subtitle="Découvrez les fonctionnalités ClimPro Pro." />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </>
  )
}

export default App;
