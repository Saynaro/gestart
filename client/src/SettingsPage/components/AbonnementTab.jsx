import React, { useState, useEffect, useRef, useMemo } from "react";
import {
    CreditCard,
    Star,
    Check,
    Download,
    AlertCircle,
    ExternalLink,
    AlertTriangle,
    RefreshCw,
    Shield,
    Loader2
} from "lucide-react";
import { API_URL } from "../../utils/config";
import { apiFetch } from "../../utils/api";
import { useSubscription } from "../../utils/useSubscription";
import { useUser } from "../../utils/useUser";
import StripeCheckoutModal from "./StripeCheckoutModal";
import SubscriptionReceiptModal from "./SubscriptionReceiptModal";

export default function AbonnementTab({ isMobileView, triggerToast, triggerConfirm }) {
    const comparisonRef = useRef(null);
    const { subscription: contextSub, displayName: contextPlanName, refreshSubscription } = useSubscription();
    const { user, company } = useUser();

    // Subscription & Usage States
    const [billingCycle, setBillingCycle] = useState("mensuel"); // "mensuel" | "annuel"
    const [currentPlan, setCurrentPlan] = useState(() => contextPlanName || contextSub?.plan?.displayName || "Pro");
    const [subDetails, setSubDetails] = useState(() => contextSub || null);
    const [usage, setUsage] = useState({
        clients: { current: 0, max: contextSub?.plan?.maxClients ?? -1 },
        technicians: { current: 1, max: contextSub?.plan?.maxTechnicians ?? -1 },
        sms: { current: 0, max: contextSub?.plan?.maxSmsPerMonth ?? 1000 }
    });
    const [paymentHistory, setPaymentHistory] = useState([]);
    const [loadingData, setLoadingData] = useState(true);
    const [activeReceipt, setActiveReceipt] = useState(null);

    // Sync from context when contextSub updates
    useEffect(() => {
        if (contextSub) {
            setSubDetails(contextSub);
            setCurrentPlan(contextPlanName || contextSub.plan?.displayName || "Pro");
            if (contextSub.cycle === "ANNUAL") {
                setBillingCycle("annuel");
            }
        }
    }, [contextSub, contextPlanName]);

    // Stripe Checkout Modal state
    const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
    const [selectedTargetPlan, setSelectedTargetPlan] = useState("PRO");
    const [checkoutMode, setCheckoutMode] = useState("checkout"); // "checkout" | "card_only"
    const [actionLoading, setActionLoading] = useState(false);

    // Fetch subscription, usage, and payments history
    const loadAllSubscriptionData = async () => {
        setLoadingData(true);
        try {
            const [subRes, usageRes, invRes] = await Promise.all([
                apiFetch('/v1/subscription').catch(() => null),
                apiFetch('/v1/subscription/usage').catch(() => null),
                apiFetch('/v1/subscription/invoices').catch(() => null)
            ]);

            const sub = subRes?.data?.subscription || subRes?.subscription || contextSub;
            if (sub) {
                setSubDetails(sub);
                const planName = sub.plan?.displayName || sub.plan?.name || contextPlanName || "Pro";
                setCurrentPlan(planName);
                if (sub.cycle === "ANNUAL") {
                    setBillingCycle("annuel");
                }
            }

            const u = usageRes?.data?.usage || usageRes?.usage;
            if (u) {
                setUsage(u);
            }

            const invoices = invRes?.data?.invoices || invRes?.invoices;
            if (Array.isArray(invoices)) {
                setPaymentHistory(invoices);
            }
        } catch (err) {
            console.warn("Error fetching subscription details:", err.message);
        } finally {
            setLoadingData(false);
        }
    };

    useEffect(() => {
        const handleSuccessRedirect = async () => {
            const params = new URLSearchParams(window.location.search);
            const isSuccess = params.get("success") === "true";
            const sessionId = params.get("session_id");
            const isCanceled = params.get("canceled") === "true";

            // Clean up query parameters immediately from URL to avoid re-triggering on back/refresh
            if (isSuccess || isCanceled || sessionId) {
                window.history.replaceState({}, document.title, window.location.pathname + '?tab=abonnement');
            }

            if (isCanceled) {
                if (triggerToast) triggerToast("Paiement annulé. Aucun prélèvement n'a été effectué.", true);
                return;
            }

            // ONLY verify if we have a real Stripe session_id
            if (isSuccess && sessionId) {
                try {
                    const verifyRes = await apiFetch('/v1/subscription/verify-session', {
                        method: 'POST',
                        body: JSON.stringify({ sessionId })
                    });
                    if (verifyRes.success) {
                        const newPlanName = verifyRes.data?.subscription?.plan?.displayName || "Pro";
                        setCurrentPlan(newPlanName);
                        if (triggerToast) triggerToast(`Paiement validé avec succès ! Abonnement ${newPlanName} activé.`);
                    }
                } catch (e) {
                    console.warn("Session verification failed:", e);
                    if (triggerToast) triggerToast("Le paiement n'a pas pu être validé.", true);
                }
            }
        };

        handleSuccessRedirect().then(() => {
            loadAllSubscriptionData();
        });
    }, []);

    // Stripe Subscription Checkout handler
    const handleSelectPlanStripe = async (planName) => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch(`${API_URL}/v1/subscription/create-checkout-session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    planName: planName.toUpperCase(),
                    cycle: billingCycle === 'annuel' ? 'ANNUAL' : 'MONTHLY'
                })
            });

            const data = await response.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                alert(data.message || "Impossible d'initier l'abonnement Stripe");
            }
        } catch (err) {
            alert("Erreur de communication avec le serveur Stripe");
        }
    };

    const isCancelled = subDetails?.status === "CANCELLED" || Boolean(subDetails?.cancelledAt);

    // Cancel Subscription with real prompt
    const handleCancelSubscription = () => {
        const confirmMsg = `Êtes-vous sûr de vouloir résilier votre abonnement ? Vous conserverez l'accès complet à vos fonctionnalités jusqu'au ${formattedRenewalDate}. Aucun prélèvement ne sera effectué le mois suivant.`;

        if (triggerConfirm) {
            triggerConfirm({
                title: "Résilier l'abonnement ?",
                message: confirmMsg,
                confirmText: "Oui, résilier",
                cancelText: "Garder mon offre",
                onConfirm: async () => {
                    executeCancel();
                }
            });
        } else if (window.confirm(confirmMsg)) {
            executeCancel();
        }
    };

    const executeCancel = async () => {
        setActionLoading(true);
        try {
            const res = await apiFetch('/v1/subscription/cancel', { method: 'POST' });
            if (triggerToast) triggerToast(res.message || "Abonnement résilié avec succès. Aucun prélèvement futur ne sera effectué.", true);
            await loadAllSubscriptionData();
            if (refreshSubscription) refreshSubscription();
        } catch (err) {
            if (triggerToast) triggerToast(err.message || "Erreur lors de la résiliation", true);
        } finally {
            setActionLoading(false);
        }
    };

    // Reactivate subscription with prompt confirming date and amount
    const handleReactivateSubscription = () => {
        const confirmMsg = `Votre abonnement ${currentPlan} sera réactivé. Le prochain prélèvement automatique de ${currentPriceText} sera effectué le ${formattedRenewalDate}. Souhaitez-vous continuer ?`;

        if (triggerConfirm) {
            triggerConfirm({
                title: "Réactiver l'abonnement ?",
                message: confirmMsg,
                confirmText: "Confirmer la réactivation",
                cancelText: "Annuler",
                type: "success",
                onConfirm: async () => {
                    executeReactivate();
                }
            });
        } else if (window.confirm(confirmMsg)) {
            executeReactivate();
        }
    };

    const executeReactivate = async () => {
        setActionLoading(true);
        try {
            const res = await apiFetch('/v1/subscription/reactivate', { method: 'POST' });
            if (triggerToast) triggerToast(`✓ Abonnement ${currentPlan} réactivé avec succès ! Prochain prélèvement le ${formattedRenewalDate}.`);
            await loadAllSubscriptionData();
            if (refreshSubscription) refreshSubscription();
        } catch (err) {
            if (triggerToast) triggerToast(err.message || "Erreur lors de la réactivation", true);
        } finally {
            setActionLoading(false);
        }
    };

    // Pricing definition
    const plans = [
        {
            name: "Starter",
            priceMonthly: 1,
            priceAnnual: 1,
            clientsLimit: 50,
            techsLimit: 1,
            smsLimit: 50,
            features: [
                "1 technicien (le patron lui-même)",
                "Fiches clients + équipements",
                "Planning & Signature devis",
                "50 SMS manuels/mois",
                "Export comptable Excel",
                "Support email"
            ]
        },
        {
            name: "Pro",
            priceMonthly: 1,
            priceAnnual: 1,
            clientsLimit: 300,
            techsLimit: 10,
            smsLimit: 500,
            recommended: true,
            features: [
                "Toutes les fonctions Starter",
                "Jusqu'à 10 techniciens inclus",
                "Rappels SMS automatiques",
                "App Mobile Techniciens",
                "Module auto-entrepreneur URSSAF",
                "Support prioritaire 7j/7"
            ]
        },
        {
            name: "Unlimited",
            priceMonthly: 1,
            priceAnnual: 1,
            clientsLimit: "Illimité",
            techsLimit: "Illimité",
            smsLimit: 1000,
            features: [
                "Tout en illimité",
                "Techniciens & Clients illimités",
                "Accès API REST dédié",
                "Chorus Pro & Numéro dédié",
                "Gestion multi-sociétés"
            ]
        }
    ];

    // Format renewal date
    const formattedRenewalDate = useMemo(() => {
        if (!subDetails?.currentPeriodEnd) return "15 août 2026";
        try {
            const d = new Date(subDetails.currentPeriodEnd);
            return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
        } catch {
            return "15 août 2026";
        }
    }, [subDetails]);

    // Current price formatted
    const currentPriceText = useMemo(() => {
        const p = subDetails?.plan || contextSub?.plan;
        if (!p) return "129,00 € HT / mois";
        const cycle = subDetails?.cycle || contextSub?.cycle || "MONTHLY";
        const price = cycle === "ANNUAL" ? p.priceAnnual : p.priceMonthly;
        const period = cycle === "ANNUAL" ? "an" : "mois";
        return `${Number(price || 1).toFixed(2).replace(".", ",")} € HT / ${period}`;
    }, [subDetails, contextSub]);

    // Usage percentages for gauges
    const clientsPercent = useMemo(() => {
        if (!usage.clients || usage.clients.max === -1) return 20;
        return Math.min(100, Math.round((usage.clients.current / usage.clients.max) * 100)) || 0;
    }, [usage.clients]);

    const techsPercent = useMemo(() => {
        if (!usage.technicians || usage.technicians.max === -1) return 20;
        return Math.min(100, Math.round((usage.technicians.current / usage.technicians.max) * 100)) || 0;
    }, [usage.technicians]);

    const smsPercent = useMemo(() => {
        if (!usage.sms || usage.sms.max === -1) return 20;
        const used = usage.sms.current || 0;
        const max = usage.sms.max || 50;
        const remaining = Math.max(0, max - used);
        return Math.min(100, Math.round((remaining / max) * 100)) || 0;
    }, [usage.sms]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Carte Plan Actuel & Consommation */}
            <div style={{
                background: isCancelled
                    ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(239, 68, 68, 0.02) 100%)'
                    : 'linear-gradient(135deg, rgba(85, 107, 47, 0.08) 0%, rgba(85, 107, 47, 0.02) 100%)',
                border: isCancelled ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(85, 107, 47, 0.25)',
                borderRadius: '16px',
                padding: '24px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                                backgroundColor: isCancelled ? '#EF4444' : '#556B2F',
                                color: '#fff',
                                fontSize: '11px',
                                fontWeight: 800,
                                padding: '4px 12px',
                                borderRadius: '50px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em'
                            }}>
                                Offre actuelle : {currentPlan}
                            </span>
                            {isCancelled && (
                                <span style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontSize: '11px', fontWeight: 800, padding: '4px 10px', borderRadius: '50px' }}>
                                    Résiliation programmée
                                </span>
                            )}
                        </div>

                        <h3 style={{ margin: '10px 0 4px 0', fontSize: '22px', fontWeight: 800 }}>
                            {currentPriceText}
                        </h3>

                        <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted-foreground)' }}>
                            {isCancelled ? (
                                <span>Fin de la période d'accès le <strong>{formattedRenewalDate}</strong></span>
                            ) : (
                                <span>Prochain prélèvement le <strong>{formattedRenewalDate}</strong> via Carte bancaire</span>
                            )}
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {/* Scroll smooth to Comparer nos formules */}
                        <button
                            type="button"
                            onClick={() => {
                                comparisonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }}
                            style={{
                                padding: '10px 18px',
                                backgroundColor: '#556B2F',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '10px',
                                fontWeight: 700,
                                fontSize: '13px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                boxShadow: '0 4px 12px rgba(85, 107, 47, 0.25)'
                            }}
                        >
                            <Star size={15} fill="currentColor" />
                            Changer de plan
                        </button>

                        {/* Manage Card Button */}
                        <button
                            type="button"
                            onClick={() => {
                                setSelectedTargetPlan(currentPlan || 'PRO');
                                setCheckoutMode('card_only');
                                setCheckoutModalOpen(true);
                            }}
                            style={{
                                padding: '10px 18px',
                                backgroundColor: 'var(--card)',
                                color: 'var(--foreground)',
                                border: '1px solid var(--border)',
                                borderRadius: '10px',
                                fontWeight: 700,
                                fontSize: '13px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                        >
                            <CreditCard size={15} />
                            Gérer ma carte
                        </button>

                        {/* Cancel or Reactivate button */}
                        {isCancelled ? (
                            <button
                                type="button"
                                onClick={handleReactivateSubscription}
                                disabled={actionLoading}
                                style={{
                                    padding: '10px 18px',
                                    backgroundColor: '#22C55E',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '10px',
                                    fontWeight: 700,
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                <RefreshCw size={14} />
                                Réactiver l'abonnement
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleCancelSubscription}
                                disabled={actionLoading}
                                style={{
                                    padding: '10px 18px',
                                    backgroundColor: 'transparent',
                                    color: '#ef4444',
                                    border: '1px solid rgba(239, 68, 68, 0.4)',
                                    borderRadius: '10px',
                                    fontWeight: 700,
                                    fontSize: '13px',
                                    cursor: 'pointer'
                                }}
                            >
                                Résilier l'abonnement
                            </button>
                        )}
                    </div>
                </div>

                {/* Real Dynamic Usage Gauges */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '22px', paddingTop: '18px', borderTop: '1px solid rgba(85, 107, 47, 0.15)' }}>
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', fontWeight: 700, marginBottom: '6px' }}>
                            <span>Clients</span>
                            <span>{usage.clients?.current ?? 0} / {usage.clients?.max === -1 ? 'Illimité' : (usage.clients?.max ?? 50)}</span>
                        </div>
                        <div style={{ height: '8px', backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${clientsPercent}%`, height: '100%', backgroundColor: '#556B2F', borderRadius: '4px', transition: 'width 0.3s' }} />
                        </div>
                    </div>

                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', fontWeight: 700, marginBottom: '6px' }}>
                            <span>Techniciens / Membres</span>
                            <span>{usage.technicians?.current ?? 1} / {usage.technicians?.max === -1 ? 'Illimité' : (usage.technicians?.max ?? 1)}</span>
                        </div>
                        <div style={{ height: '8px', backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${techsPercent}%`, height: '100%', backgroundColor: '#f59e0b', borderRadius: '4px', transition: 'width 0.3s' }} />
                        </div>
                    </div>

                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', fontWeight: 700, marginBottom: '6px' }}>
                            <span>Crédits SMS restants</span>
                            <span>{Math.max(0, (usage.sms?.max ?? 50) - (usage.sms?.current ?? 0))} / {usage.sms?.max === -1 ? 'Illimité' : (usage.sms?.max ?? 50)}</span>
                        </div>
                        <div style={{ height: '8px', backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${smsPercent}%`, height: '100%', backgroundColor: '#22c55e', borderRadius: '4px', transition: 'width 0.3s' }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Comparer nos formules section with Ref for smooth scroll */}
            <div ref={comparisonRef} style={{ border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', backgroundColor: 'var(--card)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800 }}>Comparer nos formules</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--background)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                        <button
                            type="button"
                            onClick={() => setBillingCycle("mensuel")}
                            style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', fontWeight: 700, fontSize: '12px', cursor: 'pointer', backgroundColor: billingCycle === 'mensuel' ? 'var(--card)' : 'transparent', color: billingCycle === 'mensuel' ? 'var(--foreground)' : 'var(--muted-foreground)', boxShadow: billingCycle === 'mensuel' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}
                        >
                            Facturation mensuelle
                        </button>
                        <button
                            type="button"
                            onClick={() => setBillingCycle("annuel")}
                            style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', fontWeight: 700, fontSize: '12px', cursor: 'pointer', backgroundColor: billingCycle === 'annuel' ? 'var(--card)' : 'transparent', color: billingCycle === 'annuel' ? '#556B2F' : 'var(--muted-foreground)', boxShadow: billingCycle === 'annuel' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}
                        >
                            Facturation annuelle <span style={{ color: '#22c55e', fontWeight: 800 }}>-20%</span>
                        </button>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px', alignItems: 'stretch' }}>
                    {plans.map((plan) => {
                        const price = billingCycle === "annuel" ? plan.priceAnnual : plan.priceMonthly;
                        const isCurrent = currentPlan.toLowerCase() === plan.name.toLowerCase();

                        return (
                            <div
                                key={plan.name}
                                style={{
                                    border: plan.recommended ? '2px solid #556B2F' : '1px solid var(--border)',
                                    borderRadius: '14px',
                                    padding: '22px',
                                    position: 'relative',
                                    backgroundColor: plan.recommended ? 'rgba(85, 107, 47, 0.04)' : 'var(--background)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    height: '100%',
                                    boxSizing: 'border-box'
                                }}
                            >
                                {plan.recommended && (
                                    <span style={{ position: 'absolute', top: '-11px', right: '18px', backgroundColor: '#556B2F', color: '#fff', fontSize: '10px', fontWeight: 800, padding: '3px 10px', borderRadius: '50px', letterSpacing: '0.5px' }}>
                                        RECOMMANDÉ
                                    </span>
                                )}

                                <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column' }}>
                                    <h4 style={{ margin: '0 0 6px 0', fontSize: '17px', fontWeight: 800 }}>{plan.name}</h4>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '16px' }}>
                                        <span style={{ fontSize: '26px', fontWeight: 800 }}>{price} €</span>
                                        <span style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>HT / mois</span>
                                    </div>

                                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px 0', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                                        {plan.features.map((feat, idx) => (
                                            <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Check size={15} style={{ color: '#22c55e', flexShrink: 0 }} />
                                                <span>{feat}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div style={{ marginTop: 'auto', paddingTop: '10px' }}>
                                    {isCurrent ? (
                                        <button
                                            type="button"
                                            disabled
                                            style={{
                                                width: '100%',
                                                padding: '11px',
                                                borderRadius: '10px',
                                                border: '1px solid var(--border)',
                                                backgroundColor: 'var(--card)',
                                                color: 'var(--muted-foreground)',
                                                fontWeight: 700,
                                                fontSize: '13px',
                                                cursor: 'default',
                                                boxSizing: 'border-box'
                                            }}
                                        >
                                            Plan actuel
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => handleSelectPlanStripe(plan.name)}
                                            style={{
                                                width: '100%',
                                                padding: '11px',
                                                borderRadius: '10px',
                                                border: 'none',
                                                backgroundColor: plan.recommended ? '#556B2F' : 'var(--foreground)',
                                                color: 'var(--background)',
                                                fontWeight: 700,
                                                fontSize: '13px',
                                                cursor: 'pointer',
                                                boxShadow: plan.recommended ? '0 4px 14px rgba(85, 107, 47, 0.3)' : 'none',
                                                boxSizing: 'border-box',
                                                transition: 'transform 0.15s'
                                            }}
                                        >
                                            Choisir {plan.name}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Real Stripe Payment History */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', backgroundColor: 'var(--card)' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CreditCard size={18} style={{ color: '#556B2F' }} />
                    Historique des règlements Stripe
                </h3>

                {paymentHistory.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', backgroundColor: 'var(--background)', borderRadius: '12px', color: 'var(--muted-foreground)', fontSize: '13px' }}>
                        Aucun paiement enregistré pour l'instant.
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--muted-foreground)' }}>
                                    <th style={{ padding: '10px 8px', fontWeight: 700 }}>N° Facture / Réf</th>
                                    <th style={{ padding: '10px 8px', fontWeight: 700 }}>Date</th>
                                    <th style={{ padding: '10px 8px', fontWeight: 700 }}>Montant</th>
                                    <th style={{ padding: '10px 8px', fontWeight: 700 }}>Statut</th>
                                    <th style={{ padding: '10px 8px', fontWeight: 700, textAlign: 'right' }}>Reçu</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paymentHistory.map((item, index) => {
                                    const paymentDate = item.paidAt || item.createdAt;
                                    const formattedDate = paymentDate ? new Date(paymentDate).toLocaleDateString('fr-FR') : '-';
                                    const displayId = item.id ? `REC-${item.id.slice(-6).toUpperCase()}` : `INV-${index + 1}`;
                                    const amountFormatted = `${Number(item.amount || 1).toFixed(2).replace('.', ',')} € HT`;

                                    return (
                                        <tr key={item.id || index} style={{ borderBottom: '1px solid var(--border)' }}>
                                            <td style={{ padding: '12px 8px', fontWeight: 700 }}>{displayId}</td>
                                            <td style={{ padding: '12px 8px', color: 'var(--muted-foreground)' }}>{formattedDate}</td>
                                            <td style={{ padding: '12px 8px', fontWeight: 700 }}>{amountFormatted}</td>
                                            <td style={{ padding: '12px 8px' }}>
                                                <span style={{
                                                    backgroundColor: item.status === 'succeeded' || item.status === 'paid' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                                                    color: item.status === 'succeeded' || item.status === 'paid' ? '#22c55e' : '#ef4444',
                                                    fontSize: '11px',
                                                    padding: '3px 8px',
                                                    borderRadius: '50px',
                                                    fontWeight: 700
                                                }}>
                                                    {item.status === 'succeeded' || item.status === 'paid' ? 'Payé' : 'Échoué'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setActiveReceipt({
                                                            id: item.id,
                                                            displayId,
                                                            formattedDate,
                                                            amount: item.amount || 1,
                                                            planName: item.planName || currentPlan || 'Unlimited',
                                                            status: item.status
                                                        });
                                                    }}
                                                    style={{ background: 'none', border: 'none', color: 'var(--sidebar-primary)', cursor: 'pointer', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                                >
                                                    <Download size={14} /> PDF
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Stripe Notion-style Checkout Modal */}
            <StripeCheckoutModal
                isOpen={checkoutModalOpen}
                onClose={() => setCheckoutModalOpen(false)}
                targetPlan={selectedTargetPlan}
                initialCycle={billingCycle === "annuel" ? "ANNUAL" : "MONTHLY"}
                mode={checkoutMode}
                onSuccess={async (updatedSub) => {
                    await loadAllSubscriptionData();
                    if (triggerToast) triggerToast(checkoutMode === "card_only" ? "Carte bancaire mise à jour !" : "Souscription mise à jour avec succès !");
                }}
            />

            {/* Subscription Payment Receipt Modal */}
            {activeReceipt && (
                <SubscriptionReceiptModal
                    receipt={activeReceipt}
                    user={user}
                    company={company}
                    currentPlan={currentPlan}
                    onClose={() => setActiveReceipt(null)}
                />
            )}
        </div>
    );
}
