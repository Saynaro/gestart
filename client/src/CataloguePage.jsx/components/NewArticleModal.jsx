import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, MoreHorizontal, ChevronRight, Tag } from "lucide-react";
import TypePickerSheet from "./TypePickerSheet";
import UnitPickerSheet from "./UnitPickerSheet";

function NewArticleModal({
    isOpen,
    onClose,
    onSave,
    editingArticle,
    showTypePicker,
    setShowTypePicker,
    openTypePicker
}) {
    const [name, setName] = useState("");
    const [reference, setReference] = useState("");
    const [unitPrice, setUnitPrice] = useState("");
    const [tvaRate, setTvaRate] = useState("20");
    const [category, setCategory] = useState("Prestations de services (BIC / BNC)");
    const [unit, setUnit] = useState("À l'unité");
    const [showUnitPicker, setShowUnitPicker] = useState(false);
    const [description, setDescription] = useState("");
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Populate form if editing
    useEffect(() => {
        if (editingArticle) {
            setName(editingArticle.name || "");
            setReference(editingArticle.reference || "");
            setUnitPrice(editingArticle.unitPrice ? String(editingArticle.unitPrice) : "");
            setTvaRate(editingArticle.tvaRate ? String(editingArticle.tvaRate) : "20");
            setCategory(editingArticle.category || "Prestations de services (BIC / BNC)");
            setUnit(editingArticle.unit || "À l'unité");
            setDescription(editingArticle.description || "");
        } else {
            setName("");
            setReference("");
            setUnitPrice("");
            setTvaRate("20");
            setCategory("Prestations de services (BIC / BNC)");
            setUnit("À l'unité");
            setDescription("");
        }
        setShowAdvanced(false);
    }, [editingArticle, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim()) {
            alert("Veuillez saisir une désignation pour l'article.");
            return;
        }

        const payload = {
            id: editingArticle?.id || Date.now(),
            name: name.trim(),
            reference: reference.trim(),
            unitPrice: parseFloat(unitPrice) || 0,
            tvaRate: parseFloat(tvaRate) || 20,
            category: category,
            unit: unit,
            description: description.trim()
        };

        onSave(payload);
        onClose();
    };

    return createPortal(
        <>
            <AnimatePresence>
                <div className="article-modal-overlay">
                    {/* Blurred Backdrop */}
                    <motion.div
                        className="article-modal-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />

                    {/* Modal / Bottom Sheet Window */}
                    <motion.div
                        className="article-modal-window"
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", stiffness: 320, damping: 28 }}
                    >
                        {/* Drag Handle Zone on Mobile */}
                        <div className="mobile-drag-handle-zone">
                            <div className="mobile-drag-handle-pill" />
                        </div>

                        {/* Top Header Bar */}
                        <div className="article-modal-header">
                            <button
                                type="button"
                                className="modal-icon-circle-btn"
                                onClick={onClose}
                                title="Fermer"
                            >
                                <X size={18} />
                            </button>

                            <h2 className="modal-header-title">
                                {editingArticle ? "Modifier l'article" : "Créer un nouvel article"}
                            </h2>

                            <button
                                type="button"
                                className={`modal-icon-circle-btn ${showAdvanced ? "active" : ""}`}
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                title="Options avancées"
                            >
                                <MoreHorizontal size={18} />
                            </button>
                        </div>

                        {/* Modal Body Form */}
                        <form onSubmit={handleSubmit} className="article-modal-form-body">
                            {/* SECTION 1: NOM ET RÉFÉRENCE */}
                            <div className="form-section-group">
                                <h4 className="form-section-title">NOM ET RÉFÉRENCE</h4>
                                <div className="form-section-card">
                                    <div className="form-field-item">
                                        <label className="form-field-label">Désignation*</label>
                                        <input
                                            type="text"
                                            className="form-field-input"
                                            placeholder="Ex: Main d'œuvre diagnostic"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div className="form-field-divider" />

                                    <div className="form-field-item">
                                        <label className="form-field-label">Référence</label>
                                        <input
                                            type="text"
                                            className="form-field-input"
                                            placeholder="Ex: REF-001"
                                            value={reference}
                                            onChange={(e) => setReference(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 2: TARIFICATION & DÉCLARATION */}
                            <div className="form-section-group">
                                <h4 className="form-section-title">TARIFICATION & DÉCLARATION</h4>
                                <div className="form-section-card">
                                    <div className="form-field-item">
                                        <label className="form-field-label">Prix unitaire HT (€)*</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="form-field-input"
                                            placeholder="Ex: 85"
                                            value={unitPrice}
                                            onChange={(e) => setUnitPrice(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div className="form-field-divider" />

                                    <div className="form-field-item">
                                        <label className="form-field-label">Taux TVA (%)</label>
                                        <select
                                            className="form-field-select"
                                            value={tvaRate}
                                            onChange={(e) => setTvaRate(e.target.value)}
                                        >
                                            <option value="20">20% (Taux normal)</option>
                                            <option value="10">10% (Taux intermédiaire)</option>
                                            <option value="5.5">5.5% (Taux réduit)</option>
                                            <option value="0">0% (Exonéré / Franchise)</option>
                                        </select>
                                    </div>

                                    <div className="form-field-divider" />

                                    {/* Type Picker Selector Row */}
                                    <button
                                        type="button"
                                        className="form-field-selector-row"
                                        onClick={openTypePicker}
                                    >
                                        <div className="selector-text-col">
                                            <span className="selector-label">Type d'article (URSSAF)</span>
                                            <span className="selector-val">{category}</span>
                                        </div>
                                        <ChevronRight size={18} className="selector-arrow" />
                                    </button>

                                    <div className="form-field-divider" />

                                    {/* Unit Picker Selector Row */}
                                    <button
                                        type="button"
                                        className="form-field-selector-row"
                                        onClick={() => setShowUnitPicker(true)}
                                    >
                                        <div className="selector-text-col">
                                            <span className="selector-label">Unité de facturation</span>
                                            <span className="selector-val">{unit}</span>
                                        </div>
                                        <ChevronRight size={18} className="selector-arrow" />
                                    </button>

                                    <div className="form-field-divider" />

                                    <div className="form-field-item">
                                        <label className="form-field-label">Description (facultatif)</label>
                                        <textarea
                                            className="form-field-textarea"
                                            placeholder="Description détaillée apparaissant sur les devis et factures..."
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            rows={3}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 3: OPTIONS AVANCÉES */}
                            {showAdvanced && (
                                <div className="form-section-group">
                                    <h4 className="form-section-title">OPTIONS AVANCÉES</h4>
                                    <div className="form-section-card">
                                        <div className="form-field-item">
                                            <label className="form-field-label">Code-barres / EAN</label>
                                            <input type="text" className="form-field-input" placeholder="Ex: 3700123456789" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Submit Button */}
                            <div className="article-modal-footer">
                                <button type="submit" className="article-confirm-submit-btn">
                                    {editingArticle ? "Enregistrer les modifications" : "Confirmer et ajouter"}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            </AnimatePresence>

            {/* Type Picker Sub-Sheet */}
            <TypePickerSheet
                isOpen={showTypePicker}
                onClose={() => setShowTypePicker(false)}
                selectedType={category}
                onSelect={(selectedCategory) => setCategory(selectedCategory)}
            />

            {/* Unit Picker Sub-Sheet */}
            <UnitPickerSheet
                isOpen={showUnitPicker}
                onClose={() => setShowUnitPicker(false)}
                selectedUnit={unit}
                onSelect={(selectedUnit) => setUnit(selectedUnit)}
            />
        </>,
        document.body
    );
}

export default NewArticleModal;
