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
    X
} from 'lucide-react';
import './LoginPage.css';
import { API_URL } from '../utils/config';
import { setAuthToken } from '../utils/auth';

export default function LoginPage() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Auto smooth-scroll to focused input (ideal for mobile virtual keyboard)
    useEffect(() => {
        const handleFocusIn = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') {
                setTimeout(() => {
                    e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 250);
            }
        };

        document.addEventListener('focusin', handleFocusIn);
        return () => document.removeEventListener('focusin', handleFocusIn);
    }, []);

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

            if (data.accessToken) {
                setAuthToken(data.accessToken);
            }

            const userEmail = (formData.email || data.data?.user?.email || '').toLowerCase().trim();
            localStorage.setItem('userEmail', userEmail);
            if (data.data?.user) {
                localStorage.setItem('currentUser', JSON.stringify(data.data.user));
            }

            const userRole = data.data?.user?.role;
            if (userEmail === 'khalid.cizdoev777@gmail.com' || userRole === 'SUPERADMIN') {
                navigate('/admin');
            } else if (userRole === 'TECHNICIAN') {
                navigate('/planning');
            } else {
                navigate('/home');
            }
        } catch (err) {
            setError(err.message || 'Impossible de se connecter au serveur.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleAuth = () => {
        const googleAuthUrl = `${API_URL}/v1/auth/google`;
        try {
            if (window.top && window.top !== window) {
                window.top.location.href = googleAuthUrl;
            } else {
                window.location.href = googleAuthUrl;
            }
        } catch (e) {
            window.location.href = googleAuthUrl;
        }
    };

    return (
        <div className="login-container">
            {/* Left Decorative Banner (Desktop) */}
            <div className="login-banner">
                <div className="banner-glow" />
                <div className="banner-content">
                    <div className="logo-badge">
                        <Building2 className="logo-icon" />
                        <span>GestArt CRM</span>
                    </div>

                    <h1 className="banner-title">
                        Ravis de vous revoir sur GestArt CRM.
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
                            <Building2 size={16} />
                            <span>GestArt CRM</span>
                        </div>
                    </div>

                    <div className="form-header">
                        <h2>Se connecter</h2>
                        <p>Content de vous revoir ! Accédez à votre CRM</p>
                    </div>

                    {/* Error Alert */}
                    {error && (
                        <div className="error-alert">
                            <AlertCircle size={18} />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="form-content">
                        <div className="input-group">
                            <label>Adresse Email *</label>
                            <div className="input-wrapper">
                                <Mail className="input-icon" />
                                <input
                                    type="email"
                                    name="email"
                                    placeholder="jean.dupont@climpro.fr"
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
                                <Link to="/forgot-password" className="forgot-link">
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
                            <Link to="/register" className="register-link">
                                Créer un compte
                            </Link>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
