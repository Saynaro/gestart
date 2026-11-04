import React, { useState } from "react";
import { Star, Clock, Link2, Key, CheckCircle2, Lock } from "lucide-react";

export default function PremiumTab({ isMobileView, triggerToast }) {
    const [maintenanceDelayDays, setMaintenanceDelayDays] = useState(30); // 7 / 14 / 30 / 60 / 90
    const [secondReminderEnabled, setSecondReminderEnabled] = useState(true);
    const [secondReminderDelayDays, setSecondReminderDelayDays] = useState(7);
    const [secondReminderTemplate, setSecondReminderTemplate] = useState("Rappel urgent : Votre entretien annuel de clim {marque} expire dans {jours} jours. Contactez Dupont Clim.");

    // Accounting Integration
    const [accountingSoftware, setAccountingSoftware] = useState("Pennylane"); // Pennylane | Indy | QuickBooks
    const [apiKey, setApiKey] = useState("");
    const [orgId, setOrgId] = useState("");
    const [syncOnSend, setSyncOnSend] = useState(true);
    const [syncOnPayment, setSyncOnPayment] = useState(true);
    const [syncOnCreation, setSyncOnCreation] = useState(false);
    const [lastAccountingSync, setLastAccountingSync] = useState("Aujourd'hui à 12:00");

    const handleSave = (e) => {
        if (e) e.preventDefault();
        triggerToast("Réglages Pro Premium & Intégration Comptable sauvegardés !");
    };

    return (
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Header Pro Badge Banner */}
            <div style={{ background: 'linear-gradient(135deg, rgba(91, 77, 219, 0.12) 0%, rgba(91, 77, 219, 0.03) 100%)', border: '1px solid rgba(91, 77, 219, 0.25)', borderRadius: '14px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'var(--sidebar-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Star size={24} fill="currentColor" />
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>Fonctionnalités Pro & Automatisation Avancée</h3>
                            <span style={{ backgroundColor: 'var(--sidebar-primary)', color: '#fff', fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '50px' }}>PRO</span>
                        </div>
                        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--muted-foreground)' }}>
                            Débloquez la relance automatique intelligent et l'export direct vers Pennylane / Indy.
                        </p>
                    </div>
                </div>
            </div>

            {/* Config Rappel Entretien ТО (7 / 14 / 30 / 60 / 90 jours) */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', backgroundColor: 'var(--card)' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={18} style={{ color: 'var(--sidebar-primary)' }} />
                    Délai d'envoi du 1er Rappel d'entretien (ТО)
                </h3>

                <div className="profile-form-grid">
                    <div className="form-field form-group-full">
                        <label className="form-label">Sélectionnez combien de jours avant la date d'échéance le SMS est envoyé</label>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                            {[7, 14, 30, 60, 90].map((days) => (
                                <button
                                    key={days}
                                    type="button"
                                    onClick={() => setMaintenanceDelayDays(days)}
                                    style={{
                                        flex: 1, padding: '10px', borderRadius: '8px',
                                        border: maintenanceDelayDays === days ? '2px solid var(--sidebar-primary)' : '1px solid var(--border)',
                                        backgroundColor: maintenanceDelayDays === days ? 'var(--sidebar-primary)' : 'var(--background)',
                                        color: maintenanceDelayDays === days ? '#fff' : 'var(--foreground)',
                                        fontWeight: 800, fontSize: '13px', cursor: 'pointer'
                                    }}
                                >
                                    J-{days} ({days} jours)
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 2nd SMS Reminder */}
                    <div className="form-field form-group-full" style={{ marginTop: '12px', padding: '16px', border: '1px solid var(--border)', borderRadius: '10px', backgroundColor: 'var(--background)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <div>
                                <span style={{ fontSize: '14px', fontWeight: 700 }}>Activer un 2ème rappel SMS automatique</span>
                                <span style={{ fontSize: '12px', color: 'var(--muted-foreground)', display: 'block' }}>Relance automatique des clients n'ayant pas répondu au 1er SMS.</span>
                            </div>
                            <label className="mobile-toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={secondReminderEnabled}
                                    onChange={(e) => setSecondReminderEnabled(e.target.checked)}
                                />
                                <span className="toggle-slider" />
                            </label>
                        </div>

                        {secondReminderEnabled && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <label className="form-label" style={{ margin: 0 }}>Délai du 2ème rappel :</label>
                                    <select
                                        className="form-input"
                                        value={secondReminderDelayDays}
                                        onChange={(e) => setSecondReminderDelayDays(parseInt(e.target.value, 10))}
                                        style={{ width: '160px' }}
                                    >
                                        <option value="3">J-3 avant échéance</option>
                                        <option value="7">J-7 avant échéance</option>
                                        <option value="14">J-14 avant échéance</option>
                                    </select>
                                </div>

                                <div className="form-field">
                                    <label className="form-label">Modèle du 2ème SMS</label>
                                    <textarea
                                        className="form-input"
                                        rows={2}
                                        value={secondReminderTemplate}
                                        onChange={(e) => setSecondReminderTemplate(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Intégration Comptable (Pennylane / Indy / QuickBooks) */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', backgroundColor: 'var(--card)' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Link2 size={18} style={{ color: 'var(--sidebar-primary)' }} />
                    Intégration Comptable en direct (Pennylane / Indy / QuickBooks)
                </h3>

                <div className="profile-form-grid">
                    <div className="form-field form-group-full">
                        <label className="form-label">Logiciel comptable partenaire</label>
                        <select className="form-input" value={accountingSoftware} onChange={(e) => setAccountingSoftware(e.target.value)}>
                            <option value="Pennylane">Pennylane API (Synchronisation pièces comptables)</option>
                            <option value="Indy">Indy (Spécial Auto-entrepreneurs & EI)</option>
                            <option value="QuickBooks">QuickBooks Online</option>
                        </select>
                    </div>

                    <div className="form-field">
                        <label className="form-label">Clé API (Chiffrée AES-256)</label>
                        <input
                            type="password"
                            className="form-input"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="sk_live_..."
                        />
                    </div>

                    <div className="form-field">
                        <label className="form-label">ID Organisation Comptable</label>
                        <input
                            type="text"
                            className="form-input"
                            value={orgId}
                            onChange={(e) => setOrgId(e.target.value)}
                        />
                    </div>

                    <div className="form-field form-group-full" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', border: '1px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--background)' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700 }}>Déclencheurs de synchronisation automatique :</span>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', cursor: 'pointer' }}>
                            <input type="checkbox" checked={syncOnSend} onChange={(e) => setSyncOnSend(e.target.checked)} />
                            Synchroniser à l'envoi de la facture au client
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', cursor: 'pointer' }}>
                            <input type="checkbox" checked={syncOnPayment} onChange={(e) => setSyncOnPayment(e.target.checked)} />
                            Synchroniser lors de la réception du paiement
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', cursor: 'pointer' }}>
                            <input type="checkbox" checked={syncOnCreation} onChange={(e) => setSyncOnCreation(e.target.checked)} />
                            Synchroniser dès la création du brouillon
                        </label>
                    </div>
                </div>

                <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#22c55e', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle2 size={14} /> Connecté à {accountingSoftware} • Dernier sync : {lastAccountingSync}
                    </span>
                    <button type="submit" className="save-profile-btn" style={{ padding: '9px 20px', backgroundColor: 'var(--sidebar-primary)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                        Sauvegarder les intégrations Pro
                    </button>
                </div>
            </div>
        </form>
    );
}
