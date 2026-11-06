// Prisma 7 configuration. The Prisma 8 CLI uses prisma.config.ts instead.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // `prisma generate` works without a database, so this must not throw when
    // the URL is absent (for example during npm's postinstall in Docker).
    // Prisma Postgres sets DATABASE_URL to the direct endpoint, which is what
    // `prisma migrate deploy` needs. DIRECT_URL is an escape hatch for other
    // providers that expose a separate migration endpoint.
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
