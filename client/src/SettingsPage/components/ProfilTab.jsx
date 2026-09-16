import React, { useState, useEffect } from "react";
import { User, Camera, ChevronRight, Check, Lock, ShieldCheck, Briefcase, Mail } from "lucide-react";
import { apiFetch } from "../../utils/api";
import PhoneInput from "../../components/PhoneInput";

const CIVILITY_OPTIONS = [
    { value: "Monsieur", label: "M. (Monsieur)" },
    { value: "Madame", label: "Mme (Madame)" },
    { value: "Non précisé", label: "Non précisé" }
];

const TRADE_CATEGORY_NAMES = {
    clim: "Climatisation / PAC air-air",
    pac: "Pompe à chaleur air-eau",
    plombier: "Plomberie & Chauffage",
    cet: "Chauffe-Eau Thermodynamique",
    vmc: "Ventilation mécanique (VMC)",
    solaires: "Panneaux solaires photovoltaïques",
    chaudiere: "Chaudière gaz / fioul",
    poele: "Poêle ou insert bois",
    elec: "Tableau électrique / Bornes",
};

export default function ProfilTab({ isMobileView, triggerToast, activeSubSheet, setActiveSubSheet }) {
    const [firstName, setFirstName] = useState("Khalid");
    const [lastName, setLastName] = useState("Sainaro");
    const [email, setEmail] = useState("khalid.cizdoev777@gmail.com");
    const [phone, setPhone] = useState("06 51 60 43 16");
    const [avatarUrl, setAvatarUrl] = useState(null);
    const [civility, setCivility] = useState(() => localStorage.getItem("userCivility") || "Monsieur");
    const [role, setRole] = useState("OWNER");
    const [jobTitle, setJobTitle] = useState(() => localStorage.getItem("userJobTitle") || "Gérant & Artisan");

    const getRoleLabel = (r) => {
        switch (r) {
            case "OWNER":
                return "Propriétaire / Gérant";
            case "MANAGER":
                return "Manager / Administrateur";
            case "TECHNICIAN":
                return "Technicien terrain";
            default:
                return "Membre";
        }
    };

    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                const data = await apiFetch('/v1/users/me');
                const user = data.data?.user || data.user || data;
                if (user) {
                    if (user.firstName) setFirstName(user.firstName);
                    if (user.lastName) setLastName(user.lastName);
                    if (user.email) setEmail(user.email);
                    if (user.phone) setPhone(user.phone);
                    if (user.avatarUrl) setAvatarUrl(user.avatarUrl);
                    if (user.role) setRole(user.role);

                    // Métier / Activités choisies à l'inscription
                    const rawTrades = user.company?.tradeCategories || [];
                    const tradeNames = rawTrades
                        .map((tc) => {
                            const cat = tc.tradeCategory || tc;
                            const id = cat.id || cat.slug;
                            return TRADE_CATEGORY_NAMES[id] || cat.name || id;
                        })
                        .filter(Boolean);

                    const registeredTrades = tradeNames.join(" • ");

                    if (user.jobTitle) {
                        setJobTitle(user.jobTitle);
                        localStorage.setItem("userJobTitle", user.jobTitle);
                    } else {
                        const savedJobTitle = localStorage.getItem("userJobTitle");
                        if (!savedJobTitle || savedJobTitle === "Gérant & Artisan" || savedJobTitle === "Gérant artisan" || savedJobTitle === "gerant artisan") {
                            if (registeredTrades) {
                                setJobTitle(registeredTrades);
                                localStorage.setItem("userJobTitle", registeredTrades);
                            } else {
                                setJobTitle("Gérant & Artisan");
                            }
                        } else {
                            setJobTitle(savedJobTitle);
                        }
                    }
                }
            } catch (err) {
                console.warn("API profile non disponible, conservation des valeurs par défaut:", err.message);
            }
        };

        fetchUserProfile();

        const handleExternalUpdate = (e) => {
            if (e.detail?.phone !== undefined) {
                setPhone(e.detail.phone);
            }
        };
        window.addEventListener('userProfileChanged', handleExternalUpdate);
        return () => window.removeEventListener('userProfileChanged', handleExternalUpdate);
    }, []);

    const handleAvatarUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            triggerToast("L'image est trop volumineuse (max 10 Mo)", true);
            return;
        }

        // Preview immediately for instant UI feedback
        const previewUrl = URL.createObjectURL(file);
        setAvatarUrl(previewUrl);

        try {
            window.dispatchEvent(new CustomEvent('autoSaveStatus', { detail: { status: 'saving' } }));
            const formData = new FormData();
            formData.append('avatar', file);

            const res = await apiFetch('/v1/users/me/avatar', {
                method: 'PATCH',
                body: formData
            });

            const uploadedUrl = res.data?.avatarUrl || res.avatarUrl;
            if (uploadedUrl) {
                setAvatarUrl(uploadedUrl);
                window.dispatchEvent(new CustomEvent('userProfileChanged', { detail: { firstName, lastName, phone, email, avatarUrl: uploadedUrl, civility, jobTitle } }));
            }
            window.dispatchEvent(new CustomEvent('autoSaveStatus', { detail: { status: 'saved' } }));
            triggerToast("Photo de profil enregistrée avec succès !");
        } catch (err) {
            console.error("Avatar upload error:", err);
            window.dispatchEvent(new CustomEvent('autoSaveStatus', { detail: { status: 'error' } }));
            triggerToast("Erreur lors de l'enregistrement de la photo", true);
        }
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        localStorage.setItem("userCivility", civility);
        localStorage.setItem("userJobTitle", jobTitle);
        try {
            const res = await apiFetch('/v1/users/me', {
                method: 'PATCH',
                body: JSON.stringify({ firstName, lastName, phone, avatarUrl, jobTitle })
            });
            const updated = res.data?.user || res.user || { firstName, lastName, phone, email, avatarUrl, jobTitle };
            window.dispatchEvent(new CustomEvent('userProfileChanged', { detail: { ...updated, civility, jobTitle } }));
            triggerToast("Profil enregistré avec succès !");
        } catch (err) {
            window.dispatchEvent(new CustomEvent('userProfileChanged', { detail: { firstName, lastName, phone, email, avatarUrl, civility, jobTitle } }));
            triggerToast("Profil enregistré localement.");
        }
    };

    // Auto-save debounced effect for mobile
    const isFirstMount = React.useRef(true);
    const saveTimerRef = React.useRef(null);

    const performSave = React.useCallback(async (dataToSave) => {
        window.dispatchEvent(new CustomEvent('autoSaveStatus', { detail: { status: 'saving' } }));
        const civ = dataToSave.civility !== undefined ? dataToSave.civility : civility;
        const job = dataToSave.jobTitle !== undefined ? dataToSave.jobTitle : jobTitle;
        const fn = dataToSave.firstName !== undefined ? dataToSave.firstName : firstName;
        const ln = dataToSave.lastName !== undefined ? dataToSave.lastName : lastName;
        const ph = dataToSave.phone !== undefined ? dataToSave.phone : phone;
        const av = dataToSave.avatarUrl !== undefined ? dataToSave.avatarUrl : avatarUrl;

        localStorage.setItem("userCivility", civ);
        localStorage.setItem("userJobTitle", job);

        try {
            const res = await apiFetch('/v1/users/me', {
                method: 'PATCH',
                body: JSON.stringify({ firstName: fn, lastName: ln, phone: ph, avatarUrl: av, jobTitle: job })
            });
            const updated = res.data?.user || res.user || { firstName: fn, lastName: ln, phone: ph, email, avatarUrl: av, jobTitle: job };
            window.dispatchEvent(new CustomEvent('userProfileChanged', { detail: { ...updated, civility: civ, jobTitle: job } }));
            window.dispatchEvent(new CustomEvent('autoSaveStatus', { detail: { status: 'saved' } }));
        } catch (err) {
            window.dispatchEvent(new CustomEvent('userProfileChanged', { detail: { firstName: fn, lastName: ln, phone: ph, email, avatarUrl: av, civility: civ, jobTitle: job } }));
            window.dispatchEvent(new CustomEvent('autoSaveStatus', { detail: { status: 'error' } }));
        }
    }, [civility, jobTitle, firstName, lastName, phone, avatarUrl, email]);

    const queueAutoSave = React.useCallback((partial) => {
        window.dispatchEvent(new CustomEvent('autoSaveStatus', { detail: { status: 'saving' } }));
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
            performSave(partial);
        }, 700);
    }, [performSave]);

    // Handle civility change with instant save
    const handleCivilityChange = (newCiv) => {
        setCivility(newCiv);
        performSave({ civility: newCiv });
    };

    if (isMobileView) {
        return (
            <div className="mobile-fields-stack">
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px', position: 'relative' }}>
                    <div className="mobile-profile-avatar-circle" style={{ width: '96px', height: '96px', fontSize: '32px', position: 'relative' }}>
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                            <span>{firstName[0]}{lastName[0]}</span>
                        )}
                        <label className="mobile-avatar-edit-icon" style={{ cursor: 'pointer' }}>
                            <Camera size={14} />
                            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
                        </label>
                    </div>
                </div>

                {/* Civilité Mobile */}
                <div className="mobile-input-card">
                    <span className="mobile-input-card-label">Civilité</span>
                    <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
                        {CIVILITY_OPTIONS.map((opt) => {
                            const isActive = civility === opt.value;
                            return (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => handleCivilityChange(opt.value)}
                                    style={{
                                        flex: 1,
                                        padding: "8px 4px",
                                        borderRadius: "8px",
                                        fontSize: "12px",
                                        fontWeight: 600,
                                        boxSizing: "border-box",
                                        border: isActive ? "1px solid #556B2F" : "1px solid var(--border)",
                                        backgroundColor: isActive ? "#556B2F" : "transparent",
                                        color: isActive ? "#FFFFFF" : "var(--foreground)",
                                        cursor: "pointer",
                                        transition: "background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease"
                                    }}
                                >
                                    {opt.value === "Monsieur" ? "M." : opt.value === "Madame" ? "Mme" : "Autre"}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="mobile-input-card">
                    <span className="mobile-input-card-label">Prénom</span>
                    <input
                        type="text"
                        className="mobile-input-card-field"
                        value={firstName}
                        onChange={(e) => {
                            const val = e.target.value;
                            setFirstName(val);
                            queueAutoSave({ firstName: val });
                        }}
                        onBlur={() => performSave({ firstName })}
                        placeholder="Khalid"
                    />
                </div>

                <div className="mobile-input-card">
                    <span className="mobile-input-card-label">Nom</span>
                    <input
                        type="text"
                        className="mobile-input-card-field"
                        value={lastName}
                        onChange={(e) => {
                            const val = e.target.value;
                            setLastName(val);
                            queueAutoSave({ lastName: val });
                        }}
                        onBlur={() => performSave({ lastName })}
                        placeholder="Sainaro"
                    />
                </div>

                {/* Email de connexion Mobile */}
                <div className="mobile-input-card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span className="mobile-input-card-label">Email de connexion</span>
                        <span style={{ fontSize: "11px", fontWeight: 700, color: "#10B981", display: "inline-flex", alignItems: "center", gap: "3px" }}>
                            <Check size={12} /> Vérifié
                        </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "2px" }}>
                        <Mail size={15} style={{ color: "var(--muted-foreground)" }} />
                        <span style={{ fontSize: "14px", color: "var(--foreground)", fontWeight: 500 }}>{email}</span>
                    </div>
                </div>

                <div className="mobile-input-card select" onClick={() => setActiveSubSheet && setActiveSubSheet("phone")}>
                    <span className="mobile-input-card-label">Téléphone personnel</span>
                    <div className="mobile-input-card-row">
                        <span className="mobile-flag">🇫🇷</span>
                        <span className="mobile-input-card-val">{phone || "Saisir un numéro"}</span>
                        <ChevronRight size={16} style={{ color: '#94a3b8', marginLeft: 'auto' }} />
                    </div>
                </div>

                {/* Rôle & Poste Mobile */}
                <div className="mobile-input-card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span className="mobile-input-card-label">Rôle d'accès</span>
                        <span style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            padding: "2px 6px",
                            borderRadius: "4px",
                            backgroundColor: "rgba(95, 75, 219, 0.12)",
                            color: "var(--primary, #5F4BDB)"
                        }}>
                            {getRoleLabel(role)}
                        </span>
                    </div>
                    <input
                        type="text"
                        className="mobile-input-card-field"
                        value={jobTitle}
                        onChange={(e) => {
                            const val = e.target.value;
                            setJobTitle(val);
                            queueAutoSave({ jobTitle: val });
                        }}
                        onBlur={() => performSave({ jobTitle })}
                        placeholder="Intitulé du poste / Métier"
                        style={{ marginTop: "4px" }}
                    />
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="profile-form-grid" style={{ border: '1px solid var(--border)', borderRadius: '14px', padding: '24px', backgroundColor: 'var(--card)' }}>
            {/* Photo de profil */}
            <div className="form-field form-group-full">
                <label className="form-label">Photo de profil (Avatar)</label>
                <div className="avatar-edit-field">
                    <div className="avatar-preview">
                        {avatarUrl ? <img src={avatarUrl} alt="Avatar" /> : <span>{firstName[0]}{lastName[0]}</span>}
                    </div>
                    <div>
                        <label className="change-avatar-btn">
                            <Camera size={14} />
                            <span>Charger une photo</span>
                            <input type="file" accept="image/*" onChange={handleAvatarUpload} />
                        </label>
                        <span style={{ fontSize: '11px', color: 'var(--muted-foreground)', marginTop: '4px', display: 'block' }}>
                            Formats acceptés : JPG, PNG, WEBP. Max 5 Mo.
                        </span>
                    </div>
                </div>
            </div>

            {/* Civilité */}
            <div className="form-field form-group-full">
                <label className="form-label">Civilité</label>
                <div style={{ display: "flex", gap: "8px" }}>
                    {CIVILITY_OPTIONS.map((opt) => {
                        const isActive = civility === opt.value;
                        return (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => setCivility(opt.value)}
                                style={{
                                    padding: "8px 16px",
                                    borderRadius: "8px",
                                    fontSize: "13px",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    boxSizing: "border-box",
                                    border: isActive ? "1px solid #556B2F" : "1px solid var(--border)",
                                    backgroundColor: isActive ? "#556B2F" : "transparent",
                                    color: isActive ? "#FFFFFF" : "var(--foreground)",
                                    transition: "background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease"
                                }}
                            >
                                {opt.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Prénom & Nom */}
            <div className="form-field">
                <label className="form-label">Prénom</label>
                <input
                    type="text"
                    className="form-input"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                />
            </div>

            <div className="form-field">
                <label className="form-label">Nom</label>
                <input
                    type="text"
                    className="form-input"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                />
            </div>

            {/* Email de connexion */}
            <div className="form-field">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <label className="form-label">Email de connexion</label>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#10B981", display: "inline-flex", alignItems: "center", gap: "3px" }}>
                        <Check size={12} /> Vérifié
                    </span>
                </div>
                <div style={{ position: "relative" }}>
                    <input
                        type="email"
                        className="form-input"
                        value={email}
                        readOnly
                        style={{
                            backgroundColor: "rgba(0, 0, 0, 0.02)",
                            cursor: "not-allowed",
                            opacity: 0.9,
                            paddingRight: "36px"
                        }}
                    />
                    <Lock size={14} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
                </div>
                <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                    Identifiant utilisé pour vous connecter à votre compte
                </span>
            </div>

            {/* Téléphone personnel */}
            <div className="form-field">
                <label className="form-label">Téléphone personnel</label>
                <PhoneInput
                    value={phone}
                    onChange={(formatted) => setPhone(formatted)}
                />
                <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                    Utilisé pour les communications de service et l'équipe
                </span>
            </div>

            {/* Rôle d'accès & Intitulé de poste */}
            <div className="form-field">
                <label className="form-label">Rôle d'accès système</label>
                <div style={{
                    height: "42px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "0 14px",
                    borderRadius: "10px",
                    border: "1px solid var(--border)",
                    backgroundColor: "rgba(0, 0, 0, 0.02)",
                    color: "var(--foreground)",
                    fontSize: "13.5px",
                    fontWeight: 600
                }}>
                    <ShieldCheck size={16} style={{ color: "var(--primary, #5F4BDB)" }} />
                    <span>{getRoleLabel(role)}</span>
                    <span style={{
                        marginLeft: "auto",
                        fontSize: "10.5px",
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: "50px",
                        backgroundColor: "rgba(95, 75, 219, 0.12)",
                        color: "var(--primary, #5F4BDB)"
                    }}>
                        Actif
                    </span>
                </div>
                <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                    Définit vos privilèges d'accès sur l'application
                </span>
            </div>

            <div className="form-field">
                <label className="form-label">Intitulé du poste / Métier</label>
                <div style={{ position: "relative" }}>
                    <input
                        type="text"
                        className="form-input"
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                        placeholder="ex: Gérant & Artisan Chauffagiste..."
                        style={{ paddingLeft: "36px" }}
                    />
                    <Briefcase size={15} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
                </div>
                <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                    Titre professionnel utilisé dans vos échanges
                </span>
            </div>

            {/* Submit Button */}
            <div className="form-group-full" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px', paddingTop: '16px', borderTop: '1px dashed var(--border)' }}>
                <button type="submit" className="save-profile-btn" style={{ padding: '10px 24px', backgroundColor: 'var(--sidebar-primary)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                    Enregistrer les modifications
                </button>
            </div>
        </form>
    );
}
