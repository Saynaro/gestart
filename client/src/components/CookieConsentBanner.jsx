import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie, ShieldCheck, Settings, Check, X, Sliders, ChevronRight, Lock, BarChart3, MessageSquare } from "lucide-react";
import "./CookieConsentBanner.css";
import LegalModal from "./LegalHelpModal";

const CONSENT_KEY = "gestart_cookie_consent";
const THIRTEEN_MONTHS_MS = 13 * 30 * 24 * 60 * 60 * 1000; // ~33,696,000,000 ms (Conforme CNIL)

export default function CookieConsentBanner() {
    const [isVisible, setIsVisible] = useState(false);
    const [showCustomizeModal, setShowCustomizeModal] = useState(false);
    const [activeLegalModal, setActiveLegalModal] = useState(null);

    // Toggle states for customization
    const [analyticsConsent, setAnalyticsConsent] = useState(true);
    const [functionalConsent, setFunctionalConsent] = useState(true);

    useEffect(() => {
        const checkConsent = () => {
            try {
                const stored = localStorage.getItem(CONSENT_KEY);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (parsed.expiresAt && Date.now() < parsed.expiresAt) {
                        setIsVisible(false);
                        return;
                    }
                }
                // No valid consent found -> Show banner
                setIsVisible(true);
            } catch (e) {
                setIsVisible(true);
            }
        };

        checkConsent();

        // Listen for manual trigger (e.g. from Footer or Settings)
        const handleReopen = () => {
            setShowCustomizeModal(true);
        };

        window.addEventListener("openCookieConsent", handleReopen);
        return () => window.removeEventListener("openCookieConsent", handleReopen);
    }, []);

    const saveConsent = (choiceType, customAnalytics = true, customFunctional = true) => {
        const consentData = {
            choice: choiceType, // 'accepted' | 'refused' | 'custom'
            analytics: choiceType === 'refused' ? false : customAnalytics,
            functional: choiceType === 'refused' ? false : customFunctional,
            timestamp: Date.now(),
            expiresAt: Date.now() + THIRTEEN_MONTHS_MS
        };

        try {
            localStorage.setItem(CONSENT_KEY, JSON.stringify(consentData));
        } catch (e) {
            console.error("Impossible de sauvegarder le consentement des cookies", e);
        }

        setIsVisible(false);
        setShowCustomizeModal(false);
    };

    const handleAcceptAll = () => {
        saveConsent('accepted', true, true);
    };

    const handleRefuseAll = () => {
        saveConsent('refused', false, false);
    };

    const handleSaveCustom = () => {
        saveConsent('custom', analyticsConsent, functionalConsent);
    };

    return (
        <>
            {/* Main Centered Cookie Consent Modal */}
            <AnimatePresence>
                {isVisible && !showCustomizeModal && (
                    <div className="cookie-banner-modal-overlay">
                        <motion.div
                            initial={{ scale: 0.94, opacity: 0, y: 15 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.94, opacity: 0, y: 15 }}
                            transition={{ type: "spring", stiffness: 350, damping: 28 }}
                            className="cookie-banner-modal-card"
                        >
                            <div className="cookie-banner-modal-header">
                                <div className="cookie-brand-badge">
                                    <Cookie size={18} className="cookie-brand-icon" />
                                    <span>GestArt</span>
                                </div>
                                <h3 className="cookie-banner-modal-title">
                                    Vos préférences sur les cookies 🍪
                                </h3>
                            </div>

                            <div className="cookie-banner-modal-body">
                                <p className="cookie-banner-main-text">
                                    <strong>GestArt</strong> et ses partenaires utilisent des cookies et des technologies similaires pour assurer le fonctionnement technique et sécurisé de notre plateforme CRM, mesurer l'audience et personnaliser votre expérience (conforme aux normes CNIL &amp; RGPD).
                                </p>
                                <p className="cookie-banner-sub-text">
                                    Vous pouvez accepter tous les cookies, choisir uniquement les cookies essentiels ou personnaliser vos choix par catégorie. Vos choix sont conservés pendant <strong>13 mois</strong> et modifiables à tout moment.
                                </p>
                                <div className="cookie-policy-links">
                                    <span>Pour en savoir plus, consultez notre </span>
                                    <button
                                        type="button"
                                        className="cookie-policy-btn-link"
                                        onClick={() => setActiveLegalModal('cookies')}
                                    >
                                        Politique des cookies
                                    </button>
                                    <span> et notre </span>
                                    <button
                                        type="button"
                                        className="cookie-policy-btn-link"
                                        onClick={() => setActiveLegalModal('rgpd')}
                                    >
                                        Politique de confidentialité
                                    </button>
                                    <span>.</span>
                                </div>
                            </div>

                            <div className="cookie-banner-modal-actions">
                                <button
                                    type="button"
                                    onClick={handleAcceptAll}
                                    className="cookie-modal-btn cookie-modal-btn-accept"
                                >
                                    Accepter tous les cookies
                                </button>
                                <button
                                    type="button"
                                    onClick={handleRefuseAll}
                                    className="cookie-modal-btn cookie-modal-btn-refuse"
                                >
                                    Accepter uniquement les cookies essentiels
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowCustomizeModal(true)}
                                    className="cookie-modal-btn cookie-modal-btn-customize"
                                >
                                    <Sliders size={16} />
                                    Personnaliser mes choix
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Customization Modal */}
            <AnimatePresence>
                {showCustomizeModal && (
                    <div className="cookie-modal-overlay">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="cookie-modal-card"
                        >
                            {/* Header */}
                            <div className="cookie-modal-header">
                                <div className="cookie-modal-title-box">
                                    <ShieldCheck size={24} style={{ color: '#556B2F' }} />
                                    <div>
                                        <h3>Gestion des préférences de Cookies</h3>
                                        <p>Conformité Art. 82 Loi Informatique et Libertés &amp; RGPD</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowCustomizeModal(false);
                                        if (!localStorage.getItem(CONSENT_KEY)) {
                                            setIsVisible(true);
                                        }
                                    }}
                                    className="cookie-modal-close"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Body Toggles */}
                            <div className="cookie-modal-body">
                                <p className="cookie-modal-intro">
                                    Les cookies sont de petits fichiers texte placés sur votre appareil afin d'optimiser votre expérience sur notre plateforme CRM GestArt. Vos choix seront conservés pendant <strong>13 mois</strong> et restent modifiables à tout moment.
                                </p>

                                {/* Category 1: Strictly Necessary */}
                                <div className="cookie-category-item mandatory">
                                    <div className="category-top-row">
                                        <div className="category-header">
                                            <ShieldCheck size={22} className="category-icon mandatory-icon" />
                                            <span className="category-name">Cookies techniques ou strictement nécessaires</span>
                                            <span className="badge-required">Obligatoires</span>
                                        </div>
                                        <div className="category-action">
                                            <label className="toggle-switch disabled">
                                                <input type="checkbox" checked readOnly disabled />
                                                <span className="toggle-slider" />
                                            </label>
                                        </div>
                                    </div>
                                    <p className="category-desc">
                                        Ces cookies sont strictement nécessaires à la fourniture du service CRM. Ils permettent de mémoriser votre session d'authentification sécurisée (tokens JWT), la prévention contre la fraude et vos préférences d'affichage. Ils sont automatiquement activés et ne peuvent pas être désactivés.
                                    </p>
                                </div>

                                {/* Category 2: Analytics */}
                                <div className="cookie-category-item">
                                    <div className="category-top-row">
                                        <div className="category-header">
                                            <BarChart3 size={22} className="category-icon" />
                                            <span className="category-name">Cookies d'analyse d'audience &amp; performance</span>
                                        </div>
                                        <div className="category-action">
                                            <label className="toggle-switch">
                                                <input
                                                    type="checkbox"
                                                    checked={analyticsConsent}
                                                    onChange={(e) => setAnalyticsConsent(e.target.checked)}
                                                />
                                                <span className="toggle-slider" />
                                            </label>
                                        </div>
                                    </div>
                                    <p className="category-desc">
                                        Les cookies de mesure d'audience permettent de comprendre la façon dont vous naviguez sur notre CRM (ex: pages vues, temps d'accès, fonctionnalités utilisées). Ils permettent d'analyser la performance technique, de détecter d'éventuelles erreurs et d'optimiser l'ergonomie.
                                    </p>
                                </div>

                                {/* Category 3: Functional / Support */}
                                <div className="cookie-category-item">
                                    <div className="category-top-row">
                                        <div className="category-header">
                                            <MessageSquare size={22} className="category-icon" />
                                            <span className="category-name">Cookies de personnalisation &amp; Support en direct</span>
                                        </div>
                                        <div className="category-action">
                                            <label className="toggle-switch">
                                                <input
                                                    type="checkbox"
                                                    checked={functionalConsent}
                                                    onChange={(e) => setFunctionalConsent(e.target.checked)}
                                                />
                                                <span className="toggle-slider" />
                                            </label>
                                        </div>
                                    </div>
                                    <p className="category-desc">
                                        Ces cookies nous permettent de vous proposer un accompagnement personnalisé et d'activer le chat de support en direct avec l'équipe GestArt. Ils nous aident également à tester des améliorations de l'interface (AB testing) pour mieux répondre aux besoins des artisans et installateurs.
                                    </p>
                                </div>

                                {/* Legal Links Footer Note */}
                                <div className="cookie-modal-legal-link">
                                    <span>Pour plus d'informations, reportez-vous à notre </span>
                                    <button
                                        type="button"
                                        className="legal-text-link"
                                        onClick={() => setActiveLegalModal('cookies')}
                                    >
                                        Politique des cookies &amp; RGPD →
                                    </button>
                                </div>
                            </div>

                            {/* Footer Single Action Button */}
                            <div className="cookie-modal-footer">
                                <button
                                    type="button"
                                    onClick={handleSaveCustom}
                                    className="cookie-modal-btn cookie-modal-btn-accept"
                                    style={{ width: '100%' }}
                                >
                                    Enregistrer les préférences et fermer
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Legal Modal Trigger */}
            {activeLegalModal && (
                <LegalModal
                    type={activeLegalModal}
                    onClose={() => setActiveLegalModal(null)}
                />
            )}
        </>
    );
}
