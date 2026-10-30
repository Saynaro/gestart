import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
    MessageSquare,
    Smartphone,
    Mail,
    CheckCircle2,
    AlertCircle,
    RefreshCw,
    ExternalLink,
    Send,
    Loader2,
    ShieldCheck,
    Check,
    X,
    Info,
    ChevronRight,
    Sparkles,
    Lock,
    CornerDownLeft,
    Key,
    HelpCircle
} from "lucide-react";
import { apiFetch } from "../../utils/api";
import { getAuthToken } from "../../utils/auth";
import { API_URL } from "../../utils/config";
import { WhatsAppIcon, EmailIcon, SmsIcon } from "../../components/ChannelIcons";
import { useUser } from "../../utils/useUser";

export default function CommunicationTab({ isMobileView, triggerToast, triggerConfirm }) {
    const { isExpired } = useSubscription();
    const { companyName, email: userEmail, company } = useUser();
    const [loading, setLoading] = useState(true);
    const [channelsData, setChannelsData] = useState(null);
    const [testingChannel, setTestingChannel] = useState(null);
    const [disconnectingChannel, setDisconnectingChannel] = useState(null);

    // Modal state for manual WhatsApp / SMTP modal
    const [isWaModalOpen, setIsWaModalOpen] = useState(false);
    const [waForm, setWaForm] = useState({
        phoneNumberId: "",
        wabaId: "",
        displayPhoneNumber: "",
        verifiedName: "",
        accessToken: ""
    });
    const [isConnectingWa, setIsConnectingWa] = useState(false);

    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [emailMode, setEmailMode] = useState("google_app_pass"); // "google_app_pass" | "custom_smtp"
    const [showAppPassGuide, setShowAppPassGuide] = useState(true);
    const [emailForm, setEmailForm] = useState({
        provider: "SMTP",
        emailAddress: "",
        displayName: "",
        smtpHost: "",
        smtpPort: "465",
        smtpUser: "",
        smtpPass: ""
    });
    const [isConnectingEmail, setIsConnectingEmail] = useState(false);

    // Fetch channels data
    const fetchChannels = async () => {
        try {
            setLoading(true);
            const res = await apiFetch("/v1/communication/channels");
            if (res.success && res.data) {
                setChannelsData(res.data.channels);
            }
        } catch (err) {
            console.warn("Erreur chargement canaux de communication:", err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchChannels();

        // Détection du retour Google OAuth
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get("connected") === "google") {
            triggerToast?.("Boîte Google Workspace / Gmail connectée avec succès !");
            window.history.replaceState({}, document.title, window.location.pathname + "?tab=communication");
            fetchChannels();
        } else if (urlParams.get("error")) {
            triggerToast?.(`Erreur de connexion : ${decodeURIComponent(urlParams.get("error"))}`, true);
            window.history.replaceState({}, document.title, window.location.pathname + "?tab=communication");
        }
    }, [triggerToast]);

    // Connexion Google OAuth 1-clic
    const handleGoogleConnect = () => {
        const token = getAuthToken();
        window.location.href = `${API_URL}/v1/communication/email/google/auth?token=${encodeURIComponent(token || "")}`;
    };

    // Meta Embedded Signup Flow handler
    const handleLaunchMetaEmbeddedSignup = () => {
        if (isExpired) {
            window.dispatchEvent(new CustomEvent('subscription_expired', {
                detail: { message: "Votre abonnement a expiré. Pour configurer les canaux de communication, veuillez renouveler votre abonnement." }
            }));
            return;
        }
        // Si le FB SDK / Meta Embedded Signup est configuré dans le projet
        if (window.FB && process.env.REACT_APP_META_APP_ID) {
            window.FB.login((response) => {
                if (response.authResponse?.code) {
                    // Échange du code côté backend
                    apiFetch("/v1/communication/whatsapp/connect", {
                        method: "POST",
                        body: JSON.stringify({ code: response.authResponse.code })
                    }).then(() => {
                        triggerToast("WhatsApp Business connecté avec succès !");
                        fetchChannels();
                    }).catch(err => {
                        triggerToast(err.message || "Échec de connexion Meta", true);
                    });
                }
            }, {
                config_id: process.env.REACT_APP_META_CONFIG_ID,
                response_type: 'code',
                override_default_response_type: true,
                extras: {
                    feature: 'whatsapp_embedded_signup',
                    version: 2
                }
            });
        } else {
            // Ouvrir la modale de configuration WhatsApp Cloud API
            setIsWaModalOpen(true);
        }
    };

    // Save WhatsApp Form
    const handleSaveWaManual = async (e) => {
        e.preventDefault();
        if (isExpired) {
            window.dispatchEvent(new CustomEvent('subscription_expired', {
                detail: { message: "Votre abonnement a expiré. Pour configurer les canaux de communication, veuillez renouveler votre abonnement." }
            }));
            return;
        }
        if (!waForm.phoneNumberId) {
            triggerToast("Le Phone Number ID est obligatoire", true);
            return;
        }

        try {
            setIsConnectingWa(true);
            await apiFetch("/v1/communication/whatsapp/connect", {
                method: "POST",
                body: JSON.stringify(waForm)
            });
            triggerToast("WhatsApp Business connecté avec succès !");
            setIsWaModalOpen(false);
            fetchChannels();
        } catch (err) {
            triggerToast(err.message || "Erreur lors de la connexion WhatsApp", true);
        } finally {
            setIsConnectingWa(false);
        }
    };

    // Save Email Form
    const handleSaveEmail = async (e) => {
        e.preventDefault();
        if (isExpired) {
            window.dispatchEvent(new CustomEvent('subscription_expired', {
                detail: { message: "Votre abonnement a expiré. Pour configurer les canaux de communication, veuillez renouveler votre abonnement." }
            }));
            return;
        }
        if (!emailForm.emailAddress || !emailForm.emailAddress.includes("@")) {
            triggerToast("Veuillez saisir une adresse email valide", true);
            return;
        }

        const isGoogleMode = emailMode === "google_app_pass" || emailForm.emailAddress.includes("@gmail.com");
        const payload = isGoogleMode
            ? {
                ...emailForm,
                provider: "SMTP",
                smtpHost: "smtp.gmail.com",
                smtpPort: 465,
                smtpUser: emailForm.emailAddress.trim(),
                smtpPass: emailForm.smtpPass.replace(/\s+/g, '')
            }
            : {
                ...emailForm,
                smtpPass: emailForm.smtpPass.replace(/\s+/g, '')
            };

        try {
            setIsConnectingEmail(true);
            await apiFetch("/v1/communication/email/connect", {
                method: "POST",
                body: JSON.stringify(payload)
            });

            // Validation immédiate
            const testRes = await apiFetch("/v1/communication/email/test", { method: "POST" });
            if (testRes.success) {
                triggerToast("Boîte Email connectée et validée avec succès ! ✓");
            } else {
                triggerToast("Boîte enregistrée, mais vérifiez le mot de passe : " + (testRes.message || ""), true);
            }

            setIsEmailModalOpen(false);
            fetchChannels();
        } catch (err) {
            triggerToast(err.message || "Erreur lors de la connexion Email", true);
        } finally {
            setIsConnectingEmail(false);
        }
    };

    // Test Connection
    const handleTestChannel = async (channel) => {
        if (isExpired) {
            window.dispatchEvent(new CustomEvent('subscription_expired', {
                detail: { message: "Votre abonnement a expiré. Pour tester les canaux, veuillez renouveler votre abonnement." }
            }));
            return;
        }
        setTestingChannel(channel);
        try {
            const endpoint = channel === "WHATSAPP"
                ? "/v1/communication/whatsapp/test"
                : "/v1/communication/email/test";

            const res = await apiFetch(endpoint, { method: "POST" });
            if (res.success) {
                triggerToast(res.message || "Canal opérationnel ✓");
            } else {
                triggerToast(res.message || "Erreur de connexion", true);
            }
            fetchChannels();
        } catch (err) {
            triggerToast(err.message || "Échec du test de connectivité", true);
        } finally {
            setTestingChannel(null);
        }
    };

    // Disconnect Channel
    const handleDisconnectChannel = (channel) => {
        if (isExpired) {
            window.dispatchEvent(new CustomEvent('subscription_expired', {
                detail: { message: "Votre abonnement a expiré. Pour modifier les canaux, veuillez renouveler votre abonnement." }
            }));
            return;
        }
        const channelName = channel === "WHATSAPP" ? "WhatsApp Business" : "votre compte Email";

        if (triggerConfirm) {
            triggerConfirm({
                title: `Déconnecter ${channelName} ?`,
                message: `Vous ne pourrez plus envoyer ni recevoir de messages via ${channelName} tant que vous ne l'aurez pas reconnecté.`,
                confirmText: "Déconnecter",
                type: "danger",
                onConfirm: async () => {
                    setDisconnectingChannel(channel);
                    try {
                        const endpoint = channel === "WHATSAPP"
                            ? "/v1/communication/whatsapp/disconnect"
                            : "/v1/communication/email/disconnect";

                        await apiFetch(endpoint, { method: "POST", body: JSON.stringify({}) });
                        triggerToast(`${channelName} a été déconnecté.`);
                        fetchChannels();
                    } catch (err) {
                        triggerToast(err.message || "Erreur lors de la déconnexion", true);
                    } finally {
                        setDisconnectingChannel(null);
                    }
                }
            });
        }
    };

    const sms = channelsData?.sms || {};
    const whatsapp = channelsData?.whatsapp || {};
    const email = channelsData?.email || {};

    const renderStatusBadge = (status) => {
        switch (status) {
            case "CONNECTED":
                return (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: isMobileView ? "3px 9px" : "4px 10px", borderRadius: "20px", backgroundColor: "rgba(34, 197, 94, 0.12)", color: "#22c55e", fontSize: isMobileView ? "11.5px" : "12px", fontWeight: 700 }}>
                        <CheckCircle2 size={isMobileView ? 12 : 13} /> Connecté
                    </span>
                );
            case "ERROR":
                return (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: isMobileView ? "3px 9px" : "4px 10px", borderRadius: "20px", backgroundColor: "rgba(239, 68, 68, 0.12)", color: "#ef4444", fontSize: isMobileView ? "11.5px" : "12px", fontWeight: 700 }}>
                        <AlertCircle size={isMobileView ? 12 : 13} /> Erreur
                    </span>
                );
            case "REAUTH_REQUIRED":
                return (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: isMobileView ? "3px 9px" : "4px 10px", borderRadius: "20px", backgroundColor: "rgba(245, 158, 11, 0.12)", color: "#f59e0b", fontSize: isMobileView ? "11.5px" : "12px", fontWeight: 700 }}>
                        <RefreshCw size={isMobileView ? 12 : 13} /> Réauth requise
                    </span>
                );
            case "NOT_CONNECTED":
            default:
                return (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: isMobileView ? "3px 9px" : "4px 10px", borderRadius: "20px", backgroundColor: "rgba(148, 163, 184, 0.12)", color: "#94a3b8", fontSize: isMobileView ? "11.5px" : "12px", fontWeight: 700 }}>
                        Non connecté
                    </span>
                );
        }
    };

    if (loading) {
        return (
            <div style={{ display: "flex", flexDirection: "column", gap: isMobileView ? "14px" : "24px" }}>
                {/* Banner Skeleton */}
                <div style={{ padding: isMobileView ? "14px 16px" : "24px", borderRadius: "14px", border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div className="skeleton-shimmer" style={{ width: "200px", height: isMobileView ? "18px" : "22px", borderRadius: "6px" }} />
                    <div className="skeleton-shimmer" style={{ width: "80%", height: isMobileView ? "13px" : "14px", borderRadius: "4px", opacity: 0.7 }} />
                </div>

                {/* Channel Cards Skeletons */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: isMobileView ? "12px" : "16px" }}>
                    {[1, 2, 3].map((i) => (
                        <div key={i} style={{ padding: isMobileView ? "14px 16px" : "20px", borderRadius: "14px", border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: isMobileView ? "12px" : "16px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: isMobileView ? "10px" : "12px" }}>
                                    <div className="skeleton-shimmer" style={{ width: isMobileView ? "38px" : "42px", height: isMobileView ? "38px" : "42px", borderRadius: isMobileView ? "10px" : "12px" }} />
                                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                        <div className="skeleton-shimmer" style={{ width: "80px", height: "14px", borderRadius: "4px" }} />
                                        <div className="skeleton-shimmer" style={{ width: "110px", height: "10px", borderRadius: "4px", opacity: 0.6 }} />
                                    </div>
                                </div>
                                <div className="skeleton-shimmer" style={{ width: "60px", height: "20px", borderRadius: "20px" }} />
                            </div>
                            <div className="skeleton-shimmer" style={{ width: "100%", height: isMobileView ? "32px" : "36px", borderRadius: "8px", opacity: 0.5 }} />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: isMobileView ? "14px" : "24px" }}>
            {/* Header Banner */}
            <div style={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "14px",
                padding: isMobileView ? "14px 16px" : "20px"
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: isMobileView ? "10px" : "12px" }}>
                    <div style={{
                        width: isMobileView ? "36px" : "36px",
                        height: isMobileView ? "36px" : "36px",
                        borderRadius: "10px",
                        backgroundColor: "var(--accent)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--foreground)",
                        flexShrink: 0
                    }}>
                        <MessageSquare size={isMobileView ? 18 : 20} />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: isMobileView ? "15px" : "17px", fontWeight: 800 }}>Canaux de Communication Omnicanal</h3>
                        <p style={{ margin: isMobileView ? "3px 0 0 0" : "2px 0 0 0", fontSize: isMobileView ? "12px" : "13px", color: "var(--muted-foreground)" }}>
                            Chaque entreprise dispose de ses propres identifiants et numéros dédiés pour échanger avec ses clients.
                        </p>
                    </div>
                </div>
            </div>

            {/* Channels Grid */}
            <div style={{ display: "flex", flexDirection: "column", gap: isMobileView ? "12px" : "18px" }}>

                {/* 1. SMS (Twilio) */}
                <div style={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "14px",
                    padding: isMobileView ? "14px 16px" : "22px",
                    display: "flex",
                    flexDirection: "column",
                    gap: isMobileView ? "12px" : "16px"
                }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: isMobileView ? "8px" : "12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: isMobileView ? "10px" : "14px" }}>
                            <div style={{
                                width: isMobileView ? "38px" : "44px",
                                height: isMobileView ? "38px" : "44px",
                                borderRadius: "10px",
                                backgroundColor: "rgba(91, 77, 219, 0.12)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0
                            }}>
                                <SmsIcon size={isMobileView ? 20 : 24} />
                            </div>
                            <div>
                                <div style={{ display: "flex", alignItems: "center", gap: isMobileView ? "8px" : "10px" }}>
                                    <h4 style={{ margin: 0, fontSize: isMobileView ? "15px" : "16px", fontWeight: 800 }}>SMS Direct</h4>
                                    {renderStatusBadge(sms.status)}
                                </div>
                                <p style={{ margin: isMobileView ? "3px 0 0 0" : "4px 0 0 0", fontSize: isMobileView ? "12px" : "13px", color: "var(--muted-foreground)" }}>
                                    Fournisseur : <strong>Twilio Platform</strong> · Numéro expéditeur : <span className="font-mono">{sms.phone || "Non configuré"}</span>
                                </p>
                            </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ fontSize: isMobileView ? "12.5px" : "12.5px", fontWeight: 700, color: "var(--foreground)" }}>
                                {sms.creditsRemaining} crédits restants
                            </span>
                        </div>
                    </div>

                    <div style={{
                        background: "var(--background)",
                        borderRadius: "10px",
                        padding: isMobileView ? "10px 12px" : "12px 16px",
                        fontSize: isMobileView ? "12px" : "12.5px",
                        color: "var(--muted-foreground)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: "6px"
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <ShieldCheck size={isMobileView ? 15 : 16} style={{ color: "#22c55e", flexShrink: 0 }} />
                            <span>Envoi et réception bidirectionnelle actifs pour tous vos clients.</span>
                        </div>
                        <span style={{ fontSize: isMobileView ? "11.5px" : "12px", color: "var(--sidebar-primary)", fontWeight: 600 }}>
                            {sms.creditsUsed} SMS envoyés ce mois
                        </span>
                    </div>
                </div>

                {/* 2. WhatsApp Business (Meta) */}
                <div style={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "14px",
                    padding: isMobileView ? "14px 16px" : "22px",
                    display: "flex",
                    flexDirection: "column",
                    gap: isMobileView ? "12px" : "16px"
                }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: isMobileView ? "8px" : "12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: isMobileView ? "10px" : "14px" }}>
                            <div style={{
                                width: isMobileView ? "38px" : "44px",
                                height: isMobileView ? "38px" : "44px",
                                borderRadius: "10px",
                                backgroundColor: "rgba(37, 211, 102, 0.14)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0
                            }}>
                                <WhatsAppIcon size={isMobileView ? 20 : 24} />
                            </div>
                            <div>
                                <div style={{ display: "flex", alignItems: "center", gap: isMobileView ? "8px" : "10px" }}>
                                    <h4 style={{ margin: 0, fontSize: isMobileView ? "15px" : "16px", fontWeight: 800 }}>WhatsApp Business</h4>
                                    {renderStatusBadge(whatsapp.status)}
                                </div>
                                <p style={{ margin: isMobileView ? "3px 0 0 0" : "4px 0 0 0", fontSize: isMobileView ? "12px" : "13px", color: "var(--muted-foreground)" }}>
                                    Fournisseur : <strong>Meta WhatsApp Cloud API</strong>
                                    {whatsapp.phoneNumber && <> · Numéro : <span className="font-mono">{whatsapp.phoneNumber}</span></>}
                                </p>
                            </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: isMobileView ? "8px" : "10px" }}>
                            {whatsapp.status === "CONNECTED" ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => handleTestChannel("WHATSAPP")}
                                        disabled={testingChannel === "WHATSAPP"}
                                        style={{ padding: isMobileView ? "7px 12px" : "8px 14px", backgroundColor: "var(--accent)", color: "var(--foreground)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: isMobileView ? "12px" : "12.5px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "5px" }}
                                    >
                                        {testingChannel === "WHATSAPP" ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                                        Tester
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDisconnectChannel("WHATSAPP")}
                                        disabled={disconnectingChannel === "WHATSAPP"}
                                        style={{ padding: isMobileView ? "7px 12px" : "8px 14px", backgroundColor: "rgba(239, 68, 68, 0.1)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "8px", fontSize: isMobileView ? "12px" : "12.5px", fontWeight: 600, cursor: "pointer" }}
                                    >
                                        Déconnecter
                                    </button>
                                </>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleLaunchMetaEmbeddedSignup}
                                    style={{ padding: isMobileView ? "8px 14px" : "9px 18px", backgroundColor: "#22c55e", color: "#ffffff", border: "none", borderRadius: "8px", fontSize: isMobileView ? "12.5px" : "13px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", boxShadow: "0 2px 8px rgba(34, 197, 94, 0.3)" }}
                                >
                                    <WhatsAppIcon size={isMobileView ? 16 : 18} />
                                    Connecter WhatsApp Business
                                </button>
                            )}
                        </div>
                    </div>

                    {whatsapp.status === "CONNECTED" ? (
                        <div style={{ background: "var(--background)", borderRadius: "10px", padding: isMobileView ? "10px 12px" : "12px 16px", fontSize: isMobileView ? "12px" : "12.5px", color: "var(--muted-foreground)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "6px" }}>
                            <span>Nom vérifié Meta : <strong style={{ color: "var(--foreground)" }}>{whatsapp.verifiedName || "Actif"}</strong></span>
                            <span>WABA ID : <span className="font-mono">{whatsapp.wabaId || "Automatique"}</span></span>
                            <span>Qualité : <strong style={{ color: "#22c55e" }}>Excellente ({whatsapp.qualityRating || "GREEN"})</strong></span>
                        </div>
                    ) : (
                        <div style={{ background: "var(--background)", borderRadius: "10px", padding: isMobileView ? "10px 12px" : "12px 16px", fontSize: isMobileView ? "12px" : "12.5px", color: "var(--muted-foreground)" }}>
                            💡 Connectez votre numéro WhatsApp Business officiel pour recevoir et envoyer des messages directement depuis vos conversations clients.
                        </div>
                    )}
                </div>

                {/* 3. Email (Google Workspace / Microsoft / SMTP) */}
                <div style={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "14px",
                    padding: isMobileView ? "14px 16px" : "22px",
                    display: "flex",
                    flexDirection: "column",
                    gap: isMobileView ? "12px" : "16px"
                }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: isMobileView ? "8px" : "12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: isMobileView ? "10px" : "14px" }}>
                            <div style={{
                                width: isMobileView ? "38px" : "44px",
                                height: isMobileView ? "38px" : "44px",
                                borderRadius: "10px",
                                backgroundColor: "rgba(59, 130, 246, 0.12)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0
                            }}>
                                <EmailIcon size={isMobileView ? 20 : 24} />
                            </div>
                            <div>
                                <div style={{ display: "flex", alignItems: "center", gap: isMobileView ? "8px" : "10px" }}>
                                    <h4 style={{ margin: 0, fontSize: isMobileView ? "15px" : "16px", fontWeight: 800 }}>Email Professionnel</h4>
                                    {renderStatusBadge(email.status)}
                                </div>
                                <p style={{ margin: isMobileView ? "3px 0 0 0" : "4px 0 0 0", fontSize: isMobileView ? "12px" : "13px", color: "var(--muted-foreground)" }}>
                                    Fournisseur : <strong>{email.provider || "Non configuré"}</strong>
                                    {email.emailAddress && <> · Adresse : <span className="font-mono">{email.emailAddress}</span></>}
                                </p>
                            </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: isMobileView ? "8px" : "10px" }}>
                            {email.status === "CONNECTED" ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => handleTestChannel("EMAIL")}
                                        disabled={testingChannel === "EMAIL"}
                                        style={{ padding: isMobileView ? "7px 12px" : "8px 14px", backgroundColor: "var(--accent)", color: "var(--foreground)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: isMobileView ? "12px" : "12.5px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "5px" }}
                                    >
                                        {testingChannel === "EMAIL" ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                        Tester l'envoi
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDisconnectChannel("EMAIL")}
                                        disabled={disconnectingChannel === "EMAIL"}
                                        style={{ padding: isMobileView ? "7px 12px" : "8px 14px", backgroundColor: "rgba(239, 68, 68, 0.1)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "8px", fontSize: isMobileView ? "12px" : "12.5px", fontWeight: 600, cursor: "pointer" }}
                                    >
                                        Déconnecter
                                    </button>
                                </>
                            ) : (
                                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEmailMode("google_app_pass");
                                            setIsEmailModalOpen(true);
                                        }}
                                        style={{
                                            padding: isMobileView ? "7px 12px" : "8px 16px",
                                            backgroundColor: "#556B2F",
                                            color: "#ffffff",
                                            border: "none",
                                            borderRadius: "8px",
                                            fontSize: isMobileView ? "12px" : "12.5px",
                                            fontWeight: 700,
                                            cursor: "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "6px",
                                            boxShadow: "0 2px 6px rgba(85, 107, 47, 0.25)"
                                        }}
                                    >
                                        <Key size={14} />
                                        <span>Mot de passe Google</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleGoogleConnect}
                                        style={{
                                            padding: isMobileView ? "7px 12px" : "8px 14px",
                                            backgroundColor: "#ffffff",
                                            color: "#3c4043",
                                            border: "1px solid #dadce0",
                                            borderRadius: "8px",
                                            fontSize: isMobileView ? "12px" : "12.5px",
                                            fontWeight: 600,
                                            cursor: "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "6px",
                                            boxShadow: "0 1px 2px rgba(60,64,67,0.08)"
                                        }}
                                        title="Connexion Google en 1 clic"
                                    >
                                        <svg width={isMobileView ? "15" : "16"} height={isMobileView ? "15" : "16"} viewBox="0 0 24 24">
                                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                                        </svg>
                                        <span>1-Clic Google</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEmailMode("custom_smtp");
                                            setIsEmailModalOpen(true);
                                        }}
                                        style={{ padding: isMobileView ? "7px 12px" : "8px 14px", backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: isMobileView ? "12px" : "12.5px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                                    >
                                        Autre IMAP / SMTP
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ background: email.status === "CONNECTED" ? "var(--background)" : "rgba(59, 130, 246, 0.08)", border: email.status === "CONNECTED" ? "none" : "1px solid rgba(59, 130, 246, 0.2)", borderRadius: "10px", padding: isMobileView ? "12px" : "14px 16px", fontSize: isMobileView ? "12px" : "12.5px", color: "var(--foreground)" }}>
                        {email.status === "CONNECTED" ? (
                            <span>Expéditeur officiel : <strong style={{ color: "var(--foreground)" }}>{email.displayName || "Votre Société"} &lt;{email.emailAddress}&gt;</strong> · Vos devis et factures PDF sont transmis avec cette identité.</span>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <Mail size={16} style={{ color: "#2563eb", flexShrink: 0 }} />
                                    <span><strong>Relais GestArt actif par défaut (support.gestart@gmail.com) :</strong> vos devis, factures et messages s'envoient immédiatement sous le nom de votre entreprise, sans configuration requise.</span>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingLeft: "24px", color: "var(--muted-foreground)" }}>
                                    <CornerDownLeft size={14} style={{ color: "#2563eb", flexShrink: 0 }} />
                                    <span>Les réponses de vos clients sont automatiquement réceptionnées et synchronisées en temps réel dans votre CRM.</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* Modal de Configuration WhatsApp */}
            {isWaModalOpen && createPortal(
                <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", zIndex: 999999, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", overflowY: "auto", boxSizing: "border-box" }}>
                    <div style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "16px", width: "100%", maxWidth: "520px", maxHeight: "90vh", overflowY: "auto", padding: "24px", boxShadow: "0 20px 40px rgba(0,0,0,0.4)", margin: "auto", boxSizing: "border-box" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <div style={{ width: "36px", height: "36px", borderRadius: "10px", backgroundColor: "rgba(34, 197, 94, 0.12)", color: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <MessageSquare size={20} />
                                </div>
                                <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 800 }}>Connecter WhatsApp Business Cloud API</h3>
                            </div>
                            <button onClick={() => setIsWaModalOpen(false)} style={{ background: "none", border: "none", color: "var(--muted-foreground)", cursor: "pointer" }}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveWaManual} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                            <div>
                                <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, marginBottom: "6px" }}>
                                    Phone Number ID Meta <span style={{ color: "#ef4444" }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ex: 104829384729102"
                                    value={waForm.phoneNumberId}
                                    onChange={(e) => setWaForm({ ...waForm, phoneNumberId: e.target.value })}
                                    style={{ width: "100%", height: "42px", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--background)", color: "var(--foreground)", fontSize: "13.5px", boxSizing: "border-box" }}
                                    required
                                />
                                <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>Trouvable dans Meta for Developers &gt; WhatsApp &gt; Configuration de l'API.</span>
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, marginBottom: "6px" }}>
                                    Numéro de téléphone affiché
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ex: +33 6 12 34 56 78"
                                    value={waForm.displayPhoneNumber}
                                    onChange={(e) => setWaForm({ ...waForm, displayPhoneNumber: e.target.value })}
                                    style={{ width: "100%", height: "42px", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--background)", color: "var(--foreground)", fontSize: "13.5px", boxSizing: "border-box" }}
                                />
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, marginBottom: "6px" }}>
                                    WhatsApp Business Account ID (WABA)
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ex: 102938475610293"
                                    value={waForm.wabaId}
                                    onChange={(e) => setWaForm({ ...waForm, wabaId: e.target.value })}
                                    style={{ width: "100%", height: "42px", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--background)", color: "var(--foreground)", fontSize: "13.5px", boxSizing: "border-box" }}
                                />
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, marginBottom: "6px" }}>
                                    Permanent System User Access Token
                                </label>
                                <input
                                    type="password"
                                    placeholder="EAAG..."
                                    value={waForm.accessToken}
                                    onChange={(e) => setWaForm({ ...waForm, accessToken: e.target.value })}
                                    style={{ width: "100%", height: "42px", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--background)", color: "var(--foreground)", fontSize: "13.5px", boxSizing: "border-box" }}
                                />
                                <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>Chiffré côté serveur via AES-256-GCM.</span>
                            </div>

                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                                <button
                                    type="button"
                                    onClick={() => setIsWaModalOpen(false)}
                                    style={{ padding: "10px 16px", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "transparent", color: "var(--foreground)", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={isConnectingWa}
                                    style={{ padding: "10px 20px", borderRadius: "8px", border: "none", backgroundColor: "#22c55e", color: "#ffffff", fontSize: "13px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
                                >
                                    {isConnectingWa ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                    Enregistrer la connexion
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Modal de Configuration Email / SMTP */}
            {isEmailModalOpen && createPortal(
                <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", zIndex: 999999, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", overflowY: "auto", boxSizing: "border-box" }}>
                    <div style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "18px", width: "100%", maxWidth: "560px", maxHeight: "92vh", overflowY: "auto", padding: "24px", boxShadow: "0 24px 48px rgba(0,0,0,0.45)", margin: "auto", boxSizing: "border-box" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <div style={{ width: "38px", height: "38px", borderRadius: "10px", backgroundColor: "rgba(59, 130, 246, 0.12)", color: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <Mail size={20} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: "16.5px", fontWeight: 800 }}>Connecter votre boîte Email</h3>
                                    <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "var(--muted-foreground)" }}>
                                        Envoyez vos devis et factures avec votre propre adresse
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setIsEmailModalOpen(false)} style={{ background: "none", border: "none", color: "var(--muted-foreground)", cursor: "pointer", padding: "4px" }}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* Sélecteur de méthode */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "18px", padding: "4px", backgroundColor: "var(--background)", borderRadius: "10px", border: "1px solid var(--border)" }}>
                            <button
                                type="button"
                                onClick={() => setEmailMode("google_app_pass")}
                                style={{
                                    padding: "9px 12px",
                                    borderRadius: "8px",
                                    border: "none",
                                    fontSize: "12.5px",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "6px",
                                    backgroundColor: emailMode === "google_app_pass" ? "var(--card)" : "transparent",
                                    color: emailMode === "google_app_pass" ? "#556B2F" : "var(--muted-foreground)",
                                    boxShadow: emailMode === "google_app_pass" ? "0 2px 6px rgba(0,0,0,0.08)" : "none",
                                    transition: "all 0.15s ease"
                                }}
                            >
                                <Key size={14} />
                                <span>Gmail / Google (1 min)</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setEmailMode("custom_smtp")}
                                style={{
                                    padding: "9px 12px",
                                    borderRadius: "8px",
                                    border: "none",
                                    fontSize: "12.5px",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "6px",
                                    backgroundColor: emailMode === "custom_smtp" ? "var(--card)" : "transparent",
                                    color: emailMode === "custom_smtp" ? "#556B2F" : "var(--muted-foreground)",
                                    boxShadow: emailMode === "custom_smtp" ? "0 2px 6px rgba(0,0,0,0.08)" : "none",
                                    transition: "all 0.15s ease"
                                }}
                            >
                                <Mail size={14} />
                                <span>Autre SMTP / Hébergeur</span>
                            </button>
                        </div>

                        {emailMode === "google_app_pass" && (
                            <div style={{ marginBottom: "18px", padding: "14px", borderRadius: "12px", backgroundColor: "rgba(85, 107, 47, 0.08)", border: "1px solid rgba(85, 107, 47, 0.22)" }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 700, fontSize: "13px", color: "var(--foreground)" }}>
                                        <Sparkles size={15} style={{ color: "#556B2F" }} />
                                        <span>Guide rapide : créer votre mot de passe Google en 1 minute</span>
                                    </div>
                                    <span style={{ fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "6px", backgroundColor: "rgba(34, 197, 94, 0.15)", color: "#16a34a" }}>
                                        100% Gratuit
                                    </span>
                                </div>

                                <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12px", lineHeight: "1.45", color: "var(--foreground)" }}>
                                    <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                                        <span style={{ width: "20px", height: "20px", borderRadius: "50%", backgroundColor: "var(--card)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "11px", flexShrink: 0 }}>1</span>
                                        <div>
                                            Ouvrez la page Google Sécurité :{" "}
                                            <a
                                                href="https://myaccount.google.com/apppasswords"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ color: "#2563eb", fontWeight: 700, textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: "3px" }}
                                            >
                                                myaccount.google.com/apppasswords
                                                <ExternalLink size={11} />
                                            </a>
                                            <span style={{ color: "var(--muted-foreground)", display: "block", fontSize: "11px" }}>
                                                (Assurez-vous que la validation en 2 étapes est activée sur votre compte Google)
                                            </span>
                                        </div>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                                        <span style={{ width: "20px", height: "20px", borderRadius: "50%", backgroundColor: "var(--card)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "11px", flexShrink: 0 }}>2</span>
                                        <div>
                                            Dans le champ "Nom de l'application", écrivez <strong>GestArt</strong> puis cliquez sur <strong>Créer</strong>.
                                        </div>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                                        <span style={{ width: "20px", height: "20px", borderRadius: "50%", backgroundColor: "var(--card)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", fontSize: "11px", flexShrink: 0 }}>3</span>
                                        <div>
                                            Google génère un code jaune de <strong>16 lettres</strong> (ex: <code style={{ backgroundColor: "rgba(0,0,0,0.06)", padding: "2px 5px", borderRadius: "4px", fontWeight: 600 }}>bptw bkbu ibbv drop</code>).
                                        </div>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                                        <span style={{ width: "20px", height: "20px", borderRadius: "50%", backgroundColor: "var(--card)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "11px", flexShrink: 0 }}>4</span>
                                        <div>
                                            Collez ce mot de passe ci-dessous. Le serveur et le port sont déjà pré-remplis !
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleSaveEmail} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                            <div>
                                <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, marginBottom: "6px" }}>
                                    {emailMode === "google_app_pass" ? "Votre adresse Gmail ou Google Workspace" : "Adresse Email d'envoi"} <span style={{ color: "#ef4444" }}>*</span>
                                </label>
                                <input
                                    type="email"
                                    placeholder={company?.email || userEmail || "contact@monentreprise.fr"}
                                    value={emailForm.emailAddress}
                                    onChange={(e) => setEmailForm({ ...emailForm, emailAddress: e.target.value })}
                                    style={{ width: "100%", height: "42px", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--background)", color: "var(--foreground)", fontSize: "13.5px", boxSizing: "border-box" }}
                                    required
                                />
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, marginBottom: "6px" }}>
                                    Nom de l'expéditeur (affiché à vos clients)
                                </label>
                                <input
                                    type="text"
                                    placeholder={companyName || "Mon Entreprise"}
                                    value={emailForm.displayName}
                                    onChange={(e) => setEmailForm({ ...emailForm, displayName: e.target.value })}
                                    style={{ width: "100%", height: "42px", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--background)", color: "var(--foreground)", fontSize: "13.5px", boxSizing: "border-box" }}
                                />
                            </div>

                            {emailMode === "google_app_pass" ? (
                                <div>
                                    <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, marginBottom: "6px" }}>
                                        Mot de passe d'application Google (16 lettres) <span style={{ color: "#ef4444" }}>*</span>
                                    </label>
                                    <input
                                        type="password"
                                        placeholder="Ex: bptw bkbu ibbv drop"
                                        value={emailForm.smtpPass}
                                        onChange={(e) => setEmailForm({ ...emailForm, smtpPass: e.target.value })}
                                        style={{ width: "100%", height: "42px", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--background)", color: "var(--foreground)", fontSize: "13.5px", boxSizing: "border-box" }}
                                        required
                                    />
                                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "6px", fontSize: "11px", color: "var(--muted-foreground)" }}>
                                        <Lock size={12} style={{ color: "#16a34a" }} />
                                        <span>Les espaces sont automatiquement supprimés. Chiffrement AES-256-GCM sécurisé.</span>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px" }}>
                                        <div>
                                            <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, marginBottom: "6px" }}>
                                                Serveur SMTP Host <span style={{ color: "#ef4444" }}>*</span>
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="ssl0.ovh.net ou mail.ionos.fr"
                                                value={emailForm.smtpHost}
                                                onChange={(e) => setEmailForm({ ...emailForm, smtpHost: e.target.value })}
                                                style={{ width: "100%", height: "42px", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--background)", color: "var(--foreground)", fontSize: "13.5px", boxSizing: "border-box" }}
                                                required={emailMode === "custom_smtp"}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, marginBottom: "6px" }}>
                                                Port SMTP
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="465 ou 587"
                                                value={emailForm.smtpPort}
                                                onChange={(e) => setEmailForm({ ...emailForm, smtpPort: e.target.value })}
                                                style={{ width: "100%", height: "42px", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--background)", color: "var(--foreground)", fontSize: "13.5px", boxSizing: "border-box" }}
                                            />
                                        </div>
                                    </div>

                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                                        <div>
                                            <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, marginBottom: "6px" }}>
                                                Identifiant SMTP
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="contact@monentreprise.fr"
                                                value={emailForm.smtpUser}
                                                onChange={(e) => setEmailForm({ ...emailForm, smtpUser: e.target.value })}
                                                style={{ width: "100%", height: "42px", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--background)", color: "var(--foreground)", fontSize: "13.5px", boxSizing: "border-box" }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, marginBottom: "6px" }}>
                                                Mot de passe SMTP <span style={{ color: "#ef4444" }}>*</span>
                                            </label>
                                            <input
                                                type="password"
                                                placeholder="Mot de passe"
                                                value={emailForm.smtpPass}
                                                onChange={(e) => setEmailForm({ ...emailForm, smtpPass: e.target.value })}
                                                style={{ width: "100%", height: "42px", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--background)", color: "var(--foreground)", fontSize: "13.5px", boxSizing: "border-box" }}
                                                required
                                            />
                                        </div>
                                    </div>
                                </>
                            )}

                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                                <button
                                    type="button"
                                    onClick={() => setIsEmailModalOpen(false)}
                                    style={{ padding: "10px 16px", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "transparent", color: "var(--foreground)", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={isConnectingEmail}
                                    style={{
                                        padding: "10px 22px",
                                        borderRadius: "8px",
                                        border: "none",
                                        backgroundColor: "#556B2F",
                                        color: "#ffffff",
                                        fontSize: "13px",
                                        fontWeight: 700,
                                        cursor: isConnectingEmail ? "not-allowed" : "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        boxShadow: "0 2px 8px rgba(85, 107, 47, 0.35)"
                                    }}
                                >
                                    {isConnectingEmail ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            <span>Validation en cours...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Check size={16} />
                                            <span>Valider et Connecter</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
