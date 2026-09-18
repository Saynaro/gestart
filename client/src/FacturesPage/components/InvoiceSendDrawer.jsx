import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Send, ArrowLeft, Download, MessageCircle, MessageSquare, Mail, Copy, Check, ShieldCheck, CreditCard, Building2, Eye, EyeOff, AlertTriangle, Info, RefreshCw, Loader2 } from "lucide-react";
import { useUser } from "../../utils/useUser";
import { apiFetch } from "../../utils/api";

function InvoiceSendDrawer({ invoice, onClose, onSelfSend, onAutoSend, onDownloadPdf }) {
    const { company, user } = useUser();
    const [viewMode, setViewMode] = useState("main"); // "main" | "self" | "auto"
    const [copied, setCopied] = useState(false);
    const [targetEmail, setTargetEmail] = useState(() => invoice?.clientEmail || invoice?.client?.email || "");
    const [isSending, setIsSending] = useState(false);
    const [showEmailPreview, setShowEmailPreview] = useState(false);
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

    // Nom de l'entreprise et coordonnées bancaires depuis le profil/settings
    const emailChannel = channelStatus?.channels?.email || channelStatus?.email;
    const isEmailConnected = emailChannel?.status === "CONNECTED";
    const companyDisplayName = company?.name || invoice?.company?.name || invoice?.emitterName || "Mon Entreprise";
    const senderEmailAddress = emailChannel?.emailAddress || company?.email || "votre-email@entreprise.fr";
    const bankIban = company?.settings?.bankIban || invoice?.company?.settings?.bankIban || invoice?.company?.bankIban || "FR76 3000 6000 0112 3456 7890 189";
    const bankBic = company?.settings?.bankBic || invoice?.company?.settings?.bankBic || invoice?.company?.bankBic || "PSSTFRPPMAR";
    const bankOwner = company?.settings?.bankAccountOwner || invoice?.company?.settings?.bankAccountOwner || company?.name || companyDisplayName;

    // Initialisation des modes de paiement depuis la facture ou les settings
    const [stripeEnabled, setStripeEnabled] = useState(() => {
        if (invoice?.stripeEnabled !== undefined && invoice?.stripeEnabled !== null) return Boolean(invoice.stripeEnabled);
        if (company?.settings?.stripePaymentEnabled !== undefined) return Boolean(company.settings.stripePaymentEnabled);
        if (invoice?.company?.settings?.stripePaymentEnabled !== undefined) return Boolean(invoice.company.settings.stripePaymentEnabled);
        if (company?.onlinePaymentEnabled !== undefined) return Boolean(company.onlinePaymentEnabled);
        return true;
    });

    const [bankTransferEnabled, setBankTransferEnabled] = useState(() => {
        if (invoice?.bankTransferEnabled !== undefined && invoice?.bankTransferEnabled !== null) return Boolean(invoice.bankTransferEnabled);
        if (company?.settings?.bankTransferEnabled !== undefined) return Boolean(company.settings.bankTransferEnabled);
        if (invoice?.company?.settings?.bankTransferEnabled !== undefined) return Boolean(invoice.company.settings.bankTransferEnabled);
        return true;
    });

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
            await onAutoSend(invoice, {
                targetEmail,
                stripePaymentEnabled: stripeEnabled,
                bankTransferEnabled: bankTransferEnabled
            });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <motion.div
            className="fp-send-drawer-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
        >
            <motion.div
                className="fp-send-drawer"
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
                        {/* Info Banner & Sender Status */}
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
                            <div style={{ flex: 1 }}>
                                <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#556B2F' }}>
                                    Envoi par e-mail automatique
                                </h4>
                                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--muted-foreground)', lineHeight: 1.4 }}>
                                    La facture <strong>{docNumber}</strong> ({totalTtc} € TTC) sera envoyée avec la facture PDF et le lien de paiement.
                                </p>
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
                                    Connectez votre compte Google / Email dans les Paramètres pour envoyer vos factures depuis votre propre adresse.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        onClose();
                                        window.location.href = '/settings?tab=communication';
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

                        {/* Modes de paiement à inclure dans l'e-mail */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--foreground)' }}>
                                Options de règlement à inclure dans l'e-mail :
                            </label>
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                backgroundColor: 'var(--card)',
                                padding: '12px',
                                borderRadius: '8px',
                                border: '1px solid var(--border)'
                            }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12.5px', cursor: 'pointer', fontWeight: 500, color: 'var(--foreground)' }}>
                                    <input
                                        type="checkbox"
                                        checked={stripeEnabled}
                                        onChange={(e) => setStripeEnabled(e.target.checked)}
                                        style={{ width: '16px', height: '16px', accentColor: '#635BFF', cursor: 'pointer' }}
                                    />
                                    <CreditCard size={15} style={{ color: '#635BFF' }} />
                                    <span>Paiement sécurisé par carte en ligne (Stripe)</span>
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12.5px', cursor: 'pointer', fontWeight: 500, color: 'var(--foreground)' }}>
                                    <input
                                        type="checkbox"
                                        checked={bankTransferEnabled}
                                        onChange={(e) => setBankTransferEnabled(e.target.checked)}
                                        style={{ width: '16px', height: '16px', accentColor: '#556B2F', cursor: 'pointer' }}
                                    />
                                    <Building2 size={15} style={{ color: '#556B2F' }} />
                                    <span>Coordonnées de virement bancaire direct (IBAN)</span>
                                </label>
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
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '8px',
                            backgroundColor: 'var(--accent, #f8fafc)',
                            border: '1px solid var(--border, #e2e8f0)',
                            borderRadius: '8px',
                            padding: '10px 12px',
                            fontSize: '11.5px',
                            color: 'var(--muted-foreground)',
                            lineHeight: '1.4'
                        }}>
                            <Info size={14} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--foreground)' }} />
                            <div>
                                <strong>Information d'expédition :</strong> L'e-mail est expédié via <strong>GestArt (support.gestart@gmail.com)</strong>. Si votre client ne le trouve pas dans sa boîte de réception, conseillez-lui de vérifier son dossier <strong>Spam / Courriers indésirables</strong>.
                            </div>
                        </div>

                        {/* Bouton Aperçu de l'e-mail (Lucide Icon) */}
                        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                            <button
                                type="button"
                                onClick={() => setShowEmailPreview(true)}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '7px 12px',
                                    borderRadius: '7px',
                                    border: '1px solid var(--border)',
                                    backgroundColor: 'var(--card)',
                                    color: 'var(--foreground)',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                <Eye size={14} style={{ color: 'var(--primary)' }} />
                                <span>Aperçu de l'e-mail</span>
                            </button>
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

            {/* ─────────────────────────────────────────────────────────────
                MODALE SÉPARÉE D'APERÇU D'EMAIL (OVERLAY INDÉPENDANT)
            ───────────────────────────────────────────────────────────── */}
            <AnimatePresence>
                {showEmailPreview && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={() => setShowEmailPreview(false)}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0, 0, 0, 0.7)',
                            backdropFilter: 'blur(4px)',
                            zIndex: 11000,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '16px'
                        }}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 15 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 15 }}
                            transition={{ type: "tween", ease: [0.16, 1, 0.3, 1], duration: 0.28 }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                width: '100%',
                                maxWidth: '580px',
                                maxHeight: '90vh',
                                display: 'flex',
                                flexDirection: 'column',
                                backgroundColor: '#0B1120',
                                borderRadius: '16px',
                                border: '1px solid #334155',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.65)',
                                overflow: 'hidden'
                            }}
                        >
                            {/* Header de la modale */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '14px 20px',
                                borderBottom: '1px solid #1E293B',
                                backgroundColor: '#0F172A'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Eye size={16} style={{ color: '#A3E635' }} />
                                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#F8FAFC' }}>
                                        Aperçu de l'e-mail client
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowEmailPreview(false)}
                                    style={{
                                        border: 'none',
                                        background: 'rgba(255, 255, 255, 0.08)',
                                        color: '#94A3B8',
                                        cursor: 'pointer',
                                        padding: '6px',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    <X size={15} />
                                </button>
                            </div>

                            {/* Contenu scrollable de l'e-mail */}
                            <div style={{ overflowY: 'auto', flex: 1 }}>
                                {/* Barre d'en-tête client mail */}
                                <div style={{
                                    backgroundColor: '#0F172A',
                                    padding: '12px 18px',
                                    borderBottom: '1px solid #1E293B',
                                    fontSize: '11.5px',
                                    color: '#94A3B8',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '3px'
                                }}>
                                    <div><strong style={{ color: '#CBD5E1' }}>De :</strong> {companyDisplayName} &lt;{senderEmailAddress}&gt;</div>
                                    <div><strong style={{ color: '#CBD5E1' }}>À :</strong> {targetEmail || 'email.client@exemple.fr'}</div>
                                    <div><strong style={{ color: '#CBD5E1' }}>Objet :</strong> Facture {docNumber} ({totalTtc} € TTC) — {companyDisplayName}</div>
                                </div>

                                {/* Corps du message HTML */}
                                <div style={{
                                    padding: '24px 20px',
                                    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                                    color: '#F8FAFC',
                                    backgroundColor: '#0F172A',
                                    fontSize: '13px'
                                }}>
                                    {/* Titre entreprise */}
                                    <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF' }}>
                                            {companyDisplayName}
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>
                                            Facture &amp; Coordonnées de paiement
                                        </div>
                                    </div>

                                    {/* Cadre carte principale */}
                                    <div style={{
                                        backgroundColor: '#1E293B',
                                        padding: '22px',
                                        borderRadius: '12px',
                                        border: '1px solid #334155'
                                    }}>
                                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#FFFFFF', marginBottom: '8px' }}>
                                            Bonjour {clientName},
                                        </div>
                                        <p style={{ color: '#E2E8F0', fontSize: '13px', lineHeight: 1.5, margin: '0 0 16px 0' }}>
                                            Veuillez trouver ci-joint votre facture <strong>{docNumber}</strong> d'un montant de <strong>{totalTtc} € TTC</strong> (fichier PDF attaché).
                                        </p>

                                        {/* Montant total */}
                                        <div style={{
                                            backgroundColor: '#0F172A',
                                            padding: '14px 16px',
                                            borderRadius: '8px',
                                            border: '1px solid #334155',
                                            marginBottom: '18px'
                                        }}>
                                            <div style={{ fontSize: '11.5px', color: '#94A3B8', marginBottom: '2px' }}>Montant total de la facture :</div>
                                            <div style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF' }}>{totalTtc} € TTC</div>
                                        </div>

                                        {/* Modes de paiement dynamiques selon les cases cochées */}
                                        {stripeEnabled && bankTransferEnabled && (
                                            <div>
                                                <div style={{ color: '#E2E8F0', fontSize: '12.5px', fontWeight: 600, marginBottom: '12px' }}>
                                                    Modes de règlement disponibles :
                                                </div>

                                                {/* Option 1 : Stripe */}
                                                <div style={{ backgroundColor: '#0F172A', padding: '16px', borderRadius: '10px', border: '1px solid #334155', marginBottom: '12px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13.5px', fontWeight: 700, color: '#FFFFFF', marginBottom: '6px' }}>
                                                        <CreditCard size={15} style={{ color: '#635BFF' }} />
                                                        <span>Option 1 : Paiement sécurisé en ligne (Stripe)</span>
                                                    </div>
                                                    <div style={{ color: '#94A3B8', fontSize: '12px', marginBottom: '12px' }}>
                                                        Réglez instantanément par carte bancaire en quelques clics :
                                                    </div>
                                                    <div style={{ textAlign: 'center' }}>
                                                        <span style={{
                                                            display: 'inline-block',
                                                            backgroundColor: '#556B2F',
                                                            color: '#FFFFFF',
                                                            padding: '10px 22px',
                                                            borderRadius: '8px',
                                                            fontWeight: 700,
                                                            fontSize: '13px'
                                                        }}>
                                                            Payer en ligne par carte bancaire
                                                        </span>
                                                    </div>
                                                </div>

                                                <div style={{ textAlign: 'center', margin: '10px 0', color: '#64748B', fontWeight: 700, fontSize: '11px', letterSpacing: '0.05em' }}>
                                                    — OU PAR VIREMENT BANCAIRE —
                                                </div>

                                                {/* Option 2 : Virement */}
                                                <div style={{ backgroundColor: '#0F172A', padding: '16px', borderRadius: '10px', border: '1px solid #334155' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13.5px', fontWeight: 700, color: '#FFFFFF', marginBottom: '10px' }}>
                                                        <Building2 size={15} style={{ color: '#A3E635' }} />
                                                        <span>Option 2 : Virement bancaire</span>
                                                    </div>
                                                    <table style={{ width: '100%', fontSize: '12px', color: '#CBD5E1', borderCollapse: 'collapse' }}>
                                                        <tbody>
                                                            <tr>
                                                                <td style={{ padding: '4px 0', color: '#94A3B8', width: '95px' }}>Titulaire :</td>
                                                                <td style={{ padding: '4px 0', fontWeight: 600, color: '#FFFFFF' }}>{bankOwner}</td>
                                                            </tr>
                                                            <tr>
                                                                <td style={{ padding: '4px 0', color: '#94A3B8' }}>IBAN :</td>
                                                                <td style={{ padding: '4px 0', fontFamily: 'monospace', fontWeight: 700, color: '#A3E635' }}>{bankIban}</td>
                                                            </tr>
                                                            <tr>
                                                                <td style={{ padding: '4px 0', color: '#94A3B8' }}>BIC :</td>
                                                                <td style={{ padding: '4px 0', fontFamily: 'monospace', color: '#FFFFFF' }}>{bankBic}</td>
                                                            </tr>
                                                            <tr>
                                                                <td style={{ padding: '4px 0', color: '#94A3B8' }}>Référence :</td>
                                                                <td style={{ padding: '4px 0', fontWeight: 700, color: '#FFFFFF' }}><span style={{ backgroundColor: '#1E293B', padding: '2px 7px', borderRadius: '4px', border: '1px solid #475569' }}>{docNumber}</span> (obligatoire)</td>
                                                            </tr>
                                                            <tr>
                                                                <td style={{ padding: '4px 0', color: '#94A3B8' }}>Montant :</td>
                                                                <td style={{ padding: '4px 0', fontWeight: 700, color: '#FFFFFF' }}>{totalTtc} €</td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}

                                        {stripeEnabled && !bankTransferEnabled && (
                                            <div>
                                                <p style={{ color: '#E2E8F0', fontSize: '13px', margin: '0 0 14px 0' }}>
                                                    Vous pouvez consulter votre facture et <strong>effectuer votre paiement sécurisé en ligne par carte bancaire</strong> :
                                                </p>
                                                <div style={{ textAlign: 'center', margin: '16px 0' }}>
                                                    <span style={{
                                                        display: 'inline-block',
                                                        backgroundColor: '#556B2F',
                                                        color: '#FFFFFF',
                                                        padding: '12px 26px',
                                                        borderRadius: '8px',
                                                        fontWeight: 700,
                                                        fontSize: '13.5px'
                                                    }}>
                                                        Payer ma facture en ligne ({totalTtc} €)
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        {!stripeEnabled && bankTransferEnabled && (
                                            <div style={{ backgroundColor: '#0F172A', padding: '16px', borderRadius: '10px', border: '1px solid #334155' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13.5px', fontWeight: 700, color: '#FFFFFF', marginBottom: '10px' }}>
                                                    <Building2 size={15} style={{ color: '#A3E635' }} />
                                                    <span>Coordonnées pour virement bancaire :</span>
                                                </div>
                                                <table style={{ width: '100%', fontSize: '12px', color: '#CBD5E1', borderCollapse: 'collapse' }}>
                                                    <tbody>
                                                        <tr>
                                                            <td style={{ padding: '4px 0', color: '#94A3B8', width: '95px' }}>Titulaire :</td>
                                                            <td style={{ padding: '4px 0', fontWeight: 600, color: '#FFFFFF' }}>{bankOwner}</td>
                                                        </tr>
                                                        <tr>
                                                            <td style={{ padding: '4px 0', color: '#94A3B8' }}>IBAN :</td>
                                                            <td style={{ padding: '4px 0', fontFamily: 'monospace', fontWeight: 700, color: '#A3E635' }}>{bankIban}</td>
                                                        </tr>
                                                        <tr>
                                                            <td style={{ padding: '4px 0', color: '#94A3B8' }}>BIC :</td>
                                                            <td style={{ padding: '4px 0', fontFamily: 'monospace', color: '#FFFFFF' }}>{bankBic}</td>
                                                        </tr>
                                                        <tr>
                                                            <td style={{ padding: '4px 0', color: '#94A3B8' }}>Référence :</td>
                                                            <td style={{ padding: '4px 0', fontWeight: 700, color: '#FFFFFF' }}><span style={{ backgroundColor: '#1E293B', padding: '2px 7px', borderRadius: '4px', border: '1px solid #475569' }}>{docNumber}</span> (obligatoire)</td>
                                                        </tr>
                                                        <tr>
                                                            <td style={{ padding: '4px 0', color: '#94A3B8' }}>Montant :</td>
                                                            <td style={{ padding: '4px 0', fontWeight: 700, color: '#FFFFFF' }}>{totalTtc} €</td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}

                                        {!stripeEnabled && !bankTransferEnabled && (
                                            <div style={{ textAlign: 'center', padding: '12px 0' }}>
                                                <span style={{
                                                    display: 'inline-block',
                                                    backgroundColor: '#556B2F',
                                                    color: '#FFFFFF',
                                                    padding: '12px 26px',
                                                    borderRadius: '8px',
                                                    fontWeight: 700,
                                                    fontSize: '13.5px'
                                                }}>
                                                    Consulter ma facture en ligne
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Footer du mail */}
                                    <div style={{ textAlign: 'center', marginTop: '18px', color: '#64748B', fontSize: '11.5px' }}>
                                        <p style={{ margin: '0 0 4px 0' }}>© 2026 {companyDisplayName}.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Footer de la modale */}
                            <div style={{
                                padding: '12px 20px',
                                borderTop: '1px solid #1E293B',
                                backgroundColor: '#0F172A',
                                display: 'flex',
                                justifyContent: 'flex-end'
                            }}>
                                <button
                                    type="button"
                                    onClick={() => setShowEmailPreview(false)}
                                    style={{
                                        padding: '8px 18px',
                                        borderRadius: '8px',
                                        border: '1px solid #334155',
                                        backgroundColor: '#1E293B',
                                        color: '#F8FAFC',
                                        fontWeight: 600,
                                        fontSize: '12.5px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Fermer l'aperçu
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

export default InvoiceSendDrawer;
