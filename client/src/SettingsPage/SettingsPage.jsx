import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
    
    // Form and user state
    const [firstName, setFirstName] = useState("Marc");
    const [lastName, setLastName] = useState("Dubois");
    const [email, setEmail] = useState("marc@dupont-clim.fr");
    const [phone, setPhone] = useState("06 12 34 56 78");
    const [avatarUrl, setAvatarUrl] = useState(null);
    const [civility, setCivility] = useState("Homme");
    const [dob, setDob] = useState("20/05/1990");
    
    // Layout and Navigation State
    const [activeTab, setActiveTab] = useState("profil");
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState("");
    const [isMobile, setIsMobile] = useState(false);
    
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

    // Detect screen size on resize
    useEffect(() => {
        setIsMobile(window.innerWidth <= 768);
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Sync state with URL query parameters for back gesture support
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const tab = params.get("tab");
        if (tab) {
            setActiveTab(tab);
            setMobileScreenState("detail");
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

    // Go back to the page we came from (e.g. /home, /client, etc.)
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

                                <div className="mobile-input-card">
                                    <span className="mobile-input-card-label">Téléphone</span>
                                    <div className="mobile-input-card-row">
                                        <span className="mobile-flag">🇫🇷</span>
                                        <input
                                            type="tel"
                                            className="mobile-input-card-field"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            placeholder="06 12 34 56 78"
                                        />
                                        <span className="mobile-chevron-down">▼</span>
                                    </div>
                                </div>

                                <div className="mobile-input-card" style={{ cursor: 'pointer' }}>
                                    <span className="mobile-input-card-label">Civilité</span>
                                    <div className="mobile-input-card-row">
                                        <span>{civility}</span>
                                        <span className="mobile-chevron-down" onClick={() => setCivility(civility === "Homme" ? "Femme" : "Homme")}>▼</span>
                                    </div>
                                </div>

                                <div className="mobile-input-card">
                                    <span className="mobile-input-card-label">Date de naissance</span>
                                    <div className="mobile-input-card-row">
                                        <input
                                            type="text"
                                            className="mobile-input-card-field"
                                            value={dob}
                                            onChange={(e) => setDob(e.target.value)}
                                            placeholder="JJ/MM/AAAA"
                                        />
                                        <span className="mobile-chevron-down">▼</span>
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
                                <div className="form-field form-group-full">
                                    <label className="form-label">Téléphone</label>
                                    <input
                                        type="tel"
                                        className="form-input"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="06 12 34 56 78"
                                    />
                                </div>
                                <div className="form-field form-group-full">
                                    <label className="form-label">Avatar</label>
                                    <div className="avatar-edit-field">
                                        <div className="avatar-preview">
                                            {avatarUrl ? (
                                                <img src={avatarUrl} alt="Avatar" />
                                            ) : (
                                                <span>{firstName[0]}{lastName[0]}</span>
                                            )}
                                        </div>
                                        <label className="change-avatar-btn">
                                            <Camera size={14} />
                                            <span>Changer</span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleAvatarChange}
                                            />
                                        </label>
                                    </div>
                                </div>
                                <div className="form-field form-group-full">
                                    <label className="form-label">Sécurité</label>
                                    <div className="password-change-row">
                                        <div className="password-info">
                                            <span className="password-title">Mot de passe</span>
                                            <span className="password-desc">Modifiez votre mot de passe d'accès.</span>
                                        </div>
                                        <button
                                            type="button"
                                            className="change-password-btn"
                                            onClick={handlePasswordChange}
                                        >
                                            Changer →
                                        </button>
                                    </div>
                                </div>
                                <div className="form-actions form-group-full">
                                    <button type="submit" className="save-profile-btn">
                                        Enregistrer
                                    </button>
                                </div>
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
                            // Mobile Company layout (Image 1 style)
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
                
            case "facturation":
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
                                    <h2 className="panel-title">Réglages facturation</h2>
                                </div>
                                <div className="panel-divider"></div>
                            </>
                        )}
                        
                        {isMobileView ? (
                            // Mobile Facturation layout (Image 2 style)
                            <div>
                                <h3 className="mobile-detail-section-title" style={{ marginTop: '8px' }}>Documents</h3>
                                <div className="mobile-group-container">
                                    <div className="mobile-items-card">
                                        <button className="mobile-settings-row-btn" type="button">
                                            <span className="mobile-row-icon-bg"><Star size={16} /></span>
                                            <span className="mobile-row-text-col">
                                                <span className="mobile-row-label">Personnalisation de document</span>
                                                <span className="mobile-row-subtitle">Logo, couleurs et mise en page</span>
                                            </span>
                                            <span className="mobile-row-arrow"><ChevronRight size={16} /></span>
                                        </button>
                                        <button className="mobile-settings-row-btn" type="button">
                                            <span className="mobile-row-icon-bg"><Info size={16} /></span>
                                            <span className="mobile-row-text-col">
                                                <span className="mobile-row-label">Informations</span>
                                                <span className="mobile-row-subtitle">Mentions affichées sur vos documents</span>
                                            </span>
                                            <span className="mobile-row-arrow"><ChevronRight size={16} /></span>
                                        </button>
                                        <button className="mobile-settings-row-btn" type="button">
                                            <span className="mobile-row-icon-bg"><Hash size={16} /></span>
                                            <span className="mobile-row-text-col">
                                                <span className="mobile-row-label">Numérotation</span>
                                                <span className="mobile-row-subtitle">Format des numéros de facture</span>
                                            </span>
                                            <span className="mobile-row-arrow"><ChevronRight size={16} /></span>
                                        </button>
                                        <button className="mobile-settings-row-btn" type="button">
                                            <span className="mobile-row-icon-bg"><Tag size={16} /></span>
                                            <span className="mobile-row-text-col">
                                                <span className="mobile-row-label">Articles</span>
                                                <span className="mobile-row-subtitle">Vos produits et prestations</span>
                                            </span>
                                            <span className="mobile-row-arrow"><ChevronRight size={16} /></span>
                                        </button>
                                    </div>
                                </div>

                                <h3 className="mobile-detail-section-title">Paiement</h3>
                                <div className="mobile-group-container">
                                    <div className="mobile-items-card">
                                        <button className="mobile-settings-row-btn" type="button">
                                            <span className="mobile-row-icon-bg"><CreditCard size={16} /></span>
                                            <span className="mobile-row-text-col">
                                                <span className="mobile-row-label">Paiement</span>
                                                <span className="mobile-row-subtitle">Moyens et conditions de paiement</span>
                                            </span>
                                            <span className="mobile-row-arrow"><ChevronRight size={16} /></span>
                                        </button>
                                        <button className="mobile-settings-row-btn" type="button">
                                            <span className="mobile-row-icon-bg"><Zap size={16} /></span>
                                            <span className="mobile-row-text-col">
                                                <span className="mobile-row-label">Avance immédiate</span>
                                                <span className="mobile-row-subtitle">Avance immédiate URSSAF</span>
                                            </span>
                                            <span className="mobile-row-arrow"><ChevronRight size={16} /></span>
                                        </button>
                                    </div>
                                </div>

                                <h3 className="mobile-detail-section-title">Envoi & format</h3>
                                <div className="mobile-group-container">
                                    <div className="mobile-items-card">
                                        <button className="mobile-settings-row-btn" type="button">
                                            <span className="mobile-row-icon-bg"><Bell size={16} /></span>
                                            <span className="mobile-row-text-col">
                                                <span className="mobile-row-label">Relances automatiques</span>
                                                <span className="mobile-row-subtitle">Rappels de paiement automatiques</span>
                                            </span>
                                            <span className="mobile-row-arrow"><ChevronRight size={16} /></span>
                                        </button>
                                    </div>
                                </div>
                                <div style={{ height: '20px' }} />
                            </div>
                        ) : (
                            // Desktop Mockup for invoice settings
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <h3 style={{ margin: 0, fontSize: '15px' }}>Options de facturation</h3>
                                <p style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>Configurez ici vos templates de devis et factures.</p>
                            </div>
                        )}
                    </motion.div>
                );
                
            case "abonnement":
                return (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.25 }}
                    >
                        <div className="panel-title-row">
                            <span className="submenu-item-icon" style={{ color: "var(--sidebar-primary)" }}><CreditCard size={18} /></span>
                            <h2 className="panel-title">Abonnement</h2>
                        </div>
                        <div className="panel-divider"></div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ background: 'rgba(95, 75, 219, 0.03)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <h3 style={{ margin: 0, fontWeight: 700, fontSize: '15px', color: 'var(--sidebar-primary)' }}>ClimPro Pro</h3>
                                    <span style={{ background: '#10b981', color: 'white', fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '50px' }}>ACTIF</span>
                                </div>
                                <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', margin: '0 0 12px 0' }}>Votre abonnement Pro vous donne un accès total.</p>
                                <div style={{ display: 'flex', gap: '14px', fontSize: '12.5px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                                    <div><strong>Fréquence:</strong> Mensuel</div>
                                    <div><strong>Expiration:</strong> 21/08/2026</div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                );
            default:
                const currentItem = menuCategories
                    .flatMap(cat => cat.items)
                    .find(item => item.id === activeTab);
                const SelectedIcon = currentItem?.icon || Settings;
                return (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.25 }}
                        className="tab-placeholder"
                    >
                        <div className="placeholder-icon">
                            <SelectedIcon size={38} />
                        </div>
                        <h3 className="placeholder-title">{currentItem?.label || "Paramètres"}</h3>
                        <p className="placeholder-desc">
                            La section <strong>{currentItem?.label}</strong> est configurée et sera disponible prochainement.
                        </p>
                    </motion.div>
                );
        }
    };

    // Render mobile-specific UI (Image 3 / Image 4 / Image 1 drill-down layout)
    const renderMobileLayout = () => {
        if (mobileScreenState === "list") {
            return (
                <div className="mobile-settings-view">
                    {/* Header */}
                    <div className="mobile-nav-header">
                        <button className="mobile-back-circle" onClick={handleMainListBack}>
                            <ArrowLeft size={16} />
                        </button>
                    </div>

                    {/* Profile Header */}
                    <div className="mobile-profile-header-sec">
                        <div className="mobile-profile-avatar-circle">
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="Avatar" />
                            ) : (
                                <span>{firstName[0]}{lastName[0]}</span>
                            )}
                        </div>
                        <span className="mobile-profile-name">{firstName} {lastName}</span>
                        <span className="mobile-profile-email">{email}</span>
                    </div>

                    {/* Banner Upgrade Card */}
                    {showUpgradeBanner && (
                        <div className="mobile-upgrade-card">
                            <button className="mobile-upgrade-close" onClick={() => setShowUpgradeBanner(false)}>
                                <X size={14} />
                            </button>
                            <h4 className="mobile-upgrade-title">Allez plus loin avec ClimPro !</h4>
                            <p className="mobile-upgrade-text">
                                Votre offre actuelle est limitée. Passez à un niveau supérieur pour accéder à plus de fonctionnalités.
                            </p>
                            <button className="mobile-upgrade-action-btn" onClick={() => triggerToast("Redirection Pro...")}>
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
                    <div className="mobile-nav-header" style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: 'white' }}>
                        <button className="mobile-back-circle" onClick={() => navigate(-1)}>
                            <ArrowLeft size={16} />
                        </button>
                    </div>
                    
                    <h1 className="mobile-header-title">{currentItem.label}</h1>
                    
                    {/* Render active form detail */}
                    {renderTabContent(true)}
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

                    {/* Main Content Pane */}
                    <div className="main-content">
                        <Header />
                        <div className="page-content">
                            <div className="settings-layout-container">
                                {/* Top Profile Summary Card */}
                                <div className="settings-user-card">
                                    <div className="card-avatar">
                                        {avatarUrl ? (
                                            <img src={avatarUrl} className="card-avatar-image" alt="User Profile" />
                                        ) : (
                                            <span>{firstName[0]}{lastName[0]}</span>
                                        )}
                                    </div>
                                    <div className="card-info">
                                        <span className="card-name">{firstName} {lastName}</span>
                                        <span className="card-email">{email}</span>
                                        <div className="card-plan-row">
                                            <span className="card-plan-badge">Plan Pro</span>
                                            <span className="card-plan-expiry">· Expire le 21/08</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Content Panel */}
                                <div className="settings-content-panel">
                                    <AnimatePresence mode="wait">
                                        {renderTabContent(false)}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Toast */}
            <AnimatePresence>
                {showToast && (
                    <motion.div
                        className="toast-notification"
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        transition={{ type: "spring", stiffness: 350, damping: 25 }}
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