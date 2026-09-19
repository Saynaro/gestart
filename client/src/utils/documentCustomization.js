import { useState, useEffect } from 'react';
import { apiFetch } from './api';

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
  clientBoxPosition: "bottom",   // "bottom" (Sous l'entreprise) ou "right" (En face / À droite)

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

export function saveCustomization(newSettings, syncBackend = true) {
  try {
    const merged = { ...getCustomization(), ...newSettings };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    window.dispatchEvent(new CustomEvent("docCustomizationChanged", { detail: merged }));
    
    if (syncBackend) {
      // Asynchronously sync global company customization to backend
      apiFetch("/v1/company/settings", {
        method: "PATCH",
        body: JSON.stringify({ documentCustomization: merged })
      }).catch(err => console.warn("Could not sync global customization:", err.message));
    }

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

export function saveDocCustomization(docId, settings, clientId = null, docType = null) {
  if (!settings) return;
  try {
    if (docId) {
      localStorage.setItem(`crm_doc_custom_${docId}`, JSON.stringify(settings));
    }
    // Clean up any stale client-level override keys to avoid style contamination
    if (clientId) {
      try {
        localStorage.removeItem(`crm_client_custom_${clientId}`);
      } catch (e) {}
    }
    window.dispatchEvent(new CustomEvent("docCustomizationChanged", { 
      detail: { docId, settings } 
    }));

    // Asynchronously sync document customization to backend database
    if (docId) {
      const isQuote = docType === "devis" || (typeof docId === "string" && docId.startsWith("d_")) || (docId && docType !== "facture");
      const endpoint = (docType === "facture" || (!isQuote && docType !== "devis"))
        ? `/v1/invoices/${docId}`
        : `/v1/quotes/${docId}`;

      apiFetch(endpoint, {
        method: "PUT",
        body: JSON.stringify({ documentCustomization: settings, customization: settings })
      }).catch(err => console.warn("Could not sync doc customization:", err.message));
    }
  } catch (e) {
    console.error("Failed to save per-doc customization", e);
  }
}

export function useDocumentCustomization(doc = null) {
  const [customization, setCustomization] = useState(() => getEffectiveCustomization(doc));
  const docKey = `${doc?.id || ""}_${JSON.stringify(doc?.documentCustomization || doc?.customization || "")}`;

  useEffect(() => {
    setCustomization(getEffectiveCustomization(doc));
  }, [docKey]);

  useEffect(() => {
    const handleChanged = () => {
      setCustomization(getEffectiveCustomization(doc));
    };

    window.addEventListener("docCustomizationChanged", handleChanged);
    window.addEventListener("storage", handleChanged);
    return () => {
      window.removeEventListener("docCustomizationChanged", handleChanged);
      window.removeEventListener("storage", handleChanged);
    };
  }, [docKey]);


  const update = (newSettings) => {
    if (doc?.id) {
      saveDocCustomization(doc?.id, newSettings, null, doc?.number?.startsWith("D") ? "devis" : "facture");
    } else {
      saveCustomization(newSettings);
    }
    setCustomization(newSettings);
  };

  return [customization, update];
}

export function getEffectiveCustomization(doc, globalCustomization) {
  const companySettings = (doc?.company?.settings && typeof doc.company.settings === 'object') 
    ? doc.company.settings 
    : ((doc?.company && typeof doc.company === 'object') ? doc.company : {});

  const companyCustomization = (companySettings.documentCustomization && typeof companySettings.documentCustomization === 'object')
    ? companySettings.documentCustomization
    : {};

  const baseDefaults = {
    ...DEFAULT_CUSTOMIZATION,
    ...(companySettings.primaryColor ? { primaryColor: companySettings.primaryColor } : {}),
    ...(companySettings.logoUrl || doc?.company?.logoUrl ? { logoUrl: companySettings.logoUrl || doc?.company?.logoUrl } : {}),
    ...(companySettings.signatureUrl || doc?.company?.signatureUrl ? { signatureUrl: companySettings.signatureUrl || doc?.company?.signatureUrl } : {}),
    ...(companySettings.fontFamily ? { fontFamily: companySettings.fontFamily } : {}),
    ...(companySettings.structure ? { structure: companySettings.structure } : {}),
    ...companyCustomization
  };

  const globalSettings = globalCustomization ? { ...baseDefaults, ...globalCustomization } : { ...baseDefaults, ...getCustomization() };
  if (!doc) return globalSettings;

  // 1. Explicit doc.documentCustomization or doc.customization (from backend or state)
  const docCustom = doc.documentCustomization || doc.customization;
  if (docCustom && typeof docCustom === 'object' && Object.keys(docCustom).length > 0) {
    return { ...globalSettings, ...docCustom };
  }

  // 2. LocalStorage per docId (e.g. invoice or quote ID)
  if (doc.id) {
    const byDoc = getDocCustomization(doc.id);
    if (byDoc && typeof byDoc === 'object') {
      return { ...globalSettings, ...byDoc };
    }
  }

  return globalSettings;
}

