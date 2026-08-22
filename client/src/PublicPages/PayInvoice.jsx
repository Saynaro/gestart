import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { CreditCard, CheckCircle2, ShieldCheck, Download, Building2, User, Calendar, FileText, AlertCircle, ArrowUpRight, Copy, Check } from "lucide-react";
import { apiFetch } from "../utils/api";
import { getApiUrl } from "../utils/config";
import { getEffectiveCustomization } from "../utils/documentCustomization";
import "./PayInvoice.css";

function PayInvoice() {
    const { token } = useParams();
    const [invoice, setInvoice] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isPaying, setIsPaying] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [ibanCopied, setIbanCopied] = useState(false);

    const [paymentOptions, setPaymentOptions] = useState(null);

    useEffect(() => {
        if (!token) return;
        const fetchInvoice = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await apiFetch(`/v1/public/pay/invoice/${token}`);
                const inv = res.data?.invoice || res.invoice || res;
                if (inv) {
                    setInvoice(inv);
                    if (res.data?.paymentOptions) {
                        setPaymentOptions(res.data.paymentOptions);
                    }
                } else {
                    setError("Facture introuvable.");
                }
            } catch (err) {
                console.error("Erreur chargement facture:", err);
                setError(err.message || "Impossible de charger la facture.");
            } finally {
                setLoading(false);
            }
        };

        fetchInvoice();
    }, [token]);

    const handlePayOnline = async () => {
        setIsPaying(true);
        try {
            const res = await apiFetch(`/v1/public/pay/invoice/${token}/checkout`, {
                method: "POST"
            });
            if (res.data?.checkoutUrl) {
                window.location.href = res.data.checkoutUrl;
                return;
            }
            alert("Paiement Stripe initialisé avec succès.");
        } catch (err) {
            console.error("Erreur Stripe checkout:", err);
            alert("Erreur lors de l'ouverture du paiement Stripe : " + (err.message || "Erreur inconnue"));
        } finally {
            setIsPaying(false);
        }
    };

    const handleCopyIban = (ibanToCopy) => {
        const val = ibanToCopy || bankIban;
        if (!val) return;
        navigator.clipboard.writeText(val);
        setIbanCopied(true);
        setTimeout(() => setIbanCopied(false), 2500);
    };

    const handleDownloadPdf = async () => {
        if (isDownloading) return;
        setIsDownloading(true);
        const targetToken = token || invoice?.paymentToken || invoice?.id;
        const pdfUrl = getApiUrl(`/v1/public/pay/invoice/${targetToken}/pdf`);

        try {
            const res = await fetch(pdfUrl);
            if (!res.ok) {
                window.open(pdfUrl, "_blank");
                return;
            }
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `Facture_${(invoice?.number || 'facture').replace(/[^a-zA-Z0-9-_]/g, '_')}${isPaid ? '_acquittee' : ''}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => window.URL.revokeObjectURL(url), 2000);
        } catch (err) {
            console.error("Erreur téléchargement PDF:", err);
            window.open(pdfUrl, "_blank");
        } finally {
            setIsDownloading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (loading) {
        return (
            <div className="public-portal-page">
                <div className="public-loading-box">
                    <div className="portal-spinner" />
                    <p>Chargement de votre facture sécurisée...</p>
                </div>
            </div>
        );
    }

    if (error || !invoice) {
        return (
            <div className="public-portal-page">
                <div className="public-error-card">
                    <AlertCircle size={48} color="#ef4444" />
                    <h2>Facture introuvable</h2>
                    <p>{error || "Le lien de paiement est invalide ou a expiré."}</p>
                </div>
            </div>
        );
    }

    const company = invoice.company || {};
    const client = invoice.client || {};
    const lines = invoice.lines || [];
    const isPaid = invoice.status === "PAID" || Boolean(invoice.paidAt);
    const computedHt = lines.reduce((acc, l) => acc + (Number(l.unitPrice || 0) * Number(l.quantity || l.qty || 1)), 0);
    const rawTotalHt = invoice.amountHT !== undefined && invoice.amountHT !== null ? Number(invoice.amountHT) : computedHt;
    const rawTotalTtc = invoice.amountTTC !== undefined && invoice.amountTTC !== null ? Number(invoice.amountTTC) : rawTotalHt;
    const totalTtc = rawTotalTtc.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const totalHt = rawTotalHt.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const tvaRate = invoice.tvaRate !== undefined && invoice.tvaRate !== null ? invoice.tvaRate : (lines[0]?.tvaRate !== undefined ? lines[0].tvaRate : 20);
    const tvaAmount = Math.max(0, rawTotalTtc - rawTotalHt).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const clientDisplayName = client.firstName || client.lastName 
        ? `${client.firstName || ''} ${client.lastName || ''}`.trim()
        : (client.companyName || "Client");

    const bankIban = company.settings?.bankIban || company.bankIban;
    const bankBic = company.settings?.bankBic || company.bankBic;
    const bankName = company.settings?.bankName || company.bankName;

    const custom = getEffectiveCustomization(invoice);
    const primaryColor = custom.primaryColor || "#556B2F";
    const fontFamily = custom.fontFamily || "Inter, sans-serif";

    return (
        <div className="public-portal-page" style={{ '--primary-color': primaryColor, fontFamily: fontFamily }}>
            {/* Top Navigation Header */}
            <header className="public-portal-header no-print">
                <div className="header-inner">
                    <div className="header-brand-wrap">
                        <div className="company-badge-icon">
                            <Building2 size={20} />
                        </div>
                        <div>
                            <h1 className="header-company-name">{company.name || "GestArt CRM"}</h1>
                            <span className="header-doc-sub">Facture {invoice.number}</span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button
                            type="button"
                            onClick={handleDownloadPdf}
                            disabled={isDownloading}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: '#FFFFFF',
                                border: '1px solid #E2E8F0',
                                padding: '6px 14px',
                                borderRadius: '20px',
                                fontSize: '13px',
                                fontWeight: 600,
                                color: '#0F172A',
                                cursor: isDownloading ? 'wait' : 'pointer',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            <Download size={14} color="#64748B" />
                            <span>{isDownloading ? "Téléchargement..." : "Télécharger PDF"}</span>
                        </button>
                        <div className="header-secure-pill">
                            <ShieldCheck size={16} color="#16a34a" />
                            <span>Paiement sécurisé</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content Area (A4 Clean Print Area matching Previsualiser) */}
            <main className="public-portal-main">
                <div
                    className="public-portal-card"
                    id="invoice-pdf-print-area"
                    style={{
                        padding: '32px',
                        backgroundColor: custom.bgColor || '#FFFFFF',
                        color: custom.textColor || '#1A1A1A',
                        fontSize: custom.fontSize || '9.5pt',
                        fontFamily: custom.fontFamily || 'Inter, sans-serif'
                    }}
                >
                    {/* ==================== STRUCTURE: BANNER ==================== */}
                    {custom.structure === "banner" && (
                        <div style={{ marginBottom: "16px" }}>
                            <div
                                style={{
                                    backgroundColor: primaryColor,
                                    color: "#FFFFFF",
                                    padding: "16px 20px",
                                    margin: "-32px -32px 14px -32px",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center"
                                }}
                            >
                                {custom.logoPosition !== "right" ? (
                                    <>
                                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                            {custom.showLogo !== false && (custom.logoUrl || company.logoUrl) && (
                                                <img
                                                    src={custom.logoUrl || company.logoUrl}
                                                    alt="Logo"
                                                    style={{
                                                        height: `${custom.logoSize || 45}px`,
                                                        maxWidth: "140px",
                                                        objectFit: "contain",
                                                        background: "rgba(255,255,255,0.2)",
                                                        padding: "2px 6px",
                                                        borderRadius: "4px"
                                                    }}
                                                />
                                            )}
                                            <h2 style={{ fontSize: "1.35em", fontWeight: 800, color: "#FFFFFF", margin: 0 }}>
                                                {company.name || "Entreprise"}
                                            </h2>
                                        </div>
                                        <h1 style={{ fontSize: "1.8em", fontWeight: 800, color: "#FFFFFF", margin: 0, letterSpacing: "2px" }}>
                                            FACTURE
                                        </h1>
                                    </>
                                ) : (
                                    <>
                                        <h1 style={{ fontSize: "1.8em", fontWeight: 800, color: "#FFFFFF", margin: 0, letterSpacing: "2px" }}>
                                            FACTURE
                                        </h1>
                                        <div style={{ display: "flex", alignItems: "center", gap: "12px", textAlign: "right" }}>
                                            <h2 style={{ fontSize: "1.35em", fontWeight: 800, color: "#FFFFFF", margin: 0 }}>
                                                {company.name || "Entreprise"}
                                            </h2>
                                            {custom.showLogo !== false && (custom.logoUrl || company.logoUrl) && (
                                                <img
                                                    src={custom.logoUrl || company.logoUrl}
                                                    alt="Logo"
                                                    style={{
                                                        height: `${custom.logoSize || 45}px`,
                                                        maxWidth: "140px",
                                                        objectFit: "contain",
                                                        background: "rgba(255,255,255,0.2)",
                                                        padding: "2px 6px",
                                                        borderRadius: "4px"
                                                    }}
                                                />
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
                                <div><strong>Numéro : </strong> {invoice.number}</div>
                                <div><strong>Date : </strong> {new Date(invoice.issuedAt || invoice.date || Date.now()).toLocaleDateString("fr-FR")}</div>
                                {custom.showDeliveryDate !== false && <div><strong>Échéance : </strong> {invoice.dueAt ? new Date(invoice.dueAt).toLocaleDateString("fr-FR") : "À réception"}</div>}
                            </div>

                            {custom.clientBoxPosition === "right" ? (
                                <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", marginBottom: "14px" }}>
                                    <div style={{ flex: 1, fontSize: "0.9em", lineHeight: 1.4, opacity: 0.85 }}>
                                        {custom.showAddress !== false && company.address && <div>{company.address}</div>}
                                        {custom.showSiret !== false && company.siret && <div>SIRET : {company.siret}</div>}
                                        {custom.showPhone !== false && company.phone && <div>Tél : {company.phone}</div>}
                                        {custom.showEmail !== false && company.email && <div>Email : {company.email}</div>}
                                    </div>
                                    <div style={{ flex: 1, backgroundColor: "#FAFAF8", border: "1px solid #EAEAE6", padding: "10px 14px", borderRadius: "6px" }}>
                                        <span style={{ fontSize: "0.75em", fontWeight: 700, color: primaryColor, textTransform: "uppercase", display: "block", marginBottom: "2px" }}>FACTURÉ À :</span>
                                        <h3 style={{ fontSize: "1.05em", fontWeight: 700, margin: "0 0 2px 0", color: "#1A1A1A" }}>{clientDisplayName}</h3>
                                        {client.address && <div style={{ fontSize: "0.88em", color: "#475569" }}>{client.address}</div>}
                                        {client.phone && <div style={{ fontSize: "0.88em", color: "#475569" }}>Tél : {client.phone}</div>}
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div style={{ fontSize: "0.9em", lineHeight: 1.4, opacity: 0.85, marginBottom: "10px" }}>
                                        {custom.showAddress !== false && company.address && <div>{company.address}</div>}
                                        {custom.showSiret !== false && company.siret && <div>SIRET : {company.siret}</div>}
                                        {custom.showPhone !== false && company.phone && <div>Tél : {company.phone}</div>}
                                        {custom.showEmail !== false && company.email && <div>Email : {company.email}</div>}
                                    </div>
                                    <div style={{ backgroundColor: "#FAFAF8", border: "1px solid #EAEAE6", padding: "10px 14px", borderRadius: "6px", marginBottom: "14px" }}>
                                        <span style={{ fontSize: "0.75em", fontWeight: 700, color: primaryColor, textTransform: "uppercase", display: "block", marginBottom: "2px" }}>FACTURÉ À :</span>
                                        <h3 style={{ fontSize: "1.05em", fontWeight: 700, margin: "0 0 2px 0", color: "#1A1A1A" }}>{clientDisplayName}</h3>
                                        {client.address && <div style={{ fontSize: "0.88em", color: "#475569" }}>{client.address}</div>}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* ==================== STRUCTURE: MODERN ==================== */}
                    {custom.structure === "modern" && (
                        <div style={{ marginBottom: "16px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                                {custom.logoPosition !== "right" ? (
                                    <>
                                        <div>
                                            {custom.showLogo !== false && (custom.logoUrl || company.logoUrl) && (
                                                <img
                                                    src={custom.logoUrl || company.logoUrl}
                                                    alt="Logo"
                                                    style={{ height: `${custom.logoSize || 45}px`, maxWidth: "180px", objectFit: "contain", marginBottom: "4px" }}
                                                />
                                            )}
                                            <h2 style={{ fontSize: "1.35em", fontWeight: 800, color: primaryColor, margin: 0 }}>
                                                {company.name || "Entreprise"}
                                            </h2>
                                        </div>
                                        <div style={{ textAlign: "right" }}>
                                            <div style={{ display: "inline-block", backgroundColor: primaryColor, color: "#FFFFFF", padding: "6px 16px", borderRadius: "20px", fontWeight: 800, fontSize: "1.05em", letterSpacing: "0.5px", marginBottom: "4px" }}>
                                                FACTURE N° {invoice.number}
                                            </div>
                                            <div style={{ fontSize: "0.88em", color: "#475569" }}>
                                                Date : <strong>{new Date(invoice.issuedAt || invoice.date || Date.now()).toLocaleDateString("fr-FR")}</strong> {custom.showDeliveryDate !== false && <>• Échéance : <strong>{invoice.dueAt ? new Date(invoice.dueAt).toLocaleDateString("fr-FR") : "À réception"}</strong></>}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div style={{ textAlign: "left" }}>
                                            <div style={{ display: "inline-block", backgroundColor: primaryColor, color: "#FFFFFF", padding: "6px 16px", borderRadius: "20px", fontWeight: 800, fontSize: "1.05em", letterSpacing: "0.5px", marginBottom: "4px" }}>
                                                FACTURE N° {invoice.number}
                                            </div>
                                            <div style={{ fontSize: "0.88em", color: "#475569" }}>
                                                Date : <strong>{new Date(invoice.issuedAt || invoice.date || Date.now()).toLocaleDateString("fr-FR")}</strong> {custom.showDeliveryDate !== false && <>• Échéance : <strong>{invoice.dueAt ? new Date(invoice.dueAt).toLocaleDateString("fr-FR") : "À réception"}</strong></>}
                                            </div>
                                        </div>
                                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", textAlign: "right" }}>
                                            {custom.showLogo !== false && (custom.logoUrl || company.logoUrl) && (
                                                <img
                                                    src={custom.logoUrl || company.logoUrl}
                                                    alt="Logo"
                                                    style={{ height: `${custom.logoSize || 45}px`, maxWidth: "180px", objectFit: "contain", marginBottom: "4px" }}
                                                />
                                            )}
                                            <h2 style={{ fontSize: "1.35em", fontWeight: 800, color: primaryColor, margin: 0 }}>
                                                {company.name || "Entreprise"}
                                            </h2>
                                        </div>
                                    </>
                                )}
                            </div>

                            {custom.clientBoxPosition === "right" ? (
                                <div style={{ display: "flex", gap: "14px", marginBottom: "14px" }}>
                                    <div style={{ flex: 1, backgroundColor: "#FAFAF8", borderLeft: `4px solid ${primaryColor}`, padding: "10px 14px", borderRadius: "6px", fontSize: "0.9em", lineHeight: 1.4 }}>
                                        <span style={{ fontSize: "0.78em", fontWeight: 700, color: primaryColor, textTransform: "uppercase", display: "block", marginBottom: "2px" }}>
                                            Émetteur
                                        </span>
                                        <div style={{ fontWeight: 700, color: "#1A1A1A" }}>{company.name}</div>
                                        {custom.showAddress !== false && company.address && <div>{company.address}</div>}
                                        {custom.showSiret !== false && company.siret && <div>SIRET : {company.siret}</div>}
                                        {custom.showPhone !== false && company.phone && <div>Tél : {company.phone}</div>}
                                        {custom.showEmail !== false && company.email && <div>Email : {company.email}</div>}
                                    </div>

                                    <div style={{ flex: 1, backgroundColor: "#F8FAFC", border: `1px solid #E2E8F0`, borderLeft: `4px solid ${primaryColor}`, padding: "10px 14px", borderRadius: "6px", fontSize: "0.9em", lineHeight: 1.4 }}>
                                        <span style={{ fontSize: "0.78em", fontWeight: 700, color: primaryColor, textTransform: "uppercase", display: "block", marginBottom: "2px" }}>
                                            FACTURÉ À :
                                        </span>
                                        <div style={{ fontWeight: 700, fontSize: "1.05em", color: "#1A1A1A" }}>{clientDisplayName}</div>
                                        {client.address && <div>{client.address}</div>}
                                        {client.phone && <div>Tél : {client.phone}</div>}
                                        {client.email && <div>Email : {client.email}</div>}
                                    </div>
                                </div>
                            ) : (
                                <div style={{ marginBottom: "14px" }}>
                                    <div style={{ backgroundColor: "#FAFAF8", borderLeft: `4px solid ${primaryColor}`, padding: "10px 14px", borderRadius: "6px", fontSize: "0.9em", lineHeight: 1.4, marginBottom: "10px" }}>
                                        <span style={{ fontSize: "0.78em", fontWeight: 700, color: primaryColor, textTransform: "uppercase", display: "block", marginBottom: "2px" }}>
                                            Émetteur
                                        </span>
                                        <div style={{ fontWeight: 700, color: "#1A1A1A" }}>{company.name}</div>
                                        {custom.showAddress !== false && company.address && <div>{company.address}</div>}
                                        {custom.showSiret !== false && company.siret && <div>SIRET : {company.siret}</div>}
                                        {custom.showPhone !== false && company.phone && <div>Tél : {company.phone}</div>}
                                    </div>

                                    <div style={{ backgroundColor: "#F8FAFC", border: `1px solid #E2E8F0`, borderLeft: `4px solid ${primaryColor}`, padding: "10px 14px", borderRadius: "6px", fontSize: "0.9em", lineHeight: 1.4 }}>
                                        <span style={{ fontSize: "0.78em", fontWeight: 700, color: primaryColor, textTransform: "uppercase", display: "block", marginBottom: "2px" }}>
                                            FACTURÉ À :
                                        </span>
                                        <div style={{ fontWeight: 700, fontSize: "1.05em", color: "#1A1A1A" }}>{clientDisplayName}</div>
                                        {client.address && <div>{client.address}</div>}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}


                    {/* ==================== STRUCTURE: MINIMAL ==================== */}
                    {custom.structure === "minimal" && (
                        <div style={{ marginBottom: "16px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: "12px", borderBottom: "1px solid #E2E8F0", marginBottom: "12px" }}>
                                {custom.logoPosition !== "right" ? (
                                    <>
                                        <div>
                                            {custom.showLogo !== false && (custom.logoUrl || company.logoUrl) && (
                                                <img src={custom.logoUrl || company.logoUrl} alt="Logo" style={{ height: "36px", objectFit: "contain", marginBottom: "6px" }} />
                                            )}
                                            <h2 style={{ fontSize: "1.2em", fontWeight: 700, color: "#0F172A", margin: 0 }}>{company.name || "Entreprise"}</h2>
                                            <div style={{ fontSize: "0.85em", color: "#64748B", marginTop: "4px", lineHeight: 1.35 }}>
                                                {custom.showAddress !== false && company.address && <div>{company.address}</div>}
                                                {custom.showSiret !== false && company.siret && <div>SIRET : {company.siret}</div>}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: "right" }}>
                                            <h1 style={{ fontSize: "1.5em", fontWeight: 700, color: "#0F172A", margin: 0, letterSpacing: "1px" }}>FACTURE</h1>
                                            <div style={{ fontSize: "0.85em", color: "#64748B", marginTop: "4px" }}>
                                                <div>N° {invoice.number}</div>
                                                <div>Date : {new Date(invoice.issuedAt || invoice.date || Date.now()).toLocaleDateString("fr-FR")}</div>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div style={{ textAlign: "left" }}>
                                            <h1 style={{ fontSize: "1.5em", fontWeight: 700, color: "#0F172A", margin: 0, letterSpacing: "1px" }}>FACTURE</h1>
                                            <div style={{ fontSize: "0.85em", color: "#64748B", marginTop: "4px" }}>
                                                <div>N° {invoice.number}</div>
                                                <div>Date : {new Date(invoice.issuedAt || invoice.date || Date.now()).toLocaleDateString("fr-FR")}</div>
                                            </div>
                                        </div>
                                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", textAlign: "right" }}>
                                            {custom.showLogo !== false && (custom.logoUrl || company.logoUrl) && (
                                                <img src={custom.logoUrl || company.logoUrl} alt="Logo" style={{ height: "36px", objectFit: "contain", marginBottom: "6px" }} />
                                            )}
                                            <h2 style={{ fontSize: "1.2em", fontWeight: 700, color: "#0F172A", margin: 0 }}>{company.name || "Entreprise"}</h2>
                                            <div style={{ fontSize: "0.85em", color: "#64748B", marginTop: "4px", lineHeight: 1.35 }}>
                                                {custom.showAddress !== false && company.address && <div>{company.address}</div>}
                                                {custom.showSiret !== false && company.siret && <div>SIRET : {company.siret}</div>}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div style={{ padding: "8px 0", marginBottom: "12px" }}>
                                <span style={{ fontSize: "0.75em", fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", display: "block" }}>DESTINATAIRE</span>
                                <div style={{ fontSize: "1em", fontWeight: 700, color: "#0F172A", marginTop: "2px" }}>{clientDisplayName}</div>
                                {client.address && <div style={{ fontSize: "0.88em", color: "#64748B" }}>{client.address}</div>}
                            </div>
                        </div>
                    )}

                    {/* ==================== STRUCTURE: CLASSIC ==================== */}
                    {(!custom.structure || custom.structure === "classic") && (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                {custom.logoPosition !== 'right' ? (
                                    <>
                                        <div style={{ flex: 1 }}>
                                            {custom.showLogo !== false && (custom.logoUrl || company.logoUrl) && (
                                                <img
                                                    src={custom.logoUrl || company.logoUrl}
                                                    alt="Logo"
                                                    style={{
                                                        maxHeight: `${custom.logoSize || 45}px`,
                                                        maxWidth: `${(custom.logoSize || 45) * 2.5}px`,
                                                        objectFit: 'contain',
                                                        marginBottom: '8px'
                                                    }}
                                                />
                                            )}
                                            <h2 style={{ fontSize: '1.3em', fontWeight: 800, color: primaryColor, margin: 0 }}>
                                                {company.name || "Entreprise"}
                                            </h2>
                                            <div style={{ fontSize: '0.9em', color: '#475569', lineHeight: 1.4, marginTop: '4px' }}>
                                                {custom.showAddress !== false && company.address && <div>{company.address}</div>}
                                                {custom.showAddress !== false && (company.postalCode || company.city) && <div>{company.postalCode} {company.city}</div>}
                                                {custom.showSiret !== false && company.siret && <div>SIRET : {company.siret}</div>}
                                                {custom.showPhone !== false && company.phone && <div>Tél : {company.phone}</div>}
                                                {custom.showEmail !== false && company.email && <div>Email : {company.email}</div>}
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', textAlign: 'right' }}>
                                            <h1 style={{ fontSize: '2em', color: primaryColor, margin: 0, fontWeight: 800, letterSpacing: '0.5px' }}>
                                                FACTURE
                                            </h1>
                                            <table style={{ fontSize: '0.9em', marginTop: '6px', borderCollapse: 'collapse' }}>
                                                <tbody>
                                                    <tr>
                                                        <td style={{ padding: '2px 8px 2px 0', fontWeight: 700, color: '#0F172A' }}>Numéro :</td>
                                                        <td style={{ padding: '2px 0', color: '#0F172A', fontWeight: 600 }}>{invoice.number}</td>
                                                    </tr>
                                                    <tr>
                                                        <td style={{ padding: '2px 8px 2px 0', fontWeight: 700, color: '#0F172A' }}>Date :</td>
                                                        <td style={{ padding: '2px 0', color: '#475569' }}>{new Date(invoice.issuedAt || invoice.date || Date.now()).toLocaleDateString("fr-FR")}</td>
                                                    </tr>
                                                    {custom.showDeliveryDate !== false && (
                                                        <tr>
                                                            <td style={{ padding: '2px 8px 2px 0', fontWeight: 700, color: '#0F172A' }}>Échéance :</td>
                                                            <td style={{ padding: '2px 0', color: '#475569' }}>{invoice.dueAt ? new Date(invoice.dueAt).toLocaleDateString("fr-FR") : "À réception"}</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
                                            <h1 style={{ fontSize: '2em', color: primaryColor, margin: 0, fontWeight: 800, letterSpacing: '0.5px' }}>
                                                FACTURE
                                            </h1>
                                            <table style={{ fontSize: '0.9em', marginTop: '6px', borderCollapse: 'collapse' }}>
                                                <tbody>
                                                    <tr>
                                                        <td style={{ padding: '2px 8px 2px 0', fontWeight: 700, color: '#0F172A' }}>Numéro :</td>
                                                        <td style={{ padding: '2px 0', color: '#0F172A', fontWeight: 600 }}>{invoice.number}</td>
                                                    </tr>
                                                    <tr>
                                                        <td style={{ padding: '2px 8px 2px 0', fontWeight: 700, color: '#0F172A' }}>Date :</td>
                                                        <td style={{ padding: '2px 0', color: '#475569' }}>{new Date(invoice.issuedAt || invoice.date || Date.now()).toLocaleDateString("fr-FR")}</td>
                                                    </tr>
                                                    {custom.showDeliveryDate !== false && (
                                                        <tr>
                                                            <td style={{ padding: '2px 8px 2px 0', fontWeight: 700, color: '#0F172A' }}>Échéance :</td>
                                                            <td style={{ padding: '2px 0', color: '#475569' }}>{invoice.dueAt ? new Date(invoice.dueAt).toLocaleDateString("fr-FR") : "À réception"}</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>

                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', textAlign: 'right' }}>
                                            {custom.showLogo !== false && (custom.logoUrl || company.logoUrl) && (
                                                <img
                                                    src={custom.logoUrl || company.logoUrl}
                                                    alt="Logo"
                                                    style={{
                                                        maxHeight: `${custom.logoSize || 45}px`,
                                                        maxWidth: `${(custom.logoSize || 45) * 2.5}px`,
                                                        objectFit: 'contain',
                                                        marginBottom: '8px'
                                                    }}
                                                />
                                            )}
                                            <h2 style={{ fontSize: '1.3em', fontWeight: 800, color: primaryColor, margin: 0 }}>
                                                {company.name || "Entreprise"}
                                            </h2>
                                            <div style={{ fontSize: '0.9em', color: '#475569', lineHeight: 1.4, marginTop: '4px' }}>
                                                {custom.showAddress !== false && company.address && <div>{company.address}</div>}
                                                {custom.showAddress !== false && (company.postalCode || company.city) && <div>{company.postalCode} {company.city}</div>}
                                                {custom.showSiret !== false && company.siret && <div>SIRET : {company.siret}</div>}
                                                {custom.showPhone !== false && company.phone && <div>Tél : {company.phone}</div>}
                                                {custom.showEmail !== false && company.email && <div>Email : {company.email}</div>}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Client Box */}
                            <div style={{
                                backgroundColor: '#FAFAF8',
                                border: '1px solid #EAEAE6',
                                padding: '10px 14px',
                                borderRadius: '6px',
                                marginBottom: '16px',
                                textAlign: 'left',
                                ...(custom.clientBoxPosition === "right" ? { maxWidth: "300px", marginLeft: "auto" } : {})
                            }}>
                                <span style={{ fontSize: '0.78em', fontWeight: 700, letterSpacing: '0.5px', color: primaryColor, textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                                    FACTURÉ À :
                                </span>
                                <h3 style={{ fontSize: '1.1em', fontWeight: 700, margin: '0 0 2px 0', color: '#1A1A1A', lineHeight: 1.3 }}>
                                    {clientDisplayName}
                                </h3>
                                {client.address && (
                                    <div style={{ fontSize: '0.92em', color: '#475569', lineHeight: 1.35 }}>{client.address}</div>
                                )}
                                {client.phone && (
                                    <div style={{ fontSize: '0.92em', color: '#475569', lineHeight: 1.35 }}>Tél : {client.phone}</div>
                                )}
                                {client.email && (
                                    <div style={{ fontSize: '0.92em', color: '#475569', lineHeight: 1.35 }}>Email : {client.email}</div>
                                )}
                            </div>
                        </>
                    )}

                    {/* Items Table */}
                    <table style={{ fontSize: '0.95em', marginBottom: '16px', width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ backgroundColor: primaryColor, color: '#FFFFFF' }}>
                            <tr style={{ backgroundColor: primaryColor, color: '#FFFFFF' }}>
                                <th style={{ backgroundColor: primaryColor, color: '#FFFFFF', textAlign: 'left', padding: '7px 10px', borderRadius: '3px 0 0 3px' }}>Description</th>
                                <th style={{ backgroundColor: primaryColor, color: '#FFFFFF', textAlign: 'center', width: '50px', padding: '7px 6px', whiteSpace: 'nowrap' }}>Qté</th>
                                <th style={{ backgroundColor: primaryColor, color: '#FFFFFF', textAlign: 'right', width: '90px', padding: '7px 10px', whiteSpace: 'nowrap' }}>Unit. HT</th>
                                <th style={{ backgroundColor: primaryColor, color: '#FFFFFF', textAlign: 'right', width: '95px', padding: '7px 10px', borderRadius: '0 3px 3px 0', whiteSpace: 'nowrap' }}>Total HT</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(lines && lines.length > 0) ? (
                                lines.map((line, idx) => {
                                    const q = Number(line.quantity || line.qty || 1);
                                    const p = Number(line.unitPrice) || 0;
                                    return (
                                        <tr key={idx} style={{ borderBottom: '1px solid #EAEAE6' }}>
                                            <td style={{ padding: '7px 10px' }}>
                                                <div style={{ fontWeight: 600, color: '#1E293B' }}>{line.description || 'Prestation'}</div>
                                                {line.reference && <div style={{ fontSize: '0.78em', color: '#64748B' }}>Réf: {line.reference}</div>}
                                            </td>
                                            <td style={{ textAlign: 'center', padding: '7px 6px', color: '#334155' }}>{q}</td>
                                            <td style={{ textAlign: 'right', padding: '7px 10px', color: '#334155' }}>{p.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</td>
                                            <td style={{ textAlign: 'right', padding: '7px 10px', fontWeight: 600, color: '#1E293B' }}>{(p * q).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr style={{ borderBottom: '1px solid #EAEAE6' }}>
                                    <td style={{ padding: '7px 10px', fontWeight: 600 }}>{invoice.interventionType || invoice.subject || "Prestation"}</td>
                                    <td style={{ textAlign: 'center', padding: '7px 6px' }}>1</td>
                                    <td style={{ textAlign: 'right', padding: '7px 10px' }}>{(Number(rawTotalHt) || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</td>
                                    <td style={{ textAlign: 'right', padding: '7px 10px', fontWeight: 600 }}>{(Number(rawTotalHt) || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* Summary Block */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                        <table style={{ fontSize: '0.95em', width: 'auto', minWidth: '200pt', borderCollapse: 'collapse' }}>
                            <tbody>
                                <tr>
                                    <td style={{ whiteSpace: 'nowrap', padding: '4px 8px', color: '#475569' }}>Sous-total HT :</td>
                                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap', padding: '4px 8px', fontWeight: 600, color: '#0F172A' }}>{totalHt} €</td>
                                </tr>
                                <tr>
                                    <td style={{ whiteSpace: 'nowrap', padding: '4px 8px', color: '#475569' }}>TVA ({tvaRate}%) :</td>
                                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap', padding: '4px 8px', fontWeight: 600, color: '#0F172A' }}>{tvaAmount} €</td>
                                </tr>
                                <tr style={{ backgroundColor: primaryColor, color: '#FFFFFF', fontWeight: 700 }}>
                                    <td style={{ backgroundColor: primaryColor, color: '#FFFFFF', whiteSpace: 'nowrap', padding: '7px 10px', fontSize: '1.05em', borderRadius: '3px 0 0 3px' }}>
                                        <strong>Net à payer TTC :</strong>
                                    </td>
                                    <td style={{ backgroundColor: primaryColor, color: '#FFFFFF', textAlign: 'right', whiteSpace: 'nowrap', padding: '7px 10px', fontSize: '1.05em', borderRadius: '0 3px 3px 0' }}>
                                        <strong>{totalTtc} € TTC</strong>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Signatures Section */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', marginBottom: '16px', marginTop: '16px' }}>
                        {/* Company Signature */}
                        <div style={{ width: '100%', maxWidth: '230px' }}>
                            <div style={{ fontWeight: 700, marginBottom: '4px', fontSize: '0.9em', color: '#0F172A' }}>Pour l'entreprise :</div>
                            <div style={{
                                height: '54px',
                                border: '1px dashed #DDD',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '6px',
                                backgroundColor: '#FAFAF8',
                                padding: '4px'
                            }}>
                                {(company.signatureUrl || company.signature || company.settings?.signatureUrl || custom.signatureUrl) ? (
                                    <img 
                                        src={company.signatureUrl || company.signature || company.settings?.signatureUrl || custom.signatureUrl} 
                                        alt="Signature Entreprise" 
                                        style={{ maxHeight: '48px', maxWidth: '90%', objectFit: 'contain' }} 
                                    />
                                ) : (
                                    <span style={{ color: '#888', fontSize: '0.85em', fontStyle: 'italic' }}>{company.name}</span>
                                )}
                            </div>
                        </div>

                        {/* Paid Stamp Minimalist */}
                        {isPaid && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'flex-end',
                                justifyContent: 'flex-end',
                                flex: 1
                            }}>
                                <div style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    color: '#16a34a',
                                    fontWeight: 700,
                                    fontSize: '12px'
                                }}>
                                    <CheckCircle2 size={15} color="#16a34a" />
                                    <span>FACTURE ACQUITTÉE — Réglée le {invoice.paidAt ? new Date(invoice.paidAt).toLocaleDateString("fr-FR") : new Date().toLocaleDateString("fr-FR")} ({invoice.paymentMethod || 'Carte'})</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer / Legal Section (Exact match with Previsualiser) */}
                    <div style={{ fontSize: '0.85em', paddingTop: '10px', borderTop: '1px solid #E0E0E0', marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '3px', color: '#334155' }}>
                        {bankIban && (
                            <div><strong>Coordonnées bancaires (IBAN) : </strong>{bankIban}{bankBic ? ` • BIC : ${bankBic}` : ''}{bankName ? ` • ${bankName}` : ''}</div>
                        )}
                        <div><strong>Conditions de paiement : </strong>Paiement à 30 jours (Échéance le {invoice.dueAt ? new Date(invoice.dueAt).toLocaleDateString("fr-FR") : "À réception"}).</div>
                        <div><strong>Pénalités de retard : </strong>En cas de retard de paiement, application d'un taux d'intérêt égal au taux de la BCE majoré de 10 points de pourcentage.</div>
                        <div><strong>Indemnité forfaitaire pour frais de recouvrement : </strong>40 € dus de plein droit par tout professionnel.</div>
                        <div style={{ fontStyle: 'italic', marginTop: '2px', color: '#64748B' }}>Membre d'une association agréée, le règlement par chèque est accepté.</div>
                    </div>

                    {/* Screen Actions (Hidden during print) */}
                    <div className="portal-actions-container no-print">
                        {isPaid ? (
                            <div className="paid-success-banner" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <CheckCircle2 size={24} color="#16a34a" />
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: "15px", color: "#16a34a" }}>Facture acquittée et archivée</div>
                                        <div style={{ fontSize: "12px", color: "#64748B" }}>
                                            Réglée le {invoice.paidAt ? new Date(invoice.paidAt).toLocaleDateString("fr-FR") : new Date().toLocaleDateString("fr-FR")}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className="portal-secondary-btn"
                                    onClick={handleDownloadPdf}
                                    disabled={isDownloading}
                                    style={{ width: 'auto', backgroundColor: '#FFFFFF', cursor: isDownloading ? 'wait' : 'pointer' }}
                                >
                                    <Download size={16} />
                                    <span>{isDownloading ? "Téléchargement..." : "Télécharger le reçu (PDF)"}</span>
                                </button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                
                                {/* Option A : Paiement Stripe Carte Bancaire */}
                                {(paymentOptions?.stripeEnabled !== false && (company.stripeAccountId || company.onlinePaymentEnabled || invoice.stripeEnabled)) && (
                                    <div style={{
                                        backgroundColor: '#0F172A',
                                        color: '#FFFFFF',
                                        padding: '20px',
                                        borderRadius: '12px',
                                        border: '1px solid #334155'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                                            <div style={{ fontWeight: 700, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <CreditCard size={18} style={{ color: '#635BFF' }} />
                                                <span>Paiement sécurisé par carte bancaire (Stripe)</span>
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#94A3B8' }}>
                                                Protection 3D-Secure 256 bits
                                            </div>
                                        </div>

                                        {paymentOptions?.feeBreakdown?.bearer === "CLIENT" && paymentOptions?.feeBreakdown?.feeAmount > 0 && (
                                            <div style={{
                                                backgroundColor: '#1E293B',
                                                padding: '10px 14px',
                                                borderRadius: '8px',
                                                fontSize: '12.5px',
                                                color: '#CBD5E1',
                                                marginBottom: '14px',
                                                display: 'flex',
                                                justifyContent: 'space-between'
                                            }}>
                                                <span>Facture : <strong>{paymentOptions.feeBreakdown.invoiceAmount.toFixed(2)} €</strong> + Frais en ligne : <strong>{paymentOptions.feeBreakdown.feeAmount.toFixed(2)} €</strong></span>
                                                <span style={{ color: '#A3E635', fontWeight: 700 }}>Total : {paymentOptions.feeBreakdown.totalAmount.toFixed(2)} €</span>
                                            </div>
                                        )}

                                        <button
                                            type="button"
                                            className="portal-primary-pay-btn"
                                            onClick={handlePayOnline}
                                            disabled={isPaying}
                                            style={{
                                                width: '100%',
                                                backgroundColor: '#635BFF',
                                                color: '#FFFFFF',
                                                padding: '14px',
                                                borderRadius: '8px',
                                                border: 'none',
                                                fontWeight: 700,
                                                fontSize: '15px',
                                                cursor: isPaying ? 'wait' : 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px'
                                            }}
                                        >
                                            <CreditCard size={18} />
                                            <span>
                                                {isPaying
                                                    ? "Redirection vers Stripe..."
                                                    : `Payer ${paymentOptions?.feeBreakdown?.bearer === "CLIENT" ? paymentOptions.feeBreakdown.totalAmount.toFixed(2) : totalTtc} € par carte en ligne`}
                                            </span>
                                        </button>
                                    </div>
                                )}

                                {/* Séparateur si les deux méthodes sont disponibles */}
                                {(paymentOptions?.stripeEnabled !== false && (company.stripeAccountId || company.onlinePaymentEnabled)) && (bankIban || paymentOptions?.bankDetails?.iban) && (
                                    <div style={{ textAlign: 'center', color: '#64748B', fontWeight: 700, fontSize: '12px', letterSpacing: '0.05em' }}>
                                        — OU PAR VIREMENT BANCAIRE DIRECT —
                                    </div>
                                )}

                                {/* Option B : Virement bancaire */}
                                {(bankIban || paymentOptions?.bankDetails?.iban) && (
                                    <div style={{
                                        backgroundColor: '#FAFAF8',
                                        border: '1px solid #EAEAE6',
                                        padding: '18px',
                                        borderRadius: '12px'
                                    }}>
                                        <div style={{ fontWeight: 700, fontSize: '14.5px', color: '#1A1A1A', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Building2 size={18} style={{ color: primaryColor }} />
                                            <span>Coordonnées bancaires pour virement</span>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', fontSize: '13px', color: '#334155' }}>
                                            <div>
                                                <span style={{ color: '#64748B', display: 'block', fontSize: '11.5px' }}>Titulaire du compte :</span>
                                                <strong style={{ color: '#0F172A' }}>{paymentOptions?.bankDetails?.accountOwner || company.settings?.bankAccountOwner || company.name}</strong>
                                            </div>
                                            <div>
                                                <span style={{ color: '#64748B', display: 'block', fontSize: '11.5px' }}>IBAN :</span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <strong style={{ fontFamily: 'monospace', color: '#0F172A' }}>{paymentOptions?.bankDetails?.iban || bankIban}</strong>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopyIban(paymentOptions?.bankDetails?.iban || bankIban)}
                                                        title="Copier l'IBAN"
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: ibanCopied ? '#16a34a' : '#64748B', padding: '2px' }}
                                                    >
                                                        {ibanCopied ? <Check size={15} /> : <Copy size={15} />}
                                                    </button>
                                                </div>
                                            </div>
                                            <div>
                                                <span style={{ color: '#64748B', display: 'block', fontSize: '11.5px' }}>BIC / SWIFT :</span>
                                                <strong style={{ fontFamily: 'monospace', color: '#0F172A' }}>{paymentOptions?.bankDetails?.bic || bankBic || '—'}</strong>
                                            </div>
                                            <div>
                                                <span style={{ color: '#64748B', display: 'block', fontSize: '11.5px' }}>Référence obligatoire :</span>
                                                <strong style={{ backgroundColor: '#E2E8F0', padding: '2px 6px', borderRadius: '4px', color: '#0F172A' }}>
                                                    {invoice.number}
                                                </strong>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Boutons Téléchargement et Impression */}
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button
                                        type="button"
                                        className="portal-secondary-btn"
                                        onClick={handleDownloadPdf}
                                        disabled={isDownloading}
                                        style={{ flex: 1, cursor: isDownloading ? 'wait' : 'pointer' }}
                                    >
                                        <Download size={16} />
                                        <span>{isDownloading ? "Téléchargement..." : "Télécharger la facture (PDF)"}</span>
                                    </button>
                                    <button
                                        type="button"
                                        className="portal-secondary-btn"
                                        onClick={handlePrint}
                                        style={{ width: 'auto' }}
                                    >
                                        <FileText size={16} />
                                        <span>Imprimer</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="public-portal-footer no-print">
                <p>© {new Date().getFullYear()} {company.name || "GestArt CRM"} • Tous droits réservés.</p>
                <div className="stripe-footer-brand">
                    <ShieldCheck size={14} color="#16a34a" />
                    <span>Transactions chiffrées & certifiées SSL</span>
                </div>
            </footer>
        </div>
    );
}

export default PayInvoice;
