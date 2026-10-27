/**
 * Backfills one site for organizations created before onboarding asked for a
 * first site. Idempotent: organizations that already have a site are skipped.
 *
 * Usage: npm run db:backfill-sites
 */
import "dotenv/config";

import {PrismaPg} from "@prisma/adapter-pg";
import {PrismaClient} from "../src/generated/prisma/client";

const connectionString = process.env["DATABASE_URL"];
if (!connectionString) {
  throw new Error("DATABASE_URL is not set.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({connectionString}),
});

async function main() {
  const organizations = await prisma.organization.findMany({
    where: {sites: {none: {}}},
    select: {id: true, name: true},
  });

  for (const organization of organizations) {
    await prisma.site.create({
      data: {
        organizationId: organization.id,
        code: "ATL",
        name: "Atelier",
        kind: "WORKSHOP",
        timezone: "Europe/Paris",
      },
    });

    console.log(`Created ATL for ${organization.name}.`);
  }

  console.log(
    organizations.length === 0
      ? "Every organization already has a site."
      : `Backfilled ${organizations.length} organization(s).`,
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
