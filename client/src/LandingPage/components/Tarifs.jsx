import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Tarifs.css";
import { Check, X } from "lucide-react";
import { AuroraText } from "@/components/ui/aurora-text";
import { isAuthenticated } from "../../utils/auth";

function Tarifs() {
    const [isAnnual, setIsAnnual] = useState(false);
    const navigate = useNavigate();
    const loggedIn = isAuthenticated();

    const plans = [
        {
            name: "STARTER",
            priceMonthly: 34,
            priceAnnual: 27,
            badge: "Idéal pour débuter",
            features: [
                { text: "1 utilisateur (le patron lui-même)", highlight: true, included: true },
                { text: "Jusqu'à 100 fiches clients", highlight: true, included: true },
                { text: "100 SMS de rappel / mois inclus", highlight: true, included: true },
                { text: "Devis, Factures & Signature électronique", included: true },
                { text: "Facturation électronique & Chorus Pro", highlight: true, included: true },
                { text: "Planning & Suivi des chantiers", included: true },
                { text: "Rappels automatiques des entretiens", highlight: true, included: true },

                // Excluded items (✗)
                { text: "App mobile techniciens", included: false },
                { text: "Multi-techniciens", included: false }
            ],
            cta: "Commencer l'essai 14j",
            popular: false
        },
        {
            name: "PRO",
            priceMonthly: 69,
            priceAnnual: 55,
            badge: "Pour les équipes en développement",
            features: [
                { text: "Tout le forfait Starter inclus", included: true },
                { text: "Jusqu'à 5 techniciens inclus", highlight: true, included: true },
                { text: "Jusqu'à 500 clients", highlight: true, included: true },
                { text: "500 SMS / mois inclus", highlight: true, included: true },
                { text: "Application mobile techniciens", highlight: true, included: true },
                { text: "Facturation électronique & Chorus Pro", included: true },
                { text: "Support prioritaire 7j/7", highlight: true, included: true },

                // Excluded items (✗)
                { text: "Clients & techniciens illimités", included: false }
            ],
            cta: "Commencer l'essai Pro 14j",
            popular: true
        },
        {
            name: "UNLIMITED",
            priceMonthly: 129,
            priceAnnual: 103,
            badge: "Pour les grandes structures",
            features: [
                { text: "Tout le forfait Pro inclus", included: true },
                { text: "Techniciens & Clients 100% Illimités", highlight: true, included: true },
                { text: "1 500 SMS / mois inclus", highlight: true, included: true },
                { text: "Facturation électronique intégrale", included: true },
                { text: "Gestion multi-activités & Export comptable", included: true },
                { text: "Support VIP prioritaire 7j/7", highlight: true, included: true }
            ],
            cta: "Activer le plan Unlimited",
            popular: false
        }
    ];

    const handlePlanClick = (planName) => {
        if (loggedIn) {
            navigate("/settings");
        } else {
            navigate(`/register?plan=${planName}`);
        }
    };

    return (
        <section className="tarifs-section" id="analytics">
            <div className="tarifs-header">
                <span className="tarifs-badge">
                    <AuroraText>Tarifs</AuroraText>
                </span>
                <h2 className="tarifs-title">Simple et transparent. Pas de surprise.</h2>
                <p className="tarifs-subtitle">
                    Choisissez le forfait adapté à la taille de votre entreprise. Modifiez ou annulez votre plan à tout moment.
                </p>

                {/* Billing Toggle */}
                <div className="toggle-container">
                    <button
                        className={`toggle-btn ${!isAnnual ? "active" : ""}`}
                        onClick={() => setIsAnnual(false)}
                    >
                        Mensuel
                    </button>
                    <button
                        className={`toggle-btn ${isAnnual ? "active" : ""}`}
                        onClick={() => setIsAnnual(true)}
                    >
                        Annuel <span className="discount-pill">-20%</span>
                    </button>
                </div>
            </div>

            {/* Pricing Cards Grid */}
            <div className="pricing-grid">
                {plans.map((plan, idx) => {
                    const price = isAnnual ? plan.priceAnnual : plan.priceMonthly;

                    return (
                        <div
                            key={idx}
                            className={`pricing-card ${plan.popular ? "pricing-card-popular" : ""}`}
                        >
                            {plan.popular && (
                                <div className="popular-ribbon">RECOMMANDÉ</div>
                            )}

                            <div className="card-top">
                                <div className="plan-badge-label">{plan.badge}</div>
                                <h3 className="plan-name">{plan.name}</h3>
                                <div className="plan-price-block">
                                    <span className="price-currency">€</span>
                                    <span className="price-value">{price}</span>
                                    <span className="price-period">/mois</span>
                                </div>
                                {isAnnual && (
                                    <div className="annual-save-text">
                                        Soit {price * 12} € / an ({plan.priceMonthly - plan.priceAnnual} € d'économie / mois)
                                    </div>
                                )}
                            </div>

                            <div className="plan-features-list">
                                {plan.features.map((feat, fIdx) => {
                                    const isInc = feat.included !== false;
                                    return (
                                        <div
                                            key={fIdx}
                                            className={`feature-item ${feat.highlight ? "feature-highlight" : ""} ${!isInc ? "feature-excluded" : ""}`}
                                        >
                                            {isInc ? (
                                                <Check size={15} className="feature-check-icon" />
                                            ) : (
                                                <X size={15} className="feature-x-icon" />
                                            )}
                                            <span className="feature-text">{feat.text}</span>
                                        </div>
                                    );
                                })}
                            </div>

                            <button
                                type="button"
                                onClick={() => handlePlanClick(plan.name)}
                                className={`pricing-cta-btn ${plan.popular ? "pricing-cta-primary" : "pricing-cta-secondary"}`}
                            >
                                {plan.cta}
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Bottom Trust Indicators */}
            <div className="tarifs-trust-footer">
                <div className="trust-indicator-item">
                    <Check size={18} className="trust-check-icon" />
                    <span>14 jours d'essai gratuit sur tous les plans</span>
                </div>
                <div className="trust-indicator-item">
                    <Check size={18} className="trust-check-icon" />
                    <span>Sans carte bancaire requis</span>
                </div>
                <div className="trust-indicator-item">
                    <Check size={18} className="trust-check-icon" />
                    <span>Résiliable à tout moment en 1 clic</span>
                </div>
            </div>
        </section>
    );
}

export default Tarifs;