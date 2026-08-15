import React, { useState, useEffect, useMemo } from "react";
import { Percent, Calendar, CheckCircle2, AlertCircle, FileText, Loader2 } from "lucide-react";
import { apiFetch } from "../../utils/api";

export default function CotisationsTab({ isMobileView, triggerToast }) {
    const [activityType, setActivityType] = useState("BIC"); // "BIC" | "BNC" | "VENTE"
    const [declarationPeriodicity, setDeclarationPeriodicity] = useState("Trimestrielle");
    const [isAcreBeneficiary, setIsAcreBeneficiary] = useState(false);
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);

    // Taux cotisations sociales auto-entrepreneur 2026
    const rateMap = {
        BIC: { rate: 21.2, name: "Prestation de services BIC (Artisans / Bâtiment)" },
        BNC: { rate: 21.1, name: "Prestation de services BNC (Professions libérales)" },
        VENTE: { rate: 12.3, name: "Vente de marchandises (BIC)" }
    };

    const currentRate = isAcreBeneficiary ? (rateMap[activityType].rate / 2).toFixed(1) : rateMap[activityType].rate;

    useEffect(() => {
        const loadData = async () => {
            try {
                const [invRes, compRes] = await Promise.all([
                    apiFetch('/v1/invoices').catch(() => null),
                    apiFetch('/v1/company').catch(() => null)
                ]);

                const invList = invRes?.data?.invoices || invRes?.invoices || (Array.isArray(invRes) ? invRes : []);
                setInvoices(invList);

                const comp = compRes?.data?.company || compRes?.company;
                if (comp?.legalForm?.includes("Auto") || comp?.isTvaFranchise) {
                    setActivityType("BIC");
                }
            } catch (err) {
                console.warn("Could not load invoices for cotisations:", err.message);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    // Calculate real quarter CA from paid invoices
    const { t1CA, t2CA, t3CA, t4CA, totalYearCA } = useMemo(() => {
        let t1 = 0, t2 = 0, t3 = 0, t4 = 0;
        invoices.forEach(inv => {
            if (inv.status === "PAID" || inv.status === "paid") {
                const amt = Number(inv.totalHt || inv.subtotalHt || inv.totalTtc || 0);
                const d = new Date(inv.date || inv.createdAt);
                const m = d.getMonth();
                if (m >= 0 && m <= 2) t1 += amt;
                else if (m >= 3 && m <= 5) t2 += amt;
                else if (m >= 6 && m <= 8) t3 += amt;
                else t4 += amt;
            }
        });
        return { t1CA: t1, t2CA: t2, t3CA: t3, t4CA: t4, totalYearCA: t1 + t2 + t3 + t4 };
    }, [invoices]);

    const currentMonth = new Date().getMonth();
    const activeQuarterCA = currentMonth <= 2 ? t1CA : currentMonth <= 5 ? t2CA : currentMonth <= 8 ? t3CA : t4CA;
    const currentDue = Math.round(activeQuarterCA * (Number(currentRate) / 100));

    const urssafDeclarations = useMemo(() => {
        const rateNum = Number(currentRate);
        return [
            { period: "T3 2026 (Juil - Sept)", ca: `${t3CA.toLocaleString("fr-FR")} €`, rate: `${currentRate}%`, due: `${Math.round(t3CA * (rateNum / 100)).toLocaleString("fr-FR")} €`, status: t3CA > 0 ? "À déclarer" : "Période en cours", datePayed: "Échéance 31/10/2026" },
            { period: "T2 2026 (Avr - Juin)", ca: `${t2CA.toLocaleString("fr-FR")} €`, rate: `${currentRate}%`, due: `${Math.round(t2CA * (rateNum / 100)).toLocaleString("fr-FR")} €`, status: t2CA > 0 ? "Déclaré" : "—", datePayed: "Échéance 31/07/2026" },
            { period: "T1 2026 (Jan - Mars)", ca: `${t1CA.toLocaleString("fr-FR")} €`, rate: `${currentRate}%`, due: `${Math.round(t1CA * (rateNum / 100)).toLocaleString("fr-FR")} €`, status: t1CA > 0 ? "Déclaré" : "—", datePayed: "Échéance 30/04/2026" }
        ];
    }, [t1CA, t2CA, t3CA, currentRate]);

    const handleSubmit = (e) => {
        if (e) e.preventDefault();
        triggerToast("Paramètres de cotisations sociales enregistrés !");
    };

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Banner Prochaine Déclaration */}
            <div style={{ backgroundColor: 'rgba(91, 77, 219, 0.04)', border: '1px solid rgba(91, 77, 219, 0.15)', borderRadius: '12px', padding: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: 'var(--sidebar-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Calendar size={20} />
                    </div>
                    <div>
                        <span style={{ fontSize: '12px', color: 'var(--muted-foreground)', fontWeight: 600 }}>Estimation cotisations du trimestre en cours</span>
                        <h4 style={{ margin: '2px 0 0 0', fontSize: '16px', fontWeight: 800 }}>
                            {currentDue.toLocaleString("fr-FR")} € <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--muted-foreground)' }}>(sur {activeQuarterCA.toLocaleString("fr-FR")} € HT encaissés)</span>
                        </h4>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => triggerToast("Redirection vers Autoentrepreneur URSSAF...")}
                    style={{ padding: '9px 16px', backgroundColor: 'var(--sidebar-primary)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                >
                    Déclarer sur Urssaf.fr
                </button>
            </div>

            {/* Formulaire de configuration des taux */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', backgroundColor: 'var(--card)' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Percent size={18} style={{ color: 'var(--sidebar-primary)' }} />
                    Configuration du taux de cotisations
                </h3>

                <div className="profile-form-grid">
                    <div className="form-field form-group-full">
                        <label className="form-label">Type d'activité déclarée à l'URSSAF</label>
                        <select className="form-input" value={activityType} onChange={(e) => setActivityType(e.target.value)}>
                            <option value="BIC">Prestation de services BIC (Artisans, HVAC, Plomberie) — Taux : 21,2%</option>
                            <option value="BNC">Prestation de services BNC (Professions libérales non réglementées) — Taux : 21,1%</option>
                            <option value="VENTE">Vente de marchandises (BIC) — Taux : 12,3%</option>
                        </select>
                    </div>

                    <div className="form-field">
                        <label className="form-label">Périodicité des déclarations</label>
                        <select className="form-input" value={declarationPeriodicity} onChange={(e) => setDeclarationPeriodicity(e.target.value)}>
                            <option value="Trimestrielle">Trimestrielle (Jan, Avr, Juil, Oct)</option>
                            <option value="Mensuelle">Mensuelle (Chaque fin de mois)</option>
                        </select>
                    </div>

                    <div className="form-field">
                        <label className="form-label">Taux effectif appliqué</label>
                        <input
                            type="text"
                            className="form-input"
                            value={`${currentRate}% ${isAcreBeneficiary ? '(ACRE Activé)' : ''}`}
                            readOnly
                            style={{ backgroundColor: 'rgba(0,0,0,0.03)', fontWeight: 700, color: 'var(--sidebar-primary)' }}
                        />
                    </div>

                    <div className="form-field form-group-full" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                        <input
                            type="checkbox"
                            id="acre-checkbox"
                            checked={isAcreBeneficiary}
                            onChange={(e) => {
                                setIsAcreBeneficiary(e.target.checked);
                                triggerToast(e.target.checked ? "ACRE Activée : Taux réduit appliqué (-50%) !" : "ACRE Désactivée.");
                            }}
                            style={{ width: '16px', height: '16px', accentColor: 'var(--sidebar-primary)' }}
                        />
                        <label htmlFor="acre-checkbox" style={{ fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                            Bénéficiaire de l'ACRE (Aide aux Créateurs et Repreneurs d'Entreprise — exonération 50% première année)
                        </label>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                    <button type="submit" className="save-profile-btn" style={{ padding: '9px 20px', backgroundColor: 'var(--sidebar-primary)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                        Enregistrer les taux
                    </button>
                </div>
            </div>

            {/* Historique des déclarations trimestrielles */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', backgroundColor: 'var(--card)' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={18} style={{ color: 'var(--sidebar-primary)' }} />
                    Déclarations et Cotisations Calculées
                </h3>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted-foreground)', textAlign: 'left' }}>
                                <th style={{ padding: '8px' }}>Période</th>
                                <th style={{ padding: '8px' }}>CA Encaissé</th>
                                <th style={{ padding: '8px' }}>Taux</th>
                                <th style={{ padding: '8px' }}>Cotisations Dues</th>
                                <th style={{ padding: '8px' }}>Statut</th>
                            </tr>
                        </thead>
                        <tbody>
                            {urssafDeclarations.map((decl, index) => (
                                <tr key={index} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '12px 8px', fontWeight: 600 }}>{decl.period}</td>
                                    <td style={{ padding: '12px 8px', fontWeight: 700 }}>{decl.ca}</td>
                                    <td style={{ padding: '12px 8px', color: 'var(--muted-foreground)' }}>{decl.rate}</td>
                                    <td style={{ padding: '12px 8px', fontWeight: 800, color: 'var(--sidebar-primary)' }}>{decl.due}</td>
                                    <td style={{ padding: '12px 8px' }}>
                                        <span style={{
                                            backgroundColor: decl.status === 'Déclaré' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                            color: decl.status === 'Déclaré' ? '#22c55e' : '#f59e0b',
                                            fontSize: '11px', padding: '2px 8px', borderRadius: '50px', fontWeight: 700
                                        }}>
                                            {decl.status}
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
