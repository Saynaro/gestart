import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function FacturesCard({
    enRetardCount = 0,
    enRetardAmount = 0.00,
    enAttenteCount = 0,
    enAttenteAmount = 0.00,
    pendingInvoices = [],
    overdueInvoices = [],
    onCreateFacture = () => window.location.href = "/factures"
}) {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState(enRetardCount === 0 && enAttenteCount > 0 ? "attente" : "retard");

    const formatCurrency = (val) => {
        return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(val);
    };

    const activeInvoices = activeTab === "retard" ? overdueInvoices : pendingInvoices;
    const activeCount = activeTab === "retard" ? enRetardCount : enAttenteCount;

    return (
        <div className="dashboard-grid-card">
            {/* Card Header */}
            <div className="grid-card-header" onClick={() => navigate("/factures")} style={{ cursor: "pointer" }}>
                <div className="grid-card-title-group">
                    <svg className="grid-card-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                    </svg>
                    <h3>Factures</h3>
                </div>
                <svg className="chevron-right-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
            </div>

            {/* Split Metrics */}
            <div className="card-sub-header-metrics">
                <div 
                    className={`sub-metric-item retard ${activeTab === "retard" ? "active" : ""}`}
                    onClick={() => setActiveTab("retard")}
                >
                    <span className="sub-metric-label">EN RETARD</span>
                    <span className="sub-metric-count">{enRetardCount} Facture{enRetardCount !== 1 ? "s" : ""}</span>
                    <span className="sub-metric-amount">{formatCurrency(enRetardAmount)}</span>
                </div>
                <div 
                    className={`sub-metric-item attente ${activeTab === "attente" ? "active" : ""}`}
                    onClick={() => setActiveTab("attente")}
                >
                    <span className="sub-metric-label">EN ATTENTE</span>
                    <span className="sub-metric-count">{enAttenteCount} Facture{enAttenteCount !== 1 ? "s" : ""}</span>
                    <span className="sub-metric-amount">{formatCurrency(enAttenteAmount)}</span>
                </div>
            </div>

            {/* Card Body Illustration & Button or List */}
            <div className="card-list-body">
                {activeCount > 0 ? (
                    <div className="dashboard-mini-list">
                        {activeInvoices.map((inv) => {
                            const refLabel = inv.ref || inv.number || "Facture";
                            const clientLabel = inv.client || inv.clientName || "Client";
                            const amountVal = Number(inv.amount || inv.totalTtc || 0);
                            const dueDate = inv.dueAt || inv.due;
                            const formattedDue = dueDate ? new Date(dueDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }) : null;

                            return (
                                <div key={inv.id} className="dashboard-mini-list-item" onClick={() => navigate(`/factures?id=${inv.id}`)}>
                                    <div className="mini-item-left">
                                        <div className="mini-item-primary">{refLabel}</div>
                                        <div className="mini-item-secondary">{clientLabel}</div>
                                    </div>
                                    <div className="mini-item-right">
                                        <div className="mini-item-amount">{formatCurrency(amountVal)}</div>
                                        <div className="mini-item-secondary">{formattedDue ? `Éch: ${formattedDue}` : "—"}</div>
                                    </div>
                                </div>
                            );
                        })}
                        <div className="card-list-action-row">
                            <button className="btn-card-action" onClick={onCreateFacture}>
                                Créer une facture
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="card-illustration-body">
                        {/* SVG Girl Meditating */}
                        <div className="illustration-wrapper">
                            <svg width="120" height="100" viewBox="0 0 120 100" fill="none">
                                <path d="M20 70 C20 40, 45 40, 45 70 Z" fill="#EAECEE" opacity="0.6" />
                                <path d="M80 75 C85 50, 105 50, 100 75 Z" fill="#EAECEE" opacity="0.6" />
                                <path d="M35 75 C45 65, 75 65, 85 75 C80 80, 40 80, 35 75 Z" fill="#2E4057" />
                                <path d="M50 50 L70 50 L65 72 L55 72 Z" fill="#2E4057" />
                                <circle cx="60" cy="38" r="10" fill="#AED6F1" />
                                <path d="M60 28 C64 22, 70 25, 68 31" stroke="#2E4057" strokeWidth="3" strokeLinecap="round" />
                                <path d="M48 55 C42 62, 45 68, 52 70" stroke="#2E4057" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                                <path d="M72 55 C78 62, 75 68, 68 70" stroke="#2E4057" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                                <circle cx="52" cy="70" r="2.5" fill="#AED6F1" />
                                <circle cx="68" cy="70" r="2.5" fill="#AED6F1" />
                                <circle cx="32" cy="40" r="1.5" fill="#5DADE2" opacity="0.8" />
                                <circle cx="88" cy="35" r="2" fill="#5DADE2" opacity="0.8" />
                                <circle cx="60" cy="18" r="1" fill="#5DADE2" />
                            </svg>
                        </div>
                        <p className="illustration-text">Aucune facture {activeTab === "retard" ? "en retard" : "en attente"}</p>
                        <button className="btn-card-action" onClick={onCreateFacture}>
                            Créer une facture
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default FacturesCard;
