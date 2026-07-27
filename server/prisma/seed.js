import { prisma } from "../src/config/db.js";

async function main() {
    console.log("🌱 Initialisation des données de base (Plans et TradeCategories)...");

    // 1. Initialisation des Plans
    const plans = [
        {
            name: "STARTER",
            displayName: "Starter",
            priceMonthly: 39,
            priceAnnual: 31.20,
            maxClients: 50,
            maxTechnicians: 2,
            maxSmsPerMonth: 100,
            extraSmsCost: 0.10,
            hasMobileApp: false,
            hasAutoSmsReminders: false,
            hasAdvancedReports: false,
            hasChorusPro: false,
            hasDedicatedSmsNumber: false,
            hasAccountManager: false,
            hasPrioritySupport: false,
            hasPremiumSettings: false,
        },
        {
            name: "PRO",
            displayName: "Pro",
            priceMonthly: 89,
            priceAnnual: 71.20,
            maxClients: 300,
            maxTechnicians: 10,
            maxSmsPerMonth: 500,
            extraSmsCost: 0.10,
            hasMobileApp: true,
            hasAutoSmsReminders: true,
            hasAdvancedReports: true,
            hasChorusPro: false,
            hasDedicatedSmsNumber: false,
            hasAccountManager: false,
            hasPrioritySupport: false,
            hasPremiumSettings: true,
        },
        {
            name: "UNLIMITED",
            displayName: "Unlimited",
            priceMonthly: 149,
            priceAnnual: 119.20,
            maxClients: -1, // illimité
            maxTechnicians: -1, // illimité
            maxSmsPerMonth: 1000,
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

    console.log("✓ Plans créés avec succès (Starter, Pro, Unlimited)");

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

    console.log("✓ Domaines d'activité créés avec succès");
    console.log("🚀 Base de données initialisée avec succès !");
}

main()
    .catch((e) => {
        console.error("Erreur lors du seeding :", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
