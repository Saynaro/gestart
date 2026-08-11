import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function DevisCard({
    draftCount = 0,
    draftAmount = 0.00,
    sentCount = 0,
    sentAmount = 0.00,
    draftDevis = [],
    sentDevis = [],
    onCreateDevis = () => window.location.href = "/devis"
}) {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState(draftCount === 0 && sentCount > 0 ? "sent" : "draft");

    const formatCurrency = (val) => {
        return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(val);
    };

    const activeDevis = activeTab === "draft" ? draftDevis : sentDevis;
    const activeCount = activeTab === "draft" ? draftCount : sentCount;

    return (
        <div className="dashboard-grid-card">
            {/* Card Header */}
            <div className="grid-card-header" onClick={() => navigate("/devis")} style={{ cursor: "pointer" }}>
                <div className="grid-card-title-group">
                    <svg className="grid-card-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <path d="M14 2v6h6" />
                        <path d="M16 13H8" />
                        <path d="M16 17H8" />
                        <path d="M10 9H8" />
                    </svg>
                    <h3>Devis</h3>
                </div>
                <svg className="chevron-right-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
            </div>

            {/* Split Metrics */}
            <div className="card-sub-header-metrics">
                <div 
                    className={`sub-metric-item draft ${activeTab === "draft" ? "active" : ""}`}
                    onClick={() => setActiveTab("draft")}
                >
                    <span className="sub-metric-label">BROUILLONS</span>
                    <span className="sub-metric-count">{draftCount} Devis</span>
                    <span className="sub-metric-amount">{formatCurrency(draftAmount)}</span>
                </div>
                <div 
                    className={`sub-metric-item sent ${activeTab === "sent" ? "active" : ""}`}
                    onClick={() => setActiveTab("sent")}
                >
                    <span className="sub-metric-label">ENVOYÉS</span>
                    <span className="sub-metric-count">{sentCount} Devis</span>
                    <span className="sub-metric-amount">{formatCurrency(sentAmount)}</span>
                </div>
            </div>

            {/* Card Body Illustration & Button or List */}
            <div className="card-list-body">
                {activeCount > 0 ? (
                    <div className="dashboard-mini-list">
                        {activeDevis.map((dev) => (
                            <div key={dev.id} className="dashboard-mini-list-item" onClick={() => navigate(`/devis?id=${dev.id}`)}>
                                <div className="mini-item-left">
                                    <div className="mini-item-primary">{dev.ref}</div>
                                    <div className="mini-item-secondary">{dev.client}</div>
                                </div>
                                <div className="mini-item-right">
                                    <div className="mini-item-amount">{formatCurrency(dev.amount)}</div>
                                    <div className="mini-item-secondary">{dev.date.substring(0, 5)}</div>
                                </div>
                            </div>
                        ))}
                        <div className="card-list-action-row">
                            <button className="btn-card-action" onClick={onCreateDevis}>
                                Créer un devis
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="card-illustration-body">
                        <div className="illustration-wrapper">
                            <svg width="120" height="100" viewBox="0 0 120 100" fill="none">
                                <rect x="35" y="15" width="50" height="70" rx="4" fill="#F4F6F6" stroke="#BDC3C7" strokeWidth="2" />
                                <rect x="47" y="10" width="26" height="10" rx="2" fill="#7F8C8D" />
                                <line x1="45" y1="35" x2="75" y2="35" stroke="#BDC3C7" strokeWidth="2" strokeLinecap="round" />
                                <line x1="45" y1="45" x2="75" y2="45" stroke="#BDC3C7" strokeWidth="2" strokeLinecap="round" />
                                <line x1="45" y1="55" x2="65" y2="55" stroke="#BDC3C7" strokeWidth="2" strokeLinecap="round" />
                                <path d="M95 25 L97 29 L102 29 L98 32 L100 36 L95 33 L90 36 L92 32 L88 29 L93 29 Z" fill="#F1C40F" />
                                <path d="M22 65 L23.5 68 L27 68 L24 70 L25.5 73.5 L22 71 L18.5 73.5 L20 70 L17 68 L20.5 68 Z" fill="#F1C40F" transform="scale(0.8) translate(5, 5)" />
                            </svg>
                        </div>
                        <p className="illustration-text">Aucun devis {activeTab === "draft" ? "brouillon" : "envoyé"}</p>
                        <button className="btn-card-action" onClick={onCreateDevis}>
                            Créer un devis
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default DevisCard;
