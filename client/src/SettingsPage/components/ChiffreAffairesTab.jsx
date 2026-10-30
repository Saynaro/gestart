import React, { useState, useEffect, useRef } from "react";
import { AlertTriangle, ArrowUpRight, RotateCcw, Check, Sliders, ShieldCheck, DollarSign, Loader2 } from "lucide-react";
import { apiFetch } from "../../utils/api";
import { useSubscription } from "../../utils/useSubscription";

const OFFICIAL_FRENCH_DEFAULTS = {
    servicesMax: 77700,
    servicesTva: 36800,
    servicesTvaMax: 39100,
    commercialMax: 188700,
    commercialTva: 91900,
    commercialTvaMax: 101000
};

export default function ChiffreAffairesTab({ isMobileView, triggerToast }) {
    const { isExpired } = useSubscription();
    const [currentCA, setCurrentCA] = useState(0);
    const [loading, setLoading] = useState(true);
    const [savingPlafonds, setSavingPlafonds] = useState(false);
    const [settingsDoc, setSettingsDoc] = useState(null);

    // Plafonds state
    const [plafonds, setPlafonds] = useState(OFFICIAL_FRENCH_DEFAULTS);
    const savedPlafondsRef = useRef(OFFICIAL_FRENCH_DEFAULTS);
    const autoSaveTimerRef = useRef(null);

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
                    const loaded = {
                        servicesMax: Number(savedPlafonds.servicesMax || OFFICIAL_FRENCH_DEFAULTS.servicesMax),
                        servicesTva: Number(savedPlafonds.servicesTva || OFFICIAL_FRENCH_DEFAULTS.servicesTva),
                        servicesTvaMax: Number(savedPlafonds.servicesTvaMax || OFFICIAL_FRENCH_DEFAULTS.servicesTvaMax),
                        commercialMax: Number(savedPlafonds.commercialMax || OFFICIAL_FRENCH_DEFAULTS.commercialMax),
                        commercialTva: Number(savedPlafonds.commercialTva || OFFICIAL_FRENCH_DEFAULTS.commercialTva),
                        commercialTvaMax: Number(savedPlafonds.commercialTvaMax || OFFICIAL_FRENCH_DEFAULTS.commercialTvaMax)
                    };
                    setPlafonds(loaded);
                    savedPlafondsRef.current = loaded;
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

    const checkExpired = () => {
        if (isExpired) {
            window.dispatchEvent(new CustomEvent('subscription_expired', {
                detail: { message: "Votre abonnement a expiré. Pour modifier vos plafonds de CA, veuillez renouveler votre abonnement." }
            }));
            window.dispatchEvent(new CustomEvent('autoSaveStatus', { detail: { status: 'error' } }));
            return true;
        }
        return false;
    };

    const rollbackState = () => {
        if (savedPlafondsRef.current) {
            setPlafonds(savedPlafondsRef.current);
        }
    };

    const performSave = async (customValues = plafonds) => {
        if (checkExpired()) {
            rollbackState();
            return;
        }

        window.dispatchEvent(new CustomEvent('autoSaveStatus', { detail: { status: 'saving' } }));
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
            savedPlafondsRef.current = customValues;
            window.dispatchEvent(new CustomEvent('autoSaveStatus', { detail: { status: 'saved' } }));
        } catch (err) {
            console.error("Save plafonds error:", err);
            rollbackState();
            window.dispatchEvent(new CustomEvent('autoSaveStatus', { detail: { status: 'error' } }));
            if (triggerToast) triggerToast("Erreur lors de l'enregistrement des plafonds", true);
        } finally {
            setSavingPlafonds(false);
        }
    };

    const queueAutoSave = (newPlafonds) => {
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = setTimeout(() => {
            performSave(newPlafonds);
        }, 500);
    };

    const handlePlafondChange = (key, val) => {
        if (checkExpired()) return;
        const num = val === "" ? "" : Number(val);
        const updated = { ...plafonds, [key]: num };
        setPlafonds(updated);
        queueAutoSave(updated);
    };

    const handleResetToOfficial = () => {
        if (checkExpired()) return;
        setPlafonds(OFFICIAL_FRENCH_DEFAULTS);
        performSave(OFFICIAL_FRENCH_DEFAULTS);
        if (triggerToast) triggerToast("Plafonds réinitialisés aux valeurs officielles !");
    };

    const thresholdServices = Number(plafonds.servicesTva) || OFFICIAL_FRENCH_DEFAULTS.servicesTva;
    const thresholdServicesMax = Number(plafonds.servicesTvaMax) || OFFICIAL_FRENCH_DEFAULTS.servicesTvaMax;
    const percentage = thresholdServices > 0 ? Math.min(100, Math.round((currentCA / thresholdServices) * 100)) : 0;
    const isWarning = percentage >= 80;
    const projectionYearEnd = Math.round(currentCA > 0 ? currentCA * 1.35 : 0);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobileView ? '16px' : '24px' }}>
            {/* Alerte si proche du plafond */}
            {isWarning && (
                <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: isMobileView ? '12px' : '12px', padding: isMobileView ? '12px 14px' : '16px', display: 'flex', alignItems: 'flex-start', gap: isMobileView ? '10px' : '12px' }}>
                    <AlertTriangle size={isMobileView ? 20 : 22} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
                    <div>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: isMobileView ? '14px' : '14.5px', fontWeight: 700, color: '#ef4444' }}>
                            Alerte Franchise TVA : Plafond atteint à {percentage}% !
                        </h4>
                        <p style={{ margin: 0, fontSize: isMobileView ? '12px' : '12.5px', color: 'var(--muted-foreground)', lineHeight: '1.4' }}>
                            Vous êtes à <strong>{Math.max(0, thresholdServices - currentCA).toLocaleString("fr-FR")} €</strong> du seuil de franchise en base de TVA ({thresholdServices.toLocaleString("fr-FR")} €). Si vous dépassez le seuil majoré ({thresholdServicesMax.toLocaleString("fr-FR")} €), vous devrez facturer la TVA sur vos interventions.
                        </p>
                    </div>
                </div>
            )}

            {/* Metric Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobileView ? '1fr' : 'repeat(auto-fit, minmax(220px, 1fr))', gap: isMobileView ? '10px' : '16px' }}>
                <div style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: isMobileView ? '14px' : '12px', padding: isMobileView ? '14px 16px' : '18px' }}>
                    <span style={{ fontSize: isMobileView ? '12px' : '12px', color: 'var(--muted-foreground)', fontWeight: 600 }}>CA Annuel encaissé (2026)</span>
                    <div style={{ fontSize: isMobileView ? '22px' : '24px', fontWeight: 800, color: 'var(--foreground)', marginTop: '2px' }}>
                        {currentCA.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} € <span style={{ fontSize: isMobileView ? '12px' : '12px', fontWeight: 500, color: 'var(--muted-foreground)' }}>HT</span>
                    </div>
                    <span style={{ fontSize: isMobileView ? '11.5px' : '11px', color: '#22c55e', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
                        <ArrowUpRight size={isMobileView ? 14 : 14} /> Factures réglées en temps réel
                    </span>
                </div>

                <div style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: isMobileView ? '14px' : '12px', padding: isMobileView ? '14px 16px' : '18px' }}>
                    <span style={{ fontSize: isMobileView ? '12px' : '12px', color: 'var(--muted-foreground)', fontWeight: 600 }}>Seuil Franchise TVA (Services)</span>
                    <div style={{ fontSize: isMobileView ? '22px' : '24px', fontWeight: 800, color: 'var(--sidebar-primary)', marginTop: '2px' }}>
                        {thresholdServices.toLocaleString("fr-FR")} €
                    </div>
                    <div style={{ height: '8px', backgroundColor: 'var(--muted)', borderRadius: '4px', marginTop: '8px', overflow: 'hidden' }}>
                        <div style={{ width: `${percentage}%`, height: '100%', backgroundColor: isWarning ? '#ef4444' : 'var(--sidebar-primary)', borderRadius: '4px' }} />
                    </div>
                </div>

                <div style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: isMobileView ? '14px' : '12px', padding: isMobileView ? '14px 16px' : '18px' }}>
                    <span style={{ fontSize: isMobileView ? '12px' : '12px', color: 'var(--muted-foreground)', fontWeight: 600 }}>Projection Fin d'année</span>
                    <div style={{ fontSize: isMobileView ? '22px' : '24px', fontWeight: 800, color: '#f59e0b', marginTop: '2px' }}>
                        ~ {projectionYearEnd.toLocaleString("fr-FR")} €
                    </div>
                    <span style={{ fontSize: isMobileView ? '11.5px' : '11.5px', color: 'var(--muted-foreground)', marginTop: '4px', display: 'block' }}>Estimation basée sur l'activité en cours</span>
                </div>
            </div>

            {/* Section Configuration des Plafonds & Seuils légaux */}
            <div style={{ border: '1px solid var(--border)', borderRadius: isMobileView ? '14px' : '14px', padding: isMobileView ? '16px 16px' : '22px', backgroundColor: 'var(--card)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobileView ? 'flex-start' : 'center', flexDirection: isMobileView ? 'column' : 'row', gap: isMobileView ? '10px' : '12px', marginBottom: isMobileView ? '14px' : '18px' }}>
                    <div>
                        <h4 style={{ margin: '0 0 2px 0', fontSize: isMobileView ? '15px' : '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--foreground)' }}>
                            <Sliders size={isMobileView ? 18 : 18} style={{ color: 'var(--sidebar-primary)' }} />
                            Plafonds & Seuils légaux (Micro-entreprise)
                        </h4>
                        <p style={{ margin: 0, fontSize: isMobileView ? '12px' : '13px', color: 'var(--muted-foreground)' }}>
                            Personnalisez vos plafonds légaux ou adaptez-les en cas d'ouverture en cours d'année (prorata temporis).
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={handleResetToOfficial}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: isMobileView ? '7px 12px' : '8px 14px',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            backgroundColor: 'var(--background)',
                            color: 'var(--foreground)',
                            fontSize: isMobileView ? '12px' : '12.5px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            alignSelf: isMobileView ? 'stretch' : 'auto',
                            justifyContent: 'center'
                        }}
                    >
                        <RotateCcw size={isMobileView ? 13 : 14} />
                        Réinitialiser valeurs CGI
                    </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobileView ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))', gap: isMobileView ? '12px' : '20px' }}>
                    {/* Colonne 1: Prestations de services */}
                    <div style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: isMobileView ? '12px' : '12px', padding: isMobileView ? '14px 16px' : '16px', display: 'flex', flexDirection: 'column', gap: isMobileView ? '12px' : '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ShieldCheck size={isMobileView ? 17 : 18} style={{ color: 'var(--sidebar-primary)' }} />
                            <span style={{ fontSize: isMobileView ? '13.5px' : '14px', fontWeight: 700, color: 'var(--foreground)' }}>Prestations de services (BTP / Artisans)</span>
                        </div>
                        
                        <div>
                            <label style={{ fontSize: isMobileView ? '12px' : '12px', fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', marginBottom: '4px' }}>
                                Plafond CA max annuel (statut micro) :
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="number"
                                    value={plafonds.servicesMax}
                                    onChange={(e) => handlePlafondChange('servicesMax', e.target.value)}
                                    style={{
                                        width: '100%',
                                        height: isMobileView ? '42px' : '42px',
                                        minHeight: isMobileView ? '42px' : '42px',
                                        maxHeight: isMobileView ? '42px' : '42px',
                                        padding: isMobileView ? '8px 36px 8px 12px' : '8px 36px 8px 12px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border)',
                                        backgroundColor: 'var(--card)',
                                        color: 'var(--foreground)',
                                        fontSize: isMobileView ? '14px' : '14px',
                                        fontWeight: 600,
                                        boxSizing: 'border-box'
                                    }}
                                />
                                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: isMobileView ? '13px' : '13px', color: 'var(--muted-foreground)', fontWeight: 600 }}>€</span>
                            </div>
                        </div>

                        <div>
                            <label style={{ fontSize: isMobileView ? '12px' : '12px', fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', marginBottom: '4px' }}>
                                Seuil Franchise TVA (de base) :
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="number"
                                    value={plafonds.servicesTva}
                                    onChange={(e) => handlePlafondChange('servicesTva', e.target.value)}
                                    style={{
                                        width: '100%',
                                        height: isMobileView ? '42px' : '42px',
                                        minHeight: isMobileView ? '42px' : '42px',
                                        maxHeight: isMobileView ? '42px' : '42px',
                                        padding: isMobileView ? '8px 36px 8px 12px' : '8px 36px 8px 12px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border)',
                                        backgroundColor: 'var(--card)',
                                        color: 'var(--foreground)',
                                        fontSize: isMobileView ? '14px' : '14px',
                                        fontWeight: 600,
                                        boxSizing: 'border-box'
                                    }}
                                />
                                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: isMobileView ? '13px' : '13px', color: 'var(--muted-foreground)', fontWeight: 600 }}>€</span>
                            </div>
                        </div>

                        <div>
                            <label style={{ fontSize: isMobileView ? '12px' : '12px', fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', marginBottom: '4px' }}>
                                Seuil Majoré TVA (limite tolérance) :
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="number"
                                    value={plafonds.servicesTvaMax}
                                    onChange={(e) => handlePlafondChange('servicesTvaMax', e.target.value)}
                                    style={{
                                        width: '100%',
                                        height: isMobileView ? '42px' : '42px',
                                        minHeight: isMobileView ? '42px' : '42px',
                                        maxHeight: isMobileView ? '42px' : '42px',
                                        padding: isMobileView ? '8px 36px 8px 12px' : '8px 36px 8px 12px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border)',
                                        backgroundColor: 'var(--card)',
                                        color: 'var(--foreground)',
                                        fontSize: isMobileView ? '14px' : '14px',
                                        fontWeight: 600,
                                        boxSizing: 'border-box'
                                    }}
                                />
                                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: isMobileView ? '13px' : '13px', color: 'var(--muted-foreground)', fontWeight: 600 }}>€</span>
                            </div>
                        </div>
                    </div>

                    {/* Colonne 2: Activités commerciales */}
                    <div style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: isMobileView ? '12px' : '12px', padding: isMobileView ? '14px 16px' : '16px', display: 'flex', flexDirection: 'column', gap: isMobileView ? '12px' : '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <DollarSign size={isMobileView ? 17 : 18} style={{ color: 'var(--sidebar-primary)' }} />
                            <span style={{ fontSize: isMobileView ? '13.5px' : '14px', fontWeight: 700, color: 'var(--foreground)' }}>Activités commerciales (Vente matériel / BIC)</span>
                        </div>
                        
                        <div>
                            <label style={{ fontSize: isMobileView ? '12px' : '12px', fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', marginBottom: '4px' }}>
                                Plafond CA max annuel (statut micro) :
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="number"
                                    value={plafonds.commercialMax}
                                    onChange={(e) => handlePlafondChange('commercialMax', e.target.value)}
                                    style={{
                                        width: '100%',
                                        height: isMobileView ? '42px' : '42px',
                                        minHeight: isMobileView ? '42px' : '42px',
                                        maxHeight: isMobileView ? '42px' : '42px',
                                        padding: isMobileView ? '8px 36px 8px 12px' : '8px 36px 8px 12px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border)',
                                        backgroundColor: 'var(--card)',
                                        color: 'var(--foreground)',
                                        fontSize: isMobileView ? '14px' : '14px',
                                        fontWeight: 600,
                                        boxSizing: 'border-box'
                                    }}
                                />
                                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: isMobileView ? '13px' : '13px', color: 'var(--muted-foreground)', fontWeight: 600 }}>€</span>
                            </div>
                        </div>

                        <div>
                            <label style={{ fontSize: isMobileView ? '12px' : '12px', fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', marginBottom: '4px' }}>
                                Seuil Franchise TVA (de base) :
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="number"
                                    value={plafonds.commercialTva}
                                    onChange={(e) => handlePlafondChange('commercialTva', e.target.value)}
                                    style={{
                                        width: '100%',
                                        height: isMobileView ? '42px' : '42px',
                                        minHeight: isMobileView ? '42px' : '42px',
                                        maxHeight: isMobileView ? '42px' : '42px',
                                        padding: isMobileView ? '8px 36px 8px 12px' : '8px 36px 8px 12px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border)',
                                        backgroundColor: 'var(--card)',
                                        color: 'var(--foreground)',
                                        fontSize: isMobileView ? '14px' : '14px',
                                        fontWeight: 600,
                                        boxSizing: 'border-box'
                                    }}
                                />
                                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: isMobileView ? '13px' : '13px', color: 'var(--muted-foreground)', fontWeight: 600 }}>€</span>
                            </div>
                        </div>

                        <div>
                            <label style={{ fontSize: isMobileView ? '12px' : '12px', fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', marginBottom: '4px' }}>
                                Seuil Majoré TVA (limite tolérance) :
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="number"
                                    value={plafonds.commercialTvaMax}
                                    onChange={(e) => handlePlafondChange('commercialTvaMax', e.target.value)}
                                    style={{
                                        width: '100%',
                                        height: isMobileView ? '42px' : '42px',
                                        minHeight: isMobileView ? '42px' : '42px',
                                        maxHeight: isMobileView ? '42px' : '42px',
                                        padding: isMobileView ? '8px 36px 8px 12px' : '8px 36px 8px 12px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border)',
                                        backgroundColor: 'var(--card)',
                                        color: 'var(--foreground)',
                                        fontSize: isMobileView ? '14px' : '14px',
                                        fontWeight: 600,
                                        boxSizing: 'border-box'
                                    }}
                                />
                                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: isMobileView ? '13px' : '13px', color: 'var(--muted-foreground)', fontWeight: 600 }}>€</span>
                            </div>
                        </div>
                    </div>
                </div>

                {!isMobileView && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                        <button
                            type="button"
                            onClick={() => performSave()}
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
                            {savingPlafonds ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                            {savingPlafonds ? "Enregistrement..." : "Enregistrer les plafonds"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
