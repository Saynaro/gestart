import React, { useState, useEffect } from "react";
import { Hammer, CheckCircle2, CalendarDays, Users, ShieldAlert } from "lucide-react";
import { apiFetch } from "../../utils/api";

function InterventionsWidget({ startDate, endDate }) {
    const [activeSection, setActiveSection] = useState("overview"); // 'overview', 'techs', 'equipments'

    const [stats, setStats] = useState({ completed: 0, scheduled: 0, pending: 0, cancelled: 0, total: 0 });
    const [techWorkload, setTechWorkload] = useState([]);
    const [equipmentBreakdown, setEquipmentBreakdown] = useState([]);

    useEffect(() => {
        const fetchInterventions = async () => {
            try {
                const data = await apiFetch(`/v1/interventions`);
                const list = data.data?.interventions || data.interventions || (Array.isArray(data) ? data : []);
                if (list.length > 0) {
                    const completed = list.filter(i => i.status === 'COMPLETED' || i.status === 'Terminé').length;
                    const scheduled = list.filter(i => i.status === 'SCHEDULED' || i.status === 'Planifié' || i.status === 'Confirmé').length;
                    const pending = list.filter(i => i.status === 'PENDING' || i.status === 'En attente').length;
                    const cancelled = list.filter(i => i.status === 'CANCELLED' || i.status === 'Annulé').length;
                    setStats({ completed, scheduled, pending, cancelled, total: list.length });
                } else {
                    setStats({ completed: 0, scheduled: 0, pending: 0, cancelled: 0, total: 0 });
                    setTechWorkload([]);
                    setEquipmentBreakdown([]);
                }
            } catch (err) {
                console.warn("API interventions widget error:", err.message);
                setStats({ completed: 0, scheduled: 0, pending: 0, cancelled: 0, total: 0 });
                setTechWorkload([]);
                setEquipmentBreakdown([]);
            }
        };
        fetchInterventions();
    }, [startDate, endDate]);

    // Status colors
    const statusConfig = [
        { label: "Terminées", count: stats.completed, color: "var(--success)" },
        { label: "Planifiées", count: stats.scheduled, color: "var(--primary)" },
        { label: "En attente", count: stats.pending, color: "var(--warning)" },
        { label: "Annulées", count: stats.cancelled, color: "var(--destructive)" }
    ];

    return (
        <div className="rapports-card interventions-widget">
            <div className="widget-header">
                <div className="title-area">
                    <div className="header-icon-container">
                        <Hammer size={18} />
                    </div>
                    <div>
                        <h3>Suivi des Interventions</h3>
                        <p className="subtitle">Performance opérationnelle des techniciens</p>
                    </div>
                </div>
                <div className="widget-toggles">
                    <button 
                        className={`toggle-btn ${activeSection === "overview" ? "active" : ""}`}
                        onClick={() => setActiveSection("overview")}
                    >
                        Statuts
                    </button>
                    <button 
                        className={`toggle-btn ${activeSection === "techs" ? "active" : ""}`}
                        onClick={() => setActiveSection("techs")}
                    >
                        Équipes
                    </button>
                    <button 
                        className={`toggle-btn ${activeSection === "equipments" ? "active" : ""}`}
                        onClick={() => setActiveSection("equipments")}
                    >
                        Matériel
                    </button>
                </div>
            </div>

            {/* KPI grid */}
            <div className="kpi-grid">
                <div className="kpi-card success-accent">
                    <span className="kpi-label">Terminées</span>
                    <span className="kpi-value text-success">{stats.completed}</span>
                    <span className="kpi-subtext">Visites effectuées</span>
                </div>
                <div className="kpi-card">
                    <span className="kpi-label">Planifiées</span>
                    <span className="kpi-value text-primary">{stats.scheduled}</span>
                    <span className="kpi-subtext">À venir</span>
                </div>
                <div className="kpi-card warning-accent">
                    <span className="kpi-label">En attente</span>
                    <span className="kpi-value text-warning">{stats.pending}</span>
                    <span className="kpi-subtext">Sans date fixée</span>
                </div>
                <div className="kpi-card">
                    <span className="kpi-label">Total Géré</span>
                    <span className="kpi-value">{stats.total}</span>
                    <span className="kpi-subtext">Interventions créées</span>
                </div>
            </div>

            <div className="widget-content">
                {activeSection === "overview" && (
                    <div className="interventions-overview">
                        <div className="donut-chart-placeholder">
                            <div className="circular-progress-ring">
                                <svg width="120" height="120" viewBox="0 0 120 120">
                                    <circle cx="60" cy="60" r="50" fill="none" stroke="var(--border)" strokeWidth="12" />
                                    {/* Success Segment: Completed (62%) */}
                                    <circle 
                                        cx="60" 
                                        cy="60" 
                                        r="50" 
                                        fill="none" 
                                        stroke="var(--success)" 
                                        strokeWidth="12" 
                                        strokeDasharray={`${2 * Math.PI * 50}`}
                                        strokeDashoffset={`${2 * Math.PI * 50 * (1 - 0.62)}`}
                                        transform="rotate(-90 60 60)"
                                        strokeLinecap="round"
                                    />
                                    {/* Primary Segment: Scheduled (25%) */}
                                    <circle 
                                        cx="60" 
                                        cy="60" 
                                        r="50" 
                                        fill="none" 
                                        stroke="var(--primary)" 
                                        strokeWidth="12" 
                                        strokeDasharray={`${2 * Math.PI * 50}`}
                                        strokeDashoffset={`${2 * Math.PI * 50 * (1 - 0.25)}`}
                                        transform={`rotate(${-90 + 360 * 0.62} 60 60)`}
                                        strokeLinecap="round"
                                        opacity="0.9"
                                    />
                                </svg>
                                <div className="ring-inner-text">
                                    <span className="percentage">62%</span>
                                    <span className="label">Succès</span>
                                </div>
                            </div>
                        </div>

                        <div className="status-indicators">
                            {statusConfig.map((item, idx) => (
                                <div key={idx} className="status-indicator-row">
                                    <div className="indicator-label-wrap">
                                        <span className="indicator-dot" style={{ backgroundColor: item.color }}></span>
                                        <span className="label-text">{item.label}</span>
                                    </div>
                                    <div className="indicator-details">
                                        <span className="count"><strong>{item.count}</strong> ({((item.count / stats.total) * 100).toFixed(0)}%)</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeSection === "techs" && (
                    <div className="tech-workload-list">
                        {techWorkload.map((tech, idx) => {
                            const total = tech.completed + tech.planned;
                            return (
                                <div key={idx} className="tech-row">
                                    <div className="tech-meta">
                                        <span className="tech-name"><strong>{tech.name}</strong></span>
                                        <span className="tech-role">{tech.role === "OWNER" ? "Gérant" : "Technicien"}</span>
                                    </div>
                                    <div className="tech-bar-container">
                                        <div className="bar-details">
                                            <span>{tech.completed} faites</span>
                                            <span>{tech.planned} prévues</span>
                                        </div>
                                        <div className="double-progress-bar">
                                            <div className="fill completed" style={{ width: `${(tech.completed / 60) * 100}%` }}></div>
                                            <div className="fill planned" style={{ width: `${(tech.planned / 60) * 100}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {activeSection === "equipments" && (
                    <div className="equipment-list">
                        {equipmentBreakdown.map((item, idx) => (
                            <div key={idx} className="equipment-row">
                                <div className="equipment-meta">
                                    <span className="brand-name">{item.brand}</span>
                                    <span className="brand-count">{item.count} unités</span>
                                </div>
                                <div className="progress-bar-bg">
                                    <div 
                                        className="progress-bar-fill" 
                                        style={{ 
                                            width: `${item.percentage}%`,
                                            backgroundColor: "var(--primary)"
                                        }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default InterventionsWidget;
