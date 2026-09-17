import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Sparkles, X, CheckCircle2, ArrowRight, ShieldCheck, Zap, Users, MessageSquare, Briefcase } from "lucide-react";
import StripeCheckoutModal from "../SettingsPage/components/StripeCheckoutModal";
import { useSubscription } from "../utils/useSubscription";
import "./PlanUpgradeModal.css";

const REASON_CONFIGS = {
    technicians: {
        badge: "Équipe & Collaborateurs",
        title: "Développez votre équipe sans limite",
        description: "Votre plan actuel a atteint sa limite de techniciens. Passez à l'offre Unlimited pour gérer l'ensemble de vos techniciens et sous-traitants sans restriction.",
        icon: Users,
        features: [
            "Techniciens & sous-traitants illimités",
            "Planning synchronisé multi-équipes",
            "Application mobile dédiée pour chaque technicien",
            "Rapports de rentabilité par collaborateur"
        ]
    },
    clients: {
        badge: "Base de Clients",
        title: "Capacité maximale de clients atteinte",
        description: "Votre entreprise grandit ! Pour continuer à enregistrer de nouveaux clients sans aucune limite de volume, passez à l'offre Unlimited.",
        icon: Briefcase,
        features: [
            "Clients & organisations illimités",
            "Historique complet et fiches équipements illimitées",
            "Import / Export illimité de vos fichiers clients",
            "Recherche instantanée et archivage sécurisé"
        ]
    },
    sms: {
        badge: "Messagerie & SMS",
        title: "Solde SMS mensuel épuisé",
        description: "Vous avez atteint votre quota de SMS pour ce mois. Passez au plan Unlimited pour bénéficier de 500 SMS inclus chaque mois et relancer vos clients en continu.",
        icon: MessageSquare,
        features: [
            "500 SMS professionnels inclus par mois",
            "Relances d'entretien et devis automatiques par SMS",
            "Boîte omnicanale unifiée (SMS, WhatsApp, Email)",
            "Accusés de réception et historique en temps réel"
        ]
    },
    default: {
        badge: "Offre Recommandée",
        title: "Passez à la vitesse supérieure avec Unlimited",
        description: "Débloquez tout le potentiel de GestArt CRM pour automatiser votre gestion, vos équipes et votre relation client.",
        icon: Crown,
        features: [
            "Clients & techniciens 100% illimités",
            "500 SMS / mois et relances automatiques d'entretien",
            "Facturation électronique B2G & Chorus Pro",
            "Support prioritaire 7j/7 avec gestionnaire dédié"
        ]
    }
};

export default function PlanUpgradeModal({
    isOpen: propIsOpen,
    onClose: propOnClose,
    reason = "default",
    title: customTitle,
    description: customDescription,
    targetPlan = "UNLIMITED"
}) {
    const [internalOpen, setInternalOpen] = useState(false);
    const [modalConfig, setModalConfig] = useState(null);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const { refreshSubscription } = useSubscription();

    // Listen to global "open_upgrade_modal" events
    useEffect(() => {
        const handleOpenEvent = (e) => {
            const detail = e?.detail || {};
            setModalConfig({
                reason: detail.reason || "default",
                title: detail.title,
                description: detail.description,
                targetPlan: detail.targetPlan || "UNLIMITED"
            });
            setInternalOpen(true);
        };

        window.addEventListener("open_upgrade_modal", handleOpenEvent);
        return () => window.removeEventListener("open_upgrade_modal", handleOpenEvent);
    }, []);

    const isOpen = propIsOpen !== undefined ? propIsOpen : internalOpen;
    const activeReason = modalConfig?.reason || reason || "default";
    const baseConfig = REASON_CONFIGS[activeReason] || REASON_CONFIGS.default;

    const displayTitle = modalConfig?.title || customTitle || baseConfig.title;
    const displayDescription = modalConfig?.description || customDescription || baseConfig.description;
    const IconComponent = baseConfig.icon || Crown;
    const planToUpgrade = modalConfig?.targetPlan || targetPlan;

    const handleClose = () => {
        setInternalOpen(false);
        setModalConfig(null);
        if (propOnClose) propOnClose();
    };

    const handleStartUpgrade = () => {
        setIsCheckoutOpen(true);
    };

    const handleCheckoutSuccess = () => {
        setIsCheckoutOpen(false);
        handleClose();
        if (refreshSubscription) refreshSubscription();
    };

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <div className="plan-upgrade-modal-overlay" onClick={handleClose}>
                        <motion.div
                            className="plan-upgrade-modal-card"
                            initial={{ opacity: 0, scale: 0.94, y: 16 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.94, y: 16 }}
                            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Close Button */}
                            <button
                                type="button"
                                className="plan-upgrade-close-btn"
                                onClick={handleClose}
                                aria-label="Fermer"
                            >
                                <X size={18} />
                            </button>

                            {/* Top Glowing Icon Badge */}
                            <div className="plan-upgrade-icon-wrapper">
                                <div className="plan-upgrade-icon-box">
                                    <IconComponent size={26} className="plan-upgrade-icon" />
                                </div>
                                <span className="plan-upgrade-pill-tag">
                                    <Sparkles size={12} />
                                    {baseConfig.badge}
                                </span>
                            </div>

                            {/* Header Info */}
                            <div className="plan-upgrade-text-header">
                                <h3 className="plan-upgrade-title">{displayTitle}</h3>
                                <p className="plan-upgrade-desc">{displayDescription}</p>
                            </div>

                            {/* Feature List */}
                            <div className="plan-upgrade-features-box">
                                <div className="plan-upgrade-features-heading">
                                    Inclus avec l'offre Unlimited :
                                </div>
                                <div className="plan-upgrade-features-list">
                                    {baseConfig.features.map((feature, idx) => (
                                        <div key={idx} className="plan-upgrade-feature-row">
                                            <CheckCircle2 size={16} className="plan-upgrade-check-icon" />
                                            <span>{feature}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Bottom Actions */}
                            <div className="plan-upgrade-actions">
                                <button
                                    type="button"
                                    className="plan-upgrade-cta-btn"
                                    onClick={handleStartUpgrade}
                                >
                                    <Zap size={16} />
                                    <span>Passer au plan Unlimited</span>
                                    <ArrowRight size={16} />
                                </button>
                                <button
                                    type="button"
                                    className="plan-upgrade-dismiss-btn"
                                    onClick={handleClose}
                                >
                                    Plus tard
                                </button>
                            </div>

                            <div className="plan-upgrade-guarantee">
                                <ShieldCheck size={13} />
                                <span>Sans engagement · Activation immédiate · Annulation en 1 clic</span>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Direct Stripe Checkout Modal */}
            <StripeCheckoutModal
                isOpen={isCheckoutOpen}
                onClose={() => setIsCheckoutOpen(false)}
                targetPlan={planToUpgrade}
                onSuccess={handleCheckoutSuccess}
            />
        </>
    );
}
