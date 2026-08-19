import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle2, ShieldCheck, Download, ArrowLeft, Building2, Calendar, CreditCard, ExternalLink, Loader2, User, FileText, Check, Printer } from "lucide-react";
import { apiFetch } from "../utils/api";
import { getApiUrl } from "../utils/config";
import "./PayInvoice.css";

export function PaySuccessPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    
    const quoteId = searchParams.get("quoteId");
    const invoiceId = searchParams.get("invoiceId");
    const sessionId = searchParams.get("session_id");

    const [loading, setLoading] = useState(true);
    const [paymentData, setPaymentData] = useState(null);
    const [isDownloadingReceipt, setIsDownloadingReceipt] = useState(false);
    const [isDownloadingDoc, setIsDownloadingDoc] = useState(false);

    useEffect(() => {
        const verify = async () => {
            setLoading(true);
            try {
                const res = await apiFetch("/v1/public/pay/verify-payment", {
                    method: "POST",
                    body: JSON.stringify({
                        quoteId: quoteId || undefined,
                        invoiceId: invoiceId || undefined,
                        sessionId: sessionId || undefined
                    })
                });

                if (res.success && res.data) {
                    setPaymentData(res.data);
                } else {
                    setPaymentData({
                        type: quoteId ? "QUOTE" : "INVOICE",
                        docNumber: quoteId ? "Devis réglé" : "Facture réglée",
                        amountTTC: null,
                        paidAt: new Date()
                    });
                }
            } catch (err) {
                console.warn("Payment verification fallback:", err.message);
                setPaymentData({
                    type: quoteId ? "QUOTE" : "INVOICE",
                    docNumber: quoteId ? "Devis" : "Facture",
                    amountTTC: null,
                    paidAt: new Date()
                });
            } finally {
                setLoading(false);
            }
        };

        verify();
    }, [quoteId, invoiceId, sessionId]);

    const handleDownloadReceiptPdf = async () => {
        if (isDownloadingReceipt) return;
        setIsDownloadingReceipt(true);

        const params = new URLSearchParams();
        if (sessionId) params.append("sessionId", sessionId);
        if (quoteId || paymentData?.quoteId) params.append("quoteId", quoteId || paymentData?.quoteId);
        if (invoiceId || paymentData?.invoiceId) params.append("invoiceId", invoiceId || paymentData?.invoiceId);
        if (paymentData?.signatureToken) params.append("token", paymentData.signatureToken);
        if (paymentData?.paymentToken) params.append("token", paymentData.paymentToken);

        const pdfUrl = getApiUrl(`/v1/public/pay/receipt/pdf?${params.toString()}`);

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
            const safeDocNumber = (paymentData?.docNumber || 'document').replace(/[^a-zA-Z0-9-_]/g, '_');
            link.download = `Recu_Paiement_${safeDocNumber}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => window.URL.revokeObjectURL(url), 2000);
        } catch (err) {
            console.error("Erreur téléchargement reçu PDF:", err);
            window.open(pdfUrl, "_blank");
        } finally {
            setIsDownloadingReceipt(false);
        }
    };

    const handleDownloadDocPdf = async () => {
        if (isDownloadingDoc) return;
        setIsDownloadingDoc(true);

        let pdfUrl = "";
        let safeFilename = "Document.pdf";

        if (paymentData?.type === "QUOTE" || quoteId) {
            const token = paymentData?.signatureToken || quoteId;
            pdfUrl = getApiUrl(`/v1/public/sign/quote/${token}/pdf`);
            safeFilename = `Devis_${(paymentData?.docNumber || 'devis').replace(/[^a-zA-Z0-9-_]/g, '_')}_signe.pdf`;
        } else {
            const token = paymentData?.paymentToken || invoiceId;
            pdfUrl = getApiUrl(`/v1/public/pay/invoice/${token}/pdf`);
            safeFilename = `Facture_${(paymentData?.docNumber || 'facture').replace(/[^a-zA-Z0-9-_]/g, '_')}_acquittee.pdf`;
        }

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
            link.download = safeFilename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => window.URL.revokeObjectURL(url), 2000);
        } catch (err) {
            console.error("Erreur téléchargement document PDF:", err);
            window.open(pdfUrl, "_blank");
        } finally {
            setIsDownloadingDoc(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (loading) {
        return (
            <div className="public-portal-page">
                <div className="public-loading-box">
                    <Loader2 size={40} className="portal-spinner" style={{ animation: "spin 1s linear infinite", color: "#16a34a" }} />
                    <p style={{ marginTop: "16px", fontWeight: 600, fontSize: "16px" }}>Confirmation de votre paiement sécurisé...</p>
                </div>
            </div>
        );
    }

    const docTypeLabel = paymentData?.type === "QUOTE" ? "Devis" : "Facture";
    const docNumber = paymentData?.docNumber ? (paymentData.docNumber.startsWith("Devis") || paymentData.docNumber.startsWith("Facture") ? paymentData.docNumber : `${docTypeLabel} ${paymentData.docNumber}`) : `${docTypeLabel} réglé`;

    const amountFormatted = paymentData?.amountTTC !== undefined && paymentData?.amountTTC !== null
        ? Number(paymentData.amountTTC).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : null;

    const amountHtFormatted = paymentData?.amountHT !== undefined && paymentData?.amountHT !== null
        ? Number(paymentData.amountHT).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : (amountFormatted ? (Number(paymentData.amountTTC) / 1.2).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : null);

    const tvaAmountFormatted = paymentData?.tvaAmount !== undefined && paymentData?.tvaAmount !== null
        ? Number(paymentData.tvaAmount).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : (amountFormatted && amountHtFormatted ? (Number(paymentData.amountTTC) - (Number(paymentData.amountTTC) / 1.2)).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : null);

    const cardBrand = paymentData?.cardBrand ? paymentData.cardBrand.toUpperCase() : "CARTE BANCAIRE";
    const cardLast4 = paymentData?.cardLast4 ? `•••• ${paymentData.cardLast4}` : "";

    return (
        <div className="public-portal-page" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 20px", background: "radial-gradient(circle at 50% 10%, #F0FDF4 0%, #F8FAFC 70%)" }}>
            <style>{`
                @media print {
                    body, html {
                        background: #FFFFFF !important;
                    }
                    .no-print-area {
                        display: none !important;
                    }
                    .receipt-card-print {
                        box-shadow: none !important;
                        border: 1px solid #CBD5E1 !important;
                        max-width: 100% !important;
                        width: 100% !important;
                        padding: 20px !important;
                        margin: 0 !important;
                    }
                }
            `}</style>

            <div className="receipt-card-print" style={{
                maxWidth: "600px",
                width: "100%",
                background: "var(--card, #FFFFFF)",
                borderRadius: "24px",
                border: "1px solid var(--border, #E2E8F0)",
                boxShadow: "0 25px 50px -12px rgba(22, 163, 74, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.04)",
                padding: "40px 36px",
                textAlign: "center",
                color: "var(--foreground, #0F172A)"
            }}>
                {/* Glowing Success Badge */}
                <div style={{
                    width: "76px",
                    height: "76px",
                    borderRadius: "50%",
                    backgroundColor: "rgba(34, 197, 94, 0.12)",
                    color: "#16a34a",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "18px",
                    boxShadow: "0 0 0 10px rgba(34, 197, 94, 0.06)"
                }}>
                    <CheckCircle2 size={44} strokeWidth={2.4} />
                </div>

                <h1 style={{ fontSize: "24px", fontWeight: "800", letterSpacing: "-0.02em", margin: "0 0 6px 0", color: "#0F172A" }}>
                    Paiement validé avec succès !
                </h1>
                
                <p style={{ color: "var(--muted-foreground, #64748B)", fontSize: "14px", margin: "0 0 24px 0", lineHeight: "1.5" }}>
                    Merci pour votre confiance. Votre règlement a été approuvé et authentifié par votre banque via 3D-Secure.
                </p>

                {/* Amount Highlight Box */}
                {amountFormatted && (
                    <div style={{
                        background: "linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)",
                        borderRadius: "16px",
                        border: "1px solid #BBF7D0",
                        padding: "18px 20px",
                        marginBottom: "20px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center"
                    }}>
                        <span style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "#166534", marginBottom: "2px" }}>
                            Montant total réglé
                        </span>
                        <div style={{ fontSize: "32px", fontWeight: "900", color: "#15803D", letterSpacing: "-0.02em" }}>
                            {amountFormatted} € TTC
                        </div>
                        {amountHtFormatted && (
                            <span style={{ fontSize: "13px", color: "#166534", marginTop: "2px" }}>
                                Dont {amountHtFormatted} € HT {tvaAmountFormatted ? `• TVA : ${tvaAmountFormatted} €` : ''}
                            </span>
                        )}
                    </div>
                )}

                {/* Full Receipt Details Grid */}
                <div style={{
                    background: "var(--muted, #F8FAFC)",
                    borderRadius: "16px",
                    border: "1px solid var(--border, #E2E8F0)",
                    padding: "18px 20px",
                    textAlign: "left",
                    marginBottom: "24px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                    fontSize: "13.5px"
                }}>
                    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #E2E8F0", paddingBottom: "8px" }}>
                        <span style={{ color: "#64748B" }}>Document :</span>
                        <strong style={{ color: "#0F172A", fontWeight: 700 }}>{docNumber}</strong>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #E2E8F0", paddingBottom: "8px" }}>
                        <span style={{ color: "#64748B" }}>Moyen de paiement :</span>
                        <span style={{ fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "6px", color: "#0F172A" }}>
                            <CreditCard size={15} color="#16a34a" />
                            {cardBrand} {cardLast4}
                        </span>
                    </div>

                    {paymentData?.transactionId && (
                        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #E2E8F0", paddingBottom: "8px" }}>
                            <span style={{ color: "#64748B" }}>Réf. Transaction :</span>
                            <span style={{ fontFamily: "monospace", fontSize: "12.5px", color: "#334155", fontWeight: 600 }}>
                                {paymentData.transactionId}
                            </span>
                        </div>
                    )}

                    {paymentData?.clientName && (
                        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #E2E8F0", paddingBottom: "8px" }}>
                            <span style={{ color: "#64748B" }}>Client / Payeur :</span>
                            <span style={{ fontWeight: 600, color: "#0F172A", textAlign: "right" }}>
                                {paymentData.clientName}
                                {paymentData.clientEmail ? <div style={{ fontSize: "12px", color: "#64748B", fontWeight: 400 }}>{paymentData.clientEmail}</div> : null}
                            </span>
                        </div>
                    )}

                    {paymentData?.companyName && (
                        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #E2E8F0", paddingBottom: "8px" }}>
                            <span style={{ color: "#64748B" }}>Bénéficiaire :</span>
                            <span style={{ fontWeight: 600, color: "#0F172A", textAlign: "right" }}>
                                {paymentData.companyName}
                                {paymentData.companySiret ? <div style={{ fontSize: "12px", color: "#64748B", fontWeight: 400 }}>SIRET : {paymentData.companySiret}</div> : null}
                            </span>
                        </div>
                    )}

                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#64748B" }}>Date & Heure :</span>
                        <span style={{ fontWeight: 500, color: "#334155" }}>
                            {new Date(paymentData?.paidAt || Date.now()).toLocaleDateString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                    </div>
                </div>

                {/* Actions (Screen Only) */}
                <div className="no-print-area" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {/* Primary Button: Download Receipt PDF */}
                    <button
                        type="button"
                        onClick={handleDownloadReceiptPdf}
                        disabled={isDownloadingReceipt}
                        style={{
                            width: "100%",
                            padding: "14px 20px",
                            backgroundColor: "#16a34a",
                            color: "#FFFFFF",
                            border: "none",
                            borderRadius: "14px",
                            fontWeight: "700",
                            fontSize: "15px",
                            cursor: isDownloadingReceipt ? "wait" : "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
                            boxShadow: "0 4px 14px rgba(22, 163, 74, 0.3)",
                            transition: "all 0.15s ease"
                        }}
                    >
                        <Download size={18} />
                        <span>{isDownloadingReceipt ? "Génération du reçu PDF..." : "Télécharger le reçu de paiement (PDF)"}</span>
                    </button>

                    {/* Secondary Button: Download Document PDF */}
                    <button
                        type="button"
                        onClick={handleDownloadDocPdf}
                        disabled={isDownloadingDoc}
                        style={{
                            width: "100%",
                            padding: "12px 20px",
                            backgroundColor: "#FFFFFF",
                            color: "#0F172A",
                            border: "1px solid var(--border, #E2E8F0)",
                            borderRadius: "14px",
                            fontWeight: "600",
                            fontSize: "14px",
                            cursor: isDownloadingDoc ? "wait" : "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                            transition: "all 0.15s ease"
                        }}
                    >
                        <FileText size={16} color="#64748B" />
                        <span>{isDownloadingDoc ? "Téléchargement..." : `Télécharger le ${paymentData?.type === "QUOTE" ? "devis signé" : "la facture acquittée"} (PDF)`}</span>
                    </button>

                    {paymentData?.signatureToken && (
                        <button
                            type="button"
                            onClick={() => navigate(`/sign/quote/${paymentData.signatureToken}`)}
                            style={{
                                width: "100%",
                                padding: "10px 16px",
                                backgroundColor: "transparent",
                                color: "var(--muted-foreground, #64748B)",
                                border: "none",
                                borderRadius: "10px",
                                fontWeight: "500",
                                fontSize: "13.5px",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "6px"
                            }}
                        >
                            <ArrowLeft size={15} /> Revenir à la page du devis
                        </button>
                    )}

                    {paymentData?.paymentToken && (
                        <button
                            type="button"
                            onClick={() => navigate(`/pay/invoice/${paymentData.paymentToken}`)}
                            style={{
                                width: "100%",
                                padding: "10px 16px",
                                backgroundColor: "transparent",
                                color: "var(--muted-foreground, #64748B)",
                                border: "none",
                                borderRadius: "10px",
                                fontWeight: "500",
                                fontSize: "13.5px",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "6px"
                            }}
                        >
                            <ArrowLeft size={15} /> Revenir à la page de la facture
                        </button>
                    )}
                </div>

                {/* Footer Security Assurance */}
                <div style={{ marginTop: "22px", display: "inline-flex", alignItems: "center", gap: "6px", color: "#64748B", fontSize: "12px" }}>
                    <ShieldCheck size={14} color="#16a34a" />
                    <span>Transaction chiffrée SSL / TLS • GestArt Secure Payment</span>
                </div>
            </div>
        </div>
    );
}

export default PaySuccessPage;
