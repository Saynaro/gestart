import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Building2,
    UserCheck,
    CheckCircle2,
    ArrowRight,
    ArrowLeft,
    Shield,
    Star,
    Lock,
    Mail,
    User,
    Phone,
    Briefcase,
    Zap,
    AlertCircle,
    Wrench,
    Crown,
    Eye,
    EyeOff,
    Check,
    X,
    KeyRound,
    Snowflake,
    Flame,
    Droplet,
    Wind,
    Sun,
    TreePine,
    Info
} from 'lucide-react';
import './RegisterPage.css';
import CompanyAutocomplete from '../components/CompanyAutocomplete';
import PhoneInput from '../components/PhoneInput';
import { apiFetch } from '../utils/api';
import { setAuthToken } from '../utils/auth';
import LegalModal from '../components/LegalHelpModal';

const TRADE_CATEGORIES_LIST = [
    { id: 'clim', name: 'Climatisation / PAC air-air', icon: Snowflake },
    { id: 'pac', name: 'Pompe à chaleur air-eau', icon: Flame },
    { id: 'plombier', name: 'Plomberie & Chauffage', icon: Wrench },
    { id: 'cet', name: 'Chauffe-Eau Thermodynamique', icon: Droplet },
    { id: 'vmc', name: 'Ventilation mécanique (VMC)', icon: Wind },
    { id: 'solaires', name: 'Panneaux solaires photovoltaïques', icon: Sun },
    { id: 'chaudiere', name: 'Chaudière gaz / fioul', icon: Zap },
    { id: 'poele', name: 'Poêle ou insert bois', icon: TreePine },
    { id: 'elec', name: 'Tableau électrique / Bornes', icon: Zap },
];

const PLANS_LIST = [
    {
        id: 'STARTER',
        name: 'Starter',
        price: '34€',
        period: '/mois',
        features: ['50 clients max', '1 technicien (le patron)', '50 SMS manuels/mois', 'Essai 14j gratuit']
    },
    {
        id: 'PRO',
        name: 'Pro',
        price: '69€',
        period: '/mois',
        popular: true,
        features: ['300 clients max', '10 techniciens', '500 SMS/mois', 'App Mobile Tech', 'Rappels SMS auto']
    },
    {
        id: 'UNLIMITED',
        name: 'Unlimited',
        price: '129€',
        period: '/mois',
        features: ['Clients illimités', 'Techniciens illimités', '1000 SMS/mois', 'Chorus Pro & Numéro dédié']
    }
];

export default function RegisterPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const invitationToken = searchParams.get('invitation');
    const requestedPlan = searchParams.get('plan');
    const initialPlan = (requestedPlan && ['STARTER', 'PRO', 'UNLIMITED'].includes(requestedPlan.toUpperCase()))
        ? requestedPlan.toUpperCase()
        : 'PRO';

    const [mode, setMode] = useState(invitationToken ? 'TECHNICIAN' : 'OWNER');
    const [step, setStep] = useState(1);
    const [showPassword, setShowPassword] = useState(false);
    const [isPasswordFocused, setIsPasswordFocused] = useState(false);
    const [activeLegalModal, setActiveLegalModal] = useState(null);

    // Toast System
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const showToastNotification = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => {
            setToast({ show: false, message: '', type: 'success' });
        }, 4500);
    };

    // Code à 6 chiffres
    const [digitCode, setDigitCode] = useState(['', '', '', '', '', '']);
    const digitRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];
    const [devCode, setDevCode] = useState('');

    // Form fields
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        phone: '',
        invitationCode: invitationToken || '',
        companyName: '',
        legalForm: 'SAS',
        tradeCategories: ['clim', 'plombier'],
        planName: initialPlan,
        acceptTerms: false
    });

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Progression et pourcentages
    const totalSteps = mode === 'OWNER' ? 4 : 3;
    const percentage = mode === 'OWNER'
        ? Math.round((step / 4) * 100)
        : Math.round((step / 3) * 100);

    // Validation règles mot de passe
    const password = formData.password;
    const rules = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
    };
    const isPasswordValid = rules.length && rules.uppercase && rules.lowercase && rules.number;

    const [invitedCompanyName, setInvitedCompanyName] = useState('');

    useEffect(() => {
        const tokenFromUrl = searchParams.get('invitation') || searchParams.get('code');
        if (tokenFromUrl) {
            setMode('TECHNICIAN');
            setFormData(prev => ({ ...prev, invitationCode: tokenFromUrl }));

            fetch(`${API_URL}/v1/invitations/check/${tokenFromUrl}`)
                .then(res => res.json())
                .then(data => {
                    if (data.success && data.data?.companyName) {
                        setInvitedCompanyName(data.data.companyName);
                        if (data.data.email && !data.data.email.includes('@gestart.link')) {
                            setFormData(prev => ({ ...prev, email: data.data.email }));
                        }
                    }
                })
                .catch(() => { });
        }
    }, [searchParams]);

    const formWrapperRef = useRef(null);

    // Auto-scroll to top on step transition
    useEffect(() => {
        if (formWrapperRef.current) {
            formWrapperRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [step]);

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

    const toggleTradeCategory = (id) => {
        setFormData(prev => {
            const exists = prev.tradeCategories.includes(id);
            return {
                ...prev,
                tradeCategories: exists
                    ? prev.tradeCategories.filter(item => item !== id)
                    : [...prev.tradeCategories, id]
            };
        });
    };

    // ÉTAPE 1 -> ÉTAPE 2
    const handleStep1Submit = async (e) => {
        e.preventDefault();
        if (!formData.email || !formData.password) {
            const msg = 'Veuillez renseigner votre email et mot de passe';
            setError(msg);
            showToastNotification(msg, 'error');
            return;
        }
        if (!formData.acceptTerms) {
            const msg = 'Veuillez accepter les Conditions Générales et les Mentions Légales pour continuer';
            setError(msg);
            showToastNotification(msg, 'error');
            return;
        }
        if (!isPasswordValid) {
            const msg = 'Le mot de passe doit respecter les 4 règles de sécurité';
            setError(msg);
            showToastNotification(msg, 'error');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch(`${API_URL}/v1/auth/send-verification-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: formData.email })
            });

            const text = await response.text();
            let data = {};
            try { data = text ? JSON.parse(text) : {}; } catch (err) { }

            if (!response.ok) {
                const errMsg = data.message || 'Cet email est déjà utilisé ou invalide.';
                throw new Error(errMsg);
            }

            setDigitCode(['', '', '', '', '', '']);
            setDevCode('');

            showToastNotification(`Code de vérification envoyé à ${formData.email}`, 'success');
            setStep(2);
        } catch (err) {
            setError(err.message || 'Erreur lors de l’envoi du code');
            showToastNotification(err.message || 'Cet email est déjà utilisé', 'error');
        } finally {
            setLoading(false);
        }
    };

    // ÉTAPE 2 -> ÉTAPE 3
    const handleDigitChange = (index, value) => {
        if (!/^\d*$/.test(value)) return;
        const newCode = [...digitCode];
        newCode[index] = value.slice(-1);
        setDigitCode(newCode);
        setError('');

        if (value && index < 5) {
            digitRefs[index + 1].current?.focus();
        }
    };

    const handleDigitKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !digitCode[index] && index > 0) {
            digitRefs[index - 1].current?.focus();
        }
    };

    const handleStep2Submit = async (e) => {
        e.preventDefault();
        const code = digitCode.join('');
        if (code.length < 6) {
            const msg = 'Veuillez saisir le code complet à 6 chiffres';
            setError(msg);
            showToastNotification(msg, 'error');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch(`${API_URL}/v1/auth/verify-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: formData.email, code })
            });

            const text = await response.text();
            let data = {};
            try { data = text ? JSON.parse(text) : {}; } catch (err) { }

            if (!response.ok) {
                throw new Error(data.message || 'Code de vérification incorrect.');
            }

            showToastNotification('Email vérifié avec succès ! 👍', 'success');
            setStep(3);
        } catch (err) {
            setError(err.message || 'Code invalide');
            showToastNotification(err.message || 'Code de vérification incorrect', 'error');
        } finally {
            setLoading(false);
        }
    };

    // ÉTAPE 3 -> ÉTAPE 4
    const handleStep3Submit = (e) => {
        e.preventDefault();
        if (!formData.firstName || !formData.lastName || !formData.phone) {
            const msg = 'Veuillez renseigner votre prénom, nom et téléphone portable';
            setError(msg);
            showToastNotification(msg, 'error');
            return;
        }
        setError('');

        showToastNotification('Informations personnelles enregistrées !', 'success');

        if (mode === 'TECHNICIAN') {
            handleFinalRegister();
        } else {
            setStep(4);
        }
    };

    // ÉTAPE 4 Final
    const handleFinalRegister = async (e) => {
        if (e) e.preventDefault();

        if (mode === 'OWNER' && !formData.companyName) {
            const msg = 'Veuillez indiquer le nom de votre société';
            setError(msg);
            showToastNotification(msg, 'error');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const endpoint = mode === 'OWNER'
                ? `${API_URL}/v1/auth/register`
                : `${API_URL}/v1/invitations/accept`;

            const payload = mode === 'OWNER' ? formData : {
                token: formData.invitationCode,
                email: formData.email,
                firstName: formData.firstName,
                lastName: formData.lastName,
                password: formData.password,
                phone: formData.phone
            };

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload)
            });

            const text = await response.text();
            let data = {};
            try { data = text ? JSON.parse(text) : {}; } catch (jsonErr) { }

            if (!response.ok) {
                throw new Error(data.message || 'Erreur lors de l’inscription');
            }

            if (data.accessToken) {
                setAuthToken(data.accessToken);
                const { startProactiveTokenRefresh } = await import('../utils/api.js');
                startProactiveTokenRefresh();
            }

            showToastNotification('Bienvenue sur ClimPro CRM ! Espace créé avec succès. 🎉', 'success');
            navigate('/home', { state: { openOnboardingModal: true } });
        } catch (err) {
            setError(err.message || 'Impossible de finaliser l’inscription');
            showToastNotification(err.message || 'Erreur lors de l’inscription', 'error');
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
        <div className="register-container">
            {/* Toast Banner Notification */}
            <AnimatePresence>
                {toast.show && (
                    <motion.div
                        initial={{ opacity: 0, y: -30, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -30, scale: 0.95 }}
                        className={`toast-banner ${toast.type}`}
                    >
                        {toast.type === 'success' ? <CheckCircle2 size={20} className="toast-icon" /> : <AlertCircle size={20} className="toast-icon" />}
                        <span>{toast.message}</span>
                        <button type="button" onClick={() => setToast({ show: false, message: '', type: 'success' })} className="toast-close-btn">
                            <X size={16} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Left Decorative Banner */}
            <div className="register-banner">
                <div className="banner-glow" />
                <div className="banner-content">
                    <div className="logo-badge">
                        <span>GestArt</span>
                    </div>

                    <h1 className="banner-title">
                        {mode === 'OWNER'
                            ? "Gérez votre entreprise d'installation & dépannage en toute simplicité."
                            : "Rejoignez votre équipe sur l'application mobile GestArt."}
                    </h1>

                    <p className="banner-subtitle">
                        Devis, factures A4, rappels d'entretien automatiques, plomberie et planning techniciens dans un seul outil.
                    </p>

                    <div className="banner-features">
                        <div className="feature-item">
                            <CheckCircle2 className="feature-icon" />
                            <span>14 jours d'essai gratuit sans carte de crédit</span>
                        </div>
                        <div className="feature-item">
                            <CheckCircle2 className="feature-icon" />
                            <span>Application Mobile & Web synchronisées</span>
                        </div>
                        <div className="feature-item">
                            <CheckCircle2 className="feature-icon" />
                            <span>Climatisation, Plomberie, Pompes à chaleur & Solaires 🇫🇷</span>
                        </div>
                    </div>
                </div>

                <div className="banner-footer">
                    <span>© 2026 GestArt. Fait avec pour les installateurs & artisans.</span>
                </div>
            </div>

            {/* Right Form Container */}
            <div className="register-form-wrapper" ref={formWrapperRef}>
                <div className="form-card">
                    <div className="mobile-brand-header">
                        <div className="mobile-brand-badge">
                            <span>GestArt</span>
                        </div>
                    </div>

                    {/* Filling Progress Line with Percentage */}
                    <div className="progress-bar-container">
                        <div className="progress-bar-header">
                            <span className="progress-bar-title">Étape {step} sur {totalSteps}</span>
                            <span className="progress-bar-percentage">{percentage}% complété</span>
                        </div>
                        <div className="progress-bar-track">
                            <motion.div
                                className="progress-bar-fill"
                                initial={{ width: 0 }}
                                animate={{ width: `${percentage}%` }}
                                transition={{ duration: 0.4, ease: "easeInOut" }}
                            />
                        </div>
                    </div>

                    {/* Role Selection Tabs (Only on Step 1) */}
                    {step === 1 && (
                        <div className="mode-tabs">
                            <button
                                type="button"
                                className={`mode-tab ${mode === 'OWNER' ? 'active' : ''}`}
                                onClick={() => setMode('OWNER')}
                            >
                                <Building2 className="tab-icon" />
                                Entreprise
                            </button>
                            <button
                                type="button"
                                className={`mode-tab ${mode === 'TECHNICIAN' ? 'active' : ''}`}
                                onClick={() => setMode('TECHNICIAN')}
                            >
                                <Wrench className="tab-icon" />
                                Technicien
                            </button>
                        </div>
                    )}

                    {/* Error Alert */}
                    {error && (
                        <div className="error-alert">
                            <AlertCircle size={18} />
                            <div style={{ flex: 1 }}>
                                <div>{error}</div>
                                {error.includes("inscrit") && (
                                    <Link to="/login" style={{ color: 'var(--destructive)', fontWeight: 700, textDecoration: 'underline', marginTop: '4px', display: 'inline-block' }}>
                                        Se connecter maintenant →
                                    </Link>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ÉTAPE 1: Email + MDP (30 sec) */}
                    {step === 1 && (
                        <motion.form
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="form-content"
                            onSubmit={handleStep1Submit}
                        >
                            <div className="form-header">
                                <h2>Créer un compte</h2>
                                <p>Saisissez votre email et votre mot de passe pour commencer</p>
                            </div>

                            {mode === 'TECHNICIAN' && (
                                <>
                                    {invitedCompanyName && (
                                        <div style={{
                                            background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)',
                                            borderRadius: '12px', padding: '12px 16px', marginBottom: '16px', color: '#16A34A',
                                            fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px'
                                        }}>
                                            <Star size={18} fill="currentColor" />
                                            Vous êtes invité(e) à rejoindre l'entreprise : <strong>{invitedCompanyName}</strong>
                                        </div>
                                    )}
                                    <div className="input-group">
                                        <label>Code / Token d'invitation *</label>
                                        <div className="input-wrapper">
                                            <Lock className="input-icon" />
                                            <input
                                                type="text"
                                                name="invitationCode"
                                                placeholder="ex: INV-987654"
                                                value={formData.invitationCode}
                                                onChange={handleChange}
                                                required
                                            />
                                        </div>
                                    </div>
                                </>
                            )}

                            <div className="input-group">
                                <label>Email Professionnel *</label>
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
                                        onFocus={() => setIsPasswordFocused(true)}
                                        onBlur={() => setIsPasswordFocused(false)}
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
                            </div>

                            {/* Live Password Rules Indicator (Visible on Focus) */}
                            {isPasswordFocused && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="password-rules-box"
                                >
                                    <div className={`rule-item ${rules.length ? 'valid' : ''}`}>
                                        {rules.length ? <Check size={14} /> : <X size={14} />}
                                        <span>Au moins 8 caractères</span>
                                    </div>
                                    <div className={`rule-item ${rules.uppercase ? 'valid' : ''}`}>
                                        {rules.uppercase ? <Check size={14} /> : <X size={14} />}
                                        <span>1 lettre majuscule (A-Z)</span>
                                    </div>
                                    <div className={`rule-item ${rules.lowercase ? 'valid' : ''}`}>
                                        {rules.lowercase ? <Check size={14} /> : <X size={14} />}
                                        <span>1 lettre minuscule (a-z)</span>
                                    </div>
                                    <div className={`rule-item ${rules.number ? 'valid' : ''}`}>
                                        {rules.number ? <Check size={14} /> : <X size={14} />}
                                        <span>1 chiffre (0-9)</span>
                                    </div>
                                </motion.div>
                            )}

                            <div className="terms-checkbox-group">
                                <label className="terms-checkbox-label">
                                    <input
                                        type="checkbox"
                                        name="acceptTerms"
                                        checked={formData.acceptTerms}
                                        onChange={(e) => {
                                            setFormData(prev => ({ ...prev, acceptTerms: e.target.checked }));
                                            setError('');
                                        }}
                                        required
                                        className="terms-checkbox-input"
                                    />
                                    <span className="terms-checkbox-text">
                                        J'accepte les{' '}
                                        <button
                                            type="button"
                                            className="terms-link-btn"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setActiveLegalModal('cgu');
                                            }}
                                        >
                                            Conditions Générales d'Utilisation
                                        </button>{' '}
                                        et les{' '}
                                        <button
                                            type="button"
                                            className="terms-link-btn"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setActiveLegalModal('mentions');
                                            }}
                                        >
                                            Mentions Légales
                                        </button>
                                    </span>
                                </label>
                            </div>

                            <button type="submit" className="btn-submit pill-btn" disabled={loading}>
                                {loading ? 'Envoi du code...' : 'Continuer vers la vérification →'}
                            </button>
                        </motion.form>
                    )}

                    {/* ÉTAPE 2: Vérification email (Code 6 chiffres) (15 sec) */}
                    {step === 2 && (
                        <motion.form
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="form-content"
                            onSubmit={handleStep2Submit}
                        >
                            <div className="form-header">
                                <h2>Vérification Email</h2>
                                <p>Saisissez le code à 6 chiffres envoyé à <strong>{formData.email}</strong></p>
                            </div>

                            <div className="auth-hint-box">
                                <Info size={16} className="auth-hint-icon" />
                                <div className="auth-hint-text">
                                    <strong>Conseil :</strong> Pensez à vérifier votre dossier <strong>Spam / Courriers indésirables</strong> si vous ne recevez pas le code (expéditeur : <code>support.gestart@gmail.com</code>).
                                </div>
                            </div>

                            <div className="digits-input-container">
                                {digitCode.map((digit, idx) => (
                                    <input
                                        key={idx}
                                        ref={digitRefs[idx]}
                                        type="text"
                                        maxLength="1"
                                        className="digit-box"
                                        value={digit}
                                        onChange={(e) => handleDigitChange(idx, e.target.value)}
                                        onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                                        autoFocus={idx === 0}
                                    />
                                ))}
                            </div>

                            <div className="button-group">
                                <button type="button" className="btn-back" onClick={() => setStep(1)}>
                                    <ArrowLeft size={18} /> Retour
                                </button>
                                <button type="submit" className="btn-submit pill-btn" disabled={loading}>
                                    {loading ? 'Vérification...' : 'Valider mon email →'}
                                </button>
                            </div>
                        </motion.form>
                    )}

                    {/* ÉTAPE 3: Nom + Prénom + Téléphone (15 sec) */}
                    {step === 3 && (
                        <motion.form
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="form-content"
                            onSubmit={handleStep3Submit}
                        >
                            <div className="form-header">
                                <h2>Vos Informations</h2>
                                <p>Renseignez votre identité et votre téléphone portable</p>
                            </div>

                            <div className="form-row">
                                <div className="input-group">
                                    <label>Prénom *</label>
                                    <div className="input-wrapper">
                                        <User className="input-icon" />
                                        <input
                                            type="text"
                                            name="firstName"
                                            placeholder="Jean"
                                            value={formData.firstName}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="input-group">
                                    <label>Nom *</label>
                                    <div className="input-wrapper">
                                        <User className="input-icon" />
                                        <input
                                            type="text"
                                            name="lastName"
                                            placeholder="Dupont"
                                            value={formData.lastName}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="input-group">
                                <label>Téléphone portable *</label>
                                <PhoneInput
                                    name="phone"
                                    value={formData.phone}
                                    onChange={(formatted) => setFormData(prev => ({ ...prev, phone: formatted }))}
                                    required
                                />
                            </div>

                            <button type="submit" className="btn-submit pill-btn">
                                {mode === 'OWNER' ? 'Étape suivante : Société →' : 'Finaliser mon compte →'}
                            </button>
                        </motion.form>
                    )}

                    {/* ÉTAPE 4: Nom société + Domaines d'activité (30 sec) */}
                    {step === 4 && mode === 'OWNER' && (
                        <motion.form
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="form-content"
                            onSubmit={handleFinalRegister}
                        >
                            <div className="form-header">
                                <h2>Votre Société & Activités</h2>
                                <p>Renseignez votre entreprise et vos domaines d'intervention</p>
                            </div>

                            <div className="input-group">
                                <label>Nom de la Société ou SIRET / SIREN *</label>
                                <CompanyAutocomplete
                                    value={formData.companyName}
                                    onChange={(val) => setFormData(prev => ({ ...prev, companyName: val }))}
                                    onCompanySelect={(company) => {
                                        setFormData(prev => ({
                                            ...prev,
                                            companyName: company.nom,
                                            vatNumber: company.siret ? `FR${(12 + parseInt(company.siren || "0") % 97) % 97}${company.siren}` : prev.vatNumber,
                                            zipCode: company.code_postal || prev.zipCode,
                                            city: company.ville || prev.city
                                        }));
                                    }}
                                    placeholder="Nom de société, SIREN ou SIRET..."
                                    required
                                />
                            </div>

                            <div className="input-group">
                                <label>Secteurs d'activité (Sélectionnez un ou plusieurs) *</label>
                                <div className="categories-grid">
                                    {TRADE_CATEGORIES_LIST.map(cat => {
                                        const isSelected = formData.tradeCategories.includes(cat.id);
                                        const IconComponent = cat.icon;
                                        return (
                                            <button
                                                key={cat.id}
                                                type="button"
                                                className={`cat-chip ${isSelected ? 'active' : ''}`}
                                                onClick={() => toggleTradeCategory(cat.id)}
                                            >
                                                <IconComponent size={16} className="cat-chip-icon" />
                                                <span>{cat.name}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="input-group">
                                <label>Formule choisie (14j d'essai offerts)</label>
                                <div className="plans-cards">
                                    {PLANS_LIST.map(plan => {
                                        const isSelected = formData.planName === plan.id;
                                        return (
                                            <div
                                                key={plan.id}
                                                className={`plan-card ${isSelected ? 'selected' : ''}`}
                                                onClick={() => setFormData(prev => ({ ...prev, planName: plan.id }))}
                                            >
                                                {plan.popular && <span className="pop-tag">Recommandé</span>}
                                                <div className="plan-name">{plan.name}</div>
                                                <div className="plan-price">{plan.price}<span>{plan.period}</span></div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="button-group">
                                <button type="button" className="btn-back" onClick={() => setStep(3)}>
                                    <ArrowLeft size={18} /> Retour
                                </button>
                                <button type="submit" className="btn-submit pill-btn" disabled={loading}>
                                    {loading ? 'Accès au Dashboard...' : 'Démarrer mes 14j d\'essai →'}
                                </button>
                            </div>
                        </motion.form>
                    )}

                    {step === 1 && (
                        <>
                            <div className="divider">
                                <span>Ou s'inscrire avec</span>
                            </div>

                            <div className="social-login-row">
                                <button
                                    type="button"
                                    className="social-circle-btn"
                                    onClick={handleGoogleAuth}
                                    title="Continuer avec Google"
                                >
                                    <svg className="google-icon" viewBox="0 0 24 24" width="22" height="22">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                                    </svg>
                                </button>
                            </div>
                        </>
                    )}

                    <div className="form-footer">
                        {step !== 2 && <p className="required-note">(*) Les champs sont obligatoires</p>}
                        <div>
                            <span>Vous avez déjà un compte ? </span>
                            <Link to="/login" className="login-link">
                                Se connecter
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {activeLegalModal && (
                <LegalModal
                    type={activeLegalModal}
                    onClose={() => setActiveLegalModal(null)}
                />
            )}
        </div>
    );
}
