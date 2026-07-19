import React, { useState } from "react";
import { FileText, CheckCircle, XCircle, Clock, Percent } from "lucide-react";

function QuotesWidget({ startDate, endDate }) {
    const [viewMode, setViewMode] = useState("funnel"); // 'funnel' or 'stats'

    // Mock quotes data representing the schema state
    const quotesStats = {
        draft: 12,
        sent: 35,
        accepted: 24,
        refused: 6,
        total: 77,
        totalAmountTTC: 92400,
        acceptedAmountTTC: 62400
    };

    const conversionRate = (quotesStats.accepted / (quotesStats.sent + quotesStats.accepted + quotesStats.refused || 1)) * 100;

    // Funnel stats
    const funnelSteps = [
        { label: "Créés / Brouillons", count: quotesStats.total, percentage: 100, color: "#7C7B82" },
        { label: "Envoyés aux clients", count: quotesStats.sent + quotesStats.accepted + quotesStats.refused, percentage: 84, color: "#D97706" },
        { label: "Acceptés (Signés)", count: quotesStats.accepted, percentage: 31, color: "var(--primary)" },
        { label: "Facturés", count: 18, percentage: 23, color: "#1A9E5C" }
    ];

    return (
        <div className="rapports-card quotes-widget">
            <div className="widget-header">
                <div className="title-area">
                    <div className="header-icon-container">
                        <FileText size={18} />
                    </div>
                    <div>
                        <h3>Conversion des Devis</h3>
                        <p className="subtitle">Performance commerciale & devis signés</p>
                    </div>
                </div>
                <div className="widget-toggles">
                    <button 
                        className={`toggle-btn ${viewMode === "funnel" ? "active" : ""}`}
                        onClick={() => setViewMode("funnel")}
                    >
                        Entonnoir
                    </button>
                    <button 
                        className={`toggle-btn ${viewMode === "stats" ? "active" : ""}`}
                        onClick={() => setViewMode("stats")}
                    >
                        Statistiques
                    </button>
                </div>
            </div>

            {/* KPI grid */}
            <div className="kpi-grid">
                <div className="kpi-card">
                    <span className="kpi-label">Devis Créés</span>
                    <span className="kpi-value">{quotesStats.total}</span>
                    <span className="kpi-subtext">Total: {quotesStats.totalAmountTTC.toLocaleString("fr-FR")} €</span>
                </div>
                <div className="kpi-card success-accent">
                    <span className="kpi-label">Taux de Signature</span>
                    <span className="kpi-value text-primary">{conversionRate.toFixed(1)}%</span>
                    <span className="kpi-subtext">Objectif: 60%</span>
                </div>
                <div className="kpi-card">
                    <span className="kpi-label">Devis Signés</span>
                    <span className="kpi-value text-success">{quotesStats.accepted}</span>
                    <span className="kpi-subtext">Volume: {quotesStats.acceptedAmountTTC.toLocaleString("fr-FR")} €</span>
                </div>
                <div className="kpi-card warning-accent">
                    <span className="kpi-label">En Attente</span>
                    <span className="kpi-value text-warning">{quotesStats.sent - quotesStats.accepted - quotesStats.refused || 12}</span>
                    <span className="kpi-subtext">Devis sans réponse</span>
                </div>
            </div>

            <div className="widget-content">
                {viewMode === "stats" ? (
                    <div className="quotes-breakdown">
                        <div className="breakdown-item">
                            <div className="breakdown-details">
                                <span className="label"><Clock size={16} className="text-warning" /> Envoyés & En attente</span>
                                <span className="count">{quotesStats.sent} devis</span>
                            </div>
                            <div className="progress-bar-bg">
                                <div className="progress-bar-fill bg-warning" style={{ width: `${(quotesStats.sent / quotesStats.total) * 100}%` }}></div>
                            </div>
                        </div>

                        <div className="breakdown-item">
                            <div className="breakdown-details">
                                <span className="label"><CheckCircle size={16} className="text-success" /> Acceptés / Signés</span>
                                <span className="count">{quotesStats.accepted} devis</span>
                            </div>
                            <div className="progress-bar-bg">
                                <div className="progress-bar-fill bg-primary" style={{ width: `${(quotesStats.accepted / quotesStats.total) * 100}%` }}></div>
                            </div>
                        </div>

                        <div className="breakdown-item">
                            <div className="breakdown-details">
                                <span className="label"><XCircle size={16} className="text-danger" /> Refusés</span>
                                <span className="count">{quotesStats.refused} devis</span>
                            </div>
                            <div className="progress-bar-bg">
                                <div className="progress-bar-fill bg-danger" style={{ width: `${(quotesStats.refused / quotesStats.total) * 100}%` }}></div>
                            </div>
                        </div>

                        <div className="breakdown-item">
                            <div className="breakdown-details">
                                <span className="label"><FileText size={16} className="text-muted" /> Brouillons (non envoyés)</span>
                                <span className="count">{quotesStats.draft} devis</span>
                            </div>
                            <div className="progress-bar-bg">
                                <div className="progress-bar-fill bg-muted" style={{ width: `${(quotesStats.draft / quotesStats.total) * 100}%` }}></div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="funnel-container">
                        {funnelSteps.map((step, idx) => (
                            <div key={idx} className="funnel-row">
                                <div className="funnel-label-container">
                                    <span className="funnel-step-num">{idx + 1}</span>
                                    <span className="funnel-label">{step.label}</span>
                                </div>
                                <div className="funnel-bar-container">
                                    <div 
                                        className="funnel-bar-fill" 
                                        style={{ 
                                            width: `${step.percentage}%`,
                                            backgroundColor: step.color
                                        }}
                                    >
                                        <span className="funnel-percentage">{step.percentage}%</span>
                                    </div>
                                </div>
                                <div className="funnel-count">
                                    <strong>{step.count}</strong> devis
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default QuotesWidget;
