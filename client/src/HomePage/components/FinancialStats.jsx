import React, { useState } from "react";
import { HelpCircle } from "lucide-react";

function StatTooltip({ title, text }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <span 
            style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
        >
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className="stat-info-btn blue-icon"
                style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                title={title}
            >
                <HelpCircle size={16} />
            </button>

            {isOpen && (
                <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        position: 'absolute',
                        bottom: '125%',
                        right: 0,
                        width: '260px',
                        backgroundColor: '#1E293B',
                        color: '#F8FAFC',
                        padding: '12px 14px',
                        borderRadius: '10px',
                        boxShadow: '0 12px 30px rgba(0,0,0,0.35)',
                        zIndex: 99999,
                        fontSize: '0.78rem',
                        lineHeight: '1.45',
                        textAlign: 'left'
                    }}
                >
                    {title && <div style={{ fontWeight: 700, marginBottom: '4px', color: '#60A5FA', fontSize: '0.82rem' }}>{title}</div>}
                    <div style={{ color: '#CBD5E1', fontSize: '0.75rem' }}>{text}</div>
                </div>
            )}
        </span>
    );
}

function FinancialStats({ 
    chiffreAffaires = 152.33, 
    cotisations = 31.52, 
    resultat = 120.81, 
    period = "Juillet 2026",
    onConnectUrssaf = () => window.location.href = "/comptabilite",
    onConfigureTaux = () => window.location.href = "/settings"
}) {
    // Format helper
    const formatCurrency = (val) => {
        return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(val);
    };

    return (
        <div className="financial-stats-section">
            <div className="financial-stat-card">
                <div className="stat-card-title-row">
                    <span className="stat-card-label">Chiffre d'affaires</span>
                    <StatTooltip
                        title="Chiffre d'affaires (CA)"
                        text="Cumul de tous vos encaissements encaissés ou facturés sur la période sélectionnée (Hors Taxes si assujetti à la TVA, ou TTC en franchise de TVA)."
                    />
                </div>
                <div className="stat-card-value">{formatCurrency(chiffreAffaires)}</div>
                <div className="stat-card-period">{period}</div>
            </div>

            <div className="financial-stat-card">
                <div className="stat-card-title-row">
                    <span className="stat-card-label">Cotisations sociales</span>
                    <div className="stat-actions-group">
                        <button className="stat-gear-btn" title="Paramètres des cotisations" onClick={onConfigureTaux}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="3"></circle>
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                            </svg>
                        </button>
                        <StatTooltip
                            title="Cotisations sociales (Urssaf)"
                            text="Montant estimé des charges sociales à déclarer et verser à l'Urssaf. Calculé selon votre taux d'imposition (ex: 21,2% en prestation de services, 12,3% en vente) basé sur votre chiffre d'affaires."
                        />
                    </div>
                </div>
                <div className="stat-card-value">{formatCurrency(cotisations)}</div>
                <div className="stat-card-period">{period}</div>
            </div>

            <div className="financial-stat-card">
                <div className="stat-card-title-row">
                    <span className="stat-card-label">Résultat</span>
                    <StatTooltip
                        title="Résultat Net Estimé"
                        text="Revenu net estimé restant disponible après déduction des cotisations sociales (Chiffre d'affaires − Cotisations sociales)."
                    />
                </div>
                <div className="stat-card-value">{formatCurrency(resultat)}</div>
                <div className="stat-card-period">{period}</div>
            </div>

            <div className="financial-actions">
                <button className="btn-urssaf-connect" onClick={onConnectUrssaf}>
                    Connecter mon Urssaf
                </button>
                <button className="btn-config-taux" onClick={onConfigureTaux}>
                    Configurer mes taux
                </button>
            </div>
        </div>
    );
}

export default FinancialStats;
