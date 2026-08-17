import React, { useState } from "react";
import { X, Upload, Send, ArrowLeft, Download, MessageCircle, MessageSquare, Mail, Copy, Check, ShieldCheck } from "lucide-react";

function InvoiceSendDrawer({ invoice, onClose, onSelfSend, onAutoSend, onDownloadPdf }) {
    const [viewMode, setViewMode] = useState("main"); // "main" | "self" | "auto"
    const [copied, setCopied] = useState(false);
    const [targetEmail, setTargetEmail] = useState(() => invoice?.clientEmail || invoice?.client?.email || "");
    const [isSending, setIsSending] = useState(false);

    if (!invoice) return null;

    const docNumber = invoice.number || `F-${invoice.id}`;
    const clientName = invoice.clientName || "Client";
    const totalTtc = Number(invoice.totalTtc || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/factures/${invoice.id || ''}` : `https://gestart.fr/factures/${invoice.id || ''}`;
    const defaultMsg = `Bonjour ${clientName},\n\nVeuillez trouver votre facture ${docNumber} d'un montant de ${totalTtc} € TTC.\nVous pouvez la consulter et la régler en ligne ici : ${shareUrl}\n\nCordialement,`;

    const handleCopyLink = () => {
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    const handleOpenWhatsApp = () => {
        const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(defaultMsg)}`;
        window.open(url, "_blank");
        if (onSelfSend) onSelfSend(invoice);
    };

    const handleOpenSms = () => {
        const phone = invoice.clientPhone || invoice.client?.phone || "";
        const url = `sms:${phone}?&body=${encodeURIComponent(defaultMsg)}`;
        window.open(url, "_blank");
        if (onSelfSend) onSelfSend(invoice);
    };

    const handleOpenMailClient = () => {
        const email = targetEmail || invoice.clientEmail || "";
        const subject = encodeURIComponent(`Facture ${docNumber} — ${clientName}`);
        const body = encodeURIComponent(defaultMsg);
        window.open(`mailto:${email}?subject=${subject}&body=${body}`, "_blank");
        if (onSelfSend) onSelfSend(invoice);
    };

    const handleDownload = () => {
        if (onDownloadPdf) {
            onDownloadPdf(invoice);
        } else {
            window.print();
        }
        if (onSelfSend) onSelfSend(invoice);
    };

    const handleConfirmAutoSend = async () => {
        setIsSending(true);
        try {
            await onAutoSend(invoice, targetEmail);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="fp-send-drawer-overlay" onClick={onClose}>
            <div className="fp-send-drawer" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="fp-send-drawer-header">
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
                        <span className="fp-send-drawer-title">
                            {viewMode === "main" && "Envoyer la facture"}
                            {viewMode === "self" && "Modes d'envoi disponibles"}
                            {viewMode === "auto" && "Envoi automatique"}
                        </span>
                    </div>
                    <button className="fp-send-close-btn" onClick={onClose} aria-label="Fermer">
                        <X size={14} />
                    </button>
                </div>

                {/* VIEW 1: Main Selection */}
                {viewMode === "main" && (
                    <div className="fp-send-options">
                        {/* Option 1: Self Send */}
                        <button className="fp-send-option" onClick={() => setViewMode("self")}>
                            <div className="fp-send-option-icon">
                                <Upload size={20} />
                            </div>
                            <div style={{ flex: 1, textAlign: 'left' }}>
                                <span className="fp-send-option-label">Envoyer par moi-même</span>
                                <span className="fp-send-option-desc">Télécharger, SMS, WhatsApp, Mail perso...</span>
                            </div>
                        </button>

                        {/* Option 2: Auto Send */}
                        <button className="fp-send-option" onClick={() => setViewMode("auto")}>
                            <div className="fp-send-option-icon" style={{ backgroundColor: "rgba(85,107,47,0.12)" }}>
                                <Send size={20} style={{ color: "#556B2F" }} />
                            </div>
                            <div style={{ flex: 1, textAlign: 'left' }}>
                                <span className="fp-send-option-label">Envoyer automatiquement</span>
                                <span className="fp-send-option-desc">E-mail professionnel direct avec lien de paiement</span>
                            </div>
                        </button>
                    </div>
                )}

                {/* VIEW 2: Send by myself channels */}
                {viewMode === "self" && (
                    <div className="fp-send-options" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {/* Download PDF */}
                        <button className="fp-send-option" onClick={handleDownload}>
                            <div className="fp-send-option-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                                <Download size={18} />
                            </div>
                            <div style={{ flex: 1, textAlign: 'left' }}>
                                <span className="fp-send-option-label">Télécharger le PDF</span>
                                <span className="fp-send-option-desc">Imprimer ou enregistrer la facture PDF</span>
                            </div>
                        </button>

                        {/* WhatsApp */}
                        <button className="fp-send-option" onClick={handleOpenWhatsApp}>
                            <div className="fp-send-option-icon" style={{ backgroundColor: 'rgba(37, 211, 102, 0.12)', color: '#25D366' }}>
                                <MessageCircle size={18} />
                            </div>
                            <div style={{ flex: 1, textAlign: 'left' }}>
                                <span className="fp-send-option-label">Partager par WhatsApp</span>
                                <span className="fp-send-option-desc">Ouvre WhatsApp avec le lien de la facture</span>
                            </div>
                        </button>

                        {/* SMS */}
                        <button className="fp-send-option" onClick={handleOpenSms}>
                            <div className="fp-send-option-icon" style={{ backgroundColor: 'rgba(168, 85, 247, 0.12)', color: '#a855f7' }}>
                                <MessageSquare size={18} />
                            </div>
                            <div style={{ flex: 1, textAlign: 'left' }}>
                                <span className="fp-send-option-label">Envoyer par SMS</span>
                                <span className="fp-send-option-desc">Ouvre l'application SMS de votre appareil</span>
                            </div>
                        </button>

                        {/* Mail Client */}
                        <button className="fp-send-option" onClick={handleOpenMailClient}>
                            <div className="fp-send-option-icon" style={{ backgroundColor: 'rgba(234, 88, 12, 0.12)', color: '#ea580c' }}>
                                <Mail size={18} />
                            </div>
                            <div style={{ flex: 1, textAlign: 'left' }}>
                                <span className="fp-send-option-label">Mon application e-mail (Mail / Gmail)</span>
                                <span className="fp-send-option-desc">Ouvre votre messagerie avec le message prêt</span>
                            </div>
                        </button>

                        {/* Copy Link */}
                        <button className="fp-send-option" onClick={handleCopyLink}>
                            <div className="fp-send-option-icon" style={{ backgroundColor: 'rgba(100, 116, 139, 0.12)', color: '#64748b' }}>
                                {copied ? <Check size={18} color="#16a34a" /> : <Copy size={18} />}
                            </div>
                            <div style={{ flex: 1, textAlign: 'left' }}>
                                <span className="fp-send-option-label">{copied ? "Lien copié dans le presse-papier !" : "Copier le lien de la facture"}</span>
                                <span className="fp-send-option-desc">Collez le lien où vous voulez</span>
                            </div>
                        </button>
                    </div>
                )}

                {/* VIEW 3: Auto Send with Reminder Confirmation */}
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
                                    Envoi par e-mail automatique
                                </h4>
                                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--muted-foreground)', lineHeight: 1.4 }}>
                                    La facture <strong>{docNumber}</strong> ({totalTtc} € TTC) sera envoyée automatiquement par e-mail au client avec la facture en pièce jointe et les coordonnées de paiement.
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

                        {/* Spam reminder notice */}
                        <div style={{
                            backgroundColor: 'rgba(85, 107, 47, 0.08)',
                            border: '1px solid rgba(85, 107, 47, 0.2)',
                            borderRadius: '8px',
                            padding: '10px 12px',
                            fontSize: '11.5px',
                            color: 'var(--muted-foreground)',
                            lineHeight: '1.4'
                        }}>
                            💡 <strong>Information d'expédition :</strong> L'e-mail est expédié via <strong>GestArt (support.gestart@gmail.com)</strong>. Si votre client ne le trouve pas dans sa boîte de réception, conseillez-lui de vérifier son dossier <strong>Spam / Courriers indésirables</strong>.
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

export default InvoiceSendDrawer;
