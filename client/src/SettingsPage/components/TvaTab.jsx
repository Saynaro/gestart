import React, { useState, useEffect, useMemo, useRef } from "react";
import { Receipt, Check, FileText, HelpCircle, ArrowRight, Loader2, Lock } from "lucide-react";
import { LegalHelpTooltip } from "../../components/LegalHelpModal";
import { apiFetch } from "../../utils/api";
import { useSubscription } from "../../utils/useSubscription";

export default function TvaTab({ isMobileView, triggerToast }) {
    const { isExpired } = useSubscription();
    const [tvaRegime, setTvaRegime] = useState("franchise"); // "franchise" | "simplifie" | "normal"
    const [defaultTvaRate, setDefaultTvaRate] = useState(20);
    const [declarationPeriodicity, setDeclarationPeriodicity] = useState("trimestrielle");
    const [invoices, setInvoices] = useState([]);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    const ratesOptions = [0, 5.5, 10, 20];
    const savedStateRef = useRef({ regime: "franchise", rate: 20 });

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const [setRes, compRes, invRes] = await Promise.all([
                    apiFetch('/v1/company/settings').catch(() => null),
                    apiFetch('/v1/company').catch(() => null),
                    apiFetch('/v1/invoices').catch(() => null)
                ]);

                let currentRate = 20;
                let currentRegime = "franchise";

                const s = setRes?.data?.settings || setRes?.settings;
                if (s && s.defaultTvaRate !== undefined) {
                    currentRate = Number(s.defaultTvaRate);
                    setDefaultTvaRate(currentRate);
                }

                const c = compRes?.data?.company || compRes?.company;
                if (c) {
                    if (c.isTvaFranchise) {
                        currentRegime = "franchise";
                    } else {
                        currentRegime = "simplifie";
                    }
                    setTvaRegime(currentRegime);
                }

                savedStateRef.current = { regime: currentRegime, rate: currentRate };

                const invList = invRes?.data?.invoices || invRes?.invoices || (Array.isArray(invRes) ? invRes : []);
                setInvoices(invList);
            } catch (err) {
                console.warn("Could not load TVA settings:", err.message);
            } finally {
                setLoading(false);
            }
        };

        loadSettings();
    }, []);

    // Calculate real collected TVA by quarter
    const tvaQuarters = useMemo(() => {
        let t1Tva = 0, t2Tva = 0, t3Tva = 0, t4Tva = 0;

        invoices.forEach((inv) => {
            const isPaid = inv.status === "PAID" || inv.status === "paid";
            if (isPaid) {
                const tva = Number(inv.totalTva || (inv.totalTtc - inv.totalHt) || 0);
                const d = new Date(inv.date || inv.createdAt);
                const m = d.getMonth();
                if (m >= 0 && m <= 2) t1Tva += tva;
                else if (m >= 3 && m <= 5) t2Tva += tva;
                else if (m >= 6 && m <= 8) t3Tva += tva;
                else t4Tva += tva;
            }
        });

        return [
            { quarter: "T3 2026 (Juil-Sept)", collected: `${t3Tva.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`, deductible: "0,00 €", netPayable: `${t3Tva.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`, status: t3Tva > 0 ? "À déclarer" : "Période en cours" },
            { quarter: "T2 2026 (Avr-Juin)", collected: `${t2Tva.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`, deductible: "0,00 €", netPayable: `${t2Tva.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`, status: t2Tva > 0 ? "Déclaré" : "—" },
            { quarter: "T1 2026 (Jan-Mars)", collected: `${t1Tva.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`, deductible: "0,00 €", netPayable: `${t1Tva.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`, status: t1Tva > 0 ? "Déclaré" : "—" }
        ];
    }, [invoices]);

    const checkExpired = () => {
        if (isExpired) {
            window.dispatchEvent(new CustomEvent('subscription_expired', {
                detail: { message: "Votre abonnement a expiré. Pour modifier les paramètres de TVA, veuillez renouveler votre abonnement." }
            }));
            window.dispatchEvent(new CustomEvent('autoSaveStatus', { detail: { status: 'error' } }));
            return true;
        }
        return false;
    };

    const rollbackState = () => {
        if (!savedStateRef.current) return;
        setTvaRegime(savedStateRef.current.regime);
        setDefaultTvaRate(savedStateRef.current.rate);
    };

    const performSave = async (regimeToSave, rateToSave) => {
        if (checkExpired()) {
            rollbackState();
            return;
        }

        window.dispatchEvent(new CustomEvent('autoSaveStatus', { detail: { status: 'saving' } }));
        setSaving(true);
        try {
            await Promise.all([
                apiFetch('/v1/company/settings', {
                    method: 'PATCH',
                    body: JSON.stringify({ defaultTvaRate: rateToSave })
                }),
                apiFetch('/v1/company', {
                    method: 'PATCH',
                    body: JSON.stringify({ isTvaFranchise: regimeToSave === "franchise" })
                })
            ]);
            savedStateRef.current = { regime: regimeToSave, rate: rateToSave };
            window.dispatchEvent(new CustomEvent('autoSaveStatus', { detail: { status: 'saved' } }));
        } catch (err) {
            console.error("TVA save error:", err);
            rollbackState();
            window.dispatchEvent(new CustomEvent('autoSaveStatus', { detail: { status: 'error' } }));
            if (triggerToast) triggerToast(err.message || "Erreur lors de l'enregistrement", true);
        } finally {
            setSaving(false);
        }
    };

    const handleRegimeChange = (regime) => {
        if (checkExpired()) return;
        let newRate = defaultTvaRate;
        if (regime === 'franchise') {
            newRate = 0;
        } else if (defaultTvaRate === 0) {
            newRate = 20;
        }
        setTvaRegime(regime);
        setDefaultTvaRate(newRate);
        performSave(regime, newRate);
    };

    const handleRateChange = (rate) => {
        if (checkExpired()) return;
        setDefaultTvaRate(rate);
        performSave(tvaRegime, rate);
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        await performSave(tvaRegime, defaultTvaRate);
        if (triggerToast) triggerToast("Paramètres TVA enregistrés avec succès !");
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                <Loader2 className="animate-spin" size={24} style={{ color: 'var(--sidebar-primary)' }} />
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: isMobileView ? '14px' : '24px' }}>
            {/* Régime de TVA */}
            <div style={{
                border: '1px solid var(--border)',
                borderRadius: isMobileView ? '14px' : '14px',
                padding: isMobileView ? '14px 16px' : '20px',
                backgroundColor: 'var(--card)'
            }}>
                <h3 style={{
                    margin: isMobileView ? '0 0 12px 0' : '0 0 16px 0',
                    fontSize: isMobileView ? '15px' : '15px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <Receipt size={isMobileView ? 18 : 18} style={{ color: 'var(--sidebar-primary)', flexShrink: 0 }} />
                    <span>Régime de TVA & Mentions Légales</span>
                    <LegalHelpTooltip lawArticle="art. 293 B & 289 CGI" title="Régime de TVA" text="La franchise en base de TVA (art. 293 B) vous dispense de facturer la TVA. La mention obligatoire apparaît automatiquement sur vos factures." />
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: isMobileView ? '10px' : '10px' }}>
                    {[
                        {
                            key: 'franchise',
                            title: 'Franchise en base de TVA (Art. 293 B du CGI)',
                            desc: 'Vous ne facturez pas la TVA à vos clients (Taux 0%) et vous ne la récupérez pas sur vos achats outillage. Mention légale imprimée automatiquement sur vos factures.'
                        },
                        {
                            key: 'simplifie',
                            title: 'Régime Réel Simplifié',
                            desc: 'Facturation de la TVA. Deux acomptes semestriels et une régularisation annuelle (Déclaration CA12).'
                        },
                        {
                            key: 'normal',
                            title: 'Régime Réel Normal',
                            desc: "Déclarations mensuelles CA3 sur impots.gouv.fr. Conseillé pour les grandes entreprises d'installation HVAC."
                        }
                    ].map((item) => {
                        const isSelected = tvaRegime === item.key;
                        return (
                            <label
                                key={item.key}
                                style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: isMobileView ? '12px' : '12px',
                                    padding: isMobileView ? '12px 14px' : '12px 14px',
                                    borderRadius: '10px',
                                    border: `1.5px solid ${isSelected ? 'var(--sidebar-primary)' : 'var(--border)'}`,
                                    backgroundColor: isSelected ? 'rgba(91, 77, 219, 0.03)' : 'var(--background)',
                                    cursor: 'pointer',
                                    boxSizing: 'border-box',
                                    transition: 'border-color 0.2s ease, background-color 0.2s ease'
                                }}
                            >
                                <input
                                    type="radio"
                                    name="tvaRegime"
                                    value={item.key}
                                    checked={isSelected}
                                    onChange={() => handleRegimeChange(item.key)}
                                    style={{ marginTop: '2px', flexShrink: 0, width: isMobileView ? '18px' : '16px', height: isMobileView ? '18px' : '16px', accentColor: 'var(--sidebar-primary)' }}
                                />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <span style={{
                                        fontSize: isMobileView ? '14px' : '14px',
                                        fontWeight: isSelected ? 700 : 600,
                                        display: 'block',
                                        lineHeight: 1.3
                                    }}>
                                        {item.title}
                                    </span>
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateRows: isSelected ? '1fr' : '0fr',
                                        transition: 'grid-template-rows 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                    }}>
                                        <div style={{ overflow: 'hidden' }}>
                                            <span style={{
                                                fontSize: isMobileView ? '12.5px' : '12px',
                                                color: 'var(--muted-foreground)',
                                                display: 'block',
                                                paddingTop: '4px',
                                                lineHeight: 1.35
                                            }}>
                                                {item.desc}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </label>
                        );
                    })}
                </div>
            </div>

            {/* Taux TVA par défaut & Options */}
            <div style={{
                border: '1px solid var(--border)',
                borderRadius: isMobileView ? '14px' : '14px',
                padding: isMobileView ? '14px 16px' : '20px',
                backgroundColor: 'var(--card)'
            }}>
                <h3 style={{
                    margin: isMobileView ? '0 0 12px 0' : '0 0 16px 0',
                    fontSize: isMobileView ? '15px' : '15px',
                    fontWeight: 700
                }}>
                    Taux de TVA par défaut
                </h3>

                <div className="profile-form-grid">
                    <div className="form-field form-group-full">
                        <label className="form-label" style={{ fontSize: isMobileView ? '12px' : '11px', fontWeight: 700, marginBottom: '6px' }}>
                            SÉLECTIONNEZ LE TAUX DE TVA PRÉ-APPLIQUÉ SUR LES DEVIS
                        </label>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: isMobileView ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
                            gap: isMobileView ? '8px' : '10px',
                            marginTop: '4px'
                        }}>
                            {ratesOptions.map((rate) => (
                                <button
                                    key={rate}
                                    type="button"
                                    onClick={() => handleRateChange(rate)}
                                    style={{
                                        padding: isMobileView ? '11px 8px' : '10px',
                                        borderRadius: '8px',
                                        border: defaultTvaRate === rate ? '2px solid var(--sidebar-primary)' : '1px solid var(--border)',
                                        backgroundColor: defaultTvaRate === rate ? 'var(--sidebar-primary)' : 'var(--background)',
                                        color: defaultTvaRate === rate ? '#fff' : 'var(--foreground)',
                                        fontWeight: 700,
                                        fontSize: isMobileView ? '13.5px' : '13.5px',
                                        cursor: 'pointer',
                                        textAlign: 'center',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    {rate}% {rate === 20 ? '(Normal)' : rate === 10 ? '(Rénov.)' : rate === 5.5 ? '(Énergie)' : '(Exonéré)'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {!isMobileView && (
                    <div style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        marginTop: '16px'
                    }}>
                        <button
                            type="submit"
                            disabled={saving}
                            className="save-profile-btn"
                            style={{
                                width: 'auto',
                                justifyContent: 'center',
                                padding: '9px 20px',
                                backgroundColor: 'var(--sidebar-primary)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: 600,
                                fontSize: '14px',
                                cursor: saving ? 'not-allowed' : 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                opacity: isExpired ? 0.85 : 1
                            }}
                        >
                            {isExpired && <Lock size={15} />}
                            {saving ? "Enregistrement..." : "Enregistrer la TVA"}
                        </button>
                    </div>
                )}
            </div>

            {/* Historique Déclarations TVA */}
            <div style={{
                border: '1px solid var(--border)',
                borderRadius: isMobileView ? '14px' : '14px',
                padding: isMobileView ? '14px 16px' : '20px',
                backgroundColor: 'var(--card)'
            }}>
                <h3 style={{
                    margin: isMobileView ? '0 0 12px 0' : '0 0 16px 0',
                    fontSize: isMobileView ? '15px' : '15px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <FileText size={isMobileView ? 18 : 18} style={{ color: 'var(--sidebar-primary)', flexShrink: 0 }} />
                    <span>TVA Collectée sur Factures Réglées</span>
                </h3>

                {isMobileView ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {tvaQuarters.map((q, idx) => (
                            <div key={idx} style={{
                                padding: '12px 14px',
                                backgroundColor: 'var(--background)',
                                borderRadius: '10px',
                                border: '1px solid var(--border)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <span style={{ fontWeight: 700, fontSize: '13.5px' }}>{q.quarter}</span>
                                    <span style={{
                                        backgroundColor: q.status === 'Déclaré' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                        color: q.status === 'Déclaré' ? '#22c55e' : '#f59e0b',
                                        fontSize: '11.5px',
                                        padding: '2px 8px',
                                        borderRadius: '50px',
                                        fontWeight: 700
                                    }}>
                                        {q.status}
                                    </span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', fontSize: '12px' }}>
                                    <div>
                                        <div style={{ color: 'var(--muted-foreground)', fontSize: '11.5px' }}>Collectée</div>
                                        <div style={{ fontWeight: 700, marginTop: '2px', fontSize: '13px' }}>{q.collected}</div>
                                    </div>
                                    <div>
                                        <div style={{ color: 'var(--muted-foreground)', fontSize: '11.5px' }}>Déductible</div>
                                        <div style={{ color: 'var(--muted-foreground)', marginTop: '2px', fontSize: '13px' }}>{q.deductible}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ color: 'var(--muted-foreground)', fontSize: '11.5px' }}>Nette à payer</div>
                                        <div style={{ fontWeight: 800, color: 'var(--sidebar-primary)', marginTop: '2px', fontSize: '13.5px' }}>{q.netPayable}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted-foreground)', textAlign: 'left' }}>
                                    <th style={{ padding: '8px' }}>Période</th>
                                    <th style={{ padding: '8px' }}>TVA Collectée</th>
                                    <th style={{ padding: '8px' }}>TVA Déductible</th>
                                    <th style={{ padding: '8px' }}>TVA Nette à payer</th>
                                    <th style={{ padding: '8px' }}>Statut</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tvaQuarters.map((q, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '12px 8px', fontWeight: 600 }}>{q.quarter}</td>
                                        <td style={{ padding: '12px 8px', fontWeight: 700 }}>{q.collected}</td>
                                        <td style={{ padding: '12px 8px', color: 'var(--muted-foreground)' }}>{q.deductible}</td>
                                        <td style={{ padding: '12px 8px', fontWeight: 800, color: 'var(--sidebar-primary)' }}>{q.netPayable}</td>
                                        <td style={{ padding: '12px 8px' }}>
                                            <span style={{
                                                backgroundColor: q.status === 'Déclaré' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                                color: q.status === 'Déclaré' ? '#22c55e' : '#f59e0b',
                                                fontSize: '11px', padding: '2px 8px', borderRadius: '50px', fontWeight: 700
                                            }}>
                                                {q.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </form>
    );
}
