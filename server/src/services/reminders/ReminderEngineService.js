import { prisma } from "../../config/db.js";

/**
 * Calcul précis des dates d'échéance et de préavis
 */
export function calculateNextDate(baseDate, freqValue = 12, freqUnit = "MONTHS", advValue = 30, advUnit = "DAYS") {
    const start = baseDate ? new Date(baseDate) : new Date();
    const targetDate = new Date(start);

    // 1. Calcul de la date d'échéance future (Intervention + Fréquence)
    const val = Number(freqValue) || 1;
    switch ((freqUnit || "MONTHS").toUpperCase()) {
        case "DAYS":
            targetDate.setDate(targetDate.getDate() + val);
            break;
        case "WEEKS":
            targetDate.setDate(targetDate.getDate() + val * 7);
            break;
        case "MONTHS":
            targetDate.setMonth(targetDate.getMonth() + val);
            break;
        case "YEARS":
            targetDate.setFullYear(targetDate.getFullYear() + val);
            break;
        default:
            targetDate.setMonth(targetDate.getMonth() + 12);
    }

    // 2. Soustraction du préavis (envoyer X jours avant)
    const reminderDate = new Date(targetDate);
    const adv = Number(advValue) || 0;
    if (adv > 0) {
        switch ((advUnit || "DAYS").toUpperCase()) {
            case "DAYS":
                reminderDate.setDate(reminderDate.getDate() - adv);
                break;
            case "WEEKS":
                reminderDate.setDate(reminderDate.getDate() - adv * 7);
                break;
            case "MONTHS":
                reminderDate.setMonth(reminderDate.getMonth() - adv);
                break;
            default:
                reminderDate.setDate(reminderDate.getDate() - adv);
        }
    }

    return reminderDate;
}

/**
 * Formate une fréquence en français naturel (ex: 12 mois -> "1 an", 24 mois -> "2 ans", 6 mois -> "6 mois")
 */
export function formatFrequencyText(value, unit) {
    if (!value) return "1 an";
    const v = Number(value);
    const u = (unit || "MONTHS").toUpperCase();
    if (u === "MONTHS") {
        if (v === 12) return "1 an";
        if (v === 24) return "2 ans";
        if (v === 36) return "3 ans";
        if (v % 12 === 0 && v > 0) return `${v / 12} ans`;
        return `${v} mois`;
    }
    if (u === "YEARS" || u === "ANS") {
        return v === 1 ? "1 an" : `${v} ans`;
    }
    if (u === "DAYS" || u === "JOURS") {
        return v === 1 ? "1 jour" : `${v} jours`;
    }
    if (u === "WEEKS" || u === "SEMAINES") {
        return v === 1 ? "1 semaine" : `${v} semaines`;
    }
    return `${v} ${unit}`;
}

/**
 * Remplace toutes les variables dynamiques dans le modèle de message
 */
export function renderTemplate(template, context = {}) {
    if (!template) return "";

    const {
        clientFirstName = "",
        clientLastName = "",
        companyName = "ClimPro",
        interventionType = "votre équipement",
        frequency = "1 an",
        installationDate = "",
        lastInterventionDate = "",
        nextReminderDate = "",
        appointmentLink = "",
        companyPhone = ""
    } = context;

    let rendered = template
        .replace(/\{\{\s*client_first_name\s*\}\}/gi, clientFirstName)
        .replace(/\{\{\s*client_last_name\s*\}\}/gi, clientLastName)
        .replace(/\{\{\s*company_name\s*\}\}/gi, companyName)
        .replace(/\{\{\s*intervention_type\s*\}\}/gi, interventionType)
        .replace(/\{\{\s*(?:frequence|frequency|delai)\s*\}\}/gi, frequency)
        .replace(/\{\{\s*(?:date_derniere_visite|last_intervention_date)\s*\}\}/gi, lastInterventionDate)
        .replace(/\{\{\s*installation_date\s*\}\}/gi, installationDate)
        .replace(/\{\{\s*(?:prochaine_echeance|next_reminder_date)\s*\}\}/gi, nextReminderDate)
        .replace(/\{\{\s*appointment_link\s*\}\}/gi, appointmentLink)
        .replace(/\{\{\s*company_phone\s*\}\}/gi, companyPhone)
        // Rétrocompatibilité avec les accolades simples {prenom}, etc.
        .replace(/\{\s*prenom\s*\}/gi, clientFirstName)
        .replace(/\{\s*nom\s*\}/gi, clientLastName)
        .replace(/\{\s*societe\s*\}/gi, companyName)
        .replace(/\{\s*frequence\s*\}/gi, frequency);

    return rendered.trim();
}

export const ReminderEngineService = {
    calculateNextDate,
    renderTemplate,

    /**
     * Traite la fin d'une intervention et met à jour les cycles de rappel indépendants
     */
    async handleInterventionCompleted({
        interventionId,
        companyId,
        serviceIds = [],
        manualReminderUpdates = null, // ex: { "automationId1": true, "automationId2": false }
        tx = null
    }) {
        const db = tx || prisma;

        const intervention = await db.intervention.findFirst({
            where: { id: interventionId, companyId },
            include: {
                client: true,
                company: true,
                services: { include: { serviceType: true } },
                equipment: true
            }
        });

        if (!intervention) {
            throw new Error(`Intervention ${interventionId} introuvable pour la société ${companyId}`);
        }

        const clientId = intervention.clientId;
        const completedAt = intervention.completedAt || new Date();

        // 1. Associer les services à l'intervention si fournis
        if (Array.isArray(serviceIds) && serviceIds.length > 0) {
            for (const serviceTypeId of serviceIds) {
                await db.interventionService.upsert({
                    where: {
                        interventionId_serviceTypeId: {
                            interventionId: intervention.id,
                            serviceTypeId
                        }
                    },
                    update: {},
                    create: {
                        interventionId: intervention.id,
                        serviceTypeId
                    }
                });
            }
        }

        // 2. Charger les services actuellement associés à cette intervention
        const linkedServices = await db.interventionService.findMany({
            where: { interventionId: intervention.id },
            include: { serviceType: true }
        });
        const currentServiceTypeIds = linkedServices.map(ls => ls.serviceTypeId);

        // 3. Trouver toutes les règles ReminderAutomation existantes pour ce client
        const clientAutomations = await db.reminderAutomation.findMany({
            where: {
                companyId,
                clientId,
                enabled: true
            },
            include: {
                trackedServices: true
            }
        });

        const updatedAutomations = [];

        for (const automation of clientAutomations) {
            // Vérifier si cette automatisation suit l'un des services réalisés dans cette intervention
            const trackedTypeIds = automation.trackedServices.map(ts => ts.serviceTypeId);
            const matchesService = trackedTypeIds.some(id => currentServiceTypeIds.includes(id));

            // Si override manuel spécifié, le respecter
            if (manualReminderUpdates && manualReminderUpdates[automation.id] !== undefined) {
                if (!manualReminderUpdates[automation.id]) {
                    continue; // L'artisan a expressément décoché ce rappel
                }
            } else if (!matchesService && trackedTypeIds.length > 0) {
                // Pas de match de service et pas d'override forcé -> Ce cycle reste totalement inchangé
                continue;
            }

            // Calcul de la prochaine date de rappel indépendante
            const nextReminderAt = calculateNextDate(
                completedAt,
                automation.frequencyValue,
                automation.frequencyUnit,
                automation.advanceNoticeValue,
                automation.advanceNoticeUnit
            );

            // Transaction / Mise à jour du cycle de rappel
            const updated = await db.reminderAutomation.update({
                where: { id: automation.id },
                data: {
                    lastCompletedInterventionId: intervention.id,
                    lastCompletedAt: completedAt,
                    nextReminderAt,
                    status: "SCHEDULED"
                }
            });

            // Annuler les exécutions en attente obsolètes
            await db.reminderExecution.updateMany({
                where: {
                    reminderAutomationId: automation.id,
                    status: "SCHEDULED"
                },
                data: {
                    status: "CANCELLED",
                    error: "Réinitialisé suite à une nouvelle intervention terminée"
                }
            });

            // Planifier la nouvelle exécution future
            await db.reminderExecution.create({
                data: {
                    companyId,
                    reminderAutomationId: automation.id,
                    clientId,
                    interventionId: intervention.id,
                    sequenceStep: 1,
                    scheduledAt: nextReminderAt,
                    status: "SCHEDULED"
                }
            });

            updatedAutomations.push(updated);
        }

        // 4. Si aucune règle existante ne correspondait, auto-créer le cycle de maintenance préventive
        if (updatedAutomations.length === 0) {
            // Trouver le service de maintenance de l'entreprise
            let targetService = await db.serviceType.findFirst({
                where: {
                    companyId,
                    isActive: true,
                    OR: [
                        { category: "maintenance" },
                        { name: { contains: "Entretien", mode: "insensitive" } },
                        { isDefault: true }
                    ]
                },
                orderBy: { sortOrder: "asc" }
            });

            if (!targetService) {
                targetService = await db.serviceType.findFirst({
                    where: { companyId, isActive: true }
                });
            }

            const freqVal = targetService?.defaultFrequencyValue || 12;
            const freqUnit = targetService?.defaultFrequencyUnit || "MONTHS";
            const advVal = targetService?.defaultAdvanceNoticeValue || 30;
            const advUnit = targetService?.defaultAdvanceNoticeUnit || "DAYS";

            const nextReminderAt = calculateNextDate(completedAt, freqVal, freqUnit, advVal, advUnit);

            const newAuto = await db.reminderAutomation.create({
                data: {
                    companyId,
                    clientId,
                    name: targetService ? `Rappel ${targetService.name}` : "Rappel Entretien Annuel",
                    automationType: "PERIODIC",
                    enabled: true,
                    frequencyValue: freqVal,
                    frequencyUnit: freqUnit,
                    advanceNoticeValue: advVal,
                    advanceNoticeUnit: advUnit,
                    channel: targetService?.defaultChannel || "LAST_USED",
                    fallbackChannel: "SMS",
                    customMessageTemplate: targetService?.defaultTemplate || null,
                    stopOnReply: true,
                    stopOnAppointment: true,
                    maxFollowUps: 2,
                    followUpIntervalDays: 7,
                    status: "SCHEDULED",
                    nextReminderAt,
                    lastCompletedInterventionId: intervention.id,
                    lastCompletedAt: completedAt,
                    ...(targetService && {
                        trackedServices: {
                            create: [{ serviceTypeId: targetService.id }]
                        }
                    })
                }
            });

            await db.reminderExecution.create({
                data: {
                    companyId,
                    reminderAutomationId: newAuto.id,
                    clientId,
                    interventionId: intervention.id,
                    sequenceStep: 1,
                    scheduledAt: nextReminderAt,
                    status: "SCHEDULED"
                }
            });

            updatedAutomations.push(newAuto);
            console.log(`[AUTO_RAPPEL_CREATED] Cycle de rappel auto-créé pour client ${clientId} suite à l'intervention ${intervention.id}`);
        }

        // 5. Mettre à jour l'équipement du client si présent
        const clientEquipments = await db.equipment.findMany({
            where: { clientId }
        });
        for (const eq of clientEquipments) {
            const interval = eq.serviceInterval || 12;
            const nextEqDate = new Date(completedAt);
            nextEqDate.setMonth(nextEqDate.getMonth() + interval);
            await db.equipment.update({
                where: { id: eq.id },
                data: {
                    lastServiceDate: completedAt,
                    nextServiceDate: nextEqDate
                }
            });
        }

        return {
            success: true,
            interventionId: intervention.id,
            completedAt,
            updatedAutomationsCount: updatedAutomations.length,
            updatedAutomations
        };
    },

    /**
     * Crée ou met à jour une automatisation de rappel pour un client et un service donné
     */
    async setupReminderAutomation({
        companyId,
        clientId,
        serviceTypeId,
        name,
        automationType = "PERIODIC",
        frequencyValue = 12,
        frequencyUnit = "MONTHS",
        advanceNoticeValue = 30,
        advanceNoticeUnit = "DAYS",
        channel = "LAST_USED",
        fallbackChannel = "SMS",
        customMessageTemplate = null,
        stopOnReply = true,
        stopOnAppointment = true,
        maxFollowUps = 2,
        followUpIntervalDays = 7,
        initialBaseDate = new Date(),
        isCustomOverride = false
    }) {
        // 1. Calcul de la date
        const nextReminderAt = calculateNextDate(
            initialBaseDate,
            frequencyValue,
            frequencyUnit,
            advanceNoticeValue,
            advanceNoticeUnit
        );

        // 2. Recherche d'une règle existante pour ce client et cette prestation afin d'éviter tout doublon
        let automation = null;
        if (serviceTypeId) {
            automation = await prisma.reminderAutomation.findFirst({
                where: {
                    companyId,
                    clientId,
                    trackedServices: { some: { serviceTypeId } }
                }
            });
        }
        if (!automation && name) {
            automation = await prisma.reminderAutomation.findFirst({
                where: {
                    companyId,
                    clientId,
                    name
                }
            });
        }

        if (automation) {
            // Mettre à jour la règle existante (Upsert)
            automation = await prisma.reminderAutomation.update({
                where: { id: automation.id },
                data: {
                    name: name || automation.name,
                    enabled: true,
                    isCustomOverride: isCustomOverride !== undefined ? isCustomOverride : automation.isCustomOverride,
                    frequencyValue: parseInt(frequencyValue, 10) || 12,
                    frequencyUnit,
                    advanceNoticeValue: parseInt(advanceNoticeValue, 10) || 0,
                    advanceNoticeUnit,
                    channel,
                    fallbackChannel,
                    customMessageTemplate,
                    stopOnReply,
                    stopOnAppointment,
                    maxFollowUps: parseInt(maxFollowUps, 10) || 2,
                    followUpIntervalDays: parseInt(followUpIntervalDays, 10) || 7,
                    status: "SCHEDULED",
                    nextReminderAt,
                    lastCompletedAt: initialBaseDate
                }
            });

            // Annuler les anciennes exécutions en attente
            await prisma.reminderExecution.updateMany({
                where: { reminderAutomationId: automation.id, status: "SCHEDULED" },
                data: { status: "CANCELLED", error: "Remplacé par la nouvelle configuration de rappel" }
            });
        } else {
            automation = await prisma.reminderAutomation.create({
                data: {
                    companyId,
                    clientId,
                    name: name || "Rappel Entretien Automatique",
                    automationType,
                    enabled: true,
                    isCustomOverride: Boolean(isCustomOverride),
                    frequencyValue: parseInt(frequencyValue, 10) || 12,
                    frequencyUnit,
                    advanceNoticeValue: parseInt(advanceNoticeValue, 10) || 30,
                    advanceNoticeUnit,
                    channel,
                    fallbackChannel,
                    customMessageTemplate,
                    stopOnReply,
                    stopOnAppointment,
                    maxFollowUps: parseInt(maxFollowUps, 10) || 2,
                    followUpIntervalDays: parseInt(followUpIntervalDays, 10) || 7,
                    status: "SCHEDULED",
                    nextReminderAt,
                    lastCompletedAt: initialBaseDate,
                    ...(serviceTypeId && {
                        trackedServices: {
                            create: [{ serviceTypeId }]
                        }
                    })
                }
            });
        }

        // Planifier la 1ère exécution
        await prisma.reminderExecution.create({
            data: {
                companyId,
                reminderAutomationId: automation.id,
                clientId,
                sequenceStep: 1,
                scheduledAt: nextReminderAt,
                status: "SCHEDULED"
            }
        });

        return automation;
    },

    /**
     * Traite l'arrivée d'une réponse client (SMS, WhatsApp, Email) pour stopper la séquence
     */
    async handleClientReply({ clientId, companyId, channel, body }) {
        if (!clientId || !companyId) return { stoppedCount: 0 };

        const now = new Date();

        // 1. Trouver les automatisations actives (spécifiques au client ou globales) avec stopOnReply = true
        const activeAutomations = await prisma.reminderAutomation.findMany({
            where: {
                companyId,
                enabled: true,
                stopOnReply: true,
                OR: [
                    { clientId },
                    { clientId: null }
                ]
            },
            include: {
                executions: {
                    where: {
                        clientId,
                        status: { in: ["SENT", "DELIVERED", "WAITING_FOR_RESPONSE"] }
                    },
                    orderBy: { createdAt: "desc" },
                    take: 1
                }
            }
        });

        let stoppedCount = 0;

        for (const auto of activeAutomations) {
            // Mettre à jour l'exécution la plus récente en RESPONDED
            if (auto.executions && auto.executions.length > 0) {
                const latestExec = auto.executions[0];
                await prisma.reminderExecution.update({
                    where: { id: latestExec.id },
                    data: {
                        status: "RESPONDED",
                        respondedAt: now
                    }
                });
            }

            // Annuler toute relance ultérieure planifiée pour ce client
            await prisma.reminderExecution.updateMany({
                where: {
                    reminderAutomationId: auto.id,
                    clientId,
                    status: "SCHEDULED"
                },
                data: {
                    status: "CANCELLED",
                    error: "Arrêté automatiquement suite à la réponse du client"
                }
            });

            // Si c'est une règle dédiée à ce client, passer le statut en STOPPED_BY_REPLY
            if (auto.clientId === clientId) {
                await prisma.reminderAutomation.update({
                    where: { id: auto.id },
                    data: {
                        status: "STOPPED_BY_REPLY"
                    }
                });
            }

            stoppedCount++;
        }

        if (stoppedCount > 0) {
            console.log(`[AUTO_RAPPEL_STOP_ON_REPLY] ${stoppedCount} automatisation(s) / relance(s) stoppée(s) pour client ${clientId}`);
        }

        return { stoppedCount };
    },

    /**
     * Traite la création d'un rendez-vous client pour stopper les relances
     */
    async handleAppointmentCreated({ clientId, companyId }) {
        if (!clientId || !companyId) return { stoppedCount: 0 };

        // Trouver les règles actives (spécifiques au client ou globales) avec stopOnAppointment = true
        const activeAutomations = await prisma.reminderAutomation.findMany({
            where: {
                companyId,
                enabled: true,
                stopOnAppointment: true,
                OR: [
                    { clientId },
                    { clientId: null }
                ]
            }
        });

        let stoppedCount = 0;

        for (const auto of activeAutomations) {
            // Annuler les relances programmées pour ce client
            const cancelRes = await prisma.reminderExecution.updateMany({
                where: {
                    reminderAutomationId: auto.id,
                    clientId,
                    status: "SCHEDULED"
                },
                data: {
                    status: "CANCELLED",
                    error: "Arrêté automatiquement : rendez-vous planifié"
                }
            });

            // Si c'est une règle dédiée à ce client, passer le statut en STOPPED_BY_APPOINTMENT
            if (auto.clientId === clientId) {
                await prisma.reminderAutomation.update({
                    where: { id: auto.id },
                    data: {
                        status: "STOPPED_BY_APPOINTMENT"
                    }
                });
            }

            if (cancelRes.count > 0 || auto.clientId === clientId) {
                stoppedCount++;
            }
        }

        if (stoppedCount > 0) {
            console.log(`[AUTO_RAPPEL_STOP_ON_APPOINTMENT] ${stoppedCount} relance(s) stoppée(s) suite au rendez-vous pour client ${clientId}`);
        }

        return { stoppedCount };
    }
};
