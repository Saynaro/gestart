import React, { useState, useEffect } from "react";
import { TrendingUp, DollarSign, PieChart, FileText, Calendar } from "lucide-react";
import { apiFetch } from "../../utils/api";

function RevenueWidget({ startDate, endDate }) {
    const [viewMode, setViewMode] = useState("chart"); // 'chart' or 'table'
    const [monthlyData, setMonthlyData] = useState([]);

    useEffect(() => {
        const fetchRevenue = async () => {
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
            }
        };
        fetchRevenue();
    }, [startDate, endDate]);

    // Compute totals
    const totalHT = monthlyData.reduce((acc, curr) => acc + curr.caHT, 0);
    const totalTTC = monthlyData.reduce((acc, curr) => acc + curr.caTTC, 0);
    const totalPaid = monthlyData.reduce((acc, curr) => acc + curr.paid, 0);
    const totalPending = totalTTC - totalPaid;
    const totalInvoices = monthlyData.reduce((acc, curr) => acc + curr.count, 0);
    const avgInvoice = totalHT / (totalInvoices || 1);

    // SVG configuration
    const width = 600;
    const height = 240;
    const paddingLeft = 55;
    const paddingRight = 20;
    const paddingTop = 25;
    const paddingBottom = 35;

    const graphWidth = width - paddingLeft - paddingRight;
    const graphHeight = height - paddingTop - paddingBottom;

    const maxVal = Math.max(...monthlyData.map(d => d.caTTC)) * 1.15 || 40000;
    const yTicks = [0, maxVal * 0.25, maxVal * 0.5, maxVal * 0.75, maxVal];

    const getX = (idx) => paddingLeft + (idx / (monthlyData.length - 1)) * graphWidth;
    const getY = (val) => paddingTop + graphHeight - (val / maxVal) * graphHeight;

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
                <div className="kpi-card">
                    <span className="kpi-label">CA Total (TTC)</span>
                    <span className="kpi-value">{totalTTC.toLocaleString("fr-FR")} €</span>
                    <span className="kpi-subtext">HT: {totalHT.toLocaleString("fr-FR")} €</span>
                </div>
                <div className="kpi-card success-accent">
                    <span className="kpi-label">CA Encaissé</span>
                    <span className="kpi-value text-success">{totalPaid.toLocaleString("fr-FR")} €</span>
                    <span className="kpi-subtext">Taux: {((totalPaid / totalTTC) * 100).toFixed(1)}%</span>
                </div>
                <div className="kpi-card warning-accent">
                    <span className="kpi-label">Restant dû (TTC)</span>
                    <span className="kpi-value text-warning">{totalPending.toLocaleString("fr-FR")} €</span>
                    <span className="kpi-subtext">Factures non réglées</span>
                </div>
                <div className="kpi-card">
                    <span className="kpi-label">Facture Moyenne (HT)</span>
                    <span className="kpi-value">{avgInvoice.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €</span>
                    <span className="kpi-subtext">Sur {totalInvoices} factures</span>
                </div>
            </div>

            {/* Viewport content */}
            <div className="widget-content">
                {monthlyData.length === 0 ? (
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
                                    <th className="text-right">Nombre</th>
                                    <th className="text-right">CA HT</th>
                                    <th className="text-right">CA TTC</th>
                                    <th className="text-right">Encaissé</th>
                                    <th className="text-right">En cours</th>
                                </tr>
                            </thead>
                            <tbody>
                                {monthlyData.map((d, i) => (
                                    <tr key={i}>
                                        <td><strong>{d.period}</strong></td>
                                        <td className="text-right">{d.count}</td>
                                        <td className="text-right">{d.caHT.toLocaleString("fr-FR")} €</td>
                                        <td className="text-right">{d.caTTC.toLocaleString("fr-FR")} €</td>
                                        <td className="text-right text-success">{d.paid.toLocaleString("fr-FR")} €</td>
                                        <td className="text-right text-warning">{(d.caTTC - d.paid).toLocaleString("fr-FR")} €</td>
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
                                                {val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val} €
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
                                        {d.period.split(" ")[0]}
                                    </text>
                                ))}

                                {/* CA TTC Bars (Previsionnel) */}
                                {monthlyData.map((d, idx) => {
                                    const barWidth = 24;
                                    const x = getX(idx) - barWidth / 2;
                                    const y = getY(d.caTTC);
                                    const barH = getY(0) - y;
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
                                            <title>{`${d.period}: CA TTC ${d.caTTC.toLocaleString("fr-FR")} €`}</title>
                                        </rect>
                                    );
                                })}

                                {/* CA Paid Bars (Encaissé) */}
                                {monthlyData.map((d, idx) => {
                                    const barWidth = 14;
                                    const x = getX(idx) - barWidth / 2;
                                    const y = getY(d.paid);
                                    const barH = getY(0) - y;
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
                                            <title>{`${d.period}: Encaissé ${d.paid.toLocaleString("fr-FR")} €`}</title>
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
