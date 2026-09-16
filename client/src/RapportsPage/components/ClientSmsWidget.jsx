import React, { useState, useEffect } from "react";
import { Users2, MessageSquare, AlertTriangle, CheckCircle, Smartphone } from "lucide-react";
import { apiFetch } from "../../utils/api";

function ClientSmsWidget({ startDate, endDate }) {
    const [viewMode, setViewMode] = useState("clients"); // 'clients' or 'sms'
    const [loading, setLoading] = useState(true);

    const [clientStats, setClientStats] = useState({
        ok: 0,
        warning: 0,
        urgent: 0,
        total: 0
    });

    const [smsStats, setSmsStats] = useState({
        sent: 0,
        limit: 50,
        remaining: 50,
        deliveryRate: 100
    });

    const [urgentClients, setUrgentClients] = useState([]);

    useEffect(() => {
        let isMounted = true;
        const fetchClientReports = async () => {
            setLoading(true);
            try {
                const res = await apiFetch(`/v1/reports/clients?from=${startDate || ''}&to=${endDate || ''}`);
                const data = res.data || res;
                if (!isMounted) return;

                if (data.clientStats) {
                    setClientStats(data.clientStats);
                } else if (data.statusBreakdown) {
                    setClientStats({
                        ok: data.statusBreakdown.OK || 0,
                        warning: data.statusBreakdown.WARNING || 0,
                        urgent: data.statusBreakdown.URGENT || 0,
                        total: data.totalActive || 0
                    });
                }

                if (data.smsStats) {
                    setSmsStats(data.smsStats);
                }

                if (Array.isArray(data.urgentClients)) {
                    setUrgentClients(data.urgentClients);
                }
            } catch (err) {
                console.warn("[REPORTS] Error fetching client report:", err.message);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchClientReports();
        return () => { isMounted = false; };
    }, [startDate, endDate]);

    const totalCount = clientStats.total || (clientStats.ok + clientStats.warning + clientStats.urgent) || 1;
    const okPercent = Math.round((clientStats.ok / totalCount) * 100);
    const warningPercent = Math.round((clientStats.warning / totalCount) * 100);
    const urgentPercent = Math.round((clientStats.urgent / totalCount) * 100);

    const smsLimitNum = Number(smsStats.limit) || 50;
    const smsSentNum = Number(smsStats.sent) || 0;
    const smsGaugePercent = Math.min(100, Math.round((smsSentNum / smsLimitNum) * 100));

    return (
        <div className="rapports-card client-sms-widget">
            <div className="widget-header">
                <div className="title-area">
                    <div className="header-icon-container">
                        <Users2 size={18} />
                    </div>
                    <div>
                        <h3>Clients & Notifications</h3>
                        <p className="subtitle">État du parc et consommation SMS en temps réel</p>
                    </div>
                </div>
                <div className="widget-toggles">
                    <button 
                        className={`toggle-btn ${viewMode === "clients" ? "active" : ""}`}
                        onClick={() => setViewMode("clients")}
                    >
                        Clients
                    </button>
                    <button 
                        className={`toggle-btn ${viewMode === "sms" ? "active" : ""}`}
                        onClick={() => setViewMode("sms")}
                    >
                        SMS
                    </button>
                </div>
            </div>

            {/* KPI grid */}
            <div className="kpi-grid">
                {loading ? (
                    [1, 2, 3, 4].map((i) => (
                        <div key={i} className="kpi-card" style={{ pointerEvents: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div className="skeleton-shimmer" style={{ width: '80px', height: '12px', borderRadius: '4px' }} />
                            <div className="skeleton-shimmer" style={{ width: '60px', height: '22px', borderRadius: '6px' }} />
                            <div className="skeleton-shimmer" style={{ width: '70px', height: '11px', borderRadius: '4px', opacity: 0.6 }} />
                        </div>
                    ))
                ) : (
                    <>
                        <div className="kpi-card success-accent">
                            <span className="kpi-label">Clients OK</span>
                            <span className="kpi-value text-success">{clientStats.ok}</span>
                            <span className="kpi-subtext">Parc à jour</span>
                        </div>
                        <div className="kpi-card warning-accent">
                            <span className="kpi-label">À Prévoir (60j)</span>
                            <span className="kpi-value text-warning">{clientStats.warning}</span>
                            <span className="kpi-subtext">Visites de maintenance</span>
                        </div>
                        <div className="kpi-card destructive-accent">
                            <span className="kpi-label">Urgents / En retard</span>
                            <span className="kpi-value text-danger">{clientStats.urgent}</span>
                            <span className="kpi-subtext">Entretien dépassé</span>
                        </div>
                        <div className="kpi-card">
                            <span className="kpi-label">Consommation SMS</span>
                            <span className="kpi-value">{smsStats.sent} / {smsStats.limit === 9999 ? "Illimité" : smsStats.limit}</span>
                            <span className="kpi-subtext">SMS envoyés ce mois</span>
                        </div>
                    </>
                )}
            </div>

            <div className="widget-content">
                {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px 0' }}>
                        <div className="skeleton-shimmer" style={{ width: '100%', height: '12px', borderRadius: '6px' }} />
                        <div className="skeleton-shimmer" style={{ width: '100%', height: '48px', borderRadius: '8px', opacity: 0.7 }} />
                        <div className="skeleton-shimmer" style={{ width: '100%', height: '48px', borderRadius: '8px', opacity: 0.7 }} />
                    </div>
                ) : viewMode === "clients" ? (
                    <div className="clients-status-view">
                        <div className="status-ratio-bar">
                            <div className="segment bg-success" style={{ width: `${okPercent}%` }} title={`Abonnés OK: ${okPercent}%`}></div>
                            <div className="segment bg-warning" style={{ width: `${warningPercent}%` }} title={`Abonnés Warning: ${warningPercent}%`}></div>
                            <div className="segment bg-danger" style={{ width: `${urgentPercent}%` }} title={`Abonnés Urgent: ${urgentPercent}%`}></div>
                        </div>

                        <div className="clients-action-list">
                            <span className="section-title">Clients nécessitant une action rapide</span>
                            <div className="urgent-list-container">
                                {urgentClients.length === 0 ? (
                                    <div style={{ textAlign: "center", padding: "20px", color: "var(--muted-foreground)", backgroundColor: "var(--background)", borderRadius: "8px", border: "1px solid var(--border)" }}>
                                        <CheckCircle size={24} style={{ margin: "0 auto 6px auto", color: "var(--success)", opacity: 0.8 }} />
                                        <p style={{ fontWeight: 600, fontSize: "13px", color: "var(--foreground)", margin: "0 0 2px 0" }}>
                                            Tous vos clients sont à jour
                                        </p>
                                        <p style={{ fontSize: "11.5px", margin: 0 }}>
                                            Aucun équipement en retard d'entretien détecté dans votre base.
                                        </p>
                                    </div>
                                ) : (
                                    urgentClients.map((client, idx) => (
                                        <div key={client.id || idx} className="urgent-client-row">
                                            <div className="client-info">
                                                <span className="client-name"><strong>{client.name}</strong></span>
                                                <span className="client-equipment">{client.equipment}</span>
                                            </div>
                                            <div className="client-contact">
                                                <span className={`status-tag ${client.status === "URGENT" ? "danger" : client.status === "WARNING" ? "warning" : "success"}`}>
                                                    {client.status === "URGENT" ? "Urgent" : client.status === "WARNING" ? "À planifier" : "À jour"}
                                                </span>
                                                {client.phone && (
                                                    <a href={`tel:${client.phone}`} className="phone-btn" title={`Appeler ${client.name}`}>
                                                        <Smartphone size={14} />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="sms-usage-view">
                        <div className="sms-gauge-container">
                            <div className="sms-gauge">
                                <div className="gauge-outer">
                                    <div className="gauge-fill" style={{ width: `${smsGaugePercent}%`, backgroundColor: "var(--primary)" }}></div>
                                </div>
                                <div className="gauge-legend">
                                    <span><strong>{smsStats.sent}</strong> SMS envoyés</span>
                                    <span><strong>{smsStats.remaining === 9999 ? "Illimité" : smsStats.remaining}</strong> restants</span>
                                </div>
                            </div>
                        </div>

                        <div className="sms-info-rows">
                            <div className="sms-row">
                                <span className="label">Quota mensuel</span>
                                <span className="val">{smsStats.limit === 9999 ? "Illimité" : `${smsStats.limit} SMS`}</span>
                            </div>
                            <div className="sms-row">
                                <span className="label">Taux de délivrabilité</span>
                                <span className="val text-success">{smsStats.deliveryRate}%</span>
                            </div>
                            <div className="sms-row">
                                <span className="label">Notification de rappels auto</span>
                                <span className="val">Activée (J-7 / J-1)</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ClientSmsWidget;
