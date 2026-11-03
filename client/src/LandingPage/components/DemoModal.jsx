import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { X, ChevronLeft, ChevronRight, Monitor, Smartphone } from "lucide-react";
import "./DemoModal.css";

const DESKTOP_STEPS = [
    {
        id: "dashboard",
        tab: "Tableau de bord",
        title: "Pilotage financier & URSSAF en temps réel",
        description: "Suivez votre chiffre d'affaires, vos cotisations sociales calculées automatiquement et l'évolution de votre résultat net avec des graphiques clairs.",
        image: "/image.png",
        alt: "Tableau de bord GestArt sur ordinateur"
    },
    {
        id: "clients",
        tab: "Fiches Clients",
        title: "Dossiers clients & Historique des équipements",
        description: "Centralisez les coordonnées de vos clients, les modèles d'équipements installés (pompes à chaleur, chaudières, climatisation) et l'historique complet de leurs entretiens.",
        image: "/image6.png",
        alt: "Fiche client et équipements sur ordinateur"
    },
    {
        id: "planning",
        tab: "Planning",
        title: "Planning interactif des techniciens",
        description: "Organisez les tournées d'intervention sans conflit d'horaires. Visualisez les créneaux par couleur selon le type de mission (Maintenance, Dépannage, Installation).",
        image: "/image2.png",
        alt: "Planning des interventions sur ordinateur"
    },
    {
        id: "facturation",
        tab: "Factures & Devis",
        title: "Facturation en 1 clic avec aperçu PDF A4 en direct",
        description: "Créez vos factures et devis conformes aux normes françaises avec détail HT/TTC et statut de paiement, visualisables immédiatement au format officiel A4.",
        image: "/image3.png",
        alt: "Détails et aperçu PDF de facture sur ordinateur"
    },
    {
        id: "messagerie",
        tab: "Messagerie",
        title: "Inbox unifiée SMS, Email & WhatsApp",
        description: "Communiquez directement avec vos clients depuis une boîte unique. Envoyez les devis, factures et liens de paiement sécurisés au fil de la discussion.",
        image: "/image4.png",
        alt: "Messagerie omnicanale sur ordinateur"
    }
];

const MOBILE_STEPS = [
    {
        id: "mobile-dashboard",
        tab: "Accueil",
        title: "Chiffres clés & Gestion sur smartphone",
        description: "Consultez en un clin d'œil votre chiffre d'affaires du mois, l'estimation de vos cotisations et l'état de votre activité où que vous soyez.",
        image: "/mobile/IMG_8090.jpg",
        alt: "Dashboard mobile GestArt"
    },
    {
        id: "mobile-clients",
        tab: "Clients",
        title: "Répertoire clients & Filtres d'échéances",
        description: "Recherchez rapidement un client, filtrez les entretiens par statut (Urgent, Bientôt, OK) et ajoutez un nouveau dossier d'un simple geste.",
        image: "/mobile/IMG_8091.jpg",
        alt: "Liste des clients sur smartphone"
    },
    {
        id: "mobile-planning",
        tab: "Planning",
        title: "Feuille de route journalière des techniciens",
        description: "Consultez le calendrier de la semaine, les heures de passage et les interventions assignées à chaque technicien directement sur le terrain.",
        image: "/mobile/IMG_8092.jpg",
        alt: "Planning et interventions sur smartphone"
    },
    {
        id: "mobile-messages",
        tab: "Messagerie",
        title: "Échanges SMS/Email avec liens de paiement",
        description: "Gardez le contact avec vos clients : envoyez leur facture au format PDF et un lien de règlement direct par carte bancaire en quelques secondes.",
        image: "/mobile/IMG_8093.jpg",
        alt: "Messagerie SMS et envoi de factures sur smartphone"
    },
    {
        id: "mobile-factures",
        tab: "Factures",
        title: "Détails de facturation & Envoi instantané",
        description: "Consultez le statut du règlement, le montant total et déclenchez l'envoi de la facture au client sans avoir besoin d'ouvrir un ordinateur.",
        image: "/mobile/IMG_8094.jpg",
        alt: "Tiroir de détails de facture sur smartphone"
    }
];

export default function DemoModal({ isOpen, onClose }) {
    const navigate = useNavigate();
    const isMobileDevice = typeof window !== "undefined" && window.innerWidth <= 768;
    const [mode, setMode] = useState(isMobileDevice ? "mobile" : "desktop");
    const [currentIndex, setCurrentIndex] = useState(0);
    const tabsRef = useRef(null);
    const touchStartX = useRef(null);

    const steps = mode === "mobile" ? MOBILE_STEPS : DESKTOP_STEPS;
    const currentStep = steps[currentIndex] || steps[0];

    // Preload all demo images into browser cache immediately
    useEffect(() => {
        const allImages = [
            ...DESKTOP_STEPS.map((s) => s.image),
            ...MOBILE_STEPS.map((s) => s.image)
        ];
        allImages.forEach((src) => {
            const img = new Image();
            img.src = src;
        });
    }, []);

    // Scroll active tab into view smoothly
    useEffect(() => {
        if (!tabsRef.current) return;
        const activeBtn = tabsRef.current.querySelector(".demo-tab-item.active");
        if (activeBtn) {
            activeBtn.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
        }
    }, [currentIndex]);

    // Initialize mode and lock body scroll on open
    useEffect(() => {
        if (!isOpen) return;

        const isMobileScreen = window.innerWidth <= 768;
        setMode(isMobileScreen ? "mobile" : "desktop");
        setCurrentIndex(0);

        const originalBodyOverflow = document.body.style.overflow;
        const originalHtmlOverflow = document.documentElement.style.overflow;
        const originalTouchAction = document.body.style.touchAction;

        document.body.style.overflow = "hidden";
        document.documentElement.style.overflow = "hidden";
        document.body.style.touchAction = "none";

        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                onClose();
            } else if (e.key === "ArrowRight") {
                setCurrentIndex((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
            } else if (e.key === "ArrowLeft") {
                setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
            }
        };

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            document.body.style.overflow = originalBodyOverflow;
            document.documentElement.style.overflow = originalHtmlOverflow;
            document.body.style.touchAction = originalTouchAction;
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [isOpen, steps.length, onClose]);

    const handleSwitchMode = (newMode) => {
        if (newMode === mode) return;
        setMode(newMode);
        setCurrentIndex(0);
    };

    const handleNext = () => {
        if (currentIndex < steps.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            onClose();
            navigate("/register");
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    // Touch swipe support for smooth mobile interaction
    const handleTouchStart = (e) => {
        touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = (e) => {
        if (touchStartX.current === null) return;
        const touchEndX = e.changedTouches[0].clientX;
        const diffX = touchStartX.current - touchEndX;

        if (diffX > 50) {
            handleNext();
        } else if (diffX < -50) {
            handlePrev();
        }
        touchStartX.current = null;
    };

    if (!isOpen) return null;

    const modalContent = (
        <div className="demo-overlay" onClick={onClose} role="dialog" aria-modal="true">
            <div className="demo-modal" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="demo-header">
                    <div className="demo-mode-switcher">
                        <button
                            type="button"
                            className={`demo-mode-btn ${mode === "desktop" ? "active" : ""}`}
                            onClick={() => handleSwitchMode("desktop")}
                        >
                            <Monitor className="mode-icon" />
                            <span>Ordinateur</span>
                        </button>
                        <button
                            type="button"
                            className={`demo-mode-btn ${mode === "mobile" ? "active" : ""}`}
                            onClick={() => handleSwitchMode("mobile")}
                        >
                            <Smartphone className="mode-icon" />
                            <span>Téléphone</span>
                        </button>
                    </div>

                    <button
                        type="button"
                        className="demo-close-btn"
                        onClick={onClose}
                        aria-label="Fermer la démo"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Navigation Tabs */}
                <div className="demo-tabs" ref={tabsRef}>
                    {steps.map((step, idx) => (
                        <button
                            key={step.id}
                            type="button"
                            className={`demo-tab-item ${idx === currentIndex ? "active" : ""}`}
                            onClick={() => setCurrentIndex(idx)}
                        >
                            <span className="tab-number">{idx + 1}</span>
                            <span className="tab-title">{step.tab}</span>
                        </button>
                    ))}
                </div>

                {/* Main Content Area - Smooth Sliding Carousel */}
                <div
                    className="demo-body"
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                >
                    <div className={`demo-preview-container ${mode === "mobile" ? "mobile-frame-wrapper" : ""}`}>
                        <div className="demo-carousel-viewport">
                            <div
                                className="demo-carousel-track"
                                style={{
                                    transform: `translateX(-${currentIndex * 100}%)`
                                }}
                            >
                                {steps.map((step, idx) => (
                                    <div
                                        key={step.id}
                                        className="demo-carousel-slide"
                                        aria-hidden={idx !== currentIndex}
                                    >
                                        <img
                                            src={step.image}
                                            alt={step.alt}
                                            className={`demo-preview-image ${mode === "mobile" ? "mobile-image" : "desktop-image"}`}
                                            loading="eager"
                                            decoding="async"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer with Info & Controls */}
                <div className="demo-footer">
                    <div className="demo-info" key={currentStep.id}>
                        <div className="demo-step-badge">
                            Étape {currentIndex + 1} sur {steps.length}
                        </div>
                        <h3 className="demo-step-title">{currentStep.title}</h3>
                        <p className="demo-step-description">{currentStep.description}</p>
                    </div>

                    <div className="demo-actions">
                        <div className="demo-nav-buttons">
                            <button
                                type="button"
                                className="demo-btn-secondary"
                                onClick={handlePrev}
                                disabled={currentIndex === 0}
                            >
                                <ChevronLeft size={18} />
                                <span>Précédent</span>
                            </button>
                            <button
                                type="button"
                                className="demo-btn-primary"
                                onClick={handleNext}
                            >
                                <span>{currentIndex === steps.length - 1 ? "Essai gratuit 14j" : "Suivant"}</span>
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return typeof document !== "undefined" ? createPortal(modalContent, document.body) : null;
}
