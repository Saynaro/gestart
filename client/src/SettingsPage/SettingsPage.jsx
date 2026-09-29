import { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import SideBar from "../components/SideBar";
import Header from "../components/Header";
import { LegalHelpTooltip } from "../components/LegalHelpModal";
import PhoneInput from "../components/PhoneInput";
import PullToRefresh from "../components/PullToRefresh";
import { apiFetch } from "../utils/api";
import { getSocket } from "../utils/socket";
import { useUser } from "../utils/useUser";
import { useSubscription } from "../utils/useSubscription";
import { handleLogout } from "../utils/auth";
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
    Sparkles,
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
    RefreshCw,
    Palette,
    Check,
    Scale,
    ShieldCheck,
    Cookie
} from "lucide-react";

// Import Tab Components
import ProfilTab from "./components/ProfilTab";
import AffichageTab from "./components/AffichageTab";
import EntrepriseTab from "./components/EntrepriseTab";
import SecuriteTab from "./components/SecuriteTab";
import LegalRgpdTab from "./components/LegalRgpdTab";
import AbonnementTab from "./components/AbonnementTab";
import UtilisateursTab from "./components/UtilisateursTab";
import ChiffreAffairesTab from "./components/ChiffreAffairesTab";
import CotisationsTab from "./components/CotisationsTab";
import TvaTab from "./components/TvaTab";
import BanquesTab from "./components/BanquesTab";
import FacturationTab from "./components/FacturationTab";
import CommunicationTab from "./components/CommunicationTab";
import NotificationsTab from "./components/NotificationsTab";
import SupportTab from "./components/SupportTab";
import FaqTab from "./components/FaqTab";
import ParrainageTab from "./components/ParrainageTab";
import AboutTab from "./components/AboutTab";
import EInvoicingTab from "./components/EInvoicingTab";
import PaiementsTab from "./components/PaiementsTab";

const monthsList = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

function SettingsPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [unreadSupportCount, setUnreadSupportCount] = useState(0);

    // Ref to store scroll position for mobile back navigation
    const scrollYRef = useRef(0);
    // Ref to scrollable container for desktop
    const layoutContainerRef = useRef(null);

    // Form and user state initialized instantly from localStorage cache
    const [firstName, setFirstName] = useState(() => {
        try {
            const saved = JSON.parse(localStorage.getItem('currentUser') || '{}');
            return saved.firstName || "Khalid";
        } catch (e) { return "Khalid"; }
    });
    const [lastName, setLastName] = useState(() => {
        try {
            const saved = JSON.parse(localStorage.getItem('currentUser') || '{}');
            return saved.lastName || "Sainaro";
        } catch (e) { return "Sainaro"; }
    });
    const [email, setEmail] = useState(() => {
        try {
            const saved = JSON.parse(localStorage.getItem('currentUser') || '{}');
            return saved.email || "khalid.cizdoev777@gmail.com";
        } catch (e) { return "khalid.cizdoev777@gmail.com"; }
    });
    const [phone, setPhone] = useState(() => {
        try {
            const saved = JSON.parse(localStorage.getItem('currentUser') || '{}');
            return saved.phone || "0651604316";
        } catch (e) { return "0651604316"; }
    });
    const [avatarUrl, setAvatarUrl] = useState(() => {
        try {
            const saved = JSON.parse(localStorage.getItem('currentUser') || '{}');
            return saved.avatarUrl || null;
        } catch (e) { return null; }
    });
    const [civility, setCivility] = useState("");
    const [dob, setDob] = useState("");
    const [tabRefreshKey, setTabRefreshKey] = useState(0);

    const fetchUserProfile = useCallback(async () => {
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
                localStorage.setItem('currentUser', JSON.stringify(user));
            }
        } catch (err) {
            console.warn("API me non disponible:", err.message);
        }
    }, []);

    // Layout and Navigation State
    const [activeTab, setActiveTab] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get("id_connection") || params.get("banking")) {
            return "paiements";
        }
        return params.get("tab") || "profil";
    });

    const handleSettingsRefresh = useCallback(async () => {
        await fetchUserProfile();
        setTabRefreshKey(prev => prev + 1);
        window.dispatchEvent(new CustomEvent('settings_refresh', { detail: { activeTab } }));
        await new Promise(r => setTimeout(r, 450));
    }, [fetchUserProfile, activeTab]);

    useEffect(() => {
        fetchUserProfile();

        const handleProfileChanged = (e) => {
            const data = e.detail;
            if (!data) return;
            if (data.firstName) setFirstName(data.firstName);
            if (data.lastName) setLastName(data.lastName);
            if (data.phone) setPhone(data.phone);
            if (data.email) setEmail(data.email);
            if (data.avatarUrl) setAvatarUrl(data.avatarUrl);
        };
        window.addEventListener('userProfileChanged', handleProfileChanged);
        return () => window.removeEventListener('userProfileChanged', handleProfileChanged);
    }, [fetchUserProfile]);

    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState("");
    const [toastIsError, setToastIsError] = useState(false);
    const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth <= 768);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Header Auto-Save status indicator for mobile
    const [headerSaveStatus, setHeaderSaveStatus] = useState("saved"); // "saving", "saved", "error"

    useEffect(() => {
        let timer;
        const handleStatus = (e) => {
            if (e.detail?.status) {
                setHeaderSaveStatus(e.detail.status);
                if (e.detail.status === 'error') {
                    if (timer) clearTimeout(timer);
                    timer = setTimeout(() => {
                        setHeaderSaveStatus('saved');
                    }, 2500);
                }
            }
        };
        window.addEventListener('autoSaveStatus', handleStatus);
        return () => {
            window.removeEventListener('autoSaveStatus', handleStatus);
            if (timer) clearTimeout(timer);
        };
    }, []);

    const handleConfirmPhone = async () => {
        setActiveProfileSubSheet(null);
        window.dispatchEvent(new CustomEvent('autoSaveStatus', { detail: { status: 'saving' } }));
        try {
            const res = await apiFetch('/v1/users/me', {
                method: 'PATCH',
                body: JSON.stringify({ phone })
            });
            const updated = res.data?.user || res.user || { phone };
            window.dispatchEvent(new CustomEvent('userProfileChanged', { detail: { ...updated, phone } }));
            window.dispatchEvent(new CustomEvent('autoSaveStatus', { detail: { status: 'saved' } }));
        } catch (err) {
            window.dispatchEvent(new CustomEvent('userProfileChanged', { detail: { phone } }));
            window.dispatchEvent(new CustomEvent('autoSaveStatus', { detail: { status: 'error' } }));
        }
    };

    // Sync tab from URL query params
    useEffect(() => {
        const params = new URLSearchParams(location.search || window.location.search);
        const tabParam = params.get("tab");
        if (params.get("id_connection") || params.get("banking")) {
            setActiveTab("paiements");
            setMobileScreenState("detail");
            setOpenCategories(prev => ({ ...prev, "Config": true }));
        } else if (tabParam) {
            setActiveTab(tabParam);
            setMobileScreenState("detail");
            if (tabParam === "cotisations" || tabParam === "chiffre-affaires" || tabParam === "tva-config" || tabParam === "banques" || tabParam === "e-invoicing") {
                setOpenCategories(prev => ({ ...prev, "Comptabilité": true }));
            } else if (tabParam === "communication" || tabParam === "paiements" || tabParam === "facturation" || tabParam === "notifications") {
                setOpenCategories(prev => ({ ...prev, "Config": true }));
            } else if (tabParam === "support" || tabParam === "faq" || tabParam === "parrainage") {
                setOpenCategories(prev => ({ ...prev, "Communauté": true }));
            } else {
                setOpenCategories(prev => ({ ...prev, "Mon compte": true }));
            }
        }
    }, [location.search]);

    // Track unread support messages count
    useEffect(() => {
        const fetchSupportUnread = async () => {
            try {
                const res = await apiFetch("/v1/support/unread-count");
                if (res.success && typeof res.count === "number") {
                    setUnreadSupportCount(res.count);
                }
            } catch (e) {}
        };
        fetchSupportUnread();

        const socket = getSocket();
        if (socket) {
            const handleNewSupportMsg = (msg) => {
                if (msg.senderRole === "SUPERADMIN") {
                    if (activeTab === "support") {
                        setUnreadSupportCount(0);
                    } else {
                        setUnreadSupportCount(prev => prev + 1);
                    }
                }
            };
            const handleSupportRead = () => setUnreadSupportCount(0);

            socket.on("support:new_message", handleNewSupportMsg);
            socket.on("support:messages_read", handleSupportRead);

            return () => {
                socket.off("support:new_message", handleNewSupportMsg);
                socket.off("support:messages_read", handleSupportRead);
            };
        }
    }, [activeTab]);

    // When viewing support tab, clear badge and dispatch read event
    useEffect(() => {
        if (activeTab === "support") {
            setUnreadSupportCount(0);
            window.dispatchEvent(new CustomEvent("support-messages-read"));
        }
    }, [activeTab]);

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
    const [mobileScreenState, setMobileScreenState] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get("tab") || params.get("id_connection") || params.get("banking")) {
            return "detail";
        }
        return "list";
    });
    const [showUpgradeBanner, setShowUpgradeBanner] = useState(true);

    // Desktop Accordion states (closed by default, open relevant category if tab specified)
    const [openCategories, setOpenCategories] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        const tabParam = params.get("tab");
        const defaultOpen = {
            "Mon compte": false,
            "Comptabilité": false,
            "Config": false,
            "Communauté": false,
            "À propos": false
        };
        if (tabParam === "cotisations" || tabParam === "chiffre-affaires" || tabParam === "tva-config" || tabParam === "banques" || tabParam === "e-invoicing") {
            defaultOpen["Comptabilité"] = true;
        } else if (tabParam === "communication" || tabParam === "paiements" || tabParam === "facturation" || tabParam === "notifications" || params.get("id_connection") || params.get("banking")) {
            defaultOpen["Config"] = true;
        } else if (tabParam === "support" || tabParam === "faq" || tabParam === "parrainage") {
            defaultOpen["Communauté"] = true;
        } else if (tabParam) {
            defaultOpen["Mon compte"] = true;
        }
        return defaultOpen;
    });

    const [isListHeaderVisible, setIsListHeaderVisible] = useState(() => (scrollYRef.current || 0) > 24);
    const [isDetailHeaderVisible, setIsDetailHeaderVisible] = useState(false);

    const handleMobileScroll = useCallback((e) => {
        const target = e?.currentTarget || mobileScrollRef.current;
        const containerScroll = target ? target.scrollTop : 0;
        const winScroll = typeof window !== "undefined" ? (window.scrollY || document.documentElement?.scrollTop || document.body?.scrollTop || 0) : 0;
        const rootScroll = typeof document !== "undefined" ? (document.getElementById("root")?.scrollTop || 0) : 0;
        const scrollPos = Math.max(containerScroll, winScroll, rootScroll);

        if (mobileScreenState === "detail") {
            setIsDetailHeaderVisible(scrollPos > 24);
        } else {
            scrollYRef.current = scrollPos;
            setIsListHeaderVisible(scrollPos > 24);
        }
    }, [mobileScreenState]);

    // Apple Large Title pattern: hide header title when at top, reveal when scrolled past body title
    useEffect(() => {
        const container = mobileScrollRef.current;
        if (container) {
            container.addEventListener("scroll", handleMobileScroll, { passive: true });
        }
        window.addEventListener("scroll", handleMobileScroll, { passive: true });
        const rootEl = document.getElementById("root");
        if (rootEl) {
            rootEl.addEventListener("scroll", handleMobileScroll, { passive: true });
        }

        if (mobileScreenState === "detail") {
            setIsDetailHeaderVisible(false);
            const rafId = requestAnimationFrame(handleMobileScroll);
            return () => {
                if (container) container.removeEventListener("scroll", handleMobileScroll);
                window.removeEventListener("scroll", handleMobileScroll);
                if (rootEl) rootEl.removeEventListener("scroll", handleMobileScroll);
                cancelAnimationFrame(rafId);
            };
        } else {
            setIsListHeaderVisible((scrollYRef.current || 0) > 24);
            return () => {
                if (container) container.removeEventListener("scroll", handleMobileScroll);
                window.removeEventListener("scroll", handleMobileScroll);
                if (rootEl) rootEl.removeEventListener("scroll", handleMobileScroll);
            };
        }
    }, [mobileScreenState, activeTab, handleMobileScroll]);

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
        setOpenCategories((prev) => {
            const willOpen = !prev[title];
            if (willOpen && title === "Communauté") {
                handleTabSelect("support");
            }
            return {
                ...prev,
                [title]: willOpen
            };
        });
        if (title === "Communauté" && openCategories[title] && activeTab !== "support") {
            handleTabSelect("support");
        }
    };

    const [confirmConfig, setConfirmConfig] = useState(null);
    const toastTimeoutRef = useRef(null);
    const [viewportHeight, setViewportHeight] = useState(null);

    useEffect(() => {
        if (typeof window === "undefined" || !window.visualViewport) return;

        const updateViewport = () => {
            if (window.visualViewport) {
                setViewportHeight(window.visualViewport.height);
            }
        };

        updateViewport();
        window.visualViewport.addEventListener("resize", updateViewport);
        window.visualViewport.addEventListener("scroll", updateViewport);

        return () => {
            window.visualViewport?.removeEventListener("resize", updateViewport);
            window.visualViewport?.removeEventListener("scroll", updateViewport);
        };
    }, []);

    const triggerToast = useCallback((message, isError = false) => {
        if (toastTimeoutRef.current) {
            clearTimeout(toastTimeoutRef.current);
            toastTimeoutRef.current = null;
        }
        setToastMessage(message);
        setToastIsError(isError);
        setShowToast(true);

        toastTimeoutRef.current = setTimeout(() => {
            setShowToast(false);
            toastTimeoutRef.current = null;
        }, 3500);
    }, []);

    const handleToastMouseEnter = () => {
        if (toastTimeoutRef.current) {
            clearTimeout(toastTimeoutRef.current);
            toastTimeoutRef.current = null;
        }
    };

    const handleToastMouseLeave = () => {
        if (toastTimeoutRef.current) {
            clearTimeout(toastTimeoutRef.current);
        }
        toastTimeoutRef.current = setTimeout(() => {
            setShowToast(false);
            toastTimeoutRef.current = null;
        }, 2000);
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

    const { role } = useUser();
    const isTechnician = role === "TECHNICIAN";
    const { displayName, isUnlimited, isExpired } = useSubscription();

    // Configuration of Menu Categories (Filtered dynamically for Technicians vs Owners/Managers)
    const menuCategories = useMemo(() => {
        if (isTechnician) {
            return [
                {
                    title: "Mon compte",
                    items: [
                        { id: "profil", label: "Profil", icon: User, subtitle: "Vos informations personnelles" },
                        { id: "affichage", label: "Affichage", icon: Palette, subtitle: "Thème et langue de l'interface" },
                        { id: "securite", label: "Sécurité", icon: Lock, subtitle: "Email, mot de passe et connexion" }
                    ]
                },
                {
                    title: "Config",
                    items: [
                        { id: "notifications", label: "Notifications", icon: Bell, subtitle: "Canaux et alertes interventions" }
                    ]
                },
                {
                    title: "Communauté",
                    items: [
                        { id: "faq", label: "FAQ & Centre d'aide", icon: HelpCircle, subtitle: "Guides et fiches pratiques" }
                    ]
                },
                {
                    title: "À propos",
                    items: [
                        { id: "mentions", label: "Mentions", icon: FileText, subtitle: "Mentions légales" },
                        { id: "cgu", label: "CGU", icon: BookOpen, subtitle: "Conditions Générales d'Utilisation" },
                        { id: "confidentialite", label: "Confidentialité", icon: ShieldCheck, subtitle: "Politique de confidentialité" },
                        { id: "cookies", label: "Cookies", icon: Cookie, subtitle: "Gestion & politique des cookies" }
                    ]
                }
            ];
        }

        return [
            {
                title: "Mon compte",
                items: [
                    { id: "profil", label: "Profil", icon: User, subtitle: "Vos informations personnelles" },
                    { id: "affichage", label: "Affichage", icon: Palette, subtitle: "Thème et langue de l'interface" },
                    { id: "ma-societe", label: "Entreprise", icon: Building, subtitle: "Coordonnées et statut juridique" },
                    { id: "securite", label: "Sécurité", icon: Lock, subtitle: "Email, mot de passe et connexion" },
                    { id: "rgpd-legal", label: "Légal & RGPD", icon: Scale, subtitle: "Exportation de données et droits" },
                    { id: "abonnement", label: "Abonnement", icon: CreditCard, subtitle: "Gérez votre offre GestArt" }
                ]
            },
            {
                title: "Comptabilité",
                items: [
                    { id: "chiffre-affaires", label: "Chiffre d'affaires", icon: Calculator, subtitle: "Plafonds et CA annuel" },
                    { id: "cotisations", label: "Cotisations sociales", icon: Percent, subtitle: "Taux et calcul de cotisations" },
                    { id: "tva-config", label: "TVA", icon: Receipt, subtitle: "Taux de TVA et déclarations" },
                    { id: "e-invoicing", label: "Facturation électronique", icon: CheckCircle2, subtitle: "Plateforme Agréée (B2Brouter)" },
                    { id: "banques", label: "Banques", icon: Building, subtitle: "Gérez vos coordonnées bancaires" }
                ]
            },
            {
                title: "Config",
                items: [
                    { id: "communication", label: "Communication & Canaux", icon: MessageSquare, subtitle: "Twilio SMS, WhatsApp Business, Email" },
                    { id: "paiements", label: "Paiements", icon: CreditCard, subtitle: "Stripe Connect et virements" },
                    { id: "facturation", label: "Facturation", icon: Receipt, subtitle: "Réglages de facturation" },
                    { id: "notifications", label: "Notifications", icon: Bell, subtitle: "Canaux et fréquences" }
                ]
            },
            {
                title: "Communauté",
                items: [
                    { id: "support", label: "Support direct", icon: MessageSquare, subtitle: "Discussion en direct avec GestArt", badge: unreadSupportCount > 0 ? unreadSupportCount : undefined },
                    { id: "faq", label: "FAQ & Centre d'aide", icon: HelpCircle, subtitle: "Guides et fiches pratiques" },
                    { id: "parrainage", label: "Parrainage", icon: Gift, subtitle: "Gagnez des cadeaux" }
                ]
            },
            {
                title: "À propos",
                items: [
                    { id: "mentions", label: "Mentions", icon: FileText, subtitle: "Mentions légales" },
                    { id: "cgu", label: "CGU", icon: BookOpen, subtitle: "Conditions Générales d'Utilisation" },
                    { id: "confidentialite", label: "Confidentialité", icon: Lock, subtitle: "Politique de confidentialité" },
                    { id: "cookies", label: "Cookies", icon: Cookie, subtitle: "Gestion & politique des cookies" }
                ]
            }
        ];
    }, [isTechnician]);

    // Ensure activeTab is accessible for current role
    useEffect(() => {
        if (isTechnician) {
            const allowedIds = menuCategories.flatMap(c => c.items.map(i => i.id));
            if (!allowedIds.includes(activeTab)) {
                setActiveTab("profil");
            }
        }
    }, [isTechnician, menuCategories, activeTab]);

    // Ref to mobile scroll container
    const mobileScrollRef = useRef(null);

    // Helper to restore previous scroll position when navigating back to the main list
    const restoreListScroll = useCallback(() => {
        const targetY = scrollYRef.current || 0;
        if (mobileScrollRef.current) {
            mobileScrollRef.current.scrollTop = targetY;
        }
        if (typeof window !== "undefined") {
            window.scrollTo({ top: targetY, behavior: "instant" });
        }
    }, []);

    // Helper to reset scroll to top across containers when in detail view
    const scrollToTop = useCallback(() => {
        if (layoutContainerRef.current) {
            layoutContainerRef.current.scrollTop = 0;
            if (typeof layoutContainerRef.current.scrollTo === "function") {
                layoutContainerRef.current.scrollTo({ top: 0, left: 0, behavior: "instant" });
            }
        }
        if (mobileScrollRef.current) {
            mobileScrollRef.current.scrollTop = 0;
            if (typeof mobileScrollRef.current.scrollTo === "function") {
                mobileScrollRef.current.scrollTo({ top: 0, left: 0, behavior: "instant" });
            }
        }
        if (typeof window !== "undefined") {
            window.scrollTo({ top: 0, left: 0, behavior: "instant" });
            if (document.documentElement) document.documentElement.scrollTop = 0;
            if (document.body) document.body.scrollTop = 0;
        }
        const selectors = [
            ".mobile-settings-scroll-container",
            ".mobile-tab-content-wrapper",
            ".mobile-settings-view",
            ".settings-layout-container",
            ".main-content",
            ".settings-main-panel",
            ".settings-content-panel",
            ".pull-to-refresh-container",
            ".ptr-content",
            "#root"
        ];
        selectors.forEach(sel => {
            const els = document.querySelectorAll(sel);
            els.forEach(el => {
                if (el) {
                    el.scrollTop = 0;
                    if (typeof el.scrollTo === "function") {
                        el.scrollTo({ top: 0, left: 0, behavior: "instant" });
                    }
                }
            });
        });
    }, []);

    const handleBackFromDetail = useCallback(() => {
        setIsDetailHeaderVisible(false);
        setIsListHeaderVisible((scrollYRef.current || 0) > 24);
        if (typeof window !== "undefined" && window.history.state?.settingsDetail) {
            window.history.back();
        } else {
            setMobileScreenState("list");
            restoreListScroll();
            setTimeout(restoreListScroll, 0);
            setTimeout(restoreListScroll, 30);
        }
    }, [restoreListScroll]);

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
                setIsDetailHeaderVisible(false);
                setMobileScreenState("detail");
                if (e.state.tab) {
                    setActiveTab(e.state.tab);
                }
            } else {
                setIsDetailHeaderVisible(false);
                setIsListHeaderVisible((scrollYRef.current || 0) > 24);
                setMobileScreenState("list");
                restoreListScroll();
                setTimeout(restoreListScroll, 0);
                setTimeout(restoreListScroll, 30);
            }
        };

        window.addEventListener("popstate", handlePopState);
        return () => window.removeEventListener("popstate", handlePopState);
    }, [restoreListScroll]);

    // Scroll management: scroll to top in detail tab, restore previous scroll in main list
    useLayoutEffect(() => {
        if (mobileScreenState === "detail") {
            scrollToTop();
            const rafId = requestAnimationFrame(scrollToTop);
            const timerId1 = setTimeout(scrollToTop, 25);
            const timerId2 = setTimeout(scrollToTop, 80);
            const timerId3 = setTimeout(scrollToTop, 180);
            const timerId4 = setTimeout(scrollToTop, 350);
            const timerId5 = setTimeout(scrollToTop, 600);
            return () => {
                cancelAnimationFrame(rafId);
                clearTimeout(timerId1);
                clearTimeout(timerId2);
                clearTimeout(timerId3);
                clearTimeout(timerId4);
                clearTimeout(timerId5);
            };
        } else {
            restoreListScroll();
            const rafId = requestAnimationFrame(restoreListScroll);
            const timerId1 = setTimeout(restoreListScroll, 20);
            const timerId2 = setTimeout(restoreListScroll, 60);
            const timerId3 = setTimeout(restoreListScroll, 120);
            return () => {
                cancelAnimationFrame(rafId);
                clearTimeout(timerId1);
                clearTimeout(timerId2);
                clearTimeout(timerId3);
            };
        }
    }, [activeTab, mobileScreenState, scrollToTop, restoreListScroll]);

    // Auto-scroll input into center view on mobile when focused & handle card click
    useEffect(() => {
        if (!isMobile) return;

        const scrollToElementCenter = (el) => {
            if (!el) return;
            const container = el.closest('.mobile-input-card') || el.closest('.form-field') || el.closest('.form-group') || el;
            if (container && typeof container.scrollIntoView === 'function') {
                container.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
            }
        };

        const handleFocusIn = (e) => {
            if (activeTab === "support") return;
            const target = e.target;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
                // Immediate scroll
                scrollToElementCenter(target);
                // Staggered scrolls to adjust as mobile virtual keyboard expands
                setTimeout(() => scrollToElementCenter(target), 120);
                setTimeout(() => scrollToElementCenter(target), 320);
                setTimeout(() => scrollToElementCenter(target), 500);
            }
        };

        const handleCardClick = (e) => {
            if (activeTab === "support") return;
            const card = e.target.closest('.mobile-input-card');
            if (card && !card.classList.contains('select') && !card.classList.contains('no-autofocus')) {
                // If not clicking directly on an input, button or link, focus the first text input inside
                if (!['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT', 'A'].includes(e.target.tagName) && !e.target.closest('button')) {
                    const input = card.querySelector('input:not([type="file"]):not([type="checkbox"]):not([type="radio"]), textarea, select');
                    if (input) {
                        input.focus();
                        scrollToElementCenter(input);
                        setTimeout(() => scrollToElementCenter(input), 280);
                    }
                }
            }
        };

        // Also handle mobile visualViewport resize when virtual keyboard opens
        const handleViewportResize = () => {
            if (activeTab === "support") return;
            const activeEl = document.activeElement;
            if (activeEl && ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeEl.tagName)) {
                scrollToElementCenter(activeEl);
            }
        };

        window.addEventListener('focusin', handleFocusIn);
        window.addEventListener('click', handleCardClick);
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleViewportResize);
        }

        return () => {
            window.removeEventListener('focusin', handleFocusIn);
            window.removeEventListener('click', handleCardClick);
            if (window.visualViewport) {
                window.visualViewport.removeEventListener('resize', handleViewportResize);
            }
        };
    }, [isMobile]);

    // Helper to change tab
    const handleTabSelect = useCallback((itemId) => {
        if (itemId === "mentions") {
            navigate("/mentions-legales");
            return;
        }
        if (itemId === "cgu") {
            navigate("/cgu");
            return;
        }
        if (itemId === "confidentialite") {
            navigate("/confidentialite");
            return;
        }
        if (itemId === "cookies") {
            navigate("/cookies");
            return;
        }

        if (mobileScrollRef.current) {
            scrollYRef.current = mobileScrollRef.current.scrollTop;
        }
        setIsDetailHeaderVisible(false);
        setActiveTab(itemId);
        if (typeof window !== "undefined" && window.innerWidth <= 768) {
            if (mobileScreenState === "list" && mobileScrollRef.current) {
                mobileScrollRef.current.scrollTop = 0;
            }
            if (mobileScreenState === "detail") {
                window.history.replaceState({ settingsDetail: true, tab: itemId }, "", window.location.href);
            } else {
                window.history.pushState({ settingsDetail: true, tab: itemId }, "", window.location.href);
                setMobileScreenState("detail");
            }
        }
        scrollToTop();
        requestAnimationFrame(scrollToTop);
        setTimeout(scrollToTop, 20);
        setTimeout(scrollToTop, 80);
        setTimeout(scrollToTop, 180);
        setTimeout(scrollToTop, 350);
        setTimeout(scrollToTop, 600);
    }, [mobileScreenState, scrollToTop]);

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
                key={`${activeTab}-${tabRefreshKey}`}
                initial={isMobileView ? { opacity: 1 } : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: isMobileView ? 0 : 0.2 }}
                onAnimationComplete={scrollToTop}
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
                        case "affichage":
                            return <AffichageTab isMobileView={isMobileView} triggerToast={triggerToast} />;
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
                        case "paiements":
                            return <PaiementsTab isMobileView={isMobileView} triggerToast={triggerToast} triggerConfirm={triggerConfirm} />;
                        case "facturation":
                            return <FacturationTab isMobileView={isMobileView} triggerToast={triggerToast} triggerConfirm={triggerConfirm} />;
                        case "e-invoicing":
                            return <EInvoicingTab isMobileView={isMobileView} triggerToast={triggerToast} triggerConfirm={triggerConfirm} />;
                        case "communication":
                            return <CommunicationTab isMobileView={isMobileView} triggerToast={triggerToast} triggerConfirm={triggerConfirm} />;
                        case "notifications":
                            return <NotificationsTab isMobileView={isMobileView} triggerToast={triggerToast} triggerConfirm={triggerConfirm} />;
                        case "support":
                            return <SupportTab isMobileView={isMobileView} triggerToast={triggerToast} triggerConfirm={triggerConfirm} />;
                        case "faq":
                            return <FaqTab isMobileView={isMobileView} triggerToast={triggerToast} onOpenSupport={() => handleTabSelect("support")} />;
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
            <motion.div
                className="mobile-settings-view"
                style={{ 
                    backgroundColor: 'var(--background)',
                    ...(viewportHeight ? { 
                        height: `${viewportHeight}px`,
                        maxHeight: `${viewportHeight}px`
                    } : {})
                }}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                onTouchStart={isDetail ? handleTouchStart : undefined}
                onTouchEnd={isDetail ? handleTouchEnd : undefined}
            >
                {/* Stable Fixed Sticky Header */}
                <div className="mobile-nav-header" style={{ position: 'relative' }}>
                    <div style={{ width: '40px', display: 'flex', alignItems: 'center', zIndex: 2 }}>
                        {isDetail && (
                            <button
                                className="mobile-back-circle"
                                onClick={handleBackFromDetail}
                                title="Retour"
                                aria-label="Retour"
                            >
                                <ArrowLeft size={16} />
                            </button>
                        )}
                    </div>

                    <span
                        className="mobile-nav-header-title"
                        style={{
                            position: 'absolute',
                            left: '50%',
                            top: 'calc(env(safe-area-inset-top, 0px) + 28px)',
                            transform: (isDetail ? (isDetailHeaderVisible || activeTab === "support") : isListHeaderVisible) ? 'translate(-50%, -50%)' : 'translate(-50%, -36%)',
                            opacity: (isDetail ? (isDetailHeaderVisible || activeTab === "support") : isListHeaderVisible) ? 1 : 0,
                            fontSize: '17px',
                            fontWeight: 800,
                            color: 'var(--foreground)',
                            maxWidth: 'calc(100% - 120px)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            pointerEvents: 'none',
                            textAlign: 'center',
                            transition: 'opacity 0.22s cubic-bezier(0.16, 1, 0.3, 1), transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                    >
                        {isDetail ? (activeTab === "support" ? "Support direct" : currentItem.label) : "Paramètres"}
                    </span>

                    <div style={{ marginLeft: 'auto', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', zIndex: 2 }}>
                        {isDetail && (
                            activeTab === "profil" || 
                            activeTab === "entreprise" || 
                            activeTab === "ma-societe" || 
                            activeTab === "facturation" || 
                            activeTab === "notifications" ||
                            activeTab === "tva-config" ||
                            activeTab === "cotisations" ||
                            activeTab === "chiffre-affaires" ||
                            activeTab === "paiements"
                        ) && (
                            <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '11px',
                                fontWeight: 600,
                                color: headerSaveStatus === 'saving' ? 'var(--primary, #5F4BDB)' : headerSaveStatus === 'error' ? '#EF4444' : '#10B981',
                                backgroundColor: headerSaveStatus === 'saving' ? 'rgba(95, 75, 219, 0.08)' : headerSaveStatus === 'error' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                                padding: '3px 8px',
                                borderRadius: '12px',
                                transition: 'all 0.25s ease'
                            }}>
                                {headerSaveStatus === 'saving' ? (
                                    <RefreshCw size={11} className="spin-animation" />
                                ) : (
                                    <Check size={11} />
                                )}
                                <span>{headerSaveStatus === 'saving' ? 'Enregistrement...' : headerSaveStatus === 'error' ? 'Erreur' : 'Enregistré'}</span>
                            </div>
                        )}
                    </div>
                </div>

                {isDetail && activeTab === "support" ? (
                    <div style={{
                        flex: 1,
                        minHeight: 0,
                        height: '100%',
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        backgroundColor: 'var(--background)'
                    }}>
                        <SupportTab isMobileView={true} triggerToast={triggerToast} triggerConfirm={triggerConfirm} />
                    </div>
                ) : (
                    <div className="mobile-settings-scroll-container" ref={mobileScrollRef} onScroll={handleMobileScroll}>
                        <PullToRefresh onRefresh={handleSettingsRefresh}>
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

                                    {/* Clean & compact subscription badge */}
                                    {!isTechnician && (
                                        <button
                                            type="button"
                                            className="mobile-plan-pill-badge"
                                            onClick={() => handleTabSelect("abonnement")}
                                            title={isExpired ? "Abonnement expiré — Cliquez pour renouveler" : "Gérer votre abonnement"}
                                        >
                                            {isExpired && (
                                                <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#ef4444", flexShrink: 0 }} />
                                            )}
                                            <span className="pill-badge-title">
                                                {isExpired ? "Abonnement expiré" : `Plan ${displayName || "Pro"}`}
                                            </span>
                                            <span className="pill-badge-dot">·</span>
                                            <span className="pill-badge-action">
                                                {isExpired ? "Renouveler" : "Gérer"}
                                            </span>
                                            <ChevronRight size={13} className="pill-badge-arrow" />
                                        </button>
                                    )}
                                </div>

                                {/* Categories and Rows */}
                                <div className="mobile-group-container">
                                    {menuCategories.map((category) => (
                                        <div key={category.title} className="mobile-group-section">
                                            <h4 className="mobile-group-header" style={{ display: 'flex', alignItems: 'center' }}>
                                                <span>{category.title}</span>
                                            </h4>
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
                                                            {item.id === "support" && unreadSupportCount > 0 && (
                                                                <span style={{ backgroundColor: '#ef4444', color: '#fff', fontSize: '11px', fontWeight: 800, padding: '2px 7px', borderRadius: '50px', marginLeft: 'auto', marginRight: '6px' }}>
                                                                    {unreadSupportCount}
                                                                </span>
                                                            )}
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

                                    {/* Logout Row */}
                                    <div className="mobile-group-section" style={{ marginBottom: '24px' }}>
                                        <div className="mobile-items-card">
                                            <button className="mobile-settings-row-btn" type="button" onClick={() => {
                                                triggerConfirm({
                                                    title: "Déconnexion de GestArt",
                                                    message: "Êtes-vous sûr(e) de vouloir vous déconnecter de votre compte ?",
                                                    confirmText: "Oui, me déconnecter",
                                                    cancelText: "Annuler",
                                                    onConfirm: () => handleLogout(navigate)
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
                            </div>

                            {/* Detail View Container - Kept mounted with CSS display toggle */}
                            <div className="mobile-tab-content-wrapper" style={{ display: isDetail ? 'block' : 'none' }}>
                                <h1 className="mobile-header-title">{currentItem.label}</h1>

                                {/* Render active form detail */}
                                {renderTabContent(true)}
                            </div>
                        </PullToRefresh>
                    </div>
                )}

                <SideBar hideNavOnMobile={isMobile && isDetail && activeTab === "support"} />

                {/* Profile Sub-Sheets (z-index 2200) */}
                {createPortal(
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
                                    style={{ maxHeight: '92vh', paddingBottom: 'max(20px, env(safe-area-inset-bottom))', willChange: "transform", transform: "translate3d(0, 0, 0)", contain: "paint layout" }}
                                    initial={{ y: "100%" }}
                                    animate={{ y: 0 }}
                                    exit={{ y: "100%" }}
                                    transition={{ type: "tween", ease: [0.32, 0.72, 0, 1], duration: 0.28 }}
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
                                            <div className="mobile-sheet-body-stack" style={{ padding: '10px 16px 20px 16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                                <PhoneInput
                                                    value={phone}
                                                    onChange={(formatted) => setPhone(formatted)}
                                                />

                                                <button className="mobile-sub-sheet-confirm-btn" onClick={handleConfirmPhone}>
                                                    Valider ce numéro
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>,
                    document.body
                )}
            </motion.div>
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
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span>{category.title}</span>
                                                {category.title === "Communauté" && !isOpen && unreadSupportCount > 0 && (
                                                    <span style={{ backgroundColor: '#ef4444', color: '#fff', fontSize: '10px', fontWeight: 800, padding: '1px 6px', borderRadius: '50px' }}>
                                                        {unreadSupportCount}
                                                    </span>
                                                )}
                                            </span>
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
                                                                        {item.id === "support" && unreadSupportCount > 0 && (
                                                                            <span style={{ backgroundColor: '#ef4444', color: '#fff', fontSize: '10px', fontWeight: 800, padding: '1px 6px', borderRadius: '50px', marginLeft: 'auto' }}>
                                                                                {unreadSupportCount}
                                                                            </span>
                                                                        )}
                                                                        {item.badge && (
                                                                            <span style={{ backgroundColor: 'var(--sidebar-primary)', color: '#fff', fontSize: '9px', fontWeight: 800, padding: '1px 6px', borderRadius: '50px', marginLeft: item.id === "support" && unreadSupportCount > 0 ? '4px' : 'auto' }}>
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
                            <button
                                onClick={() => {
                                    triggerConfirm({
                                        title: "Déconnexion de GestArt",
                                        message: "Êtes-vous sûr(e) de vouloir vous déconnecter de votre compte ?",
                                        confirmText: "Oui, me déconnecter",
                                        cancelText: "Annuler",
                                        onConfirm: () => handleLogout(navigate)
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

                        <PullToRefresh onRefresh={handleSettingsRefresh}>
                            <motion.div 
                                className="settings-layout-container" 
                                ref={layoutContainerRef}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                            >
                                <div className="settings-content-panel">
                                    <AnimatePresence mode="wait">
                                        {renderTabContent(false)}
                                    </AnimatePresence>
                                </div>
                            </motion.div>
                        </PullToRefresh>
                    </div>
                </div>
            )}

            {/* Custom Confirmation Dialog Toast for destructive actions */}
            {createPortal(
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
                </AnimatePresence>,
                document.body
            )}

            {/* Custom confirmation toast - Smooth top slide-in & slide-out, pause on hover */}
            <AnimatePresence mode="wait">
                {showToast && (
                    <motion.div
                        key={toastMessage}
                        initial={{ opacity: 0, y: -36, x: "-50%" }}
                        animate={{ opacity: 1, y: 0, x: "-50%" }}
                        exit={{ opacity: 0, y: -24, x: "-50%" }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        onMouseEnter={handleToastMouseEnter}
                        onMouseLeave={handleToastMouseLeave}
                        onClick={() => {
                            if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
                            setShowToast(false);
                        }}
                        className={`toast-notification custom-toast ${toastIsError ? 'error' : 'success'}`}
                        style={{
                            pointerEvents: "auto",
                            cursor: "pointer",
                            userSelect: "none"
                        }}
                        title="Cliquer pour masquer"
                    >
                        {toastIsError ? (
                            <AlertTriangle size={18} style={{ color: "#EF4444", flexShrink: 0 }} />
                        ) : (
                            <CheckCircle2 size={18} style={{ color: "#10B981", flexShrink: 0 }} />
                        )}
                        <span>{toastMessage}</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

export default SettingsPage;