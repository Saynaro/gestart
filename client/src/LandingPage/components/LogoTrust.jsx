import "./LogoTrust.css"
import { ShieldCheck, Headphones, Zap } from "lucide-react";

function LogoTrust() {
    const badges = [
        {
            icon: <ShieldCheck className="trust-icon" size={20} />,
            title: "Conforme RGPD",
            desc: "Données sécurisées"
        },
        {
            icon: <Headphones className="trust-icon" size={20} />,
            title: "Support client 7j/7",
            desc: "Basé en France"
        },
        {
            icon: <Zap className="trust-icon" size={20} />,
            title: "Sans engagement",
            desc: "Essai gratuit 14 jours"
        }
    ];

    return (
        <section className="logo-trust">
            <div className="logo-trust-left">
                <span className="france-flag-icon">🇫🇷</span>
                <span className="utilisation-text">Fait pour les artisans français</span>
            </div>

            <div className="logo-trust-badges-container">
                <div className="logo-trust-badges">
                    {/* Original badges */}
                    {badges.map((badge, idx) => (
                        <div key={`orig-${idx}`} className="trust-badge-item">
                            {badge.icon}
                            <div className="trust-badge-text">
                                <span className="trust-badge-title">{badge.title}</span>
                                <span className="trust-badge-desc">{badge.desc}</span>
                            </div>
                        </div>
                    ))}

                    {/* Duplicate badges for infinite scroll on mobile */}
                    {badges.map((badge, idx) => (
                        <div key={`dup-${idx}`} className="trust-badge-item trust-badge-item-duplicate">
                            {badge.icon}
                            <div className="trust-badge-text">
                                <span className="trust-badge-title">{badge.title}</span>
                                <span className="trust-badge-desc">{badge.desc}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section >
    )
}
export default LogoTrust