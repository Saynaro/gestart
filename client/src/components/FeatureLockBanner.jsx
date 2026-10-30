import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Lock, ArrowRight, CheckCircle2, Shield } from 'lucide-react';
import StripeCheckoutModal from '../SettingsPage/components/StripeCheckoutModal';
import { useSubscription } from '../utils/useSubscription';

export default function FeatureLockBanner({
    title = "Fonctionnalité réservée à l'offre Pro",
    description = "Passez à l'offre Pro pour débloquer cette fonctionnalité et développer votre activité sans limites.",
    features = [
        "Jusqu'à 10 techniciens inclus",
        "Rappels SMS automatiques des entretiens",
        "Application mobile pour vos techniciens",
        "Module auto-entrepreneur URSSAF",
        "Support prioritaire 7j/7"
    ],
    targetPlan = "PRO",
    priceText = "1 € HT / mois",
    compact = false
}) {
    const navigate = useNavigate();
    const { refreshSubscription } = useSubscription();
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

    if (compact) {
        return (
            <>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                    padding: '12px 18px',
                    borderRadius: '12px',
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    marginBottom: '16px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                            width: '32px', height: '32px', borderRadius: '8px',
                            backgroundColor: 'rgba(85, 107, 47, 0.12)',
                            border: '1px solid rgba(85, 107, 47, 0.25)',
                            color: 'var(--sidebar-primary, #556B2F)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                            <Lock size={15} />
                        </div>
                        <div>
                            <span style={{ fontWeight: 700, fontSize: '13px', display: 'block', color: 'var(--foreground)' }}>
                                {title}
                            </span>
                            <span style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>
                                {description}
                            </span>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsCheckoutOpen(true)}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: 'var(--sidebar-primary, #556B2F)',
                            color: '#FFFFFF',
                            border: '1px solid var(--sidebar-primary, #556B2F)',
                            borderRadius: '8px',
                            fontWeight: 600,
                            fontSize: '12.5px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            whiteSpace: 'nowrap',
                            transition: 'opacity 0.15s ease'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.92'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                    >
                        <Star size={14} fill="currentColor" /> Débloquer avec Pro
                    </button>
                </div>

                <StripeCheckoutModal
                    isOpen={isCheckoutOpen}
                    onClose={() => setIsCheckoutOpen(false)}
                    targetPlan={targetPlan}
                    onSuccess={() => {
                        refreshSubscription();
                        setIsCheckoutOpen(false);
                    }}
                />
            </>
        );
    }

    return (
        <>
            <div style={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '16px',
                padding: '20px 24px',
                marginBottom: '24px',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '24px' }}>
                    <div style={{ flex: '1 1 340px' }}>
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            backgroundColor: 'rgba(85, 107, 47, 0.12)',
                            border: '1px solid rgba(85, 107, 47, 0.25)',
                            color: 'var(--sidebar-primary, #556B2F)',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            marginBottom: '12px'
                        }}>
                            <Star size={12} fill="currentColor" /> Offre Pro Requise
                        </div>

                        <h3 style={{ margin: '0 0 6px 0', fontSize: '1.15rem', fontWeight: 700, color: 'var(--foreground)' }}>
                            {title}
                        </h3>

                        <p style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: 'var(--muted-foreground)', lineHeight: 1.5, maxWidth: '720px' }}>
                            {description}
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px 16px' }}>
                            {features.map((feat, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--foreground)' }}>
                                    <CheckCircle2 size={15} color="var(--sidebar-primary, #556B2F)" style={{ flexShrink: 0 }} />
                                    <span>{feat}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        alignItems: 'stretch',
                        minWidth: '230px',
                        flex: '0 0 auto',
                        backgroundColor: 'var(--background)',
                        padding: '16px 18px',
                        borderRadius: '12px',
                        border: '1px solid var(--border)'
                    }}>
                        <div style={{ textAlign: 'center', marginBottom: '4px' }}>
                            <div style={{ fontSize: '11px', color: 'var(--muted-foreground)', fontWeight: 600, letterSpacing: '0.4px' }}>À PARTIR DE</div>
                            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--foreground)', marginTop: '2px' }}>{priceText}</div>
                        </div>

                        <button
                            type="button"
                            onClick={() => setIsCheckoutOpen(true)}
                            style={{
                                padding: '10px 18px',
                                backgroundColor: 'var(--sidebar-primary, #556B2F)',
                                color: '#FFFFFF',
                                border: '1px solid var(--sidebar-primary, #556B2F)',
                                borderRadius: '8px',
                                fontWeight: 600,
                                fontSize: '13px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                transition: 'opacity 0.15s ease'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.92'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                        >
                            <Star size={14} fill="currentColor" /> Passer à l'offre Pro <ArrowRight size={14} />
                        </button>

                        <button
                            type="button"
                            onClick={() => navigate('/settings?tab=abonnement')}
                            style={{
                                padding: '9px 14px',
                                backgroundColor: 'var(--card)',
                                color: 'var(--foreground)',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                fontWeight: 600,
                                fontSize: '12.5px',
                                cursor: 'pointer',
                                textAlign: 'center',
                                transition: 'background-color 0.15s ease'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--muted)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--card)'; }}
                        >
                            Voir dans Abonnements →
                        </button>
                    </div>
                </div>
            </div>

            <StripeCheckoutModal
                isOpen={isCheckoutOpen}
                onClose={() => setIsCheckoutOpen(false)}
                targetPlan={targetPlan}
                onSuccess={() => {
                    refreshSubscription();
                    setIsCheckoutOpen(false);
                }}
            />
        </>
    );
}
