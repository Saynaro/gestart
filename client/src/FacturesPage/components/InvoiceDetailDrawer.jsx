import React, { useState } from "react";
import { X, MoreVertical, Send, Edit2, CheckCircle, FileText, Copy, RotateCcw, Eye } from "lucide-react";

function getStatusLabel(status) {
    switch (status) {
        case "draft":     return "Brouillon";
        case "pending":   return "En attente";
        case "paid":      return "Payée";
        case "overdue":   return "En retard";
        case "finalised": return "Finalisé";
        default: return status;
    }
}

function InvoiceDetailDrawer({
    invoice,
    onClose,
    onPreview,
    onEdit,
    onSend,
    onFinalise,
    onMarkPaid,
    onMarkUnpaid
}) {
    const [showDotsMenu, setShowDotsMenu] = useState(false);

    const isDraft   = invoice.status === "draft";
    const isPaid    = invoice.status === "paid";
    const isPending = invoice.status === "pending" || invoice.status === "overdue";

    const dueDate = invoice.dueDate
        ? new Date(invoice.dueDate).toLocaleDateString("fr-FR")
        : new Date(new Date(invoice.date).setDate(new Date(invoice.date).getDate() + (invoice.paymentDelay || 30))).toLocaleDateString("fr-FR");

    const linkedDevis = invoice.linkedDevis || null;

    // ── Live mini PDF preview (same style as NewInvoiceModal) ──
    const renderPreview = () => (
        <div className="live-preview-a4-wrapper">
            <div className="live-preview-a4-sheet">
                <div className="pdf-header-row">
                    <div className="pdf-header-left">
                        <div className="pdf-logo-stub" style={{ fontSize: '11pt', padding: '4pt', width: '80pt' }}>
                            <span>CLIMPRO</span>
                        </div>
                        <h3 className="company-name" style={{ fontSize: '10pt' }}>Dupont Climatisation</h3>
                        <p className="company-details" style={{ fontSize: '8pt', lineHeight: 1.3 }}>
                            88 Rue de l'Aviation, 75015 Paris<br />
                            SIRET : 849 203 103 00021
                        </p>
                    </div>
                    <div className="pdf-header-right">
                        <h1 className="doc-type-label" style={{ fontSize: '18pt', marginBottom: '4pt' }}>FACTURE</h1>
                        <table className="doc-meta-table" style={{ fontSize: '8pt' }}>
                            <tbody>
                                <tr>
                                    <td><strong>Numéro :</strong></td>
                                    <td>{invoice.number}</td>
                                </tr>
                                <tr>
                                    <td><strong>Date :</strong></td>
                                    <td>{new Date(invoice.date).toLocaleDateString('fr-FR')}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="pdf-billing-section" style={{ margin: '10pt 0', paddingTop: '8pt' }}>
                    <div className="billing-to-card">
                        <span className="section-label" style={{ fontSize: '7.5pt' }}>FACTURÉ À :</span>
                        <h4 className="client-name" style={{ fontSize: '10pt' }}>{invoice.clientName}</h4>
                        <p className="client-details" style={{ fontSize: '8.5pt' }}>
                            {invoice.clientAddress || ''}<br />
                            {invoice.clientEmail || ''}
                        </p>
                    </div>
                </div>

                {invoice.interventionType && (
                    <div className="pdf-intervention-info" style={{ padding: '6pt 8pt', marginBottom: '10pt', fontSize: '8.5pt' }}>
                        <span>Intervention : <strong>{invoice.interventionType}</strong></span>
                        {invoice.workDetails && (
                            <p className="work-details" style={{ fontSize: '8pt', marginTop: '4pt', paddingTop: '4pt' }}>{invoice.workDetails}</p>
                        )}
                    </div>
                )}

                <table className="pdf-items-table" style={{ fontSize: '8.5pt', marginBottom: '15pt' }}>
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th className="text-center" style={{ width: '40px' }}>Qté</th>
                            <th className="text-right" style={{ width: '80px' }}>Unit. HT</th>
                            <th className="text-right" style={{ width: '80px' }}>Total HT</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(invoice.lines || []).map((line, idx) => (
                            <tr key={idx}>
                                <td>{line.description || '—'}</td>
                                <td className="text-center">{line.qty}</td>
                                <td className="text-right">{(line.unitPrice || 0).toLocaleString('fr-FR')} €</td>
                                <td className="text-right">{((line.unitPrice || 0) * (line.qty || 1)).toLocaleString('fr-FR')} €</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="pdf-summary-block" style={{ marginBottom: '15pt' }}>
                    <table className="pdf-summary-table" style={{ fontSize: '8.5pt', width: '160pt' }}>
                        <tbody>
                            <tr>
                                <td>Sous-total HT :</td>
                                <td>{(invoice.subtotalHt || 0).toLocaleString('fr-FR')} €</td>
                            </tr>
                            <tr>
                                <td>TVA ({invoice.tvaRate || 20}%) :</td>
                                <td>{(invoice.tvaAmount || 0).toLocaleString('fr-FR')} €</td>
                            </tr>
                            <tr className="grand-total-row">
                                <td><strong>TOTAL TTC :</strong></td>
                                <td><strong>{(invoice.totalTtc || 0).toLocaleString('fr-FR')} €</strong></td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div className="pdf-footer-section" style={{ fontSize: '7.5pt', paddingTop: '8pt' }}>
                    <span>IBAN: FR76 3000 6000 0123 4567 8901 234</span>
                </div>
            </div>
        </div>
    );

    return (
        <>
            <div className="fp-drawer-overlay" onClick={onClose}>
                <div className="fp-detail-wide-container" role="dialog" aria-label="Détails de la facture" onClick={e => e.stopPropagation()}>
                    {/* LEFT: detail panel */}
                    <aside className="fp-drawer fp-detail-left">

                {/* Header */}
                <div className="fp-drawer-header">
                    <span className="fp-drawer-title">Détails de la facture</span>
                    <div className="fp-drawer-header-actions">
                        <div style={{ position: "relative" }}>
                            <button
                                className="fp-icon-btn"
                                onClick={() => setShowDotsMenu(v => !v)}
                                aria-label="Options"
                            >
                                <MoreVertical size={16} />
                            </button>
                            {showDotsMenu && (
                                <div className="fp-dots-menu" onClick={() => setShowDotsMenu(false)}>
                                    <button className="fp-dots-menu-item" onClick={onSend}>
                                        <Send size={15} /> Envoyer
                                    </button>
                                    <button className="fp-dots-menu-item" onClick={onEdit}>
                                        <Edit2 size={15} /> Modifier
                                    </button>
                                    <button className="fp-dots-menu-item" onClick={() => {}}>
                                        <Copy size={15} /> Dupliquer
                                    </button>
                                    {isPaid && (
                                        <button className="fp-dots-menu-item" onClick={() => onMarkUnpaid(invoice)}>
                                            <RotateCcw size={15} /> Marquer comme non payée
                                        </button>
                                    )}
                                    <button className="fp-dots-menu-item" onClick={() => {}}>
                                        <FileText size={15} /> Personnaliser le document
                                    </button>
                                </div>
                            )}
                        </div>
                        <button className="fp-icon-btn" onClick={onClose} aria-label="Fermer">
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="fp-drawer-body">
                    {/* Number + status */}
                    <div className="fp-drawer-doc-id">{invoice.number}</div>
                    <div className="fp-drawer-status-row">
                        <span className={`fp-status-badge ${invoice.status}`}>
                            {getStatusLabel(invoice.status)}
                        </span>
                    </div>

                    {/* Preview thumbnail — click opens A4 */}
                    <div
                        className="fp-preview-thumbnail"
                        onClick={onPreview}
                        role="button"
                        tabIndex={0}
                        onKeyDown={e => e.key === "Enter" && onPreview()}
                        title="Prévisualiser la facture en A4"
                        aria-label="Prévisualiser la facture"
                    >
                        {/* Fake document lines in the background */}
                        <div className="fp-preview-doc-lines">
                            <div className="fp-preview-line" style={{ width: "35%" }} />
                            <div className="fp-preview-line-sm" style={{ width: "65%" }} />
                            <div className="fp-preview-line-sm" style={{ width: "50%" }} />
                            <div style={{ height: "1px", background: "rgba(128,128,128,0.35)", margin: "6px 0" }} />
                            <div className="fp-preview-line-sm" style={{ width: "90%" }} />
                            <div className="fp-preview-line-sm" style={{ width: "85%" }} />
                            <div className="fp-preview-line-sm" style={{ width: "75%" }} />
                            <div style={{ height: "1px", background: "rgba(128,128,128,0.35)", margin: "6px 0" }} />
                            <div className="fp-preview-line-sm" style={{ width: "60%" }} />
                        </div>
                        {/* Overlay button */}
                        <button className="fp-preview-btn">
                            <Eye size={14} style={{ verticalAlign: "middle", marginRight: 6 }} />
                            Prévisualiser
                        </button>
                    </div>

                    {/* Client */}
                    <div className="fp-drawer-section">
                        <div className="fp-drawer-section-title">Client</div>
                        <div className="fp-drawer-row">
                            <span className="fp-drawer-row-label">Nom du client</span>
                            <span className="fp-drawer-row-value">{invoice.clientName}</span>
                        </div>
                        {invoice.clientEmail && (
                            <div className="fp-drawer-row">
                                <span className="fp-drawer-row-label">E-mail</span>
                                <span className="fp-drawer-row-value" style={{ fontSize: "0.8rem" }}>{invoice.clientEmail}</span>
                            </div>
                        )}
                    </div>

                    {/* Dates */}
                    <div className="fp-drawer-section">
                        <div className="fp-drawer-section-title">Dates & Exigibilité</div>
                        <div className="fp-drawer-row">
                            <span className="fp-drawer-row-label">Date d'émission</span>
                            <span className="fp-drawer-row-value">
                                {new Date(invoice.date).toLocaleDateString("fr-FR")}
                            </span>
                        </div>
                        <div className="fp-drawer-row">
                            <span className="fp-drawer-row-label">Date d'exigibilité</span>
                            <span className="fp-drawer-row-value">{dueDate}</span>
                        </div>
                        {invoice.deliveryDate && (
                            <div className="fp-drawer-row">
                                <span className="fp-drawer-row-label">Date de livraison</span>
                                <span className="fp-drawer-row-value">{new Date(invoice.deliveryDate).toLocaleDateString("fr-FR")}</span>
                            </div>
                        )}
                        <div className="fp-drawer-row">
                            <span className="fp-drawer-row-label">Conditions de paiement</span>
                            <span className="fp-drawer-row-value">{invoice.paymentConditions || "Paiement à 30 jours"}</span>
                        </div>
                    </div>

                    {/* Montant */}
                    <div className="fp-drawer-section">
                        <div className="fp-drawer-section-title">Montant</div>
                        <div className="fp-drawer-row">
                            <span className="fp-drawer-row-label">Montant HT</span>
                            <span className="fp-drawer-row-value" style={{ fontSize: "1.05rem", fontWeight: 800 }}>
                                {invoice.subtotalHt.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €
                            </span>
                        </div>
                        {invoice.tvaAmount != null && (
                            <div className="fp-drawer-row">
                                <span className="fp-drawer-row-label">TVA ({invoice.tvaRate || 20}%)</span>
                                <span className="fp-drawer-row-value">
                                    {(invoice.tvaAmount || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €
                                </span>
                            </div>
                        )}
                        {invoice.totalTtc != null && (
                            <div className="fp-drawer-row" style={{ borderTop: "1px solid var(--border)", marginTop: 4, paddingTop: 6 }}>
                                <span className="fp-drawer-row-label" style={{ fontWeight: 600, color: "var(--foreground)" }}>Total TTC</span>
                                <span className="fp-drawer-row-value" style={{ fontSize: "1rem", fontWeight: 800, color: "#556B2F" }}>
                                    {invoice.totalTtc.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Encaissement (paid only) */}
                    {isPaid && (
                        <div className="fp-drawer-section">
                            <div className="fp-drawer-section-title">Encaissement</div>
                            <div className="fp-drawer-row">
                                <span className="fp-drawer-row-label">Mode de paiement</span>
                                <span className="fp-drawer-row-value">Virement bancaire</span>
                            </div>
                            <div className="fp-drawer-row">
                                <span className="fp-drawer-row-label">Date de paiement</span>
                                <span className="fp-drawer-row-value">
                                    {new Date(invoice.date).toLocaleDateString("fr-FR")}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Documents liés */}
                    {linkedDevis && (
                        <div className="fp-drawer-section">
                            <div className="fp-drawer-section-title">Documents liés</div>
                            <div className="fp-linked-doc">
                                <div>
                                    <div className="fp-linked-doc-number">{linkedDevis.number}</div>
                                    <div style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>
                                        {linkedDevis.date} · {invoice.clientName}
                                    </div>
                                </div>
                                <span className="fp-linked-doc-badge">Signé</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer actions */}
                <div className="fp-drawer-footer">
                    {/* Primary CTA based on status */}
                    {isDraft && (
                        <button className="fp-drawer-action-primary" onClick={() => onFinalise(invoice)}>
                            ✓ Finaliser la facture
                        </button>
                    )}
                    {isPending && (
                        <button className="fp-drawer-action-primary" onClick={() => onMarkPaid(invoice)}>
                            <CheckCircle size={16} style={{ verticalAlign: "middle", marginRight: 6 }} />
                            Encaisser la facture
                        </button>
                    )}

                    {/* Envoyer */}
                    <button className="fp-drawer-action-secondary" onClick={onSend}>
                        <Send size={14} style={{ verticalAlign: "middle", marginRight: 6 }} />
                        Envoyer la facture
                    </button>

                    {/* Modifier */}
                    <button className="fp-drawer-action-link" onClick={onEdit}>
                        <Edit2 size={14} style={{ verticalAlign: "middle", marginRight: 4 }} />
                        Modifier la facture
                    </button>
                </div>
                </aside>
                {/* RIGHT: live preview (desktop only) */}
                <div className="fp-detail-right">
                    <div className="preview-side-header">
                        <FileText size={14} />
                        Aperçu de la facture
                    </div>
                    <div className="preview-side-scrollable">
                        {renderPreview()}
                    </div>
                </div>
            </div>
            </div>
        </>
    );
}

export default InvoiceDetailDrawer;
