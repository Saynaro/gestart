import React, { useState } from "react";
import { Lock, Shield, Smartphone, Laptop, LogOut, CheckCircle2, AlertTriangle, Key } from "lucide-react";

export default function SecuriteTab({ isMobileView, triggerToast, triggerConfirm }) {
    const [loginEmail, setLoginEmail] = useState("khalid.cizdoev777@gmail.com");
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [is2FAEnabled, setIs2FAEnabled] = useState(false);

    const [activeSessions, setActiveSessions] = useState([
        { id: 1, device: "MacBook Pro 16\" (macOS Tahoe)", browser: "Google Chrome 127.0", ip: "82.64.120.45", location: "Nice, France", isCurrent: true, lastActive: "Maintenant" },
        { id: 2, device: "iPhone 15 Pro", browser: "Safari Mobile", ip: "176.159.22.18", location: "Nice, France", isCurrent: false, lastActive: "Il y a 2 heures" },
        { id: 3, device: "iPad Air", browser: "App GestArt iOS", ip: "176.159.22.18", location: "Cannes, France", isCurrent: false, lastActive: "Hier à 18:42" }
    ]);

    const loginHistory = [
        { date: "24/07/2026 13:42", ip: "82.64.120.45", device: "MacBook Pro - Chrome", status: "Succès" },
        { date: "24/07/2026 11:15", ip: "176.159.22.18", device: "iPhone 15 Pro - Safari", status: "Succès" },
        { date: "23/07/2026 09:20", ip: "82.64.120.45", device: "MacBook Pro - Chrome", status: "Succès" },
        { date: "22/07/2026 17:05", ip: "82.64.120.45", device: "MacBook Pro - Chrome", status: "Succès" }
    ];

    const handlePasswordChangeSubmit = (e) => {
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
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        triggerToast("Mot de passe modifié avec succès (bcrypt hash) !");
    };

    const handleDisconnectAll = () => {
        if (window.confirm("Êtes-vous sûr de vouloir déconnecter tous les autres appareils ?")) {
            setActiveSessions(prev => prev.filter(s => s.isCurrent));
            triggerToast("Tous les autres appareils ont été déconnectés !");
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
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                        <label className="form-label">Adresse email de connexion</label>
                        <input
                            type="email"
                            className="form-input"
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            style={{ width: '100%', boxSizing: 'border-box' }}
                        />
                    </div>
                    <button
                        type="button"
                        onClick={() => triggerToast("Email de vérification envoyé à l'adresse renseignée !")}
                        style={{ padding: '10px 18px', backgroundColor: 'var(--sidebar-primary)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                        Changer l'email
                    </button>
                </div>
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
                            style={{ width: '100%', boxSizing: 'border-box' }}
                        />
                    </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px', paddingTop: '14px', borderTop: '1px dashed var(--border)' }}>
                    <button type="submit" className="save-profile-btn" style={{ padding: '9px 20px', backgroundColor: 'var(--sidebar-primary)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                        Mettre à jour le mot de passe
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
                    <button
                        type="button"
                        onClick={handleDisconnectAll}
                        style={{ padding: '8px 14px', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', fontWeight: 600, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <LogOut size={14} />
                        Déconnecter tous les appareils
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {activeSessions.map((session) => (
                        <div key={session.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', border: '1px solid var(--border)', borderRadius: '8px', backgroundColor: session.isCurrent ? 'rgba(91, 77, 219, 0.03)' : 'var(--background)', flexWrap: 'wrap', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {session.device.includes("iPhone") || session.device.includes("iPad") ? (
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
                                        {session.browser} • IP: {session.ip} ({session.location}) • {session.lastActive}
                                    </span>
                                </div>
                            </div>
                            {!session.isCurrent && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (triggerConfirm) {
                                            triggerConfirm({
                                                title: "Révocation de session",
                                                message: `Êtes-vous sûr de vouloir révoquer la session active "${session.device}" ?`,
                                                confirmText: "Révoker",
                                                cancelText: "Annuler",
                                                onConfirm: () => {
                                                    setActiveSessions(prev => prev.filter(s => s.id !== session.id));
                                                    triggerToast("Session révoquée avec succès !");
                                                }
                                            });
                                        } else {
                                            setActiveSessions(prev => prev.filter(s => s.id !== session.id));
                                            triggerToast("Session révoquée avec succès !");
                                        }
                                    }}
                                    style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
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
                            <div key={idx} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--background)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--foreground)' }}>{item.device}</span>
                                    <span style={{ color: '#22c55e', fontWeight: 700, fontSize: '12px' }}>{item.status}</span>
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
                                    <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '10px 8px', fontWeight: 500 }}>{item.date}</td>
                                        <td style={{ padding: '10px 8px', fontFamily: 'monospace' }}>{item.ip}</td>
                                        <td style={{ padding: '10px 8px' }}>{item.device}</td>
                                        <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                                            <span style={{ color: '#22c55e', fontWeight: 600, fontSize: '12px' }}>{item.status}</span>
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
                        <span style={{ backgroundColor: 'rgba(91, 77, 219, 0.1)', color: 'var(--sidebar-primary)', fontSize: '10px', padding: '2px 8px', borderRadius: '50px', fontWeight: 700 }}>FUTUR</span>
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--muted-foreground)' }}>Sécurisez l'accès à votre compte en exigeant un code temporaire (TOTP/Google Authenticator).</p>
                </div>
                <label className="mobile-toggle-switch">
                    <input
                        type="checkbox"
                        checked={is2FAEnabled}
                        onChange={(e) => {
                            setIs2FAEnabled(e.target.checked);
                            triggerToast(e.target.checked ? "2FA activée !" : "2FA désactivée.");
                        }}
                    />
                    <span className="toggle-slider" />
                </label>
            </div>
        </div>
    );
}
