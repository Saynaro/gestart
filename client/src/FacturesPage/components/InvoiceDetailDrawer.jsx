import React, { useState, useEffect } from "react";
import { X, MoreVertical, Send, Edit2, CheckCircle, FileText, Copy, RotateCcw, Eye, Palette, Lock, Trash2, Clock, Check } from "lucide-react";
import DocumentCustomizerModal from "../../components/DocumentCustomizerModal";
import { useDocumentCustomization, getEffectiveCustomization } from "../../utils/documentCustomization";
import { useUser } from "../../utils/useUser";
import { apiFetch } from "../../utils/api";

function getStatusLabel(status) {
    const s = (status || "").toLowerCase();
    switch (s) {
        case "draft": return "Brouillon";
        case "sent":
        case "pending": return "En attente";
        case "paid": return "Payée";
        case "overdue": return "En retard";
        case "finalised": return "Finalisé";
        default: return status || "Brouillon";
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
    onDelete,
    onOpenLinkedDevis,
    onUpdateInvoiceCustomization,
    overlayStyle
}) {
    const { company } = useUser();
    const [showDotsMenu, setShowDotsMenu] = useState(false);
    const [showCustomizer, setShowCustomizer] = useState(false);
    const [globalCustomization] = useDocumentCustomization();
    const docCustomization = getEffectiveCustomization(invoice, globalCustomization);
    const client = invoice.client || {};
    const clientDisplayName = client.companyName || `${client.firstName || ''} ${client.lastName || ''}`.trim() || invoice.clientName || "Client";
    const clientDisplayAddress = client.address || invoice.clientAddress || (client.city ? `${client.postalCode || ''} ${client.city}` : "");
    const clientDisplayEmail = client.email || invoice.clientEmail || "";
    const clientDisplayPhone = client.phone || invoice.clientPhone || "";

    const invoiceLines = (invoice.lines || []).map(l => ({
        ...l,
        qty: Number(l.quantity || l.qty || 1),
        quantity: Number(l.quantity || l.qty || 1),
        unitPrice: Number(l.unitPrice) || 0,
        tvaRate: l.tvaRate !== undefined && l.tvaRate !== null ? Number(l.tvaRate) : (invoice.tvaRate !== undefined && invoice.tvaRate !== null ? Number(invoice.tvaRate) : 20),
        total: Number(l.total) || ((Number(l.unitPrice) || 0) * (Number(l.quantity || l.qty) || 1))
    }));
    const computedHtFromLines = invoiceLines.reduce((acc, l) => acc + (l.unitPrice * l.qty), 0);
    const subtotalHt = Number(invoice.subtotalHt || invoice.amountHT || invoice.totalHt || computedHtFromLines || 0);
    const tvaRate = Number(invoice.tvaRate !== undefined && invoice.tvaRate !== null ? invoice.tvaRate : (invoiceLines[0]?.tvaRate !== undefined ? invoiceLines[0].tvaRate : 20));
    const computedTvaFromLines = invoiceLines.reduce((acc, l) => acc + (l.unitPrice * l.qty * ((l.tvaRate !== undefined ? l.tvaRate : tvaRate) / 100)), 0);
    const totalTtc = Number(invoice.totalTtc || invoice.amountTTC || (subtotalHt + computedTvaFromLines) || 0);
    const tvaAmount = Number(invoice.tvaAmount !== undefined && invoice.tvaAmount !== null ? invoice.tvaAmount : (totalTtc - subtotalHt));

    const isDraft = (invoice.status || "").toUpperCase() === "DRAFT";
    const isPaid = (invoice.status || "").toUpperCase() === "PAID";
    const isPending = (invoice.status || "").toUpperCase() === "SENT" || (invoice.status || "").toUpperCase() === "FINALIZED" || (invoice.status || "").toUpperCase() === "OVERDUE" || (invoice.status || "").toUpperCase() === "PENDING";

    const linkedDevis = invoice.linkedDevis || invoice.linkedQuote || invoice.sourceQuote;

    const rawDocDate = invoice.issuedAt || invoice.date || invoice.createdAt;
    const formattedDocDate = rawDocDate ? new Date(rawDocDate).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR');
    
    const rawDueDate = invoice.dueAt || invoice.dueDate || (rawDocDate ? new Date(new Date(rawDocDate).getTime() + (invoice.paymentDelay || 30) * 86400000) : null);
    const dueDate = rawDueDate ? new Date(rawDueDate).toLocaleDateString("fr-FR") : formattedDocDate;

    // Relance automatique calculation
    const reminderEnabled = !invoice.reminderDisabled && (company?.settings?.invoiceReminderEnabled !== false);
    const reminderDelayDays = invoice.customReminderDays || company?.settings?.invoiceReminderDays || 7;

    let reminderBadge = null;
    if (invoice.reminder1SentAt) {
        const sentDateStr = new Date(invoice.reminder1SentAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        reminderBadge = {
            label: `Relance envoyée le ${sentDateStr}`,
            type: 'sent'
        };
    } else if (!isPaid && !isDraft && reminderEnabled && invoice.emailSentAt) {
        const sentTime = new Date(invoice.emailSentAt).getTime();
        const targetTime = sentTime + reminderDelayDays * 24 * 60 * 60 * 1000;
        const diffMs = targetTime - Date.now();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        const targetDateStr = new Date(targetTime).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });

        const hasRecipientEmail = Boolean(invoice.emailSentTo || invoice.client?.email);

        if (!hasRecipientEmail) {
            reminderBadge = {
                label: "Non programmée (aucun email client)",
                type: "neutral"
            };
        } else if (diffDays > 0) {
            reminderBadge = {
                label: `Relance dans ${diffDays} jour${diffDays > 1 ? 's' : ''} (le ${targetDateStr})`,
                type: 'pending'
            };
        } else if (diffDays === 0) {
            reminderBadge = {
                label: "Relance prévue aujourd'hui",
                type: 'imminent'
            };
        } else {
            // Délai dépassé, en attente du cycle automatique
            reminderBadge = {
                label: "En attente d'envoi automatique",
                type: 'imminent'
            };
        }
    }

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

    const companyDisplayName = company?.name || invoice.company?.name || "Mon Entreprise";
    const companyDisplayAddress = company?.address ? `${company.address}${company.postalCode || company.city ? `, ${company.postalCode || ''} ${company.city || ''}` : ''}` : "Adresse non renseignée";
    const companyDisplaySiret = company?.siret || "Non renseigné";
    const companyDisplayPhone = company?.phone || "Non renseigné";
    const companyDisplayEmail = company?.email || "contact@entreprise.fr";
    const companyLogo = docCustomization.logoUrl || company?.logoUrl;
    const companyIban = company?.settings?.bankIban || company?.bankIban || company?.iban || invoice.company?.settings?.bankIban || invoice.company?.bankIban || "";
    const companySignature = company?.signatureUrl || company?.signature || company?.settings?.signatureUrl || company?.settings?.signature;

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

                {/* ==================== STRUCTURE 1: BANNER ==================== */}
                {docCustomization.structure === "banner" && (
                    <div style={{ marginBottom: "14px" }}>
                        <div
                            style={{
                                backgroundColor: docCustomization.primaryColor || "#556B2F",
                                color: "#FFFFFF",
                                padding: "14px 16px",
                                margin: "-20px -18px 12px -18px",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center"
                            }}
                        >
                            {docCustomization.logoPosition !== "right" ? (
                                <>
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                        {docCustomization.showLogo && (
                                            companyLogo ? (
                                                <img
                                                    src={companyLogo}
                                                    alt="Logo"
                                                    style={{
                                                        maxHeight: `${docCustomization.logoSize || 40}px`,
                                                        maxWidth: "120px",
                                                        objectFit: "contain",
                                                        background: "rgba(255,255,255,0.2)",
                                                        padding: "2px 4px",
                                                        borderRadius: "4px"
                                                    }}
                                                />
                                            ) : (
                                                <div
                                                    style={{
                                                        backgroundColor: "rgba(255,255,255,0.2)",
                                                        color: "#FFFFFF",
                                                        fontWeight: 800,
                                                        borderRadius: "4px",
                                                        padding: "4px 6px",
                                                        fontSize: "0.95em"
                                                    }}
                                                >
                                                    {companyDisplayName.substring(0, 8).toUpperCase()}
                                                </div>
                                            )
                                        )}
                                        <div>
                                            <h3 style={{ fontSize: "1.15em", fontWeight: 800, color: "#FFFFFF", margin: 0 }}>
                                                {companyDisplayName}
                                            </h3>
                                        </div>
                                    </div>

                                    <div style={{ textAlign: "right" }}>
                                        <h1 style={{ fontSize: "1.4em", fontWeight: 800, color: "#FFFFFF", margin: 0, letterSpacing: "1.5px" }}>
                                            FACTURE
                                        </h1>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <h1 style={{ fontSize: "1.4em", fontWeight: 800, color: "#FFFFFF", margin: 0, letterSpacing: "1.5px" }}>
                                            FACTURE
                                        </h1>
                                    </div>

                                    <div style={{ display: "flex", alignItems: "center", gap: "10px", textAlign: "right" }}>
                                        <div>
                                            <h3 style={{ fontSize: "1.15em", fontWeight: 800, color: "#FFFFFF", margin: 0 }}>
                                                {companyDisplayName}
                                            </h3>
                                        </div>
                                        {docCustomization.showLogo && (
                                            companyLogo ? (
                                                <img
                                                    src={companyLogo}
                                                    alt="Logo"
                                                    style={{
                                                        maxHeight: `${docCustomization.logoSize || 40}px`,
                                                        maxWidth: "120px",
                                                        objectFit: "contain",
                                                        background: "rgba(255,255,255,0.2)",
                                                        padding: "2px 4px",
                                                        borderRadius: "4px"
                                                    }}
                                                />
                                            ) : (
                                                <div
                                                    style={{
                                                        backgroundColor: "rgba(255,255,255,0.2)",
                                                        color: "#FFFFFF",
                                                        fontWeight: 800,
                                                        borderRadius: "4px",
                                                        padding: "4px 6px",
                                                        fontSize: "0.95em"
                                                    }}
                                                >
                                                    {companyDisplayName.substring(0, 8).toUpperCase()}
                                                </div>
                                            )
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                backgroundColor: "#F4F4F2",
                                padding: "6px 10px",
                                borderRadius: "4px",
                                fontSize: "0.82em",
                                marginBottom: "10px",
                                color: "#4A4A4A"
                            }}
                        >
                            <div><strong>Numéro : </strong> {invoice.number}</div>
                            <div><strong>Date : </strong> {formattedDocDate}</div>
                            <div><strong>Échéance : </strong> {dueDate}</div>
                        </div>

                        {docCustomization.clientBoxPosition === "right" ? (
                            <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", marginBottom: "12px" }}>
                                <div style={{ flex: 1, fontSize: "0.85em", lineHeight: 1.35, opacity: 0.85 }}>
                                    {docCustomization.showAddress && <div>{companyDisplayAddress}</div>}
                                    {docCustomization.showSiret && <div>SIRET : {companyDisplaySiret}</div>}
                                    {docCustomization.showPhone && <div>Tél : {companyDisplayPhone}</div>}
                                    {docCustomization.showEmail && <div>Email : {companyDisplayEmail}</div>}
                                </div>
                                <div
                                    style={{
                                        flex: 1,
                                        backgroundColor: "#FAFAF8",
                                        border: "1px solid #EAEAE6",
                                        padding: "8px 12px",
                                        borderRadius: "6px"
                                    }}
                                >
                                    <span style={{ fontSize: "0.75em", fontWeight: 700, opacity: 0.65, letterSpacing: "0.5px", textTransform: "uppercase", display: "block", marginBottom: "2px" }}>
                                        FACTURÉ À :
                                    </span>
                                    <div style={{ fontWeight: 700, fontSize: "0.98em", color: "#1A1A1A" }}>{clientDisplayName}</div>
                                    {clientDisplayAddress && <div style={{ fontSize: "0.85em", opacity: 0.85 }}>{clientDisplayAddress}</div>}
                                    {clientDisplayEmail && <div style={{ fontSize: "0.85em", opacity: 0.85 }}>{clientDisplayEmail}</div>}
                                    {clientDisplayPhone && <div style={{ fontSize: "0.85em", opacity: 0.85 }}>{clientDisplayPhone}</div>}
                                </div>
                            </div>
                        ) : (
                            <div style={{ marginBottom: "12px" }}>
                                <div style={{ fontSize: "0.85em", lineHeight: 1.35, opacity: 0.85, marginBottom: "8px" }}>
                                    {docCustomization.showAddress && <div>{companyDisplayAddress}</div>}
                                    {docCustomization.showSiret && <div>SIRET : {companyDisplaySiret}</div>}
                                    {docCustomization.showPhone && <div>Tél : {companyDisplayPhone}</div>}
                                    {docCustomization.showEmail && <div>Email : {companyDisplayEmail}</div>}
                                </div>
                                <div
                                    style={{
                                        backgroundColor: "#FAFAF8",
                                        border: "1px solid #EAEAE6",
                                        padding: "8px 12px",
                                        borderRadius: "6px"
                                    }}
                                >
                                    <span style={{ fontSize: "0.75em", fontWeight: 700, opacity: 0.65, letterSpacing: "0.5px", textTransform: "uppercase", display: "block", marginBottom: "2px" }}>
                                        FACTURÉ À :
                                    </span>
                                    <div style={{ fontWeight: 700, fontSize: "0.98em", color: "#1A1A1A" }}>{clientDisplayName}</div>
                                    {clientDisplayAddress && <div style={{ fontSize: "0.85em", opacity: 0.85 }}>{clientDisplayAddress}</div>}
                                    {clientDisplayEmail && <div style={{ fontSize: "0.85em", opacity: 0.85 }}>{clientDisplayEmail}</div>}
                                    {clientDisplayPhone && <div style={{ fontSize: "0.85em", opacity: 0.85 }}>{clientDisplayPhone}</div>}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ==================== STRUCTURE 2: MODERN ==================== */}
                {docCustomization.structure === "modern" && (
                    <div style={{ marginBottom: "14px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                            {docCustomization.logoPosition !== "right" ? (
                                <>
                                    <div>
                                        {docCustomization.showLogo && (
                                            companyLogo ? (
                                                <img
                                                    src={companyLogo}
                                                    alt="Logo"
                                                    style={{
                                                        maxHeight: `${docCustomization.logoSize || 40}px`,
                                                        maxWidth: "140px",
                                                        objectFit: "contain",
                                                        marginBottom: "4pt"
                                                    }}
                                                />
                                            ) : (
                                                <div
                                                    style={{
                                                        backgroundColor: docCustomization.primaryColor || "#556B2F",
                                                        color: "#FFF",
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        fontWeight: 700,
                                                        borderRadius: "6px",
                                                        padding: "4px 8px",
                                                        height: `${docCustomization.logoSize || 40}px`,
                                                        minWidth: `${(docCustomization.logoSize || 40) * 1.8}px`,
                                                        marginBottom: "4pt",
                                                        fontSize: "0.95em"
                                                    }}
                                                >
                                                    {companyDisplayName.substring(0, 8).toUpperCase()}
                                                </div>
                                            )
                                        )}
                                        <h3 style={{ fontSize: "1.15em", fontWeight: 800, color: docCustomization.primaryColor || "#556B2F", margin: 0 }}>
                                            {companyDisplayName}
                                        </h3>
                                    </div>

                                    <div style={{ textAlign: "right" }}>
                                        <div>
                                            <div
                                                style={{
                                                    display: "inline-block",
                                                    backgroundColor: docCustomization.primaryColor || "#556B2F",
                                                    color: "#FFFFFF",
                                                    padding: "4px 12px",
                                                    borderRadius: "16px",
                                                    fontWeight: 800,
                                                    fontSize: "0.9em",
                                                    letterSpacing: "0.5px",
                                                    marginBottom: "4px"
                                                }}
                                            >
                                                FACTURE N° {invoice.number}
                                            </div>
                                            <div style={{ fontSize: "0.8em", opacity: 0.85 }}>
                                                Date : <strong>{formattedDocDate}</strong> • Échéance : <strong>{dueDate}</strong>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div style={{ textAlign: "left" }}>
                                        <div>
                                            <div
                                                style={{
                                                    display: "inline-block",
                                                    backgroundColor: docCustomization.primaryColor || "#556B2F",
                                                    color: "#FFFFFF",
                                                    padding: "4px 12px",
                                                    borderRadius: "16px",
                                                    fontWeight: 800,
                                                    fontSize: "0.9em",
                                                    letterSpacing: "0.5px",
                                                    marginBottom: "4px"
                                                }}
                                            >
                                                FACTURE N° {invoice.number}
                                            </div>
                                            <div style={{ fontSize: "0.8em", opacity: 0.85 }}>
                                                Date : <strong>{formattedDocDate}</strong> • Échéance : <strong>{dueDate}</strong>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", textAlign: "right" }}>
                                        {docCustomization.showLogo && (
                                            companyLogo ? (
                                                <img
                                                    src={companyLogo}
                                                    alt="Logo"
                                                    style={{
                                                        maxHeight: `${docCustomization.logoSize || 40}px`,
                                                        maxWidth: "140px",
                                                        objectFit: "contain",
                                                        marginBottom: "4pt"
                                                    }}
                                                />
                                            ) : (
                                                <div
                                                    style={{
                                                        backgroundColor: docCustomization.primaryColor || "#556B2F",
                                                        color: "#FFF",
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        fontWeight: 700,
                                                        borderRadius: "6px",
                                                        padding: "4px 8px",
                                                        height: `${docCustomization.logoSize || 40}px`,
                                                        minWidth: `${(docCustomization.logoSize || 40) * 1.8}px`,
                                                        marginBottom: "4pt",
                                                        fontSize: "0.95em"
                                                    }}
                                                >
                                                    {companyDisplayName.substring(0, 8).toUpperCase()}
                                                </div>
                                            )
                                        )}
                                        <h3 style={{ fontSize: "1.15em", fontWeight: 800, color: docCustomization.primaryColor || "#556B2F", margin: 0 }}>
                                            {companyDisplayName}
                                        </h3>
                                    </div>
                                </>
                            )}
                        </div>

                        {docCustomization.clientBoxPosition === "right" ? (
                            <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
                                <div
                                    style={{
                                        flex: 1,
                                        backgroundColor: "#FAFAF8",
                                        borderLeft: `4px solid ${docCustomization.primaryColor || "#556B2F"}`,
                                        padding: "8px 12px",
                                        borderRadius: "6px",
                                        fontSize: "0.85em",
                                        lineHeight: 1.35
                                    }}
                                >
                                    <span style={{ fontSize: "0.75em", fontWeight: 700, color: docCustomization.primaryColor || "#556B2F", textTransform: "uppercase", display: "block", marginBottom: "2px" }}>
                                        Émetteur
                                    </span>
                                    <div style={{ fontWeight: 700, color: "#1A1A1A" }}>{companyDisplayName}</div>
                                    {docCustomization.showAddress && <div>{companyDisplayAddress}</div>}
                                    {docCustomization.showSiret && <div>SIRET : {companyDisplaySiret}</div>}
                                    {docCustomization.showPhone && <div>Tél : {companyDisplayPhone}</div>}
                                    {docCustomization.showEmail && <div>Email : {companyDisplayEmail}</div>}
                                </div>

                                <div
                                    style={{
                                        flex: 1,
                                        backgroundColor: `${docCustomization.primaryColor || "#556B2F"}10`,
                                        border: `1px solid ${docCustomization.primaryColor || "#556B2F"}30`,
                                        padding: "8px 12px",
                                        borderRadius: "6px",
                                        fontSize: "0.85em",
                                        lineHeight: 1.35
                                    }}
                                >
                                    <span style={{ fontSize: "0.75em", fontWeight: 700, color: docCustomization.primaryColor || "#556B2F", textTransform: "uppercase", display: "block", marginBottom: "2px" }}>
                                        FACTURÉ À :
                                    </span>
                                    <div style={{ fontWeight: 700, fontSize: "0.98em", color: "#1A1A1A" }}>{clientDisplayName}</div>
                                    {clientDisplayAddress && <div>{clientDisplayAddress}</div>}
                                    {clientDisplayEmail && <div>{clientDisplayEmail}</div>}
                                    {clientDisplayPhone && <div>{clientDisplayPhone}</div>}
                                </div>
                            </div>
                        ) : (
                            <div style={{ marginBottom: "12px" }}>
                                <div
                                    style={{
                                        backgroundColor: "#FAFAF8",
                                        borderLeft: `4px solid ${docCustomization.primaryColor || "#556B2F"}`,
                                        padding: "8px 12px",
                                        borderRadius: "6px",
                                        fontSize: "0.85em",
                                        lineHeight: 1.35,
                                        marginBottom: "8px"
                                    }}
                                >
                                    <span style={{ fontSize: "0.75em", fontWeight: 700, color: docCustomization.primaryColor || "#556B2F", textTransform: "uppercase", display: "block", marginBottom: "2px" }}>
                                        Émetteur
                                    </span>
                                    <div style={{ fontWeight: 700, color: "#1A1A1A" }}>{companyDisplayName}</div>
                                    {docCustomization.showAddress && <div>{companyDisplayAddress}</div>}
                                    {docCustomization.showSiret && <div>SIRET : {companyDisplaySiret}</div>}
                                    {docCustomization.showPhone && <div>Tél : {companyDisplayPhone}</div>}
                                    {docCustomization.showEmail && <div>Email : {companyDisplayEmail}</div>}
                                </div>

                                <div
                                    style={{
                                        backgroundColor: `${docCustomization.primaryColor || "#556B2F"}10`,
                                        border: `1px solid ${docCustomization.primaryColor || "#556B2F"}30`,
                                        padding: "8px 12px",
                                        borderRadius: "6px",
                                        fontSize: "0.85em",
                                        lineHeight: 1.35
                                    }}
                                >
                                    <span style={{ fontSize: "0.75em", fontWeight: 700, color: docCustomization.primaryColor || "#556B2F", textTransform: "uppercase", display: "block", marginBottom: "2px" }}>
                                        FACTURÉ À :
                                    </span>
                                    <div style={{ fontWeight: 700, fontSize: "0.98em", color: "#1A1A1A" }}>{clientDisplayName}</div>
                                    {clientDisplayAddress && <div>{clientDisplayAddress}</div>}
                                    {clientDisplayEmail && <div>{clientDisplayEmail}</div>}
                                    {clientDisplayPhone && <div>{clientDisplayPhone}</div>}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ==================== STRUCTURE 3: MINIMAL ==================== */}
                {docCustomization.structure === "minimal" && (
                    <div style={{ marginBottom: "14px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", paddingBottom: "8px", borderBottom: `1.5px solid #EAEAE6`, marginBottom: "12px" }}>
                            {docCustomization.logoPosition !== "right" ? (
                                <>
                                    <div>
                                        {docCustomization.showLogo && (
                                            companyLogo ? (
                                                <img
                                                    src={companyLogo}
                                                    alt="Logo"
                                                    style={{
                                                        maxHeight: `${docCustomization.logoSize || 36}px`,
                                                        maxWidth: "130px",
                                                        objectFit: "contain",
                                                        marginBottom: "4pt"
                                                    }}
                                                />
                                            ) : null
                                        )}
                                        <h3 style={{ fontSize: "1.15em", fontWeight: 800, color: docCustomization.primaryColor || "#556B2F", margin: 0 }}>
                                            {companyDisplayName}
                                        </h3>
                                    </div>

                                    <div style={{ textAlign: "right" }}>
                                        <h1 style={{ fontSize: "1.6em", fontWeight: 300, color: docCustomization.primaryColor || "#556B2F", margin: 0, letterSpacing: "2px" }}>
                                            FACTURE
                                        </h1>
                                        <div style={{ fontSize: "0.8em", color: "#666", marginTop: "2px" }}>
                                            N° {invoice.number} • {formattedDocDate}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div style={{ textAlign: "left" }}>
                                        <h1 style={{ fontSize: "1.6em", fontWeight: 300, color: docCustomization.primaryColor || "#556B2F", margin: 0, letterSpacing: "2px" }}>
                                            FACTURE
                                        </h1>
                                        <div style={{ fontSize: "0.8em", color: "#666", marginTop: "2px" }}>
                                            N° {invoice.number} • {formattedDocDate}
                                        </div>
                                    </div>

                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", textAlign: "right" }}>
                                        {docCustomization.showLogo && (
                                            companyLogo ? (
                                                <img
                                                    src={companyLogo}
                                                    alt="Logo"
                                                    style={{
                                                        maxHeight: `${docCustomization.logoSize || 36}px`,
                                                        maxWidth: "130px",
                                                        objectFit: "contain",
                                                        marginBottom: "4pt"
                                                    }}
                                                />
                                            ) : null
                                        )}
                                        <h3 style={{ fontSize: "1.15em", fontWeight: 800, color: docCustomization.primaryColor || "#556B2F", margin: 0 }}>
                                            {companyDisplayName}
                                        </h3>
                                    </div>
                                </>
                            )}
                        </div>

                        {docCustomization.clientBoxPosition === "right" ? (
                            <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", marginBottom: "12px" }}>
                                <div style={{ flex: 1, fontSize: "0.82em", lineHeight: 1.35, color: "#4A4A4A" }}>
                                    {docCustomization.showAddress && <div>{companyDisplayAddress}</div>}
                                    {docCustomization.showSiret && <div>SIRET : {companyDisplaySiret}</div>}
                                    {docCustomization.showPhone && <div>Tél : {companyDisplayPhone}</div>}
                                    {docCustomization.showEmail && <div>Email : {companyDisplayEmail}</div>}
                                </div>

                                <div style={{ flex: 1, fontSize: "0.82em", lineHeight: 1.35 }}>
                                    <span style={{ fontSize: "0.75em", fontWeight: 700, color: docCustomization.primaryColor || "#556B2F", letterSpacing: "1px", textTransform: "uppercase", display: "block", marginBottom: "2px" }}>
                                        FACTURÉ À :
                                    </span>
                                    <div style={{ fontWeight: 700, fontSize: "0.98em", color: "#1A1A1A" }}>{clientDisplayName}</div>
                                    {clientDisplayAddress && <div style={{ color: "#4A4A4A" }}>{clientDisplayAddress}</div>}
                                    {clientDisplayEmail && <div style={{ color: "#4A4A4A" }}>{clientDisplayEmail}</div>}
                                    {clientDisplayPhone && <div style={{ color: "#4A4A4A" }}>{clientDisplayPhone}</div>}
                                </div>
                            </div>
                        ) : (
                            <div style={{ marginBottom: "12px" }}>
                                <div style={{ fontSize: "0.82em", lineHeight: 1.35, color: "#4A4A4A", marginBottom: "8px" }}>
                                    {docCustomization.showAddress && <div>{companyDisplayAddress}</div>}
                                    {docCustomization.showSiret && <div>SIRET : {companyDisplaySiret}</div>}
                                    {docCustomization.showPhone && <div>Tél : {companyDisplayPhone}</div>}
                                    {docCustomization.showEmail && <div>Email : {companyDisplayEmail}</div>}
                                </div>

                                <div style={{ borderTop: "1px dashed #E0E0E0", paddingTop: "6px", fontSize: "0.82em", lineHeight: 1.35 }}>
                                    <span style={{ fontSize: "0.75em", fontWeight: 700, color: docCustomization.primaryColor || "#556B2F", letterSpacing: "1px", textTransform: "uppercase", display: "block", marginBottom: "2px" }}>
                                        FACTURÉ À :
                                    </span>
                                    <div style={{ fontWeight: 700, fontSize: "0.98em", color: "#1A1A1A" }}>{clientDisplayName}</div>
                                    {clientDisplayAddress && <div style={{ color: "#4A4A4A" }}>{clientDisplayAddress}</div>}
                                    {clientDisplayEmail && <div style={{ color: "#4A4A4A" }}>{clientDisplayEmail}</div>}
                                    {clientDisplayPhone && <div style={{ color: "#4A4A4A" }}>{clientDisplayPhone}</div>}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ==================== STRUCTURE 4: CLASSIC (DEFAULT) ==================== */}
                {(docCustomization.structure === "classic" || !docCustomization.structure) && (
                    <div style={{ marginBottom: "12px" }}>
                        <div className="pdf-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12pt' }}>
                            {docCustomization.logoPosition !== 'right' ? (
                                <>
                                    <div className="pdf-header-left" style={{ flex: 1 }}>
                                        {docCustomization.showLogo && (
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
                                        <h1 className="doc-type-label" style={{ fontSize: '1.8em', marginBottom: '4px', color: docCustomization.primaryColor || '#556B2F', margin: 0, fontWeight: 800 }}>FACTURE</h1>
                                        <table className="doc-meta-table" style={{ fontSize: '0.9em' }}>
                                            <tbody>
                                                <tr>
                                                    <td><strong>Numéro :</strong></td>
                                                    <td>{invoice.number}</td>
                                                </tr>
                                                <tr>
                                                    <td><strong>Date :</strong></td>
                                                    <td>{formattedDocDate}</td>
                                                </tr>
                                                <tr>
                                                    <td><strong>Échéance :</strong></td>
                                                    <td>{dueDate}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="pdf-header-right" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
                                        <h1 className="doc-type-label" style={{ fontSize: '1.8em', marginBottom: '4px', color: docCustomization.primaryColor || '#556B2F', margin: 0, fontWeight: 800 }}>FACTURE</h1>
                                        <table className="doc-meta-table" style={{ fontSize: '0.9em' }}>
                                            <tbody>
                                                <tr>
                                                    <td><strong>Numéro :</strong></td>
                                                    <td>{invoice.number}</td>
                                                </tr>
                                                <tr>
                                                    <td><strong>Date :</strong></td>
                                                    <td>{formattedDocDate}</td>
                                                </tr>
                                                <tr>
                                                    <td><strong>Échéance :</strong></td>
                                                    <td>{dueDate}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="pdf-header-left" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', textAlign: 'right' }}>
                                        {docCustomization.showLogo && (
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
                                </>
                            )}
                        </div>

                        {docCustomization.clientBoxPosition === "right" ? (
                            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "12px" }}>
                                <div
                                    className="pdf-billing-section"
                                    style={{
                                        width: "55%",
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'flex-start',
                                        gap: '3px',
                                        backgroundColor: '#FAFAF8',
                                        border: '1px solid #EAEAE6',
                                        padding: '10px 14px',
                                        borderRadius: '6px',
                                        textAlign: 'left'
                                    }}
                                >
                                    <span className="section-label" style={{ fontSize: '0.78em', fontWeight: 700, letterSpacing: '0.5px', opacity: 0.65, textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                                        FACTURÉ À :
                                    </span>
                                    <h3 className="client-name" style={{ fontSize: '1.1em', fontWeight: 700, margin: 0, color: '#1A1A1A', lineHeight: 1.3 }}>
                                        {clientDisplayName}
                                    </h3>
                                    {clientDisplayAddress && (
                                        <div style={{ fontSize: '0.92em', opacity: 0.85, lineHeight: 1.35 }}>
                                            {clientDisplayAddress}
                                        </div>
                                    )}
                                    {clientDisplayEmail && (
                                        <div style={{ fontSize: '0.92em', opacity: 0.85, lineHeight: 1.35 }}>
                                            {clientDisplayEmail}
                                        </div>
                                    )}
                                    {clientDisplayPhone && (
                                        <div style={{ fontSize: '0.92em', opacity: 0.85, lineHeight: 1.35 }}>
                                            {clientDisplayPhone}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div
                                className="pdf-billing-section"
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'flex-start',
                                    gap: '3px',
                                    backgroundColor: '#FAFAF8',
                                    border: '1px solid #EAEAE6',
                                    padding: '10px 14px',
                                    borderRadius: '6px',
                                    marginBottom: '12px',
                                    textAlign: 'left'
                                }}
                            >
                                <span className="section-label" style={{ fontSize: '0.78em', fontWeight: 700, letterSpacing: '0.5px', opacity: 0.65, textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                                    FACTURÉ À :
                                </span>
                                <h3 className="client-name" style={{ fontSize: '1.1em', fontWeight: 700, margin: 0, color: '#1A1A1A', lineHeight: 1.3 }}>
                                    {clientDisplayName}
                                </h3>
                                {clientDisplayAddress && (
                                    <div style={{ fontSize: '0.92em', opacity: 0.85, lineHeight: 1.35 }}>
                                        {clientDisplayAddress}
                                    </div>
                                )}
                                {clientDisplayEmail && (
                                    <div style={{ fontSize: '0.92em', opacity: 0.85, lineHeight: 1.35 }}>
                                        {clientDisplayEmail}
                                    </div>
                                )}
                                {clientDisplayPhone && (
                                    <div style={{ fontSize: '0.92em', opacity: 0.85, lineHeight: 1.35 }}>
                                        {clientDisplayPhone}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                <table className="pdf-items-table" style={{ fontSize: '0.95em', marginBottom: '15px', width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ backgroundColor: docCustomization.primaryColor || '#556B2F', color: '#FFFFFF' }}>
                        <tr style={{ backgroundColor: docCustomization.primaryColor || '#556B2F', color: '#FFFFFF' }}>
                            <th style={{ backgroundColor: docCustomization.primaryColor || '#556B2F', color: '#FFFFFF', textAlign: 'left', padding: '6px 8px', borderRadius: '3px 0 0 3px' }}>Description</th>
                            <th className="text-center" style={{ backgroundColor: docCustomization.primaryColor || '#556B2F', color: '#FFFFFF', width: '40px', padding: '6px', whiteSpace: 'nowrap' }}>Qté</th>
                            <th className="text-right" style={{ backgroundColor: docCustomization.primaryColor || '#556B2F', color: '#FFFFFF', minWidth: '75px', padding: '6px 8px', whiteSpace: 'nowrap' }}>Unit. HT</th>
                            <th className="text-right" style={{ backgroundColor: docCustomization.primaryColor || '#556B2F', color: '#FFFFFF', minWidth: '75px', padding: '6px 8px', borderRadius: '0 3px 3px 0', whiteSpace: 'nowrap' }}>Total HT</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(invoiceLines && invoiceLines.length > 0) ? (
                            invoiceLines.map((line, idx) => {
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
                                <td style={{ padding: '6px 8px' }}>{invoice.interventionType || invoice.subject || "Prestation"}</td>
                                <td className="text-center" style={{ padding: '6px', whiteSpace: 'nowrap' }}>1</td>
                                <td className="text-right" style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>{subtotalHt.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</td>
                                <td className="text-right" style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>{subtotalHt.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</td>
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
                                <td style={{ backgroundColor: docCustomization.primaryColor || '#556B2F', color: '#FFFFFF', whiteSpace: 'nowrap', padding: '6px 8px', fontSize: '1.05em', borderRadius: '3px 0 0 3px' }}><strong>TOTAL TTC :</strong></td>
                                <td style={{ backgroundColor: docCustomization.primaryColor || '#556B2F', color: '#FFFFFF', textAlign: 'right', whiteSpace: 'nowrap', padding: '6px 8px', fontSize: '1.05em', borderRadius: '0 3px 3px 0' }}><strong>{totalTtc.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</strong></td>
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
                            <div style={{ fontWeight: '700', marginBottom: '4px', fontSize: '0.9em' }}>Signature de l'acheteur :</div>
                            <div
                                style={{
                                    height: '54px',
                                    border: '1px dashed #DDD',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '6px',
                                    backgroundColor: '#FAFAF8',
                                    padding: '4px',
                                    color: '#888',
                                    fontSize: '0.82em'
                                }}
                            >
                                {invoice.signatureUrl || invoice.clientSignatureUrl ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                        <img 
                                            src={invoice.signatureUrl || invoice.clientSignatureUrl} 
                                            alt="Signature Client" 
                                            style={{ maxHeight: '36px', maxWidth: '90%', objectFit: 'contain' }} 
                                        />
                                        <span style={{ fontSize: '7pt', color: '#16a34a', fontWeight: 600, marginTop: '2px' }}>
                                            ✓ Signé le {new Date(invoice.paidAt || invoice.date || invoice.createdAt || Date.now()).toLocaleDateString('fr-FR')}
                                        </span>
                                    </div>
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

                    // By default OFF for Factures (standard French accounting), activatable in "Personnaliser"
                    if (docCustomization.showClientSignature === true) {
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
                        <div><strong>Conditions de paiement :</strong> Paiement à 30 jours (Échéance le {dueDate})</div>
                        {docCustomization.showIban && <div><strong>IBAN : </strong>{companyIban}</div>}
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
                                            {!isDraft && (
                                                <button className="fp-dots-menu-item" onClick={onSend}>
                                                    <Send size={15} /> Envoyer la facture
                                                </button>
                                            )}
                                            {isDraft && (
                                                <button className="fp-dots-menu-item" onClick={onEdit}>
                                                    <Edit2 size={15} /> Modifier la facture
                                                </button>
                                            )}
                                            {!isPaid && (
                                                <button className="fp-dots-menu-item" onClick={() => setShowCustomizer(true)}>
                                                    <Palette size={15} /> Personnaliser le document
                                                </button>
                                            )}
                                            {onDelete && !isPaid && (
                                                <button
                                                    className="fp-dots-menu-item danger"
                                                    onClick={() => {
                                                        setShowDotsMenu(false);
                                                        onDelete(invoice);
                                                    }}
                                                >
                                                    <Trash2 size={15} /> Supprimer la facture
                                                </button>
                                            )}
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
                                    <span className="fp-drawer-row-value bold">{clientDisplayName}</span>
                                </div>
                                <div className="fp-drawer-row">
                                    <span className="fp-drawer-row-label">Email</span>
                                    <span className="fp-drawer-row-value">{clientDisplayEmail || "Non renseigné"}</span>
                                </div>
                                <div className="fp-drawer-row">
                                    <span className="fp-drawer-row-label">Téléphone</span>
                                    <span className="fp-drawer-row-value">{clientDisplayPhone || "Non renseigné"}</span>
                                </div>
                                <div className="fp-drawer-row">
                                    <span className="fp-drawer-row-label">Adresse</span>
                                    <span className="fp-drawer-row-value">{clientDisplayAddress || "Non renseignée"}</span>
                                </div>
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
                                    <span
                                        style={{
                                            fontSize: "0.78rem",
                                            padding: "3px 10px",
                                            borderRadius: "12px",
                                            fontWeight: 700,
                                            backgroundColor: isPaid
                                                ? "rgba(34, 197, 94, 0.12)"
                                                : isDraft
                                                ? "rgba(156, 163, 175, 0.15)"
                                                : (invoice.status || "").toLowerCase() === "overdue"
                                                ? "rgba(239, 68, 68, 0.12)"
                                                : (invoice.emailSentAt || invoice.isSentByEmail)
                                                ? "rgba(59, 130, 246, 0.12)"
                                                : "rgba(147, 51, 234, 0.12)",
                                            color: isPaid
                                                ? "#16a34a"
                                                : isDraft
                                                ? "#6b7280"
                                                : (invoice.status || "").toLowerCase() === "overdue"
                                                ? "#dc2626"
                                                : (invoice.emailSentAt || invoice.isSentByEmail)
                                                ? "#2563eb"
                                                : "#9333ea",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "5px"
                                        }}
                                    >
                                        {isPaid ? "Payée" : isDraft ? "Brouillon" : (invoice.status || "").toLowerCase() === "overdue" ? "En retard" : (invoice.emailSentAt || invoice.isSentByEmail) ? "Envoyée" : "Finalisée"}
                                    </span>
                                </div>
                                <div className="fp-drawer-row">
                                    <span className="fp-drawer-row-label">Date d'émission</span>
                                    <span className="fp-drawer-row-value">{formattedDocDate}</span>
                                </div>
                                <div className="fp-drawer-row">
                                    <span className="fp-drawer-row-label">Date d'exigibilité</span>
                                    <span className="fp-drawer-row-value">{dueDate}</span>
                                </div>
                                {reminderBadge && (
                                    <div className="fp-drawer-row" style={{ alignItems: 'center' }}>
                                        <span className="fp-drawer-row-label">Relance auto</span>
                                        <span style={{
                                            fontSize: "0.78rem",
                                            padding: "3px 9px",
                                            borderRadius: "12px",
                                            fontWeight: 700,
                                            backgroundColor: reminderBadge.type === "sent"
                                                ? "rgba(34, 197, 94, 0.12)"
                                                : reminderBadge.type === "neutral"
                                                ? "rgba(100, 116, 139, 0.12)"
                                                : "rgba(234, 179, 8, 0.15)",
                                            color: reminderBadge.type === "sent"
                                                ? "#16a34a"
                                                : reminderBadge.type === "neutral"
                                                ? "#64748b"
                                                : "#b45309",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "5px"
                                        }}>
                                            {reminderBadge.type === "sent" ? (
                                                <Check size={13} strokeWidth={2.5} />
                                            ) : (
                                                <Clock size={13} strokeWidth={2.5} />
                                            )}
                                            <span>{reminderBadge.label}</span>
                                        </span>
                                    </div>
                                )}
                                <div className="fp-drawer-row">
                                    <span className="fp-drawer-row-label">Sous-total HT</span>
                                    <span className="fp-drawer-row-value">{subtotalHt.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</span>
                                </div>
                                <div className="fp-drawer-row">
                                    <span className="fp-drawer-row-label">TVA ({tvaRate}%)</span>
                                    <span className="fp-drawer-row-value">
                                        {tvaAmount.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €
                                    </span>
                                </div>
                                <div className="fp-drawer-row" style={{ borderTop: "1px solid var(--border)", marginTop: 4, paddingTop: 6 }}>
                                    <span className="fp-drawer-row-label" style={{ fontWeight: 600, color: "var(--foreground)" }}>Total TTC</span>
                                    <span className="fp-drawer-row-value" style={{ fontSize: "1rem", fontWeight: 800, color: "#556B2F" }}>
                                        {totalTtc.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €
                                    </span>
                                </div>
                            </div>

                            {/* Encaissement (paid only) */}
                            {isPaid && (
                                <div className="fp-drawer-section">
                                    <div className="fp-drawer-section-title">Règlement & Encaissement</div>
                                    <div className="fp-drawer-row">
                                        <span className="fp-drawer-row-label">Statut du paiement</span>
                                        <span style={{
                                            fontSize: "0.78rem",
                                            padding: "3px 10px",
                                            borderRadius: "12px",
                                            fontWeight: 700,
                                            backgroundColor: "rgba(34, 197, 94, 0.12)",
                                            color: "#16a34a",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "4px"
                                        }}>
                                            ✓ RÉGLÉE EN TOTALITÉ
                                        </span>
                                    </div>
                                    <div className="fp-drawer-row">
                                        <span className="fp-drawer-row-label">Mode de paiement</span>
                                        <span className="fp-drawer-row-value" style={{ fontWeight: 600 }}>
                                            {invoice.invoicePaymentMethod === "CARD" || invoice.paymentMethod === "CARD" || invoice.stripePaymentIntentId
                                                ? "Carte bancaire (Stripe)"
                                                : "Virement bancaire"}
                                        </span>
                                    </div>
                                    <div className="fp-drawer-row">
                                        <span className="fp-drawer-row-label">Date du règlement</span>
                                        <span className="fp-drawer-row-value">
                                            {new Date(invoice.paidAt || invoice.date || invoice.createdAt).toLocaleDateString("fr-FR", {
                                                day: "2-digit",
                                                month: "2-digit",
                                                year: "numeric"
                                            })}
                                        </span>
                                    </div>
                                    {(invoice.paymentRef || invoice.stripePaymentIntentId) && (
                                        <div className="fp-drawer-row">
                                            <span className="fp-drawer-row-label">Référence transaction</span>
                                            <span className="fp-drawer-row-value" style={{ fontFamily: "monospace", fontSize: "0.78rem", color: "var(--muted-foreground)" }}>
                                                {invoice.paymentRef || invoice.stripePaymentIntentId}
                                            </span>
                                        </div>
                                    )}
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
                                        {invoice.einvoicingStatus === "ACCEPTED" ? "Acceptée" : invoice.einvoicingStatus === "SENT" ? "Transmise PA" : invoice.einvoicingStatus === "PROCESSING" ? "En cours" : invoice.einvoicingStatus === "REJECTED" ? "Rejetée" : "Non transmise"}
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
                                                {linkedDevis.createdAt ? new Date(linkedDevis.createdAt).toLocaleDateString("fr-FR") : (linkedDevis.date || "")} · {invoice.clientName}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: "right" }}>
                                            <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--foreground)" }}>
                                                {Number(linkedDevis.subtotalHt || linkedDevis.amountHT || invoice.subtotalHt || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} € HT
                                            </div>
                                            <span style={{
                                                display: "inline-block",
                                                marginTop: "4px",
                                                fontSize: "10px",
                                                fontWeight: 700,
                                                padding: "2px 8px",
                                                borderRadius: "6px",
                                                backgroundColor: (linkedDevis.status || "").toUpperCase() === "ACCEPTED" ? "rgba(34, 197, 94, 0.12)" : "rgba(59, 130, 246, 0.12)",
                                                color: (linkedDevis.status || "").toUpperCase() === "ACCEPTED" ? "#22c55e" : "#3b82f6"
                                            }}>
                                                {(linkedDevis.status || "").toUpperCase() === "ACCEPTED" ? "Signé" : (linkedDevis.statusLabel || "Devis")}
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

                            {/* Envoyer (uniquement si la facture est finalisée) */}
                            {!isDraft && (
                                <button
                                    className="fp-drawer-action-primary"
                                    onClick={onSend}
                                    style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: "2px",
                                        padding: "10px 14px"
                                    }}
                                >
                                    <span style={{ fontSize: "0.92rem", fontWeight: 700 }}>Envoyer la facture</span>
                                    {!isPaid && (
                                        <span style={{ fontSize: "11.5px", fontWeight: 400, opacity: 0.9 }}>Avec lien de paiement sécurisé</span>
                                    )}
                                </button>
                            )}

                            {/* Modifier */}
                            {isDraft ? (
                                <button className="fp-drawer-action-link" onClick={onEdit}>
                                    <Edit2 size={14} style={{ verticalAlign: "middle", marginRight: 4 }} />
                                    Modifier la facture
                                </button>
                            ) : (
                                <div style={{ fontSize: "11.5px", color: "var(--muted-foreground)", textAlign: "center", paddingTop: "6px", display: "flex", alignItems: "center", justifyContent: "center", gap: "5px" }}>
                                    <Lock size={12} /> Facture finalisée · Non modifiable
                                </div>
                            )}
                        </div>
                    </aside>
                    {/* RIGHT: live preview (desktop only) */}
                    <div className="fp-detail-right">
                        <div className="preview-side-header">
                            <FileText size={14} />
                            <span>Aperçu de la facture</span>
                            {!isPaid && (
                                <button className="personnaliser-btn" onClick={() => setShowCustomizer(true)}>
                                    <Palette size={14} />
                                    Personnaliser
                                </button>
                            )}
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
