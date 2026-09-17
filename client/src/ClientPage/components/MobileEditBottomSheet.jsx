import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronDown, Plus } from "lucide-react";
import AddressAutocomplete from "../../components/AddressAutocomplete";
import CompanyAutocomplete from "../../components/CompanyAutocomplete";
import EquipmentSelector from "../../components/EquipmentSelector";
import PhoneInput from "../../components/PhoneInput";

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

function MobileEditBottomSheet({
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
    editComplAddress,
    setEditComplAddress,
    editZip,
    setEditZip,
    editCity,
    setEditCity,
    editDiffDelivery,
    setEditDiffDelivery,
    editEquipModel,
    setEditEquipModel,
    editEquipInstallDate,
    setEditEquipInstallDate,
    editEquipSerial,
    setEditEquipSerial,
    activeSubSheet,
    setActiveSubSheet,
    dragControlsMain,
    dragControlsSub,
    handleSaveClient
}) {
    const [newEmailInput, setNewEmailInput] = React.useState("");

    const emailList = editEmail
        ? editEmail.split(",").map(e => e.trim()).filter(Boolean)
        : [];

    const handleAddEmail = (e) => {
        if (e) e.preventDefault();
        const trimmed = newEmailInput.trim();
        if (!trimmed) return;
        if (!emailList.includes(trimmed)) {
            const updated = [...emailList, trimmed];
            setEditEmail(updated.join(", "));
        }
        setNewEmailInput("");
    };

    const handleRemoveEmail = (indexToRemove) => {
        const updated = emailList.filter((_, idx) => idx !== indexToRemove);
        setEditEmail(updated.join(", "));
    };

    const handleConfirmEmailSubSheet = () => {
        if (newEmailInput.trim()) {
            const trimmed = newEmailInput.trim();
            if (!emailList.includes(trimmed)) {
                const updated = [...emailList, trimmed];
                setEditEmail(updated.join(", "));
            }
            setNewEmailInput("");
        }
        setActiveSubSheet(null);
    };

    const handleInputFocus = (e) => {
        const el = e.currentTarget;
        setTimeout(() => {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
    };

    return (
        <>
            {/* Main Client Edit Sheet (Modifier le client) */}
            <AnimatePresence>
                {editingClient && (
                    <>
                        {/* Backdrop overlay */}
                        <motion.div
                            className="fixed inset-0 z-[2100] bg-black/40 backdrop-blur-[2px]"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setEditingClient(null)}
                        />

                        {/* Bottom Sheet Container */}
                        <motion.div
                            className="fixed bottom-0 left-0 right-0 z-[2150] mx-auto w-full max-w-md bg-[var(--background)] dark:bg-[#141416] rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.15)] overflow-y-auto outline-none"
                            style={{ maxHeight: '92vh', paddingBottom: 'max(20px, env(safe-area-inset-bottom))', willChange: "transform" }}
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "tween", ease: [0.16, 1, 0.3, 1], duration: 0.38 }}
                            drag="y"
                            dragControls={dragControlsMain}
                            dragListener={false}
                            dragConstraints={{ top: 0 }}
                            dragElastic={{ top: 0, bottom: 0.8 }}
                            onDragEnd={(event, info) => {
                                if (info.offset.y > 100) {
                                    setEditingClient(null);
                                }
                            }}
                        >
                            {/* Draggable Header Zone */}
                            <div
                                className="mobile-sheet-header-drag-zone"
                                onPointerDown={(e) => dragControlsMain.start(e)}
                                style={{ touchAction: "none" }}
                            >
                                <div className="mobile-drag-handle-bar" />
                                <div className="mobile-sheet-header" style={{ borderBottom: 'none', backgroundColor: 'transparent' }}>
                                    <button className="mobile-sheet-close-btn" onClick={(e) => { e.stopPropagation(); setEditingClient(null); }}>
                                        <X size={18} />
                                    </button>
                                    <h2 className="mobile-sheet-title">
                                        {editingClient.isNew ? (editingClient.isOrg ? "Nouvelle organisation" : "Nouveau client") : "Modifier le client"}
                                    </h2>
                                    <div style={{ width: '36px' }} />
                                </div>
                            </div>

                            {/* Form Body */}
                            <div className="mobile-sheet-body-stack">
                                {editingClient.isOrg ? (
                                    <div className="mobile-form-card">
                                        <span className="mobile-form-card-label">Nom de l'organisation (SIRENE 🇫🇷)*</span>
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
                                        />
                                    </div>
                                ) : (
                                    <>
                                        <div className="mobile-form-card">
                                            <span className="mobile-form-card-label">Prénom*</span>
                                            <input
                                                type="text"
                                                value={editFirstName}
                                                onChange={(e) => setEditFirstName(e.target.value)}
                                                onFocus={handleInputFocus}
                                                className="mobile-form-card-input"
                                            />
                                        </div>

                                        <div className="mobile-form-card">
                                            <span className="mobile-form-card-label">Nom*</span>
                                            <input
                                                type="text"
                                                value={editLastName}
                                                onChange={(e) => setEditLastName(e.target.value)}
                                                onFocus={handleInputFocus}
                                                className="mobile-form-card-input"
                                            />
                                        </div>
                                    </>
                                )}

                                {/* Phone selector card */}
                                <div className="mobile-form-card select" onClick={() => setActiveSubSheet("phone")}>
                                    <span className="mobile-form-card-label">Téléphone</span>
                                    <div className="mobile-form-card-row">
                                        <span className="mobile-flag">🇫🇷</span>
                                        <span className="mobile-form-card-val">{editPhone || "Saisir un numéro"}</span>
                                        <ChevronDown size={18} className="mobile-card-chevron" />
                                    </div>
                                </div>

                                {/* Email selector card */}
                                <div className="mobile-form-card select" onClick={() => setActiveSubSheet("email")}>
                                    <span className="mobile-form-card-label">Emails</span>
                                    <div className="mobile-form-card-row">
                                        <span className="mobile-form-card-val">{editEmail || "Saisir un email"}</span>
                                        <ChevronDown size={18} className="mobile-card-chevron" />
                                    </div>
                                </div>

                                {/* Address selector card */}
                                <div className="mobile-form-card select" onClick={() => setActiveSubSheet("address")}>
                                    <span className="mobile-form-card-label">Adresse de facturation</span>
                                    <div className="mobile-form-card-row">
                                        <span className="mobile-form-card-val">
                                            {editAddress ? `${editAddress}, ${editZip} ${editCity}` : "Saisir une adresse"}
                                        </span>
                                        <ChevronDown size={18} className="mobile-card-chevron" />
                                    </div>
                                </div>


                                {/* Équipement installé Card */}
                                <div className="mobile-form-card">
                                    <span className="mobile-form-card-label" style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>
                                        Équipement installé
                                    </span>

                                    <EquipmentSelector
                                        value={editEquipModel}
                                        onChange={(val) => setEditEquipModel(val)}
                                        placeholder="Sélectionner ou saisir un équipement..."
                                    />

                                    <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                                        <div className="mobile-inner-input-box" style={{ flex: 1 }}>
                                            <label className="mobile-form-card-label">Date d'installation</label>
                                            <input
                                                type="date"
                                                value={formatDateToISO(editEquipInstallDate)}
                                                onChange={(e) => setEditEquipInstallDate(formatDateToFR(e.target.value))}
                                                onFocus={handleInputFocus}
                                                className="mobile-form-card-input"
                                                style={{ fontFamily: 'inherit' }}
                                            />
                                        </div>
                                        <div className="mobile-inner-input-box" style={{ flex: 1 }}>
                                            <label className="mobile-form-card-label">N° de série</label>
                                            <input
                                                type="text"
                                                placeholder="ex: MB-2024-5678"
                                                value={editEquipSerial}
                                                onChange={(e) => setEditEquipSerial(e.target.value)}
                                                onFocus={handleInputFocus}
                                                className="mobile-form-card-input"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Save and Archive Buttons */}
                                <div className="mobile-sheet-actions">
                                    <button className="mobile-sheet-save-btn" onClick={handleSaveClient}>
                                        Enregistrer
                                    </button>
                                    <button className="mobile-sheet-archive-btn" onClick={() => { setEditingClient(null); }}>
                                        Fermer
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Nested Sub-Sheets (z-index 2200) */}
            <AnimatePresence>
                {activeSubSheet && (
                    <>
                        {/* Nested Backdrop overlay */}
                        <motion.div
                            className="fixed inset-0 z-[2200] bg-black/45 backdrop-blur-[2px]"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setActiveSubSheet(null)}
                        />

                        {/* Sub-Sheet Container */}
                        <motion.div
                            className="fixed bottom-0 left-0 right-0 z-[2250] mx-auto w-full max-w-md bg-white dark:bg-[#141416] rounded-t-[32px] shadow-[0_-12px_45px_rgba(0,0,0,0.18)] outline-none overflow-y-auto"
                            style={{ maxHeight: '92vh', paddingBottom: 'max(20px, env(safe-area-inset-bottom))', willChange: "transform" }}
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "tween", ease: [0.16, 1, 0.3, 1], duration: 0.38 }}
                            drag="y"
                            dragControls={dragControlsSub}
                            dragListener={false}
                            dragConstraints={{ top: 0 }}
                            dragElastic={{ top: 0, bottom: 0.8 }}
                            onDragEnd={(event, info) => {
                                if (info.offset.y > 100) {
                                    setActiveSubSheet(null);
                                }
                            }}
                        >
                            {/* Draggable Header Zone for Sub-Sheet */}
                            <div
                                className="mobile-sheet-header-drag-zone"
                                onPointerDown={(e) => dragControlsSub.start(e)}
                                style={{ touchAction: "none" }}
                            >
                                <div className="mobile-drag-handle-bar" />
                                <div className="mobile-sheet-header" style={{ borderBottom: 'none', backgroundColor: 'transparent' }}>
                                    <button className="mobile-sheet-close-btn" onClick={(e) => { e.stopPropagation(); setActiveSubSheet(null); }}>
                                        <X size={18} />
                                    </button>
                                    <h2 className="mobile-sheet-title">
                                        {activeSubSheet === "email" ? "Adresses e-mails" : activeSubSheet === "phone" ? "Numéro de téléphone" : "Adresse de facturation"}
                                    </h2>
                                    <div style={{ width: '36px' }} />
                                </div>
                            </div>

                            {/* SUB-SHEET 1: EMAIL EDIT */}
                            {activeSubSheet === "email" && (
                                <div>
                                    <div className="mobile-sheet-body-stack" style={{ padding: '16px 16px 20px 16px' }}>
                                        {/* Added email pills */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: emailList.length > 0 ? '12px' : '0' }}>
                                            {emailList.map((email, idx) => (
                                                <div key={idx} className="mobile-email-input-pill">
                                                    <span className="mobile-email-text">{email}</span>
                                                    <button
                                                        type="button"
                                                        className="mobile-email-clear-btn"
                                                        onClick={() => handleRemoveEmail(idx)}
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Input to add email */}
                                        <form onSubmit={handleAddEmail} className="mobile-email-add-row">
                                            <input
                                                type="email"
                                                placeholder="Saisissez votre email"
                                                value={newEmailInput}
                                                onChange={(e) => setNewEmailInput(e.target.value)}
                                                onFocus={handleInputFocus}
                                                className="mobile-email-add-input"
                                            />
                                            <button type="submit" className="mobile-email-add-btn">
                                                <Plus size={18} />
                                            </button>
                                        </form>

                                        <p className="mobile-sub-sheet-desc">
                                            Vous pouvez ajouter plusieurs adresses e-mails pour un même client
                                        </p>

                                        <button className="mobile-sub-sheet-confirm-btn" onClick={handleConfirmEmailSubSheet}>
                                            Confirmer
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* SUB-SHEET 2: PHONE EDIT */}
                            {activeSubSheet === "phone" && (
                                <div>
                                    <div className="mobile-sheet-body-stack" style={{ padding: '16px 16px 20px 16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                        <PhoneInput
                                            value={editPhone}
                                            onChange={(formatted) => setEditPhone(formatted)}
                                            autoFocus
                                        />

                                        <button className="mobile-sub-sheet-confirm-btn" onClick={() => setActiveSubSheet(null)}>
                                            Valider ce numéro
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* SUB-SHEET 3: ADDRESS EDIT */}
                            {activeSubSheet === "address" && (
                                <div>
                                    <div className="mobile-sheet-body-stack" style={{ padding: '16px 16px 20px 16px' }}>
                                        <div className="mobile-form-card select">
                                            <span className="mobile-form-card-label">Pays</span>
                                            <div className="mobile-form-card-row">
                                                <span className="mobile-flag">🇫🇷</span>
                                                <span className="mobile-form-card-val" style={{ fontWeight: 700 }}>France</span>
                                                <ChevronDown size={18} className="mobile-card-chevron" />
                                            </div>
                                        </div>

                                        <div className="mobile-form-card">
                                            <span className="mobile-form-card-label">Adresse</span>
                                            <AddressAutocomplete
                                                value={editAddress}
                                                onChange={(val) => setEditAddress(val)}
                                                onAddressSelect={(selected) => {
                                                    setEditAddress(selected.street || selected.label);
                                                    if (selected.postcode) setEditZip(selected.postcode);
                                                    if (selected.city) setEditCity(selected.city);
                                                }}
                                                placeholder="ex: 12 Rue de la Paix"
                                                className="mobile-address-autocomplete"
                                            />
                                        </div>

                                        <div className="mobile-form-card">
                                            <span className="mobile-form-card-label">Complément d'adresse</span>
                                            <input
                                                type="text"
                                                placeholder="ex: Bâtiment B, Apt 4"
                                                value={editComplAddress}
                                                onChange={(e) => setEditComplAddress(e.target.value)}
                                                onFocus={handleInputFocus}
                                                className="mobile-form-card-input"
                                            />
                                        </div>

                                        <div className="mobile-form-card">
                                            <span className="mobile-form-card-label">Code postal</span>
                                            <input
                                                type="text"
                                                placeholder="ex: 75001"
                                                value={editZip}
                                                onChange={(e) => setEditZip(e.target.value)}
                                                onFocus={handleInputFocus}
                                                className="mobile-form-card-input"
                                            />
                                        </div>

                                        <div className="mobile-form-card">
                                            <span className="mobile-form-card-label">Ville</span>
                                            <input
                                                type="text"
                                                placeholder="ex: Paris"
                                                value={editCity}
                                                onChange={(e) => setEditCity(e.target.value)}
                                                onFocus={handleInputFocus}
                                                className="mobile-form-card-input"
                                            />
                                        </div>

                                        <button className="mobile-sub-sheet-confirm-btn" onClick={() => setActiveSubSheet(null)}>
                                            Mettre à jour l'adresse
                                        </button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}

export default MobileEditBottomSheet;
