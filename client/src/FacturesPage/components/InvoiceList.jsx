import React, { useState, useEffect } from "react";
import { FileText, MoreVertical, Send, Edit2, CheckCircle2, Download, Palette, Trash2 } from "lucide-react";

function getStatusLabel(inv) {
    if (!inv) return "Brouillon";
    const status = typeof inv === "string" ? inv : (inv.status || "draft");
    const s = String(status).toLowerCase();
    if (s === "paid") return "Payée";
    if (s === "overdue") return "En retard";
    if (s === "draft") return "Brouillon";
    if (s === "sent" || s === "pending") {
        if (typeof inv === "object" && (inv.emailSentAt || inv.isSentByEmail)) {
            return "Envoyée";
        }
        return "Finalisée";
    }
    if (s === "finalised") return "Finalisée";
    return "Finalisée";
}

function InvoiceList({
    invoices,
    loading = false,
    activeFilter = "all",
    onRowClick,
    onCreateFacture,
    onSend,
    onEdit,
    onMarkPaid,
    onDownloadPdf,
    onCustomise,
    onDeleteInvoice
}) {
    const [activeMenuId, setActiveMenuId] = useState(null);

    // Close menu when clicking anywhere on the document
    useEffect(() => {
        const handleClickOutside = () => setActiveMenuId(null);
        window.addEventListener("click", handleClickOutside);
        return () => window.removeEventListener("click", handleClickOutside);
    }, []);

    const toggleMenu = (e, id) => {
        e.stopPropagation();
        setActiveMenuId(prev => (prev === id ? null : id));
    };

    if (loading && (!invoices || invoices.length === 0)) {
        return (
            <div className="fp-invoice-list">
                {[1, 2, 3, 4, 5].map(idx => (
                    <div
                        key={idx}
                        className="fp-invoice-card"
                        style={{ pointerEvents: 'none', display: 'flex', flexDirection: 'column', gap: '14px' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div className="skeleton-shimmer" style={{ width: '90px', height: '18px', borderRadius: '6px' }} />
                            <div className="skeleton-shimmer" style={{ width: '85px', height: '20px', borderRadius: '6px' }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                                <div className="skeleton-shimmer" style={{ width: '70px', height: '14px', borderRadius: '4px', opacity: 0.7 }} />
                                <span style={{ color: "var(--border)", userSelect: "none" }}>·</span>
                                <div className="skeleton-shimmer" style={{ width: `${100 + (idx % 3) * 30}px`, height: '14px', borderRadius: '4px' }} />
                            </div>
                            <div className="skeleton-shimmer" style={{ width: '68px', height: '24px', borderRadius: '9999px' }} />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (!invoices || invoices.length === 0) {
        let emptyTitle = "Vous n'avez pas encore de factures";
        let emptyDesc = "Créez votre première facture client pour enregistrer vos règlements.";

        const f = String(activeFilter || "").toLowerCase();
        const isFiltered = Boolean(f && f !== "all" && f !== "tous");

        if (f === "draft") {
            emptyTitle = "Vous n'avez pas de factures en brouillon";
            emptyDesc = "Les factures en cours de préparation apparaîtront ici.";
        } else if (f === "pending" || f === "sent") {
            emptyTitle = "Vous n'avez pas de factures en attente";
            emptyDesc = "Toutes vos factures émises ont été réglées ou sont en brouillon.";
        } else if (f === "paid") {
            emptyTitle = "Vous n'avez pas de factures payées";
            emptyDesc = "Les factures enregistrées comme réglées et encaissées apparaîtront ici.";
        } else if (f === "overdue") {
            emptyTitle = "Vous n'avez pas de factures en retard";
            emptyDesc = "Bonne nouvelle ! Toutes vos factures échues ont été réglées à temps.";
        }

        return (
            <div className="fp-empty-state" style={{ padding: '60px 20px', textAlign: 'center', backgroundColor: 'var(--card)', borderRadius: '14px', border: '1px solid var(--border)' }}>
                <FileText size={44} style={{ opacity: 0.4, marginBottom: '12px' }} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '6px' }}>{emptyTitle}</h3>
                <p style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem', marginBottom: isFiltered ? '0' : '20px' }}>
                    {emptyDesc}
                </p>
                {!isFiltered && onCreateFacture && (
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
                    className={`fp-invoice-card ${activeMenuId === inv.id ? "menu-open" : ""}`}
                    style={{ zIndex: activeMenuId === inv.id ? 80 : undefined }}
                    onClick={() => onRowClick(inv)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === "Enter" && onRowClick(inv)}
                >
                    <div className="fp-card-top-left">
                        <span className="fp-card-number">{inv.number}</span>
                    </div>

                    <div className="fp-card-top-right">
                        <div className="fp-card-amount-group">
                            <span className="fp-card-amount">
                                {(inv.totalTtc ?? inv.amountTTC ?? 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                            </span>
                            <span className="fp-card-amount-label"> TTC</span>
                        </div>

                        {/* 3 Dots Menu Button on Invoice Card */}
                        <div className="fp-card-dots-wrapper" onClick={e => e.stopPropagation()}>
                            <button
                                type="button"
                                className="fp-card-dots-btn"
                                onClick={(e) => toggleMenu(e, inv.id)}
                                title="Actions de la facture"
                                aria-label="Actions de la facture"
                            >
                                <MoreVertical size={16} />
                            </button>

                            {activeMenuId === inv.id && (
                                <div className="fp-dots-menu fp-card-menu-dropdown" onClick={e => e.stopPropagation()}>
                                    {String(inv.status).toLowerCase() !== "draft" && (
                                        <button
                                            type="button"
                                            className="fp-dots-menu-item"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveMenuId(null);
                                                if (onSend) onSend(inv);
                                            }}
                                        >
                                            <Send size={14} /> Envoyer la facture
                                        </button>
                                    )}

                                    <button
                                        type="button"
                                        className="fp-dots-menu-item"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveMenuId(null);
                                            if (onEdit) onEdit(inv);
                                        }}
                                    >
                                        <Edit2 size={14} /> Modifier la facture
                                    </button>

                                    {inv.status !== "paid" && onMarkPaid && (
                                        <button
                                            type="button"
                                            className="fp-dots-menu-item"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveMenuId(null);
                                                onMarkPaid(inv);
                                            }}
                                        >
                                            <CheckCircle2 size={14} /> Encaisser le règlement
                                        </button>
                                    )}

                                    <button
                                        type="button"
                                        className="fp-dots-menu-item"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveMenuId(null);
                                            if (onDownloadPdf) onDownloadPdf(inv);
                                        }}
                                    >
                                        <Download size={14} /> Télécharger PDF
                                    </button>

                                    {onCustomise && inv.status !== "paid" && (
                                        <button
                                            type="button"
                                            className="fp-dots-menu-item"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveMenuId(null);
                                                onCustomise(inv);
                                            }}
                                        >
                                            <Palette size={14} /> Personnaliser
                                        </button>
                                    )}

                                    {onDeleteInvoice && inv.status !== "paid" && (
                                        <button
                                            type="button"
                                            className="fp-dots-menu-item danger"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveMenuId(null);
                                                onDeleteInvoice(inv);
                                            }}
                                        >
                                            <Trash2 size={14} /> Supprimer
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="fp-card-bottom-left">
                        <span className="fp-card-date">
                            {new Date(inv.date).toLocaleDateString("fr-FR")}
                        </span>
                        <span style={{ color: "var(--border)", userSelect: "none" }}>·</span>
                        <span className="fp-card-client">{inv.clientName}</span>
                    </div>

                    <div className="fp-card-bottom-right">
                        <span className={`fp-status-badge ${(inv.status || "draft").toLowerCase()}`}>
                            {getStatusLabel(inv)}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default InvoiceList;
