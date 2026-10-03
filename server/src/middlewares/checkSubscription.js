
import { prisma } from "../config/db.js";

export const checkSubscription = async (req, res, next) => {
    try {
        const companyId = req.user?.companyId;
        if (!companyId) {
            return res.status(403).json({
                success: false,
                message: "Société introuvable",
            });
        }

        let subscription = req.user?.company?.subscription;
        if (!subscription) {
            subscription = await prisma.subscription.findUnique({
                where: { companyId },
                include: { plan: true }
            });
        }

        if (!subscription) {
            return res.status(403).json({
                success: false,
                message: "Aucun abonnement trouvé pour cette société",
                code: "SUBSCRIPTION_REQUIRED"
            });
        }

        const now = new Date();
        const isTrialValid = subscription.status === "TRIALING" && subscription.trialEndsAt && new Date(subscription.trialEndsAt) > now;
        const isActivePeriod = subscription.status === "ACTIVE" && (!subscription.currentPeriodEnd || new Date(subscription.currentPeriodEnd) > now);
        const isLifetime = subscription.status === "LIFETIME" || subscription.status === "ACTIVE_TRIAL";

        if (!isTrialValid && !isActivePeriod && !isLifetime) {
            return res.status(403).json({
                success: false,
                message: "Votre abonnement a expiré. Veuillez renouveler votre offre.",
                code: "SUBSCRIPTION_EXPIRED"
            });
        }

        req.subscription = subscription;
        next();
    } catch (err) {
        console.error("checkSubscription error:", err);
        return res.status(500).json({
            success: false,
            message: "Erreur lors de la vérification de l'abonnement"
        });
    }
};
