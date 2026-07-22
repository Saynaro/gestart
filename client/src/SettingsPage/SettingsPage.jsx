import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import SideBar from "../components/SideBar";
import Header from "../components/Header";
import LegalModal, { LegalHelpTooltip } from "../components/LegalHelpModal";
import "./SettingsPage.css";

// Import Lucide icons
import {
    User,
    CreditCard,
    Users,
    Building,
    Receipt,
    MessageSquare,
    Bell,
    Sparkles,
    HelpCircle,
    Star,
    Gift,
    FileText,
    BookOpen,
    Lock,
    LogOut,
    CheckCircle2,
    Settings,
    Camera,
    ChevronRight,
    ChevronLeft,
    ArrowLeft,
    Search,
    Folder,
    X,
    Sun,
    Moon,
    Calculator,
    Percent,
    Link,
    RefreshCw
} from "lucide-react";

const monthsList = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

function SettingsPage() {
    const navigate = useNavigate();
    const location = useLocation();

    // Ref to store scroll position for mobile back navigation
    const scrollYRef = useRef(0);

    // Form and user state (aligned with Khalid Sainaro initial user demo data)
    const [firstName, setFirstName] = useState("Khalid");
    const [lastName, setLastName] = useState("Sainaro");
    const [email, setEmail] = useState("khalid.cizdoev777@gmail.com");
    const [phone, setPhone] = useState("0651604316");
    const [avatarUrl, setAvatarUrl] = useState(null);
    const [civility, setCivility] = useState("");
    const [dob, setDob] = useState("");

    const [isDarkMode, setIsDarkMode] = useState(() => {
        return document.documentElement.classList.contains("dark") || localStorage.getItem("theme") === "dark";
    });

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add("dark");
            localStorage.setItem("theme", "dark");
        } else {
            document.documentElement.classList.remove("dark");
            localStorage.setItem("theme", "light");
        }
    }, [isDarkMode]);

    // Layout and Navigation State
    const [activeTab, setActiveTab] = useState("profil");
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState("");
    const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth <= 768);

    // Scroll tracking for iOS-style header title transition
    const [isScrolled, setIsScrolled] = useState(false);

    // Profile Sub-Sheets states
    const [activeProfileSubSheet, setActiveProfileSubSheet] = useState(null); // null, "phone", "civility", "calendar"
    const [selectedCalDay, setSelectedCalDay] = useState(1);
    const [selectedCalMonth, setSelectedCalMonth] = useState(1);
    const [selectedCalYear, setSelectedCalYear] = useState(1990);
    const dragControlsProfileSub = useDragControls();

    // Sync sub-sheet values from dob
    useEffect(() => {
        if (activeProfileSubSheet === "calendar" && dob) {
            const parts = dob.split("/");
            if (parts.length === 3) {
                setSelectedCalDay(parseInt(parts[0], 10) || 1);
                setSelectedCalMonth(parseInt(parts[1], 10) || 1);
                setSelectedCalYear(parseInt(parts[2], 10) || 1990);
            }
        }
    }, [activeProfileSubSheet, dob]);

    // mobileScreenState can be "list" (show categories menu) or "detail" (show selected settings tab)
    const [mobileScreenState, setMobileScreenState] = useState("list");
    const [showUpgradeBanner, setShowUpgradeBanner] = useState(true);

    // Desktop Accordion states
    const [openCategories, setOpenCategories] = useState({
        "Mon compte": true,
        "Comptabilité": true,
        "Config": true,
        "Communauté": false,
        "À propos": false
    });

    // Scroll tracking for header transition
    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 40) {
                setIsScrolled(true);
            } else {
                setIsScrolled(false);
            }
        };
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // Detect screen size on resize
    useEffect(() => {
        setIsMobile(window.innerWidth <= 768);
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Sync active settings tab with search param '?tab=id'
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const tab = params.get("tab");
        if (tab) {
            setActiveTab(tab);
            setMobileScreenState("detail");

            // Scroll to top immediately when entering a detail screen on mobile
            if (window.innerWidth <= 768) {
                setTimeout(() => {
                    window.scrollTo({
                        top: 0,
                        behavior: 'instant'
                    });
                }, 30);
            }
        } else {
            setMobileScreenState("list");
            setActiveTab("profil"); // default tab for desktop view

            // Restore scroll position on mobile when returning to the list view
            if (window.innerWidth <= 768 && scrollYRef.current > 0) {
                setTimeout(() => {
                    window.scrollTo({
                        top: scrollYRef.current,
                        behavior: 'instant'
                    });
                }, 30);
            }
        }
    }, [location]);

    const toggleCategory = (title) => {
        setOpenCategories((prev) => ({
            ...prev,
            [title]: !prev[title]
        }));
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarUrl(reader.result);
                triggerToast("Avatar mis à jour !");
            };
            reader.readAsDataURL(file);
        }
    };

    const triggerToast = (message) => {
        setToastMessage(message);
        setShowToast(true);
        setTimeout(() => {
            setShowToast(false);
        }, 3000);
    };

    const handleSave = (e) => {
        if (e) e.preventDefault();
        triggerToast("Profil enregistré !");
        if (isMobile) {
            navigate(-1); // Back to settings menu list
        }
    };

    const handlePasswordChange = () => {
        triggerToast("Lien de réinitialisation envoyé !");
    };

    // Configuration of Menu Categories
    const menuCategories = [
        {
            title: "Mon compte",
            items: [
                { id: "profil", label: "Profil", icon: User, subtitle: "Vos informations personnelles" },
                { id: "ma-societe", label: "Entreprise", icon: Building, subtitle: "Coordonnées et statut juridique" },
                { id: "securite", label: "Sécurité", icon: Lock, subtitle: "Email, mot de passe et connexion" },
                { id: "rgpd-legal", label: "Légal & RGPD", icon: Lock, subtitle: "Exportation de données et droits" },
                { id: "abonnement", label: "Abonnement", icon: CreditCard, subtitle: "Gérez votre offre ClimPro" },
                { id: "utilisateurs", label: "Utilisateurs", icon: Users, subtitle: "Gérez les accès de vos collaborateurs" }
            ]
        },
        {
            title: "Comptabilité",
            items: [
                { id: "chiffre-affaires", label: "Chiffre d'affaires", icon: Calculator, subtitle: "Plafonds et CA annuel" },
                { id: "cotisations", label: "Cotisations sociales", icon: Percent, subtitle: "Taux et calcul de cotisations" },
                { id: "tva-config", label: "TVA", icon: Receipt, subtitle: "Taux de TVA et déclarations" },
                { id: "connexion-urssaf", label: "Connexion Urssaf", icon: Link, subtitle: "Synchronisation de vos comptes" },
                { id: "banques", label: "Banques", icon: Building, subtitle: "Gérez vos connexions bancaires" },
                { id: "transactions", label: "Transactions", icon: RefreshCw, subtitle: "Flux de transactions financières" },
                { id: "categories-perso", label: "Catégorie personnalisées", icon: Settings, subtitle: "Gérez vos catégories de dépenses" }
            ]
        },
        {
            title: "Config",
            items: [
                { id: "facturation", label: "Facturation", icon: Receipt, subtitle: "Réglages de facturation" },
                { id: "sms", label: "SMS", icon: MessageSquare, subtitle: "Crédits et expéditeur" },
                { id: "notifications", label: "Notifications", icon: Bell, subtitle: "Canaux et fréquences" },
                { id: "premium", label: "Premium", icon: Sparkles, subtitle: "Fonctionnalités Pro avancées" }
            ]
        },
        {
            title: "Communauté",
            items: [
                { id: "support", label: "Support", icon: HelpCircle, subtitle: "Aide et contact" },
                { id: "avis", label: "Avis", icon: Star, subtitle: "Partagez votre avis" },
                { id: "parrainage", label: "Parrainage", icon: Gift, subtitle: "Gagnez des cadeaux" }
            ]
        },
        {
            title: "À propos",
            items: [
                { id: "mentions", label: "Mentions", icon: FileText, subtitle: "Mentions légales" },
                { id: "cgu", label: "CGU", icon: BookOpen, subtitle: "Conditions Générales d'Utilisation" },
                { id: "confidentialite", label: "Confidentialité", icon: Lock, subtitle: "Politique de confidentialité" }
            ]
        }
    ];

    // Helper to change tab (updates URL to support history popstate)
    const handleTabSelect = (itemId) => {
        // Capture current scroll Y before navigation
        if (window.innerWidth <= 768) {
            scrollYRef.current = window.scrollY;
        }
        navigate(`/settings?tab=${itemId}`);
    };

    const handleMainListBack = () => {
        if (window.history.length > 1) {
            navigate(-1);
        } else {
            navigate("/home");
        }
    };

    // Render Tab Content
    const renderTabContent = (isMobileView = false) => {
        switch (activeTab) {
            case "profil":
                return (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.25 }}
                    >
                        {!isMobileView && (
                            <>
                                <div className="panel-title-row">
                                    <span className="submenu-item-icon" style={{ color: "var(--sidebar-primary)" }}><User size={18} /></span>
                                    <h2 className="panel-title">Profil</h2>
                                </div>
                                <div className="panel-divider"></div>
                            </>
                        )}

                        {isMobileView ? (
                            // Mobile specific form fields (Image 4 style)
                            <div className="mobile-fields-stack">
                                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                                    <div className="mobile-profile-avatar-circle" style={{ width: '100px', height: '100px', fontSize: '34px' }}>
                                        {avatarUrl ? (
                                            <img src={avatarUrl} alt="Avatar" />
                                        ) : (
                                            <span>{firstName[0]}{lastName[0]}</span>
                                        )}
                                        <label className="mobile-avatar-edit-icon" style={{ cursor: 'pointer' }}>
                                            <Camera size={14} />
                                            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
                                        </label>
                                    </div>
                                </div>

                                <div className="mobile-input-card">
                                    <span className="mobile-input-card-label">Prénom</span>
                                    <input
                                        type="text"
                                        className="mobile-input-card-field"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        placeholder="Khalid"
                                    />
                                </div>

                                <div className="mobile-input-card">
                                    <span className="mobile-input-card-label">Nom</span>
                                    <input
                                        type="text"
                                        className="mobile-input-card-field"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        placeholder="Sainaro"
                                    />
                                </div>

                                {/* Phone selector card */}
                                <div className="mobile-input-card select" onClick={() => setActiveProfileSubSheet("phone")}>
                                    <span className="mobile-input-card-label">Téléphone</span>
                                    <div className="mobile-input-card-row">
                                        <span className="mobile-flag">🇫🇷</span>
                                        <span className="mobile-input-card-val">{phone || "Saisir un numéro"}</span>
                                        <ChevronRight size={16} style={{ color: '#94a3b8', marginLeft: 'auto' }} />
                                    </div>
                                </div>

                                {/* Civility selector card */}
                                <div className="mobile-input-card select" onClick={() => setActiveProfileSubSheet("civility")}>
                                    <span className="mobile-input-card-label">Civilité</span>
                                    <div className="mobile-input-card-row">
                                        <span className="mobile-input-card-val">{civility || "Saisir votre civilité"}</span>
                                        <ChevronRight size={16} style={{ color: '#94a3b8', marginLeft: 'auto' }} />
                                    </div>
                                </div>

                                {/* Date of birth selector card */}
                                <div className="mobile-input-card select" onClick={() => setActiveProfileSubSheet("calendar")}>
                                    <span className="mobile-input-card-label">Date de naissance</span>
                                    <div className="mobile-input-card-row">
                                        <span className="mobile-input-card-val">{dob || "Saisir une date"}</span>
                                        <ChevronRight size={16} style={{ color: '#94a3b8', marginLeft: 'auto' }} />
                                    </div>
                                </div>

                                <div style={{ height: '80px' }} />

                                <div className="mobile-save-bar">
                                    <button className="mobile-save-btn active" onClick={handleSave}>
                                        Enregistrer
                                    </button>
                                </div>
                            </div>
                        ) : (
                            // Desktop Form
                            <form onSubmit={handleSave} className="profile-form-grid">
                                <div className="form-field">
                                    <label className="form-label">Prénom</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        placeholder="Marc"
                                        required
                                    />
                                </div>
                                <div className="form-field">
                                    <label className="form-label">Nom</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        placeholder="Dubois"
                                        required
                                    />
                                </div>
                                <div className="form-field form-group-full">
                                    <label className="form-label">Email</label>
                                    <input
                                        type="email"
                                        className="form-input"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="marc@dupont-clim.fr"
                                        required
                                    />
                                </div>
                                <div className="form-field">
                                    <label className="form-label">Téléphone</label>
                                    <input
                                        type="tel"
                                        className="form-input"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="06 12 34 56 78"
                                    />
                                </div>
                                <div className="form-field">
                                    <label className="form-label">Civilité</label>
                                    <select
                                        className="form-input civility-select"
                                        value={civility}
                                        onChange={(e) => setCivility(e.target.value)}
                                    >
                                        <option value="">Sélectionner</option>
                                        <option value="Madame">Madame</option>
                                        <option value="Monsieur">Monsieur</option>
                                    </select>
                                </div>
                                <div className="form-field form-group-full">
                                    <label className="form-label">Date de naissance</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={dob ? dob.split("/").reverse().join("-") : ""}
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                const parts = e.target.value.split("-");
                                                setDob(`${parts[2]}/${parts[1]}/${parts[0]}`);
                                            } else {
                                                setDob("");
                                            }
                                        }}
                                    />
                                </div>
                                <button type="submit" className="save-profile-btn form-group-full">Enregistrer</button>
                            </form>
                        )}
                    </motion.div>
                );

            case "ma-societe":
                return (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.25 }}
                    >
                        {!isMobileView && (
                            <>
                                <div className="panel-title-row">
                                    <span className="submenu-item-icon" style={{ color: "var(--sidebar-primary)" }}><Building size={18} /></span>
                                    <h2 className="panel-title">Modifier l'entreprise</h2>
                                </div>
                                <div className="panel-divider"></div>
                            </>
                        )}

                        {isMobileView ? (
                            // Mobile Company layout
                            <div>
                                <div className="mobile-entreprise-search-card">
                                    <div className="mobile-search-icon-bg">
                                        <Search size={16} />
                                    </div>
                                    <div className="mobile-search-text-col">
                                        <span className="mobile-search-label">Rechercher une entreprise</span>
                                        <span className="mobile-search-sub">Remplissage auto via SIRET</span>
                                    </div>
                                    <span className="mobile-search-badge">RAPIDE</span>
                                    <ChevronRight size={16} style={{ color: '#94a3b8' }} />
                                </div>

                                <h3 className="mobile-detail-section-title">Informations détaillées</h3>

                                <div className="mobile-group-container" style={{ padding: '0 16px' }}>
                                    <div className="mobile-items-card">
                                        <button className="mobile-settings-row-btn" type="button">
                                            <span className="mobile-row-icon-bg"><Building size={16} /></span>
                                            <span className="mobile-row-text-col">
                                                <span className="mobile-row-label">Informations générales</span>
                                                <span className="mobile-row-subtitle">SAINARO KHALID</span>
                                            </span>
                                            <span className="mobile-row-arrow"><ChevronRight size={16} /></span>
                                        </button>
                                        <button className="mobile-settings-row-btn" type="button">
                                            <span className="mobile-row-icon-bg"><FileText size={16} /></span>
                                            <span className="mobile-row-text-col">
                                                <span className="mobile-row-label">Numéros d'identification</span>
                                                <span className="mobile-row-subtitle">SIREN: 944087725</span>
                                            </span>
                                            <span className="mobile-row-arrow"><ChevronRight size={16} /></span>
                                        </button>
                                        <button className="mobile-settings-row-btn" type="button">
                                            <span className="mobile-row-icon-bg"><BookOpen size={16} /></span>
                                            <span className="mobile-row-text-col">
                                                <span className="mobile-row-label">Informations juridiques</span>
                                                <span className="mobile-row-subtitle">Entreprise individuelle · Créé le 05/05/2025</span>
                                            </span>
                                            <span className="mobile-row-arrow"><ChevronRight size={16} /></span>
                                        </button>
                                        <button className="mobile-settings-row-btn" type="button">
                                            <span className="mobile-row-icon-bg"><Folder size={16} /></span>
                                            <span className="mobile-row-text-col">
                                                <span className="mobile-row-label">Adresse du siège</span>
                                                <span className="mobile-row-subtitle">23 RUE Paganini, 06000, NICE</span>
                                            </span>
                                            <span className="mobile-row-arrow"><ChevronRight size={16} /></span>
                                        </button>
                                        <button className="mobile-settings-row-btn" type="button">
                                            <span className="mobile-row-icon-bg"><CreditCard size={16} /></span>
                                            <span className="mobile-row-text-col">
                                                <span className="mobile-row-label">TVA</span>
                                                <span className="mobile-row-subtitle">Non redevable de la TVA</span>
                                            </span>
                                            <span className="mobile-row-arrow"><ChevronRight size={16} /></span>
                                        </button>
                                    </div>
                                </div>
                                <div style={{ height: '80px' }} />
                                <div className="mobile-save-bar">
                                    <button className="mobile-save-btn active" onClick={() => { triggerToast("Données d'entreprise enregistrées !"); navigate(-1); }}>
                                        Enregistrer
                                    </button>
                                </div>
                            </div>
                        ) : (
                            // Desktop Mockup for company
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div style={{ background: 'rgba(95, 75, 219, 0.02)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
                                    <h3 style={{ margin: '0 0 10px 0', fontSize: '15px' }}>Informations de l'entreprise</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '13px' }}>
                                        <div><strong>Nom commercial :</strong> SAINARO KHALID</div>
                                        <div><strong>SIREN :</strong> 944087725</div>
                                        <div><strong>Forme juridique :</strong> Entreprise individuelle</div>
                                        <div><strong>Date de création :</strong> 05/05/2025</div>
                                        <div style={{ gridColumn: 'span 2' }}><strong>Adresse :</strong> 23 RUE Paganini, 06000, NICE</div>
                                    </div>
                                </div>
                                <button className="save-profile-btn" style={{ alignSelf: 'flex-end' }} onClick={() => triggerToast("Enregistré !")}>Enregistrer</button>
                            </div>
                        )}
                    </motion.div>
                );

            case "securite":
                return (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.25 }}
                    >
                        {!isMobileView && (
                            <>
                                <div className="panel-title-row">
                                    <span className="submenu-item-icon" style={{ color: "var(--sidebar-primary)" }}><Lock size={18} /></span>
                                    <h2 className="panel-title">Sécurité</h2>
                                </div>
                                <div className="panel-divider"></div>
                            </>
                        )}

                        {isMobileView ? (
                            <div className="mobile-fields-stack">
                                <div className="mobile-input-card">
                                    <span className="mobile-input-card-label">Adresse email</span>
                                    <input type="email" className="mobile-input-card-field" value={email} readOnly />
                                </div>
                                <div className="mobile-input-card select" onClick={handlePasswordChange}>
                                    <span className="mobile-input-card-label">Mot de passe</span>
                                    <div className="mobile-input-card-row">
                                        <span className="mobile-input-card-val">••••••••</span>
                                        <ChevronRight size={16} style={{ color: '#94a3b8', marginLeft: 'auto' }} />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="profile-form-grid">
                                <div className="form-field form-group-full">
                                    <label className="form-label">Modifier le mot de passe</label>
                                    <button onClick={handlePasswordChange} className="save-profile-btn">Envoyer un email de réinitialisation</button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                );

            case "sms":
                return (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.25 }}
                    >
                        {!isMobileView && (
                            <>
                                <div className="panel-title-row">
                                    <span className="submenu-item-icon" style={{ color: "var(--sidebar-primary)" }}><MessageSquare size={18} /></span>
                                    <h2 className="panel-title">SMS</h2>
                                </div>
                                <div className="panel-divider"></div>
                            </>
                        )}
                        <div style={{ padding: '20px' }}>
                            {/* Credits Info */}
                            <div className="mobile-abby-banner" style={{ margin: '0 0 20px 0', padding: '16px', border: '1px solid var(--border)' }}>
                                <h3 className="mobile-abby-banner-title">Crédits SMS restants</h3>
                                <p className="mobile-abby-banner-text" style={{ fontSize: '13px', margin: '8px 0' }}>
                                    Vous consommez vos SMS automatiques pour les rappels de rendez-vous et relances.
                                </p>
                                <div className="double-progress-bar" style={{ height: '10px', borderRadius: '5px', margin: '12px 0 6px 0', backgroundColor: 'var(--muted)' }}>
                                    <div className="fill completed" style={{ width: '94%', backgroundColor: '#556B2F', height: '100%', borderRadius: '5px' }}></div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--muted-foreground)' }}>
                                    <span>Solde: 142 SMS restants</span>
                                    <span>Quota mensuel: 150 SMS</span>
                                </div>
                                <button className="save-profile-btn" style={{ padding: '6px 12px', fontSize: '12px', marginTop: '12px', display: 'inline-block' }} onClick={() => triggerToast("Achat bientôt disponible !")}>
                                    Acheter des crédits
                                </button>
                            </div>

                            {/* SMS custom sender identity */}
                            <div className="profile-form-grid" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div className="form-field">
                                    <label className="form-label">Nom de l'expéditeur personnalisé (Sender ID)</label>
                                    <input type="text" className="profile-input" maxLength="11" defaultValue="DupontClim" />
                                    <span style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>Maximum 11 caractères alphanumériques. S'affiche sur le téléphone de vos clients.</span>
                                </div>

                                <div className="form-field" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                                    <input type="checkbox" defaultChecked id="sms-copy" style={{ width: '18px', height: '18px' }} />
                                    <label htmlFor="sms-copy" style={{ fontSize: '13px', fontWeight: 500 }}>Recevoir une copie e-mail de chaque SMS envoyé</label>
                                </div>

                                <div className="form-field" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <input type="checkbox" defaultChecked id="sms-reply-email" style={{ width: '18px', height: '18px' }} />
                                    <label htmlFor="sms-reply-email" style={{ fontSize: '13px', fontWeight: 500 }}>Transférer les réponses des clients sur mon adresse e-mail</label>
                                </div>

                                <button className="save-profile-btn" style={{ marginTop: '10px', alignSelf: 'flex-start' }} onClick={() => triggerToast("Paramètres SMS enregistrés !")}>
                                    Enregistrer
                                </button>
                            </div>
                        </div>
                    </motion.div>
                );

            case "notifications":
                return (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.25 }}
                    >
                        {!isMobileView && (
                            <>
                                <div className="panel-title-row">
                                    <span className="submenu-item-icon" style={{ color: "var(--sidebar-primary)" }}><Bell size={18} /></span>
                                    <h2 className="panel-title">Notifications</h2>
                                </div>
                                <div className="panel-divider"></div>
                            </>
                        )}
                        <div style={{ padding: '16px', fontSize: '14px', color: '#64748b' }}>
                            Configurez vos notifications de devis et interventions.
                        </div>
                    </motion.div>
                );

            case "premium":
                return (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.25 }}
                    >
                        {!isMobileView && (
                            <>
                                <div className="panel-title-row">
                                    <span className="submenu-item-icon" style={{ color: "var(--sidebar-primary)" }}><Sparkles size={18} /></span>
                                    <h2 className="panel-title">Premium</h2>
                                </div>
                                <div className="panel-divider"></div>
                            </>
                        )}
                        <div style={{ padding: '16px', fontSize: '14px', color: '#64748b' }}>
                            Débloquez les fonctionnalités Pro avancées.
                        </div>
                    </motion.div>
                );

            case "chiffre-affaires":
                return (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.25 }}
                    >
                        {!isMobileView && (
                            <>
                                <div className="panel-title-row">
                                    <span className="submenu-item-icon" style={{ color: "var(--sidebar-primary)" }}><Calculator size={18} /></span>
                                    <h2 className="panel-title">Chiffre d'affaires</h2>
                                </div>
                                <div className="panel-divider"></div>
                            </>
                        )}
                        <div style={{ padding: '20px' }}>
                            <div className="mobile-abby-banner" style={{ margin: '0 0 20px 0', padding: '16px', border: '1px solid var(--border)' }}>
                                <h3 className="mobile-abby-banner-title">Suivi du Plafond de Chiffre d'affaires</h3>
                                <p className="mobile-abby-banner-text" style={{ fontSize: '13px', margin: '8px 0' }}>
                                    Pour le statut de micro-entreprise de prestation de services, le plafond est de <strong>77 700 €</strong>.
                                </p>
                                <div className="double-progress-bar" style={{ height: '12px', borderRadius: '6px', margin: '12px 0 6px 0' }}>
                                    <div className="fill completed" style={{ width: '48%', backgroundColor: '#556B2F' }}></div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--muted-foreground)' }}>
                                    <span>Actuel: 37 300 €</span>
                                    <span>Plafond: 77 700 € (48%)</span>
                                </div>
                            </div>
                            <div className="profile-form-grid" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div className="form-field">
                                    <label className="form-label">Objectif annuel de CA</label>
                                    <input type="text" className="profile-input" defaultValue="50 000 €" />
                                </div>
                                <div className="form-field">
                                    <label className="form-label">Date de clôture d'exercice</label>
                                    <input type="text" className="profile-input" defaultValue="31 Décembre" />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                );

            case "cotisations":
                return (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.25 }}
                    >
                        {!isMobileView && (
                            <>
                                <div className="panel-title-row">
                                    <span className="submenu-item-icon" style={{ color: "var(--sidebar-primary)" }}><Percent size={18} /></span>
                                    <h2 className="panel-title">Cotisations sociales</h2>
                                </div>
                                <div className="panel-divider"></div>
                            </>
                        )}
                        <div style={{ padding: '20px' }}>
                            <div className="profile-form-grid" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div className="form-field">
                                    <label className="form-label">Type d'activité principale</label>
                                    <select className="profile-input" style={{ width: '100%', height: '42px', padding: '0 8px', border: '1px solid var(--border)', borderRadius: '6px', backgroundColor: 'var(--card)' }}>
                                        <option>Prestation de services (BNC) — Taux: 21,1%</option>
                                        <option>Prestation de services (BIC) — Taux: 21,2%</option>
                                        <option>Vente de marchandises (BIC) — Taux: 12,3%</option>
                                        <option>Profession libérale réglementée — Taux: 21,2%</option>
                                    </select>
                                </div>
                                <div className="form-field" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                                    <input type="checkbox" defaultChecked id="acre-checkbox" style={{ width: '18px', height: '18px' }} />
                                    <label htmlFor="acre-checkbox" style={{ fontSize: '13px', fontWeight: 500 }}>Bénéficiaire de l'ACRE (Taux réduit la 1ère année)</label>
                                </div>
                                <div className="form-field">
                                    <label className="form-label">Périodicité des déclarations Urssaf</label>
                                    <select className="profile-input" style={{ width: '100%', height: '42px', padding: '0 8px', border: '1px solid var(--border)', borderRadius: '6px', backgroundColor: 'var(--card)' }}>
                                        <option>Mensuelle</option>
                                        <option>Trimestrielle</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                );

            case "tva-config":
                return (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.25 }}
                    >
                        {!isMobileView && (
                            <>
                                <div className="panel-title-row">
                                    <span className="submenu-item-icon" style={{ color: "var(--sidebar-primary)" }}><Receipt size={18} /></span>
                                    <h2 className="panel-title" style={{ display: 'flex', alignItems: 'center' }}>
                                        TVA
                                        <LegalHelpTooltip lawArticle="art. 293 B & 278 CGI" title="Régime de TVA" text="Détermine le taux applicable sur vos documents. Cochez Franchise TVA si auto-entrepreneur non assujetti." />
                                    </h2>
                                </div>
                                <div className="panel-divider"></div>
                            </>
                        )}
                        <div style={{ padding: '20px' }}>
                            <div className="profile-form-grid" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div className="form-field" style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                    <input type="checkbox" defaultChecked id="tva-franchise" style={{ width: '18px', height: '18px', marginTop: '3px' }} />
                                    <div>
                                        <label htmlFor="tva-franchise" style={{ fontSize: '14px', fontWeight: 600 }}>Franchise en base de TVA</label>
                                        <p style={{ fontSize: '12px', color: 'var(--muted-foreground)', marginTop: '4px' }}>
                                            Vous ne facturez pas la TVA et ne la récupérez pas (Art. 293 B du CGI).
                                        </p>
                                    </div>
                                </div>
                                <div className="form-field" style={{ marginTop: '10px' }}>
                                    <label className="form-label">Taux de TVA par défaut (si assujetti)</label>
                                    <select className="profile-input" style={{ width: '100%', height: '42px', padding: '0 8px', border: '1px solid var(--border)', borderRadius: '6px', backgroundColor: 'var(--card)' }}>
                                        <option>20% (Taux normal)</option>
                                        <option>10% (Taux intermédiaire)</option>
                                        <option>5,5% (Taux réduit)</option>
                                        <option>2,1% (Taux particulier)</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                );

            case "rgpd-legal":
                return (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.25 }}
                    >
                        {!isMobileView && (
                            <>
                                <div className="panel-title-row">
                                    <span className="submenu-item-icon" style={{ color: "var(--sidebar-primary)" }}><Lock size={18} /></span>
                                    <h2 className="panel-title">Droits RGPD & Protections</h2>
                                </div>
                                <div className="panel-divider"></div>
                            </>
                        )}
                        <div style={{ padding: '20px' }}>
                            <div className="mobile-abby-banner" style={{ margin: '0 0 20px 0', padding: '16px', border: '1px solid var(--border)' }}>
                                <h3 className="mobile-abby-banner-title" style={{ display: 'flex', alignItems: 'center' }}>
                                    Vos Droits Informatique & Libertés
                                    <LegalHelpTooltip lawArticle="RGPD 2016/679" title="Conformité Européenne" text="Conformément au RGPD et à la loi Informatique et Libertés, vous disposez d'un droit d'accès, d'exportation et d'effacement de vos données." />
                                </h3>
                                <p className="mobile-abby-banner-text" style={{ fontSize: '13px', margin: '8px 0' }}>
                                    Vous pouvez télécharger l'intégralité de vos données ou demander la suppression définitive de votre compte selon l'article 17 du RGPD.
                                </p>
                            </div>

                            <div className="profile-form-grid" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '16px', backgroundColor: 'var(--card)' }}>
                                    <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 700 }}>Exporter mes données (Art. 15-20 RGPD)</h4>
                                    <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: 'var(--muted-foreground)' }}>Téléchargez une archive au format JSON contenant vos factures, devis, fiches clients et paramètres.</p>
                                    <button
                                        type="button"
                                        className="save-profile-btn"
                                        style={{ backgroundColor: '#556B2F' }}
                                        onClick={() => triggerToast("Exportation RGPD démarrée ! Votre fichier JSON est en cours de téléchargement.")}
                                    >
                                        Exporter toutes mes données
                                    </button>
                                </div>

                                <div style={{ border: '1px solid #FCA5A5', borderRadius: '10px', padding: '16px', backgroundColor: 'rgba(239, 68, 68, 0.04)' }}>
                                    <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 700, color: '#DC2626' }}>Supprimer mon compte (Art. 17 RGPD - Droit à l'oubli)</h4>
                                    <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: 'var(--muted-foreground)' }}>Cette action est irréversible. Toutes vos données d'entreprise seront définitivement supprimées.</p>
                                    <button
                                        type="button"
                                        className="save-profile-btn"
                                        style={{ backgroundColor: '#DC2626', color: 'white' }}
                                        onClick={() => {
                                            if (window.confirm("Êtes-vous sûr de vouloir demander la suppression définitive de votre compte et de toutes vos données conformément au RGPD ?")) {
                                                triggerToast("Demande de suppression prise en compte.");
                                            }
                                        }}
                                    >
                                        Demander la suppression du compte
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                );

            case "connexion-urssaf":
                return (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.25 }}
                    >
                        {!isMobileView && (
                            <>
                                <div className="panel-title-row">
                                    <span className="submenu-item-icon" style={{ color: "var(--sidebar-primary)" }}><Link size={18} /></span>
                                    <h2 className="panel-title">Connexion Urssaf</h2>
                                </div>
                                <div className="panel-divider"></div>
                            </>
                        )}
                        <div style={{ padding: '20px', textAlign: 'center' }}>
                            <div className="header-icon-container" style={{ width: '60px', height: '60px', borderRadius: '30px', margin: '0 auto 15px auto', backgroundColor: 'rgba(85, 107, 47, 0.1)' }}>
                                <Link size={24} style={{ color: '#556B2F' }} />
                            </div>
                            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>Synchronisez votre compte Urssaf</h3>
                            <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', maxWidth: '400px', margin: '0 auto 20px auto' }}>
                                Connectez votre compte auto-entrepreneur Urssaf pour déclarer votre chiffre d'affaires et régler vos cotisations en un clic depuis ClimPro.
                            </p>
                            <button className="save-profile-btn" style={{ padding: '10px 24px', backgroundColor: '#556B2F', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }} onClick={() => triggerToast("Connexion Urssaf en cours...")}>
                                Se connecter à l'Urssaf
                            </button>
                        </div>
                    </motion.div>
                );

            case "banques":
                return (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.25 }}
                    >
                        {!isMobileView && (
                            <>
                                <div className="panel-title-row">
                                    <span className="submenu-item-icon" style={{ color: "var(--sidebar-primary)" }}><Building size={18} /></span>
                                    <h2 className="panel-title">Banques</h2>
                                </div>
                                <div className="panel-divider"></div>
                            </>
                        )}
                        <div style={{ padding: '20px' }}>
                            <div className="urgent-client-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid var(--border)', borderRadius: '8px', marginBottom: '15px' }}>
                                <div>
                                    <span style={{ display: 'block', fontSize: '14px', fontWeight: 600 }}>Boursorama Banque</span>
                                    <span style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>Compte Pro principal ****4920</span>
                                </div>
                                <span className="status-tag success" style={{ backgroundColor: 'rgba(26, 158, 92, 0.12)', color: 'var(--success)', fontSize: '11px', padding: '3px 8px', borderRadius: '4px', fontWeight: 600 }}>Connecté</span>
                            </div>
                            <button className="save-profile-btn" style={{ padding: '10px 20px', backgroundColor: '#556B2F', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }} onClick={() => triggerToast("Redirection vers la passerelle bancaire...")}>
                                + Connecter une autre banque
                            </button>
                        </div>
                    </motion.div>
                );

            case "transactions":
                return (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.25 }}
                    >
                        {!isMobileView && (
                            <>
                                <div className="panel-title-row">
                                    <span className="submenu-item-icon" style={{ color: "var(--sidebar-primary)" }}><RefreshCw size={18} /></span>
                                    <h2 className="panel-title">Transactions</h2>
                                </div>
                                <div className="panel-divider"></div>
                            </>
                        )}
                        <div style={{ padding: '20px' }}>
                            <div className="table-responsive">
                                <table className="widget-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                            <th style={{ padding: '8px', textAlign: 'left' }}>Date</th>
                                            <th style={{ padding: '8px', textAlign: 'left' }}>Libellé</th>
                                            <th style={{ padding: '8px', textAlign: 'right' }}>Montant</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                            <td style={{ padding: '10px 8px' }}>18/07/2026</td>
                                            <td style={{ padding: '10px 8px' }}>Virement Client M. Martin</td>
                                            <td style={{ padding: '10px 8px', textAlign: 'right', color: 'var(--success)', fontWeight: 600 }}>+ 152,33 €</td>
                                        </tr>
                                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                            <td style={{ padding: '10px 8px' }}>15/07/2026</td>
                                            <td style={{ padding: '10px 8px' }}>Achat Outillage Daikin</td>
                                            <td style={{ padding: '10px 8px', textAlign: 'right', color: 'var(--destructive)', fontWeight: 600 }}>- 31,52 €</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </motion.div>
                );

            case "categories-perso":
                return (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.25 }}
                    >
                        {!isMobileView && (
                            <>
                                <div className="panel-title-row">
                                    <span className="submenu-item-icon" style={{ color: "var(--sidebar-primary)" }}><Settings size={18} /></span>
                                    <h2 className="panel-title">Catégories personnalisées</h2>
                                </div>
                                <div className="panel-divider"></div>
                            </>
                        )}
                        <div style={{ padding: '20px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', backgroundColor: 'var(--background)', borderRadius: '6px', fontSize: '13px' }}>
                                    <span>🔧 Matériel & Outillage</span>
                                    <span style={{ color: 'var(--muted-foreground)' }}>Dépenses</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', backgroundColor: 'var(--background)', borderRadius: '6px', fontSize: '13px' }}>
                                    <span>🚗 Carburant & Transport</span>
                                    <span style={{ color: 'var(--muted-foreground)' }}>Dépenses</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', backgroundColor: 'var(--background)', borderRadius: '6px', fontSize: '13px' }}>
                                    <span>📱 Téléphonie & Internet</span>
                                    <span style={{ color: 'var(--muted-foreground)' }}>Dépenses</span>
                                </div>
                            </div>
                            <button className="save-profile-btn" style={{ padding: '8px 16px', backgroundColor: '#556B2F', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500, marginTop: '15px' }} onClick={() => triggerToast("Création de catégorie bientôt disponible !")}>
                                + Nouvelle catégorie
                            </button>
                        </div>
                    </motion.div>
                );

            default:
                return (
                    <div style={{ padding: "20px", color: "var(--muted-foreground)" }}>
                        Sélectionnez une option dans le menu de gauche.
                    </div>
                );
        }
    };

    const renderMobileLayout = () => {
        if (mobileScreenState === "list") {
            return (
                <div className="mobile-settings-view">
                    {/* Header */}
                    <div className="mobile-nav-header" style={{ borderBottom: 'none', backgroundColor: 'transparent', padding: '16px 16px 8px 16px' }}>
                        <button className="mobile-back-circle" onClick={handleMainListBack}>
                            <ArrowLeft size={16} />
                        </button>
                    </div>

                    {/* Centered User Profile info */}
                    <div className="mobile-settings-profile-header">
                        <div className="mobile-profile-avatar-circle" style={{ width: '92px', height: '92px', fontSize: '32px', margin: '0 auto 16px auto', position: 'relative' }}>
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="Avatar" />
                            ) : (
                                <span>{firstName[0]}{lastName[0]}</span>
                            )}
                        </div>
                        <h2 className="mobile-settings-profile-name">{firstName} {lastName}</h2>
                        <p className="mobile-settings-profile-email">{email}</p>
                    </div>

                    {/* Abby-style Pro Upgrade Banner */}
                    {showUpgradeBanner && (
                        <div className="mobile-abby-banner">
                            <button className="mobile-abby-banner-close" onClick={() => setShowUpgradeBanner(false)}>
                                <X size={18} />
                            </button>
                            <h3 className="mobile-abby-banner-title">Allez plus loin avec Abby !</h3>
                            <p className="mobile-abby-banner-text">
                                Votre offre actuelle est limitée. Passez à un niveau supérieur pour accéder à plus de fonctionnalités.
                            </p>
                            <button className="mobile-abby-banner-btn" onClick={() => triggerToast("Version Pro bientôt disponible !")}>
                                Passer au niveau supérieur
                            </button>
                        </div>
                    )}

                    {/* Categories and Rows */}
                    <div className="mobile-group-container">
                        {/* Custom Conformity Section */}
                        <div className="mobile-group-section">
                            <h4 className="mobile-group-header">Conformité</h4>
                            <div className="mobile-items-card">
                                <button className="mobile-settings-row-btn" type="button" onClick={() => triggerToast("Facturation électronique bientôt activée !")}>
                                    <span className="mobile-row-icon-bg" style={{ backgroundColor: 'rgba(59, 130, 246, 0.08)', color: '#2563eb' }}><FileText size={16} /></span>
                                    <span className="mobile-row-text-col">
                                        <span className="mobile-row-label">Facturation électronique</span>
                                        <span className="mobile-row-subtitle">À activer avant le 1er septembre 2026</span>
                                    </span>
                                    <span className="mobile-row-badge">1</span>
                                    <span className="mobile-row-arrow"><ChevronRight size={16} /></span>
                                </button>
                            </div>
                        </div>

                        {menuCategories.map((category) => (
                            <div key={category.title} className="mobile-group-section">
                                <h4 className="mobile-group-header">{category.title}</h4>
                                <div className="mobile-items-card">
                                    {category.items.map((item) => {
                                        const RowIcon = item.icon;
                                        return (
                                            <button
                                                key={item.id}
                                                className="mobile-settings-row-btn"
                                                type="button"
                                                onClick={() => handleTabSelect(item.id)}
                                            >
                                                <span className="mobile-row-icon-bg"><RowIcon size={16} /></span>
                                                <span className="mobile-row-text-col">
                                                    <span className="mobile-row-label">{item.label}</span>
                                                    <span className="mobile-row-subtitle">{item.subtitle}</span>
                                                </span>
                                                <span className="mobile-row-arrow"><ChevronRight size={16} /></span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}

                        {/* Preference / Theme Switcher Row */}
                        <div className="mobile-group-section">
                            <h4 className="mobile-group-header">Préférences</h4>
                            <div className="mobile-items-card">
                                <div className="mobile-settings-row-btn" style={{ cursor: 'default' }}>
                                    <span className="mobile-row-icon-bg" style={{ backgroundColor: 'rgba(85, 107, 47, 0.08)', color: '#556B2F' }}>
                                        {isDarkMode ? <Moon size={16} /> : <Sun size={16} />}
                                    </span>
                                    <span className="mobile-row-text-col">
                                        <span className="mobile-row-label">Mode sombre</span>
                                        <span className="mobile-row-subtitle">Activer le thème sombre de l'application</span>
                                    </span>
                                    <label className="mobile-toggle-switch" style={{ marginRight: '8px' }}>
                                        <input
                                            type="checkbox"
                                            checked={isDarkMode}
                                            onChange={(e) => setIsDarkMode(e.target.checked)}
                                        />
                                        <span className="toggle-slider" />
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Logout Row */}
                        <div className="mobile-group-section">
                            <div className="mobile-items-card">
                                <button className="mobile-settings-row-btn" type="button" onClick={() => alert("Déconnexion")}>
                                    <span className="mobile-row-icon-bg" style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', color: '#ef4444' }}><LogOut size={16} /></span>
                                    <span className="mobile-row-text-col">
                                        <span className="mobile-row-label" style={{ color: '#ef4444' }}>Déconnexion</span>
                                        <span className="mobile-row-subtitle">Se déconnecter de votre compte</span>
                                    </span>
                                    <span className="mobile-row-arrow"><ChevronRight size={16} /></span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Sticky Mobile Nav from Sidebar */}
                    <SideBar />
                </div>
            );
        } else {
            // detail screen view on mobile
            const currentItem = menuCategories
                .flatMap(cat => cat.items)
                .find(item => item.id === activeTab) || { label: "Paramètres" };

            return (
                <div className="mobile-settings-view" style={{ backgroundColor: 'var(--background)' }}>
                    {/* Header */}
                    <div className="mobile-nav-header" style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--card)', position: 'sticky', top: 0, zIndex: 100 }}>
                        <button className="mobile-back-circle" onClick={() => navigate(-1)}>
                            <ArrowLeft size={16} />
                        </button>
                        <span className={`mobile-nav-header-title ${isScrolled ? 'visible' : ''}`}>
                            {currentItem.label}
                        </span>
                        <div style={{ width: '36px' }} />
                    </div>

                    <h1 className="mobile-header-title">{currentItem.label}</h1>

                    {/* Render active form detail */}
                    {renderTabContent(true)}

                    {/* Profile Sub-Sheets (z-index 2200) */}
                    <AnimatePresence>
                        {activeProfileSubSheet && (
                            <>
                                {/* Nested Backdrop overlay */}
                                <motion.div
                                    className="fixed inset-0 z-[2200] bg-black/45 backdrop-blur-[2px]"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => setActiveProfileSubSheet(null)}
                                />

                                {/* Sub-Sheet Container */}
                                <motion.div
                                    className="fixed bottom-0 left-0 right-0 z-[2250] mx-auto w-full max-w-md bg-card text-foreground rounded-t-[32px] shadow-[0_-12px_45px_rgba(0,0,0,0.18)] outline-none overflow-y-auto"
                                    style={{ maxHeight: '92vh', paddingBottom: 'max(20px, env(safe-area-inset-bottom))', willChange: "transform" }}
                                    initial={{ y: "100%" }}
                                    animate={{ y: 0 }}
                                    exit={{ y: "100%" }}
                                    transition={{ type: "tween", ease: [0.16, 1, 0.3, 1], duration: 0.38 }}
                                    drag="y"
                                    dragControls={dragControlsProfileSub}
                                    dragListener={false}
                                    dragConstraints={{ top: 0 }}
                                    dragElastic={{ top: 0, bottom: 0.8 }}
                                    onDragEnd={(event, info) => {
                                        if (info.offset.y > 100) {
                                            setActiveProfileSubSheet(null);
                                        }
                                    }}
                                >
                                    {/* Draggable Header Zone for Sub-Sheet */}
                                    <div
                                        className="mobile-sheet-header-drag-zone"
                                        onPointerDown={(e) => dragControlsProfileSub.start(e)}
                                        style={{ touchAction: "none" }}
                                    >
                                        <div className="mobile-drag-handle-bar" />
                                    </div>

                                    {/* SUB-SHEET 1: CIVILITY */}
                                    {activeProfileSubSheet === "civility" && (
                                        <div>
                                            <div className="mobile-sheet-header" style={{ borderBottom: 'none', backgroundColor: 'transparent', padding: '10px 16px' }}>
                                                <h2 className="mobile-sheet-title" style={{ margin: 0, fontSize: '24px', fontWeight: 800, textAlign: 'left', flex: 1 }}>Civilité</h2>
                                                <button className="mobile-sheet-close-btn" style={{ position: 'static' }} onClick={() => setActiveProfileSubSheet(null)}>
                                                    <X size={18} />
                                                </button>
                                            </div>
                                            <div className="mobile-sheet-body-stack" style={{ padding: '16px' }}>
                                                <div
                                                    className={`mobile-select-row ${civility === "Madame" ? "active" : ""}`}
                                                    onClick={() => { setCivility("Madame"); setActiveProfileSubSheet(null); }}
                                                >
                                                    <span className="mobile-select-row-label">Madame</span>
                                                    <div className="mobile-radio-circle">
                                                        {civility === "Madame" && <div className="mobile-radio-circle-inner" />}
                                                    </div>
                                                </div>
                                                <div
                                                    className={`mobile-select-row ${civility === "Monsieur" ? "active" : ""}`}
                                                    onClick={() => { setCivility("Monsieur"); setActiveProfileSubSheet(null); }}
                                                >
                                                    <span className="mobile-select-row-label">Monsieur</span>
                                                    <div className="mobile-radio-circle">
                                                        {civility === "Monsieur" && <div className="mobile-radio-circle-inner" />}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* SUB-SHEET 2: PHONE */}
                                    {activeProfileSubSheet === "phone" && (
                                        <div>
                                            <div className="mobile-sheet-header" style={{ borderBottom: 'none', backgroundColor: 'transparent' }}>
                                                <button className="mobile-sheet-close-btn" onClick={() => setActiveProfileSubSheet(null)}>
                                                    <X size={18} />
                                                </button>
                                                <h2 className="mobile-sheet-title">Numéro de téléphone</h2>
                                                <div style={{ width: '36px' }} />
                                            </div>
                                            <div className="mobile-sheet-body-stack" style={{ padding: '0 16px 20px 16px' }}>
                                                <div className="mobile-phone-input-row" style={{ marginTop: '10px' }}>
                                                    <div className="mobile-phone-country">
                                                        <span className="mobile-flag" style={{ fontSize: '18px' }}>🇫🇷</span>
                                                        <span className="mobile-phone-code">+33</span>
                                                    </div>
                                                    <div className="mobile-phone-number-field">
                                                        <input
                                                            type="tel"
                                                            value={phone}
                                                            onChange={(e) => setPhone(e.target.value)}
                                                            placeholder="06 12 34 56 78"
                                                            className="mobile-phone-number-input"
                                                        />
                                                        {phone && (
                                                            <button className="mobile-phone-clear-btn" onClick={() => setPhone("")}>
                                                                <X size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                <button className="mobile-sub-sheet-confirm-btn" onClick={() => setActiveProfileSubSheet(null)}>
                                                    Ajouter ce numéro
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* SUB-SHEET 3: CALENDAR */}
                                    {activeProfileSubSheet === "calendar" && (
                                        <div>
                                            <div className="mobile-sheet-header" style={{ borderBottom: 'none', backgroundColor: 'transparent', padding: '10px 16px' }}>
                                                <h2 className="mobile-sheet-title" style={{ margin: 0, fontSize: '22px', fontWeight: 800, textAlign: 'left', flex: 1 }}>Date de naissance</h2>
                                                <button className="mobile-sheet-close-btn" style={{ position: 'static' }} onClick={() => setActiveProfileSubSheet(null)}>
                                                    <X size={18} />
                                                </button>
                                            </div>

                                            <div className="mobile-sheet-body-stack" style={{ padding: '0 16px 24px 16px' }}>
                                                <p style={{ fontSize: '13.5px', color: '#64748b', marginBottom: '16px' }}>
                                                    Sélectionnez votre date de naissance :
                                                </p>
                                                
                                                <div className="mobile-birthday-selects-row" style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
                                                    {/* Day Select */}
                                                    <div style={{ flex: 1 }}>
                                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: '4px' }}>Jour</label>
                                                        <select
                                                            className="civility-select"
                                                            value={selectedCalDay}
                                                            onChange={(e) => setSelectedCalDay(parseInt(e.target.value, 10))}
                                                            style={{ width: '100%', padding: '10px', borderRadius: '10px', fontWeight: 700 }}
                                                        >
                                                            {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                                                                <option key={d} value={d}>{d}</option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    {/* Month Select */}
                                                    <div style={{ flex: 2 }}>
                                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: '4px' }}>Mois</label>
                                                        <select
                                                            className="civility-select"
                                                            value={selectedCalMonth}
                                                            onChange={(e) => setSelectedCalMonth(parseInt(e.target.value, 10))}
                                                            style={{ width: '100%', padding: '10px', borderRadius: '10px', fontWeight: 700 }}
                                                        >
                                                            {monthsList.map((m, idx) => (
                                                                <option key={idx} value={idx + 1}>{m}</option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    {/* Year Select */}
                                                    <div style={{ flex: 1.5 }}>
                                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: '4px' }}>Année</label>
                                                        <select
                                                            className="civility-select"
                                                            value={selectedCalYear}
                                                            onChange={(e) => setSelectedCalYear(parseInt(e.target.value, 10))}
                                                            style={{ width: '100%', padding: '10px', borderRadius: '10px', fontWeight: 700 }}
                                                        >
                                                            {Array.from({ length: 100 }, (_, i) => 2026 - i).map(y => (
                                                                <option key={y} value={y}>{y}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>

                                                <button
                                                    className="mobile-sub-sheet-confirm-btn"
                                                    onClick={() => {
                                                        const formattedDay = selectedCalDay < 10 ? `0${selectedCalDay}` : selectedCalDay;
                                                        const formattedMonth = selectedCalMonth < 10 ? `0${selectedCalMonth}` : selectedCalMonth;
                                                        setDob(`${formattedDay}/${formattedMonth}/${selectedCalYear}`);
                                                        setActiveProfileSubSheet(null);
                                                    }}
                                                >
                                                    Mettre à jour la date
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </div>
            );
        }
    };

    return (
        <>
            {isMobile ? (
                renderMobileLayout()
            ) : (
                // Desktop Layout
                <div className="home-page">
                    <SideBar />

                    {/* Secondary Settings Sidebar */}
                    <aside className="settings-sidebar">
                        <h2 className="settings-title">Paramètres</h2>
                        <div className="settings-sections">
                            {menuCategories.map((category) => {
                                const isOpen = openCategories[category.title];
                                return (
                                    <div key={category.title} className="settings-category-group">
                                        <button
                                            className="settings-category-header"
                                            onClick={() => toggleCategory(category.title)}
                                        >
                                            <span>{category.title}</span>
                                            <span className={`category-chevron ${isOpen ? 'open' : ''}`}>
                                                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="6 9 12 15 18 9"></polyline>
                                                </svg>
                                            </span>
                                        </button>

                                        <AnimatePresence initial={false}>
                                            {isOpen && (
                                                <motion.ul
                                                    className="settings-submenu"
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: "auto", opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.2, ease: "easeInOut" }}
                                                    style={{ overflow: "hidden" }}
                                                >
                                                    {category.items.map((item) => {
                                                        const ItemIcon = item.icon;
                                                        return (
                                                            <li key={item.id}>
                                                                <button
                                                                    onClick={() => handleTabSelect(item.id)}
                                                                    className={`settings-submenu-item ${activeTab === item.id ? "active" : ""}`}
                                                                >
                                                                    <span className="submenu-item-label">
                                                                        <span className="submenu-item-icon">
                                                                            <ItemIcon size={15} />
                                                                        </span>
                                                                        <span>{item.label}</span>
                                                                    </span>
                                                                </button>
                                                            </li>
                                                        );
                                                    })}
                                                </motion.ul>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="settings-sidebar-footer">
                            <div className="desktop-theme-toggle-row">
                                <span className="theme-toggle-label">Mode sombre</span>
                                <label className="mobile-toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={isDarkMode}
                                        onChange={(e) => setIsDarkMode(e.target.checked)}
                                    />
                                    <span className="toggle-slider" />
                                </label>
                            </div>
                            <button
                                onClick={() => alert("Déconnexion")}
                                className="settings-logout-btn"
                            >
                                <span className="submenu-item-icon">
                                    <LogOut size={15} />
                                </span>
                                <span>Déconnexion</span>
                            </button>
                        </div>
                    </aside>

                    {/* Settings Content Area */}
                    <div className="main-content">
                        <Header />

                        <div className="settings-layout-container">
                            <div className="settings-content-panel">
                                <AnimatePresence mode="wait">
                                    {renderTabContent(false)}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom confirmation toast */}
            <AnimatePresence>
                {showToast && (
                    <motion.div
                        className="custom-toast"
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    >
                        <CheckCircle2 size={16} />
                        <span>{toastMessage}</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

export default SettingsPage;