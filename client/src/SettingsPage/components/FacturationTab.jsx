import React, { useState, useEffect, useRef, useCallback } from "react";
import { Receipt, Palette, FileText, Check, AlertCircle, Loader2, Bell, Clock, Lock } from "lucide-react";
import { LegalHelpTooltip } from "../../components/LegalHelpModal";
import { apiFetch } from "../../utils/api";
import { getCustomization, saveCustomization } from "../../utils/documentCustomization";
import { useSubscription } from "../../utils/useSubscription";

export default function FacturationTab({ isMobileView, triggerToast }) {
    const { isExpired } = useSubscription();
    const [invoicePrefix, setInvoicePrefix] = useState("INV");
    const [quotePrefix, setQuotePrefix] = useState("D");
    const [invoiceNextNumber, setInvoiceNextNumber] = useState(1);
    const [quoteNextNumber, setQuoteNextNumber] = useState(1);
    const [defaultPaymentDelay, setDefaultPaymentDelay] = useState("30"); // 15 / 30 / 45 / 60
    const [defaultQuoteValidity, setDefaultQuoteValidity] = useState("30"); // 15 / 30 / 60
    const [defaultTvaRate, setDefaultTvaRate] = useState(20); // 0 / 5.5 / 10 / 20
    const [pdfFooterText, setPdfFooterText] = useState("KHALID SAINARO - SIRET 944 087 725 00015 - APE 53.20Z - RCS Nice - 23 RUE PAGANINI 06000 NICE");
    const [cgvText, setCgvText] = useState("Conditions Générales de Vente (CGV) : Les paiements s'effectuent à réception de facture sous 30 jours. En cas de retard de paiement, une pénalité minimale de 10% sera appliquée.");
    const [pdfColor, setPdfColor] = useState(() => getCustomization().primaryColor || "#556B2F");
    const [penaltyRate, setPenaltyRate] = useState("10");
    const [noDiscountToggle, setNoDiscountToggle] = useState(true);
    const [invoiceReminderEnabled, setInvoiceReminderEnabled] = useState(true);
    const [invoiceReminderDays, setInvoiceReminderDays] = useState(7);
    const [quoteReminderEnabled, setQuoteReminderEnabled] = useState(true);
    const [quoteReminderDays, setQuoteReminderDays] = useState(5);
    const [saving, setSaving] = useState(false);

    const isInitialLoad = useRef(true);
    const saveTimerRef = useRef(null);

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
                        saveCustomization({ primaryColor: s.invoiceColor }, false);
                    }
                }
            } catch (err) {
                console.warn("API company settings fallback:", err.message);
            } finally {
                isInitialLoad.current = false;
            }
        };
        fetchSettings();
    }, []);

    const performSave = useCallback(async (dataToSave = {}) => {
        if (isExpired) {
            window.dispatchEvent(new CustomEvent('autoSaveStatus', { detail: { status: 'error' } }));
            window.dispatchEvent(new CustomEvent('subscription_expired', {
                detail: { message: "Votre abonnement a expiré. Pour modifier les réglages de facturation, veuillez renouveler votre abonnement." }
            }));
            return;
        }

        window.dispatchEvent(new CustomEvent('autoSaveStatus', { detail: { status: 'saving' } }));

        const invPrefix = dataToSave.invoicePrefix !== undefined ? dataToSave.invoicePrefix : invoicePrefix;
        const qPrefix = dataToSave.quotePrefix !== undefined ? dataToSave.quotePrefix : quotePrefix;
        const invNextNum = dataToSave.invoiceNextNumber !== undefined ? dataToSave.invoiceNextNumber : invoiceNextNumber;
        const qNextNum = dataToSave.quoteNextNumber !== undefined ? dataToSave.quoteNextNumber : quoteNextNumber;
        const invFooter = dataToSave.pdfFooterText !== undefined ? dataToSave.pdfFooterText : pdfFooterText;
        const invCond = dataToSave.cgvText !== undefined ? dataToSave.cgvText : cgvText;
        const col = dataToSave.pdfColor !== undefined ? dataToSave.pdfColor : pdfColor;
        const tva = dataToSave.defaultTvaRate !== undefined ? dataToSave.defaultTvaRate : defaultTvaRate;
        const payDays = dataToSave.defaultPaymentDelay !== undefined ? dataToSave.defaultPaymentDelay : defaultPaymentDelay;
        const valDays = dataToSave.defaultQuoteValidity !== undefined ? dataToSave.defaultQuoteValidity : defaultQuoteValidity;
        const invRemEnabled = dataToSave.invoiceReminderEnabled !== undefined ? dataToSave.invoiceReminderEnabled : invoiceReminderEnabled;
        const invRemDays = dataToSave.invoiceReminderDays !== undefined ? dataToSave.invoiceReminderDays : invoiceReminderDays;
        const qRemEnabled = dataToSave.quoteReminderEnabled !== undefined ? dataToSave.quoteReminderEnabled : quoteReminderEnabled;
        const qRemDays = dataToSave.quoteReminderDays !== undefined ? dataToSave.quoteReminderDays : quoteReminderDays;

        if (dataToSave.pdfColor !== undefined) {
            saveCustomization({ primaryColor: dataToSave.pdfColor }, false);
        }

        try {
            await apiFetch('/v1/company/settings', {
                method: 'PATCH',
                body: JSON.stringify({
                    invoicePrefix: invPrefix,
                    quotePrefix: qPrefix,
                    invoiceNextNumber: parseInt(invNextNum, 10) || 1,
                    quoteNextNumber: parseInt(qNextNum, 10) || 1,
                    invoiceFooter: invFooter,
                    invoiceConditions: invCond,
                    invoiceColor: col,
                    defaultTvaRate: Number(tva),
                    defaultPaymentDays: parseInt(payDays, 10) || 30,
                    defaultValidDays: parseInt(valDays, 10) || 30,
                    invoiceReminderEnabled: invRemEnabled,
                    invoiceReminderDays: parseInt(invRemDays, 10) || 7,
                    quoteReminderEnabled: qRemEnabled,
                    quoteReminderDays: parseInt(qRemDays, 10) || 5
                })
            });
            window.dispatchEvent(new CustomEvent('autoSaveStatus', { detail: { status: 'saved' } }));
        } catch (err) {
            console.warn("Auto-save facturation settings error:", err);
            window.dispatchEvent(new CustomEvent('autoSaveStatus', { detail: { status: 'error' } }));
        }
    }, [
        isExpired,
        invoicePrefix,
        quotePrefix,
        invoiceNextNumber,
        quoteNextNumber,
        pdfFooterText,
        cgvText,
        pdfColor,
        defaultTvaRate,
        defaultPaymentDelay,
        defaultQuoteValidity,
        invoiceReminderEnabled,
        invoiceReminderDays,
        quoteReminderEnabled,
        quoteReminderDays
    ]);

    const queueAutoSave = useCallback((partial) => {
        if (isExpired) {
            window.dispatchEvent(new CustomEvent('autoSaveStatus', { detail: { status: 'error' } }));
            window.dispatchEvent(new CustomEvent('subscription_expired', {
                detail: { message: "Votre abonnement a expiré. Pour modifier les réglages de facturation, veuillez renouveler votre abonnement." }
            }));
            return;
        }
        window.dispatchEvent(new CustomEvent('autoSaveStatus', { detail: { status: 'saving' } }));
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
            performSave(partial);
        }, 700);
    }, [isExpired, performSave]);

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
        await performSave();
        setSaving(false);
        if (triggerToast) {
            triggerToast("Réglages de facturation enregistrés !");
        }
    };

    return (
        <form
            onSubmit={handleSubmit}
            className={isMobileView ? "facturation-mobile-container" : ""}
            style={{ display: 'flex', flexDirection: 'column', gap: isMobileView ? '16px' : '24px' }}
        >
            {/* Numérotation et Préfixes */}
            <div style={{ border: '1px solid var(--border)', borderRadius: isMobileView ? '16px' : '16px', padding: isMobileView ? '16px 18px' : '20px', backgroundColor: 'var(--card)' }}>
                <h3 style={{ margin: isMobileView ? '0 0 14px 0' : '0 0 14px 0', fontSize: isMobileView ? '16px' : '14.5px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Receipt size={isMobileView ? 20 : 17} style={{ color: 'var(--sidebar-primary)' }} />
                    <span>Séquences de Numérotation (art. 289 CGI)</span>
                    <LegalHelpTooltip lawArticle="art. 289 I-3 CGI" title="Numérotation continue" text="La numérotation des factures doit être continue, chronologique et sans rupture. GestArt garantit la conformité fiscale." />
                </h3>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobileView ? 'repeat(2, 1fr)' : '1fr 1fr',
                    gap: isMobileView ? '14px' : '16px'
                }}>
                    <div className="form-field" style={{ gap: isMobileView ? '6px' : '6px' }}>
                        <label className="form-label" style={{ fontSize: isMobileView ? '13px' : '11px', marginBottom: 0, fontWeight: 700 }}>Préfixe factures</label>
                        <input
                            type="text"
                            className="form-input"
                            value={invoicePrefix}
                            onChange={(e) => {
                                const val = e.target.value.toUpperCase();
                                setInvoicePrefix(val);
                                queueAutoSave({ invoicePrefix: val });
                            }}
                            placeholder="INV"
                            style={{
                                height: isMobileView ? '46px' : '42px',
                                minHeight: isMobileView ? '46px' : '42px',
                                maxHeight: isMobileView ? '46px' : '42px',
                                padding: isMobileView ? '10px 14px' : '10px 14px',
                                fontSize: isMobileView ? '14.5px' : '13.5px'
                            }}
                        />
                        <span style={{ fontSize: isMobileView ? '12.5px' : '11.5px', color: 'var(--sidebar-primary)', fontWeight: 700, marginTop: '2px', lineHeight: 1.2 }}>
                            {isMobileView ? formattedInvoicePreview : `Aperçu : ${formattedInvoicePreview}`}
                        </span>
                    </div>

                    <div className="form-field" style={{ gap: isMobileView ? '6px' : '6px' }}>
                        <label className="form-label" style={{ fontSize: isMobileView ? '13px' : '11px', marginBottom: 0, fontWeight: 700 }}>Préfixe devis</label>
                        <input
                            type="text"
                            className="form-input"
                            value={quotePrefix}
                            onChange={(e) => {
                                const val = e.target.value.toUpperCase();
                                setQuotePrefix(val);
                                queueAutoSave({ quotePrefix: val });
                            }}
                            placeholder="D"
                            style={{
                                height: isMobileView ? '46px' : '42px',
                                minHeight: isMobileView ? '46px' : '42px',
                                maxHeight: isMobileView ? '46px' : '42px',
                                padding: isMobileView ? '10px 14px' : '10px 14px',
                                fontSize: isMobileView ? '14.5px' : '13.5px'
                            }}
                        />
                        <span style={{ fontSize: isMobileView ? '12.5px' : '11.5px', color: 'var(--sidebar-primary)', fontWeight: 700, marginTop: '2px', lineHeight: 1.2 }}>
                            {isMobileView ? formattedQuotePreview : `Aperçu : ${formattedQuotePreview}`}
                        </span>
                    </div>

                    <div className="form-field" style={{ gap: isMobileView ? '6px' : '6px' }}>
                        <label className="form-label" style={{ fontSize: isMobileView ? '13px' : '11px', marginBottom: 0, fontWeight: 700 }}>N° suivant Facture</label>
                        <input
                            type="number"
                            className="form-input"
                            value={invoiceNextNumber}
                            onChange={(e) => {
                                const val = parseInt(e.target.value, 10) || 1;
                                setInvoiceNextNumber(val);
                                queueAutoSave({ invoiceNextNumber: val });
                            }}
                            min="1"
                            style={{
                                height: isMobileView ? '46px' : '42px',
                                minHeight: isMobileView ? '46px' : '42px',
                                maxHeight: isMobileView ? '46px' : '42px',
                                padding: isMobileView ? '10px 14px' : '10px 14px',
                                fontSize: isMobileView ? '14.5px' : '13.5px'
                            }}
                        />
                    </div>

                    <div className="form-field" style={{ gap: isMobileView ? '6px' : '6px' }}>
                        <label className="form-label" style={{ fontSize: isMobileView ? '13px' : '11px', marginBottom: 0, fontWeight: 700 }}>N° suivant Devis</label>
                        <input
                            type="number"
                            className="form-input"
                            value={quoteNextNumber}
                            onChange={(e) => {
                                const val = parseInt(e.target.value, 10) || 1;
                                setQuoteNextNumber(val);
                                queueAutoSave({ quoteNextNumber: val });
                            }}
                            min="1"
                            style={{
                                height: isMobileView ? '46px' : '42px',
                                minHeight: isMobileView ? '46px' : '42px',
                                maxHeight: isMobileView ? '46px' : '42px',
                                padding: isMobileView ? '10px 14px' : '10px 14px',
                                fontSize: isMobileView ? '14.5px' : '13.5px'
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Délais et Validités */}
            <div style={{ border: '1px solid var(--border)', borderRadius: isMobileView ? '16px' : '16px', padding: isMobileView ? '16px 18px' : '20px', backgroundColor: 'var(--card)' }}>
                <h3 style={{ margin: isMobileView ? '0 0 14px 0' : '0 0 14px 0', fontSize: isMobileView ? '16px' : '14.5px', fontWeight: 700 }}>Délais de Règlement & Validité Devis</h3>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobileView ? '1fr' : '1fr 1fr',
                    gap: isMobileView ? '14px' : '16px'
                }}>
                    <div className="form-field" style={{ gap: isMobileView ? '6px' : '6px' }}>
                        <label className="form-label" style={{ fontSize: isMobileView ? '13px' : '11px', marginBottom: 0, fontWeight: 700 }}>Délai de paiement par défaut des factures</label>
                        <select
                            className="form-input"
                            value={defaultPaymentDelay}
                            onChange={(e) => {
                                const val = e.target.value;
                                setDefaultPaymentDelay(val);
                                performSave({ defaultPaymentDelay: val });
                            }}
                            style={{
                                height: isMobileView ? '46px' : '42px',
                                minHeight: isMobileView ? '46px' : '42px',
                                maxHeight: isMobileView ? '46px' : '42px',
                                padding: isMobileView ? '10px 14px' : '10px 14px',
                                fontSize: isMobileView ? '14.5px' : '13.5px'
                            }}
                        >
                            <option value="15">15 jours (Paiement rapide)</option>
                            <option value="30">30 jours (Standard légal art. L441-10)</option>
                            <option value="45">45 jours fin de mois</option>
                            <option value="60">60 jours max légal</option>
                        </select>
                    </div>

                    <div className="form-field" style={{ gap: isMobileView ? '6px' : '6px' }}>
                        <label className="form-label" style={{ fontSize: isMobileView ? '13px' : '11px', marginBottom: 0, fontWeight: 700 }}>Durée de validité par défaut des devis</label>
                        <select
                            className="form-input"
                            value={defaultQuoteValidity}
                            onChange={(e) => {
                                const val = e.target.value;
                                setDefaultQuoteValidity(val);
                                performSave({ defaultQuoteValidity: val });
                            }}
                            style={{
                                height: isMobileView ? '46px' : '42px',
                                minHeight: isMobileView ? '46px' : '42px',
                                maxHeight: isMobileView ? '46px' : '42px',
                                padding: isMobileView ? '10px 14px' : '10px 14px',
                                fontSize: isMobileView ? '14.5px' : '13.5px'
                            }}
                        >
                            <option value="15">15 jours</option>
                            <option value="30">30 jours (Conseillé HVAC)</option>
                            <option value="60">60 jours (Grands chantiers)</option>
                        </select>
                    </div>

                    <div className="form-field" style={{ gridColumn: isMobileView ? undefined : 'span 2', gap: isMobileView ? '6px' : '6px' }}>
                        <label className="form-label" style={{ fontSize: isMobileView ? '13px' : '11px', marginBottom: 0, fontWeight: 700 }}>Taux TVA par défaut (Pills)</label>
                        <div style={{ display: 'flex', gap: isMobileView ? '8px' : '8px', marginTop: '2px' }}>
                            {[0, 5.5, 10, 20].map((rate) => (
                                <button
                                    key={rate}
                                    type="button"
                                    onClick={() => {
                                        setDefaultTvaRate(rate);
                                        performSave({ defaultTvaRate: rate });
                                    }}
                                    style={{
                                        flex: 1,
                                        padding: isMobileView ? '12px 6px' : '8px',
                                        borderRadius: '10px',
                                        border: defaultTvaRate === rate ? '2px solid var(--sidebar-primary)' : '1px solid var(--border)',
                                        backgroundColor: defaultTvaRate === rate ? 'var(--sidebar-primary)' : 'var(--background)',
                                        color: defaultTvaRate === rate ? '#fff' : 'var(--foreground)',
                                        fontWeight: 700,
                                        fontSize: isMobileView ? '14px' : '13px',
                                        cursor: 'pointer',
                                        textAlign: 'center',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    {rate}% {isMobileView ? '' : rate === 20 ? '(Normal)' : rate === 10 ? '(Rénov.)' : rate === 5.5 ? '(PAC)' : '(Exonéré)'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Relances Automatiques (Factures & Devis) */}
            <div style={{ border: '1px solid var(--border)', borderRadius: isMobileView ? '16px' : '16px', padding: isMobileView ? '16px 18px' : '20px', backgroundColor: 'var(--card)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isMobileView ? '8px' : '10px', flexWrap: 'wrap', gap: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: isMobileView ? '16px' : '14.5px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Bell size={isMobileView ? 20 : 17} style={{ color: 'var(--sidebar-primary)' }} />
                        Relances Automatiques (Factures & Devis)
                    </h3>
                    <span style={{ fontSize: isMobileView ? '11.5px' : '11px', padding: '3px 8px', borderRadius: '12px', background: 'rgba(85, 107, 47, 0.12)', color: 'var(--sidebar-primary)', fontWeight: 600 }}>
                        Envoi unique
                    </span>
                </div>
                <p style={{ margin: isMobileView ? '0 0 12px 0' : '0 0 12px 0', fontSize: isMobileView ? '12.5px' : '12px', color: 'var(--muted-foreground)', lineHeight: '1.4' }}>
                    Rappels automatiques par email avec lien de paiement ou signature.
                </p>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobileView ? '1fr' : '1fr 1fr',
                    gap: isMobileView ? '12px' : '14px',
                    alignItems: 'start'
                }}>
                    {/* Relance Factures */}
                    <div style={{
                        padding: isMobileView ? '14px 16px' : '12px 14px',
                        borderRadius: '12px',
                        border: '1px solid var(--border)',
                        background: 'var(--background)',
                        alignSelf: 'start',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                            <label htmlFor="inv-reminder-toggle" style={{ fontSize: isMobileView ? '14.5px' : '13px', fontWeight: 700, cursor: 'pointer', margin: 0 }}>
                                Relance auto Factures
                            </label>
                            <label className="mobile-toggle-switch" style={{ margin: 0, transform: isMobileView ? 'scale(1)' : undefined, transformOrigin: 'right center' }}>
                                <input
                                    type="checkbox"
                                    id="inv-reminder-toggle"
                                    checked={invoiceReminderEnabled}
                                    onChange={(e) => {
                                        const val = e.target.checked;
                                        setInvoiceReminderEnabled(val);
                                        performSave({ invoiceReminderEnabled: val });
                                    }}
                                />
                                <span className="toggle-slider" />
                            </label>
                        </div>
                        <div style={{
                            display: 'grid',
                            gridTemplateRows: invoiceReminderEnabled ? '1fr' : '0fr',
                            opacity: invoiceReminderEnabled ? 1 : 0,
                            transition: 'grid-template-rows 0.28s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.22s ease, margin-top 0.28s ease',
                            marginTop: invoiceReminderEnabled ? '10px' : '0px'
                        }}>
                            <div style={{ overflow: 'hidden' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '4px' }}>
                                    <label htmlFor="inv-days-select" style={{ fontSize: isMobileView ? '13px' : '11.5px', color: 'var(--muted-foreground)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', margin: 0 }}>
                                        <Clock size={14} /> Délai :
                                    </label>
                                    <select
                                        id="inv-days-select"
                                        className="form-input"
                                        value={invoiceReminderDays}
                                        onChange={(e) => {
                                            const val = Number(e.target.value);
                                            setInvoiceReminderDays(val);
                                            performSave({ invoiceReminderDays: val });
                                        }}
                                        style={{ height: isMobileView ? '42px' : '34px', minHeight: isMobileView ? '42px' : '34px', maxHeight: isMobileView ? '42px' : '34px', padding: '6px 12px', fontSize: isMobileView ? '13.5px' : '12px', flex: 1 }}
                                    >
                                        <option value={3}>3 jours après envoi</option>
                                        <option value={5}>5 jours après envoi</option>
                                        <option value={7}>7 jours (Recommandé)</option>
                                        <option value={10}>10 jours après envoi</option>
                                        <option value={14}>14 jours après envoi</option>
                                        <option value={30}>30 jours après envoi</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Relance Devis */}
                    <div style={{
                        padding: isMobileView ? '14px 16px' : '12px 14px',
                        borderRadius: '12px',
                        border: '1px solid var(--border)',
                        background: 'var(--background)',
                        alignSelf: 'start',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                            <label htmlFor="quote-reminder-toggle" style={{ fontSize: isMobileView ? '14.5px' : '13px', fontWeight: 700, cursor: 'pointer', margin: 0 }}>
                                Relance auto Devis
                            </label>
                            <label className="mobile-toggle-switch" style={{ margin: 0, transform: isMobileView ? 'scale(1)' : undefined, transformOrigin: 'right center' }}>
                                <input
                                    type="checkbox"
                                    id="quote-reminder-toggle"
                                    checked={quoteReminderEnabled}
                                    onChange={(e) => {
                                        const val = e.target.checked;
                                        setQuoteReminderEnabled(val);
                                        performSave({ quoteReminderEnabled: val });
                                    }}
                                />
                                <span className="toggle-slider" />
                            </label>
                        </div>
                        <div style={{
                            display: 'grid',
                            gridTemplateRows: quoteReminderEnabled ? '1fr' : '0fr',
                            opacity: quoteReminderEnabled ? 1 : 0,
                            transition: 'grid-template-rows 0.28s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.22s ease, margin-top 0.28s ease',
                            marginTop: quoteReminderEnabled ? '10px' : '0px'
                        }}>
                            <div style={{ overflow: 'hidden' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '4px' }}>
                                    <label htmlFor="quote-days-select" style={{ fontSize: isMobileView ? '13px' : '11.5px', color: 'var(--muted-foreground)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', margin: 0 }}>
                                        <Clock size={14} /> Délai :
                                    </label>
                                    <select
                                        id="quote-days-select"
                                        className="form-input"
                                        value={quoteReminderDays}
                                        onChange={(e) => {
                                            const val = Number(e.target.value);
                                            setQuoteReminderDays(val);
                                            performSave({ quoteReminderDays: val });
                                        }}
                                        style={{ height: isMobileView ? '42px' : '34px', minHeight: isMobileView ? '42px' : '34px', maxHeight: isMobileView ? '42px' : '34px', padding: '6px 12px', fontSize: isMobileView ? '13.5px' : '12px', flex: 1 }}
                                    >
                                        <option value={2}>2 jours après envoi</option>
                                        <option value={3}>3 jours après envoi</option>
                                        <option value={5}>5 jours (Recommandé)</option>
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
            <div style={{ border: '1px solid var(--border)', borderRadius: isMobileView ? '16px' : '16px', padding: isMobileView ? '16px 18px' : '20px', backgroundColor: 'var(--card)' }}>
                <h3 style={{ margin: isMobileView ? '0 0 14px 0' : '0 0 14px 0', fontSize: isMobileView ? '16px' : '14.5px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={isMobileView ? 20 : 17} style={{ color: 'var(--sidebar-primary)' }} />
                    Mentions Légales du Pied de Page PDF (Art. L441-10 C.com)
                </h3>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobileView ? 'repeat(2, 1fr)' : '1fr 1fr',
                    gap: isMobileView ? '14px' : '16px'
                }}>
                    <div className="form-field" style={{ gap: isMobileView ? '6px' : '6px' }}>
                        <label className="form-label" style={{ fontSize: isMobileView ? '13px' : '11px', marginBottom: 0, fontWeight: 700 }}>Pénalités retard (%)</label>
                        <input
                            type="text"
                            className="form-input"
                            value={penaltyRate}
                            onChange={(e) => setPenaltyRate(e.target.value)}
                            placeholder="10%"
                            style={{
                                height: isMobileView ? '46px' : '42px',
                                minHeight: isMobileView ? '46px' : '42px',
                                maxHeight: isMobileView ? '46px' : '42px',
                                padding: isMobileView ? '10px 14px' : '10px 14px',
                                fontSize: isMobileView ? '14.5px' : '13.5px'
                            }}
                        />
                    </div>

                    <div className="form-field" style={{ gap: isMobileView ? '6px' : '6px' }}>
                        <label className="form-label" style={{ fontSize: isMobileView ? '13px' : '11px', marginBottom: 0, fontWeight: 700 }}>Indemnité forfaitaire</label>
                        <input
                            type="text"
                            className="form-input"
                            value="40,00 € (art. D441-5)"
                            readOnly
                            style={{
                                backgroundColor: 'rgba(0,0,0,0.03)',
                                fontWeight: 700,
                                color: 'var(--sidebar-primary)',
                                height: isMobileView ? '46px' : '42px',
                                minHeight: isMobileView ? '46px' : '42px',
                                maxHeight: isMobileView ? '46px' : '42px',
                                padding: isMobileView ? '10px 14px' : '10px 14px',
                                fontSize: isMobileView ? '14.5px' : '13.5px'
                            }}
                        />
                    </div>

                    <div style={{
                        gridColumn: '1 / -1',
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: isMobileView ? '14px 16px' : '10px 14px',
                        borderRadius: '12px',
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--background)',
                        gap: '8px'
                    }}>
                        <label htmlFor="escompte-check" style={{ fontSize: isMobileView ? '13.5px' : '12.5px', fontWeight: 600, cursor: 'pointer', margin: 0, lineHeight: 1.3 }}>
                            Imprimer la mention : "Aucun escompte pour paiement anticipé"
                        </label>
                        <label className="mobile-toggle-switch" style={{ margin: 0, transform: isMobileView ? 'scale(1)' : undefined, transformOrigin: 'right center' }}>
                            <input
                                type="checkbox"
                                id="escompte-check"
                                checked={noDiscountToggle}
                                onChange={(e) => setNoDiscountToggle(e.target.checked)}
                            />
                            <span className="toggle-slider" />
                        </label>
                    </div>

                    <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: isMobileView ? '6px' : '4px' }}>
                        <label className="form-label" style={{ fontSize: isMobileView ? '13px' : '11px', marginBottom: 0, fontWeight: 700 }}>Mentions de bas de page PDF</label>
                        <textarea
                            className="form-input"
                            rows={isMobileView ? 3 : 3}
                            value={pdfFooterText}
                            onChange={(e) => {
                                const val = e.target.value;
                                setPdfFooterText(val);
                                queueAutoSave({ pdfFooterText: val });
                            }}
                            style={{
                                width: '100%',
                                fontFamily: 'inherit',
                                minHeight: isMobileView ? '85px' : '68px',
                                height: 'auto',
                                fontSize: isMobileView ? '13.5px' : '13px',
                                lineHeight: '1.4',
                                padding: isMobileView ? '12px 14px' : '10px 12px'
                            }}
                        />
                    </div>

                    <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: isMobileView ? '6px' : '4px' }}>
                        <label className="form-label" style={{ fontSize: isMobileView ? '13px' : '11px', marginBottom: 0, fontWeight: 700 }}>Conditions Générales de Vente (CGV PDF)</label>
                        <textarea
                            className="form-input"
                            rows={isMobileView ? 4 : 4}
                            value={cgvText}
                            onChange={(e) => {
                                const val = e.target.value;
                                setCgvText(val);
                                queueAutoSave({ cgvText: val });
                            }}
                            style={{
                                width: '100%',
                                fontFamily: 'inherit',
                                minHeight: isMobileView ? '95px' : '92px',
                                height: 'auto',
                                fontSize: isMobileView ? '13.5px' : '13px',
                                lineHeight: '1.4',
                                padding: isMobileView ? '12px 14px' : '10px 12px'
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Design & Couleur du PDF */}
            <div style={{ border: '1px solid var(--border)', borderRadius: isMobileView ? '16px' : '16px', padding: isMobileView ? '16px 18px' : '20px', backgroundColor: 'var(--card)' }}>
                <h3 style={{ margin: isMobileView ? '0 0 8px 0' : '0 0 12px 0', fontSize: isMobileView ? '16px' : '14.5px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Palette size={isMobileView ? 20 : 17} style={{ color: 'var(--sidebar-primary)' }} />
                    Couleur Principale par Défaut pour les Devis & Factures
                </h3>
                <p style={{ margin: isMobileView ? '0 0 14px 0' : '-6px 0 14px 0', fontSize: isMobileView ? '12.5px' : '12px', color: 'var(--muted-foreground)' }}>
                    Cette couleur sera appliquée par défaut à tous vos devis et factures PDF.
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: isMobileView ? '14px' : '16px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: isMobileView ? '10px' : '8px', flexWrap: 'wrap' }}>
                        {colorSwatches.map((swatch) => (
                            <button
                                key={swatch.value}
                                type="button"
                                title={swatch.name}
                                onClick={() => {
                                    setPdfColor(swatch.value);
                                    performSave({ pdfColor: swatch.value });
                                }}
                                style={{
                                    width: isMobileView ? '36px' : '34px',
                                    height: isMobileView ? '36px' : '34px',
                                    borderRadius: '50%',
                                    backgroundColor: swatch.value,
                                    border: pdfColor.toLowerCase() === swatch.value.toLowerCase() ? '3px solid var(--foreground)' : '2px solid transparent',
                                    cursor: 'pointer',
                                    transform: pdfColor.toLowerCase() === swatch.value.toLowerCase() ? 'scale(1.12)' : 'scale(1)',
                                    transition: 'transform 0.15s',
                                    boxShadow: '0 2px 5px rgba(0,0,0,0.15)'
                                }}
                            />
                        ))}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: isMobileView ? '13px' : '12.5px', fontWeight: 600 }}>Ou Hex :</span>
                        <input
                            type="text"
                            className="form-input"
                            value={pdfColor}
                            onChange={(e) => {
                                const val = e.target.value;
                                setPdfColor(val);
                                queueAutoSave({ pdfColor: val });
                            }}
                            style={{
                                width: isMobileView ? '95px' : '95px',
                                height: isMobileView ? '44px' : '42px',
                                minHeight: isMobileView ? '44px' : '42px',
                                maxHeight: isMobileView ? '44px' : '42px',
                                fontFamily: 'monospace',
                                fontWeight: 700,
                                textAlign: 'center',
                                padding: '4px 8px',
                                fontSize: isMobileView ? '14px' : '13.5px'
                            }}
                        />
                        <div style={{ width: isMobileView ? '28px' : '24px', height: isMobileView ? '28px' : '24px', borderRadius: '6px', backgroundColor: pdfColor, border: '1px solid var(--border)' }} />
                    </div>
                </div>

                {/* Only display the button on desktop view since mobile uses header auto-save */}
                {!isMobileView && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
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
                            {saving ? <><Loader2 size={15} className="spin-loader" /> Enregistrement...</> : "Enregistrer la Facturation"}
                        </button>
                    </div>
                )}
            </div>
        </form>
    );
}
