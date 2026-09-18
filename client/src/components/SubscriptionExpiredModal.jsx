import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, AlertCircle, Sparkles, X } from "lucide-react";
import { useUser } from "../utils/useUser";

export default function SubscriptionExpiredModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [modalData, setModalData] = useState(null);
    const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth <= 768);
    const navigate = useNavigate();
    const { role } = useUser();
    const isTechnician = role === "TECHNICIAN";

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        const handleExpired = (e) => {
            setModalData(e.detail || {});
            setIsOpen(true);
        };

        window.addEventListener("subscription_expired", handleExpired);
        return () => window.removeEventListener("subscription_expired", handleExpired);
    }, []);

    const handleGoToBilling = () => {
        setIsOpen(false);
        navigate("/settings?tab=abonnement");
    };

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => setIsOpen(false)}
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: "rgba(15, 23, 42, 0.65)",
                        backdropFilter: "blur(6px)",
                        WebkitBackdropFilter: "blur(6px)",
                        zIndex: 99999,
                        display: "flex",
                        alignItems: isMobile ? "flex-end" : "center",
                        justifyContent: "center",
                        padding: isMobile ? 0 : "20px"
                    }}
                >
                    <motion.div
                        drag={isMobile ? "y" : false}
                        dragConstraints={{ top: 0 }}
                        dragElastic={{ top: 0, bottom: 0.4 }}
                        onDragEnd={(e, info) => {
                            if (info.offset.y > 70) setIsOpen(false);
                        }}
                        initial={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95, y: 15 }}
                        animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
                        exit={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95, y: 15 }}
                        transition={{ type: "tween", ease: [0.16, 1, 0.3, 1], duration: 0.28 }}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            backgroundColor: "var(--card, #FFFFFF)",
                            color: "var(--foreground, #0F172A)",
                            borderRadius: isMobile ? "24px 24px 0 0" : "20px",
                            maxWidth: isMobile ? "100%" : "420px",
                            width: "100%",
                            padding: isMobile ? "12px 20px 28px 20px" : "24px",
                            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                            border: isMobile ? "none" : "1px solid var(--border, rgba(226, 232, 240, 0.8))",
                            position: "relative",
                            textAlign: "center"
                        }}
                    >
                        {/* Mobile Drag Handle */}
                        {isMobile && (
                            <div style={{
                                width: "36px",
                                height: "4px",
                                borderRadius: "2px",
                                backgroundColor: "rgba(100, 116, 139, 0.3)",
                                margin: "0 auto 16px auto",
                                cursor: "grab"
                            }} />
                        )}

                        {/* Close button */}
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            aria-label="Fermer"
                            style={{
                                position: "absolute",
                                top: isMobile ? "16px" : "16px",
                                right: "16px",
                                width: "32px",
                                height: "32px",
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background: "rgba(100, 116, 139, 0.08)",
                                border: "none",
                                cursor: "pointer",
                                color: "var(--muted-foreground, #64748b)",
                                transition: "all 0.15s ease"
                            }}
                        >
                            <X size={17} />
                        </button>

                        {/* Premium Icon Badge */}
                        <div style={{
                            width: "48px",
                            height: "48px",
                            borderRadius: "14px",
                            backgroundColor: "rgba(85, 107, 47, 0.1)",
                            color: "#556B2F",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            margin: "0 auto 14px auto"
                        }}>
                            <Crown size={24} />
                        </div>

                        {/* Title */}
                        <h3 style={{
                            fontSize: "18px",
                            fontWeight: 700,
                            letterSpacing: "-0.01em",
                            margin: "0 0 8px 0",
                            color: "var(--foreground, #0F172A)"
                        }}>
                            {modalData?.title || (isTechnician ? "Abonnement entreprise expiré" : "Période d'essai expirée")}
                        </h3>

                        {/* Description */}
                        <p style={{
                            fontSize: "13.5px",
                            color: "var(--muted-foreground, #64748b)",
                            lineHeight: "1.5",
                            margin: "0 0 20px 0",
                            padding: "0 4px"
                        }}>
                            {modalData?.message || (isTechnician
                                ? "L'abonnement de votre entreprise a expiré. Veuillez contacter votre administrateur pour réactiver l'accès complet."
                                : "Renouvelez votre offre pour continuer à créer vos devis, factures et gérer vos clients sans interruption."
                            )}
                        </p>

                        {/* Actions */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {!isTechnician ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={handleGoToBilling}
                                        style={{
                                            width: "100%",
                                            height: "44px",
                                            padding: "0 18px",
                                            backgroundColor: "#556B2F",
                                            color: "#FFFFFF",
                                            border: "none",
                                            borderRadius: "12px",
                                            fontWeight: 600,
                                            fontSize: "14px",
                                            cursor: "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            gap: "8px",
                                            boxShadow: "0 4px 14px rgba(85, 107, 47, 0.28)",
                                            transition: "transform 0.15s ease, opacity 0.15s ease"
                                        }}
                                    >
                                        <Sparkles size={15} />
                                        <span>Renouveler mon offre</span>
                                    </button>
                                    
                                    <button
                                        type="button"
                                        onClick={() => setIsOpen(false)}
                                        style={{
                                            width: "100%",
                                            padding: "8px 12px",
                                            backgroundColor: "transparent",
                                            color: "var(--muted-foreground, #64748b)",
                                            border: "none",
                                            borderRadius: "8px",
                                            fontWeight: 500,
                                            fontSize: "13px",
                                            cursor: "pointer",
                                            transition: "color 0.15s ease"
                                        }}
                                    >
                                        Plus tard
                                    </button>
                                </>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    style={{
                                        width: "100%",
                                        height: "44px",
                                        backgroundColor: "#0F172A",
                                        color: "#FFFFFF",
                                        border: "none",
                                        borderRadius: "12px",
                                        fontWeight: 600,
                                        fontSize: "14px",
                                        cursor: "pointer"
                                    }}
                                >
                                    Compris
                                </button>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}
