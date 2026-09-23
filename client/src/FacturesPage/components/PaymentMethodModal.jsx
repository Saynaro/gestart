import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, useDragControls } from "framer-motion";
import { ArrowLeft, Check, X } from "lucide-react";

const PAYMENT_CATEGORIES = [
    {
        title: "Virements",
        methods: [
            { id: "virement", name: "Virement bancaire", subtext: "Votre IBAN sera affiché" },
            { id: "sepa", name: "Prélèvement SEPA", subtext: "Paiement automatique récurrent" }
        ]
    },
    {
        title: "Carte",
        methods: [
            { id: "carte", name: "Carte bancaire", subtext: "Visa, Mastercard, CB" }
        ]
    },
    {
        title: "Traditionnels",
        methods: [
            { id: "cheque", name: "Chèque", subtext: "" },
            { id: "cesu", name: "CESU", subtext: "Chèque emploi service universel" },
            { id: "especes", name: "Espèces", subtext: "" }
        ]
    },
    {
        title: "Paiements en ligne",
        methods: [
            { id: "paypal", name: "PayPal", subtext: "" },
            { id: "stripe", name: "Stripe", subtext: "" }
        ]
    },
    {
        title: "Personnalisé",
        methods: [
            { id: "autre", name: "Autre", subtext: "" }
        ]
    }
];

export default function PaymentMethodModal({ invoice, onConfirm, onClose }) {
    const [selectedMethod, setSelectedMethod] = useState("Virement bancaire");
    const [customMethod, setCustomMethod] = useState("");
    const customInputRef = useRef(null);
    const dragControls = useDragControls();

    const [isMobile, setIsMobile] = useState(
        typeof window !== "undefined" ? window.innerWidth <= 768 : false
    );

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const handleSubmit = (e) => {
        if (e) e.preventDefault();
        const finalMethod = selectedMethod === "Autre"
            ? (customMethod.trim() || "Autre")
            : selectedMethod;
        onConfirm(invoice, finalMethod);
    };

    return createPortal(
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 999999,
                backgroundColor: "rgba(0, 0, 0, 0.65)",
                backdropFilter: "blur(6px)",
                WebkitBackdropFilter: "blur(6px)",
                display: "flex",
                alignItems: isMobile ? "flex-end" : "center",
                justifyContent: "center",
                padding: isMobile ? 0 : "16px",
                boxSizing: "border-box"
            }}
            onClick={onClose}
        >
            <motion.div
                initial={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95, y: 15 }}
                animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
                exit={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95, y: 15 }}
                transition={{ type: "tween", ease: [0.32, 0.72, 0, 1], duration: 0.28 }}
                drag={isMobile ? "y" : false}
                dragListener={false}
                dragControls={dragControls}
                dragConstraints={{ top: 0 }}
                dragElastic={{ top: 0, bottom: 0.6 }}
                onDragEnd={(e, info) => {
                    if (info.offset.y > 80 || info.velocity.y > 300) {
                        onClose();
                    }
                }}
                onClick={(e) => e.stopPropagation()}
                style={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: isMobile ? "28px 28px 0 0" : "20px",
                    maxWidth: isMobile ? "500px" : "460px",
                    width: "100%",
                    maxHeight: isMobile ? "92vh" : "90vh",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: "0 25px 60px rgba(0, 0, 0, 0.4)",
                    overflow: "hidden",
                    willChange: "transform",
                    transform: "translate3d(0, 0, 0)",
                    contain: "paint layout",
                    margin: isMobile ? "0 auto" : undefined
                }}
            >
                {/* Mobile Drag Handle */}
                {isMobile && (
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "center",
                            width: "100%",
                            paddingTop: "12px",
                            paddingBottom: "4px",
                            cursor: "grab",
                            touchAction: "none"
                        }}
                        onPointerDown={(e) => dragControls.start(e)}
                    >
                        <div style={{ width: "38px", height: "4px", backgroundColor: "var(--border, #CBD5E1)", borderRadius: "2px" }} />
                    </div>
                )}

                {/* Header */}
                <div
                    style={{
                        padding: "16px 20px 14px 20px",
                        borderBottom: "1px solid var(--border)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        cursor: isMobile ? "grab" : "default"
                    }}
                    onPointerDown={(e) => {
                        if (isMobile && !e.target.closest("button") && !e.target.closest("input")) {
                            dragControls.start(e);
                        }
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                border: "none",
                                background: "rgba(255, 255, 255, 0.08)",
                                borderRadius: "50%",
                                width: "34px",
                                height: "34px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "var(--foreground)",
                                cursor: "pointer"
                            }}
                        >
                            <ArrowLeft size={18} />
                        </button>
                        <div>
                            <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "var(--foreground)" }}>
                                Encaisser la facture
                            </h3>
                            <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "var(--muted-foreground)" }}>
                                Sélectionnez le mode de règlement pour {invoice?.number || "la facture"}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            border: "none",
                            background: "none",
                            color: "var(--muted-foreground)",
                            cursor: "pointer",
                            padding: "4px"
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Scrollable Body */}
                <div style={{
                    padding: "16px 20px",
                    overflowY: "auto",
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: "18px"
                }}>
                    {PAYMENT_CATEGORIES.map((cat) => (
                        <div key={cat.title}>
                            <h4 style={{
                                margin: "0 0 8px 4px",
                                fontSize: "12px",
                                fontWeight: 700,
                                color: "var(--muted-foreground)",
                                textTransform: "uppercase",
                                letterSpacing: "0.05em"
                            }}>
                                {cat.title}
                            </h4>
                            <div style={{
                                display: "flex",
                                flexDirection: "column",
                                backgroundColor: "rgba(255, 255, 255, 0.02)",
                                border: "1px solid var(--border)",
                                borderRadius: "14px",
                                overflow: "hidden"
                            }}>
                                {cat.methods.map((method, idx) => {
                                    const isSelected = selectedMethod === method.name;
                                    return (
                                        <React.Fragment key={method.id}>
                                            <div
                                                onClick={() => {
                                                    setSelectedMethod(method.name);
                                                    if (method.name === "Autre") {
                                                        setTimeout(() => customInputRef.current?.focus(), 50);
                                                    }
                                                }}
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "space-between",
                                                    padding: "14px 16px",
                                                    borderBottom: (idx < cat.methods.length - 1 || (isSelected && method.name === "Autre")) ? "1px solid var(--border)" : "none",
                                                    backgroundColor: isSelected ? "rgba(255, 255, 255, 0.05)" : "transparent",
                                                    cursor: "pointer",
                                                    transition: "background-color 0.15s ease"
                                                }}
                                            >
                                                <div>
                                                    <div style={{
                                                        fontSize: "14.5px",
                                                        fontWeight: isSelected ? 700 : 600,
                                                        color: isSelected ? "var(--sidebar-primary)" : "var(--foreground)"
                                                    }}>
                                                        {method.name}
                                                    </div>
                                                    {method.subtext && (
                                                        <div style={{
                                                            fontSize: "12px",
                                                            color: "var(--muted-foreground)",
                                                            marginTop: "2px"
                                                        }}>
                                                            {method.subtext}
                                                        </div>
                                                    )}
                                                </div>
                                                <div style={{
                                                    width: "22px",
                                                    height: "22px",
                                                    borderRadius: "50%",
                                                    border: isSelected ? "none" : "1.5px solid var(--border)",
                                                    backgroundColor: isSelected ? "var(--sidebar-primary)" : "transparent",
                                                    color: "#fff",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    flexShrink: 0
                                                }}>
                                                    {isSelected && <Check size={14} strokeWidth={3} />}
                                                </div>
                                            </div>

                                            {/* Expandable input field for "Autre" */}
                                            {method.name === "Autre" && isSelected && (
                                                <div style={{
                                                    padding: "12px 16px",
                                                    backgroundColor: "rgba(0, 0, 0, 0.2)",
                                                    borderBottom: idx < cat.methods.length - 1 ? "1px solid var(--border)" : "none"
                                                }} onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        ref={customInputRef}
                                                        type="text"
                                                        value={customMethod}
                                                        onChange={(e) => setCustomMethod(e.target.value)}
                                                        placeholder="Préciser le moyen de paiement (ex: Crypto, Wise, Troc...)"
                                                        style={{
                                                            width: "100%",
                                                            padding: "10px 14px",
                                                            borderRadius: "10px",
                                                            border: "1.5px solid var(--sidebar-primary)",
                                                            backgroundColor: "var(--card)",
                                                            color: "var(--foreground)",
                                                            fontSize: "13.5px",
                                                            fontWeight: 600,
                                                            outline: "none",
                                                            boxSizing: "border-box"
                                                        }}
                                                        autoFocus
                                                    />
                                                </div>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer Button */}
                <div style={{
                    padding: isMobile ? "14px 20px calc(14px + env(safe-area-inset-bottom, 12px)) 20px" : "14px 20px",
                    borderTop: "1px solid var(--border)",
                    backgroundColor: "var(--card)"
                }}>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        style={{
                            width: "100%",
                            padding: "13px",
                            borderRadius: "12px",
                            border: "none",
                            backgroundColor: "var(--sidebar-primary)",
                            color: "#ffffff",
                            fontWeight: 700,
                            fontSize: "14.5px",
                            cursor: "pointer",
                            boxShadow: "0 4px 14px rgba(95, 75, 219, 0.3)"
                        }}
                    >
                        Valider l'encaissement
                    </button>
                </div>
            </motion.div>
        </motion.div>,
        document.body
    );
}
