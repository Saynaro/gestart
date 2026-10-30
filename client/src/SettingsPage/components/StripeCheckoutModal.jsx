import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Lock, ShieldCheck, Loader2, AlertCircle, CreditCard, ArrowRight, CheckCircle2, ChevronDown, Check } from "lucide-react";
import { apiFetch } from "../../utils/api";
import { useSubscription } from "../../utils/useSubscription";

const PLANS_INFO = {
    STARTER: { 
        name: "STARTER", 
        displayName: "Starter", 
        priceMonthly: "34,90", 
        priceAnnual: "27,00", 
        description: "1 utilisateur · 100 clients · 100 SMS", 
        features: ["1 utilisateur (patron)", "100 clients max", "100 SMS / mois inclus", "Devis, Factures & Chorus Pro", "Rappels automatiques", "Rapprochement bancaire manuel"] 
    },
    PRO: { 
        name: "PRO", 
        displayName: "Pro", 
        priceMonthly: "69,90", 
        priceAnnual: "55,00", 
        description: "5 techniciens · 500 clients · 1 banque incluse", 
        features: ["Jusqu'à 5 techniciens inclus", "500 clients max", "500 SMS / mois inclus", "1 compte bancaire inclus (DSP2)", "Rapprochement bancaire auto", "Option 2e compte : +7 €/m", "Application mobile techniciens"] 
    },
    UNLIMITED: { 
        name: "UNLIMITED", 
        displayName: "Unlimited", 
        priceMonthly: "119,90", 
        priceAnnual: "95,92", 
        description: "Clients & techniciens illimités · 3 banques · Support VIP", 
        features: ["Clients & Techniciens illimités", "1 500 SMS / mois inclus", "3 comptes bancaires inclus (DSP2)", "Rapprochement bancaire auto", "Facturation électronique intégrale", "Support VIP prioritaire 7j/7"] 
    }
};

const PLAN_ORDER = ["STARTER", "PRO", "UNLIMITED"];

export default function StripeCheckoutModal({ isOpen, onClose, targetPlan, initialCycle = "MONTHLY", onSuccess, mode = "checkout" }) {
    const { planName: userLastPlan } = useSubscription();

    const resolveInitialPlan = (requestedPlan, fallbackPlan) => {
        const req = requestedPlan?.toUpperCase();
        if (req && PLANS_INFO[req]) return req;
        const fb = fallbackPlan?.toUpperCase();
        if (fb && PLANS_INFO[fb]) return fb;
        return "PRO";
    };

    const defaultPlan = resolveInitialPlan(targetPlan, userLastPlan);
    const [plan, setPlan] = useState(defaultPlan);
    const [expandedPlan, setExpandedPlan] = useState(defaultPlan);
    const [billingCycle, setBillingCycle] = useState(initialCycle);
    const [agreeTerms, setAgreeTerms] = useState(true);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 640);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 640);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        const nextPlan = resolveInitialPlan(targetPlan, userLastPlan);
        setPlan(nextPlan);
        setExpandedPlan(nextPlan);
    }, [targetPlan, userLastPlan, isOpen]);

    useEffect(() => { setBillingCycle(initialCycle); }, [initialCycle]);

    useEffect(() => {
        if (isOpen) {
            setErrorMsg("");
            setLoading(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const currentPlanObj = PLANS_INFO[plan] || PLANS_INFO.PRO;
    const currentPriceMonthly = billingCycle === "ANNUAL" ? currentPlanObj.priceAnnual : currentPlanObj.priceMonthly;

    const handleCheckout = async () => {
        if (!agreeTerms) {
            setErrorMsg("Veuillez accepter les conditions pour continuer.");
            return;
        }

        setLoading(true);
        setErrorMsg("");

        try {
            const res = await apiFetch("/v1/subscription/checkout", {
                method: "POST",
                body: JSON.stringify({ planName: plan, cycle: billingCycle })
            });

            const checkoutUrl = res.data?.checkoutUrl;
            if (checkoutUrl) {
                window.location.href = checkoutUrl;
                return;
            }

            setErrorMsg("Impossible de créer la session de paiement. Réessayez.");
        } catch (err) {
            setErrorMsg(err.message || "Erreur de connexion. Vérifiez votre connexion internet.");
        } finally {
            setLoading(false);
        }
    };

    const handleCardOnly = async () => {
        setLoading(true);
        setErrorMsg("");
        try {
            const res = await apiFetch("/v1/subscription/portal");
            const portalUrl = res.data?.portalUrl;
            if (portalUrl) {
                window.location.href = portalUrl;
                return;
            }
            setErrorMsg("Impossible d'accéder au portail Stripe.");
        } catch (err) {
            setErrorMsg(err.message || "Erreur lors de l'ouverture du portail.");
        } finally {
            setLoading(false);
        }
    };

    return createPortal(
        <AnimatePresence>
            <div 
                onClick={onClose}
                style={{ 
                    position: "fixed", 
                    inset: 0, 
                    backgroundColor: "rgba(0, 0, 0, 0.72)", 
                    backdropFilter: "blur(6px)", 
                    WebkitBackdropFilter: "blur(6px)",
                    zIndex: 99999, 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center", 
                    padding: isMobile ? "12px" : "20px", 
                    overflowY: "auto" 
                }}
            >
                <motion.div
                    onClick={(e) => e.stopPropagation()}
                    initial={{ opacity: 0, scale: 0.96, y: 14 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 14 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    style={{ 
                        backgroundColor: "var(--card, #ffffff)", 
                        color: "var(--foreground)", 
                        borderRadius: isMobile ? "16px" : "20px", 
                        maxWidth: mode === "card_only" ? "420px" : (isMobile ? "420px" : "540px"), 
                        width: "100%", 
                        border: "1px solid var(--border)", 
                        boxShadow: "0 24px 48px -12px rgba(0,0,0,0.25)", 
                        overflow: "hidden", 
                        position: "relative", 
                        maxHeight: "92vh", 
                        display: "flex", 
                        flexDirection: "column",
                        boxSizing: "border-box"
                    }}
                >
                    {/* Header */}
                    <div style={{ 
                        padding: isMobile ? "14px 16px" : "18px 22px", 
                        borderBottom: "1px solid var(--border)", 
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "space-between", 
                        gap: "12px"
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                            <div style={{ 
                                width: "34px", 
                                height: "34px", 
                                minWidth: "34px", 
                                minHeight: "34px", 
                                borderRadius: "8px", 
                                backgroundColor: "#556B2F", 
                                display: "flex", 
                                alignItems: "center", 
                                justifyContent: "center", 
                                color: "#FFF",
                                flexShrink: 0 
                            }}>
                                <CreditCard size={17} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                                <h3 style={{ fontSize: isMobile ? "15px" : "17px", fontWeight: 800, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {mode === "card_only" ? "Gérer ma carte bancaire" : `Abonnement ${currentPlanObj.displayName}`}
                                </h3>
                                <p style={{ margin: "2px 0 0 0", fontSize: isMobile ? "11.5px" : "12px", color: "var(--muted-foreground)" }}>
                                    {mode === "card_only" ? "Portail sécurisé Stripe" : "Paiement 100% sécurisé via Stripe"}
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Fermer"
                            style={{ 
                                background: "var(--muted, #F4F3EF)", 
                                border: "none", 
                                borderRadius: "50%", 
                                width: "30px", 
                                height: "30px", 
                                minWidth: "30px",
                                minHeight: "30px",
                                display: "flex", 
                                alignItems: "center", 
                                justifyContent: "center", 
                                cursor: "pointer", 
                                color: "var(--foreground)",
                                flexShrink: 0,
                                transition: "opacity 0.15s ease",
                                outline: "none",
                                WebkitTapHighlightColor: "transparent"
                            }}
                        >
                            <X size={15} />
                        </button>
                    </div>

                    {/* Body */}
                    <div style={{ 
                        padding: isMobile ? "14px 16px" : "20px 22px", 
                        overflowY: "auto", 
                        display: "flex", 
                        flexDirection: "column", 
                        gap: isMobile ? "12px" : "16px",
                        boxSizing: "border-box"
                    }}>
                        {errorMsg && (
                            <div style={{ 
                                backgroundColor: "rgba(239, 68, 68, 0.1)", 
                                border: "1px solid rgba(239, 68, 68, 0.3)", 
                                borderRadius: "8px", 
                                padding: "9px 12px", 
                                display: "flex", 
                                alignItems: "center", 
                                gap: "8px", 
                                color: "#EF4444", 
                                fontSize: "12px" 
                            }}>
                                <AlertCircle size={14} style={{ flexShrink: 0 }} />
                                <span>{errorMsg}</span>
                            </div>
                        )}

                        {mode === "card_only" ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                                <div style={{ 
                                    backgroundColor: "var(--background)", 
                                    border: "1px solid var(--border)", 
                                    borderRadius: "12px", 
                                    padding: "14px", 
                                    display: "flex", 
                                    flexDirection: "column", 
                                    gap: "8px",
                                    fontSize: "12px",
                                    color: "var(--muted-foreground)"
                                }}>
                                    <div>✓ Mettre à jour votre carte bancaire</div>
                                    <div>✓ Télécharger vos factures et reçus Stripe</div>
                                    <div>✓ Gérer votre moyen de paiement en direct</div>
                                </div>

                                <button 
                                    type="button"
                                    onClick={handleCardOnly} 
                                    disabled={loading}
                                    style={{ 
                                        width: "100%", 
                                        padding: "11px 16px", 
                                        backgroundColor: loading ? "var(--muted)" : "#556B2F", 
                                        color: "#FFF", 
                                        border: "none", 
                                        borderRadius: "10px", 
                                        fontSize: "13.5px", 
                                        fontWeight: 700, 
                                        cursor: loading ? "not-allowed" : "pointer", 
                                        display: "flex", 
                                        alignItems: "center", 
                                        justifyContent: "center", 
                                        gap: "8px", 
                                        boxShadow: "0 2px 8px rgba(85,107,47,0.25)" 
                                    }}
                                >
                                    {loading ? <><Loader2 size={15} className="spin-loader" /> Ouverture...</> : <><CreditCard size={15} /> Gérer sur Stripe <ArrowRight size={14} /></>}
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* Billing Cycle Toggle Switch */}
                                <div>
                                    <div style={{ 
                                        fontSize: "11px", 
                                        fontWeight: 700, 
                                        marginBottom: "6px", 
                                        color: "var(--muted-foreground)", 
                                        textTransform: "uppercase", 
                                        letterSpacing: "0.4px" 
                                    }}>
                                        Fréquence de facturation
                                    </div>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        backgroundColor: 'var(--muted, #F4F3EF)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '50px',
                                        padding: '3px',
                                        boxSizing: 'border-box'
                                    }}>
                                        <button
                                            type="button"
                                            onClick={() => setBillingCycle("MONTHLY")}
                                            style={{
                                                flex: 1,
                                                padding: isMobile ? '6px 10px' : '7px 14px',
                                                borderRadius: '50px',
                                                border: 'none',
                                                fontWeight: billingCycle === 'MONTHLY' ? 700 : 500,
                                                fontSize: isMobile ? '11.5px' : '12.5px',
                                                cursor: 'pointer',
                                                backgroundColor: billingCycle === 'MONTHLY' ? 'var(--card, #ffffff)' : 'transparent',
                                                color: billingCycle === 'MONTHLY' ? 'var(--foreground)' : 'var(--muted-foreground)',
                                                boxShadow: billingCycle === 'MONTHLY' ? '0 2px 6px rgba(0, 0, 0, 0.08)' : 'none',
                                                textAlign: 'center',
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            Mensuel
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setBillingCycle("ANNUAL")}
                                            style={{
                                                flex: 1,
                                                padding: isMobile ? '6px 10px' : '7px 14px',
                                                borderRadius: '50px',
                                                border: 'none',
                                                fontWeight: billingCycle === 'ANNUAL' ? 700 : 500,
                                                fontSize: isMobile ? '11.5px' : '12.5px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '5px',
                                                backgroundColor: billingCycle === 'ANNUAL' ? 'var(--card, #ffffff)' : 'transparent',
                                                color: billingCycle === 'ANNUAL' ? 'var(--foreground)' : 'var(--muted-foreground)',
                                                boxShadow: billingCycle === 'ANNUAL' ? '0 2px 6px rgba(0, 0, 0, 0.08)' : 'none',
                                                textAlign: 'center',
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            <span>Annuel</span>
                                            <span style={{
                                                backgroundColor: 'rgba(34, 197, 94, 0.14)',
                                                color: '#16a34a',
                                                fontWeight: 800,
                                                fontSize: '10px',
                                                padding: '1px 5px',
                                                borderRadius: '20px'
                                            }}>
                                                -20%
                                            </span>
                                        </button>
                                    </div>
                                </div>

                                {/* Plans Accordion Selector (PC & Mobile) */}
                                <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? "8px" : "10px" }}>
                                    {PLAN_ORDER.map((planKey) => {
                                        const planItem = PLANS_INFO[planKey];
                                        const isSelected = plan === planKey;
                                        const isExpanded = expandedPlan === planKey;
                                        const isLastPlan = userLastPlan?.toUpperCase() === planKey;
                                        const itemPrice = billingCycle === "ANNUAL" ? planItem.priceAnnual : planItem.priceMonthly;

                                        return (
                                            <div
                                                key={planKey}
                                                style={{
                                                    backgroundColor: "var(--background)",
                                                    border: isSelected ? "1.5px solid #556B2F" : "1px solid var(--border)",
                                                    borderRadius: "12px",
                                                    padding: isMobile ? "12px 14px" : "14px 16px",
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                                                    boxShadow: isSelected ? "0 0 0 1px rgba(85, 107, 47, 0.15)" : "none"
                                                }}
                                            >
                                                {/* Clickable Header */}
                                                <div
                                                    role="button"
                                                    tabIndex={0}
                                                    onClick={() => {
                                                        if (plan !== planKey) {
                                                            setPlan(planKey);
                                                            setExpandedPlan(planKey);
                                                        } else {
                                                            setExpandedPlan(isExpanded ? null : planKey);
                                                        }
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter" || e.key === " ") {
                                                            e.preventDefault();
                                                            if (plan !== planKey) {
                                                                setPlan(planKey);
                                                                setExpandedPlan(planKey);
                                                            } else {
                                                                setExpandedPlan(isExpanded ? null : planKey);
                                                            }
                                                        }
                                                    }}
                                                    style={{
                                                        display: "flex",
                                                        justifyContent: "space-between",
                                                        alignItems: "center",
                                                        cursor: "pointer",
                                                        userSelect: "none",
                                                        outline: "none",
                                                        WebkitTapHighlightColor: "transparent",
                                                        gap: "10px"
                                                    }}
                                                >
                                                    <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flex: "1 1 auto" }}>
                                                        {/* Radio Circle */}
                                                        <div
                                                            style={{
                                                                width: "18px",
                                                                height: "18px",
                                                                borderRadius: "50%",
                                                                border: isSelected ? "5px solid #556B2F" : "1.5px solid var(--muted-foreground)",
                                                                backgroundColor: "transparent",
                                                                flexShrink: 0,
                                                                boxSizing: "border-box",
                                                                transition: "all 0.15s ease"
                                                            }}
                                                        />
                                                        <div style={{ minWidth: 0, flex: "1 1 auto" }}>
                                                            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                                                                <span style={{ fontWeight: 800, fontSize: isMobile ? "14.5px" : "15.5px", color: "var(--foreground)" }}>
                                                                    {planItem.displayName}
                                                                </span>
                                                                {isLastPlan && (
                                                                    <span style={{
                                                                        backgroundColor: "rgba(85, 107, 47, 0.14)",
                                                                        color: "#556B2F",
                                                                        fontSize: "10px",
                                                                        fontWeight: 700,
                                                                        padding: "2px 7px",
                                                                        borderRadius: "50px"
                                                                    }}>
                                                                        Votre offre
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div style={{
                                                                fontSize: isMobile ? "11px" : "11.5px",
                                                                color: "var(--muted-foreground)",
                                                                marginTop: "2px",
                                                                whiteSpace: "nowrap",
                                                                overflow: "hidden",
                                                                textOverflow: "ellipsis"
                                                            }}>
                                                                {planItem.description}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Price + Accordion Chevron */}
                                                    <div style={{ display: "flex", alignItems: "center", gap: isMobile ? "6px" : "10px", flexShrink: 0 }}>
                                                        <div style={{ textAlign: "right" }}>
                                                            <span style={{ fontSize: isMobile ? "16.5px" : "18.5px", fontWeight: 900, color: isSelected ? "#556B2F" : "var(--foreground)" }}>
                                                                {itemPrice} €
                                                            </span>
                                                            <span style={{ fontSize: "10.5px", color: "var(--muted-foreground)" }}> HT/m</span>
                                                        </div>
                                                        <div
                                                            style={{
                                                                display: "flex",
                                                                alignItems: "center",
                                                                justifyContent: "center",
                                                                width: "26px",
                                                                height: "26px",
                                                                borderRadius: "50%",
                                                                backgroundColor: isExpanded ? "var(--muted)" : "transparent",
                                                                color: "var(--muted-foreground)",
                                                                transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                                                                transition: "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.2s ease"
                                                            }}
                                                        >
                                                            <ChevronDown size={15} />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Collapsible Full Info */}
                                                <div
                                                    style={{
                                                        display: "grid",
                                                        gridTemplateRows: isExpanded ? "1fr" : "0fr",
                                                        transition: "grid-template-rows 0.28s cubic-bezier(0.4, 0, 0.2, 1)"
                                                    }}
                                                >
                                                    <div style={{ overflow: "hidden" }}>
                                                        <div
                                                            style={{
                                                                display: "flex",
                                                                flexDirection: "column",
                                                                gap: "6px",
                                                                paddingTop: "10px",
                                                                marginTop: "10px",
                                                                borderTop: "1px solid var(--border)"
                                                            }}
                                                        >
                                                            <div style={{ fontSize: "11px", color: "var(--muted-foreground)", fontWeight: 600, marginBottom: "2px" }}>
                                                                {billingCycle === "ANNUAL" ? "Facturation annuelle (-20%)" : "Facturation mensuelle sans engagement"}
                                                            </div>
                                                            {planItem.features.map((f, i) => (
                                                                <div key={i} style={{ display: "flex", alignItems: "center", gap: "7px", fontSize: isMobile ? "11.5px" : "12px", color: "var(--foreground)" }}>
                                                                    <CheckCircle2 size={13} color="#22C55E" style={{ flexShrink: 0 }} />
                                                                    <span>{f}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Terms & Auto-renewal confirmation box */}
                                <div
                                    role="checkbox"
                                    aria-checked={agreeTerms}
                                    tabIndex={0}
                                    onClick={() => setAgreeTerms(!agreeTerms)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault();
                                            setAgreeTerms(!agreeTerms);
                                        }
                                    }}
                                    style={{ 
                                        display: "flex", 
                                        alignItems: "center", 
                                        gap: "10px", 
                                        padding: isMobile ? "10px 12px" : "11px 14px",
                                        borderRadius: "10px",
                                        backgroundColor: agreeTerms ? "rgba(85, 107, 47, 0.08)" : "var(--background)",
                                        border: agreeTerms ? "1px solid rgba(85, 107, 47, 0.45)" : "1px dashed var(--muted-foreground)",
                                        cursor: "pointer", 
                                        userSelect: "none",
                                        transition: "all 0.15s ease"
                                    }}
                                >
                                    <div
                                        style={{
                                            width: "18px",
                                            height: "18px",
                                            borderRadius: "5px",
                                            backgroundColor: agreeTerms ? "#556B2F" : "transparent",
                                            border: agreeTerms ? "1.5px solid #556B2F" : "1.5px solid var(--muted-foreground)",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            color: "#FFFFFF",
                                            flexShrink: 0,
                                            transition: "all 0.15s ease"
                                        }}
                                    >
                                        {agreeTerms && <Check size={13} strokeWidth={3} />}
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
                                        <span style={{ fontSize: isMobile ? "11.5px" : "12px", fontWeight: 600, color: "var(--foreground)", lineHeight: "1.3" }}>
                                            J'accepte le renouvellement automatique
                                        </span>
                                        <span style={{ fontSize: isMobile ? "10.5px" : "11px", color: "var(--muted-foreground)", lineHeight: "1.3" }}>
                                            Résiliation en 1 clic à tout moment sans frais
                                        </span>
                                    </div>
                                </div>

                                {/* Checkout Button */}
                                <button
                                    type="button"
                                    onClick={handleCheckout}
                                    disabled={loading || !agreeTerms}
                                    style={{
                                        width: "100%", 
                                        padding: isMobile ? "11px 16px" : "12px 20px",
                                        backgroundColor: (loading || !agreeTerms) ? "var(--muted, #94A3B8)" : "#556B2F",
                                        color: "#FFF", 
                                        border: "none", 
                                        borderRadius: "10px",
                                        fontSize: isMobile ? "13.5px" : "14px", 
                                        fontWeight: 700,
                                        cursor: (loading || !agreeTerms) ? "not-allowed" : "pointer",
                                        display: "flex", 
                                        alignItems: "center", 
                                        justifyContent: "center", 
                                        gap: "8px",
                                        boxShadow: (loading || !agreeTerms) ? "none" : "0 3px 10px rgba(85,107,47,0.25)",
                                        opacity: !agreeTerms ? 0.6 : 1,
                                        transition: "all 0.15s ease"
                                    }}
                                >
                                    {loading ? (
                                        <><Loader2 size={15} className="spin-loader" /> Redirection vers Stripe...</>
                                    ) : (
                                        <><Lock size={14} /> Payer {currentPriceMonthly} € HT · Stripe <ArrowRight size={14} /></>
                                    )}
                                </button>

                                {/* Security Footer */}
                                <div style={{ 
                                    display: "flex", 
                                    alignItems: "center", 
                                    justifyContent: "center", 
                                    gap: "5px", 
                                    fontSize: "11px", 
                                    color: "#16A34A", 
                                    fontWeight: 600 
                                }}>
                                    <ShieldCheck size={13} /> Paiement 100% sécurisé · Cryptage SSL 256 bits
                                </div>
                            </>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>,
        document.body
    );
}
