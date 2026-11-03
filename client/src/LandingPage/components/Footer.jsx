import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import "./Footer.css";
import PWAInstallModal from "@/components/PWAInstallModal";

const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.05,
        },
    },
};

const riseItem = {
    hidden: { opacity: 0, y: 20, filter: "blur(4px)" },
    visible: {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        transition: { type: "spring", duration: 0.6, bounce: 0 },
    },
};

const giantTextVariant = {
    hidden: { opacity: 0, y: 30, filter: "blur(8px)" },
    visible: {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        transition: { type: "spring", duration: 0.8, bounce: 0 },
    },
};

function Footer() {
    const [showPwaModal, setShowPwaModal] = useState(false);
    const brandName = "GestArt";
    const description = "Optimisez vos interventions, fidélisez vos clients et automatisez votre facturation en toute simplicité.";
    const email = "support.gestart@gmail.com";

    const legalLinks = [
        { label: "Mentions légales", path: "/mentions-legales" },
        { label: "CGU / CGV", path: "/cgu" },
        { label: "Politique de confidentialité", path: "/confidentialite" },
        { label: "Accord sous-traitance (DPA)", path: "/dpa" },
        { label: "Gestion des cookies", path: "/cookies" }
    ];

    const productLinks = [
        { label: "Solution", targetId: "about" },
        { label: "Fonctionnalités", targetId: "features" },
        { label: "Tarifs", targetId: "analytics" },
        { label: "Témoignages", targetId: "testimonials" },
        { label: "FAQ", targetId: "faq" }
    ];

    const accessLinks = [
        { label: "Connexion", path: "/login" },
        { label: "Essai gratuit 14j", path: "/register" },
        { label: "Installer l'app (PWA)", onClick: () => setShowPwaModal(true) },
        { label: "Contact & Support", href: `mailto:${email}` }
    ];

    const handleScrollToSection = (e, targetId) => {
        e.preventDefault();
        const element = document.getElementById(targetId);
        if (element) {
            element.scrollIntoView({ behavior: "smooth" });
        }
    };

    return (
        <motion.footer
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            className="footer-section"
        >
            <div className="footer-content-wrapper">

                {/* Top Grid */}
                <div className="footer-grid">

                    {/* Left Brand Column */}
                    <motion.div variants={riseItem} className="footer-brand-column">
                        <div className="footer-logo-wrapper">
                            <img src="/LOGO.png" alt="GestArt" className="footer-brand-logo" />
                        </div>
                        <p className="footer-brand-desc">
                            {description}
                        </p>
                        <a href={`mailto:${email}`} className="footer-email-link">
                            {email}
                            <ArrowUpRight size={16} className="email-arrow-icon" />
                        </a>
                    </motion.div>

                    {/* Right Links Columns */}
                    <div className="footer-links-columns">

                        {/* Column 1: Produit */}
                        <motion.div variants={riseItem} className="links-col">
                            <h4 className="links-col-title">Produit</h4>
                            <ul className="links-list">
                                {productLinks.map((link, idx) => (
                                    <li key={idx}>
                                        <a
                                            href={`#${link.targetId}`}
                                            className="footer-nav-link"
                                            onClick={(e) => handleScrollToSection(e, link.targetId)}
                                        >
                                            {link.label}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </motion.div>

                        {/* Column 2: Compte & Aide */}
                        <motion.div variants={riseItem} className="links-col">
                            <h4 className="links-col-title">Compte & Aide</h4>
                            <ul className="links-list">
                                {accessLinks.map((link, idx) => (
                                    <li key={idx}>
                                        {link.path ? (
                                            <Link to={link.path} className="footer-nav-link">
                                                {link.label}
                                            </Link>
                                        ) : link.onClick ? (
                                            <button
                                                type="button"
                                                onClick={link.onClick}
                                                className="footer-nav-link"
                                                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', font: 'inherit' }}
                                            >
                                                {link.label}
                                            </button>
                                        ) : (
                                            <a href={link.href} className="footer-nav-link">
                                                {link.label}
                                            </a>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </motion.div>

                        {/* Column 3: Legal Compliance */}
                        <motion.div variants={riseItem} className="links-col">
                            <h4 className="links-col-title">Légal & RGPD</h4>
                            <ul className="links-list">
                                {legalLinks.map((link, idx) => (
                                    <li key={idx}>
                                        <Link
                                            to={link.path}
                                            className="footer-nav-link"
                                        >
                                            {link.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </motion.div>

                    </div>
                </div>

                {/* Bottom Watermark SVG */}
                <motion.div variants={giantTextVariant} className="footer-watermark-wrapper">
                    <svg
                        className="footer-watermark-svg"
                        viewBox="0 40 1000 120"
                        preserveAspectRatio="xMidYMid meet"
                        aria-label={brandName}
                    >
                        <defs>
                            <linearGradient id="watermark-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" className="gradient-stop-1" />
                                <stop offset="100%" className="gradient-stop-2" />
                            </linearGradient>
                        </defs>
                        <text
                            x="50%"
                            y="130"
                            dominantBaseline="middle"
                            textAnchor="middle"
                            fill="url(#watermark-gradient)"
                            className="watermark-text"
                            fontSize="130"
                        >
                            {brandName}
                        </text>
                    </svg>
                </motion.div>

                {/* Bottom Copyright Bar */}
                <div className="footer-copyright-bar">
                    <p className="copyright-text">
                        © 2026 {brandName} — Tous droits réservés
                    </p>
                </div>

            </div>

            <PWAInstallModal isOpen={showPwaModal} onClose={() => setShowPwaModal(false)} />
        </motion.footer>
    );
}

export default Footer;
