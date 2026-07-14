import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./SideBar.css";
import BottomSheet from "./BottomSheet";
import { Icons, menuSections, mobileTabBarItems } from "./navigationConstants";

function SideBar() {
    const navigate = useNavigate();
    const location = useLocation();
    const activePath = location.pathname || "/home";
    const [bottomSheetOpen, setBottomSheetOpen] = useState(false);

    const navigateTo = (e, path) => {
        e.preventDefault();
        navigate(path);
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
        return null;
    };

    const fabConfig = getFabConfig();

    // Scroll state tracking to collapse/expand FAB
    const [isFabCollapsed, setIsFabCollapsed] = useState(false);

    useEffect(() => {
        let lastScrollY = window.scrollY;
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            if (currentScrollY > lastScrollY && currentScrollY > 20) {
                setIsFabCollapsed(true);
            } else if (currentScrollY < lastScrollY) {
                setIsFabCollapsed(false);
            }
            lastScrollY = currentScrollY;
        };
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <>
            {/* Desktop Sidebar Layout */}
            <div className="sidebar">
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
                        <span className="logo-text">ClimPro</span>
                    </div>
                    {menuSections.map((section, sIndex) => (
                        <div key={sIndex} className="sidebar-section">
                            <h2 className="section-title">{section.category}</h2>
                            <ul className="menu-list">
                                {section.items.map((item, iIndex) => {
                                    const isActive = item.path === activePath || (item.path === "/home" && (activePath === "/" || activePath === "/home"));
                                    return (
                                        <li key={iIndex} className={`menu-item ${isActive ? "active" : ""}`}>
                                            <a href={item.path} onClick={(e) => navigateTo(e, item.path)} className="menu-link">
                                                <span className="icon-wrapper">{Icons[item.iconKey]}</span>
                                                <span className="item-title">{item.title}</span>
                                                {item.badge !== undefined && (
                                                    <span className={`badge ${typeof item.badge === "number" ? "badge-numeric" : "badge-text"}`}>
                                                        {item.badge}
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
                    <div className="user-profile">
                        <div className="avatar">SK</div>
                        <div className="user-details">
                            <span className="username">Sainaro Khalid</span>
                            <span className="user-plan">Plan Pro</span>
                        </div>
                        <button className="logout-btn" title="Déconnexion">
                            {Icons.logout}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Floating Action Button (FAB) */}
            {fabConfig && (
                <button
                    className={`mobile-fab ${isFabCollapsed ? "collapsed" : ""} type-${activePath.toLowerCase().includes("client") ? "clients" : activePath.toLowerCase().includes("planning") ? "planning" : "factures"}`}
                    onClick={() => alert(`Action: ${fabConfig.label}`)}
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
                        <a
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
                            className={`mobile-nav-item ${isTabActive ? "active" : ""}`}
                        >
                            <span className="mobile-nav-icon">{Icons[item.iconKey]}</span>
                            <span className="mobile-nav-title">{item.title}</span>
                        </a>
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