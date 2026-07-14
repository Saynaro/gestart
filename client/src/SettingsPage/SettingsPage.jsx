import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import SideBar from "../components/SideBar";
import Header from "../components/Header";
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
    X
} from "lucide-react";

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
    
    // Layout and Navigation State
    const [activeTab, setActiveTab] = useState("profil");
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState("");
    const [isMobile, setIsMobile] = useState(false);
    
    // Scroll tracking for iOS-style header title transition
    const [isScrolled, setIsScrolled] = useState(false);

    // Profile Sub-Sheets states
    const [activeProfileSubSheet, setActiveProfileSubSheet] = useState(null); // null, "phone", "civility", "calendar"
    const [selectedCalDay, setSelectedCalDay] = useState(1);
    const dragControlsProfileSub = useDragControls();

    // mobileScreenState can be "list" (show categories menu) or "detail" (show selected settings tab)
    const [mobileScreenState, setMobileScreenState] = useState("list");
    const [showUpgradeBanner, setShowUpgradeBanner] = useState(true);

    // Desktop Accordion states
    const [openCategories, setOpenCategories] = useState({
        "Mon compte": true,
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
                { id: "abonnement", label: "Abonnement", icon: CreditCard, subtitle: "Gérez votre offre ClimPro" },
                { id: "utilisateurs", label: "Utilisateurs", icon: Users, subtitle: "Gérez les accès de vos collaborateurs" }
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
                                        className="form-input" 
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
                <div className="mobile-settings-view" style={{ backgroundColor: '#f8fafc' }}>
                    {/* Header */}
                    <div className="mobile-nav-header" style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: 'white', position: 'sticky', top: 0, zIndex: 100 }}>
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
                                    className="fixed bottom-0 left-0 right-0 z-[2250] mx-auto w-full max-w-md bg-white rounded-t-[32px] shadow-[0_-12px_45px_rgba(0,0,0,0.18)] outline-none overflow-y-auto"
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
                                        style={{ touchAction: "none", backgroundColor: 'white' }}
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
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1 }}>
                                                    <h2 className="mobile-sheet-title" style={{ margin: 0, fontSize: '20px', fontWeight: 800, textAlign: 'left' }}>Janvier 1990</h2>
                                                    <ChevronRight size={18} style={{ color: '#2563eb' }} />
                                                </div>
                                                <div style={{ display: 'flex', gap: '16px' }}>
                                                    <ChevronLeft size={20} style={{ color: '#2563eb', cursor: 'pointer' }} />
                                                    <ChevronRight size={20} style={{ color: '#2563eb', cursor: 'pointer' }} />
                                                </div>
                                            </div>

                                            <div className="mobile-calendar-body" style={{ padding: '0 16px' }}>
                                                {/* Weekday headers */}
                                                <div className="mobile-calendar-weekdays">
                                                    {["LUN.", "MAR.", "MER.", "JEU.", "VEN.", "SAM.", "DIM."].map((w) => (
                                                        <span key={w}>{w}</span>
                                                    ))}
                                                </div>

                                                {/* Days grid */}
                                                <div className="mobile-calendar-days-grid">
                                                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                                                        <button 
                                                            key={d} 
                                                            className={`mobile-calendar-day-btn ${selectedCalDay === d ? "active" : ""}`}
                                                            onClick={() => setSelectedCalDay(d)}
                                                        >
                                                            {d}
                                                        </button>
                                                    ))}
                                                </div>

                                                <div className="mobile-calendar-actions">
                                                    <button 
                                                        className="mobile-calendar-val-btn"
                                                        onClick={() => {
                                                            const formattedDay = selectedCalDay < 10 ? `0${selectedCalDay}` : selectedCalDay;
                                                            setDob(`${formattedDay}/01/1990`);
                                                            setActiveProfileSubSheet(null);
                                                        }}
                                                    >
                                                        Valider
                                                    </button>
                                                    <button className="mobile-calendar-cancel-btn" onClick={() => setActiveProfileSubSheet(null)}>
                                                        Annuler
                                                    </button>
                                                </div>
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
                        
                        <div className="settings-main-container">
                            <div className="settings-panel">
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