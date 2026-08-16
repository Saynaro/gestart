import { useState, useEffect } from 'react';

export const DEFAULT_CUSTOMIZATION = {
  // Colors
  primaryColor: "#556B2F",       // Default accent color (olive green)
  bgColor: "#FFFFFF",            // A4 sheet background
  textColor: "#1A1A1A",          // Main text color
  structure: "classic",          // "classic", "modern", "minimal", "banner"

  // Typography
  fontSize: "9pt",               // "8pt", "9pt", "10pt"
  fontFamily: "Inter, sans-serif",

  // Logo & Layout
  showLogo: true,
  logoSize: 45,                  // Height in px (20 - 80)
  logoPosition: "left",          // "left", "right"

  // Information Visibility Toggles
  showPhone: true,
  showEmail: true,
  showAddress: true,
  showSiret: true,
  showDeliveryDate: true,
  showPaymentConditions: true,
  showIban: true,
  showAgaMention: false,
  showCompanySignature: true,
  removeBranding: false,
};

const STORAGE_KEY = "crm_document_customization_v1";

export function getCustomization() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_CUSTOMIZATION, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error("Failed to load document customization", e);
  }
  return { ...DEFAULT_CUSTOMIZATION };
}

export function saveCustomization(newSettings) {
  try {
    const merged = { ...getCustomization(), ...newSettings };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    window.dispatchEvent(new CustomEvent("docCustomizationChanged", { detail: merged }));
    return merged;
  } catch (e) {
    console.error("Failed to save document customization", e);
    return newSettings;
  }
}

export function useDocumentCustomization() {
  const [customization, setCustomization] = useState(getCustomization);

  useEffect(() => {
    const handleChanged = (e) => {
      if (e.detail) {
        setCustomization(e.detail);
      } else {
        setCustomization(getCustomization());
      }
    };

    window.addEventListener("docCustomizationChanged", handleChanged);
    window.addEventListener("storage", handleChanged);
    return () => {
      window.removeEventListener("docCustomizationChanged", handleChanged);
      window.removeEventListener("storage", handleChanged);
    };
  }, []);

  return [customization, (newSettings) => {
    const updated = saveCustomization(newSettings);
    setCustomization(updated);
  }];
}

export function getEffectiveCustomization(doc, globalCustomization) {
  const globalSettings = globalCustomization || getCustomization();
  if (doc && doc.customization && typeof doc.customization === 'object' && Object.keys(doc.customization).length > 0) {
    return { ...globalSettings, ...doc.customization };
  }
  return globalSettings;
}
