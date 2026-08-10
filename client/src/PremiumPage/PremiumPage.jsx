import React, { useState, useEffect } from "react";
import { Sparkles, MessageSquare, Save, Smartphone, Settings } from "lucide-react";
import "./PremiumPage.css";

// Layout components
import SideBar from "../components/SideBar";
import Header from "../components/Header";

// Reusable accounting integration
import AccountingIntegration from "../ComptabilityPage/components/AccountingIntegration";

import { apiFetch } from "../utils/api";

function PremiumPage() {
    // SMS states
    const [reminderDays, setReminderDays] = useState("30");
    const [enableSecondReminder, setEnableSecondReminder] = useState(true);
    const [secondReminderDays, setSecondReminderDays] = useState("7");
    const [smsSignature, setSmsSignature] = useState("— Dupont Climatisation");
    
    const [smsTemplate, setSmsTemplate] = useState(
        "Bonjour {prenom}, votre entretien annuel ClimPro approche pour votre équipement {marque} (modèle {modele}). Merci de réserver votre créneau dans notre planning."
    );
    const [smsPreview, setSmsPreview] = useState("");

    useEffect(() => {
        const fetchCompanySettings = async () => {
            try {
                const data = await apiFetch('/v1/company/settings');
                const settings = data.data?.settings || data.settings || data;
                if (settings) {
                    if (settings.smsSignature) setSmsSignature(settings.smsSignature);
                    if (settings.smsTemplate) setSmsTemplate(settings.smsTemplate);
                }
            } catch (err) {
                console.warn("API settings non disponible, conservation des valeurs locales:", err.message);
            }
        };

        fetchCompanySettings();
    }, []);

    // Update real-time mock preview
    useEffect(() => {
        let text = smsTemplate;
        text = text.replace(/{prenom}/g, "Jean");
        text = text.replace(/{nom}/g, "Dupont");
        text = text.replace(/{marque}/g, "Daikin");
        text = text.replace(/{modele}/g, "Sensira 12000 BTU");
        
        setSmsPreview(`${text}\n\n${smsSignature}`);
    }, [smsTemplate, smsSignature]);

    const handleSaveSmsSettings = async (e) => {
        e.preventDefault();
        try {
            await apiFetch('/v1/company/settings', {
                method: 'PUT',
                body: JSON.stringify({
                    smsSignature,
                    smsTemplate,
                    reminderDays: parseInt(reminderDays, 10) || 30
                })
            });
            alert("✓ Configuration des rappels SMS enregistrée avec succès dans la base de données !");
        } catch (err) {
            console.error("Save SMS settings error:", err);
            alert(err.message || "Erreur lors de l'enregistrement des paramètres SMS");
        }
    };

    return (
        <div className="home-page premium-page-wrapper">
            <SideBar />
            <div className="main-content">
                <Header />
                <div className="page-content">
                    {/* Header */}
                    <div className="content-header premium-header-row">
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <h1 className="content-title">Paramètres Premium</h1>
                                <span className="premium-badge big-badge">PRO</span>
                            </div>
                            <p className="content-subtitle">Automatisez vos relances clients et configurez les intégrations avancées.</p>
                        </div>
                    </div>

                    <div className="premium-grid-layout">
                        {/* Left column: SMS configuration */}
                        <div className="premium-left-column">
                            <div className="comptability-card">
                                <div className="widget-header">
                                    <div className="title-area">
                                        <div className="header-icon-container">
                                            <MessageSquare size={18} />
                                        </div>
                                        <div>
                                            <h3>Rappels SMS d'entretiens (TO)</h3>
                                            <p className="subtitle">Relancez automatiquement vos clients avant l'entretien</p>
                                        </div>
                                    </div>
                                </div>

                                <form onSubmit={handleSaveSmsSettings} className="sms-settings-form">
                                    {/* Primary Reminder Days */}
                                    <div className="form-field">
                                        <label className="form-label">Envoyer le 1er rappel SMS</label>
                                        <select 
                                            className="profile-input option-select"
                                            value={reminderDays}
                                            onChange={(e) => setReminderDays(e.target.value)}
                                        >
                                            <option value="7">7 jours avant l'entretien</option>
                                            <option value="14">14 jours avant l'entretien</option>
                                            <option value="30">30 jours avant l'entretien</option>
                                            <option value="60">60 jours avant l'entretien</option>
                                            <option value="90">90 jours avant l'entretien</option>
                                        </select>
                                    </div>

                                    {/* Second Reminder Toggle & Days */}
                                    <div className="form-field sync-checkboxes-section">
                                        <div className="checkboxes-list" style={{ padding: 0, border: 'none', backgroundColor: 'transparent' }}>
                                            <label className="checkbox-item">
                                                <input 
                                                    type="checkbox" 
                                                    checked={enableSecondReminder}
                                                    onChange={(e) => setEnableSecondReminder(e.target.checked)}
                                                />
                                                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Activer un 2ème SMS de rappel</span>
                                            </label>
                                        </div>
                                    </div>

                                    {enableSecondReminder && (
                                        <div className="form-field animate-fade-in">
                                            <label className="form-label">Envoyer le 2ème rappel SMS</label>
                                            <select 
                                                className="profile-input option-select"
                                                value={secondReminderDays}
                                                onChange={(e) => setSecondReminderDays(e.target.value)}
                                            >
                                                <option value="3">3 jours avant l'entretien</option>
                                                <option value="7">7 jours avant l'entretien</option>
                                                <option value="14">14 jours avant l'entretien</option>
                                            </select>
                                        </div>
                                    )}

                                    {/* SMS Signature */}
                                    <div className="form-field">
                                        <label className="form-label">Signature du SMS</label>
                                        <input 
                                            type="text" 
                                            className="profile-input"
                                            value={smsSignature}
                                            onChange={(e) => setSmsSignature(e.target.value)}
                                            placeholder="— Dupont Climatisation"
                                        />
                                    </div>

                                    {/* Template Input */}
                                    <div className="form-field">
                                        <label className="form-label">Modèle de message SMS</label>
                                        <textarea 
                                            className="profile-input textarea-field" 
                                            rows="5"
                                            value={smsTemplate}
                                            onChange={(e) => setSmsTemplate(e.target.value)}
                                        />
                                        <span className="variable-hints">
                                            Variables : <code>{"{prenom}"}</code> · <code>{"{nom}"}</code> · <code>{"{marque}"}</code> · <code>{"{modele}"}</code>
                                        </span>
                                    </div>

                                    <button type="submit" className="save-sms-btn">
                                        <Save size={16} /> Enregistrer
                                    </button>
                                </form>
                            </div>

                            {/* Accounting Integration settings on Premium Page */}
                            <div className="premium-accounting-section" style={{ marginTop: '1.5rem' }}>
                                <AccountingIntegration />
                            </div>
                        </div>

                        {/* Right column: Live Smartphone simulator */}
                        <div className="premium-right-column">
                            <div className="smartphone-simulator-container">
                                <div className="smartphone-bezel">
                                    <div className="smartphone-camera-notch" />
                                    <div className="smartphone-screen">
                                        <div className="sms-chat-header">
                                            <span className="sms-contact-name">ClimPro SMS</span>
                                            <span className="sms-contact-status">Service automatique</span>
                                        </div>
                                        <div className="sms-chat-body">
                                            <div className="sms-bubble-received">
                                                <p className="sms-text">{smsPreview}</p>
                                                <span className="sms-time">10:42</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <span className="simulator-label">Aperçu en temps réel</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PremiumPage;
