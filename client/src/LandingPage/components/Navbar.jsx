import { useState, useEffect } from "react";
import "./Navbar.css";
import { Link } from "react-router-dom";
import logo from "../../assets/logo.png";

function Navbar() {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
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
        const element = document.getElementById(targetId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
        closeMenu();
    };

    return (
        <nav className={`navbar ${isOpen ? 'menu-open' : ''}`}>
            <div className="brand">
                <img src={logo} alt="GestArt" className="brand-logo" />
            </div>
            
            {isOpen && <div className="menu-backdrop" onClick={closeMenu} />}

            <div className={`menu ${isOpen ? 'open' : ''}`} onClick={toggleMenu}>
            </div>

            <ul className={`menu-links ${isOpen ? 'open' : ''}`} onClick={(e) => e.stopPropagation()}>
                <div className="nav-links-row">
                    <a href="#" className="nav-link-item" onClick={(e) => handleScroll(e, 'hero')}>Solution</a>
                    <a href="#features" className="nav-link-item" onClick={(e) => handleScroll(e, 'features')}>Fonctionnalités</a>
                    <a href="#analytics" className="nav-link-item" onClick={(e) => handleScroll(e, 'analytics')}>Tarifs</a>
                    <a href="#about" className="nav-link-item" onClick={(e) => handleScroll(e, 'about')}>A propos</a>
                </div>
                
                {/* Dedicated mobile CTAs inside the drawer */}
                <div className="menu-mobile-ctas">
                    <Link to="/signup" className="mobile-cta-btn mobile-cta-primary" onClick={closeMenu}>Essai gratuit 14j</Link>
                    <Link to="/login" className="mobile-cta-btn mobile-cta-secondary" onClick={closeMenu}>Connexion</Link>
                </div>
            </ul>
            
            <div className="auth-links-row">
                <Link to={"/login"} className="auth-link-item" onClick={closeMenu}>Connexion</Link>
                <Link to={"/signup"} className="auth-link-item auth-link-primary" onClick={closeMenu}>Essai gratuit 14j</Link>
            </div>
        </nav>
    )
}

export default Navbar;