import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function StatsTab({
    revenueThisMonth = 0,
    cotisationsThisMonth = 0,
    topArticles = [],
    topClients = [],
    pendingInvoices = [],
    overdueInvoices = []
}) {
    const navigate = useNavigate();
    
    // Local state for interactive elements
    const [resultTab, setResultTab] = useState("entrees"); // "entrees" or "sorties"
    const [articleTab, setArticleTab] = useState("recettes"); // "recettes" or "quantites"
    const [clientTab, setClientTab] = useState("recettes"); // "recettes", "attente", "retards"
    
    const now = new Date();
    const monthNamesFr = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
    const currentMonthLabel = `${monthNamesFr[now.getMonth()]} • ${String(now.getFullYear()).slice(-2)}`;

    const formatCurrency = (val) => {
        return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(val || 0);
    };

    // Card 1 values
    const currentResultValue = resultTab === "entrees" ? revenueThisMonth : cotisationsThisMonth;

    // Card 2 articles
    const totalArticlesAmount = topArticles.reduce((sum, a) => sum + (a.totalAmount || 0), 0);
    const totalArticlesCount = topArticles.reduce((sum, a) => sum + (a.count || 0), 0);

    // Card 3 clients
    const displayedClientsList = clientTab === "recettes"
        ? topClients
        : clientTab === "attente"
        ? pendingInvoices.slice(0, 5).map(inv => ({ name: inv.clientName || 'Client', totalAmount: inv.totalTtc, count: 1 }))
        : overdueInvoices.slice(0, 5).map(inv => ({ name: inv.clientName || 'Client', totalAmount: inv.totalTtc, count: 1 }));

    const totalClientsAmount = displayedClientsList.reduce((sum, c) => sum + (c.totalAmount || 0), 0);

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
                    <span className="period-text">{currentMonthLabel}</span>
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
                    <div className="donut-chart-container">
                        <svg width="140" height="140" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="40" stroke="#F1F5F9" strokeWidth="12" fill="none" />
                            <circle 
                                cx="50" 
                                cy="50" 
                                r="40" 
                                stroke={resultTab === "entrees" ? "#1A9E5C" : "#E11D48"} 
                                strokeWidth="12" 
                                fill="none" 
                                strokeDasharray="251.2" 
                                strokeDashoffset={currentResultValue > 0 ? "0" : "251.2"} 
                                strokeLinecap="round" 
                            />
                            <text x="50" y="52" textAnchor="middle" className="donut-center-text" fill="var(--foreground)">
                                {formatCurrency(currentResultValue)}
                            </text>
                        </svg>
                    </div>

                    {/* Footer values list */}
                    <div className="widget-values-footer-list">
                        <div className="value-row-item">
                            <div className="row-label-with-icon">
                                <span className={`item-icon-indicator ${resultTab === "entrees" ? "bg-green-light" : "bg-pink"}`}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <path d="M12 5v14M5 12h14"/>
                                    </svg>
                                </span>
                                <span className="item-label-text">{resultTab === "entrees" ? "Revenus TTC" : "Cotisations estimées"}</span>
                            </div>
                            <span className="item-value-text">{formatCurrency(currentResultValue)}</span>
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
                    <span className="period-text">{currentMonthLabel}</span>
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
                            <circle cx="50" cy="50" r="40" stroke="#10B981" strokeWidth="12" fill="none" strokeDasharray="251.2" strokeDashoffset={topArticles.length > 0 ? "80" : "251.2"} strokeLinecap="round" />
                            
                            <text x="50" y="48" textAnchor="middle" className="donut-center-title" fill="#64748B">
                                {articleTab === "recettes" ? "Recettes" : "Quantités"}
                            </text>
                            <text x="50" y="62" textAnchor="middle" className="donut-center-subtitle" fill="#94A3B8">
                                {articleTab === "recettes" ? formatCurrency(totalArticlesAmount) : `${totalArticlesCount} éléments`}
                            </text>
                        </svg>
                    </div>

                    {topArticles.length === 0 ? (
                        <div className="widget-empty-subtext">Aucun article facturé</div>
                    ) : (
                        <div className="widget-values-footer-list border-top">
                            {topArticles.slice(0, 3).map((art, idx) => {
                                const percent = totalArticlesAmount > 0 ? Math.round((art.totalAmount / totalArticlesAmount) * 100) : 0;
                                const dotColors = ["bg-green-mid", "bg-green-light", "bg-green-pale"];
                                return (
                                    <div key={idx} className="value-row-item">
                                        <div className="row-label-with-icon">
                                            <span className={`item-dot-indicator ${dotColors[idx] || "bg-green-mid"}`}></span>
                                            <div className="row-labels-stacked">
                                                <span className="item-label-text" style={{ maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                    {art.name}
                                                </span>
                                                <span className="item-sub-label-text">{percent}% • {art.count} élément{art.count > 1 ? 's' : ''}</span>
                                            </div>
                                        </div>
                                        <span className="item-value-text">{formatCurrency(art.totalAmount)}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
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
                    <span className="period-text">{currentMonthLabel}</span>
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
                            {displayedClientsList.length > 0 ? (
                                <circle cx="50" cy="50" r="40" stroke="#60A5FA" strokeWidth="12" fill="none" strokeDasharray="251.2" strokeDashoffset="60" strokeLinecap="round" />
                            ) : null}

                            <text x="50" y="48" textAnchor="middle" className="donut-center-title" fill="#64748B">
                                {clientTab === "recettes" ? "Recettes" : clientTab === "attente" ? "En attente" : "En retard"}
                            </text>
                            <text x="50" y="62" textAnchor="middle" className="donut-center-subtitle" fill="#94A3B8">
                                {formatCurrency(totalClientsAmount)}
                            </text>
                        </svg>
                    </div>

                    {displayedClientsList.length === 0 ? (
                        <div className="widget-empty-subtext">
                            {clientTab === "recettes" ? "Aucun encaissement client" : clientTab === "attente" ? "Aucune facture en attente" : "Aucune facture en retard"}
                        </div>
                    ) : (
                        <div className="widget-values-footer-list border-top">
                            {displayedClientsList.slice(0, 3).map((client, idx) => {
                                const percent = totalClientsAmount > 0 ? Math.round((client.totalAmount / totalClientsAmount) * 100) : 0;
                                const dotColors = ["bg-blue-light", "bg-pink-light", "bg-teal-light"];
                                return (
                                    <div key={idx} className="value-row-item">
                                        <div className="row-label-with-icon">
                                            <span className={`item-dot-indicator ${dotColors[idx] || "bg-blue-light"}`}></span>
                                            <div className="row-labels-stacked">
                                                <span className="item-label-text" style={{ maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                    {client.name}
                                                </span>
                                                <span className="item-sub-label-text">{percent}% • {client.count} facture{client.count > 1 ? 's' : ''}</span>
                                            </div>
                                        </div>
                                        <span className="item-value-text">{formatCurrency(client.totalAmount)}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
}

export default StatsTab;
