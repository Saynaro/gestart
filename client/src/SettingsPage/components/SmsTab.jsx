import React, { useState } from "react";
import { MessageSquare, Sparkles, Send, CheckCircle2, Info } from "lucide-react";

export default function SmsTab({ isMobileView, triggerToast }) {
    const [senderId, setSenderId] = useState("DupontClim");
    const [smsSignature, setSmsSignature] = useState("— Dupont Clim");
    const [smsTemplate, setSmsTemplate] = useState("Bonjour {prenom} {nom}, rappelez-vous que votre entretien annuel de pompe à chaleur {marque} est prévu demain. Merci !");
    const [emailCopy, setEmailCopy] = useState(true);

    const smsCreditsUsed = 8;
    const smsCreditsTotal = 150;
    const smsCreditsRemaining = smsCreditsTotal - smsCreditsUsed;

    // Replace variables in preview
    const livePreviewText = smsTemplate
        .replace(/\{prenom\}/g, "Khalid")
        .replace(/\{nom\}/g, "Sainaro")
        .replace(/\{marque\}/g, "Daikin") + ` ${smsSignature}`;

    const charCount = livePreviewText.length;
    const smsCount = Math.ceil(charCount / 160) || 1;

    const handleSave = (e) => {
        if (e) e.preventDefault();
        triggerToast("Modèle et réglages SMS Twilio enregistrés avec succès !");
    };

    const insertVariable = (varName) => {
        setSmsTemplate(prev => prev + ` ${varName}`);
    };

    return (
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Crédits SMS Info */}
            <div style={{ background: 'linear-gradient(135deg, rgba(91, 77, 219, 0.08) 0%, rgba(91, 77, 219, 0.02) 100%)', border: '1px solid rgba(91, 77, 219, 0.2)', borderRadius: '12px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 800 }}>Solde de Crédits SMS (Twilio)</h3>
                        <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--muted-foreground)' }}>
                            Vos SMS automatiques de rappel de rendez-vous sont envoyés en direct.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => triggerToast("Achat de packs SMS (0,10 €/SMS) disponible prochainement !")}
                        style={{ padding: '8px 16px', backgroundColor: 'var(--sidebar-primary)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                    >
                        Recharger mon solde SMS
                    </button>
                </div>

                <div style={{ marginTop: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', fontWeight: 700, marginBottom: '6px' }}>
                        <span>Consommation mensuelle</span>
                        <span>{smsCreditsRemaining} SMS restants / {smsCreditsTotal}</span>
                    </div>
                    <div style={{ height: '10px', backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: '5px', overflow: 'hidden' }}>
                        <div style={{ width: `${(smsCreditsRemaining / smsCreditsTotal) * 100}%`, height: '100%', backgroundColor: '#22c55e', borderRadius: '5px' }} />
                    </div>
                </div>
            </div>

            {/* Expéditeur & Signature */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', backgroundColor: 'var(--card)' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MessageSquare size={18} style={{ color: 'var(--sidebar-primary)' }} />
                    Expéditeur (Sender ID) & Signature
                </h3>

                <div className="profile-form-grid">
                    <div className="form-field">
                        <label className="form-label">Nom de l'expéditeur personnalisé (Max 11 car.)</label>
                        <input
                            type="text"
                            className="form-input"
                            maxLength="11"
                            value={senderId}
                            onChange={(e) => setSenderId(e.target.value)}
                            placeholder="DupontClim"
                        />
                        <span style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>S'affiche comme nom de contact chez vos clients.</span>
                    </div>

                    <div className="form-field">
                        <label className="form-label">Signature automatique SMS</label>
                        <input
                            type="text"
                            className="form-input"
                            value={smsSignature}
                            onChange={(e) => setSmsSignature(e.target.value)}
                            placeholder="— Dupont Clim"
                        />
                    </div>
                </div>
            </div>

            {/* Template SMS & Aperçu en temps réel */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', backgroundColor: 'var(--card)' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 700 }}>Modèle de SMS & Variables dynamiques</h3>

                {/* Pills Variables */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted-foreground)', alignSelf: 'center' }}>Insérer une variable :</span>
                    <button type="button" onClick={() => insertVariable("{prenom}")} style={{ padding: '4px 10px', borderRadius: '6px', backgroundColor: 'rgba(91, 77, 219, 0.08)', color: 'var(--sidebar-primary)', border: '1px solid rgba(91, 77, 219, 0.2)', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>+ {"{prenom}"}</button>
                    <button type="button" onClick={() => insertVariable("{nom}")} style={{ padding: '4px 10px', borderRadius: '6px', backgroundColor: 'rgba(91, 77, 219, 0.08)', color: 'var(--sidebar-primary)', border: '1px solid rgba(91, 77, 219, 0.2)', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>+ {"{nom}"}</button>
                    <button type="button" onClick={() => insertVariable("{marque}")} style={{ padding: '4px 10px', borderRadius: '6px', backgroundColor: 'rgba(91, 77, 219, 0.08)', color: 'var(--sidebar-primary)', border: '1px solid rgba(91, 77, 219, 0.2)', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>+ {"{marque}"}</button>
                </div>

                <div className="profile-form-grid">
                    <div className="form-field form-group-full">
                        <label className="form-label">Texte du modèle</label>
                        <textarea
                            className="form-input"
                            rows={3}
                            value={smsTemplate}
                            onChange={(e) => setSmsTemplate(e.target.value)}
                            style={{ width: '100%', fontFamily: 'sans-serif' }}
                        />
                    </div>
                </div>

                {/* Aperçu SMS en temps réel (Style écran smartphone) */}
                <div style={{ marginTop: '16px', padding: '16px', borderRadius: '12px', backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--sidebar-primary)', textTransform: 'uppercase' }}>
                            📱 Aperçu en temps réel
                        </span>
                        <span style={{ fontSize: '11.5px', color: charCount > 160 ? '#f59e0b' : 'var(--muted-foreground)', fontWeight: 700 }}>
                            {charCount} / 160 caractères ({smsCount} SMS)
                        </span>
                    </div>

                    <div style={{ backgroundColor: 'var(--card)', borderRadius: '12px', padding: '12px 14px', border: '1px solid var(--border)', fontSize: '13.5px', lineHeight: '1.4', color: 'var(--foreground)', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                        {livePreviewText}
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                    <button type="submit" className="save-profile-btn" style={{ padding: '10px 24px', backgroundColor: 'var(--sidebar-primary)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                        Enregistrer les SMS
                    </button>
                </div>
            </div>
        </form>
    );
}
