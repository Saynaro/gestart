import React, { useState, useEffect } from "react";
import { X, Printer, Download, ZoomIn, ZoomOut } from "lucide-react";
import { useDocumentCustomization, getEffectiveCustomization } from "../../utils/documentCustomization";
import { useUser } from "../../utils/useUser";

function QuotePdfView({ quote, onClose, onDownload }) {
    const { company } = useUser();
    const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;
    const [zoom, setZoom] = useState(isMobile ? 0.65 : 1.0);
    const [globalCustomization] = useDocumentCustomization();
    const docCustomization = getEffectiveCustomization(quote, globalCustomization);

    if (!quote) return null;

    const companyDisplayName = company?.name || quote.company?.name || "Mon Entreprise";
    const companyDisplayAddress = company?.address ? `${company.address}${company.postalCode || company.city ? `, ${company.postalCode || ''} ${company.city || ''}` : ''}` : "Adresse non renseignée";
    const companyDisplaySiret = company?.siret || "Non renseigné";
    const companyDisplayTva = company?.tvaNumber || (company?.siren ? `FR ${company.siren}` : "Non renseigné");
    const companyDisplayPhone = company?.phone || "Non renseigné";
    const companyDisplayEmail = company?.email || "contact@entreprise.fr";
    const companyLogo = docCustomization.logoUrl || company?.logoUrl;
    const companyIban = company?.settings?.bankIban || company?.bankIban || company?.iban || quote.company?.settings?.bankIban || quote.company?.bankIban || "";
    const companySignature = company?.signatureUrl || company?.signature || company?.settings?.signatureUrl || company?.settings?.signature;

    const rawQuoteDate = quote.date || quote.createdAt || quote.issuedAt;
    const formattedQuoteDate = rawQuoteDate ? new Date(rawQuoteDate).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR');
    
    const rawQuoteDueDate = quote.validUntil || quote.dueDate || (rawQuoteDate ? new Date(new Date(rawQuoteDate).getTime() + 30 * 86400000) : null);
    const formattedQuoteDueDate = rawQuoteDueDate ? new Date(rawQuoteDueDate).toLocaleDateString('fr-FR') : formattedQuoteDate;

    const client = quote.client || {};
    const clientDisplayName = client.companyName || `${client.firstName || ''} ${client.lastName || ''}`.trim() || quote.clientName || "Client";
    const clientDisplayAddress = client.address || quote.clientAddress || (client.city ? `${client.postalCode || ''} ${client.city}` : "");
    const clientDisplayEmail = client.email || quote.clientEmail || "";
    const clientDisplayPhone = client.phone || quote.clientPhone || "";

    const quoteLines = (quote.lines || []).map(l => ({
        ...l,
        qty: Number(l.quantity || l.qty || 1),
        unitPrice: Number(l.unitPrice || 0),
        tvaRate: l.tvaRate !== undefined && l.tvaRate !== null ? Number(l.tvaRate) : (quote.tvaRate !== undefined && quote.tvaRate !== null ? Number(quote.tvaRate) : 20),
        total: Number(l.total) || ((Number(l.unitPrice) || 0) * (Number(l.quantity || l.qty) || 1))
    }));
    const computedHt = quoteLines.reduce((acc, l) => acc + (l.unitPrice * l.qty), 0);
    const subtotalHt = Number(quote.subtotalHt || quote.amountHT || quote.totalHt || computedHt || 0);
    const tvaRate = Number(quote.tvaRate !== undefined && quote.tvaRate !== null ? quote.tvaRate : (quoteLines[0]?.tvaRate !== undefined ? quoteLines[0].tvaRate : 20));
    const computedTva = quoteLines.reduce((acc, l) => acc + (l.unitPrice * l.qty * ((l.tvaRate !== undefined ? l.tvaRate : tvaRate) / 100)), 0);
    const totalTtc = Number(quote.totalTtc || quote.amountTTC || (subtotalHt + computedTva) || 0);
    const tvaAmount = Number(quote.tvaAmount !== undefined && quote.tvaAmount !== null ? quote.tvaAmount : (totalTtc - subtotalHt));

    const handlePrint = () => {
        window.print();
    };

    React.useEffect(() => {
        window.history.pushState({ pdfViewer: true }, "");
        const handlePopState = () => {
            onClose();
        };
        window.addEventListener("popstate", handlePopState);
        return () => {
            window.removeEventListener("popstate", handlePopState);
        };
    }, []);

    const zoomIn = () => setZoom(prev => Math.min(1.6, Math.round((prev + 0.1) * 100) / 100));
    const zoomOut = () => setZoom(prev => Math.max(0.35, Math.round((prev - 0.1) * 100) / 100));
    const resetZoom = () => setZoom(isMobile ? 0.65 : 1.0);

    return (
        <div className="invoice-modal-overlay pdf-viewer-overlay">
            <div className="pdf-viewer-top-bar">
                <div className="pdf-viewer-top-bar-inner">
                    <div className="pdf-top-row">
                        <span className="pdf-title">Aperçu Devis — {quote.number}</span>
                        <button className="top-btn close-x-mobile" onClick={onClose} aria-label="Fermer">
                            <X size={18} />
                        </button>
                    </div>

                    <div className="pdf-controls-row">
                        <div className="pdf-zoom-controls">
                            <button className="top-btn" onClick={zoomOut} title="Réduire">
                                <ZoomOut size={15} />
                            </button>
                            <button className="top-btn zoom-badge" onClick={resetZoom}>
                                {Math.round(zoom * 100)}%
                            </button>
                            <button className="top-btn" onClick={zoomIn} title="Agrandir">
                                <ZoomIn size={15} />
                            </button>
                        </div>

                        <div className="actions">
                            <button className="top-btn" onClick={handlePrint}>
                                <Printer size={15} />
                                <span className="btn-label">Imprimer</span>
                            </button>
                            <button className="top-btn" onClick={() => onDownload ? onDownload(quote) : handlePrint()}>
                                <Download size={15} />
                                <span className="btn-label">PDF</span>
                            </button>
                            <button className="top-btn close-x-desktop" onClick={onClose} aria-label="Fermer">
                                <X size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="pdf-page-scroll-container">
                <div
                    className="a4-page-shadow"
                    style={{
                        transform: `scale(${zoom})`,
                        transformOrigin: "top center",
                        transition: "transform 0.15s ease-out"
                    }}
                >
                    <div
                        className="invoice-pdf-a4-sheet"
                        id="quote-pdf-print-area"
                        style={{
                            backgroundColor: docCustomization.bgColor || "#FFFFFF",
                            color: docCustomization.textColor || "#1A1A1A",
                            fontSize: docCustomization.fontSize || "9.5pt",
                            fontFamily: docCustomization.fontFamily || "Inter, sans-serif"
                        }}
                    >
                        {/* Banner header if banner style */}
                        {docCustomization.structure === "banner" && (
                            <div
                                style={{
                                    height: "8px",
                                    backgroundColor: docCustomization.primaryColor || "#556B2F",
                                    margin: "-20mm -18mm 14pt -18mm",
                                    borderRadius: "2px 2px 0 0"
                                }}
                            />
                        )}

                        {/* ==================== STRUCTURE 1: BANNER ==================== */}
                        {docCustomization.structure === "banner" && (
                            <div style={{ marginBottom: "14pt" }}>
                                <div
                                    style={{
                                        backgroundColor: docCustomization.primaryColor || "#556B2F",
                                        color: "#FFFFFF",
                                        padding: "16px 20px",
                                        margin: "-25mm -20mm 14px -20mm",
                                        borderRadius: "0",
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center"
                                    }}
                                >
                                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                        {docCustomization.showLogo && (
                                            companyLogo ? (
                                                <img
                                                    src={companyLogo}
                                                    alt="Logo"
                                                    style={{
                                                        height: `${docCustomization.logoSize || 45}px`,
                                                        maxWidth: "140px",
                                                        objectFit: "contain",
                                                        background: "rgba(255,255,255,0.2)",
                                                        padding: "2px 6px",
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
                                                        padding: "4px 8px",
                                                        fontSize: "1.1em"
                                                    }}
                                                >
                                                    {companyDisplayName.substring(0, 8).toUpperCase()}
                                                </div>
                                            )
                                        )}
                                        <div>
                                            <h3 style={{ fontSize: "1.35em", fontWeight: 800, color: "#FFFFFF", margin: 0 }}>
                                                {companyDisplayName}
                                            </h3>
                                        </div>
                                    </div>

                                    <div style={{ textAlign: "right" }}>
                                        <h1 style={{ fontSize: "1.8em", fontWeight: 800, color: "#FFFFFF", margin: 0, letterSpacing: "2px" }}>
                                            DEVIS
                                        </h1>
                                    </div>
                                </div>

                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        backgroundColor: "#F4F4F2",
                                        padding: "6px 12px",
                                        borderRadius: "4px",
                                        fontSize: "0.85em",
                                        marginBottom: "12px",
                                        color: "#4A4A4A"
                                    }}
                                >
                                    <div><strong>Numéro : </strong> {quote.number || `DEV-${quote.id}`}</div>
                                    <div><strong>Date : </strong> {formattedQuoteDate}</div>
                                    {docCustomization.showDeliveryDate && <div><strong>Validité : </strong> {formattedQuoteDueDate}</div>}
                                </div>

                                {docCustomization.clientBoxPosition === "right" ? (
                                    <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", marginBottom: "14px" }}>
                                        <div style={{ flex: 1, fontSize: "0.9em", lineHeight: 1.4, opacity: 0.85 }}>
                                            {docCustomization.showAddress && <div>{companyDisplayAddress}</div>}
                                            {docCustomization.showSiret && <div>SIRET : {companyDisplaySiret} — N° TVA : {companyDisplayTva}</div>}
                                            {docCustomization.showPhone && <div>Tél : {companyDisplayPhone}</div>}
                                            {docCustomization.showEmail && <div>Email : {companyDisplayEmail}</div>}
                                        </div>
                                        <div
                                            style={{
                                                flex: 1,
                                                backgroundColor: "#FAFAF8",
                                                border: "1px solid #EAEAE6",
                                                padding: "10px 14px",
                                                borderRadius: "6px"
                                            }}
                                        >
                                            <span style={{ fontSize: "0.78em", fontWeight: 700, opacity: 0.65, letterSpacing: "0.5px", textTransform: "uppercase", display: "block", marginBottom: "2px" }}>
                                                DEVIS POUR :
                                            </span>
                                            <div style={{ fontWeight: 700, fontSize: "1.05em", color: "#1A1A1A" }}>{clientDisplayName}</div>
                                            {clientDisplayAddress && <div style={{ fontSize: "0.9em", opacity: 0.85 }}>{clientDisplayAddress}</div>}
                                            {clientDisplayEmail && <div style={{ fontSize: "0.9em", opacity: 0.85 }}>{clientDisplayEmail}</div>}
                                            {clientDisplayPhone && <div style={{ fontSize: "0.9em", opacity: 0.85 }}>{clientDisplayPhone}</div>}
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ marginBottom: "14px" }}>
                                        <div style={{ fontSize: "0.9em", lineHeight: 1.4, opacity: 0.85, marginBottom: "10px" }}>
                                            {docCustomization.showAddress && <div>{companyDisplayAddress}</div>}
                                            {docCustomization.showSiret && <div>SIRET : {companyDisplaySiret} — N° TVA : {companyDisplayTva}</div>}
                                            {docCustomization.showPhone && <div>Tél : {companyDisplayPhone}</div>}
                                            {docCustomization.showEmail && <div>Email : {companyDisplayEmail}</div>}
                                        </div>
                                        <div
                                            style={{
                                                backgroundColor: "#FAFAF8",
                                                border: "1px solid #EAEAE6",
                                                padding: "10px 14px",
                                                borderRadius: "6px"
                                            }}
                                        >
                                            <span style={{ fontSize: "0.78em", fontWeight: 700, opacity: 0.65, letterSpacing: "0.5px", textTransform: "uppercase", display: "block", marginBottom: "2px" }}>
                                                DEVIS POUR :
                                            </span>
                                            <div style={{ fontWeight: 700, fontSize: "1.05em", color: "#1A1A1A" }}>{clientDisplayName}</div>
                                            {clientDisplayAddress && <div style={{ fontSize: "0.9em", opacity: 0.85 }}>{clientDisplayAddress}</div>}
                                            {clientDisplayEmail && <div style={{ fontSize: "0.9em", opacity: 0.85 }}>{clientDisplayEmail}</div>}
                                            {clientDisplayPhone && <div style={{ fontSize: "0.9em", opacity: 0.85 }}>{clientDisplayPhone}</div>}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ==================== STRUCTURE 2: MODERN ==================== */}
                        {docCustomization.structure === "modern" && (
                            <div style={{ marginBottom: "14pt" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                                    <div>
                                        {docCustomization.showLogo && (
                                            companyLogo ? (
                                                <img
                                                    src={companyLogo}
                                                    alt="Logo"
                                                    style={{
                                                        height: `${docCustomization.logoSize || 45}px`,
                                                        maxWidth: "180px",
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
                                                        height: `${docCustomization.logoSize || 45}px`,
                                                        minWidth: `${(docCustomization.logoSize || 45) * 1.8}px`,
                                                        marginBottom: "4pt",
                                                        fontSize: "1.1em"
                                                    }}
                                                >
                                                    {companyDisplayName.substring(0, 10).toUpperCase()}
                                                </div>
                                            )
                                        )}
                                        <h3 style={{ fontSize: "1.35em", fontWeight: 800, color: docCustomization.primaryColor || "#556B2F", margin: 0 }}>
                                            {companyDisplayName}
                                        </h3>
                                    </div>

                                    <div style={{ textAlign: "right" }}>
                                        <div
                                            style={{
                                                display: "inline-block",
                                                backgroundColor: docCustomization.primaryColor || "#556B2F",
                                                color: "#FFFFFF",
                                                padding: "6px 16px",
                                                borderRadius: "20px",
                                                fontWeight: 800,
                                                fontSize: "1.05em",
                                                letterSpacing: "0.5px",
                                                marginBottom: "4px"
                                            }}
                                        >
                                            DEVIS N° {quote.number || `DEV-${quote.id}`}
                                        </div>
                                        <div style={{ fontSize: "0.88em", opacity: 0.85 }}>
                                            Date : <strong>{formattedQuoteDate}</strong> {docCustomization.showDeliveryDate && <>• Validité : <strong>{formattedQuoteDueDate}</strong></>}
                                        </div>
                                    </div>
                                </div>

                                {docCustomization.clientBoxPosition === "right" ? (
                                    <div style={{ display: "flex", gap: "14px", marginBottom: "14px" }}>
                                        <div
                                            style={{
                                                flex: 1,
                                                backgroundColor: "#FAFAF8",
                                                borderLeft: `4px solid ${docCustomization.primaryColor || "#556B2F"}`,
                                                padding: "10px 14px",
                                                borderRadius: "6px",
                                                fontSize: "0.9em",
                                                lineHeight: 1.4
                                            }}
                                        >
                                            <span style={{ fontSize: "0.78em", fontWeight: 700, color: docCustomization.primaryColor || "#556B2F", textTransform: "uppercase", display: "block", marginBottom: "2px" }}>
                                                Émetteur
                                            </span>
                                            <div style={{ fontWeight: 700, color: "#1A1A1A" }}>{companyDisplayName}</div>
                                            {docCustomization.showAddress && <div>{companyDisplayAddress}</div>}
                                            {docCustomization.showSiret && <div>SIRET : {companyDisplaySiret} — N° TVA : {companyDisplayTva}</div>}
                                            {docCustomization.showPhone && <div>Tél : {companyDisplayPhone}</div>}
                                            {docCustomization.showEmail && <div>Email : {companyDisplayEmail}</div>}
                                        </div>

                                        <div
                                            style={{
                                                flex: 1,
                                                backgroundColor: `${docCustomization.primaryColor || "#556B2F"}10`,
                                                border: `1px solid ${docCustomization.primaryColor || "#556B2F"}30`,
                                                padding: "10px 14px",
                                                borderRadius: "6px",
                                                fontSize: "0.9em",
                                                lineHeight: 1.4
                                            }}
                                        >
                                            <span style={{ fontSize: "0.78em", fontWeight: 700, color: docCustomization.primaryColor || "#556B2F", textTransform: "uppercase", display: "block", marginBottom: "2px" }}>
                                                DEVIS POUR :
                                            </span>
                                            <div style={{ fontWeight: 700, fontSize: "1.05em", color: "#1A1A1A" }}>{clientDisplayName}</div>
                                            {clientDisplayAddress && <div>{clientDisplayAddress}</div>}
                                            {clientDisplayEmail && <div>{clientDisplayEmail}</div>}
                                            {clientDisplayPhone && <div>{clientDisplayPhone}</div>}
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ marginBottom: "14px" }}>
                                        <div
                                            style={{
                                                backgroundColor: "#FAFAF8",
                                                borderLeft: `4px solid ${docCustomization.primaryColor || "#556B2F"}`,
                                                padding: "10px 14px",
                                                borderRadius: "6px",
                                                fontSize: "0.9em",
                                                lineHeight: 1.4,
                                                marginBottom: "10px"
                                            }}
                                        >
                                            <span style={{ fontSize: "0.78em", fontWeight: 700, color: docCustomization.primaryColor || "#556B2F", textTransform: "uppercase", display: "block", marginBottom: "2px" }}>
                                                Émetteur
                                            </span>
                                            <div style={{ fontWeight: 700, color: "#1A1A1A" }}>{companyDisplayName}</div>
                                            {docCustomization.showAddress && <div>{companyDisplayAddress}</div>}
                                            {docCustomization.showSiret && <div>SIRET : {companyDisplaySiret} — N° TVA : {companyDisplayTva}</div>}
                                            {docCustomization.showPhone && <div>Tél : {companyDisplayPhone}</div>}
                                            {docCustomization.showEmail && <div>Email : {companyDisplayEmail}</div>}
                                        </div>

                                        <div
                                            style={{
                                                backgroundColor: `${docCustomization.primaryColor || "#556B2F"}10`,
                                                border: `1px solid ${docCustomization.primaryColor || "#556B2F"}30`,
                                                padding: "10px 14px",
                                                borderRadius: "6px",
                                                fontSize: "0.9em",
                                                lineHeight: 1.4
                                            }}
                                        >
                                            <span style={{ fontSize: "0.78em", fontWeight: 700, color: docCustomization.primaryColor || "#556B2F", textTransform: "uppercase", display: "block", marginBottom: "2px" }}>
                                                DEVIS POUR :
                                            </span>
                                            <div style={{ fontWeight: 700, fontSize: "1.05em", color: "#1A1A1A" }}>{clientDisplayName}</div>
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
                            <div style={{ marginBottom: "14pt" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", paddingBottom: "10px", borderBottom: `1.5px solid #EAEAE6`, marginBottom: "14px" }}>
                                    <div>
                                        {docCustomization.showLogo && (
                                            companyLogo ? (
                                                <img
                                                    src={companyLogo}
                                                    alt="Logo"
                                                    style={{
                                                        height: `${docCustomization.logoSize || 40}px`,
                                                        maxWidth: "160px",
                                                        objectFit: "contain",
                                                        marginBottom: "4pt"
                                                    }}
                                                />
                                            ) : null
                                        )}
                                        <h3 style={{ fontSize: "1.3em", fontWeight: 800, color: docCustomization.primaryColor || "#556B2F", margin: 0, letterSpacing: "-0.02em" }}>
                                            {companyDisplayName}
                                        </h3>
                                    </div>

                                    <div style={{ textAlign: "right" }}>
                                        <h1 style={{ fontSize: "2em", fontWeight: 300, color: docCustomization.primaryColor || "#556B2F", margin: 0, letterSpacing: "3px" }}>
                                            DEVIS
                                        </h1>
                                        <div style={{ fontSize: "0.85em", color: "#666", marginTop: "2px" }}>
                                            N° {quote.number || `DEV-${quote.id}`} • {formattedQuoteDate}
                                        </div>
                                    </div>
                                </div>

                                {docCustomization.clientBoxPosition === "right" ? (
                                    <div style={{ display: "flex", justifyContent: "space-between", gap: "20px", marginBottom: "14px" }}>
                                        <div style={{ flex: 1, fontSize: "0.88em", lineHeight: 1.4, color: "#4A4A4A" }}>
                                            {docCustomization.showAddress && <div>{companyDisplayAddress}</div>}
                                            {docCustomization.showSiret && <div>SIRET : {companyDisplaySiret} — N° TVA : {companyDisplayTva}</div>}
                                            {docCustomization.showPhone && <div>Tél : {companyDisplayPhone}</div>}
                                            {docCustomization.showEmail && <div>Email : {companyDisplayEmail}</div>}
                                        </div>

                                        <div style={{ flex: 1, fontSize: "0.88em", lineHeight: 1.4 }}>
                                            <span style={{ fontSize: "0.78em", fontWeight: 700, color: docCustomization.primaryColor || "#556B2F", letterSpacing: "1px", textTransform: "uppercase", display: "block", marginBottom: "2px" }}>
                                                DEVIS POUR :
                                            </span>
                                            <div style={{ fontWeight: 700, fontSize: "1.05em", color: "#1A1A1A" }}>{clientDisplayName}</div>
                                            {clientDisplayAddress && <div style={{ color: "#4A4A4A" }}>{clientDisplayAddress}</div>}
                                            {clientDisplayEmail && <div style={{ color: "#4A4A4A" }}>{clientDisplayEmail}</div>}
                                            {clientDisplayPhone && <div style={{ color: "#4A4A4A" }}>{clientDisplayPhone}</div>}
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ marginBottom: "14px" }}>
                                        <div style={{ fontSize: "0.88em", lineHeight: 1.4, color: "#4A4A4A", marginBottom: "10px" }}>
                                            {docCustomization.showAddress && <div>{companyDisplayAddress}</div>}
                                            {docCustomization.showSiret && <div>SIRET : {companyDisplaySiret} — N° TVA : {companyDisplayTva}</div>}
                                            {docCustomization.showPhone && <div>Tél : {companyDisplayPhone}</div>}
                                            {docCustomization.showEmail && <div>Email : {companyDisplayEmail}</div>}
                                        </div>

                                        <div style={{ borderTop: "1px dashed #E0E0E0", paddingTop: "8px", fontSize: "0.88em", lineHeight: 1.4 }}>
                                            <span style={{ fontSize: "0.78em", fontWeight: 700, color: docCustomization.primaryColor || "#556B2F", letterSpacing: "1px", textTransform: "uppercase", display: "block", marginBottom: "2px" }}>
                                                DEVIS POUR :
                                            </span>
                                            <div style={{ fontWeight: 700, fontSize: "1.05em", color: "#1A1A1A" }}>{clientDisplayName}</div>
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
                            <div style={{ marginBottom: "14pt" }}>
                                <div className="pdf-header-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14pt" }}>
                                    <div className="pdf-header-left" style={{ flex: 1 }}>
                                        {docCustomization.showLogo && docCustomization.logoPosition !== "right" && (
                                            companyLogo ? (
                                                <img
                                                    src={companyLogo}
                                                    alt="Logo"
                                                    style={{
                                                        height: `${docCustomization.logoSize || 45}px`,
                                                        maxWidth: "180px",
                                                        objectFit: "contain",
                                                        marginBottom: "6pt"
                                                    }}
                                                />
                                            ) : (
                                                <div
                                                    className="pdf-logo-stub"
                                                    style={{
                                                        backgroundColor: docCustomization.primaryColor || "#556B2F",
                                                        color: "#FFF",
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        fontWeight: 700,
                                                        borderRadius: "4px",
                                                        padding: "4px 8px",
                                                        height: `${docCustomization.logoSize || 45}px`,
                                                        minWidth: `${(docCustomization.logoSize || 45) * 1.8}px`,
                                                        marginBottom: "6pt",
                                                        fontSize: "1.1em"
                                                    }}
                                                >
                                                    <span>{companyDisplayName.substring(0, 10).toUpperCase()}</span>
                                                </div>
                                            )
                                        )}
                                        <h3 className="company-name" style={{ color: docCustomization.primaryColor || "#556B2F", margin: "0 0 4px 0", fontSize: "1.3em", fontWeight: 800 }}>
                                            {companyDisplayName}
                                        </h3>
                                        <p className="company-details" style={{ margin: 0, fontSize: "0.9em", lineHeight: 1.4, opacity: 0.85 }}>
                                            {docCustomization.showAddress && <span>{companyDisplayAddress}<br /></span>}
                                            {docCustomization.showSiret && <span>SIRET : {companyDisplaySiret} — N° TVA : {companyDisplayTva}<br /></span>}
                                            {docCustomization.showPhone && <span>Tél : {companyDisplayPhone}<br /></span>}
                                            {docCustomization.showEmail && <span>Email : {companyDisplayEmail}</span>}
                                        </p>
                                    </div>

                                    <div className="pdf-header-right" style={{ textAlign: "right" }}>
                                        {docCustomization.showLogo && docCustomization.logoPosition === "right" && (
                                            companyLogo ? (
                                                <img
                                                    src={companyLogo}
                                                    alt="Logo"
                                                    style={{
                                                        height: `${docCustomization.logoSize || 45}px`,
                                                        maxWidth: "180px",
                                                        objectFit: "contain",
                                                        marginBottom: "6pt"
                                                    }}
                                                />
                                            ) : (
                                                <div
                                                    className="pdf-logo-stub"
                                                    style={{
                                                        backgroundColor: docCustomization.primaryColor || "#556B2F",
                                                        color: "#FFF",
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        fontWeight: 700,
                                                        borderRadius: "4px",
                                                        padding: "4px 8px",
                                                        height: `${docCustomization.logoSize || 45}px`,
                                                        minWidth: `${(docCustomization.logoSize || 45) * 1.8}px`,
                                                        marginBottom: "6pt",
                                                        fontSize: "1.1em"
                                                    }}
                                                >
                                                    <span>{companyDisplayName.substring(0, 10).toUpperCase()}</span>
                                                </div>
                                            )
                                        )}
                                        <h1 className="doc-type-label" style={{ color: docCustomization.primaryColor || "#556B2F", fontSize: "1.8em", margin: 0, fontWeight: 800 }}>DEVIS</h1>
                                        <table className="doc-meta-table" style={{ fontSize: "0.95em", marginTop: "4pt" }}>
                                            <tbody>
                                                <tr>
                                                    <td style={{ textAlign: "right", paddingRight: "6px" }}><strong>Numéro :</strong></td>
                                                    <td>{quote.number || `DEV-${quote.id}`}</td>
                                                </tr>
                                                <tr>
                                                    <td style={{ textAlign: "right", paddingRight: "6px" }}><strong>Date :</strong></td>
                                                    <td>{formattedQuoteDate}</td>
                                                </tr>
                                                <tr>
                                                    <td style={{ textAlign: "right", paddingRight: "6px" }}><strong>Validité :</strong></td>
                                                    <td>{formattedQuoteDueDate}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {docCustomization.clientBoxPosition === "right" ? (
                                    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "12px" }}>
                                        <div
                                            className="pdf-billing-section"
                                            style={{
                                                width: "55%",
                                                display: "flex",
                                                flexDirection: "column",
                                                alignItems: "flex-start",
                                                gap: "3px",
                                                backgroundColor: "#FAFAF8",
                                                border: "1px solid #EAEAE6",
                                                padding: "10px 14px",
                                                borderRadius: "6px",
                                                textAlign: "left"
                                            }}
                                        >
                                            <span className="section-label" style={{ fontSize: "0.78em", fontWeight: 700, letterSpacing: "0.5px", opacity: 0.65, textTransform: "uppercase", display: "block", marginBottom: "2px" }}>
                                                DEVIS POUR :
                                            </span>
                                            <h4 className="client-name" style={{ fontSize: "1.1em", fontWeight: 700, margin: 0, color: "#1A1A1A", lineHeight: 1.3 }}>
                                                {clientDisplayName}
                                            </h4>
                                            {clientDisplayAddress && (
                                                <div style={{ fontSize: "0.92em", opacity: 0.85, lineHeight: 1.35 }}>
                                                    {clientDisplayAddress}
                                                </div>
                                            )}
                                            {clientDisplayEmail && (
                                                <div style={{ fontSize: "0.92em", opacity: 0.85, lineHeight: 1.35 }}>
                                                    {clientDisplayEmail}
                                                </div>
                                            )}
                                            {clientDisplayPhone && (
                                                <div style={{ fontSize: "0.92em", opacity: 0.85, lineHeight: 1.35 }}>
                                                    {clientDisplayPhone}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        className="pdf-billing-section"
                                        style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "flex-start",
                                            gap: "3px",
                                            backgroundColor: "#FAFAF8",
                                            border: "1px solid #EAEAE6",
                                            padding: "10px 14px",
                                            borderRadius: "6px",
                                            margin: "12px 0",
                                            textAlign: "left"
                                        }}
                                    >
                                        <span className="section-label" style={{ fontSize: "0.78em", fontWeight: 700, letterSpacing: "0.5px", opacity: 0.65, textTransform: "uppercase", display: "block", marginBottom: "2px" }}>
                                            DEVIS POUR :
                                        </span>
                                        <h4 className="client-name" style={{ fontSize: "1.1em", fontWeight: 700, margin: 0, color: "#1A1A1A", lineHeight: 1.3 }}>
                                            {clientDisplayName}
                                        </h4>
                                        {clientDisplayAddress && (
                                            <div style={{ fontSize: "0.92em", opacity: 0.85, lineHeight: 1.35 }}>
                                                {clientDisplayAddress}
                                            </div>
                                        )}
                                        {clientDisplayEmail && (
                                            <div style={{ fontSize: "0.92em", opacity: 0.85, lineHeight: 1.35 }}>
                                                {clientDisplayEmail}
                                            </div>
                                        )}
                                        {clientDisplayPhone && (
                                            <div style={{ fontSize: "0.92em", opacity: 0.85, lineHeight: 1.35 }}>
                                                {clientDisplayPhone}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Table items */}
                        <table className="pdf-items-table" style={{ width: "100%", borderCollapse: "collapse", margin: "14px 0", fontSize: "0.95em" }}>
                            <thead style={{ backgroundColor: docCustomization.primaryColor || "#556B2F", color: "#FFFFFF" }}>
                                <tr style={{ backgroundColor: docCustomization.primaryColor || "#556B2F", color: "#FFFFFF" }}>
                                    <th style={{ backgroundColor: docCustomization.primaryColor || "#556B2F", color: "#FFFFFF", textAlign: "left", padding: "6px 8px", borderRadius: "3px 0 0 3px" }}>Description</th>
                                    <th className="text-center" style={{ backgroundColor: docCustomization.primaryColor || "#556B2F", color: "#FFFFFF", width: "40px", padding: "6px", whiteSpace: "nowrap" }}>Qté</th>
                                    <th className="text-right" style={{ backgroundColor: docCustomization.primaryColor || "#556B2F", color: "#FFFFFF", minWidth: "75px", padding: "6px 8px", whiteSpace: "nowrap" }}>Prix unit. HT</th>
                                    <th className="text-right" style={{ backgroundColor: docCustomization.primaryColor || "#556B2F", color: "#FFFFFF", minWidth: "75px", padding: "6px 8px", borderRadius: "0 3px 3px 0", whiteSpace: "nowrap" }}>Total HT</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(quote.lines && quote.lines.length > 0) ? (
                                    quote.lines.map((line, idx) => {
                                        const q = Number(line.quantity || line.qty || 1);
                                        const p = Number(line.unitPrice) || 0;
                                        return (
                                            <tr key={idx} style={{ borderBottom: "1px solid #EAEAE6" }}>
                                                <td style={{ padding: "6px 8px" }}>
                                                    <div style={{ fontWeight: 600 }}>{line.description || "Prestation"}</div>
                                                    {line.reference && (
                                                        <div style={{ fontSize: "7.5pt", color: "#7C7B82", marginTop: "2pt" }}>
                                                            Réf: {line.reference}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="text-center" style={{ padding: "6px", whiteSpace: "nowrap" }}>{q}</td>
                                                <td className="text-right" style={{ padding: "6px 8px", whiteSpace: "nowrap" }}>{p.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</td>
                                                <td className="text-right" style={{ padding: "6px 8px", whiteSpace: "nowrap" }}>{(p * q).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr style={{ borderBottom: "1px solid #EAEAE6" }}>
                                        <td style={{ padding: "6px 8px" }}>
                                            <div style={{ fontWeight: 600 }}>{quote.interventionType || quote.subject || "Prestation"}</div>
                                        </td>
                                        <td className="text-center" style={{ padding: "6px", whiteSpace: "nowrap" }}>1</td>
                                        <td className="text-right" style={{ padding: "6px 8px", whiteSpace: "nowrap" }}>{(Number(quote.subtotalHt) || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</td>
                                        <td className="text-right" style={{ padding: "6px 8px", whiteSpace: "nowrap" }}>{(Number(quote.subtotalHt) || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {/* Summary Block */}
                        <div className="pdf-summary-block" style={{ display: "flex", justifyContent: "flex-end", margin: "12px 0" }}>
                            <div className="summary-table-wrap">
                                <table className="pdf-summary-table" style={{ width: "auto", minWidth: "210px", fontSize: "0.95em" }}>
                                    <tbody>
                                        <tr>
                                            <td style={{ whiteSpace: "nowrap", padding: "4px 8px" }}>Sous-total HT :</td>
                                            <td style={{ textAlign: "right", whiteSpace: "nowrap", padding: "4px 8px" }}>{subtotalHt.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</td>
                                        </tr>
                                        <tr>
                                            <td style={{ whiteSpace: "nowrap", padding: "4px 8px" }}>TVA ({tvaRate}%) :</td>
                                            <td style={{ textAlign: "right", whiteSpace: "nowrap", padding: "4px 8px" }}>{tvaAmount.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</td>
                                        </tr>
                                        <tr className="grand-total-row" style={{ backgroundColor: docCustomization.primaryColor || "#556B2F", color: "#FFFFFF", fontWeight: 700 }}>
                                            <td style={{ backgroundColor: docCustomization.primaryColor || "#556B2F", color: "#FFFFFF", padding: "6px 8px", borderRadius: "3px 0 0 3px", whiteSpace: "nowrap", fontSize: "1.05em" }}><strong>TOTAL TTC :</strong></td>
                                            <td style={{ backgroundColor: docCustomization.primaryColor || "#556B2F", color: "#FFFFFF", textAlign: "right", padding: "6px 8px", borderRadius: "0 3px 3px 0", whiteSpace: "nowrap", fontSize: "1.05em" }}><strong>{totalTtc.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</strong></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Signatures Section (Company & Buyer) */}
                        {(docCustomization.showCompanySignature !== false || docCustomization.showClientSignature !== false) && (() => {
                            const compPos = docCustomization.signaturePosition || "left";
                            const clPos = docCustomization.clientSignaturePosition || "right";

                            const renderCompanySig = () => (
                                <div key="comp-sig" style={{ width: "100%", maxWidth: "230px" }}>
                                    <div style={{ fontWeight: 700, marginBottom: "4px", fontSize: "0.9em" }}>Pour l'entreprise :</div>
                                    <div
                                        style={{
                                            height: "54px",
                                            border: "1px dashed #DDD",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            borderRadius: "6px",
                                            backgroundColor: "#FAFAF8",
                                            padding: "4px"
                                        }}
                                    >
                                        {companySignature ? (
                                            <img src={companySignature} alt="Signature Entreprise" style={{ maxHeight: "48px", maxWidth: "90%", objectFit: "contain" }} />
                                        ) : (
                                            <span style={{ color: "#888", fontSize: "0.85em", fontStyle: "italic" }}>{companyDisplayName}</span>
                                        )}
                                    </div>
                                </div>
                            );

                            const renderClientSig = () => (
                                <div key="client-sig" style={{ width: "100%", maxWidth: "230px" }}>
                                    <div style={{ fontWeight: 700, marginBottom: "4px", fontSize: "0.9em" }}>Bon pour accord / Le Client :</div>
                                    <div
                                        style={{
                                            height: "54px",
                                            border: "1px dashed #DDD",
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            borderRadius: "6px",
                                            backgroundColor: quote.status === "ACCEPTED" ? "rgba(26, 158, 92, 0.05)" : "#FAFAF8",
                                            padding: "4px",
                                            color: quote.status === "ACCEPTED" ? "#1A9E5C" : "#888",
                                            fontSize: "0.82em"
                                        }}
                                    >
                                        {quote.signatureUrl || quote.clientSignatureUrl ? (
                                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%" }}>
                                                <img 
                                                    src={quote.signatureUrl || quote.clientSignatureUrl} 
                                                    alt="Signature Client" 
                                                    style={{ maxHeight: "36px", maxWidth: "90%", objectFit: "contain" }} 
                                                />
                                                <span style={{ fontSize: "7pt", color: "#16a34a", fontWeight: 600, marginTop: "2px" }}>
                                                    ✓ Signé le {new Date(quote.signedAt || quote.acceptedAt || quote.date || quote.createdAt || Date.now()).toLocaleDateString("fr-FR")}
                                                </span>
                                            </div>
                                        ) : quote.status === "ACCEPTED" ? (
                                            <>
                                                <span style={{ fontWeight: "bold", color: "#16a34a" }}>✓ Signé électroniquement</span>
                                                <span style={{ fontSize: "7.5pt", color: "#7C7B82" }}>
                                                    le {new Date(quote.signedAt || quote.acceptedAt || quote.date || quote.createdAt || Date.now()).toLocaleDateString("fr-FR")}
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <span style={{ fontStyle: "italic", fontSize: "0.78em" }}>Mention "Bon pour accord"</span>
                                                <span style={{ fontSize: "0.72em", marginTop: "2px", opacity: 0.8 }}>Date et signature</span>
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
                                    className="pdf-signature-block-container"
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        gap: "24px",
                                        margin: "18px 0",
                                        fontSize: "0.85em",
                                        borderTop: "1px dashed #E0E0E0",
                                        paddingTop: "14px"
                                    }}
                                >
                                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "10px", alignItems: "flex-start", textAlign: "left" }}>
                                        {leftItems}
                                    </div>
                                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "10px", alignItems: "flex-end", textAlign: "right" }}>
                                        {rightItems}
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Footer details */}
                        <div className="pdf-footer-section" style={{ fontSize: "0.85em", borderTop: "1px solid #E5E5E5", paddingTop: "10px", marginTop: "auto", opacity: 0.85, lineHeight: 1.45 }}>
                            {docCustomization.showIban && (
                                <div className="iban-block" style={{ marginBottom: "6px" }}>
                                    <strong>Coordonnées bancaires (IBAN) : </strong>
                                    <span>{companyIban}</span>
                                </div>
                            )}
                            <div className="legal-notes">
                                <strong>Conditions de paiement : </strong> {quote.paymentConditions || "Paiement à 30 jours"} (Échéance le {new Date(quote.dueDate || quote.date).toLocaleDateString("fr-FR")}).<br />
                                <strong>Validité du devis : </strong> 30 jours à compter de la date d'émission (art. L. 221-5 et L. 111-1 C.conso). Devis gratuit avant exécution des travaux (art. L. 111-3 C.conso).<br />
                                <strong>Conditions d'exécution : </strong> Les travaux débuteront après signature du devis accompagné d'un acompte.<br />
                                {quote.tvaRate === 0 && <span style={{ fontWeight: 700, color: "#556B2F" }}>TVA non applicable — art. 293 B du CGI.</span>}
                                {docCustomization.showAgaMention && (
                                    <div style={{ fontStyle: "italic", marginTop: "2pt" }}>
                                        Membre d'une association agréée, le règlement par chèque est accepté.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default QuotePdfView;
