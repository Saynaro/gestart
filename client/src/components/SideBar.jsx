import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import "./SideBar.css";
import BottomSheet from "./BottomSheet";
import { Icons, menuSections, mobileTabBarItems } from "./navigationConstants";
import { handleLogout } from "../utils/auth";
import { useSubscription } from "../utils/useSubscription";
import { useUser } from "../utils/useUser";

function SideBar({ onFabClick, hideFab = false }) {
    const navigate = useNavigate();
    const location = useLocation();
    const activePath = location.pathname || "/home";
    const [bottomSheetOpen, setBottomSheetOpen] = useState(false);
    const { isStarter, displayName } = useSubscription();
    const { fullName, initials, email, avatarUrl } = useUser();

    // Close bottom sheet on route changes (including back navigation)
    useEffect(() => {
        setBottomSheetOpen(false);
    }, [location.pathname]);

    // Intercept back gesture / button to close Plus bottom sheet
    useEffect(() => {
        if (!bottomSheetOpen) return;

        window.history.pushState({ modal: "sidebar-plus-menu" }, "");

        const handlePopState = () => {
            setBottomSheetOpen(false);
        };

        window.addEventListener("popstate", handlePopState);
        return () => {
            window.removeEventListener("popstate", handlePopState);
        };
    }, [bottomSheetOpen]);

    const [isCollapsed, setIsCollapsed] = useState(() => {
        const stored = localStorage.getItem("sidebar-expanded");
        return stored === null ? false : stored === "false";
    });
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    const toggleCollapse = () => {
        const nextState = !isCollapsed;
        setIsCollapsed(nextState);
        localStorage.setItem("sidebar-expanded", nextState ? "false" : "true");
    };

    const toggleUserMenu = (e) => {
        e.stopPropagation();
        setUserMenuOpen(!userMenuOpen);
    };

    useEffect(() => {
        if (!userMenuOpen) return;
        const closeMenu = () => setUserMenuOpen(false);
        window.addEventListener("click", closeMenu);
        return () => window.removeEventListener("click", closeMenu);
    }, [userMenuOpen]);

    const navigateTo = (e, path) => {
        e.preventDefault();
        if (bottomSheetOpen) {
            setBottomSheetOpen(false);
            setTimeout(() => {
                navigate(path);
            }, 300);
        } else {
            navigate(path);
        }
    };

    // FAB Button Configuration
    const getFabConfig = () => {
        const path = activePath.toLowerCase();
        if (path.includes("client")) {
            return { label: "Nouveau client", icon: Icons.plus };
        }
        if (path.includes("planning")) {
            return { label: "Nouvelle intervention", icon: Icons.plus };
        }
        if (path.includes("factures")) {
            return { label: "Nouvelle facture", icon: Icons.plus };
        }
        if (path.includes("devis")) {
            return { label: "Nouveau devis", icon: Icons.plus };
        }
        return null;
    };

    const fabConfig = getFabConfig();

    // Scroll state tracking to collapse/expand FAB
    const [isFabCollapsed, setIsFabCollapsed] = useState(false);

    useEffect(() => {
        let lastScrollY = 0;
        const handleScroll = (e) => {
            const target = e.target;
            // Support both window scroll and container-level scroll (like in /clients)
            const currentScrollY = (target === document || target === window) ? window.scrollY : target.scrollTop;
            if (currentScrollY > lastScrollY && currentScrollY > 20) {
                setIsFabCollapsed(true);
            } else if (currentScrollY < lastScrollY) {
                setIsFabCollapsed(false);
            }
            lastScrollY = currentScrollY;
        };
        window.addEventListener("scroll", handleScroll, { capture: true, passive: true });
        return () => window.removeEventListener("scroll", handleScroll, { capture: true });
    }, []);

    return (
        <>
            {/* Desktop Sidebar Layout */}
            <div className={`sidebar ${isCollapsed ? "collapsed" : ""}`}>
                <div className="sidebar-top">
                    <div className="logo-container">
                        <div className="logo-icon-bg">
                            <svg className="logo-snowflake" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="2" x2="12" y2="22"></line>
                                <line x1="2" y1="12" x2="22" y2="12"></line>
                                <path d="M20 16.5 12 12 20 7.5"></path>
                                <path d="M4 7.5 12 12 4 16.5"></path>
                                <path d="M7.5 20 12 12 16.5 20"></path>
                                <path d="M16.5 4 12 12 7.5 4"></path>
                            </svg>
                        </div>
                        <span className="logo-text">GestArt</span>
                        <button 
                            className="sidebar-toggle-btn"
                            onClick={toggleCollapse}
                            title={isCollapsed ? "Agrandir le menu" : "Réduire le menu"}
                        >
                            {isCollapsed ? (
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                    <line x1="9" y1="3" x2="9" y2="21"></line>
                                    <polyline points="12 8 16 12 12 16"></polyline>
                                </svg>
                            ) : (
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                    <line x1="9" y1="3" x2="9" y2="21"></line>
                                    <polyline points="16 16 12 12 16 8"></polyline>
                                </svg>
                            )}
                        </button>
                    </div>
                    {menuSections.map((section, sIndex) => (
                        <div key={sIndex} className="sidebar-section">
                            <h2 className="section-title">{section.category}</h2>
                            <ul className="menu-list">
                                {section.items.map((item, iIndex) => {
                                    const isActive = item.path === activePath || (item.path === "/home" && (activePath === "/" || activePath === "/home"));
                                    const badge = (item.proOnly && isStarter) ? "PRO" : item.badge;
                                    return (
                                        <li key={iIndex} className={`menu-item ${isActive ? "active" : ""}`}>
                                            <a 
                                                href={item.path} 
                                                onClick={(e) => navigateTo(e, item.path)} 
                                                className="menu-link"
                                                data-tooltip={item.title}
                                            >
                                                <span className="icon-wrapper">{Icons[item.iconKey]}</span>
                                                <span className="item-title">{item.title}</span>
                                                {badge !== undefined && (
                                                    <span className={`badge ${typeof badge === "number" ? "badge-numeric" : "badge-text"} ${badge === "PRO" ? "badge-pro" : ""}`}
                                                        style={badge === "PRO" ? { background: 'linear-gradient(135deg, #5B4DDB, #7C3AED)', color: '#FFF', fontSize: '9.5px', fontWeight: 800, padding: '2px 6px', borderRadius: '6px' } : {}}>
                                                        {badge}
                                                    </span>
                                                )}
                                            </a>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                </div>
                <div className="sidebar-bottom">
                    <div className="user-profile" onClick={toggleUserMenu}>
                        <div className="avatar" style={{ overflow: 'hidden' }} data-tooltip={isCollapsed ? `${fullName} (Offre ${displayName})` : undefined}>
                            {avatarUrl ? (
                                <img src={avatarUrl} alt={fullName} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
                            ) : (
                                initials
                            )}
                        </div>
                        <div className="user-details">
                            <span className="username">{fullName}</span>
                            <span className="user-plan">Offre {displayName}</span>
                        </div>
                        {!isCollapsed && (
                            <button 
                                className="logout-btn" 
                                title="Déconnexion" 
                                data-tooltip="Déconnexion"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleLogout(navigate);
                                }}
                            >
                                {Icons.logout}
                            </button>
                        )}
                        
                        {userMenuOpen && (
                            <div className="user-popover-menu" onClick={(e) => e.stopPropagation()}>
                                <div className="user-popover-header">
                                    <div className="popover-avatar" style={{ overflow: 'hidden' }}>
                                        {avatarUrl ? (
                                            <img src={avatarUrl} alt={fullName} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
                                        ) : (
                                            initials
                                        )}
                                    </div>
                                    <div className="popover-user-info">
                                        <span className="popover-username">{fullName}</span>
                                        <span className="popover-email">{email}</span>
                                        <span className="popover-plan">Offre {displayName}</span>
                                    </div>
                                </div>
                                <button className="popover-upgrade-btn" onClick={(e) => navigateTo(e, "/premium")}>
                                    Passer au niveau supérieur
                                </button>
                                <div className="popover-divider"></div>
                                <ul className="popover-list">
                                    <li className="popover-item" onClick={(e) => navigateTo(e, "/settings")}>
                                        <span className="popover-item-icon">{Icons.settings}</span>
                                        <span className="popover-item-text">Paramètres</span>
                                    </li>
                                    <li className="popover-item" onClick={(e) => navigateTo(e, "/settings?tab=profil")}>
                                        <span className="popover-item-icon">
                                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                                <circle cx="12" cy="7" r="4"></circle>
                                            </svg>
                                        </span>
                                        <span className="popover-item-text">Profil</span>
                                    </li>
                                    <li className="popover-item" onClick={(e) => navigateTo(e, "/settings?tab=entreprise")}>
                                        <span className="popover-item-icon">
                                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
                                                <line x1="9" y1="22" x2="9" y2="16"></line>
                                                <line x1="8" y1="6" x2="16" y2="6"></line>
                                                <line x1="8" y1="10" x2="16" y2="10"></line>
                                                <line x1="12" y1="14" x2="16" y2="14"></line>
                                            </svg>
                                        </span>
                                        <span className="popover-item-text">Mon entreprise</span>
                                    </li>
                                    <li className="popover-item" onClick={(e) => navigateTo(e, "/settings?tab=abonnement")}>
                                        <span className="popover-item-icon">
                                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                                                <line x1="1" y1="10" x2="23" y2="10"></line>
                                            </svg>
                                        </span>
                                        <span className="popover-item-text">Paiements / abonnement</span>
                                    </li>
                                </ul>
                                <div className="popover-divider"></div>
                                <div className="popover-item danger" onClick={() => { setUserMenuOpen(false); setShowLogoutModal(true); }}>
                                    <span className="popover-item-icon">
                                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                            <polyline points="16 17 21 12 16 7"></polyline>
                                            <line x1="21" y1="12" x2="9" y2="12"></line>
                                        </svg>
                                    </span>
                                    <span className="popover-item-text">Déconnexion</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Logout Confirmation Modal */}
            {showLogoutModal && (
                <div style={{
                    position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)',
                    backdropFilter: 'blur(8px)', zIndex: 999999, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', padding: '20px'
                }}>
                    <div style={{
                        backgroundColor: 'var(--card, #FFFFFF)', border: '1px solid var(--border, #E2E8F0)',
                        borderRadius: '24px', padding: '28px', maxWidth: '400px', width: '100%',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.25)', textAlign: 'center'
                    }}>
                        <div style={{
                            width: '52px', height: '52px', borderRadius: '16px',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#EF4444',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 16px auto'
                        }}>
                            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                <polyline points="16 17 21 12 16 7"></polyline>
                                <line x1="21" y1="12" x2="9" y2="12"></line>
                            </svg>
                        </div>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', fontWeight: 800, color: 'var(--foreground, #0F172A)' }}>
                            Déconnexion
                        </h3>
                        <p style={{ margin: '0 0 24px 0', fontSize: '0.9rem', color: 'var(--muted-foreground, #64748B)', lineHeight: 1.5 }}>
                            Êtes-vous sûr(e) de vouloir vous déconnecter de votre compte GestArt ?
                        </p>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                type="button"
                                onClick={() => setShowLogoutModal(false)}
                                style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid var(--border, #CBD5E1)', backgroundColor: 'transparent', fontWeight: 700, cursor: 'pointer', color: 'var(--foreground, #0F172A)' }}
                            >
                                Annuler
                            </button>
                            <button
                                type="button"
                                onClick={() => { setShowLogoutModal(false); handleLogout(navigate); }}
                                style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', backgroundColor: '#EF4444', color: '#FFF', fontWeight: 800, cursor: 'pointer' }}
                            >
                                Oui, me déconnecter
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {fabConfig && !hideFab && (
                <button
                    className={`mobile-fab ${isFabCollapsed ? "collapsed" : ""} type-${activePath.toLowerCase().includes("client") ? "clients" : activePath.toLowerCase().includes("planning") ? "planning" : "factures"}`}
                    onClick={(e) => {
                        if (onFabClick) {
                            onFabClick(e);
                        } else {
                            const path = activePath.toLowerCase();
                            if (path.includes("client")) navigate("/client", { state: { openNewModal: true } });
                            else if (path.includes("planning")) navigate("/planning", { state: { openNewModal: true } });
                            else if (path.includes("factures")) navigate("/factures", { state: { openNewModal: true } });
                            else if (path.includes("devis")) navigate("/devis", { state: { openNewModal: true } });
                        }
                    }}
                >
                    <span className="fab-icon">{fabConfig.icon}</span>
                    <span className="fab-text">{fabConfig.label}</span>
                </button>
            )}

            {/* Mobile Bottom Tab Bar */}
            <nav className="mobile-bottom-nav">
                {mobileTabBarItems.map((item, index) => {
                    const isTabActive = item.isPlus ? bottomSheetOpen : (item.path === activePath || (item.path === "/home" && (activePath === "/" || activePath === "/home")));
                    return (
                        <motion.a
                            key={index}
                            href={item.path}
                            onClick={(e) => {
                                if (item.isPlus) {
                                    e.preventDefault();
                                    setBottomSheetOpen(true);
                                } else {
                                    navigateTo(e, item.path);
                                }
                            }}
                            whileTap={{ scale: 0.92 }}
                            transition={{ type: "spring", stiffness: 400, damping: 15 }}
                            className={`mobile-nav-item ${isTabActive ? "active" : ""}`}
                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
                        >
                            <span className="mobile-nav-icon">{Icons[item.iconKey]}</span>
                            <span className="mobile-nav-title">{item.title}</span>
                        </motion.a>
                    );
                })}
            </nav>

            {/* Mobile Bottom Sheet (Framer Motion + Tailwind CSS) */}
            <BottomSheet
                isOpen={bottomSheetOpen}
                onClose={() => setBottomSheetOpen(false)}
                activePath={activePath}
                navigateTo={navigateTo}
            />
        </>
    );
}

export default SideBar;