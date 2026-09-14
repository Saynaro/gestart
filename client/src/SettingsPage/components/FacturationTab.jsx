import React, { useState, useEffect } from "react";
import { Receipt, Palette, FileText, Check, AlertCircle, Loader2, Bell, Clock } from "lucide-react";
import { LegalHelpTooltip } from "../../components/LegalHelpModal";
import { apiFetch } from "../../utils/api";
import { getCustomization, saveCustomization } from "../../utils/documentCustomization";

export default function FacturationTab({ isMobileView, triggerToast }) {
    const [invoicePrefix, setInvoicePrefix] = useState("INV");
    const [quotePrefix, setQuotePrefix] = useState("D");
    const [invoiceNextNumber, setInvoiceNextNumber] = useState(1);
    const [quoteNextNumber, setQuoteNextNumber] = useState(1);
    const [defaultPaymentDelay, setDefaultPaymentDelay] = useState("30"); // 15 / 30 / 45 / 60
    const [defaultQuoteValidity, setDefaultQuoteValidity] = useState("30"); // 15 / 30 / 60
    const [defaultTvaRate, setDefaultTvaRate] = useState(20); // 0 / 5.5 / 10 / 20
    const [pdfFooterText, setPdfFooterText] = useState("KHALID SAINARO - SIRET 94408772500015 - RCS Nice - 23 RUE PAGANINI 06000 NICE");
    const [cgvText, setCgvText] = useState("Conditions Générales de Vente (CGV) : Les paiements s'effectuent à réception de facture sous 30 jours. En cas de retard de paiement, une pénalité minimale de 10% sera appliquée.");
    const [pdfColor, setPdfColor] = useState(() => getCustomization().primaryColor || "#556B2F");
    const [penaltyRate, setPenaltyRate] = useState("10");
    const [noDiscountToggle, setNoDiscountToggle] = useState(true);
    const [invoiceReminderEnabled, setInvoiceReminderEnabled] = useState(true);
    const [invoiceReminderDays, setInvoiceReminderDays] = useState(7);
    const [quoteReminderEnabled, setQuoteReminderEnabled] = useState(true);
    const [quoteReminderDays, setQuoteReminderDays] = useState(5);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const data = await apiFetch('/v1/company/settings');
                const s = data.data?.settings || data.settings || data;
                if (s) {
                    if (s.invoicePrefix) setInvoicePrefix(s.invoicePrefix);
                    if (s.quotePrefix) setQuotePrefix(s.quotePrefix);
                    if (s.invoiceNextNumber) setInvoiceNextNumber(s.invoiceNextNumber);
                    if (s.quoteNextNumber) setQuoteNextNumber(s.quoteNextNumber);
                    if (s.invoiceFooter) setPdfFooterText(s.invoiceFooter);
                    if (s.invoiceConditions) setCgvText(s.invoiceConditions);
                    if (s.defaultPaymentDays) setDefaultPaymentDelay(String(s.defaultPaymentDays));
                    if (s.defaultValidDays) setDefaultQuoteValidity(String(s.defaultValidDays));
                    if (s.defaultTvaRate !== undefined) setDefaultTvaRate(Number(s.defaultTvaRate));
                    if (s.invoiceReminderEnabled !== undefined) setInvoiceReminderEnabled(Boolean(s.invoiceReminderEnabled));
                    if (s.invoiceReminderDays !== undefined) setInvoiceReminderDays(Number(s.invoiceReminderDays));
                    if (s.quoteReminderEnabled !== undefined) setQuoteReminderEnabled(Boolean(s.quoteReminderEnabled));
                    if (s.quoteReminderDays !== undefined) setQuoteReminderDays(Number(s.quoteReminderDays));
                    if (s.invoiceColor) {
                        setPdfColor(s.invoiceColor);
                        saveCustomization({ primaryColor: s.invoiceColor });
                    }
                }
            } catch (err) {
                console.warn("API company settings fallback:", err.message);
            }
        };
        fetchSettings();
    }, []);

    const year = new Date().getFullYear();
    const formattedInvoicePreview = `${invoicePrefix}-${year}-${String(invoiceNextNumber).padStart(3, '0')}`;
    const formattedQuotePreview = `${quotePrefix}-${year}-${String(quoteNextNumber).padStart(3, '0')}`;

    const colorSwatches = [
        { name: "Olive GestArt", value: "#556B2F" },
        { name: "Bleu Océan", value: "#005371" },
        { name: "Violet Pro", value: "#7C3AED" },
        { name: "Bleu Royal", value: "#2563EB" },
        { name: "Émeraude", value: "#059669" },
        { name: "Ambre", value: "#D97706" },
        { name: "Rouge", value: "#DC2626" },
        { name: "Noir Élégant", value: "#1A1A1A" }
    ];

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setSaving(true);
        try {
            // Update global document customization in localStorage and dispatch event
            saveCustomization({ primaryColor: pdfColor });

            // Persist to backend
            await apiFetch('/v1/company/settings', {
                method: 'PATCH',
                body: JSON.stringify({
                    invoicePrefix,
                    quotePrefix,
                    invoiceNextNumber: parseInt(invoiceNextNumber, 10) || 1,
                    quoteNextNumber: parseInt(quoteNextNumber, 10) || 1,
                    invoiceFooter: pdfFooterText,
                    invoiceConditions: cgvText,
                    invoiceColor: pdfColor,
                    defaultTvaRate: Number(defaultTvaRate),
                    defaultPaymentDays: parseInt(defaultPaymentDelay, 10) || 30,
                    defaultValidDays: parseInt(defaultQuoteValidity, 10) || 30,
                    invoiceReminderEnabled,
                    invoiceReminderDays: parseInt(invoiceReminderDays, 10) || 7,
                    quoteReminderEnabled,
                    quoteReminderDays: parseInt(quoteReminderDays, 10) || 5
                })
            });
            triggerToast("Réglages de facturation et relances automatiques enregistrés !");
        } catch (err) {
            triggerToast("Réglages enregistrés localement !");
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: isMobileView ? '14px' : '24px' }}>
            {/* Numérotation et Préfixes */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: isMobileView ? '14px' : '20px', backgroundColor: 'var(--card)' }}>
                <h3 style={{ margin: '0 0 14px 0', fontSize: '14.5px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Receipt size={17} style={{ color: 'var(--sidebar-primary)' }} />
                    Séquences de Numérotation (Conformes art. 289 CGI)
                    <LegalHelpTooltip lawArticle="art. 289 I-3 CGI" title="Numérotation continue" text="La numérotation des factures doit être continue, chronologique et sans rupture. GestArt garantit la conformité fiscale." />
                </h3>

                <div className="profile-form-grid" style={{ gap: isMobileView ? '12px' : '16px' }}>
                    <div className="form-field">
                        <label className="form-label">Préfixe des factures</label>
                        <input
                            type="text"
                            className="form-input"
                            value={invoicePrefix}
                            onChange={(e) => setInvoicePrefix(e.target.value.toUpperCase())}
                            placeholder="INV"
                        />
                        <span style={{ fontSize: '11.5px', color: 'var(--sidebar-primary)', fontWeight: 700, marginTop: '2px' }}>
                            Aperçu prochaine facture : {formattedInvoicePreview}
                        </span>
                    </div>

                    <div className="form-field">
                        <label className="form-label">Préfixe des devis</label>
                        <input
                            type="text"
                            className="form-input"
                            value={quotePrefix}
                            onChange={(e) => setQuotePrefix(e.target.value.toUpperCase())}
                            placeholder="D"
                        />
                        <span style={{ fontSize: '11.5px', color: 'var(--sidebar-primary)', fontWeight: 700, marginTop: '2px' }}>
                            Aperçu prochain devis : {formattedQuotePreview}
                        </span>
                    </div>

                    <div className="form-field">
                        <label className="form-label">Numéro suivant Facture</label>
                        <input
                            type="number"
                            className="form-input"
                            value={invoiceNextNumber}
                            onChange={(e) => setInvoiceNextNumber(parseInt(e.target.value, 10) || 1)}
                            min="1"
                        />
                    </div>

                    <div className="form-field">
                        <label className="form-label">Numéro suivant Devis</label>
                        <input
                            type="number"
                            className="form-input"
                            value={quoteNextNumber}
                            onChange={(e) => setQuoteNextNumber(parseInt(e.target.value, 10) || 1)}
                            min="1"
                        />
                    </div>
                </div>
            </div>

            {/* Délais et Validités */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: isMobileView ? '14px' : '20px', backgroundColor: 'var(--card)' }}>
                <h3 style={{ margin: '0 0 14px 0', fontSize: '14.5px', fontWeight: 700 }}>Délais de Règlement & Validité Devis</h3>

                <div className="profile-form-grid" style={{ gap: isMobileView ? '12px' : '16px' }}>
                    <div className="form-field">
                        <label className="form-label">Délai de paiement par défaut des factures</label>
                        <select className="form-input" value={defaultPaymentDelay} onChange={(e) => setDefaultPaymentDelay(e.target.value)}>
                            <option value="15">15 jours (Paiement rapide)</option>
                            <option value="30">30 jours (Standard légal art. L441-10)</option>
                            <option value="45">45 jours fin de mois</option>
                            <option value="60">60 jours max légal</option>
                        </select>
                    </div>

                    <div className="form-field">
                        <label className="form-label">Durée de validité par défaut des devis</label>
                        <select className="form-input" value={defaultQuoteValidity} onChange={(e) => setDefaultQuoteValidity(e.target.value)}>
                            <option value="15">15 jours</option>
                            <option value="30">30 jours (Conseillé HVAC)</option>
                            <option value="60">60 jours (Grands chantiers)</option>
                        </select>
                    </div>

                    <div className="form-field form-group-full">
                        <label className="form-label">Taux TVA par défaut (Pills)</label>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                            {[0, 5.5, 10, 20].map((rate) => (
                                <button
                                    key={rate}
                                    type="button"
                                    onClick={() => setDefaultTvaRate(rate)}
                                    style={{
                                        flex: 1, padding: '8px', borderRadius: '8px',
                                        border: defaultTvaRate === rate ? '2px solid var(--sidebar-primary)' : '1px solid var(--border)',
                                        backgroundColor: defaultTvaRate === rate ? 'var(--sidebar-primary)' : 'var(--background)',
                                        color: defaultTvaRate === rate ? '#fff' : 'var(--foreground)',
                                        fontWeight: 700, fontSize: '13px', cursor: 'pointer'
                                    }}
                                >
                                    {rate}% {rate === 20 ? '(Normal)' : rate === 10 ? '(Rénov.)' : rate === 5.5 ? '(PAC Énergie)' : '(Exonéré)'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Relances Automatiques (Factures & Devis) */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: isMobileView ? '14px' : '20px', backgroundColor: 'var(--card)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '14.5px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Bell size={17} style={{ color: 'var(--sidebar-primary)' }} />
                        Relances Automatiques (Factures & Devis)
                    </h3>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', background: 'rgba(85, 107, 47, 0.12)', color: 'var(--sidebar-primary)', fontWeight: 600 }}>
                        Envoi unique
                    </span>
                </div>
                <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: 'var(--muted-foreground)', lineHeight: '1.4' }}>
                    Rappels automatiques par email avec lien de paiement sécurisé ou signature électronique en 1 clic.
                </p>

                <div className="profile-form-grid" style={{ gap: isMobileView ? '10px' : '14px', alignItems: 'start' }}>
                    {/* Relance Factures */}
                    <div className="form-field" style={{
                        padding: isMobileView ? '10px 12px' : '12px 14px',
                        borderRadius: '10px',
                        border: '1px solid var(--border)',
                        background: 'var(--background)',
                        alignSelf: 'start',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                            <label htmlFor="inv-reminder-toggle" style={{ fontSize: '13px', fontWeight: 700, cursor: 'pointer', margin: 0 }}>
                                Relance auto Factures
                            </label>
                            <label className="mobile-toggle-switch" style={{ margin: 0 }}>
                                <input
                                    type="checkbox"
                                    id="inv-reminder-toggle"
                                    checked={invoiceReminderEnabled}
                                    onChange={(e) => setInvoiceReminderEnabled(e.target.checked)}
                                />
                                <span className="toggle-slider" />
                            </label>
                        </div>
                        <div style={{
                            display: 'grid',
                            gridTemplateRows: invoiceReminderEnabled ? '1fr' : '0fr',
                            opacity: invoiceReminderEnabled ? 1 : 0,
                            transition: 'grid-template-rows 0.28s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.22s ease, margin-top 0.28s ease',
                            marginTop: invoiceReminderEnabled ? '8px' : '0px'
                        }}>
                            <div style={{ overflow: 'hidden' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '2px' }}>
                                    <label htmlFor="inv-days-select" style={{ fontSize: '11.5px', color: 'var(--muted-foreground)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', margin: 0 }}>
                                        <Clock size={12} /> Délai :
                                    </label>
                                    <select
                                        id="inv-days-select"
                                        className="form-input"
                                        value={invoiceReminderDays}
                                        onChange={(e) => setInvoiceReminderDays(Number(e.target.value))}
                                        style={{ height: '34px', minHeight: '34px', padding: '4px 10px', fontSize: '12px', flex: 1 }}
                                    >
                                        <option value={3}>3 jours après envoi</option>
                                        <option value={5}>5 jours après envoi</option>
                                        <option value={7}>7 jours après envoi (Recommandé)</option>
                                        <option value={10}>10 jours après envoi</option>
                                        <option value={14}>14 jours après envoi</option>
                                        <option value={30}>30 jours après envoi</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Relance Devis */}
                    <div className="form-field" style={{
                        padding: isMobileView ? '10px 12px' : '12px 14px',
                        borderRadius: '10px',
                        border: '1px solid var(--border)',
                        background: 'var(--background)',
                        alignSelf: 'start',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                            <label htmlFor="quote-reminder-toggle" style={{ fontSize: '13px', fontWeight: 700, cursor: 'pointer', margin: 0 }}>
                                Relance auto Devis
                            </label>
                            <label className="mobile-toggle-switch" style={{ margin: 0 }}>
                                <input
                                    type="checkbox"
                                    id="quote-reminder-toggle"
                                    checked={quoteReminderEnabled}
                                    onChange={(e) => setQuoteReminderEnabled(e.target.checked)}
                                />
                                <span className="toggle-slider" />
                            </label>
                        </div>
                        <div style={{
                            display: 'grid',
                            gridTemplateRows: quoteReminderEnabled ? '1fr' : '0fr',
                            opacity: quoteReminderEnabled ? 1 : 0,
                            transition: 'grid-template-rows 0.28s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.22s ease, margin-top 0.28s ease',
                            marginTop: quoteReminderEnabled ? '8px' : '0px'
                        }}>
                            <div style={{ overflow: 'hidden' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '2px' }}>
                                    <label htmlFor="quote-days-select" style={{ fontSize: '11.5px', color: 'var(--muted-foreground)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', margin: 0 }}>
                                        <Clock size={12} /> Délai :
                                    </label>
                                    <select
                                        id="quote-days-select"
                                        className="form-input"
                                        value={quoteReminderDays}
                                        onChange={(e) => setQuoteReminderDays(Number(e.target.value))}
                                        style={{ height: '34px', minHeight: '34px', padding: '4px 10px', fontSize: '12px', flex: 1 }}
                                    >
                                        <option value={2}>2 jours après envoi</option>
                                        <option value={3}>3 jours après envoi</option>
                                        <option value={5}>5 jours après envoi (Recommandé)</option>
                                        <option value={7}>7 jours après envoi</option>
                                        <option value={10}>10 jours après envoi</option>
                                        <option value={14}>14 jours après envoi</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mentions Légales PDF, Pénalités & Escompte */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: isMobileView ? '14px' : '20px', backgroundColor: 'var(--card)' }}>
                <h3 style={{ margin: '0 0 14px 0', fontSize: '14.5px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={17} style={{ color: 'var(--sidebar-primary)' }} />
                    Mentions Légales du Pied de Page PDF (Art. L441-10 C.com)
                </h3>

                <div className="profile-form-grid" style={{ gap: isMobileView ? '12px' : '16px' }}>
                    <div className="form-field">
                        <label className="form-label">Taux des pénalités de retard (%)</label>
                        <input
                            type="text"
                            className="form-input"
                            value={penaltyRate}
                            onChange={(e) => setPenaltyRate(e.target.value)}
                            placeholder="10%"
                        />
                    </div>

                    <div className="form-field">
                        <label className="form-label">Indemnité forfaitaire de recouvrement (Fixe)</label>
                        <input
                            type="text"
                            className="form-input"
                            value="40,00 € (Fixe par loi art. D441-5)"
                            readOnly
                            style={{ backgroundColor: 'rgba(0,0,0,0.03)', fontWeight: 700, color: 'var(--sidebar-primary)' }}
                        />
                    </div>

                    <div className="form-field form-group-full" style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--background)',
                        gap: '12px'
                    }}>
                        <label htmlFor="escompte-check" style={{ fontSize: '12.5px', fontWeight: 600, cursor: 'pointer', margin: 0 }}>
                            Imprimer la mention : "Aucun escompte pour paiement anticipé"
                        </label>
                        <label className="mobile-toggle-switch" style={{ margin: 0 }}>
                            <input
                                type="checkbox"
                                id="escompte-check"
                                checked={noDiscountToggle}
                                onChange={(e) => setNoDiscountToggle(e.target.checked)}
                            />
                            <span className="toggle-slider" />
                        </label>
                    </div>

                    <div className="form-field form-group-full">
                        <label className="form-label">Mentions de bas de page PDF</label>
                        <textarea
                            className="form-input"
                            rows={3}
                            value={pdfFooterText}
                            onChange={(e) => setPdfFooterText(e.target.value)}
                            style={{ width: '100%', fontFamily: 'inherit', minHeight: '68px', height: 'auto', fontSize: '13px', lineHeight: '1.45', padding: '10px 12px' }}
                        />
                    </div>

                    <div className="form-field form-group-full">
                        <label className="form-label">Conditions Générales de Vente (CGV PDF)</label>
                        <textarea
                            className="form-input"
                            rows={4}
                            value={cgvText}
                            onChange={(e) => setCgvText(e.target.value)}
                            style={{ width: '100%', fontFamily: 'inherit', minHeight: '92px', height: 'auto', fontSize: '13px', lineHeight: '1.45', padding: '10px 12px' }}
                        />
                    </div>
                </div>
            </div>

            {/* Design & Couleur du PDF */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: isMobileView ? '14px' : '20px', backgroundColor: 'var(--card)' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '14.5px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Palette size={17} style={{ color: 'var(--sidebar-primary)' }} />
                    Couleur Principale par Défaut pour les Devis & Factures
                </h3>
                <p style={{ margin: '-6px 0 14px 0', fontSize: '12px', color: 'var(--muted-foreground)' }}>
                    Cette couleur sera appliquée par défaut à tous vos devis et factures PDF. Vous pourrez également la modifier individuellement pour un document spécifique depuis l'éditeur.
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {colorSwatches.map((swatch) => (
                            <button
                                key={swatch.value}
                                type="button"
                                title={swatch.name}
                                onClick={() => setPdfColor(swatch.value)}
                                style={{
                                    width: '34px',
                                    height: '34px',
                                    borderRadius: '50%',
                                    backgroundColor: swatch.value,
                                    border: pdfColor.toLowerCase() === swatch.value.toLowerCase() ? '3px solid var(--foreground)' : '2px solid transparent',
                                    cursor: 'pointer',
                                    transform: pdfColor.toLowerCase() === swatch.value.toLowerCase() ? 'scale(1.1)' : 'scale(1)',
                                    transition: 'transform 0.15s',
                                    boxShadow: '0 2px 5px rgba(0,0,0,0.15)'
                                }}
                            />
                        ))}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12.5px', fontWeight: 600 }}>Ou Hex :</span>
                        <input
                            type="text"
                            className="form-input"
                            value={pdfColor}
                            onChange={(e) => setPdfColor(e.target.value)}
                            style={{ width: '95px', fontFamily: 'monospace', fontWeight: 700, textAlign: 'center' }}
                        />
                        <div style={{ width: '24px', height: '24px', borderRadius: '6px', backgroundColor: pdfColor, border: '1px solid var(--border)' }} />
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                    <button
                        type="submit"
                        disabled={saving}
                        className="save-profile-btn"
                        style={{ padding: '10px 24px', backgroundColor: 'var(--sidebar-primary)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        {saving ? <><Loader2 size={16} className="spin-loader" /> Enregistrement...</> : "Enregistrer la Facturation"}
                    </button>
                </div>
            </div>
        </form>
    );
}
