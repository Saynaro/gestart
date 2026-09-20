import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Building2,
    Lock,
    ArrowRight,
    ArrowLeft,
    AlertCircle,
    CheckCircle2,
    Shield,
    Eye,
    EyeOff,
    Check,
    X,
    KeyRound
} from 'lucide-react';
import './ResetPasswordPage.css';
import { API_URL } from '../utils/config';

export default function ResetPasswordPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const tokenFromUrl = searchParams.get('token') || '';
    const emailFromUrl = searchParams.get('email') || '';

    const [token, setToken] = useState(tokenFromUrl);
    const [email, setEmail] = useState(emailFromUrl);
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [showPassword, setShowPassword] = useState(false);
    const [isPasswordFocused, setIsPasswordFocused] = useState(false);

    const [loading, setLoading] = useState(false);
    const [validatingToken, setValidatingToken] = useState(!!tokenFromUrl);
    const [tokenIsValid, setTokenIsValid] = useState(false);
    const [error, setError] = useState('');
    const [resetSuccess, setResetSuccess] = useState(false);

    // Validate token on mount if present in URL
    useEffect(() => {
        if (!tokenFromUrl) {
            setValidatingToken(false);
            return;
        }

        const checkToken = async () => {
            try {
                const res = await fetch(`${API_URL}/v1/auth/verify-reset-token?token=${encodeURIComponent(tokenFromUrl)}`);
                const data = await res.json();

                if (res.ok && data.valid) {
                    setTokenIsValid(true);
                    if (data.email) setEmail(data.email);
                } else {
                    setTokenIsValid(false);
                    setError(data.message || "Le lien de réinitialisation est invalide ou expiré.");
                }
            } catch (err) {
                setTokenIsValid(false);
                setError("Impossible de vérifier le lien avec le serveur.");
            } finally {
                setValidatingToken(false);
            }
        };

        checkToken();
    }, [tokenFromUrl]);

    // Password validation rules
    const rules = {
        length: newPassword.length >= 8,
        uppercase: /[A-Z]/.test(newPassword),
        lowercase: /[a-z]/.test(newPassword),
        number: /[0-9]/.test(newPassword),
    };
    const isPasswordValid = rules.length && rules.uppercase && rules.lowercase && rules.number;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!isPasswordValid) {
            setError("Le mot de passe doit respecter toutes les consignes de sécurité.");
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("Les deux mots de passe ne correspondent pas.");
            return;
        }

        setLoading(true);

        try {
            const bodyPayload = {
                newPassword,
                ...(token ? { token } : { email, code })
            };

            const res = await fetch(`${API_URL}/v1/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyPayload)
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Erreur lors de la réinitialisation du mot de passe.');
            }

            setResetSuccess(true);
        } catch (err) {
            setError(err.message || 'Erreur de communication avec le serveur.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="reset-container">
            {/* Left Decorative Banner (Desktop) */}
            <div className="reset-banner">
                <div className="banner-glow" />
                <div className="banner-content">
                    <div className="logo-badge">
                        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center' }}>
                            <img src="/LOGO.png" alt="GestArt" className="auth-brand-logo" />
                        </Link>
                    </div>

                    <h1 className="banner-title">
                        Nouveau mot de passe pour votre compte.
                    </h1>

                    <p className="banner-subtitle">
                        Définissez un mot de passe robuste pour protéger vos données clients, vos interventions et votre facturation.
                    </p>

                    <div className="banner-features">
                        <div className="feature-item">
                            <CheckCircle2 className="feature-icon" />
                            <span>Sécurité renforcée hashée avec Salt Bcrypt</span>
                        </div>
                        <div className="feature-item">
                            <CheckCircle2 className="feature-icon" />
                            <span>Déconnexion automatique des sessions compromises</span>
                        </div>
                        <div className="feature-item">
                            <Shield className="feature-icon" />
                            <span>Serveurs sécurisés hébergés en France 🇫🇷</span>
                        </div>
                    </div>
                </div>

                <div className="banner-footer">
                    <span>© 2026 GestArt. L'outil CRM N°1 des installateurs & artisans.</span>
                </div>
            </div>

            {/* Right Form Area */}
            <div className="reset-form-wrapper">
                <motion.div
                    className="reset-card"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <div className="mobile-brand-header">
                        <div className="mobile-brand-badge">
                            <Link to="/" style={{ display: 'inline-flex', alignItems: 'center' }}>
                                <img src="/LOGO.png" alt="GestArt" className="auth-brand-logo" />
                            </Link>
                        </div>
                    </div>

                    <div className="back-link-wrapper">
                        <Link to="/login" className="btn-back">
                            <ArrowLeft size={16} />
                            <span>Retour à la connexion</span>
                        </Link>
                    </div>

                    {validatingToken ? (
                        <div className="token-loading-box">
                            <div className="spinner" />
                            <p>Vérification du lien de réinitialisation...</p>
                        </div>
                    ) : resetSuccess ? (
                        <div className="success-state">
                            <div className="success-icon-wrapper">
                                <CheckCircle2 size={52} className="success-icon" />
                            </div>

                            <h2>Mot de passe modifié !</h2>

                            <p className="success-text">
                                Votre mot de passe a été mis à jour avec succès. Vous pouvez dès à présent vous connecter à votre compte GestArt.
                            </p>

                            <button
                                onClick={() => navigate('/login')}
                                className="btn-submit pill-btn"
                                style={{ marginTop: 12 }}
                            >
                                Se connecter avec le nouveau mot de passe
                                <ArrowRight size={18} />
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="form-header">
                                <h2>Réinitialiser le mot de passe</h2>
                                <p>Saisissez votre nouveau mot de passe ci-dessous</p>
                            </div>

                            {error && (
                                <div className="error-alert">
                                    <AlertCircle size={18} />
                                    <span>{error}</span>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="form-content">
                                {/* If no token is attached, prompt for code or email */}
                                {!token && (
                                    <div className="code-input-section">
                                        <div className="input-group">
                                            <label>Adresse Email *</label>
                                            <div className="input-wrapper">
                                                <input
                                                    type="email"
                                                    placeholder="exemple@gmail.com"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="input-group" style={{ marginTop: 12 }}>
                                            <label>Code de réinitialisation à 6 chiffres *</label>
                                            <div className="input-wrapper">
                                                <KeyRound className="input-icon" />
                                                <input
                                                    type="text"
                                                    placeholder="ex: 482910"
                                                    value={code}
                                                    onChange={(e) => setCode(e.target.value.trim())}
                                                    maxLength={6}
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="input-group">
                                    <label>Nouveau mot de passe *</label>
                                    <div className="input-wrapper">
                                        <Lock className="input-icon" />
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            placeholder="••••••••••"
                                            value={newPassword}
                                            onChange={(e) => {
                                                setNewPassword(e.target.value);
                                                setError('');
                                            }}
                                            onFocus={() => setIsPasswordFocused(true)}
                                            onBlur={() => setIsPasswordFocused(false)}
                                            required
                                        />
                                        <button
                                            type="button"
                                            className="password-toggle-btn"
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                            }}
                                            onClick={() => setShowPassword(prev => !prev)}
                                            tabIndex="-1"
                                            aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>

                                    {/* Password Rules helper */}
                                    {(isPasswordFocused || newPassword.length > 0) && (
                                        <div className="password-rules-box">
                                            <div className={`rule-item ${rules.length ? 'valid' : ''}`} style={{ color: rules.length ? '#22C55E' : '#94A3B8' }}>
                                                {rules.length ? <Check size={14} strokeWidth={2.5} /> : <X size={14} strokeWidth={2} />}
                                                <span>Au moins 8 caractères</span>
                                            </div>
                                            <div className={`rule-item ${rules.uppercase ? 'valid' : ''}`} style={{ color: rules.uppercase ? '#22C55E' : '#94A3B8' }}>
                                                {rules.uppercase ? <Check size={14} strokeWidth={2.5} /> : <X size={14} strokeWidth={2} />}
                                                <span>1 lettre majuscule (A-Z)</span>
                                            </div>
                                            <div className={`rule-item ${rules.lowercase ? 'valid' : ''}`} style={{ color: rules.lowercase ? '#22C55E' : '#94A3B8' }}>
                                                {rules.lowercase ? <Check size={14} strokeWidth={2.5} /> : <X size={14} strokeWidth={2} />}
                                                <span>1 lettre minuscule (a-z)</span>
                                            </div>
                                            <div className={`rule-item ${rules.number ? 'valid' : ''}`} style={{ color: rules.number ? '#22C55E' : '#94A3B8' }}>
                                                {rules.number ? <Check size={14} strokeWidth={2.5} /> : <X size={14} strokeWidth={2} />}
                                                <span>1 chiffre (0-9)</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="input-group">
                                    <label>Confirmer le mot de passe *</label>
                                    <div className="input-wrapper">
                                        <Lock className="input-icon" />
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            placeholder="••••••••••"
                                            value={confirmPassword}
                                            onChange={(e) => {
                                                setConfirmPassword(e.target.value);
                                                setError('');
                                            }}
                                            required
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="btn-submit pill-btn"
                                    disabled={loading || !isPasswordValid}
                                >
                                    {loading ? 'Modification en cours...' : (
                                        <>
                                            Mettre à jour le mot de passe
                                            <ArrowRight size={18} />
                                        </>
                                    )}
                                </button>
                            </form>
                        </>
                    )}

                    <div className="form-footer">
                        <div>
                            <span>Déjà un mot de passe valide ? </span>
                            <Link to="/login" className="register-link">
                                Se connecter
                            </Link>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
