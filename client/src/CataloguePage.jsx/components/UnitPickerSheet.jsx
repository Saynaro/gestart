import React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Layers } from "lucide-react";

const BILLING_UNITS = [
    {
        id: "À l'unité",
        title: "À l'unité",
        subtitle: "Comptabilisation par pièce ou article standard"
    },
    {
        id: "À l'heure",
        title: "À l'heure",
        subtitle: "Main d'œuvre horaire, intervention au temps passé"
    },
    {
        id: "Au forfait",
        title: "Au forfait",
        subtitle: "Prestation globale ou formule complète"
    },
    {
        id: "À la journée",
        title: "À la journée",
        subtitle: "Tarif journalier d'intervention"
    },
    {
        id: "Au mètre carré (m²)",
        title: "Au mètre carré (m²)",
        subtitle: "Surfaces à traiter, isoler ou climatiser"
    },
    {
        id: "Au mètre linéaire (m)",
        title: "Au mètre linéaire (m)",
        subtitle: "Longueur de tuyauterie, câbles ou gaines"
    },
    {
        id: "Au kilogramme (kg)",
        title: "Au kilogramme (kg)",
        subtitle: "Recharge de fluides frigorigènes ou matières"
    },
    {
        id: "Au litre (L)",
        title: "Au litre (L)",
        subtitle: "Liquides techniques et produits d'entretien"
    },
    {
        id: "Aucune",
        title: "Sans unité",
        subtitle: "Aucune unité spécifique affichée"
    }
];

function UnitPickerSheet({ isOpen, onClose, selectedUnit, onSelect }) {
    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        className="article-modal-backdrop sub-sheet-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />

                    {/* Sub-Sheet Modal */}
                    <motion.div
                        className="type-picker-sheet-modal"
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", stiffness: 350, damping: 28 }}
                        style={{ maxHeight: "85vh", overflowY: "auto" }}
                    >
                        {/* Drag Handle Bar for mobile */}
                        <div className="mobile-drag-handle-zone">
                            <div className="mobile-drag-handle-pill" />
                        </div>

                        <div className="type-picker-header">
                            <div className="type-picker-title-box">
                                <Layers size={18} />
                                <h3>Unité de facturation</h3>
                            </div>
                            <button type="button" className="type-picker-close-btn" onClick={onClose}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="type-picker-options-list">
                            {BILLING_UNITS.map((u) => {
                                const isSelected = selectedUnit === u.id;
                                return (
                                    <button
                                        type="button"
                                        key={u.id}
                                        className={`type-picker-option-card ${isSelected ? "selected" : ""}`}
                                        onClick={() => {
                                            onSelect(u.id);
                                            onClose();
                                        }}
                                    >
                                        <div className="option-text-col">
                                            <span className="option-title">{u.title}</span>
                                            <span className="option-subtitle">{u.subtitle}</span>
                                        </div>
                                        {isSelected && (
                                            <div className="option-check-badge">
                                                <Check size={16} />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
}

export default UnitPickerSheet;
