import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronDown, Plus, Search } from "lucide-react";

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
    const handleInputFocus = (e) => {
        const el = e.currentTarget;
        setTimeout(() => {
            el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
        }, 250);
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
                            className="fixed bottom-0 left-0 right-0 z-[2150] mx-auto w-full max-w-md bg-[#f8fafc] rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.15)] overflow-y-auto outline-none"
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
                                        <span className="mobile-form-card-label">Nom de l'organisation*</span>
                                        <input
                                            type="text"
                                            value={editFirstName}
                                            onChange={(e) => setEditFirstName(e.target.value)}
                                            onFocus={handleInputFocus}
                                            className="mobile-form-card-input"
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

                                {/* Toggle Row */}
                                <div className="mobile-toggle-card">
                                    <div className="mobile-toggle-row">
                                        <span className="mobile-toggle-label">Préciser une adresse de livraison différente</span>
                                        <label className="mobile-toggle-switch">
                                            <input
                                                type="checkbox"
                                                checked={editDiffDelivery}
                                                onChange={(e) => setEditDiffDelivery(e.target.checked)}
                                            />
                                            <span className="toggle-slider" />
                                        </label>
                                    </div>
                                    <p className="mobile-toggle-desc">
                                        La modification de l'adresse de livraison depuis le client ne modifiera pas celle sur le document en cours d'édition.
                                    </p>
                                </div>

                                {/* Équipement installé Card */}
                                <div className="mobile-form-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px 18px', backgroundColor: 'white', border: '1px solid var(--border)', borderRadius: '20px' }}>
                                    <span className="mobile-form-card-label" style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--foreground)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                                        Équipement installé
                                    </span>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <label style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Marque / Modèle</label>
                                        <div style={{ backgroundColor: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: '12px', padding: '10px 14px', display: 'flex', alignItems: 'center' }}>
                                            <input
                                                type="text"
                                                placeholder="ex: Mitsubishi 2.5kW"
                                                value={editEquipModel}
                                                onChange={(e) => setEditEquipModel(e.target.value)}
                                                onFocus={handleInputFocus}
                                                style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}
                                            />
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <label style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Date d'installation</label>
                                            <div style={{ backgroundColor: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: '12px', padding: '10px 14px', display: 'flex', alignItems: 'center' }}>
                                                <input
                                                    type="date"
                                                    value={formatDateToISO(editEquipInstallDate)}
                                                    onChange={(e) => setEditEquipInstallDate(formatDateToFR(e.target.value))}
                                                    onFocus={handleInputFocus}
                                                    style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: '0.95rem', fontWeight: 600, color: '#0f172a', fontFamily: 'inherit' }}
                                                />
                                            </div>
                                        </div>
                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <label style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>N° de série</label>
                                            <div style={{ backgroundColor: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: '12px', padding: '10px 14px', display: 'flex', alignItems: 'center' }}>
                                                <input
                                                    type="text"
                                                    placeholder="ex: MB-2024-5678"
                                                    value={editEquipSerial}
                                                    onChange={(e) => setEditEquipSerial(e.target.value)}
                                                    onFocus={handleInputFocus}
                                                    style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Save and Archive Buttons */}
                                <div className="mobile-sheet-actions">
                                    <button className="mobile-sheet-save-btn" onClick={handleSaveClient}>
                                        Enregistrer
                                    </button>
                                    <button className="mobile-sheet-archive-btn" onClick={() => { alert("Archivé !"); setEditingClient(null); }}>
                                        Archiver
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
                            className="fixed bottom-0 left-0 right-0 z-[2250] mx-auto w-full max-w-md bg-white rounded-t-[32px] shadow-[0_-12px_45px_rgba(0,0,0,0.18)] outline-none overflow-y-auto"
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
                                style={{ touchAction: "none", backgroundColor: 'white' }}
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
                                    <div className="mobile-sheet-body-stack" style={{ padding: '0 16px 20px 16px' }}>
                                        <div className="mobile-email-input-pill">
                                            <span className="mobile-email-text">{editEmail || "Saisissez votre email"}</span>
                                            {editEmail && (
                                                <button className="mobile-email-clear-btn" onClick={() => setEditEmail("")}>
                                                    <X size={14} />
                                                </button>
                                            )}
                                        </div>

                                        <div className="mobile-email-add-row">
                                            <input
                                                type="email"
                                                placeholder="Saisissez votre email"
                                                value={editEmail}
                                                onChange={(e) => setEditEmail(e.target.value)}
                                                className="mobile-email-add-input"
                                            />
                                            <button className="mobile-email-add-btn">
                                                <Plus size={18} />
                                            </button>
                                        </div>

                                        <p className="mobile-sub-sheet-desc">
                                            Vous pouvez ajouter plusieurs adresses e-mails pour un même client
                                        </p>

                                        <button className="mobile-sub-sheet-confirm-btn" onClick={() => setActiveSubSheet(null)}>
                                            Confirmer
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* SUB-SHEET 2: PHONE EDIT */}
                            {activeSubSheet === "phone" && (
                                <div>
                                    <div className="mobile-sheet-body-stack" style={{ padding: '0 16px' }}>
                                        <div className="mobile-phone-input-row">
                                            <div className="mobile-phone-country">
                                                <span className="mobile-flag" style={{ fontSize: '18px' }}>🇫🇷</span>
                                                <span className="mobile-phone-code">+33</span>
                                            </div>
                                            <div className="mobile-phone-number-field">
                                                <input
                                                    type="tel"
                                                    value={editPhone}
                                                    onChange={(e) => setEditPhone(e.target.value)}
                                                    placeholder="01 23 45 67 89"
                                                    className="mobile-phone-number-input"
                                                />
                                                {editPhone && (
                                                    <button className="mobile-phone-clear-btn" onClick={() => setEditPhone("")}>
                                                        <X size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <button className="mobile-sub-sheet-confirm-btn" onClick={() => setActiveSubSheet(null)}>
                                            Ajouter ce numéro
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* SUB-SHEET 3: ADDRESS EDIT */}
                            {activeSubSheet === "address" && (
                                <div>
                                    <div className="mobile-sheet-body-stack" style={{ padding: '0 16px 20px 16px' }}>
                                        <div className="mobile-address-search-card">
                                            <Search size={18} className="mobile-search-icon-left" />
                                            <input
                                                type="text"
                                                placeholder="Chercher une adresse"
                                                className="mobile-address-search-input"
                                            />
                                        </div>

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
                                            <input
                                                type="text"
                                                placeholder="Adresse"
                                                value={editAddress}
                                                onChange={(e) => setEditAddress(e.target.value)}
                                                className="mobile-form-card-input"
                                            />
                                        </div>

                                        <div className="mobile-form-card">
                                            <span className="mobile-form-card-label">Complément d'adresse</span>
                                            <input
                                                type="text"
                                                placeholder="Complément d'adresse"
                                                value={editComplAddress}
                                                onChange={(e) => setEditComplAddress(e.target.value)}
                                                className="mobile-form-card-input"
                                            />
                                        </div>

                                        <div className="mobile-form-card">
                                            <span className="mobile-form-card-label">Code postal</span>
                                            <input
                                                type="text"
                                                placeholder="Code postal"
                                                value={editZip}
                                                onChange={(e) => setEditZip(e.target.value)}
                                                className="mobile-form-card-input"
                                            />
                                        </div>

                                        <div className="mobile-form-card">
                                            <span className="mobile-form-card-label">Ville</span>
                                            <input
                                                type="text"
                                                placeholder="Ville"
                                                value={editCity}
                                                onChange={(e) => setEditCity(e.target.value)}
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
