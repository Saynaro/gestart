import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import "./ComptabilityPage.css";

// Layout components
import SideBar from "../components/SideBar";
import Header from "../components/Header";

// Modular accounting components
import TvaSummary from "./components/TvaSummary";
import ExportPanel from "./components/ExportPanel";
import ExportHistory from "./components/ExportHistory";
import AccountingIntegration from "./components/AccountingIntegration";

// Icons
import { ArrowLeft, Landmark, FileSpreadsheet, History, Link2 } from "lucide-react";

function ComptabilityPage() {
    const navigate = useNavigate();
    const [activeSubTab, setActiveSubTab] = useState("tva");
    const [isMobile, setIsMobile] = useState(false);

    // Detect responsive screen size
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        handleResize(); // run initial
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const subTabs = [
        { id: "tva", label: "Résumé TVA", icon: Landmark },
        { id: "export", label: "Export comptable", icon: FileSpreadsheet },
        { id: "history", label: "Historique exports", icon: History },
        { id: "integration", label: "Intégration comptable", icon: Link2 }
    ];

    const renderActiveSubPanel = () => {
        switch (activeSubTab) {
            case "tva":
                return <TvaSummary />;
            case "export":
                return <ExportPanel />;
            case "history":
                return <ExportHistory />;
            case "integration":
                return <AccountingIntegration />;
            default:
                return <TvaSummary />;
        }
    };

    return (
        <div className="home-page comptability-page-wrapper">
            <SideBar />
            <div className="main-content">
                <Header />
                <motion.div 
                    className="page-content"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                    {/* Header line */}
                    <div className="content-header comptability-header-row">
                        <div className="header-nav-title-group">
                            {isMobile && (
                                <button className="mobile-back-btn" onClick={() => navigate("/home")}>
                                    <ArrowLeft size={18} />
                                </button>
                            )}
                            <div>
                                {!isMobile && <h1 className="content-title">Comptabilité</h1>}
                                <p className="content-subtitle">
                                    Suivi de TVA, génération d'exports comptables et synchronisation.
                                </p>
                            </div>
                        </div>
                    </div>

                    {isMobile ? (
                        /* Mobile View: Scrollable vertical stack of all widgets */
                        <div className="mobile-comptability-stack">
                            <TvaSummary />
                            <ExportPanel />
                            <ExportHistory />
                            <AccountingIntegration />
                        </div>
                    ) : (
                        /* Desktop View: Tabbed left-navigation and right-content layout */
                        <div className="desktop-comptability-layout">
                            <div className="comptability-nav-sidebar">
                                <ul className="comptability-nav-menu">
                                    {subTabs.map((tab) => {
                                        const TabIcon = tab.icon;
                                        return (
                                            <li key={tab.id}>
                                                <button
                                                    className={`comptability-nav-item ${activeSubTab === tab.id ? "active" : ""}`}
                                                    onClick={() => setActiveSubTab(tab.id)}
                                                >
                                                    <TabIcon size={16} className="nav-icon" />
                                                    <span>{tab.label}</span>
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>

                            <div className="comptability-content-panel">
                                {renderActiveSubPanel()}
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
}

export default ComptabilityPage;
