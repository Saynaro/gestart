import React, { useState, useEffect } from "react";
import { Eye, Download, MoreVertical, FileSignature, RefreshCw, XSquare } from "lucide-react";

function QuoteTable({ quotes, onView, onDownloadPdf, onSendForSignature, onConvertToInvoice, onRejectQuote }) {
    const [activeMenuId, setActiveMenuId] = useState(null);

    const toggleMenu = (e, id) => {
        e.stopPropagation();
        if (activeMenuId === id) {
            setActiveMenuId(null);
        } else {
            setActiveMenuId(id);
        }
    };

    React.useEffect(() => {
        const closeMenu = () => setActiveMenuId(null);
        window.addEventListener("click", closeMenu);
        return () => window.removeEventListener("click", closeMenu);
    }, []);

    const getStatusBadge = (status) => {
        const s = (status || "").toUpperCase();
        switch (s) {
            case "DRAFT":
                return <span className="status-badge cancelled">Brouillon</span>;
            case "SENT":
                return <span className="status-badge pending">Envoyé</span>;
            case "ACCEPTED":
                return <span className="status-badge paid">Signé</span>;
            case "REFUSED":
                return <span className="status-badge overdue">Refusé</span>;
            case "EXPIRED":
                return <span className="status-badge">Expiré</span>;
            default:
                return <span className="status-badge">{status}</span>;
        }
    };

    return (
        <div className="table-responsive">
            <table className="widget-table devis-table">
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
                    {quotes.length === 0 ? (
                        <tr>
                            <td colSpan="7" style={{ textAlign: "center", padding: "30px", color: "var(--muted-foreground)" }}>
                                Aucun devis trouvé.
                            </td>
                        </tr>
                    ) : (
                        quotes.map((q) => (
                            <tr key={q.id}>
                                <td><strong>{q.number}</strong></td>
                                <td>
                                    <div className="client-info">
                                        <span className="client-name">{q.clientName}</span>
                                        <span className="client-email">{q.clientEmail}</span>
                                    </div>
                                </td>
                                <td>{q.interventionType}</td>
                                <td className="text-right"><strong>{q.totalTtc.toLocaleString("fr-FR")} €</strong></td>
                                <td>{new Date(q.date).toLocaleDateString("fr-FR")}</td>
                                <td>{getStatusBadge(q.status)}</td>
                                <td className="text-center actions-cell">
                                    <div className="action-buttons-row">
                                        <button 
                                            className="action-icon-btn" 
                                            onClick={() => onView(q)} 
                                            title="Voir le devis"
                                        >
                                            <Eye size={15} />
                                        </button>
                                        <button 
                                            className="action-icon-btn" 
                                            onClick={() => onDownloadPdf(q)} 
                                            title="Télécharger PDF"
                                        >
                                            <Download size={15} />
                                        </button>
                                        
                                        <div className="dropdown-trigger-wrapper">
                                            <button 
                                                className="action-icon-btn dropdown-dot-btn"
                                                onClick={(e) => toggleMenu(e, q.id)}
                                            >
                                                <MoreVertical size={15} />
                                            </button>

                                            {activeMenuId === q.id && (
                                                <div className="table-row-dropdown-menu">
                                                    <button onClick={() => onSendForSignature(q)}>
                                                        <FileSignature size={13} /> Envoyer p. signature
                                                    </button>
                                                    {q.status === "ACCEPTED" && (
                                                        <button onClick={() => onConvertToInvoice(q)}>
                                                            <RefreshCw size={13} /> Convertir en facture
                                                        </button>
                                                    )}
                                                    {q.status !== "REFUSED" && q.status !== "ACCEPTED" && (
                                                        <button onClick={() => onRejectQuote(q)} className="danger-item">
                                                            <XSquare size={13} /> Marquer refusé
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

export default QuoteTable;
