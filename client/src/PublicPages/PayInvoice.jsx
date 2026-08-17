import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { CreditCard, CheckCircle2, ShieldCheck, Download, Building2, User, Calendar, FileText, AlertCircle, ArrowUpRight, Copy, Check } from "lucide-react";
import { apiFetch } from "../utils/api";
import { getEffectiveCustomization } from "../utils/documentCustomization";
import "./PayInvoice.css";

function PayInvoice() {
    const { token } = useParams();
    const [invoice, setInvoice] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isPaying, setIsPaying] = useState(false);
    const [ibanCopied, setIbanCopied] = useState(false);

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

    const handleCopyIban = (iban) => {
        if (!iban) return;
        navigator.clipboard.writeText(iban);
        setIbanCopied(true);
        setTimeout(() => setIbanCopied(false), 2500);
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
    const isPaid = invoice.status === "PAID";
    const totalTtc = Number(invoice.amountTTC || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const totalHt = Number(invoice.amountHT || (invoice.amountTTC / 1.2) || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const tvaRate = invoice.tvaRate !== undefined ? invoice.tvaRate : 20;
    const tvaAmount = (Number(invoice.amountTTC || 0) - Number(invoice.amountHT || (invoice.amountTTC / 1.2) || 0)).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
                    <div className="header-secure-pill">
                        <ShieldCheck size={16} color="#16a34a" />
                        <span>Paiement sécurisé</span>
                    </div>
                </div>
            </header>

            {/* Main Content Area (A4 Clean Print Area) */}
            <main className="public-portal-main">
                <div className="public-portal-card" id="invoice-pdf-print-area">
                    {/* Top Document Header */}
                    <div className="payment-intro-banner">
                        <div className="intro-left">
                            <span className="intro-badge">Facture Officielle</span>
                            <h2 className="intro-title">Facture {invoice.number}</h2>
                            <span className="intro-date">
                                Émise le {new Date(invoice.issuedAt || Date.now()).toLocaleDateString("fr-FR")} • Échéance : {invoice.dueAt ? new Date(invoice.dueAt).toLocaleDateString("fr-FR") : "À réception"}
                            </span>
                        </div>
                        <div className="intro-right-amount">
                            <span className="amount-label">Net à payer</span>
                            <span className="amount-val">{totalTtc} € <span className="ttc-tag">TTC</span></span>
                            {isPaid && (
                                <div className="acquittee-stamp-box" style={{ marginTop: '8px' }}>
                                    <span>✓ FACTURE ACQUITTÉE</span>
                                    <span className="acquittee-stamp-sub">
                                        Réglée le {invoice.paidAt ? new Date(invoice.paidAt).toLocaleDateString("fr-FR") : new Date().toLocaleDateString("fr-FR")} ({invoice.paymentMethod || 'Carte'})
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Parties Details (Company & Client) */}
                    <div className="parties-grid">
                        <div className="party-box">
                            <span className="party-title"><Building2 size={14} /> Émetteur</span>
                            <strong className="party-name">{company.name || "Entreprise"}</strong>
                            {company.address && <span className="party-line">{company.address}</span>}
                            {(company.postalCode || company.city) && <span className="party-line">{company.postalCode} {company.city}</span>}
                            {company.siret && <span className="party-line">SIRET : {company.siret}</span>}
                            {company.phone && <span className="party-line">Tél : {company.phone}</span>}
                            {company.email && <span className="party-line">{company.email}</span>}
                        </div>

                        <div className="party-box">
                            <span className="party-title"><User size={14} /> Facturé à</span>
                            <strong className="party-name">{clientDisplayName}</strong>
                            {client.companyName && client.firstName && <span className="party-line">{client.companyName}</span>}
                            {client.address && <span className="party-line">{client.address}</span>}
                            {client.phone && <span className="party-line">Tél : {client.phone}</span>}
                            {client.email && <span className="party-line">{client.email}</span>}
                        </div>
                    </div>

                    {/* Invoice Lines Table */}
                    {lines.length > 0 && (
                        <div className="table-responsive-wrapper">
                            <table className="portal-lines-table">
                                <thead>
                                    <tr>
                                        <th>Description</th>
                                        <th style={{ textAlign: "center", width: "70px" }}>Qté</th>
                                        <th style={{ textAlign: "right", width: "110px" }}>Prix Unit. HT</th>
                                        <th style={{ textAlign: "right", width: "110px" }}>Total HT</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lines.map((line, idx) => (
                                        <tr key={idx}>
                                            <td>
                                                <div className="line-desc-bold">{line.description}</div>
                                                {line.reference && <div className="line-ref">Réf: {line.reference}</div>}
                                            </td>
                                            <td style={{ textAlign: "center" }}>{line.quantity || 1}</td>
                                            <td style={{ textAlign: "right" }}>{Number(line.unitPrice || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</td>
                                            <td style={{ textAlign: "right", fontWeight: 600 }}>{Number(line.total || (line.quantity * line.unitPrice) || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Summary Totals */}
                    <div className="totals-recap-box">
                        <div className="total-row">
                            <span>Total HT :</span>
                            <span>{totalHt} €</span>
                        </div>
                        <div className="total-row">
                            <span>TVA ({tvaRate}%) :</span>
                            <span>{tvaAmount} €</span>
                        </div>
                        <div className="total-row total-highlight">
                            <span>Total TTC :</span>
                            <span>{totalTtc} € TTC</span>
                        </div>
                    </div>

                    {/* Bank Coordinates Printed Box */}
                    {bankIban && (
                        <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '12px 16px', fontSize: '12px' }}>
                            <strong style={{ color: '#0F172A', display: 'block', marginBottom: '4px' }}>Coordonnées Bancaires de règlement :</strong>
                            <div style={{ fontFamily: 'monospace', color: '#1E293B' }}>IBAN : {bankIban} {bankBic ? `• BIC : ${bankBic}` : ''}</div>
                        </div>
                    )}

                    {/* Legal Notice */}
                    <div className="doc-legal-notice">
                        Paiement à réception. Pas d'escompte pour règlement anticipé. 
                        En cas de retard de paiement, une indemnité forfaitaire pour frais de recouvrement de 40 € ainsi que des pénalités de retard au taux légal en vigueur seront exigibles de plein droit.
                    </div>

                    {/* Screen Actions (Hidden during print) */}
                    <div className="portal-actions-container no-print">
                        {isPaid ? (
                            <div className="paid-success-banner" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <CheckCircle2 size={24} color="#16a34a" />
                                    <span>Facture acquittée et archivée</span>
                                </div>
                                <button
                                    type="button"
                                    className="portal-secondary-btn"
                                    onClick={handlePrint}
                                    style={{ width: 'auto', backgroundColor: '#FFFFFF' }}
                                >
                                    <Download size={16} />
                                    <span>Télécharger le reçu (PDF)</span>
                                </button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <button
                                    type="button"
                                    className="portal-primary-pay-btn"
                                    onClick={handlePayOnline}
                                    disabled={isPaying}
                                >
                                    <CreditCard size={18} />
                                    <span>{isPaying ? "Redirection Stripe..." : `Payer ${totalTtc} € par Carte Bancaire`}</span>
                                </button>

                                <button
                                    type="button"
                                    className="portal-secondary-btn"
                                    onClick={handlePrint}
                                >
                                    <FileText size={16} />
                                    <span>Imprimer / Télécharger la facture (PDF)</span>
                                </button>
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
