import React, { useState } from "react";
import { X, Check, Palette, Type, Layout, Eye, Sliders, Image, Star } from "lucide-react";
import { useDocumentCustomization, getEffectiveCustomization, saveDocCustomization } from "../utils/documentCustomization";
import { useUser } from "../utils/useUser";
import "./DocumentCustomizerModal.css";

const COLOR_PRESETS = [
  { name: "Olive GestArt", value: "#556B2F" },
  { name: "Bleu Océan", value: "#005371" },
  { name: "Violet Pro", value: "#7C3AED" },
  { name: "Ambre warm", value: "#D97706" },
  { name: "Bleu Royal", value: "#2563EB" },
  { name: "Émeraude", value: "#059669" },
  { name: "Rouge Rubis", value: "#DC2626" },
  { name: "Noir Élégant", value: "#1A1A1A" },
];

const BG_PRESETS = [
  { name: "Blanc Pur", value: "#FFFFFF" },
  { name: "Crème Doux", value: "#FAFAF8" },
  { name: "Gris Givré", value: "#F8FAFC" },
  { name: "Warm Paper", value: "#FDFBF7" },
];

const FONT_SIZES = [
  { label: "Petite (8pt)", value: "8pt" },
  { label: "Moyenne (9pt)", value: "9pt" },
  { label: "Grande (10pt)", value: "10pt" },
];

const FONT_FAMILIES = [
  { label: "Inter (Moderne)", value: "'Inter', sans-serif" },
  { label: "Roboto (Classique Pro)", value: "'Roboto', sans-serif" },
  { label: "Outfit (Tendance)", value: "'Outfit', sans-serif" },
  { label: "Lora (Éditorial Serif)", value: "'Lora', Georgia, serif" },
  { label: "Playfair Display (Luxe)", value: "'Playfair Display', Georgia, serif" },
  { label: "Space Grotesk (Tech)", value: "'Space Grotesk', sans-serif" },
];

const STRUCTURE_PRESETS = [
  { id: "classic", name: "Classique", desc: "Mise en page épurée et équilibrée" },
  { id: "modern", name: "Moderne", desc: "En-tête dynamique et bordures teintées" },
  { id: "minimal", name: "Minimaliste", desc: "Design sobre axé sur le contenu" },
  { id: "banner", name: "Bannière", desc: "Bandeau d'accentuation en haut" },
];

export default function DocumentCustomizerModal({ onClose, docType = "facture", doc = null, onSaveDocCustomization = null }) {
  const { company } = useUser();
  const [globalCustomization, updateGlobalCustomization] = useDocumentCustomization();
  const [customization, setCustomization] = useState(() => getEffectiveCustomization(doc, globalCustomization));
  const [activeTab, setActiveTab] = useState("couleurs");
  const [mobileView, setMobileView] = useState("controls");
  const [specimenZoom, setSpecimenZoom] = useState(0.5);

  const companyDisplayName = company?.name || "Mon Entreprise";
  const companyDisplayAddress = company?.address ? `${company.address}${company.postalCode || company.city ? `, ${company.postalCode || ''} ${company.city || ''}` : ''}` : "88 Rue de l'Aviation, 75015 Paris";
  const companyDisplaySiret = company?.siret || "849 203 103 00021";
  const companyDisplayPhone = company?.phone || "06 51 60 43 16";
  const companyDisplayEmail = company?.email || "contact@entreprise.fr";
  const companyLogo = customization.logoUrl || company?.logoUrl;
  const companySignature = company?.signatureUrl || company?.signature || company?.settings?.signatureUrl || company?.settings?.signature;
  const realIban = company?.settings?.bankIban || company?.bankIban || company?.iban || "FR76 3000 3020 5001 2345 6789 012";

  // Dynamic Client Info from active document if present
  const clientDisplayName = doc?.client?.companyName || (doc?.client?.firstName ? `${doc.client.firstName} ${doc.client.lastName || ''}`.trim() : null) || doc?.clientName || "Jean Dupont";
  const clientDisplayAddress = doc?.client?.address ? `${doc.client.address}${doc.client.postalCode || doc.client.city ? `, ${doc.client.postalCode || ''} ${doc.client.city || ''}` : ''}`.trim() : (doc?.clientAddress || "12 Rue des Fleurs, 75001 Paris");
  const clientDisplayEmail = doc?.client?.email || doc?.clientEmail || "exemple@gmail.com";
  const clientDisplayPhone = doc?.client?.phone || doc?.clientPhone || "";
  const docNumber = doc?.number || (docType === "devis" ? "DEV-2026-0001" : "INV-2026-0001");
  const docDate = doc?.date ? new Date(doc.date).toLocaleDateString('fr-FR') : "01/08/2026";
  const docDeliveryDate = doc?.deliveryDate ? new Date(doc.deliveryDate).toLocaleDateString('fr-FR') : (doc?.dueDate ? new Date(doc.dueDate).toLocaleDateString('fr-FR') : "15/08/2026");
  const docTotalHt = doc?.subtotalHt != null ? Number(doc.subtotalHt) : 100;
  const docTvaRate = doc?.tvaRate != null ? Number(doc.tvaRate) : 20;
  const docTotalTva = doc?.tvaAmount != null ? Number(doc.tvaAmount) : (docTotalHt * docTvaRate / 100);
  const docTotalTtc = doc?.totalTtc != null ? Number(doc.totalTtc) : (docTotalHt + docTotalTva);

  const handleChange = (key, value) => {
    const newSettings = { ...customization, [key]: value };
    setCustomization(newSettings);
  };

  const handleSave = () => {
    if (doc?.id || doc?.clientId || doc?.client?.id) {
      saveDocCustomization(doc?.id, customization, doc?.clientId || doc?.client?.id);
    }
    if (doc && onSaveDocCustomization) {
      onSaveDocCustomization(customization);
    } else {
      updateGlobalCustomization(customization);
    }
    onClose();
  };

  return (
    <div className="doc-customizer-overlay" onClick={onClose}>
      <div className="doc-customizer-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="doc-customizer-header">
          <div className="customizer-header-title">
            <Star size={20} className="customizer-sparkle-icon" fill="currentColor" />
            <div>
              <h3>Personnaliser vos documents</h3>
              <p>Personnalisez l'apparence des factures et devis sur PC et Mobile</p>
            </div>
          </div>
          <button className="doc-customizer-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Mobile View Toggle Bar */}
        <div className="customizer-mobile-toggle-bar">
          <button
            type="button"
            className={`mobile-toggle-btn ${mobileView === "controls" ? "active" : ""}`}
            onClick={() => setMobileView("controls")}
          >
            <Sliders size={15} />
            <span>Réglages</span>
          </button>
          <button
            type="button"
            className={`mobile-toggle-btn ${mobileView === "specimen" ? "active" : ""}`}
            onClick={() => setMobileView("specimen")}
          >
            <Eye size={15} />
            <span>Aperçu (A4)</span>
          </button>
        </div>

        {/* Modal Body: Split view (Settings controls + Live specimen preview) */}
        <div className="doc-customizer-body">
          {/* Controls Column */}
          <div className={`doc-customizer-controls ${mobileView === "controls" ? "show-mobile" : "hide-mobile"}`}>
            {/* Category Navigation Tabs */}
            <div className="customizer-nav-tabs">
              <button
                className={`customizer-tab-btn ${activeTab === "couleurs" ? "active" : ""}`}
                onClick={() => setActiveTab("couleurs")}
              >
                <Palette size={16} />
                <span>Couleurs</span>
              </button>
              <button
                className={`customizer-tab-btn ${activeTab === "typographie" ? "active" : ""}`}
                onClick={() => setActiveTab("typographie")}
              >
                <Type size={16} />
                <span>Typographie</span>
              </button>
              <button
                className={`customizer-tab-btn ${activeTab === "structure" ? "active" : ""}`}
                onClick={() => setActiveTab("structure")}
              >
                <Layout size={16} />
                <span>Structure & Logo</span>
              </button>
              <button
                className={`customizer-tab-btn ${activeTab === "affichage" ? "active" : ""}`}
                onClick={() => setActiveTab("affichage")}
              >
                <Eye size={16} />
                <span>Informations</span>
              </button>
            </div>

            {/* Tab Contents */}
            <div className="customizer-tab-content">
              {/* TAB 1: COULEURS */}
              {activeTab === "couleurs" && (
                <div className="customizer-section-group">
                  <div className="customizer-field">
                    <label className="field-title">Couleur principale (Accent & Titres)</label>
                    <div className="color-swatch-grid">
                      {COLOR_PRESETS.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          className={`color-swatch-item ${customization.primaryColor === color.value ? "selected" : ""}`}
                          style={{ backgroundColor: color.value }}
                          onClick={() => handleChange("primaryColor", color.value)}
                          title={color.name}
                        >
                          {customization.primaryColor === color.value && <Check size={14} color="#FFF" />}
                        </button>
                      ))}
                    </div>
                    <div className="custom-color-input-row">
                      <span>Couleur personnalisée :</span>
                      <input
                        type="color"
                        value={customization.primaryColor}
                        onChange={(e) => handleChange("primaryColor", e.target.value)}
                        className="color-picker-native"
                      />
                      <span className="hex-value-label">{customization.primaryColor}</span>
                    </div>
                  </div>

                  <div className="customizer-field">
                    <label className="field-title">Couleur de fond du document A4</label>
                    <div className="color-swatch-grid">
                      {BG_PRESETS.map((bg) => (
                        <button
                          key={bg.value}
                          type="button"
                          className={`color-swatch-item bg-swatch ${customization.bgColor === bg.value ? "selected" : ""}`}
                          style={{ backgroundColor: bg.value }}
                          onClick={() => handleChange("bgColor", bg.value)}
                          title={bg.name}
                        >
                          {customization.bgColor === bg.value && <Check size={14} color="#333" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="customizer-field">
                    <label className="field-title">Couleur du texte principal</label>
                    <div className="color-swatch-grid">
                      {["#1A1A1A", "#1E293B", "#334155", "#4B5563"].map((txtColor) => (
                        <button
                          key={txtColor}
                          type="button"
                          className={`color-swatch-item ${customization.textColor === txtColor ? "selected" : ""}`}
                          style={{ backgroundColor: txtColor }}
                          onClick={() => handleChange("textColor", txtColor)}
                        >
                          {customization.textColor === txtColor && <Check size={14} color="#FFF" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: TYPOGRAPHIE */}
              {activeTab === "typographie" && (
                <div className="customizer-section-group">
                  <div className="customizer-field">
                    <label className="field-title">Taille de police globale (pt)</label>
                    <div className="custom-font-size-input-row" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                      <button
                        type="button"
                        className="stepper-btn"
                        onClick={() => {
                          const cur = parseFloat(customization.fontSize) || 9;
                          const next = Math.max(6, Math.round((cur - 0.5) * 2) / 2);
                          handleChange("fontSize", `${next}pt`);
                        }}
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          border: '1px solid var(--border, rgba(0,0,0,0.12))',
                          background: 'var(--muted, #EAE8E3)',
                          color: 'var(--foreground, #1A1A1A)',
                          fontSize: '1.2rem',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        -
                      </button>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--card, #FFF)', border: '1.5px solid var(--border, rgba(0,0,0,0.15))', borderRadius: '8px', padding: '4px 10px' }}>
                        <input
                          type="number"
                          min="6"
                          max="20"
                          step="0.5"
                          value={parseFloat(customization.fontSize) || 9}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val !== "") {
                              handleChange("fontSize", `${val}pt`);
                            }
                          }}
                          style={{
                            width: '56px',
                            border: 'none',
                            background: 'transparent',
                            fontSize: '1.05rem',
                            fontWeight: '700',
                            textAlign: 'center',
                            outline: 'none',
                            color: 'var(--foreground, #1A1A1A)'
                          }}
                        />
                        <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--muted-foreground, #666)' }}>pt</span>
                      </div>
                      <button
                        type="button"
                        className="stepper-btn"
                        onClick={() => {
                          const cur = parseFloat(customization.fontSize) || 9;
                          const next = Math.min(20, Math.round((cur + 0.5) * 2) / 2);
                          handleChange("fontSize", `${next}pt`);
                        }}
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          border: '1px solid var(--border, rgba(0,0,0,0.12))',
                          background: 'var(--muted, #EAE8E3)',
                          color: 'var(--foreground, #1A1A1A)',
                          fontSize: '1.2rem',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        +
                      </button>
                    </div>

                    <div className="font-size-presets-row" style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                      {["7pt", "8pt", "9pt", "10pt", "11pt", "12pt"].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          className={`font-size-chip ${customization.fontSize === preset ? "active" : ""}`}
                          onClick={() => handleChange("fontSize", preset)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: customization.fontSize === preset ? '1px solid #556B2F' : '1px solid var(--border, rgba(0,0,0,0.12))',
                            backgroundColor: customization.fontSize === preset ? 'rgba(85, 107, 47, 0.12)' : 'var(--muted, #F4F3EF)',
                            color: customization.fontSize === preset ? '#556B2F' : 'var(--foreground, #1A1A1A)',
                            fontWeight: customization.fontSize === preset ? '700' : '500',
                            fontSize: '0.8rem',
                            cursor: 'pointer'
                          }}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="customizer-field">
                    <label className="field-title">Police de caractères</label>
                    <div className="font-family-list">
                      {FONT_FAMILIES.map((ff) => (
                        <div
                          key={ff.value}
                          className={`font-family-card ${customization.fontFamily === ff.value ? "selected" : ""}`}
                          onClick={() => handleChange("fontFamily", ff.value)}
                        >
                          <span style={{ fontFamily: ff.value, fontSize: "14px", fontWeight: "600" }}>
                            {ff.label}
                          </span>
                          <span className="font-sample-preview" style={{ fontFamily: ff.value }}>
                            FACTURE N° 2026-001 — Total: 120,00 €
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: STRUCTURE & LOGO */}
              {activeTab === "structure" && (
                <div className="customizer-section-group">
                  <div className="customizer-field">
                    <label className="field-title">Style de mise en page (Structure)</label>
                    <div className="structure-grid">
                      {STRUCTURE_PRESETS.map((st) => (
                        <div
                          key={st.id}
                          className={`structure-card ${customization.structure === st.id ? "selected" : ""}`}
                          onClick={() => handleChange("structure", st.id)}
                        >
                          <div className="structure-card-header">
                            <span className="structure-card-title">{st.name}</span>
                            {customization.structure === st.id && <Check size={16} className="check-badge" />}
                          </div>
                          <span className="structure-card-desc">{st.desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="customizer-field">
                    <label className="field-title">Position du bloc client (Devis pour / Facturé à)</label>
                    <div className="btn-segmented-control">
                      <button
                        type="button"
                        className={`segmented-btn ${(customization.clientBoxPosition || "bottom") === "bottom" ? "active" : ""}`}
                        onClick={() => handleChange("clientBoxPosition", "bottom")}
                      >
                        Sous l'entreprise
                      </button>
                      <button
                        type="button"
                        className={`segmented-btn ${(customization.clientBoxPosition || "bottom") === "right" ? "active" : ""}`}
                        onClick={() => handleChange("clientBoxPosition", "right")}
                      >
                        En face (À droite)
                      </button>
                    </div>
                  </div>

                  <div className="customizer-field">
                    <div className="toggle-row-card">
                      <div>
                        <span className="toggle-label-text">Afficher le logo</span>
                        <p className="toggle-desc-text">Inclus l'image du logo en haut du document</p>
                      </div>
                      <input
                        type="checkbox"
                        className="custom-toggle-switch"
                        checked={customization.showLogo}
                        onChange={(e) => handleChange("showLogo", e.target.checked)}
                      />
                    </div>
                  </div>

                  {customization.showLogo && (
                    <>
                      <div className="customizer-field">
                        <label className="field-title">Alignement du logo</label>
                        <div className="btn-segmented-control">
                          <button
                            type="button"
                            className={`segmented-btn ${customization.logoPosition === "left" ? "active" : ""}`}
                            onClick={() => handleChange("logoPosition", "left")}
                          >
                            Gauche
                          </button>
                          <button
                            type="button"
                            className={`segmented-btn ${customization.logoPosition === "right" ? "active" : ""}`}
                            onClick={() => handleChange("logoPosition", "right")}
                          >
                            Droite
                          </button>
                        </div>
                      </div>

                      <div className="customizer-field">
                        <div className="slider-header">
                          <label className="field-title">Hauteur du logo</label>
                          <span>{customization.logoSize || 45} px</span>
                        </div>
                        <input
                          type="range"
                          min="25"
                          max="75"
                          value={customization.logoSize || 45}
                          onChange={(e) => handleChange("logoSize", Number(e.target.value))}
                          className="range-slider-input"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* TAB 4: INFORMATIONS À AFFICHER */}
              {activeTab === "affichage" && (
                <div className="customizer-section-group">
                  <div className="toggle-list-group">
                    <div className="toggle-row-card">
                      <div>
                        <span className="toggle-label-text">Numéro de téléphone</span>
                        <p className="toggle-desc-text">Affiche votre téléphone dans les coordonnées</p>
                      </div>
                      <input
                        type="checkbox"
                        className="custom-toggle-switch"
                        checked={customization.showPhone}
                        onChange={(e) => handleChange("showPhone", e.target.checked)}
                      />
                    </div>

                    <div className="toggle-row-card">
                      <div>
                        <span className="toggle-label-text">Adresse e-mail</span>
                        <p className="toggle-desc-text">Affiche l'e-mail de l'entreprise</p>
                      </div>
                      <input
                        type="checkbox"
                        className="custom-toggle-switch"
                        checked={customization.showEmail}
                        onChange={(e) => handleChange("showEmail", e.target.checked)}
                      />
                    </div>

                    <div className="toggle-row-card">
                      <div>
                        <span className="toggle-label-text">Numéro SIRET</span>
                        <p className="toggle-desc-text">Mentions légales de l'entreprise</p>
                      </div>
                      <input
                        type="checkbox"
                        className="custom-toggle-switch"
                        checked={customization.showSiret}
                        onChange={(e) => handleChange("showSiret", e.target.checked)}
                      />
                    </div>

                    <div className="toggle-row-card">
                      <div>
                        <span className="toggle-label-text">Date de livraison / prestation</span>
                        <p className="toggle-desc-text">Inclus la ligne Date de livraison si définie</p>
                      </div>
                      <input
                        type="checkbox"
                        className="custom-toggle-switch"
                        checked={customization.showDeliveryDate}
                        onChange={(e) => handleChange("showDeliveryDate", e.target.checked)}
                      />
                    </div>

                    <div className="toggle-row-card">
                      <div>
                        <span className="toggle-label-text">Conditions de paiement & IBAN</span>
                        <p className="toggle-desc-text">Afficher en bas du document</p>
                      </div>
                      <input
                        type="checkbox"
                        className="custom-toggle-switch"
                        checked={customization.showPaymentConditions}
                        onChange={(e) => handleChange("showPaymentConditions", e.target.checked)}
                      />
                    </div>

                    <div className="toggle-row-card">
                      <div>
                        <span className="toggle-label-text">Mention AGA</span>
                        <p className="toggle-desc-text">Pour les adhérents d'une association agréée</p>
                      </div>
                      <input
                        type="checkbox"
                        className="custom-toggle-switch"
                        checked={customization.showAgaMention}
                        onChange={(e) => handleChange("showAgaMention", e.target.checked)}
                      />
                    </div>

                    <div className="toggle-row-card">
                      <div>
                        <span className="toggle-label-text">Signature de l'entreprise</span>
                        <p className="toggle-desc-text">Afficher la signature / cachet en bas du document</p>
                      </div>
                      <input
                        type="checkbox"
                        className="custom-toggle-switch"
                        checked={customization.showCompanySignature !== false}
                        onChange={(e) => handleChange("showCompanySignature", e.target.checked)}
                      />
                    </div>

                    {customization.showCompanySignature !== false && (
                      <div style={{ marginLeft: "14px", marginTop: "6px", marginBottom: "10px" }}>
                        <label style={{ fontSize: "0.8rem", fontWeight: "600", color: "var(--muted-foreground)", display: "block", marginBottom: "4px" }}>
                          Position signature entreprise :
                        </label>
                        <div className="btn-segmented-control" style={{ maxWidth: "220px" }}>
                          <button
                            type="button"
                            className={`segmented-btn ${(customization.signaturePosition || "left") === "left" ? "active" : ""}`}
                            onClick={() => handleChange("signaturePosition", "left")}
                          >
                            Gauche
                          </button>
                          <button
                            type="button"
                            className={`segmented-btn ${customization.signaturePosition === "right" ? "active" : ""}`}
                            onClick={() => handleChange("signaturePosition", "right")}
                          >
                            Droite
                          </button>
                        </div>
                      </div>
                    )}

                    {(() => {
                      const isClientSigVisible = customization.showClientSignature !== undefined
                        ? customization.showClientSignature
                        : (docType === "devis");
                      return (
                        <>
                          <div className="toggle-row-card">
                            <div>
                              <span className="toggle-label-text">Signature de l'acheteur (Client)</span>
                              <p className="toggle-desc-text">
                                {docType === "devis" ? "Zone « Bon pour accord » pour signature du devis" : "Zone signature acheteur (désactivée par défaut sur factures)"}
                              </p>
                            </div>
                            <input
                              type="checkbox"
                              className="custom-toggle-switch"
                              checked={isClientSigVisible}
                              onChange={(e) => handleChange("showClientSignature", e.target.checked)}
                            />
                          </div>

                          {isClientSigVisible && (
                            <div style={{ marginLeft: "14px", marginTop: "6px", marginBottom: "10px" }}>
                              <label style={{ fontSize: "0.8rem", fontWeight: "600", color: "var(--muted-foreground)", display: "block", marginBottom: "4px" }}>
                                Position signature acheteur :
                              </label>
                              <div className="btn-segmented-control" style={{ maxWidth: "220px" }}>
                                <button
                                  type="button"
                                  className={`segmented-btn ${(customization.clientSignaturePosition || "right") === "left" ? "active" : ""}`}
                                  onClick={() => handleChange("clientSignaturePosition", "left")}
                                >
                                  Gauche
                                </button>
                                <button
                                  type="button"
                                  className={`segmented-btn ${(customization.clientSignaturePosition || "right") === "right" ? "active" : ""}`}
                                  onClick={() => handleChange("clientSignaturePosition", "right")}
                                >
                                  Droite
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Save Action */}
            <div className="customizer-footer-actions">
              <button className="save-customizer-btn" onClick={handleSave}>
                Enregistrer la personnalisation
              </button>
            </div>
          </div>

          {/* Right Column: Specimen Live Preview */}
          <div className={`doc-customizer-specimen-pane ${mobileView === "specimen" ? "show-mobile" : "hide-mobile"}`}>
            <div className="specimen-badge-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px' }}>
              <span>Aperçu en direct (Spécimen)</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--muted, #EAE8E3)', padding: '2px 8px', borderRadius: '6px' }}>
                <button
                  type="button"
                  onClick={() => setSpecimenZoom(z => Math.max(0.3, Math.round((z - 0.1) * 10) / 10))}
                  style={{ border: 'none', background: 'none', padding: '2px 6px', fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer', color: 'var(--foreground)' }}
                  title="Réduire (-)"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() => setSpecimenZoom(0.5)}
                  style={{ border: 'none', background: 'none', fontSize: '0.78rem', fontWeight: '700', minWidth: '38px', textAlign: 'center', cursor: 'pointer', color: 'var(--foreground)' }}
                  title="Réinitialiser à 50%"
                >
                  {Math.round(specimenZoom * 100)}%
                </button>
                <button
                  type="button"
                  onClick={() => setSpecimenZoom(z => Math.min(1.5, Math.round((z + 0.1) * 10) / 10))}
                  style={{ border: 'none', background: 'none', padding: '2px 6px', fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer', color: 'var(--foreground)' }}
                  title="Agrandir (+)"
                >
                  +
                </button>
              </div>
            </div>
            <div className="specimen-scrollable">
              <div
                className="specimen-a4-sheet"
                style={{
                  backgroundColor: customization.bgColor || "#FFFFFF",
                  color: customization.textColor || "#1A1A1A",
                  fontSize: customization.fontSize || "9.5pt",
                  fontFamily: customization.fontFamily || "Inter, sans-serif",
                  transform: `scale(${specimenZoom})`,
                  transformOrigin: "top center",
                  marginBottom: `calc(-1 * (842px * (1 - ${specimenZoom})))`,
                  transition: "transform 0.15s ease-out"
                }}
              >
                {/* ==================== STRUCTURE 1: BANNER ==================== */}
                {customization.structure === "banner" && (
                  <div>
                    {/* Full-width corporate header banner */}
                    <div
                      style={{
                        backgroundColor: customization.primaryColor || "#556B2F",
                        color: "#FFFFFF",
                        padding: "16px 24px",
                        margin: "-28px -24px 14px -24px",
                        borderRadius: "2px 2px 0 0",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      {customization.logoPosition !== "right" ? (
                        <>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            {customization.showLogo && (
                              companyLogo ? (
                                <img
                                  src={companyLogo}
                                  alt="Logo"
                                  style={{
                                    height: `${customization.logoSize || 45}px`,
                                    maxWidth: "140px",
                                    objectFit: "contain",
                                    background: "rgba(255,255,255,0.2)",
                                    padding: "2px 6px",
                                    borderRadius: "4px"
                                  }}
                                />
                              ) : (
                                <div
                                  style={{
                                    backgroundColor: "rgba(255,255,255,0.2)",
                                    color: "#FFFFFF",
                                    fontWeight: "800",
                                    borderRadius: "4px",
                                    padding: "4px 8px",
                                    fontSize: "1.1em",
                                  }}
                                >
                                  {companyDisplayName.substring(0, 8).toUpperCase()}
                                </div>
                              )
                            )}
                            <div>
                              <h1 style={{ fontSize: "1.35em", fontWeight: "800", color: "#FFFFFF", margin: 0 }}>
                                {companyDisplayName}
                              </h1>
                            </div>
                          </div>

                          <div style={{ textAlign: "right" }}>
                            <h2 style={{ fontSize: "1.8em", fontWeight: "800", color: "#FFFFFF", margin: 0, letterSpacing: "2px" }}>
                              {docType === "devis" ? "DEVIS" : "FACTURE"}
                            </h2>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <h2 style={{ fontSize: "1.8em", fontWeight: "800", color: "#FFFFFF", margin: 0, letterSpacing: "2px" }}>
                              {docType === "devis" ? "DEVIS" : "FACTURE"}
                            </h2>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "12px", textAlign: "right" }}>
                            <div>
                              <h1 style={{ fontSize: "1.35em", fontWeight: "800", color: "#FFFFFF", margin: 0 }}>
                                {companyDisplayName}
                              </h1>
                            </div>
                            {customization.showLogo && (
                              companyLogo ? (
                                <img
                                  src={companyLogo}
                                  alt="Logo"
                                  style={{
                                    height: `${customization.logoSize || 45}px`,
                                    maxWidth: "140px",
                                    objectFit: "contain",
                                    background: "rgba(255,255,255,0.2)",
                                    padding: "2px 6px",
                                    borderRadius: "4px"
                                  }}
                                />
                              ) : (
                                <div
                                  style={{
                                    backgroundColor: "rgba(255,255,255,0.2)",
                                    color: "#FFFFFF",
                                    fontWeight: "800",
                                    borderRadius: "4px",
                                    padding: "4px 8px",
                                    fontSize: "1.1em",
                                  }}
                                >
                                  {companyDisplayName.substring(0, 8).toUpperCase()}
                                </div>
                              )
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Metadata Pills Strip */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        backgroundColor: "#F4F4F2",
                        padding: "6px 12px",
                        borderRadius: "4px",
                        fontSize: "0.85em",
                        marginBottom: "12px",
                        color: "#4A4A4A",
                      }}
                    >
                      <div><strong>N° : </strong> {docNumber}</div>
                      <div><strong>Date : </strong> {docDate}</div>
                      {customization.showDeliveryDate && <div><strong>Livraison : </strong> {docDeliveryDate}</div>}
                    </div>

                    {/* Contact & Client Information */}
                    {customization.clientBoxPosition === "right" ? (
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", marginBottom: "14px" }}>
                        <div style={{ flex: 1, fontSize: "0.9em", lineHeight: "1.4", opacity: 0.85 }}>
                          {customization.showAddress && <div>{companyDisplayAddress}</div>}
                          {customization.showSiret && <div>SIRET : {companyDisplaySiret}</div>}
                          {customization.showPhone && <div>Tél : {companyDisplayPhone}</div>}
                          {customization.showEmail && <div>Email : {companyDisplayEmail}</div>}
                        </div>
                        <div
                          style={{
                            flex: 1,
                            backgroundColor: "#FAFAF8",
                            border: "1px solid #EAEAE6",
                            padding: "10px 14px",
                            borderRadius: "6px",
                          }}
                        >
                          <span style={{ fontSize: "0.78em", fontWeight: "700", opacity: 0.65, letterSpacing: "0.5px", textTransform: "uppercase", display: "block", marginBottom: "2px" }}>
                            {docType === "devis" ? "DEVIS POUR :" : "FACTURÉ À :"}
                          </span>
                          <div style={{ fontWeight: "700", fontSize: "1.05em", color: "#1A1A1A" }}>{clientDisplayName}</div>
                          {clientDisplayAddress && <div style={{ fontSize: "0.9em", opacity: 0.85 }}>{clientDisplayAddress}</div>}
                          {clientDisplayEmail && <div style={{ fontSize: "0.9em", opacity: 0.85 }}>{clientDisplayEmail}</div>}
                          {clientDisplayPhone && <div style={{ fontSize: "0.9em", opacity: 0.85 }}>{clientDisplayPhone}</div>}
                        </div>
                      </div>
                    ) : (
                      <div style={{ marginBottom: "14px" }}>
                        <div style={{ fontSize: "0.9em", lineHeight: "1.4", opacity: 0.85, marginBottom: "10px" }}>
                          {customization.showAddress && <div>{companyDisplayAddress}</div>}
                          {customization.showSiret && <div>SIRET : {companyDisplaySiret}</div>}
                          {customization.showPhone && <div>Tél : {companyDisplayPhone}</div>}
                          {customization.showEmail && <div>Email : {companyDisplayEmail}</div>}
                        </div>
                        <div
                          style={{
                            backgroundColor: "#FAFAF8",
                            border: "1px solid #EAEAE6",
                            padding: "10px 14px",
                            borderRadius: "6px",
                          }}
                        >
                          <span style={{ fontSize: "0.78em", fontWeight: "700", opacity: 0.65, letterSpacing: "0.5px", textTransform: "uppercase", display: "block", marginBottom: "2px" }}>
                            {docType === "devis" ? "DEVIS POUR :" : "FACTURÉ À :"}
                          </span>
                          <div style={{ fontWeight: "700", fontSize: "1.05em", color: "#1A1A1A" }}>{clientDisplayName}</div>
                          {clientDisplayAddress && <div style={{ fontSize: "0.9em", opacity: 0.85 }}>{clientDisplayAddress}</div>}
                          {clientDisplayEmail && <div style={{ fontSize: "0.9em", opacity: 0.85 }}>{clientDisplayEmail}</div>}
                          {clientDisplayPhone && <div style={{ fontSize: "0.9em", opacity: 0.85 }}>{clientDisplayPhone}</div>}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ==================== STRUCTURE 2: MODERN ==================== */}
                {customization.structure === "modern" && (
                  <div>
                    {/* Modern Top Header with Capsule Badge */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                      {customization.logoPosition !== "right" ? (
                        <>
                          <div>
                            {customization.showLogo && (
                              companyLogo ? (
                                <img
                                  src={companyLogo}
                                  alt="Logo"
                                  style={{
                                    height: `${customization.logoSize || 45}px`,
                                    maxWidth: "180px",
                                    objectFit: "contain",
                                    marginBottom: "4pt",
                                  }}
                                />
                              ) : (
                                <div
                                  style={{
                                    backgroundColor: customization.primaryColor || "#556B2F",
                                    color: "#FFF",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontWeight: "700",
                                    borderRadius: "6px",
                                    padding: "4px 8px",
                                    height: `${customization.logoSize || 45}px`,
                                    minWidth: `${(customization.logoSize || 45) * 1.8}px`,
                                    marginBottom: "4pt",
                                    fontSize: "1.1em",
                                  }}
                                >
                                  {companyDisplayName.substring(0, 10).toUpperCase()}
                                </div>
                              )
                            )}
                            <h1 style={{ fontSize: "1.35em", fontWeight: "800", color: customization.primaryColor || "#556B2F", margin: 0 }}>
                              {companyDisplayName}
                            </h1>
                          </div>

                          <div style={{ textAlign: "right" }}>
                            <div>
                              <div
                                style={{
                                  display: "inline-block",
                                  backgroundColor: customization.primaryColor || "#556B2F",
                                  color: "#FFFFFF",
                                  padding: "6px 16px",
                                  borderRadius: "20px",
                                  fontWeight: "800",
                                  fontSize: "1.05em",
                                  letterSpacing: "0.5px",
                                  marginBottom: "4px",
                                }}
                              >
                                {docType === "devis" ? "DEVIS" : "FACTURE"} N° {docNumber}
                              </div>
                              <div style={{ fontSize: "0.88em", opacity: 0.85 }}>
                                Date : <strong>{docDate}</strong> {customization.showDeliveryDate && <>• Échéance : <strong>{docDeliveryDate}</strong></>}
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ textAlign: "left" }}>
                            <div>
                              <div
                                style={{
                                  display: "inline-block",
                                  backgroundColor: customization.primaryColor || "#556B2F",
                                  color: "#FFFFFF",
                                  padding: "6px 16px",
                                  borderRadius: "20px",
                                  fontWeight: "800",
                                  fontSize: "1.05em",
                                  letterSpacing: "0.5px",
                                  marginBottom: "4px",
                                }}
                              >
                                {docType === "devis" ? "DEVIS" : "FACTURE"} N° {docNumber}
                              </div>
                              <div style={{ fontSize: "0.88em", opacity: 0.85 }}>
                                Date : <strong>{docDate}</strong> {customization.showDeliveryDate && <>• Échéance : <strong>{docDeliveryDate}</strong></>}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", textAlign: "right" }}>
                            {customization.showLogo && (
                              companyLogo ? (
                                <img
                                  src={companyLogo}
                                  alt="Logo"
                                  style={{
                                    height: `${customization.logoSize || 45}px`,
                                    maxWidth: "180px",
                                    objectFit: "contain",
                                    marginBottom: "4pt",
                                  }}
                                />
                              ) : (
                                <div
                                  style={{
                                    backgroundColor: customization.primaryColor || "#556B2F",
                                    color: "#FFF",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontWeight: "700",
                                    borderRadius: "6px",
                                    padding: "4px 8px",
                                    height: `${customization.logoSize || 45}px`,
                                    minWidth: `${(customization.logoSize || 45) * 1.8}px`,
                                    marginBottom: "4pt",
                                    fontSize: "1.1em",
                                  }}
                                >
                                  {companyDisplayName.substring(0, 10).toUpperCase()}
                                </div>
                              )
                            )}
                            <h1 style={{ fontSize: "1.35em", fontWeight: "800", color: customization.primaryColor || "#556B2F", margin: 0 }}>
                              {companyDisplayName}
                            </h1>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Modern 2-Card Flex Layout */}
                    {customization.clientBoxPosition === "right" ? (
                      <div style={{ display: "flex", gap: "14px", marginBottom: "14px" }}>
                        <div
                          style={{
                            flex: 1,
                            backgroundColor: "#FAFAF8",
                            borderLeft: `4px solid ${customization.primaryColor || "#556B2F"}`,
                            padding: "10px 14px",
                            borderRadius: "6px",
                            fontSize: "0.9em",
                            lineHeight: "1.4",
                          }}
                        >
                          <span style={{ fontSize: "0.78em", fontWeight: "700", color: customization.primaryColor || "#556B2F", textTransform: "uppercase", display: "block", marginBottom: "2px" }}>
                            Émetteur
                          </span>
                          <div style={{ fontWeight: "700", color: "#1A1A1A" }}>{companyDisplayName}</div>
                          {customization.showAddress && <div>{companyDisplayAddress}</div>}
                          {customization.showSiret && <div>SIRET : {companyDisplaySiret}</div>}
                          {customization.showPhone && <div>Tél : {companyDisplayPhone}</div>}
                          {customization.showEmail && <div>Email : {companyDisplayEmail}</div>}
                        </div>

                        <div
                          style={{
                            flex: 1,
                            backgroundColor: `${customization.primaryColor || "#556B2F"}10`,
                            border: `1px solid ${customization.primaryColor || "#556B2F"}30`,
                            padding: "10px 14px",
                            borderRadius: "6px",
                            fontSize: "0.9em",
                            lineHeight: "1.4",
                          }}
                        >
                          <span style={{ fontSize: "0.78em", fontWeight: "700", color: customization.primaryColor || "#556B2F", textTransform: "uppercase", display: "block", marginBottom: "2px" }}>
                            {docType === "devis" ? "DEVIS POUR :" : "FACTURÉ À :"}
                          </span>
                          <div style={{ fontWeight: "700", fontSize: "1.05em", color: "#1A1A1A" }}>{clientDisplayName}</div>
                          {clientDisplayAddress && <div>{clientDisplayAddress}</div>}
                          {clientDisplayEmail && <div>{clientDisplayEmail}</div>}
                          {clientDisplayPhone && <div>{clientDisplayPhone}</div>}
                        </div>
                      </div>
                    ) : (
                      <div style={{ marginBottom: "14px" }}>
                        <div
                          style={{
                            backgroundColor: "#FAFAF8",
                            borderLeft: `4px solid ${customization.primaryColor || "#556B2F"}`,
                            padding: "10px 14px",
                            borderRadius: "6px",
                            fontSize: "0.9em",
                            lineHeight: "1.4",
                            marginBottom: "10px",
                          }}
                        >
                          <span style={{ fontSize: "0.78em", fontWeight: "700", color: customization.primaryColor || "#556B2F", textTransform: "uppercase", display: "block", marginBottom: "2px" }}>
                            Émetteur
                          </span>
                          <div style={{ fontWeight: "700", color: "#1A1A1A" }}>{companyDisplayName}</div>
                          {customization.showAddress && <div>{companyDisplayAddress}</div>}
                          {customization.showSiret && <div>SIRET : {companyDisplaySiret}</div>}
                          {customization.showPhone && <div>Tél : {companyDisplayPhone}</div>}
                          {customization.showEmail && <div>Email : {companyDisplayEmail}</div>}
                        </div>

                        <div
                          style={{
                            backgroundColor: `${customization.primaryColor || "#556B2F"}10`,
                            border: `1px solid ${customization.primaryColor || "#556B2F"}30`,
                            padding: "10px 14px",
                            borderRadius: "6px",
                            fontSize: "0.9em",
                            lineHeight: "1.4",
                          }}
                        >
                          <span style={{ fontSize: "0.78em", fontWeight: "700", color: customization.primaryColor || "#556B2F", textTransform: "uppercase", display: "block", marginBottom: "2px" }}>
                            {docType === "devis" ? "DEVIS POUR :" : "FACTURÉ À :"}
                          </span>
                          <div style={{ fontWeight: "700", fontSize: "1.05em", color: "#1A1A1A" }}>{clientDisplayName}</div>
                          {clientDisplayAddress && <div>{clientDisplayAddress}</div>}
                          {clientDisplayEmail && <div>{clientDisplayEmail}</div>}
                          {clientDisplayPhone && <div>{clientDisplayPhone}</div>}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ==================== STRUCTURE 3: MINIMAL ==================== */}
                {customization.structure === "minimal" && (
                  <div>
                    {/* Minimal Typographic Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", paddingBottom: "10px", borderBottom: `1.5px solid #EAEAE6`, marginBottom: "14px" }}>
                      {customization.logoPosition !== "right" ? (
                        <>
                          <div>
                            {customization.showLogo && (
                              companyLogo ? (
                                <img
                                  src={companyLogo}
                                  alt="Logo"
                                  style={{
                                    height: `${customization.logoSize || 40}px`,
                                    maxWidth: "160px",
                                    objectFit: "contain",
                                    marginBottom: "4pt",
                                  }}
                                />
                              ) : null
                            )}
                            <h1 style={{ fontSize: "1.3em", fontWeight: "800", color: customization.primaryColor || "#556B2F", margin: 0, letterSpacing: "-0.02em" }}>
                              {companyDisplayName}
                            </h1>
                          </div>

                          <div style={{ textAlign: "right" }}>
                            <h2 style={{ fontSize: "2em", fontWeight: "300", color: customization.primaryColor || "#556B2F", margin: 0, letterSpacing: "3px" }}>
                              {docType === "devis" ? "DEVIS" : "FACTURE"}
                            </h2>
                            <div style={{ fontSize: "0.85em", color: "#666", marginTop: "2px" }}>
                              N° {docNumber} • {docDate}
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ textAlign: "left" }}>
                            <h2 style={{ fontSize: "2em", fontWeight: "300", color: customization.primaryColor || "#556B2F", margin: 0, letterSpacing: "3px" }}>
                              {docType === "devis" ? "DEVIS" : "FACTURE"}
                            </h2>
                            <div style={{ fontSize: "0.85em", color: "#666", marginTop: "2px" }}>
                              N° {docNumber} • {docDate}
                            </div>
                          </div>

                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", textAlign: "right" }}>
                            {customization.showLogo && (
                              companyLogo ? (
                                <img
                                  src={companyLogo}
                                  alt="Logo"
                                  style={{
                                    height: `${customization.logoSize || 40}px`,
                                    maxWidth: "160px",
                                    objectFit: "contain",
                                    marginBottom: "4pt",
                                  }}
                                />
                              ) : null
                            )}
                            <h1 style={{ fontSize: "1.3em", fontWeight: "800", color: customization.primaryColor || "#556B2F", margin: 0, letterSpacing: "-0.02em" }}>
                              {companyDisplayName}
                            </h1>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Minimal 2-Column Info without background boxes */}
                    {customization.clientBoxPosition === "right" ? (
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "20px", marginBottom: "14px" }}>
                        <div style={{ flex: 1, fontSize: "0.88em", lineHeight: "1.4", color: "#4A4A4A" }}>
                          {customization.showAddress && <div>{companyDisplayAddress}</div>}
                          {customization.showSiret && <div>SIRET : {companyDisplaySiret}</div>}
                          {customization.showPhone && <div>Tél : {companyDisplayPhone}</div>}
                          {customization.showEmail && <div>Email : {companyDisplayEmail}</div>}
                        </div>

                        <div style={{ flex: 1, fontSize: "0.88em", lineHeight: "1.4" }}>
                          <span style={{ fontSize: "0.78em", fontWeight: "700", color: customization.primaryColor || "#556B2F", letterSpacing: "1px", textTransform: "uppercase", display: "block", marginBottom: "2px" }}>
                            {docType === "devis" ? "Destinataire :" : "Client :"}
                          </span>
                          <div style={{ fontWeight: "700", fontSize: "1.05em", color: "#1A1A1A" }}>{clientDisplayName}</div>
                          {clientDisplayAddress && <div style={{ color: "#4A4A4A" }}>{clientDisplayAddress}</div>}
                          {clientDisplayEmail && <div style={{ color: "#4A4A4A" }}>{clientDisplayEmail}</div>}
                          {clientDisplayPhone && <div style={{ color: "#4A4A4A" }}>{clientDisplayPhone}</div>}
                        </div>
                      </div>
                    ) : (
                      <div style={{ marginBottom: "14px" }}>
                        <div style={{ fontSize: "0.88em", lineHeight: "1.4", color: "#4A4A4A", marginBottom: "10px" }}>
                          {customization.showAddress && <div>{companyDisplayAddress}</div>}
                          {customization.showSiret && <div>SIRET : {companyDisplaySiret}</div>}
                          {customization.showPhone && <div>Tél : {companyDisplayPhone}</div>}
                          {customization.showEmail && <div>Email : {companyDisplayEmail}</div>}
                        </div>

                        <div style={{ borderTop: "1px dashed #E0E0E0", paddingTop: "8px", fontSize: "0.88em", lineHeight: "1.4" }}>
                          <span style={{ fontSize: "0.78em", fontWeight: "700", color: customization.primaryColor || "#556B2F", letterSpacing: "1px", textTransform: "uppercase", display: "block", marginBottom: "2px" }}>
                            {docType === "devis" ? "Destinataire :" : "Client :"}
                          </span>
                          <div style={{ fontWeight: "700", fontSize: "1.05em", color: "#1A1A1A" }}>{clientDisplayName}</div>
                          {clientDisplayAddress && <div style={{ color: "#4A4A4A" }}>{clientDisplayAddress}</div>}
                          {clientDisplayEmail && <div style={{ color: "#4A4A4A" }}>{clientDisplayEmail}</div>}
                          {clientDisplayPhone && <div style={{ color: "#4A4A4A" }}>{clientDisplayPhone}</div>}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ==================== STRUCTURE 4: CLASSIC (DEFAULT) ==================== */}
                {(customization.structure === "classic" || !customization.structure) && (
                  <div>
                    {/* Header Row */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: "12pt",
                      }}
                    >
                      {customization.logoPosition !== "right" ? (
                        <>
                          <div style={{ flex: 1 }}>
                            {customization.showLogo && (
                              companyLogo ? (
                                <img
                                  src={companyLogo}
                                  alt="Logo"
                                  style={{
                                    height: `${customization.logoSize || 45}px`,
                                    maxWidth: "180px",
                                    objectFit: "contain",
                                    marginBottom: "6pt",
                                  }}
                                />
                              ) : (
                                <div
                                  style={{
                                    backgroundColor: customization.primaryColor || "#556B2F",
                                    color: "#FFF",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontWeight: "700",
                                    borderRadius: "4px",
                                    padding: "4px 8px",
                                    height: `${customization.logoSize || 45}px`,
                                    minWidth: `${(customization.logoSize || 45) * 1.8}px`,
                                    marginBottom: "6pt",
                                    fontSize: "1.1em",
                                  }}
                                >
                                  {companyDisplayName.substring(0, 10).toUpperCase()}
                                </div>
                              )
                            )}
                            <h1
                              style={{
                                fontSize: "1.3em",
                                fontWeight: "800",
                                color: customization.primaryColor || "#556B2F",
                                margin: 0,
                              }}
                            >
                              {companyDisplayName}
                            </h1>
                            <div style={{ fontSize: "0.9em", lineHeight: "1.4", opacity: 0.85, marginTop: "2pt" }}>
                              {customization.showAddress && <div>{companyDisplayAddress}</div>}
                              {customization.showSiret && <div>SIRET : {companyDisplaySiret}</div>}
                              {customization.showPhone && <div>Tél : {companyDisplayPhone}</div>}
                              {customization.showEmail && <div>Email : {companyDisplayEmail}</div>}
                            </div>
                          </div>

                          <div style={{ textAlign: "right" }}>
                            <h2
                              style={{
                                fontSize: "1.8em",
                                fontWeight: "800",
                                color: customization.primaryColor || "#556B2F",
                                margin: 0,
                                textTransform: "uppercase",
                              }}
                            >
                              {docType === "devis" ? "DEVIS" : "FACTURE"}
                            </h2>
                            <div style={{ fontSize: "0.95em", marginTop: "4pt" }}>
                              <div>
                                <strong>N° : </strong> {docNumber}
                              </div>
                              <div>
                                <strong>Date : </strong> {docDate}
                              </div>
                              {customization.showDeliveryDate && (
                                <div>
                                  <strong>Livraison : </strong> {docDeliveryDate}
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ textAlign: "left" }}>
                            <h2
                              style={{
                                fontSize: "1.8em",
                                fontWeight: "800",
                                color: customization.primaryColor || "#556B2F",
                                margin: 0,
                                textTransform: "uppercase",
                              }}
                            >
                              {docType === "devis" ? "DEVIS" : "FACTURE"}
                            </h2>
                            <div style={{ fontSize: "0.95em", marginTop: "4pt" }}>
                              <div>
                                <strong>N° : </strong> {docNumber}
                              </div>
                              <div>
                                <strong>Date : </strong> {docDate}
                              </div>
                              {customization.showDeliveryDate && (
                                <div>
                                  <strong>Livraison : </strong> {docDeliveryDate}
                                </div>
                              )}
                            </div>
                          </div>

                          <div style={{ flex: 1, textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                            {customization.showLogo && (
                              companyLogo ? (
                                <img
                                  src={companyLogo}
                                  alt="Logo"
                                  style={{
                                    height: `${customization.logoSize || 45}px`,
                                    maxWidth: "180px",
                                    objectFit: "contain",
                                    marginBottom: "6pt",
                                  }}
                                />
                              ) : (
                                <div
                                  style={{
                                    backgroundColor: customization.primaryColor || "#556B2F",
                                    color: "#FFF",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontWeight: "700",
                                    borderRadius: "4px",
                                    padding: "4px 8px",
                                    height: `${customization.logoSize || 45}px`,
                                    minWidth: `${(customization.logoSize || 45) * 1.8}px`,
                                    marginBottom: "6pt",
                                    fontSize: "1.1em",
                                  }}
                                >
                                  {companyDisplayName.substring(0, 10).toUpperCase()}
                                </div>
                              )
                            )}
                            <h1
                              style={{
                                fontSize: "1.3em",
                                fontWeight: "800",
                                color: customization.primaryColor || "#556B2F",
                                margin: 0,
                              }}
                            >
                              {companyDisplayName}
                            </h1>
                            <div style={{ fontSize: "0.9em", lineHeight: "1.4", opacity: 0.85, marginTop: "2pt" }}>
                              {customization.showAddress && <div>{companyDisplayAddress}</div>}
                              {customization.showSiret && <div>SIRET : {companyDisplaySiret}</div>}
                              {customization.showPhone && <div>Tél : {companyDisplayPhone}</div>}
                              {customization.showEmail && <div>Email : {companyDisplayEmail}</div>}
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Client Box: Right vs Bottom */}
                    {customization.clientBoxPosition === "right" ? (
                      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "12px" }}>
                        <div
                          style={{
                            width: "55%",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "flex-start",
                            gap: "3px",
                            backgroundColor: "#FAFAF8",
                            border: "1px solid #EAEAE6",
                            padding: "10px 14px",
                            borderRadius: "6px",
                            textAlign: "left",
                          }}
                        >
                          <span style={{ fontSize: "0.78em", fontWeight: "700", opacity: 0.65, letterSpacing: "0.5px", textTransform: "uppercase", display: "block", marginBottom: "2px" }}>
                            {docType === "devis" ? "DEVIS POUR :" : "FACTURÉ À :"}
                          </span>
                          <div style={{ fontWeight: "700", fontSize: "1.1em", color: "#1A1A1A", lineHeight: 1.3 }}>
                            {clientDisplayName}
                          </div>
                          {clientDisplayAddress && (
                            <div style={{ fontSize: "0.92em", opacity: 0.85, lineHeight: 1.35 }}>
                              {clientDisplayAddress}
                            </div>
                          )}
                          {clientDisplayEmail && (
                            <div style={{ fontSize: "0.92em", opacity: 0.85, lineHeight: 1.35 }}>
                              {clientDisplayEmail}
                            </div>
                          )}
                          {clientDisplayPhone && (
                            <div style={{ fontSize: "0.92em", opacity: 0.85, lineHeight: 1.35 }}>
                              {clientDisplayPhone}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-start",
                          gap: "3px",
                          backgroundColor: "#FAFAF8",
                          border: "1px solid #EAEAE6",
                          padding: "10px 14px",
                          borderRadius: "6px",
                          margin: "12px 0",
                          textAlign: "left",
                        }}
                      >
                        <span style={{ fontSize: "0.78em", fontWeight: "700", opacity: 0.65, letterSpacing: "0.5px", textTransform: "uppercase", display: "block", marginBottom: "2px" }}>
                          {docType === "devis" ? "DEVIS POUR :" : "FACTURÉ À :"}
                        </span>
                        <div style={{ fontWeight: "700", fontSize: "1.1em", color: "#1A1A1A", lineHeight: 1.3 }}>
                          {clientDisplayName}
                        </div>
                        {clientDisplayAddress && (
                          <div style={{ fontSize: "0.92em", opacity: 0.85, lineHeight: 1.35 }}>
                            {clientDisplayAddress}
                          </div>
                        )}
                        {clientDisplayEmail && (
                          <div style={{ fontSize: "0.92em", opacity: 0.85, lineHeight: 1.35 }}>
                            {clientDisplayEmail}
                          </div>
                        )}
                        {clientDisplayPhone && (
                          <div style={{ fontSize: "0.92em", opacity: 0.85, lineHeight: 1.35 }}>
                            {clientDisplayPhone}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Items Table */}
                <table style={{ width: "100%", borderCollapse: "collapse", margin: "14px 0", fontSize: "0.95em" }}>
                  <thead>
                    <tr
                      style={{
                        backgroundColor: customization.primaryColor,
                        color: "#FFFFFF",
                      }}
                    >
                      <th style={{ textAlign: "left", padding: "6px 8px", borderRadius: "3px 0 0 3px" }}>Description</th>
                      <th style={{ textAlign: "center", padding: "6px", width: "40px", whiteSpace: "nowrap" }}>Qté</th>
                      <th style={{ textAlign: "right", padding: "6px 8px", minWidth: "75px", whiteSpace: "nowrap" }}>Unit. HT</th>
                      <th style={{ textAlign: "right", padding: "6px 8px", minWidth: "75px", borderRadius: "0 3px 3px 0", whiteSpace: "nowrap" }}>Total HT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doc?.lines && doc.lines.length > 0 ? (
                      doc.lines.map((line, i) => {
                        const q = Number(line.quantity || line.qty || 1);
                        const p = Number(line.unitPrice) || 0;
                        return (
                          <tr key={i} style={{ borderBottom: "1px solid #EAEAE6" }}>
                            <td style={{ padding: "6px 8px" }}>
                              <div style={{ fontWeight: 600 }}>{line.description || "Prestation"}</div>
                              {line.reference && <div style={{ fontSize: "0.75em", color: "var(--muted-foreground)" }}>Réf: {line.reference}</div>}
                            </td>
                            <td style={{ textAlign: "center", padding: "6px", whiteSpace: "nowrap" }}>{q}</td>
                            <td style={{ textAlign: "right", padding: "6px 8px", whiteSpace: "nowrap" }}>{p.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</td>
                            <td style={{ textAlign: "right", padding: "6px 8px", whiteSpace: "nowrap" }}>{(p * q).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr style={{ borderBottom: "1px solid #EAEAE6" }}>
                        <td style={{ padding: "6px 8px" }}>{doc?.interventionType || doc?.subject || "Forfait Prestation"}</td>
                        <td style={{ textAlign: "center", padding: "6px", whiteSpace: "nowrap" }}>1</td>
                        <td style={{ textAlign: "right", padding: "6px 8px", whiteSpace: "nowrap" }}>{docTotalHt.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</td>
                        <td style={{ textAlign: "right", padding: "6px 8px", whiteSpace: "nowrap" }}>{docTotalHt.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Total Box */}
                <div style={{ display: "flex", justifyContent: "flex-end", margin: "12px 0" }}>
                  <table style={{ width: "auto", minWidth: "210px", fontSize: "0.95em" }}>
                    <tbody>
                      <tr>
                        <td style={{ whiteSpace: "nowrap", padding: "4px 8px" }}>Sous-total HT :</td>
                        <td style={{ textAlign: "right", whiteSpace: "nowrap", padding: "4px 8px" }}>{docTotalHt.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</td>
                      </tr>
                      <tr>
                        <td style={{ whiteSpace: "nowrap", padding: "4px 8px" }}>TVA ({docTvaRate}%) :</td>
                        <td style={{ textAlign: "right", whiteSpace: "nowrap", padding: "4px 8px" }}>{docTotalTva.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</td>
                      </tr>
                      <tr
                        style={{
                          backgroundColor: customization.primaryColor,
                          color: "#FFFFFF",
                          fontWeight: "700",
                        }}
                      >
                        <td style={{ padding: "6px 8px", borderRadius: "3px 0 0 3px", whiteSpace: "nowrap", fontSize: "1.05em" }}>TOTAL TTC :</td>
                        <td style={{ textAlign: "right", padding: "6px 8px", borderRadius: "0 3px 3px 0", whiteSpace: "nowrap", fontSize: "1.05em" }}>{docTotalTtc.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Signatures Preview Block (Company & Buyer / Client) */}
                {(customization.showCompanySignature !== false || customization.showClientSignature !== false) && (() => {
                  const compPos = customization.signaturePosition || "left";
                  const clPos = customization.clientSignaturePosition || "right";

                  const renderCompanySig = () => (
                    <div key="comp-sig" style={{ width: "100%", maxWidth: "230px" }}>
                      <div style={{ fontWeight: "700", marginBottom: "4px", fontSize: "0.9em" }}>Pour l'entreprise :</div>
                      <div
                        style={{
                          height: "54px",
                          border: "1px dashed #DDD",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: "6px",
                          backgroundColor: "#FAFAF8",
                          padding: "4px",
                        }}
                      >
                        {companySignature ? (
                          <img src={companySignature} alt="Signature Entreprise" style={{ maxHeight: "48px", maxWidth: "90%", objectFit: "contain" }} />
                        ) : (
                          <span style={{ color: "#888", fontSize: "0.85em", fontStyle: "italic" }}>{companyDisplayName}</span>
                        )}
                      </div>
                    </div>
                  );

                  const renderClientSig = () => (
                    <div key="client-sig" style={{ width: "100%", maxWidth: "230px" }}>
                      <div style={{ fontWeight: "700", marginBottom: "4px", fontSize: "0.9em" }}>
                        {docType === "devis" ? "Bon pour accord / Le Client :" : "Signature de l'acheteur :"}
                      </div>
                      <div
                        style={{
                          height: "54px",
                          border: "1px dashed #DDD",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: "6px",
                          backgroundColor: "#FAFAF8",
                          padding: "4px",
                          color: "#888",
                          fontSize: "0.82em",
                        }}
                      >
                        {doc?.signatureUrl || doc?.clientSignatureUrl ? (
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%" }}>
                            <img
                              src={doc.signatureUrl || doc.clientSignatureUrl}
                              alt="Signature Client"
                              style={{ maxHeight: "36px", maxWidth: "90%", objectFit: "contain" }}
                            />
                            <span style={{ fontSize: "7pt", color: "#16a34a", fontWeight: 600, marginTop: "2px" }}>
                              ✓ Signé le {new Date(doc.signedAt || doc.acceptedAt || doc.date || doc.createdAt || Date.now()).toLocaleDateString("fr-FR")}
                            </span>
                          </div>
                        ) : (
                          <>
                            <span style={{ fontStyle: "italic", fontSize: "0.78em" }}>Mention "Bon pour accord"</span>
                            <span style={{ fontSize: "0.72em", marginTop: "2px", opacity: 0.8 }}>Date et signature</span>
                          </>
                        )}
                      </div>
                    </div>
                  );

                  const leftItems = [];
                  const rightItems = [];

                  if (customization.showCompanySignature !== false) {
                    if (compPos === "left") leftItems.push(renderCompanySig());
                    else rightItems.push(renderCompanySig());
                  }

                  const isClientSigVisible = customization.showClientSignature !== undefined
                    ? customization.showClientSignature
                    : (docType === "devis");

                  if (isClientSigVisible) {
                    if (clPos === "left") leftItems.push(renderClientSig());
                    else rightItems.push(renderClientSig());
                  }

                  return (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "24px",
                        margin: "18px 0",
                        fontSize: "0.85em",
                        borderTop: "1px dashed #E0E0E0",
                        paddingTop: "14px",
                      }}
                    >
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "10px", alignItems: "flex-start", textAlign: "left" }}>
                        {leftItems}
                      </div>
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "10px", alignItems: "flex-end", textAlign: "right" }}>
                        {rightItems}
                      </div>
                    </div>
                  );
                })()}

                {/* Footer Section */}
                {customization.showPaymentConditions && (
                  <div
                    style={{
                      fontSize: "0.85em",
                      borderTop: "1px solid #E5E5E5",
                      paddingTop: "10px",
                      marginTop: "auto",
                      opacity: 0.85,
                      lineHeight: "1.45",
                    }}
                  >
                    <div>
                      <strong>Conditions de paiement : </strong> Paiement à 30 jours
                    </div>
                    {customization.showIban && <div><strong>IBAN : </strong>{realIban}</div>}
                    {customization.showAgaMention && (
                      <div style={{ fontStyle: "italic", marginTop: "2pt" }}>
                        Membre d'une association agréée, le règlement par chèque est accepté.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
