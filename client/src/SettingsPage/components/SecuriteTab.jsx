import React, { useState, useEffect } from "react";
import { Lock, Shield, Smartphone, Laptop, LogOut, CheckCircle2, AlertTriangle, Key, RefreshCw, Check } from "lucide-react";
import { apiFetch } from "../../utils/api";

export default function SecuriteTab({ isMobileView, triggerToast, triggerConfirm }) {
    const [loginEmail, setLoginEmail] = useState("");
    const [newEmailInput, setNewEmailInput] = useState("");
    const [emailPasswordInput, setEmailPasswordInput] = useState("");
    const [isChangingEmail, setIsChangingEmail] = useState(false);
    const [emailLoading, setEmailLoading] = useState(false);

    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [passwordLoading, setPasswordLoading] = useState(false);

    const [is2FAEnabled, setIs2FAEnabled] = useState(false);
    const [twoFALoading, setTwoFALoading] = useState(false);

    const [activeSessions, setActiveSessions] = useState([]);
    const [loginHistory, setLoginHistory] = useState([]);
    const [loadingData, setLoadingData] = useState(true);

    const fetchSecurityData = async () => {
        try {
            setLoadingData(true);
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
                if (Array.isArray(data.sessions)) {
                    setActiveSessions(data.sessions);
                }
                if (Array.isArray(data.loginHistory)) {
                    setLoginHistory(data.loginHistory);
                }
            }
        } catch (err) {
            console.warn("Security data fetch failed, using defaults:", err.message);
        } finally {
            setLoadingData(false);
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
            const res = await apiFetch('/v1/auth/change-email', {
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
            triggerToast("Adresse email modifiée avec succès dans la base de données !");
            fetchSecurityData();
        } catch (err) {
            triggerToast(err.message || "Erreur lors du changement d'email", true);
        } finally {
            setEmailLoading(false);
        }
    };

    const handlePasswordChangeSubmit = async (e) => {
        e.preventDefault();
        if (!oldPassword) {
            triggerToast("Veuillez saisir votre ancien mot de passe", true);
            return;
        }
        if (newPassword.length < 8) {
            triggerToast("Le nouveau mot de passe doit comporter au moins 8 caractères", true);
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
            triggerToast("Mot de passe modifié avec succès dans la base de données !");
            fetchSecurityData();
        } catch (err) {
            triggerToast(err.message || "Erreur lors du changement de mot de passe", true);
        } finally {
            setPasswordLoading(false);
        }
    };

    const handleToggle2FA = async (checked) => {
        setTwoFALoading(true);
        try {
            const res = await apiFetch('/v1/auth/2fa/toggle', {
                method: 'PATCH',
                body: JSON.stringify({ enabled: checked })
            });
            setIs2FAEnabled(checked);
            triggerToast(
                checked
                    ? "Double authentification (2FA) activée ! Un code à 6 chiffres vous sera envoyé par email à chaque connexion."
                    : "Double authentification (2FA) désactivée."
            );
        } catch (err) {
            triggerToast(err.message || "Erreur lors de la modification du 2FA", true);
        } finally {
            setTwoFALoading(false);
        }
    };

    const handleRevokeSession = async (sessionId, deviceName) => {
        const doRevoke = async () => {
            try {
                await apiFetch(`/v1/auth/sessions/${sessionId}`, {
                    method: 'DELETE'
                });
                setActiveSessions(prev => prev.filter(s => s.id !== sessionId));
                triggerToast("Session révoquée avec succès !");
            } catch (err) {
                triggerToast(err.message || "Erreur lors de la révocation", true);
            }
        };

        if (triggerConfirm) {
            triggerConfirm({
                title: "Révocation de session",
                message: `Êtes-vous sûr de vouloir révoquer la session active "${deviceName}" ?`,
                confirmText: "Révoker",
                cancelText: "Annuler",
                onConfirm: doRevoke
            });
        } else if (window.confirm(`Êtes-vous sûr de vouloir révoquer la session "${deviceName}" ?`)) {
            doRevoke();
        }
    };

    const handleDisconnectAll = async () => {
        const doDisconnect = async () => {
            try {
                await apiFetch('/v1/auth/sessions', {
                    method: 'DELETE'
                });
                setActiveSessions(prev => prev.filter(s => s.isCurrent));
                triggerToast("Tous les autres appareils ont été déconnectés !");
            } catch (err) {
                triggerToast(err.message || "Erreur lors de la déconnexion", true);
            }
        };

        if (triggerConfirm) {
            triggerConfirm({
                title: "Déconnexion des appareils",
                message: "Êtes-vous sûr de vouloir déconnecter tous les autres appareils actifs ?",
                confirmText: "Déconnecter tout",
                cancelText: "Annuler",
                onConfirm: doDisconnect
            });
        } else if (window.confirm("Êtes-vous sûr de vouloir déconnecter tous les autres appareils ?")) {
            doDisconnect();
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
            {/* Section 1: Email de connexion */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', backgroundColor: 'var(--card)', width: '100%', boxSizing: 'border-box' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Shield size={18} style={{ color: 'var(--sidebar-primary)' }} />
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
                                setNewEmailInput(loginEmail);
                                setIsChangingEmail(true);
                            }}
                            style={{ padding: '10px 18px', backgroundColor: 'var(--sidebar-primary)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                        >
                            Modifier l'email
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleChangeEmailSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                                <label className="form-label">Nouvelle adresse email</label>
                                <input
                                    type="email"
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
                                <input
                                    type="password"
                                    className="form-input"
                                    value={emailPasswordInput}
                                    onChange={(e) => setEmailPasswordInput(e.target.value)}
                                    placeholder="••••••••••••"
                                    style={{ width: '100%', boxSizing: 'border-box' }}
                                />
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
                                style={{ padding: '8px 18px', backgroundColor: 'var(--sidebar-primary)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
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
                    <Key size={18} style={{ color: 'var(--sidebar-primary)' }} />
                    Changer le mot de passe
                </h3>
                <div className="profile-form-grid">
                    <div className="form-field form-group-full">
                        <label className="form-label">Ancien mot de passe</label>
                        <input
                            type="password"
                            className="form-input"
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                            placeholder="••••••••••••"
                            required
                            style={{ width: '100%', boxSizing: 'border-box' }}
                        />
                    </div>
                    <div className="form-field">
                        <label className="form-label">Nouveau mot de passe</label>
                        <input
                            type="password"
                            className="form-input"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Min. 8 caractères"
                            required
                            style={{ width: '100%', boxSizing: 'border-box' }}
                        />
                    </div>
                    <div className="form-field">
                        <label className="form-label">Confirmer le nouveau mot de passe</label>
                        <input
                            type="password"
                            className="form-input"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirmez le mot de passe"
                            required
                            style={{ width: '100%', boxSizing: 'border-box' }}
                        />
                    </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px', paddingTop: '14px', borderTop: '1px dashed var(--border)' }}>
                    <button
                        type="submit"
                        disabled={passwordLoading}
                        className="save-profile-btn"
                        style={{ padding: '9px 20px', backgroundColor: 'var(--sidebar-primary)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                    >
                        {passwordLoading ? "Mise à jour..." : "Mettre à jour le mot de passe"}
                    </button>
                </div>
            </form>

            {/* Section 3: Sessions actives */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', backgroundColor: 'var(--card)', width: '100%', boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Laptop size={18} style={{ color: 'var(--sidebar-primary)' }} />
                            Sessions actives ({activeSessions.length})
                        </h3>
                        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--muted-foreground)' }}>Liste des appareils actuellement connectés à votre compte.</p>
                    </div>
                    {activeSessions.length > 1 && (
                        <button
                            type="button"
                            onClick={handleDisconnectAll}
                            style={{ padding: '8px 14px', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', fontWeight: 600, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            <LogOut size={14} />
                            Déconnecter tous les autres appareils
                        </button>
                    )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {activeSessions.map((session) => (
                        <div key={session.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', border: '1px solid var(--border)', borderRadius: '8px', backgroundColor: session.isCurrent ? 'rgba(91, 77, 219, 0.03)' : 'var(--background)', flexWrap: 'wrap', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {session.device.includes("iPhone") || session.device.includes("Android") ? (
                                    <Smartphone size={20} style={{ color: 'var(--sidebar-primary)' }} />
                                ) : (
                                    <Laptop size={20} style={{ color: 'var(--sidebar-primary)' }} />
                                )}
                                <div>
                                    <span style={{ fontSize: '13.5px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                        {session.device}
                                        {session.isCurrent && (
                                            <span style={{ backgroundColor: '#22c55e', color: '#fff', fontSize: '10px', padding: '1px 6px', borderRadius: '50px', fontWeight: 700 }}>Cet appareil</span>
                                        )}
                                    </span>
                                    <span style={{ fontSize: '12px', color: 'var(--muted-foreground)', display: 'block' }}>
                                        {session.browser} • IP: {session.ip} ({session.location || "France"}) • {session.lastActive}
                                    </span>
                                </div>
                            </div>
                            {!session.isCurrent && (
                                <button
                                    type="button"
                                    onClick={() => handleRevokeSession(session.id, session.device)}
                                    style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '12px', fontWeight: 600, cursor: 'pointer', padding: '6px 10px', borderRadius: '6px' }}
                                >
                                    Révoker
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Section 4: Historique des connexions */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', backgroundColor: 'var(--card)', width: '100%', boxSizing: 'border-box' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 700 }}>Historique des connexions récentes</h3>
                {isMobileView ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {loginHistory.map((item, idx) => (
                            <div key={item.id || idx} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--background)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--foreground)' }}>{item.device}</span>
                                    <span style={{ color: item.status.includes('Succès') ? '#22c55e' : '#ef4444', fontWeight: 700, fontSize: '12px' }}>{item.status}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--muted-foreground)' }}>
                                    <span>{item.date}</span>
                                    <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{item.ip}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '400px' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted-foreground)', textAlign: 'left' }}>
                                    <th style={{ padding: '8px' }}>Date & Heure</th>
                                    <th style={{ padding: '8px' }}>Adresse IP</th>
                                    <th style={{ padding: '8px' }}>Appareil / Navigateur</th>
                                    <th style={{ padding: '8px', textAlign: 'right' }}>Statut</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loginHistory.map((item, idx) => (
                                    <tr key={item.id || idx} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '10px 8px', fontWeight: 500 }}>{item.date}</td>
                                        <td style={{ padding: '10px 8px', fontFamily: 'monospace' }}>{item.ip}</td>
                                        <td style={{ padding: '10px 8px' }}>{item.device}</td>
                                        <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                                            <span style={{ color: item.status.includes('Succès') ? '#22c55e' : '#ef4444', fontWeight: 600, fontSize: '12px' }}>{item.status}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Section 5: Double Authentification (2FA) */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', backgroundColor: 'var(--card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', width: '100%', boxSizing: 'border-box' }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <Lock size={18} style={{ color: 'var(--sidebar-primary)' }} />
                        Double Authentification (2FA)
                        <span style={{ backgroundColor: is2FAEnabled ? 'rgba(34, 197, 94, 0.12)' : 'rgba(91, 77, 219, 0.1)', color: is2FAEnabled ? '#22c55e' : 'var(--sidebar-primary)', fontSize: '11px', padding: '2px 8px', borderRadius: '50px', fontWeight: 700 }}>
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
        </div>
    );
}
