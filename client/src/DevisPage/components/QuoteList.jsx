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

function QuoteList({ quotes, onRowClick }) {
    if (quotes.length === 0) {
        return (
            <div className="dv-empty-state">
                <FileText size={40} />
                <h3>Aucun devis trouvé</h3>
                <p>Aucun devis ne correspond à ce filtre.</p>
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
