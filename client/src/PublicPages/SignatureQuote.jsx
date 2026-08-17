import React, { useRef, useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Download, CheckCircle2, Trash2, ShieldCheck, Building2, User, CreditCard, PenTool, AlertCircle, FileText, Check, Copy } from "lucide-react";
import "./SignatureQuote.css";
import { apiFetch } from "../utils/api";
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

    const handlePrint = () => {
        window.print();
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
    const isSigned = signatureSaved || quote.status === "ACCEPTED" || quote.signatureUrl;
    const totalTtc = Number(quote.amountTTC || quote.totalTtc || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const totalHt = Number(quote.amountHT || quote.totalHt || (Number(quote.amountTTC || 0) / 1.2) || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const tvaRate = quote.tvaRate !== undefined ? quote.tvaRate : 20;
    const tvaAmount = (Number(quote.amountTTC || quote.totalTtc || 0) - Number(quote.amountHT || quote.totalHt || 0)).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const clientDisplayName = client.firstName || client.lastName
        ? `${client.firstName || ''} ${client.lastName || ''}`.trim()
        : (client.companyName || "Client");

    const bankIban = company.settings?.bankIban || company.bankIban;
    const bankBic = company.settings?.bankBic || company.bankBic;
    const bankName = company.settings?.bankName || company.bankName;

    const custom = getEffectiveCustomization(quote);
    const primaryColor = custom.primaryColor || "#556B2F";
    const fontFamily = custom.fontFamily || "Inter, sans-serif";

    return (
        <div className="public-portal-page" style={{ '--primary-color': primaryColor, fontFamily: fontFamily }}>
            {/* Header */}
            <header className="public-portal-header no-print">
                <div className="header-inner">
                    <div className="header-brand-wrap">
                        <div className="company-badge-icon">
                            <Building2 size={20} />
                        </div>
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

            {/* Main Content (Printable A4 Sheet) */}
            <main className="public-portal-main">
                <div className="public-portal-card" id="invoice-pdf-print-area">
                    {/* Top Banner */}
                    <div className="payment-intro-banner">
                        <div className="intro-left">
                            <span className="intro-badge">Proposition Commerciale & Devis</span>
                            <h2 className="intro-title">Devis {quote.number}</h2>
                            <span className="intro-date">
                                Émis le {new Date(quote.createdAt || Date.now()).toLocaleDateString("fr-FR")} • Valable jusqu'au {quote.validUntil ? new Date(quote.validUntil).toLocaleDateString("fr-FR") : "30 jours"}
                            </span>
                        </div>
                        <div className="intro-right-amount">
                            <span className="amount-label">Montant Total</span>
                            <span className="amount-val">{totalTtc} € <span className="ttc-tag">TTC</span></span>
                        </div>
                    </div>

                    {/* Parties Grid */}
                    <div className="parties-grid">
                        <div className="party-box">
                            <span className="party-title"><Building2 size={14} /> Entreprise émettrice</span>
                            <strong className="party-name">{company.name || "Entreprise"}</strong>
                            {company.address && <span className="party-line">{company.address}</span>}
                            {(company.postalCode || company.city) && <span className="party-line">{company.postalCode} {company.city}</span>}
                            {company.siret && <span className="party-line">SIRET : {company.siret}</span>}
                            {company.phone && <span className="party-line">Tél : {company.phone}</span>}
                            {company.email && <span className="party-line">{company.email}</span>}
                        </div>

                        <div className="party-box">
                            <span className="party-title"><User size={14} /> Client destinataire</span>
                            <strong className="party-name">{clientDisplayName}</strong>
                            {client.companyName && client.firstName && <span className="party-line">{client.companyName}</span>}
                            {client.address && <span className="party-line">{client.address}</span>}
                            {client.phone && <span className="party-line">Tél : {client.phone}</span>}
                            {client.email && <span className="party-line">{client.email}</span>}
                        </div>
                    </div>

                    {/* Lines Table */}
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

                    {/* Totals */}
                    <div className="totals-recap-box">
                        <div className="total-row">
                            <span>Sous-total HT :</span>
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

                    {/* DUAL SIGNATURE BLOCKS (OFFICIAL FRENCH COMMERCIAL FORMAT) */}
                    <div className="signatures-dual-grid">
                        {/* Company Signature / Stamp */}
                        <div className="signature-block-card">
                            <div className="signature-block-header">
                                <span className="signature-block-title">Pour l'entreprise</span>
                                <span className="signature-badge-cert"><CheckCircle2 size={12} /> Émetteur agréé</span>
                            </div>
                            <span className="signature-mention-label">Cachet & Signature de l'artisan</span>
                            <div className="signature-visual-box">
                                <div style={{ textAlign: 'center', color: '#334155' }}>
                                    <strong style={{ fontSize: '13px', display: 'block' }}>{company.name || "Entreprise"}</strong>
                                    <span style={{ fontSize: '11px', color: '#64748B', display: 'block' }}>SIRET : {company.siret || 'Enregistré'}</span>
                                    <span style={{ fontSize: '10.5px', color: '#16a34a', fontWeight: 600, display: 'block', marginTop: '4px' }}>✓ Devis officiel vérifié</span>
                                </div>
                            </div>
                            <span style={{ fontSize: '11px', color: '#64748B' }}>Date : {new Date(quote.createdAt || Date.now()).toLocaleDateString("fr-FR")}</span>
                        </div>

                        {/* Client Signature */}
                        <div className="signature-block-card">
                            <div className="signature-block-header">
                                <span className="signature-block-title">Pour le client</span>
                                {isSigned && <span className="signature-badge-cert"><CheckCircle2 size={12} /> Signé en ligne</span>}
                            </div>
                            <span className="signature-mention-label">Mention manuscrite « Bon pour accord »</span>
                            <div className="signature-visual-box">
                                {isSigned && (quote.signatureUrl || hasSigned) ? (
                                    <img 
                                        src={quote.signatureUrl || canvasRef.current?.toDataURL()} 
                                        alt="Signature électronique client" 
                                        className="signature-img-rendered" 
                                    />
                                ) : (
                                    <span style={{ fontSize: '11.5px', color: '#94A3B8', fontStyle: 'italic', textAlign: 'center' }}>
                                        Cadre réservé à la signature du client
                                    </span>
                                )}
                            </div>
                            <span style={{ fontSize: '11px', color: '#64748B' }}>
                                {isSigned ? (
                                    <>Signé le {quote.signedAt ? new Date(quote.signedAt).toLocaleDateString("fr-FR") : new Date().toLocaleDateString("fr-FR")} par {clientDisplayName}</>
                                ) : (
                                    <>Date & Signature du client</>
                                )}
                            </span>
                        </div>
                    </div>

                    {/* Legal Notice */}
                    <div className="doc-legal-notice">
                        Devis valable {quote.validUntil ? `jusqu'au ${new Date(quote.validUntil).toLocaleDateString("fr-FR")}` : "30 jours à compter de son émission"}. 
                        Toute commande implique l'acceptation sans réserve des conditions générales de vente et de prestation. 
                        En cas de signature électronique, l'accord vaut bon de commande ferme et définitif conformément aux articles 1366 et suivants du Code Civil.
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

                            <div style={{ border: '2px dashed #CBD5E1', borderRadius: '12px', backgroundColor: '#F8FAFC', overflow: 'hidden', touchAction: 'none' }}>
                                <canvas
                                    ref={canvasRef}
                                    width={640}
                                    height={150}
                                    style={{ width: '100%', height: '150px', display: 'block', cursor: 'crosshair' }}
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

                    {/* Post-Signature Confirmation & Pay/Download Actions (Screen only) */}
                    {isSigned && (
                        <div className="portal-actions-container no-print" style={{ marginTop: '16px' }}>
                            <div className="paid-success-banner" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '14px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <CheckCircle2 size={32} color="#16a34a" />
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '16px', color: '#166534' }}>Devis validé et signé avec succès !</h3>
                                        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#15803D' }}>
                                            Votre accord électronique avec mention <em>« Bon pour accord »</em> a été enregistré.
                                        </p>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '6px', flexWrap: 'wrap' }}>
                                    <button
                                        type="button"
                                        className="portal-primary-pay-btn"
                                        onClick={handlePayQuoteStripe}
                                        disabled={isPaying}
                                        style={{ flex: 1, minWidth: '220px' }}
                                    >
                                        <CreditCard size={18} />
                                        <span>{isPaying ? "Redirection..." : `Régler le montant (${totalTtc} €) par Carte`}</span>
                                    </button>
                                    <button
                                        type="button"
                                        className="portal-secondary-btn"
                                        onClick={handlePrint}
                                        style={{ flex: 1, minWidth: '180px' }}
                                    >
                                        <Download size={16} />
                                        <span>Télécharger l'exemplaire signé (PDF)</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Bank Transfer Box (Screen only) */}
                    {bankIban && (
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
