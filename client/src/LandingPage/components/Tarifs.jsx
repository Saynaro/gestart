import { useState } from "react";
import "./Tarifs.css";
import { Check, Info, HelpCircle } from "lucide-react";
import { AuroraText } from "@/components/ui/aurora-text";

function Tarifs() {
    const [isAnnual, setIsAnnual] = useState(false);

    const plans = [
        {
            name: "STARTER",
            priceMonthly: 39,
            priceAnnual: 31,
            features: [
                { text: "50 clients", highlight: true },
                { text: "2 techniciens", highlight: true },
                { text: "100 SMS/mois", highlight: true },
                { text: "Factures", included: true },
                { text: "Devis", included: true },
                { text: "Planning", included: true },
                { text: "Support email", included: true }
            ],
            cta: "Commencer",
            popular: false,
            badge: "Idéal pour démarrer"
        },
        {
            name: "PRO",
            priceMonthly: 89,
            priceAnnual: 71,
            features: [
                { text: "300 clients", highlight: true },
                { text: "10 techniciens", highlight: true },
                { text: "500 SMS/mois", highlight: true },
                { text: "Tout Starter", included: true },
                { text: "Rappels SMS", included: true },
                { text: "App mobile", included: true },
                { text: "Rapports", included: true },
                { text: "Support tél.", included: true }
            ],
            cta: "Commencer",
            popular: true,
            badge: "Le choix des artisans"
        },
        {
            name: "UNLIMITED",
            priceMonthly: 149,
            priceAnnual: 119,
            features: [
                { text: "Illimité clients", highlight: true },
                { text: "Illimité techniciens", highlight: true },
                { text: "1000 SMS/mois", highlight: true },
                { text: "Tout Pro", included: true },
                { text: "Chorus Pro", included: true },
                { text: "N° SMS dédié", included: true },
                { text: "Account manager", included: true }
            ],
            cta: "Nous contacter",
            popular: false,
            badge: "Pour les grandes structures"
        }
    ];

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
                    const period = isAnnual ? "/mois, facturé annuellement" : "/mois";

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
                                {plan.features.map((feat, fIdx) => (
                                    <div key={fIdx} className={`feature-item ${feat.highlight ? "feature-highlight" : ""}`}>
                                        <Check size={16} className="feature-check-icon" />
                                        <span className="feature-text">{feat.text}</span>
                                    </div>
                                ))}
                            </div>

                            <button className={`pricing-cta-btn ${plan.popular ? "pricing-cta-primary" : "pricing-cta-secondary"}`}>
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
                    <span>Sans carte bancaire</span>
                </div>
                <div className="trust-indicator-item">
                    <Check size={18} className="trust-check-icon" />
                    <span>Résiliable à tout moment</span>
                </div>
            </div>
        </section>
    );
}

export default Tarifs;