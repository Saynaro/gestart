import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
    ShieldCheck,
    CreditCard,
    CheckCircle2,
    Star,
    Lock,
    Zap,
    ArrowLeft,
    Check,
    AlertCircle,
    Loader2
} from "lucide-react";
import { apiFetch } from "../utils/api";

export default function CheckoutSubscriptionPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const initialPlan = (searchParams.get("plan") || "PRO").toUpperCase();

    const [selectedPlan, setSelectedPlan] = useState(initialPlan); // STARTER, PRO, UNLIMITED
    const [billingCycle, setBillingCycle] = useState("MONTHLY"); // MONTHLY, ANNUAL

    // Card Form Inputs
    const [cardHolder, setCardHolder] = useState("");
    const [cardNumber, setCardNumber] = useState("");
    const [cardExpiry, setCardExpiry] = useState("");
    const [cardCvc, setCardCvc] = useState("");

    // Statuses
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [cardType, setCardType] = useState("generic"); // visa, mastercard, amex

    // Plans Configuration
    const plans = {
        STARTER: {
            name: "STARTER",
            displayName: "Starter",
            priceMonthly: 34,
            priceAnnual: 27,
            description: "Idéal pour débuter votre activité d'installation & maintenance",
            features: [
                "1 utilisateur (le patron lui-même)",
                "Jusqu'à 100 fiches clients",
                "100 SMS de rappel / mois inclus",
                "Devis, Factures & Signature électronique",
                "Facturation électronique & Chorus Pro",
                "Planning & Suivi des chantiers",
                "Rappels automatiques des entretiens"
            ]
        },
        PRO: {
            name: "PRO",
            displayName: "Pro",
            popular: true,
            priceMonthly: 69,
            priceAnnual: 55,
            description: "Pour les entreprises en croissance et équipes sur le terrain",
            features: [
                "Toutes les fonctions Starter",
                "Jusqu'à 5 techniciens inclus",
                "Jusqu'à 500 clients",
                "500 SMS / mois inclus",
                "Application mobile techniciens",
                "Facturation électronique & Chorus Pro",
                "Support prioritaire 7j/7"
            ]
        },
        UNLIMITED: {
            name: "UNLIMITED",
            displayName: "Unlimited",
            priceMonthly: 129,
            priceAnnual: 103,
            description: "Accès illimité sans aucune restriction pour grandes structures",
            features: [
                "Toutes les fonctions Pro",
                "Techniciens & Clients 100% Illimités",
                "1 500 SMS / mois inclus",
                "Facturation électronique intégrale",
                "Gestion multi-activités & Export comptable",
                "Support VIP prioritaire 7j/7"
            ]
        }
    };

    const activePlanObj = plans[selectedPlan] || plans.PRO;
    const pricePerMonth = billingCycle === "ANNUAL" ? activePlanObj.priceAnnual : activePlanObj.priceMonthly;
    const totalPrice = billingCycle === "ANNUAL" ? activePlanObj.priceAnnual * 12 : activePlanObj.priceMonthly;

    // Detect Card Brand dynamically
    const handleCardNumberChange = (e) => {
        let val = e.target.value.replace(/\D/g, "");
        if (val.length > 16) val = val.slice(0, 16);

        // Formatting 4x4 digits
        const formatted = val.replace(/(\d{4})/g, "$1 ").trim();
        setCardNumber(formatted);

        if (val.startsWith("4")) setCardType("visa");
        else if (/^5[1-5]/.test(val) || /^2[2-7]/.test(val)) setCardType("mastercard");
        else if (/^3[47]/.test(val)) setCardType("amex");
        else setCardType("generic");
    };

    const handleExpiryChange = (e) => {
        let val = e.target.value.replace(/\D/g, "");
        if (val.length > 4) val = val.slice(0, 4);
        if (val.length >= 3) {
            val = `${val.slice(0, 2)}/${val.slice(2)}`;
        }
        setCardExpiry(val);
    };

    const handleCvcChange = (e) => {
        let val = e.target.value.replace(/\D/g, "");
        if (val.length > 4) val = val.slice(0, 4);
        setCardCvc(val);
    };

    // Client-side Stripe Card Validation
    const validateCard = () => {
        const rawCard = cardNumber.replace(/\s/g, "");
        if (!cardHolder.trim()) return "Veuillez saisir le nom du titulaire de la carte.";
        if (rawCard.length < 15) return "Numéro de carte bancaire invalide (16 chiffres requis).";

        const [month, year] = cardExpiry.split("/");
        if (!month || !year || Number(month) < 1 || Number(month) > 12) {
            return "Date d'expiration invalide (format MM/AA).";
        }

        const expYear = Number(`20${year}`);
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;

        if (expYear < currentYear || (expYear === currentYear && Number(month) < currentMonth)) {
            return "La carte bancaire est expirée.";
        }

        if (cardCvc.length < 3) return "Code CVC invalide (3 ou 4 chiffres).";

        return null;
    };

    const handleSubmitPayment = async (e) => {
        e.preventDefault();
        setErrorMsg("");

        const cardError = validateCard();
        if (cardError) {
            setErrorMsg(cardError);
            return;
        }

        setLoading(true);

        try {
            // First attempt official Stripe Checkout Session
            const checkoutRes = await apiFetch("/v1/subscription/create-checkout-session", {
                method: "POST",
                body: JSON.stringify({
                    planName: selectedPlan,
                    cycle: billingCycle
                })
            });

            if (checkoutRes.data?.checkoutUrl && checkoutRes.data.checkoutUrl.startsWith("http")) {
                window.location.href = checkoutRes.data.checkoutUrl;
                return;
            }

            // Direct Upgrade fallback (e.g. if Stripe is in mock/test mode)
            await apiFetch("/v1/subscription/upgrade", {
                method: "POST",
                body: JSON.stringify({
                    planName: selectedPlan,
                    cycle: billingCycle
                })
            });

            navigate("/subscription/success");
        } catch (err) {
            console.error("Payment submission error:", err);
            setErrorMsg(err.message || "Erreur lors du traitement de votre paiement. Veuillez réessayer.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: "100vh",
            height: "100%",
            overflowY: "auto",
            backgroundColor: "var(--background, #0F172A)",
            color: "var(--foreground, #F8FAFC)",
            padding: "40px 20px 100px 20px"
        }}>
            <div style={{ maxWidth: "1100px", margin: "0 auto" }}>

                {/* Header Back & Navigation */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px", flexWrap: "wrap", gap: "12px" }}>
                    <button
                        onClick={() => navigate("/settings?tab=abonnement")}
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "8px",
                            background: "none",
                            border: "none",
                            color: "var(--muted-foreground, #94A3B8)",
                            cursor: "pointer",
                            fontSize: "14px",
                            fontWeight: 600
                        }}
                    >
                        <ArrowLeft size={18} /> Retour aux réglages
                    </button>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#22C55E", fontSize: "13px", fontWeight: 700 }}>
                        <ShieldCheck size={18} /> Paiement 100% Sécurisé via Stripe
                    </div>
                </div>

                {/* Title */}
                <div style={{ textAlign: "center", marginBottom: "40px" }}>
                    <div style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        backgroundColor: "rgba(91, 77, 219, 0.15)",
                        color: "var(--sidebar-primary, #5B4DDB)",
                        padding: "6px 16px",
                        borderRadius: "20px",
                        fontSize: "13px",
                        fontWeight: 700,
                        marginBottom: "12px"
                    }}>
                        <Star size={14} fill="currentColor" /> Activation Instantanée GestArt CRM
                    </div>
                    <h1 style={{ fontSize: "32px", fontWeight: 800, margin: "0 0 10px 0", letterSpacing: "-0.02em" }}>
                        Finalisez votre abonnement
                    </h1>
                    <p style={{ color: "var(--muted-foreground, #94A3B8)", fontSize: "15px", margin: 0 }}>
                        Choisissez votre formule et saisissez votre carte pour débloquer toutes vos fonctionnalités.
                    </p>
                </div>

                {/* Cycle Switcher */}
                <div style={{ display: "flex", justifyContent: "center", marginBottom: "32px" }}>
                    <div style={{
                        backgroundColor: "var(--card, #1E293B)",
                        padding: "4px",
                        borderRadius: "12px",
                        display: "flex",
                        gap: "4px",
                        border: "1px solid var(--border, rgba(255, 255, 255, 0.1))"
                    }}>
                        <button
                            type="button"
                            onClick={() => setBillingCycle("MONTHLY")}
                            style={{
                                padding: "10px 22px",
                                borderRadius: "8px",
                                border: "none",
                                backgroundColor: billingCycle === "MONTHLY" ? "var(--sidebar-primary, #5B4DDB)" : "transparent",
                                color: billingCycle === "MONTHLY" ? "#FFFFFF" : "var(--foreground, #0F172A)",
                                fontWeight: 700,
                                fontSize: "13.5px",
                                cursor: "pointer",
                                transition: "all 0.2s ease"
                            }}
                        >
                            Paiement Mensuel
                        </button>
                        <button
                            type="button"
                            onClick={() => setBillingCycle("ANNUAL")}
                            style={{
                                padding: "10px 22px",
                                borderRadius: "8px",
                                border: "none",
                                backgroundColor: billingCycle === "ANNUAL" ? "var(--sidebar-primary, #5B4DDB)" : "transparent",
                                color: billingCycle === "ANNUAL" ? "#FFFFFF" : "var(--foreground, #0F172A)",
                                fontWeight: 700,
                                fontSize: "13.5px",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                transition: "all 0.2s ease"
                            }}
                        >
                            Paiement Annuel <span style={{ backgroundColor: "#22C55E", color: "#FFFFFF", padding: "2px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 800 }}>-20%</span>
                        </button>
                    </div>
                </div>

                {/* Grid Layout: Plan Selector & Payment Form */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "32px", alignItems: "start" }}>

                    {/* Left Column: Plan Cards */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "var(--muted-foreground, #94A3B8)" }}>
                            1. Choisissez votre plan
                        </h3>

                        {Object.values(plans).map((plan) => {
                            const isSelected = selectedPlan === plan.name;
                            const currentPrice = billingCycle === "ANNUAL" ? plan.priceAnnual : plan.priceMonthly;

                            return (
                                <div
                                    key={plan.name}
                                    onClick={() => setSelectedPlan(plan.name)}
                                    style={{
                                        border: isSelected ? "2px solid var(--sidebar-primary, #5B4DDB)" : "1px solid var(--border, rgba(255, 255, 255, 0.1))",
                                        backgroundColor: isSelected ? "rgba(91, 77, 219, 0.08)" : "var(--card, #1E293B)",
                                        borderRadius: "16px",
                                        padding: "20px",
                                        cursor: "pointer",
                                        position: "relative",
                                        transition: "all 0.2s ease"
                                    }}
                                >
                                    {plan.popular && (
                                        <span style={{
                                            position: "absolute",
                                            top: "-12px",
                                            right: "20px",
                                            backgroundColor: "var(--sidebar-primary, #5B4DDB)",
                                            color: "#FFFFFF",
                                            padding: "3px 10px",
                                            borderRadius: "12px",
                                            fontSize: "11px",
                                            fontWeight: 800
                                        }}>
                                            Populaire
                                        </span>
                                    )}

                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                                        <span style={{ fontSize: "18px", fontWeight: 800 }}>{plan.displayName}</span>
                                        <div style={{ textAlign: "right" }}>
                                            <span style={{ fontSize: "22px", fontWeight: 800 }}>{currentPrice} €</span>
                                            <span style={{ fontSize: "12px", color: "var(--muted-foreground, #94A3B8)" }}> / mois</span>
                                        </div>
                                    </div>

                                    <p style={{ fontSize: "12.5px", color: "var(--muted-foreground, #94A3B8)", margin: "0 0 14px 0" }}>
                                        {plan.description}
                                    </p>

                                    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "6px" }}>
                                        {plan.features.slice(0, 4).map((f, i) => (
                                            <li key={i} style={{ fontSize: "12.5px", display: "flex", alignItems: "center", gap: "8px" }}>
                                                <Check size={14} style={{ color: "#22C55E", flexShrink: 0 }} /> {f}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            );
                        })}
                    </div>

                    {/* Right Column: Stripe Payment Form */}
                    <div style={{
                        backgroundColor: "var(--card, #1E293B)",
                        border: "1px solid var(--border, rgba(255, 255, 255, 0.1))",
                        borderRadius: "20px",
                        padding: "28px",
                        boxShadow: "0 20px 40px rgba(0,0,0,0.3)"
                    }}>
                        <h3 style={{ fontSize: "18px", fontWeight: 800, margin: "0 0 4px 0", display: "flex", alignItems: "center", gap: "8px" }}>
                            <CreditCard size={20} style={{ color: "var(--sidebar-primary, #5B4DDB)" }} />
                            2. Informations de Paiement
                        </h3>
                        <p style={{ fontSize: "13px", color: "var(--muted-foreground, #94A3B8)", margin: "0 0 20px 0" }}>
                            Saisissez les détails de votre carte pour valider votre abonnement <strong>{activePlanObj.displayName}</strong>.
                        </p>

                        {errorMsg && (
                            <div style={{
                                backgroundColor: "rgba(239, 68, 68, 0.12)",
                                border: "1px solid rgba(239, 68, 68, 0.3)",
                                color: "#ef4444",
                                borderRadius: "10px",
                                padding: "12px",
                                fontSize: "13px",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                marginBottom: "20px"
                            }}>
                                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                                <span>{errorMsg}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmitPayment} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            {/* Cardholder Name */}
                            <div>
                                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px", color: "var(--muted-foreground, #94A3B8)" }}>
                                    NOM SUR LA CARTE
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Khalid Sainaro"
                                    value={cardHolder}
                                    onChange={(e) => setCardHolder(e.target.value)}
                                    style={{
                                        width: "100%",
                                        padding: "12px 14px",
                                        backgroundColor: "var(--background, #0F172A)",
                                        border: "1px solid var(--border, rgba(255, 255, 255, 0.15))",
                                        borderRadius: "10px",
                                        color: "var(--foreground, #F8FAFC)",
                                        fontSize: "14px",
                                        outline: "none"
                                    }}
                                />
                            </div>

                            {/* Card Number */}
                            <div>
                                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px", color: "var(--muted-foreground, #94A3B8)" }}>
                                    NUMÉRO DE CARTE BANCAIRE (STRIPE)
                                </label>
                                <div style={{ position: "relative" }}>
                                    <input
                                        type="text"
                                        required
                                        placeholder="4242 4242 4242 4242"
                                        value={cardNumber}
                                        onChange={handleCardNumberChange}
                                        style={{
                                            width: "100%",
                                            padding: "12px 14px 12px 42px",
                                            backgroundColor: "var(--background, #0F172A)",
                                            border: "1px solid var(--border, rgba(255, 255, 255, 0.15))",
                                            borderRadius: "10px",
                                            color: "var(--foreground, #F8FAFC)",
                                            fontSize: "14px",
                                            outline: "none",
                                            letterSpacing: "1px"
                                        }}
                                    />
                                    <div style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94A3B8" }}>
                                        <CreditCard size={18} />
                                    </div>
                                </div>
                            </div>

                            {/* Expiry & CVC Grid */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                                <div>
                                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px", color: "var(--muted-foreground, #94A3B8)" }}>
                                        EXPIRATION (MM/AA)
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="12/28"
                                        value={cardExpiry}
                                        onChange={handleExpiryChange}
                                        style={{
                                            width: "100%",
                                            padding: "12px 14px",
                                            backgroundColor: "var(--background, #0F172A)",
                                            border: "1px solid var(--border, rgba(255, 255, 255, 0.15))",
                                            borderRadius: "10px",
                                            color: "var(--foreground, #F8FAFC)",
                                            fontSize: "14px",
                                            outline: "none"
                                        }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px", color: "var(--muted-foreground, #94A3B8)" }}>
                                        CVC (CVV)
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="123"
                                        value={cardCvc}
                                        onChange={handleCvcChange}
                                        style={{
                                            width: "100%",
                                            padding: "12px 14px",
                                            backgroundColor: "var(--background, #0F172A)",
                                            border: "1px solid var(--border, rgba(255, 255, 255, 0.15))",
                                            borderRadius: "10px",
                                            color: "var(--foreground, #F8FAFC)",
                                            fontSize: "14px",
                                            outline: "none"
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Order Summary */}
                            <div style={{
                                backgroundColor: "rgba(255, 255, 255, 0.03)",
                                border: "1px solid rgba(255, 255, 255, 0.08)",
                                borderRadius: "12px",
                                padding: "16px",
                                marginTop: "8px"
                            }}>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "6px" }}>
                                    <span>Formule {activePlanObj.displayName} ({billingCycle === "ANNUAL" ? "Annuel" : "Mensuel"})</span>
                                    <span style={{ fontWeight: 700 }}>{totalPrice} €</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#22C55E" }}>
                                    <span>TVA (20%) incluse</span>
                                    <span>Inclus</span>
                                </div>
                                <div style={{ borderTop: "1px dashed rgba(255,255,255,0.1)", marginTop: "10px", paddingTop: "10px", display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: "15px" }}>
                                    <span>Total à régler</span>
                                    <span style={{ color: "var(--sidebar-primary, #5B4DDB)" }}>{totalPrice} €</span>
                                </div>
                            </div>

                            {/* Pay Button */}
                            <button
                                type="submit"
                                disabled={loading}
                                style={{
                                    width: "100%",
                                    padding: "16px",
                                    backgroundColor: "var(--sidebar-primary, #5B4DDB)",
                                    color: "#FFFFFF",
                                    border: "none",
                                    borderRadius: "12px",
                                    fontSize: "15px",
                                    fontWeight: 800,
                                    cursor: loading ? "not-allowed" : "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "8px",
                                    marginTop: "10px",
                                    boxShadow: "0 10px 25px rgba(91, 77, 219, 0.3)"
                                }}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 size={18} className="spin-loader" /> Traitement Stripe sécurisé...
                                    </>
                                ) : (
                                    <>
                                        <Lock size={16} /> Payer {totalPrice} € & Activer mon Abonnement
                                    </>
                                )}
                            </button>
                        </form>

                        <div style={{ textAlign: "center", marginTop: "16px", fontSize: "11px", color: "var(--muted-foreground, #94A3B8)" }}>
                            Cryptage SSL 256 bits · Stripe Verified Partner · Annulable à tout moment
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
}
