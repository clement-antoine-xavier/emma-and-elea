// Prisma 7 configuration. The Prisma 8 CLI uses prisma.config.ts instead.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // `prisma generate` works without a database, so this must not throw when
    // DATABASE_URL is absent (for example during npm's postinstall in Docker).
    url: process.env["DATABASE_URL"],
  },
});
