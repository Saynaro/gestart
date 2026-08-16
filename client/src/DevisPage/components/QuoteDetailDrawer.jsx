import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, MoreVertical, Send, Copy, FileText, RefreshCw, Edit2, Play, Palette } from "lucide-react";
import DocumentCustomizerModal from "../../components/DocumentCustomizerModal";
import { useDocumentCustomization, getEffectiveCustomization } from "../../utils/documentCustomization";
import { useUser } from "../../utils/useUser";

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
    const { company } = useUser();
    const [showDotsMenu, setShowDotsMenu] = useState(false);
    const [showStatusPicker, setShowStatusPicker] = useState(false);
    const [showCustomizer, setShowCustomizer] = useState(false);
    const [globalCustomization] = useDocumentCustomization();
    const docCustomization = getEffectiveCustomization(quote, globalCustomization);

    const quoteLines = (quote.lines || []).map(l => ({
        ...l,
        qty: Number(l.quantity || l.qty || 1),
        quantity: Number(l.quantity || l.qty || 1),
        unitPrice: Number(l.unitPrice) || 0,
        total: Number(l.total) || ((Number(l.unitPrice) || 0) * (Number(l.quantity || l.qty) || 1))
    }));
    const computedHtFromLines = quoteLines.reduce((acc, l) => acc + (l.unitPrice * l.qty), 0);
    const subtotalHt = Number(quote.subtotalHt || quote.amountHT || quote.totalHt || computedHtFromLines || 0);
    const tvaRate = Number(quote.tvaRate !== undefined ? quote.tvaRate : 20);
    const totalTtc = Number(quote.totalTtc || quote.amountTTC || (subtotalHt * (1 + tvaRate / 100)) || 0);
    const tvaAmount = Number(quote.tvaAmount || (totalTtc - subtotalHt) || 0);

    const isAccepted = (quote.status || "").toUpperCase() === "ACCEPTED";
    const isDraft    = (quote.status || "").toUpperCase() === "DRAFT";

    const linkedFacture = quote.linkedFacture || (
        quote.number === "D-2026-0002" || quote.number === "D-2026-0001" ? {
            id: quote.id,
            number: `F-2026-000${quote.id}`,
            date: "04/07/26",
            clientName: quote.clientName,
            clientEmail: quote.clientEmail,
            clientAddress: quote.clientAddress,
            subtotalHt: subtotalHt,
            tvaRate: tvaRate,
            tvaAmount: tvaAmount,
            totalTtc: totalTtc,
            status: quote.number === "D-2026-0001" ? "paid" : "pending",
            statusLabel: quote.number === "D-2026-0001" ? "Payée" : "Finalisé"
        } : null
    );

    const amountFactured = quote.amountFactured || 0;
    const progressPct = totalTtc > 0
        ? Math.min(100, (amountFactured / totalTtc) * 100)
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

    const companyDisplayName = company?.name || quote.company?.name || "Mon Entreprise";
    const companyDisplayAddress = company?.address ? `${company.address}${company.postalCode || company.city ? `, ${company.postalCode || ''} ${company.city || ''}` : ''}` : "Adresse non renseignée";
    const companyDisplaySiret = company?.siret || "Non renseigné";
    const companyDisplayPhone = company?.phone || "Non renseigné";
    const companyDisplayEmail = company?.email || "contact@entreprise.fr";
    const companyLogo = docCustomization.logoUrl || company?.logoUrl;
    const companyIban = company?.settings?.bankIban || company?.bankIban || company?.iban || "FR76 3000 6000 0123 4567 8901 234";
    const companySignature = company?.signatureUrl || company?.signature || company?.settings?.signatureUrl || company?.settings?.signature;

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
                            companyLogo ? (
                                <img
                                    src={companyLogo}
                                    alt="Logo"
                                    style={{
                                        maxHeight: `${docCustomization.logoSize || 45}px`,
                                        maxWidth: `${(docCustomization.logoSize || 45) * 2.5}px`,
                                        objectFit: 'contain',
                                        marginBottom: '6pt'
                                    }}
                                />
                            ) : (
                                <div
                                    className="pdf-logo-stub"
                                    style={{
                                        fontSize: '1.1em',
                                        padding: '4px 8px',
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
                                    <span>{companyDisplayName.substring(0, 10).toUpperCase()}</span>
                                </div>
                            )
                        )}
                        <h2 className="company-name" style={{ fontSize: '1.3em', fontWeight: 800, color: docCustomization.primaryColor || '#556B2F', margin: 0 }}>
                            {companyDisplayName}
                        </h2>
                        <p className="company-details" style={{ fontSize: '0.9em', opacity: 0.85, lineHeight: 1.35, marginTop: '2pt' }}>
                            {docCustomization.showAddress && <span>{companyDisplayAddress}<br /></span>}
                            {docCustomization.showSiret && <span>SIRET : {companyDisplaySiret}<br /></span>}
                            {docCustomization.showPhone && <span>Tél : {companyDisplayPhone}<br /></span>}
                            {docCustomization.showEmail && <span>Email : {companyDisplayEmail}</span>}
                        </p>
                    </div>
                    <div className="pdf-header-right" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', textAlign: 'right' }}>
                        {docCustomization.showLogo && docCustomization.logoPosition === 'right' && (
                            companyLogo ? (
                                <img
                                    src={companyLogo}
                                    alt="Logo"
                                    style={{
                                        maxHeight: `${docCustomization.logoSize || 45}px`,
                                        maxWidth: `${(docCustomization.logoSize || 45) * 2.5}px`,
                                        objectFit: 'contain',
                                        marginBottom: '6pt'
                                    }}
                                />
                            ) : (
                                <div
                                    className="pdf-logo-stub"
                                    style={{
                                        fontSize: '1.1em',
                                        padding: '4px 8px',
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
                                    <span>{companyDisplayName.substring(0, 10).toUpperCase()}</span>
                                </div>
                            )
                        )}
                        <h1 className="doc-type-label" style={{ fontSize: '1.8em', marginBottom: '4px', color: docCustomization.primaryColor || '#556B2F', margin: 0, fontWeight: 800 }}>DEVIS</h1>
                        <table className="doc-meta-table" style={{ fontSize: '0.9em' }}>
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
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        gap: '3px',
                        backgroundColor: docCustomization.structure === 'modern' ? `${docCustomization.primaryColor || '#556B2F'}12` : '#FAFAF8',
                        padding: '10px 14px',
                        borderRadius: '6px',
                        marginBottom: '12px',
                        textAlign: 'left'
                    }}
                >
                    <span className="section-label" style={{ fontSize: '0.78em', fontWeight: 700, letterSpacing: '0.5px', opacity: 0.65, textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                        DEVIS POUR :
                    </span>
                    <h3 className="client-name" style={{ fontSize: '1.1em', fontWeight: 700, margin: 0, color: '#1A1A1A', lineHeight: 1.3 }}>
                        {quote.clientName}
                    </h3>
                    {quote.clientAddress && (
                        <div style={{ fontSize: '0.92em', opacity: 0.85, lineHeight: 1.35 }}>
                            {quote.clientAddress}
                        </div>
                    )}
                    {quote.clientEmail && (
                        <div style={{ fontSize: '0.92em', opacity: 0.85, lineHeight: 1.35 }}>
                            {quote.clientEmail}
                        </div>
                    )}
                    {quote.clientPhone && (
                        <div style={{ fontSize: '0.92em', opacity: 0.85, lineHeight: 1.35 }}>
                            {quote.clientPhone}
                        </div>
                    )}
                </div>

                {quote.interventionType && (
                    <div className="pdf-intervention-info" style={{ padding: '6px 10px', marginBottom: '12px', fontSize: '0.95em', backgroundColor: '#FAFAF8', borderRadius: '4px' }}>
                        <span>Objet : <strong>{quote.interventionType}</strong></span>
                        {quote.workDetails && (
                            <p className="work-details" style={{ fontSize: '0.9em', marginTop: '4px', paddingTop: '4px', margin: 0, color: '#666' }}>{quote.workDetails}</p>
                        )}
                    </div>
                )}

                <table className="pdf-items-table" style={{ fontSize: '0.95em', marginBottom: '15px', width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ backgroundColor: docCustomization.primaryColor || '#556B2F', color: '#FFFFFF' }}>
                        <tr>
                            <th style={{ textAlign: 'left', padding: '6px 8px' }}>Description</th>
                            <th className="text-center" style={{ width: '40px', padding: '6px', whiteSpace: 'nowrap' }}>Qté</th>
                            <th className="text-right" style={{ minWidth: '75px', padding: '6px 8px', whiteSpace: 'nowrap' }}>Unit. HT</th>
                            <th className="text-right" style={{ minWidth: '75px', padding: '6px 8px', whiteSpace: 'nowrap' }}>Total HT</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(quote.lines && quote.lines.length > 0) ? (
                            quote.lines.map((line, idx) => {
                                const q = Number(line.quantity || line.qty || 1);
                                const p = Number(line.unitPrice) || 0;
                                return (
                                    <tr key={idx} style={{ borderBottom: '1px solid #EAEAE6' }}>
                                        <td style={{ padding: '6px 8px' }}>
                                            <div style={{ fontWeight: 600 }}>{line.description || 'Prestation'}</div>
                                            {line.reference && <div style={{ fontSize: '0.75em', color: 'var(--muted-foreground)' }}>Réf: {line.reference}</div>}
                                        </td>
                                        <td className="text-center" style={{ padding: '6px', whiteSpace: 'nowrap' }}>{q}</td>
                                        <td className="text-right" style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>{p.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</td>
                                        <td className="text-right" style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>{(p * q).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr style={{ borderBottom: '1px solid #EAEAE6' }}>
                                <td style={{ padding: '6px 8px' }}>{quote.interventionType || quote.subject || "Prestation"}</td>
                                <td className="text-center" style={{ padding: '6px', whiteSpace: 'nowrap' }}>1</td>
                                <td className="text-right" style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>{(Number(quote.subtotalHt) || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</td>
                                <td className="text-right" style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>{(Number(quote.subtotalHt) || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</td>
                            </tr>
                        )}
                    </tbody>
                </table>

                <div className="pdf-summary-block" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '15px' }}>
                    <table className="pdf-summary-table" style={{ fontSize: '0.95em', width: 'auto', minWidth: '180pt' }}>
                        <tbody>
                            <tr>
                                <td style={{ whiteSpace: 'nowrap', padding: '4px 8px' }}>Sous-total HT :</td>
                                <td style={{ textAlign: 'right', whiteSpace: 'nowrap', padding: '4px 8px' }}>{subtotalHt.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</td>
                            </tr>
                            <tr>
                                <td style={{ whiteSpace: 'nowrap', padding: '4px 8px' }}>TVA ({tvaRate}%) :</td>
                                <td style={{ textAlign: 'right', whiteSpace: 'nowrap', padding: '4px 8px' }}>{tvaAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</td>
                            </tr>
                            <tr className="grand-total-row" style={{ backgroundColor: docCustomization.primaryColor || '#556B2F', color: '#FFFFFF', fontWeight: 700 }}>
                                <td style={{ whiteSpace: 'nowrap', padding: '6px 8px', fontSize: '1.05em' }}><strong>TOTAL TTC :</strong></td>
                                <td style={{ textAlign: 'right', whiteSpace: 'nowrap', padding: '6px 8px', fontSize: '1.05em' }}><strong>{totalTtc.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</strong></td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Signatures Section (Company & Buyer) */}
                {(docCustomization.showCompanySignature !== false || docCustomization.showClientSignature !== false) && (() => {
                    const compPos = docCustomization.signaturePosition || "left";
                    const clPos = docCustomization.clientSignaturePosition || "right";

                    const renderCompanySig = () => (
                        <div key="comp-sig" style={{ width: '100%', maxWidth: '230px' }}>
                            <div style={{ fontWeight: '700', marginBottom: '4px', fontSize: '0.9em' }}>Pour l'entreprise :</div>
                            <div
                                style={{
                                    height: '54px',
                                    border: '1px dashed #DDD',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '6px',
                                    backgroundColor: '#FAFAF8',
                                    padding: '4px'
                                }}
                            >
                                {companySignature ? (
                                    <img src={companySignature} alt="Signature Entreprise" style={{ maxHeight: '48px', maxWidth: '90%', objectFit: 'contain' }} />
                                ) : (
                                    <span style={{ color: '#888', fontSize: '0.85em', fontStyle: 'italic' }}>{companyDisplayName}</span>
                                )}
                            </div>
                        </div>
                    );

                    const renderClientSig = () => (
                        <div key="client-sig" style={{ width: '100%', maxWidth: '230px' }}>
                            <div style={{ fontWeight: '700', marginBottom: '4px', fontSize: '0.9em' }}>Bon pour accord / Le Client :</div>
                            <div
                                style={{
                                    height: '54px',
                                    border: '1px dashed #DDD',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '6px',
                                    backgroundColor: quote.status === 'ACCEPTED' ? 'rgba(26, 158, 92, 0.05)' : '#FAFAF8',
                                    padding: '4px',
                                    color: quote.status === 'ACCEPTED' ? '#1A9E5C' : '#888',
                                    fontSize: '0.82em'
                                }}
                            >
                                {quote.clientSignatureUrl ? (
                                    <img src={quote.clientSignatureUrl} alt="Signature Client" style={{ maxHeight: '48px', maxWidth: '90%', objectFit: 'contain' }} />
                                ) : quote.status === 'ACCEPTED' ? (
                                    <>
                                        <span style={{ fontWeight: 'bold' }}>✓ Signé électroniquement</span>
                                        <span style={{ fontSize: '7.5pt', color: '#7C7B82' }}>le {new Date(quote.date).toLocaleDateString('fr-FR')}</span>
                                    </>
                                ) : (
                                    <>
                                        <span style={{ fontStyle: 'italic', fontSize: '0.78em' }}>Mention "Bon pour accord"</span>
                                        <span style={{ fontSize: '0.72em', marginTop: '2px', opacity: 0.8 }}>Date et signature</span>
                                    </>
                                )}
                            </div>
                        </div>
                    );

                    const leftItems = [];
                    const rightItems = [];

                    if (docCustomization.showCompanySignature !== false) {
                        if (compPos === "left") leftItems.push(renderCompanySig());
                        else rightItems.push(renderCompanySig());
                    }

                    if (docCustomization.showClientSignature !== false) {
                        if (clPos === "left") leftItems.push(renderClientSig());
                        else rightItems.push(renderClientSig());
                    }

                    return (
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                gap: '24px',
                                margin: '18px 0',
                                fontSize: '0.85em',
                                borderTop: '1px dashed #E0E0E0',
                                paddingTop: '14px'
                            }}
                        >
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-start', textAlign: 'left' }}>
                                {leftItems}
                            </div>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-end', textAlign: 'right' }}>
                                {rightItems}
                            </div>
                        </div>
                    );
                })()}

                {docCustomization.showPaymentConditions && (
                    <div className="pdf-footer-section" style={{ fontSize: '0.85em', paddingTop: '10px', borderTop: '1px solid #E0E0E0', marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div><strong>Validité du devis :</strong> 30 jours (Date d'expiration : {new Date(new Date(quote.date).setDate(new Date(quote.date).getDate() + 30)).toLocaleDateString('fr-FR')})</div>
                        {docCustomization.showIban && <div><strong>IBAN : </strong>{companyIban}</div>}
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
                                        {!isAccepted && (
                                            <button className="dv-dots-menu-item" onClick={onEdit}>
                                                <Edit2 size={15} /> Modifier le devis
                                            </button>
                                        )}
                                        {!Boolean(linkedFacture || quote.invoiceId || quote.linkedInvoice || (quote.amountFactured && quote.amountFactured > 0)) && (
                                            <button className="dv-dots-menu-item" onClick={() => onConvertToInvoice(quote)}>
                                                <RefreshCw size={15} /> Facturer le devis
                                            </button>
                                        )}
                                        {!isAccepted && (
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
                            <span
                                style={{
                                    fontSize: "0.78rem",
                                    padding: "3px 10px",
                                    borderRadius: "12px",
                                    fontWeight: 700,
                                    backgroundColor: isAccepted
                                        ? "rgba(34, 197, 94, 0.12)"
                                        : isDraft
                                        ? "rgba(156, 163, 175, 0.15)"
                                        : (quote.status || "").toUpperCase() === "SENT"
                                        ? "rgba(59, 130, 246, 0.12)"
                                        : (quote.status || "").toUpperCase() === "REFUSED"
                                        ? "rgba(239, 68, 68, 0.12)"
                                        : "rgba(234, 179, 8, 0.15)",
                                    color: isAccepted
                                        ? "#16a34a"
                                        : isDraft
                                        ? "#6b7280"
                                        : (quote.status || "").toUpperCase() === "SENT"
                                        ? "#2563eb"
                                        : (quote.status || "").toUpperCase() === "REFUSED"
                                        ? "#dc2626"
                                        : "#ca8a04",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "5px"
                                }}
                            >
                                {isAccepted ? "Signé" : isDraft ? "Brouillon" : (quote.status || "").toUpperCase() === "SENT" ? "Envoyé" : (quote.status || "").toUpperCase() === "REFUSED" ? "Refusé" : "En attente"}
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
                            {amountFactured.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} € / {totalTtc.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} € facturé
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
                                    {subtotalHt.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €
                                </span>
                            </div>
                            <div className="dv-drawer-row">
                                <span className="dv-drawer-row-label">Total TTC</span>
                                <span className="dv-drawer-row-value" style={{ fontSize: "1.05rem", fontWeight: 800, color: "#556B2F" }}>
                                    {totalTtc.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €
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
                                            {linkedFacture.createdAt ? new Date(linkedFacture.createdAt).toLocaleDateString("fr-FR") : (linkedFacture.date || "")} · {quote.clientName}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: "right" }}>
                                        <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--foreground)" }}>
                                            {Number(linkedFacture.subtotalHt || linkedFacture.amountHT || quote.subtotalHt || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} € HT
                                        </div>
                                        <span style={{
                                            display: "inline-block",
                                            marginTop: "4px",
                                            fontSize: "10px",
                                            fontWeight: 700,
                                            padding: "2px 8px",
                                            borderRadius: "6px",
                                            backgroundColor: (linkedFacture.status || "").toLowerCase() === "paid" ? "rgba(34, 197, 94, 0.12)" : "rgba(59, 130, 246, 0.12)",
                                            color: (linkedFacture.status || "").toLowerCase() === "paid" ? "#22c55e" : "#3b82f6"
                                        }}>
                                            {(linkedFacture.status || "").toLowerCase() === "paid" ? "Payée" : (linkedFacture.status || "").toLowerCase() === "sent" ? "Envoyée" : (linkedFacture.statusLabel || "Finalisé")}
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
