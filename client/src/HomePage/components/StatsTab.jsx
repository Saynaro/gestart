import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function StatsTab() {
    const navigate = useNavigate();
    
    // Local state for interactive elements
    const [resultTab, setResultTab] = useState("entrees"); // "entrees" or "sorties"
    const [articleTab, setArticleTab] = useState("recettes"); // "recettes" or "quantites"
    const [clientTab, setClientTab] = useState("recettes"); // "recettes", "attente", "retards"
    
    const [currentMonth, setCurrentMonth] = useState("Juillet • 26");

    return (
        <div className="stats-tab-grid">
            
            {/* Card 1: Résultats */}
            <div className="dashboard-grid-card stats-card-widget">
                <div className="grid-card-header" onClick={() => navigate("/rapports")} style={{ cursor: "pointer" }}>
                    <div className="grid-card-title-group">
                        <svg className="grid-card-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                            <polyline points="17 6 23 6 23 12" />
                        </svg>
                        <h3>Résultats</h3>
                    </div>
                    <svg className="chevron-right-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                </div>

                {/* Period Navigator Control */}
                <div className="stats-period-navigator">
                    <button className="nav-arrow-btn" onClick={() => setCurrentMonth("Juin • 26")} title="Mois précédent">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
                    </button>
                    <span className="period-text">{currentMonth}</span>
                    <button className="nav-arrow-btn" onClick={() => setCurrentMonth("Août • 26")} title="Mois suivant">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                    </button>
                </div>

                {/* Internal sub-tabs */}
                <div className="widget-internal-tabs">
                    <button className={`internal-tab-btn ${resultTab === "entrees" ? "active" : ""}`} onClick={() => setResultTab("entrees")}>
                        Entrées
                    </button>
                    <button className={`internal-tab-btn ${resultTab === "sorties" ? "active" : ""}`} onClick={() => setResultTab("sorties")}>
                        Sorties
                    </button>
                </div>

                {/* Chart body */}
                <div className="widget-chart-body">
                    {/* Ring chart representation */}
                    <div className="donut-chart-container">
                        <svg width="140" height="140" viewBox="0 0 100 100">
                            {/* Track circle */}
                            <circle cx="50" cy="50" r="40" stroke="#F1F5F9" strokeWidth="12" fill="none" />
                            {/* Value Circle */}
                            {resultTab === "entrees" ? (
                                <circle 
                                    cx="50" 
                                    cy="50" 
                                    r="40" 
                                    stroke="#1A9E5C" 
                                    strokeWidth="12" 
                                    fill="none" 
                                    strokeDasharray="251.2" 
                                    strokeDashoffset="0" 
                                    strokeLinecap="round" 
                                />
                            ) : (
                                <circle 
                                    cx="50" 
                                    cy="50" 
                                    r="40" 
                                    stroke="#E11D48" 
                                    strokeWidth="12" 
                                    fill="none" 
                                    strokeDasharray="251.2" 
                                    strokeDashoffset="200" 
                                    strokeLinecap="round" 
                                />
                            )}
                            
                            {/* Center text */}
                            <text x="50" y="52" textAnchor="middle" className="donut-center-text" fill="var(--foreground)">
                                {resultTab === "entrees" ? "152,33 €" : "31,52 €"}
                            </text>
                        </svg>
                        
                        {/* Tiny Piggy icon overlay inside chart */}
                        <div className="donut-icon-badge bg-green-badge">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M19 5c-1.5 0-2.8 1.4-3 2-2.2-1.9-6-1.6-7.5 1-1.2-.6-2.5-.2-3 1-.7.9-.7 2.2 0 3 .2.2.5.4.8.4-.7 1.5 0 3.2 1.2 4 1.5.8 3.5.5 4.8-.5 1.5 1 3.5 1 5 0 1.2 1 3.2.7 4.5-.5 1-.9 1-2.4 0-3.3.3 0 .5-.2.7-.4.9-1.2.6-2.5-.5-3-.3-.7-1.7-2-3-2z"></path>
                            </svg>
                        </div>
                    </div>

                    {/* Footer values list */}
                    <div className="widget-values-footer-list">
                        <div className="value-row-item">
                            <div className="row-label-with-icon">
                                <span className="item-icon-indicator bg-green-light">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <path d="M12 5v14M5 12h14"/>
                                    </svg>
                                </span>
                                <span className="item-label-text">Revenus</span>
                            </div>
                            <span className="item-value-text">{resultTab === "entrees" ? "152,33 €" : "0,00 €"}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Card 2: Articles */}
            <div className="dashboard-grid-card stats-card-widget">
                <div className="grid-card-header" onClick={() => navigate("/catalogue")} style={{ cursor: "pointer" }}>
                    <div className="grid-card-title-group">
                        <svg className="grid-card-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="7" height="7" />
                            <rect x="14" y="3" width="7" height="7" />
                            <rect x="14" y="14" width="7" height="7" />
                            <rect x="3" y="14" width="7" height="7" />
                        </svg>
                        <h3>Articles</h3>
                    </div>
                    <svg className="chevron-right-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                </div>

                {/* Period Navigator */}
                <div className="stats-period-navigator">
                    <span className="period-text">{currentMonth}</span>
                </div>

                {/* Internal sub-tabs */}
                <div className="widget-internal-tabs">
                    <button className={`internal-tab-btn ${articleTab === "recettes" ? "active" : ""}`} onClick={() => setArticleTab("recettes")}>
                        Recettes
                    </button>
                    <button className={`internal-tab-btn ${articleTab === "quantites" ? "active" : ""}`} onClick={() => setArticleTab("quantites")}>
                        Quantités
                    </button>
                </div>

                {/* Chart body */}
                <div className="widget-chart-body">
                    <div className="donut-chart-container">
                        <svg width="140" height="140" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="40" stroke="#F1F5F9" strokeWidth="12" fill="none" />
                            <circle cx="50" cy="50" r="40" stroke="#10B981" strokeWidth="12" fill="none" strokeDasharray="251.2" strokeDashoffset="120" strokeLinecap="round" />
                            
                            <text x="50" y="48" textAnchor="middle" className="donut-center-title" fill="#64748B">
                                Recettes
                            </text>
                            <text x="50" y="62" textAnchor="middle" className="donut-center-subtitle" fill="#94A3B8">
                                -- éléments
                            </text>
                        </svg>
                    </div>

                    <div className="widget-empty-subtext">Aucun article facturé</div>

                    {/* Footer values list */}
                    <div className="widget-values-footer-list border-top">
                        <div className="value-row-item disabled">
                            <div className="row-label-with-icon">
                                <span className="item-dot-indicator bg-green-mid"></span>
                                <div className="row-labels-stacked">
                                    <span className="item-label-text">Article #1</span>
                                    <span className="item-sub-label-text">--% • -- élément</span>
                                </div>
                            </div>
                            <span className="item-value-text">--,-- €</span>
                        </div>
                        <div className="value-row-item disabled">
                            <div className="row-label-with-icon">
                                <span className="item-dot-indicator bg-green-light"></span>
                                <div className="row-labels-stacked">
                                    <span className="item-label-text">Article #2</span>
                                    <span className="item-sub-label-text">--% • -- élément</span>
                                </div>
                            </div>
                            <span className="item-value-text">--,-- €</span>
                        </div>
                        <div className="value-row-item disabled">
                            <div className="row-label-with-icon">
                                <span className="item-dot-indicator bg-green-pale"></span>
                                <div className="row-labels-stacked">
                                    <span className="item-label-text">Article #3</span>
                                    <span className="item-sub-label-text">--% • -- élément</span>
                                </div>
                            </div>
                            <span className="item-value-text">--,-- €</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Card 3: Clients */}
            <div className="dashboard-grid-card stats-card-widget">
                <div className="grid-card-header" onClick={() => navigate("/client")} style={{ cursor: "pointer" }}>
                    <div className="grid-card-title-group">
                        <svg className="grid-card-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                        <h3>Clients</h3>
                    </div>
                    <svg className="chevron-right-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                </div>

                {/* Period Navigator */}
                <div className="stats-period-navigator">
                    <span className="period-text">{currentMonth}</span>
                </div>

                {/* Internal sub-tabs */}
                <div className="widget-internal-tabs">
                    <button className={`internal-tab-btn ${clientTab === "recettes" ? "active" : ""}`} onClick={() => setClientTab("recettes")}>
                        Recettes
                    </button>
                    <button className={`internal-tab-btn ${clientTab === "attente" ? "active" : ""}`} onClick={() => setClientTab("attente")}>
                        En attente
                    </button>
                    <button className={`internal-tab-btn ${clientTab === "retards" ? "active" : ""}`} onClick={() => setClientTab("retards")}>
                        Retards
                    </button>
                </div>

                {/* Chart body */}
                <div className="widget-chart-body">
                    <div className="donut-chart-container">
                        <svg width="140" height="140" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="40" stroke="#F1F5F9" strokeWidth="12" fill="none" />
                            {/* Multicolored segment representation matching screenshot */}
                            <circle cx="50" cy="50" r="40" stroke="#F87171" strokeWidth="12" fill="none" strokeDasharray="30 221.2" strokeDashoffset="0" strokeLinecap="round" />
                            <circle cx="50" cy="50" r="40" stroke="#C084FC" strokeWidth="12" fill="none" strokeDasharray="40 211.2" strokeDashoffset="-30" strokeLinecap="round" />
                            <circle cx="50" cy="50" r="40" stroke="#60A5FA" strokeWidth="12" fill="none" strokeDasharray="60 191.2" strokeDashoffset="-70" strokeLinecap="round" />
                            <circle cx="50" cy="50" r="40" stroke="#2DD4BF" strokeWidth="12" fill="none" strokeDasharray="50 201.2" strokeDashoffset="-130" strokeLinecap="round" />
                            <circle cx="50" cy="50" r="40" stroke="#4ADE80" strokeWidth="12" fill="none" strokeDasharray="40 211.2" strokeDashoffset="-180" strokeLinecap="round" />

                            <text x="50" y="48" textAnchor="middle" className="donut-center-title" fill="#64748B">
                                Recettes
                            </text>
                            <text x="50" y="62" textAnchor="middle" className="donut-center-subtitle" fill="#94A3B8">
                                -- éléments
                            </text>
                        </svg>
                    </div>

                    <div className="widget-empty-subtext">Aucune facture en attente</div>

                    {/* Footer values list */}
                    <div className="widget-values-footer-list border-top">
                        <div className="value-row-item disabled">
                            <div className="row-label-with-icon">
                                <span className="item-dot-indicator bg-blue-light"></span>
                                <div className="row-labels-stacked">
                                    <span className="item-label-text">Client #1</span>
                                    <span className="item-sub-label-text">--% • -- élément</span>
                                </div>
                            </div>
                            <span className="item-value-text">--,-- €</span>
                        </div>
                        <div className="value-row-item disabled">
                            <div className="row-label-with-icon">
                                <span className="item-dot-indicator bg-pink-light"></span>
                                <div className="row-labels-stacked">
                                    <span className="item-label-text">Client #2</span>
                                    <span className="item-sub-label-text">--% • -- élément</span>
                                </div>
                            </div>
                            <span className="item-value-text">--,-- €</span>
                        </div>
                        <div className="value-row-item disabled">
                            <div className="row-label-with-icon">
                                <span className="item-dot-indicator bg-teal-light"></span>
                                <div className="row-labels-stacked">
                                    <span className="item-label-text">Client #3</span>
                                    <span className="item-sub-label-text">--% • -- élément</span>
                                </div>
                            </div>
                            <span className="item-value-text">--,-- €</span>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}

export default StatsTab;
