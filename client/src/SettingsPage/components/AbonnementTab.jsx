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
    Loader2,
    ChevronDown,
    ChevronUp
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
    const [expandedPlan, setExpandedPlan] = useState(null);

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
            const checkoutUrl = data.data?.checkoutUrl || data.checkoutUrl || data.url;
            if (checkoutUrl) {
                window.location.href = checkoutUrl;
            } else {
                alert(data.message || "Impossible d'initier l'abonnement Stripe");
            }
        } catch (err) {
            alert("Erreur de communication avec le serveur Stripe");
        }
    };

    const isCancelled = subDetails?.status === "CANCELLED" || Boolean(subDetails?.cancelledAt);
    const now = new Date();
    const periodEnd = subDetails?.status === 'TRIALING' ? subDetails?.trialEndsAt : subDetails?.currentPeriodEnd;
    const isPeriodEnded = Boolean(periodEnd && new Date(periodEnd) < now);
    const isExpired = subDetails?.status === 'EXPIRED' || isPeriodEnded;

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

    // Direct redirect to Stripe Customer Portal for managing card & billing
    const handleOpenStripePortal = async () => {
        setActionLoading(true);
        try {
            if (triggerToast) triggerToast("Redirection vers le portail sécurisé Stripe...");
            const res = await apiFetch('/v1/subscription/portal');
            const portalUrl = res.data?.portalUrl;
            if (portalUrl) {
                window.location.href = portalUrl;
                return;
            }
            if (triggerToast) triggerToast("Impossible d'accéder au portail Stripe.", true);
        } catch (err) {
            if (triggerToast) triggerToast(err.message || "Erreur lors de l'accès au portail Stripe.", true);
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
            summary: "1 utilisateur · 100 clients · 100 SMS",
            clientsLimit: 100,
            techsLimit: 1,
            smsLimit: 100,
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
        {
            name: "Pro",
            priceMonthly: 1,
            priceAnnual: 1,
            summary: "5 techniciens · 500 clients · 500 SMS · App mobile",
            clientsLimit: 500,
            techsLimit: 5,
            smsLimit: 500,
            recommended: true,
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
        {
            name: "Unlimited",
            priceMonthly: 1,
            priceAnnual: 1,
            summary: "Illimité clients & techniciens · 1 500 SMS",
            clientsLimit: "Illimité",
            techsLimit: "Illimité",
            smsLimit: 1500,
            features: [
                "Toutes les fonctions Pro",
                "Techniciens & Clients 100% Illimités",
                "1 500 SMS / mois inclus",
                "Facturation électronique intégrale",
                "Gestion multi-activités & Export comptable",
                "Support VIP prioritaire 7j/7"
            ]
        }
    ];

    // Format renewal date
    const formattedRenewalDate = useMemo(() => {
        const rawDate = subDetails?.currentPeriodEnd || subDetails?.trialEndsAt;
        if (!rawDate) return "Non défini";
        try {
            const d = new Date(rawDate);
            return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
        } catch {
            return "Non défini";
        }
    }, [subDetails]);

    // Current price formatted
    const currentPriceText = useMemo(() => {
        const p = subDetails?.plan || contextSub?.plan;
        if (!p) return "--";
        const cycle = subDetails?.cycle || contextSub?.cycle || "MONTHLY";
        const price = cycle === "ANNUAL" ? p.priceAnnual : p.priceMonthly;
        const period = cycle === "ANNUAL" ? "an" : "mois";
        return `${Number(price || 0).toFixed(2).replace(".", ",")} € HT / ${period}`;
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobileView ? '16px' : '24px' }}>
            {/* Carte Plan Actuel & Consommation */}
            <div style={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: isMobileView ? '16px' : '16px',
                padding: isMobileView ? '16px 18px' : '24px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: isMobileView ? '14px' : '16px' }}>
                    <div style={{ width: isMobileView ? '100%' : 'auto', flex: '1 1 auto' }}>
                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                            {isExpired ? (
                                <>
                                    <span style={{
                                        backgroundColor: '#dc2626',
                                        color: '#fff',
                                        fontSize: isMobileView ? '11.5px' : '11px',
                                        fontWeight: 800,
                                        padding: isMobileView ? '4px 10px' : '4px 12px',
                                        borderRadius: '50px',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.04em'
                                    }}>
                                        Abonnement expiré
                                    </span>
                                    <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        color: '#EF4444',
                                        fontSize: isMobileView ? '13px' : '12px',
                                        fontWeight: 800
                                    }}>
                                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#EF4444', display: 'inline-block' }}></span>
                                        Accès suspendu (Mode consultation)
                                    </span>
                                </>
                            ) : (
                                <>
                                    <span style={{
                                        backgroundColor: '#556B2F',
                                        color: '#fff',
                                        fontSize: isMobileView ? '11.5px' : '11px',
                                        fontWeight: 800,
                                        padding: isMobileView ? '4px 10px' : '4px 12px',
                                        borderRadius: '50px',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.04em'
                                    }}>
                                        Offre actuelle : {currentPlan}
                                    </span>
                                    {isCancelled ? (
                                        <span style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            color: '#EF4444',
                                            fontSize: isMobileView ? '13px' : '12px',
                                            fontWeight: 800
                                        }}>
                                            <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#EF4444', display: 'inline-block' }}></span>
                                            Résiliation programmée
                                        </span>
                                    ) : (
                                        <span style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            color: '#16A34A',
                                            fontSize: isMobileView ? '13px' : '12px',
                                            fontWeight: 700
                                        }}>
                                            <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#16A34A', display: 'inline-block' }}></span>
                                            Abonnement actif
                                        </span>
                                    )}
                                </>
                            )}
                        </div>

                        <h3 style={{ margin: isMobileView ? '10px 0 5px 0' : '10px 0 4px 0', fontSize: isMobileView ? '20px' : '22px', fontWeight: 800 }}>
                            {isExpired ? "Accès limité en lecture seule" : currentPriceText}
                        </h3>

                        <p style={{ margin: 0, fontSize: isMobileView ? '13px' : '13px', color: 'var(--muted-foreground)', lineHeight: isMobileView ? '1.45' : 'normal' }}>
                            {isExpired ? (
                                <span>Votre période d'accès à l'offre <strong>{currentPlan}</strong> a pris fin le <strong style={{ color: '#EF4444' }}>{formattedRenewalDate}</strong>. Vos données sont préservées.</span>
                            ) : isCancelled ? (
                                <span>Fin de la période d'accès le <strong style={{ color: '#EF4444' }}>{formattedRenewalDate}</strong></span>
                            ) : (
                                <span>Prochain prélèvement le <strong>{formattedRenewalDate}</strong> via Carte bancaire</span>
                            )}
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: isMobileView ? '10px' : '10px', flexWrap: 'wrap', width: isMobileView ? '100%' : 'auto' }}>
                        {isExpired ? (
                            <>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedTargetPlan(currentPlan?.toUpperCase() || 'UNLIMITED');
                                        setCheckoutMode('checkout');
                                        setCheckoutModalOpen(true);
                                    }}
                                    style={{
                                        flex: isMobileView ? '1 1 auto' : 'initial',
                                        justifyContent: 'center',
                                        padding: isMobileView ? '12px 18px' : '10px 20px',
                                        backgroundColor: '#16a34a',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '10px',
                                        fontWeight: 800,
                                        fontSize: isMobileView ? '14px' : '13px',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        boxShadow: '0 2px 8px rgba(22, 163, 74, 0.25)'
                                    }}
                                >
                                    <RefreshCw size={15} />
                                    Renouveler mon abonnement
                                </button>
                                <button
                                    type="button"
                                    onClick={handleOpenStripePortal}
                                    disabled={actionLoading}
                                    style={{
                                        flex: isMobileView ? '1 1 auto' : 'initial',
                                        justifyContent: 'center',
                                        padding: isMobileView ? '12px 18px' : '10px 18px',
                                        backgroundColor: 'var(--card)',
                                        color: 'var(--foreground)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '10px',
                                        fontWeight: 700,
                                        fontSize: isMobileView ? '14px' : '13px',
                                        cursor: actionLoading ? 'wait' : 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        opacity: actionLoading ? 0.7 : 1
                                    }}
                                >
                                    <CreditCard size={15} />
                                    {actionLoading ? "Ouverture..." : "Gérer ma carte"}
                                </button>
                            </>
                        ) : (
                            <>
                                {/* Scroll smooth to Comparer nos formules */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        comparisonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    }}
                                    style={{
                                        flex: isMobileView ? '1 1 auto' : 'initial',
                                        justifyContent: 'center',
                                        padding: isMobileView ? '12px 18px' : '10px 18px',
                                        backgroundColor: '#556B2F',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '10px',
                                        fontWeight: 700,
                                        fontSize: isMobileView ? '14px' : '13px',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        boxShadow: '0 2px 8px rgba(85, 107, 47, 0.2)'
                                    }}
                                >
                                    <Star size={15} fill="currentColor" />
                                    Changer de plan
                                </button>

                                {/* Manage Card Button */}
                                <button
                                    type="button"
                                    onClick={handleOpenStripePortal}
                                    disabled={actionLoading}
                                    style={{
                                        flex: isMobileView ? '1 1 auto' : 'initial',
                                        justifyContent: 'center',
                                        padding: isMobileView ? '12px 18px' : '10px 18px',
                                        backgroundColor: 'var(--card)',
                                        color: 'var(--foreground)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '10px',
                                        fontWeight: 700,
                                        fontSize: isMobileView ? '14px' : '13px',
                                        cursor: actionLoading ? 'wait' : 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        opacity: actionLoading ? 0.7 : 1
                                    }}
                                >
                                    <CreditCard size={15} />
                                    {actionLoading ? "Ouverture..." : "Gérer ma carte"}
                                </button>

                                {/* Cancel or Reactivate button */}
                                {isCancelled ? (
                                    <button
                                        type="button"
                                        onClick={handleReactivateSubscription}
                                        disabled={actionLoading}
                                        style={{
                                            flex: isMobileView ? '1 1 100%' : 'initial',
                                            justifyContent: 'center',
                                            padding: isMobileView ? '12px 18px' : '10px 18px',
                                            backgroundColor: '#22C55E',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: '10px',
                                            fontWeight: 700,
                                            fontSize: isMobileView ? '14px' : '13px',
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '8px'
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
                                            flex: isMobileView ? '1 1 100%' : 'initial',
                                            justifyContent: 'center',
                                            padding: isMobileView ? '12px 18px' : '10px 18px',
                                            backgroundColor: 'transparent',
                                            color: '#EF4444',
                                            border: '1px solid rgba(239, 68, 68, 0.3)',
                                            borderRadius: '10px',
                                            fontWeight: 700,
                                            fontSize: isMobileView ? '14px' : '13px',
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}
                                    >
                                        Résilier l'abonnement
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Progress Gauges */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobileView ? '1fr' : 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: isMobileView ? '14px' : '20px',
                    marginTop: isMobileView ? '16px' : '24px',
                    paddingTop: isMobileView ? '16px' : '20px',
                    borderTop: '1px solid var(--border)'
                }}>
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: isMobileView ? '6px' : '8px', fontSize: isMobileView ? '13.5px' : '13px' }}>
                            <span style={{ color: 'var(--muted-foreground)', fontWeight: 600 }}>Clients</span>
                            <span style={{ fontWeight: 800 }}>{usage.clients.current} / {usage.clients.max === -1 ? 'Illimité' : usage.clients.max}</span>
                        </div>
                        <div style={{ height: isMobileView ? '8px' : '8px', backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${clientsPercent}%`, height: '100%', backgroundColor: clientsPercent > 90 ? '#ef4444' : '#556B2F', borderRadius: '4px', transition: 'width 0.3s' }} />
                        </div>
                    </div>

                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: isMobileView ? '6px' : '8px', fontSize: isMobileView ? '13.5px' : '13px' }}>
                            <span style={{ color: 'var(--muted-foreground)', fontWeight: 600 }}>Techniciens / Membres</span>
                            <span style={{ fontWeight: 800 }}>{usage.technicians.current} / {usage.technicians.max === -1 ? 'Illimité' : usage.technicians.max}</span>
                        </div>
                        <div style={{ height: isMobileView ? '8px' : '8px', backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${techsPercent}%`, height: '100%', backgroundColor: techsPercent > 90 ? '#ef4444' : '#f59e0b', borderRadius: '4px', transition: 'width 0.3s' }} />
                        </div>
                    </div>

                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: isMobileView ? '6px' : '8px', fontSize: isMobileView ? '13.5px' : '13px' }}>
                            <span style={{ color: 'var(--muted-foreground)', fontWeight: 600 }}>Crédits SMS restants</span>
                            <span style={{ fontWeight: 800 }}>{usage.sms.max === -1 ? 'Illimité' : `${Math.max(0, usage.sms.max - usage.sms.current)} / ${usage.sms.max}`}</span>
                        </div>
                        <div style={{ height: isMobileView ? '8px' : '8px', backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${smsPercent}%`, height: '100%', backgroundColor: '#22c55e', borderRadius: '4px', transition: 'width 0.3s' }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Comparer nos formules section with Ref for smooth scroll */}
            <div ref={comparisonRef} style={{ border: '1px solid var(--border)', borderRadius: isMobileView ? '16px' : '16px', padding: isMobileView ? '16px 18px' : '24px', backgroundColor: 'var(--card)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobileView ? '16px' : '20px', flexWrap: 'wrap', gap: '10px' }}>
                    <h3 style={{ margin: 0, fontSize: isMobileView ? '17px' : '17px', fontWeight: 800 }}>Comparer nos formules</h3>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'var(--muted, #F4F3EF)',
                        border: '1px solid var(--border)',
                        borderRadius: '50px',
                        padding: '3px',
                        width: isMobileView ? '100%' : 'auto',
                        boxSizing: 'border-box'
                    }}>
                        <button
                            type="button"
                            onClick={() => setBillingCycle("mensuel")}
                            style={{
                                flex: isMobileView ? 1 : 'initial',
                                padding: isMobileView ? '9px 16px' : '8px 18px',
                                borderRadius: '50px',
                                border: 'none',
                                fontWeight: billingCycle === 'mensuel' ? 700 : 500,
                                fontSize: isMobileView ? '13.5px' : '13px',
                                cursor: 'pointer',
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                backgroundColor: billingCycle === 'mensuel' ? 'var(--card, #ffffff)' : 'transparent',
                                color: billingCycle === 'mensuel' ? 'var(--foreground)' : 'var(--muted-foreground)',
                                boxShadow: billingCycle === 'mensuel' ? '0 2px 6px rgba(0, 0, 0, 0.08)' : 'none',
                                textAlign: 'center',
                                userSelect: 'none'
                            }}
                        >
                            Mensuel
                        </button>

                        <button
                            type="button"
                            onClick={() => setBillingCycle("annuel")}
                            style={{
                                flex: isMobileView ? 1 : 'initial',
                                padding: isMobileView ? '9px 16px' : '8px 18px',
                                borderRadius: '50px',
                                border: 'none',
                                fontWeight: billingCycle === 'annuel' ? 700 : 500,
                                fontSize: isMobileView ? '13.5px' : '13px',
                                cursor: 'pointer',
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                backgroundColor: billingCycle === 'annuel' ? 'var(--card, #ffffff)' : 'transparent',
                                color: billingCycle === 'annuel' ? 'var(--foreground)' : 'var(--muted-foreground)',
                                boxShadow: billingCycle === 'annuel' ? '0 2px 6px rgba(0, 0, 0, 0.08)' : 'none',
                                textAlign: 'center',
                                userSelect: 'none'
                            }}
                        >
                            Annuel
                            <span style={{
                                backgroundColor: 'rgba(34, 197, 94, 0.14)',
                                color: '#16a34a',
                                fontWeight: 800,
                                fontSize: '11px',
                                padding: '2px 7px',
                                borderRadius: '20px'
                            }}>
                                -20%
                            </span>
                        </button>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobileView ? '1fr' : 'repeat(auto-fit, minmax(240px, 1fr))', gap: isMobileView ? '12px' : '18px', alignItems: 'stretch' }}>
                    {plans.map((plan) => {
                        const price = billingCycle === "annuel" ? plan.priceAnnual : plan.priceMonthly;
                        const isCurrent = !isExpired && currentPlan.toLowerCase() === plan.name.toLowerCase();
                        const isExpanded = expandedPlan === plan.name;

                        if (isMobileView) {
                            return (
                                <div
                                    key={plan.name}
                                    style={{
                                        border: isCurrent ? '1.5px solid #556B2F' : '1px solid var(--border)',
                                        borderRadius: '14px',
                                        padding: '14px 16px',
                                        backgroundColor: 'var(--background)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        boxSizing: 'border-box',
                                        transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
                                    }}
                                >
                                    {/* Tapable Header: Title + Summary + Price + Chevron */}
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => setExpandedPlan(isExpanded ? null : plan.name)}
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            cursor: 'pointer',
                                            userSelect: 'none',
                                            outline: 'none',
                                            WebkitTapHighlightColor: 'transparent',
                                            gap: '8px'
                                        }}
                                    >
                                        <div style={{ flex: '1 1 auto' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <h4 style={{ margin: 0, fontSize: '16.5px', fontWeight: 800 }}>{plan.name}</h4>
                                                {isCurrent && (
                                                    <span style={{
                                                        backgroundColor: 'rgba(85, 107, 47, 0.12)',
                                                        color: '#556B2F',
                                                        fontSize: '11px',
                                                        fontWeight: 800,
                                                        padding: '2px 8px',
                                                        borderRadius: '50px'
                                                    }}>
                                                        Actuel
                                                    </span>
                                                )}
                                            </div>
                                            <p style={{ margin: '3px 0 0 0', fontSize: '12.5px', color: 'var(--muted-foreground)', lineHeight: '1.35' }}>
                                                {plan.summary}
                                            </p>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
                                                <span style={{ fontSize: '18px', fontWeight: 800 }}>{price} €</span>
                                                <span style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>HT/m</span>
                                            </div>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                width: '28px',
                                                height: '28px',
                                                borderRadius: '50%',
                                                backgroundColor: isExpanded ? 'var(--muted, #F4F3EF)' : 'transparent',
                                                color: 'var(--muted-foreground)',
                                                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                                transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.2s ease'
                                            }}>
                                                <ChevronDown size={16} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Smooth Animated Collapsible Content */}
                                    <div
                                        style={{
                                            display: 'grid',
                                            gridTemplateRows: isExpanded ? '1fr' : '0fr',
                                            transition: 'grid-template-rows 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                        }}
                                    >
                                        <div style={{ overflow: 'hidden' }}>
                                            <div style={{
                                                paddingTop: '14px',
                                                marginTop: '12px',
                                                borderTop: '1px solid var(--border)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '14px',
                                                opacity: isExpanded ? 1 : 0,
                                                transform: isExpanded ? 'translateY(0)' : 'translateY(-6px)',
                                                transition: 'opacity 0.25s ease, transform 0.25s ease'
                                            }}>
                                                <ul style={{
                                                    listStyle: 'none',
                                                    padding: 0,
                                                    margin: 0,
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '8px',
                                                    fontSize: '13.5px'
                                                }}>
                                                    {plan.features.map((feat, idx) => (
                                                        <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <Check size={14} style={{ color: '#22c55e', flexShrink: 0 }} />
                                                            <span>{feat}</span>
                                                        </li>
                                                    ))}
                                                </ul>

                                                <div>
                                                    {isCurrent ? (
                                                        <button
                                                            type="button"
                                                            disabled
                                                            style={{
                                                                width: '100%',
                                                                padding: '12px 16px',
                                                                borderRadius: '10px',
                                                                border: '1px solid var(--border)',
                                                                backgroundColor: 'var(--card)',
                                                                color: 'var(--muted-foreground)',
                                                                fontWeight: 700,
                                                                fontSize: '14px',
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
                                                                padding: '12px 16px',
                                                                borderRadius: '10px',
                                                                border: 'none',
                                                                backgroundColor: '#556B2F',
                                                                color: '#ffffff',
                                                                fontWeight: 700,
                                                                fontSize: '14px',
                                                                cursor: 'pointer',
                                                                boxShadow: '0 2px 8px rgba(85, 107, 47, 0.25)',
                                                                boxSizing: 'border-box'
                                                            }}
                                                        >
                                                            Choisir {plan.name}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        }

                        // Desktop Layout
                        return (
                            <div
                                key={plan.name}
                                style={{
                                    border: isCurrent ? '1.5px solid #556B2F' : '1px solid var(--border)',
                                    borderRadius: '14px',
                                    padding: '22px',
                                    backgroundColor: 'var(--background)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    height: '100%',
                                    boxSizing: 'border-box'
                                }}
                            >
                                <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <h4 style={{ margin: 0, fontSize: '17px', fontWeight: 800 }}>{plan.name}</h4>
                                        {isCurrent && (
                                            <span style={{
                                                backgroundColor: 'rgba(85, 107, 47, 0.12)',
                                                color: '#556B2F',
                                                fontSize: '10.5px',
                                                fontWeight: 800,
                                                padding: '2px 8px',
                                                borderRadius: '50px'
                                            }}>
                                                Plan actuel
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '16px' }}>
                                        <span style={{ fontSize: '26px', fontWeight: 800 }}>{price} €</span>
                                        <span style={{ fontSize: '11.5px', color: 'var(--muted-foreground)' }}>HT / mois</span>
                                    </div>

                                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px 0', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                                        {plan.features.map((feat, idx) => (
                                             <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                                <Check size={15} style={{ color: '#22c55e', flexShrink: 0 }} />
                                                <span>{feat}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div style={{ marginTop: 'auto', paddingTop: '8px' }}>
                                    {isCurrent ? (
                                        <button
                                            type="button"
                                            disabled
                                            style={{
                                                width: '100%',
                                                padding: '11px',
                                                borderRadius: '8px',
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
                                                borderRadius: '8px',
                                                border: 'none',
                                                backgroundColor: '#556B2F',
                                                color: '#ffffff',
                                                fontWeight: 700,
                                                fontSize: '13px',
                                                cursor: 'pointer',
                                                boxShadow: '0 2px 8px rgba(85, 107, 47, 0.25)',
                                                boxSizing: 'border-box',
                                                transition: 'transform 0.15s, opacity 0.15s'
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
            <div style={{ border: '1px solid var(--border)', borderRadius: isMobileView ? '16px' : '16px', padding: isMobileView ? '16px 18px' : '24px', backgroundColor: 'var(--card)' }}>
                <h3 style={{ margin: isMobileView ? '0 0 14px 0' : '0 0 16px 0', fontSize: isMobileView ? '17px' : '16px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CreditCard size={isMobileView ? 18 : 18} style={{ color: '#556B2F' }} />
                    Historique des règlements Stripe
                </h3>

                {paymentHistory.length === 0 ? (
                    <div style={{ padding: isMobileView ? '18px' : '24px', textAlign: 'center', backgroundColor: 'var(--background)', borderRadius: '12px', color: 'var(--muted-foreground)', fontSize: isMobileView ? '13.5px' : '13px' }}>
                        Aucun paiement enregistré pour l'instant.
                    </div>
                ) : isMobileView ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {paymentHistory.map((item, index) => {
                            const paymentDate = item.paidAt || item.createdAt;
                            const formattedDate = paymentDate ? new Date(paymentDate).toLocaleDateString('fr-FR') : '-';
                            const displayId = item.id ? `REC-${item.id.slice(-6).toUpperCase()}` : `INV-${index + 1}`;
                            const amountFormatted = `${Number(item.amount || 1).toFixed(2).replace('.', ',')} € HT`;
                            const isPaid = item.status === 'succeeded' || item.status === 'paid';

                            return (
                                <div
                                    key={item.id || index}
                                    role="button"
                                    tabIndex={0}
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
                                    className="payment-history-mobile-card"
                                    style={{
                                        backgroundColor: 'var(--background)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '12px',
                                        padding: '13px 15px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '8px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontWeight: 800, fontSize: '14.5px', color: 'var(--foreground)' }}>
                                                {displayId}
                                            </span>
                                            <span style={{
                                                backgroundColor: isPaid ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                                                color: isPaid ? '#22c55e' : '#ef4444',
                                                fontSize: '11.5px',
                                                padding: '2px 8px',
                                                borderRadius: '50px',
                                                fontWeight: 700,
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {isPaid ? 'Payé' : 'Échoué'}
                                            </span>
                                        </div>
                                        <span style={{ fontWeight: 800, fontSize: '15px', color: 'var(--foreground)' }}>
                                            {amountFormatted}
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: 'var(--muted-foreground)' }}>
                                        <span>{formattedDate}</span>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveReceipt({
                                                    id: item.id,
                                                    displayId,
                                                    formattedDate,
                                                    amount: item.amount || 1,
                                                    planName: item.planName || currentPlan || 'Unlimited',
                                                    status: item.status
                                                });
                                            }}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: 'var(--sidebar-primary)',
                                                cursor: 'pointer',
                                                fontWeight: 700,
                                                fontSize: '13px',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                padding: 0
                                            }}
                                        >
                                            <Download size={14} /> Télécharger PDF
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', whiteSpace: 'nowrap' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--muted-foreground)' }}>
                                    <th style={{ padding: '10px 8px', fontWeight: 700, whiteSpace: 'nowrap' }}>N° Facture / Réf</th>
                                    <th style={{ padding: '10px 8px', fontWeight: 700, whiteSpace: 'nowrap' }}>Date</th>
                                    <th style={{ padding: '10px 8px', fontWeight: 700, whiteSpace: 'nowrap' }}>Montant</th>
                                    <th style={{ padding: '10px 8px', fontWeight: 700, whiteSpace: 'nowrap' }}>Statut</th>
                                    <th style={{ padding: '10px 8px', fontWeight: 700, textAlign: 'right', whiteSpace: 'nowrap' }}>Reçu</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paymentHistory.map((item, index) => {
                                    const paymentDate = item.paidAt || item.createdAt;
                                    const formattedDate = paymentDate ? new Date(paymentDate).toLocaleDateString('fr-FR') : '-';
                                    const displayId = item.id ? `REC-${item.id.slice(-6).toUpperCase()}` : `INV-${index + 1}`;
                                    const amountFormatted = `${Number(item.amount || 1).toFixed(2).replace('.', ',')} € HT`;

                                    return (
                                        <tr 
                                            key={item.id || index} 
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
                                            className="payment-history-row"
                                            style={{ 
                                                borderBottom: '1px solid var(--border)',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <td style={{ padding: '12px 8px', fontWeight: 700, whiteSpace: 'nowrap' }}>{displayId}</td>
                                            <td style={{ padding: '12px 8px', color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>{formattedDate}</td>
                                            <td style={{ padding: '12px 8px', fontWeight: 700, whiteSpace: 'nowrap' }}>{amountFormatted}</td>
                                            <td style={{ padding: '12px 8px', whiteSpace: 'nowrap' }}>
                                                <span style={{
                                                    backgroundColor: item.status === 'succeeded' || item.status === 'paid' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                                                    color: item.status === 'succeeded' || item.status === 'paid' ? '#22c55e' : '#ef4444',
                                                    fontSize: '11px',
                                                    padding: '3px 8px',
                                                    borderRadius: '50px',
                                                    fontWeight: 700,
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {item.status === 'succeeded' || item.status === 'paid' ? 'Payé' : 'Échoué'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActiveReceipt({
                                                            id: item.id,
                                                            displayId,
                                                            formattedDate,
                                                            amount: item.amount || 1,
                                                            planName: item.planName || currentPlan || 'Unlimited',
                                                            status: item.status
                                                        });
                                                    }}
                                                    style={{ background: 'none', border: 'none', color: 'var(--sidebar-primary)', cursor: 'pointer', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
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
