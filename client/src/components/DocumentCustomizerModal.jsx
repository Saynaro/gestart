import React, { useState } from "react";
import { X, Check, Palette, Type, Layout, Eye, Sliders, Image, Sparkles } from "lucide-react";
import { useDocumentCustomization, getEffectiveCustomization } from "../utils/documentCustomization";
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
  { label: "Inter (Moderne)", value: "Inter, sans-serif" },
  { label: "Roboto (Clean)", value: "Roboto, sans-serif" },
  { label: "Space Grotesk (Tech)", value: "'Space Grotesk', monospace" },
  { label: "Georgia (Serif Classic)", value: "Georgia, serif" },
];

const STRUCTURE_PRESETS = [
  { id: "classic", name: "Classique", desc: "Mise en page épurée et équilibrée" },
  { id: "modern", name: "Moderne", desc: "En-tête dynamique et bordures teintées" },
  { id: "minimal", name: "Minimaliste", desc: "Design sobre axé sur le contenu" },
  { id: "banner", name: "Bannière", desc: "Bandeau d'accentuation en haut" },
];

export default function DocumentCustomizerModal({ onClose, docType = "facture", doc = null, onSaveDocCustomization = null }) {
  const [globalCustomization, updateGlobalCustomization] = useDocumentCustomization();
  const [customization, setCustomization] = useState(() => getEffectiveCustomization(doc, globalCustomization));
  const [activeTab, setActiveTab] = useState("couleurs");
  const [mobileView, setMobileView] = useState("controls");
  const [specimenZoom, setSpecimenZoom] = useState(0.5);

  const handleChange = (key, value) => {
    const newSettings = { ...customization, [key]: value };
    setCustomization(newSettings);
    if (doc && onSaveDocCustomization) {
      onSaveDocCustomization(newSettings);
    } else {
      updateGlobalCustomization(newSettings);
    }
  };

  return (
    <div className="doc-customizer-overlay" onClick={onClose}>
      <div className="doc-customizer-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="doc-customizer-header">
          <div className="customizer-header-title">
            <Sparkles size={20} className="customizer-sparkle-icon" />
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
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Save Action */}
            <div className="customizer-footer-actions">
              <button className="save-customizer-btn" onClick={onClose}>
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
                  fontSize: customization.fontSize || "9pt",
                  fontFamily: customization.fontFamily || "Inter, sans-serif",
                  transform: `scale(${specimenZoom})`,
                  transformOrigin: "top center",
                  marginBottom: `calc(-1 * (735px * (1 - ${specimenZoom})))`,
                  transition: "transform 0.15s ease-out"
                }}
              >
                {/* Banner header accent if banner structure */}
                {customization.structure === "banner" && (
                  <div
                    style={{
                      height: "8px",
                      backgroundColor: customization.primaryColor,
                      margin: "-20px -18px 14px -18px",
                      borderRadius: "2px 2px 0 0",
                    }}
                  />
                )}

                {/* Header Row */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "12pt",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    {customization.showLogo && customization.logoPosition !== "right" && (
                      <div
                        style={{
                          backgroundColor: customization.primaryColor,
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
                          fontSize: "10pt",
                        }}
                      >
                        CLIMPRO
                      </div>
                    )}
                    <div style={{ fontWeight: "700", fontSize: "10pt", color: customization.primaryColor }}>
                      Dupont Climatisation
                    </div>
                    <div style={{ fontSize: "8pt", opacity: 0.8, lineHeight: 1.3 }}>
                      {customization.showAddress && <div>88 Rue de l'Aviation, 75015 Paris</div>}
                      {customization.showSiret && <div>SIRET : 849 203 103 00021</div>}
                      {customization.showPhone && <div>Tél : 06 51 60 43 16</div>}
                      {customization.showEmail && <div>Email : contact@climpro.fr</div>}
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", textAlign: "right" }}>
                    {customization.showLogo && customization.logoPosition === "right" && (
                      <div
                        style={{
                          backgroundColor: customization.primaryColor,
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
                          fontSize: "10pt",
                        }}
                      >
                        CLIMPRO
                      </div>
                    )}
                    <h2
                      style={{
                        fontSize: "16pt",
                        fontWeight: "800",
                        color: customization.primaryColor,
                        margin: 0,
                        textTransform: "uppercase",
                      }}
                    >
                      {docType === "devis" ? "DEVIS" : "FACTURE"}
                    </h2>
                    <div style={{ fontSize: "8.5pt", marginTop: "4pt" }}>
                      <div>
                        <strong>N° : </strong> {docType === "devis" ? "DEV-2026-0001" : "INV-2026-0001"}
                      </div>
                      <div>
                        <strong>Date : </strong> 01/08/2026
                      </div>
                      {customization.showDeliveryDate && (
                        <div>
                          <strong>Livraison : </strong> 15/08/2026
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Client Box */}
                <div
                  style={{
                    backgroundColor: customization.structure === "modern" ? `${customization.primaryColor}10` : "#FAFAF8",
                    padding: "8pt 10pt",
                    borderRadius: "6px",
                    margin: "10pt 0",
                  }}
                >
                  <span style={{ fontSize: "7.5pt", fontWeight: "700", opacity: 0.6 }}>
                    {docType === "devis" ? "DEVIS POUR :" : "FACTURÉ À :"}
                  </span>
                  <div style={{ fontWeight: "700", fontSize: "10pt" }}>Jean Dupont</div>
                  <div style={{ fontSize: "8.5pt", opacity: 0.85 }}>
                    12 Rue des Fleurs, 75001 Paris<br />
                    jean.dupont@email.com
                  </div>
                </div>

                {/* Items Table */}
                <table style={{ width: "100%", borderCollapse: "collapse", margin: "12pt 0", fontSize: "8.5pt" }}>
                  <thead>
                    <tr
                      style={{
                        backgroundColor: customization.primaryColor,
                        color: "#FFFFFF",
                      }}
                    >
                      <th style={{ textAlign: "left", padding: "6pt 8pt", borderRadius: "3px 0 0 3px" }}>Description</th>
                      <th style={{ textAlign: "center", padding: "6pt", width: "40px", whiteSpace: "nowrap" }}>Qté</th>
                      <th style={{ textAlign: "right", padding: "6pt 8pt", minWidth: "75px", whiteSpace: "nowrap" }}>Unit. HT</th>
                      <th style={{ textAlign: "right", padding: "6pt 8pt", minWidth: "75px", borderRadius: "0 3px 3px 0", whiteSpace: "nowrap" }}>Total HT</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: "1px solid #EAEAE6" }}>
                      <td style={{ padding: "6pt 8pt" }}>Forfait Entretien annuel PAC Daikin</td>
                      <td style={{ textAlign: "center", padding: "6pt", whiteSpace: "nowrap" }}>1</td>
                      <td style={{ textAlign: "right", padding: "6pt 8pt", whiteSpace: "nowrap" }}>100,00 €</td>
                      <td style={{ textAlign: "right", padding: "6pt 8pt", whiteSpace: "nowrap" }}>100,00 €</td>
                    </tr>
                  </tbody>
                </table>

                {/* Total Box */}
                <div style={{ display: "flex", justifyContent: "flex-end", margin: "10pt 0" }}>
                  <table style={{ width: "auto", minWidth: "210px", fontSize: "8.5pt" }}>
                    <tbody>
                      <tr>
                        <td style={{ whiteSpace: "nowrap", padding: "3pt 6pt" }}>Sous-total HT :</td>
                        <td style={{ textAlign: "right", whiteSpace: "nowrap", padding: "3pt 6pt" }}>100,00 €</td>
                      </tr>
                      <tr>
                        <td style={{ whiteSpace: "nowrap", padding: "3pt 6pt" }}>TVA (20%) :</td>
                        <td style={{ textAlign: "right", whiteSpace: "nowrap", padding: "3pt 6pt" }}>20,00 €</td>
                      </tr>
                      <tr
                        style={{
                          backgroundColor: customization.primaryColor,
                          color: "#FFFFFF",
                          fontWeight: "700",
                        }}
                      >
                        <td style={{ padding: "6pt 8pt", borderRadius: "3px 0 0 3px", whiteSpace: "nowrap" }}>TOTAL TTC :</td>
                        <td style={{ textAlign: "right", padding: "6pt 8pt", borderRadius: "0 3px 3px 0", whiteSpace: "nowrap" }}>120,00 €</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Footer Section */}
                {customization.showPaymentConditions && (
                  <div
                    style={{
                      fontSize: "7.5pt",
                      borderTop: "1px solid #E5E5E5",
                      paddingTop: "8pt",
                      marginTop: "auto",
                      opacity: 0.8,
                    }}
                  >
                    <div>
                      <strong>Conditions de paiement : </strong> Paiement à 30 jours
                    </div>
                    {customization.showIban && <div>IBAN: FR76 3000 6000 0123 4567 8901 234</div>}
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
