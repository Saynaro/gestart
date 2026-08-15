import React, { useState, useEffect } from "react";
import { MessageSquare, Sparkles, Send, CheckCircle2, Info, Loader2 } from "lucide-react";
import { apiFetch } from "../../utils/api";

export default function SmsTab({ isMobileView, triggerToast }) {
    const [senderId, setSenderId] = useState("ClimPro");
    const [smsSignature, setSmsSignature] = useState("— Dupont Clim");
    const [smsTemplate, setSmsTemplate] = useState("Bonjour {prenom} {nom}, rappelez-vous que votre entretien annuel de pompe à chaleur {marque} est prévu demain. Merci !");
    const [smsCreditsUsed, setSmsCreditsUsed] = useState(0);
    const [smsCreditsTotal, setSmsCreditsTotal] = useState(50);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchSmsSettings = async () => {
            try {
                const [setRes, subRes, usageRes] = await Promise.all([
                    apiFetch('/v1/company/settings').catch(() => null),
                    apiFetch('/v1/subscription').catch(() => null),
                    apiFetch('/v1/subscription/usage').catch(() => null)
                ]);

                const s = setRes?.data?.settings || setRes?.settings;
                if (s) {
                    if (s.smsSignature) setSmsSignature(s.smsSignature);
                    if (s.smsReminderTemplate) setSmsTemplate(s.smsReminderTemplate);
                }

                const u = usageRes?.data?.usage || usageRes?.usage;
                if (u?.sms) {
                    setSmsCreditsUsed(u.sms.current || 0);
                    setSmsCreditsTotal(u.sms.max === -1 ? 1000 : (u.sms.max || 50));
                }
            } catch (err) {
                console.warn("API SMS settings fallback:", err.message);
            }
        };
        fetchSmsSettings();
    }, []);

    const smsCreditsRemaining = Math.max(0, smsCreditsTotal - smsCreditsUsed);

    // Replace variables in preview
    const livePreviewText = smsTemplate
        .replace(/\{prenom\}/g, "Khalid")
        .replace(/\{nom\}/g, "Sainaro")
        .replace(/\{marque\}/g, "Daikin") + ` ${smsSignature}`;

    const charCount = livePreviewText.length;
    const smsCount = Math.ceil(charCount / 160) || 1;

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        setSaving(true);
        try {
            await apiFetch('/v1/company/settings', {
                method: 'PATCH',
                body: JSON.stringify({
                    smsSignature,
                    smsReminderTemplate: smsTemplate
                })
            });
            triggerToast("Modèle et réglages SMS enregistrés dans la base !");
        } catch (err) {
            triggerToast(err.message || "Erreur lors de l'enregistrement", true);
        } finally {
            setSaving(false);
        }
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
                        <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 800 }}>Solde de Crédits SMS (Twilio Direct)</h3>
                        <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--muted-foreground)' }}>
                            Vos SMS automatiques de rappel de rendez-vous et d'entretien annuel sont envoyés en direct.
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
                        <div style={{ width: `${Math.min(100, (smsCreditsRemaining / smsCreditsTotal) * 100)}%`, height: '100%', backgroundColor: '#22c55e', borderRadius: '5px' }} />
                    </div>
                </div>
            </div>

            {/* Expéditeur & Signature */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', backgroundColor: 'var(--card)' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MessageSquare size={18} style={{ color: 'var(--sidebar-primary)' }} />
                    Expéditeur & Signature
                </h3>

                <div className="profile-form-grid">
                    <div className="form-field">
                        <label className="form-label">Nom de l'expéditeur (Sender ID)</label>
                        <input
                            type="text"
                            className="form-input"
                            value={senderId}
                            onChange={(e) => setSenderId(e.target.value)}
                            maxLength={11}
                            placeholder="ClimPro"
                        />
                        <span style={{ fontSize: '11px', color: 'var(--muted-foreground)', marginTop: '2px' }}>
                            Conforme aux normes opérateurs françaises (11 caractères max).
                        </span>
                    </div>

                    <div className="form-field">
                        <label className="form-label">Signature SMS</label>
                        <input
                            type="text"
                            className="form-input"
                            value={smsSignature}
                            onChange={(e) => setSmsSignature(e.target.value)}
                            placeholder="— Dupont Climatisation"
                        />
                    </div>
                </div>
            </div>

            {/* Modèle de SMS de rappel */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', backgroundColor: 'var(--card)' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 700 }}>Modèle de SMS — Rappel d'Entretien Annuel</h3>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted-foreground)', alignSelf: 'center' }}>Variables :</span>
                    <button type="button" onClick={() => insertVariable('{prenom}')} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--background)', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer' }}>+ Prénom</button>
                    <button type="button" onClick={() => insertVariable('{nom}')} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--background)', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer' }}>+ Nom</button>
                    <button type="button" onClick={() => insertVariable('{marque}')} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--background)', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer' }}>+ Marque</button>
                </div>

                <textarea
                    rows={4}
                    className="form-input"
                    value={smsTemplate}
                    onChange={(e) => setSmsTemplate(e.target.value)}
                    style={{ width: '100%', resize: 'vertical', fontSize: '13px', lineHeight: 1.5, boxSizing: 'border-box' }}
                />

                {/* Aperçu en temps réel */}
                <div style={{ marginTop: '16px', padding: '14px', backgroundColor: 'var(--background)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', fontWeight: 700, color: 'var(--muted-foreground)', marginBottom: '6px' }}>
                        <span>Aperçu SMS client</span>
                        <span>{charCount} caractères ({smsCount} SMS)</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', fontStyle: 'italic', color: 'var(--foreground)' }}>
                        "{livePreviewText}"
                    </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                    <button
                        type="submit"
                        disabled={saving}
                        className="save-profile-btn"
                        style={{ padding: '9px 20px', backgroundColor: 'var(--sidebar-primary)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}
                    >
                        {saving ? "Enregistrement..." : "Enregistrer le modèle"}
                    </button>
                </div>
            </div>
        </form>
    );
}
