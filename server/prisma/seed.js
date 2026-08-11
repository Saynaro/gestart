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
                email: "khalid.cizdoev777@gmail.com",
                phone: "0600000000",
                address: "Paris, France"
            }
        });
    }

    const hashedPassword = await bcrypt.hash('Khalid2527@@', 10);

    const superAdmin = await prisma.user.upsert({
        where: { email: 'khalid.cizdoev777@gmail.com' },
        update: {
            role: 'SUPERADMIN',
            emailVerified: true,
            password: hashedPassword
        },
        create: {
            email: 'khalid.cizdoev777@gmail.com',
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
