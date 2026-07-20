import React from "react";
import { DollarSign, Clock, AlertTriangle } from "lucide-react";

function InvoiceStats({ invoices }) {
    // Calculate stats based on current list of invoices
    const totalThisMonth = invoices
        .filter(inv => inv.status === "paid")
        .reduce((sum, inv) => sum + inv.totalTtc, 0);

    const pendingCount = invoices.filter(inv => inv.status === "pending").length;
    const overdueCount = invoices.filter(inv => inv.status === "overdue").length;

    return (
        <div className="kpi-grid">
            <div className="kpi-card">
                <div className="kpi-header">
                    <span className="kpi-label">Total ce mois</span>
                    <DollarSign size={18} className="kpi-icon" />
                </div>
                <span className="kpi-value">{totalThisMonth.toLocaleString("fr-FR")} €</span>
                <span className="kpi-subtext">Factures payées</span>
            </div>

            <div className="kpi-card warning-accent">
                <div className="kpi-header">
                    <span className="kpi-label">En attente</span>
                    <Clock size={18} className="kpi-icon text-warning" />
                </div>
                <span className="kpi-value text-warning">{pendingCount}</span>
                <span className="kpi-subtext">Règlements en attente</span>
            </div>

            <div className="kpi-card destructive-accent">
                <div className="kpi-header">
                    <span className="kpi-label">En retard</span>
                    <AlertTriangle size={18} className="kpi-icon text-destructive" />
                </div>
                <span className="kpi-value text-destructive">{overdueCount}</span>
                <span className="kpi-subtext">Relances requises</span>
            </div>
        </div>
    );
}

export default InvoiceStats;
