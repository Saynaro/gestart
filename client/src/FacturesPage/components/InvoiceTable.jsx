import React, { useState, useEffect } from "react";
import { Eye, Download, MoreVertical, Send, Check, AlertCircle, Trash } from "lucide-react";

function InvoiceTable({ invoices, onView, onDownloadPdf, onMarkPaid, onSend, onRemind, onCancel }) {
    const [activeMenuId, setActiveMenuId] = useState(null);

    const toggleMenu = (e, id) => {
        e.stopPropagation();
        if (activeMenuId === id) {
            setActiveMenuId(null);
        } else {
            setActiveMenuId(id);
        }
    };

    // Close actions menu when clicking anywhere
    React.useEffect(() => {
        const closeMenu = () => setActiveMenuId(null);
        window.addEventListener("click", closeMenu);
        return () => window.removeEventListener("click", closeMenu);
    }, []);

    const getStatusBadge = (status) => {
        const s = (status || "").toLowerCase();
        switch (s) {
            case "paid":
                return <span className="status-badge paid">Payée</span>;
            case "sent":
                return <span className="status-badge sent">Envoyée</span>;
            case "pending":
                return <span className="status-badge pending">En attente</span>;
            case "overdue":
                return <span className="status-badge overdue">En retard</span>;
            case "cancelled":
                return <span className="status-badge cancelled">Annulée</span>;
            case "draft":
                return <span className="status-badge draft">Brouillon</span>;
            default:
                return <span className="status-badge">{status}</span>;
        }
    };

    return (
        <div className="table-responsive">
            <table className="widget-table factures-table">
                <thead>
                    <tr>
                        <th>Numéro</th>
                        <th>Client</th>
                        <th>Intervention</th>
                        <th className="text-right">Montant TTC</th>
                        <th>Date émission</th>
                        <th>Statut</th>
                        <th className="text-center">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {invoices.length === 0 ? (
                        <tr>
                            <td colSpan="7" style={{ textAlign: "center", padding: "30px", color: "var(--muted-foreground)" }}>
                                Aucune facture trouvée.
                            </td>
                        </tr>
                    ) : (
                        invoices.map((inv) => (
                            <tr key={inv.id}>
                                <td><strong>{inv.number}</strong></td>
                                <td>
                                    <div className="client-info">
                                        <span className="client-name">{inv.clientName}</span>
                                        <span className="client-email">{inv.clientEmail}</span>
                                    </div>
                                </td>
                                <td>{inv.interventionType}</td>
                                <td className="text-right"><strong>{inv.totalTtc.toLocaleString("fr-FR")} €</strong></td>
                                <td>{new Date(inv.date).toLocaleDateString("fr-FR")}</td>
                                <td>{getStatusBadge(inv.status)}</td>
                                <td className="text-center actions-cell">
                                    <div className="action-buttons-row">
                                        <button 
                                            className="action-icon-btn" 
                                            onClick={() => onView(inv)} 
                                            title="Voir la facture"
                                        >
                                            <Eye size={15} />
                                        </button>
                                        <button 
                                            className="action-icon-btn" 
                                            onClick={() => onDownloadPdf(inv)} 
                                            title="Télécharger PDF"
                                        >
                                            <Download size={15} />
                                        </button>
                                        
                                        <div className="dropdown-trigger-wrapper">
                                            <button 
                                                className="action-icon-btn dropdown-dot-btn"
                                                onClick={(e) => toggleMenu(e, inv.id)}
                                            >
                                                <MoreVertical size={15} />
                                            </button>

                                            {activeMenuId === inv.id && (
                                                <div className="table-row-dropdown-menu">
                                                    <button onClick={() => onSend(inv)}>
                                                        <Send size={13} /> Envoyer
                                                    </button>
                                                    {inv.status !== "paid" && (
                                                        <button onClick={() => onMarkPaid(inv)}>
                                                            <Check size={13} /> Marquer payée
                                                        </button>
                                                    )}
                                                    {inv.status === "overdue" && (
                                                        <button onClick={() => onRemind(inv)}>
                                                            <AlertCircle size={13} /> Relancer
                                                        </button>
                                                    )}
                                                    {inv.status !== "cancelled" && (
                                                        <button onClick={() => onCancel(inv)} className="danger-item">
                                                            <Trash size={13} /> Annuler
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}

export default InvoiceTable;
