import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

const formatDateToISO = (frDate) => {
    if (!frDate) return "";
    if (frDate.includes("-")) return frDate;
    const parts = frDate.split("/");
    if (parts.length === 3) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return frDate;
};

const formatDateToFR = (isoDate) => {
    if (!isoDate) return "";
    if (isoDate.includes("/")) return isoDate;
    const parts = isoDate.split("-");
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return isoDate;
};

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
    editEquipModel,
    setEditEquipModel,
    editEquipInstallDate,
    setEditEquipInstallDate,
    editEquipSerial,
    setEditEquipSerial,
    handleSaveClient
}) {
    useEffect(() => {
        if (editingClient) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [editingClient]);
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
                            <h2>{editingClient.isNew ? (editingClient.isOrg ? "Nouvelle organisation" : "Nouveau client") : "Modifier le client"}</h2>
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
                                            placeholder="Prénom"
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
                                            placeholder="Nom"
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

                            {/* Équipement installé */}
                            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                                <h4 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '12px', color: 'var(--foreground)' }}>Équipement installé</h4>

                                <div className="form-field">
                                    <label className="form-label">Marque / Modèle</label>
                                    <input
                                        type="text"
                                        value={editEquipModel}
                                        onChange={(e) => setEditEquipModel(e.target.value)}
                                        className="form-input"
                                        placeholder="ex: Mitsubishi 2.5kW"
                                    />
                                </div>

                                <div className="profile-form-grid" style={{ marginTop: '12px' }}>
                                    <div className="form-field">
                                        <label className="form-label">Date d'installation</label>
                                        <input
                                            type="date"
                                            value={formatDateToISO(editEquipInstallDate)}
                                            onChange={(e) => setEditEquipInstallDate(formatDateToFR(e.target.value))}
                                            className="form-input"
                                        />
                                    </div>
                                    <div className="form-field">
                                        <label className="form-label">N° de série</label>
                                        <input
                                            type="text"
                                            value={editEquipSerial}
                                            onChange={(e) => setEditEquipSerial(e.target.value)}
                                            className="form-input"
                                            placeholder="ex: MB-2024-5678"
                                        />
                                    </div>
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
