import React, { useState, useEffect } from "react";
import { Hammer, CheckCircle2, CalendarDays, Users, Wrench } from "lucide-react";
import { apiFetch } from "../../utils/api";

function InterventionsWidget({ startDate, endDate }) {
    const [activeSection, setActiveSection] = useState("overview"); // 'overview', 'techs', 'equipments'
    const [loading, setLoading] = useState(true);

    const [stats, setStats] = useState({ completed: 0, scheduled: 0, pending: 0, cancelled: 0, total: 0 });
    const [techWorkload, setTechWorkload] = useState([]);
    const [equipmentBreakdown, setEquipmentBreakdown] = useState([]);

    useEffect(() => {
        let isMounted = true;
        const fetchInterventionsData = async () => {
            setLoading(true);
            try {
                const res = await apiFetch(`/v1/reports/interventions?from=${startDate || ''}&to=${endDate || ''}`);
                const data = res.data || res;
                if (!isMounted) return;

                if (data.summary) {
                    setStats({
                        completed: data.summary.completed || 0,
                        scheduled: data.summary.scheduled || 0,
                        pending: data.summary.pending || 0,
                        cancelled: data.summary.cancelled || 0,
                        total: data.summary.total || 0
                    });
                }
                if (Array.isArray(data.techWorkload)) {
                    setTechWorkload(data.techWorkload);
                }
                if (Array.isArray(data.equipmentBreakdown)) {
                    setEquipmentBreakdown(data.equipmentBreakdown);
                }
            } catch (err) {
                console.warn("API interventions report error, falling back to /v1/interventions:", err.message);
                try {
                    const fallback = await apiFetch(`/v1/interventions?limit=1000&status=ALL`);
                    const list = fallback.data?.interventions || fallback.interventions || (Array.isArray(fallback) ? fallback : []);
                    if (!isMounted) return;
                    if (list.length > 0) {
                        const completed = list.filter(i => i.status === 'COMPLETED' || i.status === 'Terminé').length;
                        const scheduled = list.filter(i => ['SCHEDULED', 'Planifié', 'Confirmé', 'ARRIVED', 'IN_PROGRESS'].includes(i.status)).length;
                        const pending = list.filter(i => i.status === 'PENDING' || i.status === 'En attente').length;
                        const cancelled = list.filter(i => i.status === 'CANCELLED' || i.status === 'Annulé').length;
                        setStats({ completed, scheduled, pending, cancelled, total: list.length });
                    }
                } catch (fallbackErr) {
                    console.error("Fallback interventions fetch failed:", fallbackErr.message);
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        fetchInterventionsData();
        return () => { isMounted = false; };
    }, [startDate, endDate]);

    // Status colors
    const statusConfig = [
        { label: "Terminées", count: stats.completed, color: "#556B2F" },
        { label: "Planifiées", count: stats.scheduled, color: "#8FBC8F" },
        { label: "En attente", count: stats.pending, color: "var(--warning)" },
        { label: "Annulées", count: stats.cancelled, color: "var(--destructive)" }
    ];

    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    const effectiveTotal = (stats.total - stats.cancelled) > 0 ? (stats.total - stats.cancelled) : (stats.total || 1);
    const completedRatio = Math.min(1, Math.max(0, stats.completed / effectiveTotal));
    const scheduledRatio = Math.min(1 - completedRatio, Math.max(0, stats.scheduled / effectiveTotal));
    const successRate = Math.round(completedRatio * 100);

    const maxTechCount = Math.max(...techWorkload.map(t => (t.completed || 0) + (t.planned || 0)), 1);

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
                <div className="kpi-card">
                    <span className="kpi-label">Terminées</span>
                    <span className="kpi-value text-success">{stats.completed}</span>
                    <span className="kpi-subtext">Visites effectuées</span>
                </div>
                <div className="kpi-card">
                    <span className="kpi-label">Planifiées</span>
                    <span className="kpi-value">{stats.scheduled}</span>
                    <span className="kpi-subtext">À venir</span>
                </div>
                <div className="kpi-card">
                    <span className="kpi-label">En attente</span>
                    <span className={`kpi-value ${stats.pending > 0 ? "text-warning" : ""}`}>{stats.pending}</span>
                    <span className="kpi-subtext">Sans date fixée</span>
                </div>
                <div className="kpi-card">
                    <span className="kpi-label">Total Géré</span>
                    <span className="kpi-value">{stats.total}</span>
                    <span className="kpi-subtext">Interventions créées</span>
                </div>
            </div>

            <div className="widget-content">
                {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px 0' }}>
                        <div className="skeleton-shimmer" style={{ width: '100%', height: '18px', borderRadius: '6px' }} />
                        <div className="skeleton-shimmer" style={{ width: '100%', height: '48px', borderRadius: '8px', opacity: 0.7 }} />
                        <div className="skeleton-shimmer" style={{ width: '100%', height: '48px', borderRadius: '8px', opacity: 0.7 }} />
                    </div>
                ) : activeSection === "overview" ? (
                    <div className="interventions-overview">
                        <div className="donut-chart-placeholder">
                            <div className="circular-progress-ring">
                                <svg width="120" height="120" viewBox="0 0 120 120">
                                    <circle cx="60" cy="60" r="50" fill="none" stroke="var(--border)" strokeWidth="12" />
                                    {/* Success Segment: Completed */}
                                    {completedRatio > 0 && (
                                        <circle 
                                            cx="60" 
                                            cy="60" 
                                            r="50" 
                                            fill="none" 
                                            stroke="#556B2F" 
                                            strokeWidth="12" 
                                            strokeDasharray={`${circumference}`}
                                            strokeDashoffset={`${circumference * (1 - completedRatio)}`}
                                            transform="rotate(-90 60 60)"
                                            strokeLinecap="round"
                                        />
                                    )}
                                    {/* Primary Segment: Scheduled */}
                                    {scheduledRatio > 0 && (
                                        <circle 
                                            cx="60" 
                                            cy="60" 
                                            r="50" 
                                            fill="none" 
                                            stroke="#8FBC8F" 
                                            strokeWidth="12" 
                                            strokeDasharray={`${circumference}`}
                                            strokeDashoffset={`${circumference * (1 - scheduledRatio)}`}
                                            transform={`rotate(${-90 + 360 * completedRatio} 60 60)`}
                                            strokeLinecap="round"
                                            opacity="0.9"
                                        />
                                    )}
                                </svg>
                                <div className="ring-inner-text">
                                    <span className="percentage">{successRate}%</span>
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
                                        <span className="count">
                                            <strong>{item.count}</strong> ({stats.total > 0 ? Math.round((item.count / stats.total) * 100) : 0}%)
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : activeSection === "techs" ? (
                    <div className="tech-workload-list">
                        {techWorkload.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "28px 16px", color: "var(--muted-foreground)" }}>
                                <Users size={24} style={{ margin: "0 auto 6px auto", opacity: 0.6 }} />
                                <p style={{ fontWeight: 600, fontSize: "13px", color: "var(--foreground)", marginBottom: "3px" }}>
                                    Aucune équipe assignée
                                </p>
                                <p style={{ fontSize: "11.5px", margin: 0 }}>
                                    Assignez des techniciens à vos interventions pour suivre leur charge de travail.
                                </p>
                            </div>
                        ) : (
                            techWorkload.map((tech, idx) => {
                                const completedPct = Math.round(((tech.completed || 0) / maxTechCount) * 100);
                                const plannedPct = Math.round(((tech.planned || 0) / maxTechCount) * 100);
                                return (
                                    <div key={tech.id || idx} className="tech-row">
                                        <div className="tech-meta">
                                            <span className="tech-name"><strong>{tech.name}</strong></span>
                                            <span className="tech-role">{tech.role === "OWNER" ? "Gérant" : tech.role === "MANAGER" ? "Manager" : "Technicien"}</span>
                                        </div>
                                        <div className="tech-bar-container">
                                            <div className="bar-details">
                                                <span>{tech.completed || 0} faites</span>
                                                <span>{tech.planned || 0} prévues</span>
                                            </div>
                                            <div className="double-progress-bar">
                                                <div className="fill completed" style={{ width: `${completedPct}%` }} title={`${tech.completed} faites`}></div>
                                                <div className="fill planned" style={{ width: `${plannedPct}%` }} title={`${tech.planned} prévues`}></div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                ) : (
                    <div className="equipment-list">
                        {equipmentBreakdown.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "28px 16px", color: "var(--muted-foreground)" }}>
                                <Wrench size={24} style={{ margin: "0 auto 6px auto", opacity: 0.6 }} />
                                <p style={{ fontWeight: 600, fontSize: "13px", color: "var(--foreground)", marginBottom: "3px" }}>
                                    Aucun matériel enregistré
                                </p>
                                <p style={{ fontSize: "11.5px", margin: 0 }}>
                                    Renseignez les marques de vos équipements ou types d'interventions pour visualiser leur répartition.
                                </p>
                            </div>
                        ) : (
                            equipmentBreakdown.map((item, idx) => (
                                <div key={idx} className="equipment-row">
                                    <div className="equipment-meta">
                                        <span className="brand-name">{item.brand}</span>
                                        <span className="brand-count">{item.count} unité{item.count > 1 ? 's' : ''} ({item.percentage}%)</span>
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
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default InterventionsWidget;
