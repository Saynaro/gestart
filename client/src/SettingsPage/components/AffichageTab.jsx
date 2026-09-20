import React, { useState, useEffect } from "react";
import { Sun, Moon, Laptop, Check, Globe, Sparkles } from "lucide-react";
import { applyThemeMode } from "../../utils/theme";

export default function AffichageTab({ isMobileView, triggerToast }) {
    // Theme Mode: "light" | "dark" | "system" (defaults to "system")
    const [themeMode, setThemeMode] = useState(() => {
        return localStorage.getItem("theme_mode") || (localStorage.getItem("theme") === "dark" ? "dark" : (localStorage.getItem("theme") === "light" ? "light" : "system"));
    });

    // Language: "FR" | "EN"
    const [language, setLanguage] = useState(() => {
        return localStorage.getItem("app_language") || "FR";
    });

    // Apply Theme Changes
    const applyTheme = (mode) => {
        setThemeMode(mode);
        applyThemeMode(mode);

        if (triggerToast) {
            const label = mode === "dark" ? "Sombre" : mode === "light" ? "Clair" : "Automatique (Système)";
            triggerToast(`Thème appliqué : ${label}`);
        }
    };

    // Synchronize if changed elsewhere or by OS
    useEffect(() => {
        const handleThemeChange = (e) => {
            if (e.detail?.mode) {
                setThemeMode(e.detail.mode);
            }
        };
        window.addEventListener("themeChanged", handleThemeChange);
        return () => window.removeEventListener("themeChanged", handleThemeChange);
    }, []);

    // Handle Language change
    const handleLanguageChange = (newLang) => {
        setLanguage(newLang);
        localStorage.setItem("app_language", newLang);
        window.dispatchEvent(new CustomEvent("languageChanged", { detail: { language: newLang } }));
        if (triggerToast) {
            triggerToast(`Langue définie : ${newLang === "FR" ? "Français (FR)" : "English (EN)"}`);
        }
    };

    if (isMobileView) {
        return (
            <div className="mobile-fields-stack">
                {/* SECTION THÈME */}
                <div className="mobile-group-section" style={{ margin: "0 0 18px 0" }}>
                    <h4 className="mobile-group-header">
                        <Sparkles size={13} style={{ color: "#556B2F" }} />
                        <span>Thème de l'interface</span>
                    </h4>

                    <div className="mobile-items-card">
                        <button
                            type="button"
                            className={`mobile-settings-row-btn ${themeMode === "light" ? "active-row" : ""}`}
                            onClick={() => applyTheme("light")}
                        >
                            <span className="mobile-row-icon-bg" style={{ backgroundColor: "rgba(245, 158, 11, 0.12)", color: "#F59E0B" }}>
                                <Sun size={18} />
                            </span>
                            <span className="mobile-row-text-col">
                                <span className="mobile-row-label">Thème Clair</span>
                                <span className="mobile-row-subtitle">Interface lumineuse standard</span>
                            </span>
                            {themeMode === "light" && (
                                <div style={{
                                    width: "22px",
                                    height: "22px",
                                    borderRadius: "50%",
                                    backgroundColor: "rgba(85, 107, 47, 0.12)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    marginLeft: "auto",
                                    flexShrink: 0
                                }}>
                                    <Check size={14} strokeWidth={3} style={{ color: "#556B2F" }} />
                                </div>
                            )}
                        </button>

                        <button
                            type="button"
                            className={`mobile-settings-row-btn ${themeMode === "dark" ? "active-row" : ""}`}
                            onClick={() => applyTheme("dark")}
                        >
                            <span className="mobile-row-icon-bg" style={{ backgroundColor: "rgba(99, 102, 241, 0.12)", color: "#6366F1" }}>
                                <Moon size={18} />
                            </span>
                            <span className="mobile-row-text-col">
                                <span className="mobile-row-label">Thème Sombre</span>
                                <span className="mobile-row-subtitle">Réduit la fatigue oculaire</span>
                            </span>
                            {themeMode === "dark" && (
                                <div style={{
                                    width: "22px",
                                    height: "22px",
                                    borderRadius: "50%",
                                    backgroundColor: "rgba(85, 107, 47, 0.12)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    marginLeft: "auto",
                                    flexShrink: 0
                                }}>
                                    <Check size={14} strokeWidth={3} style={{ color: "#556B2F" }} />
                                </div>
                            )}
                        </button>

                        <button
                            type="button"
                            className={`mobile-settings-row-btn ${themeMode === "system" ? "active-row" : ""}`}
                            onClick={() => applyTheme("system")}
                        >
                            <span className="mobile-row-icon-bg" style={{ backgroundColor: "rgba(107, 114, 128, 0.12)", color: "var(--foreground)" }}>
                                <Laptop size={18} />
                            </span>
                            <span className="mobile-row-text-col">
                                <span className="mobile-row-label">Automatique (Système)</span>
                                <span className="mobile-row-subtitle">S'adapte aux réglages de votre appareil</span>
                            </span>
                            {themeMode === "system" && (
                                <div style={{
                                    width: "22px",
                                    height: "22px",
                                    borderRadius: "50%",
                                    backgroundColor: "rgba(85, 107, 47, 0.12)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    marginLeft: "auto",
                                    flexShrink: 0
                                }}>
                                    <Check size={14} strokeWidth={3} style={{ color: "#556B2F" }} />
                                </div>
                            )}
                        </button>
                    </div>
                </div>

                {/* SECTION LANGUE */}
                <div className="mobile-group-section" style={{ margin: "0 0 24px 0" }}>
                    <h4 className="mobile-group-header">
                        <Globe size={13} style={{ color: "#556B2F" }} />
                        <span>Langue de l'application</span>
                    </h4>

                    <div className="mobile-items-card">
                        <button
                            type="button"
                            className={`mobile-settings-row-btn ${language === "FR" ? "active-row" : ""}`}
                            onClick={() => handleLanguageChange("FR")}
                        >
                            <span className="mobile-row-icon-bg" style={{ backgroundColor: "rgba(59, 130, 246, 0.08)", fontSize: "18px" }}>
                                🇫🇷
                            </span>
                            <span className="mobile-row-text-col">
                                <span className="mobile-row-label">Français (France)</span>
                                <span className="mobile-row-subtitle">Langue par défaut du système</span>
                            </span>
                            {language === "FR" && (
                                <div style={{
                                    width: "22px",
                                    height: "22px",
                                    borderRadius: "50%",
                                    backgroundColor: "rgba(85, 107, 47, 0.12)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    marginLeft: "auto",
                                    flexShrink: 0
                                }}>
                                    <Check size={14} strokeWidth={3} style={{ color: "#556B2F" }} />
                                </div>
                            )}
                        </button>

                        <button
                            type="button"
                            className={`mobile-settings-row-btn ${language === "EN" ? "active-row" : ""}`}
                            onClick={() => handleLanguageChange("EN")}
                        >
                            <span className="mobile-row-icon-bg" style={{ backgroundColor: "rgba(239, 68, 68, 0.08)", fontSize: "18px" }}>
                                🇬🇧
                            </span>
                            <span className="mobile-row-text-col">
                                <span className="mobile-row-label">English (International)</span>
                                <span className="mobile-row-subtitle">English interface translation</span>
                            </span>
                            {language === "EN" && (
                                <div style={{
                                    width: "22px",
                                    height: "22px",
                                    borderRadius: "50%",
                                    backgroundColor: "rgba(85, 107, 47, 0.12)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    marginLeft: "auto",
                                    flexShrink: 0
                                }}>
                                    <Check size={14} strokeWidth={3} style={{ color: "#556B2F" }} />
                                </div>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="affichage-container">
            {/* 1. SECTION THÈME */}
            <div className="affichage-section-card">
                <div className="affichage-section-header">
                    <div>
                        <h3 className="affichage-section-title">Thème de l'interface</h3>
                        <p className="affichage-section-subtitle">
                            Personnalisez l'apparence de GestArt selon vos préférences ou votre environnement de travail.
                        </p>
                    </div>
                </div>

                <div className="theme-picker-grid">
                    {/* OPTION CLAIR */}
                    <div
                        className={`theme-picker-card ${themeMode === "light" ? "active" : ""}`}
                        onClick={() => applyTheme("light")}
                        role="button"
                        tabIndex={0}
                    >
                        <div className="theme-preview-box light-preview">
                            <div className="theme-preview-header" />
                            <div className="theme-preview-body">
                                <div className="theme-preview-sidebar" />
                                <div className="theme-preview-content">
                                    <div className="theme-preview-bar" style={{ width: "65%" }} />
                                    <div className="theme-preview-bar" style={{ width: "45%" }} />
                                    <div className="theme-preview-dot" />
                                </div>
                            </div>
                        </div>

                        <div className="theme-picker-info">
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <Sun size={16} style={{ color: "#F59E0B" }} />
                                    <span className="theme-picker-name">Clair</span>
                                </div>
                                <span className={`theme-radio ${themeMode === "light" ? "checked" : ""}`}>
                                    {themeMode === "light" && <Check size={12} />}
                                </span>
                            </div>
                            <span className="theme-picker-desc">Thème clair classique et épuré</span>
                        </div>
                    </div>

                    {/* OPTION SOMBRE */}
                    <div
                        className={`theme-picker-card ${themeMode === "dark" ? "active" : ""}`}
                        onClick={() => applyTheme("dark")}
                        role="button"
                        tabIndex={0}
                    >
                        <div className="theme-preview-box dark-preview">
                            <div className="theme-preview-header" />
                            <div className="theme-preview-body">
                                <div className="theme-preview-sidebar" />
                                <div className="theme-preview-content">
                                    <div className="theme-preview-bar" style={{ width: "65%" }} />
                                    <div className="theme-preview-bar" style={{ width: "45%" }} />
                                    <div className="theme-preview-dot" />
                                </div>
                            </div>
                        </div>

                        <div className="theme-picker-info">
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <Moon size={16} style={{ color: "#818CF8" }} />
                                    <span className="theme-picker-name">Sombre</span>
                                </div>
                                <span className={`theme-radio ${themeMode === "dark" ? "checked" : ""}`}>
                                    {themeMode === "dark" && <Check size={12} />}
                                </span>
                            </div>
                            <span className="theme-picker-desc">Confort visuel et contraste reposant</span>
                        </div>
                    </div>

                    {/* OPTION SYSTÈME */}
                    <div
                        className={`theme-picker-card ${themeMode === "system" ? "active" : ""}`}
                        onClick={() => applyTheme("system")}
                        role="button"
                        tabIndex={0}
                    >
                        <div className="theme-preview-box system-preview">
                            <div className="theme-preview-split-light">
                                <div className="theme-preview-header" />
                                <div className="theme-preview-body">
                                    <div className="theme-preview-sidebar" />
                                    <div className="theme-preview-content">
                                        <div className="theme-preview-bar" style={{ width: "65%" }} />
                                    </div>
                                </div>
                            </div>
                            <div className="theme-preview-split-dark">
                                <div className="theme-preview-header" />
                                <div className="theme-preview-body">
                                    <div className="theme-preview-sidebar" />
                                    <div className="theme-preview-content">
                                        <div className="theme-preview-bar" style={{ width: "65%" }} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="theme-picker-info">
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <Laptop size={16} style={{ color: "var(--foreground)" }} />
                                    <span className="theme-picker-name">Système</span>
                                </div>
                                <span className={`theme-radio ${themeMode === "system" ? "checked" : ""}`}>
                                    {themeMode === "system" && <Check size={12} />}
                                </span>
                            </div>
                            <span className="theme-picker-desc">Synchronisé avec votre OS / appareil</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. SECTION LANGUE */}
            <div className="affichage-section-card" style={{ marginTop: "24px" }}>
                <div className="affichage-section-header">
                    <div>
                        <h3 className="affichage-section-title">Langue de l'interface</h3>
                        <p className="affichage-section-subtitle">
                            Sélectionnez la langue dans laquelle s'affichent les menus, boutons et notifications.
                        </p>
                    </div>
                </div>

                <div className="language-picker-grid">
                    <div
                        className={`language-picker-card ${language === "FR" ? "active" : ""}`}
                        onClick={() => handleLanguageChange("FR")}
                        role="button"
                        tabIndex={0}
                    >
                        <span className="language-flag">🇫🇷</span>
                        <div className="language-details">
                            <div className="language-name-row">
                                <span className="language-title">Français (FR)</span>
                                {language === "FR" && (
                                    <span className="language-default-tag">Actif</span>
                                )}
                            </div>
                            <span className="language-subtitle">Français standard (France)</span>
                        </div>
                        <span className={`theme-radio ${language === "FR" ? "checked" : ""}`} style={{ marginLeft: "auto" }}>
                            {language === "FR" && <Check size={12} />}
                        </span>
                    </div>

                    <div
                        className={`language-picker-card ${language === "EN" ? "active" : ""}`}
                        onClick={() => handleLanguageChange("EN")}
                        role="button"
                        tabIndex={0}
                    >
                        <span className="language-flag">🇬🇧</span>
                        <div className="language-details">
                            <div className="language-name-row">
                                <span className="language-title">English (EN)</span>
                                {language === "EN" && (
                                    <span className="language-default-tag">Actif</span>
                                )}
                            </div>
                            <span className="language-subtitle">English (International)</span>
                        </div>
                        <span className={`theme-radio ${language === "EN" ? "checked" : ""}`} style={{ marginLeft: "auto" }}>
                            {language === "EN" && <Check size={12} />}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
