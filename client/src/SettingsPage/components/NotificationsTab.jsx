import React, { useState, useEffect, useRef, useCallback } from "react";
import { Bell, Shield, Wrench, Mail, Smartphone, Monitor, Lock } from "lucide-react";
import { apiFetch } from "../../utils/api";
import { useSubscription } from "../../utils/useSubscription";

const STORAGE_KEY_OWNER = "crm_notif_owner_prefs";
const STORAGE_KEY_TECH = "crm_notif_tech_prefs";

export default function NotificationsTab({ isMobileView, triggerToast }) {
    const { isExpired } = useSubscription();

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
                    setOwnerNotifs(prev => {
                        const updated = {
                            ...prev,
                            newClient: { ...prev.newClient, enabled: s.notifyNewClient ?? prev.newClient.enabled },
                            newSms: { ...prev.newSms, enabled: s.notifyNewMessage ?? prev.newSms.enabled },
                            jobDone: { ...prev.jobDone, enabled: s.notifyInterventionDone ?? prev.jobDone.enabled },
                            invoicePaid: { ...prev.invoicePaid, enabled: s.notifyInvoicePaid ?? prev.invoicePaid.enabled },
                            urgentMaintenance: { ...prev.urgentMaintenance, enabled: s.notifyUrgentMaintenance ?? prev.urgentMaintenance.enabled },
                            formRequest: { ...prev.formRequest, enabled: s.notifyQuoteRequest ?? prev.formRequest.enabled },
                            subExpiring: { ...prev.subExpiring, enabled: s.notifyPlanExpiring ?? prev.subExpiring.enabled }
                        };
                        localStorage.setItem(STORAGE_KEY_OWNER, JSON.stringify(updated));
                        return updated;
                    });

                    setTechNotifs(prev => {
                        const updated = {
                            ...prev,
                            jobAssigned: { ...prev.jobAssigned, enabled: s.notifyTechAssigned ?? prev.jobAssigned.enabled },
                            jobUpdated: { ...prev.jobUpdated, enabled: s.notifyTechUpdated ?? prev.jobUpdated.enabled },
                            jobCancelled: { ...prev.jobCancelled, enabled: s.notifyTechCancelled ?? prev.jobCancelled.enabled },
                            reminderDayBefore: { ...prev.reminderDayBefore, enabled: s.notifyTechReminder24h ?? prev.reminderDayBefore.enabled },
                            reminderHourBefore: { ...prev.reminderHourBefore, enabled: s.notifyTechReminder1h ?? prev.reminderHourBefore.enabled }
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
                    notifyTechReminder1h: t.reminderHourBefore?.enabled ?? true
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
            {/* Légende des canaux */}
            <div style={{
                border: '1px solid var(--border)',
                borderRadius: isMobileView ? '10px' : '12px',
                padding: isMobileView ? '8px 10px' : '14px 16px',
                backgroundColor: 'var(--card)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: isMobileView ? '6px' : '12px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: isMobileView ? '6px' : '10px' }}>
                    <Bell size={isMobileView ? 15 : 18} style={{ color: 'var(--sidebar-primary)' }} />
                    <span style={{ fontSize: isMobileView ? '11.5px' : '13.5px', fontWeight: 700 }}>Canaux de notification disponibles :</span>
                </div>
                <div style={{ display: 'flex', gap: isMobileView ? '8px' : '16px', fontSize: isMobileView ? '10.5px' : '12px', fontWeight: 600, color: 'var(--muted-foreground)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Smartphone size={isMobileView ? 11 : 13} /> Push Mobile</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Mail size={isMobileView ? 11 : 13} /> Email</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Monitor size={isMobileView ? 11 : 13} /> In-app</span>
                </div>
            </div>

            {/* Section 1: OWNER / MANAGER */}
            <div style={{
                border: '1px solid var(--border)',
                borderRadius: isMobileView ? '12px' : '16px',
                padding: isMobileView ? '10px 12px' : '20px',
                backgroundColor: 'var(--card)'
            }}>
                <h3 style={{
                    margin: isMobileView ? '0 0 8px 0' : '0 0 14px 0',
                    fontSize: isMobileView ? '12.5px' : '14.5px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <Shield size={isMobileView ? 15 : 17} style={{ color: 'var(--sidebar-primary)' }} />
                    Notifications Administrateur & Gestionnaire (Owner / Manager)
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

            {/* Section 2: TECHNICIEN */}
            <div style={{
                border: '1px solid var(--border)',
                borderRadius: isMobileView ? '12px' : '16px',
                padding: isMobileView ? '10px 12px' : '20px',
                backgroundColor: 'var(--card)'
            }}>
                <h3 style={{
                    margin: isMobileView ? '0 0 8px 0' : '0 0 14px 0',
                    fontSize: isMobileView ? '12.5px' : '14.5px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <Wrench size={isMobileView ? 15 : 17} style={{ color: 'var(--sidebar-primary)' }} />
                    Notifications Techniciens de terrain
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
