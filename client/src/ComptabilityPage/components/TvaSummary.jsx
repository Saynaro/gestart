import React, { useState, useEffect } from "react";
import { Info, CheckCircle2, AlertCircle, Calendar } from "lucide-react";
import { apiFetch } from "../../utils/api";

function TvaSummary() {
    const [selectedQuarter, setSelectedQuarter] = useState("T1");
    const [selectedYear, setSelectedYear] = useState("2026");
    const [isDeclared, setIsDeclared] = useState(false);
    const [tvaReport, setTvaReport] = useState(null);

    useEffect(() => {
        const fetchReport = async () => {
            try {
                const data = await apiFetch('/v1/reports/revenue');
                setTvaReport(data.data || data);
            } catch (err) {
                console.warn("API report/revenue non disponible:", err.message);
            }
        };

        fetchReport();
    }, [selectedQuarter, selectedYear]);

    const current = {
        period: selectedQuarter === "T1" ? `01 janv → 31 mars ${selectedYear}` : selectedQuarter === "T2" ? `01 avr → 30 juin ${selectedYear}` : selectedQuarter === "T3" ? `01 juil → 30 sept ${selectedYear}` : `01 oct → 31 déc ${selectedYear}`,
        base0: tvaReport?.quarters?.[selectedQuarter]?.base0 || 0,
        tva0: tvaReport?.quarters?.[selectedQuarter]?.tva0 || 0,
        base5: tvaReport?.quarters?.[selectedQuarter]?.base5 || 0,
        tva5: tvaReport?.quarters?.[selectedQuarter]?.tva5 || 0,
        base10: tvaReport?.quarters?.[selectedQuarter]?.base10 || 0,
        tva10: tvaReport?.quarters?.[selectedQuarter]?.tva10 || 0,
        base20: tvaReport?.quarters?.[selectedQuarter]?.base20 || 0,
        tva20: tvaReport?.quarters?.[selectedQuarter]?.tva20 || 0,
        totalBase: tvaReport?.quarters?.[selectedQuarter]?.totalBase || 0,
        totalTva: tvaReport?.quarters?.[selectedQuarter]?.totalTva || 0
    };

    const quarters = ["T1", "T2", "T3", "T4"];
    const years = ["2026", "2025"];

    const handleMarkDeclared = () => {
        setIsDeclared(!isDeclared);
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

                <div className="tva-selectors">
                    <div className="quarter-selector-row">
                        {quarters.map((q) => (
                            <button
                                key={q}
                                className={`quarter-btn ${selectedQuarter === q ? "active" : ""}`}
                                onClick={() => { setSelectedQuarter(q); setIsDeclared(false); }}
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
                    <span>Période : <strong>{current.period}</strong></span>
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
                        </tbody>
                    </table>
                </div>

                <div className="tva-declared-banner">
                    <span className="banner-label">TOTAL TVA À DÉCLARER</span>
                    <span className="banner-value">{current.totalTva.toLocaleString("fr-FR")} €</span>
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
                                    <CheckCircle2 size={16} /> Déclaré
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
