import React, { useState, useEffect, useRef, useCallback } from "react";
import { Bell, Shield, Wrench, Mail, Smartphone, Monitor, Lock, CheckCircle2, BellOff, Info, Send, HelpCircle, X, Lightbulb } from "lucide-react";
import { apiFetch } from "../../utils/api";
import { useUser } from "../../utils/useUser";
import { useSubscription } from "../../utils/useSubscription";

const STORAGE_KEY_OWNER = "crm_notif_owner_prefs";
const STORAGE_KEY_TECH = "crm_notif_tech_prefs";

export default function NotificationsTab({ isMobileView, triggerToast }) {
    const { role } = useUser();
    const isTechnician = role === "TECHNICIAN";
    const { isExpired } = useSubscription();

    // Browser Notification Permission State
    const [browserPermission, setBrowserPermission] = useState(() => {
        if (typeof window !== "undefined" && "Notification" in window) {
            return Notification.permission;
        }
        return "unsupported";
    });
    const [showDeniedGuide, setShowDeniedGuide] = useState(false);
    const [testingPush, setTestingPush] = useState(false);
    const [showChannelsHelp, setShowChannelsHelp] = useState(false);
    const helpRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (helpRef.current && !helpRef.current.contains(e.target)) {
                setShowChannelsHelp(false);
            }
        };
        if (showChannelsHelp) {
            document.addEventListener("mousedown", handleClickOutside);
            document.addEventListener("touchstart", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("touchstart", handleClickOutside);
        };
    }, [showChannelsHelp]);

    // OWNER / MANAGER Notification States
    const [ownerNotifs, setOwnerNotifs] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEY_OWNER);
        if (saved) {
            try { return JSON.parse(saved); } catch (e) {}
        }
        return {
            newClient: { enabled: true, push: true, email: true, inapp: true, label: "Nouveau client ajouté" },
            newSms: { enabled: true, push: true, email: false, inapp: true, label: "Nouveau SMS reçu" },
            jobDone: { enabled: true, push: true, email: true, inapp: true, label: "Intervention terminée par un technicien" },
            invoicePaid: { enabled: true, push: true, email: true, inapp: true, label: "Facture payée par un client" },
            urgentMaintenance: { enabled: true, push: true, email: true, inapp: true, label: "ТО urgent / Client URGENT" },
            formRequest: { enabled: true, push: false, email: true, inapp: true, label: "Nouvelle demande de devis via formulaire web" },
            subExpiring: { enabled: true, push: false, email: true, inapp: true, label: "Abonnement expire bientôt" }
        };
    });

    // TECHNICIEN Notification States
    const [techNotifs, setTechNotifs] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEY_TECH);
        if (saved) {
            try { return JSON.parse(saved); } catch (e) {}
        }
        return {
            jobAssigned: { enabled: true, push: true, email: false, inapp: true, label: "Intervention assignée" },
            jobUpdated: { enabled: true, push: true, email: false, inapp: true, label: "Intervention modifiée" },
            jobCancelled: { enabled: true, push: true, email: true, inapp: true, label: "Intervention annulée" },
            reminderDayBefore: { enabled: true, push: true, email: false, inapp: true, label: "Rappel J-1 (Veille à 18h)" },
            reminderHourBefore: { enabled: true, push: true, email: false, inapp: true, label: "Rappel H-1 avant l'intervention" }
        };
    });

    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchNotifs = async () => {
            try {
                const data = await apiFetch('/v1/company/settings');
                const s = data.data?.settings || data.settings || data;
                if (s) {
                    const savedPrefs = s.notificationPreferences || {};
                    const savedOwner = savedPrefs.ownerNotifs || {};
                    const savedTech = savedPrefs.techNotifs || {};

                    setOwnerNotifs(prev => {
                        const updated = {
                            ...prev,
                            newClient: {
                                ...prev.newClient,
                                ...(savedOwner.newClient || {}),
                                enabled: s.notifyNewClient ?? savedOwner.newClient?.enabled ?? prev.newClient.enabled
                            },
                            newSms: {
                                ...prev.newSms,
                                ...(savedOwner.newSms || {}),
                                enabled: s.notifyNewMessage ?? savedOwner.newSms?.enabled ?? prev.newSms.enabled
                            },
                            jobDone: {
                                ...prev.jobDone,
                                ...(savedOwner.jobDone || {}),
                                enabled: s.notifyInterventionDone ?? savedOwner.jobDone?.enabled ?? prev.jobDone.enabled
                            },
                            invoicePaid: {
                                ...prev.invoicePaid,
                                ...(savedOwner.invoicePaid || {}),
                                enabled: s.notifyInvoicePaid ?? savedOwner.invoicePaid?.enabled ?? prev.invoicePaid.enabled
                            },
                            urgentMaintenance: {
                                ...prev.urgentMaintenance,
                                ...(savedOwner.urgentMaintenance || {}),
                                enabled: s.notifyUrgentMaintenance ?? savedOwner.urgentMaintenance?.enabled ?? prev.urgentMaintenance.enabled
                            },
                            formRequest: {
                                ...prev.formRequest,
                                ...(savedOwner.formRequest || {}),
                                enabled: s.notifyQuoteRequest ?? savedOwner.formRequest?.enabled ?? prev.formRequest.enabled
                            },
                            subExpiring: {
                                ...prev.subExpiring,
                                ...(savedOwner.subExpiring || {}),
                                enabled: s.notifyPlanExpiring ?? savedOwner.subExpiring?.enabled ?? prev.subExpiring.enabled
                            }
                        };
                        localStorage.setItem(STORAGE_KEY_OWNER, JSON.stringify(updated));
                        return updated;
                    });

                    setTechNotifs(prev => {
                        const updated = {
                            ...prev,
                            jobAssigned: {
                                ...prev.jobAssigned,
                                ...(savedTech.jobAssigned || {}),
                                enabled: s.notifyTechAssigned ?? savedTech.jobAssigned?.enabled ?? prev.jobAssigned.enabled
                            },
                            jobUpdated: {
                                ...prev.jobUpdated,
                                ...(savedTech.jobUpdated || {}),
                                enabled: s.notifyTechUpdated ?? savedTech.jobUpdated?.enabled ?? prev.jobUpdated.enabled
                            },
                            jobCancelled: {
                                ...prev.jobCancelled,
                                ...(savedTech.jobCancelled || {}),
                                enabled: s.notifyTechCancelled ?? savedTech.jobCancelled?.enabled ?? prev.jobCancelled.enabled
                            },
                            reminderDayBefore: {
                                ...prev.reminderDayBefore,
                                ...(savedTech.reminderDayBefore || {}),
                                enabled: s.notifyTechReminder24h ?? savedTech.reminderDayBefore?.enabled ?? prev.reminderDayBefore.enabled
                            },
                            reminderHourBefore: {
                                ...prev.reminderHourBefore,
                                ...(savedTech.reminderHourBefore || {}),
                                enabled: s.notifyTechReminder1h ?? savedTech.reminderHourBefore?.enabled ?? prev.reminderHourBefore.enabled
                            }
                        };
                        localStorage.setItem(STORAGE_KEY_TECH, JSON.stringify(updated));
                        return updated;
                    });
                }
            } catch (err) {
                console.warn("API settings fallback:", err.message);
            }
        };
        fetchNotifs();
    }, []);

    const performSave = useCallback(async (currentOwner, currentTech) => {
        if (isExpired) {
            window.dispatchEvent(new CustomEvent('autoSaveStatus', { detail: { status: 'error' } }));
            window.dispatchEvent(new CustomEvent('subscription_expired', {
                detail: { message: "Votre abonnement a expiré. Pour modifier les préférences de notification, veuillez renouveler votre abonnement." }
            }));
            return;
        }

        const o = currentOwner || ownerNotifs;
        const t = currentTech || techNotifs;

        window.dispatchEvent(new CustomEvent('autoSaveStatus', { detail: { status: 'saving' } }));

        try {
            await apiFetch('/v1/company/settings', {
                method: 'PATCH',
                body: JSON.stringify({
                    notifyNewClient: o.newClient.enabled,
                    notifyNewMessage: o.newSms.enabled,
                    notifyInterventionDone: o.jobDone.enabled,
                    notifyInvoicePaid: o.invoicePaid.enabled,
                    notifyUrgentMaintenance: o.urgentMaintenance.enabled,
                    notifyQuoteRequest: o.formRequest.enabled,
                    notifyPlanExpiring: o.subExpiring.enabled,
                    notifyTechAssigned: t.jobAssigned?.enabled ?? true,
                    notifyTechUpdated: t.jobUpdated?.enabled ?? true,
                    notifyTechCancelled: t.jobCancelled?.enabled ?? true,
                    notifyTechReminder24h: t.reminderDayBefore?.enabled ?? true,
                    notifyTechReminder1h: t.reminderHourBefore?.enabled ?? true,
                    notificationPreferences: {
                        ownerNotifs: o,
                        techNotifs: t
                    }
                })
            });
            window.dispatchEvent(new CustomEvent('autoSaveStatus', { detail: { status: 'saved' } }));
        } catch (err) {
            console.warn("Auto-save notifs settings error:", err);
            window.dispatchEvent(new CustomEvent('autoSaveStatus', { detail: { status: 'error' } }));
        }
    }, [isExpired, ownerNotifs, techNotifs]);

    const toggleOwner = (key) => {
        if (isExpired) {
            window.dispatchEvent(new CustomEvent('autoSaveStatus', { detail: { status: 'error' } }));
            window.dispatchEvent(new CustomEvent('subscription_expired', {
                detail: { message: "Votre abonnement a expiré. Pour modifier les préférences de notification, veuillez renouveler votre abonnement." }
            }));
            return;
        }
        setOwnerNotifs(prev => {
            const updated = {
                ...prev,
                [key]: { ...prev[key], enabled: !prev[key].enabled }
            };
            localStorage.setItem(STORAGE_KEY_OWNER, JSON.stringify(updated));
            performSave(updated, techNotifs);
            return updated;
        });
    };

    const toggleOwnerChannel = (key, channel) => {
        if (isExpired) {
            window.dispatchEvent(new CustomEvent('autoSaveStatus', { detail: { status: 'error' } }));
            window.dispatchEvent(new CustomEvent('subscription_expired', {
                detail: { message: "Votre abonnement a expiré. Pour modifier les préférences de notification, veuillez renouveler votre abonnement." }
            }));
            return;
        }
        setOwnerNotifs(prev => {
            const updated = {
                ...prev,
                [key]: { ...prev[key], [channel]: !prev[key][channel] }
            };
            localStorage.setItem(STORAGE_KEY_OWNER, JSON.stringify(updated));
            performSave(updated, techNotifs);
            return updated;
        });
    };

    const toggleTech = (key) => {
        if (isExpired) {
            window.dispatchEvent(new CustomEvent('autoSaveStatus', { detail: { status: 'error' } }));
            window.dispatchEvent(new CustomEvent('subscription_expired', {
                detail: { message: "Votre abonnement a expiré. Pour modifier les préférences de notification, veuillez renouveler votre abonnement." }
            }));
            return;
        }
        setTechNotifs(prev => {
            const updated = {
                ...prev,
                [key]: { ...prev[key], enabled: !prev[key].enabled }
            };
            localStorage.setItem(STORAGE_KEY_TECH, JSON.stringify(updated));
            performSave(ownerNotifs, updated);
            return updated;
        });
    };

    const toggleTechChannel = (key, channel) => {
        if (isExpired) {
            window.dispatchEvent(new CustomEvent('autoSaveStatus', { detail: { status: 'error' } }));
            window.dispatchEvent(new CustomEvent('subscription_expired', {
                detail: { message: "Votre abonnement a expiré. Pour modifier les préférences de notification, veuillez renouveler votre abonnement." }
            }));
            return;
        }
        setTechNotifs(prev => {
            const updated = {
                ...prev,
                [key]: { ...prev[key], [channel]: !prev[key][channel] }
            };
            localStorage.setItem(STORAGE_KEY_TECH, JSON.stringify(updated));
            performSave(ownerNotifs, updated);
            return updated;
        });
    };

    const showNativeNotification = async ({ title, body, data = {} }) => {
        if (typeof navigator !== "undefined" && navigator.vibrate) {
            try { navigator.vibrate([100, 50, 100]); } catch (_) {}
        }

        if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
            try {
                const registration = await navigator.serviceWorker.ready;
                if (registration && typeof registration.showNotification === "function") {
                    await registration.showNotification(title, {
                        body,
                        icon: "/favicon.ico",
                        badge: "/favicon.ico",
                        vibrate: [100, 50, 100],
                        data: { url: window.location.origin + "/", ...data }
                    });
                    return true;
                }
            } catch (swErr) {
                console.warn("ServiceWorker showNotification fallback:", swErr);
            }
        }

        try {
            new Notification(title, {
                body,
                icon: "/favicon.ico"
            });
            return true;
        } catch (e) {
            console.warn("Notification constructor error:", e);
        }
        return false;
    };

    const requestBrowserPermission = async () => {
        if (typeof window === "undefined" || !("Notification" in window)) {
            if (triggerToast) triggerToast("Les notifications ne sont pas supportées par ce navigateur.");
            return;
        }
        try {
            const result = await Notification.requestPermission();
            setBrowserPermission(result);
            if (result === "granted") {
                if (triggerToast) triggerToast("Notifications de navigateur activées avec succès !");
                await showNativeNotification({
                    title: "GestArt CRM",
                    body: "Les notifications push sont bien activées sur cet appareil."
                });
            } else if (result === "denied") {
                setShowDeniedGuide(true);
            }
        } catch (err) {
            console.error("Browser notification permission error:", err);
        }
    };

    const handleTestNotification = async () => {
        if (typeof window === "undefined" || !("Notification" in window)) return;
        if (Notification.permission === "granted") {
            setTestingPush(true);
            await showNativeNotification({
                title: "GestArt CRM",
                body: "Exemple d'alerte : Facture INV-2026-001 payée en ligne (450.00€)"
            });
            if (triggerToast) triggerToast("Notification de test envoyée !");
            setTimeout(() => setTestingPush(false), 1000);
        } else {
            requestBrowserPermission();
        }
    };

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        setSaving(true);
        await performSave();
        setSaving(false);
        if (triggerToast) {
            triggerToast("Préférences de notifications enregistrées !");
        }
    };

    const renderChannelPills = (item, onToggle) => {
        const channels = [
            { id: "push", label: "Push", icon: Smartphone },
            { id: "email", label: "Email", icon: Mail },
            { id: "inapp", label: "In-App", icon: Monitor }
        ];

        return (
            <div style={{ display: 'flex', gap: isMobileView ? '5px' : '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                {channels.map(({ id, label, icon: Icon }) => {
                    const active = Boolean(item[id]);
                    return (
                        <button
                            key={id}
                            type="button"
                            onClick={() => onToggle(id)}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: isMobileView ? '3px' : '5px',
                                padding: isMobileView ? '3px 8px' : '5px 10px',
                                height: isMobileView ? '24px' : '28px',
                                minHeight: isMobileView ? '24px' : '28px',
                                borderRadius: '6px',
                                fontSize: isMobileView ? '10px' : '11.5px',
                                fontWeight: 600,
                                border: active ? '1px solid var(--sidebar-primary)' : '1px solid var(--border)',
                                backgroundColor: active ? 'var(--sidebar-primary)' : 'var(--card)',
                                color: active ? '#ffffff' : 'var(--muted-foreground)',
                                cursor: 'pointer',
                                transition: 'background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease',
                                userSelect: 'none',
                                boxSizing: 'border-box'
                            }}
                        >
                            <Icon size={isMobileView ? 11 : 13} />
                            <span>{label}</span>
                        </button>
                    );
                })}
            </div>
        );
    };

    return (
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: isMobileView ? '10px' : '20px' }}>
            {/* Bannière d'état des notifications du navigateur (Push sur cet appareil) */}
            <div style={{
                border: '1px solid var(--border)',
                borderRadius: isMobileView ? '12px' : '16px',
                padding: isMobileView ? '10px 12px' : '16px 20px',
                backgroundColor: 'var(--card)',
                display: 'flex',
                flexDirection: 'column',
                gap: isMobileView ? '8px' : '12px'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: isMobileView ? '8px' : '12px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: isMobileView ? '8px' : '12px', flex: '1 1 280px' }}>
                        <div style={{
                            width: isMobileView ? '32px' : '36px',
                            height: isMobileView ? '32px' : '36px',
                            borderRadius: '8px',
                            backgroundColor: browserPermission === 'granted' 
                                ? 'rgba(34, 197, 94, 0.1)' 
                                : (browserPermission === 'denied' ? 'rgba(234, 179, 8, 0.1)' : 'rgba(85, 107, 47, 0.1)'),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                        }}>
                            {browserPermission === 'granted' && <CheckCircle2 size={isMobileView ? 16 : 18} style={{ color: '#16A34A' }} />}
                            {browserPermission === 'denied' && <BellOff size={isMobileView ? 16 : 18} style={{ color: '#CA8A04' }} />}
                            {(browserPermission === 'default' || browserPermission === 'unsupported') && (
                                <Bell size={isMobileView ? 16 : 18} style={{ color: 'var(--sidebar-primary)' }} />
                            )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: isMobileView ? '12.5px' : '14px', fontWeight: 700 }}>
                                    {browserPermission === 'granted' && "Notifications du navigateur activées"}
                                    {browserPermission === 'denied' && "Notifications bloquées dans votre navigateur"}
                                    {browserPermission === 'default' && "Activer les notifications sur cet appareil"}
                                    {browserPermission === 'unsupported' && "Notifications non supportées sur ce navigateur"}
                                </span>
                                {browserPermission === 'granted' && (
                                    <span style={{
                                        fontSize: '10px',
                                        fontWeight: 700,
                                        padding: '2px 7px',
                                        borderRadius: '9999px',
                                        backgroundColor: 'rgba(34, 197, 94, 0.12)',
                                        color: '#16A34A'
                                    }}>
                                        Actif
                                    </span>
                                )}
                            </div>
                            <span style={{ fontSize: isMobileView ? '11px' : '12px', color: 'var(--muted-foreground)', lineHeight: 1.4 }}>
                                {browserPermission === 'granted' && "Cet appareil reçoit les alertes instantanées (paiements, messages, interventions)."}
                                {browserPermission === 'denied' && "L'autorisation a été bloquée. Débloquez-la pour recevoir les alertes push."}
                                {browserPermission === 'default' && "Pour recevoir les alertes push en temps réel même lorsque l'application est fermée, autorisez les notifications."}
                                {browserPermission === 'unsupported' && "Votre navigateur actuel ne prend pas en charge l'API native de notifications."}
                            </span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: isMobileView ? 'auto' : undefined }}>
                        {browserPermission === 'default' && (
                            <button
                                type="button"
                                onClick={requestBrowserPermission}
                                style={{
                                    padding: isMobileView ? '6px 12px' : '8px 16px',
                                    borderRadius: '8px',
                                    backgroundColor: 'var(--sidebar-primary)',
                                    color: '#ffffff',
                                    border: 'none',
                                    fontSize: isMobileView ? '11.5px' : '12.5px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                <Bell size={13} />
                                Activer sur cet appareil
                            </button>
                        )}

                        {browserPermission === 'denied' && (
                            <button
                                type="button"
                                onClick={() => setShowDeniedGuide(prev => !prev)}
                                style={{
                                    padding: isMobileView ? '5px 10px' : '6px 12px',
                                    borderRadius: '7px',
                                    backgroundColor: 'var(--background)',
                                    color: 'var(--foreground)',
                                    border: '1px solid var(--border)',
                                    fontSize: isMobileView ? '10.5px' : '11.5px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px'
                                }}
                            >
                                <Info size={12} />
                                {showDeniedGuide ? "Masquer l'aide" : "Comment débloquer ?"}
                            </button>
                        )}
                    </div>
                </div>

                {/* Guide de déblocage si bloqué */}
                {browserPermission === 'denied' && showDeniedGuide && (
                    <div style={{
                        marginTop: '4px',
                        padding: isMobileView ? '8px 10px' : '12px 14px',
                        backgroundColor: 'var(--background)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        fontSize: isMobileView ? '10.5px' : '12px',
                        color: 'var(--foreground)',
                        lineHeight: 1.5
                    }}>
                        <div style={{ fontWeight: 700, marginBottom: '6px' }}>Pour réactiver les notifications :</div>
                        <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <li><strong>Sur Mobile (iOS / Android) :</strong> Réglages du téléphone &gt; Safari / Chrome &gt; Notifications &gt; Autoriser les notifications pour ce site.</li>
                            <li><strong>Sur Ordinateur (Chrome / Edge / Safari) :</strong> Cliquez sur l'icône cadenas ou réglages à gauche de l'adresse du site (URL) &gt; Notifications &gt; Choisissez <em>« Autoriser »</em>, puis rechargez la page.</li>
                        </ul>
                    </div>
                )}
            </div>

            {/* Légende des canaux avec Tooltip / Popover d'explication */}
            <div 
                ref={helpRef}
                style={{
                    position: 'relative',
                    border: '1px solid var(--border)',
                    borderRadius: isMobileView ? '10px' : '12px',
                    padding: isMobileView ? '8px 12px' : '12px 16px',
                    backgroundColor: 'var(--card)',
                    display: 'flex',
                    alignItems: isMobileView ? 'stretch' : 'center',
                    justifyContent: 'space-between',
                    flexDirection: isMobileView ? 'column' : 'row',
                    gap: isMobileView ? '8px' : '12px'
                }}
            >
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    width: isMobileView ? '100%' : 'auto'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: isMobileView ? '6px' : '8px' }}>
                        <Bell size={isMobileView ? 14 : 16} style={{ color: 'var(--sidebar-primary)' }} />
                        <span style={{ fontSize: isMobileView ? '11px' : '13px', fontWeight: 700 }}>
                            {isMobileView ? "Canaux disponibles :" : "Canaux de notification disponibles :"}
                        </span>
                    </div>

                    {isMobileView && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowChannelsHelp(prev => !prev);
                            }}
                            aria-label="Explication des canaux de notification"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '22px',
                                height: '22px',
                                border: 'none',
                                backgroundColor: 'transparent',
                                color: showChannelsHelp ? 'var(--sidebar-primary)' : 'var(--muted-foreground)',
                                cursor: 'pointer',
                                padding: 0
                            }}
                        >
                            <HelpCircle size={15} />
                        </button>
                    )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: isMobileView ? 'flex-start' : 'flex-end', gap: isMobileView ? '8px' : '16px', fontSize: isMobileView ? '10px' : '12px', fontWeight: 600, color: 'var(--muted-foreground)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Smartphone size={isMobileView ? 11 : 13} /> Push Mobile</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Mail size={isMobileView ? 11 : 13} /> Email</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Monitor size={isMobileView ? 11 : 13} /> In-app</span>

                    {!isMobileView && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowChannelsHelp(prev => !prev);
                            }}
                            onMouseEnter={() => setShowChannelsHelp(true)}
                            aria-label="Explication des canaux de notification"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '22px',
                                height: '22px',
                                border: 'none',
                                backgroundColor: 'transparent',
                                color: showChannelsHelp ? 'var(--sidebar-primary)' : 'var(--muted-foreground)',
                                cursor: 'pointer',
                                padding: 0,
                                marginLeft: '2px',
                                transition: 'color 0.15s ease'
                            }}
                        >
                            <HelpCircle size={15} />
                        </button>
                    )}
                </div>

                {/* Popover explicatif */}
                {showChannelsHelp && (
                    <div
                        onMouseLeave={() => {
                            if (!isMobileView) setShowChannelsHelp(false);
                        }}
                        style={{
                            position: 'absolute',
                            top: 'calc(100% + 8px)',
                            right: 0,
                            left: isMobileView ? 0 : 'auto',
                            width: isMobileView ? '100%' : '440px',
                            maxWidth: '100%',
                            backgroundColor: 'var(--card)',
                            border: '1px solid var(--border)',
                            borderRadius: '12px',
                            padding: isMobileView ? '12px' : '16px',
                            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                            zIndex: 50,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: isMobileView ? '11.5px' : '13px' }}>
                                <HelpCircle size={15} style={{ color: 'var(--sidebar-primary)' }} />
                                Comprendre les 3 canaux de notification
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowChannelsHelp(false)}
                                style={{
                                    border: 'none',
                                    background: 'none',
                                    color: 'var(--muted-foreground)',
                                    cursor: 'pointer',
                                    padding: '2px',
                                    display: 'flex',
                                    alignItems: 'center'
                                }}
                            >
                                <X size={15} />
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                <div style={{
                                    padding: '4px',
                                    borderRadius: '6px',
                                    backgroundColor: 'rgba(85, 107, 47, 0.1)',
                                    color: 'var(--sidebar-primary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    flexShrink: 0
                                }}>
                                    <Smartphone size={14} />
                                </div>
                                <div style={{ fontSize: isMobileView ? '10.5px' : '11.5px', lineHeight: 1.4 }}>
                                    <strong style={{ color: 'var(--foreground)' }}>Push Mobile & Bureau :</strong> Alerte instantanée sur l'écran de votre appareil, même si l'application est fermée. Indispensable sur le terrain.
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                <div style={{
                                    padding: '4px',
                                    borderRadius: '6px',
                                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                    color: '#2563EB',
                                    display: 'flex',
                                    alignItems: 'center',
                                    flexShrink: 0
                                }}>
                                    <Mail size={14} />
                                </div>
                                <div style={{ fontSize: isMobileView ? '10.5px' : '11.5px', lineHeight: 1.4 }}>
                                    <strong style={{ color: 'var(--foreground)' }}>Email :</strong> Notification détaillée envoyée dans votre boîte mail. Idéal pour conserver une trace écrite (ex: annulations, devis).
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                <div style={{
                                    padding: '4px',
                                    borderRadius: '6px',
                                    backgroundColor: 'rgba(168, 85, 247, 0.1)',
                                    color: '#9333EA',
                                    display: 'flex',
                                    alignItems: 'center',
                                    flexShrink: 0
                                }}>
                                    <Monitor size={14} />
                                </div>
                                <div style={{ fontSize: isMobileView ? '10.5px' : '11.5px', lineHeight: 1.4 }}>
                                    <strong style={{ color: 'var(--foreground)' }}>In-App (Cloche) :</strong> Historique dans le menu du CRM (icône <Bell size={11} style={{ display: 'inline', verticalAlign: '-1px', color: 'var(--foreground)' }} />). Permet de retrouver toutes vos alertes au même endroit.
                                </div>
                            </div>
                        </div>

                        <div style={{
                            marginTop: '2px',
                            padding: isMobileView ? '6px 8px' : '8px 10px',
                            backgroundColor: 'var(--background)',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            fontSize: isMobileView ? '10px' : '11px',
                            color: 'var(--muted-foreground)',
                            lineHeight: 1.4,
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '6px'
                        }}>
                            <Lightbulb size={13} style={{ color: 'var(--sidebar-primary)', flexShrink: 0, marginTop: '2px' }} />
                            <span>
                                <strong style={{ color: 'var(--foreground)' }}>Conseil :</strong> Laissez <strong>Push + In-App</strong> activés au quotidien, et cochez <strong>Email</strong> uniquement pour les alertes urgentes pour éviter d'encombrer votre boîte mail.
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Section 1: OWNER / MANAGER */}
            {!isTechnician && (
                <div style={{
                    border: '1px solid var(--border)',
                    borderRadius: isMobileView ? '12px' : '16px',
                    padding: isMobileView ? '10px 12px' : '20px',
                    backgroundColor: 'var(--card)'
                }}>
                    <h3 style={{
                        margin: isMobileView ? '0 0 8px 0' : '0 0 14px 0',
                        fontSize: isMobileView ? '11.5px' : '14.5px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: isMobileView ? '6px' : '8px',
                        lineHeight: 1.3
                    }}>
                        <Shield size={isMobileView ? 14 : 17} style={{ color: 'var(--sidebar-primary)', flexShrink: 0 }} />
                        {isMobileView ? "Notifications Administrateur & Gérant" : "Notifications Administrateur & Gestionnaire (Owner / Manager)"}
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobileView ? '6px' : '10px' }}>
                        {Object.keys(ownerNotifs).map((key) => {
                            const item = ownerNotifs[key];
                            return (
                                <div
                                    key={key}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: isMobileView ? '7px 9px' : '10px 14px',
                                        border: '1px solid var(--border)',
                                        borderRadius: '8px',
                                        backgroundColor: 'var(--background)',
                                        flexWrap: 'wrap',
                                        gap: isMobileView ? '6px' : '10px'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: isMobileView ? '7px' : '10px', minWidth: isMobileView ? 'auto' : '220px', flex: isMobileView ? '1 1 auto' : undefined }}>
                                        <label className="mobile-toggle-switch" style={{ transform: isMobileView ? 'scale(0.82)' : undefined, transformOrigin: 'left center', margin: 0 }}>
                                            <input type="checkbox" checked={item.enabled} onChange={() => toggleOwner(key)} />
                                            <span className="toggle-slider" />
                                        </label>
                                        <span style={{ fontSize: isMobileView ? '11px' : '13px', fontWeight: 600 }}>{item.label}</span>
                                    </div>

                                    {item.enabled && (
                                        <div style={{ marginLeft: isMobileView ? 'auto' : undefined }}>
                                            {renderChannelPills(item, (ch) => toggleOwnerChannel(key, ch))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Section 2: TECHNICIEN */}
            {isTechnician && (
                <div style={{
                    border: '1px solid var(--border)',
                    borderRadius: isMobileView ? '12px' : '16px',
                    padding: isMobileView ? '10px 12px' : '20px',
                    backgroundColor: 'var(--card)'
                }}>
                    <h3 style={{
                        margin: isMobileView ? '0 0 8px 0' : '0 0 14px 0',
                        fontSize: isMobileView ? '11.5px' : '14.5px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: isMobileView ? '6px' : '8px',
                        lineHeight: 1.3
                    }}>
                        <Wrench size={isMobileView ? 14 : 17} style={{ color: 'var(--sidebar-primary)', flexShrink: 0 }} />
                        {isMobileView ? "Notifications Techniciens" : "Notifications Techniciens de terrain"}
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobileView ? '6px' : '10px' }}>
                        {Object.keys(techNotifs).map((key) => {
                            const item = techNotifs[key];
                            return (
                                <div
                                    key={key}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: isMobileView ? '7px 9px' : '10px 14px',
                                        border: '1px solid var(--border)',
                                        borderRadius: '8px',
                                        backgroundColor: 'var(--background)',
                                        flexWrap: 'wrap',
                                        gap: isMobileView ? '6px' : '10px'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: isMobileView ? '7px' : '10px', minWidth: isMobileView ? 'auto' : '220px', flex: isMobileView ? '1 1 auto' : undefined }}>
                                        <label className="mobile-toggle-switch" style={{ transform: isMobileView ? 'scale(0.82)' : undefined, transformOrigin: 'left center', margin: 0 }}>
                                            <input type="checkbox" checked={item.enabled} onChange={() => toggleTech(key)} />
                                            <span className="toggle-slider" />
                                        </label>
                                        <span style={{ fontSize: isMobileView ? '11px' : '13px', fontWeight: 600 }}>{item.label}</span>
                                    </div>

                                    {item.enabled && (
                                        <div style={{ marginLeft: isMobileView ? 'auto' : undefined }}>
                                            {renderChannelPills(item, (ch) => toggleTechChannel(key, ch))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Desktop Only Save Button */}
            {!isMobileView && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                    <button
                        type="submit"
                        disabled={saving}
                        className="save-profile-btn"
                        style={{
                            width: 'auto',
                            justifyContent: 'center',
                            padding: '10px 24px',
                            backgroundColor: 'var(--sidebar-primary)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 600,
                            fontSize: '13.5px',
                            cursor: saving ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            opacity: isExpired ? 0.85 : 1
                        }}
                    >
                        {isExpired && <Lock size={15} />}
                        Enregistrer les préférences
                    </button>
                </div>
            )}
        </form>
    );
}
