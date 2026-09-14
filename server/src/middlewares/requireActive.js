import { prisma } from "../config/db.js";

export const requireActive = async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: "Non autorisé"
        });
    }

    // SuperAdmin and Owner dev bypass
    if (req.user.role === "SUPERADMIN") {
        return next();
    }

    // 1. Vérification si l'utilisateur est actif
    if (!req.user.isActive) {
        return res.status(403).json({
            success: false,
            message: "Votre compte a été désactivé. Veuillez contacter votre administrateur."
        });
    }

    try {
        // 2. Vérification si l'abonnement de la société est actif
        const subscription = await prisma.subscription.findUnique({
            where: { companyId: req.user.companyId },
            include: { plan: true }
        });

        if (subscription) {
            const now = new Date();

            if (subscription.status === "EXPIRED") {
                return res.status(403).json({
                    success: false,
                    message: "L'abonnement de votre société a expiré. Veuillez le renouveler.",
                    code: "SUBSCRIPTION_EXPIRED"
                });
            }

            const endDate = subscription.status === "TRIALING"
                ? subscription.trialEndsAt
                : subscription.currentPeriodEnd;

            if (endDate && new Date(endDate) < now) {
                return res.status(403).json({
                    success: false,
                    message: "La période d'essai ou d'abonnement de votre société est expirée.",
                    code: "SUBSCRIPTION_EXPIRED"
                });
            }
        }

        next();
    } catch (error) {
        console.error("REQUIRE ACTIVE ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la vérification du statut du compte"
        });
    }
};
