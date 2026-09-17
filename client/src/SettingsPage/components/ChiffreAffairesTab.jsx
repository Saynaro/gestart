import React, { useState, useEffect } from "react";
import { AlertTriangle, ArrowUpRight, RotateCcw, Check, Sliders, ShieldCheck, DollarSign } from "lucide-react";
import { apiFetch } from "../../utils/api";

const OFFICIAL_FRENCH_DEFAULTS = {
    servicesMax: 77700,
    servicesTva: 36800,
    servicesTvaMax: 39100,
    commercialMax: 188700,
    commercialTva: 91900,
    commercialTvaMax: 101000
};

export default function ChiffreAffairesTab({ isMobileView, triggerToast }) {
    const [currentCA, setCurrentCA] = useState(0);
    const [loading, setLoading] = useState(true);
    const [savingPlafonds, setSavingPlafonds] = useState(false);
    const [settingsDoc, setSettingsDoc] = useState(null);

    // Plafonds state
    const [plafonds, setPlafonds] = useState(OFFICIAL_FRENCH_DEFAULTS);

    useEffect(() => {
        const fetchCAAndSettings = async () => {
            try {
                const [data, setRes] = await Promise.all([
                    apiFetch('/v1/invoices').catch(() => null),
                    apiFetch('/v1/company/settings').catch(() => null)
                ]);

                // Settings
                const settings = setRes?.data?.settings || setRes?.settings || {};
                setSettingsDoc(settings);
                const savedPlafonds = settings?.documentCustomization?.plafonds;
                if (savedPlafonds) {
                    setPlafonds({
                        servicesMax: Number(savedPlafonds.servicesMax || OFFICIAL_FRENCH_DEFAULTS.servicesMax),
                        servicesTva: Number(savedPlafonds.servicesTva || OFFICIAL_FRENCH_DEFAULTS.servicesTva),
                        servicesTvaMax: Number(savedPlafonds.servicesTvaMax || OFFICIAL_FRENCH_DEFAULTS.servicesTvaMax),
                        commercialMax: Number(savedPlafonds.commercialMax || OFFICIAL_FRENCH_DEFAULTS.commercialMax),
                        commercialTva: Number(savedPlafonds.commercialTva || OFFICIAL_FRENCH_DEFAULTS.commercialTva),
                        commercialTvaMax: Number(savedPlafonds.commercialTvaMax || OFFICIAL_FRENCH_DEFAULTS.commercialTvaMax)
                    });
                }

                // Invoices
                const invoiceList = data?.data?.invoices || data?.invoices || (Array.isArray(data) ? data : []);
                let totalPaid = 0;

                if (Array.isArray(invoiceList) && invoiceList.length > 0) {
                    invoiceList.forEach((inv) => {
                        const amount = Number(inv.totalHt || inv.subtotalHt || inv.totalTtc || 0);
                        const isPaid = inv.status === "PAID" || inv.status === "paid";
                        if (isPaid) {
                            totalPaid += amount;
                        }
                    });
                    setCurrentCA(totalPaid);
                }
            } catch (err) {
                console.warn("API CA fallback:", err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchCAAndSettings();
    }, []);

    const handlePlafondChange = (key, val) => {
        const num = val === "" ? "" : Number(val);
        setPlafonds(prev => ({ ...prev, [key]: num }));
    };

    const handleSavePlafonds = async (customValues = plafonds) => {
        setSavingPlafonds(true);
        try {
            const existingCustom = settingsDoc?.documentCustomization || {};
            await apiFetch('/v1/company/settings', {
                method: 'PATCH',
                body: {
                    documentCustomization: {
                        ...existingCustom,
                        plafonds: {
                            servicesMax: Number(customValues.servicesMax || OFFICIAL_FRENCH_DEFAULTS.servicesMax),
                            servicesTva: Number(customValues.servicesTva || OFFICIAL_FRENCH_DEFAULTS.servicesTva),
                            servicesTvaMax: Number(customValues.servicesTvaMax || OFFICIAL_FRENCH_DEFAULTS.servicesTvaMax),
                            commercialMax: Number(customValues.commercialMax || OFFICIAL_FRENCH_DEFAULTS.commercialMax),
                            commercialTva: Number(customValues.commercialTva || OFFICIAL_FRENCH_DEFAULTS.commercialTva),
                            commercialTvaMax: Number(customValues.commercialTvaMax || OFFICIAL_FRENCH_DEFAULTS.commercialTvaMax)
                        }
                    }
                }
            });
            if (triggerToast) triggerToast("Plafonds et seuils enregistrés avec succès !");
        } catch (err) {
            console.error("Save plafonds error:", err);
            if (triggerToast) triggerToast("Erreur lors de l'enregistrement des plafonds", true);
        } finally {
            setSavingPlafonds(false);
        }
    };

    const handleResetToOfficial = () => {
        setPlafonds(OFFICIAL_FRENCH_DEFAULTS);
        handleSavePlafonds(OFFICIAL_FRENCH_DEFAULTS);
    };

    const thresholdServices = Number(plafonds.servicesTva) || OFFICIAL_FRENCH_DEFAULTS.servicesTva;
    const thresholdServicesMax = Number(plafonds.servicesTvaMax) || OFFICIAL_FRENCH_DEFAULTS.servicesTvaMax;
    const percentage = thresholdServices > 0 ? Math.min(100, Math.round((currentCA / thresholdServices) * 100)) : 0;
    const isWarning = percentage >= 80;
    const projectionYearEnd = Math.round(currentCA > 0 ? currentCA * 1.35 : 0);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Alerte si proche du plafond */}
            {isWarning && (
                <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <AlertTriangle size={22} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
                    <div>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '14.5px', fontWeight: 700, color: '#ef4444' }}>
                            Alerte Franchise TVA : Plafond atteint à {percentage}% !
                        </h4>
                        <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--muted-foreground)', lineHeight: '1.4' }}>
                            Vous êtes à <strong>{Math.max(0, thresholdServices - currentCA).toLocaleString("fr-FR")} €</strong> du seuil de franchise en base de TVA ({thresholdServices.toLocaleString("fr-FR")} €). Si vous dépassez le seuil majoré ({thresholdServicesMax.toLocaleString("fr-FR")} €), vous devrez facturer la TVA sur vos interventions.
                        </p>
                    </div>
                </div>
            )}

            {/* Metric Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                <div style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--muted-foreground)', fontWeight: 600 }}>CA Annuel encaissé (2026)</span>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--foreground)', marginTop: '4px' }}>
                        {currentCA.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} € <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--muted-foreground)' }}>HT</span>
                    </div>
                    <span style={{ fontSize: '11px', color: '#22c55e', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '2px', marginTop: '6px' }}>
                        <ArrowUpRight size={14} /> Factures réglées en temps réel
                    </span>
                </div>

                <div style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--muted-foreground)', fontWeight: 600 }}>Seuil Franchise TVA (Services)</span>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--sidebar-primary)', marginTop: '4px' }}>
                        {thresholdServices.toLocaleString("fr-FR")} €
                    </div>
                    <div style={{ height: '6px', backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: '3px', marginTop: '8px', overflow: 'hidden' }}>
                        <div style={{ width: `${percentage}%`, height: '100%', backgroundColor: isWarning ? '#ef4444' : 'var(--sidebar-primary)', borderRadius: '3px' }} />
                    </div>
                </div>

                <div style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--muted-foreground)', fontWeight: 600 }}>Projection Fin d'année</span>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>
                        ~ {projectionYearEnd.toLocaleString("fr-FR")} €
                    </div>
                    <span style={{ fontSize: '11.5px', color: 'var(--muted-foreground)', marginTop: '4px', display: 'block' }}>Estimation basée sur l'activité en cours</span>
                </div>
            </div>

            {/* Section Configuration des Plafonds & Seuils légaux */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '14px', padding: '22px', backgroundColor: 'var(--card)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
                    <div>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--foreground)' }}>
                            <Sliders size={18} style={{ color: 'var(--sidebar-primary)' }} />
                            Plafonds & Seuils légaux (Micro-entreprise)
                        </h4>
                        <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted-foreground)' }}>
                            Personnalisez vos plafonds légaux ou adaptez-les en cas d'ouverture en cours d'année (règle du prorata temporis).
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={handleResetToOfficial}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 14px',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            backgroundColor: 'var(--background)',
                            color: 'var(--foreground)',
                            fontSize: '12.5px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        <RotateCcw size={14} />
                        Réinitialiser valeurs officielles CGI
                    </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                    {/* Colonne 1: Prestations de services */}
                    <div style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ShieldCheck size={18} style={{ color: 'var(--sidebar-primary)' }} />
                            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--foreground)' }}>Prestations de services (BTP / Artisans)</span>
                        </div>
                        
                        <div>
                            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', marginBottom: '4px' }}>
                                Plafond CA max annuel (statut micro) :
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="number"
                                    value={plafonds.servicesMax}
                                    onChange={(e) => handlePlafondChange('servicesMax', e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '8px 36px 8px 12px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border)',
                                        backgroundColor: 'var(--card)',
                                        color: 'var(--foreground)',
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        boxSizing: 'border-box'
                                    }}
                                />
                                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: 'var(--muted-foreground)', fontWeight: 600 }}>€</span>
                            </div>
                        </div>

                        <div>
                            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', marginBottom: '4px' }}>
                                Seuil Franchise TVA (de base) :
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="number"
                                    value={plafonds.servicesTva}
                                    onChange={(e) => handlePlafondChange('servicesTva', e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '8px 36px 8px 12px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border)',
                                        backgroundColor: 'var(--card)',
                                        color: 'var(--foreground)',
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        boxSizing: 'border-box'
                                    }}
                                />
                                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: 'var(--muted-foreground)', fontWeight: 600 }}>€</span>
                            </div>
                        </div>

                        <div>
                            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', marginBottom: '4px' }}>
                                Seuil Majoré TVA (limite de tolérance) :
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="number"
                                    value={plafonds.servicesTvaMax}
                                    onChange={(e) => handlePlafondChange('servicesTvaMax', e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '8px 36px 8px 12px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border)',
                                        backgroundColor: 'var(--card)',
                                        color: 'var(--foreground)',
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        boxSizing: 'border-box'
                                    }}
                                />
                                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: 'var(--muted-foreground)', fontWeight: 600 }}>€</span>
                            </div>
                        </div>
                    </div>

                    {/* Colonne 2: Activités commerciales */}
                    <div style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <DollarSign size={18} style={{ color: 'var(--sidebar-primary)' }} />
                            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--foreground)' }}>Activités commerciales (Vente matériel / BIC)</span>
                        </div>
                        
                        <div>
                            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', marginBottom: '4px' }}>
                                Plafond CA max annuel (statut micro) :
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="number"
                                    value={plafonds.commercialMax}
                                    onChange={(e) => handlePlafondChange('commercialMax', e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '8px 36px 8px 12px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border)',
                                        backgroundColor: 'var(--card)',
                                        color: 'var(--foreground)',
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        boxSizing: 'border-box'
                                    }}
                                />
                                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: 'var(--muted-foreground)', fontWeight: 600 }}>€</span>
                            </div>
                        </div>

                        <div>
                            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', marginBottom: '4px' }}>
                                Seuil Franchise TVA (de base) :
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="number"
                                    value={plafonds.commercialTva}
                                    onChange={(e) => handlePlafondChange('commercialTva', e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '8px 36px 8px 12px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border)',
                                        backgroundColor: 'var(--card)',
                                        color: 'var(--foreground)',
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        boxSizing: 'border-box'
                                    }}
                                />
                                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: 'var(--muted-foreground)', fontWeight: 600 }}>€</span>
                            </div>
                        </div>

                        <div>
                            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', marginBottom: '4px' }}>
                                Seuil Majoré TVA (limite de tolérance) :
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="number"
                                    value={plafonds.commercialTvaMax}
                                    onChange={(e) => handlePlafondChange('commercialTvaMax', e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '8px 36px 8px 12px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border)',
                                        backgroundColor: 'var(--card)',
                                        color: 'var(--foreground)',
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        boxSizing: 'border-box'
                                    }}
                                />
                                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: 'var(--muted-foreground)', fontWeight: 600 }}>€</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                    <button
                        type="button"
                        onClick={() => handleSavePlafonds()}
                        disabled={savingPlafonds}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '10px 22px',
                            borderRadius: '10px',
                            border: 'none',
                            backgroundColor: 'var(--sidebar-primary)',
                            color: 'var(--sidebar-primary-foreground, #ffffff)',
                            fontSize: '13.5px',
                            fontWeight: 700,
                            cursor: savingPlafonds ? 'not-allowed' : 'pointer',
                            opacity: savingPlafonds ? 0.7 : 1,
                            transition: 'all 0.2s',
                            boxShadow: '0 2px 8px rgba(85, 107, 47, 0.2)'
                        }}
                    >
                        <Check size={16} />
                        {savingPlafonds ? "Enregistrement..." : "Enregistrer les plafonds"}
                    </button>
                </div>
            </div>
        </div>
    );
}
