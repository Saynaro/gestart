import React, { useState } from "react";
import { CreditCard, Sparkles, Check, Download, AlertCircle, ExternalLink } from "lucide-react";

export default function AbonnementTab({ isMobileView, triggerToast, triggerConfirm }) {
    const [billingCycle, setBillingCycle] = useState("mensuel"); // "mensuel" | "annuel"
    // Stripe Connect IBAN handler
    const [connectLoading, setConnectLoading] = useState(false);

    const handleConnectStripeIBAN = async () => {
        setConnectLoading(true);
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch('/api/v1/company/stripe-connect/connect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                alert(data.message || "Erreur lors de la génération du lien Stripe Connect");
            }
        } catch (err) {
            alert("Erreur lors de la connexion à Stripe");
        } finally {
            setConnectLoading(false);
        }
    };

    // Stripe Subscription Checkout handler
    const handleSelectPlanStripe = async (planName) => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch('/api/v1/subscription/create-checkout-session', {
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

    const plans = [
        {
            name: "Starter",
            priceMonthly: 34,
            priceAnnual: 27,
            clientsLimit: 50,
            techsLimit: 2,
            smsLimit: 100,
            features: ["Gestion clients & devis", "Rappels SMS automatiques", "Export comptable basique", "Support email"]
        },
        {
            name: "Pro",
            priceMonthly: 69,
            priceAnnual: 55,
            clientsLimit: 300,
            techsLimit: 10,
            smsLimit: 500,
            recommended: true,
            features: ["Toutes les fonctions Starter", "Intégration Pennylane / Indy", "App Mobile Techniciens", "Module auto-entrepreneur URSSAF", "Support prioritaire 7j/7"]
        },
        {
            name: "Unlimited",
            priceMonthly: 129,
            priceAnnual: 103,
            clientsLimit: "Illimité",
            techsLimit: "Illimité",
            smsLimit: 1000,
            features: ["Tout en illimité", "Accès API REST dédié", "Chorus Pro & Numéro dédié", "Gestion multi-sociétés"]
        }
    ];

    const paymentHistory = [
        { id: "INV-2026-007", date: "15/07/2026", amount: "39,00 € HT", status: "Payé", pdf: "recu-2026-07.pdf" },
        { id: "INV-2026-006", date: "15/06/2026", amount: "39,00 € HT", status: "Payé", pdf: "recu-2026-06.pdf" },
        { id: "INV-2026-005", date: "15/05/2026", amount: "39,00 € HT", status: "Payé", pdf: "recu-2026-05.pdf" },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Carte Plan Actuel & Consommation */}
            <div style={{ background: 'linear-gradient(135deg, rgba(91, 77, 219, 0.08) 0%, rgba(91, 77, 219, 0.02) 100%)', border: '1px solid rgba(91, 77, 219, 0.2)', borderRadius: '14px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <span style={{ backgroundColor: 'var(--sidebar-primary)', color: '#fff', fontSize: '11px', fontWeight: 800, padding: '3px 10px', borderRadius: '50px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Offre actuelle : {currentPlan}
                        </span>
                        <h3 style={{ margin: '8px 0 2px 0', fontSize: '20px', fontWeight: 800 }}>39,00 € HT / mois</h3>
                        <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--muted-foreground)' }}>Prochain prélèvement le <strong>15 août 2026</strong> via Carte •••• 4920</p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            type="button"
                            onClick={() => setShowStripeModal(true)}
                            style={{ padding: '9px 16px', backgroundColor: 'var(--sidebar-primary)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            <Sparkles size={15} />
                            Changer de plan
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowPortalModal(true)}
                            style={{ padding: '9px 16px', backgroundColor: 'var(--card)', color: 'var(--foreground)', border: '1px solid var(--border)', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            <CreditCard size={15} />
                            Gérer ma carte (Stripe Portal)
                        </button>
                    </div>
                </div>

                {/* Jauges d'utilisation */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(91, 77, 219, 0.15)' }}>
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                            <span>Clients</span>
                            <span>34 / 50</span>
                        </div>
                        <div style={{ height: '8px', backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: '68%', height: '100%', backgroundColor: 'var(--sidebar-primary)', borderRadius: '4px' }} />
                        </div>
                    </div>

                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                            <span>Techniciens / Membres</span>
                            <span>2 / 2</span>
                        </div>
                        <div style={{ height: '8px', backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: '100%', height: '100%', backgroundColor: '#f59e0b', borderRadius: '4px' }} />
                        </div>
                    </div>

                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                            <span>Crédits SMS restants</span>
                            <span>142 / 150</span>
                        </div>
                        <div style={{ height: '8px', backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: '94%', height: '100%', backgroundColor: '#22c55e', borderRadius: '4px' }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Carte Stripe Connect - Virement Bancaire IBAN */}
            <div style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(34, 197, 94, 0.02) 100%)', border: '1px solid rgba(34, 197, 94, 0.25)', borderRadius: '14px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                            <CreditCard size={20} style={{ color: '#16A34A' }} />
                            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800 }}>Compte Bancaire (IBAN / RIB) — Stripe Connect</h3>
                        </div>
                        <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted-foreground)', maxWidth: '560px', lineHeight: 1.5 }}>
                            Renseignez votre IBAN d'entreprise pour recevoir les paiements par carte bancaire de vos clients (factures, devis signés, acomptes) directement sur votre compte.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={handleConnectStripeIBAN}
                        disabled={connectLoading}
                        style={{
                            padding: '12px 22px',
                            background: 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '30px',
                            fontWeight: 700,
                            fontSize: '14px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)'
                        }}
                    >
                        <ExternalLink size={16} />
                        {connectLoading ? 'Connexion Stripe...' : 'Connecter mon IBAN / RIB →'}
                    </button>
                </div>
            </div>

            {/* Selecteur de Plan & Toggle Mensuel / Annuel */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '14px', padding: '20px', backgroundColor: 'var(--card)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Comparer nos formules</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--background)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                        <button
                            type="button"
                            onClick={() => setBillingCycle("mensuel")}
                            style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', fontWeight: 600, fontSize: '12px', cursor: 'pointer', backgroundColor: billingCycle === 'mensuel' ? 'var(--card)' : 'transparent', color: billingCycle === 'mensuel' ? 'var(--foreground)' : 'var(--muted-foreground)', boxShadow: billingCycle === 'mensuel' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}
                        >
                            Facturation mensuelle
                        </button>
                        <button
                            type="button"
                            onClick={() => setBillingCycle("annuel")}
                            style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', fontWeight: 600, fontSize: '12px', cursor: 'pointer', backgroundColor: billingCycle === 'annuel' ? 'var(--card)' : 'transparent', color: billingCycle === 'annuel' ? 'var(--sidebar-primary)' : 'var(--muted-foreground)', boxShadow: billingCycle === 'annuel' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}
                        >
                            Facturation annuelle <span style={{ color: '#22c55e', fontWeight: 800 }}>-20%</span>
                        </button>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                    {plans.map((plan) => {
                        const price = billingCycle === "annuel" ? plan.priceAnnual : plan.priceMonthly;
                        const isCurrent = currentPlan === plan.name;
                        return (
                            <div
                                key={plan.name}
                                style={{
                                    border: isCurrent ? '2px solid var(--sidebar-primary)' : '1px solid var(--border)',
                                    borderRadius: '12px',
                                    padding: '18px',
                                    backgroundColor: isCurrent ? 'rgba(91, 77, 219, 0.02)' : 'var(--card)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justify: 'space-between',
                                    position: 'relative'
                                }}
                            >
                                {plan.recommended && (
                                    <span style={{ position: 'absolute', top: '-10px', right: '16px', backgroundColor: '#5B4DDB', color: '#fff', fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '50px' }}>
                                        RECOMMANDÉ
                                    </span>
                                )}
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>{plan.name}</h4>
                                    <div style={{ margin: '12px 0', fontSize: '24px', fontWeight: 800, color: 'var(--foreground)' }}>
                                        {price} € <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--muted-foreground)' }}>HT / mois</span>
                                    </div>
                                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px 0', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                                        {plan.features.map((f, i) => (
                                            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Check size={14} style={{ color: 'var(--sidebar-primary)' }} />
                                                <span>{f}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setCurrentPlan(plan.name);
                                        triggerToast(`Formule modifiée vers ${plan.name} via Stripe !`);
                                    }}
                                    disabled={isCurrent}
                                    style={{
                                        padding: '9px',
                                        borderRadius: '8px',
                                        border: isCurrent ? '1px solid var(--border)' : 'none',
                                        backgroundColor: isCurrent ? 'var(--background)' : 'var(--sidebar-primary)',
                                        color: isCurrent ? 'var(--muted-foreground)' : '#fff',
                                        fontWeight: 700,
                                        fontSize: '12.5px',
                                        cursor: isCurrent ? 'default' : 'pointer'
                                    }}
                                >
                                    {isCurrent ? "Plan actuel" : `Choisir ${plan.name}`}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Historique des factures et paiements */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '14px', padding: '20px', backgroundColor: 'var(--card)' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 700 }}>Historique des règlements Stripe</h3>
                {isMobileView ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {paymentHistory.map((item) => (
                            <div key={item.id} style={{ padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--background)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--foreground)' }}>{item.id}</span>
                                    <span style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', fontSize: '11px', padding: '2px 8px', borderRadius: '50px', fontWeight: 700 }}>
                                        {item.status}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px' }}>
                                    <span style={{ color: 'var(--muted-foreground)' }}>{item.date}</span>
                                    <span style={{ fontWeight: 700, color: 'var(--foreground)' }}>{item.amount}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '6px', borderTop: '1px dashed var(--border)' }}>
                                    <button
                                        type="button"
                                        onClick={() => triggerToast(`Téléchargement de la facture PDF ${item.id}...`)}
                                        style={{ background: 'none', border: 'none', color: 'var(--sidebar-primary)', cursor: 'pointer', fontWeight: 600, fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                    >
                                        <Download size={14} /> PDF
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted-foreground)', textAlign: 'left' }}>
                                    <th style={{ padding: '8px' }}>N° Facture</th>
                                    <th style={{ padding: '8px' }}>Date</th>
                                    <th style={{ padding: '8px' }}>Montant</th>
                                    <th style={{ padding: '8px' }}>Statut</th>
                                    <th style={{ padding: '8px', textAlign: 'right' }}>Reçu PDF</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paymentHistory.map((item) => (
                                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '10px 8px', fontWeight: 600 }}>{item.id}</td>
                                        <td style={{ padding: '10px 8px' }}>{item.date}</td>
                                        <td style={{ padding: '10px 8px', fontWeight: 600 }}>{item.amount}</td>
                                        <td style={{ padding: '10px 8px' }}>
                                            <span style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', fontSize: '11px', padding: '2px 8px', borderRadius: '50px', fontWeight: 700 }}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                                            <button
                                                type="button"
                                                onClick={() => triggerToast(`Téléchargement de la facture PDF ${item.id}...`)}
                                                style={{ background: 'none', border: 'none', color: 'var(--sidebar-primary)', cursor: 'pointer', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                            >
                                                <Download size={14} /> PDF
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button
                        type="button"
                        onClick={() => {
                            if (triggerConfirm) {
                                triggerConfirm({
                                    title: "Résiliation d'abonnement",
                                    message: "Êtes-vous sûr de vouloir résilier votre abonnement à la fin de la période en cours ?",
                                    confirmText: "Oui, résilier",
                                    cancelText: "Conserver mon offre",
                                    onConfirm: () => {
                                        triggerToast("Demande d'annulation prise en compte. Votre accès reste actif jusqu'au 15/08/2026.");
                                    }
                                });
                            } else if (window.confirm("Êtes-vous sûr de vouloir résilier votre abonnement à la fin de la période en cours ?")) {
                                triggerToast("Demande d'annulation prise en compte. Votre accès reste actif jusqu'au 15/08/2026.");
                            }
                        }}
                        style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                    >
                        Annuler l'abonnement
                    </button>
                </div>
            </div>

            {/* Modal Stripe Checkout Simulation */}
            {showStripeModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                    <div style={{ backgroundColor: 'var(--card)', borderRadius: '16px', padding: '24px', maxWidth: '420px', width: '100%', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                            <CreditCard size={24} style={{ color: 'var(--sidebar-primary)' }} />
                            <h4 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>Stripe Checkout Simulation</h4>
                        </div>
                        <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', marginBottom: '20px' }}>
                            Vous allez passer au plan <strong>{currentPlan}</strong> ({billingCycle}). Le paiement sécurisé est géré par Stripe.
                        </p>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button type="button" onClick={() => setShowStripeModal(false)} style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--background)', fontWeight: 600 }}>Annuler</button>
                            <button type="button" onClick={() => { setShowStripeModal(false); triggerToast("Abonnement mis à jour via Stripe !"); }} style={{ padding: '9px 16px', borderRadius: '8px', backgroundColor: 'var(--sidebar-primary)', color: '#fff', border: 'none', fontWeight: 600 }}>Payer & Valider</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Stripe Customer Portal */}
            {showPortalModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                    <div style={{ backgroundColor: 'var(--card)', borderRadius: '16px', padding: '24px', maxWidth: '420px', width: '100%', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                            <ExternalLink size={24} style={{ color: 'var(--sidebar-primary)' }} />
                            <h4 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>Portail Client Stripe</h4>
                        </div>
                        <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', marginBottom: '20px' }}>
                            Redirection vers votre portail sécurisé Stripe pour mettre à jour votre carte bancaire ou consulter vos factures officielles.
                        </p>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button type="button" onClick={() => setShowPortalModal(false)} style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--background)', fontWeight: 600 }}>Fermer</button>
                            <button type="button" onClick={() => { setShowPortalModal(false); triggerToast("Portail Stripe ouvert."); }} style={{ padding: '9px 16px', borderRadius: '8px', backgroundColor: 'var(--sidebar-primary)', color: '#fff', border: 'none', fontWeight: 600 }}>Accéder au portail</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
