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

export function getDocCustomization(docId) {
  if (!docId) return null;
  try {
    const raw = localStorage.getItem(`crm_doc_custom_${docId}`);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function getClientCustomization(clientId) {
  if (!clientId) return null;
  try {
    const raw = localStorage.getItem(`crm_client_custom_${clientId}`);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function saveDocCustomization(docId, settings, clientId = null) {
  if (!settings) return;
  try {
    if (docId) {
      localStorage.setItem(`crm_doc_custom_${docId}`, JSON.stringify(settings));
    }
    if (clientId) {
      localStorage.setItem(`crm_client_custom_${clientId}`, JSON.stringify(settings));
    }
    window.dispatchEvent(new CustomEvent("docCustomizationChanged", { 
      detail: { docId, clientId, settings } 
    }));
  } catch (e) {
    console.error("Failed to save per-doc customization", e);
  }
}

export function useDocumentCustomization(doc = null) {
  const [customization, setCustomization] = useState(() => getEffectiveCustomization(doc));

  useEffect(() => {
    setCustomization(getEffectiveCustomization(doc));
  }, [doc?.id, doc?.clientId, doc?.client?.id]);

  useEffect(() => {
    const handleChanged = (e) => {
      setCustomization(getEffectiveCustomization(doc));
    };

    window.addEventListener("docCustomizationChanged", handleChanged);
    window.addEventListener("storage", handleChanged);
    return () => {
      window.removeEventListener("docCustomizationChanged", handleChanged);
      window.removeEventListener("storage", handleChanged);
    };
  }, [doc?.id, doc?.clientId, doc?.client?.id]);

  const update = (newSettings) => {
    if (doc?.id || doc?.clientId || doc?.client?.id) {
      saveDocCustomization(doc?.id, newSettings, doc?.clientId || doc?.client?.id);
    } else {
      saveCustomization(newSettings);
    }
    setCustomization(newSettings);
  };

  return [customization, update];
}

export function getEffectiveCustomization(doc, globalCustomization) {
  const globalSettings = globalCustomization || getCustomization();
  if (!doc) return globalSettings;

  // 1. Explicit doc.customization (if passed from backend or state)
  if (doc.customization && typeof doc.customization === 'object' && Object.keys(doc.customization).length > 0) {
    return { ...globalSettings, ...doc.customization };
  }

  // 2. LocalStorage per docId (e.g. invoice or quote ID)
  if (doc.id) {
    const byDoc = getDocCustomization(doc.id);
    if (byDoc && typeof byDoc === 'object') {
      return { ...globalSettings, ...byDoc };
    }
  }

  // 3. LocalStorage per clientId (so all docs for that specific client inherit their customized color)
  const clientId = doc.clientId || doc.client?.id;
  if (clientId) {
    const byClient = getClientCustomization(clientId);
    if (byClient && typeof byClient === 'object') {
      return { ...globalSettings, ...byClient };
    }
  }

  return globalSettings;
}
