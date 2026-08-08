import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, FileText, Calendar, Users, ArrowRight, X } from "lucide-react";
import "./Homepage.css";

// Layout components
import SideBar from "../components/SideBar";
import Header from "../components/Header";

// Modular dashboard components
import Greeting from "./components/Greeting";
import FinancialStats from "./components/FinancialStats";
import FinancialChart from "./components/FinancialChart";
import DashboardTabs from "./components/DashboardTabs";

// Comptabilité widgets
import FacturesCard from "./components/FacturesCard";
import DevisCard from "./components/DevisCard";
import InterventionsCard from "./components/InterventionsCard";
import PlafondsCard from "./components/PlafondsCard";

// Statistiques widgets
import StatsTab from "./components/StatsTab";

// Productivité widgets
import ProductivityTab from "./components/ProductivityTab";

function HomePage() {
    const location = useLocation();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState("comptabilite");
    const [showOnboarding, setShowOnboarding] = useState(false);

    useEffect(() => {
        if (location.state?.openOnboardingModal) {
            setShowOnboarding(true);
        }
    }, [location.state]);

    // Action Handlers
    const handleConnectUrssaf = () => {
        alert("Action: Connexion avec votre compte Urssaf...");
    };

    const handleConfigureTaux = () => {
        alert("Action: Redirection vers la configuration des taux de cotisations...");
    };

    const handleCreateFacture = () => {
        alert("Action: Création d'une nouvelle facture client...");
    };

    const handleCreateDevis = () => {
        alert("Action: Création d'un nouveau devis...");
    };

    const handlePlanIntervention = () => {
        alert("Action: Planifier une nouvelle intervention...");
    };

    const handleCreateTask = () => {
        alert("Action: Créer une nouvelle tâche de productivité...");
    };

    const handleCreateBoard = () => {
        alert("Action: Configuration d'un nouveau tableau de suivi...");
    };

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
                    {/* Welcome Greeting Section */}
                    <Greeting name="Khalid" />

                    {/* Top Row: Financial Statistics Cards & Interactive Chart */}
                    <div className="dashboard-top-section">
                        <FinancialStats 
                            chiffreAffaires={152.33} 
                            cotisations={31.52} 
                            resultat={120.81} 
                            period="Juillet 2026"
                            onConnectUrssaf={handleConnectUrssaf}
                            onConfigureTaux={handleConfigureTaux}
                        />
                        <FinancialChart />
                    </div>

                    {/* Dashboard Segmented Tabs */}
                    <DashboardTabs activeTab={activeTab} setActiveTab={setActiveTab} />

                    {/* Dynamic Tabs Content panels */}
                    {activeTab === "comptabilite" && (
                        <div className="dashboard-comptabilite-content">
                            <div className="dashboard-bottom-grid">
                                <FacturesCard onCreateFacture={handleCreateFacture} />
                                <DevisCard onCreateDevis={handleCreateDevis} />
                                <InterventionsCard onPlanIntervention={handlePlanIntervention} />
                            </div>
                            <PlafondsCard />
                        </div>
                    )}

                    {activeTab === "statistiques" && (
                        <StatsTab />
                    )}

                    {activeTab === "productivite" && (
                        <ProductivityTab 
                            onCreateTask={handleCreateTask}
                            onCreateBoard={handleCreateBoard}
                        />
                    )}
                </motion.div>
            </div>

            {/* Onboarding Welcome Modal */}
            <AnimatePresence>
                {showOnboarding && (
                    <div className="modal-overlay" style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.65)',
                        backdropFilter: 'blur(8px)',
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px'
                    }}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            style={{
                                background: 'var(--card, #FFFFFF)',
                                borderRadius: '24px',
                                padding: '36px 32px',
                                maxWidth: '520px',
                                width: '100%',
                                border: '1px solid var(--border)',
                                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.25)',
                                position: 'relative'
                            }}
                        >
                            <button
                                onClick={() => setShowOnboarding(false)}
                                style={{
                                    position: 'absolute',
                                    top: '20px',
                                    right: '20px',
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'var(--muted-foreground)'
                                }}
                            >
                                <X size={20} />
                            </button>

                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(85, 107, 47, 0.12)', color: '#556B2F', padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 700, marginBottom: '16px' }}>
                                <Sparkles size={16} /> Bienvenue sur ClimPro CRM
                            </div>

                            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '8px', letterSpacing: '-0.02em' }}>
                                Votre espace d'essai est prêt ! 🚀
                            </h2>
                            <p style={{ color: 'var(--muted-foreground)', fontSize: '0.95rem', marginBottom: '24px', lineHeight: 1.5 }}>
                                Vous bénéficiez de 14 jours d'essai gratuit. Voici les 3 premières actions recommandées pour démarrer :
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
                                <div
                                    onClick={() => { setShowOnboarding(false); navigate('/devis'); }}
                                    style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', border: '1px solid var(--border)', borderRadius: '16px', background: 'var(--input-background, #F4F5F7)', cursor: 'pointer', transition: 'all 0.2s' }}
                                >
                                    <FileText style={{ color: '#556B2F' }} size={22} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Créer mon 1er devis PDF</div>
                                        <div style={{ fontSize: '0.82rem', color: 'var(--muted-foreground)' }}>Générez un devis climatisation ou plomberie en 2 min</div>
                                    </div>
                                    <ArrowRight size={18} style={{ color: 'var(--muted-foreground)' }} />
                                </div>

                                <div
                                    onClick={() => { setShowOnboarding(false); navigate('/planning'); }}
                                    style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', border: '1px solid var(--border)', borderRadius: '16px', background: 'var(--input-background, #F4F5F7)', cursor: 'pointer', transition: 'all 0.2s' }}
                                >
                                    <Calendar style={{ color: '#2563EB' }} size={22} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Planifier une intervention</div>
                                        <div style={{ fontSize: '0.82rem', color: 'var(--muted-foreground)' }}>Ajoutez un rendez-vous d'installation ou dépannage</div>
                                    </div>
                                    <ArrowRight size={18} style={{ color: 'var(--muted-foreground)' }} />
                                </div>

                                <div
                                    onClick={() => { setShowOnboarding(false); navigate('/settings'); }}
                                    style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', border: '1px solid var(--border)', borderRadius: '16px', background: 'var(--input-background, #F4F5F7)', cursor: 'pointer', transition: 'all 0.2s' }}
                                >
                                    <Users style={{ color: '#EAB308' }} size={22} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Inviter mes techniciens</div>
                                        <div style={{ fontSize: '0.82rem', color: 'var(--muted-foreground)' }}>Donnez accès à l'application mobile à votre équipe</div>
                                    </div>
                                    <ArrowRight size={18} style={{ color: 'var(--muted-foreground)' }} />
                                </div>
                            </div>

                            <button
                                onClick={() => setShowOnboarding(false)}
                                style={{
                                    width: '100%',
                                    padding: '14px',
                                    borderRadius: '30px',
                                    border: 'none',
                                    background: 'linear-gradient(135deg, #36451C 0%, #556B2F 100%)',
                                    color: '#FFFFFF',
                                    fontWeight: 700,
                                    fontSize: '1rem',
                                    cursor: 'pointer'
                                }}
                            >
                                Accéder à mon Dashboard
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default HomePage;