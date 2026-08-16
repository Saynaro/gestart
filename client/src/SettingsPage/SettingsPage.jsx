import { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import SideBar from "../components/SideBar";
import Header from "../components/Header";
import LegalModal, { LegalHelpTooltip } from "../components/LegalHelpModal";
import { apiFetch } from "../utils/api";
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
    HelpCircle,
    Star,
    Gift,
    FileText,
    BookOpen,
    Lock,
    LogOut,
    CheckCircle2,
    AlertTriangle,
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

// Import Tab Components
import ProfilTab from "./components/ProfilTab";
import EntrepriseTab from "./components/EntrepriseTab";
import SecuriteTab from "./components/SecuriteTab";
import LegalRgpdTab from "./components/LegalRgpdTab";
import AbonnementTab from "./components/AbonnementTab";
import UtilisateursTab from "./components/UtilisateursTab";
import ChiffreAffairesTab from "./components/ChiffreAffairesTab";
import CotisationsTab from "./components/CotisationsTab";
import TvaTab from "./components/TvaTab";
import BanquesTab from "./components/BanquesTab";
import TransactionsTab from "./components/TransactionsTab";
import CategoriesPersoTab from "./components/CategoriesPersoTab";
import FacturationTab from "./components/FacturationTab";
import SmsTab from "./components/SmsTab";
import NotificationsTab from "./components/NotificationsTab";
import PremiumTab from "./components/PremiumTab";
import SupportTab from "./components/SupportTab";
import AvisTab from "./components/AvisTab";
import ParrainageTab from "./components/ParrainageTab";
import AboutTab from "./components/AboutTab";
import EInvoicingTab from "./components/EInvoicingTab";

const monthsList = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

function SettingsPage() {
    const navigate = useNavigate();

    // Ref to store scroll position for mobile back navigation
    const scrollYRef = useRef(0);

    // Form and user state
    const [firstName, setFirstName] = useState("Khalid");
    const [lastName, setLastName] = useState("Sainaro");
    const [email, setEmail] = useState("khalid.cizdoev777@gmail.com");
    const [phone, setPhone] = useState("0651604316");
    const [avatarUrl, setAvatarUrl] = useState(null);
    const [civility, setCivility] = useState("");
    const [dob, setDob] = useState("");

    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                const token = localStorage.getItem('accessToken');
                if (!token) return;
                const data = await apiFetch('/v1/auth/me');
                const user = data.data?.user || data.user || data;
                if (user) {
                    if (user.firstName) setFirstName(user.firstName);
                    if (user.lastName) setLastName(user.lastName);
                    if (user.email) setEmail(user.email);
                    if (user.phone) setPhone(user.phone);
                    if (user.avatarUrl) setAvatarUrl(user.avatarUrl);
                }
            } catch (err) {
                console.warn("API me non disponible:", err.message);
            }
        };
        fetchUserProfile();
    }, []);

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
    const [activeTab, setActiveTab] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get("tab") || "profil";
    });
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState("");
    const [toastIsError, setToastIsError] = useState(false);
    const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth <= 768);

    // Sync tab from URL query params
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const tabParam = params.get("tab");
        if (tabParam) {
            setActiveTab(tabParam);
            if (typeof window !== "undefined" && window.innerWidth <= 768) {
                setMobileScreenState("detail");
            }
        }
    }, []);

    // Scroll tracking for iOS-style header title transition
    const [isScrolled, setIsScrolled] = useState(false);

    // Profile Sub-Sheets states for mobile
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
        "Communauté": true,
        "À propos": true
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

    // Set manual scroll restoration to prevent iOS Safari freeze during back swipe
    useEffect(() => {
        if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
            window.history.scrollRestoration = "manual";
        }
    }, []);



    const toggleCategory = (title) => {
        setOpenCategories((prev) => ({
            ...prev,
            [title]: !prev[title]
        }));
    };

    const [confirmConfig, setConfirmConfig] = useState(null);

    const triggerToast = (message, isError = false) => {
        setToastMessage(message);
        setToastIsError(isError);
        setShowToast(true);
        setTimeout(() => {
            setShowToast(false);
        }, 3000);
    };

    const triggerConfirm = ({ title, message, confirmText = "Confirmer", cancelText = "Annuler", type = "danger", onConfirm }) => {
        setConfirmConfig({
            title: title || "Êtes-vous sûr ?",
            message: message || "Voulez-vous vraiment effectuer cette action ?",
            confirmText,
            cancelText,
            type,
            onConfirm
        });
    };

    // Configuration of Menu Categories (All 21 items)
    const menuCategories = [
        {
            title: "Mon compte",
            items: [
                { id: "profil", label: "Profil", icon: User, subtitle: "Vos informations personnelles" },
                { id: "ma-societe", label: "Entreprise", icon: Building, subtitle: "Coordonnées et statut juridique" },
                { id: "securite", label: "Sécurité", icon: Lock, subtitle: "Email, mot de passe et connexion" },
                { id: "rgpd-legal", label: "Légal & RGPD", icon: Lock, subtitle: "Exportation de données et droits" },
                { id: "abonnement", label: "Abonnement", icon: CreditCard, subtitle: "Gérez votre offre ClimPro" }
            ]
        },
        {
            title: "Comptabilité",
            items: [
                { id: "chiffre-affaires", label: "Chiffre d'affaires", icon: Calculator, subtitle: "Plafonds et CA annuel" },
                { id: "cotisations", label: "Cotisations sociales", icon: Percent, subtitle: "Taux et calcul de cotisations" },
                { id: "tva-config", label: "TVA", icon: Receipt, subtitle: "Taux de TVA et déclarations" },
                { id: "banques", label: "Banques", icon: Building, subtitle: "Gérez vos coordonnées bancaires" },
                { id: "transactions", label: "Transactions", icon: RefreshCw, subtitle: "Flux de transactions financières" },
                { id: "categories-perso", label: "Catégories personnalisées", icon: Settings, subtitle: "Gérez vos catégories de dépenses" }
            ]
        },
        {
            title: "Config",
            items: [
                { id: "facturation", label: "Facturation", icon: Receipt, subtitle: "Réglages de facturation" },
                { id: "e-invoicing", label: "Facturation électronique", icon: CheckCircle2, subtitle: "Plateforme Agréée (B2Brouter)", badge: "2026" },
                { id: "sms", label: "SMS", icon: MessageSquare, subtitle: "Crédits et expéditeur" },
                { id: "notifications", label: "Notifications", icon: Bell, subtitle: "Canaux et fréquences" },
                { id: "premium", label: "Premium", icon: Star, subtitle: "Fonctionnalités Pro avancées", badge: "PRO" }
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

    // Touch swipe left-to-right from screen edge to dismiss detail screen
    const touchStartX = useRef(0);
    const touchStartY = useRef(0);

    const handleTouchStart = (e) => {
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e) => {
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const deltaX = touchEndX - touchStartX.current;
        const deltaY = Math.abs(touchEndY - touchStartY.current);

        // If swiped right from left edge (start X < 60px, distance > 40px, predominantly horizontal)
        if (touchStartX.current < 60 && deltaX > 40 && deltaY < deltaX) {
            handleBackFromDetail();
        }
    };

    // Handle browser popstate (back button / Safari edge swipe) for mobile sub-screen navigation
    useEffect(() => {
        const handlePopState = (e) => {
            if (e.state && e.state.settingsDetail) {
                setMobileScreenState("detail");
                if (e.state.tab) {
                    setActiveTab(e.state.tab);
                }
            } else {
                setMobileScreenState("list");
                if (typeof window !== "undefined" && window.innerWidth <= 768) {
                    const targetY = scrollYRef.current || 0;
                    setTimeout(() => {
                        window.scrollTo({ top: targetY, behavior: "instant" });
                    }, 0);
                }
            }
        };

        window.addEventListener("popstate", handlePopState);
        return () => window.removeEventListener("popstate", handlePopState);
    }, []);

    // Helper to change tab
    const handleTabSelect = useCallback((itemId) => {
        setActiveTab(itemId);
        if (typeof window !== "undefined" && window.innerWidth <= 768) {
            scrollYRef.current = window.scrollY;
            if (mobileScreenState === "detail") {
                window.history.replaceState({ settingsDetail: true, tab: itemId }, "", window.location.href);
            } else {
                window.history.pushState({ settingsDetail: true, tab: itemId }, "", window.location.href);
                setMobileScreenState("detail");
            }
            window.scrollTo(0, 0);
        }
    }, [mobileScreenState]);

    const handleBackFromDetail = useCallback(() => {
        if (typeof window !== "undefined" && window.history.state?.settingsDetail) {
            window.history.back();
        } else {
            setMobileScreenState("list");
            if (typeof window !== "undefined" && window.innerWidth <= 768) {
                const targetY = scrollYRef.current || 0;
                setTimeout(() => {
                    window.scrollTo({ top: targetY, behavior: "instant" });
                }, 0);
            }
        }
    }, []);

    const handleMainListBack = () => {
        // Do nothing on main /settings list screen as requested
        return;
    };

    // Memoize active tab object to avoid redundant recalculations
    const currentItem = useMemo(() => {
        return menuCategories
            .flatMap(cat => cat.items)
            .find(item => item.id === activeTab) || { label: "Paramètres", icon: Settings };
    }, [activeTab]);

    // Render Tab Content
    const renderTabContent = (isMobileView = false) => {
        const ItemIcon = currentItem.icon;

        return (
            <motion.div
                key={activeTab}
                initial={isMobileView ? { opacity: 1 } : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: isMobileView ? 0 : 0.2 }}
            >
                {!isMobileView && (
                    <>
                        <div className="panel-title-row">
                            <span className="submenu-item-icon" style={{ color: "var(--sidebar-primary)" }}>
                                <ItemIcon size={18} />
                            </span>
                            <h2 className="panel-title">{currentItem.label}</h2>
                            {currentItem.badge && (
                                <span style={{ backgroundColor: 'var(--sidebar-primary)', color: '#fff', fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '50px', marginLeft: '6px' }}>
                                    {currentItem.badge}
                                </span>
                            )}
                        </div>
                        <div className="panel-divider"></div>
                    </>
                )}

                {/* Section component router */}
                {(() => {
                    switch (activeTab) {
                        case "profil":
                            return <ProfilTab isMobileView={isMobileView} triggerToast={triggerToast} triggerConfirm={triggerConfirm} activeSubSheet={activeProfileSubSheet} setActiveSubSheet={setActiveProfileSubSheet} />;
                        case "ma-societe":
                            return <EntrepriseTab isMobileView={isMobileView} triggerToast={triggerToast} triggerConfirm={triggerConfirm} />;
                        case "securite":
                            return <SecuriteTab isMobileView={isMobileView} triggerToast={triggerToast} triggerConfirm={triggerConfirm} />;
                        case "rgpd-legal":
                            return <LegalRgpdTab isMobileView={isMobileView} triggerToast={triggerToast} triggerConfirm={triggerConfirm} />;
                        case "abonnement":
                            return <AbonnementTab isMobileView={isMobileView} triggerToast={triggerToast} triggerConfirm={triggerConfirm} />;

                        case "chiffre-affaires":
                            return <ChiffreAffairesTab isMobileView={isMobileView} triggerToast={triggerToast} triggerConfirm={triggerConfirm} />;
                        case "cotisations":
                            return <CotisationsTab isMobileView={isMobileView} triggerToast={triggerToast} triggerConfirm={triggerConfirm} />;
                        case "tva-config":
                            return <TvaTab isMobileView={isMobileView} triggerToast={triggerToast} triggerConfirm={triggerConfirm} />;
                        case "banques":
                            return <BanquesTab isMobileView={isMobileView} triggerToast={triggerToast} triggerConfirm={triggerConfirm} />;
                        case "transactions":
                            return <TransactionsTab isMobileView={isMobileView} triggerToast={triggerToast} triggerConfirm={triggerConfirm} />;
                        case "categories-perso":
                            return <CategoriesPersoTab isMobileView={isMobileView} triggerToast={triggerToast} triggerConfirm={triggerConfirm} />;
                        case "facturation":
                            return <FacturationTab isMobileView={isMobileView} triggerToast={triggerToast} triggerConfirm={triggerConfirm} />;
                        case "e-invoicing":
                            return <EInvoicingTab isMobileView={isMobileView} triggerToast={triggerToast} triggerConfirm={triggerConfirm} />;
                        case "sms":
                            return <SmsTab isMobileView={isMobileView} triggerToast={triggerToast} triggerConfirm={triggerConfirm} />;
                        case "notifications":
                            return <NotificationsTab isMobileView={isMobileView} triggerToast={triggerToast} triggerConfirm={triggerConfirm} />;
                        case "premium":
                            return <PremiumTab isMobileView={isMobileView} triggerToast={triggerToast} triggerConfirm={triggerConfirm} />;
                        case "support":
                            return <SupportTab isMobileView={isMobileView} triggerToast={triggerToast} triggerConfirm={triggerConfirm} />;
                        case "avis":
                            return <AvisTab isMobileView={isMobileView} triggerToast={triggerToast} triggerConfirm={triggerConfirm} />;
                        case "parrainage":
                            return <ParrainageTab isMobileView={isMobileView} triggerToast={triggerToast} triggerConfirm={triggerConfirm} />;
                        case "mentions":
                        case "cgu":
                        case "confidentialite":
                            return <AboutTab activeTab={activeTab} isMobileView={isMobileView} triggerToast={triggerToast} triggerConfirm={triggerConfirm} />;
                        default:
                            return <ProfilTab isMobileView={isMobileView} triggerToast={triggerToast} triggerConfirm={triggerConfirm} />;
                    }
                })()}
            </motion.div>
        );
    };

    const renderMobileLayout = () => {

        const isDetail = mobileScreenState === "detail";

        return (
            <div
                className="mobile-settings-view"
                style={{ backgroundColor: 'var(--background)' }}
                onTouchStart={isDetail ? handleTouchStart : undefined}
                onTouchEnd={isDetail ? handleTouchEnd : undefined}
            >
                {/* Stable Fixed Sticky Header */}
                <div className="mobile-nav-header">
                    <button
                        className="mobile-back-circle"
                        onClick={isDetail ? handleBackFromDetail : handleMainListBack}
                        style={!isDetail ? { opacity: 0.4, cursor: 'default' } : {}}
                    >
                        <ArrowLeft size={16} />
                    </button>
                    <span className="mobile-nav-header-title visible">
                        {isDetail ? currentItem.label : "Paramètres"}
                    </span>
                    <div style={{ width: '36px' }} />
                </div>

                {/* List View Container - Kept permanently mounted in DOM for instant 0ms Safari swipe-back */}
                <div style={{ display: !isDetail ? 'block' : 'none' }}>
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

                    {/* Pro Upgrade Banner */}
                    {showUpgradeBanner && (
                        <div className="mobile-abby-banner">
                            <button className="mobile-abby-banner-close" onClick={() => setShowUpgradeBanner(false)}>
                                <X size={18} />
                            </button>
                            <h3 className="mobile-abby-banner-title">Passez à la vitesse supérieure !</h3>
                            <p className="mobile-abby-banner-text">
                                Votre plan Pro vous permet de gérer 250 clients et 2 techniciens.
                            </p>
                            <button className="mobile-abby-banner-btn" onClick={() => triggerToast("Passez au plan Unlimited !")}>
                                Découvrir le plan Unlimited
                            </button>
                        </div>
                    )}

                    {/* Categories and Rows */}
                    <div className="mobile-group-container">
                        {/* Custom Conformity Section */}
                        <div className="mobile-group-section">
                            <h4 className="mobile-group-header">Conformité Légale</h4>
                            <div className="mobile-items-card">
                                <button className="mobile-settings-row-btn" type="button" onClick={() => handleTabSelect("rgpd-legal")}>
                                    <span className="mobile-row-icon-bg" style={{ backgroundColor: 'rgba(59, 130, 246, 0.08)', color: '#2563eb' }}><FileText size={16} /></span>
                                    <span className="mobile-row-text-col">
                                        <span className="mobile-row-label">Facturation électronique RGPD</span>
                                        <span className="mobile-row-subtitle">Art. 289 CGI & Art. 15-21 RGPD</span>
                                    </span>
                                    <span className="mobile-row-badge">Conforme</span>
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
                                                {item.badge && (
                                                    <span className="mobile-row-badge" style={{ backgroundColor: 'var(--sidebar-primary)', color: '#fff' }}>{item.badge}</span>
                                                )}
                                                <span className="mobile-row-arrow"><ChevronRight size={16} /></span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}

                        {/* Theme Switcher Row */}
                        <div className="mobile-group-section">
                            <h4 className="mobile-group-header">Préférences d'affichage</h4>
                            <div className="mobile-items-card">
                                <div className="mobile-settings-row-btn" style={{ cursor: 'default' }}>
                                    <span className="mobile-row-icon-bg" style={{ backgroundColor: 'rgba(91, 77, 219, 0.08)', color: 'var(--sidebar-primary)' }}>
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
                        <div className="mobile-group-section" style={{ marginBottom: '50px' }}>
                            <div className="mobile-items-card">
                                <button className="mobile-settings-row-btn" type="button" onClick={() => {
                                    triggerConfirm({
                                        title: "Déconnexion de GestArt",
                                        message: "Êtes-vous sûr de vouloir vous déconnecter de votre session actuelle ?",
                                        confirmText: "Se déconnecter",
                                        cancelText: "Annuler",
                                        onConfirm: () => triggerToast("Déconnexion effectuée avec succès.")
                                    });
                                }}>
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

                    <SideBar />
                </div>

                {/* Detail View Container - Kept mounted with CSS display toggle */}
                <div className="mobile-tab-content-wrapper" style={{ display: isDetail ? 'block' : 'none' }}>
                    <h1 className="mobile-header-title">{currentItem.label}</h1>

                    {/* Render active form detail */}
                    {renderTabContent(true)}
                </div>

                {/* Profile Sub-Sheets (z-index 2200) */}
                <AnimatePresence>
                    {activeProfileSubSheet && (
                        <>
                            <motion.div
                                className="fixed inset-0 z-[2200] bg-black/45 backdrop-blur-[2px]"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setActiveProfileSubSheet(null)}
                            />

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
                                <div
                                    className="mobile-sheet-header-drag-zone"
                                    onPointerDown={(e) => dragControlsProfileSub.start(e)}
                                    style={{ touchAction: "none" }}
                                >
                                    <div className="mobile-drag-handle-bar" />
                                </div>

                                {/* SUB-SHEET: PHONE */}
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
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>
        );
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
                                                                        {item.badge && (
                                                                            <span style={{ backgroundColor: 'var(--sidebar-primary)', color: '#fff', fontSize: '9px', fontWeight: 800, padding: '1px 6px', borderRadius: '50px', marginLeft: 'auto' }}>
                                                                                {item.badge}
                                                                            </span>
                                                                        )}
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
                                onClick={() => {
                                    triggerConfirm({
                                        title: "Déconnexion de GestArt",
                                        message: "Êtes-vous sûr de vouloir vous déconnecter de votre session actuelle ?",
                                        confirmText: "Se déconnecter",
                                        cancelText: "Annuler",
                                        onConfirm: () => triggerToast("Déconnexion effectuée avec succès.")
                                    });
                                }}
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

            {/* Custom Confirmation Dialog Toast for destructive actions */}
            <AnimatePresence>
                {confirmConfig && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 999999,
                            backgroundColor: 'rgba(0, 0, 0, 0.65)',
                            backdropFilter: 'blur(4px)',
                            WebkitBackdropFilter: 'blur(4px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '20px',
                            boxSizing: 'border-box'
                        }}
                        onClick={() => setConfirmConfig(null)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            transition={{ type: "spring", stiffness: 450, damping: 30 }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                backgroundColor: 'var(--card)',
                                border: '1.5px solid var(--border)',
                                borderRadius: '16px',
                                padding: '20px 22px',
                                maxWidth: '360px',
                                width: '100%',
                                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '16px',
                                boxSizing: 'border-box'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    backgroundColor: confirmConfig.type === 'success' ? 'rgba(34, 197, 94, 0.14)' : confirmConfig.type === 'info' ? 'rgba(37, 99, 235, 0.14)' : 'rgba(239, 68, 68, 0.12)',
                                    color: confirmConfig.type === 'success' ? '#16a34a' : confirmConfig.type === 'info' ? '#2563eb' : '#ef4444',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                    {confirmConfig.type === 'success' ? (
                                        <Star size={22} fill="currentColor" />
                                    ) : (
                                        <AlertTriangle size={22} />
                                    )}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h4 style={{ margin: '2px 0 0 0', fontSize: '15.5px', fontWeight: 700, color: 'var(--foreground)' }}>{confirmConfig.title}</h4>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--muted-foreground)', lineHeight: 1.45 }}>{confirmConfig.message}</p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                                <button
                                    type="button"
                                    onClick={() => setConfirmConfig(null)}
                                    style={{
                                        flex: 1,
                                        padding: '10px 14px',
                                        borderRadius: '10px',
                                        border: '1px solid var(--border)',
                                        backgroundColor: 'var(--background)',
                                        color: 'var(--foreground)',
                                        fontWeight: 600,
                                        fontSize: '13px',
                                        cursor: 'pointer',
                                        textAlign: 'center'
                                    }}
                                >
                                    {confirmConfig.cancelText || "Annuler"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const cb = confirmConfig.onConfirm;
                                        setConfirmConfig(null);
                                        if (cb) cb();
                                    }}
                                    style={{
                                        flex: 1,
                                        padding: '10px 14px',
                                        borderRadius: '10px',
                                        border: 'none',
                                        backgroundColor: confirmConfig.type === 'success' ? '#16a34a' : confirmConfig.type === 'info' ? '#2563eb' : '#ef4444',
                                        color: '#ffffff',
                                        fontWeight: 700,
                                        fontSize: '13px',
                                        cursor: 'pointer',
                                        textAlign: 'center',
                                        boxShadow: confirmConfig.type === 'success' ? '0 4px 14px rgba(22, 163, 74, 0.3)' : confirmConfig.type === 'info' ? '0 4px 14px rgba(37, 99, 235, 0.3)' : '0 4px 14px rgba(239, 68, 68, 0.3)'
                                    }}
                                >
                                    {confirmConfig.confirmText || "Confirmer"}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Custom confirmation toast - Centered top to bottom animation on PC */}
            <AnimatePresence>
                {showToast && (
                    <motion.div
                        className="custom-toast"
                        initial={{ opacity: 0, y: -40, x: "-50%", scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }}
                        exit={{ opacity: 0, y: -20, x: "-50%", scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 450, damping: 25 }}
                        style={{
                            position: 'fixed',
                            top: '24px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            zIndex: 99999,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '14px 24px',
                            borderRadius: '50px',
                            backgroundColor: toastIsError ? '#ef4444' : '#22c55e',
                            color: '#ffffff',
                            boxShadow: '0 12px 32px rgba(0,0,0,0.25), 0 2px 6px rgba(0,0,0,0.1)',
                            fontWeight: 700,
                            fontSize: '14px',
                            maxWidth: '90vw',
                            textAlign: 'center',
                            pointerEvents: 'none'
                        }}
                    >
                        {toastIsError ? <AlertTriangle size={18} style={{ flexShrink: 0 }} /> : <CheckCircle2 size={18} style={{ flexShrink: 0 }} />}
                        <span>{toastMessage}</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

export default SettingsPage;