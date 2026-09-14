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
    setSubscription: () => {},
    refreshSubscription: () => {},
});

export function SubscriptionProvider({ children }) {
    const [subscription, setSubscription] = useState(null);
    const [loading, setLoading] = useState(true);

    const refreshSubscription = useCallback(async () => {
        if (!isAuthenticated()) {
            setSubscription(null);
            setLoading(false);
            return null;
        }

        // Technicians are attached to company account and do not manage individual subscriptions
        try {
            const savedUser = localStorage.getItem('currentUser');
            if (savedUser) {
                const parsed = JSON.parse(savedUser);
                if (parsed.role === 'TECHNICIAN') {
                    setSubscription(null);
                    setLoading(false);
                    return null;
                }
            }
        } catch (e) {}

        try {
            const res = await apiFetch('/v1/subscription');
            const sub = res.data?.subscription || res.subscription;
            if (sub) {
                setSubscription(sub);
                return sub;
            }
        } catch (e) {
            // Ignored - user might not have billing permissions
        } finally {
            setLoading(false);
        }
        return null;
    }, []);

    useEffect(() => {
        refreshSubscription();

        const handleLoggedIn = (e) => {
            if (e?.detail?.subscription) {
                setSubscription(e.detail.subscription);
            }
            refreshSubscription();
        };

        const handleLoggedOut = () => {
            setSubscription(null);
            setLoading(false);
        };

        window.addEventListener('userLoggedIn', handleLoggedIn);
        window.addEventListener('userLoggedOut', handleLoggedOut);
        return () => {
            window.removeEventListener('userLoggedIn', handleLoggedIn);
            window.removeEventListener('userLoggedOut', handleLoggedOut);
        };
    }, [refreshSubscription]);

    const rawName = subscription?.plan?.name || 'PRO';
    const planName = rawName.toUpperCase();
    const displayName = subscription?.plan?.displayName || (planName === 'STARTER' ? 'Starter' : planName === 'UNLIMITED' ? 'Unlimited' : 'Pro');

    const status = subscription?.status || 'ACTIVE';
    const isCancelled = status === 'CANCELLED' || Boolean(subscription?.cancelledAt);
    const now = new Date();
    const periodEnd = status === 'TRIALING' ? subscription?.trialEndsAt : subscription?.currentPeriodEnd;
    const isPeriodEnded = Boolean(periodEnd && new Date(periodEnd) < now);
    const isExpired = status === 'EXPIRED' || (isPeriodEnded && (status === 'CANCELLED' || status === 'EXPIRED' || status === 'TRIALING'));

    const isStarter = planName === 'STARTER';
    const isPro = planName === 'PRO';
    const isUnlimited = planName === 'UNLIMITED';

    return (
        <SubscriptionContext.Provider value={{
            subscription,
            setSubscription,
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
