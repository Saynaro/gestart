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
    const [usage, setUsage] = useState(null);
    const [loading, setLoading] = useState(true);

    const refreshSubscription = useCallback(async () => {
        if (!isAuthenticated()) {
            setSubscription(null);
            setUsage(null);
            setLoading(false);
            return null;
        }

        try {
            const [subRes, usageRes] = await Promise.all([
                apiFetch('/v1/subscription').catch(() => null),
                apiFetch('/v1/subscription/usage').catch(() => null)
            ]);

            const sub = subRes?.data?.subscription || subRes?.subscription;
            if (sub) {
                setSubscription(sub);
            }

            const u = usageRes?.data?.usage || usageRes?.usage;
            if (u) {
                setUsage(u);
            }

            return sub;
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
            setUsage(null);
            setLoading(false);
        };

        const handleRefreshEvent = () => {
            refreshSubscription();
        };

        window.addEventListener('userLoggedIn', handleLoggedIn);
        window.addEventListener('userLoggedOut', handleLoggedOut);
        window.addEventListener('refresh_subscription', handleRefreshEvent);
        return () => {
            window.removeEventListener('userLoggedIn', handleLoggedIn);
            window.removeEventListener('userLoggedOut', handleLoggedOut);
            window.removeEventListener('refresh_subscription', handleRefreshEvent);
        };
    }, [refreshSubscription]);

    const rawName = subscription?.plan?.name || 'PRO';
    const planName = rawName.toUpperCase();
    const rawDisplayName = subscription?.plan?.displayName || (planName === 'STARTER' ? 'Starter' : planName === 'UNLIMITED' ? 'Unlimited' : 'Pro');

    const status = subscription?.status || 'ACTIVE';
    const isCancelled = status === 'CANCELLED' || Boolean(subscription?.cancelledAt);
    const now = new Date();
    const periodEnd = status === 'TRIALING' ? subscription?.trialEndsAt : subscription?.currentPeriodEnd;
    const isPeriodEnded = Boolean(periodEnd && new Date(periodEnd) < now);
    const isExpired = status === 'EXPIRED' || isPeriodEnded;

    const displayName = isExpired ? 'Expiré' : rawDisplayName;
    const isStarter = !isExpired && planName === 'STARTER';
    const isPro = !isExpired && planName === 'PRO';
    const isUnlimited = !isExpired && planName === 'UNLIMITED';
    const hasActivePlan = !isExpired;

    // Computed Limits & Warnings
    const clientsCurrent = usage?.clients?.current ?? 0;
    const clientsMax = usage?.clients?.max ?? (isStarter ? 100 : isPro ? 500 : -1);
    const isClientLimitReached = !isUnlimited && clientsMax !== -1 && clientsCurrent >= clientsMax;
    const isClientLimitWarning = !isUnlimited && clientsMax !== -1 && !isClientLimitReached && clientsCurrent >= Math.floor(clientsMax * 0.9);

    const techsCurrent = usage?.technicians?.current ?? 1;
    const techsMax = usage?.technicians?.max ?? (isStarter ? 1 : isPro ? 5 : -1);
    const isTechLimitReached = !isUnlimited && techsMax !== -1 && techsCurrent >= techsMax;
    const isTechLimitWarning = !isUnlimited && techsMax !== -1 && !isTechLimitReached && techsCurrent >= Math.max(1, techsMax - 1);

    const smsUsed = usage?.sms?.current ?? subscription?.smsUsedThisMonth ?? 0;
    const smsMax = usage?.sms?.max ?? (isStarter ? 100 : isPro ? 500 : 1500);
    const smsRemaining = smsMax === -1 ? 999999 : Math.max(0, smsMax - smsUsed);
    const isSmsLimitReached = !isUnlimited && smsMax !== -1 && smsRemaining <= 0;
    const isSmsLimitWarning = !isUnlimited && smsMax !== -1 && !isSmsLimitReached && smsRemaining <= 10;

    const triggerUpgrade = (options = {}) => {
        window.dispatchEvent(new CustomEvent('open_upgrade_modal', {
            detail: {
                reason: options.reason || 'default',
                title: options.title,
                description: options.description,
                targetPlan: options.targetPlan || (isStarter ? 'PRO' : 'UNLIMITED')
            }
        }));
    };

    return (
        <SubscriptionContext.Provider value={{
            subscription,
            setSubscription,
            usage,
            planName,
            displayName,
            rawDisplayName,
            status,
            isCancelled,
            isExpired,
            isPeriodEnded,
            hasActivePlan,
            isStarter,
            isPro,
            isUnlimited,
            loading,
            refreshSubscription,
            // Limit helpers
            clientsCurrent,
            clientsMax,
            isClientLimitReached,
            isClientLimitWarning,
            techsCurrent,
            techsMax,
            isTechLimitReached,
            isTechLimitWarning,
            smsUsed,
            smsMax,
            smsRemaining,
            isSmsLimitReached,
            isSmsLimitWarning,
            triggerUpgrade
        }}>
            {children}
        </SubscriptionContext.Provider>
    );
}

export function useSubscription() {
    return useContext(SubscriptionContext);
}
