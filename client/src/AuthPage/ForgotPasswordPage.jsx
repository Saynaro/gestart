import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Building2,
    Mail,
    ArrowRight,
    ArrowLeft,
    AlertCircle,
    CheckCircle2,
    Shield,
    KeyRound,
    Info
} from 'lucide-react';
import './ForgotPasswordPage.css';
import { API_URL } from '../utils/config';
import ToastNotification from '../components/ToastNotification';

export default function ForgotPasswordPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [toast, setToast] = useState(null);
    const [sentSuccess, setSentSuccess] = useState(false);
    const [devInfo, setDevInfo] = useState(null);
    const [resendTimer, setResendTimer] = useState(0);

    const showToast = (msg, type = "error") => {
        setToast({ msg, type, id: Date.now() });
    };

    // 60-second cooldown timer for resend
    useEffect(() => {
        if (resendTimer <= 0) return;
        const interval = setInterval(() => {
            setResendTimer(prev => prev - 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [resendTimer]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email) return;

        setLoading(true);
        setError('');

        try {
            const res = await fetch(`${API_URL}/v1/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Erreur lors de la demande de réinitialisation.');
            }

            setSentSuccess(true);
            setResendTimer(60);
            showToast("Email d'instructions envoyé avec succès !", "info");
            if (data.data?.devCode || data.data?.devToken) {
                setDevInfo(data.data);
            }
        } catch (err) {
            const errorMsg = err.message || 'Impossible de se connecter au serveur.';
            setError(errorMsg);
            showToast(errorMsg, "error");
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (resendTimer > 0 || loading || !email) return;

        setLoading(true);
        setError('');

        try {
            const res = await fetch(`${API_URL}/v1/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Erreur lors du renvoi de l'email.");
            }

            setResendTimer(60);
            showToast("Nouvel email envoyé avec succès !", "info");
            if (data.data?.devCode || data.data?.devToken) {
                setDevInfo(data.data);
            }
        } catch (err) {
            const errorMsg = err.message || 'Impossible de renvoyer le lien.';
            setError(errorMsg);
            showToast(errorMsg, "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="forgot-container">
            {/* Top Toast Notification */}
            <ToastNotification toast={toast} onClose={() => setToast(null)} />

            {/* Left Decorative Banner (Desktop) */}
            <div className="forgot-banner">
                <div className="banner-glow" />
                <div className="banner-content">
                    <div className="logo-badge">
                        <Link to="/" className="auth-brand-link">
                            <img src="/Logo-transparent.png" alt="GestArt" className="auth-brand-icon" />
                            <span className="auth-brand-text">GestArt</span>
                        </Link>
                    </div>

                    <h1 className="banner-title">
                        Récupération sécurisée de votre compte.
                    </h1>

                    <p className="banner-subtitle">
                        Pas d'inquiétude ! Saisissez votre adresse email pour recevoir un lien et un code de réinitialisation sécurisés.
                    </p>

                    <div className="banner-features">
                        <div className="feature-item">
                            <CheckCircle2 className="feature-icon" />
                            <span>Protection maximale et lien à durée limitée (1 heure)</span>
                        </div>
                        <div className="feature-item">
                            <CheckCircle2 className="feature-icon" />
                            <span>Chiffrement Bcrypt & jeton à usage unique</span>
                        </div>
                        <div className="feature-item">
                            <Shield className="feature-icon" />
                            <span>Hébergement sécurisé conforme RGPD 🇫🇷</span>
                        </div>
                    </div>
                </div>

                <div className="banner-footer">
                    <span>© 2026 GestArt. L'outil CRM N°1 des installateurs & artisans.</span>
                </div>
            </div>

            {/* Right Form Area */}
            <div className="forgot-form-wrapper">
                <motion.div
                    className="forgot-card"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <div className="mobile-brand-header">
                        <div className="mobile-brand-badge">
                            <Link to="/" className="auth-brand-link">
                                <img src="/Logo-transparent.png" alt="GestArt" className="auth-brand-icon" />
                                <span className="auth-brand-text">GestArt</span>
                            </Link>
                        </div>
                    </div>

                    <div className="back-link-wrapper">
                        <Link to="/login" className="btn-back">
                            <ArrowLeft size={16} />
                            <span>Retour à la connexion</span>
                        </Link>
                    </div>

                    {!sentSuccess ? (
                        <>
                            <div className="form-header">
                                <h2>Mot de passe oublié ?</h2>
                                <p>Saisissez votre email pour recevoir les instructions de réinitialisation</p>
                            </div>

                            {error && (
                                <div className="error-alert">
                                    <AlertCircle size={18} />
                                    <span>{error}</span>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="form-content">
                                <div className="input-group">
                                    <label>Adresse Email de votre compte *</label>
                                    <div className="input-wrapper">
                                        <Mail className="input-icon" />
                                        <input
                                            type="email"
                                            placeholder="exemple@gmail.com"
                                            value={email}
                                            onChange={(e) => {
                                                setEmail(e.target.value);
                                                setError('');
                                            }}
                                            required
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="btn-submit pill-btn"
                                    disabled={loading}
                                >
                                    {loading ? 'Envoi en cours...' : (
                                        <>
                                            Envoyer le lien
                                            <ArrowRight size={18} />
                                        </>
                                    )}
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="success-state">
                            <div className="success-icon-wrapper">
                                <CheckCircle2 size={32} className="success-icon" />
                            </div>

                            <h2>Email envoyé !</h2>

                            <p className="success-text">
                                Un lien de réinitialisation a été envoyé à <strong>{email}</strong>. Veuillez consulter votre boîte de réception pour modifier votre mot de passe.
                            </p>

                            <div className="auth-hint-box">
                                <Info size={16} className="auth-hint-icon" />
                                <div className="auth-hint-text">
                                    <strong>Conseil :</strong> Vérifiez également votre dossier <strong>Spam / Courriers indésirables</strong> si vous ne voyez pas l'email envoyé par GestArt (expéditeur : <code>support.gestart@gmail.com</code>).
                                </div>
                            </div>

                            <div className="action-buttons-group">
                                <Link to="/login" className="btn-submit pill-btn" style={{ textDecoration: 'none' }}>
                                    Retour à la connexion
                                </Link>

                                <button
                                    type="button"
                                    onClick={handleResend}
                                    disabled={resendTimer > 0 || loading}
                                    className="btn-secondary-link"
                                    style={{
                                        opacity: resendTimer > 0 ? 0.6 : 1,
                                        cursor: resendTimer > 0 ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    {resendTimer > 0 ? `Renvoyer dans ${resendTimer}s` : "Renvoyer l'email"}
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="form-footer">
                        <div>
                            <span>Vous avez retrouvé votre mot de passe ? </span>
                            <Link to="/login" className="register-link" style={{ whiteSpace: 'nowrap' }}>
                                Se connecter
                            </Link>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
