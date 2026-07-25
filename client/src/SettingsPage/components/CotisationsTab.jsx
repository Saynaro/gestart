import React, { useState } from "react";
import { Percent, Calendar, CheckCircle2, AlertCircle, FileText } from "lucide-react";

export default function CotisationsTab({ isMobileView, triggerToast }) {
    const [activityType, setActivityType] = useState("BNC"); // "BIC" | "BNC" | "VENTE"
    const [declarationPeriodicity, setDeclarationPeriodicity] = useState("Trimestrielle");
    const [isAcreBeneficiary, setIsAcreBeneficiary] = useState(false);

    // Taux cotisations sociales auto-entrepreneur 2026
    const rateMap = {
        BIC: { rate: 21.2, name: "Prestation de services BIC (Artisans / Bâtiment)" },
        BNC: { rate: 21.1, name: "Prestation de services BNC (Professions libérales)" },
        VENTE: { rate: 12.3, name: "Vente de marchandises (BIC)" }
    };

    const currentRate = isAcreBeneficiary ? (rateMap[activityType].rate / 2).toFixed(1) : rateMap[activityType].rate;

    const caQuarter2 = 14200;
    const dueQuarter2 = Math.round(caQuarter2 * (currentRate / 100));

    const urssafDeclarations = [
        { period: "T2 2026 (Avr - Juin)", ca: "14 200 €", rate: `${currentRate}%`, due: `${dueQuarter2} €`, status: "Payé", datePayed: "18/07/2026" },
        { period: "T1 2026 (Jan - Mars)", ca: "8 400 €", rate: `${currentRate}%`, due: `${Math.round(8400 * (currentRate / 100))} €`, status: "Payé", datePayed: "20/04/2026" },
        { period: "T4 2025 (Oct - Déc)", ca: "11 500 €", rate: "21.1%", due: "2 426 €", status: "Payé", datePayed: "22/01/2026" }
    ];

    const nextDeclarationDate = "31 Octobre 2026 (T3 2026)";

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
                        <span style={{ fontSize: '12px', color: 'var(--muted-foreground)', fontWeight: 600 }}>Prochaine déclaration URSSAF</span>
                        <h4 style={{ margin: '2px 0 0 0', fontSize: '15px', fontWeight: 800 }}>{nextDeclarationDate}</h4>
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
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        <label htmlFor="acre-checkbox" style={{ fontSize: '13.5px', fontWeight: 600, cursor: 'pointer' }}>
                            Bénéficiaire de l'ACRE (Aide aux Créateurs et Repreneurs d'Entreprise - 50% de réduction la 1ère année)
                        </label>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                    <button type="submit" className="save-profile-btn" style={{ padding: '9px 20px', backgroundColor: 'var(--sidebar-primary)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                        Enregistrer la configuration
                    </button>
                </div>
            </div>

            {/* Historique des déclarations URSSAF */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', backgroundColor: 'var(--card)' }}>
                <h4 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: 700 }}>Historique des déclarations & Cotisations réglées</h4>
                {isMobileView ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {urssafDeclarations.map((item, idx) => (
                            <div key={idx} style={{ padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--background)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--foreground)' }}>{item.period}</span>
                                    <span style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', fontSize: '11px', padding: '2px 8px', borderRadius: '50px', fontWeight: 700 }}>
                                        {item.status}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px' }}>
                                    <div>CA: <strong>{item.ca}</strong> <span style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>({item.rate})</span></div>
                                    <div>Dues: <strong style={{ fontSize: '13.5px', color: 'var(--foreground)' }}>{item.due}</strong></div>
                                </div>
                                <div style={{ fontSize: '11.5px', color: 'var(--muted-foreground)', textAlign: 'right' }}>
                                    Réglé le {item.datePayed}
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
                                    <th style={{ padding: '8px' }}>CA Déclaré</th>
                                    <th style={{ padding: '8px' }}>Taux</th>
                                    <th style={{ padding: '8px' }}>Cotisations dues</th>
                                    <th style={{ padding: '8px' }}>Statut</th>
                                    <th style={{ padding: '8px', textAlign: 'right' }}>Date règlement</th>
                                </tr>
                            </thead>
                            <tbody>
                                {urssafDeclarations.map((item, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '10px 8px', fontWeight: 600 }}>{item.period}</td>
                                        <td style={{ padding: '10px 8px' }}>{item.ca}</td>
                                        <td style={{ padding: '10px 8px' }}>{item.rate}</td>
                                        <td style={{ padding: '10px 8px', fontWeight: 700, color: 'var(--foreground)' }}>{item.due}</td>
                                        <td style={{ padding: '10px 8px' }}>
                                            <span style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', fontSize: '11px', padding: '2px 8px', borderRadius: '50px', fontWeight: 700 }}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '10px 8px', textAlign: 'right', color: 'var(--muted-foreground)' }}>{item.datePayed}</td>
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
