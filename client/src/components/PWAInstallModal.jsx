import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Smartphone, Check, Maximize2 } from "lucide-react";
import "./PWAInstallModal.css";

// Official Apple bitten logo (silhouette vector)
function AppleLogoIcon({ size = 18, className = "" }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="currentColor"
            className={className}
            aria-hidden="true"
        >
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.13c.64-.81 1.08-1.93.96-3.06-1.03.05-2.23.68-2.92 1.49-.57.65-1.07 1.8-0.94 2.89 1.15.09 2.26-.51 2.9-1.32z" />
        </svg>
    );
}

// Official Android robot head logo (silhouette vector)
function AndroidIcon({ size = 18, className = "" }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="currentColor"
            className={className}
            aria-hidden="true"
        >
            <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993.0001.5511-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.411 13.8533 8.0833 12 8.0833s-3.5902.3277-5.1368.8664L4.8409 5.4467a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3432-4.1021-2.6889-7.5743-6.1185-9.4396" />
        </svg>
    );
}

export default function PWAInstallModal({ isOpen, onClose }) {
    // Detect OS automatically (iOS vs Android)
    const isIOSDevice = typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);
    const [platform, setPlatform] = useState(isIOSDevice ? "ios" : "android");
    const [fullscreenImage, setFullscreenImage] = useState(null);
    const fullscreenImageRef = useRef(null);
    fullscreenImageRef.current = fullscreenImage;

    // Initialize state and lock scrolling when modal opens
    useEffect(() => {
        if (!isOpen) {
            setFullscreenImage(null);
            return;
        }

        const isIOS = typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);
        setPlatform(isIOS ? "ios" : "android");
        setFullscreenImage(null);

        const originalBodyOverflow = document.body.style.overflow;
        const originalHtmlOverflow = document.documentElement.style.overflow;
        const originalTouchAction = document.body.style.touchAction;

        document.body.style.overflow = "hidden";
        document.documentElement.style.overflow = "hidden";
        document.body.style.touchAction = "none";

        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                if (fullscreenImageRef.current) {
                    setFullscreenImage(null);
                } else {
                    onClose();
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            document.body.style.overflow = originalBodyOverflow;
            document.documentElement.style.overflow = originalHtmlOverflow;
            document.body.style.touchAction = originalTouchAction;
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const modalContent = (
        <div className="pwa-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
            <div className="pwa-modal-container" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="pwa-modal-header">
                    <div className="pwa-modal-title-wrap">
                        <div className="pwa-icon-badge">
                            <Smartphone size={20} />
                        </div>
                        <div>
                            <h2 className="pwa-modal-title">Installer l'application GestArt</h2>
                            <p className="pwa-modal-subtitle">Accédez à votre CRM en plein écran, sans passer par l'App Store</p>
                        </div>
                    </div>
                    <button type="button" className="pwa-close-btn" onClick={onClose} aria-label="Fermer">
                        <X size={20} />
                    </button>
                </div>

                {/* Platform Selector Tabs */}
                <div className="pwa-platform-tabs">
                    <button
                        type="button"
                        className={`pwa-platform-tab ${platform === "ios" ? "active" : ""}`}
                        onClick={() => setPlatform("ios")}
                    >
                        <AppleLogoIcon size={18} className="pwa-tab-icon" />
                        <span>iPhone & iPad (Safari)</span>
                    </button>
                    <button
                        type="button"
                        className={`pwa-platform-tab ${platform === "android" ? "active" : ""}`}
                        onClick={() => setPlatform("android")}
                    >
                        <AndroidIcon size={18} className="pwa-tab-icon" />
                        <span>Android (Chrome)</span>
                    </button>
                </div>

                {/* Modal Body */}
                <div className="pwa-modal-body">
                    {platform === "ios" ? (
                        <div className="pwa-content-grid">
                            {/* Steps Description */}
                            <div className="pwa-steps-list">
                                <h3 className="pwa-steps-heading">Installation sur iPhone (Safari) en 4 étapes</h3>

                                <div className="pwa-step-item">
                                    <div className="pwa-step-number">1</div>
                                    <div className="pwa-step-details">
                                        <strong>Ouvrez les options Safari</strong>
                                        <p>En bas de votre écran, touchez le bouton des options (les <strong>3&nbsp;petits points <code>...</code></strong> ou l'icône de partage).</p>
                                    </div>
                                </div>

                                <div className="pwa-step-item">
                                    <div className="pwa-step-number">2</div>
                                    <div className="pwa-step-details">
                                        <strong>Sélectionnez « Partager »</strong>
                                        <p>Dans le menu contextuel qui s'affiche, appuyez sur l'option <strong>Partager</strong> (icône avec le carré et la flèche vers le haut).</p>
                                    </div>
                                </div>

                                <div className="pwa-step-item">
                                    <div className="pwa-step-number">3</div>
                                    <div className="pwa-step-details">
                                        <strong>Touchez « Sur l'écran d'accueil »</strong>
                                        <p>Faites défiler la liste vers le bas et sélectionnez la ligne avec l'icône <strong>[+]&nbsp;Sur l'écran d'accueil.</strong></p>
                                    </div>
                                </div>

                                <div className="pwa-step-item">
                                    <div className="pwa-step-number">4</div>
                                    <div className="pwa-step-details">
                                        <strong>Confirmez avec « Ajouter »</strong>
                                        <p>En haut à droite de l'écran, appuyez sur <strong>Ajouter.</strong> L'icône GestArt s'installe immédiatement sur votre écran d'accueil&nbsp;!</p>
                                    </div>
                                </div>

                                <div className="pwa-benefit-box">
                                    <Check size={16} className="pwa-benefit-icon" />
                                    <span>L'application s'ouvre désormais en plein écran comme une vraie application native (PWA installable).</span>
                                </div>
                            </div>

                            {/* Screenshot Illustration */}
                            <div className="pwa-image-column">
                                <div
                                    className="pwa-image-wrapper"
                                    onClick={() => setFullscreenImage("/Pwa Installation IOS.jpg")}
                                    title="Toucher pour agrandir en plein écran"
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                            setFullscreenImage("/Pwa Installation IOS.jpg");
                                        }
                                    }}
                                >
                                    <img
                                        src="/Pwa Installation IOS.jpg"
                                        alt="Tutoriel installation PWA sur iPhone iOS Safari"
                                        className="pwa-guide-image"
                                        loading="eager"
                                    />
                                    <div
                                        className="pwa-zoom-badge"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setFullscreenImage("/Pwa Installation IOS.jpg");
                                        }}
                                    >
                                        <Maximize2 size={13} />
                                        <span>Agrandir</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="pwa-content-grid">
                            {/* Steps Description */}
                            <div className="pwa-steps-list">
                                <h3 className="pwa-steps-heading">Installation sur Android (Chrome) en 3 étapes</h3>

                                <div className="pwa-step-item">
                                    <div className="pwa-step-number">1</div>
                                    <div className="pwa-step-details">
                                        <strong>Ouvrez le menu du navigateur</strong>
                                        <p>En haut à droite de Google Chrome, appuyez sur les <strong>3&nbsp;points verticaux&nbsp;(⋮).</strong></p>
                                    </div>
                                </div>

                                <div className="pwa-step-item">
                                    <div className="pwa-step-number">2</div>
                                    <div className="pwa-step-details">
                                        <strong>Sélectionnez « Installer l'application »</strong>
                                        <p>Dans la liste du menu déroulant, touchez la ligne <strong>«&nbsp;Installer l'application&nbsp;»</strong> (ou «&nbsp;Ajouter à l'écran d'accueil&nbsp;»).</p>
                                    </div>
                                </div>

                                <div className="pwa-step-item">
                                    <div className="pwa-step-number">3</div>
                                    <div className="pwa-step-details">
                                        <strong>Confirmez en cliquant sur « Installer »</strong>
                                        <p>Dans la fenêtre de confirmation, cliquez sur le bouton vert <strong>«&nbsp;Installer&nbsp;».</strong> L'application est prête dans votre tiroir d'applications&nbsp;!</p>
                                    </div>
                                </div>

                                <div className="pwa-benefit-box">
                                    <Check size={16} className="pwa-benefit-icon" />
                                    <span>Accédez à vos fiches clients et votre planning d'un simple toucher sur votre écran d'accueil.</span>
                                </div>
                            </div>

                            {/* Screenshot Illustration */}
                            <div className="pwa-image-column">
                                <div
                                    className="pwa-image-wrapper"
                                    onClick={() => setFullscreenImage("/PWA Installation Android.jpg")}
                                    title="Toucher pour agrandir en plein écran"
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                            setFullscreenImage("/PWA Installation Android.jpg");
                                        }
                                    }}
                                >
                                    <img
                                        src="/PWA Installation Android.jpg"
                                        alt="Tutoriel installation PWA sur Android Chrome"
                                        className="pwa-guide-image"
                                        loading="eager"
                                    />
                                    <div
                                        className="pwa-zoom-badge"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setFullscreenImage("/PWA Installation Android.jpg");
                                        }}
                                    >
                                        <Maximize2 size={13} />
                                        <span>Agrandir</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="pwa-modal-footer">
                    <span className="pwa-footer-hint">
                        💡 Aucun compte Google Play ou Apple ID n'est requis pour installer GestArt.
                    </span>
                    <button type="button" className="pwa-btn-done" onClick={onClose}>
                        J'ai compris
                    </button>
                </div>
            </div>

            {/* Fullscreen Lightbox Zoom Modal */}
            {fullscreenImage && (
                <div
                    className="pwa-lightbox-overlay"
                    onClick={(e) => {
                        e.stopPropagation();
                        setFullscreenImage(null);
                    }}
                >
                    <div className="pwa-lightbox-content" onClick={(e) => e.stopPropagation()}>
                        <button
                            type="button"
                            className="pwa-lightbox-close"
                            onClick={(e) => {
                                e.stopPropagation();
                                setFullscreenImage(null);
                            }}
                            aria-label="Fermer le plein écran"
                        >
                            <X size={20} />
                        </button>
                        <img
                            src={fullscreenImage}
                            alt="Guide d'installation plein écran"
                            className="pwa-lightbox-img"
                            onClick={(e) => {
                                e.stopPropagation();
                                setFullscreenImage(null);
                            }}
                        />
                        <div className="pwa-lightbox-hint">Touchez pour fermer</div>
                    </div>
                </div>
            )}
        </div>
    );

    return typeof document !== "undefined" ? createPortal(modalContent, document.body) : null;
}
