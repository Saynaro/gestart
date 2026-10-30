import { prisma } from "../src/config/db.js";
import bcrypt from "bcrypt";

async function main() {
    console.log("🌱 Début de l'initialisation de la base de données avec seed2.js...");

    // 1. Initialisation des Plans (Starter, Pro, Unlimited)
    const plans = [
        {
            name: "STARTER",
            displayName: "Starter",
            priceMonthly: 34.90,
            priceAnnual: 27.00,
            maxClients: 100,
            maxTechnicians: 1,
            maxSmsPerMonth: 100,
            extraSmsCost: 0.10,
            hasMobileApp: false,
            hasAutoSmsReminders: true,
            hasAdvancedReports: false,
            hasChorusPro: true,
            hasDedicatedSmsNumber: false,
            hasAccountManager: false,
            hasPrioritySupport: false,
            hasPremiumSettings: false,
        },
        {
            name: "PRO",
            displayName: "Pro",
            priceMonthly: 69.90,
            priceAnnual: 55.00,
            maxClients: 500,
            maxTechnicians: 5,
            maxSmsPerMonth: 500,
            extraSmsCost: 0.10,
            hasMobileApp: true,
            hasAutoSmsReminders: true,
            hasAdvancedReports: true,
            hasChorusPro: true,
            hasDedicatedSmsNumber: false,
            hasAccountManager: false,
            hasPrioritySupport: true,
            hasPremiumSettings: true,
        },
        {
            name: "UNLIMITED",
            displayName: "Unlimited",
            priceMonthly: 119.90,
            priceAnnual: 95.92,
            maxClients: -1, // illimité
            maxTechnicians: -1, // illimité
            maxSmsPerMonth: 1500,
            extraSmsCost: 0.08,
            hasMobileApp: true,
            hasAutoSmsReminders: true,
            hasAdvancedReports: true,
            hasChorusPro: true,
            hasDedicatedSmsNumber: true,
            hasAccountManager: true,
            hasPrioritySupport: true,
            hasPremiumSettings: true,
        },
    ];

    for (const plan of plans) {
        await prisma.plan.upsert({
            where: { name: plan.name },
            update: plan,
            create: plan,
        });
    }
    console.log("✓ 1. Plans synchronisés (STARTER, PRO, UNLIMITED)");

    // 2. Initialisation des Domaines d'activité (TradeCategory)
    const categories = [
        { id: "clim", name: "Climatisation / PAC air-air", slug: "clim", icon: "❄️", sortOrder: 1 },
        { id: "pac", name: "Pompe à chaleur air-eau", slug: "pac", icon: "🔥", sortOrder: 2 },
        { id: "cet", name: "Chauffe-Eau Thermodynamique", slug: "cet", icon: "💧", sortOrder: 3 },
        { id: "vmc", name: "Ventilation mécanique (VMC)", slug: "vmc", icon: "🌀", sortOrder: 4 },
        { id: "solaires", name: "Panneaux solaires photovoltaïques", slug: "solaires", icon: "☀️", sortOrder: 5 },
        { id: "chaudiere", name: "Chaudière gaz / fioul", slug: "chaudiere", icon: "⚡", sortOrder: 6 },
        { id: "poele", name: "Poêle ou insert bois", slug: "poele", icon: "🪵", sortOrder: 7 },
        { id: "elec", name: "Tableau électrique / Bornes", slug: "elec", icon: "⚡", sortOrder: 8 },
    ];

    for (const cat of categories) {
        await prisma.tradeCategory.upsert({
            where: { slug: cat.slug },
            update: cat,
            create: cat,
        });
    }
    console.log("✓ 2. Catégories métiers synchronisées");

    // 3. Création d'une Entreprise de Démonstration ("ClimPro France Services")
    const company = await prisma.company.upsert({
        where: { slug: "climpro-france" },
        update: {},
        create: {
            name: "ClimPro France Services",
            slug: "climpro-france",
            phone: "+33140000000",
            email: "contact@gestart.fr",
            address: "15 Rue de la Paix",
            city: "Paris",
            postalCode: "75002",
            siret: "12345678900014",
            siren: "123456789",
            website: "https://gestart.fr",
            settings: {
                create: {
                    quotePrefix: "D",
                    quoteNextNumber: 101,
                    invoicePrefix: "INV",
                    invoiceNextNumber: 201,
                    defaultPaymentDays: 30
                }
            }
        }
    });

    // 4. Attribution de l'abonnement PRO à l'entreprise
    const proPlan = await prisma.plan.findUnique({ where: { name: "PRO" } });
    if (proPlan) {
        await prisma.subscription.upsert({
            where: { companyId: company.id },
            update: { status: "ACTIVE" },
            create: {
                companyId: company.id,
                planId: proPlan.id,
                status: "ACTIVE",
                currentPeriodStart: new Date(),
                currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
            }
        });
    }
    console.log("✓ 3. Entreprise 'ClimPro France Services' et abonnement créés");

    // 5. Création des Utilisateurs de démonstration (Owner, Manager, Technician)
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash("Password123!", salt);

    const owner = await prisma.user.upsert({
        where: { email: "owner@gestart.fr" },
        update: {},
        create: {
            companyId: company.id,
            email: "owner@gestart.fr",
            password: passwordHash,
            firstName: "Prenom",
            lastName: "Nom",
            role: "OWNER",
            phone: "+33611223344",
            emailVerified: true,
            isActive: true
        }
    });

    const tech = await prisma.user.upsert({
        where: { email: "technicien@gestart.fr" },
        update: {},
        create: {
            companyId: company.id,
            email: "technicien@gestart.fr",
            password: passwordHash,
            firstName: "Prenom",
            lastName: "Nom",
            role: "TECHNICIAN",
            phone: "+33655667788",
            emailVerified: true,
            isActive: true
        }
    });
    console.log("✓ 4. Utilisateurs démo créés (owner@climpro-france.fr / technicien@climpro-france.fr)");

    // 6. Création d'un Client de test
    const client = await prisma.client.create({
        data: {
            companyId: company.id,
            createdById: owner.id,
            firstName: "Client",
            lastName: "1",
            companyName: " Residence 1",
            phone: "+33699887766",
            email: "client1@gestart.fr",
            address: " 12 jean Medecin",
            city: "Nice",
            postalCode: "06000",
            status: "OK",
            preferredChannel: "SMS",
            source: "site_web"
        }
    });

    // 7. Création d'un Équipement chez ce client
    const nextService = new Date();
    nextService.setMonth(nextService.getMonth() + 6);

    const equipment = await prisma.equipment.create({
        data: {
            clientId: client.id,
            brand: "Daikin",
            model: "3.5kW Inverter Sensira",
            serialNumber: "DK-2025-9988",
            power: "3.5kW",
            location: "Salon",
            tradeSlug: "clim",
            installDate: new Date("2024-05-15"),
            lastServiceDate: new Date("2025-02-10"),
            nextServiceDate: nextService,
            serviceInterval: 12
        }
    });
    console.log("✓ 5. Client et équipement Daikin associés créés");

    // 8. Création d'une Intervention de test
    const intervention = await prisma.intervention.create({
        data: {
            companyId: company.id,
            clientId: client.id,
            equipmentId: equipment.id,
            technicianId: tech.id,
            createdById: owner.id,
            title: "Entretien annuel Climatisation Daikin",
            description: "Nettoyage filtres, contrôle étanchéité circuit frigorifique et désinfection échangeur",
            address: client.address,
            city: client.city,
            status: "SCHEDULED",
            scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Dans 2 jours
            estimatedDuration: 90
        }
    });

    console.log(`✓ 6. Intervention démo créée (${intervention.title})`);
    console.log(" Seed2 terminé avec succès !");
}

main()
    .catch((e) => {
        console.error("Erreur lors de l'exécution de seed2.js :", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
