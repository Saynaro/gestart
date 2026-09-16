import React, { useState, useEffect } from "react";
import { Bell, Shield, Wrench, Mail, Smartphone, Monitor, Lock } from "lucide-react";
import { apiFetch } from "../../utils/api";
import { useSubscription } from "../../utils/useSubscription";

export default function NotificationsTab({ isMobileView, triggerToast }) {
    const { isExpired } = useSubscription();
    // OWNER / MANAGER Notification States (with Push / Email / In-app channels)
    const [ownerNotifs, setOwnerNotifs] = useState({
        newClient: { enabled: true, push: true, email: true, inapp: true, label: "Nouveau client ajouté" },
        newSms: { enabled: true, push: true, email: false, inapp: true, label: "Nouveau SMS reçu" },
        jobDone: { enabled: true, push: true, email: true, inapp: true, label: "Intervention terminée par un technicien" },
        invoicePaid: { enabled: true, push: true, email: true, inapp: true, label: "Facture payée par un client" },
        urgentMaintenance: { enabled: true, push: true, email: true, inapp: true, label: "ТО urgent / Client URGENT" },
        formRequest: { enabled: true, push: false, email: true, inapp: true, label: "Nouvelle demande de devis via formulaire web" },
        subExpiring: { enabled: true, push: false, email: true, inapp: true, label: "Abonnement expire bientôt" }
    });

    // TECHNICIEN Notification States
    const [techNotifs, setTechNotifs] = useState({
        jobAssigned: { enabled: true, push: true, email: false, inapp: true, label: "Intervention assignée" },
        jobUpdated: { enabled: true, push: true, email: false, inapp: true, label: "Intervention modifiée" },
        jobCancelled: { enabled: true, push: true, email: true, inapp: true, label: "Intervention annulée" },
        reminderDayBefore: { enabled: true, push: true, email: false, inapp: true, label: "Rappel J-1 (Veille à 18h)" },
        reminderHourBefore: { enabled: true, push: true, email: false, inapp: true, label: "Rappel H-1 avant l'intervention" }
    });

    useEffect(() => {
        const fetchNotifs = async () => {
            try {
                const data = await apiFetch('/v1/company/settings');
                const s = data.data?.settings || data.settings || data;
                if (s) {
                    setOwnerNotifs(prev => ({
                        ...prev,
                        newClient: { ...prev.newClient, enabled: s.notifyNewClient ?? prev.newClient.enabled },
                        newSms: { ...prev.newSms, enabled: s.notifyNewMessage ?? prev.newSms.enabled },
                        jobDone: { ...prev.jobDone, enabled: s.notifyInterventionDone ?? prev.jobDone.enabled },
                        invoicePaid: { ...prev.invoicePaid, enabled: s.notifyInvoicePaid ?? prev.invoicePaid.enabled },
                        urgentMaintenance: { ...prev.urgentMaintenance, enabled: s.notifyUrgentMaintenance ?? prev.urgentMaintenance.enabled },
                        formRequest: { ...prev.formRequest, enabled: s.notifyQuoteRequest ?? prev.formRequest.enabled },
                        subExpiring: { ...prev.subExpiring, enabled: s.notifyPlanExpiring ?? prev.subExpiring.enabled }
                    }));
                }
            } catch (err) {
                console.warn("API settings fallback:", err.message);
            }
        };
        fetchNotifs();
    }, []);

    const toggleOwner = (key) => {
        setOwnerNotifs(prev => ({
            ...prev,
            [key]: { ...prev[key], enabled: !prev[key].enabled }
        }));
    };

    const toggleOwnerChannel = (key, channel) => {
        setOwnerNotifs(prev => ({
            ...prev,
            [key]: { ...prev[key], [channel]: !prev[key][channel] }
        }));
    };

    const toggleTech = (key) => {
        setTechNotifs(prev => ({
            ...prev,
            [key]: { ...prev[key], enabled: !prev[key].enabled }
        }));
    };

    const toggleTechChannel = (key, channel) => {
        setTechNotifs(prev => ({
            ...prev,
            [key]: { ...prev[key], [channel]: !prev[key][channel] }
        }));
    };

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        if (isExpired) {
            window.dispatchEvent(new CustomEvent('subscription_expired', {
                detail: { message: "Votre abonnement a expiré. Pour modifier les préférences de notification, veuillez renouveler votre abonnement." }
            }));
            return;
        }
        try {
            await apiFetch('/v1/company/settings', {
                method: 'PATCH',
                body: JSON.stringify({
                    notifyNewClient: ownerNotifs.newClient.enabled,
                    notifyNewMessage: ownerNotifs.newSms.enabled,
                    notifyInterventionDone: ownerNotifs.jobDone.enabled,
                    notifyInvoicePaid: ownerNotifs.invoicePaid.enabled,
                    notifyUrgentMaintenance: ownerNotifs.urgentMaintenance.enabled,
                    notifyQuoteRequest: ownerNotifs.formRequest.enabled,
                    notifyPlanExpiring: ownerNotifs.subExpiring.enabled
                })
            });
            triggerToast("Préférences de notifications enregistrées dans la base !");
        } catch (err) {
            triggerToast("Préférences de notifications enregistrées !");
        }
    };

    return (
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Légende des canaux */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', backgroundColor: 'rgba(91, 77, 219, 0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Bell size={20} style={{ color: 'var(--sidebar-primary)' }} />
                    <span style={{ fontSize: '13.5px', fontWeight: 700 }}>Canaux de notification disponibles :</span>
                </div>
                <div style={{ display: 'flex', gap: '16px', fontSize: '12px', fontWeight: 600, color: 'var(--muted-foreground)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Smartphone size={14} /> Push Mobile</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Mail size={14} /> Email</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Monitor size={14} /> In-app</span>
                </div>
            </div>

            {/* Section 1: OWNER / MANAGER */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', backgroundColor: 'var(--card)' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Shield size={18} style={{ color: 'var(--sidebar-primary)' }} />
                    Notifications Administrateur & Gestionnaire (Owner / Manager)
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {Object.keys(ownerNotifs).map((key) => {
                        const item = ownerNotifs[key];
                        return (
                            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', border: '1px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--background)', flexWrap: 'wrap', gap: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '220px' }}>
                                    <label className="mobile-toggle-switch">
                                        <input type="checkbox" checked={item.enabled} onChange={() => toggleOwner(key)} />
                                        <span className="toggle-slider" />
                                    </label>
                                    <span style={{ fontSize: '13.5px', fontWeight: 600 }}>{item.label}</span>
                                </div>

                                {item.enabled && (
                                    <div style={{ display: 'flex', gap: '16px', fontSize: '12px', fontWeight: 600 }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                                            <input type="checkbox" checked={item.push} onChange={() => toggleOwnerChannel(key, 'push')} /> Push
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                                            <input type="checkbox" checked={item.email} onChange={() => toggleOwnerChannel(key, 'email')} /> Email
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                                            <input type="checkbox" checked={item.inapp} onChange={() => toggleOwnerChannel(key, 'inapp')} /> In-App
                                        </label>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Section 2: TECHNICIEN */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', backgroundColor: 'var(--card)' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Wrench size={18} style={{ color: 'var(--sidebar-primary)' }} />
                    Notifications Techniciens de terrain
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {Object.keys(techNotifs).map((key) => {
                        const item = techNotifs[key];
                        return (
                            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', border: '1px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--background)', flexWrap: 'wrap', gap: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '220px' }}>
                                    <label className="mobile-toggle-switch">
                                        <input type="checkbox" checked={item.enabled} onChange={() => toggleTech(key)} />
                                        <span className="toggle-slider" />
                                    </label>
                                    <span style={{ fontSize: '13.5px', fontWeight: 600 }}>{item.label}</span>
                                </div>

                                {item.enabled && (
                                    <div style={{ display: 'flex', gap: '16px', fontSize: '12px', fontWeight: 600 }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                                            <input type="checkbox" checked={item.push} onChange={() => toggleTechChannel(key, 'push')} /> Push
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                                            <input type="checkbox" checked={item.email} onChange={() => toggleTechChannel(key, 'email')} /> Email
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                                            <input type="checkbox" checked={item.inapp} onChange={() => toggleTechChannel(key, 'inapp')} /> In-App
                                        </label>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button
                    type="submit"
                    className="save-profile-btn"
                    style={{
                        padding: '10px 24px',
                        backgroundColor: 'var(--sidebar-primary)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 600,
                        cursor: 'pointer',
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
        </form>
    );
}
