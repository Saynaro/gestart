import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

function DesktopEditModal({
    editingClient,
    setEditingClient,
    editFirstName,
    setEditFirstName,
    editLastName,
    setEditLastName,
    editPhone,
    setEditPhone,
    editEmail,
    setEditEmail,
    editAddress,
    setEditAddress,
    editZip,
    setEditZip,
    editCity,
    setEditCity,
    handleSaveClient
}) {
    return (
        <AnimatePresence>
            {editingClient && (
                <div className="desktop-modal-wrapper">
                    {/* Backdrop overlay */}
                    <motion.div
                        className="desktop-modal-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setEditingClient(null)}
                    />

                    {/* Modal Container */}
                    <motion.div
                        className="desktop-modal-container"
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="desktop-modal-header">
                            <h2>Modifier le client</h2>
                            <button className="desktop-modal-close" onClick={() => setEditingClient(null)}>
                                <X size={18} />
                            </button>
                        </div>

                        <div className="desktop-modal-body">
                            {editingClient.isOrg ? (
                                <div className="form-field">
                                    <label className="form-label">Nom de l'organisation*</label>
                                    <input
                                        type="text"
                                        value={editFirstName}
                                        onChange={(e) => setEditFirstName(e.target.value)}
                                        className="form-input"
                                        required
                                    />
                                </div>
                            ) : (
                                <div className="profile-form-grid">
                                    <div className="form-field">
                                        <label className="form-label">Prénom*</label>
                                        <input
                                            type="text"
                                            value={editFirstName}
                                            onChange={(e) => setEditFirstName(e.target.value)}
                                            className="form-input"
                                            required
                                        />
                                    </div>
                                    <div className="form-field">
                                        <label className="form-label">Nom*</label>
                                        <input
                                            type="text"
                                            value={editLastName}
                                            onChange={(e) => setEditLastName(e.target.value)}
                                            className="form-input"
                                            required
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="profile-form-grid" style={{ marginTop: '12px' }}>
                                <div className="form-field">
                                    <label className="form-label">Téléphone</label>
                                    <input
                                        type="text"
                                        value={editPhone}
                                        onChange={(e) => setEditPhone(e.target.value)}
                                        className="form-input"
                                        placeholder="06 12 34 56 78"
                                    />
                                </div>
                                <div className="form-field">
                                    <label className="form-label">Email</label>
                                    <input
                                        type="email"
                                        value={editEmail}
                                        onChange={(e) => setEditEmail(e.target.value)}
                                        className="form-input"
                                        placeholder="client@email.com"
                                    />
                                </div>
                            </div>

                            <div className="form-field" style={{ marginTop: '12px' }}>
                                <label className="form-label">Adresse</label>
                                <input
                                    type="text"
                                    value={editAddress}
                                    onChange={(e) => setEditAddress(e.target.value)}
                                    className="form-input"
                                    placeholder="12 Rue de la Paix"
                                />
                            </div>

                            <div className="profile-form-grid" style={{ marginTop: '12px' }}>
                                <div className="form-field">
                                    <label className="form-label">Code postal</label>
                                    <input
                                        type="text"
                                        value={editZip}
                                        onChange={(e) => setEditZip(e.target.value)}
                                        className="form-input"
                                        placeholder="75002"
                                    />
                                </div>
                                <div className="form-field">
                                    <label className="form-label">Ville</label>
                                    <input
                                        type="text"
                                        value={editCity}
                                        onChange={(e) => setEditCity(e.target.value)}
                                        className="form-input"
                                        placeholder="Paris"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="desktop-modal-footer">
                            <button className="desktop-modal-cancel-btn" onClick={() => setEditingClient(null)}>
                                Annuler
                            </button>
                            <button className="desktop-modal-save-btn" onClick={handleSaveClient}>
                                Enregistrer
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

export default DesktopEditModal;
