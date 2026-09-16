import { useSubscription } from "./useSubscription";

export function useSubscriptionGuard() {
    const { isExpired } = useSubscription();

    const triggerSubscriptionExpired = (customMessage) => {
        window.dispatchEvent(new CustomEvent('subscription_expired', {
            detail: {
                message: customMessage || "Votre abonnement a expiré. Veuillez renouveler votre abonnement pour effectuer cette action."
            }
        }));
    };

    const guardAction = (actionFn, customMessage) => {
        return (...args) => {
            if (isExpired) {
                triggerSubscriptionExpired(customMessage);
                return;
            }
            if (actionFn) {
                actionFn(...args);
            }
        };
    };

    return {
        isExpired,
        triggerSubscriptionExpired,
        guardAction
    };
}
