import React, { useState, useEffect, useMemo } from "react";
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

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const [setRes, compRes, invRes] = await Promise.all([
                    apiFetch('/v1/company/settings').catch(() => null),
                    apiFetch('/v1/company').catch(() => null),
                    apiFetch('/v1/invoices').catch(() => null)
                ]);

                const s = setRes?.data?.settings || setRes?.settings;
                if (s && s.defaultTvaRate !== undefined) {
                    setDefaultTvaRate(Number(s.defaultTvaRate));
                }

                const c = compRes?.data?.company || compRes?.company;
                if (c) {
                    if (c.isTvaFranchise) {
                        setTvaRegime("franchise");
                    } else {
                        setTvaRegime("simplifie");
                    }
                }

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

    const handleRegimeChange = (regime) => {
        setTvaRegime(regime);
        if (regime === 'franchise') {
            setDefaultTvaRate(0);
        } else if (defaultTvaRate === 0) {
            setDefaultTvaRate(20);
        }
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        if (isExpired) {
            window.dispatchEvent(new CustomEvent('subscription_expired', {
                detail: { message: "Votre abonnement a expiré. Pour modifier les paramètres de TVA, veuillez renouveler votre abonnement." }
            }));
            return;
        }
        setSaving(true);
        try {
            await Promise.all([
                apiFetch('/v1/company/settings', {
                    method: 'PATCH',
                    body: JSON.stringify({ defaultTvaRate })
                }),
                apiFetch('/v1/company', {
                    method: 'PATCH',
                    body: JSON.stringify({ isTvaFranchise: tvaRegime === "franchise" })
                })
            ]);
            triggerToast("Paramètres TVA enregistrés avec succès !");
        } catch (err) {
            triggerToast(err.message || "Erreur lors de l'enregistrement", true);
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Régime de TVA */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', backgroundColor: 'var(--card)' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Receipt size={18} style={{ color: 'var(--sidebar-primary)' }} />
                    Régime de TVA & Mentions Légales
                    <LegalHelpTooltip lawArticle="art. 293 B & 289 CGI" title="Régime de TVA" text="La franchise en base de TVA (art. 293 B) vous dispense de facturer la TVA. La mention obligatoire apparaît automatiquement sur vos factures." />
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px', borderRadius: '8px', border: tvaRegime === 'franchise' ? '2px solid var(--sidebar-primary)' : '1px solid var(--border)', backgroundColor: tvaRegime === 'franchise' ? 'rgba(91, 77, 219, 0.03)' : 'var(--background)', cursor: 'pointer' }}>
                        <input type="radio" name="tvaRegime" value="franchise" checked={tvaRegime === 'franchise'} onChange={() => handleRegimeChange('franchise')} style={{ marginTop: '3px' }} />
                        <div>
                            <span style={{ fontSize: '14px', fontWeight: 700, display: 'block' }}>Franchise en base de TVA (Art. 293 B du CGI)</span>
                            <span style={{ fontSize: '12px', color: 'var(--muted-foreground)', display: 'block', marginTop: '2px' }}>
                                Vous ne facturez pas la TVA à vos clients (Taux 0%) et vous ne la récupérez pas sur vos achats outillage. Mention légale imprimée automatiquement sur vos factures.
                            </span>
                        </div>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px', borderRadius: '8px', border: tvaRegime === 'simplifie' ? '2px solid var(--sidebar-primary)' : '1px solid var(--border)', backgroundColor: tvaRegime === 'simplifie' ? 'rgba(91, 77, 219, 0.03)' : 'var(--background)', cursor: 'pointer' }}>
                        <input type="radio" name="tvaRegime" value="simplifie" checked={tvaRegime === 'simplifie'} onChange={() => handleRegimeChange('simplifie')} style={{ marginTop: '3px' }} />
                        <div>
                            <span style={{ fontSize: '14px', fontWeight: 700, display: 'block' }}>Régime Réel Simplifié</span>
                            <span style={{ fontSize: '12px', color: 'var(--muted-foreground)', display: 'block', marginTop: '2px' }}>
                                Facturation de la TVA. Deux acomptes semestriels et une régularisation annuelle (Déclaration CA12).
                            </span>
                        </div>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px', borderRadius: '8px', border: tvaRegime === 'normal' ? '2px solid var(--sidebar-primary)' : '1px solid var(--border)', backgroundColor: tvaRegime === 'normal' ? 'rgba(91, 77, 219, 0.03)' : 'var(--background)', cursor: 'pointer' }}>
                        <input type="radio" name="tvaRegime" value="normal" checked={tvaRegime === 'normal'} onChange={() => handleRegimeChange('normal')} style={{ marginTop: '3px' }} />
                        <div>
                            <span style={{ fontSize: '14px', fontWeight: 700, display: 'block' }}>Régime Réel Normal</span>
                            <span style={{ fontSize: '12px', color: 'var(--muted-foreground)', display: 'block', marginTop: '2px' }}>
                                Déclarations mensuelles CA3 sur impots.gouv.fr. Conseillé pour les grandes entreprises d'installation HVAC.
                            </span>
                        </div>
                    </label>
                </div>
            </div>

            {/* Taux TVA par défaut & Options */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', backgroundColor: 'var(--card)' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 700 }}>Taux de TVA par défaut</h3>

                <div className="profile-form-grid">
                    <div className="form-field form-group-full">
                        <label className="form-label">Sélectionnez le taux de TVA pré-appliqué sur les devis</label>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '4px', flexWrap: 'wrap' }}>
                            {ratesOptions.map((rate) => (
                                <button
                                    key={rate}
                                    type="button"
                                    onClick={() => setDefaultTvaRate(rate)}
                                    style={{
                                        flex: 1,
                                        minWidth: '120px',
                                        padding: '10px',
                                        borderRadius: '8px',
                                        border: defaultTvaRate === rate ? '2px solid var(--sidebar-primary)' : '1px solid var(--border)',
                                        backgroundColor: defaultTvaRate === rate ? 'var(--sidebar-primary)' : 'var(--background)',
                                        color: defaultTvaRate === rate ? '#fff' : 'var(--foreground)',
                                        fontWeight: 800,
                                        fontSize: '13.5px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {rate}% {rate === 20 ? '(Normal)' : rate === 10 ? '(Rénovation)' : rate === 5.5 ? '(Énergie)' : '(Exonéré)'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                    <button
                        type="submit"
                        disabled={saving}
                        className="save-profile-btn"
                        style={{
                            padding: '9px 20px',
                            backgroundColor: 'var(--sidebar-primary)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 600,
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
            </div>

            {/* Historique Déclarations TVA */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', backgroundColor: 'var(--card)' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={18} style={{ color: 'var(--sidebar-primary)' }} />
                    TVA Collectée sur Factures Réglées
                </h3>

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
            </div>
        </form>
    );
}
