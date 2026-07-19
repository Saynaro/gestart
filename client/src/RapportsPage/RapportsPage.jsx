import React, { useState } from "react";
import { motion } from "framer-motion";
import "./RapportsPage.css";

// Layout components
import SideBar from "../components/SideBar";
import Header from "../components/Header";

// Modular report components
import DateRangeSelector from "./components/DateRangeSelector";
import RevenueWidget from "./components/RevenueWidget";
import QuotesWidget from "./components/QuotesWidget";
import InterventionsWidget from "./components/InterventionsWidget";
import ClientSmsWidget from "./components/ClientSmsWidget";

function RapportsPage() {
    // Shared Date Filter State
    const [datePreset, setDatePreset] = useState("last_3_months");
    
    // Default: Last 3 months formatted YYYY-MM-DD
    const getDefaultStart = () => {
        const d = new Date();
        const start = new Date(d.getFullYear(), d.getMonth() - 2, 1);
        return start.toISOString().split("T")[0];
    };
    
    const getDefaultEnd = () => {
        const d = new Date();
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        return end.toISOString().split("T")[0];
    };

    const [startDate, setStartDate] = useState(getDefaultStart());
    const [endDate, setEndDate] = useState(getDefaultEnd());

    const handleRangeChange = (presetId, start, end) => {
        setDatePreset(presetId);
        setStartDate(start);
        setEndDate(end);
    };

    return (
        <div className="home-page rapports-page-wrapper">
            <SideBar />
            <div className="main-content">
                <Header />
                <motion.div 
                    className="page-content"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                    {/* Header section with page title & date selector */}
                    <div className="content-header reports-header-row">
                        <div>
                            <h1 className="content-title">Analyses & Rapports</h1>
                            <p className="content-subtitle">
                                Suivi en temps réel de votre chiffre d'affaires, devis, interventions et clients.
                            </p>
                        </div>
                        <DateRangeSelector 
                            activePreset={datePreset}
                            onRangeChange={handleRangeChange}
                            startDate={startDate}
                            endDate={endDate}
                        />
                    </div>

                    {/* Dashboard Layout Grid */}
                    <div className="rapports-dashboard-grid">
                        <div className="grid-full-width">
                            <RevenueWidget startDate={startDate} endDate={endDate} />
                        </div>
                        <div className="grid-two-columns">
                            <QuotesWidget startDate={startDate} endDate={endDate} />
                            <InterventionsWidget startDate={startDate} endDate={endDate} />
                        </div>
                        <div className="grid-full-width">
                            <ClientSmsWidget startDate={startDate} endDate={endDate} />
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

export default RapportsPage;
