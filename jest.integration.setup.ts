import "dotenv/config";
import {prisma} from "@/lib/prisma";

// Keep the timeout in sync with jest.integration.config.ts. A suite that talks
// to a remote database is slower than a pure unit test.
jest.setTimeout(30_000);

// The pg pool keeps the Jest worker alive; release it after each suite.
afterAll(async () => {
  await prisma.$disconnect();
});

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Integration tests need a PostgreSQL database; copy .env.example to .env and run `docker compose up -d postgres`.",
  );
}
