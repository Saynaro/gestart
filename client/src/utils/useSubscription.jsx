import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiFetch } from './api';
import { isAuthenticated } from './auth';

const SubscriptionContext = createContext({
    planName: 'PRO',
    displayName: 'Pro',
    isStarter: false,
    isPro: true,
    isUnlimited: false,
    loading: false,
    subscription: null,
    refreshSubscription: () => {},
});

export function SubscriptionProvider({ children }) {
    const [subscription, setSubscription] = useState(null);
    const [loading, setLoading] = useState(true);

    const refreshSubscription = useCallback(async () => {
        if (!isAuthenticated()) {
            setLoading(false);
            return;
        }
        try {
            const res = await apiFetch('/v1/subscription');
            const sub = res.data?.subscription || res.subscription;
            if (sub) {
                setSubscription(sub);
            }
        } catch (e) {
            console.warn("Could not fetch subscription:", e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshSubscription();
    }, [refreshSubscription]);

    const rawName = subscription?.plan?.name || 'PRO';
    const planName = rawName.toUpperCase();
    const displayName = subscription?.plan?.displayName || (planName === 'STARTER' ? 'Starter' : planName === 'UNLIMITED' ? 'Unlimited' : 'Pro');

    const status = subscription?.status || 'ACTIVE';
    const isCancelled = status === 'CANCELLED' || Boolean(subscription?.cancelledAt);
    const isExpired = status === 'EXPIRED';

    const isStarter = planName === 'STARTER';
    const isPro = planName === 'PRO';
    const isUnlimited = planName === 'UNLIMITED';

    return (
        <SubscriptionContext.Provider value={{
            subscription,
            planName,
            displayName,
            status,
            isCancelled,
            isExpired,
            isStarter,
            isPro,
            isUnlimited,
            loading,
            refreshSubscription
        }}>
            {children}
        </SubscriptionContext.Provider>
    );
}

export function useSubscription() {
    return useContext(SubscriptionContext);
}
