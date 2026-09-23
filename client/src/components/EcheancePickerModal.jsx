import React, { useState } from "react";
import { motion, useDragControls } from "framer-motion";
import { X, Calendar, Check, ChevronRight } from "lucide-react";

export const ECHEANCE_OPTIONS = [
    { id: "reception", label: "À la réception" },
    { id: "fin_mois", label: "Fin du mois" },
    { id: "7j", label: "7 jours" },
    { id: "10j", label: "10 jours" },
    { id: "15j", label: "15 jours" },
    { id: "30j", label: "30 jours" },
    { id: "30j_fm", label: "30 jours fin du mois" },
    { id: "45j", label: "45 jours" },
    { id: "45j_fm", label: "45 jours fin du mois" },
    { id: "60j", label: "60 jours" },
    { id: "60j_fm", label: "60 jours fin du mois" },
    { id: "90j", label: "90 jours" },
    { id: "90j_fm", label: "90 jours fin du mois" },
    { id: "120j", label: "120 jours" },
    { id: "120j_fm", label: "120 jours fin du mois" },
    { id: "autre", label: "Autre (choisir une date)" },
];

export function computeDueDate(issueDateStr, echeanceOptionId, customDateStr) {
    if (echeanceOptionId === "autre") {
        return customDateStr || issueDateStr || new Date().toISOString().split("T")[0];
    }
    const baseDate = issueDateStr ? new Date(issueDateStr) : new Date();
    if (isNaN(baseDate.getTime())) return issueDateStr;

    let result = new Date(baseDate);

    switch (echeanceOptionId) {
        case "reception":
            break;
        case "fin_mois":
            result = new Date(result.getFullYear(), result.getMonth() + 1, 0);
            break;
        case "7j":
            result.setDate(result.getDate() + 7);
            break;
        case "10j":
            result.setDate(result.getDate() + 10);
            break;
        case "15j":
            result.setDate(result.getDate() + 15);
            break;
        case "30j":
            result.setDate(result.getDate() + 30);
            break;
        case "30j_fm":
            result.setDate(result.getDate() + 30);
            result = new Date(result.getFullYear(), result.getMonth() + 1, 0);
            break;
        case "45j":
            result.setDate(result.getDate() + 45);
            break;
        case "45j_fm":
            result.setDate(result.getDate() + 45);
            result = new Date(result.getFullYear(), result.getMonth() + 1, 0);
            break;
        case "60j":
            result.setDate(result.getDate() + 60);
            break;
        case "60j_fm":
            result.setDate(result.getDate() + 60);
            result = new Date(result.getFullYear(), result.getMonth() + 1, 0);
            break;
        case "90j":
            result.setDate(result.getDate() + 90);
            break;
        case "90j_fm":
            result.setDate(result.getDate() + 90);
            result = new Date(result.getFullYear(), result.getMonth() + 1, 0);
            break;
        case "120j":
            result.setDate(result.getDate() + 120);
            break;
        case "120j_fm":
            result.setDate(result.getDate() + 120);
            result = new Date(result.getFullYear(), result.getMonth() + 1, 0);
            break;
        default:
            result.setDate(result.getDate() + 30);
            break;
    }

    return result.toISOString().split("T")[0];
}

export function getEcheanceLabel(echeanceOptionId, customDateStr) {
    const found = ECHEANCE_OPTIONS.find(o => o.id === echeanceOptionId);
    if (!found) return "À 30 jours";
    if (echeanceOptionId === "autre") {
        return customDateStr
            ? `Autre (${new Date(customDateStr).toLocaleDateString('fr-FR')})`
            : "Autre";
    }
    return found.label;
}

function EcheancePickerModal({ selectedOptionId, customDate, onSelect, onClose }) {
    const dragControls = useDragControls();
    const [tempOption, setTempOption] = useState(selectedOptionId || "30j");
    const [tempCustomDate, setTempCustomDate] = useState(customDate || new Date().toISOString().split("T")[0]);

    const handleConfirm = (optId, custDate) => {
        const id = optId || tempOption;
        const cDate = custDate || tempCustomDate;
        onSelect({ echeanceOptionId: id, customDateStr: cDate });
        onClose();
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 10500,
                backgroundColor: "rgba(0, 0, 0, 0.55)",
                backdropFilter: "blur(3px)",
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "center"
            }}
            onClick={onClose}
        >
            <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "tween", ease: [0.16, 1, 0.3, 1], duration: 0.32 }}
                drag="y"
                dragListener={false}
                dragControls={dragControls}
                dragConstraints={{ top: 0 }}
                dragElastic={{ top: 0, bottom: 0.6 }}
                onDragEnd={(e, info) => {
                    if (info.offset.y > 80 || info.velocity.y > 300) {
                        onClose();
                    }
                }}
                style={{
                    width: "min(460px, 100%)",
                    maxHeight: "85vh",
                    backgroundColor: "var(--card)",
                    borderRadius: "20px 20px 0 0",
                    border: "1px solid var(--border)",
                    borderBottom: "none",
                    boxShadow: "0 -8px 40px rgba(0,0,0,0.2)",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden"
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Drag handle */}
                <div
                    style={{ display: "flex", justifyContent: "center", width: "100%", paddingTop: "12px", paddingBottom: "4px", cursor: "grab", touchAction: "none" }}
                    onPointerDown={(e) => dragControls.start(e)}
                >
                    <div style={{ width: "38px", height: "4px", backgroundColor: "var(--border, #CBD5E1)", borderRadius: "2px" }} />
                </div>

                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 20px 14px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
                    <span style={{ fontWeight: 800, fontSize: "1.05rem", color: "var(--foreground)" }}>Conditions d'échéance</span>
                    <button
                        onClick={onClose}
                        style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid var(--border)", background: "var(--background)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--muted-foreground)" }}
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* List options */}
                <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
                    {ECHEANCE_OPTIONS.map(opt => {
                        const isSelected = tempOption === opt.id;
                        return (
                            <div key={opt.id}>
                                <button
                                    onClick={() => {
                                        setTempOption(opt.id);
                                        if (opt.id !== "autre") {
                                            handleConfirm(opt.id, tempCustomDate);
                                        }
                                    }}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        width: "100%",
                                        padding: "12px 14px",
                                        marginBottom: 6,
                                        borderRadius: 10,
                                        border: isSelected ? "1.5px solid #556B2F" : "1px solid var(--border)",
                                        background: isSelected ? "rgba(85,107,47,0.08)" : "var(--background)",
                                        cursor: "pointer",
                                        textAlign: "left",
                                        fontFamily: "var(--font-body)",
                                        fontSize: "0.9rem",
                                        fontWeight: isSelected ? 700 : 500,
                                        color: "var(--foreground)",
                                        transition: "all 0.15s ease"
                                    }}
                                >
                                    <span>{opt.label}</span>
                                    {isSelected && <Check size={16} style={{ color: "#556B2F" }} />}
                                </button>

                                {/* If 'autre' is selected, show calendar date picker */}
                                {opt.id === "autre" && isSelected && (
                                    <div style={{ padding: "10px 14px 14px", background: "var(--muted)", borderRadius: 10, marginBottom: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                                        <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase" }}>
                                            Choisir la date d'échéance :
                                        </label>
                                        <input
                                            type="date"
                                            min="1900-01-01"
                                            max="2099-12-31"
                                            value={tempCustomDate}
                                            onChange={e => {
                                                const v = e.target.value;
                                                if (v) {
                                                    const yearStr = v.split("-")[0];
                                                    if (yearStr && yearStr.length > 4) return;
                                                }
                                                setTempCustomDate(v);
                                            }}
                                            style={{
                                                padding: "10px 12px",
                                                borderRadius: 8,
                                                border: "1px solid var(--border)",
                                                background: "var(--card)",
                                                color: "var(--foreground)",
                                                fontSize: "0.95rem",
                                                fontWeight: 700,
                                                width: "100%",
                                                boxSizing: "border-box"
                                            }}
                                        />
                                        <button
                                            onClick={() => handleConfirm("autre", tempCustomDate)}
                                            style={{
                                                padding: "10px",
                                                borderRadius: 8,
                                                border: "none",
                                                background: "#556B2F",
                                                color: "white",
                                                fontWeight: 700,
                                                fontSize: "0.875rem",
                                                cursor: "pointer",
                                                marginTop: 4
                                            }}
                                        >
                                            Valider cette date
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </motion.div>
        </motion.div>
    );
}

export default EcheancePickerModal;
