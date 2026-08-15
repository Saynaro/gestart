import React, { useState, useEffect } from "react";
import { X, MoreVertical, Send, Edit2, CheckCircle, FileText, Copy, RotateCcw, Eye, Palette } from "lucide-react";
import DocumentCustomizerModal from "../../components/DocumentCustomizerModal";
import { useDocumentCustomization, getEffectiveCustomization } from "../../utils/documentCustomization";
import { useUser } from "../../utils/useUser";
import { apiFetch } from "../../utils/api";

function getStatusLabel(status) {
    switch (status) {
        case "draft": return "Brouillon";
        case "pending": return "En attente";
        case "paid": return "Payée";
        case "overdue": return "En retard";
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
    onMarkUnpaid,
    onOpenLinkedDevis,
    onUpdateInvoiceCustomization,
    overlayStyle
}) {
    const { company } = useUser();
    const [showDotsMenu, setShowDotsMenu] = useState(false);
    const [showCustomizer, setShowCustomizer] = useState(false);
    const [globalCustomization] = useDocumentCustomization();
    const docCustomization = getEffectiveCustomization(invoice, globalCustomization);

    const isDraft = invoice.status === "draft";
    const isPaid = invoice.status === "paid";
    const isPending = invoice.status === "pending" || invoice.status === "overdue";

    const linkedDevis = invoice.linkedDevis || (
        invoice.number === "F-2026-0002" || invoice.number === "F-2026-0001" ? {
            id: invoice.id,
            number: `D-2026-000${invoice.id}`,
            date: "04/07/26",
            clientName: invoice.clientName,
            clientEmail: invoice.clientEmail,
            clientAddress: invoice.clientAddress,
            subtotalHt: invoice.subtotalHt,
            tvaRate: invoice.tvaRate,
            tvaAmount: invoice.tvaAmount,
            totalTtc: invoice.totalTtc,
            status: "ACCEPTED",
            statusLabel: "Signé"
        } : null
    );

    React.useEffect(() => {
        window.history.pushState({ invoiceDetail: true }, "");
        const handlePopState = () => {
            onClose();
        };
        window.addEventListener("popstate", handlePopState);
        return () => {
            window.removeEventListener("popstate", handlePopState);
        };
    }, []);

    const dueDate = invoice.dueDate
        ? new Date(invoice.dueDate).toLocaleDateString("fr-FR")
        : new Date(new Date(invoice.date).setDate(new Date(invoice.date).getDate() + (invoice.paymentDelay || 30))).toLocaleDateString("fr-FR");

    const companyDisplayName = company?.name || invoice.company?.name || "Mon Entreprise";
    const companyDisplayAddress = company?.address ? `${company.address}${company.postalCode || company.city ? `, ${company.postalCode || ''} ${company.city || ''}` : ''}` : "Adresse non renseignée";
    const companyDisplaySiret = company?.siret || "Non renseigné";
    const companyDisplayPhone = company?.phone || "Non renseigné";
    const companyDisplayEmail = company?.email || "contact@entreprise.fr";
    const companyLogo = docCustomization.logoUrl || company?.logoUrl;

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
                        <h3 className="company-name" style={{ fontSize: '1.1em', color: docCustomization.primaryColor || '#556B2F', margin: 0, fontWeight: 700 }}>{companyDisplayName}</h3>
                        <p className="company-details" style={{ fontSize: '0.88em', lineHeight: 1.3, margin: '4px 0 0 0' }}>
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
                        <h1 className="doc-type-label" style={{ fontSize: '1.8em', marginBottom: '4px', color: docCustomization.primaryColor || '#556B2F', margin: 0, fontWeight: 800 }}>FACTURE</h1>
                        <table className="doc-meta-table" style={{ fontSize: '0.9em' }}>
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

                <div
                    className="pdf-billing-section"
                    style={{
                        margin: '12px 0',
                        padding: '8px 12px',
                        backgroundColor: docCustomization.structure === 'modern' ? `${docCustomization.primaryColor || '#556B2F'}10` : '#FAFAF8',
                        borderRadius: '6px'
                    }}
                >
                    <div className="billing-to-card">
                        <span className="section-label" style={{ fontSize: '0.8em', fontWeight: 700, opacity: 0.6 }}>FACTURÉ À :</span>
                        <h4 className="client-name" style={{ fontSize: '1.1em', fontWeight: 700, margin: '2px 0' }}>{invoice.clientName}</h4>
                        <p className="client-details" style={{ fontSize: '0.95em', opacity: 0.85, margin: 0 }}>
                            {invoice.clientAddress || ''}<br />
                            {invoice.clientEmail || ''}
                        </p>
                    </div>
                </div>

                {invoice.interventionType && (
                    <div className="pdf-intervention-info" style={{ padding: '6px 10px', marginBottom: '12px', fontSize: '0.95em' }}>
                        <span>Intervention : <strong>{invoice.interventionType}</strong></span>
                        {invoice.workDetails && (
                            <p className="work-details" style={{ fontSize: '0.9em', marginTop: '4px', paddingTop: '4px' }}>{invoice.workDetails}</p>
                        )}
                    </div>
                )}

                <table className="pdf-items-table" style={{ fontSize: '0.95em', marginBottom: '15px' }}>
                    <thead style={{ backgroundColor: docCustomization.primaryColor || '#556B2F', color: '#FFFFFF' }}>
                        <tr>
                            <th style={{ textAlign: 'left', padding: '6px 8px' }}>Description</th>
                            <th className="text-center" style={{ width: '40px', padding: '6px', whiteSpace: 'nowrap' }}>Qté</th>
                            <th className="text-right" style={{ minWidth: '75px', padding: '6px 8px', whiteSpace: 'nowrap' }}>Unit. HT</th>
                            <th className="text-right" style={{ minWidth: '75px', padding: '6px 8px', whiteSpace: 'nowrap' }}>Total HT</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(invoice.lines || []).map((line, idx) => (
                            <tr key={idx}>
                                <td>{line.description || '—'}</td>
                                <td className="text-center" style={{ whiteSpace: 'nowrap' }}>{line.qty}</td>
                                <td className="text-right" style={{ whiteSpace: 'nowrap' }}>{(line.unitPrice || 0).toLocaleString('fr-FR')} €</td>
                                <td className="text-right" style={{ whiteSpace: 'nowrap' }}>{((line.unitPrice || 0) * (line.qty || 1)).toLocaleString('fr-FR')} €</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="pdf-summary-block" style={{ marginBottom: '15px' }}>
                    <table className="pdf-summary-table" style={{ fontSize: '0.95em', width: 'auto', minWidth: '180pt' }}>
                        <tbody>
                            <tr>
                                <td style={{ whiteSpace: 'nowrap', padding: '4px 8px' }}>Sous-total HT :</td>
                                <td style={{ textAlign: 'right', whiteSpace: 'nowrap', padding: '4px 8px' }}>{(invoice.subtotalHt || 0).toLocaleString('fr-FR')} €</td>
                            </tr>
                            <tr>
                                <td style={{ whiteSpace: 'nowrap', padding: '4px 8px' }}>TVA ({invoice.tvaRate || 20}%) :</td>
                                <td style={{ textAlign: 'right', whiteSpace: 'nowrap', padding: '4px 8px' }}>{(invoice.tvaAmount || 0).toLocaleString('fr-FR')} €</td>
                            </tr>
                            <tr className="grand-total-row" style={{ backgroundColor: docCustomization.primaryColor || '#556B2F', color: '#FFFFFF' }}>
                                <td style={{ whiteSpace: 'nowrap', padding: '6px 8px', fontSize: '1.05em' }}><strong>TOTAL TTC :</strong></td>
                                <td style={{ textAlign: 'right', whiteSpace: 'nowrap', padding: '6px 8px', fontSize: '1.05em' }}><strong>{(invoice.totalTtc || 0).toLocaleString('fr-FR')} €</strong></td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {docCustomization.showPaymentConditions && (
                    <div className="pdf-footer-section" style={{ fontSize: '0.85em', paddingTop: '10px', borderTop: '1px solid #E0E0E0', marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div><strong>Conditions de paiement :</strong> Paiement 30 jours (Échéance le {dueDate})</div>
                        {docCustomization.showIban && <span>IBAN: FR76 3000 6000 0123 4567 8901 234</span>}
                        {docCustomization.showAgaMention && <div style={{ fontStyle: 'italic', marginTop: '2pt' }}>Membre d'une association agréée, le règlement par chèque est accepté.</div>}
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <>
            <div className="fp-drawer-overlay" style={overlayStyle} onClick={onClose}>
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
                                                <Send size={15} /> Envoyer la facture
                                            </button>
                                            <button className="fp-dots-menu-item" onClick={onEdit}>
                                                <Edit2 size={15} /> Modifier la facture
                                            </button>
                                            <button className="fp-dots-menu-item" onClick={() => setShowCustomizer(true)}>
                                                <Palette size={15} /> Personnaliser le document
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
                            {/* Preview thumbnail */}
                            <div
                                className="fp-preview-thumbnail"
                                onClick={() => {
                                    if (onPreview) {
                                        onPreview(invoice);
                                    } else {
                                        setShowCustomizer(true);
                                    }
                                }}
                                role="button"
                                title="Prévisualiser la facture"
                                style={{
                                    position: "relative",
                                    height: "80px",
                                    backgroundColor: "var(--muted, #F4F3EF)",
                                    borderRadius: "14px",
                                    border: "1px solid var(--border)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "flex-end",
                                    padding: "16px 20px",
                                    marginBottom: "16px",
                                    cursor: "pointer",
                                    overflow: "hidden"
                                }}
                            >
                                <div className="fp-preview-doc-lines">
                                    <div className="fp-preview-line" style={{ width: "35%", height: "5px", background: "var(--sidebar-primary, #556B2F)", borderRadius: "2px", marginBottom: "4px" }} />
                                    <div className="fp-preview-line-sm" style={{ width: "65%", height: "3px", background: "#7C7B82", borderRadius: "1.5px", marginBottom: "3px" }} />
                                    <div className="fp-preview-line-sm" style={{ width: "50%", height: "3px", background: "#7C7B82", borderRadius: "1.5px", marginBottom: "3px" }} />
                                    <div style={{ height: "1px", background: "#ccc", margin: "4px 0" }} />
                                    <div className="fp-preview-line-sm" style={{ width: "90%", height: "3px", background: "#7C7B82", borderRadius: "1.5px", marginBottom: "3px" }} />
                                    <div className="fp-preview-line-sm" style={{ width: "80%", height: "3px", background: "#7C7B82", borderRadius: "1.5px" }} />
                                </div>
                                <button
                                    className="fp-preview-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (onPreview) {
                                            onPreview(invoice);
                                        } else {
                                            setShowCustomizer(true);
                                        }
                                    }}
                                >
                                    Prévisualiser
                                </button>
                            </div>

                            {/* Client Section */}
                            <div className="fp-drawer-section">
                                <div className="fp-drawer-section-title">Client</div>
                                <div className="fp-drawer-row">
                                    <span className="fp-drawer-row-label">Nom</span>
                                    <span className="fp-drawer-row-value bold">{invoice.clientName}</span>
                                </div>
                                {invoice.clientEmail && (
                                    <div className="fp-drawer-row">
                                        <span className="fp-drawer-row-label">Email</span>
                                        <span className="fp-drawer-row-value">{invoice.clientEmail}</span>
                                    </div>
                                )}
                            </div>

                            {/* Info Section */}
                            <div className="fp-drawer-section">
                                <div className="fp-drawer-section-title">Informations de facturation</div>
                                <div className="fp-drawer-row">
                                    <span className="fp-drawer-row-label">Numéro</span>
                                    <span className="fp-drawer-row-value">{invoice.number}</span>
                                </div>
                                <div className="fp-drawer-row">
                                    <span className="fp-drawer-row-label">Statut</span>
                                    <span className={`fp-status-tag ${invoice.status}`}>{getStatusLabel(invoice.status)}</span>
                                </div>
                                <div className="fp-drawer-row">
                                    <span className="fp-drawer-row-label">Date d'émission</span>
                                    <span className="fp-drawer-row-value">{new Date(invoice.date).toLocaleDateString("fr-FR")}</span>
                                </div>
                                <div className="fp-drawer-row">
                                    <span className="fp-drawer-row-label">Date d'exigibilité</span>
                                    <span className="fp-drawer-row-value">{dueDate}</span>
                                </div>
                                {invoice.subtotalHt != null && (
                                    <div className="fp-drawer-row">
                                        <span className="fp-drawer-row-label">Sous-total HT</span>
                                        <span className="fp-drawer-row-value">{(invoice.subtotalHt || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</span>
                                    </div>
                                )}
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

                            {/* Facturation électronique B2B (Réforme 2026/2027) */}
                            <div className="fp-drawer-section">
                                <div className="fp-drawer-section-title" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                    <span>Facturation électronique B2B</span>
                                    <span style={{
                                        fontSize: "10px",
                                        fontWeight: 800,
                                        padding: "2px 6px",
                                        borderRadius: "6px",
                                        backgroundColor: invoice.einvoicingStatus === "ACCEPTED" ? "rgba(34, 197, 94, 0.15)" : invoice.einvoicingStatus === "SENT" ? "rgba(59, 130, 246, 0.15)" : "rgba(234, 179, 8, 0.15)",
                                        color: invoice.einvoicingStatus === "ACCEPTED" ? "#16a34a" : invoice.einvoicingStatus === "SENT" ? "#2563eb" : "#ca8a04"
                                    }}>
                                        {invoice.einvoicingStatus === "ACCEPTED" ? "🟢 Acceptée" : invoice.einvoicingStatus === "SENT" ? "🔵 Transmise PA" : invoice.einvoicingStatus === "PROCESSING" ? "🟡 En cours" : invoice.einvoicingStatus === "REJECTED" ? "🔴 Rejetée" : "⚪ Non transmise"}
                                    </span>
                                </div>
                                <div style={{ fontSize: "12px", color: "var(--muted-foreground)", marginBottom: "8px" }}>
                                    Format structuré Factur-X / EN 16931 pour acheminement via Plateforme Agréée (B2Brouter).
                                </div>
                                {invoice.einvoicingStatus !== "ACCEPTED" && invoice.einvoicingStatus !== "SENT" && (
                                    <button
                                        type="button"
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            try {
                                                const res = await apiFetch(`/v1/e-invoicing/invoices/${invoice.id}/transmit`, { method: "POST" });
                                                alert(res.message || "Facture transmise avec succès à la Plateforme Agréée !");
                                                if (onClose) onClose();
                                            } catch (err) {
                                                alert(err.message || "Erreur lors de la transmission");
                                            }
                                        }}
                                        style={{
                                            width: "100%",
                                            padding: "9px 12px",
                                            borderRadius: "8px",
                                            border: "1px solid var(--sidebar-primary)",
                                            backgroundColor: "rgba(85, 107, 47, 0.08)",
                                            color: "var(--sidebar-primary)",
                                            fontSize: "12px",
                                            fontWeight: 700,
                                            cursor: "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            gap: "6px"
                                        }}
                                    >
                                        ⚡ Transmettre à la Plateforme Agréée
                                    </button>
                                )}
                            </div>

                            {/* Documents liés */}
                            <div className="fp-drawer-section">
                                <div className="fp-drawer-section-title">Documents liés</div>
                                {linkedDevis ? (
                                    <div
                                        className="linked-doc-card"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (onOpenLinkedDevis) onOpenLinkedDevis(linkedDevis);
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
                                                <span>{linkedDevis.number}</span>
                                                <FileText size={14} style={{ color: "var(--sidebar-primary)" }} />
                                            </div>
                                            <div style={{ fontSize: "11.5px", color: "var(--muted-foreground)", marginTop: "4px" }}>
                                                {linkedDevis.date} · {invoice.clientName}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: "right" }}>
                                            <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--foreground)" }}>
                                                {linkedDevis.subtotalHt ? `${linkedDevis.subtotalHt.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} € HT` : `${invoice.subtotalHt.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} € HT`}
                                            </div>
                                            <span style={{
                                                display: "inline-block",
                                                marginTop: "4px",
                                                fontSize: "10px",
                                                fontWeight: 700,
                                                padding: "2px 8px",
                                                borderRadius: "6px",
                                                backgroundColor: "rgba(34, 197, 94, 0.12)",
                                                color: "#22c55e"
                                            }}>
                                                {linkedDevis.statusLabel || "Signé"}
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
                            <span>Aperçu de la facture</span>
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
                    docType="facture"
                    doc={invoice}
                    onSaveDocCustomization={(newSettings) => {
                        if (onUpdateInvoiceCustomization) {
                            onUpdateInvoiceCustomization(invoice.id, newSettings);
                        }
                    }}
                    onClose={() => setShowCustomizer(false)}
                />
            )}
        </>
    );
}

export default InvoiceDetailDrawer;
