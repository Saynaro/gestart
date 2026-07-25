import React, { useState } from "react";
import { Receipt, Check, FileText, HelpCircle, ArrowRight } from "lucide-react";
import { LegalHelpTooltip } from "../../components/LegalHelpModal";

export default function TvaTab({ isMobileView, triggerToast }) {
    const [tvaRegime, setTvaRegime] = useState("franchise"); // "franchise" | "simplifie" | "normal"
    const [defaultTvaRate, setDefaultTvaRate] = useState(20);
    const [declarationPeriodicity, setDeclarationPeriodicity] = useState("trimestrielle");
    const [isTvaOnDebits, setIsTvaOnDebits] = useState(false);

    const [tvaQuarters, setTvaQuarters] = useState([
        { quarter: "T2 2026 (Avr-Juin)", collected: "2 840 €", deductible: "620 €", netPayable: "2 220 €", status: "Déclaré", dateDeclared: "15/07/2026" },
        { quarter: "T1 2026 (Jan-Mars)", collected: "1 680 €", deductible: "410 €", netPayable: "1 270 €", status: "Déclaré", dateDeclared: "14/04/2026" },
        { quarter: "T3 2026 (Juil-Sept)", collected: "2 940 €", deductible: "780 €", netPayable: "2 160 €", status: "À déclarer", dateDeclared: "—" }
    ]);

    const ratesOptions = [0, 5.5, 10, 20];

    const handleMarkDeclared = (quarterName) => {
        setTvaQuarters(prev => prev.map(q => q.quarter === quarterName ? { ...q, status: "Déclaré", dateDeclared: "24/07/2026" } : q));
        triggerToast(`Trimestre ${quarterName} marqué comme Déclaré sur impots.gouv.fr !`);
    };

    const handleSubmit = (e) => {
        if (e) e.preventDefault();
        triggerToast("Paramètres TVA enregistrés avec succès !");
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
                        <input type="radio" name="tvaRegime" value="franchise" checked={tvaRegime === 'franchise'} onChange={() => setTvaRegime('franchise')} style={{ marginTop: '3px' }} />
                        <div>
                            <span style={{ fontSize: '14px', fontWeight: 700, display: 'block' }}>Franchise en base de TVA (Art. 293 B du CGI)</span>
                            <span style={{ fontSize: '12px', color: 'var(--muted-foreground)', display: 'block', marginTop: '2px' }}>
                                Vous ne facturez pas la TVA à vos clients et vous ne la récupérez pas sur vos achats outillage. Mention imprimée sur vos factures.
                            </span>
                        </div>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px', borderRadius: '8px', border: tvaRegime === 'simplifie' ? '2px solid var(--sidebar-primary)' : '1px solid var(--border)', backgroundColor: tvaRegime === 'simplifie' ? 'rgba(91, 77, 219, 0.03)' : 'var(--background)', cursor: 'pointer' }}>
                        <input type="radio" name="tvaRegime" value="simplifie" checked={tvaRegime === 'simplifie'} onChange={() => setTvaRegime('simplifie')} style={{ marginTop: '3px' }} />
                        <div>
                            <span style={{ fontSize: '14px', fontWeight: 700, display: 'block' }}>Régime Réel Simplifié</span>
                            <span style={{ fontSize: '12px', color: 'var(--muted-foreground)', display: 'block', marginTop: '2px' }}>
                                Facturation de la TVA. Deux acomptes semestriels et une régularisation annuelle (Déclaration CA12).
                            </span>
                        </div>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px', borderRadius: '8px', border: tvaRegime === 'normal' ? '2px solid var(--sidebar-primary)' : '1px solid var(--border)', backgroundColor: tvaRegime === 'normal' ? 'rgba(91, 77, 219, 0.03)' : 'var(--background)', cursor: 'pointer' }}>
                        <input type="radio" name="tvaRegime" value="normal" checked={tvaRegime === 'normal'} onChange={() => setTvaRegime('normal')} style={{ marginTop: '3px' }} />
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
                <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 700 }}>Taux de TVA par défaut (Pills)</h3>

                <div className="profile-form-grid">
                    <div className="form-field form-group-full">
                        <label className="form-label">Sélectionnez le taux de TVA pré-appliqué sur les devis</label>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                            {ratesOptions.map((rate) => (
                                <button
                                    key={rate}
                                    type="button"
                                    onClick={() => setDefaultTvaRate(rate)}
                                    style={{
                                        flex: 1,
                                        padding: '10px',
                                        borderRadius: '8px',
                                        border: defaultTvaRate === rate ? '2px solid var(--sidebar-primary)' : '1px solid var(--border)',
                                        backgroundColor: defaultTvaRate === rate ? 'var(--sidebar-primary)' : 'var(--background)',
                                        color: defaultTvaRate === rate ? '#fff' : 'var(--foreground)',
                                        fontWeight: 800,
                                        fontSize: '14px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {rate}% {rate === 20 ? '(Taux normal)' : rate === 10 ? '(Rénovation)' : rate === 5.5 ? '(Énergie)' : '(Exonéré)'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="form-field form-group-full" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px', padding: '12px', border: '1px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--background)' }}>
                        <div>
                            <span style={{ fontSize: '13.5px', fontWeight: 600 }}>TVA sur les débits (Option d'exigibilité)</span>
                            <span style={{ fontSize: '12px', color: 'var(--muted-foreground)', display: 'block' }}>Exigibilité de la TVA dès l'émission de la facture au lieu du paiement client.</span>
                        </div>
                        <label className="mobile-toggle-switch">
                            <input
                                type="checkbox"
                                checked={isTvaOnDebits}
                                onChange={(e) => {
                                    setIsTvaOnDebits(e.target.checked);
                                    triggerToast(e.target.checked ? "Option TVA sur les débits activée." : "TVA sur les encaissements.");
                                }}
                            />
                            <span className="toggle-slider" />
                        </label>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                    <button type="submit" className="save-profile-btn" style={{ padding: '9px 20px', backgroundColor: 'var(--sidebar-primary)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                        Enregistrer la TVA
                    </button>
                </div>
            </div>

            {/* Résumé TVA Trimestriel & Guide CA3 */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', backgroundColor: 'var(--card)' }}>
                <h4 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: 700 }}>Résumé TVA par trimestre & Aide à la déclaration CA3</h4>
                {isMobileView ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {tvaQuarters.map((q, idx) => (
                            <div key={idx} style={{ padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--background)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--foreground)' }}>{q.quarter}</span>
                                    <span style={{ backgroundColor: q.status === 'Déclaré' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(245, 158, 11, 0.1)', color: q.status === 'Déclaré' ? '#22c55e' : '#f59e0b', fontSize: '11px', padding: '2px 8px', borderRadius: '50px', fontWeight: 700 }}>
                                        {q.status}
                                    </span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '12px' }}>
                                    <div>Collectée: <strong style={{ color: '#22c55e' }}>+ {q.collected}</strong></div>
                                    <div>Déductible: <strong style={{ color: '#ef4444' }}>- {q.deductible}</strong></div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px', borderTop: '1px dashed var(--border)' }}>
                                    <div>Net à payer: <strong style={{ fontSize: '14px', color: 'var(--foreground)' }}>{q.netPayable}</strong></div>
                                    {q.status !== 'Déclaré' ? (
                                        <button
                                            type="button"
                                            onClick={() => handleMarkDeclared(q.quarter)}
                                            style={{ padding: '6px 10px', borderRadius: '6px', backgroundColor: 'var(--sidebar-primary)', color: '#fff', border: 'none', fontWeight: 600, fontSize: '11px', cursor: 'pointer' }}
                                        >
                                            Déclarer
                                        </button>
                                    ) : (
                                        <span style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>{q.dateDeclared}</span>
                                    )}
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
                                    <th style={{ padding: '8px' }}>TVA Collectée (Ventes)</th>
                                    <th style={{ padding: '8px' }}>TVA Déductible (Achats)</th>
                                    <th style={{ padding: '8px' }}>TVA Net à payer</th>
                                    <th style={{ padding: '8px' }}>Statut</th>
                                    <th style={{ padding: '8px', textAlign: 'right' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tvaQuarters.map((q, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '10px 8px', fontWeight: 600 }}>{q.quarter}</td>
                                        <td style={{ padding: '10px 8px', color: '#22c55e', fontWeight: 600 }}>+ {q.collected}</td>
                                        <td style={{ padding: '10px 8px', color: '#ef4444', fontWeight: 600 }}>- {q.deductible}</td>
                                        <td style={{ padding: '10px 8px', fontWeight: 800, color: 'var(--foreground)' }}>{q.netPayable}</td>
                                        <td style={{ padding: '10px 8px' }}>
                                            <span style={{ backgroundColor: q.status === 'Déclaré' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(245, 158, 11, 0.1)', color: q.status === 'Déclaré' ? '#22c55e' : '#f59e0b', fontSize: '11px', padding: '2px 8px', borderRadius: '50px', fontWeight: 700 }}>
                                                {q.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                                            {q.status !== 'Déclaré' ? (
                                                <button
                                                    type="button"
                                                    onClick={() => handleMarkDeclared(q.quarter)}
                                                    style={{ padding: '6px 12px', borderRadius: '6px', backgroundColor: 'var(--sidebar-primary)', color: '#fff', border: 'none', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
                                                >
                                                    Marquer comme Déclaré
                                                </button>
                                            ) : (
                                                <span style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>Le {q.dateDeclared}</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Guide cases impots.gouv.fr */}
                <div style={{ marginTop: '16px', padding: '14px', backgroundColor: 'rgba(91, 77, 219, 0.04)', borderRadius: '8px', border: '1px dashed rgba(91, 77, 219, 0.2)', fontSize: '12.5px' }}>
                    <span style={{ fontWeight: 700, color: 'var(--sidebar-primary)', display: 'block', marginBottom: '4px' }}>💡 Guide remplissage des cases CA3 impots.gouv.fr :</span>
                    <ul style={{ margin: 0, paddingLeft: '18px', color: 'var(--muted-foreground)' }}>
                        <li><strong>Case 08 (Taux normal 20%) :</strong> Inscrire la base HT des prestations de services.</li>
                        <li><strong>Case 09 (Taux réduit 10%) :</strong> Inscrire la base HT pour la rénovation thermique.</li>
                        <li><strong>Case 20 (TVA déductible sur autres biens et services) :</strong> Inscrire le montant de TVA déductible sur vos achats.</li>
                    </ul>
                </div>
            </div>
        </form>
    );
}
