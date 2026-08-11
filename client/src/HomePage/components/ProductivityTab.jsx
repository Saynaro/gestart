import React from "react";
import { useNavigate } from "react-router-dom";

function ProductivityTab({
    onCreateBoard = () => window.location.href = "/rapports"
}) {
    const navigate = useNavigate();

    // Mock data for Tracking Board status
    const trackingColumns = [
        { label: "À faire", count: 3, percent: 30, colorClass: "bg-blue-light" },
        { label: "En cours", count: 1, percent: 10, colorClass: "bg-orange" },
        { label: "Terminé", count: 6, percent: 60, colorClass: "bg-green" }
    ];

    return (
        <div className="productivity-tab-grid single-widget">
            
            {/* Tableau de suivi */}
            <div className="dashboard-grid-card productivity-card-widget full-width-widget">
                <div className="grid-card-header" onClick={() => navigate("/planning")} style={{ cursor: "pointer" }}>
                    <div className="grid-card-title-group">
                        <svg className="grid-card-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <line x1="9" y1="3" x2="9" y2="21" />
                            <line x1="17" y1="3" x2="17" y2="21" />
                            <line x1="3" y1="9" x2="21" y2="9" />
                        </svg>
                        <h3>Tableau de suivi</h3>
                    </div>
                    <svg className="chevron-right-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                </div>

                <div className="card-list-body">
                    <div className="tracking-board-metrics">
                        {trackingColumns.map((col, idx) => (
                            <div key={idx} className="tracking-column-row">
                                <div className="tracking-column-info">
                                    <span className="tracking-column-label">{col.label}</span>
                                    <span className="tracking-column-count">{col.count} {col.count > 1 ? "éléments" : "élément"}</span>
                                </div>
                                <div className="tracking-progress-container">
                                    <div className="tracking-progress-track">
                                        <div 
                                            className={`tracking-progress-fill ${col.colorClass}`} 
                                            style={{ width: `${col.percent}%` }}
                                        ></div>
                                    </div>
                                    <span className="tracking-percent-label">{col.percent}%</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="productivity-actions-row">
                        <button className="btn-card-action" onClick={onCreateBoard}>
                            Configurer le tableau
                        </button>
                    </div>
                </div>
            </div>

        </div>
    );
}

export default ProductivityTab;
