import React, { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
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
    const customInputRef = React.useRef(null);

    const handleSubmit = (e) => {
        if (e) e.preventDefault();
        const finalMethod = selectedMethod === "Autre"
            ? (customMethod.trim() || "Autre")
            : selectedMethod;
        onConfirm(invoice, finalMethod);
    };

    return createPortal(
        <AnimatePresence>
            <div
                style={{
                    position: "fixed",
                    inset: 0,
                    zIndex: 999999,
                    backgroundColor: "rgba(0, 0, 0, 0.65)",
                    backdropFilter: "blur(6px)",
                    WebkitBackdropFilter: "blur(6px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "16px",
                    boxSizing: "border-box"
                }}
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ type: "spring", stiffness: 450, damping: 30 }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        backgroundColor: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: "20px",
                        maxWidth: "460px",
                        width: "100%",
                        maxHeight: "90vh",
                        display: "flex",
                        flexDirection: "column",
                        boxShadow: "0 25px 60px rgba(0, 0, 0, 0.4)",
                        overflow: "hidden"
                    }}
                >
                    {/* Header */}
                    <div style={{
                        padding: "18px 20px 14px 20px",
                        borderBottom: "1px solid var(--border)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between"
                    }}>
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
                                    Moyens de paiement acceptés
                                </h3>
                                <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "var(--muted-foreground)" }}>
                                    Sélectionnez le mode pour {invoice?.number || "la facture"}
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
                        padding: "14px 20px",
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
                            Enregistrer
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>,
        document.body
    );
}
