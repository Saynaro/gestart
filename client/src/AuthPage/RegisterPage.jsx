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
    Info,
    RefreshCw,
    Gift,
    Sparkles,
    Loader2
} from 'lucide-react';
import './RegisterPage.css';
import CompanyAutocomplete from '../components/CompanyAutocomplete';
import PhoneInput from '../components/PhoneInput';
import { apiFetch } from '../utils/api';
import { API_URL } from '../utils/config';
import { setAuthToken, clearAuthToken } from '../utils/auth';
import { useUser } from '../utils/useUser';
import { useSubscription } from '../utils/useSubscription';
import OtpInput6 from '../components/OtpInput6';

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
        price: '34,90€',
        period: '/mois',
        subtitle: 'Artisan seul',
        features: [
            '1 patron / gérant',
            '100 clients max',
            '100 SMS/mois inclus',
            'Devis & Facturation conformes',
            'Rapprochement bancaire manuel'
        ]
    },
    {
        id: 'PRO',
        name: 'Pro',
        price: '69,90€',
        period: '/mois',
        popular: true,
        subtitle: 'Équipe (1 à 5 techs)',
        features: [
            'Jusqu\'à 5 techniciens',
            '500 clients max',
            '500 SMS/mois inclus',
            '1 compte bancaire inclus (DSP2)',
            'Rapprochement auto (+7€/m supp.)',
            'App Mobile Techs'
        ]
    },
    {
        id: 'UNLIMITED',
        name: 'Unlimited',
        price: '119,90€',
        period: '/mois',
        subtitle: 'Croissance & Grands comptes',
        features: [
            'Techs & clients illimités',
            '1 500 SMS/mois inclus',
            '3 comptes bancaires inclus (DSP2)',
            'Rapprochement bancaire auto',
            'Support VIP 7j/7'
        ]
    }
];

export default function RegisterPage() {
    const navigate = useNavigate();
    const { setUser, refreshUser } = useUser();
    const { setSubscription, refreshSubscription } = useSubscription();
    const [searchParams] = useSearchParams();
    const invitationToken = searchParams.get('invitation');
    const requestedPlan = searchParams.get('plan');
    const initialPlan = (requestedPlan && ['STARTER', 'PRO', 'UNLIMITED'].includes(requestedPlan.toUpperCase()))
        ? requestedPlan.toUpperCase()
        : 'PRO';

    const isGoogleSignup = searchParams.get('google_signup') === 'true';
    const googleEmail = searchParams.get('email') || '';
    const googleFirstName = searchParams.get('firstName') || '';
    const googleLastName = searchParams.get('lastName') || '';
    const googleAvatarUrl = searchParams.get('avatarUrl') || '';
    const googleToken = searchParams.get('googleToken') || '';

    const [mode, setMode] = useState(invitationToken ? 'TECHNICIAN' : 'OWNER');
    const [step, setStep] = useState(isGoogleSignup ? 3 : 1);
    const [showPassword, setShowPassword] = useState(false);
    const [isPasswordFocused, setIsPasswordFocused] = useState(false);
    const passwordInputRef = useRef(null);

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

    const initialRefCode = (searchParams.get('ref') || searchParams.get('promo') || searchParams.get('parrainage') || '').toUpperCase().trim();
    const [promoInfo, setPromoInfo] = useState(null);
    const [showPromoInput, setShowPromoInput] = useState(Boolean(initialRefCode));
    const [isCheckingPromo, setIsCheckingPromo] = useState(false);

    const [formData, setFormData] = useState({
        email: googleEmail || '',
        password: '',
        firstName: googleFirstName || '',
        lastName: googleLastName || '',
        phone: '',
        invitationCode: invitationToken || '',
        companyName: '',
        siret: '',
        siren: '',
        legalForm: 'SAS',
        tradeCategories: ['clim', 'plombier'],
        planName: initialPlan,
        referralCode: initialRefCode || '',
        acceptTerms: isGoogleSignup ? true : false,
        acceptProfessionalCapacity: isGoogleSignup ? true : false,
        acceptDpa: isGoogleSignup ? true : false,
        acceptMarketing: false,
        isGoogle: isGoogleSignup,
        googleToken: googleToken || '',
        avatarUrl: googleAvatarUrl || ''
    });

    useEffect(() => {
        if (initialRefCode) {
            validatePromo(initialRefCode);
        }
    }, [initialRefCode]);

    const validatePromo = async (code) => {
        const clean = (code || '').trim().toUpperCase();
        if (!clean) {
            setPromoInfo(null);
            return;
        }
        setIsCheckingPromo(true);
        try {
            const res = await fetch(`${API_URL}/v1/referrals/validate?code=${encodeURIComponent(clean)}`);
            const data = await res.json();
            if (data && data.valid) {
                setPromoInfo({ valid: true, message: data.message || "Code validé : 30 jours offerts (1 mois gratuit) !" });
                showToastNotification("✓ Code validé : vous bénéficiez de 30 jours d'essai gratuits !", "success");
            } else {
                setPromoInfo({ valid: false, message: data?.message || "Code promo introuvable ou invalide" });
            }
        } catch (e) {
            setPromoInfo({ valid: false, message: "Erreur lors de la vérification du code" });
        } finally {
            setIsCheckingPromo(false);
        }
    };

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [resendTimer, setResendTimer] = useState(0);

    // 60-second cooldown timer for email verification code
    useEffect(() => {
        if (resendTimer <= 0) return;
        const interval = setInterval(() => {
            setResendTimer(prev => prev - 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [resendTimer]);

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

    useEffect(() => {
        if (isGoogleSignup && googleEmail) {
            setStep(3);
            setFormData(prev => ({
                ...prev,
                email: googleEmail,
                firstName: prev.firstName || googleFirstName,
                lastName: prev.lastName || googleLastName,
                isGoogle: true,
                googleToken: googleToken,
                avatarUrl: googleAvatarUrl,
                acceptTerms: true
            }));
            showToastNotification(`Compte Google vérifié (${googleEmail}) ! Complétez vos informations.`, 'success');
        }
    }, [isGoogleSignup, googleEmail, googleFirstName, googleLastName, googleToken, googleAvatarUrl]);

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
        if (!formData.acceptProfessionalCapacity) {
            const msg = 'Veuillez certifier que vous souscrivez pour votre activité professionnelle';
            setError(msg);
            showToastNotification(msg, 'error');
            return;
        }
        if (!formData.acceptTerms || !formData.acceptDpa) {
            const msg = 'Veuillez accepter les Conditions Générales (CGU/CGV) et l\'Accord DPA pour continuer';
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
            setResendTimer(60);
            setStep(2);
        } catch (err) {
            setError(err.message || 'Erreur lors de l’envoi du code');
            showToastNotification(err.message || 'Cet email est déjà utilisé', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleResendCode = async () => {
        if (resendTimer > 0 || loading || !formData.email) return;

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
                throw new Error(data.message || 'Erreur lors du renvoi du code.');
            }

            setResendTimer(60);
            setDigitCode(['', '', '', '', '', '']);
            showToastNotification(`Nouveau code envoyé à ${formData.email}`, 'success');
        } catch (err) {
            setError(err.message || 'Impossible de renvoyer le code.');
            showToastNotification(err.message || 'Erreur lors du renvoi', 'error');
        } finally {
            setLoading(false);
        }
    };

    // ÉTAPE 2 -> ÉTAPE 3 (Support OTP AutoFill & Paste)
    const handleDigitChange = (index, value) => {
        const cleaned = value.replace(/\D/g, '');
        if (!cleaned && value !== '') return;

        if (cleaned.length > 1) {
            // Mobile Keyboard AutoFill (iOS/Android) or paste
            const digits = cleaned.slice(0, 6).split('');
            const newCode = [...digitCode];
            digits.forEach((char, i) => {
                if (i < 6) newCode[i] = char;
            });
            setDigitCode(newCode);
            setError('');
            const focusTarget = Math.min(digits.length, 5);
            digitRefs[focusTarget]?.current?.focus();
            return;
        }

        const newCode = [...digitCode];
        newCode[index] = cleaned.slice(-1);
        setDigitCode(newCode);
        setError('');

        if (cleaned && index < 5) {
            digitRefs[index + 1].current?.focus();
        }
    };

    const handleDigitPaste = (e) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (!pasted) return;
        const newCode = [...digitCode];
        pasted.split('').forEach((char, i) => {
            if (i < 6) newCode[i] = char;
        });
        setDigitCode(newCode);
        setError('');
        const focusTarget = Math.min(pasted.length, 5);
        digitRefs[focusTarget]?.current?.focus();
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

            // Immediately hydrate user and subscription profiles
            const [freshUser] = await Promise.all([
                refreshUser().catch(() => null),
                refreshSubscription().catch(() => null)
            ]);

            showToastNotification('Bienvenue sur GestArt ! Espace créé avec succès. 🎉', 'success');

            const targetRole = freshUser?.role || rawUser.role || mode;
            if (targetRole === 'TECHNICIAN') {
                navigate('/interventions/today', { replace: true });
            } else {
                navigate('/home', { state: { openOnboardingModal: true }, replace: true });
            }
        } catch (err) {
            setError(err.message || 'Impossible de finaliser l’inscription');
            showToastNotification(err.message || 'Erreur lors de l’inscription', 'error');
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
                        <Link to="/" replace className="auth-brand-link">
                            <img src="/Logo-transparent.png" alt="GestArt" className="auth-brand-icon" />
                            <span className="auth-brand-text">GestArt</span>
                        </Link>
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
                    <span>© 2026 GestArt. Fait pour les installateurs & artisans.</span>
                </div>
            </div>

            {/* Right Form Container */}
            <div className="register-form-wrapper" ref={formWrapperRef}>
                <div className="form-card">
                    <div className="mobile-brand-header">
                        <div className="mobile-brand-badge">
                            <Link to="/" replace className="auth-brand-link">
                                <img src="/Logo-transparent.png" alt="GestArt" className="auth-brand-icon" />
                                <span className="auth-brand-text">GestArt</span>
                            </Link>
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
                                    <Link to="/login" replace style={{ color: 'var(--destructive)', fontWeight: 700, textDecoration: 'underline', marginTop: '4px', display: 'inline-block' }}>
                                        Se connecter maintenant →
                                    </Link>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ÉTAPE 1: Email + MDP (30 sec) */}
                    {step === 1 && (
                        <form
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
                                        ref={passwordInputRef}
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
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                        }}
                                        onClick={() => {
                                            setShowPassword(prev => !prev);
                                            if (passwordInputRef.current) {
                                                passwordInputRef.current.focus();
                                            }
                                        }}
                                        tabIndex="-1"
                                        aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            {/* Live Password Rules Indicator - 2 rows x 2 columns */}
                            {(isPasswordFocused || (formData.password && formData.password.length > 0)) && (
                                <div className="password-rules-box">
                                    <div className={`rule-item ${rules.length ? 'valid' : ''}`} style={{ color: rules.length ? '#22C55E' : '#94A3B8' }}>
                                        {rules.length ? <Check size={13} strokeWidth={2.5} /> : <X size={13} strokeWidth={2} />}
                                        <span>8 caractères min.</span>
                                    </div>
                                    <div className={`rule-item ${rules.uppercase ? 'valid' : ''}`} style={{ color: rules.uppercase ? '#22C55E' : '#94A3B8' }}>
                                        {rules.uppercase ? <Check size={13} strokeWidth={2.5} /> : <X size={13} strokeWidth={2} />}
                                        <span>1 majuscule (A-Z)</span>
                                    </div>
                                    <div className={`rule-item ${rules.lowercase ? 'valid' : ''}`} style={{ color: rules.lowercase ? '#22C55E' : '#94A3B8' }}>
                                        {rules.lowercase ? <Check size={13} strokeWidth={2.5} /> : <X size={13} strokeWidth={2} />}
                                        <span>1 minuscule (a-z)</span>
                                    </div>
                                    <div className={`rule-item ${rules.number ? 'valid' : ''}`} style={{ color: rules.number ? '#22C55E' : '#94A3B8' }}>
                                        {rules.number ? <Check size={13} strokeWidth={2.5} /> : <X size={13} strokeWidth={2} />}
                                        <span>1 chiffre (0-9)</span>
                                    </div>
                                </div>
                            )}

                            <div className="terms-checkbox-group">
                                <label className="terms-checkbox-label">
                                    <input
                                        type="checkbox"
                                        name="acceptLegal"
                                        checked={Boolean(formData.acceptProfessionalCapacity && formData.acceptTerms && formData.acceptDpa)}
                                        onChange={(e) => {
                                            const checked = e.target.checked;
                                            setFormData(prev => ({
                                                ...prev,
                                                acceptProfessionalCapacity: checked,
                                                acceptTerms: checked,
                                                acceptDpa: checked
                                            }));
                                            setError('');
                                        }}
                                        required
                                        className="terms-checkbox-input"
                                    />
                                    <span className="terms-checkbox-text">
                                        Je souscris pour mon activité professionnelle et j'accepte les{' '}
                                        <a
                                            href="/cgu"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="terms-link-btn"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            CGU/CGV
                                        </a>, le{' '}
                                        <a
                                            href="/dpa"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="terms-link-btn"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            DPA
                                        </a> et la{' '}
                                        <a
                                            href="/confidentialite"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="terms-link-btn"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            Politique de confidentialité
                                        </a>.
                                    </span>
                                </label>

                                <label className="terms-checkbox-label">
                                    <input
                                        type="checkbox"
                                        name="acceptMarketing"
                                        checked={formData.acceptMarketing}
                                        onChange={(e) => {
                                            setFormData(prev => ({ ...prev, acceptMarketing: e.target.checked }));
                                        }}
                                        className="terms-checkbox-input"
                                    />
                                    <span className="terms-checkbox-text">
                                        (Optionnel) Recevoir nos conseils techniques et nouveautés par e-mail.
                                    </span>
                                </label>
                            </div>

                            <button type="submit" className="btn-submit pill-btn" disabled={loading}>
                                {loading ? 'Envoi du code...' : 'Continuer vers la vérification →'}
                            </button>
                        </form>
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

                            <OtpInput6
                                value={digitCode.join('')}
                                onChange={(val) => {
                                    const arr = val.split('');
                                    while (arr.length < 6) arr.push('');
                                    setDigitCode(arr);
                                    setError('');
                                }}
                                autoFocus
                            />

                            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '12px', marginBottom: '8px' }}>
                                <button
                                    type="button"
                                    onClick={handleResendCode}
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

                            {formData.isGoogle && (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    padding: '10px 14px',
                                    background: 'rgba(34, 197, 94, 0.1)',
                                    border: '1px solid rgba(34, 197, 94, 0.25)',
                                    borderRadius: 10,
                                    marginBottom: 16,
                                    fontSize: '0.88rem',
                                    color: '#22c55e'
                                }}>
                                    <CheckCircle2 size={18} />
                                    <span>Compte Google vérifié : <strong>{formData.email}</strong></span>
                                </div>
                            )}

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

                            <div className="button-group">
                                {formData.isGoogle ? (
                                    <button type="button" className="btn-back" onClick={() => navigate('/login', { replace: true })}>
                                        <ArrowLeft size={18} /> Annuler
                                    </button>
                                ) : (
                                    <button type="button" className="btn-back" onClick={() => setStep(2)}>
                                        <ArrowLeft size={18} /> Retour
                                    </button>
                                )}
                                <button type="submit" className="btn-submit pill-btn" style={{ flex: 1 }}>
                                    {mode === 'OWNER' ? 'Étape suivante : Société →' : 'Finaliser mon compte →'}
                                </button>
                            </div>
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
                                            siret: company.siret || prev.siret || '',
                                            siren: company.siren || prev.siren || '',
                                            legalForm: company.forme_juridique || prev.legalForm || 'SAS',
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
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <label style={{ margin: 0, fontWeight: 600 }}>Formule choisie *</label>
                                    {promoInfo?.valid ? (
                                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', backgroundColor: '#F1F5F9', padding: '3px 10px', borderRadius: '6px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Check size={13} /> 30 jours offerts (Parrainage)
                                        </span>
                                    ) : (
                                        <span style={{ fontSize: '12px', color: '#64748B' }}>
                                            14 jours d'essai gratuits sans engagement
                                        </span>
                                    )}
                                </div>
                                <div className="plans-cards">
                                    {PLANS_LIST.map(plan => {
                                        const isSelected = formData.planName === plan.id;
                                        return (
                                            <div
                                                key={plan.id}
                                                className={`plan-card ${isSelected ? 'selected' : ''}`}
                                                onClick={() => setFormData(prev => ({ ...prev, planName: plan.id }))}
                                            >
                                                {promoInfo?.valid ? (
                                                    <span className="pop-tag">1 mois offert</span>
                                                ) : (
                                                    plan.popular && <span className="pop-tag">Recommandé</span>
                                                )}

                                                <div className="plan-header">
                                                    <div>
                                                        <div className="plan-name">{plan.name}</div>
                                                        <div className="plan-subtitle">{plan.subtitle}</div>
                                                    </div>
                                                    <div className={`plan-radio ${isSelected ? 'checked' : ''}`}>
                                                        {isSelected && <Check size={11} strokeWidth={3} />}
                                                    </div>
                                                </div>

                                                <div className="plan-price">
                                                    {promoInfo?.valid ? (
                                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                                            <span style={{ textDecoration: 'line-through', opacity: 0.5, fontSize: '0.85em' }}>{plan.price}</span>
                                                            <span style={{ color: '#0F172A', fontWeight: 800 }}>0€</span>
                                                            <span style={{ fontSize: '0.76rem', color: '#64748B' }}>/ 30 jours</span>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            {plan.price}<span>{plan.period}</span>
                                                        </>
                                                    )}
                                                </div>

                                                <ul className="plan-features-list">
                                                    {plan.features.map((feat, idx) => (
                                                        <li key={idx} className="plan-feature-item">
                                                            <Check size={12} className="plan-feature-icon" strokeWidth={2.5} />
                                                            <span>{feat}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Code Promo & Parrainage */}
                            <div className="input-group" style={{ marginTop: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <label style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>Code promo ou de parrainage</label>
                                    {!showPromoInput && !formData.referralCode && (
                                        <button
                                            type="button"
                                            onClick={() => setShowPromoInput(true)}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                color: '#0F172A',
                                                fontSize: '12px',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                padding: 0,
                                                textDecoration: 'underline'
                                            }}
                                        >
                                            + Ajouter un code
                                        </button>
                                    )}
                                </div>

                                {(showPromoInput || formData.referralCode) && (
                                    <div style={{ marginTop: '6px' }}>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                                            <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
                                                <Gift size={16} style={{ position: 'absolute', left: '12px', color: '#64748B' }} />
                                                <input
                                                    type="text"
                                                    name="referralCode"
                                                    placeholder="ex: ARTISAN-9X2Y"
                                                    value={formData.referralCode}
                                                    onChange={(e) => {
                                                        const val = e.target.value.toUpperCase();
                                                        setFormData(prev => ({ ...prev, referralCode: val }));
                                                        if (!val) setPromoInfo(null);
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            validatePromo(formData.referralCode);
                                                        }
                                                    }}
                                                    style={{
                                                        width: '100%',
                                                        padding: '10px 12px 10px 38px',
                                                        backgroundColor: '#FFFFFF',
                                                        border: `1px solid ${promoInfo?.valid ? '#0F172A' : promoInfo?.valid === false ? '#EF4444' : '#E2E8F0'}`,
                                                        borderRadius: '8px',
                                                        fontSize: '13px',
                                                        fontWeight: 600,
                                                        color: '#0F172A',
                                                        textTransform: 'uppercase'
                                                    }}
                                                />
                                                {promoInfo?.valid && (
                                                    <CheckCircle2 size={16} style={{ position: 'absolute', right: '12px', color: '#0F172A' }} />
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => validatePromo(formData.referralCode)}
                                                disabled={isCheckingPromo || !formData.referralCode.trim()}
                                                style={{
                                                    padding: '0 16px',
                                                    borderRadius: '8px',
                                                    backgroundColor: '#0F172A',
                                                    color: '#FFFFFF',
                                                    border: 'none',
                                                    fontWeight: 600,
                                                    fontSize: '12.5px',
                                                    cursor: (isCheckingPromo || !formData.referralCode.trim()) ? 'not-allowed' : 'pointer',
                                                    opacity: (isCheckingPromo || !formData.referralCode.trim()) ? 0.5 : 1,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    whiteSpace: 'nowrap'
                                                }}
                                            >
                                                {isCheckingPromo ? (
                                                    <Loader2 size={14} className="animate-spin" />
                                                ) : promoInfo?.valid ? (
                                                    'Validé ✓'
                                                ) : (
                                                    'Appliquer'
                                                )}
                                            </button>
                                        </div>

                                        {promoInfo ? (
                                            <div style={{
                                                marginTop: '8px',
                                                padding: '9px 12px',
                                                borderRadius: '8px',
                                                backgroundColor: '#F8FAFC',
                                                border: `1px solid ${promoInfo.valid ? '#CBD5E1' : '#FECACA'}`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px'
                                            }}>
                                                {promoInfo.valid ? (
                                                    <CheckCircle2 size={16} style={{ color: '#0F172A', flexShrink: 0 }} />
                                                ) : (
                                                    <AlertCircle size={16} style={{ color: '#EF4444', flexShrink: 0 }} />
                                                )}
                                                <span style={{ fontSize: '12px', color: promoInfo.valid ? '#0F172A' : '#EF4444', fontWeight: 600 }}>
                                                    {promoInfo.valid ? `Code validé : Vous bénéficiez de 30 jours d'essai offerts (1 mois gratuit) !` : promoInfo.message}
                                                </span>
                                            </div>
                                        ) : (
                                            <p style={{ margin: '5px 0 0 0', fontSize: '11.5px', color: '#64748B' }}>
                                                Entrez le code d'un confrère pour bénéficier d'un mois offert (30 jours d'essai).
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div style={{
                                margin: '14px 0 10px 0',
                                padding: '10px 12px',
                                backgroundColor: '#F8FAFC',
                                border: '1px solid #E2E8F0',
                                borderRadius: '10px',
                                fontSize: '0.82rem',
                                color: '#475569',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '8px',
                                lineHeight: 1.45
                            }}>
                                <ShieldCheck size={18} style={{ color: '#0F172A', flexShrink: 0, marginTop: '2px' }} />
                                <span>
                                    En validant, je certifie sur l'honneur être le représentant légal ou dûment mandaté de cette entreprise pour créer ce compte professionnel et accepter le traitement des données.
                                </span>
                            </div>

                            <div className="button-group">
                                <button type="button" className="btn-back" onClick={() => setStep(3)}>
                                    <ArrowLeft size={18} /> Retour
                                </button>
                                <button type="submit" className="btn-submit pill-btn" disabled={loading}>
                                    {loading ? 'Accès au Dashboard...' : promoInfo?.valid ? 'Démarrer mes 30 jours offerts →' : 'Démarrer mes 14j d\'essai →'}
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
                            <Link to="/login" replace className="login-link" style={{ whiteSpace: 'nowrap' }}>
                                Se connecter
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
