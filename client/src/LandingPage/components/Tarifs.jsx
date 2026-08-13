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
            badge: "Je gère tout moi-même",
            features: [
                { text: "50 clients max & 1 technicien (le patron)", highlight: true, included: true },
                { text: "50 SMS manuels / mois", highlight: true, included: true },
                { text: "Fiches clients, équipements & Historique", included: true },
                { text: "Planning, Devis (signature élec.) & Factures", included: true },
                { text: "Paiement Stripe & Export comptable Excel", included: true },
                { text: "Notifications statut entretien & Support email", included: true },

                // Excluded items (✗)
                { text: "Rappels SMS auto & App mobile tech", included: false },
                { text: "Multi-techniciens & Rapports d'activité", included: false }
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
                { text: "300 clients max & 10 techniciens", highlight: true, included: true },
                { text: "500 SMS / mois (manuels & auto)", highlight: true, included: true },
                { text: "Tout le forfait Starter inclus", included: true },
                { text: "Rappels SMS automatiques clients", included: true },
                { text: "App Mobile Techniciens (iOS & Android)", included: true },
                { text: "Rapports d'activité & Module URSSAF", included: true },
                { text: "Support tél. & prioritaire 7j/7", included: true },

                // Excluded items (✗)
                { text: "Chorus Pro & Numéro SMS dédié", included: false }
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
                { text: "Illimité clients & techniciens", highlight: true, included: true },
                { text: "1000 SMS / mois (manuels & auto)", highlight: true, included: true },
                { text: "Tout le forfait Pro inclus", included: true },
                { text: "App Mobile Techniciens (iOS & Android)", included: true },
                { text: "Chorus Pro (Mairies & État) & N° SMS dédié", included: true },
                { text: "Gestion multi-sociétés & API REST", included: true },
                { text: "Account manager & Support dédié 24/7", included: true }
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