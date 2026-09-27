import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

/**
 * BottomSheetModal
 * Native mobile bottom sheet with smooth drag-down-to-dismiss gesture and tap-outside-to-close.
 * On desktop (width > 768px), it renders as a sleek centered modal dialog.
 */
export default function BottomSheetModal({
    isOpen,
    onClose,
    children,
    maxWidth = "540px",
    isMobile = false
}) {
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === "Escape") onClose();
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    if (typeof document === "undefined") return null;

    const isMobileDevice = isMobile || (typeof window !== "undefined" && window.innerWidth <= 768);

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 9999999,
                        display: "flex",
                        alignItems: isMobileDevice ? "flex-end" : "center",
                        justifyContent: "center",
                        padding: isMobileDevice ? 0 : "16px",
                        boxSizing: "border-box",
                        overflow: "hidden"
                    }}
                >
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={onClose}
                        style={{
                            position: "fixed",
                            inset: 0,
                            backgroundColor: "rgba(0, 0, 0, 0.72)",
                            backdropFilter: "blur(8px)",
                            WebkitBackdropFilter: "blur(8px)",
                            zIndex: 1
                        }}
                    />

                    {/* Sheet Content */}
                    <motion.div
                        initial={isMobileDevice ? { y: "100%" } : { opacity: 0, scale: 0.96, y: 15 }}
                        animate={isMobileDevice ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
                        exit={isMobileDevice ? { y: "100%" } : { opacity: 0, scale: 0.96, y: 15 }}
                        transition={{
                            type: "spring",
                            damping: 28,
                            stiffness: 320,
                            mass: 0.8
                        }}
                        drag={isMobileDevice ? "y" : false}
                        dragConstraints={{ top: 0 }}
                        dragElastic={{ top: 0, bottom: 0.6 }}
                        onDragEnd={(_, info) => {
                            if (info.offset.y > 80 || info.velocity.y > 350) {
                                onClose();
                            }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            position: "relative",
                            zIndex: 2,
                            backgroundColor: "var(--card)",
                            border: "1px solid var(--border)",
                            borderRadius: isMobileDevice ? "24px 24px 0 0" : "20px",
                            padding: isMobileDevice
                                ? "14px 20px calc(24px + env(safe-area-inset-bottom, 16px)) 20px"
                                : "28px",
                            maxWidth: isMobileDevice ? "100%" : maxWidth,
                            width: "100%",
                            maxHeight: isMobileDevice ? "90vh" : "90vh",
                            overflowY: "auto",
                            boxSizing: "border-box",
                            boxShadow: isMobileDevice ? "0 -10px 40px rgba(0,0,0,0.5)" : "0 25px 60px rgba(0,0,0,0.45)",
                            touchAction: "pan-y"
                        }}
                    >
                        {/* Drag Pill for Mobile */}
                        {isMobileDevice && (
                            <div
                                style={{
                                    width: "100%",
                                    display: "flex",
                                    justifyContent: "center",
                                    paddingBottom: "14px",
                                    cursor: "grab",
                                    touchAction: "none"
                                }}
                            >
                                <div
                                    style={{
                                        width: "44px",
                                        height: "5px",
                                        borderRadius: "3px",
                                        backgroundColor: "var(--border)",
                                        opacity: 0.95
                                    }}
                                />
                            </div>
                        )}

                        {children}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
}
