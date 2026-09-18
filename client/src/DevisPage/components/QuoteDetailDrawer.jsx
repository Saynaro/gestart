import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, MoreVertical, Send, Copy, FileText, RefreshCw, Edit2, Play, Palette, Lock, Trash2, Clock, Check } from "lucide-react";
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
    onDelete,
    onOpenLinkedInvoice,
    onUpdateQuoteCustomization,
    overlayStyle
}) {
    const { company } = useUser();
    const [showDotsMenu, setShowDotsMenu] = useState(false);
    const [showStatusPicker, setShowStatusPicker] = useState(false);
    const [showCustomizer, setShowCustomizer] = useState(false);
    const [globalCustomization] = useDocumentCustomization();
    const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" ? window.innerWidth <= 768 : false);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const docCustomization = getEffectiveCustomization(quote, globalCustomization);

    const quoteLines = (quote.lines || []).map(l => ({
        ...l,
        qty: Number(l.quantity || l.qty || 1),
        quantity: Number(l.quantity || l.qty || 1),
        unitPrice: Number(l.unitPrice) || 0,
        tvaRate: l.tvaRate !== undefined && l.tvaRate !== null ? Number(l.tvaRate) : (quote.tvaRate !== undefined && quote.tvaRate !== null ? Number(quote.tvaRate) : 20),
        total: Number(l.total) || ((Number(l.unitPrice) || 0) * (Number(l.quantity || l.qty) || 1))
    }));
    const computedHtFromLines = quoteLines.reduce((acc, l) => acc + (l.unitPrice * l.qty), 0);
    const subtotalHt = Number(quote.subtotalHt || quote.amountHT || quote.totalHt || computedHtFromLines || 0);
    const tvaRate = Number(quote.tvaRate !== undefined && quote.tvaRate !== null ? quote.tvaRate : (quoteLines[0]?.tvaRate !== undefined ? quoteLines[0].tvaRate : 20));
    const computedTvaFromLines = quoteLines.reduce((acc, l) => acc + (l.unitPrice * l.qty * ((l.tvaRate !== undefined ? l.tvaRate : tvaRate) / 100)), 0);
    const totalTtc = Number(quote.totalTtc || quote.amountTTC || (subtotalHt + computedTvaFromLines) || 0);
    const tvaAmount = Number(quote.tvaAmount !== undefined && quote.tvaAmount !== null ? quote.tvaAmount : (totalTtc - subtotalHt));

    const isAccepted = (quote.status || "").toUpperCase() === "ACCEPTED";
    const isSignedOrAccepted = isAccepted || Boolean(quote.signedAt || quote.signature);
    const isDraft    = (quote.status || "").toUpperCase() === "DRAFT";
    const isSent     = (quote.status || "").toUpperCase() === "SENT";

    const client = quote.client || {};
    const clientDisplayName = client.companyName || `${client.firstName || ''} ${client.lastName || ''}`.trim() || quote.clientName || "Client";
    const clientDisplayAddress = client.address || quote.clientAddress || (client.city ? `${client.postalCode || ''} ${client.city}` : "");
    const clientDisplayEmail = client.email || quote.clientEmail || "";
    const clientDisplayPhone = client.phone || quote.clientPhone || "";

    const linkedFacture = quote.linkedFacture || quote.linkedInvoice || quote.invoice || (quote.invoices && quote.invoices[0]);
    const isEditable = !isAccepted && !Boolean(linkedFacture || quote.invoiceId || quote.linkedInvoice || (quote.amountFactured && quote.amountFactured > 0));

    const rawDocDate = quote.date || quote.createdAt || quote.issuedAt;
    const formattedDocDate = rawDocDate ? new Date(rawDocDate).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR');
    
    const rawDueDate = quote.validUntil || quote.dueDate || (rawDocDate ? new Date(new Date(rawDocDate).getTime() + 30 * 86400000) : null);
    const formattedDueDate = rawDueDate ? new Date(rawDueDate).toLocaleDateString('fr-FR') : formattedDocDate;

    // Relance automatique calculation for quote
    const quoteReminderEnabled = !quote.reminderDisabled && (company?.settings?.quoteReminderEnabled !== false);
    const quoteReminderDays = quote.customReminderDays || company?.settings?.quoteReminderDays || 5;

    let quoteReminderBadge = null;
    if (quote.reminder1SentAt) {
        const sentDateStr = new Date(quote.reminder1SentAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        quoteReminderBadge = {
            label: `Relance envoyée le ${sentDateStr}`,
            type: 'sent'
        };
    } else if (isSent && !isAccepted && quoteReminderEnabled && quote.emailSentAt) {
        const sentTime = new Date(quote.emailSentAt).getTime();
        const targetTime = sentTime + quoteReminderDays * 24 * 60 * 60 * 1000;
        const diffMs = targetTime - Date.now();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        const targetDateStr = new Date(targetTime).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });

        const hasRecipientEmail = Boolean(quote.emailSentTo || quote.client?.email);

        if (!hasRecipientEmail) {
            quoteReminderBadge = {
                label: "Non programmée (aucun email client)",
                type: "neutral"
            };
        } else if (diffDays > 0) {
            quoteReminderBadge = {
                label: `Relance dans ${diffDays} jour${diffDays > 1 ? 's' : ''} (le ${targetDateStr})`,
                type: 'pending'
            };
        } else if (diffDays === 0) {
            quoteReminderBadge = {
                label: "Relance prévue aujourd'hui",
                type: 'imminent'
            };
        } else {
            // Délai dépassé, en attente du cycle automatique
            quoteReminderBadge = {
                label: "En attente d'envoi automatique",
                type: 'imminent'
            };
        }
    }

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
    const companyIban = company?.settings?.bankIban || company?.bankIban || company?.iban || quote.company?.settings?.bankIban || quote.company?.bankIban || "";
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
                                            DEVIS
                                        </h1>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <h1 style={{ fontSize: "1.4em", fontWeight: 800, color: "#FFFFFF", margin: 0, letterSpacing: "1.5px" }}>
                                            DEVIS
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
                            <div><strong>Numéro : </strong> {quote.number}</div>
                            <div><strong>Date : </strong> {formattedDocDate}</div>
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
                                        DEVIS POUR :
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
                                        DEVIS POUR :
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
                                                DEVIS N° {quote.number}
                                            </div>
                                            <div style={{ fontSize: "0.8em", opacity: 0.85 }}>
                                                Date : <strong>{formattedDocDate}</strong>
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
                                                DEVIS N° {quote.number}
                                            </div>
                                            <div style={{ fontSize: "0.8em", opacity: 0.85 }}>
                                                Date : <strong>{formattedDocDate}</strong>
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
                                        DEVIS POUR :
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
                                        DEVIS POUR :
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
                                            DEVIS
                                        </h1>
                                        <div style={{ fontSize: "0.8em", color: "#666", marginTop: "2px" }}>
                                            N° {quote.number} • {formattedDocDate}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div style={{ textAlign: "left" }}>
                                        <h1 style={{ fontSize: "1.6em", fontWeight: 300, color: docCustomization.primaryColor || "#556B2F", margin: 0, letterSpacing: "2px" }}>
                                            DEVIS
                                        </h1>
                                        <div style={{ fontSize: "0.8em", color: "#666", marginTop: "2px" }}>
                                            N° {quote.number} • {formattedDocDate}
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
                                        DEVIS POUR :
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
                                        DEVIS POUR :
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
                                        <h1 className="doc-type-label" style={{ fontSize: '1.8em', marginBottom: '4px', color: docCustomization.primaryColor || '#556B2F', margin: 0, fontWeight: 800 }}>DEVIS</h1>
                                        <table className="doc-meta-table" style={{ fontSize: '0.9em' }}>
                                            <tbody>
                                                <tr>
                                                    <td><strong>Numéro :</strong></td>
                                                    <td>{quote.number}</td>
                                                </tr>
                                                <tr>
                                                    <td><strong>Date :</strong></td>
                                                    <td>{formattedDocDate}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="pdf-header-right" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
                                        <h1 className="doc-type-label" style={{ fontSize: '1.8em', marginBottom: '4px', color: docCustomization.primaryColor || '#556B2F', margin: 0, fontWeight: 800 }}>DEVIS</h1>
                                        <table className="doc-meta-table" style={{ fontSize: '0.9em' }}>
                                            <tbody>
                                                <tr>
                                                    <td><strong>Numéro :</strong></td>
                                                    <td>{quote.number}</td>
                                                </tr>
                                                <tr>
                                                    <td><strong>Date :</strong></td>
                                                    <td>{formattedDocDate}</td>
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
                                        DEVIS POUR :
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
                                    DEVIS POUR :
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
                                {quote.signatureUrl || quote.clientSignatureUrl ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                        <img 
                                            src={quote.signatureUrl || quote.clientSignatureUrl} 
                                            alt="Signature Client" 
                                            style={{ maxHeight: '36px', maxWidth: '90%', objectFit: 'contain' }} 
                                        />
                                        <span style={{ fontSize: '7pt', color: '#16a34a', fontWeight: 600, marginTop: '2px' }}>
                                            ✓ Signé le {new Date(quote.signedAt || quote.acceptedAt || quote.date || quote.createdAt || Date.now()).toLocaleDateString('fr-FR')}
                                        </span>
                                    </div>
                                ) : quote.status === 'ACCEPTED' ? (
                                    <>
                                        <span style={{ fontWeight: 'bold', color: '#16a34a' }}>✓ Signé électroniquement</span>
                                        <span style={{ fontSize: '7.5pt', color: '#7C7B82' }}>
                                            le {new Date(quote.signedAt || quote.acceptedAt || quote.date || quote.createdAt || Date.now()).toLocaleDateString('fr-FR')}
                                        </span>
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
                    <div className="pdf-footer-section" style={{ fontSize: '0.85em', paddingTop: '10px', borderTop: '1px solid #E0E0E0', marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        {companyIban && (
                            <div><strong>Coordonnées bancaires (IBAN) : </strong>{companyIban}</div>
                        )}
                        <div><strong>Conditions de paiement : </strong>Paiement à 30 jours (Échéance le {new Date(new Date(quote.date || quote.createdAt || Date.now()).setDate(new Date(quote.date || quote.createdAt || Date.now()).getDate() + 30)).toLocaleDateString('fr-FR')}).</div>
                        <div><strong>Validité du devis : </strong>30 jours à compter de la date d'émission (art. L. 221-5 et L. 111-1 C.conso). Devis gratuit avant exécution des travaux (art. L. 111-3 C.conso).</div>
                        <div><strong>Conditions d'exécution : </strong>Les travaux débuteront après signature du devis accompagné d'un acompte.</div>
                        <div style={{ fontStyle: 'italic', marginTop: '2px', color: '#64748B' }}>Membre d'une association agréée, le règlement par chèque est accepté.</div>
                    </div>
                )}

            </div>
        </div>
    );

    return (
        <>
            <motion.div
                className="dv-drawer-overlay"
                style={overlayStyle}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
                onClick={onClose}
            >
                <motion.div
                    className="fp-detail-wide-container"
                    role="dialog"
                    aria-label="Détails du devis"
                    initial={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.96, y: 15 }}
                    animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
                    exit={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.96, y: 15 }}
                    transition={{ type: "tween", ease: [0.16, 1, 0.3, 1], duration: 0.32 }}
                    onClick={e => e.stopPropagation()}
                    drag={isMobile ? "y" : false}
                    dragConstraints={{ top: 0 }}
                    dragElastic={{ top: 0, bottom: 0.8 }}
                    onDragEnd={(event, info) => {
                        if (isMobile && info.offset.y > 80) {
                            onClose();
                        }
                    }}
                >
                    {/* LEFT: detail panel */}
                    <aside className="dv-drawer fp-detail-left">
                        {/* Mobile Drag Handle */}
                        {isMobile && (
                            <div style={{ display: "flex", justifyContent: "center", width: "100%", paddingTop: "10px", cursor: "grab" }}>
                                <div style={{ width: "36px", height: "4px", backgroundColor: "var(--border, #CBD5E1)", borderRadius: "2px" }} />
                            </div>
                        )}
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
                                        {isEditable && (
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
                                        {!isSignedOrAccepted && (
                                            <button className="dv-dots-menu-item" onClick={() => { setShowCustomizer(true); setShowDotsMenu(false); }}>
                                                <Palette size={15} /> Personnaliser le document
                                            </button>
                                        )}
                                        {onDelete && (
                                            <button
                                                className="dv-dots-menu-item dv-danger-item"
                                                onClick={() => {
                                                    setShowDotsMenu(false);
                                                    onDelete(quote);
                                                }}
                                            >
                                                <Trash2 size={15} /> Supprimer le devis
                                            </button>
                                        )}
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
                                        : (quote.status || "").toUpperCase() === "REFUSED"
                                        ? "rgba(239, 68, 68, 0.12)"
                                        : (quote.emailSentAt || quote.isSentByEmail)
                                        ? "rgba(59, 130, 246, 0.12)"
                                        : "rgba(147, 51, 234, 0.12)",
                                    color: isAccepted
                                        ? "#16a34a"
                                        : isDraft
                                        ? "#6b7280"
                                        : (quote.status || "").toUpperCase() === "REFUSED"
                                        ? "#dc2626"
                                        : (quote.emailSentAt || quote.isSentByEmail)
                                        ? "#2563eb"
                                        : "#9333ea",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "5px"
                                }}
                            >
                                {isAccepted ? "Signé" : isDraft ? "Brouillon" : (quote.status || "").toUpperCase() === "REFUSED" ? "Refusé" : (quote.emailSentAt || quote.isSentByEmail) ? "Envoyé" : "Finalisé"}
                            </span>
                            {quote.paidAt && (
                                <span
                                    className="dv-status-badge"
                                    style={{
                                        backgroundColor: "#DCFCE7",
                                        color: "#166534",
                                        fontWeight: 600,
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "5px"
                                    }}
                                >
                                    ✓ Payé le {new Date(quote.paidAt).toLocaleDateString("fr-FR")}
                                </span>
                            )}
                        </div>

                        {/* Note for locked status */}
                        {isAccepted && (
                            <div className="dv-accepted-note">
                                Devis signé et validé par le client. Vous pouvez exécuter les travaux et convertir ce devis en facture pour encaissement.
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
                                <span className="dv-drawer-row-label">Nom</span>
                                <span className="dv-drawer-row-value bold">{clientDisplayName}</span>
                            </div>
                            <div className="dv-drawer-row">
                                <span className="dv-drawer-row-label">Email</span>
                                <span className="dv-drawer-row-value">{clientDisplayEmail || "Non renseigné"}</span>
                            </div>
                            <div className="dv-drawer-row">
                                <span className="dv-drawer-row-label">Téléphone</span>
                                <span className="dv-drawer-row-value">{clientDisplayPhone || "Non renseigné"}</span>
                            </div>
                            <div className="dv-drawer-row">
                                <span className="dv-drawer-row-label">Adresse</span>
                                <span className="dv-drawer-row-value">{clientDisplayAddress || "Non renseignée"}</span>
                            </div>
                        </div>

                        {/* Dates */}
                        <div className="dv-drawer-section">
                            <div className="dv-drawer-section-title">Dates & Exigibilité</div>
                            <div className="dv-drawer-row">
                                <span className="dv-drawer-row-label">Date d'émission</span>
                                <span className="dv-drawer-row-value">
                                    {formattedDocDate}
                                </span>
                            </div>
                            <div className="dv-drawer-row">
                                <span className="dv-drawer-row-label">Date d'exigibilité</span>
                                <span className="dv-drawer-row-value">{formattedDueDate}</span>
                            </div>
                            {quoteReminderBadge && (
                                <div className="dv-drawer-row" style={{ alignItems: 'center' }}>
                                    <span className="dv-drawer-row-label">Relance auto</span>
                                    <span style={{
                                        fontSize: "0.78rem",
                                        padding: "3px 9px",
                                        borderRadius: "12px",
                                        fontWeight: 700,
                                        backgroundColor: quoteReminderBadge.type === "sent"
                                            ? "rgba(34, 197, 94, 0.12)"
                                            : quoteReminderBadge.type === "neutral"
                                            ? "rgba(100, 116, 139, 0.12)"
                                            : "rgba(234, 179, 8, 0.15)",
                                        color: quoteReminderBadge.type === "sent"
                                            ? "#16a34a"
                                            : quoteReminderBadge.type === "neutral"
                                            ? "#64748b"
                                            : "#b45309",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "5px"
                                    }}>
                                        {quoteReminderBadge.type === "sent" ? (
                                            <Check size={13} strokeWidth={2.5} />
                                        ) : (
                                            <Clock size={13} strokeWidth={2.5} />
                                        )}
                                        <span>{quoteReminderBadge.label}</span>
                                    </span>
                                </div>
                            )}
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
                                            <FileText size={14} style={{ color: "var(--sidebar-primary)" }} />
                                        </div>
                                        <div style={{ fontSize: "11.5px", color: "var(--muted-foreground)", marginTop: "4px" }}>
                                            {(linkedFacture.issuedAt ? new Date(linkedFacture.issuedAt).toLocaleDateString("fr-FR") : (linkedFacture.createdAt ? new Date(linkedFacture.createdAt).toLocaleDateString("fr-FR") : (linkedFacture.date || "")))} · {clientDisplayName}
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
                                            backgroundColor: (linkedFacture.status || "").toLowerCase() === "paid"
                                                ? "rgba(34, 197, 94, 0.12)"
                                                : (linkedFacture.emailSentAt || linkedFacture.isSentByEmail)
                                                ? "rgba(59, 130, 246, 0.12)"
                                                : "rgba(147, 51, 234, 0.12)",
                                            color: (linkedFacture.status || "").toLowerCase() === "paid"
                                                ? "#22c55e"
                                                : (linkedFacture.emailSentAt || linkedFacture.isSentByEmail)
                                                ? "#2563eb"
                                                : "#9333ea"
                                        }}>
                                            {(linkedFacture.status || "").toLowerCase() === "paid" ? "Payée" : (linkedFacture.emailSentAt || linkedFacture.isSentByEmail) ? "Envoyée" : "Finalisée"}
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

                        {!isEditable && (
                            <div style={{ fontSize: "11.5px", color: "var(--muted-foreground)", textAlign: "center", paddingTop: "6px", display: "flex", alignItems: "center", justifyContent: "center", gap: "5px" }}>
                                <Lock size={12} /> {isAccepted ? "Devis signé · Non modifiable" : "Devis envoyé / facturé · Non modifiable"}
                            </div>
                        )}
                    </div>
                    </aside>
                    
                    {/* RIGHT: live preview (desktop only) */}
                    <div className="fp-detail-right">
                        <div className="preview-side-header">
                            <FileText size={14} />
                            <span>Aperçu du devis</span>
                            {!isSignedOrAccepted && (
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
                </motion.div>
            </motion.div>

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
            {createPortal(
                <AnimatePresence>
                    {showStatusPicker && (
                        <>
                            <motion.div
                                className="fp-status-sheet-overlay"
                                onClick={() => setShowStatusPicker(false)}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
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
                            />
                            <motion.div
                                className="fp-status-sheet-container"
                                onClick={e => e.stopPropagation()}
                                initial={{ y: "100%" }}
                                animate={{ y: 0 }}
                                exit={{ y: "100%" }}
                                transition={{ type: "tween", ease: [0.16, 1, 0.3, 1], duration: 0.32 }}
                                drag="y"
                                dragConstraints={{ top: 0 }}
                                dragElastic={{ top: 0, bottom: 0.8 }}
                                onDragEnd={(event, info) => {
                                    if (info.offset.y > 80) {
                                        setShowStatusPicker(false);
                                    }
                                }}
                                style={{
                                    position: "fixed",
                                    bottom: 0,
                                    left: 0,
                                    right: 0,
                                    zIndex: 12001,
                                    width: "100%",
                                    maxWidth: "500px",
                                    margin: "0 auto",
                                    backgroundColor: "var(--card)",
                                    borderTopLeftRadius: "20px",
                                    borderTopRightRadius: "20px",
                                    padding: "20px 20px max(32px, env(safe-area-inset-bottom, 32px)) 20px",
                                    boxShadow: "0 -8px 32px rgba(0, 0, 0, 0.25)",
                                    boxSizing: "border-box"
                                }}
                            >
                                <div style={{ width: "36px", height: "4px", borderRadius: "2px", backgroundColor: "var(--border)", margin: "0 auto 16px", cursor: "grab" }} />
                                
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
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </>
    );
}

export default QuoteDetailDrawer;
