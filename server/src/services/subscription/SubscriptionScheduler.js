import { prisma } from "../../config/db.js";
import { dispatchNotification } from "../notificationService.js";
import {
    sendTrialExpiringSoonEmail,
    sendTrialExpiredEmail
} from "../../utils/emailService.js";

export class SubscriptionScheduler {
    constructor() {
        this.timer = null;
        this.isRunning = false;
        // Intervalle d'exécution : toutes les 15 minutes
        this.intervalMs = 15 * 60 * 1000;
    }

    start() {
        if (this.timer) return;
        console.log("[SUBSCRIPTION_SCHEDULER] Démarrage de la surveillance des abonnements & périodes d'essai (15m)...");

        // Premier passage 10 secondes après le boot
        setTimeout(() => this.processSubscriptions().catch(() => { }), 10000);

        this.timer = setInterval(() => {
            this.processSubscriptions().catch(err => {
                console.error("[SUBSCRIPTION_SCHEDULER_ERROR]:", err.message);
            });
        }, this.intervalMs);
    }

    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
            console.log(" [SUBSCRIPTION_SCHEDULER] Planificateur arrêté.");
        }
    }

    async processSubscriptions() {
        if (this.isRunning) return;
        this.isRunning = true;

        try {
            const now = new Date();
            const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

            // 1. Récupération des abonnements en cours d'essai (TRIALING)
            const trialingSubs = await prisma.subscription.findMany({
                where: {
                    status: "TRIALING"
                },
                include: {
                    company: {
                        include: {
                            users: {
                                where: { role: "OWNER", isActive: true }
                            }
                        }
                    },
                    plan: true
                }
            });

            for (const sub of trialingSubs) {
                try {
                    const owner = sub.company?.users?.[0];
                    const ownerEmail = owner?.email;
                    const companyName = sub.company?.name || "Votre entreprise";
                    const firstName = owner?.firstName || "Cher client";

                    if (!sub.trialEndsAt) continue;

                    const trialEndsAtDate = new Date(sub.trialEndsAt);

                    // Cas A : Essai expiré (trialEndsAt <= now)
                    if (trialEndsAtDate.getTime() <= now.getTime()) {
                        await prisma.subscription.update({
                            where: { id: sub.id },
                            data: { status: "EXPIRED" }
                        });

                        // Vérifier si la notification d'expiration a déjà été envoyée
                        const alreadyNotified = await prisma.notification.findFirst({
                            where: {
                                companyId: sub.companyId,
                                type: "PLAN_EXPIRED"
                            }
                        });

                        if (!alreadyNotified) {
                            if (ownerEmail) {
                                await sendTrialExpiredEmail({
                                    to: ownerEmail,
                                    firstName,
                                    companyName
                                });
                            }

                            await dispatchNotification({
                                companyId: sub.companyId,
                                userId: owner?.id,
                                type: "PLAN_EXPIRED",
                                title: "Période d'essai terminée",
                                body: "Votre période d'essai gratuit a pris fin. Vos données restent conservées en toute sécurité.",
                                entityType: "subscription",
                                entityId: sub.id
                            });

                            console.log(`[SUBSCRIPTION_SCHEDULER] Notification fin d'essai envoyée pour ${companyName} (${ownerEmail})`);
                        }
                        continue;
                    }

                    // Cas B : Rappel 3 jours avant expiration (trialEndsAt <= now + 3j)
                    if (trialEndsAtDate.getTime() <= threeDaysFromNow.getTime()) {
                        const alreadyReminded = await prisma.notification.findFirst({
                            where: {
                                companyId: sub.companyId,
                                type: "PLAN_EXPIRING_SOON"
                            }
                        });

                        if (!alreadyReminded) {
                            const daysRemaining = Math.max(1, Math.ceil((trialEndsAtDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

                            if (ownerEmail) {
                                await sendTrialExpiringSoonEmail({
                                    to: ownerEmail,
                                    firstName,
                                    companyName,
                                    daysRemaining,
                                    trialEndsAt: sub.trialEndsAt
                                });
                            }

                            await dispatchNotification({
                                companyId: sub.companyId,
                                userId: owner?.id,
                                type: "PLAN_EXPIRING_SOON",
                                title: "Votre période d'essai se termine bientôt",
                                body: `Plus que ${daysRemaining} jour(s) d'essai gratuit. Choisissez votre offre pour continuer sans interruption.`,
                                entityType: "subscription",
                                entityId: sub.id
                            });

                            console.log(`[SUBSCRIPTION_SCHEDULER] Relance J-3 envoyée pour ${companyName} (${ownerEmail})`);
                        }
                    }
                } catch (singleSubErr) {
                    console.error(`[SUBSCRIPTION_SCHEDULER] Erreur pour subscription ${sub.id}:`, singleSubErr.message);
                }
            }

        } catch (globalErr) {
            console.error("[SUBSCRIPTION_SCHEDULER] Erreur globale:", globalErr.message);
        } finally {
            this.isRunning = false;
        }
    }
}

export const subscriptionScheduler = new SubscriptionScheduler();
