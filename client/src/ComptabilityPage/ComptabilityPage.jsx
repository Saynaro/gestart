import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import "./ComptabilityPage.css";

// Layout components
import SideBar from "../components/SideBar";
import Header from "../components/Header";
import PullToRefresh from "../components/PullToRefresh";

// Modular accounting components
import TvaSummary from "./components/TvaSummary";
import UrssafSummary from "./components/UrssafSummary";
import ExportPanel from "./components/ExportPanel";
import ExportHistory from "./components/ExportHistory";

// Icons
import { Landmark, Calculator, FileSpreadsheet, History } from "lucide-react";
import { useSubscription } from "../utils/useSubscription";
import FeatureLockBanner from "../components/FeatureLockBanner";

function ComptabilityPage() {
    const navigate = useNavigate();
    const { isStarter } = useSubscription();
    const [activeSubTab, setActiveSubTab] = useState("tva");
    const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth <= 768);
    const [refreshKey, setRefreshKey] = useState(0);
    const tabRefs = React.useRef({});
    const pillBarRef = React.useRef(null);

    // Auto-scroll active tab into view in the horizontal scrollable bar
    useEffect(() => {
        if (isMobile && tabRefs.current[activeSubTab]) {
            const targetEl = tabRefs.current[activeSubTab];
            targetEl.scrollIntoView({
                behavior: "smooth",
                inline: "center",
                block: "nearest"
            });
        }
    }, [activeSubTab, isMobile]);

    // Detect responsive screen size
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const subTabs = [
        { id: "tva", label: "Résumé TVA", shortLabel: "TVA", icon: Landmark },
        { id: "urssaf", label: "Déclaration URSSAF & Net", shortLabel: "URSSAF & Net", icon: Calculator },
        { id: "export", label: "Export comptable", shortLabel: "Export", icon: FileSpreadsheet },
        { id: "history", label: "Historique exports", shortLabel: "Historique", icon: History }
    ];

    const renderActiveSubPanel = () => {
        switch (activeSubTab) {
            case "tva":
                return <TvaSummary isMobile={isMobile} />;
            case "urssaf":
                return <UrssafSummary isMobile={isMobile} />;
            case "export":
                return <ExportPanel isMobile={isMobile} />;
            case "history":
                return <ExportHistory isMobile={isMobile} />;
            default:
                return <TvaSummary isMobile={isMobile} />;
        }
    };

    return (
        <div className="home-page comptability-page-wrapper">
            <SideBar />
            <div className="main-content">
                <Header />
                <PullToRefresh onRefresh={async () => {
                    setRefreshKey(prev => prev + 1);
                    await new Promise(r => setTimeout(r, 450));
                }}>
                    <motion.div 
                        key={refreshKey}
                        className="page-content"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    >
                        {/* Header line on Desktop */}
                        {!isMobile && (
                            <div className="content-header comptability-header-row">
                                <div className="header-nav-title-group">
                                    <div>
                                        <h1 className="content-title">Comptabilité</h1>
                                        <p className="content-subtitle">
                                            Suivi de TVA, déclaration URSSAF, génération d'exports comptables et synchronisation.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {isMobile ? (
                            /* Mobile View: Clean tab bar + single active panel */
                            <div className="mobile-comptability-container">
                                <div className="mobile-subtabs-pill-bar" ref={pillBarRef}>
                                    {subTabs.map((tab) => {
                                        const TabIcon = tab.icon;
                                        const isActive = activeSubTab === tab.id;
                                        return (
                                            <button
                                                key={tab.id}
                                                ref={(el) => { tabRefs.current[tab.id] = el; }}
                                                type="button"
                                                className={`mobile-subtab-pill ${isActive ? "active" : ""}`}
                                                onClick={() => setActiveSubTab(tab.id)}
                                            >
                                                <TabIcon size={15} />
                                                <span>{tab.shortLabel || tab.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="mobile-subpanel-wrapper">
                                    {renderActiveSubPanel()}
                                </div>
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
                </PullToRefresh>
            </div>
        </div>
    );
}

export default ComptabilityPage;
