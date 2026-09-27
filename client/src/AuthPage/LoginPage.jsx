import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Building2,
    Mail,
    Lock,
    ArrowRight,
    AlertCircle,
    CheckCircle2,
    Shield,
    Eye,
    EyeOff,
    Check,
    X,
    Info,
    RefreshCw
} from 'lucide-react';
import './LoginPage.css';
import { API_URL } from '../utils/config';
import { setAuthToken, clearAuthToken } from '../utils/auth';
import { startProactiveTokenRefresh } from '../utils/api';
import { useUser } from '../utils/useUser';
import { useSubscription } from '../utils/useSubscription';
import OtpInput6 from '../components/OtpInput6';
import ToastNotification from '../components/ToastNotification';

export default function LoginPage() {
    const navigate = useNavigate();
    const { setUser, refreshUser } = useUser();
    const { setSubscription, refreshSubscription } = useSubscription();
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [toast, setToast] = useState(null);
    const [loading, setLoading] = useState(false);
    const [twoFactorRequired, setTwoFactorRequired] = useState(false);
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const [twoFactorEmail, setTwoFactorEmail] = useState('');
    const [resendTimer, setResendTimer] = useState(0);

    const showToast = (msg, type = "error") => {
        setToast({ msg, type, id: Date.now() });
    };

    // 60-second cooldown timer for 2FA code resend
    useEffect(() => {
        if (resendTimer <= 0) return;
        const interval = setInterval(() => {
            setResendTimer(prev => prev - 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [resendTimer]);
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch(`${API_URL}/v1/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(formData)
            });

            const text = await response.text();
            let data = {};
            try {
                data = text ? JSON.parse(text) : {};
            } catch (err) {
                console.error("Response error:", text);
                throw new Error("Erreur de connexion avec le serveur backend.");
            }

            if (!response.ok) {
                throw new Error(data.message || 'Email ou mot de passe incorrect.');
            }

            // Check if 2FA code is required
            if (data.twoFactorRequired) {
                setTwoFactorRequired(true);
                setTwoFactorEmail(data.email || formData.email);
                setResendTimer(60);
                setLoading(false);
                showToast(`Code de sécurité envoyé à ${data.email || formData.email}`, "info");
                return;
            }

            if (data.accessToken) {
                setAuthToken(data.accessToken);
                startProactiveTokenRefresh(); // Begin background token refresh
            }

            const rawUser = data.data?.user || {};
            const userEmail = (formData.email || rawUser.email || '').toLowerCase().trim();
            localStorage.setItem('userEmail', userEmail);
            if (data.data?.user) {
                localStorage.setItem('currentUser', JSON.stringify(data.data.user));
                setUser(data.data.user);
            }
            if (data.data?.subscription) {
                setSubscription(data.data.subscription);
            }

            window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: data.data }));

            // Immediately hydrate full user profile & subscription before navigating
            const [freshUser] = await Promise.all([
                refreshUser().catch(() => null),
                refreshSubscription().catch(() => null)
            ]);

            const finalRole = freshUser?.role || rawUser.role;
            const finalEmail = freshUser?.email || userEmail;

            if (finalEmail === 'khalid.cizdoev777@gmail.com' || finalRole === 'SUPERADMIN') {
                navigate('/admin', { replace: true });
            } else if (finalRole === 'TECHNICIAN') {
                navigate('/interventions/today', { replace: true });
            } else {
                navigate('/home', { replace: true });
            }
        } catch (err) {
            const errorMsg = err.message || 'Email ou mot de passe incorrect.';
            setError(errorMsg);
            showToast(errorMsg, "error");
        } finally {
            setLoading(false);
        }
    };

    const handleVerify2FASubmit = async (e) => {
        e.preventDefault();
        if (!twoFactorCode || twoFactorCode.trim().length < 6) {
            const errorMsg = "Veuillez saisir le code à 6 chiffres";
            setError(errorMsg);
            showToast(errorMsg, "error");
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch(`${API_URL}/v1/auth/2fa/verify-login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    email: twoFactorEmail,
                    code: twoFactorCode.trim()
                })
            });

            const text = await response.text();
            let data = {};
            try {
                data = text ? JSON.parse(text) : {};
            } catch (err) {
                throw new Error("Erreur de validation 2FA.");
            }

            if (!response.ok) {
                throw new Error(data.message || 'Code de sécurité incorrect ou expiré.');
            }

            if (data.accessToken) {
                setAuthToken(data.accessToken);
                startProactiveTokenRefresh();
            }

            const rawUser = data.data?.user || {};
            const userEmail = (twoFactorEmail || rawUser.email || '').toLowerCase().trim();
            localStorage.setItem('userEmail', userEmail);
            if (data.data?.user) {
                localStorage.setItem('currentUser', JSON.stringify(data.data.user));
                setUser(data.data.user);
            }
            if (data.data?.subscription) {
                setSubscription(data.data.subscription);
            }

            window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: data.data }));

            // Immediately hydrate full user profile & subscription before navigating
            const [freshUser] = await Promise.all([
                refreshUser().catch(() => null),
                refreshSubscription().catch(() => null)
            ]);

            const finalRole = freshUser?.role || rawUser.role;
            const finalEmail = freshUser?.email || userEmail;

            if (finalEmail === 'khalid.cizdoev777@gmail.com' || finalRole === 'SUPERADMIN') {
                navigate('/admin', { replace: true });
            } else if (finalRole === 'TECHNICIAN') {
                navigate('/interventions/today', { replace: true });
            } else {
                navigate('/home', { replace: true });
            }
        } catch (err) {
            const errorMsg = err.message || 'Code de vérification invalide ou expiré.';
            setError(errorMsg);
            showToast(errorMsg, "error");
        } finally {
            setLoading(false);
        }
    };

    const handleResend2FA = async () => {
        if (resendTimer > 0 || loading || !formData.email) return;

        setLoading(true);
        setError('');

        try {
            const res = await fetch(`${API_URL}/v1/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(formData)
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || 'Erreur lors du renvoi du code.');
            }

            setResendTimer(60);
            setTwoFactorCode('');
            showToast("Nouveau code de sécurité envoyé !", "info");
        } catch (err) {
            const errorMsg = err.message || 'Impossible de renvoyer le code 2FA.';
            setError(errorMsg);
            showToast(errorMsg, "error");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleAuth = () => {
        // Clear prior session so no cross-account pollution occurs
        clearAuthToken();
        localStorage.removeItem('currentUser');
        localStorage.removeItem('userEmail');

        const currentOrigin = encodeURIComponent(window.location.origin);
        const googleAuthUrl = `${API_URL}/v1/auth/google?origin=${currentOrigin}`;
        try {
            if (window.top && window.top !== window) {
                window.top.location.replace(googleAuthUrl);
            } else {
                window.location.replace(googleAuthUrl);
            }
        } catch (e) {
            window.location.replace(googleAuthUrl);
        }
    };

    return (
        <div className="login-container">
            {/* Top Toast Notification */}
            <ToastNotification toast={toast} onClose={() => setToast(null)} />

            {/* Left Decorative Banner (Desktop) */}
            <div className="login-banner">
                <div className="banner-glow" />
                <div className="banner-content">
                    <div className="logo-badge">
                        <Link to="/" replace className="auth-brand-link">
                            <img src="/Logo-transparent.png" alt="GestArt" className="auth-brand-icon" />
                            <span className="auth-brand-text">GestArt</span>
                        </Link>
                    </div>

                    <h1 className="banner-title">
                        Ravis de vous revoir sur GestArt.
                    </h1>

                    <p className="banner-subtitle">
                        Accédez à votre espace de gestion d'installation, planning techniciens, devis et factures en un seul endroit.
                    </p>

                    <div className="banner-features">
                        <div className="feature-item">
                            <CheckCircle2 className="feature-icon" />
                            <span>Planning & synchronisation mobile temps réel</span>
                        </div>
                        <div className="feature-item">
                            <CheckCircle2 className="feature-icon" />
                            <span>Paiement en ligne sécurisé Stripe & Devis PDF</span>
                        </div>
                        <div className="feature-item">
                            <Shield className="feature-icon" />
                            <span>Connexion sécurisée SSL / RGPD hébergée en France 🇫🇷</span>
                        </div>
                    </div>
                </div>

                <div className="banner-footer">
                    <span>© 2026 GestArt. L'outil CRM N°1 des installateurs & artisans.</span>
                </div>
            </div>

            {/* Right Form Area */}
            <div className="login-form-wrapper">
                <motion.div
                    className="login-card"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <div className="mobile-brand-header">
                        <div className="mobile-brand-badge">
                            <Link to="/" replace className="auth-brand-link">
                                <img src="/Logo-transparent.png" alt="GestArt" className="auth-brand-icon" />
                                <span className="auth-brand-text">GestArt</span>
                            </Link>
                        </div>
                    </div>

                    <div className="form-header">
                        <h2>{twoFactorRequired ? "Double Authentification" : "Se connecter"}</h2>
                        <p>
                            {twoFactorRequired
                                ? `Code de sécurité à 6 chiffres envoyé à ${twoFactorEmail}`
                                : "Content de vous revoir ! Accédez à votre CRM"}
                        </p>
                    </div>

                    {/* Error Alert */}
                    {error && (
                        <div className="error-alert">
                            <AlertCircle size={18} />
                            <span>{error}</span>
                        </div>
                    )}

                    {twoFactorRequired ? (
                        <form onSubmit={handleVerify2FASubmit} className="form-content">
                            <div className="auth-hint-box">
                                <Info size={16} className="auth-hint-icon" />
                                <div className="auth-hint-text">
                                    <strong>Conseil :</strong> Pensez à vérifier votre dossier <strong>Spam / Courriers indésirables</strong> si vous ne trouvez pas l'email (expéditeur : <code>support.gestart@gmail.com</code>).
                                </div>
                            </div>

                            <div className="input-group" style={{ textAlign: 'center' }}>
                                <label style={{ display: 'block', marginBottom: '6px', textAlign: 'center', fontWeight: 600 }}>
                                    Code de vérification (6 chiffres) *
                                </label>
                                <OtpInput6
                                    value={twoFactorCode}
                                    onChange={(val) => {
                                        setTwoFactorCode(val);
                                        setError('');
                                    }}
                                    autoFocus
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4px', marginBottom: '14px' }}>
                                <button
                                    type="button"
                                    onClick={handleResend2FA}
                                    disabled={resendTimer > 0 || loading}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: resendTimer > 0 ? 'var(--muted-foreground, #94A3B8)' : 'var(--primary, #556B2F)',
                                        fontWeight: 600,
                                        fontSize: '0.86rem',
                                        cursor: resendTimer > 0 ? 'not-allowed' : 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <RefreshCw size={14} className={loading ? "spin-icon" : ""} />
                                    {resendTimer > 0 ? `Renvoyer le code dans ${resendTimer}s` : "Renvoyer le code"}
                                </button>
                            </div>

                            <button
                                type="submit"
                                className="btn-submit pill-btn"
                                disabled={loading || twoFactorCode.length < 6}
                            >
                                {loading ? 'Vérification en cours...' : (
                                    <>
                                        Vérifier le code
                                        <ArrowRight size={18} />
                                    </>
                                )}
                            </button>

                            <div style={{ textAlign: 'center', marginTop: '12px' }}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setTwoFactorRequired(false);
                                        setTwoFactorCode('');
                                        setError('');
                                    }}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--muted-foreground, #94a3b8)',
                                        fontSize: '13px',
                                        cursor: 'pointer',
                                        textDecoration: 'underline'
                                    }}
                                >
                                    ← Revenir à la connexion
                                </button>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleSubmit} className="form-content">
                            <div className="input-group">
                                <label>Adresse Email *</label>
                                <div className="input-wrapper">
                                    <Mail className="input-icon" />
                                    <input
                                        type="email"
                                        name="email"
                                        placeholder="exemple@gmail.com"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="input-group">
                                <label>Mot de passe *</label>
                                <div className="input-wrapper">
                                    <Lock className="input-icon" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        placeholder="••••••••••"
                                        value={formData.password}
                                        onChange={handleChange}
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="password-toggle-btn"
                                        onClick={() => setShowPassword(prev => !prev)}
                                        tabIndex="-1"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                <div className="forgot-password-align">
                                    <Link to="/forgot-password" replace className="forgot-link">
                                        Mot de passe oublié ?
                                    </Link>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="btn-submit pill-btn"
                                disabled={loading}
                            >
                                {loading ? 'Connexion en cours...' : (
                                    <>
                                        Se connecter
                                        <ArrowRight size={18} />
                                    </>
                                )}
                            </button>
                        </form>
                    )}

                    <div className="divider">
                        <span>Ou se connecter avec</span>
                    </div>

                    {/* Social Auth Row */}
                    <div className="social-login-row">
                        <button
                            type="button"
                            className="social-circle-btn"
                            onClick={handleGoogleAuth}
                            title="Se connecter avec Google"
                        >
                            <svg className="google-icon" viewBox="0 0 24 24" width="22" height="22">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                            </svg>
                        </button>
                    </div>

                    <div className="form-footer">
                        <p className="required-note">(*) Les champs sont obligatoires</p>
                        <div>
                            <span>Pas encore de compte ? </span>
                            <Link to="/register" replace className="register-link" style={{ whiteSpace: 'nowrap' }}>
                                Créer un compte
                            </Link>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
