import React from "react";

function PlafondsCard({
    commercialCurrent = 57,
    commercialMax = 203100,
    commercialTva = 85000,
    commercialTvaMax = 93500,
    servicesCurrent = 95,
    servicesMax = 83600,
    servicesTva = 37500,
    servicesTvaMax = 41250
}) {
    const formatCurrency = (val) => {
        return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(val);
    };

    // Helper to calculate percentages
    const getPercent = (current, max) => Math.min(100, (current / max) * 100);

    const commPercent = getPercent(commercialCurrent, commercialMax);
    const commTvaPercent = getPercent(commercialTva, commercialMax);
    const commTvaMaxPercent = getPercent(commercialTvaMax, commercialMax);

    const servPercent = getPercent(servicesCurrent, servicesMax);
    const servTvaPercent = getPercent(servicesTva, servicesMax);
    const servTvaMaxPercent = getPercent(servicesTvaMax, servicesMax);

    return (
        <div className="plafonds-card">
            {/* Header */}
            <div className="plafonds-header">
                <div className="plafonds-title-group">
                    <svg className="plafonds-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="20" x2="18" y2="10"></line>
                        <line x1="12" y1="20" x2="12" y2="4"></line>
                        <line x1="6" y1="20" x2="6" y2="14"></line>
                    </svg>
                    <h3>Plafonds</h3>
                </div>
            </div>

            {/* Plafond 1: Activités commerciales */}
            <div className="plafond-item">
                <div className="plafond-item-label-row">
                    <div className="plafond-item-title">
                        <span>Activités commerciales</span>
                        <button className="stat-info-btn" title="Limite de chiffre d'affaires annuel pour les activités d'achat/revente de marchandises">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="16" x2="12" y2="12"></line>
                                <line x1="12" y1="8" x2="12.01" y2="8"></line>
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="plafond-value-row">
                    <span className="current-val">{formatCurrency(commercialCurrent)}</span>
                    <span className="max-val">{formatCurrency(commercialMax)}</span>
                </div>

                {/* Progress Bar with markers */}
                <div className="plafond-progress-bar-container">
                    <div className="plafond-progress-bar-track">
                        {/* Current progress fill */}
                        <div 
                            className="plafond-progress-fill" 
                            style={{ width: `${commPercent}%` }}
                        ></div>
                        {/* Threshold dots */}
                        <div 
                            className="threshold-dot orange" 
                            style={{ left: `${commTvaPercent}%` }} 
                            title={`Seuil TVA: ${formatCurrency(commercialTva)}`}
                        ></div>
                        <div 
                            className="threshold-dot red" 
                            style={{ left: `${commTvaMaxPercent}%` }} 
                            title={`Seuil TVA Majoré: ${formatCurrency(commercialTvaMax)}`}
                        ></div>
                    </div>
                </div>

                {/* Threshold Legends */}
                <div className="threshold-legends">
                    <div className="legend-item">
                        <span className="dot orange"></span>
                        <span>Seuil TVA {formatCurrency(commercialTva)}</span>
                    </div>
                    <div className="legend-item">
                        <span className="dot red"></span>
                        <span>Seuil TVA Majoré {formatCurrency(commercialTvaMax)}</span>
                    </div>
                </div>
            </div>

            {/* Plafond 2: Prestations de services */}
            <div className="plafond-item">
                <div className="plafond-item-label-row">
                    <div className="plafond-item-title">
                        <span>Prestations de services</span>
                        <button className="stat-info-btn" title="Limite de chiffre d'affaires annuel pour les activités de prestations de services artisanales ou commerciales">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="16" x2="12" y2="12"></line>
                                <line x1="12" y1="8" x2="12.01" y2="8"></line>
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="plafond-value-row">
                    <span className="current-val">{formatCurrency(servicesCurrent)}</span>
                    <span className="max-val">{formatCurrency(servicesMax)}</span>
                </div>

                {/* Progress Bar with markers */}
                <div className="plafond-progress-bar-container">
                    <div className="plafond-progress-bar-track">
                        {/* Current progress fill */}
                        <div 
                            className="plafond-progress-fill" 
                            style={{ width: `${servPercent}%` }}
                        ></div>
                        {/* Threshold dots */}
                        <div 
                            className="threshold-dot orange" 
                            style={{ left: `${servTvaPercent}%` }} 
                            title={`Seuil TVA: ${formatCurrency(servicesTva)}`}
                        ></div>
                        <div 
                            className="threshold-dot red" 
                            style={{ left: `${servTvaMaxPercent}%` }} 
                            title={`Seuil TVA Majoré: ${formatCurrency(servicesTvaMax)}`}
                        ></div>
                    </div>
                </div>

                {/* Threshold Legends */}
                <div className="threshold-legends">
                    <div className="legend-item">
                        <span className="dot orange"></span>
                        <span>Seuil TVA {formatCurrency(servicesTva)}</span>
                    </div>
                    <div className="legend-item">
                        <span className="dot red"></span>
                        <span>Seuil TVA Majoré {formatCurrency(servicesTvaMax)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PlafondsCard;
