import "./FinalCTA.css";
import { Check, ArrowRight, CirclePlay } from "lucide-react";

function FinalCTA() {
    return (
        <section className="final-cta-section" id="final-cta">
            <div className="final-cta-glow-effect" />

            <div className="final-cta-container">
                <h2 className="final-cta-title">
                    Arrêtez de perdre des entretiens.
                </h2>

                <p className="final-cta-subtitle">
                    Commencez votre essai gratuit aujourd'hui.<br />
                    Vos premiers clients en moins de 10 minutes.
                </p>

                <div className="hero-buttons">
                    <button className="primary-button">
                        <span className="desktop-text">Essayer gratuitement 14j</span>
                        <span className="mobile-text">Essai gratuit 14j</span>
                    </button>
                    <button className="secondary-button">
                        <span className="desktop-text">Voir le demo en 2 minutes</span>
                        <span className="mobile-text">Voir demo en 2 min.</span>
                        <CirclePlay />
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
                        <span>Sans carte</span>
                    </div>
                    <div className="benefit-badge">
                        <Check size={16} className="benefit-check" />
                        <span>Support français</span>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default FinalCTA;
