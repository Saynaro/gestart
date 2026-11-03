import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Phone, Mail, MapPin, Edit3, Calendar, MessageSquare, FileText, Camera, PenTool, CheckCircle2, Clock, Send, Play, Pause, Sparkles, Wrench, Lock } from "lucide-react";
import InterventionDetailModal, { getInterventionStatusInfo } from "./InterventionDetailModal";
import ToastNotification from "../../components/ToastNotification";
import { apiFetch } from "../../utils/api";

function ClientDetailView({ selectedClient, setSelectedClient, getClientDetails, detailTab, setDetailTab, onEdit, onOpenInvoice, onOpenQuote, isReadOnly = false, isExpired = false }) {
    const navigate = useNavigate();
    const [selectedInterventionForModal, setSelectedInterventionForModal] = useState(null);
    const details = getClientDetails(selectedClient);
    if (!details) return null;

    const displayName = selectedClient.isOrg ? selectedClient.name : `${selectedClient.firstName} ${selectedClient.lastName}`;
    let initials = "CL";
    if (selectedClient.isOrg) {
        const n = (selectedClient.name || "").trim();
        const parts = n.split(/\s+/);
        initials = parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : n.substring(0, 2).toUpperCase() || "OR";
    } else {
        const f = selectedClient.firstName ? selectedClient.firstName[0] : "";
        const l = selectedClient.lastName ? selectedClient.lastName[0] : "";
        initials = `${f}${l}`.toUpperCase() || "CL";
    }

    const fullAddress = [selectedClient.address, [selectedClient.zip, selectedClient.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");
    const availableTabs = isReadOnly ? ["interventions"] : ["interventions", "auto-rappel", "factures", "devis"];
    const currentTab = availableTabs.includes(detailTab) ? detailTab : "interventions";
    const [actionLoading, setActionLoading] = useState(null);
    const [toast, setToast] = useState(null);
    const [automations, setAutomations] = useState(() => details.reminderAutomations || []);

    useEffect(() => {
        setAutomations(details.reminderAutomations || []);
    }, [details.reminderAutomations]);

    const handleTriggerReminder = async (autoId) => {
        try {
            setActionLoading(autoId);
            const res = await apiFetch(`/v1/reminders/automations/${autoId}/execute-now`, {
                method: "POST"
            });
            setToast({
                message: res.message || "Rappel envoyé avec succès !",
                type: "success"
            });
        } catch (err) {
            setToast({
                message: err.message || "Erreur lors de l'exécution du rappel",
                type: "error"
            });
        } finally {
            setActionLoading(null);
        }
    };

    const handleTogglePause = async (autoId) => {
        try {
            setActionLoading(`toggle-${autoId}`);
            const res = await apiFetch(`/v1/reminders/automations/${autoId}/toggle`, {
                method: "PATCH"
            });
            const isNowEnabled = res?.data?.automation?.enabled;
            setAutomations(prev => prev.map(item => 
                item.id === autoId ? { ...item, enabled: isNowEnabled !== undefined ? isNowEnabled : !item.enabled } : item
            ));
            setToast({
                message: res.message || (isNowEnabled ? "Rappel réactivé avec succès." : "Rappel mis en pause."),
                type: "success"
            });
        } catch (err) {
            setToast({
                message: err.message || "Erreur lors du changement d'état du rappel",
                type: "error"
            });
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <>
            {/* Breadcrumbs */}
            <div className="client-breadcrumbs">
                <span className="breadcrumb-link" onClick={() => setSelectedClient(null)}>Clients</span>
                <span className="breadcrumb-arrow"> &gt; </span>
                <span className="breadcrumb-current">{displayName}</span>
            </div>

            {/* Detail Grid */}
            <div className="client-detail-layout">
                {/* Left Card: Profile & Stats */}
                <div className="client-profile-card" style={{ paddingTop: '28px' }}>
                    <div className="client-profile-avatar-circle">
                        {initials}
                    </div>
                    <h2 className="client-profile-name">
                        {displayName}
                    </h2>

                    <div className="client-profile-contact-info">
                        {selectedClient.phone ? (
                            <a href={`tel:${selectedClient.phone.replace(/\s+/g, '')}`} className="mobile-contact-row clickable">
                                <Phone size={16} className="contact-icon-icon" />
                                <span>{selectedClient.phone}</span>
                            </a>
                        ) : (
                            <div className="mobile-contact-row">
                                <Phone size={16} className="contact-icon-icon" />
                                <span>Non renseigné</span>
                            </div>
                        )}
                        {selectedClient.email ? (
                            <a href={`mailto:${selectedClient.email}`} className="mobile-contact-row clickable">
                                <Mail size={16} className="contact-icon-icon" />
                                <span>{selectedClient.email}</span>
                            </a>
                        ) : (
                            <div className="mobile-contact-row">
                                <Mail size={16} className="contact-icon-icon" />
                                <span>Non renseigné</span>
                            </div>
                        )}
                        {fullAddress ? (
                            <a 
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="mobile-contact-row clickable"
                            >
                                <MapPin size={16} className="contact-icon-icon" />
                                <span>{fullAddress}</span>
                            </a>
                        ) : (
                            <div className="mobile-contact-row">
                                <MapPin size={16} className="contact-icon-icon" />
                                <span>Non renseigné</span>
                            </div>
                        )}
                    </div>

                    <div className="panel-divider"></div>

                    <h3 className="mobile-section-title" style={{ marginBottom: '8px', textAlign: 'left' }}>ÉQUIPEMENT</h3>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        backgroundColor: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border)',
                        borderRadius: '14px',
                        padding: '14px 16px',
                        width: '100%',
                        boxSizing: 'border-box'
                    }}>
                        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                            <span style={{ color: 'var(--muted-foreground)', fontSize: '13.5px', fontWeight: 500, textAlign: 'left' }}>Modèle</span>
                            <span style={{ color: 'var(--foreground)', fontSize: '13.5px', fontWeight: 600, textAlign: 'right' }}>{details.equipment.model}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                            <span style={{ color: 'var(--muted-foreground)', fontSize: '13.5px', fontWeight: 500, textAlign: 'left' }}>Installé le</span>
                            <span style={{ color: 'var(--foreground)', fontSize: '13.5px', fontWeight: 600, textAlign: 'right' }}>{details.equipment.installDate}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                            <span style={{ color: 'var(--muted-foreground)', fontSize: '13.5px', fontWeight: 500, textAlign: 'left' }}>N° de série</span>
                            <span style={{ color: 'var(--foreground)', fontSize: '13.5px', fontWeight: 600, fontFamily: 'monospace', textAlign: 'right' }}>{details.equipment.serialNumber}</span>
                        </div>
                    </div>

                    <div className="panel-divider"></div>

                    <h3 className="mobile-section-title">STATUT ENTRETIEN</h3>
                    <div className={`mobile-maintenance-box ${details.maintenance.hasNext ? 'has-next' : 'no-next'}`}>
                        <div className={`maintenance-badge-icon ${details.maintenance.statusClass || (details.maintenance.hasNext ? 'green' : 'gray')}`}>
                            {details.maintenance.hasNext ? (
                                (details.maintenance.status || "").toLowerCase().includes("rappel") ? (
                                    <Sparkles size={17} />
                                ) : (
                                    <Calendar size={17} />
                                )
                            ) : (
                                <Clock size={17} />
                            )}
                        </div>
                        <div className="maintenance-info-col">
                            <div className="maintenance-status-row">
                                <span className={`status-pill ${details.maintenance.statusClass === 'green' ? 'ok' : details.maintenance.statusClass === 'warning' ? 'warning' : 'gray'}`}>
                                    {details.maintenance.status || (details.maintenance.hasNext ? "OK" : "Aucun")}
                                </span>
                            </div>
                            <div className={`maintenance-next ${details.maintenance.hasNext ? '' : 'muted'}`}>
                                {details.maintenance.hasNext
                                    ? (details.maintenance.nextMaintenance?.startsWith("Prochain") || details.maintenance.nextMaintenance?.startsWith("Rappel") || details.maintenance.nextMaintenance?.startsWith("RDV")
                                        ? details.maintenance.nextMaintenance
                                        : `Prochain entretien: ${details.maintenance.nextMaintenance}`)
                                    : `Aucun entretien à venir`}
                            </div>
                        </div>
                    </div>

                    <div className="mobile-action-grid">
                        {!isReadOnly && (
                            <button
                                className="mobile-action-btn modifier"
                                onClick={() => {
                                    if (isExpired) {
                                        window.dispatchEvent(new CustomEvent('subscription_expired', {
                                            detail: { message: "Votre abonnement a expiré. Pour modifier ce client, veuillez renouveler votre abonnement." }
                                        }));
                                        return;
                                    }
                                    onEdit(selectedClient, selectedClient.isOrg);
                                }}
                            >
                                {isExpired ? <Lock size={15} /> : <Edit3 size={16} />}
                                <span>Modifier</span>
                            </button>
                        )}
                        <button
                            className="mobile-action-btn planifier"
                            onClick={() => {
                                if (isExpired) {
                                    window.dispatchEvent(new CustomEvent('subscription_expired', {
                                        detail: { message: "Votre abonnement a expiré. Pour planifier une intervention, veuillez renouveler votre abonnement." }
                                    }));
                                    return;
                                }
                                navigate('/planning', { state: { clientId: selectedClient.id, clientName: displayName, returnUrl: `/client?id=${selectedClient.id}` } });
                            }}
                        >
                            {isExpired ? <Lock size={15} /> : <Calendar size={16} />}
                            <span>Planifier</span>
                        </button>
                        <button
                            className="mobile-action-btn sms"
                            onClick={() => {
                                if (isExpired) {
                                    window.dispatchEvent(new CustomEvent('subscription_expired', {
                                        detail: { message: "Votre abonnement a expiré. Pour envoyer des messages, veuillez renouveler votre abonnement." }
                                    }));
                                    return;
                                }
                                navigate('/messages', { state: { clientId: selectedClient.id, clientName: displayName, phone: selectedClient.phone, email: selectedClient.email, address: selectedClient.address, returnUrl: `/client?id=${selectedClient.id}` } });
                            }}
                        >
                            {isExpired ? <Lock size={15} /> : <MessageSquare size={16} />}
                            <span>SMS</span>
                        </button>
                        {!isReadOnly && (
                            <button
                                className="mobile-action-btn facture"
                                onClick={() => {
                                    if (isExpired) {
                                        window.dispatchEvent(new CustomEvent('subscription_expired', {
                                            detail: { message: "Votre abonnement a expiré. Pour créer une facture, veuillez renouveler votre abonnement." }
                                        }));
                                        return;
                                    }
                                    navigate('/factures', { state: { clientId: selectedClient.id, clientName: displayName, clientEmail: selectedClient.email, clientAddress: selectedClient.address, openNewModal: true, returnUrl: `/client?id=${selectedClient.id}` } });
                                }}
                            >
                                {isExpired ? <Lock size={15} /> : <FileText size={16} />}
                                <span>Facture</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Right Card: Tabs View */}
                <div className="client-detail-tabs-card">
                    {availableTabs.length > 1 ? (
                        <div className="mobile-tabs-header">
                            {availableTabs.map((tab) => (
                                <button
                                    key={tab}
                                    className={`mobile-tab-btn ${currentTab === tab ? "active" : ""}`}
                                    onClick={(e) => {
                                        setDetailTab(tab);
                                        e.currentTarget.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
                                    }}
                                >
                                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="mobile-tabs-header" style={{ borderBottom: '1px solid var(--border)' }}>
                            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--foreground)', padding: '12px 16px', display: 'inline-block' }}>
                                Interventions ({details.interventions.length})
                            </span>
                        </div>
                    )}

                    <div className="mobile-tabs-content">
                        {detailTab === "interventions" && (
                            <div className="mobile-tab-panel">
                                {details.interventions.length === 0 ? (
                                    <p style={{ textAlign: 'center', color: 'var(--muted-foreground)', padding: '24px', fontSize: '13.5px' }}>
                                        Aucune intervention enregistrée pour ce client.
                                    </p>
                                ) : (
                                    details.interventions.map((item, idx) => {
                                        const hasPhotos = (item.photos && item.photos.length > 0) || (item.raw?.photos && item.raw.photos.length > 0);
                                        const hasSignature = !!item.clientSignature || !!item.raw?.clientSignature;
                                        const statusBadge = getInterventionStatusInfo(item);

                                        return (
                                            <div
                                                key={idx}
                                                className="mobile-history-card"
                                                style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
                                                onClick={() => setSelectedInterventionForModal(item)}
                                                title="Cliquer pour voir les détails, photos et signature"
                                            >
                                                <div className="history-card-header">
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                        <h4>{item.title}</h4>
                                                        <span style={{
                                                            fontSize: '11px',
                                                            fontWeight: 700,
                                                            color: statusBadge?.color || '#556B2F',
                                                            backgroundColor: statusBadge?.bg || 'rgba(85, 107, 47, 0.12)',
                                                            padding: '2px 8px',
                                                            borderRadius: '12px'
                                                        }}>
                                                            {statusBadge?.label || 'En attente'}
                                                        </span>
                                                    </div>
                                                    <span className="history-card-date">{item.date}</span>
                                                </div>
                                                <p className="history-card-desc" style={{ marginBottom: (hasPhotos || hasSignature) ? '8px' : '0' }}>
                                                    {item.desc}
                                                </p>

                                                {(hasPhotos || hasSignature) && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px', fontSize: '12px', color: 'var(--muted-foreground)' }}>
                                                        {hasPhotos && (
                                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#556B2F', fontWeight: 600 }}>
                                                                <Camera size={13} />
                                                                <span>{(item.photos || item.raw?.photos || []).length} photo{(item.photos || item.raw?.photos || []).length > 1 ? 's' : ''}</span>
                                                            </span>
                                                        )}
                                                        {hasSignature && (
                                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#16a34a', fontWeight: 600 }}>
                                                                <PenTool size={13} />
                                                                <span>Signée</span>
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}

                        {detailTab === "auto-rappel" && (
                            <div className="mobile-tab-panel">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Sparkles size={16} color="#556B2F" />
                                        <h4 style={{ margin: 0, fontSize: '0.95rem' }}>Cycles de Rappels Automatiques</h4>
                                    </div>
                                    <button
                                        className="mobile-action-btn"
                                        style={{ padding: '4px 10px', fontSize: '0.75rem', height: 'auto', backgroundColor: '#556B2F', color: '#ffffff', borderRadius: '6px' }}
                                        onClick={() => {
                                            if (isExpired) {
                                                window.dispatchEvent(new CustomEvent('subscription_expired', {
                                                    detail: { message: "Votre abonnement a expiré. Pour configurer et gérer les rappels automatiques, veuillez renouveler votre abonnement." }
                                                }));
                                                return;
                                            }
                                            navigate('/premium');
                                        }}
                                    >
                                        Gérer dans Auto Rappel
                                    </button>
                                </div>

                                {(!automations || automations.length === 0) ? (
                                    <div style={{ textAlign: 'center', color: 'var(--muted-foreground)', padding: '30px 20px', fontSize: '13.5px' }}>
                                        <Clock size={28} style={{ opacity: 0.4, marginBottom: '8px' }} />
                                        <p style={{ margin: '0 0 10px 0' }}>Aucun cycle de rappel actif pour ce client.</p>
                                        <button
                                            className="mobile-action-btn planifier"
                                            style={{ margin: '0 auto', fontSize: '0.8rem', padding: '6px 14px' }}
                                            onClick={() => {
                                                if (isExpired) {
                                                    window.dispatchEvent(new CustomEvent('subscription_expired', {
                                                        detail: { message: "Votre abonnement a expiré. Pour configurer et gérer les rappels automatiques, veuillez renouveler votre abonnement." }
                                                    }));
                                                    return;
                                                }
                                                navigate('/premium');
                                            }}
                                        >
                                            + Configurer un rappel
                                        </button>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {automations.map((auto, idx) => {
                                            const serviceName = auto.trackedServices?.[0]?.serviceType?.name || auto.name || "Prestation générale";
                                            const nextDateStr = auto.nextReminderAt ? new Date(auto.nextReminderAt).toLocaleDateString('fr-FR') : "Non définie";
                                            const lastDateStr = auto.lastCompletedAt ? new Date(auto.lastCompletedAt).toLocaleDateString('fr-FR') : "Aucune";

                                            return (
                                                <div 
                                                    key={auto.id || idx} 
                                                    className="mobile-history-card" 
                                                    style={{ 
                                                        padding: '16px',
                                                        borderRadius: '12px',
                                                        border: '1px solid var(--border)',
                                                        backgroundColor: 'var(--card)',
                                                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)'
                                                    }}
                                                >
                                                    <div className="history-card-header" style={{ marginBottom: '10px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <Wrench size={15} color="var(--muted-foreground)" />
                                                            <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--foreground)' }}>{serviceName}</h4>
                                                        </div>
                                                        <div>
                                                            {isExpired ? (
                                                                <span style={{
                                                                    fontSize: '11.5px',
                                                                    fontWeight: 600,
                                                                    padding: '3px 8px',
                                                                    borderRadius: '6px',
                                                                    backgroundColor: 'rgba(217, 119, 6, 0.08)',
                                                                    color: '#b45309',
                                                                    border: '1px solid rgba(217, 119, 6, 0.2)',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '4px'
                                                                }}>
                                                                    <Lock size={11} />
                                                                    Suspendu (Abonnement)
                                                                </span>
                                                            ) : auto.enabled ? (
                                                                <span style={{
                                                                    fontSize: '11.5px',
                                                                    fontWeight: 600,
                                                                    padding: '3px 8px',
                                                                    borderRadius: '6px',
                                                                    backgroundColor: 'rgba(22, 163, 74, 0.08)',
                                                                    color: '#15803d',
                                                                    border: '1px solid rgba(22, 163, 74, 0.2)',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '5px'
                                                                }}>
                                                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#16a34a' }} />
                                                                    Actif
                                                                </span>
                                                            ) : (
                                                                <span style={{
                                                                    fontSize: '11.5px',
                                                                    fontWeight: 600,
                                                                    padding: '3px 8px',
                                                                    borderRadius: '6px',
                                                                    backgroundColor: 'rgba(100, 116, 139, 0.08)',
                                                                    color: '#475569',
                                                                    border: '1px solid rgba(100, 116, 139, 0.2)',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '4px'
                                                                }}>
                                                                    <Pause size={10} />
                                                                    En pause
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: '13px', color: 'var(--muted-foreground)', marginBottom: '12px' }}>
                                                        <div>
                                                            <span>Dernière intervention : </span>
                                                            <span style={{ color: 'var(--foreground)', fontWeight: 500 }}>{lastDateStr}</span>
                                                        </div>
                                                        <div>
                                                            <span>Prochain rappel : </span>
                                                            <span style={{ color: 'var(--foreground)', fontWeight: 500 }}>{nextDateStr}</span>
                                                        </div>
                                                        <div>
                                                            <span>Fréquence : </span>
                                                            <span style={{ color: 'var(--foreground)', fontWeight: 500 }}>{auto.frequencyValue} {auto.frequencyUnit === 'MONTHS' ? 'mois' : 'jours'}</span>
                                                        </div>
                                                        <div>
                                                            <span>Canal : </span>
                                                            <span style={{ color: 'var(--foreground)', fontWeight: 500 }}>{auto.channel === 'WHATSAPP' ? 'WhatsApp' : auto.channel === 'SMS' ? 'SMS' : auto.channel === 'EMAIL' ? 'Email' : 'Dernier canal'}</span>
                                                        </div>
                                                    </div>

                                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                                                        {isExpired ? (
                                                            <button
                                                                type="button"
                                                                className="mobile-action-btn"
                                                                style={{ 
                                                                    padding: '6px 14px', 
                                                                    fontSize: '12.5px',
                                                                    fontWeight: 500,
                                                                    borderRadius: '8px',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '6px',
                                                                    border: '1px solid var(--border)',
                                                                    backgroundColor: 'var(--background)',
                                                                    color: 'var(--foreground)',
                                                                    cursor: 'pointer'
                                                                }}
                                                                onClick={() => {
                                                                    window.dispatchEvent(new CustomEvent('subscription_expired', {
                                                                        detail: { message: "Votre abonnement a expiré. Pour réactiver vos cycles de rappel et déclencher des messages, veuillez renouveler votre abonnement." }
                                                                    }));
                                                                }}
                                                            >
                                                                <Lock size={12} style={{ color: 'var(--muted-foreground)' }} />
                                                                <span>Déclencher maintenant</span>
                                                            </button>
                                                        ) : (
                                                            <>
                                                                {/* Toggle Pause / Resume */}
                                                                <button
                                                                    type="button"
                                                                    className="mobile-action-btn"
                                                                    style={{ 
                                                                        padding: '6px 14px', 
                                                                        fontSize: '12.5px',
                                                                        fontWeight: 500,
                                                                        borderRadius: '8px',
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        gap: '6px',
                                                                        border: '1px solid var(--border)',
                                                                        backgroundColor: 'var(--background)',
                                                                        color: 'var(--foreground)',
                                                                        cursor: 'pointer'
                                                                    }}
                                                                    onClick={() => handleTogglePause(auto.id)}
                                                                    disabled={actionLoading === `toggle-${auto.id}`}
                                                                >
                                                                    {auto.enabled ? (
                                                                        <>
                                                                            <Pause size={12} style={{ color: 'var(--muted-foreground)' }} />
                                                                            <span>{actionLoading === `toggle-${auto.id}` ? "Mise en pause..." : "Mettre en pause"}</span>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Play size={12} style={{ color: 'var(--muted-foreground)' }} />
                                                                            <span>{actionLoading === `toggle-${auto.id}` ? "Reprise..." : "Reprendre"}</span>
                                                                        </>
                                                                    )}
                                                                </button>

                                                                {/* Trigger Now */}
                                                                <button
                                                                    type="button"
                                                                    className="mobile-action-btn"
                                                                    style={{ 
                                                                        padding: '6px 14px', 
                                                                        fontSize: '12.5px',
                                                                        fontWeight: 500,
                                                                        borderRadius: '8px',
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        gap: '6px',
                                                                        border: '1px solid var(--border)',
                                                                        backgroundColor: 'var(--background)',
                                                                        color: 'var(--foreground)',
                                                                        opacity: !auto.enabled ? 0.6 : 1,
                                                                        cursor: 'pointer'
                                                                    }}
                                                                    onClick={() => {
                                                                        if (!auto.enabled) {
                                                                            setToast({
                                                                                message: "Ce rappel est en pause. Réactivez-le pour pouvoir l'envoyer.",
                                                                                type: "info"
                                                                            });
                                                                            return;
                                                                        }
                                                                        handleTriggerReminder(auto.id);
                                                                    }}
                                                                    disabled={actionLoading === auto.id}
                                                                >
                                                                    <Play size={12} style={{ color: 'var(--muted-foreground)' }} />
                                                                    <span>{actionLoading === auto.id ? "Envoi..." : "Déclencher maintenant"}</span>
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}


                        {detailTab === "factures" && (
                            <div className="mobile-tab-panel">
                                {details.factures.length === 0 ? (
                                    <p style={{ textAlign: 'center', color: 'var(--muted-foreground)', padding: '24px', fontSize: '13.5px' }}>
                                        Aucune facture pour ce client.
                                    </p>
                                ) : (
                                    details.factures.map((item, idx) => (
                                        <div
                                            key={idx}
                                            className="mobile-history-card bill"
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => {
                                                if (onOpenInvoice) {
                                                    onOpenInvoice(item.raw || {
                                                        id: idx + 1,
                                                        number: item.id,
                                                        date: item.date,
                                                        clientName: displayName,
                                                        clientEmail: selectedClient.email || "",
                                                        clientAddress: selectedClient.address || "",
                                                        totalTtc: parseFloat((item.amount || "0").replace("€", "").replace(",", ".")) || 0,
                                                        status: item.statusKey || "draft"
                                                    });
                                                }
                                            }}
                                        >
                                            <div className="history-card-header">
                                                <h4>{item.id}</h4>
                                                <span className="history-card-date">{item.date}</span>
                                            </div>
                                            <p style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                                                <span><strong>Montant:</strong> {item.amount}</span>
                                                <span style={{ color: 'var(--border)' }}>·</span>
                                                <span className={`fp-status-badge ${item.statusKey || 'draft'}`}>
                                                    {item.status}
                                                </span>
                                            </p>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {detailTab === "devis" && (
                            <div className="mobile-tab-panel">
                                {details.devis.length === 0 ? (
                                    <p style={{ textAlign: 'center', color: 'var(--muted-foreground)', padding: '24px', fontSize: '13.5px' }}>
                                        Aucun devis pour ce client.
                                    </p>
                                ) : (
                                    details.devis.map((item, idx) => (
                                        <div
                                            key={idx}
                                            className="mobile-history-card quote"
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => {
                                                if (onOpenQuote) {
                                                    onOpenQuote(item.raw || {
                                                        id: idx + 1,
                                                        number: item.id,
                                                        date: item.date,
                                                        clientName: displayName,
                                                        clientEmail: selectedClient.email || "",
                                                        clientAddress: selectedClient.address || "",
                                                        totalTtc: parseFloat((item.amount || "0").replace("€", "").replace(",", ".")) || 0,
                                                        status: (item.statusKey || "DRAFT").toUpperCase()
                                                    });
                                                }
                                            }}
                                        >
                                            <div className="history-card-header">
                                                <h4>{item.id}</h4>
                                                <span className="history-card-date">{item.date}</span>
                                            </div>
                                            <p style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                                                <span><strong>Montant:</strong> {item.amount}</span>
                                                <span style={{ color: 'var(--border)' }}>·</span>
                                                <span className={`dv-status-badge ${(item.statusKey || 'DRAFT').toUpperCase()}`}>
                                                    {item.status}
                                                </span>
                                            </p>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Intervention Detail Modal Layer */}
            <InterventionDetailModal
                isOpen={!!selectedInterventionForModal}
                onClose={() => setSelectedInterventionForModal(null)}
                intervention={selectedInterventionForModal}
                client={selectedClient}
            />

            {/* In-view Toast Notification */}
            <ToastNotification toast={toast} onClose={() => setToast(null)} />
        </>
    );
}

export default ClientDetailView;
