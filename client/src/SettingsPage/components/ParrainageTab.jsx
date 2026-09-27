import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, Copy, Check, Users, Share2, MessageCircle, Mail, Smartphone, ArrowRight, Sparkles, CheckCircle2, ShieldCheck, Loader2 } from "lucide-react";
import { apiFetch } from "../../utils/api";
import { useUser } from "../../utils/useUser";

export default function ParrainageTab({ isMobileView, triggerToast }) {
    const { user, company } = useUser();
    const [copied, setCopied] = useState(false);
    const [copiedCode, setCopiedCode] = useState(false);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);

    // Fallback code and link generated dynamically from user/company session if backend loading
    const defaultCode = ((company?.name || user?.firstName || "ARTISAN").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) || "ARTISAN") + "-" + ((company?.id || user?.id || "PRO1").slice(-4).toUpperCase());
    const fallbackLink = `https://gestart.fr/register?ref=${defaultCode}`;

    useEffect(() => {
        let isMounted = true;
        const fetchReferralStats = async () => {
            try {
                setLoading(true);
                const res = await apiFetch("/v1/referrals/my-stats");
                if (isMounted && res && res.success) {
                    setStats(res);
                }
            } catch (err) {
                console.warn("Utilisation des données locales de parrainage:", err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchReferralStats();
        return () => { isMounted = false; };
    }, []);

    const referralCode = stats?.referralCode || defaultCode;
    const referralLink = stats?.referralLink || fallbackLink;
    const totalReferred = stats?.totalReferred || 0;
    const totalRewardedMonths = stats?.totalRewardedMonths || 0;
    const totalSavingsEur = stats?.totalSavingsEur || (totalRewardedMonths * 39);
    const referrals = stats?.referrals || [];

    const copyTextToClipboard = async (text) => {
        let copiedSuccessfully = false;
        if (navigator.clipboard && window.isSecureContext) {
            try {
                await navigator.clipboard.writeText(text);
                copiedSuccessfully = true;
            } catch (err) {
                console.warn("Clipboard API failed:", err);
            }
        }

        if (!copiedSuccessfully) {
            try {
                const textArea = document.createElement("textarea");
                textArea.value = text;
                textArea.style.position = "fixed";
                textArea.style.top = "0";
                textArea.style.left = "0";
                textArea.style.width = "2em";
                textArea.style.height = "2em";
                textArea.style.padding = "0";
                textArea.style.border = "none";
                textArea.style.outline = "none";
                textArea.style.boxShadow = "none";
                textArea.style.background = "transparent";
                textArea.setAttribute("readonly", "");
                document.body.appendChild(textArea);

                textArea.focus();
                textArea.select();
                textArea.setSelectionRange(0, 99999);

                const successful = document.execCommand("copy");
                document.body.removeChild(textArea);
                if (successful) copiedSuccessfully = true;
            } catch (err) {
                console.warn("Fallback copy failed:", err);
            }
        }
        return copiedSuccessfully;
    };

    const handleCopy = async () => {
        await copyTextToClipboard(referralLink);
        setCopied(true);
        if (triggerToast) {
            triggerToast("Lien de parrainage copié dans le presse-papier !");
        }
        setTimeout(() => setCopied(false), 2200);
    };

    const handleCopyCode = async () => {
        await copyTextToClipboard(referralCode);
        setCopiedCode(true);
        if (triggerToast) {
            triggerToast(`Code "${referralCode}" copié dans le presse-papier !`);
        }
        setTimeout(() => setCopiedCode(false), 2200);
    };

    const shareMessage = `Salut ! J'utilise GestArt pour gérer mes devis, factures et planning d'artisan en toute simplicité. Inscris-toi via mon lien exclusif pour tester gratuitement et profiter d'avantages : ${referralLink}`;

    const handleShareWhatsApp = () => {
        const url = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
        window.open(url, "_blank");
    };

    const handleShareSms = () => {
        const url = `sms:?&body=${encodeURIComponent(shareMessage)}`;
        window.open(url, "_blank");
    };

    const handleShareEmail = () => {
        const subject = encodeURIComponent("Recommandation outil de gestion artisan GestArt");
        const body = encodeURIComponent(shareMessage);
        window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {/* Banner Parrainage */}
            <div style={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '14px',
                padding: '20px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
                    <div style={{
                        width: '42px',
                        height: '42px',
                        minWidth: '42px',
                        minHeight: '42px',
                        borderRadius: '12px',
                        backgroundColor: 'var(--sidebar-primary)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                    }}>
                        <Gift size={22} />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--foreground)' }}>
                            Programme de Parrainage Artisans
                        </h3>
                        <p style={{ margin: '3px 0 0 0', fontSize: '13px', color: 'var(--muted-foreground)' }}>
                            Partagez GestArt avec vos confrères et gagnez des mois d'abonnement offerts.
                        </p>
                    </div>
                </div>

                <p style={{ margin: '0 0 16px 0', fontSize: '13.5px', color: 'var(--foreground)', lineHeight: '1.5' }}>
                    Pour chaque confrère qui <strong>finalise son inscription complète</strong> sur GestArt avec votre lien ou code, vous recevez automatiquement <strong>1 mois offert (+30 jours)</strong> crédité sur votre compte (sans limite de cumul).
                </p>

                {/* Unique Link Input Box */}
                <div style={{
                    display: 'flex',
                    flexDirection: isMobileView ? 'column' : 'row',
                    gap: '10px',
                    alignItems: 'stretch',
                    marginBottom: '14px'
                }}>
                    <div style={{
                        flex: 1,
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center'
                    }}>
                        <input
                            type="text"
                            value={referralLink}
                            readOnly
                            style={{
                                width: '100%',
                                padding: '12px 14px',
                                backgroundColor: 'var(--background)',
                                border: `1px solid ${copied ? 'rgba(34, 197, 94, 0.5)' : 'var(--border)'}`,
                                borderRadius: '10px',
                                fontSize: '13px',
                                fontWeight: 700,
                                color: copied ? '#22c55e' : 'var(--sidebar-primary)',
                                outline: 'none',
                                transition: 'all 0.3s ease'
                            }}
                        />
                    </div>

                    <motion.button
                        type="button"
                        onClick={handleCopy}
                        whileTap={{ scale: 0.94 }}
                        whileHover={{ scale: 1.02 }}
                        animate={{
                            backgroundColor: copied ? '#16a34a' : 'var(--sidebar-primary)',
                            boxShadow: copied ? '0 0 14px rgba(34, 197, 94, 0.4)' : '0 2px 6px rgba(0,0,0,0.1)'
                        }}
                        transition={{ duration: 0.2 }}
                        style={{
                            padding: '12px 22px',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '10px',
                            fontWeight: 700,
                            fontSize: '13.5px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            flexShrink: 0,
                            userSelect: 'none',
                            overflow: 'hidden'
                        }}
                    >
                        <AnimatePresence mode="wait" initial={false}>
                            {copied ? (
                                <motion.div
                                    key="copied"
                                    initial={{ scale: 0.6, opacity: 0, y: 5 }}
                                    animate={{ scale: 1, opacity: 1, y: 0 }}
                                    exit={{ scale: 0.6, opacity: 0, y: -5 }}
                                    transition={{ type: "spring", stiffness: 500, damping: 25 }}
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                                >
                                    <motion.div
                                        initial={{ rotate: -45, scale: 0 }}
                                        animate={{ rotate: 0, scale: 1 }}
                                        transition={{ type: "spring", stiffness: 600, damping: 20 }}
                                    >
                                        <Check size={18} strokeWidth={2.8} />
                                    </motion.div>
                                    <span>Lien copié !</span>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="copy"
                                    initial={{ scale: 0.6, opacity: 0, y: -5 }}
                                    animate={{ scale: 1, opacity: 1, y: 0 }}
                                    exit={{ scale: 0.6, opacity: 0, y: 5 }}
                                    transition={{ duration: 0.15 }}
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                                >
                                    <Copy size={17} />
                                    <span>Copier le lien</span>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.button>
                </div>

                {/* Quick Share Buttons Row */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted-foreground)', marginRight: '4px' }}>
                        Partager via :
                    </span>
                    <button
                        type="button"
                        onClick={handleShareWhatsApp}
                        style={{
                            padding: '7px 12px',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            backgroundColor: 'var(--card)',
                            color: 'var(--foreground)',
                            fontSize: '12.5px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        <MessageCircle size={15} style={{ color: '#22c55e' }} />
                        WhatsApp
                    </button>
                    <button
                        type="button"
                        onClick={handleShareSms}
                        style={{
                            padding: '7px 12px',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            backgroundColor: 'var(--card)',
                            color: 'var(--foreground)',
                            fontSize: '12.5px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        <Smartphone size={15} style={{ color: '#3b82f6' }} />
                        SMS
                    </button>
                    <button
                        type="button"
                        onClick={handleShareEmail}
                        style={{
                            padding: '7px 12px',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            backgroundColor: 'var(--card)',
                            color: 'var(--foreground)',
                            fontSize: '12.5px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        <Mail size={15} style={{ color: '#ea580c' }} />
                        Email
                    </button>
                </div>
            </div>

            {/* Metric Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <div style={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '14px',
                    padding: '18px'
                }}>
                    <span style={{ fontSize: '12.5px', color: 'var(--muted-foreground)', fontWeight: 600 }}>
                        Artisans parrainés
                    </span>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--sidebar-primary)', marginTop: '4px' }}>
                        {loading ? <Loader2 size={20} className="spin-loader" /> : `${totalReferred} ${totalReferred > 1 ? "artisans" : "artisan"}`}
                    </div>
                    <span style={{ fontSize: '11.5px', color: 'var(--muted-foreground)' }}>
                        Inscrits via votre lien
                    </span>
                </div>

                <div style={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '14px',
                    padding: '18px'
                }}>
                    <span style={{ fontSize: '12.5px', color: 'var(--muted-foreground)', fontWeight: 600 }}>
                        Mois d'abonnement gagnés
                    </span>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#22c55e', marginTop: '4px' }}>
                        {loading ? <Loader2 size={20} className="spin-loader" /> : `${totalRewardedMonths} mois`}
                    </div>
                    <span style={{ fontSize: '11.5px', color: 'var(--muted-foreground)' }}>
                        {totalSavingsEur > 0 ? `Soit ${totalSavingsEur} € d'économies réalisées` : "Crédités sur votre facture"}
                    </span>
                </div>
            </div>

            {/* Comment ça marche (3 étapes) */}
            <div style={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '14px',
                padding: '20px'
            }}>
                <h4 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: 700, color: 'var(--foreground)' }}>
                    Comment fonctionne le parrainage ?
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: isMobileView ? '1fr' : 'repeat(3, 1fr)', gap: '14px' }}>
                    <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}>
                        <div style={{ fontWeight: 800, fontSize: '13px', color: 'var(--sidebar-primary)', marginBottom: '4px' }}>
                            1. Partagez votre lien
                        </div>
                        <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--muted-foreground)', lineHeight: 1.4 }}>
                            Envoyez votre lien unique à vos collègues artisans par WhatsApp, SMS ou email.
                        </p>
                    </div>

                    <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}>
                        <div style={{ fontWeight: 800, fontSize: '13px', color: 'var(--sidebar-primary)', marginBottom: '4px' }}>
                            2. Inscription & Essai
                        </div>
                        <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--muted-foreground)', lineHeight: 1.4 }}>
                            Votre confrère crée son compte et teste toutes les fonctionnalités de GestArt gratuitement.
                        </p>
                    </div>

                    <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}>
                        <div style={{ fontWeight: 800, fontSize: '13px', color: '#22c55e', marginBottom: '4px' }}>
                            3. Mois offert immédiat
                        </div>
                        <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--muted-foreground)', lineHeight: 1.4 }}>
                            Dès que votre confrère finalise son inscription, 1 mois offert est automatiquement ajouté à votre compte.
                        </p>
                    </div>
                </div>
            </div>

            {/* Historique des parrainages */}
            <div style={{
                border: '1px solid var(--border)',
                borderRadius: '14px',
                padding: '20px',
                backgroundColor: 'var(--card)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobileView ? 'flex-start' : 'center', marginBottom: '16px', flexDirection: isMobileView ? 'column' : 'row', gap: '10px' }}>
                    <h4 style={{ margin: 0, fontSize: isMobileView ? '16.5px' : '15px', fontWeight: 800, color: 'var(--foreground)', letterSpacing: '-0.2px' }}>
                        Historique de vos parrainages
                    </h4>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--muted-foreground)', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        Code :
                        <motion.button
                            type="button"
                            onClick={handleCopyCode}
                            whileTap={{ scale: 0.93 }}
                            whileHover={{ scale: 1.04 }}
                            animate={{
                                backgroundColor: copiedCode ? 'rgba(34, 197, 94, 0.15)' : 'var(--background)',
                                borderColor: copiedCode ? '#22c55e' : 'var(--border)',
                                color: copiedCode ? '#16a34a' : 'var(--sidebar-primary)'
                            }}
                            title="Cliquer pour copier le code"
                            style={{
                                border: '1px solid var(--border)',
                                padding: '4px 10px',
                                borderRadius: '7px',
                                fontSize: '13px',
                                fontWeight: 800,
                                letterSpacing: '0.6px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                whiteSpace: 'nowrap',
                                outline: 'none',
                                userSelect: 'none'
                            }}
                        >
                            <span>{referralCode}</span>
                            <AnimatePresence mode="wait" initial={false}>
                                {copiedCode ? (
                                    <motion.span
                                        key="check"
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0, opacity: 0 }}
                                        style={{ display: 'inline-flex', alignItems: 'center', color: '#16a34a' }}
                                    >
                                        <Check size={14} strokeWidth={2.8} />
                                    </motion.span>
                                ) : (
                                    <motion.span
                                        key="copy"
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0, opacity: 0 }}
                                        style={{ display: 'inline-flex', alignItems: 'center', opacity: 0.6 }}
                                    >
                                        <Copy size={13} />
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </motion.button>
                    </span>
                </div>

                {referrals.length === 0 ? (
                    <div style={{
                        padding: isMobileView ? '44px 20px' : '38px 20px',
                        textAlign: 'center',
                        backgroundColor: 'var(--background)',
                        borderRadius: '12px',
                        border: '1px dashed var(--border)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <div style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '14px',
                            backgroundColor: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid var(--border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '14px'
                        }}>
                            <Users size={28} style={{ color: 'var(--muted-foreground)', opacity: 0.8 }} />
                        </div>
                        <h5 style={{ margin: '0 0 8px 0', fontSize: isMobileView ? '16.5px' : '15px', fontWeight: 800, color: 'var(--foreground)', lineHeight: 1.35 }}>
                            Aucun parrainage enregistré pour le moment
                        </h5>
                        <p style={{ margin: 0, fontSize: isMobileView ? '14px' : '13px', color: 'var(--muted-foreground)', maxWidth: '440px', lineHeight: 1.55 }}>
                            Partagez votre lien exclusif pour commencer à inviter des artisans et cumuler des mois d'abonnement gratuits !
                        </p>
                    </div>
                ) : isMobileView ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {referrals.map((item, idx) => (
                            <div key={idx} style={{
                                padding: '12px 14px',
                                borderRadius: '10px',
                                border: '1px solid var(--border)',
                                backgroundColor: 'var(--background)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--foreground)' }}>
                                        {item.companyName || item.email}
                                    </span>
                                    <span style={{
                                        backgroundColor: item.status === "SUBSCRIBED" ? 'rgba(34, 197, 94, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                                        color: item.status === "SUBSCRIBED" ? '#16a34a' : '#2563eb',
                                        fontSize: '11px',
                                        padding: '2px 8px',
                                        borderRadius: '50px',
                                        fontWeight: 700
                                    }}>
                                        {item.status === "SUBSCRIBED" ? "Abonné" : "Inscrit (Essai)"}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                                    <span style={{ color: 'var(--muted-foreground)' }}>{item.date}</span>
                                    <span style={{ fontWeight: 700, color: '#22c55e' }}>{item.reward || "1 mois offert"}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted-foreground)', textAlign: 'left' }}>
                                    <th style={{ padding: '8px' }}>Filleul</th>
                                    <th style={{ padding: '8px' }}>Date d'inscription</th>
                                    <th style={{ padding: '8px' }}>Statut</th>
                                    <th style={{ padding: '8px', textAlign: 'right' }}>Récompense</th>
                                </tr>
                            </thead>
                            <tbody>
                                {referrals.map((item, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '10px 8px', fontWeight: 600 }}>{item.companyName || item.email}</td>
                                        <td style={{ padding: '10px 8px' }}>{item.date}</td>
                                        <td style={{ padding: '10px 8px' }}>
                                            <span style={{
                                                backgroundColor: item.status === "SUBSCRIBED" ? 'rgba(34, 197, 94, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                                                color: item.status === "SUBSCRIBED" ? '#16a34a' : '#2563eb',
                                                fontSize: '11px',
                                                padding: '2px 8px',
                                                borderRadius: '50px',
                                                fontWeight: 700
                                            }}>
                                                {item.status === "SUBSCRIBED" ? "Abonné" : "Inscrit (Essai)"}
                                            </span>
                                        </td>
                                        <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, color: '#22c55e' }}>
                                            {item.reward || "1 mois offert"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
