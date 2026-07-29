
export const checkSubscription = (req, res, next) => {
    const subscription = req.user?.company?.subscription;

    if (!subscription) {
        return res.status(403).json({
            success: false,
            message: "Aucun abonnement trouvé pour cette société",
        });
    }

    const now = new Date();
    const isTrialValid = subscription.status === "TRIALING" && subscription.trialEndsAt && new Date(subscription.trialEndsAt) > now;
    const isActivePeriod = subscription.status === "ACTIVE" && subscription.currentPeriodEnd && new Date(subscription.currentPeriodEnd) > now;

    if (!isTrialValid && !isActivePeriod) {
        return res.status(403).json({
            success: false,
            message: "Votre abonnement a expiré. Veuillez renouveler votre offre.",
            code: "SUBSCRIPTION_EXPIRED"
        });
    }

    next();
};
