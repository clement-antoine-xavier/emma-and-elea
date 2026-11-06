import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  // Prisma Postgres exposes a pooled endpoint for serverless application
  // traffic and a direct endpoint for migrations. Keep the direct URL in
  // DATABASE_URL (Prisma CLI) and use the pooled URL at runtime when present.
  const connectionString =
    process.env.DATABASE_URL_POOLED ??
    process.env.PRISMA_DATABASE_URL ??
    process.env.DATABASE_URL;

  const adapter = new PrismaPg({
    connectionString,
    // A function instance handles one request at a time; a small pool avoids
    // exhausting the database's connection limit during a traffic spike.
    max: 1,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });

  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
