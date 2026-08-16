import React, { useState } from "react";
import { X, Upload, Send, ArrowLeft, Download, MessageCircle, MessageSquare, Mail, Copy, Check, ShieldCheck, ExternalLink } from "lucide-react";

function QuoteSendDrawer({ quote, onClose, onSelfSend, onAutoSend, onDownloadPdf }) {
    const [viewMode, setViewMode] = useState("main"); // "main" | "self" | "auto"
    const [copied, setCopied] = useState(false);
    const [targetEmail, setTargetEmail] = useState(() => quote?.clientEmail || quote?.client?.email || "");
    const [isSending, setIsSending] = useState(false);

    if (!quote) return null;

    const docNumber = quote.number || `D-${quote.id}`;
    const clientName = quote.clientName || "Client";
    const totalTtc = Number(quote.totalTtc || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/devis/${quote.id || ''}` : `https://gestart.fr/devis/${quote.id || ''}`;
    const defaultMsg = `Bonjour ${clientName},\n\nVeuillez trouver votre devis ${docNumber} d'un montant de ${totalTtc} € TTC.\nVous pouvez le consulter et le signer en ligne ici : ${shareUrl}\n\nCordialement,`;

    const handleCopyLink = () => {
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    const handleOpenWhatsApp = () => {
        const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(defaultMsg)}`;
        window.open(url, "_blank");
        if (onSelfSend) onSelfSend(quote);
    };

    const handleOpenSms = () => {
        const phone = quote.clientPhone || quote.client?.phone || "";
        const url = `sms:${phone}?&body=${encodeURIComponent(defaultMsg)}`;
        window.open(url, "_blank");
        if (onSelfSend) onSelfSend(quote);
    };

    const handleOpenMailClient = () => {
        const email = targetEmail || quote.clientEmail || "";
        const subject = encodeURIComponent(`Devis ${docNumber} — ${clientName}`);
        const body = encodeURIComponent(defaultMsg);
        window.open(`mailto:${email}?subject=${subject}&body=${body}`, "_blank");
        if (onSelfSend) onSelfSend(quote);
    };

    const handleDownload = () => {
        if (onDownloadPdf) {
            onDownloadPdf(quote);
        } else {
            window.print();
        }
        if (onSelfSend) onSelfSend(quote);
    };

    const handleConfirmAutoSend = async () => {
        setIsSending(true);
        try {
            await onAutoSend(quote, targetEmail);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="dv-send-drawer-overlay" onClick={onClose}>
            <div className="dv-send-drawer" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="dv-send-drawer-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {viewMode !== "main" && (
                            <button
                                type="button"
                                onClick={() => setViewMode("main")}
                                style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', color: 'var(--foreground)' }}
                                title="Retour"
                            >
                                <ArrowLeft size={16} />
                            </button>
                        )}
                        <span className="dv-send-drawer-title">
                            {viewMode === "main" && "Envoyer le devis"}
                            {viewMode === "self" && "Modes d'envoi disponibles"}
                            {viewMode === "auto" && "Envoi avec signature"}
                        </span>
                    </div>
                    <button className="dv-send-close-btn" onClick={onClose} aria-label="Fermer">
                        <X size={14} />
                    </button>
                </div>

                {/* VIEW 1: Main Selection */}
                {viewMode === "main" && (
                    <div className="dv-send-options">
                        {/* Option 1: Self Send */}
                        <button className="dv-send-option" onClick={() => setViewMode("self")}>
                            <div className="dv-send-option-icon">
                                <Upload size={20} />
                            </div>
                            <div style={{ flex: 1, textAlign: 'left' }}>
                                <span className="dv-send-option-label">Envoyer par moi-même</span>
                                <span className="dv-send-option-desc">Télécharger, SMS, WhatsApp, Mail perso...</span>
                            </div>
                        </button>

                        {/* Option 2: Auto Send */}
                        <button className="dv-send-option" onClick={() => setViewMode("auto")}>
                            <div className="dv-send-option-icon" style={{ backgroundColor: "rgba(85,107,47,0.12)" }}>
                                <Send size={20} style={{ color: "#556B2F" }} />
                            </div>
                            <div style={{ flex: 1, textAlign: 'left' }}>
                                <span className="dv-send-option-label">Envoyer avec signature</span>
                                <span className="dv-send-option-desc">E-mail professionnel direct avec signature client</span>
                            </div>
                        </button>
                    </div>
                )}

                {/* VIEW 2: Send by myself channels */}
                {viewMode === "self" && (
                    <div className="dv-send-options" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {/* Download PDF */}
                        <button className="dv-send-option" onClick={handleDownload}>
                            <div className="dv-send-option-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                                <Download size={18} />
                            </div>
                            <div style={{ flex: 1, textAlign: 'left' }}>
                                <span className="dv-send-option-label">Télécharger le PDF</span>
                                <span className="dv-send-option-desc">Imprimer ou enregistrer le fichier PDF</span>
                            </div>
                        </button>

                        {/* WhatsApp */}
                        <button className="dv-send-option" onClick={handleOpenWhatsApp}>
                            <div className="dv-send-option-icon" style={{ backgroundColor: 'rgba(37, 211, 102, 0.12)', color: '#25D366' }}>
                                <MessageCircle size={18} />
                            </div>
                            <div style={{ flex: 1, textAlign: 'left' }}>
                                <span className="dv-send-option-label">Partager par WhatsApp</span>
                                <span className="dv-send-option-desc">Ouvre WhatsApp avec le lien du devis</span>
                            </div>
                        </button>

                        {/* SMS */}
                        <button className="dv-send-option" onClick={handleOpenSms}>
                            <div className="dv-send-option-icon" style={{ backgroundColor: 'rgba(168, 85, 247, 0.12)', color: '#a855f7' }}>
                                <MessageSquare size={18} />
                            </div>
                            <div style={{ flex: 1, textAlign: 'left' }}>
                                <span className="dv-send-option-label">Envoyer par SMS</span>
                                <span className="dv-send-option-desc">Ouvre l'application SMS de votre appareil</span>
                            </div>
                        </button>

                        {/* Mail Client */}
                        <button className="dv-send-option" onClick={handleOpenMailClient}>
                            <div className="dv-send-option-icon" style={{ backgroundColor: 'rgba(234, 88, 12, 0.12)', color: '#ea580c' }}>
                                <Mail size={18} />
                            </div>
                            <div style={{ flex: 1, textAlign: 'left' }}>
                                <span className="dv-send-option-label">Mon application e-mail (Mail / Gmail)</span>
                                <span className="dv-send-option-desc">Ouvre votre messagerie avec le message prêt</span>
                            </div>
                        </button>

                        {/* Copy Link */}
                        <button className="dv-send-option" onClick={handleCopyLink}>
                            <div className="dv-send-option-icon" style={{ backgroundColor: 'rgba(100, 116, 139, 0.12)', color: '#64748b' }}>
                                {copied ? <Check size={18} color="#16a34a" /> : <Copy size={18} />}
                            </div>
                            <div style={{ flex: 1, textAlign: 'left' }}>
                                <span className="dv-send-option-label">{copied ? "Lien copié dans le presse-papier !" : "Copier le lien du devis"}</span>
                                <span className="dv-send-option-desc">Collez le lien où vous voulez</span>
                            </div>
                        </button>
                    </div>
                )}

                {/* VIEW 3: Auto Send with Signature Confirmation */}
                {viewMode === "auto" && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '4px 0' }}>
                        {/* Info Banner */}
                        <div style={{
                            padding: '12px 16px',
                            borderRadius: '10px',
                            backgroundColor: 'rgba(85, 107, 47, 0.08)',
                            border: '1px solid rgba(85, 107, 47, 0.2)',
                            display: 'flex',
                            gap: '12px',
                            alignItems: 'flex-start'
                        }}>
                            <ShieldCheck size={20} style={{ color: '#556B2F', flexShrink: 0, marginTop: '2px' }} />
                            <div>
                                <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#556B2F' }}>
                                    Envoi d'un e-mail certifié avec signature
                                </h4>
                                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--muted-foreground)', lineHeight: 1.4 }}>
                                    Le devis <strong>{docNumber}</strong> ({totalTtc} € TTC) sera envoyé automatiquement par e-mail avec un lien sécurisé permettant au client de signer en ligne avec valeur légale.
                                </p>
                            </div>
                        </div>

                        {/* Recipient Email Input */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--foreground)' }}>
                                Adresse e-mail du client ({clientName}) :
                            </label>
                            <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                                <Mail size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
                                <input
                                    type="email"
                                    value={targetEmail}
                                    onChange={(e) => setTargetEmail(e.target.value)}
                                    placeholder="email.client@exemple.fr"
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px 10px 38px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border)',
                                        backgroundColor: 'var(--background)',
                                        color: 'var(--foreground)',
                                        fontSize: '13px',
                                        fontWeight: 600
                                    }}
                                    required
                                />
                            </div>
                            {!targetEmail && (
                                <span style={{ fontSize: '11px', color: '#ef4444' }}>
                                    Veuillez renseigner l'adresse e-mail pour l'envoi.
                                </span>
                            )}
                        </div>

                        {/* Confirmation Button */}
                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                            <button
                                type="button"
                                onClick={() => setViewMode("main")}
                                style={{
                                    flex: 1,
                                    padding: '10px 14px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border)',
                                    backgroundColor: 'var(--muted, #F4F3EF)',
                                    color: 'var(--foreground)',
                                    fontWeight: 600,
                                    fontSize: '13px',
                                    cursor: 'pointer'
                                }}
                            >
                                Annuler
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmAutoSend}
                                disabled={!targetEmail || isSending}
                                style={{
                                    flex: 2,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    padding: '10px 16px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    backgroundColor: '#556B2F',
                                    color: '#ffffff',
                                    fontWeight: 700,
                                    fontSize: '13px',
                                    cursor: !targetEmail || isSending ? 'not-allowed' : 'pointer',
                                    opacity: !targetEmail || isSending ? 0.6 : 1,
                                    boxShadow: '0 4px 12px rgba(85, 107, 47, 0.3)'
                                }}
                            >
                                <Send size={15} />
                                <span>{isSending ? "Envoi en cours..." : "Confirmer et envoyer"}</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default QuoteSendDrawer;
