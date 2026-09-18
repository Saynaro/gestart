import React, { useState, useEffect } from "react";
import { FileText, MoreVertical, Send, Edit2, RefreshCw, Palette, Download, XSquare, Trash2 } from "lucide-react";

function getStatusLabel(q) {
    if (!q) return "Brouillon";
    const status = typeof q === "string" ? q : (q.status || "DRAFT");
    const s = String(status).toUpperCase();
    if (s === "DRAFT") return "Brouillon";
    if (s === "ACCEPTED") return "Signé";
    if (s === "REFUSED" || s === "REJECTED") return "Refusé";
    if (s === "EXPIRED") return "Expiré";
    if (s === "SENT" || s === "PENDING") {
        if (typeof q === "object" && (q.emailSentAt || q.isSentByEmail)) {
            return "Envoyé";
        }
        return "Finalisé";
    }
    return "Finalisé";
}

function QuoteList({
    quotes,
    loading = false,
    activeFilter = "all",
    onRowClick,
    onCreateQuote,
    onSend,
    onEdit,
    onConvertToInvoice,
    onDownloadPdf,
    onCustomise,
    onRejectQuote,
    onDeleteQuote
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

    if (loading && (!quotes || quotes.length === 0)) {
        return (
            <div className="dv-quote-list">
                {[1, 2, 3, 4, 5].map(idx => (
                    <div
                        key={idx}
                        className="dv-quote-card"
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

    if (!quotes || quotes.length === 0) {
        let emptyTitle = "Vous n'avez pas encore de devis";
        let emptyDesc = "Créez votre premier devis client pour commencer à chiffrer vos interventions.";

        const f = String(activeFilter || "").toUpperCase();
        const isFiltered = Boolean(f && f !== "ALL" && f !== "TOUS");

        if (f === "DRAFT") {
            emptyTitle = "Vous n'avez pas de devis en brouillon";
            emptyDesc = "Les devis en cours de préparation apparaîtront ici.";
        } else if (f === "SENT") {
            emptyTitle = "Vous n'avez pas de devis en attente";
            emptyDesc = "Tous vos devis envoyés ont été signés ou sont en brouillon.";
        } else if (f === "ACCEPTED") {
            emptyTitle = "Vous n'avez pas de devis signés";
            emptyDesc = "Vos devis validés et signés par vos clients apparaîtront ici.";
        } else if (f === "REFUSED") {
            emptyTitle = "Vous n'avez pas de devis refusés";
            emptyDesc = "Bonne nouvelle ! Aucun devis n'a été refusé par vos clients.";
        }

        return (
            <div className="dv-empty-state" style={{ padding: '60px 20px', textAlign: 'center', backgroundColor: 'var(--card)', borderRadius: '14px', border: '1px solid var(--border)' }}>
                <FileText size={44} style={{ opacity: 0.4, marginBottom: '12px' }} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '6px' }}>{emptyTitle}</h3>
                <p style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem', marginBottom: isFiltered ? '0' : '20px' }}>
                    {emptyDesc}
                </p>
                {!isFiltered && onCreateQuote && (
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
                    className={`dv-quote-card ${activeMenuId === q.id ? "menu-open" : ""}`}
                    style={{ zIndex: activeMenuId === q.id ? 80 : undefined }}
                    onClick={() => onRowClick(q)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === "Enter" && onRowClick(q)}
                >
                    <div className="dv-card-top-left">
                        <span className="dv-card-number">{q.number}</span>
                    </div>

                    <div className="dv-card-top-right">
                        <div className="dv-card-amount-group">
                            <span className="dv-card-amount">
                                {(q.totalTtc ?? q.amountTTC ?? 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                            </span>
                            <span className="dv-card-amount-label"> TTC</span>
                        </div>

                        {/* 3 Dots Menu Button on Quote Card */}
                        <div className="dv-card-dots-wrapper" onClick={e => e.stopPropagation()}>
                            <button
                                type="button"
                                className="dv-card-dots-btn"
                                onClick={(e) => toggleMenu(e, q.id)}
                                title="Actions du devis"
                                aria-label="Actions du devis"
                            >
                                <MoreVertical size={16} />
                            </button>

                            {activeMenuId === q.id && (
                                <div className="dv-dots-menu dv-card-menu-dropdown" onClick={e => e.stopPropagation()}>
                                    <button
                                        type="button"
                                        className="dv-dots-menu-item"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveMenuId(null);
                                            if (onSend) onSend(q);
                                        }}
                                    >
                                        <Send size={14} /> Envoyer le devis
                                    </button>

                                    {(q.status || "").toUpperCase() !== "ACCEPTED" && onEdit && (
                                        <button
                                            type="button"
                                            className="dv-dots-menu-item"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveMenuId(null);
                                                onEdit(q);
                                            }}
                                        >
                                            <Edit2 size={14} /> Modifier le devis
                                        </button>
                                    )}

                                    {!Boolean(q.invoiceId || q.linkedInvoice || q.linkedFacture || (q.amountFactured && q.amountFactured > 0)) && onConvertToInvoice && (
                                        <button
                                            type="button"
                                            className="dv-dots-menu-item"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveMenuId(null);
                                                onConvertToInvoice(q);
                                            }}
                                        >
                                            <RefreshCw size={14} /> Facturer le devis
                                        </button>
                                    )}

                                    <button
                                        type="button"
                                        className="dv-dots-menu-item"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveMenuId(null);
                                            if (onDownloadPdf) onDownloadPdf(q);
                                        }}
                                    >
                                        <Download size={14} /> Télécharger PDF
                                    </button>

                                    {onCustomise && q.status !== "ACCEPTED" && (
                                        <button
                                            type="button"
                                            className="dv-dots-menu-item"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveMenuId(null);
                                                onCustomise(q);
                                            }}
                                        >
                                            <Palette size={14} /> Personnaliser
                                        </button>
                                    )}

                                    {q.status !== "REFUSED" && q.status !== "ACCEPTED" && onRejectQuote && (
                                        <button
                                            type="button"
                                            className="dv-dots-menu-item dv-danger-item"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveMenuId(null);
                                                onRejectQuote(q);
                                            }}
                                        >
                                            <XSquare size={14} /> Marquer refusé
                                        </button>
                                    )}

                                    {onDeleteQuote && (
                                        <button
                                            type="button"
                                            className="dv-dots-menu-item dv-danger-item"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveMenuId(null);
                                                onDeleteQuote(q);
                                            }}
                                        >
                                            <Trash2 size={14} /> Supprimer
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="dv-card-bottom-left">
                        <span>{new Date(q.date).toLocaleDateString("fr-FR")}</span>
                        <span style={{ color: "var(--border)", userSelect: "none" }}>·</span>
                        <span>{q.clientName}</span>
                    </div>

                    <div className="dv-card-bottom-right">
                        <span className={`dv-status-badge ${(q.status || "DRAFT").toUpperCase()}`}>
                            {getStatusLabel(q)}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default QuoteList;
