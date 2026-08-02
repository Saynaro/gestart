import { prisma } from "../config/db.js";

export const checkLimits = (resourceType) => {
    return async (req, res, next) => {
        const companyId = req.user?.companyId;

        if (!companyId) {
            return res.status(401).json({
                success: false,
                message: "Non autorisé"
            });
        }

        try {
            const subscription = await prisma.subscription.findUnique({
                where: { companyId },
                include: { plan: true }
            });

            const plan = subscription?.plan;

            if (!plan) {
                return next();
            }

            if (resourceType === "client") {
                const maxClients = plan.maxClients;

                if (maxClients !== -1) {
                    const currentClients = await prisma.client.count({
                        where: { companyId, isActive: true }
                    });

                    if (currentClients >= maxClients) {
                        return res.status(403).json({
                            success: false,
                            message: `Limite de clients atteinte pour votre offre (${maxClients} max). Veuillez mettre à niveau votre abonnement.`,
                            code: "LIMIT_REACHED"
                        });
                    }
                }
            } else if (resourceType === "technician") {
                const maxTechs = plan.maxTechnicians;

                if (maxTechs !== -1) {
                    const currentTechs = await prisma.user.count({
                        where: { companyId, role: "TECHNICIAN", isActive: true }
                    });

                    if (currentTechs >= maxTechs) {
                        return res.status(403).json({
                            success: false,
                            message: `Limite de techniciens atteinte pour votre offre (${maxTechs} max). Veuillez mettre à niveau votre abonnement.`,
                            code: "LIMIT_REACHED"
                        });
                    }
                }
            } else if (resourceType === "sms") {
                const maxSms = plan.maxSmsPerMonth;
                const smsUsed = subscription.smsUsedThisMonth || 0;

                if (maxSms !== -1 && smsUsed >= maxSms) {
                    return res.status(403).json({
                        success: false,
                        message: `Quota de SMS mensuel atteint (${maxSms} max/mois). Veuillez acheter un forfait SMS ou surclasser votre abonnement.`,
                        code: "SMS_LIMIT_REACHED"
                    });
                }
            }

            next();
        } catch (error) {
            console.error("CHECK LIMITS ERROR:", error.message);
            return res.status(500).json({
                success: false,
                message: "Erreur serveur lors de la vérification des limites"
            });
        }
    };
};
