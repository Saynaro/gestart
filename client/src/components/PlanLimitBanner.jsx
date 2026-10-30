import React, { useState, useEffect } from 'react';
import { AlertTriangle, Lock, Sparkles, ArrowRight } from 'lucide-react';
import { useSubscription } from '../utils/useSubscription';

export default function PlanLimitBanner({
    type = 'clients',
    variant = 'warning', // 'warning' | 'reached'
    current,
    max,
    unit = 'clients',
    targetPlan,
    customTitle,
    customDescription,
    onUpgrade,
    style = {},
    compact = false
}) {
    const { isStarter, isPro, triggerUpgrade } = useSubscription();
    const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const actualTargetPlan = targetPlan || (isStarter ? 'PRO' : 'UNLIMITED');
    const isReached = variant === 'reached';

    const defaultTitle = isReached
        ? `Capacité maximale atteinte (${current}/${max} ${unit})`
        : `Quota presque atteint (${current}/${max} ${unit})`;

    const defaultDescription = isReached
        ? `Vous avez atteint la limite de votre abonnement actuel. Passez à l'offre ${actualTargetPlan === 'PRO' ? 'Pro (500 clients)' : 'Unlimited (Illimité)'} pour continuer sans interruption.`
        : `Il ne vous reste plus que ${Math.max(0, (max || 0) - (current || 0))} ${unit} disponible${((max || 0) - (current || 0)) > 1 ? 's' : ''} sur votre abonnement actuel.`;

    const title = customTitle || defaultTitle;
    const description = customDescription || defaultDescription;

    const handleAction = () => {
        if (onUpgrade) {
            onUpgrade();
        } else {
            triggerUpgrade({
                reason: type,
                title,
                description,
                targetPlan: actualTargetPlan
            });
        }
    };

    const percent = max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 100;

    const primaryColor = isReached ? '#ef4444' : '#f59e0b';
    const bgGradient = isReached
        ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(185, 28, 28, 0.03) 100%)'
        : 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(217, 119, 6, 0.03) 100%)';
    const borderColor = isReached ? 'rgba(239, 68, 68, 0.25)' : 'rgba(245, 158, 11, 0.25)';

    // Use compact mode if requested OR automatically on mobile devices
    const isCompactMode = compact || isMobile;

    if (isCompactMode) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'nowrap',
                gap: '8px',
                padding: '8px 12px',
                borderRadius: '10px',
                background: bgGradient,
                border: `1px solid ${borderColor}`,
                marginBottom: '10px',
                boxSizing: 'border-box',
                ...style
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: '1 1 auto' }}>
                    <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '6px',
                        background: isReached ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                        border: `1px solid ${borderColor}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                    }}>
                        {isReached ? <Lock size={12} color={primaryColor} /> : <AlertTriangle size={12} color={primaryColor} />}
                    </div>
                    <div style={{ minWidth: 0 }}>
                        <span style={{ fontWeight: 700, fontSize: '11.5px', color: 'var(--foreground)', display: 'block', lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {title}
                        </span>
                        <span style={{ fontSize: '10.5px', color: 'var(--muted-foreground)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {max > 0 ? `${current}/${max} utilisés (${percent}%)` : description}
                        </span>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={handleAction}
                    style={{
                        padding: '5px 10px',
                        background: 'var(--sidebar-primary, #556B2F)',
                        color: '#FFF',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: 700,
                        fontSize: '11px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        whiteSpace: 'nowrap',
                        flexShrink: 0
                    }}
                >
                    <Sparkles size={11} />
                    <span>{actualTargetPlan === 'PRO' ? 'Pro' : 'Unlimited'}</span>
                </button>
            </div>
        );
    }

    return (
        <div style={{
            background: bgGradient,
            border: `1px solid ${borderColor}`,
            borderRadius: '14px',
            padding: '16px 20px',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px',
            ...style
        }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: '1 1 300px' }}>
                <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: isReached ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                    border: `1px solid ${borderColor}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px'
                }}>
                    {isReached ? <Lock size={18} color={primaryColor} /> : <AlertTriangle size={18} color={primaryColor} />}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: 'var(--foreground)' }}>
                            {title}
                        </h4>
                        {max > 0 && (
                            <span style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '20px',
                                background: isReached ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                                color: primaryColor
                            }}>
                                {percent}% utilisé
                            </span>
                        )}
                    </div>

                    <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--muted-foreground)', lineHeight: 1.45 }}>
                        {description}
                    </p>

                    {max > 0 && (
                        <div style={{
                            width: '100%',
                            maxWidth: '320px',
                            height: '5px',
                            backgroundColor: 'var(--muted)',
                            borderRadius: '10px',
                            marginTop: '10px',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                width: `${percent}%`,
                                height: '100%',
                                backgroundColor: primaryColor,
                                borderRadius: '10px',
                                transition: 'width 0.4s ease'
                            }} />
                        </div>
                    )}
                </div>
            </div>

            <button
                type="button"
                onClick={handleAction}
                style={{
                    padding: '9px 16px',
                    background: 'var(--sidebar-primary, #556B2F)',
                    color: '#FFF',
                    border: 'none',
                    borderRadius: '9px',
                    fontWeight: 700,
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 3px 10px rgba(0,0,0,0.1)',
                    transition: 'transform 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
                <Sparkles size={14} />
                <span>Passer à {actualTargetPlan === 'PRO' ? 'Pro' : 'Unlimited'}</span>
                <ArrowRight size={13} />
            </button>
        </div>
    );
}
