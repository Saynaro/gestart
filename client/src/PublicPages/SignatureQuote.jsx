import React, { useRef, useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Download, CheckCircle2, Trash2, ShieldCheck, Building2, User, CreditCard, PenTool, AlertCircle, FileText, Check, Copy } from "lucide-react";
import "./SignatureQuote.css";
import { apiFetch } from "../utils/api";
import { getApiUrl } from "../utils/config";
import { getEffectiveCustomization } from "../utils/documentCustomization";

function SignatureQuote() {
    const { token, id } = useParams();
    const activeToken = token || id;
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasSigned, setHasSigned] = useState(false);
    const [signatureSaved, setSignatureSaved] = useState(false);
    const [quote, setQuote] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isPaying, setIsPaying] = useState(false);
    const [ibanCopied, setIbanCopied] = useState(false);

    useEffect(() => {
        if (!activeToken) return;
        const fetchPublicQuote = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await apiFetch(`/v1/public/sign/quote/${activeToken}`);
                const q = res.data?.quote || res.quote || res;
                if (q) {
                    setQuote(q);
                    if (q.status === "ACCEPTED" || q.signatureUrl) {
                        setSignatureSaved(true);
                    }
                } else {
                    setError("Devis introuvable.");
                }
            } catch (err) {
                console.error("Erreur chargement devis:", err);
                setError(err.message || "Impossible de charger le devis.");
            } finally {
                setLoading(false);
            }
        };

        fetchPublicQuote();
    }, [activeToken]);

    // Canvas drawing setup
    useEffect(() => {
        if (signatureSaved) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        ctx.strokeStyle = "#0F172A";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
    }, [signatureSaved, loading]);

    const getEventCoords = (e, canvas) => {
        const rect = canvas.getBoundingClientRect();
        if (e.touches && e.touches.length > 0) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top
            };
        }
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    };

    const startDrawing = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        const coords = getEventCoords(e, canvas);
        ctx.beginPath();
        ctx.moveTo(coords.x, coords.y);
        setIsDrawing(true);
        setHasSigned(true);
    };

    const draw = (e) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        const coords = getEventCoords(e, canvas);
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const handleClear = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasSigned(false);
    };

    const handleAcceptQuote = async () => {
        if (!hasSigned) {
            alert("Veuillez apposer votre signature dans le cadre prévu.");
            return;
        }
        const canvas = canvasRef.current;
        if (!canvas) return;
        const signatureData = canvas.toDataURL("image/png");

        setIsSubmitting(true);
        try {
            await apiFetch(`/v1/public/sign/quote/${activeToken}/sign`, {
                method: "POST",
                body: JSON.stringify({ signatureData })
            });
            setSignatureSaved(true);
            setQuote(prev => ({
                ...prev,
                status: "ACCEPTED",
                signatureUrl: signatureData,
                signedAt: new Date().toISOString()
            }));
        } catch (err) {
            console.error("Erreur signature en ligne:", err.message);
            alert("Erreur lors de la signature : " + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePayQuoteStripe = async () => {
        setIsPaying(true);
        try {
            const res = await apiFetch(`/v1/public/sign/quote/${activeToken}/checkout`, {
                method: "POST"
            });
            if (res.data?.checkoutUrl) {
                window.location.href = res.data.checkoutUrl;
                return;
            }
            alert("Paiement sécurisé Stripe initialisé.");
        } catch (err) {
            console.error("Erreur Stripe checkout:", err);
            alert("Erreur lors de l'initialisation du paiement Stripe: " + (err.message || "Erreur inconnue"));
        } finally {
            setIsPaying(false);
        }
    };

    const handleCopyIban = (iban) => {
        if (!iban) return;
        navigator.clipboard.writeText(iban);
        setIbanCopied(true);
        setTimeout(() => setIbanCopied(false), 2500);
    };

    const handleDownloadPdf = () => {
        const token = activeToken || quote?.signatureToken || quote?.id;
        window.open(getApiUrl(`/v1/public/sign/quote/${token}/pdf`), "_blank");
    };

    const handlePrint = () => {
        handleDownloadPdf();
    };

    if (loading) {
        return (
            <div className="public-portal-page">
                <div className="public-loading-box">
                    <div className="portal-spinner" />
                    <p>Chargement de votre devis sécurisé...</p>
                </div>
            </div>
        );
    }

    if (error || !quote) {
        return (
            <div className="public-portal-page">
                <div className="public-error-card">
                    <AlertCircle size={48} color="#ef4444" />
                    <h2>Devis introuvable</h2>
                    <p>{error || "Le lien du devis est invalide ou a expiré."}</p>
                </div>
            </div>
        );
    }

    const company = quote.company || {};
    const client = quote.client || {};
    const lines = quote.lines || [];
    const isSigned = signatureSaved || quote.status === "ACCEPTED" || quote.status === "PAID" || quote.signatureUrl;
    const isPaid = Boolean(quote.paidAt || quote.status === "PAID");
    const computedHt = lines.reduce((acc, l) => acc + (Number(l.unitPrice || 0) * Number(l.quantity || l.qty || 1)), 0);
    const rawTotalHt = quote.amountHT !== undefined && quote.amountHT !== null ? Number(quote.amountHT) : (quote.totalHt !== undefined ? Number(quote.totalHt) : computedHt);
    const rawTotalTtc = quote.amountTTC !== undefined && quote.amountTTC !== null ? Number(quote.amountTTC) : (quote.totalTtc !== undefined ? Number(quote.totalTtc) : rawTotalHt);
    const totalTtc = rawTotalTtc.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const totalHt = rawTotalHt.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const tvaRate = quote.tvaRate !== undefined && quote.tvaRate !== null ? quote.tvaRate : (lines[0]?.tvaRate !== undefined ? lines[0].tvaRate : 20);
    const tvaAmount = Math.max(0, rawTotalTtc - rawTotalHt).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const clientDisplayName = client.firstName || client.lastName
        ? `${client.firstName || ''} ${client.lastName || ''}`.trim()
        : (client.companyName || "Client");

    const bankIban = company.settings?.bankIban || company.bankIban;
    const bankBic = company.settings?.bankBic || company.bankBic;
    const bankName = company.settings?.bankName || company.bankName;
    const custom = getEffectiveCustomization(quote);
    const primaryColor = custom.primaryColor || "#556B2F";
    const fontFamily = custom.fontFamily || "Inter, sans-serif";
    const companySignature = company.signatureUrl || company.signature || company.settings?.signatureUrl || company.settings?.signature || custom.signatureUrl;

    return (
        <div className="public-portal-page" style={{ '--primary-color': primaryColor, fontFamily: fontFamily }}>
            {/* Header */}
            <header className="public-portal-header no-print">
                <div className="header-inner">
                    <div className="header-brand-wrap">
                        {custom.showLogo && (custom.logoUrl || company.logoUrl) ? (
                            <img 
                                src={custom.logoUrl || company.logoUrl} 
                                alt="Logo" 
                                style={{ maxHeight: `${custom.logoSize || 45}px`, maxWidth: '120px', objectFit: 'contain' }} 
                            />
                        ) : (
                            <div className="company-badge-icon" style={{ backgroundColor: primaryColor, color: '#FFFFFF' }}>
                                <Building2 size={20} />
                            </div>
                        )}
                        <div>
                            <h1 className="header-company-name">{company.name || "GestArt CRM"}</h1>
                            <span className="header-doc-sub">Devis {quote.number}</span>
                        </div>
                    </div>
                    <div className="header-secure-pill">
                        <ShieldCheck size={16} color="#16a34a" />
                        <span>Signature légale certifiée</span>
                    </div>
                </div>
            </header>

            {/* Main Content (Printable A4 Sheet matching Previsualiser) */}
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
                                    DEVIS
                                </h1>
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
                                <div><strong>Date : </strong> {new Date(quote.createdAt || Date.now()).toLocaleDateString("fr-FR")}</div>
                                {custom.showDeliveryDate !== false && <div><strong>Validité : </strong> {quote.validUntil || quote.dueDate ? new Date(quote.validUntil || quote.dueDate).toLocaleDateString("fr-FR") : new Date(Date.now() + 30 * 86400000).toLocaleDateString("fr-FR")}</div>}
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
                                        <span style={{ fontSize: "0.75em", fontWeight: 700, color: primaryColor, textTransform: "uppercase", display: "block", marginBottom: "2px" }}>DEVIS POUR :</span>
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
                                        <span style={{ fontSize: "0.75em", fontWeight: 700, color: primaryColor, textTransform: "uppercase", display: "block", marginBottom: "2px" }}>DEVIS POUR :</span>
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
                                        DEVIS N° {quote.number}
                                    </div>
                                    <div style={{ fontSize: "0.88em", color: "#475569" }}>
                                        Date : <strong>{new Date(quote.createdAt || Date.now()).toLocaleDateString("fr-FR")}</strong> {custom.showDeliveryDate !== false && <>• Validité : <strong>{quote.validUntil || quote.dueDate ? new Date(quote.validUntil || quote.dueDate).toLocaleDateString("fr-FR") : new Date(Date.now() + 30 * 86400000).toLocaleDateString("fr-FR")}</strong></>}
                                    </div>
                                </div>
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
                                            DEVIS POUR :
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
                                            DEVIS POUR :
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
                                    <h1 style={{ fontSize: "1.5em", fontWeight: 700, color: "#0F172A", margin: 0, letterSpacing: "1px" }}>DEVIS</h1>
                                    <div style={{ fontSize: "0.85em", color: "#64748B", marginTop: "4px" }}>
                                        <div>N° {quote.number}</div>
                                        <div>Date : {new Date(quote.createdAt || Date.now()).toLocaleDateString("fr-FR")}</div>
                                    </div>
                                </div>
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
                                        DEVIS
                                    </h1>
                                    <table style={{ fontSize: '0.9em', marginTop: '6px', borderCollapse: 'collapse' }}>
                                        <tbody>
                                            <tr>
                                                <td style={{ padding: '2px 8px 2px 0', fontWeight: 700, color: '#0F172A' }}>Numéro :</td>
                                                <td style={{ padding: '2px 0', color: '#0F172A', fontWeight: 600 }}>{quote.number}</td>
                                            </tr>
                                            <tr>
                                                <td style={{ padding: '2px 8px 2px 0', fontWeight: 700, color: '#0F172A' }}>Date :</td>
                                                <td style={{ padding: '2px 0', color: '#475569' }}>{new Date(quote.createdAt || Date.now()).toLocaleDateString("fr-FR")}</td>
                                            </tr>
                                            {custom.showDeliveryDate !== false && (
                                                <tr>
                                                    <td style={{ padding: '2px 8px 2px 0', fontWeight: 700, color: '#0F172A' }}>Validité :</td>
                                                    <td style={{ padding: '2px 0', color: '#475569' }}>{quote.validUntil || quote.dueDate ? new Date(quote.validUntil || quote.dueDate).toLocaleDateString("fr-FR") : new Date(Date.now() + 30 * 86400000).toLocaleDateString("fr-FR")}</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
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
                                    DEVIS POUR :
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
                                    <td style={{ padding: '7px 10px', fontWeight: 600 }}>{quote.interventionType || quote.subject || "Prestation"}</td>
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
                                        <strong>TOTAL TTC :</strong>
                                    </td>
                                    <td style={{ backgroundColor: primaryColor, color: '#FFFFFF', textAlign: 'right', whiteSpace: 'nowrap', padding: '7px 10px', fontSize: '1.05em', borderRadius: '0 3px 3px 0' }}>
                                        <strong>{totalTtc} €</strong>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Signatures Dual Grid */}
                    <div style={{ display: 'flex', gap: '14px', marginBottom: '16px', flexWrap: 'wrap' }}>
                        {/* Company Signature */}
                        <div style={{ flex: '1 1 220px' }}>
                            <div style={{ fontWeight: 700, marginBottom: '4px', fontSize: '0.9em', color: '#0F172A' }}>Pour l'entreprise :</div>
                            <div style={{
                                height: '54px',
                                border: '1px dashed #CBD5E1',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '6px',
                                backgroundColor: '#FAFAF8',
                                padding: '4px'
                            }}>
                                {companySignature ? (
                                    <img src={companySignature} alt="Signature Entreprise" style={{ maxHeight: '48px', maxWidth: '90%', objectFit: 'contain' }} />
                                ) : (
                                    <span style={{ color: '#94A3B8', fontSize: '0.85em', fontStyle: 'italic' }}>{company.name}</span>
                                )}
                            </div>
                        </div>

                        {/* Client Signature */}
                        <div style={{ flex: '1 1 220px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                <span style={{ fontWeight: 700, fontSize: '0.9em', color: '#0F172A' }}>Bon pour accord / Le Client :</span>
                                {isSigned && (
                                    <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                        <CheckCircle2 size={12} /> Signé en ligne
                                    </span>
                                )}
                            </div>
                            <div style={{
                                height: '54px',
                                border: '1px dashed #CBD5E1',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '6px',
                                backgroundColor: '#FAFAF8',
                                padding: '4px'
                            }}>
                                {isSigned && (quote.signatureUrl || hasSigned) ? (
                                    <img 
                                        src={quote.signatureUrl || canvasRef.current?.toDataURL()} 
                                        alt="Signature client" 
                                        style={{ maxHeight: '48px', maxWidth: '90%', objectFit: 'contain' }} 
                                    />
                                ) : (
                                    <span style={{ color: '#94A3B8', fontSize: '0.85em', fontStyle: 'italic' }}>Cadre réservé à la signature du client</span>
                                )}
                            </div>
                            <span style={{ fontSize: '10.5px', color: '#64748B', display: 'block', marginTop: '2px' }}>
                                {isSigned ? (
                                    <>Signé le {quote.signedAt ? new Date(quote.signedAt).toLocaleDateString("fr-FR") : new Date().toLocaleDateString("fr-FR")} par {clientDisplayName}</>
                                ) : (
                                    <>Date & Signature du client</>
                                )}
                            </span>
                        </div>
                    </div>

                    {/* Footer / Legal Section (Exact match with Previsualiser) */}
                    <div style={{ fontSize: '0.85em', paddingTop: '10px', borderTop: '1px solid #E0E0E0', marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '3px', color: '#334155' }}>
                        {bankIban && (
                            <div><strong>Coordonnées bancaires (IBAN) : </strong>{bankIban}{bankBic ? ` • BIC : ${bankBic}` : ''}{bankName ? ` • ${bankName}` : ''}</div>
                        )}
                        <div><strong>Conditions de paiement : </strong>Paiement à 30 jours (Échéance le {quote.dueDate ? new Date(quote.dueDate).toLocaleDateString("fr-FR") : new Date(new Date(quote.date || quote.createdAt || Date.now()).setDate(new Date(quote.date || quote.createdAt || Date.now()).getDate() + 30)).toLocaleDateString("fr-FR")}).</div>
                        <div><strong>Validité du devis : </strong>30 jours à compter de la date d'émission (art. L. 221-5 et L. 111-1 C.conso). Devis gratuit avant exécution des travaux (art. L. 111-3 C.conso).</div>
                        <div><strong>Conditions d'exécution : </strong>Les travaux débuteront après signature du devis accompagné d'un acompte.</div>
                        <div style={{ fontStyle: 'italic', marginTop: '2px', color: '#64748B' }}>Membre d'une association agréée, le règlement par chèque est accepté.</div>
                    </div>

                    {/* INTERACTIVE SIGNATURE PAD (Screen only, hidden on print) */}
                    {!isSigned && (
                        <div className="interactive-signature-pad no-print" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px', borderTop: '1px solid #E2E8F0', paddingTop: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <PenTool size={16} color="#556B2F" /> Signer électroniquement ce devis
                                    </h4>
                                    <span style={{ fontSize: '12.5px', color: '#64748B' }}>
                                        Apposez votre signature avec votre doigt ou la souris ci-dessous :
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    className="copy-iban-btn"
                                    onClick={handleClear}
                                >
                                    <Trash2 size={13} />
                                    <span>Effacer</span>
                                </button>
                            </div>

                            <div className="signature-canvas-wrapper">
                                <canvas
                                    ref={canvasRef}
                                    className="signature-canvas"
                                    onMouseDown={startDrawing}
                                    onMouseMove={draw}
                                    onMouseUp={stopDrawing}
                                    onMouseLeave={stopDrawing}
                                    onTouchStart={startDrawing}
                                    onTouchMove={draw}
                                    onTouchEnd={stopDrawing}
                                />
                            </div>

                            <button
                                type="button"
                                className="portal-primary-pay-btn"
                                onClick={handleAcceptQuote}
                                disabled={!hasSigned || isSubmitting}
                            >
                                <Check size={18} />
                                <span>{isSubmitting ? "Enregistrement..." : "Bon pour accord — Signer le devis"}</span>
                            </button>
                        </div>
                    )}

                    {/* Post-Signature Confirmation & Download Actions (Screen only) */}
                    {isSigned && (
                        <div className="portal-actions-container no-print" style={{ marginTop: '16px' }}>
                            <div className="paid-success-banner" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '14px', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <CheckCircle2 size={32} color="#16a34a" />
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '16px', color: '#166534', fontWeight: 700 }}>Devis validé et signé avec succès !</h3>
                                        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#15803D' }}>
                                            Votre accord électronique avec mention <em>« Bon pour accord »</em> a été enregistré. Une facture officielle sera transmise pour le règlement des prestations.
                                        </p>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '6px' }}>
                                    <button
                                        type="button"
                                        className="portal-secondary-btn"
                                        onClick={handlePrint}
                                        style={{ flex: 1, backgroundColor: '#FFFFFF' }}
                                    >
                                        <Download size={16} />
                                        <span>Télécharger l'exemplaire signé (PDF)</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Bank Transfer Box (Screen only) */}
                    {bankIban && !isPaid && (
                        <div className="bank-transfer-info-box no-print">
                            <h4 className="bank-title">Coordonnées bancaires de l'entreprise :</h4>
                            <div className="iban-display-row">
                                <span className="iban-code"><strong>IBAN :</strong> {bankIban}</span>
                                <button
                                    type="button"
                                    className="copy-iban-btn"
                                    onClick={() => handleCopyIban(bankIban)}
                                >
                                    {ibanCopied ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                                    <span>{ibanCopied ? "Copié" : "Copier"}</span>
                                </button>
                            </div>
                            {bankBic && <div className="bank-line"><strong>BIC :</strong> {bankBic}</div>}
                            {bankName && <div className="bank-line"><strong>Banque :</strong> {bankName}</div>}
                            <div className="bank-ref-hint">Motif du virement : <strong>Devis {quote.number}</strong></div>
                        </div>
                    )}
                </div>
            </main>

            {/* Footer */}
            <footer className="public-portal-footer no-print">
                <p>© {new Date().getFullYear()} {company.name || "GestArt CRM"} • Tous droits réservés.</p>
                <div className="stripe-footer-brand">
                    <ShieldCheck size={14} color="#16a34a" />
                    <span>Signature électronique conforme eIDAS</span>
                </div>
            </footer>
        </div>
    );
}

export default SignatureQuote;
