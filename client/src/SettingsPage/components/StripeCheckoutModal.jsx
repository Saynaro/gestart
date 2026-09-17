import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Lock, Shield, ShieldCheck, Loader2, AlertCircle, Star, CreditCard, ArrowRight, CheckCircle2 } from "lucide-react";
import { apiFetch } from "../../utils/api";

const PLANS_INFO = {
    STARTER: { name: "STARTER", displayName: "Starter", priceMonthly: 1, priceAnnual: 1, description: "1 technicien, 50 clients max, devis & facturation illimités", features: ["1 technicien", "50 clients max", "Devis & facturation illimités", "Support email"] },
    PRO: { name: "PRO", displayName: "Pro", priceMonthly: 1, priceAnnual: 1, description: "10 techniciens, 300 clients, rappels SMS & App mobile", features: ["10 techniciens", "300 clients", "App mobile incluse", "Rappels SMS auto", "Support prioritaire"] },
    UNLIMITED: { name: "UNLIMITED", displayName: "Unlimited", priceMonthly: 1, priceAnnual: 1, description: "Clients & techniciens illimités, API REST & Chorus Pro", features: ["Illimité tout", "API REST", "Chorus Pro", "Manager dédié", "SLA garanti"] }
};

export default function StripeCheckoutModal({ isOpen, onClose, targetPlan = "PRO", initialCycle = "MONTHLY", onSuccess, mode = "checkout" }) {
    const [plan, setPlan] = useState(targetPlan.toUpperCase());
    const [billingCycle, setBillingCycle] = useState(initialCycle);
    const [agreeTerms, setAgreeTerms] = useState(true);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    useEffect(() => { setPlan(targetPlan.toUpperCase()); }, [targetPlan]);
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
            setErrorMsg("Veuillez accepter les Conditions Générales de Vente pour continuer.");
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
                // Redirect to Stripe Checkout (works in all browsers including Safari)
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
            <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.8)", backdropFilter: "blur(10px)", zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", overflowY: "auto" }}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    style={{ backgroundColor: "var(--card, #1E293B)", color: "var(--foreground, #F8FAFC)", borderRadius: "22px", maxWidth: mode === "card_only" ? "460px" : "860px", width: "100%", border: "1px solid var(--border, rgba(255,255,255,0.1))", boxShadow: "0 32px 64px -12px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)", overflow: "hidden", position: "relative", maxHeight: "92vh", display: "flex", flexDirection: "column" }}
                >
                    {/* Header */}
                    <div style={{ padding: "24px 28px 18px 28px", borderBottom: "1px solid var(--border, rgba(255,255,255,0.07))", display: "flex", alignItems: "flex-start", justifyContent: "space-between", background: "linear-gradient(180deg, rgba(85,107,47,0.08) 0%, transparent 100%)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <span style={{ width: "36px", height: "36px", borderRadius: "10px", background: "linear-gradient(135deg, #556B2F, #6B8E23)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <CreditCard size={18} color="#FFF" />
                            </span>
                            <div>
                                <h2 style={{ fontSize: "20px", fontWeight: 800, margin: "0 0 4px 0" }}>
                                    {mode === "card_only" ? "Gérer ma carte bancaire" : `Passer à l'offre ${currentPlanObj.displayName}`}
                                </h2>
                                <p style={{ margin: 0, fontSize: "13px", color: "var(--muted-foreground, #94A3B8)" }}>
                                    {mode === "card_only" ? "Vos données sont sécurisées par Stripe" : "Paiement 100% sécurisé · Annulable à tout moment · Facture automatique"}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--border, rgba(255,255,255,0.1))", borderRadius: "8px", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--muted-foreground, #94A3B8)" }}
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Body */}
                    <div style={{ padding: "24px 28px", overflowY: "auto", display: mode === "card_only" ? "block" : "grid", gridTemplateColumns: mode === "card_only" ? "1fr" : "repeat(auto-fit, minmax(300px, 1fr))", gap: "28px" }}>

                        {/* Left column: Form */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            {errorMsg && (
                                <div style={{ backgroundColor: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.35)", borderRadius: "10px", padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px", color: "#FCA5A5", fontSize: "13px" }}>
                                    <AlertCircle size={16} style={{ flexShrink: 0 }} /><span>{errorMsg}</span>
                                </div>
                            )}

                            {/* Stripe redirect info box */}
                            {mode !== "card_only" && (
                                <div style={{ background: "linear-gradient(135deg, rgba(85,107,47,0.08), rgba(107,142,35,0.06))", border: "1px solid rgba(85,107,47,0.25)", borderRadius: "14px", padding: "18px", display: "flex", flexDirection: "column", gap: "12px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                        <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "linear-gradient(135deg, #556B2F, #6B8E23)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                            <Shield size={18} color="#FFF" />
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 800, fontSize: "14px" }}>Paiement sécurisé par Stripe</div>
                                            <div style={{ fontSize: "12px", color: "var(--muted-foreground, #94A3B8)" }}>Vous serez redirigé vers la page sécurisée de Stripe</div>
                                        </div>
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", paddingTop: "6px", borderTop: "1px solid var(--border, rgba(255,255,255,0.08))" }}>
                                        {["Paiement par Carte bancaire, Apple Pay ou Google Pay", "Données bancaires 100% hébergées chez Stripe (PCI-DSS niveau 1)", "Aucun numéro de carte ne transite par nos serveurs"].map((t, i) => (
                                            <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "var(--muted-foreground, #94A3B8)" }}>
                                                <CheckCircle2 size={13} color="#22C55E" style={{ flexShrink: 0 }} />
                                                <span>{t}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {mode === "card_only" && (
                                <div style={{ background: "linear-gradient(135deg, rgba(85,107,47,0.08), rgba(107,142,35,0.06))", border: "1px solid rgba(85,107,47,0.25)", borderRadius: "14px", padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                        <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "linear-gradient(135deg, #556B2F, #6B8E23)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                            <CreditCard size={20} color="#FFF" />
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: "14px" }}>Portail de gestion Stripe</div>
                                            <div style={{ fontSize: "12px", color: "var(--muted-foreground, #94A3B8)" }}>Gérez votre carte et abonnement en toute sécurité</div>
                                        </div>
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                                        {[
                                            { icon: "💳", text: "Changer ou ajouter une carte bancaire" },
                                            { icon: "🧾", text: "Télécharger vos factures et reçus" },
                                            { icon: "🔄", text: "Mettre à jour vos informations de facturation" },
                                            { icon: "❌", text: "Annuler votre abonnement si nécessaire" }
                                        ].map((item, i) => (
                                            <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "var(--muted-foreground, #94A3B8)" }}>
                                                <span style={{ fontSize: "14px" }}>{item.icon}</span><span>{item.text}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {mode === "card_only" && (
                                <button onClick={handleCardOnly} disabled={loading}
                                    style={{ width: "100%", padding: "14px", background: loading ? "#374151" : "#556B2F", color: "#FFF", border: "none", borderRadius: "12px", fontSize: "15px", fontWeight: 800, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", boxShadow: loading ? "none" : "0 10px 25px rgba(85,107,47,0.35)", transition: "all 0.2s ease" }}>
                                    {loading ? <><Loader2 size={17} className="spin-loader" /> Ouverture...</> : <><CreditCard size={16} /> Gérer ma carte sur Stripe <ArrowRight size={16} /></>}
                                </button>
                            )}

                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontSize: "11px", color: "#22C55E", fontWeight: 700 }}>
                                <ShieldCheck size={14} /> Cryptage SSL 256 bits · Stripe Verified · PCI DSS
                            </div>
                        </div>

                        {/* Right column: Order Summary */}
                        {mode !== "card_only" && (
                            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                                {/* Billing toggle */}
                                <div>
                                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "8px", color: "var(--muted-foreground, #94A3B8)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Fréquence de facturation</label>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                        {[
                                            { value: "MONTHLY", label: "Paiement mensuel", sub: "Sans engagement", price: currentPlanObj.priceMonthly, badge: null },
                                            { value: "ANNUAL", label: "Paiement annuel", sub: "Économisez 20%", price: currentPlanObj.priceAnnual, badge: "-20%" }
                                        ].map(opt => {
                                            const isSelected = billingCycle === opt.value;
                                            return (
                                                <div key={opt.value} onClick={() => setBillingCycle(opt.value)}
                                                    style={{
                                                        boxSizing: "border-box",
                                                        padding: "14px 16px",
                                                        borderRadius: "12px",
                                                        border: `1.5px solid ${isSelected ? "#556B2F" : "var(--border, rgba(0,0,0,0.1))"}`,
                                                        backgroundColor: isSelected ? "rgba(85,107,47,0.08)" : "transparent",
                                                        cursor: "pointer",
                                                        display: "flex",
                                                        justifyContent: "space-between",
                                                        alignItems: "center",
                                                        gap: "12px",
                                                        transition: "background-color 0.15s ease, border-color 0.15s ease"
                                                    }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                                                        <div style={{
                                                            width: "18px",
                                                            height: "18px",
                                                            minWidth: "18px",
                                                            minHeight: "18px",
                                                            boxSizing: "border-box",
                                                            borderRadius: "50%",
                                                            border: isSelected ? "5px solid #556B2F" : "2px solid var(--muted-foreground, #64748B)",
                                                            backgroundColor: "#FFF",
                                                            flexShrink: 0,
                                                            transition: "border 0.15s ease"
                                                        }} />
                                                        <div style={{ minWidth: 0 }}>
                                                            <span style={{ fontWeight: 600, fontSize: "14px", display: "block" }}>{opt.label}</span>
                                                            <div style={{ fontSize: "12px", color: opt.value === "ANNUAL" ? "#22C55E" : "var(--muted-foreground, #94A3B8)", fontWeight: opt.value === "ANNUAL" ? 600 : 400 }}>{opt.sub}</div>
                                                        </div>
                                                    </div>
                                                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                                                        <span style={{ fontWeight: 700, fontSize: "14px", whiteSpace: "nowrap" }}>{opt.price} € <span style={{ fontSize: "11px", fontWeight: 500 }}>HT/mois</span></span>
                                                        {opt.badge && <span style={{ display: "block", fontSize: "10px", backgroundColor: "#22C55E", color: "#FFF", padding: "2px 7px", borderRadius: "20px", fontWeight: 700, marginTop: "3px" }}>{opt.badge}</span>}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Summary + features */}
                                <div style={{ backgroundColor: "var(--background, #0F172A)", border: "1px solid var(--border, rgba(255,255,255,0.1))", borderRadius: "16px", padding: "20px" }}>
                                    <div style={{ fontSize: "11px", color: "var(--muted-foreground, #94A3B8)", fontWeight: 700, marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.8px" }}>RÉCAPITULATIF</div>
                                    <div style={{ fontSize: "28px", fontWeight: 900, marginBottom: "2px", color: "#556B2F" }}>
                                        {currentPriceMonthly} € <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--foreground, #F8FAFC)" }}>HT / mois</span>
                                    </div>
                                    <div style={{ fontSize: "12px", color: "var(--muted-foreground, #94A3B8)", marginBottom: "14px" }}>
                                        Offre {currentPlanObj.displayName} · {billingCycle === "ANNUAL" ? "Facturation annuelle" : "Facturation mensuelle"}
                                    </div>

                                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px" }}>
                                        {currentPlanObj.features.map((f, i) => (
                                            <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px" }}>
                                                <CheckCircle2 size={14} color="#22C55E" style={{ flexShrink: 0 }} />
                                                <span>{f}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "12px", color: "var(--muted-foreground, #94A3B8)", cursor: "pointer", lineHeight: "1.45", marginBottom: "16px" }}>
                                        <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} style={{ marginTop: "2px", accentColor: "#556B2F", flexShrink: 0 }} />
                                        <span>Votre abonnement sera renouvelé automatiquement. Annulable à tout moment depuis les réglages.</span>
                                    </label>

                                    <button
                                        onClick={handleCheckout}
                                        disabled={loading || !agreeTerms}
                                        style={{
                                            width: "100%", padding: "15px",
                                            background: (loading || !agreeTerms) ? "#374151" : "#556B2F",
                                            color: "#FFF", border: "none", borderRadius: "12px",
                                            fontSize: "15px", fontWeight: 800,
                                            cursor: (loading || !agreeTerms) ? "not-allowed" : "pointer",
                                            display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
                                            boxShadow: (loading || !agreeTerms) ? "none" : "0 10px 25px rgba(85,107,47,0.35)",
                                            opacity: !agreeTerms ? 0.55 : 1,
                                            transition: "all 0.2s ease"
                                        }}
                                    >
                                        {loading ? (
                                            <><Loader2 size={17} className="spin-loader" /> Création de la session...</>
                                        ) : (
                                            <><Lock size={16} /> Payer {currentPriceMonthly} € · Continuer sur Stripe <ArrowRight size={16} /></>
                                        )}
                                    </button>

                                    <p style={{ fontSize: "11px", color: "var(--muted-foreground, #64748B)", textAlign: "center", margin: "10px 0 0 0", lineHeight: "1.5" }}>
                                        Vous serez redirigé vers <strong>checkout.stripe.com</strong> — page de paiement officielle Stripe, compatible tous navigateurs.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>,
        document.body
    );
}
