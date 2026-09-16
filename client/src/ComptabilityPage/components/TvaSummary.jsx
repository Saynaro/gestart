import React, { useState, useEffect } from "react";
import { Info, CheckCircle2, AlertCircle, Calendar } from "lucide-react";
import { apiFetch } from "../../utils/api";

function TvaSummary() {
    const now = new Date();
    const currentQ = now.getMonth() <= 2 ? "T1" : now.getMonth() <= 5 ? "T2" : now.getMonth() <= 8 ? "T3" : "T4";
    const currentY = String(now.getFullYear());

    const [selectedQuarter, setSelectedQuarter] = useState(currentQ);
    const [selectedYear, setSelectedYear] = useState(currentY);
    const [tvaRegime, setTvaRegime] = useState("encaissements"); // 'encaissements' or 'debits'
    const [tvaReport, setTvaReport] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchReport = async () => {
        try {
            const data = await apiFetch(`/v1/reports/revenue?year=${selectedYear}`);
            setTvaReport(data.data || data);
        } catch (err) {
            console.warn("API report/revenue non disponible:", err.message);
        }
    };

    useEffect(() => {
        fetchReport();
    }, [selectedYear]);

    const declarationKey = `${selectedYear}-${selectedQuarter}`;
    const declarationInfo = tvaReport?.declarations?.[declarationKey];
    const isDeclared = !!declarationInfo?.declared;
    const declaredAtDate = declarationInfo?.declaredAt 
        ? new Date(declarationInfo.declaredAt).toLocaleDateString("fr-FR")
        : null;

    // Active quarters data based on selected regime
    const activeQuartersMap = tvaRegime === "encaissements"
        ? (tvaReport?.quartersEncaissements || tvaReport?.quarters)
        : (tvaReport?.quartersDebits || tvaReport?.quarters);

    const current = {
        period: selectedQuarter === "T1" ? `01 janv → 31 mars ${selectedYear}` : selectedQuarter === "T2" ? `01 avr → 30 juin ${selectedYear}` : selectedQuarter === "T3" ? `01 juil → 30 sept ${selectedYear}` : `01 oct → 31 déc ${selectedYear}`,
        base0: activeQuartersMap?.[selectedQuarter]?.base0 || 0,
        tva0: activeQuartersMap?.[selectedQuarter]?.tva0 || 0,
        base5: activeQuartersMap?.[selectedQuarter]?.base5 || 0,
        tva5: activeQuartersMap?.[selectedQuarter]?.tva5 || 0,
        base10: activeQuartersMap?.[selectedQuarter]?.base10 || 0,
        tva10: activeQuartersMap?.[selectedQuarter]?.tva10 || 0,
        base20: activeQuartersMap?.[selectedQuarter]?.base20 || 0,
        tva20: activeQuartersMap?.[selectedQuarter]?.tva20 || 0,
        totalBase: activeQuartersMap?.[selectedQuarter]?.totalBase || 0,
        totalTva: activeQuartersMap?.[selectedQuarter]?.totalTva || 0
    };

    const quarters = ["T1", "T2", "T3", "T4"];
    const years = ["2026", "2025"];

    const handleMarkDeclared = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            const nextStatus = !isDeclared;
            await apiFetch('/v1/reports/tva-declaration', {
                method: 'POST',
                body: {
                    year: selectedYear,
                    quarter: selectedQuarter,
                    declared: nextStatus
                }
            });
            // Refresh report to get updated declarations from DB
            await fetchReport();
        } catch (e) {
            console.error("Erreur déclaration TVA:", e.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="comptability-cards-stack">
            {/* RÉSUMÉ TVA */}
            <div className="comptability-card primary-accent-card">
                <div className="widget-header">
                    <div className="title-area">
                        <div className="header-icon-container">
                            <Calendar size={18} />
                        </div>
                        <div>
                            <h3>Résumé TVA</h3>
                            <p className="subtitle">Calcul automatique de la TVA collectée</p>
                        </div>
                    </div>
                </div>

                {/* Sélecteur de régime TVA (Encaissements vs Débits) */}
                <div className="tva-regime-switcher-row">
                    <button 
                        type="button"
                        className={`regime-switch-btn ${tvaRegime === "encaissements" ? "active" : ""}`}
                        onClick={() => setTvaRegime("encaissements")}
                    >
                        <span className="regime-title">TVA sur les encaissements</span>
                        <span className="regime-badge-recommended">Recommandé • Factures payées</span>
                    </button>
                    <button 
                        type="button"
                        className={`regime-switch-btn ${tvaRegime === "debits" ? "active" : ""}`}
                        onClick={() => setTvaRegime("debits")}
                    >
                        <span className="regime-title">TVA sur les débits</span>
                        <span className="regime-subtext">Toutes factures émises</span>
                    </button>
                </div>

                {/* Explication règle fiscale */}
                <div className="tva-regime-info-banner">
                    <Info size={16} className="info-icon-svg" />
                    <div className="info-text">
                        {tvaRegime === "encaissements" ? (
                            <span><strong>Règle fiscale (Art. 269-2-c CGI) :</strong> La TVA est exigible uniquement lors du règlement effectif par le client. Recommandé pour les prestations de services et l'installation.</span>
                        ) : (
                            <span><strong>Option sur les débits :</strong> La TVA est exigible dès l'émission de la facture, même si le paiement n'a pas encore été perçu.</span>
                        )}
                    </div>
                </div>

                <div className="tva-selectors">
                    <div className="quarter-selector-row">
                        {quarters.map((q) => (
                            <button
                                key={q}
                                className={`quarter-btn ${selectedQuarter === q ? "active" : ""}`}
                                onClick={() => { setSelectedQuarter(q); }}
                            >
                                {q}
                            </button>
                        ))}
                    </div>

                    <select 
                        className="year-selector"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                    >
                        {years.map((y) => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>

                <div className="active-period-indicator">
                    <span>Période : <strong>{current.period}</strong> ({tvaRegime === "encaissements" ? "Factures encaissées" : "Factures émises"})</span>
                </div>

                <div className="table-responsive">
                    <table className="widget-table comptability-table">
                        <thead>
                            <tr>
                                <th>Taux TVA</th>
                                <th className="text-right">Base HT</th>
                                <th className="text-right">TVA</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tvaReport === null ? (
                                [1, 2, 3, 4, 5].map((i) => (
                                    <tr key={i}>
                                        <td><div className="skeleton-shimmer" style={{ width: "70px", height: "14px", borderRadius: "4px" }} /></td>
                                        <td className="text-right"><div className="skeleton-shimmer" style={{ width: "90px", height: "14px", borderRadius: "4px", marginLeft: "auto" }} /></td>
                                        <td className="text-right"><div className="skeleton-shimmer" style={{ width: "80px", height: "14px", borderRadius: "4px", marginLeft: "auto" }} /></td>
                                    </tr>
                                ))
                            ) : (
                                <>
                                    <tr>
                                        <td>Taux 0%</td>
                                        <td className="text-right">{current.base0.toLocaleString("fr-FR")} €</td>
                                        <td className="text-right">{current.tva0.toLocaleString("fr-FR")} €</td>
                                    </tr>
                                    <tr>
                                        <td>Taux 5.5%</td>
                                        <td className="text-right">{current.base5.toLocaleString("fr-FR")} €</td>
                                        <td className="text-right">{current.tva5.toLocaleString("fr-FR")} €</td>
                                    </tr>
                                    <tr>
                                        <td>Taux 10%</td>
                                        <td className="text-right">{current.base10.toLocaleString("fr-FR")} €</td>
                                        <td className="text-right">{current.tva10.toLocaleString("fr-FR")} €</td>
                                    </tr>
                                    <tr>
                                        <td>Taux 20%</td>
                                        <td className="text-right">{current.base20.toLocaleString("fr-FR")} €</td>
                                        <td className="text-right">{current.tva20.toLocaleString("fr-FR")} €</td>
                                    </tr>
                                    <tr className="table-total-row">
                                        <td><strong>TOTAL</strong></td>
                                        <td className="text-right"><strong>{current.totalBase.toLocaleString("fr-FR")} €</strong></td>
                                        <td className="text-right"><strong>{current.totalTva.toLocaleString("fr-FR")} €</strong></td>
                                    </tr>
                                </>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="tva-declared-banner">
                    <span className="banner-label">TOTAL TVA À DÉCLARER</span>
                    {tvaReport === null ? (
                        <div className="skeleton-shimmer" style={{ width: "120px", height: "24px", borderRadius: "6px" }} />
                    ) : (
                        <span className="banner-value">{current.totalTva.toLocaleString("fr-FR")} €</span>
                    )}
                </div>
            </div>

            {/* GUIDE DÉCLARATION CA3 */}
            <div className="comptability-card">
                <div className="widget-header">
                    <div className="title-area">
                        <div className="header-icon-container">
                            <Info size={18} />
                        </div>
                        <div>
                            <h3>Guide Déclaration CA3</h3>
                            <p className="subtitle">Impôts.gouv.fr — Aide au remplissage</p>
                        </div>
                    </div>
                </div>

                <div className="ca3-guide-container">
                    <div className="ca3-guide-list">
                        <div className="ca3-guide-item">
                            <span className="line-code">Ligne 01 (Ventes / Prestations)</span>
                            <span className="line-val">{current.totalBase.toLocaleString("fr-FR")} €</span>
                        </div>
                        <div className="ca3-guide-item">
                            <span className="line-code">Ligne 08 (TVA 20%)</span>
                            <span className="line-val">{current.tva20.toLocaleString("fr-FR")} €</span>
                        </div>
                        <div className="ca3-guide-item">
                            <span className="line-code">Ligne 09 (TVA 10%)</span>
                            <span className="line-val">{current.tva10.toLocaleString("fr-FR")} €</span>
                        </div>
                        <div className="ca3-guide-item">
                            <span className="line-code">Ligne 10 (TVA 5.5%)</span>
                            <span className="line-val">{current.tva5.toLocaleString("fr-FR")} €</span>
                        </div>
                        <div className="ca3-guide-item total">
                            <span className="line-code">Total TVA due</span>
                            <span className="line-val"><strong>{current.totalTva.toLocaleString("fr-FR")} €</strong></span>
                        </div>
                    </div>
                </div>

                <div className="declaration-status-area">
                    <div className="status-indicator">
                        <span className="label">Statut :</span>
                        <div className="status-badge">
                            {isDeclared ? (
                                <span className="declared text-success">
                                    <CheckCircle2 size={16} /> Déclaré {declaredAtDate ? `le ${declaredAtDate}` : ""}
                                </span>
                            ) : (
                                <span className="non-declared text-warning">
                                    <AlertCircle size={16} /> Non déclaré
                                </span>
                            )}
                        </div>
                    </div>

                    <button 
                        className={`declare-action-btn ${isDeclared ? "declared-active" : ""}`}
                        onClick={handleMarkDeclared}
                    >
                        {isDeclared ? "Marquer comme non déclaré" : "✓ Marquer comme déclaré"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default TvaSummary;
