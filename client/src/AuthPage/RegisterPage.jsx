import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Building2,
    UserCheck,
    CheckCircle2,
    ArrowRight,
    ArrowLeft,
    Shield,
    Sparkles,
    Lock,
    Mail,
    User,
    Phone,
    Briefcase,
    Zap,
    AlertCircle
} from 'lucide-react';
import './RegisterPage.css';

const TRADE_CATEGORIES_LIST = [
    { id: 'clim', name: 'Climatisation / PAC air-air', icon: '❄️' },
    { id: 'pac', name: 'Pompe à chaleur air-eau', icon: '🔥' },
    { id: 'cet', name: 'Chauffe-Eau Thermodynamique', icon: '💧' },
    { id: 'vmc', name: 'Ventilation mécanique (VMC)', icon: '🌀' },
    { id: 'solaires', name: 'Panneaux solaires photovoltaïques', icon: '☀️' },
    { id: 'chaudiere', name: 'Chaudière gaz / fioul', icon: '⚡' },
    { id: 'poele', name: 'Poêle ou insert bois', icon: '🪵' },
    { id: 'elec', name: 'Tableau électrique / Bornes', icon: '⚡' },
];

const PLANS_LIST = [
    {
        id: 'STARTER',
        name: 'Starter',
        price: '39€',
        period: '/mois',
        features: ['50 clients max', '2 techniciens', '100 SMS/mois', 'Essai 14j gratuit']
    },
    {
        id: 'PRO',
        name: 'Pro',
        price: '89€',
        period: '/mois',
        popular: true,
        features: ['300 clients max', '10 techniciens', '500 SMS/mois', 'App Mobile Tech', 'Rappels ТО SMS auto']
    },
    {
        id: 'UNLIMITED',
        name: 'Unlimited',
        price: '149€',
        period: '/mois',
        features: ['Clients illimités', 'Techniciens illimités', '1000 SMS/mois', 'Chorus Pro & Numéro dédié']
    }
];

export default function RegisterPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const invitationToken = searchParams.get('invitation');

    // Modus: 'OWNER' (Новая компания) или 'TECHNICIAN' (Приглашенный сотрудник)
    const [mode, setMode] = useState(invitationToken ? 'TECHNICIAN' : 'OWNER');
    const [step, setStep] = useState(1); // 1 = Compte, 2 = Société (для Owner)

    // Имитация данных приглашения для демонстрации
    const [invitationDetails, setInvitationDetails] = useState(null);

    // Form fields
    const [formData, setFormData] = useState({
        // Данные человека
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        phone: '',
        invitationCode: invitationToken || '',
        // Данные компании (Только для Owner)
        companyName: '',
        legalForm: 'SAS',
        vatNumber: '',
        zipCode: '',
        city: '',
        tradeCategories: [],
        planName: 'PRO'
    });

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (invitationToken) {
            setMode('TECHNICIAN');
            setFormData(prev => ({ ...prev, invitationCode: invitationToken }));
            setInvitationDetails({
                companyName: 'Dupont Climatisation SAS',
                email: 'technicien@dupont.fr',
                role: 'Technicien'
            });
        }
    }, [invitationToken]);

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

    const handleNextStep = (e) => {
        e.preventDefault();
        if (!formData.firstName || !formData.lastName || !formData.companyName || !formData.email || !formData.password) {
            setError('Veuillez remplir tous les champs obligatoires (*)');
            return;
        }
        if (formData.password.length < 8) {
            setError('Le mot de passe doit contenir au moins 8 caractères');
            return;
        }
        setError('');
        setStep(2);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (mode === 'TECHNICIAN' && !formData.invitationCode) {
            setError('Veuillez saisir votre code d\'invitation');
            setLoading(false);
            return;
        }

        try {
            const endpoint = mode === 'OWNER'
                ? '/api/auth/register'
                : `/api/auth/accept-invitation?token=${formData.invitationCode}`;

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const text = await response.text();
            let data = {};
            try {
                data = text ? JSON.parse(text) : {};
            } catch (jsonErr) {
                console.error("Non-JSON response received:", text);
                throw new Error("Réponse invalide du serveur. Vérifiez que le serveur бэкенд запущен на порту 5001.");
            }

            if (!response.ok) {
                throw new Error(data.message || 'Erreur lors de l’inscription');
            }

            if (data.accessToken) {
                localStorage.setItem('accessToken', data.accessToken);
            }
            navigate(mode === 'TECHNICIAN' ? '/planning' : '/home');

        } catch (err) {
            setError(err.message || 'Impossible de se connecter au serveur');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="register-container">
            {/* Left Decorative Banner */}
            <div className="register-banner">
                <div className="banner-glow" />
                <div className="banner-content">
                    <div className="logo-badge">
                        <Zap className="logo-icon" />
                        <span>ClimPro CRM</span>
                    </div>

                    <h1 className="banner-title">
                        {mode === 'OWNER'
                            ? "Gérez votre activité d'installation en toute simplicité."
                            : "Rejoignez votre équipe sur l'application mobile ClimPro."}
                    </h1>

                    <p className="banner-subtitle">
                        {mode === 'OWNER'
                            ? "Rappels d'entretien automatiques, devis, factures A4 et planning technicien dans un seul outil."
                            : "Consultez vos interventions du jour, uploadez vos photos et faites signer vos clients en 1 clic."}
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
                            <span>Support français & données hébergées en France 🇫🇷</span>
                        </div>
                    </div>
                </div>

                <div className="banner-footer">
                    <span>© 2026 ClimPro. Fait avec ❤️ pour les artisans.</span>
                </div>
            </div>

            {/* Right Form Container */}
            <div className="register-form-wrapper">
                <div className="form-card">
                    {/* Header tabs for switching mode */}
                    <div className="mode-tabs">
                        <button
                            className={`mode-tab ${mode === 'OWNER' ? 'active' : ''}`}
                            onClick={() => { setMode('OWNER'); setStep(1); }}
                        >
                            <Building2 className="tab-icon" />
                            Créer une Société (Patron)
                        </button>
                        <button
                            className={`mode-tab ${mode === 'TECHNICIAN' ? 'active' : ''}`}
                            onClick={() => { setMode('TECHNICIAN'); setStep(1); }}
                        >
                            <UserCheck className="tab-icon" />
                            J'ai une invitation (Technicien)
                        </button>
                    </div>

                    {/* Invitation Header Banner for Technician */}
                    {mode === 'TECHNICIAN' && invitationToken && (
                        <div className="invitation-badge-box">
                            <Sparkles className="inv-badge-icon" />
                            <div>
                                <h3>Invitation de l'entreprise</h3>
                                <p>
                                    Vous rejoignez <strong>{invitationDetails?.companyName || 'votre entreprise'}</strong> en tant que <strong>Technicien</strong>.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Error Banner */}
                    {error && (
                        <div className="error-alert">
                            <AlertCircle size={18} />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* OWNER FORM - STEP 1 (Compte & Société) */}
                    {mode === 'OWNER' && step === 1 && (
                        <motion.form
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="form-content"
                            onSubmit={handleNextStep}
                        >
                            <div className="form-header">
                                <span className="step-badge">Étape 1 sur 2</span>
                                <h2>Créer votre compte & Société</h2>
                                <p>Vos identifiants de connexion et le nom de votre entreprise</p>
                            </div>

                            <div className="input-group">
                                <label>Nom de la Société *</label>
                                <div className="input-wrapper">
                                    <Building2 className="input-icon" />
                                    <input
                                        type="text"
                                        name="companyName"
                                        placeholder="ex: Dupont Climatisation SAS"
                                        value={formData.companyName}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="input-group">
                                    <label>Prénom du Gérant *</label>
                                    <div className="input-wrapper">
                                        <User className="input-icon" />
                                        <input
                                            type="text"
                                            name="firstName"
                                            placeholder="ex: Jean"
                                            value={formData.firstName}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="input-group">
                                    <label>Nom du Gérant *</label>
                                    <div className="input-wrapper">
                                        <User className="input-icon" />
                                        <input
                                            type="text"
                                            name="lastName"
                                            placeholder="ex: Dupont"
                                            value={formData.lastName}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="input-group">
                                <label>Adresse Email professionnelle *</label>
                                <div className="input-wrapper">
                                    <Mail className="input-icon" />
                                    <input
                                        type="email"
                                        name="email"
                                        placeholder="jean.dupont@climatisation.fr"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="input-group">
                                <label>Mot de passe (min. 8 caractères) *</label>
                                <div className="input-wrapper">
                                    <Lock className="input-icon" />
                                    <input
                                        type="password"
                                        name="password"
                                        placeholder="••••••••"
                                        value={formData.password}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="input-group">
                                <label>Téléphone portable *</label>
                                <div className="input-wrapper">
                                    <Phone className="input-icon" />
                                    <input
                                        type="tel"
                                        name="phone"
                                        placeholder="06 12 34 56 78"
                                        value={formData.phone}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            <button type="submit" className="btn-submit">
                                Étape suivante : Activité & Offre <ArrowRight size={18} />
                            </button>
                        </motion.form>
                    )}

                    {/* OWNER FORM - STEP 2 (Détails juridiques & Offre) */}
                    {mode === 'OWNER' && step === 2 && (
                        <motion.form
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="form-content"
                            onSubmit={handleSubmit}
                        >
                            <div className="form-header">
                                <span className="step-badge">Étape 2 sur 2</span>
                                <h2>Activité & Formule d'essai</h2>
                                <p>Complétez votre profil professionnel pour finaliser l'inscription</p>
                            </div>

                            <div className="form-row">
                                <div className="input-group">
                                    <label>Forme juridique</label>
                                    <select name="legalForm" value={formData.legalForm} onChange={handleChange}>
                                        <option value="SAS">SAS / SASU</option>
                                        <option value="SARL">SARL / EURL</option>
                                        <option value="EI">EI / Micro-Entreprise</option>
                                        <option value="SA">SA</option>
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label>N° TVA intracommunautaire (Optionnel)</label>
                                    <input
                                        type="text"
                                        name="vatNumber"
                                        placeholder="FR12345678901"
                                        value={formData.vatNumber}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            {/* Trade Categories Selection */}
                            <div className="input-group">
                                <label>Domaines d'activité principaux</label>
                                <div className="categories-grid">
                                    {TRADE_CATEGORIES_LIST.map(cat => (
                                        <button
                                            type="button"
                                            key={cat.id}
                                            className={`cat-chip ${formData.tradeCategories.includes(cat.id) ? 'active' : ''}`}
                                            onClick={() => toggleTradeCategory(cat.id)}
                                        >
                                            <span>{cat.icon}</span>
                                            <span>{cat.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Plan Selection */}
                            <div className="input-group">
                                <label>Choisissez votre formule d'essai (14 jours gratuits)</label>
                                <div className="plans-cards">
                                    {PLANS_LIST.map(plan => (
                                        <div
                                            key={plan.id}
                                            className={`plan-card ${formData.planName === plan.id ? 'selected' : ''}`}
                                            onClick={() => setFormData(prev => ({ ...prev, planName: plan.id }))}
                                        >
                                            {plan.popular && <span className="pop-tag">Recommandé</span>}
                                            <div className="plan-name">{plan.name}</div>
                                            <div className="plan-price">{plan.price}<span>{plan.period}</span></div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="button-group">
                                <button type="button" className="btn-back" onClick={() => setStep(1)}>
                                    <ArrowLeft size={18} /> Retour
                                </button>

                                <button type="submit" className="btn-submit" disabled={loading}>
                                    {loading ? 'Création en cours...' : 'Lancer mes 14 jours gratuits 🚀'}
                                </button>
                            </div>
                        </motion.form>
                    )}

                    {/* TECHNICIAN FORM (With explicit Code d'invitation) */}
                    {mode === 'TECHNICIAN' && (
                        <motion.form
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="form-content"
                            onSubmit={handleSubmit}
                        >
                            <div className="form-header">
                                <span className="step-badge tech">Compte Technicien</span>
                                <h2>Rejoindre votre entreprise</h2>
                                <p>Saisissez votre code d'invitation et créez vos identifiants</p>
                            </div>

                            {/* Code d'invitation Input Field */}
                            <div className="input-group">
                                <label>Code / Jeton d'invitation *</label>
                                <div className={`input-wrapper ${invitationToken ? 'disabled' : ''}`}>
                                    <Shield className="input-icon" />
                                    <input
                                        type="text"
                                        name="invitationCode"
                                        placeholder="ex: INV-892374 ou collez le jeton reçu"
                                        value={formData.invitationCode}
                                        onChange={handleChange}
                                        disabled={!!invitationToken}
                                        required
                                    />
                                </div>
                                {invitationToken && (
                                    <span style={{ fontSize: '0.8rem', color: 'var(--success)', marginTop: '2px', fontWeight: 600 }}>
                                        ✓ Code d'invitation détecté depuis le lien
                                    </span>
                                )}
                            </div>

                            <div className="form-row">
                                <div className="input-group">
                                    <label>Prénom *</label>
                                    <div className="input-wrapper">
                                        <User className="input-icon" />
                                        <input
                                            type="text"
                                            name="firstName"
                                            placeholder="ex: Lucas"
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
                                            placeholder="ex: Martin"
                                            value={formData.lastName}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="input-group">
                                <label>Adresse Email *</label>
                                <div className="input-wrapper">
                                    <Mail className="input-icon" />
                                    <input
                                        type="email"
                                        name="email"
                                        placeholder="lucas.martin@gmail.com"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="input-group">
                                <label>Créez votre mot de passe (min. 8 caractères) *</label>
                                <div className="input-wrapper">
                                    <Lock className="input-icon" />
                                    <input
                                        type="password"
                                        name="password"
                                        placeholder="••••••••"
                                        value={formData.password}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="input-group">
                                <label>Téléphone portable</label>
                                <div className="input-wrapper">
                                    <Phone className="input-icon" />
                                    <input
                                        type="tel"
                                        name="phone"
                                        placeholder="06 99 88 77 66"
                                        value={formData.phone}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            <button type="submit" className="btn-submit" disabled={loading}>
                                {loading ? 'Activation...' : 'Rejoindre mon équipe 🛠️'}
                            </button>
                        </motion.form>
                    )}

                    <div className="form-footer">
                        <span>Vous avez déjà un compte ? </span>
                        <Link to="/login" className="login-link">Se connecter</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
