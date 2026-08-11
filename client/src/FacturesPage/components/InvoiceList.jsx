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

function InvoiceList({ invoices, onRowClick, onCreateFacture }) {
    if (!invoices || invoices.length === 0) {
        return (
            <div className="fp-empty-state" style={{ padding: '60px 20px', textAlign: 'center', backgroundColor: 'var(--card)', borderRadius: '14px', border: '1px solid var(--border)' }}>
                <FileText size={44} style={{ opacity: 0.4, marginBottom: '12px' }} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '6px' }}>Vous n'avez pas encore de factures</h3>
                <p style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem', marginBottom: '20px' }}>
                    Créez votre première facture client pour enregistrer vos règlements.
                </p>
                {onCreateFacture && (
                    <button className="fp-new-btn" onClick={onCreateFacture}>
                        + Nouvelle facture
                    </button>
                )}
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
