import { prisma } from "../../config/db.js";
import { OmnichannelService } from "../messaging/OmnichannelService.js";
import { renderTemplate, formatFrequencyText } from "./ReminderEngineService.js";

/**
 * Planificateur de Rappels Automatiques Autonome & Sans État
 * PostgreSQL est la source unique de vérité.
 */
export class AutoRappelScheduler {
    constructor() {
        this.timer = null;
        this.isRunning = false;
        this.intervalMs = 60 * 1000; // Vérification toutes les 60 secondes
    }

    /**
     * Démarre le worker en arrière-plan
     */
    start() {
        if (this.timer) return;
        console.log("⏰ [AUTO_RAPPEL_SCHEDULER] Démarrage du planificateur de relances automatiques (60s)...");

        // Exécution initiale immédiate après 5s
        setTimeout(() => this.processPendingReminders().catch(() => {}), 5000);

        this.timer = setInterval(() => {
            this.processPendingReminders().catch(err => {
                console.error("[AUTO_RAPPEL_SCHEDULER_ERROR]:", err.message);
            });
        }, this.intervalMs);
    }

    /**
     * Arrêt propre du worker (Graceful shutdown)
     */
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
            console.log("⏰ [AUTO_RAPPEL_SCHEDULER] Planificateur arrêté.");
        }
    }

    /**
     * Traite les rappels échus stockés dans PostgreSQL
     */
    async processPendingReminders() {
        if (this.isRunning) return;
        this.isRunning = true;

        try {
            const now = new Date();

            // 1. Récupérer les exécutions dues
            const pendingExecutions = await prisma.reminderExecution.findMany({
                where: {
                    status: "SCHEDULED",
                    scheduledAt: { lte: now }
                },
                include: {
                    company: {
                        include: {
                            subscription: { include: { plan: true } },
                            settings: true
                        }
                    },
                    client: true,
                    reminderAutomation: {
                        include: {
                            trackedServices: { include: { serviceType: true } }
                        }
                    }
                },
                take: 25, // Traitement par lots pour garantir les performances
                orderBy: { scheduledAt: "asc" }
            });

            if (pendingExecutions.length === 0) {
                this.isRunning = false;
                return;
            }

            console.log(`⏰ [AUTO_RAPPEL_SCHEDULER] ${pendingExecutions.length} rappel(s) échu(s) à traiter.`);

            for (const execution of pendingExecutions) {
                await this.executeSingleReminder(execution, now);
            }
        } catch (error) {
            console.error("[AUTO_RAPPEL_PROCESS_ERROR]:", error.message);
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Exécute un rappel individuel avec verrouillage atomique (Idempotency)
     */
    async executeSingleReminder(execution, now) {
        const { id, companyId, clientId, reminderAutomation, client, company, sequenceStep } = execution;

        // 1. Verrouillage atomique : transition SCHEDULED -> PROCESSING
        const lockResult = await prisma.reminderExecution.updateMany({
            where: {
                id,
                status: "SCHEDULED"
            },
            data: {
                status: "PROCESSING",
                executedAt: now
            }
        });

        // Si lock échoue (déjà pris par un autre thread/process), ignorer
        if (lockResult.count === 0) {
            return;
        }

        try {
            // 2. Vérification des conditions d'arrêt & état de l'automatisation
            if (!reminderAutomation || !reminderAutomation.enabled || reminderAutomation.status === "PAUSED" || reminderAutomation.status === "CANCELLED") {
                await prisma.reminderExecution.update({
                    where: { id },
                    data: {
                        status: "SKIPPED",
                        error: "Automatisation désactivée ou en pause"
                    }
                });
                return;
            }

            // 3. Vérification de la validité et de l'activité de l'abonnement
            const sub = company?.subscription;
            const plan = sub?.plan;
            const subStatus = sub?.status;
            const endDate = subStatus === "TRIALING" ? sub?.trialEndsAt : sub?.currentPeriodEnd;
            const isSubExpired = subStatus === "EXPIRED" || subStatus === "CANCELLED" || (endDate && new Date(endDate) < now);

            if (isSubExpired) {
                // Suspendre l'envoi sans supprimer les données du client
                await prisma.reminderExecution.update({
                    where: { id },
                    data: {
                        status: "SKIPPED",
                        error: "Envoi suspendu : abonnement de l'entreprise expiré ou inactif"
                    }
                });
                console.log(`[AUTO_RAPPEL_PAUSED] Société ${companyId}: rappel #${id} suspendu car abonnement expiré/inactif.`);
                return;
            }

            const isPlanEligible = plan?.hasAutoSmsReminders || plan?.hasPremiumSettings || plan?.name === "PRO" || plan?.name === "UNLIMITED";
            
            // En environnement de développement ou démo, tolérer les tests
            const isDevelopment = process.env.NODE_ENV !== "production";
            if (!isPlanEligible && !isDevelopment) {
                await prisma.reminderExecution.update({
                    where: { id },
                    data: {
                        status: "SKIPPED",
                        error: "Fonctionnalité Auto Rappel réservée aux offres Pro & Unlimited"
                    }
                });
                return;
            }

            // 4. Politique d'arriéré (Overdue check)
            // Si le rappel est en retard de plus de 45 jours (ex: serveur éteint pendant des mois)
            const diffDays = Math.round((now.getTime() - new Date(execution.scheduledAt).getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays > 45) {
                await prisma.reminderExecution.update({
                    where: { id },
                    data: {
                        status: "SKIPPED",
                        error: `Rappel ignoré car trop ancien (${diffDays} jours de retard)`
                    }
                });
                return;
            }

            // 5. Résolution du canal de communication
            const channelAvailability = await OmnichannelService.getClientChannelsAvailability(companyId, clientId).catch(() => null);

            let selectedChannel = "SMS";
            const requestedChannel = (reminderAutomation.channel || "LAST_USED").toUpperCase();

            if (requestedChannel === "LAST_USED") {
                selectedChannel = channelAvailability?.smartDefault?.channel || client?.preferredChannel || "SMS";
            } else {
                selectedChannel = requestedChannel;
            }

            // Vérifier si le canal sélectionné est disponible et configuré
            let channelInfo = channelAvailability?.channels?.[selectedChannel];
            let isAvailable = channelInfo?.available === true;

            // Fallback si le canal principal n'est pas configuré
            if (!isAvailable && reminderAutomation.fallbackChannel) {
                const fallbackName = reminderAutomation.fallbackChannel.toUpperCase();
                const fallbackInfo = channelAvailability?.channels?.[fallbackName];
                if (fallbackInfo?.available) {
                    console.log(`[AUTO_RAPPEL] Canal ${selectedChannel} non disponible, basculement vers fallback ${fallbackName}`);
                    selectedChannel = fallbackName;
                    channelInfo = fallbackInfo;
                    isAvailable = true;
                }
            }

            // Si AUCUN canal n'est configuré : Échec transparent (SANS simuler de faux succès)
            if (!isAvailable) {
                const errorReason = channelInfo?.reason || `Ce canal (${selectedChannel}) n'est pas encore configuré.`;
                await prisma.reminderExecution.update({
                    where: { id },
                    data: {
                        status: "FAILED",
                        channel: selectedChannel,
                        error: errorReason
                    }
                });
                console.warn(`[AUTO_RAPPEL_UNCONFIGURED_CHANNEL] Société ${companyId}, client ${clientId}: ${errorReason}`);
                return;
            }

            // 6. Préparation du modèle de message et remplacement des variables
            const serviceName = reminderAutomation.trackedServices?.[0]?.serviceType?.name || "votre équipement";
            const defaultTpl = reminderAutomation.trackedServices?.[0]?.serviceType?.defaultTemplate
                || "Bonjour {{client_first_name}}, il est recommandé de prévoir le prochain contrôle ou entretien de votre {{intervention_type}}. Souhaitez-vous convenir d'un rendez-vous ?";
            
            const templateToUse = reminderAutomation.customMessageTemplate || defaultTpl;

            const renderedBody = renderTemplate(templateToUse, {
                clientFirstName: client.firstName || "Client",
                clientLastName: client.lastName || "",
                companyName: company.name || "ClimPro",
                interventionType: serviceName,
                frequency: formatFrequencyText(reminderAutomation.frequencyValue, reminderAutomation.frequencyUnit),
                companyPhone: company.phone || "",
                installationDate: client.createdAt ? new Date(client.createdAt).toLocaleDateString("fr-FR") : "",
                lastInterventionDate: reminderAutomation.lastCompletedAt ? new Date(reminderAutomation.lastCompletedAt).toLocaleDateString("fr-FR") : "",
                nextReminderDate: reminderAutomation.nextReminderAt ? new Date(reminderAutomation.nextReminderAt).toLocaleDateString("fr-FR") : ""
            });

            // 7. Envoi réel via l'abstraction OmnichannelService
            console.log(`[AUTO_RAPPEL_SENDING] Envoi du rappel #${id} via ${selectedChannel} au client ${client.firstName} ${client.lastName}...`);

            const sendResult = await OmnichannelService.sendMessage({
                companyId,
                clientId,
                channel: selectedChannel,
                body: renderedBody,
                subject: `Rappel d'entretien — ${company.name || "ClimPro"}`,
                autoType: "auto_reminder",
                metadata: {
                    source: "AUTO_REMINDER",
                    reminderAutomationId: reminderAutomation.id,
                    reminderExecutionId: id,
                    sequenceStep
                }
            });

            // 8. Mise à jour de l'exécution avec succès
            await prisma.reminderExecution.update({
                where: { id },
                data: {
                    status: "WAITING_FOR_RESPONSE",
                    channel: selectedChannel,
                    recipient: selectedChannel === "EMAIL" ? client.email : client.phone,
                    renderedContent: renderedBody,
                    messageId: sendResult?.log?.id || null,
                    error: null
                }
            });

            // 9. Planifier la relance suivante (Follow-up sequence) si configurée et non atteinte
            const maxFollowUps = reminderAutomation.maxFollowUps || 2;
            const intervalDays = reminderAutomation.followUpIntervalDays || 7;

            if (sequenceStep < (maxFollowUps + 1)) {
                const nextFollowUpDate = new Date(now);
                nextFollowUpDate.setDate(nextFollowUpDate.getDate() + intervalDays);

                await prisma.reminderExecution.create({
                    data: {
                        companyId,
                        reminderAutomationId: reminderAutomation.id,
                        clientId,
                        sequenceStep: sequenceStep + 1,
                        scheduledAt: nextFollowUpDate,
                        status: "SCHEDULED"
                    }
                });
                console.log(`[AUTO_RAPPEL_FOLLOWUP_SCHEDULED] Relance #${sequenceStep + 1} planifiée pour le ${nextFollowUpDate.toISOString()}`);
            }

            console.log(`✓ [AUTO_RAPPEL_SUCCESS] Rappel #${id} envoyé avec succès.`);
        } catch (err) {
            console.error(`[AUTO_RAPPEL_EXECUTION_ERROR] Rappel #${id}:`, err.message);
            await prisma.reminderExecution.update({
                where: { id },
                data: {
                    status: "FAILED",
                    error: err.message || "Erreur lors de l'envoi du message"
                }
            });
        }
    }
}

export const autoRappelScheduler = new AutoRappelScheduler();
