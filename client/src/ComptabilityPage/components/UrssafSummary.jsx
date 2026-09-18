import React, { useState, useEffect } from "react";
import { Calculator, Calendar, Check, ExternalLink, Settings, Sparkles, TrendingUp, AlertCircle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../utils/api";

export default function UrssafSummary() {
    const navigate = useNavigate();
    const currentMonth = new Date().getMonth();
    const currentQ = currentMonth <= 2 ? "T1" : currentMonth <= 5 ? "T2" : currentMonth <= 8 ? "T3" : "T4";
    const currentY = String(new Date().getFullYear());

    const [selectedQuarter, setSelectedQuarter] = useState(currentQ);
    const [selectedYear, setSelectedYear] = useState(currentY);
    const [reportData, setReportData] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);

    const quarters = ["T1", "T2", "T3", "T4"];
    const years = ["2026", "2025"];

    const fetchReport = async () => {
        try {
            const data = await apiFetch(`/v1/reports/revenue?year=${selectedYear}`);
            setReportData(data.data || data);
        } catch (err) {
            console.warn("API report/revenue non disponible:", err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
    }, [selectedYear]);

    const declarationKey = `${selectedYear}-${selectedQuarter}`;
    const declarationInfo = reportData?.urssafDeclarations?.[declarationKey];
    const isDeclared = !!declarationInfo?.declared;
    const declaredAtDate = declarationInfo?.declaredAt
        ? new Date(declarationInfo.declaredAt).toLocaleDateString("fr-FR")
        : null;

    const qData = reportData?.quartersUrssaf?.[selectedQuarter] || {
        caHT: 0,
        effectiveUrssafRate: 21.2,
        urssafDue: 0,
        cfpRate: 0.3,
        cfpDue: 0,
        vlRate: 0,
        vlDue: 0,
        totalTaxRate: 21.5,
        totalCharges: 0,
        netEnPoche: 0,
        netPercent: 100
    };

    const periodLabel = selectedQuarter === "T1"
        ? `01 janv → 31 mars ${selectedYear}`
        : selectedQuarter === "T2"
            ? `01 avr → 30 juin ${selectedYear}`
            : selectedQuarter === "T3"
                ? `01 juil → 30 sept ${selectedYear}`
                : `01 oct → 31 déc ${selectedYear}`;

    const handleMarkDeclared = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            const nextStatus = !isDeclared;
            await apiFetch('/v1/reports/urssaf-declaration', {
                method: 'POST',
                body: {
                    year: selectedYear,
                    quarter: selectedQuarter,
                    declared: nextStatus
                }
            });
            await fetchReport();
        } catch (e) {
            console.error("Erreur déclaration URSSAF:", e.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}>
                <Loader2 className="animate-spin" size={28} style={{ color: '#556B2F' }} />
            </div>
        );
    }

    return (
        <div className="comptability-cards-stack">
            <div className="comptability-card primary-accent-card">

                {/* Header */}
                <div className="widget-header">
                    <div className="title-area">
                        <div className="header-icon-container" style={{ backgroundColor: 'rgba(85, 107, 47, 0.1)', color: '#556B2F' }}>
                            <Calculator size={18} />
                        </div>
                        <div>
                            <h3>Déclaration URSSAF & Revenu Net</h3>
                            <p className="subtitle">Calcul automatique de vos cotisations sociales et revenu net en poche</p>
                        </div>
                    </div>
                </div>

                {/* Selectors Quarter & Year */}
                <div className="tva-selectors">
                    <div className="quarter-selector-row">
                        {quarters.map((q) => (
                            <button
                                key={q}
                                className={`quarter-btn ${selectedQuarter === q ? "active" : ""}`}
                                onClick={() => setSelectedQuarter(q)}
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
                    <span>Période : <strong>{periodLabel}</strong> (Factures payées encaissées)</span>
                </div>

                {/* 3 KPI Summary Cards */}
                <div className="urssaf-kpis-grid">
                    {/* CA Encaissé */}
                    <div className="urssaf-kpi-card ca-card">
                        <span className="kpi-label">
                            Chiffre d'Affaires Encaissé
                        </span>
                        <h3 className="kpi-value">
                            {qData.caHT.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €
                        </h3>
                        <span className="kpi-hint">Base de calcul HT</span>
                    </div>

                    {/* Total Charges */}
                    <div className="urssaf-kpi-card charges-card">
                        <span className="kpi-label danger-text">
                            Total Cotisations ({qData.totalTaxRate}%)
                        </span>
                        <h3 className="kpi-value danger-value">
                            - {qData.totalCharges.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €
                        </h3>
                        <span className="kpi-hint danger-text">À verser à l'URSSAF</span>
                    </div>

                    {/* Net en poche */}
                    <div className="urssaf-kpi-card net-card">
                        <span className="kpi-label success-text">
                            Revenu Net en poche
                        </span>
                        <h3 className="kpi-value success-value">
                            {qData.netEnPoche.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €
                        </h3>
                        <span className="kpi-hint success-text">{qData.netPercent}% du brut</span>
                    </div>
                </div>

                {/* Detailed Table Breakdown */}
                <div className="table-responsive">
                    <table className="widget-table comptability-table urssaf-table">
                        <thead>
                            <tr>
                                <th>Poste</th>
                                <th className="text-right">Taux</th>
                                <th className="text-right">Montant</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>
                                    <strong>1. Cotisations URSSAF</strong>
                                    <div className="table-sublabel">
                                        Retraite, Maladie, Maternité
                                    </div>
                                </td>
                                <td className="text-right font-medium">{qData.effectiveUrssafRate}%</td>
                                <td className="text-right font-bold text-danger">
                                    - {qData.urssafDue.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <strong>2. Formation (CFP)</strong>
                                    <div className="table-sublabel">
                                        Fonds de formation obligatoire
                                    </div>
                                </td>
                                <td className="text-right font-medium">{qData.cfpRate}%</td>
                                <td className="text-right font-bold text-danger">
                                    - {qData.cfpDue.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <strong>3. Impôt libératoire (IR)</strong>
                                    <div className="table-sublabel">
                                        {qData.vlRate > 0 ? "Prélèvement direct IR" : "Non activé (annuel 2042)"}
                                    </div>
                                </td>
                                <td className="text-right font-medium">{qData.vlRate > 0 ? `${qData.vlRate}%` : "—"}</td>
                                <td className="text-right font-bold" style={{ color: qData.vlRate > 0 ? '#dc2626' : 'var(--muted-foreground)' }}>
                                    {qData.vlRate > 0 ? `- ${qData.vlDue.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €` : "0,00 €"}
                                </td>
                            </tr>
                            <tr className="row-total">
                                <td><strong>TOTAL CHARGES</strong></td>
                                <td className="text-right"><strong>{qData.totalTaxRate}%</strong></td>
                                <td className="text-right text-danger font-extrabold">
                                    - {qData.totalCharges.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €
                                </td>
                            </tr>
                            <tr className="row-net-highlight">
                                <td><strong className="text-success">REVENU NET</strong></td>
                                <td className="text-right"><strong className="text-success">{qData.netPercent}%</strong></td>
                                <td className="text-right text-success font-black text-lg">
                                    {qData.netEnPoche.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Declaration Status Area & Actions */}
                <div className="declaration-status-area" style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                        <div className="status-indicator">
                            <span className="label">Statut :</span>
                            <div className="status-badge">
                                {isDeclared ? (
                                    <span className="declared text-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#16a34a', fontWeight: 700 }}>
                                        <Check size={16} /> Déclaré {declaredAtDate ? `le ${declaredAtDate}` : ""}
                                    </span>
                                ) : (
                                    <span className="non-declared text-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#f59e0b', fontWeight: 700 }}>
                                        <AlertCircle size={16} /> Non déclaré
                                    </span>
                                )}
                            </div>
                        </div>

                        <button
                            type="button"
                            className={`declare-action-btn ${isDeclared ? "declared-active" : ""}`}
                            onClick={handleMarkDeclared}
                            disabled={isSubmitting}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
                        >
                            {isDeclared ? "Marquer comme non déclaré" : "✓ Marquer comme déclaré"}
                        </button>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <button
                            type="button"
                            onClick={() => window.open("https://www.autoentrepreneur.urssaf.fr", "_blank")}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--card)', color: 'var(--foreground)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                        >
                            <ExternalLink size={14} />
                            Déclarer sur Urssaf.fr
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate("/settings?tab=cotisations")}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '6px', border: 'none', backgroundColor: '#556B2F', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                        >
                            <Settings size={14} />
                            Modifier mes taux
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
