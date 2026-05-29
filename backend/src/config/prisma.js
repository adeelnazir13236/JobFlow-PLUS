import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import prismaClientPkg from "@prisma/client";

const { PrismaClient } = prismaClientPkg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const databaseUrl = new URL(process.env.DATABASE_URL);

const adapter = new PrismaMariaDb({
  host: databaseUrl.hostname,
  port: Number(databaseUrl.port || 3306),
  user: decodeURIComponent(databaseUrl.username),
  password: decodeURIComponent(databaseUrl.password),
  database: databaseUrl.pathname.replace(/^\//, "")
});

const prisma = new PrismaClient({ adapter });

export default prisma;
