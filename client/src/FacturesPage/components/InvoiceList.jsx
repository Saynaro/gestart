import React from "react";
import { FileText } from "lucide-react";

function getStatusLabel(status) {
    switch (status) {
        case "draft":    return "Brouillon";
        case "pending":  return "En attente";
        case "paid":     return "Payée";
        case "overdue":  return "En retard";
        case "finalised": return "Finalisé";
        default: return status;
    }
}

function InvoiceList({ invoices, onRowClick }) {
    if (invoices.length === 0) {
        return (
            <div className="fp-empty-state">
                <FileText size={40} />
                <h3>Aucune facture trouvée</h3>
                <p>Aucune facture ne correspond à ce filtre.</p>
            </div>
        );
    }

    return (
        <div className="fp-invoice-list">
            {invoices.map(inv => (
                <div
                    key={inv.id}
                    className="fp-invoice-card"
                    onClick={() => onRowClick(inv)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === "Enter" && onRowClick(inv)}
                >
                    <div className="fp-card-top-left">
                        <span className="fp-card-number">{inv.number}</span>
                    </div>
                    <div className="fp-card-top-right">
                        <span className="fp-card-amount">
                            {inv.subtotalHt.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                        </span>
                        <span className="fp-card-amount-label"> HT</span>
                    </div>

                    <div className="fp-card-bottom-left">
                        <span className="fp-card-date">
                            {new Date(inv.date).toLocaleDateString("fr-FR")}
                        </span>
                        <span style={{ color: "var(--border)", userSelect: "none" }}>·</span>
                        <span className="fp-card-client">{inv.clientName}</span>
                    </div>
                    <div className="fp-card-bottom-right">
                        <span className={`fp-status-badge ${inv.status}`}>
                            {getStatusLabel(inv.status)}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default InvoiceList;
