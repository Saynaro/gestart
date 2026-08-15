import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, User, MapPin, Wrench, ChevronRight, ChevronLeft, Check } from "lucide-react";
import AddressAutocomplete from "../../components/AddressAutocomplete";
import CompanyAutocomplete from "../../components/CompanyAutocomplete";

const formatDateToISO = (dateStr) => {
    if (!dateStr || dateStr === "Non renseigné" || dateStr === "N/A") return "";
    const str = String(dateStr).trim();
    if (str.includes("-")) {
        const parts = str.split("-");
        if (parts[0].length === 4) return str;
        if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    if (str.includes("/")) {
        const parts = str.split("/");
        if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    if (str.includes(".")) {
        const parts = str.split(".");
        if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return "";
};

const formatDateToFR = (isoDate) => {
    if (!isoDate) return "";
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
    const [currentStep, setCurrentStep] = useState(1);

    useEffect(() => {
        if (editingClient) {
            document.body.style.overflow = "hidden";
            setCurrentStep(1); // Reset to step 1 when opening
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [editingClient]);

    const handleNext = (e) => {
        if (e) e.preventDefault();
        if (currentStep < 3) {
            setCurrentStep(prev => prev + 1);
        }
    };

    const handlePrev = (e) => {
        if (e) e.preventDefault();
        if (currentStep > 1) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const isStep1Valid = editingClient?.isOrg 
        ? editFirstName && editFirstName.trim().length > 0
        : (editFirstName && editFirstName.trim().length > 0) || (editLastName && editLastName.trim().length > 0);

    const steps = [
        { id: 1, label: "Contact", icon: User },
        { id: 2, label: "Adresse", icon: MapPin },
        { id: 3, label: "Équipement", icon: Wrench }
    ];

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
                        className="desktop-modal-container step-wizard-modal"
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ duration: 0.2 }}
                    >
                        {/* Header */}
                        <div className="desktop-modal-header">
                            <div>
                                <h2>{editingClient.isNew ? (editingClient.isOrg ? "Nouvelle organisation" : "Nouveau client") : "Modifier le client"}</h2>
                                <span className="wizard-step-indicator-text">Étape {currentStep} sur 3</span>
                            </div>
                            <button className="desktop-modal-close" onClick={() => setEditingClient(null)}>
                                <X size={18} />
                            </button>
                        </div>

                        {/* Progress Bar Line */}
                        <div className="wizard-progress-bar-wrapper">
                            <div className="wizard-progress-track">
                                <div 
                                    className="wizard-progress-fill" 
                                    style={{ width: currentStep === 1 ? '16%' : currentStep === 2 ? '50%' : '100%' }}
                                />
                            </div>
                            <div className="wizard-steps-nodes">
                                {steps.map((s) => {
                                    const StepIcon = s.icon;
                                    const isCompleted = currentStep > s.id;
                                    const isActive = currentStep === s.id;
                                    return (
                                        <div 
                                            key={s.id} 
                                            className={`wizard-step-node ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                                            onClick={() => {
                                                if (s.id < currentStep || (s.id === 2 && isStep1Valid) || s.id === 3) {
                                                    setCurrentStep(s.id);
                                                }
                                            }}
                                            style={{ cursor: s.id <= currentStep ? 'pointer' : 'default' }}
                                        >
                                            <div className="node-circle">
                                                {isCompleted ? <Check size={14} /> : <StepIcon size={14} />}
                                            </div>
                                            <span className="node-label">{s.label}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Step Body Content with Framer Motion slide */}
                        <div className="desktop-modal-body wizard-modal-body">
                            <AnimatePresence mode="wait">
                                {currentStep === 1 && (
                                    <motion.div
                                        key="step1"
                                        initial={{ opacity: 0, x: 15 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -15 }}
                                        transition={{ duration: 0.18 }}
                                        className="wizard-step-content"
                                    >
                                        <h3 className="wizard-section-title">Coordonnées personnelles & contact</h3>
                                        
                                        {editingClient.isOrg ? (
                                            <div className="form-field">
                                                <label className="form-label">Nom de l'organisation (Recherche SIRENE 🇫🇷)*</label>
                                                <CompanyAutocomplete
                                                    value={editFirstName}
                                                    onChange={(val) => setEditFirstName(val)}
                                                    onCompanySelect={(company) => {
                                                        if (company.nom) setEditFirstName(company.nom);
                                                        if (company.adresse) setEditAddress(company.adresse);
                                                        if (company.code_postal) setEditZip(company.code_postal);
                                                        if (company.ville) setEditCity(company.ville);
                                                    }}
                                                    placeholder="Rechercher par nom, SIREN ou SIRET..."
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
                                                        className="form-input wizard-input-large"
                                                        required
                                                        placeholder="ex: Jean"
                                                    />
                                                </div>
                                                <div className="form-field">
                                                    <label className="form-label">Nom*</label>
                                                    <input
                                                        type="text"
                                                        value={editLastName}
                                                        onChange={(e) => setEditLastName(e.target.value)}
                                                        className="form-input wizard-input-large"
                                                        required
                                                        placeholder="ex: Dupont"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <div className="profile-form-grid" style={{ marginTop: '16px' }}>
                                            <div className="form-field">
                                                <label className="form-label">Téléphone</label>
                                                <input
                                                    type="text"
                                                    value={editPhone}
                                                    onChange={(e) => setEditPhone(e.target.value)}
                                                    className="form-input wizard-input-large"
                                                    placeholder="06 12 34 56 78"
                                                />
                                            </div>
                                            <div className="form-field">
                                                <label className="form-label">Email</label>
                                                <input
                                                    type="email"
                                                    value={editEmail}
                                                    onChange={(e) => setEditEmail(e.target.value)}
                                                    className="form-input wizard-input-large"
                                                    placeholder="client@email.com"
                                                />
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {currentStep === 2 && (
                                    <motion.div
                                        key="step2"
                                        initial={{ opacity: 0, x: 15 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -15 }}
                                        transition={{ duration: 0.18 }}
                                        className="wizard-step-content"
                                    >
                                        <h3 className="wizard-section-title">Adresse principale</h3>

                                        <div className="form-field">
                                            <label className="form-label">Adresse</label>
                                            <AddressAutocomplete
                                                value={editAddress}
                                                onChange={(val) => setEditAddress(val)}
                                                onAddressSelect={(selected) => {
                                                    setEditAddress(selected.street || selected.label);
                                                    if (selected.postcode) setEditZip(selected.postcode);
                                                    if (selected.city) setEditCity(selected.city);
                                                }}
                                                placeholder="ex: 12 Rue de la Paix"
                                                className="form-input-address-autocomplete"
                                            />
                                        </div>

                                        <div className="profile-form-grid" style={{ marginTop: '16px' }}>
                                            <div className="form-field">
                                                <label className="form-label">Code postal</label>
                                                <input
                                                    type="text"
                                                    value={editZip}
                                                    onChange={(e) => setEditZip(e.target.value)}
                                                    className="form-input wizard-input-large"
                                                    placeholder="75002"
                                                />
                                            </div>
                                            <div className="form-field">
                                                <label className="form-label">Ville</label>
                                                <input
                                                    type="text"
                                                    value={editCity}
                                                    onChange={(e) => setEditCity(e.target.value)}
                                                    className="form-input wizard-input-large"
                                                    placeholder="Paris"
                                                />
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {currentStep === 3 && (
                                    <motion.div
                                        key="step3"
                                        initial={{ opacity: 0, x: 15 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -15 }}
                                        transition={{ duration: 0.18 }}
                                        className="wizard-step-content"
                                    >
                                        <h3 className="wizard-section-title">Équipement installé (optionnel)</h3>

                                        <div className="form-field">
                                            <label className="form-label">Marque / Modèle</label>
                                            <input
                                                type="text"
                                                value={editEquipModel}
                                                onChange={(e) => setEditEquipModel(e.target.value)}
                                                className="form-input wizard-input-large"
                                                placeholder="ex: Daikin 3.5kW Inverter"
                                            />
                                        </div>

                                        <div className="profile-form-grid" style={{ marginTop: '16px' }}>
                                            <div className="form-field">
                                                <label className="form-label">Date d'installation</label>
                                                <input
                                                    type="date"
                                                    value={formatDateToISO(editEquipInstallDate)}
                                                    onChange={(e) => setEditEquipInstallDate(formatDateToFR(e.target.value))}
                                                    className="form-input wizard-input-large"
                                                />
                                            </div>
                                            <div className="form-field">
                                                <label className="form-label">N° de série</label>
                                                <input
                                                    type="text"
                                                    value={editEquipSerial}
                                                    onChange={(e) => setEditEquipSerial(e.target.value)}
                                                    className="form-input wizard-input-large"
                                                    placeholder="ex: DK-2024-5678"
                                                />
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Footer Controls */}
                        <div className="desktop-modal-footer wizard-modal-footer">
                            {currentStep === 1 ? (
                                <button className="desktop-modal-cancel-btn" onClick={() => setEditingClient(null)}>
                                    Annuler
                                </button>
                            ) : (
                                <button className="desktop-modal-cancel-btn wizard-nav-btn" onClick={handlePrev}>
                                    <ChevronLeft size={16} /> Précédent
                                </button>
                            )}

                            {currentStep < 3 ? (
                                <button 
                                    className="desktop-modal-save-btn wizard-nav-btn" 
                                    onClick={handleNext}
                                    disabled={!isStep1Valid}
                                    style={{ opacity: !isStep1Valid ? 0.5 : 1, cursor: !isStep1Valid ? 'not-allowed' : 'pointer' }}
                                >
                                    Suivant <ChevronRight size={16} />
                                </button>
                            ) : (
                                <button className="desktop-modal-save-btn wizard-save-btn" onClick={handleSaveClient}>
                                    Enregistrer <Check size={16} />
                                </button>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

export default DesktopEditModal;
