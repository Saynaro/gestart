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
                    background: 'linear-gradient(135deg, rgba(91,77,219,0.12) 0%, rgba(124,58,237,0.06) 100%)',
                    border: '1px solid rgba(91,77,219,0.25)',
                    marginBottom: '16px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                            width: '32px', height: '32px', borderRadius: '8px',
                            background: 'linear-gradient(135deg, #5B4DDB, #7C3AED)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                            <Lock size={16} color="#FFF" />
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
                            background: 'linear-gradient(135deg, #5B4DDB, #7C3AED)',
                            color: '#FFF',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 700,
                            fontSize: '12.5px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 4px 12px rgba(91,77,219,0.25)',
                            whiteSpace: 'nowrap'
                        }}
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
                background: 'linear-gradient(135deg, rgba(91,77,219,0.12) 0%, rgba(124,58,237,0.05) 100%)',
                border: '1px solid rgba(91,77,219,0.3)',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '24px',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
                    <div style={{ flex: '1 1 340px' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(91,77,219,0.15)', color: 'var(--sidebar-primary, #5B4DDB)', padding: '4px 10px', borderRadius: '50px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                            <Star size={13} fill="currentColor" /> Offre Pro Requise
                        </div>

                        <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: 800, color: 'var(--foreground)' }}>
                            {title}
                        </h3>

                        <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--muted-foreground)', lineHeight: 1.5 }}>
                            {description}
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                            {features.map((feat, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: 'var(--foreground)' }}>
                                    <CheckCircle2 size={15} color="#22C55E" style={{ flexShrink: 0 }} />
                                    <span>{feat}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        alignItems: 'stretch',
                        minWidth: '220px',
                        flex: '0 0 auto',
                        backgroundColor: 'var(--card, #1E293B)',
                        padding: '16px',
                        borderRadius: '12px',
                        border: '1px solid var(--border, rgba(255,255,255,0.1))'
                    }}>
                        <div style={{ textAlign: 'center', marginBottom: '4px' }}>
                            <div style={{ fontSize: '11px', color: 'var(--muted-foreground)', fontWeight: 600 }}>À PARTIR DE</div>
                            <div style={{ fontSize: '22px', fontWeight: 900, color: 'var(--sidebar-primary, #5B4DDB)' }}>{priceText}</div>
                        </div>

                        <button
                            type="button"
                            onClick={() => setIsCheckoutOpen(true)}
                            style={{
                                padding: '12px 18px',
                                background: 'linear-gradient(135deg, #5B4DDB, #7C3AED)',
                                color: '#FFF',
                                border: 'none',
                                borderRadius: '10px',
                                fontWeight: 800,
                                fontSize: '13.5px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                boxShadow: '0 8px 18px rgba(91,77,219,0.35)'
                            }}
                        >
                            <Star size={16} fill="currentColor" /> Passer à l'offre Pro <ArrowRight size={15} />
                        </button>

                        <button
                            type="button"
                            onClick={() => navigate('/settings?tab=abonnement')}
                            style={{
                                padding: '8px 12px',
                                background: 'transparent',
                                color: 'var(--muted-foreground)',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                fontWeight: 600,
                                fontSize: '12px',
                                cursor: 'pointer',
                                textAlign: 'center'
                            }}
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
