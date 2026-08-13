import React, { useState } from "react";
import { Receipt, Palette, FileText, Check, AlertCircle } from "lucide-react";
import { LegalHelpTooltip } from "../../components/LegalHelpModal";

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
    const [pdfColor, setPdfColor] = useState("#5B4DDB");
    const [penaltyRate, setPenaltyRate] = useState("10");
    const [noDiscountToggle, setNoDiscountToggle] = useState(true);

    const year = new Date().getFullYear();
    const formattedInvoicePreview = `${invoicePrefix}-${year}-${String(invoiceNextNumber).padStart(3, '0')}`;
    const formattedQuotePreview = `${quotePrefix}-${year}-${String(quoteNextNumber).padStart(3, '0')}`;

    const handleSubmit = (e) => {
        if (e) e.preventDefault();
        triggerToast("Réglages de facturation et modèle PDF enregistrés !");
    };

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Numérotation et Préfixes */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', backgroundColor: 'var(--card)' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Receipt size={18} style={{ color: 'var(--sidebar-primary)' }} />
                    Séquences de Numérotation (Conformes art. 289 CGI)
                    <LegalHelpTooltip lawArticle="art. 289 I-3 CGI" title="Numérotation continue" text="La numérotation des factures doit être continue, chronologique et sans rupture. GestArt garantit la conformité fiscale." />
                </h3>

                <div className="profile-form-grid">
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
            <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', backgroundColor: 'var(--card)' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 700 }}>Délais de Règlement & Validité Devis</h3>

                <div className="profile-form-grid">
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
                            <option value="60">60 jours (Grands projets)</option>
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
                                    {rate}%
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Mentions Légales PDF, Pénalités & Escompte */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', backgroundColor: 'var(--card)' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={18} style={{ color: 'var(--sidebar-primary)' }} />
                    Mentions Légales du Pied de Page PDF (Art. L441-10 C.com)
                </h3>

                <div className="profile-form-grid">
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

                    <div className="form-field form-group-full" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input
                            type="checkbox"
                            id="escompte-check"
                            checked={noDiscountToggle}
                            onChange={(e) => setNoDiscountToggle(e.target.checked)}
                            style={{ width: '18px', height: '18px' }}
                        />
                        <label htmlFor="escompte-check" style={{ fontSize: '13px', fontWeight: 600 }}>
                            Imprimer la mention : "Aucun escompte pour paiement anticipé"
                        </label>
                    </div>

                    <div className="form-field form-group-full">
                        <label className="form-label">Mentions de bas de page PDF</label>
                        <textarea
                            className="form-input"
                            rows={3}
                            value={pdfFooterText}
                            onChange={(e) => setPdfFooterText(e.target.value)}
                            style={{ width: '100%', fontFamily: 'sans-serif' }}
                        />
                    </div>

                    <div className="form-field form-group-full">
                        <label className="form-label">Conditions Générales de Vente (CGV PDF)</label>
                        <textarea
                            className="form-input"
                            rows={3}
                            value={cgvText}
                            onChange={(e) => setCgvText(e.target.value)}
                            style={{ width: '100%', fontFamily: 'sans-serif' }}
                        />
                    </div>
                </div>
            </div>

            {/* Design & Couleur du PDF */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', backgroundColor: 'var(--card)' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Palette size={18} style={{ color: 'var(--sidebar-primary)' }} />
                    Personnalisation de la Couleur Principale du PDF
                </h3>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {["#5B4DDB", "#2563EB", "#059669", "#D97706", "#DC2626", "#4F46E5"].map((col) => (
                            <button
                                key={col}
                                type="button"
                                onClick={() => setPdfColor(col)}
                                style={{
                                    width: '32px', height: '32px', borderRadius: '50%', backgroundColor: col, border: pdfColor === col ? '3px solid var(--foreground)' : 'none', cursor: 'pointer'
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
                            style={{ width: '90px', fontFamily: 'monospace', fontWeight: 700, textAlign: 'center' }}
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                    <button type="submit" className="save-profile-btn" style={{ padding: '10px 24px', backgroundColor: 'var(--sidebar-primary)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                        Enregistrer la Facturation
                    </button>
                </div>
            </div>
        </form>
    );
}
