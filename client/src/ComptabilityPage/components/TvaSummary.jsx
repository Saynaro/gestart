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

    // Mock data per quarter
    const tvaDataByQuarter = {
        T1: {
            period: "01 janv → 31 mars 2026",
            base0: 0, tva0: 0,
            base5: 1000, tva5: 55,
            base10: 1200, tva10: 120,
            base20: 8450, tva20: 1690,
            totalBase: 10650, totalTva: 1865
        },
        T2: {
            period: "01 avr → 30 juin 2026",
            base0: 0, tva0: 0,
            base5: 1800, tva5: 99,
            base10: 2500, tva10: 250,
            base20: 14500, tva20: 2900,
            totalBase: 18800, totalTva: 3249
        },
        T3: {
            period: "01 juil → 30 sept 2026",
            base0: 0, tva0: 0,
            base5: 1200, tva5: 66,
            base10: 1900, tva10: 190,
            base20: 11200, tva20: 2240,
            totalBase: 14300, totalTva: 2496
        },
        T4: {
            period: "01 oct → 31 déc 2026",
            base0: 0, tva0: 0,
            base5: 2200, tva5: 121,
            base10: 3100, tva10: 310,
            base20: 18500, tva20: 3700,
            totalBase: 23800, totalTva: 4131
        }
    };

    const current = tvaDataByQuarter[selectedQuarter];

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
