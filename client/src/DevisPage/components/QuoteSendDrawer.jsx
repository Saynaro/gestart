import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Send, ArrowLeft, Download, MessageCircle, MessageSquare, Mail, Copy, Check, ShieldCheck, AlertTriangle, CreditCard, Building, RefreshCw, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../utils/useUser";
import { apiFetch } from "../../utils/api";

function QuoteSendDrawer({ quote, onClose, onSelfSend, onAutoSend, onDownloadPdf }) {
    const navigate = useNavigate();
    const { company } = useUser();
    const [viewMode, setViewMode] = useState("main"); // "main" | "self" | "auto" | "iban_warning"
    const [copied, setCopied] = useState(false);
    const [targetEmail, setTargetEmail] = useState(() => quote?.clientEmail || quote?.client?.email || "");
    const [isSending, setIsSending] = useState(false);
    const [loadingChannels, setLoadingChannels] = useState(true);
    const [channelStatus, setChannelStatus] = useState(null);
    const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" ? window.innerWidth <= 768 : false);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const fetchChannels = async () => {
        try {
            setLoadingChannels(true);
            const res = await apiFetch("/v1/communication/channels");
            if (res.success && res.data) {
                setChannelStatus(res.data);
            }
        } catch (e) {
            // Ignore
        } finally {
            setLoadingChannels(false);
        }
    };

    useEffect(() => {
        fetchChannels();
    }, []);

    if (!quote) return null;

    const emailChannel = channelStatus?.channels?.email || channelStatus?.email;
    const isEmailConnected = emailChannel?.status === "CONNECTED";
    const companyDisplayName = company?.name || quote?.company?.name || "Votre entreprise";
    const senderEmailAddress = emailChannel?.emailAddress || company?.email || "votre-email@entreprise.fr";

    const hasIban = !!(company?.settings?.bankIban || company?.bankIban || company?.iban);
    const docNumber = quote.number || `D-${quote.id}`;
    const clientName = quote.clientName || "Client";
    const totalTtc = Number(quote.totalTtc || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/sign/quote/${quote.signatureToken || quote.id || ''}` : `https://gestart.fr/sign/quote/${quote.signatureToken || quote.id || ''}`;
    const defaultMsg = `Bonjour ${clientName},\n\nVeuillez trouver votre devis ${docNumber} d'un montant de ${totalTtc} € TTC.\nVous pouvez le consulter, le signer en ligne avec valeur légale et régler par carte bancaire ici :\n${shareUrl}\n\nCordialement,\n${company?.name || 'Votre entreprise'}`;

    const handleCopyText = () => {
        navigator.clipboard.writeText(defaultMsg);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    const handleCopyLinkOnly = () => {
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

    const handleStartAutoSend = () => {
        if (!hasIban) {
            setViewMode("iban_warning");
        } else {
            setViewMode("auto");
        }
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
        <motion.div
            className="dv-send-drawer-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
        >
            <motion.div
                className="dv-send-drawer"
                initial={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95, y: 15 }}
                animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
                exit={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95, y: 15 }}
                transition={{ type: "tween", ease: [0.16, 1, 0.3, 1], duration: 0.32 }}
                onClick={e => e.stopPropagation()}
                drag={isMobile ? "y" : false}
                dragConstraints={{ top: 0 }}
                dragElastic={{ top: 0, bottom: 0.8 }}
                onDragEnd={(event, info) => {
                    if (isMobile && info.offset.y > 80) {
                        onClose();
                    }
                }}
            >
                {/* Mobile Drag Handle */}
                {isMobile && (
                    <div style={{ display: "flex", justifyContent: "center", width: "100%", paddingBottom: "10px", cursor: "grab" }}>
                        <div style={{ width: "36px", height: "4px", backgroundColor: "var(--border, #CBD5E1)", borderRadius: "2px" }} />
                    </div>
                )}
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
                            {viewMode === "self" && "Envoyer par moi-même"}
                            {viewMode === "iban_warning" && "Coordonnées bancaires"}
                            {viewMode === "auto" && "Envoi automatique & Signature"}
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
                                <span className="dv-send-option-desc">Copier le texte, SMS, WhatsApp, Mail perso, PDF...</span>
                            </div>
                        </button>

                        {/* Option 2: Auto Send */}
                        <button className="dv-send-option" onClick={handleStartAutoSend}>
                            <div className="dv-send-option-icon" style={{ backgroundColor: "rgba(85,107,47,0.12)" }}>
                                <Send size={20} style={{ color: "#556B2F" }} />
                            </div>
                            <div style={{ flex: 1, textAlign: 'left' }}>
                                <span className="dv-send-option-label">Envoyer automatiquement</span>
                                <span className="dv-send-option-desc">E-mail certifié avec PDF + lien de signature en ligne</span>
                            </div>
                        </button>
                    </div>
                )}

                {/* VIEW IBAN WARNING: If IBAN is not set */}
                {viewMode === "iban_warning" && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '6px 0' }}>
                        <div style={{
                            padding: '16px',
                            borderRadius: '12px',
                            backgroundColor: 'rgba(245, 158, 11, 0.08)',
                            border: '1px solid rgba(245, 158, 11, 0.25)',
                            display: 'flex',
                            gap: '12px',
                            alignItems: 'flex-start'
                        }}>
                            <AlertTriangle size={24} style={{ color: '#D97706', flexShrink: 0, marginTop: '2px' }} />
                            <div>
                                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#D97706' }}>
                                    IBAN non renseigné dans votre compte
                                </h4>
                                <p style={{ margin: '6px 0 0 0', fontSize: '12.5px', color: 'var(--foreground)', lineHeight: 1.45 }}>
                                    Pour que vos clients puissent régler ce devis en ligne et recevoir vos coordonnées bancaires sur le PDF, nous vous recommandons de renseigner votre IBAN.
                                </p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
                            <button
                                type="button"
                                onClick={() => {
                                    onClose();
                                    navigate('/settings?tab=entreprise');
                                }}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    padding: '12px 18px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    backgroundColor: '#556B2F',
                                    color: '#ffffff',
                                    fontWeight: 700,
                                    fontSize: '13.5px',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 12px rgba(85, 107, 47, 0.3)'
                                }}
                            >
                                <Building size={16} />
                                <span>Renseigner mon IBAN maintenant</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setViewMode("auto")}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    padding: '11px 18px',
                                    borderRadius: '10px',
                                    border: '1px solid var(--border)',
                                    backgroundColor: 'var(--card, #FFFFFF)',
                                    color: 'var(--foreground)',
                                    fontWeight: 600,
                                    fontSize: '13px',
                                    cursor: 'pointer'
                                }}
                            >
                                <Send size={15} style={{ color: 'var(--muted-foreground)' }} />
                                <span>Envoyer sans lien de paiement</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* VIEW 2: Send by myself channels */}
                {viewMode === "self" && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {/* Copyable Formatted Text Box */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--foreground)' }}>
                                    Message prêt à copier & envoyer :
                                </label>
                                <span style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>Avec lien de signature</span>
                            </div>
                            <textarea
                                readOnly
                                value={defaultMsg}
                                rows={5}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    borderRadius: '10px',
                                    border: '1px solid var(--border)',
                                    backgroundColor: 'var(--background)',
                                    color: 'var(--foreground)',
                                    fontSize: '12.5px',
                                    lineHeight: '1.45',
                                    fontFamily: 'inherit',
                                    resize: 'none'
                                }}
                            />
                            <button
                                type="button"
                                onClick={handleCopyText}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    padding: '10px 14px',
                                    borderRadius: '8px',
                                    border: '1.5px solid #556B2F',
                                    backgroundColor: 'rgba(85, 107, 47, 0.08)',
                                    color: '#556B2F',
                                    fontWeight: 700,
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                {copied ? <Check size={16} color="#16a34a" /> : <Copy size={16} />}
                                <span>{copied ? "Texte copié avec succès !" : "Copier le texte complet"}</span>
                            </button>
                        </div>

                        <div style={{ height: '1px', backgroundColor: 'var(--border)', margin: '4px 0' }} />

                        {/* Quick Channels */}
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
                                    <span className="dv-send-option-desc">Ouvre WhatsApp avec le message et le lien</span>
                                </div>
                            </button>

                            {/* SMS */}
                            <button className="dv-send-option" onClick={handleOpenSms}>
                                <div className="dv-send-option-icon" style={{ backgroundColor: 'rgba(168, 85, 247, 0.12)', color: '#a855f7' }}>
                                    <MessageSquare size={18} />
                                </div>
                                <div style={{ flex: 1, textAlign: 'left' }}>
                                    <span className="dv-send-option-label">Envoyer par SMS</span>
                                    <span className="dv-send-option-desc">Ouvre l'application SMS de votre téléphone</span>
                                </div>
                            </button>

                            {/* Mail Client */}
                            <button className="dv-send-option" onClick={handleOpenMailClient}>
                                <div className="dv-send-option-icon" style={{ backgroundColor: 'rgba(234, 88, 12, 0.12)', color: '#ea580c' }}>
                                    <Mail size={18} />
                                </div>
                                <div style={{ flex: 1, textAlign: 'left' }}>
                                    <span className="dv-send-option-label">Mon application e-mail (Mail / Gmail)</span>
                                    <span className="dv-send-option-desc">Ouvre votre messagerie avec le texte pré-rempli</span>
                                </div>
                            </button>
                        </div>
                    </div>
                )}

                {/* VIEW 3: Auto Send with Signature & Payment Notice */}
                {viewMode === "auto" && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '4px 0' }}>
                        {/* Info Banner with Signature + Payment details */}
                        <div style={{
                            padding: '14px 16px',
                            borderRadius: '12px',
                            backgroundColor: 'rgba(85, 107, 47, 0.08)',
                            border: '1px solid rgba(85, 107, 47, 0.25)',
                            display: 'flex',
                            gap: '12px',
                            alignItems: 'flex-start'
                        }}>
                            <ShieldCheck size={22} style={{ color: '#556B2F', flexShrink: 0, marginTop: '2px' }} />
                            <div>
                                <h4 style={{ margin: 0, fontSize: '13.5px', fontWeight: 700, color: '#556B2F' }}>
                                    Envoi certifié avec signature électronique
                                </h4>
                                <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: 'var(--foreground)', lineHeight: 1.45 }}>
                                    Le devis <strong>{docNumber}</strong> ({totalTtc} € TTC) sera envoyé par e-mail avec :
                                </p>
                                <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', fontSize: '12px', color: 'var(--muted-foreground)', lineHeight: 1.45 }}>
                                    <li>Le devis officiel en fichier <strong>PDF attaché</strong>.</li>
                                    <li>Un lien sécurisé pour <strong>signer en ligne avec valeur légale</strong>.</li>
                                </ul>
                            </div>
                        </div>

                        {/* Email Connection Status Badge */}
                        {loadingChannels ? (
                            <div style={{
                                padding: '10px 14px',
                                borderRadius: '8px',
                                backgroundColor: 'rgba(0,0,0,0.03)',
                                border: '1px solid var(--border)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                color: 'var(--muted-foreground)',
                                fontSize: '12px'
                            }}>
                                <Loader2 size={14} className="animate-spin" />
                                <span>Vérification de la boîte email d'envoi...</span>
                            </div>
                        ) : isEmailConnected ? (
                            <div style={{
                                padding: '10px 14px',
                                borderRadius: '8px',
                                backgroundColor: 'rgba(85, 107, 47, 0.08)',
                                border: '1px solid rgba(85, 107, 47, 0.25)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '8px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Check size={16} style={{ color: '#556B2F', flexShrink: 0 }} />
                                    <span style={{ fontSize: '12px', color: 'var(--foreground)' }}>
                                        Expéditeur : <strong>{companyDisplayName}</strong> ({senderEmailAddress})
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={fetchChannels}
                                    title="Actualiser le statut"
                                    style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '3px', display: 'flex', alignItems: 'center', color: 'var(--muted-foreground)' }}
                                >
                                    <RefreshCw size={13} />
                                </button>
                            </div>
                        ) : (
                            <div style={{
                                padding: '12px 14px',
                                borderRadius: '8px',
                                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                                border: '1px solid rgba(239, 68, 68, 0.25)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <AlertTriangle size={16} style={{ color: '#ef4444', flexShrink: 0 }} />
                                        <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#ef4444' }}>
                                            Adresse email professionnelle non connectée
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={fetchChannels}
                                        title="Actualiser le statut"
                                        style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '3px', display: 'flex', alignItems: 'center', color: '#ef4444' }}
                                    >
                                        <RefreshCw size={13} />
                                    </button>
                                </div>
                                <p style={{ fontSize: '12px', color: 'var(--muted-foreground)', margin: 0, lineHeight: 1.4 }}>
                                    Connectez votre compte Google / Email dans les Paramètres pour envoyer vos devis depuis votre propre adresse.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        onClose();
                                        navigate('/settings?tab=communication');
                                    }}
                                    style={{
                                        alignSelf: 'flex-start',
                                        marginTop: '4px',
                                        backgroundColor: '#556B2F',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '6px',
                                        padding: '6px 12px',
                                        fontSize: '11.5px',
                                        fontWeight: 700,
                                        cursor: 'pointer'
                                    }}
                                >
                                    Connecter mon compte Google
                                </button>
                            </div>
                        )}

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
                            💡 <strong>Information d'expédition :</strong> L'e-mail est expédié de la part de <strong>{companyDisplayName}</strong>. Si votre client ne le trouve pas dans sa boîte de réception, conseillez-lui de vérifier son dossier <strong>Spam / Courriers indésirables</strong>.
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
            </motion.div>
        </motion.div>
    );
}

export default QuoteSendDrawer;
