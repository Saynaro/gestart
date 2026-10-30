import { prisma } from "../src/config/db.js";
import bcrypt from 'bcrypt';

async function main() {
    console.log(" Initialisation du SuperAdmin...");

    // 1. Chercher une company existante ou en créer une
    let company = await prisma.company.findFirst();
    if (!company) {
        company = await prisma.company.create({
            data: {
                name: "GestArt Siège SuperAdmin",
                email: "support.gestart@gmail.com",
                phone: "0600000000",
                address: "Paris, France"
            }
        });
    }

    const adminEmail = process.env.ADMIN_EMAIL || 'support.gestart@gmail.com';
    const adminPassword = process.env.SUPERADMIN_PASSWORD;

    if (!adminPassword) {
        throw new Error("SUPERADMIN_PASSWORD n'est pas défini dans le fichier .env");
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const superAdmin = await prisma.user.upsert({
        where: { email: adminEmail },
        update: {
            role: 'SUPERADMIN',
            emailVerified: true,
            password: hashedPassword
        },
        create: {
            email: adminEmail,
            password: hashedPassword,
            firstName: 'Khalid',
            lastName: 'Sainaro',
            role: 'SUPERADMIN',
            emailVerified: true,
            companyId: company.id
        }
    });

    console.log(` SuperAdmin configuré et vérifié : ${superAdmin.email} (Verified: ${superAdmin.emailVerified})`);
}

main()
    .catch((e) => {
        console.error(" Erreur lors du seeding :", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
