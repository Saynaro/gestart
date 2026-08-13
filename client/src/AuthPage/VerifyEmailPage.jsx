import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Building2,
    Mail,
    ArrowRight,
    ArrowLeft,
    AlertCircle,
    CheckCircle2,
    Shield,
    RefreshCw
} from 'lucide-react';
import './VerifyEmailPage.css';
import { API_URL } from '../utils/config';

export default function VerifyEmailPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const tokenFromUrl = searchParams.get('token') || '';
    const emailFromUrl = searchParams.get('email') || '';

    const [email, setEmail] = useState(emailFromUrl);
    const [digitCode, setDigitCode] = useState(['', '', '', '', '', '']);
    const digitRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

    const [loading, setLoading] = useState(!!tokenFromUrl);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [resendMessage, setResendMessage] = useState('');

    // Auto verify if token is present in URL
    useEffect(() => {
        if (!tokenFromUrl) return;

        const verifyTokenUrl = async () => {
            setLoading(true);
            setError('');

            try {
                const res = await fetch(`${API_URL}/v1/auth/verify-email?token=${encodeURIComponent(tokenFromUrl)}`);
                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.message || "Le lien de vérification est invalide ou expiré.");
                }

                setSuccess(true);
            } catch (err) {
                setError(err.message || "Impossible de vérifier l'adresse email.");
            } finally {
                setLoading(false);
            }
        };

        verifyTokenUrl();
    }, [tokenFromUrl]);

    // Handle digit input change
    const handleDigitChange = (index, value) => {
        if (value.length > 1) {
            // User pasted a full code
            const pasted = value.trim().slice(0, 6).split('');
            const newDigits = [...digitCode];
            pasted.forEach((char, idx) => {
                if (idx < 6) newDigits[idx] = char;
            });
            setDigitCode(newDigits);
            if (pasted.length === 6) {
                digitRefs[5].current?.focus();
            }
            return;
        }

        const newDigits = [...digitCode];
        newDigits[index] = value;
        setDigitCode(newDigits);
        setError('');

        if (value && index < 5) {
            digitRefs[index + 1].current?.focus();
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !digitCode[index] && index > 0) {
            digitRefs[index - 1].current?.focus();
        }
    };

    const handleVerifyCodeSubmit = async (e) => {
        e.preventDefault();
        const code = digitCode.join('');
        if (code.length < 6) {
            setError("Veuillez saisir le code complet à 6 chiffres.");
            return;
        }

        setLoading(true);
        setError('');

        try {
            const res = await fetch(`${API_URL}/v1/auth/verify-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Code de vérification incorrect.');
            }

            // Mark email verified in DB
            await fetch(`${API_URL}/v1/auth/verify-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code })
            });

            setSuccess(true);
        } catch (err) {
            setError(err.message || "Code invalide.");
        } finally {
            setLoading(false);
        }
    };

    const handleResendCode = async () => {
        if (!email) {
            setError("Veuillez renseigner votre adresse email pour recevoir le code.");
            return;
        }

        setResendLoading(true);
        setResendMessage('');
        setError('');

        try {
            const res = await fetch(`${API_URL}/v1/auth/send-verification-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Erreur lors de l'envoi du code.");
            }

            setResendMessage("Nouveau code envoyé par email !");
            if (data.data?.devCode) {
                console.log("[DEV RESEND CODE]:", data.data.devCode);
            }
        } catch (err) {
            setError(err.message || "Impossible de renvoyer le code.");
        } finally {
            setResendLoading(false);
        }
    };

    return (
        <div className="verify-container">
            {/* Left Decorative Banner (Desktop) */}
            <div className="verify-banner">
                <div className="banner-glow" />
                <div className="banner-content">
                    <div className="logo-badge">
                        <Building2 className="logo-icon" />
                        <span>GestArt</span>
                    </div>

                    <h1 className="banner-title">
                        Vérification rapide de votre compte.
                    </h1>

                    <p className="banner-subtitle">
                        Confirmez votre adresse email pour accéder à l'ensemble des fonctionnalités de votre espace de gestion d'installation.
                    </p>

                    <div className="banner-features">
                        <div className="feature-item">
                            <CheckCircle2 className="feature-icon" />
                            <span>Validation sécurisée par lien ou code à 6 chiffres</span>
                        </div>
                        <div className="feature-item">
                            <CheckCircle2 className="feature-icon" />
                            <span>Activation immédiate de vos 14 jours d'essai gratuit</span>
                        </div>
                        <div className="feature-item">
                            <Shield className="feature-icon" />
                            <span>Hébergement sécurisé et conforme RGPD 🇫🇷</span>
                        </div>
                    </div>
                </div>

                <div className="banner-footer">
                    <span>© 2026 GestArt. L'outil CRM N°1 des installateurs & artisans.</span>
                </div>
            </div>

            {/* Right Form Area */}
            <div className="verify-form-wrapper">
                <motion.div
                    className="verify-card"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <div className="mobile-brand-header">
                        <div className="mobile-brand-badge">
                            <Building2 size={16} />
                            <span>GestArt</span>
                        </div>
                    </div>

                    <div className="back-link-wrapper">
                        <Link to="/login" className="btn-back">
                            <ArrowLeft size={16} />
                            <span>Retour à la connexion</span>
                        </Link>
                    </div>

                    {loading && tokenFromUrl ? (
                        <div className="loading-box">
                            <div className="spinner" />
                            <p>Validation de votre adresse email en cours...</p>
                        </div>
                    ) : success ? (
                        <div className="success-state">
                            <div className="success-icon-wrapper">
                                <CheckCircle2 size={52} className="success-icon" />
                            </div>

                            <h2>Adresse email vérifiée !</h2>

                            <p className="success-text">
                                Félicitations ! Votre compte est pleinement actif. Vous pouvez maintenant accéder à votre tableau de bord.
                            </p>

                            <button
                                onClick={() => navigate('/login')}
                                className="btn-submit pill-btn"
                                style={{ marginTop: 12 }}
                            >
                                Accéder à la connexion
                                <ArrowRight size={18} />
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="form-header">
                                <h2>Vérifiez votre adresse email</h2>
                                <p>Saisissez le code à 6 chiffres envoyé sur votre adresse email</p>
                            </div>

                            {error && (
                                <div className="error-alert">
                                    <AlertCircle size={18} />
                                    <span>{error}</span>
                                </div>
                            )}

                            {resendMessage && (
                                <div className="success-alert">
                                    <CheckCircle2 size={18} />
                                    <span>{resendMessage}</span>
                                </div>
                            )}

                            <form onSubmit={handleVerifyCodeSubmit} className="form-content">
                                <div className="input-group">
                                    <label>Adresse Email *</label>
                                    <div className="input-wrapper">
                                        <Mail className="input-icon" />
                                        <input
                                            type="email"
                                            placeholder="jean.dupont@climpro.fr"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="input-group">
                                    <label>Code de vérification à 6 chiffres *</label>
                                    <div className="digit-inputs-row">
                                        {digitCode.map((digit, idx) => (
                                            <input
                                                key={idx}
                                                ref={digitRefs[idx]}
                                                type="text"
                                                inputMode="numeric"
                                                maxLength={6}
                                                className="digit-box"
                                                value={digit}
                                                onChange={(e) => handleDigitChange(idx, e.target.value)}
                                                onKeyDown={(e) => handleKeyDown(idx, e)}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="btn-submit pill-btn"
                                    disabled={loading || digitCode.join('').length < 6}
                                >
                                    {loading ? 'Vérification...' : (
                                        <>
                                            Confirmer l'email
                                            <ArrowRight size={18} />
                                        </>
                                    )}
                                </button>
                            </form>

                            <div className="resend-wrapper">
                                <span>Vous n'avez pas reçu le code ? </span>
                                <button
                                    type="button"
                                    onClick={handleResendCode}
                                    disabled={resendLoading}
                                    className="resend-btn"
                                >
                                    <RefreshCw size={14} className={resendLoading ? "spin-icon" : ""} />
                                    {resendLoading ? 'Envoi...' : 'Renvoyer le code'}
                                </button>
                            </div>
                        </>
                    )}

                    <div className="form-footer">
                        <div>
                            <span>Vous préférez vous connecter ? </span>
                            <Link to="/login" className="register-link">
                                Connexion
                            </Link>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
