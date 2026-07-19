import React, { useState } from "react";

function FinancialChart() {
    const [viewType, setViewType] = useState("mixed"); // 'mixed' (bar + line), 'table', 'line'
    const [dateRange, setDateRange] = useState("19/04/2026 • 19/07/2026");
    const [resolution, setResolution] = useState("Mois");
    const [sources, setSources] = useState("Sources 2");
    
    // Dropdowns open state
    const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
    const [resDropdownOpen, setResDropdownOpen] = useState(false);
    const [srcDropdownOpen, setSrcDropdownOpen] = useState(false);

    // Mock data matching the screenshots
    const chartData = [
        { month: "avr. 26", entrees: 0.00, sorties: 0.00, resultat: 5.00 },
        { month: "mai 26", entrees: 0.00, sorties: 0.00, resultat: 5.00 },
        { month: "juin 26", entrees: 0.00, sorties: 0.00, resultat: 5.00 },
        { month: "juil. 26", entrees: 152.33, sorties: 31.52, resultat: 120.81 }
    ];

    const maxVal = 160;
    const yGridLines = [160, 140, 120, 100, 80, 60, 40, 20, 0];

    // SVG Layout Config
    const chartWidth = 500;
    const chartHeight = 200;
    const paddingLeft = 45;
    const paddingRight = 20;
    const paddingTop = 15;
    const paddingBottom = 30;

    const graphWidth = chartWidth - paddingLeft - paddingRight;
    const graphHeight = chartHeight - paddingTop - paddingBottom;

    // Helper: Map data value to SVG Y coordinate
    const getX = (index) => paddingLeft + (index / (chartData.length - 1)) * graphWidth;
    const getY = (val) => paddingTop + graphHeight - (val / maxVal) * graphHeight;

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
        <div className="financial-chart-card">
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
                    <button className="filter-dropdown-trigger" onClick={() => setDateDropdownOpen(!dateDropdownOpen)}>
                        <span>{dateRange}</span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </button>
                    {dateDropdownOpen && (
                        <div className="filter-dropdown-menu">
                            <div className="dropdown-item" onClick={() => { setDateRange("19/04/2026 • 19/07/2026"); setDateDropdownOpen(false); }}>3 derniers mois</div>
                            <div className="dropdown-item" onClick={() => { setDateRange("01/01/2026 • 31/12/2026"); setDateDropdownOpen(false); }}>Année 2026</div>
                        </div>
                    )}
                </div>

                <div className="filter-dropdown-container">
                    <button className="filter-dropdown-trigger" onClick={() => setResDropdownOpen(!resDropdownOpen)}>
                        <span>{resolution}</span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </button>
                    {resDropdownOpen && (
                        <div className="filter-dropdown-menu">
                            <div className="dropdown-item" onClick={() => { setResolution("Mois"); setResDropdownOpen(false); }}>Mois</div>
                            <div className="dropdown-item" onClick={() => { setResolution("Semaine"); setResDropdownOpen(false); }}>Semaine</div>
                            <div className="dropdown-item" onClick={() => { setResolution("Trimestre"); setResDropdownOpen(false); }}>Trimestre</div>
                        </div>
                    )}
                </div>

                <div className="filter-dropdown-container">
                    <button className="filter-dropdown-trigger" onClick={() => setSrcDropdownOpen(!srcDropdownOpen)}>
                        <span>{sources}</span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </button>
                    {srcDropdownOpen && (
                        <div className="filter-dropdown-menu">
                            <div className="dropdown-item" onClick={() => { setSources("Sources 2"); setSrcDropdownOpen(false); }}>Sources (2 active)</div>
                            <div className="dropdown-item" onClick={() => { setSources("Toutes"); setSrcDropdownOpen(false); }}>Toutes les sources</div>
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
                            {chartData.map((d, idx) => (
                                <text 
                                    key={idx} 
                                    x={getX(idx)} 
                                    y={chartHeight - 8} 
                                    textAnchor="middle" 
                                    className="chart-axis-label"
                                >
                                    {d.month}
                                </text>
                            ))}

                            {/* Bar charts (for entrees / revenues) */}
                            {viewType === "mixed" && chartData.map((d, idx) => {
                                if (d.entrees <= 0) return null;
                                const barWidth = 24;
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
