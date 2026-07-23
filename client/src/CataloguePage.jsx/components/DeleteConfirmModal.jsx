import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Trash2 } from "lucide-react";

function DeleteConfirmModal({ isOpen, onClose, onConfirm, articleName }) {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="delete-modal-backdrop-container">
                <motion.div
                    className="article-modal-backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                />

                <motion.div
                    className="delete-modal-card"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                >
                    <div className="delete-modal-icon-bg">
                        <AlertTriangle size={24} />
                    </div>

                    <h3 className="delete-modal-title">Supprimer cet article ?</h3>
                    <p className="delete-modal-text">
                        Êtes-vous sûr de vouloir supprimer <strong>"{articleName}"</strong> du catalogue ? Cette action ne pourra pas être annulée.
                    </p>

                    <div className="delete-modal-actions">
                        <button className="delete-cancel-btn" onClick={onClose}>
                            Annuler
                        </button>
                        <button className="delete-confirm-btn" onClick={onConfirm}>
                            <Trash2 size={16} />
                            <span>Supprimer</span>
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

export default DeleteConfirmModal;
