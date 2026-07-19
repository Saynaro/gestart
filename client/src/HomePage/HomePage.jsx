import React, { useState } from "react";
import { motion } from "framer-motion";
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
    const [activeTab, setActiveTab] = useState("comptabilite");

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
        </div>
    );
}

export default HomePage;