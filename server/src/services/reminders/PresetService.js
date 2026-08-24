import { prisma } from "../../config/db.js";

/**
 * Catalogue des métiers et types d'interventions prédéfinis pour les artisans français
 */
export const INDUSTRY_PRESETS = {
    "climatisation-pac": {
        tradeName: "Climatisation / Pompe à chaleur",
        services: [
            {
                name: "Entretien / Maintenance",
                category: "maintenance",
                defaultFrequencyValue: 24,
                defaultFrequencyUnit: "MONTHS",
                defaultAdvanceNoticeValue: 30,
                defaultAdvanceNoticeUnit: "DAYS",
                defaultChannel: "LAST_USED",
                recommendationLevel: "RECOMMENDED", // ⭐ Recommandé
                description: "Entretien périodique recommandé pour les systèmes thermodynamiques.",
                defaultTemplate: "Bonjour {{client_first_name}}, cela fait bientôt deux ans depuis votre dernier entretien de {{intervention_type}}. Il est recommandé de prévoir un nouveau contrôle afin de préserver les performances de votre installation. Souhaitez-vous convenir d'un rendez-vous ?"
            },
            {
                name: "Nettoyage & Désinfection",
                category: "cleaning",
                defaultFrequencyValue: 12,
                defaultFrequencyUnit: "MONTHS",
                defaultAdvanceNoticeValue: 30,
                defaultAdvanceNoticeUnit: "DAYS",
                defaultChannel: "LAST_USED",
                recommendationLevel: "OPTIONAL", // 💡 Optionnel
                description: "Nettoyage annuel des filtres et unités intérieures.",
                defaultTemplate: "Bonjour {{client_first_name}}, un nettoyage annuel des filtres de votre climatisation est conseillé pour garantir un air sain et réduire votre consommation électrique. Nous sommes à votre disposition pour planifier ce passage."
            },
            {
                name: "Suivi après Dépannage",
                category: "followup",
                defaultFrequencyValue: 7,
                defaultFrequencyUnit: "DAYS",
                defaultAdvanceNoticeValue: 0,
                defaultAdvanceNoticeUnit: "DAYS",
                defaultChannel: "LAST_USED",
                recommendationLevel: "OPTIONAL", // 💡 Optionnel
                description: "Vérification de bon fonctionnement post-dépannage.",
                defaultTemplate: "Bonjour {{client_first_name}}, nous souhaitons nous assurer que tout fonctionne parfaitement depuis notre intervention de dépannage sur votre équipement. N'hésitez pas à nous faire un retour."
            },
            {
                name: "Contrôle d'étanchéité",
                category: "control",
                defaultFrequencyValue: 12,
                defaultFrequencyUnit: "MONTHS",
                defaultAdvanceNoticeValue: 30,
                defaultAdvanceNoticeUnit: "DAYS",
                defaultChannel: "LAST_USED",
                recommendationLevel: "CUSTOMIZABLE", // ⚙️ Personnalisable
                description: "Contrôle fluide frigorigène selon équipement et charge.",
                defaultTemplate: "Bonjour {{client_first_name}}, un contrôle périodique d'étanchéité est à prévoir pour votre installation de pompe à chaleur. Contactez-nous pour réserver votre créneau."
            },
            {
                name: "Installation & Mise en service",
                category: "installation",
                defaultFrequencyValue: 24,
                defaultFrequencyUnit: "MONTHS",
                defaultAdvanceNoticeValue: 30,
                defaultAdvanceNoticeUnit: "DAYS",
                defaultChannel: "LAST_USED",
                recommendationLevel: "RECOMMENDED",
                description: "Installation neuve / Mise en service.",
                defaultTemplate: "Bonjour {{client_first_name}}, votre équipement a été mis en service il y a 2 ans. Pour garantir sa longévité et sa garantie, prévoyons ensemble sa révision."
            }
        ]
    },

    "electricien": {
        tradeName: "Électricien",
        services: [
            {
                name: "Suivi Dépannage électrique",
                category: "followup",
                defaultFrequencyValue: 7,
                defaultFrequencyUnit: "DAYS",
                defaultAdvanceNoticeValue: 0,
                defaultAdvanceNoticeUnit: "DAYS",
                defaultChannel: "LAST_USED",
                recommendationLevel: "OPTIONAL", // 💡 Optionnel
                description: "Vérification de sécurité et de résolution de panne.",
                defaultTemplate: "Bonjour {{client_first_name}}, nous souhaitons vérifier que tout fonctionne correctement et en toute sécurité depuis notre intervention sur votre installation électrique."
            },
            {
                name: "Entretien VMC",
                category: "maintenance",
                defaultFrequencyValue: 12,
                defaultFrequencyUnit: "MONTHS",
                defaultAdvanceNoticeValue: 30,
                defaultAdvanceNoticeUnit: "DAYS",
                defaultChannel: "LAST_USED",
                recommendationLevel: "OPTIONAL",
                description: "Contrôle des gaines, bouches d'extraction et moteur VMC.",
                defaultTemplate: "Bonjour {{client_first_name}}, un contrôle de votre système de ventilation (VMC) est recommandé afin d'assurer un bon renouvellement d'air. Souhaitez-vous fixer un rendez-vous ?"
            },
            {
                name: "Contrôle Borne de recharge",
                category: "control",
                defaultFrequencyValue: 12,
                defaultFrequencyUnit: "MONTHS",
                defaultAdvanceNoticeValue: 30,
                defaultAdvanceNoticeUnit: "DAYS",
                defaultChannel: "LAST_USED",
                recommendationLevel: "CUSTOMIZABLE",
                description: "Contrôle annuel de la borne de recharge IRVE.",
                defaultTemplate: "Bonjour {{client_first_name}}, il est recommandé de procéder à un contrôle annuel de sécurité de votre borne de recharge pour véhicule électrique."
            },
            {
                name: "Mise en conformité & Tableau",
                category: "control",
                defaultFrequencyValue: 24,
                defaultFrequencyUnit: "MONTHS",
                defaultAdvanceNoticeValue: 30,
                defaultAdvanceNoticeUnit: "DAYS",
                defaultChannel: "LAST_USED",
                recommendationLevel: "CUSTOMIZABLE",
                description: "Contrôle de sécurité de l'installation électrique.",
                defaultTemplate: "Bonjour {{client_first_name}}, nous restons à votre disposition pour tout contrôle ou évolution de votre tableau électrique."
            }
        ]
    },

    "plombier": {
        tradeName: "Plombier",
        services: [
            {
                name: "Suivi Dépannage & Réparation de fuite",
                category: "followup",
                defaultFrequencyValue: 7,
                defaultFrequencyUnit: "DAYS",
                defaultAdvanceNoticeValue: 0,
                defaultAdvanceNoticeUnit: "DAYS",
                defaultChannel: "LAST_USED",
                recommendationLevel: "OPTIONAL",
                description: "Vérification de l'étanchéité après dépannage.",
                defaultTemplate: "Bonjour {{client_first_name}}, nous souhaitons nous assurer que la situation est bien résolue et qu'aucune fuite n'est réapparue depuis notre passage."
            },
            {
                name: "Entretien Chauffe-eau / Ballon ECS",
                category: "maintenance",
                defaultFrequencyValue: 12,
                defaultFrequencyUnit: "MONTHS",
                defaultAdvanceNoticeValue: 30,
                defaultAdvanceNoticeUnit: "DAYS",
                defaultChannel: "LAST_USED",
                recommendationLevel: "RECOMMENDED",
                description: "Détartrage et contrôle du groupe de sécurité du chauffe-eau.",
                defaultTemplate: "Bonjour {{client_first_name}}, afin de prolonger la durée de vie de votre chauffe-eau et éviter les pannes d'eau chaude, nous vous recommandons un contrôle préventif annuel."
            },
            {
                name: "Entretien Adoucisseur d'eau",
                category: "maintenance",
                defaultFrequencyValue: 12,
                defaultFrequencyUnit: "MONTHS",
                defaultAdvanceNoticeValue: 30,
                defaultAdvanceNoticeUnit: "DAYS",
                defaultChannel: "LAST_USED",
                recommendationLevel: "RECOMMENDED",
                description: "Contrôle de dureté TH, résines et remplacement préfiltre.",
                defaultTemplate: "Bonjour {{client_first_name}}, votre adoucisseur d'eau nécessite un contrôle annuel des résines et du préfiltre pour maintenir une eau parfaitement traitée."
            },
            {
                name: "Contrôle Plomberie générale",
                category: "control",
                defaultFrequencyValue: 24,
                defaultFrequencyUnit: "MONTHS",
                defaultAdvanceNoticeValue: 30,
                defaultAdvanceNoticeUnit: "DAYS",
                defaultChannel: "LAST_USED",
                recommendationLevel: "CUSTOMIZABLE",
                description: "Vérification générale des évacuations et robinetterie.",
                defaultTemplate: "Bonjour {{client_first_name}}, nous sommes disponibles pour tout contrôle d'étanchéité ou rénovation de vos installations de plomberie."
            }
        ]
    },

    "chauffagiste": {
        tradeName: "Chauffagiste",
        services: [
            {
                name: "Entretien annuel Chaudière (Gaz / Fioul)",
                category: "maintenance",
                defaultFrequencyValue: 12,
                defaultFrequencyUnit: "MONTHS",
                defaultAdvanceNoticeValue: 30,
                defaultAdvanceNoticeUnit: "DAYS",
                defaultChannel: "LAST_USED",
                recommendationLevel: "RECOMMENDED", // ⭐ Recommandé
                description: "Entretien annuel de la chaudière avec attestation d'entretien.",
                defaultTemplate: "Bonjour {{client_first_name}}, cela fait bientôt un an depuis l'entretien de votre chaudière. Pour garantir votre sécurité, votre confort et votre conformité, prévoyons dès maintenant votre visite annuelle."
            },
            {
                name: "Ramonage conduit de fumée",
                category: "maintenance",
                defaultFrequencyValue: 12,
                defaultFrequencyUnit: "MONTHS",
                defaultAdvanceNoticeValue: 30,
                defaultAdvanceNoticeUnit: "DAYS",
                defaultChannel: "LAST_USED",
                recommendationLevel: "RECOMMENDED",
                description: "Ramonage périodique (selon règles locales et installation).",
                defaultTemplate: "Bonjour {{client_first_name}}, il est temps de prévoir le ramonage de votre conduit d'évacuation de fumée afin d'assurer un tirage optimal et sécurisé."
            },
            {
                name: "Entretien Pompe à Chaleur / Hybride",
                category: "maintenance",
                defaultFrequencyValue: 24,
                defaultFrequencyUnit: "MONTHS",
                defaultAdvanceNoticeValue: 30,
                defaultAdvanceNoticeUnit: "DAYS",
                defaultChannel: "LAST_USED",
                recommendationLevel: "RECOMMENDED",
                description: "Entretien périodique du système thermodynamique de chauffage.",
                defaultTemplate: "Bonjour {{client_first_name}}, votre pompe à chaleur approche de sa période d'entretien recommandé. Souhaitez-vous planifier la visite de notre technicien ?"
            },
            {
                name: "Entretien Poêle / Insert à bois & granulés",
                category: "maintenance",
                defaultFrequencyValue: 12,
                defaultFrequencyUnit: "MONTHS",
                defaultAdvanceNoticeValue: 30,
                defaultAdvanceNoticeUnit: "DAYS",
                defaultChannel: "LAST_USED",
                recommendationLevel: "RECOMMENDED",
                description: "Nettoyage approfondi, creuset, bougie et ramonage.",
                defaultTemplate: "Bonjour {{client_first_name}}, préparez sereinement la saison de chauffe en réservant l'entretien complet et le ramonage de votre poêle."
            },
            {
                name: "Suivi Dépannage Chauffage",
                category: "followup",
                defaultFrequencyValue: 7,
                defaultFrequencyUnit: "DAYS",
                defaultAdvanceNoticeValue: 0,
                defaultAdvanceNoticeUnit: "DAYS",
                defaultChannel: "LAST_USED",
                recommendationLevel: "OPTIONAL",
                description: "Vérification de la régulation et des températures.",
                defaultTemplate: "Bonjour {{client_first_name}}, nous souhaitons nous assurer que votre chauffage fonctionne de manière optimale depuis notre dernière intervention."
            }
        ]
    }
};

/**
 * Initialise ou met à jour les types de services par défaut pour une entreprise selon ses domaines d'activité
 */
export async function ensureCompanyDefaultServices(companyId) {
    if (!companyId) return [];

    // Récupérer les catégories d'activité de l'entreprise
    const companyTrades = await prisma.companyTradeCategory.findMany({
        where: { companyId },
        include: { tradeCategory: true }
    });

    const tradeSlugs = companyTrades.map(ct => ct.tradeCategory?.slug).filter(Boolean);

    // Si aucune catégorie définie, on utilise climatisation-pac et chauffagiste par défaut
    const activeSlugs = tradeSlugs.length > 0
        ? tradeSlugs
        : ["climatisation-pac", "chauffagiste", "electricien", "plombier"];

    const createdOrFoundServices = [];

    for (const slug of activeSlugs) {
        const preset = INDUSTRY_PRESETS[slug] || INDUSTRY_PRESETS["climatisation-pac"];
        if (!preset) continue;

        for (let i = 0; i < preset.services.length; i++) {
            const item = preset.services[i];
            const service = await prisma.serviceType.upsert({
                where: {
                    companyId_name: {
                        companyId,
                        name: item.name
                    }
                },
                update: {
                    tradeSlug: slug,
                    category: item.category,
                    recommendationLevel: item.recommendationLevel,
                    defaultFrequencyValue: item.defaultFrequencyValue,
                    defaultFrequencyUnit: item.defaultFrequencyUnit,
                    defaultAdvanceNoticeValue: item.defaultAdvanceNoticeValue,
                    defaultAdvanceNoticeUnit: item.defaultAdvanceNoticeUnit,
                    defaultChannel: item.defaultChannel,
                    defaultTemplate: item.defaultTemplate,
                    description: item.description,
                    isDefault: true,
                    isActive: true,
                    sortOrder: i
                },
                create: {
                    companyId,
                    name: item.name,
                    tradeSlug: slug,
                    category: item.category,
                    recommendationLevel: item.recommendationLevel,
                    defaultFrequencyValue: item.defaultFrequencyValue,
                    defaultFrequencyUnit: item.defaultFrequencyUnit,
                    defaultAdvanceNoticeValue: item.defaultAdvanceNoticeValue,
                    defaultAdvanceNoticeUnit: item.defaultAdvanceNoticeUnit,
                    defaultChannel: item.defaultChannel,
                    defaultTemplate: item.defaultTemplate,
                    description: item.description,
                    isDefault: true,
                    isActive: true,
                    sortOrder: i
                }
            });
            createdOrFoundServices.push(service);
        }
    }

    return createdOrFoundServices;
}

export const PresetService = {
    INDUSTRY_PRESETS,
    ensureCompanyDefaultServices
};
