import React from "react";
import { FileText } from "lucide-react";

function getStatusLabel(status) {
    switch (status) {
        case "DRAFT":    return "Brouillon";
        case "SENT":     return "En attente";
        case "ACCEPTED": return "Signé";
        case "REFUSED":  return "Refusé";
        case "EXPIRED":  return "Expiré";
        default: return status;
    }
}

function QuoteList({ quotes, onRowClick, onCreateQuote }) {
    if (!quotes || quotes.length === 0) {
        return (
            <div className="dv-empty-state" style={{ padding: '60px 20px', textAlign: 'center', backgroundColor: 'var(--card)', borderRadius: '14px', border: '1px solid var(--border)' }}>
                <FileText size={44} style={{ opacity: 0.4, marginBottom: '12px' }} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '6px' }}>Vous n'avez pas encore de devis</h3>
                <p style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem', marginBottom: '20px' }}>
                    Créez votre premier devis client pour commencer à chiffrer vos interventions.
                </p>
                {onCreateQuote && (
                    <button className="dv-new-btn" onClick={onCreateQuote}>
                        + Nouveau devis
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="dv-quote-list">
            {quotes.map(q => (
                <div
                    key={q.id}
                    className="dv-quote-card"
                    onClick={() => onRowClick(q)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === "Enter" && onRowClick(q)}
                >
                    <div className="dv-card-top-left">
                        <span className="dv-card-number">{q.number}</span>
                    </div>
                    <div className="dv-card-top-right">
                        <span className="dv-card-amount">
                            {q.subtotalHt.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €
                        </span>
                        <span className="dv-card-amount-label"> HT</span>
                    </div>

                    <div className="dv-card-bottom-left">
                        <span>{new Date(q.date).toLocaleDateString("fr-FR")}</span>
                        <span style={{ color: "var(--border)", userSelect: "none" }}>·</span>
                        <span>{q.clientName}</span>
                    </div>
                    <div className="dv-card-bottom-right">
                        <span className={`dv-status-badge ${q.status}`}>
                            {getStatusLabel(q.status)}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default QuoteList;
