import { useNavigate } from "react-router-dom";
import "./FinalCTA.css";
import { Check, CirclePlay } from "lucide-react";
import { isAuthenticated } from "../../utils/auth";

function FinalCTA() {
    const navigate = useNavigate();
    const loggedIn = isAuthenticated();

    const handleTryFree = () => {
        if (loggedIn) {
            navigate("/home");
        } else {
            navigate("/register?plan=PRO");
        }
    };

    const handleScrollHero = () => {
        const heroEl = document.getElementById("hero");
        if (heroEl) {
            heroEl.scrollIntoView({ behavior: "smooth" });
        }
    };

    return (
        <section className="final-cta-section" id="final-cta">
            <div className="final-cta-glow-effect" />

            <div className="final-cta-container">
                <h2 className="final-cta-title">
                    Arrêtez de perdre du temps sur votre gestion.
                </h2>

                <p className="final-cta-subtitle">
                    Commencez votre essai gratuit aujourd'hui.<br />
                    Gagnez jusqu'à 5 heures par semaine sur votre facturation et vos plannings.
                </p>

                <div className="hero-buttons">
                    <button type="button" onClick={handleTryFree} className="primary-button">
                        <span className="desktop-text">Essayer gratuitement 14j</span>
                        <span className="mobile-text">Essai gratuit 14j</span>
                    </button>
                    <button type="button" onClick={handleScrollHero} className="secondary-button">
                        <span className="desktop-text">Voir la démo en 2 minutes</span>
                        <span className="mobile-text">Voir démo 2 min</span>
                        <CirclePlay size={18} />
                    </button>
                </div>

                {/* Benefits checklist */}
                <div className="final-cta-benefits">
                    <div className="benefit-badge">
                        <Check size={16} className="benefit-check" />
                        <span>14 jours gratuits</span>
                    </div>
                    <div className="benefit-badge">
                        <Check size={16} className="benefit-check" />
                        <span>Sans carte bancaire</span>
                    </div>
                    <div className="benefit-badge">
                        <Check size={16} className="benefit-check" />
                        <span>Support français 7j/7</span>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default FinalCTA;
