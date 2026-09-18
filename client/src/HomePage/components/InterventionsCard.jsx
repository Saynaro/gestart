import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function InterventionsCard({
    plannedCount = 0,
    completedCount = 0,
    plannedInterventions = [],
    completedInterventions = [],
    todayInterventions = [],
    onPlanIntervention = () => window.location.href = "/planning"
}) {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState("planned");

    const listPlanned = plannedInterventions?.length > 0 ? plannedInterventions : (todayInterventions || []);
    const listCompleted = completedInterventions || [];

    const activeInterventions = activeTab === "planned" ? listPlanned : listCompleted;
    const displayPlannedCount = plannedCount !== undefined ? plannedCount : listPlanned.length;
    const displayCompletedCount = completedCount !== undefined ? completedCount : listCompleted.length;

    const getStatusBadge = (status) => {
        const s = String(status || "").toUpperCase();
        if (s === "COMPLETED" || s === "TERMINÉ" || s === "TERMINÉE") {
            return { label: "Terminée", className: "completed" };
        }
        if (s === "IN_PROGRESS" || s === "ARRIVED" || s === "EN COURS") {
            return { label: "En cours", className: "active" };
        }
        if (s === "CANCELLED" || s === "ANNULÉ" || s === "ANNULÉE") {
            return { label: "Annulée", className: "cancelled" };
        }
        return { label: "Planifiée", className: "planned" };
    };

    return (
        <div className="dashboard-grid-card">
            {/* Card Header */}
            <div className="grid-card-header" onClick={() => navigate("/planning")} style={{ cursor: "pointer" }}>
                <div className="grid-card-title-group">
                    <svg className="grid-card-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    <h3>Interventions</h3>
                </div>
                <svg className="chevron-right-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
            </div>

            {/* Split Metrics */}
            <div className="card-sub-header-metrics">
                <div 
                    className={`sub-metric-item planned ${activeTab === "planned" ? "active" : ""}`}
                    onClick={() => setActiveTab("planned")}
                >
                    <span className="sub-metric-label">PLANIFIÉES</span>
                    <span className="sub-metric-amount-only">{displayPlannedCount}</span>
                </div>
                <div 
                    className={`sub-metric-item completed ${activeTab === "completed" ? "active" : ""}`}
                    onClick={() => setActiveTab("completed")}
                >
                    <span className="sub-metric-label">TERMINÉES</span>
                    <span className="sub-metric-amount-only">{displayCompletedCount}</span>
                </div>
            </div>

            {/* Card Body List */}
            <div className="card-list-body">
                {activeInterventions.length > 0 ? (
                    <div className="dashboard-card-content-wrapper">
                        <div className="mini-interventions-list">
                            {activeInterventions.map((item) => {
                                const { label, className } = getStatusBadge(item.status);
                                return (
                                    <div key={item.id} className="mini-intervention-item" onClick={() => navigate(`/planning?id=${item.id}`)}>
                                        <span className="mini-time">{item.time}</span>
                                        <div className="mini-details">
                                            <h4>{item.title}</h4>
                                            <p>{item.clientName || item.client}</p>
                                        </div>
                                        <span className={`mini-status ${className}`}>
                                            {label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="card-list-action-row">
                            <button className="btn-card-action" onClick={onPlanIntervention}>
                                + Planifier
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="card-illustration-body">
                        <p className="illustration-text">Aucune intervention {activeTab === "planned" ? "planifiée" : "terminée"}</p>
                        <button className="btn-card-action" onClick={onPlanIntervention}>
                            Planifier
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default InterventionsCard;
