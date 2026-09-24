import React, { useState, useMemo, useRef, useEffect } from "react";

const MONTH_NAMES_SHORT = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const MONTH_NAMES_CAP = ["Janv", "Févr", "Mars", "Avr", "Mai", "Juin", "Juil", "Août", "Sept", "Oct", "Nov", "Déc"];

function FinancialChart({ data = [], rawTransactions = [], cotisationsRate = 0.212 }) {
    const [viewType, setViewType] = useState("mixed"); // 'mixed' (bar + line), 'table', 'line'
    const [rangeKey, setRangeKey] = useState("6M"); // "3M", "6M", "YTD", "12M"
    const [resolution, setResolution] = useState("Mois"); // "Mois", "Semaine", "Trimestre"
    const [sources, setSources] = useState("Toutes"); // "Toutes", "Factures"
    
    // Single active dropdown state ('date' | 'res' | 'src' | null)
    const [openDropdown, setOpenDropdown] = useState(null);
    const chartRef = useRef(null);

    // Auto-close on click outside or on page/container scroll
    useEffect(() => {
        if (!openDropdown) return;
        const handleOutsideClick = (e) => {
            if (chartRef.current && !chartRef.current.contains(e.target)) {
                setOpenDropdown(null);
            }
        };
        const handleScroll = () => {
            setOpenDropdown(null);
        };

        document.addEventListener("mousedown", handleOutsideClick);
        document.addEventListener("touchstart", handleOutsideClick, { passive: true });
        window.addEventListener("scroll", handleScroll, { passive: true, capture: true });

        return () => {
            document.removeEventListener("mousedown", handleOutsideClick);
            document.removeEventListener("touchstart", handleOutsideClick);
            window.removeEventListener("scroll", handleScroll, { capture: true });
        };
    }, [openDropdown]);

    // Compute Date Boundaries and Range Label dynamically
    const { startDate, endDate, dateRangeLabel } = useMemo(() => {
        const now = new Date();
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        let start = new Date(now.getFullYear(), now.getMonth() - 5, 1, 0, 0, 0, 0);

        if (rangeKey === "3M") {
            start = new Date(now.getFullYear(), now.getMonth() - 2, 1, 0, 0, 0, 0);
        } else if (rangeKey === "6M") {
            start = new Date(now.getFullYear(), now.getMonth() - 5, 1, 0, 0, 0, 0);
        } else if (rangeKey === "YTD") {
            start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        } else if (rangeKey === "12M") {
            start = new Date(now.getFullYear(), now.getMonth() - 11, 1, 0, 0, 0, 0);
        }

        const formatD = (d) => d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
        return {
            startDate: start,
            endDate: end,
            dateRangeLabel: `${formatD(start)} • ${formatD(end)}`
        };
    }, [rangeKey]);

    // Build Dynamic Chart Data based on range & resolution
    const chartData = useMemo(() => {
        const raw = Array.isArray(rawTransactions) ? rawTransactions : [];
        
        // Filter by source:
        // "Factures" -> Seules les factures réglées / encaissées
        // "Toutes" -> Toutes les factures émises et encaissées
        const txs = sources === "Factures"
            ? raw.filter(tx => tx.status === "PAID" || tx.status === "paid" || tx.source === "factures_encaissees")
            : raw;

        const now = new Date();
        const rate = typeof cotisationsRate === "number" ? cotisationsRate : 0.212;

        if (resolution === "Mois") {
            // Determine number of months
            let monthsCount = 6;
            if (rangeKey === "3M") monthsCount = 3;
            else if (rangeKey === "6M") monthsCount = 6;
            else if (rangeKey === "YTD") monthsCount = now.getMonth() + 1;
            else if (rangeKey === "12M") monthsCount = 12;

            const buckets = [];
            for (let i = monthsCount - 1; i >= 0; i--) {
                const bucketDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const mIdx = bucketDate.getMonth();
                const yrShort = String(bucketDate.getFullYear()).slice(-2);
                const label = `${MONTH_NAMES_SHORT[mIdx]} ${yrShort}`;
                const shortLabel = MONTH_NAMES_CAP[mIdx];

                // Filter transactions in this month
                const monthTxs = txs.filter(tx => {
                    if (!tx.date) return false;
                    const d = new Date(tx.date);
                    return d.getFullYear() === bucketDate.getFullYear() && d.getMonth() === mIdx;
                });

                let entrees = monthTxs.reduce((sum, t) => sum + (Number(t.amountTTC) || 0), 0);

                // Fallback to data prop if rawTransactions is empty and it matches 6M default
                if (raw.length === 0 && data && data.length > 0) {
                    const found = data.find(d => d.month === label || d.month?.startsWith(MONTH_NAMES_SHORT[mIdx]));
                    if (found) {
                        entrees = found.entrees || 0;
                    }
                }

                const sorties = Math.round(entrees * rate * 100) / 100;
                const resultat = Math.round((entrees - sorties) * 100) / 100;

                buckets.push({
                    month: label,
                    shortLabel,
                    entrees: Math.round(entrees * 100) / 100,
                    sorties,
                    resultat
                });
            }
            return buckets;
        }

        if (resolution === "Semaine") {
            // Build weekly buckets (e.g. 6 to 12 weeks depending on range)
            const weeksCount = rangeKey === "3M" ? 8 : (rangeKey === "6M" ? 12 : 16);
            const buckets = [];

            for (let i = weeksCount - 1; i >= 0; i--) {
                const targetDay = new Date(now);
                targetDay.setDate(now.getDate() - (i * 7));

                // Find Monday of this week
                const dayOfWeek = targetDay.getDay() || 7;
                const weekStart = new Date(targetDay);
                weekStart.setDate(targetDay.getDate() - dayOfWeek + 1);
                weekStart.setHours(0, 0, 0, 0);

                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);
                weekEnd.setHours(23, 59, 59, 999);

                // Calculate week number
                const firstJan = new Date(weekStart.getFullYear(), 0, 1);
                const weekNum = Math.ceil((((weekStart - firstJan) / 86400000) + firstJan.getDay() + 1) / 7);
                const label = `S${weekNum}`;

                const weekTxs = txs.filter(tx => {
                    if (!tx.date) return false;
                    const d = new Date(tx.date);
                    return d >= weekStart && d <= weekEnd;
                });

                const entrees = weekTxs.reduce((sum, t) => sum + (Number(t.amountTTC) || 0), 0);
                const sorties = Math.round(entrees * rate * 100) / 100;
                const resultat = Math.round((entrees - sorties) * 100) / 100;

                buckets.push({
                    month: label,
                    entrees: Math.round(entrees * 100) / 100,
                    sorties,
                    resultat
                });
            }
            return buckets;
        }

        if (resolution === "Trimestre") {
            // Build Quarterly buckets
            const quartersCount = rangeKey === "3M" || rangeKey === "6M" ? 4 : 6;
            const buckets = [];

            const currentQuarter = Math.floor(now.getMonth() / 3); // 0, 1, 2, 3
            for (let i = quartersCount - 1; i >= 0; i--) {
                const qOffset = currentQuarter - i;
                const targetYear = now.getFullYear() + Math.floor(qOffset / 4);
                const qIndex = ((qOffset % 4) + 4) % 4; // 0, 1, 2, 3

                const qStartMonth = qIndex * 3;
                const qStart = new Date(targetYear, qStartMonth, 1, 0, 0, 0, 0);
                const qEnd = new Date(targetYear, qStartMonth + 3, 0, 23, 59, 59, 999);
                const label = `T${qIndex + 1} ${String(targetYear).slice(-2)}`;

                const qTxs = txs.filter(tx => {
                    if (!tx.date) return false;
                    const d = new Date(tx.date);
                    return d >= qStart && d <= qEnd;
                });

                const entrees = qTxs.reduce((sum, t) => sum + (Number(t.amountTTC) || 0), 0);
                const sorties = Math.round(entrees * rate * 100) / 100;
                const resultat = Math.round((entrees - sorties) * 100) / 100;

                buckets.push({
                    month: label,
                    entrees: Math.round(entrees * 100) / 100,
                    sorties,
                    resultat
                });
            }
            return buckets;
        }

        return data;
    }, [rawTransactions, rangeKey, resolution, sources, cotisationsRate, data]);

    const highestVal = Math.max(...chartData.map(d => Math.max(d.entrees || 0, d.sorties || 0, d.resultat || 0)), 100);

    const { maxVal, yGridLines } = useMemo(() => {
        // Compute clean, round step intervals without fractional decimals
        const roughMax = Math.max(highestVal * 1.15, 100);
        let step = 500;
        if (roughMax <= 200) step = 50;
        else if (roughMax <= 500) step = 100;
        else if (roughMax <= 1200) step = 250;
        else if (roughMax <= 3000) step = 500;
        else if (roughMax <= 6000) step = 1000;
        else if (roughMax <= 15000) step = 2500;
        else if (roughMax <= 30000) step = 5000;
        else step = Math.ceil(roughMax / 4 / 1000) * 1000;

        const computedMax = Math.ceil(roughMax / step) * step;
        const lines = [];
        for (let v = computedMax; v >= 0; v -= step) {
            lines.push(v);
        }
        return { maxVal: computedMax, yGridLines: lines };
    }, [highestVal]);

    // SVG Layout Config
    const chartWidth = 500;
    const chartHeight = 210;
    const paddingLeft = 64;
    const paddingRight = 24;
    const paddingTop = 16;
    const paddingBottom = 26;

    const graphWidth = chartWidth - paddingLeft - paddingRight;
    const graphHeight = chartHeight - paddingTop - paddingBottom;

    // Helper: Map data value to SVG Y coordinate
    const getX = (index) => paddingLeft + (index / Math.max(1, chartData.length - 1)) * graphWidth;
    const getY = (val) => paddingTop + graphHeight - (Math.max(0, val || 0) / maxVal) * graphHeight;

    // Build line path
    let linePath = "";
    chartData.forEach((d, idx) => {
        const x = getX(idx);
        const y = getY(d.resultat);
        if (idx === 0) {
            linePath += `M ${x} ${y}`;
        } else {
            linePath += ` L ${x} ${y}`;
        }
    });

    return (
        <div className="financial-chart-card" ref={chartRef}>
            {/* Header row: Legend and chart type selector */}
            <div className="chart-header">
                <div className="chart-legend">
                    <div className="legend-item">
                        <span className="legend-indicator bg-green"></span>
                        <span className="legend-text">Entrées</span>
                    </div>
                    <div className="legend-item">
                        <span className="legend-indicator bg-pink"></span>
                        <span className="legend-text">Sorties</span>
                    </div>
                    <div className="legend-item">
                        <span className="legend-indicator bg-grey-circle"></span>
                        <span className="legend-text">Résultat</span>
                    </div>
                </div>

                <div className="chart-type-toggles">
                    <button 
                        className={`chart-toggle-btn ${viewType === "mixed" ? "active" : ""}`}
                        onClick={() => setViewType("mixed")}
                        title="Graphique à barres et lignes"
                    >
                        {/* Bar chart icon */}
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="20" x2="18" y2="10"></line>
                            <line x1="12" y1="20" x2="12" y2="4"></line>
                            <line x1="6" y1="20" x2="6" y2="14"></line>
                        </svg>
                    </button>
                    <button 
                        className={`chart-toggle-btn ${viewType === "table" ? "active" : ""}`}
                        onClick={() => setViewType("table")}
                        title="Tableau des données"
                    >
                        {/* Table list icon */}
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="3" y1="12" x2="21" y2="12"></line>
                            <line x1="3" y1="6" x2="21" y2="6"></line>
                            <line x1="3" y1="18" x2="21" y2="18"></line>
                            <circle cx="4" cy="6" r="1" fill="currentColor"></circle>
                            <circle cx="4" cy="12" r="1" fill="currentColor"></circle>
                            <circle cx="4" cy="18" r="1" fill="currentColor"></circle>
                        </svg>
                    </button>
                    <button 
                        className={`chart-toggle-btn ${viewType === "line" ? "active" : ""}`}
                        onClick={() => setViewType("line")}
                        title="Graphique linéaire uniquement"
                    >
                        {/* Line chart icon */}
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                        </svg>
                    </button>
                </div>
            </div>

            {/* Filter controls row */}
            <div className="chart-filters">
                <div className="filter-dropdown-container">
                    <button className="filter-dropdown-trigger" onClick={() => setOpenDropdown(prev => prev === "date" ? null : "date")}>
                        <span>{dateRangeLabel}</span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </button>
                    {openDropdown === "date" && (
                        <div className="filter-dropdown-menu">
                            <div className="dropdown-item" onClick={() => { setRangeKey("3M"); setOpenDropdown(null); }}>3 derniers mois</div>
                            <div className="dropdown-item" onClick={() => { setRangeKey("6M"); setOpenDropdown(null); }}>6 derniers mois</div>
                            <div className="dropdown-item" onClick={() => { setRangeKey("YTD"); setOpenDropdown(null); }}>Année en cours ({new Date().getFullYear()})</div>
                            <div className="dropdown-item" onClick={() => { setRangeKey("12M"); setOpenDropdown(null); }}>12 derniers mois</div>
                        </div>
                    )}
                </div>

                <div className="filter-dropdown-container">
                    <button className="filter-dropdown-trigger" onClick={() => setOpenDropdown(prev => prev === "res" ? null : "res")}>
                        <span>{resolution}</span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </button>
                    {openDropdown === "res" && (
                        <div className="filter-dropdown-menu">
                            <div className="dropdown-item" onClick={() => { setResolution("Mois"); setOpenDropdown(null); }}>Mois</div>
                            <div className="dropdown-item" onClick={() => { setResolution("Semaine"); setOpenDropdown(null); }}>Semaine</div>
                            <div className="dropdown-item" onClick={() => { setResolution("Trimestre"); setOpenDropdown(null); }}>Trimestre</div>
                        </div>
                    )}
                </div>

                <div className="filter-dropdown-container">
                    <button className="filter-dropdown-trigger" onClick={() => setOpenDropdown(prev => prev === "src" ? null : "src")}>
                        <span>{sources === "Toutes" ? "Toutes les sources" : "Factures encaissées"}</span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </button>
                    {openDropdown === "src" && (
                        <div className="filter-dropdown-menu">
                            <div className="dropdown-item" onClick={() => { setSources("Toutes"); setOpenDropdown(null); }}>Toutes les sources</div>
                            <div className="dropdown-item" onClick={() => { setSources("Factures"); setOpenDropdown(null); }}>Factures encaissées</div>
                        </div>
                    )}
                </div>
            </div>

            {/* Main chart viewport */}
            <div className="chart-viewport">
                {viewType === "table" ? (
                    <div className="chart-table-container">
                        <table className="chart-data-table">
                            <thead>
                                <tr>
                                    <th>Période</th>
                                    <th className="text-right">Entrées</th>
                                    <th className="text-right">Sorties</th>
                                    <th className="text-right">Résultat</th>
                                </tr>
                            </thead>
                            <tbody>
                                {chartData.map((d, index) => (
                                    <tr key={index}>
                                        <td>{d.month}</td>
                                        <td className="text-right text-green">{d.entrees.toFixed(2)} €</td>
                                        <td className="text-right text-pink">{d.sorties.toFixed(2)} €</td>
                                        <td className={`text-right ${d.resultat >= 0 ? "text-green" : "text-red"}`}>
                                            {d.resultat.toFixed(2)} €
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="svg-chart-container">
                        <svg width="100%" height="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="xMidYMid meet">
                            {/* Gridlines & Y-axis labels */}
                            {yGridLines.map((gridVal) => {
                                const y = getY(gridVal);
                                return (
                                    <g key={gridVal} className="chart-gridline-group">
                                        <line 
                                            x1={paddingLeft} 
                                            y1={y} 
                                            x2={chartWidth - paddingRight} 
                                            y2={y} 
                                            stroke="var(--border)" 
                                            strokeWidth="0.5"
                                            strokeDasharray="2 2"
                                        />
                                        <text 
                                            x={paddingLeft - 8} 
                                            y={y + 4} 
                                            textAnchor="end" 
                                            className="chart-axis-label"
                                        >
                                            {gridVal} €
                                        </text>
                                    </g>
                                );
                            })}

                            {/* X-axis labels */}
                            {chartData.map((d, idx) => {
                                return (
                                    <text 
                                        key={idx} 
                                        x={getX(idx)} 
                                        y={chartHeight - 6} 
                                        textAnchor="middle" 
                                        className="chart-axis-label"
                                    >
                                        {d.shortLabel || d.month}
                                    </text>
                                );
                            })}

                            {/* Bar charts (for entrees / revenues) */}
                            {viewType === "mixed" && chartData.map((d, idx) => {
                                if (d.entrees <= 0) return null;
                                const barWidth = Math.max(12, Math.min(28, 200 / chartData.length));
                                const x = getX(idx) - barWidth / 2;
                                const y = getY(d.entrees);
                                const barH = getY(0) - y;
                                return (
                                    <g key={`bar-${idx}`} className="chart-bar-group">
                                        <rect
                                            x={x}
                                            y={y}
                                            width={barWidth}
                                            height={barH}
                                            rx="4"
                                            fill="#8FBC8F"
                                            opacity="0.8"
                                            className="chart-bar"
                                        />
                                        {/* Hover tooltip indicator */}
                                        <title>{`${d.month}: Entrées ${d.entrees} €`}</title>
                                    </g>
                                );
                            })}

                            {/* Line chart paths (connecting result values) */}
                            <path 
                                d={linePath} 
                                fill="none" 
                                stroke="#4F6D7A" 
                                strokeWidth="2.5" 
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="chart-line"
                            />

                            {/* Line chart dots */}
                            {chartData.map((d, idx) => {
                                const x = getX(idx);
                                const y = getY(d.resultat);
                                return (
                                    <g key={`dot-${idx}`} className="chart-dot-group">
                                        <circle 
                                            cx={x} 
                                            cy={y} 
                                            r="4" 
                                            fill="#4F6D7A" 
                                            stroke="#FFF" 
                                            strokeWidth="1.5"
                                            className="chart-dot"
                                        />
                                        <title>{`${d.month}: Résultat ${d.resultat} €`}</title>
                                    </g>
                                );
                            })}
                        </svg>
                    </div>
                )}
            </div>
        </div>
    );
}

export default FinancialChart;
