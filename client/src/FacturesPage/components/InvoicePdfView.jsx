import React, { useState, useEffect } from "react";
import { X, Printer, Download, ZoomIn, ZoomOut } from "lucide-react";
import { useDocumentCustomization, getEffectiveCustomization } from "../../utils/documentCustomization";
import { useUser } from "../../utils/useUser";

function InvoicePdfView({ invoice, onClose, onDownload }) {
    const { company } = useUser();
    const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;
    const [zoom, setZoom] = useState(isMobile ? 0.65 : 1.0);
    const [globalCustomization] = useDocumentCustomization();
    const docCustomization = getEffectiveCustomization(invoice, globalCustomization);

    if (!invoice) return null;

    const companyDisplayName = company?.name || invoice.company?.name || "Mon Entreprise";
    const companyDisplayAddress = company?.address ? `${company.address}${company.postalCode || company.city ? `, ${company.postalCode || ''} ${company.city || ''}` : ''}` : "Adresse non renseignée";
    const companyDisplaySiret = company?.siret || "Non renseigné";
    const companyDisplayTva = company?.tvaNumber || (company?.siren ? `FR ${company.siren}` : "Non renseigné");
    const companyDisplayPhone = company?.phone || "Non renseigné";
    const companyDisplayEmail = company?.email || "contact@entreprise.fr";
    const companyLogo = docCustomization.logoUrl || company?.logoUrl;
    const companyIban = company?.settings?.bankIban || company?.bankIban || company?.iban || invoice.company?.settings?.bankIban || invoice.company?.bankIban || "";
    const companySignature = company?.signatureUrl || company?.signature || company?.settings?.signatureUrl || company?.settings?.signature;

    const rawInvoiceDate = invoice.issuedAt || invoice.date || invoice.createdAt;
    const formattedInvoiceDate = rawInvoiceDate ? new Date(rawInvoiceDate).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR');
    
    const rawInvoiceDueDate = invoice.dueAt || invoice.dueDate || (rawInvoiceDate ? new Date(new Date(rawInvoiceDate).getTime() + (invoice.paymentDelay || 30) * 86400000) : null);
    const formattedInvoiceDueDate = rawInvoiceDueDate ? new Date(rawInvoiceDueDate).toLocaleDateString('fr-FR') : formattedInvoiceDate;

    const client = invoice.client || {};
    const clientDisplayName = client.companyName || `${client.firstName || ''} ${client.lastName || ''}`.trim() || invoice.clientName || "Client";
    const clientDisplayAddress = client.address || invoice.clientAddress || (client.city ? `${client.postalCode || ''} ${client.city}` : "");
    const clientDisplayEmail = client.email || invoice.clientEmail || "";
    const clientDisplayPhone = client.phone || invoice.clientPhone || "";

    const invoiceLines = (invoice.lines || []).map(l => ({
        ...l,
        qty: Number(l.quantity || l.qty || 1),
        unitPrice: Number(l.unitPrice || 0),
        tvaRate: l.tvaRate !== undefined && l.tvaRate !== null ? Number(l.tvaRate) : (invoice.tvaRate !== undefined && invoice.tvaRate !== null ? Number(invoice.tvaRate) : 20),
        total: Number(l.total) || ((Number(l.unitPrice) || 0) * (Number(l.quantity || l.qty) || 1))
    }));
    const computedHt = invoiceLines.reduce((acc, l) => acc + (l.unitPrice * l.qty), 0);
    const subtotalHt = Number(invoice.subtotalHt || invoice.amountHT || invoice.totalHt || computedHt || 0);
    const tvaRate = Number(invoice.tvaRate !== undefined && invoice.tvaRate !== null ? invoice.tvaRate : (invoiceLines[0]?.tvaRate !== undefined ? invoiceLines[0].tvaRate : 20));
    const computedTva = invoiceLines.reduce((acc, l) => acc + (l.unitPrice * l.qty * ((l.tvaRate !== undefined ? l.tvaRate : tvaRate) / 100)), 0);
    const totalTtc = Number(invoice.totalTtc || invoice.amountTTC || (subtotalHt + computedTva) || 0);
    const tvaAmount = Number(invoice.tvaAmount !== undefined && invoice.tvaAmount !== null ? invoice.tvaAmount : (totalTtc - subtotalHt));

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
        <div className="invoice-modal-overlay pdf-viewer-overlay" style={{ zIndex: 99999 }}>
            <div className="pdf-viewer-top-bar">
                <div className="pdf-viewer-top-bar-inner">
                    <div className="pdf-top-row">
                        <span className="pdf-title">Aperçu Facture — {invoice.number}</span>
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
                            <button className="top-btn" onClick={() => onDownload ? onDownload(invoice, docCustomization) : handlePrint()}>
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
                        id="invoice-pdf-print-area"
                        style={{
                            backgroundColor: docCustomization.bgColor || "#FFFFFF",
                            color: docCustomization.textColor || "#1A1A1A",
                            fontSize: docCustomization.fontSize || "9.5pt",
                            fontFamily: docCustomization.fontFamily || "Inter, sans-serif"
                        }}
                    >
                        {/* ==================== STRUCTURE 1: BANNER ==================== */}
                        {docCustomization.structure === "banner" && (
                            <div style={{ marginBottom: "12px" }}>
                                <div
                                    style={{
                                        backgroundColor: docCustomization.primaryColor || "#556B2F",
                                        color: "#FFFFFF",
                                        padding: "14px 18px",
                                        margin: "0 -14mm 10px -14mm",
                                        borderRadius: "0",
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center"
                                    }}
                                >
                                    {docCustomization.logoPosition !== "right" ? (
                                        <>
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
                                                    FACTURE
                                                </h1>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div>
                                                <h1 style={{ fontSize: "1.8em", fontWeight: 800, color: "#FFFFFF", margin: 0, letterSpacing: "2px" }}>
                                                    FACTURE
                                                </h1>
                                            </div>

                                            <div style={{ display: "flex", alignItems: "center", gap: "12px", textAlign: "right" }}>
                                                <div>
                                                    <h3 style={{ fontSize: "1.35em", fontWeight: 800, color: "#FFFFFF", margin: 0 }}>
                                                        {companyDisplayName}
                                                    </h3>
                                                </div>
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
                                            </div>
                                        </>
                                    )}
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
                                    <div><strong>Numéro : </strong> {invoice.number || `INV-${invoice.id}`}</div>
                                    <div><strong>Date : </strong> {formattedInvoiceDate}</div>
                                    <div><strong>Échéance : </strong> {formattedInvoiceDueDate}</div>
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
                                                FACTURÉ À :
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
                                                FACTURÉ À :
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
                            <div style={{ paddingTop: "10mm", marginBottom: "12px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                                    {docCustomization.logoPosition !== "right" ? (
                                        <>
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
                                                <div>
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
                                                        FACTURE N° {invoice.number || `INV-${invoice.id}`}
                                                    </div>
                                                    <div style={{ fontSize: "0.88em", opacity: 0.85 }}>
                                                        Date : <strong>{formattedInvoiceDate}</strong> • Échéance : <strong>{formattedInvoiceDueDate}</strong>
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
                                                            padding: "6px 16px",
                                                            borderRadius: "20px",
                                                            fontWeight: 800,
                                                            fontSize: "1.05em",
                                                            letterSpacing: "0.5px",
                                                            marginBottom: "4px"
                                                        }}
                                                    >
                                                        FACTURE N° {invoice.number || `INV-${invoice.id}`}
                                                    </div>
                                                    <div style={{ fontSize: "0.88em", opacity: 0.85 }}>
                                                        Date : <strong>{formattedInvoiceDate}</strong> • Échéance : <strong>{formattedInvoiceDueDate}</strong>
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
                                        </>
                                    )}
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
                                                FACTURÉ À :
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
                                                FACTURÉ À :
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
                            <div style={{ paddingTop: "10mm", marginBottom: "12px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", paddingBottom: "6px", borderBottom: `1.5px solid #EAEAE6`, marginBottom: "10px" }}>
                                    {docCustomization.logoPosition !== "right" ? (
                                        <>
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
                                                    FACTURE
                                                </h1>
                                                <div style={{ fontSize: "0.85em", color: "#666", marginTop: "2px" }}>
                                                    N° {invoice.number || `INV-${invoice.id}`} • {formattedInvoiceDate}
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div style={{ textAlign: "left" }}>
                                                <h1 style={{ fontSize: "2em", fontWeight: 300, color: docCustomization.primaryColor || "#556B2F", margin: 0, letterSpacing: "3px" }}>
                                                    FACTURE
                                                </h1>
                                                <div style={{ fontSize: "0.85em", color: "#666", marginTop: "2px" }}>
                                                    N° {invoice.number || `INV-${invoice.id}`} • {formattedInvoiceDate}
                                                </div>
                                            </div>

                                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", textAlign: "right" }}>
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
                                        </>
                                    )}
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
                                                FACTURÉ À :
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
                                                FACTURÉ À :
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
                            <div style={{ paddingTop: "10mm", marginBottom: "12px" }}>
                                <div className="pdf-header-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                                    {docCustomization.logoPosition !== "right" ? (
                                        <>
                                            <div className="pdf-header-left" style={{ flex: 1 }}>
                                                {docCustomization.showLogo && (
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
                                                <h1 className="doc-type-label" style={{ color: docCustomization.primaryColor || "#556B2F", fontSize: "1.8em", margin: 0, fontWeight: 800 }}>FACTURE</h1>
                                                <table className="doc-meta-table" style={{ fontSize: "0.95em", marginTop: "4pt" }}>
                                                    <tbody>
                                                        <tr>
                                                            <td style={{ textAlign: "right", paddingRight: "6px" }}><strong>Numéro :</strong></td>
                                                            <td>{invoice.number || `INV-${invoice.id}`}</td>
                                                        </tr>
                                                        <tr>
                                                            <td style={{ textAlign: "right", paddingRight: "6px" }}><strong>Date :</strong></td>
                                                            <td>{formattedInvoiceDate}</td>
                                                        </tr>
                                                        <tr>
                                                            <td style={{ textAlign: "right", paddingRight: "6px" }}><strong>Échéance :</strong></td>
                                                            <td>{formattedInvoiceDueDate}</td>
                                                        </tr>
                                                        {docCustomization.showDeliveryDate && invoice.deliveryDate && (
                                                            <tr>
                                                                <td style={{ textAlign: "right", paddingRight: "6px" }}><strong>Livraison :</strong></td>
                                                                <td>{new Date(invoice.deliveryDate).toLocaleDateString("fr-FR")}</td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="pdf-header-right" style={{ textAlign: "left" }}>
                                                <h1 className="doc-type-label" style={{ color: docCustomization.primaryColor || "#556B2F", fontSize: "1.8em", margin: 0, fontWeight: 800 }}>FACTURE</h1>
                                                <table className="doc-meta-table" style={{ fontSize: "0.95em", marginTop: "4pt", marginLeft: 0 }}>
                                                    <tbody>
                                                        <tr>
                                                            <td style={{ textAlign: "left", paddingRight: "6px" }}><strong>Numéro :</strong></td>
                                                            <td>{invoice.number || `INV-${invoice.id}`}</td>
                                                        </tr>
                                                        <tr>
                                                            <td style={{ textAlign: "left", paddingRight: "6px" }}><strong>Date :</strong></td>
                                                            <td>{formattedInvoiceDate}</td>
                                                        </tr>
                                                        <tr>
                                                            <td style={{ textAlign: "left", paddingRight: "6px" }}><strong>Échéance :</strong></td>
                                                            <td>{formattedInvoiceDueDate}</td>
                                                        </tr>
                                                        {docCustomization.showDeliveryDate && invoice.deliveryDate && (
                                                            <tr>
                                                                <td style={{ textAlign: "left", paddingRight: "6px" }}><strong>Livraison :</strong></td>
                                                                <td>{new Date(invoice.deliveryDate).toLocaleDateString("fr-FR")}</td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>

                                            <div className="pdf-header-left" style={{ flex: 1, textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                                                {docCustomization.showLogo && (
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
                                        </>
                                    )}
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
                                                FACTURÉ À :
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
                                            FACTURÉ À :
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
                        <table className="pdf-items-table" style={{ width: "100%", borderCollapse: "collapse", margin: "10px 0", fontSize: "0.95em" }}>
                            <thead style={{ backgroundColor: docCustomization.primaryColor || "#556B2F", color: "#FFFFFF" }}>
                                <tr style={{ backgroundColor: docCustomization.primaryColor || "#556B2F", color: "#FFFFFF" }}>
                                    <th style={{ backgroundColor: docCustomization.primaryColor || "#556B2F", color: "#FFFFFF", textAlign: "left", padding: "6px 8px", borderRadius: "3px 0 0 3px" }}>Description</th>
                                    <th className="text-center" style={{ backgroundColor: docCustomization.primaryColor || "#556B2F", color: "#FFFFFF", width: "40px", padding: "6px", whiteSpace: "nowrap" }}>Qté</th>
                                    <th className="text-right" style={{ backgroundColor: docCustomization.primaryColor || "#556B2F", color: "#FFFFFF", minWidth: "75px", padding: "6px 8px", whiteSpace: "nowrap" }}>Prix unit. HT</th>
                                    <th className="text-right" style={{ backgroundColor: docCustomization.primaryColor || "#556B2F", color: "#FFFFFF", minWidth: "75px", padding: "6px 8px", borderRadius: "0 3px 3px 0", whiteSpace: "nowrap" }}>Total HT</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(invoice.lines && invoice.lines.length > 0) ? (
                                    invoice.lines.map((line, idx) => {
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
                                            <div style={{ fontWeight: 600 }}>{invoice.interventionType || invoice.subject || "Prestation"}</div>
                                        </td>
                                        <td className="text-center" style={{ padding: "6px", whiteSpace: "nowrap" }}>1</td>
                                        <td className="text-right" style={{ padding: "6px 8px", whiteSpace: "nowrap" }}>{(Number(invoice.subtotalHt) || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</td>
                                        <td className="text-right" style={{ padding: "6px 8px", whiteSpace: "nowrap" }}>{(Number(invoice.subtotalHt) || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {/* Summary Block */}
                        <div className="pdf-summary-block" style={{ display: "flex", justifyContent: "flex-end", margin: "10px 0" }}>
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
                                    <div style={{ fontWeight: 700, marginBottom: "4px", fontSize: "0.9em" }}>Signature de l'acheteur :</div>
                                    <div
                                        style={{
                                            height: "54px",
                                            border: "1px dashed #DDD",
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            borderRadius: "6px",
                                            backgroundColor: "#FAFAF8",
                                            padding: "4px",
                                            color: "#888",
                                            fontSize: "0.82em"
                                        }}
                                    >
                                        {invoice.signatureUrl || invoice.clientSignatureUrl ? (
                                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%" }}>
                                                <img 
                                                    src={invoice.signatureUrl || invoice.clientSignatureUrl} 
                                                    alt="Signature Client" 
                                                    style={{ maxHeight: "36px", maxWidth: "90%", objectFit: "contain" }} 
                                                />
                                                <span style={{ fontSize: "7pt", color: "#16a34a", fontWeight: 600, marginTop: "2px" }}>
                                                    ✓ Signé le {new Date(invoice.paidAt || rawInvoiceDate || Date.now()).toLocaleDateString("fr-FR")}
                                                </span>
                                            </div>
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

                            // By default OFF for Factures (standard French accounting), activatable in "Personnaliser"
                            if (docCustomization.showClientSignature === true) {
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
                                        margin: "12px 0 8px 0",
                                        fontSize: "0.85em",
                                        borderTop: "1px dashed #E0E0E0",
                                        paddingTop: "8px"
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
                        <div className="pdf-footer-section" style={{ fontSize: "0.85em", borderTop: "1px solid #E5E5E5", paddingTop: "6px", marginTop: "auto", opacity: 0.85, lineHeight: 1.45 }}>
                            {docCustomization.showIban && (
                                <div className="iban-block" style={{ marginBottom: "6px" }}>
                                    <strong>Coordonnées bancaires (IBAN) : </strong>
                                    <span>{companyIban}</span>
                                </div>
                            )}
                            <div className="legal-notes">
                                <strong>Conditions de paiement : </strong> {invoice.paymentConditions || "Paiement à 30 jours"} (Échéance le {formattedInvoiceDueDate}).<br />
                                <strong>Pénalités de retard : </strong> En cas de retard de paiement, application d'un taux d'intérêt égal au taux de la BCE majoré de 10 points de pourcentage.<br />
                                <strong>Indemnité forfaitaire pour frais de recouvrement : </strong> 40 € dus de plein droit par tout professionnel.<br />
                                {invoice.tvaRate === 0 && <span style={{ fontWeight: 700, color: "#556B2F" }}>TVA non applicable — art. 293 B du CGI.</span>}
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

export default InvoicePdfView;
