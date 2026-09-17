import React, { useState } from "react";
import { HelpCircle, ShieldCheck } from "lucide-react";

function PlafondTooltip({ title, text, details }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <span 
            style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: '6px' }}
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
        >
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                style={{
                    border: 'none',
                    background: 'none',
                    color: '#64748B',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    padding: 0
                }}
                title="En savoir plus sur les plafonds"
            >
                <HelpCircle size={16} />
            </button>

            {isOpen && (
                <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        position: 'absolute',
                        bottom: '125%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '290px',
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
                    {title && <div style={{ fontWeight: 700, marginBottom: '4px', color: '#A3E635', fontSize: '0.82rem' }}>{title}</div>}
                    <div style={{ color: '#CBD5E1', fontSize: '0.75rem', marginBottom: '6px' }}>{text}</div>
                    
                    {details && details.length > 0 && (
                        <div style={{ borderTop: '1px solid #334155', paddingTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {details.map((d, i) => (
                                <div key={i} style={{ color: '#E2E8F0', fontSize: '0.73rem' }}>
                                    <strong style={{ color: d.color || '#A3E635' }}>• {d.label} : </strong>
                                    <span>{d.val}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </span>
    );
}

function PlafondsCard({
    commercialCurrent = 0,
    commercialMax = 188700,
    commercialTva = 91900,
    commercialTvaMax = 101000,
    servicesCurrent = 0,
    servicesMax = 77700,
    servicesTva = 36800,
    servicesTvaMax = 39100
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
                        <PlafondTooltip 
                            title="Plafonds Vente de Marchandises (BIC)"
                            text="Limites de chiffre d'affaires annuel pour l'activité d'achat/revente de marchandises."
                            details={[
                                { label: "Plafond Statut CA max", val: `${formatCurrency(commercialMax)} / an`, color: "#60A5FA" },
                                { label: "Seuil Franchise TVA", val: `${formatCurrency(commercialTva)} / an (art. 293 B CGI)`, color: "#F59E0B" },
                                { label: "Seuil Majoré TVA", val: `${formatCurrency(commercialTvaMax)} / an (assujettissement immédiat)`, color: "#EF4444" }
                            ]}
                        />
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
                        <PlafondTooltip 
                            title="Plafonds Prestations de Services (Artisans/BNC)"
                            text="Limites de chiffre d'affaires annuel pour les activités artisanales et prestations de services."
                            details={[
                                { label: "Plafond Statut CA max", val: `${formatCurrency(servicesMax)} / an`, color: "#60A5FA" },
                                { label: "Seuil Franchise TVA", val: `${formatCurrency(servicesTva)} / an (art. 293 B CGI)`, color: "#F59E0B" },
                                { label: "Seuil Majoré TVA", val: `${formatCurrency(servicesTvaMax)} / an (assujettissement immédiat)`, color: "#EF4444" }
                            ]}
                        />
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
