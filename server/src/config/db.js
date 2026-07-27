import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";


const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,

});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"]
});

const connectDB = async () => {
    try {
        await pool.query('SELECT 1');
        console.log("DataBase connected via Prisma 7 Adapter!")
    } catch (error) {
        console.error(
            "Database connection error",
            error instanceof Error ? error.message : error
        );
        process.exit(1);
    }
};

const disconnectDB = async () => {
    await prisma.$disconnect();
    await pool.end();
};

export { pool, prisma, connectDB, disconnectDB };