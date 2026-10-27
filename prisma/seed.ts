/**
 * Development seed (M0).
 *
 * Reference data (`unit`, `allergen`) is inserted by the Phase 1 migration, so
 * this script only adds a realistic demo catalogue to one organization. It is
 * idempotent: every write is an upsert or a find-then-create, and existing
 * values are left untouched so re-running never clobbers manual edits.
 *
 * Usage:
 *   npm run db:seed                 # uses the only organization, if there is one
 *   npm run db:seed -- --org=demo   # explicit organization slug
 *   SEED_ORG_SLUG=demo npm run db:seed
 */
import "dotenv/config";

import {PrismaPg} from "@prisma/adapter-pg";
import {PrismaClient} from "../src/generated/prisma/client";

const connectionString = process.env["DATABASE_URL"];
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env first.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({connectionString}),
});

const VALID_FROM = new Date("2026-01-01T00:00:00.000Z");

function readSlugArgument(): string | undefined {
  const withEquals = process.argv
    .slice(2)
    .find((argument) => argument.startsWith("--org="));

  return withEquals?.slice("--org=".length) || process.env["SEED_ORG_SLUG"];
}

async function resolveOrganizationId(): Promise<string | null> {
  const slug = readSlugArgument();

  if (slug) {
    const organization = await prisma.organization.findUnique({
      where: {slug},
      select: {id: true, name: true},
    });

    if (!organization) {
      throw new Error(
        `No organization with slug "${slug}". Create it at /sign-up first.`,
      );
    }

    console.log(`Seeding organization ${organization.name} (${slug}).`);
    return organization.id;
  }

  const organizations = await prisma.organization.findMany({
    select: {id: true, name: true, slug: true},
    take: 2,
  });

  if (organizations.length === 0) {
    console.log(
      "No organization found. Create one at /sign-up, then run `npm run db:seed -- --org=<slug>`.",
    );
    return null;
  }

  if (organizations.length > 1) {
    throw new Error(
      "Several organizations exist. Pass one with `npm run db:seed -- --org=<slug>`.",
    );
  }

  const organization = organizations[0];
  console.log(
    `Seeding the only organization, ${organization.name} (${organization.slug}).`,
  );

  return organization.id;
}

async function unitId(code: string): Promise<string> {
  const unit = await prisma.unit.findUnique({
    where: {code},
    select: {id: true},
  });

  if (!unit) {
    throw new Error(
      `Unit "${code}" is missing. Run \`npm run db:deploy\` to apply the seed migration.`,
    );
  }

  return unit.id;
}

async function ensureCategory(
  organizationId: string,
  name: string,
  sortOrder: number,
): Promise<string> {
  const existing = await prisma.itemCategory.findFirst({
    where: {organizationId, parentId: null, name},
    select: {id: true},
  });

  if (existing) return existing.id;

  const created = await prisma.itemCategory.create({
    data: {organizationId, name, sortOrder},
    select: {id: true},
  });

  return created.id;
}

async function main() {
  const organizationId = await resolveOrganizationId();
  if (!organizationId) return;

  const kg = await unitId("kg");
  const piece = await unitId("piece");

  await prisma.organizationSetting.upsert({
    where: {organizationId},
    create: {organizationId},
    update: {},
  });

  const existingSite = await prisma.site.findFirst({
    where: {organizationId},
    orderBy: {createdAt: "asc"},
    select: {id: true, name: true},
  });

  const site =
    existingSite ??
    (await prisma.site.upsert({
      where: {organizationId_code: {organizationId, code: "ATL"}},
      create: {
        organizationId,
        code: "ATL",
        name: "Atelier",
        kind: "WORKSHOP",
        city: "Lyon",
      },
      update: {},
      select: {id: true, name: true},
    }));

  const rawCategoryId = await ensureCategory(
    organizationId,
    "Matières premières",
    10,
  );
  const finishedCategoryId = await ensureCategory(
    organizationId,
    "Viennoiseries",
    20,
  );

  const item = (
    code: string,
    name: string,
    type: "RAW_MATERIAL" | "PACKAGING" | "FINISHED_PRODUCT",
    stockUnitId: string,
    categoryId: string | null,
    extra: Record<string, unknown> = {},
  ) =>
    prisma.item.upsert({
      where: {organizationId_code: {organizationId, code}},
      create: {
        organizationId,
        code,
        name,
        type,
        stockUnitId,
        categoryId,
        ...extra,
      },
      update: {},
      select: {id: true},
    });

  const flour = await item("FARINE-T65", "Farine T65", "RAW_MATERIAL", kg, rawCategoryId, {
    isPurchasable: true,
  });
  const butter = await item("BEURRE-AOP", "Beurre AOP", "RAW_MATERIAL", kg, rawCategoryId, {
    isPurchasable: true,
  });
  const sugar = await item("SUCRE", "Sucre semoule", "RAW_MATERIAL", kg, rawCategoryId, {
    isPurchasable: true,
  });
  const croissant = await item(
    "CROISSANT",
    "Croissant au beurre",
    "FINISHED_PRODUCT",
    piece,
    finishedCategoryId,
    {
      saleUnitId: piece,
      salePrice: "1.6000",
      shelfLifeDays: 2,
      isProduced: true,
      isSellable: true,
    },
  );
  const box = await item("BOITE-CROISSANT", "Boîte 6 croissants", "PACKAGING", piece, null, {
    isPurchasable: true,
  });

  const allergenId = async (code: string): Promise<string> => {
    const allergen = await prisma.allergen.findUnique({
      where: {code},
      select: {id: true},
    });

    if (!allergen) {
      throw new Error(
        `Allergen "${code}" is missing. Run \`npm run db:deploy\` first.`,
      );
    }

    return allergen.id;
  };

  const itemAllergen = async (
    itemId: string,
    allergenCode: string,
    presence: "CONTAINS" | "MAY_CONTAIN" = "CONTAINS",
  ) => {
    const id = await allergenId(allergenCode);

    return prisma.itemAllergen.upsert({
      where: {
        itemId_allergenId_presence: {
          itemId,
          allergenId: id,
          presence,
        },
      },
      create: {
        organizationId,
        itemId,
        allergenId: id,
        presence,
      },
      update: {},
    });
  };

  await itemAllergen(flour.id, "GLUTEN");
  await itemAllergen(butter.id, "MILK");
  await itemAllergen(croissant.id, "GLUTEN");
  await itemAllergen(croissant.id, "MILK");

  const supplier = await prisma.supplier.upsert({
    where: {organizationId_code: {organizationId, code: "MINOTERIE"}},
    create: {
      organizationId,
      code: "MINOTERIE",
      name: "Minoterie du Vallon",
      email: "commandes@minoterie.example",
      city: "Lyon",
      defaultLeadTimeDays: 3,
    },
    update: {},
    select: {id: true},
  });

  const supplierItem = (
    itemId: string,
    supplierRef: string,
    packQuantity: string,
    price: string,
  ) =>
    prisma.supplierItem.upsert({
      where: {
        supplierId_itemId_validFrom: {
          supplierId: supplier.id,
          itemId,
          validFrom: VALID_FROM,
        },
      },
      create: {
        organizationId,
        supplierId: supplier.id,
        itemId,
        supplierRef,
        packQuantity,
        packUnitId: kg,
        price,
        validFrom: VALID_FROM,
        isPreferred: true,
      },
      update: {},
    });

  await supplierItem(flour.id, "T65-25", "25", "27.5000");
  await supplierItem(butter.id, "BUR-10", "10", "78.0000");
  await supplierItem(sugar.id, "SUC-25", "25", "19.5000");

  const labourRate = await prisma.labourRate.findFirst({
    where: {organizationId, siteId: site.id, label: "Pâtissier"},
    select: {id: true},
  });

  const rate =
    labourRate ??
    (await prisma.labourRate.create({
      data: {
        organizationId,
        siteId: site.id,
        label: "Pâtissier",
        hourlyCost: "18.5000",
        validFrom: VALID_FROM,
      },
      select: {id: true},
    }));

  await prisma.energyTariff.upsert({
    where: {
      siteId_energyKind_validFrom: {
        siteId: site.id,
        energyKind: "ELECTRICITY",
        validFrom: VALID_FROM,
      },
    },
    create: {
      organizationId,
      siteId: site.id,
      energyKind: "ELECTRICITY",
      pricePerKwh: "0.2516",
      validFrom: VALID_FROM,
    },
    update: {},
  });

  const mixerExisting = await prisma.equipment.findFirst({
    where: {organizationId, siteId: site.id, name: "Batteur 20 L"},
    select: {id: true},
  });
  const mixer =
    mixerExisting ??
    (await prisma.equipment.create({
      data: {
        organizationId,
        siteId: site.id,
        name: "Batteur 20 L",
        kind: "MIXER",
        powerKw: "0.750",
      },
      select: {id: true},
    }));

  const ovenExisting = await prisma.equipment.findFirst({
    where: {organizationId, siteId: site.id, name: "Four ventilé"},
    select: {id: true},
  });
  const oven =
    ovenExisting ??
    (await prisma.equipment.create({
      data: {
        organizationId,
        siteId: site.id,
        name: "Four ventilé",
        kind: "OVEN",
        powerKw: "3.500",
      },
      select: {id: true},
    }));

  const recipe = await prisma.recipe.upsert({
    where: {organizationId_code: {organizationId, code: "CROISSANT"}},
    create: {
      organizationId,
      outputItemId: croissant.id,
      code: "CROISSANT",
      name: "Croissant au beurre",
      description: "Pâte levée feuilletée, 60 pièces par fournée.",
    },
    update: {},
    select: {id: true},
  });

  const version = await prisma.recipeVersion.upsert({
    where: {recipeId_versionNumber: {recipeId: recipe.id, versionNumber: 1}},
    create: {
      organizationId,
      recipeId: recipe.id,
      versionNumber: 1,
      status: "DRAFT",
      yieldQuantity: "60",
      yieldUnitId: piece,
      portionCount: 60,
      prepMinutes: 90,
      cookMinutes: 18,
      instructions:
        "1. Pétrir la détrempe.\n2. Donner trois tours.\n3. Détailler et façonner.\n4. Pousser 90 minutes.\n5. Cuire 18 minutes à 190 °C.",
      changeNote: "Seed version.",
    },
    update: {},
    select: {id: true},
  });

  const line = (
    position: number,
    itemId: string,
    quantity: string,
    unitId: string,
    lossPct = "0",
  ) =>
    prisma.recipeLine.upsert({
      where: {
        recipeVersionId_position: {
          recipeVersionId: version.id,
          position,
        },
      },
      create: {
        organizationId,
        recipeVersionId: version.id,
        itemId,
        quantity,
        unitId,
        lossPct,
        position,
      },
      update: {},
    });

  await line(1, flour.id, "1.5", kg, "2");
  await line(2, butter.id, "0.5", kg);
  await line(3, sugar.id, "0.1", kg);
  await line(4, box.id, "10", piece);

  const operation = (
    position: number,
    name: string,
    durationMinutes: number,
    activeMinutes: number,
    equipmentId: string,
    temperatureC?: string,
  ) =>
    prisma.recipeOperation.upsert({
      where: {
        recipeVersionId_position: {
          recipeVersionId: version.id,
          position,
        },
      },
      create: {
        organizationId,
        recipeVersionId: version.id,
        equipmentId,
        labourRateId: rate.id,
        position,
        name,
        durationMinutes,
        activeMinutes,
        temperatureC,
      },
      update: {},
    });

  await operation(1, "Pétrissage", 20, 15, mixer.id);
  await operation(2, "Cuisson", 18, 5, oven.id, "190");

  console.log(
    `Seeded ${site.name}: 5 items, 1 supplier, 1 draft recipe (${version.id}).`,
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
