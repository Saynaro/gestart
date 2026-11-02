import { useState, useEffect } from "react";
import "./Navbar.css";
import { Link } from "react-router-dom";
import { isAuthenticated } from "../../utils/auth";

function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const loggedIn = isAuthenticated();

    useEffect(() => {
        if (isOpen) {
            document.documentElement.style.overflow = "hidden";
            document.body.style.overflow = "hidden";
        } else {
            document.documentElement.style.overflow = "";
            document.documentElement.style.overflowY = "auto";
            document.documentElement.style.overflowX = "hidden";
            document.body.style.overflow = "";
            document.body.style.overflowY = "visible";
            document.body.style.overflowX = "clip";
        }
        return () => {
            document.documentElement.style.overflow = "";
            document.body.style.overflow = "";
        };
    }, [isOpen]);

    const toggleMenu = () => {
        setIsOpen(!isOpen);
    };

    const closeMenu = () => {
        setIsOpen(false);
    };

    const handleScroll = (e, targetId) => {
        e.preventDefault();
        closeMenu();
        setTimeout(() => {
            const element = document.getElementById(targetId);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
            }
        }, 50);
    };

    return (
        <nav className={`navbar ${isOpen ? 'menu-open' : ''}`}>
            <div className="brand">
                <img src="/LOGO.png" alt="GestArt" className="brand-logo" />
            </div>
            
            {isOpen && <div className="menu-backdrop" onClick={closeMenu} />}

            <button 
                className={`menu ${isOpen ? 'open' : ''}`} 
                onClick={toggleMenu}
                aria-label="Ouvrir le menu de navigation"
                aria-expanded={isOpen}
            >
            </button>

            <ul className={`menu-links ${isOpen ? 'open' : ''}`} onClick={(e) => e.stopPropagation()}>
                <div className="nav-links-row">
                    <a href="#" className="nav-link-item" onClick={(e) => handleScroll(e, 'hero')}>Solution</a>
                    <a href="#features" className="nav-link-item" onClick={(e) => handleScroll(e, 'features')}>Fonctionnalités</a>
                    <a href="#analytics" className="nav-link-item" onClick={(e) => handleScroll(e, 'analytics')}>Tarifs</a>
                    <a href="#about" className="nav-link-item" onClick={(e) => handleScroll(e, 'about')}>A propos</a>
                </div>
                
                {/* Dedicated mobile CTAs inside the drawer */}
                <div className="menu-mobile-ctas">
                    {loggedIn ? (
                        <Link to="/home" className="mobile-cta-btn mobile-cta-primary" onClick={closeMenu}>Mon Espace →</Link>
                    ) : (
                        <>
                            <Link to="/register" className="mobile-cta-btn mobile-cta-primary" onClick={closeMenu}>Essai gratuit 14j</Link>
                            <Link to="/login" className="mobile-cta-btn mobile-cta-secondary" onClick={closeMenu}>Connexion</Link>
                        </>
                    )}
                </div>
            </ul>
            
            <div className="auth-links-row">
                {loggedIn ? (
                    <Link to="/home" className="auth-link-item auth-link-primary" onClick={closeMenu}>Mon Espace (Dashboard) →</Link>
                ) : (
                    <>
                        <Link to="/login" className="auth-link-item" onClick={closeMenu}>Connexion</Link>
                        <Link to="/register" className="auth-link-item auth-link-primary" onClick={closeMenu}>Essai gratuit 14j</Link>
                    </>
                )}
            </div>
        </nav>
    )
}

export default Navbar;