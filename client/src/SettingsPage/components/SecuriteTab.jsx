import React, { useState, useEffect } from "react";
import { Shield, Smartphone, Laptop, LogOut, CheckCircle2, Key, Check, Eye, EyeOff, X, Lock } from "lucide-react";
import { apiFetch } from "../../utils/api";

export default function SecuriteTab({ isMobileView, triggerToast, triggerConfirm }) {
    const [loginEmail, setLoginEmail] = useState("");
    const [newEmailInput, setNewEmailInput] = useState("");
    const [emailPasswordInput, setEmailPasswordInput] = useState("");
    const [isChangingEmail, setIsChangingEmail] = useState(false);
    const [emailLoading, setEmailLoading] = useState(false);
    const [showEmailPassword, setShowEmailPassword] = useState(false);

    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [showOldPassword, setShowOldPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isPasswordFocused, setIsPasswordFocused] = useState(false);

    const [is2FAEnabled, setIs2FAEnabled] = useState(false);
    const [twoFALoading, setTwoFALoading] = useState(false);
    const [disconnectLoading, setDisconnectLoading] = useState(false);

    const fetchSecurityData = async () => {
        try {
            const res = await apiFetch('/v1/auth/security');
            const data = res.data || res;
            if (data) {
                if (data.email) {
                    setLoginEmail(data.email);
                    setNewEmailInput(data.email);
                }
                if (data.is2FAEnabled !== undefined) {
                    setIs2FAEnabled(data.is2FAEnabled);
                }
            }
        } catch (err) {
            console.warn("Security data fetch failed, using defaults:", err.message);
        }
    };

    useEffect(() => {
        fetchSecurityData();
    }, []);

    const handleChangeEmailSubmit = async (e) => {
        if (e) e.preventDefault();
        if (!newEmailInput || !newEmailInput.includes('@')) {
            triggerToast("Veuillez saisir une adresse email valide", true);
            return;
        }

        setEmailLoading(true);
        try {
            await apiFetch('/v1/auth/change-email', {
                method: 'PATCH',
                body: JSON.stringify({
                    newEmail: newEmailInput,
                    currentPassword: emailPasswordInput || undefined
                })
            });

            setLoginEmail(newEmailInput);
            setIsChangingEmail(false);
            setEmailPasswordInput("");
            localStorage.setItem('userEmail', newEmailInput);
            triggerToast("Adresse email modifiée avec succès !");
            fetchSecurityData();
        } catch (err) {
            triggerToast(err.message || "Erreur lors du changement d'email", true);
        } finally {
            setEmailLoading(false);
        }
    };

    const rules = {
        length: newPassword.length >= 8,
        uppercase: /[A-Z]/.test(newPassword),
        lowercase: /[a-z]/.test(newPassword),
        number: /[0-9]/.test(newPassword),
    };
    const isPasswordValid = rules.length && rules.uppercase && rules.lowercase && rules.number;
    const isMatch = confirmPassword.length > 0 && newPassword === confirmPassword;

    const handlePasswordChangeSubmit = async (e) => {
        e.preventDefault();
        if (!oldPassword) {
            triggerToast("Veuillez saisir votre ancien mot de passe", true);
            return;
        }
        if (!isPasswordValid) {
            triggerToast("Le nouveau mot de passe ne respecte pas tous les critères de sécurité", true);
            return;
        }
        if (newPassword !== confirmPassword) {
            triggerToast("Les mots de passe ne correspondent pas", true);
            return;
        }

        setPasswordLoading(true);
        try {
            await apiFetch('/v1/auth/change-password', {
                method: 'PATCH',
                body: JSON.stringify({
                    oldPassword,
                    newPassword
                })
            });

            setOldPassword("");
            setNewPassword("");
            setConfirmPassword("");
            triggerToast("Mot de passe modifié avec succès !");
            fetchSecurityData();
        } catch (err) {
            triggerToast(err.message || "Erreur lors du changement de mot de passe", true);
        } finally {
            setPasswordLoading(false);
        }
    };

    const handleToggle2FA = async (checked) => {
        const executeToggle = async () => {
            setTwoFALoading(true);
            try {
                await apiFetch('/v1/auth/2fa/toggle', {
                    method: 'PATCH',
                    body: JSON.stringify({ enabled: checked })
                });
                setIs2FAEnabled(checked);
                triggerToast(
                    checked
                        ? "Double authentification (2FA) activée !"
                        : "Double authentification (2FA) désactivée."
                );
            } catch (err) {
                triggerToast(err.message || "Erreur lors de la modification du 2FA", true);
            } finally {
                setTwoFALoading(false);
            }
        };

        if (!checked) {
            if (triggerConfirm) {
                triggerConfirm({
                    title: "Désactiver la double authentification",
                    message: "Êtes-vous sûr de vouloir désactiver la double authentification (2FA) ? Cela réduira la sécurité de votre compte.",
                    confirmText: "Désactiver",
                    cancelText: "Annuler",
                    type: "danger",
                    onConfirm: executeToggle
                });
            } else if (window.confirm("Êtes-vous sûr de vouloir désactiver la double authentification ?")) {
                executeToggle();
            }
        } else {
            executeToggle();
        }
    };

    const handleDisconnectAll = async () => {
        const doDisconnect = async () => {
            setDisconnectLoading(true);
            try {
                await apiFetch('/v1/auth/sessions', {
                    method: 'DELETE'
                });
                triggerToast("Tous les autres appareils ont été déconnectés avec succès !");
            } catch (err) {
                triggerToast(err.message || "Erreur lors de la déconnexion", true);
            } finally {
                setDisconnectLoading(false);
            }
        };

        if (triggerConfirm) {
            triggerConfirm({
                title: "Déconnexion des autres appareils",
                message: "Voulez-vous déconnecter votre compte de tous les autres téléphones et ordinateurs connectés ? Votre session actuelle restera active.",
                confirmText: "Déconnecter",
                cancelText: "Annuler",
                type: "danger",
                onConfirm: doDisconnect
            });
        } else if (window.confirm("Voulez-vous déconnecter votre compte de tous les autres appareils ? Votre session actuelle restera active.")) {
            doDisconnect();
        }
    };

    if (isMobileView) {
        return (
            <div className="mobile-fields-stack">
                {/* 1. Email de connexion */}
                <div className="mobile-group-section">
                    <h4 className="mobile-group-header">
                        <Shield size={13} style={{ color: "#556B2F" }} />
                        <span>Email de connexion</span>
                    </h4>

                    <div style={{
                        backgroundColor: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: "14px",
                        padding: "12px 14px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px"
                    }}>
                        {!isChangingEmail ? (
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
                                <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
                                    <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>Adresse email actuelle</span>
                                    <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                        {loginEmail || "Chargement..."}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setNewEmailInput("");
                                        setEmailPasswordInput("");
                                        setShowEmailPassword(false);
                                        setIsChangingEmail(true);
                                    }}
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        padding: "7px 12px",
                                        borderRadius: "8px",
                                        backgroundColor: "var(--muted, #F4F3EF)",
                                        color: "var(--foreground)",
                                        border: "1px solid var(--border)",
                                        fontSize: "12.5px",
                                        fontWeight: 600,
                                        cursor: "pointer",
                                        flexShrink: 0
                                    }}
                                >
                                    Modifier
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleChangeEmailSubmit} autoComplete="off" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                <div className="mobile-input-card">
                                    <span className="mobile-input-card-label">Nouvelle adresse email</span>
                                    <input
                                        type="email"
                                        name="new_email_unique_field"
                                        autoComplete="off"
                                        className="mobile-input-card-field"
                                        value={newEmailInput}
                                        onChange={(e) => setNewEmailInput(e.target.value)}
                                        placeholder="nouvel.email@domaine.fr"
                                        required
                                        autoFocus
                                    />
                                </div>

                                <div className="mobile-input-card" style={{ position: "relative" }}>
                                    <span className="mobile-input-card-label">Mot de passe actuel pour confirmation</span>
                                    <div style={{ display: "flex", alignItems: "center" }}>
                                        <input
                                            type={showEmailPassword ? "text" : "password"}
                                            name="security_confirm_pwd_unique"
                                            autoComplete="new-password"
                                            className="mobile-input-card-field"
                                            value={emailPasswordInput}
                                            onChange={(e) => setEmailPasswordInput(e.target.value)}
                                            placeholder="••••••••••••"
                                            style={{ paddingRight: "36px" }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowEmailPassword(prev => !prev)}
                                            style={{
                                                position: "absolute",
                                                right: "12px",
                                                top: "50%",
                                                transform: "translateY(-50%)",
                                                background: "none",
                                                border: "none",
                                                color: "var(--muted-foreground)",
                                                cursor: "pointer",
                                                padding: "4px"
                                            }}
                                        >
                                            {showEmailPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                        </button>
                                    </div>
                                </div>

                                <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "4px" }}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsChangingEmail(false);
                                            setEmailPasswordInput("");
                                        }}
                                        style={{
                                            padding: "7px 14px",
                                            borderRadius: "8px",
                                            backgroundColor: "transparent",
                                            color: "var(--foreground)",
                                            border: "1px solid var(--border)",
                                            fontSize: "12.5px",
                                            fontWeight: 600,
                                            cursor: "pointer"
                                        }}
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={emailLoading}
                                        style={{
                                            padding: "7px 14px",
                                            borderRadius: "8px",
                                            backgroundColor: "#556B2F",
                                            color: "#fff",
                                            border: "none",
                                            fontSize: "12.5px",
                                            fontWeight: 600,
                                            cursor: "pointer"
                                        }}
                                    >
                                        {emailLoading ? "..." : "Confirmer"}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>

                {/* 2. Changer de mot de passe */}
                <div className="mobile-group-section">
                    <h4 className="mobile-group-header">
                        <Key size={13} style={{ color: "#556B2F" }} />
                        <span>Changer le mot de passe</span>
                    </h4>

                    <form onSubmit={handlePasswordChangeSubmit} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <div className="mobile-input-card" style={{ position: "relative" }}>
                            <span className="mobile-input-card-label">Ancien mot de passe</span>
                            <div style={{ display: "flex", alignItems: "center" }}>
                                <input
                                    type={showOldPassword ? "text" : "password"}
                                    className="mobile-input-card-field"
                                    value={oldPassword}
                                    onChange={(e) => setOldPassword(e.target.value)}
                                    placeholder="••••••••••••"
                                    required
                                    style={{ paddingRight: "36px" }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowOldPassword(prev => !prev)}
                                    style={{
                                        position: "absolute",
                                        right: "12px",
                                        top: "50%",
                                        transform: "translateY(-50%)",
                                        background: "none",
                                        border: "none",
                                        color: "var(--muted-foreground)",
                                        cursor: "pointer",
                                        padding: "4px"
                                    }}
                                >
                                    {showOldPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                        </div>

                        <div className="mobile-input-card" style={{ position: "relative" }}>
                            <span className="mobile-input-card-label">Nouveau mot de passe</span>
                            <div style={{ display: "flex", alignItems: "center" }}>
                                <input
                                    type={showNewPassword ? "text" : "password"}
                                    className="mobile-input-card-field"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    onFocus={() => setIsPasswordFocused(true)}
                                    onBlur={() => setIsPasswordFocused(false)}
                                    placeholder="Min. 8 caractères"
                                    required
                                    style={{ paddingRight: "36px" }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNewPassword(prev => !prev)}
                                    style={{
                                        position: "absolute",
                                        right: "12px",
                                        top: "50%",
                                        transform: "translateY(-50%)",
                                        background: "none",
                                        border: "none",
                                        color: "var(--muted-foreground)",
                                        cursor: "pointer",
                                        padding: "4px"
                                    }}
                                >
                                    {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                        </div>

                        {/* Password rules compact preview */}
                        {(isPasswordFocused || newPassword.length > 0) && (
                            <div style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                gap: "4px 8px",
                                padding: "8px 12px",
                                backgroundColor: "var(--muted, #F8FAFC)",
                                borderRadius: "8px",
                                border: "1px solid var(--border)"
                            }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: rules.length ? "#15803D" : "#991B1B", fontWeight: 600 }}>
                                    {rules.length ? <Check size={12} /> : <X size={12} />}
                                    <span>8+ caractères</span>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: rules.uppercase ? "#15803D" : "#991B1B", fontWeight: 600 }}>
                                    {rules.uppercase ? <Check size={12} /> : <X size={12} />}
                                    <span>1 majuscule (A-Z)</span>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: rules.lowercase ? "#15803D" : "#991B1B", fontWeight: 600 }}>
                                    {rules.lowercase ? <Check size={12} /> : <X size={12} />}
                                    <span>1 minuscule (a-z)</span>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: rules.number ? "#15803D" : "#991B1B", fontWeight: 600 }}>
                                    {rules.number ? <Check size={12} /> : <X size={12} />}
                                    <span>1 chiffre (0-9)</span>
                                </div>
                            </div>
                        )}

                        <div className="mobile-input-card" style={{ position: "relative" }}>
                            <span className="mobile-input-card-label">Confirmer le nouveau mot de passe</span>
                            <div style={{ display: "flex", alignItems: "center" }}>
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    className="mobile-input-card-field"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirmez le mot de passe"
                                    required
                                    style={{ paddingRight: "36px" }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(prev => !prev)}
                                    style={{
                                        position: "absolute",
                                        right: "12px",
                                        top: "50%",
                                        transform: "translateY(-50%)",
                                        background: "none",
                                        border: "none",
                                        color: "var(--muted-foreground)",
                                        cursor: "pointer",
                                        padding: "4px"
                                    }}
                                >
                                    {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                        </div>

                        {confirmPassword.length > 0 && (
                            <span style={{ fontSize: "11px", fontWeight: 600, color: isMatch ? "#15803D" : "#991B1B", paddingLeft: "4px" }}>
                                {isMatch ? "✓ Les mots de passe correspondent" : "✗ Les mots de passe ne correspondent pas"}
                            </span>
                        )}

                        <button
                            type="submit"
                            disabled={passwordLoading || !oldPassword || !isPasswordValid || !isMatch}
                            style={{
                                marginTop: "6px",
                                width: "100%",
                                padding: "10px",
                                borderRadius: "10px",
                                backgroundColor: "#556B2F",
                                color: "#ffffff",
                                border: "none",
                                fontWeight: 700,
                                fontSize: "13px",
                                cursor: passwordLoading || !oldPassword || !isPasswordValid || !isMatch ? "not-allowed" : "pointer",
                                opacity: passwordLoading || !oldPassword || !isPasswordValid || !isMatch ? 0.5 : 1
                            }}
                        >
                            {passwordLoading ? "Mise à jour..." : "Mettre à jour le mot de passe"}
                        </button>
                    </form>
                </div>

                {/* 3. Double Authentification (2FA) */}
                <div className="mobile-group-section">
                    <h4 className="mobile-group-header">
                        <Lock size={13} style={{ color: "#556B2F" }} />
                        <span>Double Authentification</span>
                    </h4>

                    <div style={{
                        backgroundColor: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: "14px",
                        padding: "12px 14px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "12px"
                    }}>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--foreground)" }}>Code 2FA par e-mail</span>
                                {is2FAEnabled && (
                                    <span style={{ fontSize: "10px", fontWeight: 700, color: "#10B981", display: "inline-flex", alignItems: "center", gap: "2px" }}>
                                        <CheckCircle2 size={11} /> Actif
                                    </span>
                                )}
                            </div>
                            <span style={{ fontSize: "11px", color: "var(--muted-foreground)", marginTop: "2px" }}>
                                Envoie un code à 6 chiffres par email à chaque connexion
                            </span>
                        </div>

                        <label className="mobile-toggle-switch" style={{ opacity: twoFALoading ? 0.6 : 1 }}>
                            <input
                                type="checkbox"
                                checked={is2FAEnabled}
                                disabled={twoFALoading}
                                onChange={(e) => handleToggle2FA(e.target.checked)}
                            />
                            <span className="toggle-slider" />
                        </label>
                    </div>
                </div>

                {/* 4. Déconnexion des autres appareils */}
                <div className="mobile-group-section" style={{ marginBottom: "28px" }}>
                    <h4 className="mobile-group-header">
                        <LogOut size={13} style={{ color: "#ef4444" }} />
                        <span>Gestion des appareils</span>
                    </h4>

                    <div style={{
                        backgroundColor: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: "14px",
                        padding: "12px 14px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px"
                    }}>
                        <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
                            Déconnecte immédiatement votre compte de tous les autres smartphones, tablettes ou ordinateurs connectés.
                        </span>
                        <button
                            type="button"
                            onClick={handleDisconnectAll}
                            disabled={disconnectLoading}
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "6px",
                                width: "100%",
                                padding: "9px 12px",
                                borderRadius: "8px",
                                backgroundColor: "transparent",
                                color: "#ef4444",
                                border: "1px solid var(--border)",
                                fontSize: "12.5px",
                                fontWeight: 600,
                                cursor: "pointer"
                            }}
                        >
                            <LogOut size={13} />
                            <span>{disconnectLoading ? "Déconnexion..." : "Déconnecter les autres appareils"}</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
            {/* Section 1: Email de connexion */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', backgroundColor: 'var(--card)', width: '100%', boxSizing: 'border-box' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Shield size={18} style={{ color: '#556B2F' }} />
                    Email de connexion
                </h3>

                {!isChangingEmail ? (
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                            <label className="form-label">Adresse email actuelle</label>
                            <input
                                type="email"
                                className="form-input"
                                value={loginEmail}
                                readOnly
                                style={{ width: '100%', boxSizing: 'border-box', opacity: 0.9, backgroundColor: 'var(--background)' }}
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setNewEmailInput("");
                                setEmailPasswordInput("");
                                setShowEmailPassword(false);
                                setIsChangingEmail(true);
                            }}
                            style={{ padding: '10px 18px', backgroundColor: '#556B2F', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                        >
                            Modifier l'email
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleChangeEmailSubmit} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                                <label className="form-label">Nouvelle adresse email</label>
                                <input
                                    type="email"
                                    name="desktop_new_email_unique"
                                    autoComplete="off"
                                    className="form-input"
                                    value={newEmailInput}
                                    onChange={(e) => setNewEmailInput(e.target.value)}
                                    placeholder="nouvel.email@domaine.fr"
                                    required
                                    style={{ width: '100%', boxSizing: 'border-box' }}
                                />
                            </div>
                            <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                                <label className="form-label">Mot de passe actuel pour confirmation</label>
                                <div style={{ position: 'relative', width: '100%' }}>
                                    <input
                                        type={showEmailPassword ? "text" : "password"}
                                        name="desktop_confirm_pwd_unique"
                                        autoComplete="new-password"
                                        className="form-input"
                                        value={emailPasswordInput}
                                        onChange={(e) => setEmailPasswordInput(e.target.value)}
                                        placeholder="••••••••••••"
                                        style={{ width: '100%', boxSizing: 'border-box', paddingRight: '40px' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowEmailPassword(prev => !prev)}
                                        style={{
                                            position: 'absolute',
                                            right: '12px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            color: 'var(--muted-foreground)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            padding: '4px'
                                        }}
                                    >
                                        {showEmailPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsChangingEmail(false);
                                    setEmailPasswordInput("");
                                }}
                                style={{ padding: '8px 16px', backgroundColor: 'transparent', color: 'var(--muted-foreground)', border: '1px solid var(--border)', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                            >
                                Annuler
                            </button>
                            <button
                                type="submit"
                                disabled={emailLoading}
                                style={{ padding: '8px 18px', backgroundColor: '#556B2F', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                            >
                                {emailLoading ? "Enregistrement..." : "Confirmer le nouvel email"}
                            </button>
                        </div>
                    </form>
                )}
            </div>

            {/* Section 2: Mot de passe */}
            <form onSubmit={handlePasswordChangeSubmit} style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', backgroundColor: 'var(--card)', width: '100%', boxSizing: 'border-box' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Key size={18} style={{ color: '#556B2F' }} />
                    Changer le mot de passe
                </h3>
                <div className="profile-form-grid">
                    <div className="form-field form-group-full">
                        <label className="form-label">Ancien mot de passe</label>
                        <div style={{ position: 'relative', width: '100%' }}>
                            <input
                                type={showOldPassword ? "text" : "password"}
                                className="form-input"
                                value={oldPassword}
                                onChange={(e) => setOldPassword(e.target.value)}
                                placeholder="••••••••••••"
                                required
                                style={{ width: '100%', boxSizing: 'border-box', paddingRight: '40px' }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowOldPassword(prev => !prev)}
                                style={{
                                    position: 'absolute',
                                    right: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'var(--muted-foreground)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '4px'
                                }}
                            >
                                {showOldPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    <div className="form-field">
                        <label className="form-label">Nouveau mot de passe</label>
                        <div style={{ position: 'relative', width: '100%' }}>
                            <input
                                type={showNewPassword ? "text" : "password"}
                                className="form-input"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                onFocus={() => setIsPasswordFocused(true)}
                                onBlur={() => setIsPasswordFocused(false)}
                                placeholder="Min. 8 caractères"
                                required
                                style={{ width: '100%', boxSizing: 'border-box', paddingRight: '40px' }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowNewPassword(prev => !prev)}
                                style={{
                                    position: 'absolute',
                                    right: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'var(--muted-foreground)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '4px'
                                }}
                            >
                                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>

                        {(isPasswordFocused || newPassword.length > 0) && (
                            <div className="password-rules-box" style={{
                                marginTop: '10px',
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                                gap: '6px 12px',
                                padding: '10px 14px',
                                backgroundColor: 'var(--muted, #F8FAFC)',
                                borderRadius: '8px',
                                border: '1px solid var(--border)'
                            }}>
                                <div className={`rule-item ${rules.length ? 'valid' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: rules.length ? '#15803D' : '#991B1B', fontWeight: rules.length ? 600 : 500 }}>
                                    {rules.length ? <Check size={14} style={{ color: '#15803D' }} /> : <X size={14} style={{ color: '#991B1B' }} />}
                                    <span>Au moins 8 caractères</span>
                                </div>
                                <div className={`rule-item ${rules.uppercase ? 'valid' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: rules.uppercase ? '#15803D' : '#991B1B', fontWeight: rules.uppercase ? 600 : 500 }}>
                                    {rules.uppercase ? <Check size={14} style={{ color: '#15803D' }} /> : <X size={14} style={{ color: '#991B1B' }} />}
                                    <span>1 lettre majuscule (A-Z)</span>
                                </div>
                                <div className={`rule-item ${rules.lowercase ? 'valid' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: rules.lowercase ? '#15803D' : '#991B1B', fontWeight: rules.lowercase ? 600 : 500 }}>
                                    {rules.lowercase ? <Check size={14} style={{ color: '#15803D' }} /> : <X size={14} style={{ color: '#991B1B' }} />}
                                    <span>1 lettre minuscule (a-z)</span>
                                </div>
                                <div className={`rule-item ${rules.number ? 'valid' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: rules.number ? '#15803D' : '#991B1B', fontWeight: rules.number ? 600 : 500 }}>
                                    {rules.number ? <Check size={14} style={{ color: '#15803D' }} /> : <X size={14} style={{ color: '#991B1B' }} />}
                                    <span>1 chiffre (0-9)</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="form-field">
                        <label className="form-label">Confirmer le nouveau mot de passe</label>
                        <div style={{ position: 'relative', width: '100%' }}>
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                className="form-input"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirmez le mot de passe"
                                required
                                style={{ width: '100%', boxSizing: 'border-box', paddingRight: '40px' }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(prev => !prev)}
                                style={{
                                    position: 'absolute',
                                    right: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'var(--muted-foreground)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '4px'
                                }}
                            >
                                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>

                        {confirmPassword.length > 0 && (
                            <div style={{
                                marginTop: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '11.5px',
                                color: isMatch ? '#15803D' : '#991B1B',
                                fontWeight: 600
                            }}>
                                {isMatch ? <Check size={14} style={{ color: '#15803D' }} /> : <X size={14} style={{ color: '#991B1B' }} />}
                                <span>{isMatch ? "Les mots de passe correspondent" : "Les mots de passe ne correspondent pas"}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', paddingTop: '14px', borderTop: '1px dashed var(--border)' }}>
                    <button
                        type="submit"
                        disabled={passwordLoading || !oldPassword || !isPasswordValid || !isMatch}
                        className="save-profile-btn"
                        style={{
                            padding: '10px 22px',
                            backgroundColor: '#556B2F',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 700,
                            fontSize: '13px',
                            cursor: passwordLoading || !oldPassword || !isPasswordValid || !isMatch ? 'not-allowed' : 'pointer',
                            opacity: passwordLoading || !oldPassword || !isPasswordValid || !isMatch ? 0.6 : 1
                        }}
                    >
                        {passwordLoading ? "Mise à jour..." : "Mettre à jour le mot de passe"}
                    </button>
                </div>
            </form>

            {/* Section 3: Double Authentification (2FA) */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', backgroundColor: 'var(--card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', width: '100%', boxSizing: 'border-box' }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <Lock size={18} style={{ color: '#556B2F' }} />
                        Double Authentification (2FA)
                        <span style={{ backgroundColor: is2FAEnabled ? 'rgba(34, 197, 94, 0.12)' : 'rgba(85, 107, 47, 0.1)', color: is2FAEnabled ? '#22c55e' : '#556B2F', fontSize: '11px', padding: '2px 8px', borderRadius: '50px', fontWeight: 700 }}>
                            {is2FAEnabled ? "Actif" : "Recommandé"}
                        </span>
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--muted-foreground)' }}>
                        Sécurisez l'accès à votre compte en recevant un code à 6 chiffres par e-mail lors de chaque connexion.
                    </p>
                </div>
                <label className="mobile-toggle-switch" style={{ opacity: twoFALoading ? 0.6 : 1 }}>
                    <input
                        type="checkbox"
                        checked={is2FAEnabled}
                        disabled={twoFALoading}
                        onChange={(e) => handleToggle2FA(e.target.checked)}
                    />
                    <span className="toggle-slider" />
                </label>
            </div>

            {/* Section 4: Déconnexion des autres appareils */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', backgroundColor: 'var(--card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', width: '100%', boxSizing: 'border-box' }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <LogOut size={18} style={{ color: '#ef4444' }} />
                        Déconnexion des autres appareils
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--muted-foreground)' }}>
                        Déconnecte immédiatement votre compte de tous les autres smartphones, tablettes ou ordinateurs connectés.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleDisconnectAll}
                    disabled={disconnectLoading}
                    style={{
                        padding: '9px 16px',
                        borderRadius: '8px',
                        backgroundColor: 'transparent',
                        color: '#ef4444',
                        border: '1px solid var(--border)',
                        fontWeight: 600,
                        fontSize: '12.5px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    <LogOut size={14} />
                    <span>{disconnectLoading ? "Déconnexion..." : "Déconnecter les autres appareils"}</span>
                </button>
            </div>
        </div>
    );
}
