import React, { useState, useEffect } from "react";
import { User, Camera, Globe, Clock, Check, ChevronRight } from "lucide-react";
import { apiFetch } from "../../utils/api";
import PhoneInput from "../../components/PhoneInput";

export default function ProfilTab({ isMobileView, triggerToast, activeSubSheet, setActiveSubSheet }) {
    const [firstName, setFirstName] = useState("Khalid");
    const [lastName, setLastName] = useState("Sainaro");
    const [email, setEmail] = useState("khalid.cizdoev777@gmail.com");
    const [phone, setPhone] = useState("06 51 60 43 16");
    const [avatarUrl, setAvatarUrl] = useState(null);
    const [language, setLanguage] = useState("FR");
    const [timezone, setTimezone] = useState("Europe/Paris");
    const [civility, setCivility] = useState("Monsieur");
    const [dob, setDob] = useState("15/05/1992");

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
                }
            } catch (err) {
                console.warn("API profile non disponible, conservation des valeurs par défaut:", err.message);
            }
        };

        fetchUserProfile();
    }, []);

    const handleAvatarUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                triggerToast("L'image est trop volumineuse (max 5 Mo)", true);
                return;
            }
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64Data = reader.result;
                setAvatarUrl(base64Data);
                try {
                    await apiFetch('/v1/users/avatar', {
                        method: 'PATCH',
                        body: JSON.stringify({ avatarUrl: base64Data })
                    });
                    window.dispatchEvent(new CustomEvent('userProfileChanged', { detail: { firstName, lastName, phone, email, avatarUrl: base64Data } }));
                    triggerToast("Photo de profil enregistrée dans la base de données !");
                } catch (err) {
                    console.error("Avatar upload error:", err);
                    triggerToast("Photo mise à jour localement");
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        try {
            const res = await apiFetch('/v1/users/me', {
                method: 'PATCH',
                body: JSON.stringify({ firstName, lastName, phone, avatarUrl })
            });
            const updated = res.data?.user || res.user || { firstName, lastName, phone, email, avatarUrl };
            window.dispatchEvent(new CustomEvent('userProfileChanged', { detail: updated }));
            triggerToast("Profil enregistré avec succès !");
        } catch (err) {
            window.dispatchEvent(new CustomEvent('userProfileChanged', { detail: { firstName, lastName, phone, email, avatarUrl } }));
            triggerToast("Profil enregistré localement.");
        }
    };

    if (isMobileView) {
        return (
            <div className="mobile-fields-stack">
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                    <div className="mobile-profile-avatar-circle" style={{ width: '100px', height: '100px', fontSize: '34px', position: 'relative' }}>
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

                <div className="mobile-input-card">
                    <span className="mobile-input-card-label">Prénom</span>
                    <input
                        type="text"
                        className="mobile-input-card-field"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Khalid"
                    />
                </div>

                <div className="mobile-input-card">
                    <span className="mobile-input-card-label">Nom</span>
                    <input
                        type="text"
                        className="mobile-input-card-field"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Sainaro"
                    />
                </div>

                <div className="mobile-input-card select" onClick={() => setActiveSubSheet && setActiveSubSheet("phone")}>
                    <span className="mobile-input-card-label">Téléphone personnel</span>
                    <div className="mobile-input-card-row">
                        <span className="mobile-flag">🇫🇷</span>
                        <span className="mobile-input-card-val">{phone || "Saisir un numéro"}</span>
                        <ChevronRight size={16} style={{ color: '#94a3b8', marginLeft: 'auto' }} />
                    </div>
                </div>

                <div className="mobile-input-card">
                    <span className="mobile-input-card-label">Langue de l'interface</span>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                        <button
                            type="button"
                            className={`pill-btn ${language === 'FR' ? 'active' : ''}`}
                            onClick={() => setLanguage('FR')}
                            style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid var(--border)', fontWeight: 600, backgroundColor: language === 'FR' ? 'var(--sidebar-primary)' : 'var(--card)', color: language === 'FR' ? '#fff' : 'var(--foreground)' }}
                        >
                            🇫🇷 Français (FR)
                        </button>
                        <button
                            type="button"
                            className={`pill-btn ${language === 'EN' ? 'active' : ''}`}
                            onClick={() => setLanguage('EN')}
                            style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid var(--border)', fontWeight: 600, backgroundColor: language === 'EN' ? 'var(--sidebar-primary)' : 'var(--card)', color: language === 'EN' ? '#fff' : 'var(--foreground)' }}
                        >
                            🇬🇧 English (EN)
                        </button>
                    </div>
                </div>

                <div className="mobile-input-card">
                    <span className="mobile-input-card-label">Fuseau horaire</span>
                    <select
                        className="form-input"
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        style={{ width: '100%', marginTop: '6px' }}
                    >
                        <option value="Europe/Paris">Europe/Paris (UTC+01:00 / UTC+02:00)</option>
                        <option value="Europe/London">Europe/London (UTC+00:00 / UTC+01:00)</option>
                        <option value="America/New_York">America/New_York (UTC-05:00)</option>
                        <option value="UTC">UTC (Temps universel)</option>
                    </select>
                </div>

                <div style={{ height: '12px' }} />

                <div className="mobile-save-bar">
                    <button className="mobile-save-btn active" onClick={handleSubmit}>
                        Enregistrer
                    </button>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="profile-form-grid" style={{ border: '1px solid var(--border)', borderRadius: '14px', padding: '24px', backgroundColor: 'var(--card)' }}>
            <div className="form-field form-group-full">
                <label className="form-label">Photo de profil (Avatar)</label>
                <div className="avatar-edit-field">
                    <div className="avatar-preview">
                        {avatarUrl ? <img src={avatarUrl} alt="Avatar" /> : <span>{firstName[0]}{lastName[0]}</span>}
                    </div>
                    <div>
                        <label className="change-avatar-btn">
                            <Camera size={14} />
                            <span>Charger une photo (Cloudinary)</span>
                            <input type="file" accept="image/*" onChange={handleAvatarUpload} />
                        </label>
                        <span style={{ fontSize: '11px', color: 'var(--muted-foreground)', marginTop: '4px', display: 'block' }}>
                            Formats acceptés : JPG, PNG, WEBP. Max 5 Mo.
                        </span>
                    </div>
                </div>
            </div>

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

            <div className="form-field">
                <label className="form-label">Téléphone personnel</label>
                <PhoneInput
                    value={phone}
                    onChange={(formatted) => setPhone(formatted)}
                />
            </div>

            <div className="form-field">
                <label className="form-label">Langue de l'interface</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        type="button"
                        onClick={() => setLanguage("FR")}
                        style={{
                            flex: 1,
                            padding: '9px 12px',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            backgroundColor: language === 'FR' ? 'var(--sidebar-primary)' : 'var(--background)',
                            color: language === 'FR' ? '#fff' : 'var(--foreground)',
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontSize: '13px'
                        }}
                    >
                        🇫🇷 Français (FR)
                    </button>
                    <button
                        type="button"
                        onClick={() => setLanguage("EN")}
                        style={{
                            flex: 1,
                            padding: '9px 12px',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            backgroundColor: language === 'EN' ? 'var(--sidebar-primary)' : 'var(--background)',
                            color: language === 'EN' ? '#fff' : 'var(--foreground)',
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontSize: '13px'
                        }}
                    >
                        🇬🇧 English (EN)
                    </button>
                </div>
            </div>

            <div className="form-field form-group-full">
                <label className="form-label">Fuseau horaire</label>
                <select
                    className="form-input"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                >
                    <option value="Europe/Paris">Europe/Paris (UTC+01:00 / UTC+02:00 - Heure de Paris)</option>
                    <option value="Europe/London">Europe/London (UTC+00:00 - Heure de Londres)</option>
                    <option value="America/New_York">America/New_York (UTC-05:00 - Heure de New York)</option>
                    <option value="UTC">UTC (Temps universel coordonné)</option>
                </select>
            </div>

            <div className="form-group-full" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px', paddingTop: '16px', borderTop: '1px dashed var(--border)' }}>
                <button type="submit" className="save-profile-btn" style={{ padding: '10px 24px', backgroundColor: 'var(--sidebar-primary)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                    Enregistrer les modifications
                </button>
            </div>
        </form>
    );
}
