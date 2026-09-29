import React, { useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import './LegalPages.css';

export default function LegalLayout({ title, subtitle, lastUpdated, children }) {
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        window.scrollTo(0, 0);
        document.title = `${title} | GestArt`;

        document.documentElement.classList.add('legal-page-active');
        document.body.classList.add('legal-page-active');

        const prevHtmlOverflow = document.documentElement.style.overflow;
        const prevHtmlHeight = document.documentElement.style.height;
        const prevBodyOverflow = document.body.style.overflow;
        const prevBodyHeight = document.body.style.height;

        document.documentElement.style.overflow = "auto";
        document.documentElement.style.height = "auto";
        document.body.style.overflow = "auto";
        document.body.style.height = "auto";

        const rootEl = document.getElementById('root');
        const prevRootOverflow = rootEl ? rootEl.style.overflow : '';
        const prevRootHeight = rootEl ? rootEl.style.height : '';

        if (rootEl) {
            rootEl.style.overflow = "visible";
            rootEl.style.height = "auto";
            rootEl.style.minHeight = "100vh";
        }

        return () => {
            document.documentElement.classList.remove('legal-page-active');
            document.body.classList.remove('legal-page-active');

            document.documentElement.style.overflow = prevHtmlOverflow;
            document.documentElement.style.height = prevHtmlHeight;
            document.body.style.overflow = prevBodyOverflow;
            document.body.style.height = prevBodyHeight;

            if (rootEl) {
                rootEl.style.overflow = prevRootOverflow;
                rootEl.style.height = prevRootHeight;
                rootEl.style.minHeight = "";
            }
        };
    }, [title]);

    const handleBack = () => {
        if (window.history.length > 1 && !location.key?.startsWith('default')) {
            navigate(-1);
        } else {
            navigate('/');
        }
    };

    return (
        <div className="legal-page-root">
            {/* Minimalist Topbar */}
            <header className="legal-topbar">
                <div className="legal-topbar-inner">
                    <button
                        type="button"
                        onClick={handleBack}
                        className="legal-back-btn"
                        aria-label="Retour"
                    >
                        <ArrowLeft size={16} />
                        <span>Retour</span>
                    </button>

                    <Link to="/" className="legal-brand-link" aria-label="Accueil GestArt">
                        <img src="/LOGO.png" alt="GestArt" className="legal-brand-logo" />
                    </Link>

                    <nav className="legal-topbar-links">
                        <Link to="/mentions-legales" className={location.pathname === '/mentions-legales' ? 'active' : ''}>Mentions</Link>
                        <Link to="/cgu" className={location.pathname === '/cgu' ? 'active' : ''}>CGU</Link>
                        <Link to="/confidentialite" className={location.pathname === '/confidentialite' ? 'active' : ''}>Confidentialité</Link>
                        <Link to="/cookies" className={location.pathname === '/cookies' ? 'active' : ''}>Cookies</Link>
                    </nav>
                </div>
            </header>

            {/* Main Document Content */}
            <main className="legal-main-container">
                <article className="legal-article">
                    <header className="legal-header">
                        <div className="legal-badge-wrapper">
                            <span className="legal-tag">Conformité Légale</span>
                            {lastUpdated && <span className="legal-date">Mise à jour : {lastUpdated}</span>}
                        </div>
                        <h1 className="legal-title">{title}</h1>
                        {subtitle && <p className="legal-subtitle">{subtitle}</p>}
                    </header>

                    <div className="legal-divider" />

                    <div className="legal-content">
                        {children}
                    </div>
                </article>
            </main>

            {/* Minimalist Footer */}
            <footer className="legal-footer">
                <div className="legal-footer-inner">
                    <p className="legal-footer-copy">
                        © 2026 GestArt (EI Khalid Sainaro) — Tous droits réservés.
                    </p>
                    <div className="legal-footer-links">
                        <a href="mailto:support.gestart@gmail.com" className="legal-footer-link">
                            support.gestart@gmail.com
                            <ArrowUpRight size={13} />
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
