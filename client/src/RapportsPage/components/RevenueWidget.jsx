import React, { useState, useEffect } from "react";
import { TrendingUp, DollarSign, PieChart, FileText, Calendar } from "lucide-react";
import { apiFetch } from "../../utils/api";

function RevenueWidget({ startDate, endDate }) {
    const [viewMode, setViewMode] = useState("chart"); // 'chart' or 'table'
    const [monthlyData, setMonthlyData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRevenue = async () => {
            setLoading(true);
            try {
                const data = await apiFetch(`/v1/reports/revenue?startDate=${startDate}&endDate=${endDate}`);
                if (data.data && Array.isArray(data.data.monthly)) {
                    setMonthlyData(data.data.monthly);
                } else {
                    setMonthlyData([]);
                }
            } catch (err) {
                console.warn("API reports revenue non disponible:", err.message);
                setMonthlyData([]);
            } finally {
                setLoading(false);
            }
        };
        fetchRevenue();
    }, [startDate, endDate]);

    // Compute totals
    const totalHT = monthlyData.reduce((acc, curr) => acc + (curr.caHT || 0), 0);
    const totalTTC = monthlyData.reduce((acc, curr) => acc + (curr.caTTC || 0), 0);
    const totalPaid = monthlyData.reduce((acc, curr) => acc + (curr.paid || 0), 0);
    const totalPending = Math.max(0, totalTTC - totalPaid);
    const totalInvoices = monthlyData.reduce((acc, curr) => acc + (curr.count || 0), 0);
    const avgInvoice = totalInvoices > 0 ? (totalHT / totalInvoices) : 0;
    const paidRate = totalTTC > 0 ? ((totalPaid / totalTTC) * 100).toFixed(1) : "0.0";

    // SVG configuration
    const width = 600;
    const height = 240;
    const paddingLeft = 65;
    const paddingRight = 20;
    const paddingTop = 25;
    const paddingBottom = 35;

    const graphWidth = width - paddingLeft - paddingRight;
    const graphHeight = height - paddingTop - paddingBottom;

    // Calculate clean, human-friendly Y-axis ticks and ceiling
    const rawMax = Math.max(...monthlyData.map(d => Math.max(d.caTTC || 0, d.paid || 0)), 100) * 1.15;

    const calculateNiceScale = (maxTarget, targetTicks = 4) => {
        const roughStep = maxTarget / targetTicks;
        const exp = Math.floor(Math.log10(roughStep));
        const factor = Math.pow(10, exp);
        const fraction = roughStep / factor;

        let niceStep;
        if (fraction <= 1.2) niceStep = 1;
        else if (fraction <= 2.2) niceStep = 2;
        else if (fraction <= 3.5) niceStep = 2.5;
        else if (fraction <= 7) niceStep = 5;
        else niceStep = 10;

        const step = niceStep * factor;
        const ceiling = Math.ceil(maxTarget / step) * step;

        const ticks = [];
        for (let v = 0; v <= ceiling; v += step) {
            ticks.push(Math.round(v));
        }
        return { ceiling: ceiling || 100, ticks };
    };

    const { ceiling: maxVal, ticks: yTicks } = calculateNiceScale(rawMax, 4);

    const formatYTick = (val) => {
        if (val === 0) return "0 €";
        if (val >= 1000) {
            const k = val / 1000;
            return Number.isInteger(k) ? `${k}k €` : `${k.toFixed(1)}k €`;
        }
        return `${Math.round(val)} €`;
    };

    const getX = (idx) => monthlyData.length === 1 
        ? paddingLeft + graphWidth / 2 
        : paddingLeft + (idx / Math.max(1, monthlyData.length - 1)) * graphWidth;
    const getY = (val) => paddingTop + graphHeight - (Math.max(0, val || 0) / maxVal) * graphHeight;

    // Line paths for "Paid" trend
    let linePath = "";
    monthlyData.forEach((d, idx) => {
        const x = getX(idx);
        const y = getY(d.paid);
        if (idx === 0) {
            linePath += `M ${x} ${y}`;
        } else {
            linePath += ` L ${x} ${y}`;
        }
    });

    return (
        <div className="rapports-card revenue-widget">
            <div className="widget-header">
                <div className="title-area">
                    <div className="header-icon-container">
                        <TrendingUp size={18} />
                    </div>
                    <div>
                        <h3>Chiffre d'Affaires & Encaissements</h3>
                        <p className="subtitle">Analyse financière de la facturation</p>
                    </div>
                </div>
                <div className="widget-toggles">
                    <button 
                        className={`toggle-btn ${viewMode === "chart" ? "active" : ""}`}
                        onClick={() => setViewMode("chart")}
                    >
                        Graphique
                    </button>
                    <button 
                        className={`toggle-btn ${viewMode === "table" ? "active" : ""}`}
                        onClick={() => setViewMode("table")}
                    >
                        Tableau
                    </button>
                </div>
            </div>

            {/* KPI Row */}
            <div className="kpi-grid">
                {loading && monthlyData.length === 0 ? (
                    [1, 2, 3, 4].map(i => (
                        <div key={i} className="kpi-card" style={{ pointerEvents: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div className="skeleton-shimmer" style={{ width: '90px', height: '12px', borderRadius: '4px' }} />
                            <div className="skeleton-shimmer" style={{ width: '120px', height: '24px', borderRadius: '6px' }} />
                            <div className="skeleton-shimmer" style={{ width: '70px', height: '11px', borderRadius: '4px', opacity: 0.6 }} />
                        </div>
                    ))
                ) : (
                    <>
                        <div className="kpi-card">
                            <span className="kpi-label">CA Total (TTC)</span>
                            <span className="kpi-value">{totalTTC.toLocaleString("fr-FR")} €</span>
                            <span className="kpi-subtext">HT: {totalHT.toLocaleString("fr-FR")} €</span>
                        </div>
                        <div className="kpi-card">
                            <span className="kpi-label">CA Encaissé</span>
                            <span className="kpi-value text-success">{totalPaid.toLocaleString("fr-FR")} €</span>
                            <span className="kpi-subtext">Taux: {paidRate}%</span>
                        </div>
                        <div className="kpi-card">
                            <span className="kpi-label">Restant dû (TTC)</span>
                            <span className={`kpi-value ${totalPending > 0 ? "text-warning" : ""}`}>{totalPending.toLocaleString("fr-FR")} €</span>
                            <span className="kpi-subtext">Factures non réglées</span>
                        </div>
                        <div className="kpi-card">
                            <span className="kpi-label">Facture Moyenne (HT)</span>
                            <span className="kpi-value">{avgInvoice.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €</span>
                            <span className="kpi-subtext">Sur {totalInvoices} facture{totalInvoices > 1 ? 's' : ''}</span>
                        </div>
                    </>
                )}
            </div>

            {/* Viewport content */}
            <div className="widget-content">
                {loading && monthlyData.length === 0 ? (
                    <div style={{ padding: '24px 16px' }}>
                        <div className="skeleton-shimmer" style={{ width: '100%', height: '220px', borderRadius: '12px' }} />
                    </div>
                ) : monthlyData.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 20px" }}>
                        <p style={{ fontWeight: 600, fontSize: "14px", color: "var(--foreground)", marginBottom: "4px" }}>
                            Vous n'avez pas encore de données de chiffre d'affaires
                        </p>
                        <p style={{ fontSize: "12.5px", color: "var(--muted-foreground)" }}>
                            Créez vos premières factures pour visualiser les tendances et statistiques.
                        </p>
                    </div>
                ) : viewMode === "table" ? (
                    <div className="table-responsive">
                        <table className="widget-table">
                            <thead>
                                <tr>
                                    <th>Période</th>
                                    <th className="text-right hide-on-mobile">Nombre</th>
                                    <th className="text-right hide-on-mobile">CA HT</th>
                                    <th className="text-right">CA TTC</th>
                                    <th className="text-right">Encaissé</th>
                                    <th className="text-right">En cours</th>
                                </tr>
                            </thead>
                            <tbody>
                                {monthlyData.map((d, i) => (
                                    <tr key={i}>
                                        <td><strong>{d.month || d.period || `Mois ${i + 1}`}</strong></td>
                                        <td className="text-right hide-on-mobile">{d.count || 0}</td>
                                        <td className="text-right hide-on-mobile">{(d.caHT || 0).toLocaleString("fr-FR")} €</td>
                                        <td className="text-right">{(d.caTTC || 0).toLocaleString("fr-FR")} €</td>
                                        <td className="text-right text-success">{(d.paid || 0).toLocaleString("fr-FR")} €</td>
                                        <td className="text-right text-warning">{((d.caTTC || 0) - (d.paid || 0)).toLocaleString("fr-FR")} €</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="chart-wrapper">
                        <div className="chart-legend-top">
                            <div className="legend-item">
                                <span className="indicator-color bg-primary-muted"></span>
                                <span>CA Prévisionnel (TTC)</span>
                            </div>
                            <div className="legend-item">
                                <span className="indicator-color bg-primary"></span>
                                <span>CA Encaissé (TTC)</span>
                            </div>
                        </div>

                        <div className="svg-container">
                            <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
                                {/* Gridlines */}
                                {yTicks.map((val) => {
                                    const y = getY(val);
                                    return (
                                        <g key={val} className="grid-line-group">
                                            <line 
                                                x1={paddingLeft} 
                                                y1={y} 
                                                x2={width - paddingRight} 
                                                y2={y} 
                                                stroke="var(--border)" 
                                                strokeWidth="0.5"
                                                strokeDasharray="3 3"
                                            />
                                            <text 
                                                x={paddingLeft - 8} 
                                                y={y + 4} 
                                                textAnchor="end" 
                                                className="axis-label"
                                            >
                                                {formatYTick(val)}
                                            </text>
                                        </g>
                                    );
                                })}

                                {/* X-Axis Labels */}
                                {monthlyData.map((d, idx) => (
                                    <text
                                        key={idx}
                                        x={getX(idx)}
                                        y={height - 10}
                                        textAnchor="middle"
                                        className="axis-label"
                                    >
                                        {String(d.month || d.period || '').split(" ")[0] || `M${idx + 1}`}
                                    </text>
                                ))}

                                {/* CA TTC Bars (Previsionnel) */}
                                {monthlyData.map((d, idx) => {
                                    const barWidth = 24;
                                    const x = getX(idx) - barWidth / 2;
                                    const y = getY(d.caTTC || 0);
                                    const barH = Math.max(0, getY(0) - y);
                                    const label = d.month || d.period || `Mois ${idx + 1}`;
                                    return (
                                        <rect
                                            key={`bar-ttc-${idx}`}
                                            x={x}
                                            y={y}
                                            width={barWidth}
                                            height={barH}
                                            rx="4"
                                            fill="var(--primary)"
                                            opacity="0.25"
                                            className="chart-bar"
                                        >
                                            <title>{`${label}: CA TTC ${(d.caTTC || 0).toLocaleString("fr-FR")} €`}</title>
                                        </rect>
                                    );
                                })}

                                {/* CA Paid Bars (Encaissé) */}
                                {monthlyData.map((d, idx) => {
                                    const barWidth = 14;
                                    const x = getX(idx) - barWidth / 2;
                                    const y = getY(d.paid || 0);
                                    const barH = Math.max(0, getY(0) - y);
                                    const label = d.month || d.period || `Mois ${idx + 1}`;
                                    return (
                                        <rect
                                            key={`bar-paid-${idx}`}
                                            x={x}
                                            y={y}
                                            width={barWidth}
                                            height={barH}
                                            rx="2"
                                            fill="var(--primary)"
                                            opacity="0.85"
                                            className="chart-bar"
                                        >
                                            <title>{`${label}: Encaissé ${(d.paid || 0).toLocaleString("fr-FR")} €`}</title>
                                        </rect>
                                    );
                                })}

                                {/* Paid Trend Line */}
                                <path
                                    d={linePath}
                                    fill="none"
                                    stroke="var(--success)"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                />

                                {/* Data points on Line */}
                                {monthlyData.map((d, idx) => (
                                    <circle
                                        key={`point-${idx}`}
                                        cx={getX(idx)}
                                        cy={getY(d.paid)}
                                        r="4"
                                        fill="var(--card)"
                                        stroke="var(--success)"
                                        strokeWidth="2"
                                    />
                                ))}
                            </svg>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default RevenueWidget;
