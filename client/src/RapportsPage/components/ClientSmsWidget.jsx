import React, { useState } from "react";
import { Users2, MessageSquare, AlertTriangle, CheckCircle, Smartphone } from "lucide-react";

function ClientSmsWidget({ startDate, endDate }) {
    const [viewMode, setViewMode] = useState("clients"); // 'clients' or 'sms'

    // Mock client stats matching ClientStatus enum
    const clientStats = {
        ok: 245,
        warning: 38,
        urgent: 12,
        total: 295
    };

    // Mock SMS statistics matching SmsUsage
    const smsStats = {
        sent: 412,
        limit: 500,
        remaining: 88,
        deliveryRate: 98.4
    };

    // List of urgent clients requiring attention
    const urgentClients = [
        { name: "Garage Central", phone: "+33 6 12 34 56 78", status: "URGENT", equipment: "Climatiseur Split Daikin" },
        { name: "M. Jean Valjean", phone: "+33 6 98 76 54 32", status: "URGENT", equipment: "Chaudière Condensation Frisquet" },
        { name: "Mme Sophie Dupont", phone: "+33 7 45 67 89 01", status: "WARNING", equipment: "Pompe à chaleur Atlantic" }
    ];

    const okPercent = (clientStats.ok / clientStats.total) * 100;
    const warningPercent = (clientStats.warning / clientStats.total) * 100;
    const urgentPercent = (clientStats.urgent / clientStats.total) * 100;

    return (
        <div className="rapports-card client-sms-widget">
            <div className="widget-header">
                <div className="title-area">
                    <div className="header-icon-container">
                        <Users2 size={18} />
                    </div>
                    <div>
                        <h3>Clients & Notifications</h3>
                        <p className="subtitle">État du parc et consommation SMS</p>
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
                    <span className="kpi-value">{smsStats.sent} / {smsStats.limit}</span>
                    <span className="kpi-subtext">SMS envoyés ce mois</span>
                </div>
            </div>

            <div className="widget-content">
                {viewMode === "clients" ? (
                    <div className="clients-status-view">
                        <div className="status-ratio-bar">
                            <div className="segment bg-success" style={{ width: `${okPercent}%` }} title={`Abonnés OK: ${okPercent.toFixed(0)}%`}></div>
                            <div className="segment bg-warning" style={{ width: `${warningPercent}%` }} title={`Abonnés Warning: ${warningPercent.toFixed(0)}%`}></div>
                            <div className="segment bg-danger" style={{ width: `${urgentPercent}%` }} title={`Abonnés Urgent: ${urgentPercent.toFixed(0)}%`}></div>
                        </div>

                        <div className="clients-action-list">
                            <span className="section-title">Clients nécessitant une action rapide</span>
                            <div className="urgent-list-container">
                                {urgentClients.map((client, idx) => (
                                    <div key={idx} className="urgent-client-row">
                                        <div className="client-info">
                                            <span className="client-name"><strong>{client.name}</strong></span>
                                            <span className="client-equipment">{client.equipment}</span>
                                        </div>
                                        <div className="client-contact">
                                            <span className={`status-tag ${client.status === "URGENT" ? "danger" : "warning"}`}>
                                                {client.status === "URGENT" ? "Urgent" : "À planifier"}
                                            </span>
                                            <a href={`tel:${client.phone}`} className="phone-btn">
                                                <Smartphone size={14} />
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="sms-usage-view">
                        <div className="sms-gauge-container">
                            <div className="sms-gauge">
                                <div className="gauge-outer">
                                    <div className="gauge-fill" style={{ width: `${(smsStats.sent / smsStats.limit) * 100}%`, backgroundColor: "var(--primary)" }}></div>
                                </div>
                                <div className="gauge-legend">
                                    <span><strong>{smsStats.sent}</strong> SMS envoyés</span>
                                    <span><strong>{smsStats.remaining}</strong> restants</span>
                                </div>
                            </div>
                        </div>

                        <div className="sms-info-rows">
                            <div className="sms-row">
                                <span className="label">Quota mensuel</span>
                                <span className="val">{smsStats.limit} SMS</span>
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
