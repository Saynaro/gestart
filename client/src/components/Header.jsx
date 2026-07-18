import { useState, useEffect } from "react";
import "./Header.css";
import { profilePages, DropdownIcons } from "./navigationConstants";


function Header() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [activePath, setActivePath] = useState(window.location.pathname || "/dashboard");
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Sync path state if browser URL changes
    useEffect(() => {
        const handleLocationChange = () => {
            setActivePath(window.location.pathname || "/dashboard");
        };
        window.addEventListener("popstate", handleLocationChange);
        return () => window.removeEventListener("popstate", handleLocationChange);
    }, []);

    const navigateTo = (e, path) => {
        e.preventDefault();
        setActivePath(path);
        window.history.pushState(null, "", path);
        window.dispatchEvent(new Event("popstate"));
    };

    const toggleMenu = (e) => {
        e.stopPropagation();
        setMenuOpen(!menuOpen);
    };

    const handleAvatarClick = (e) => {
        if (isMobile) {
            e.preventDefault();
            e.stopPropagation();
            window.history.pushState(null, "", "/settings");
            window.dispatchEvent(new Event("popstate"));
        } else {
            toggleMenu(e);
        }
    };

    // Close menu when clicking outside
    useEffect(() => {
        if (!menuOpen) return;
        const closeMenu = () => setMenuOpen(false);
        window.addEventListener("click", closeMenu);
        return () => window.removeEventListener("click", closeMenu);
    }, [menuOpen]);

    const getPageTitle = (pathname) => {
        if (pathname.startsWith("/client")) return "Clients";
        if (pathname.startsWith("/planning")) return "Planning";
        if (pathname.startsWith("/messages")) return "Messages";
        if (pathname.startsWith("/factures")) return "Factures";
        if (pathname.startsWith("/devis")) return "Devis";
        if (pathname.startsWith("/rapports")) return "Rapports";
        if (pathname.startsWith("/comptabilite")) return "Comptabilité";
        if (pathname.startsWith("/catalogue")) return "Catalogue";
        if (pathname.startsWith("/premium")) return "Premium";
        if (pathname.startsWith("/settings")) return "Paramètres";
        return "Bonjour Khalid 👋";
    };

    return (
        <div className="header">
            <div className="header-left">
                <span className="greeting">{isMobile ? getPageTitle(activePath) : "Bonjour Khalid 👋"}</span>
            </div>
            <div className="header-right">
                <div className="notification-wrapper">
                    <svg className="bell-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                    </svg>
                    <span className="notification-dot"></span>
                </div>
                
                <div className="avatar-wrapper" onClick={handleAvatarClick}>
                    <div className="header-avatar">KS</div>
                    
                    {menuOpen && (
                        <div className="mobile-dropdown" onClick={(e) => e.stopPropagation()}>
                            <div className="dropdown-header">
                                <span className="dropdown-user-name">Khalid Sainaro</span>
                                <span className="dropdown-user-plan">Plan Pro</span>
                            </div>
                            <div className="dropdown-divider"></div>
                            <ul className="dropdown-list">
                                {profilePages.map((page, index) => {
                                    const isActive = activePath === page.path;
                                    return (
                                        <li key={index} className={`dropdown-item ${isActive ? "active" : ""}`}>
                                            <a 
                                                href={page.path} 
                                                onClick={(e) => {
                                                    navigateTo(e, page.path);
                                                    setMenuOpen(false);
                                                }} 
                                                className="dropdown-link"
                                            >
                                                {DropdownIcons[page.iconKey]}
                                                <span className="dropdown-title">{page.title}</span>
                                                {page.badge && <span className="dropdown-badge">{page.badge}</span>}
                                            </a>
                                        </li>
                                    );
                                })}
                                <div className="dropdown-divider"></div>
                                <li className="dropdown-item danger">
                                    <a 
                                        href="/logout" 
                                        onClick={(e) => {
                                            e.preventDefault();
                                            alert("Déconnexion");
                                            setMenuOpen(false);
                                        }} 
                                        className="dropdown-link"
                                    >
                                        {DropdownIcons.logout}
                                        <span className="dropdown-title">Déconnexion</span>
                                    </a>
                                </li>
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Header;
