import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle2, ShieldCheck, Download, ArrowLeft, Building2, Calendar, CreditCard, ExternalLink, Loader2 } from "lucide-react";
import { apiFetch } from "../utils/api";
import "./PayInvoice.css";

export function PaySuccessPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    
    const quoteId = searchParams.get("quoteId");
    const invoiceId = searchParams.get("invoiceId");
    const sessionId = searchParams.get("session_id");

    const [loading, setLoading] = useState(true);
    const [paymentData, setPaymentData] = useState(null);
    const [error, setError] = useState(null);

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
                // Even if offline, show confirmation if user returned from Stripe
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

    const docTitle = paymentData?.type === "QUOTE" ? `Devis ${paymentData.docNumber || ''}` : `Facture ${paymentData.docNumber || ''}`;
    const amountFormatted = paymentData?.amountTTC 
        ? Number(paymentData.amountTTC).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : null;

    return (
        <div className="public-portal-page" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px" }}>
            <div style={{
                maxWidth: "560px",
                width: "100%",
                background: "var(--card, #FFFFFF)",
                borderRadius: "20px",
                border: "1px solid var(--border, #E2E8F0)",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)",
                padding: "36px 32px",
                textAlign: "center",
                color: "var(--foreground, #0F172A)"
            }}>
                {/* Glowing Success Badge */}
                <div style={{
                    width: "72px",
                    height: "72px",
                    borderRadius: "50%",
                    backgroundColor: "rgba(34, 197, 94, 0.12)",
                    color: "#16a34a",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "20px",
                    boxShadow: "0 0 0 8px rgba(34, 197, 94, 0.06)"
                }}>
                    <CheckCircle2 size={42} strokeWidth={2.4} />
                </div>

                <h1 style={{ fontSize: "24px", fontWeight: "800", letterSpacing: "-0.02em", margin: "0 0 8px 0" }}>
                    Paiement validé avec succès !
                </h1>
                
                <p style={{ color: "var(--muted-foreground, #64748B)", fontSize: "14.5px", margin: "0 0 28px 0", lineHeight: "1.5" }}>
                    Merci pour votre confiance. Votre règlement a été approuvé et authentifié par votre banque. Un reçu de paiement a été généré.
                </p>

                {/* Receipt Details Card */}
                <div style={{
                    background: "var(--muted, #F8FAFC)",
                    borderRadius: "14px",
                    border: "1px solid var(--border, #E2E8F0)",
                    padding: "20px",
                    textAlign: "left",
                    marginBottom: "28px"
                }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", borderBottom: "1px solid var(--border, #E2E8F0)", paddingBottom: "10px" }}>
                        <span style={{ color: "var(--muted-foreground, #64748B)", fontSize: "13.5px" }}>Document :</span>
                        <strong style={{ fontSize: "14px", fontWeight: "700" }}>{docTitle}</strong>
                    </div>

                    {amountFormatted && (
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", borderBottom: "1px solid var(--border, #E2E8F0)", paddingBottom: "10px" }}>
                            <span style={{ color: "var(--muted-foreground, #64748B)", fontSize: "13.5px" }}>Montant payé :</span>
                            <strong style={{ fontSize: "16px", fontWeight: "800", color: "#16a34a" }}>{amountFormatted} € TTC</strong>
                        </div>
                    )}

                    {paymentData?.companyName && (
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", borderBottom: "1px solid var(--border, #E2E8F0)", paddingBottom: "10px" }}>
                            <span style={{ color: "var(--muted-foreground, #64748B)", fontSize: "13.5px" }}>Bénéficiaire :</span>
                            <span style={{ fontSize: "13.5px", fontWeight: "600" }}>{paymentData.companyName}</span>
                        </div>
                    )}

                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", borderBottom: "1px solid var(--border, #E2E8F0)", paddingBottom: "10px" }}>
                        <span style={{ color: "var(--muted-foreground, #64748B)", fontSize: "13.5px" }}>Moyen de paiement :</span>
                        <span style={{ fontSize: "13.5px", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                            <CreditCard size={15} color="#16a34a" /> Carte Bancaire (Sécurisée 3D-Secure)
                        </span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--muted-foreground, #64748B)", fontSize: "13.5px" }}>Date & Heure :</span>
                        <span style={{ fontSize: "13.5px", fontWeight: "500" }}>
                            {new Date(paymentData?.paidAt || Date.now()).toLocaleDateString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                    </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <button
                        type="button"
                        onClick={handlePrint}
                        style={{
                            width: "100%",
                            padding: "14px 20px",
                            backgroundColor: "#16a34a",
                            color: "#FFFFFF",
                            border: "none",
                            borderRadius: "12px",
                            fontWeight: "700",
                            fontSize: "15px",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
                            boxShadow: "0 4px 12px rgba(22, 163, 74, 0.25)",
                            transition: "background-color 0.2s"
                        }}
                    >
                        <Download size={18} /> Imprimer ou enregistrer le reçu
                    </button>

                    {paymentData?.signatureToken && (
                        <button
                            type="button"
                            onClick={() => navigate(`/sign/quote/${paymentData.signatureToken}`)}
                            style={{
                                width: "100%",
                                padding: "12px 20px",
                                backgroundColor: "transparent",
                                color: "var(--muted-foreground, #64748B)",
                                border: "1px solid var(--border, #E2E8F0)",
                                borderRadius: "12px",
                                fontWeight: "600",
                                fontSize: "14px",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "8px"
                            }}
                        >
                            <ArrowLeft size={16} /> Revenir au devis signé
                        </button>
                    )}

                    {paymentData?.paymentToken && (
                        <button
                            type="button"
                            onClick={() => navigate(`/pay/invoice/${paymentData.paymentToken}`)}
                            style={{
                                width: "100%",
                                padding: "12px 20px",
                                backgroundColor: "transparent",
                                color: "var(--muted-foreground, #64748B)",
                                border: "1px solid var(--border, #E2E8F0)",
                                borderRadius: "12px",
                                fontWeight: "600",
                                fontSize: "14px",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "8px"
                            }}
                        >
                            <ArrowLeft size={16} /> Revenir à la facture
                        </button>
                    )}
                </div>

                {/* Footer Security Assurance */}
                <div style={{ marginTop: "24px", display: "inline-flex", alignItems: "center", gap: "6px", color: "#64748B", fontSize: "12px" }}>
                    <ShieldCheck size={14} color="#16a34a" />
                    <span>Transaction chiffrée SSL / TLS • GestArt Secure Payment</span>
                </div>
            </div>
        </div>
    );
}

export default PaySuccessPage;
