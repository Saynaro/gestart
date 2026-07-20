import React from "react";
import { FileText, Send, CheckCircle, XCircle, Clock } from "lucide-react";

function QuoteStats({ quotes }) {
    const drafts = quotes.filter(q => q.status === "DRAFT").length;
    const sent = quotes.filter(q => q.status === "SENT").length;
    const accepted = quotes.filter(q => q.status === "ACCEPTED").length;
    const refused = quotes.filter(q => q.status === "REFUSED").length;

    return (
        <div className="quote-stats-grid">
            <div className="kpi-card">
                <div className="kpi-header">
                    <span className="kpi-label">Brouillons</span>
                    <FileText size={18} className="kpi-icon" />
                </div>
                <span className="kpi-value">{drafts}</span>
                <span className="kpi-subtext">Devis en cours de rédaction</span>
            </div>

            <div className="kpi-card warning-accent">
                <div className="kpi-header">
                    <span className="kpi-label">Envoyés</span>
                    <Send size={18} className="kpi-icon text-warning" />
                </div>
                <span className="kpi-value text-warning">{sent}</span>
                <span className="kpi-subtext">En attente de signature</span>
            </div>

            <div className="kpi-card success-accent">
                <div className="kpi-header">
                    <span className="kpi-label">Acceptés</span>
                    <CheckCircle size={18} className="kpi-icon text-success" />
                </div>
                <span className="kpi-value text-success">{accepted}</span>
                <span className="kpi-subtext">À facturer ou planifier</span>
            </div>

            <div className="kpi-card destructive-accent">
                <div className="kpi-header">
                    <span className="kpi-label">Refusés</span>
                    <XCircle size={18} className="kpi-icon text-destructive" />
                </div>
                <span className="kpi-value text-destructive">{refused}</span>
                <span className="kpi-subtext">Devis déclinés</span>
            </div>
        </div>
    );
}

export default QuoteStats;
