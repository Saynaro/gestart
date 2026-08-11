import { prisma } from "../src/config/db.js";
import bcrypt from 'bcryptjs';


async function main() {
    const hashedPassword = await bcrypt.hash('Khalid2527@@', 10);

    await prisma.user.upsert({
        where: { email: 'khalid.cizdoev777@gmail.com' },
        update: {
            role: 'SUPERADMIN'
        },
        create: {
            email: 'khalid.cizdoev777@gmail.com',
            password: hashedPassword,
            firstName: 'Khalid',
            lastName: 'Sainaro',
            role: 'SUPERADMIN',
            companyId: '690bb6c2-7a31-411f-9926-9083cd154a16'
        }
    });
}


main()
    .catch((e) => {
        console.error("Erreur lors du seeding :", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
