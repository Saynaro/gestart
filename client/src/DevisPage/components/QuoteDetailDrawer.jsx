import React, { useState } from "react";
import { createPortal } from "react-dom";
import { X, MoreVertical, Send, Copy, FileText, RefreshCw, Edit2, Play, Palette } from "lucide-react";
import DocumentCustomizerModal from "../../components/DocumentCustomizerModal";
import { useDocumentCustomization } from "../../utils/documentCustomization";

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

const STATUS_CHOICES = [
    { key: "DRAFT",    label: "Brouillon" },
    { key: "SENT",     label: "En attente" },
    { key: "ACCEPTED", label: "Signé" },
    { key: "REFUSED",  label: "Refusé" },
];

function QuoteDetailDrawer({
    quote,
    onClose,
    onPreview,
    onSend,
    onConvertToInvoice,
    onChangeStatus,
    onEdit,
    onOpenLinkedInvoice,
    onUpdateQuoteCustomization,
    overlayStyle
}) {
    const [showDotsMenu, setShowDotsMenu] = useState(false);
    const [showStatusPicker, setShowStatusPicker] = useState(false);
    const [showCustomizer, setShowCustomizer] = useState(false);
    const [globalCustomization] = useDocumentCustomization();
    const docCustomization = getEffectiveCustomization(quote, globalCustomization);

    const isAccepted = quote.status === "ACCEPTED";
    const isDraft    = quote.status === "DRAFT";

    const linkedFacture = quote.linkedFacture || (
        quote.number === "D-2026-0002" || quote.number === "D-2026-0001" ? {
            id: quote.id,
            number: `F-2026-000${quote.id}`,
            date: "04/07/26",
            clientName: quote.clientName,
            clientEmail: quote.clientEmail,
            clientAddress: quote.clientAddress,
            subtotalHt: quote.subtotalHt,
            tvaRate: quote.tvaRate,
            tvaAmount: quote.tvaAmount,
            totalTtc: quote.totalTtc,
            status: quote.number === "D-2026-0001" ? "paid" : "pending",
            statusLabel: quote.number === "D-2026-0001" ? "Payée" : "Finalisé"
        } : null
    );

    const amountFactured = quote.amountFactured || 0;
    const progressPct = quote.totalTtc > 0
        ? Math.min(100, (amountFactured / quote.totalTtc) * 100)
        : 0;

    React.useEffect(() => {
        window.history.pushState({ quoteDetail: true }, "");
        const handlePopState = () => {
            if (showStatusPicker) {
                setShowStatusPicker(false);
                return;
            }
            onClose();
        };
        window.addEventListener("popstate", handlePopState);
        return () => {
            window.removeEventListener("popstate", handlePopState);
        };
    }, [showStatusPicker]);

    // ── Live mini PDF preview (same style as NewQuoteModal) ──
    const renderPreview = () => (
        <div className="live-preview-a4-wrapper">
            <div
                className="live-preview-a4-sheet"
                style={{
                    backgroundColor: docCustomization.bgColor || '#FFFFFF',
                    color: docCustomization.textColor || '#1A1A1A',
                    fontSize: docCustomization.fontSize || '9pt',
                    fontFamily: docCustomization.fontFamily || 'Inter, sans-serif'
                }}
            >
                {docCustomization.structure === 'banner' && (
                    <div style={{ height: '8px', backgroundColor: docCustomization.primaryColor || '#556B2F', margin: '-24px -20px 14px -20px', borderRadius: '2px 2px 0 0' }} />
                )}

                <div className="pdf-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12pt' }}>
                    <div className="pdf-header-left" style={{ flex: 1 }}>
                        {docCustomization.showLogo && docCustomization.logoPosition !== 'right' && (
                            <div
                                className="pdf-logo-stub"
                                style={{
                                    fontSize: '11pt',
                                    padding: '4pt 8pt',
                                    height: `${docCustomization.logoSize || 45}px`,
                                    minWidth: `${(docCustomization.logoSize || 45) * 1.8}px`,
                                    backgroundColor: docCustomization.primaryColor || '#556B2F',
                                    color: '#FFF',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: '700',
                                    borderRadius: '4px',
                                    marginBottom: '6pt'
                                }}
                            >
                                <span>CLIMPRO</span>
                            </div>
                        )}
                        <h3 className="company-name" style={{ fontSize: '10pt', color: docCustomization.primaryColor || '#556B2F', margin: 0, fontWeight: 700 }}>Dupont Climatisation</h3>
                        <p className="company-details" style={{ fontSize: '8pt', lineHeight: 1.3, margin: '2pt 0 0 0' }}>
                            {docCustomization.showAddress && <span>88 Rue de l'Aviation, 75015 Paris<br /></span>}
                            {docCustomization.showSiret && <span>SIRET : 849 203 103 00021<br /></span>}
                            {docCustomization.showPhone && <span>Tél : 06 51 60 43 16<br /></span>}
                            {docCustomization.showEmail && <span>Email : contact@climpro.fr</span>}
                        </p>
                    </div>
                    <div className="pdf-header-right" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', textAlign: 'right' }}>
                        {docCustomization.showLogo && docCustomization.logoPosition === 'right' && (
                            <div
                                className="pdf-logo-stub"
                                style={{
                                    fontSize: '11pt',
                                    padding: '4pt 8pt',
                                    height: `${docCustomization.logoSize || 45}px`,
                                    minWidth: `${(docCustomization.logoSize || 45) * 1.8}px`,
                                    backgroundColor: docCustomization.primaryColor || '#556B2F',
                                    color: '#FFF',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: '700',
                                    borderRadius: '4px',
                                    marginBottom: '6pt'
                                }}
                            >
                                <span>CLIMPRO</span>
                            </div>
                        )}
                        <h1 className="doc-type-label" style={{ fontSize: '18pt', marginBottom: '4pt', color: docCustomization.primaryColor || '#556B2F', margin: 0, fontWeight: 800 }}>DEVIS</h1>
                        <table className="doc-meta-table" style={{ fontSize: '8pt' }}>
                            <tbody>
                                <tr>
                                    <td><strong>Numéro :</strong></td>
                                    <td>{quote.number}</td>
                                </tr>
                                <tr>
                                    <td><strong>Date :</strong></td>
                                    <td>{new Date(quote.date).toLocaleDateString('fr-FR')}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div
                    className="pdf-billing-section"
                    style={{
                        margin: '10pt 0',
                        padding: '8pt 10pt',
                        backgroundColor: docCustomization.structure === 'modern' ? `${docCustomization.primaryColor || '#556B2F'}10` : '#FAFAF8',
                        borderRadius: '6px'
                    }}
                >
                    <div className="billing-to-card">
                        <span className="section-label" style={{ fontSize: '7.5pt', fontWeight: 700, opacity: 0.6 }}>DEVIS POUR :</span>
                        <h4 className="client-name" style={{ fontSize: '10pt', fontWeight: 700, margin: '2pt 0' }}>{quote.clientName}</h4>
                        <p className="client-details" style={{ fontSize: '8.5pt', opacity: 0.85, margin: 0 }}>
                            {quote.clientAddress || ''}<br />
                            {quote.clientEmail || ''}
                        </p>
                    </div>
                </div>

                {quote.interventionType && (
                    <div className="pdf-intervention-info" style={{ padding: '6pt 8pt', marginBottom: '10pt', fontSize: '8.5pt' }}>
                        <span>Objet : <strong>{quote.interventionType}</strong></span>
                        {quote.workDetails && (
                            <p className="work-details" style={{ fontSize: '8pt', marginTop: '4pt', paddingTop: '4pt' }}>{quote.workDetails}</p>
                        )}
                    </div>
                )}

                <table className="pdf-items-table" style={{ fontSize: '8.5pt', marginBottom: '15pt' }}>
                    <thead style={{ backgroundColor: docCustomization.primaryColor || '#556B2F', color: '#FFFFFF' }}>
                        <tr>
                            <th style={{ textAlign: 'left', padding: '6pt 8pt' }}>Description</th>
                            <th className="text-center" style={{ width: '40px', padding: '6pt', whiteSpace: 'nowrap' }}>Qté</th>
                            <th className="text-right" style={{ minWidth: '75px', padding: '6pt 8pt', whiteSpace: 'nowrap' }}>Unit. HT</th>
                            <th className="text-right" style={{ minWidth: '75px', padding: '6pt 8pt', whiteSpace: 'nowrap' }}>Total HT</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(quote.lines || []).map((line, idx) => (
                            <tr key={idx}>
                                <td>{line.description || '—'}</td>
                                <td className="text-center" style={{ whiteSpace: 'nowrap' }}>{line.qty}</td>
                                <td className="text-right" style={{ whiteSpace: 'nowrap' }}>{(line.unitPrice || 0).toLocaleString('fr-FR')} €</td>
                                <td className="text-right" style={{ whiteSpace: 'nowrap' }}>{((line.unitPrice || 0) * (line.qty || 1)).toLocaleString('fr-FR')} €</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="pdf-summary-block" style={{ marginBottom: '15pt' }}>
                    <table className="pdf-summary-table" style={{ fontSize: '8.5pt', width: 'auto', minWidth: '180pt' }}>
                        <tbody>
                            <tr>
                                <td style={{ whiteSpace: 'nowrap', padding: '3pt 6pt' }}>Sous-total HT :</td>
                                <td style={{ textAlign: 'right', whiteSpace: 'nowrap', padding: '3pt 6pt' }}>{(quote.subtotalHt || 0).toLocaleString('fr-FR')} €</td>
                            </tr>
                            <tr>
                                <td style={{ whiteSpace: 'nowrap', padding: '3pt 6pt' }}>TVA ({quote.tvaRate || 20}%) :</td>
                                <td style={{ textAlign: 'right', whiteSpace: 'nowrap', padding: '3pt 6pt' }}>{(quote.tvaAmount || 0).toLocaleString('fr-FR')} €</td>
                            </tr>
                            <tr className="grand-total-row" style={{ backgroundColor: docCustomization.primaryColor || '#556B2F', color: '#FFFFFF' }}>
                                <td style={{ whiteSpace: 'nowrap', padding: '6pt 8pt' }}><strong>TOTAL TTC :</strong></td>
                                <td style={{ textAlign: 'right', whiteSpace: 'nowrap', padding: '6pt 8pt' }}><strong>{(quote.totalTtc || 0).toLocaleString('fr-FR')} €</strong></td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {docCustomization.showPaymentConditions && (
                    <div className="pdf-footer-section" style={{ fontSize: '7.5pt', paddingTop: '8pt', borderTop: '1px solid #E0E0E0', marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '4pt' }}>
                        <div><strong>Validité du devis :</strong> 30 jours</div>
                        {docCustomization.showIban && <span>IBAN: FR76 3000 6000 0123 4567 8901 234</span>}
                        {docCustomization.showAgaMention && <div style={{ fontStyle: 'italic', marginTop: '2pt' }}>Membre d'une association agréée, le règlement par chèque est accepté.</div>}
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <>
            <div className="dv-drawer-overlay" style={overlayStyle} onClick={onClose}>
                <div className="fp-detail-wide-container" role="dialog" aria-label="Détails du devis" onClick={e => e.stopPropagation()}>
                    {/* LEFT: detail panel */}
                    <aside className="dv-drawer fp-detail-left">

                    {/* Header */}
                    <div className="dv-drawer-header">
                        <span className="dv-drawer-title">Détails du devis</span>
                        <div className="dv-drawer-header-actions">
                            <div style={{ position: "relative" }}>
                                <button
                                    className="dv-icon-btn"
                                    onClick={() => setShowDotsMenu(v => !v)}
                                    aria-label="Options"
                                >
                                    <MoreVertical size={16} />
                                </button>
                                {showDotsMenu && (
                                    <div className="dv-dots-menu" onClick={() => setShowDotsMenu(false)}>
                                        <button className="dv-dots-menu-item" onClick={onSend}>
                                            <Send size={15} /> Envoyer le devis
                                        </button>
                                        <button className="dv-dots-menu-item" onClick={onEdit}>
                                            <Edit2 size={15} /> Modifier le devis
                                        </button>
                                        <button className="dv-dots-menu-item" onClick={() => onConvertToInvoice(quote)}>
                                            <RefreshCw size={15} /> Facturer le devis
                                        </button>
                                        {isAccepted && (
                                            <button className="dv-dots-menu-item" onClick={() => setShowStatusPicker(v => !v)}>
                                                <RefreshCw size={15} /> Changer le statut du devis
                                            </button>
                                        )}
                                        <button className="dv-dots-menu-item" onClick={() => {}}>
                                            <Copy size={15} /> Dupliquer
                                        </button>
                                        <button className="dv-dots-menu-item" onClick={() => { setShowCustomizer(true); setShowDotsMenu(false); }}>
                                            <Palette size={15} /> Personnaliser le document
                                        </button>
                                    </div>
                                )}
                            </div>
                            <button className="dv-icon-btn" onClick={onClose} aria-label="Fermer">
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="dv-drawer-body">
                        {/* Number */}
                        <div className="dv-drawer-doc-id">{quote.number}</div>

                        {/* Status */}
                        <div className="dv-drawer-status-row">
                            <span className={`dv-status-badge ${quote.status}`}>
                                {getStatusLabel(quote.status)}
                            </span>
                        </div>

                        {/* Note for locked status */}
                        {isAccepted && (
                            <div className="dv-accepted-note">
                                Le statut du document ne peut pas être changé car il a déjà été facturé.
                            </div>
                        )}

                        {/* Amount progress */}
                        <div className="dv-amount-progress">
                            {amountFactured.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} € / {quote.totalTtc.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} € facturé
                        </div>
                        <div className="dv-amount-progress-bar">
                            <div className="dv-amount-progress-fill" style={{ width: `${progressPct}%` }} />
                        </div>

                        {/* Preview thumbnail */}
                        <div className="dv-preview-thumbnail" onClick={onPreview} role="button" title="Prévisualiser">
                            <div className="dv-preview-doc-lines">
                                <div className="dv-preview-line" style={{ width: "35%" }} />
                                <div className="dv-preview-line-sm" style={{ width: "65%" }} />
                                <div className="dv-preview-line-sm" style={{ width: "50%" }} />
                                <div style={{ height: "1px", background: "#ccc", margin: "6px 0" }} />
                                <div className="dv-preview-line-sm" style={{ width: "90%" }} />
                                <div className="dv-preview-line-sm" style={{ width: "80%" }} />
                            </div>
                            <button className="dv-preview-btn">Prévisualiser</button>
                        </div>

                        {/* Client */}
                        <div className="dv-drawer-section">
                            <div className="dv-drawer-section-title">Client</div>
                            <div className="dv-drawer-row">
                                <span className="dv-drawer-row-label">Nom du client</span>
                                <span className="dv-drawer-row-value">{quote.clientName}</span>
                            </div>
                        </div>

                        {/* Dates */}
                        <div className="dv-drawer-section">
                            <div className="dv-drawer-section-title">Dates & Exigibilité</div>
                            <div className="dv-drawer-row">
                                <span className="dv-drawer-row-label">Date d'émission</span>
                                <span className="dv-drawer-row-value">
                                    {new Date(quote.date).toLocaleDateString("fr-FR")}
                                </span>
                            </div>
                            <div className="dv-drawer-row">
                                <span className="dv-drawer-row-label">Date d'exigibilité</span>
                                <span className="dv-drawer-row-value">{quote.dueDate ? new Date(quote.dueDate).toLocaleDateString("fr-FR") : new Date(quote.date).toLocaleDateString("fr-FR")}</span>
                            </div>
                            {quote.deliveryDate && (
                                <div className="dv-drawer-row">
                                    <span className="dv-drawer-row-label">Date de livraison</span>
                                    <span className="dv-drawer-row-value">{new Date(quote.deliveryDate).toLocaleDateString("fr-FR")}</span>
                                </div>
                            )}
                            <div className="dv-drawer-row">
                                <span className="dv-drawer-row-label">Conditions de paiement</span>
                                <span className="dv-drawer-row-value">{quote.paymentConditions || "Paiement à 30 jours"}</span>
                            </div>
                        </div>

                        {/* Montant */}
                        <div className="dv-drawer-section">
                            <div className="dv-drawer-section-title">Montant</div>
                            <div className="dv-drawer-row">
                                <span className="dv-drawer-row-label">Montant HT</span>
                                <span className="dv-drawer-row-value" style={{ fontSize: "1.05rem", fontWeight: 700 }}>
                                    {quote.subtotalHt.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €
                                </span>
                            </div>
                        </div>

                        {/* Documents liés */}
                        <div className="dv-drawer-section">
                            <div className="dv-drawer-section-title">Documents liés</div>
                            {linkedFacture ? (
                                <div
                                    className="linked-doc-card"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (onOpenLinkedInvoice) onOpenLinkedInvoice(linkedFacture);
                                    }}
                                    style={{
                                        backgroundColor: "rgba(255, 255, 255, 0.03)",
                                        border: "1px solid var(--border)",
                                        borderRadius: "14px",
                                        padding: "12px 14px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        cursor: "pointer",
                                        transition: "all 0.15s ease",
                                        marginTop: "6px"
                                    }}
                                >
                                    <div>
                                        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "14px", fontWeight: 700, color: "var(--foreground)" }}>
                                            <span>{linkedFacture.number}</span>
                                            <div style={{ width: "16px", height: "16px", borderRadius: "50%", border: "1.5px solid #3b82f6", display: "flex", alignItems: "center", justifyContent: "center", color: "#3b82f6" }}>
                                                <Play size={8} style={{ fill: "currentColor", marginLeft: "1px" }} />
                                            </div>
                                        </div>
                                        <div style={{ fontSize: "11.5px", color: "var(--muted-foreground)", marginTop: "4px" }}>
                                            {linkedFacture.date} · {quote.clientName}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: "right" }}>
                                        <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--foreground)" }}>
                                            {linkedFacture.subtotalHt ? `${linkedFacture.subtotalHt.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} € HT` : `${quote.subtotalHt.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} € HT`}
                                        </div>
                                        <span style={{
                                            display: "inline-block",
                                            marginTop: "4px",
                                            fontSize: "10px",
                                            fontWeight: 700,
                                            padding: "2px 8px",
                                            borderRadius: "6px",
                                            backgroundColor: linkedFacture.status === "paid" ? "rgba(34, 197, 94, 0.12)" : "rgba(59, 130, 246, 0.12)",
                                            color: linkedFacture.status === "paid" ? "#22c55e" : "#3b82f6"
                                        }}>
                                            {linkedFacture.status === "paid" ? "Payée" : (linkedFacture.statusLabel || "Finalisé")}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ fontSize: "12.5px", color: "var(--muted-foreground)", fontStyle: "italic", padding: "4px 0" }}>
                                    Aucun document lié
                                </div>
                            )}
                        </div>

                    </div>

                    {/* Footer */}
                    <div className="dv-drawer-footer">
                        {/* Envoyer le devis */}
                        <button className="dv-drawer-action-primary" onClick={onSend}>
                            Envoyer le devis
                        </button>

                        {/* Changer le statut (uniquement si le devis n'est pas signé) */}
                        {!isAccepted && (
                            <button
                                className="dv-drawer-action-link"
                                onClick={() => setShowStatusPicker(true)}
                            >
                                Changer le statut du devis
                            </button>
                        )}
                    </div>
                    </aside>
                    
                    {/* RIGHT: live preview (desktop only) */}
                    <div className="fp-detail-right">
                        <div className="preview-side-header">
                            <FileText size={14} />
                            <span>Aperçu du devis</span>
                            <button className="personnaliser-btn" onClick={() => setShowCustomizer(true)}>
                                <Palette size={14} />
                                Personnaliser
                            </button>
                        </div>
                        <div className="preview-side-scrollable">
                            {renderPreview()}
                        </div>
                    </div>
                </div>
            </div>

            {showCustomizer && (
                <DocumentCustomizerModal
                    docType="devis"
                    doc={quote}
                    onSaveDocCustomization={(newSettings) => {
                        if (onUpdateQuoteCustomization) {
                            onUpdateQuoteCustomization(quote.id, newSettings);
                        }
                    }}
                    onClose={() => setShowCustomizer(false)}
                />
            )}

            {/* Bottom Sheet overlay for Status Picker */}
            {showStatusPicker && createPortal(
                <div
                    className="fp-status-sheet-overlay"
                    onClick={() => setShowStatusPicker(false)}
                    style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 12000,
                        backgroundColor: "rgba(0, 0, 0, 0.55)",
                        backdropFilter: "blur(3px)",
                        display: "flex",
                        alignItems: "flex-end",
                        justifyContent: "center",
                        padding: 0
                    }}
                >
                    <div
                        className="fp-status-sheet-container"
                        onClick={e => e.stopPropagation()}
                        style={{
                            width: "100%",
                            maxWidth: "500px",
                            backgroundColor: "var(--card)",
                            borderTopLeftRadius: "20px",
                            borderTopRightRadius: "20px",
                            padding: "20px 20px 32px 20px",
                            boxShadow: "0 -8px 32px rgba(0, 0, 0, 0.25)",
                            boxSizing: "border-box",
                            animation: "mobileDrawerSlideUp 0.25s ease-out"
                        }}
                    >
                        <div style={{ width: "36px", height: "4px", borderRadius: "2px", backgroundColor: "var(--border)", margin: "0 auto 16px" }} />
                        
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--foreground)", margin: 0 }}>Changer le statut du devis</h3>
                            <button
                                onClick={() => setShowStatusPicker(false)}
                                style={{ border: "none", background: "none", color: "var(--muted-foreground)", cursor: "pointer", padding: "4px" }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {STATUS_CHOICES.map(s => {
                                const isSelected = quote.status === s.key;
                                return (
                                    <button
                                        key={s.key}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            width: "100%",
                                            padding: "14px 16px",
                                            border: isSelected ? "2px solid #556B2F" : "1px solid var(--border)",
                                            borderRadius: "12px",
                                            background: isSelected ? "rgba(85, 107, 47, 0.08)" : "var(--background)",
                                            cursor: "pointer",
                                            fontFamily: "var(--font-body)",
                                            fontSize: "0.95rem",
                                            fontWeight: isSelected ? 800 : 600,
                                            color: isSelected ? "#556B2F" : "var(--foreground)",
                                            transition: "all 0.15s ease"
                                        }}
                                        onClick={() => {
                                            onChangeStatus(quote, s.key);
                                            setShowStatusPicker(false);
                                        }}
                                    >
                                        <span>{s.label}</span>
                                        {isSelected && <span style={{ color: "#556B2F", fontWeight: 800 }}>✓</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}

export default QuoteDetailDrawer;
