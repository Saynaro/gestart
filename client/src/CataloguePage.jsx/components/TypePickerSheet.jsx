import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Tag } from "lucide-react";

const ARTICLE_TYPES = [
    {
        id: "Prestations de services (BIC / BNC)",
        title: "Prestations de services (BIC / BNC)",
        subtitle: "Main d'œuvre, diagnostic, entretien, installation, réparation"
    },
    {
        id: "Vente de marchandises (BIC)",
        title: "Vente de marchandises (BIC)",
        subtitle: "Achat / revente d'équipements, pièces détachées, fournitures"
    },
    {
        id: "Matériel & Équipement",
        title: "Matériel & Équipement",
        subtitle: "Pompes à chaleur, unités de climatisation, accessoires"
    },
    {
        id: "Autre prestation",
        title: "Autre prestation",
        subtitle: "Frais de déplacement, forfait interventions"
    }
];

function TypePickerSheet({ isOpen, onClose, selectedType, onSelect }) {
    return (
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
                    >
                        {/* Drag Handle Bar for mobile */}
                        <div className="mobile-drag-handle-zone">
                            <div className="mobile-drag-handle-pill" />
                        </div>

                        <div className="type-picker-header">
                            <div className="type-picker-title-box">
                                <Tag size={18} />
                                <h3>Type d'article (URSSAF)</h3>
                            </div>
                            <button className="type-picker-close-btn" onClick={onClose}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="type-picker-options-list">
                            {ARTICLE_TYPES.map((type) => {
                                const isSelected = selectedType === type.id;
                                return (
                                    <button
                                        key={type.id}
                                        className={`type-picker-option-card ${isSelected ? "selected" : ""}`}
                                        onClick={() => {
                                            onSelect(type.id);
                                            onClose();
                                        }}
                                    >
                                        <div className="option-text-col">
                                            <span className="option-title">{type.title}</span>
                                            <span className="option-subtitle">{type.subtitle}</span>
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
        </AnimatePresence>
    );
}

export default TypePickerSheet;
