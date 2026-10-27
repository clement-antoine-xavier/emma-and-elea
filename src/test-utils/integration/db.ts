import {prisma} from "@/lib/prisma";

/**
 * Isolated tenant fixtures for repository integration tests.
 *
 * Each run creates its own organization and user with a random suffix; cleanup
 * deletes the organization (cascading to all domain rows) and then the user.
 * Nothing is truncated, so the suite is safe against a development database.
 */

let sequence = 0;

function id(prefix: string): string {
  sequence += 1;
  return `${prefix}_it_${Date.now().toString(36)}_${sequence}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export const referenceUnits = {
  kg: "unit_kg",
  g: "unit_g",
  L: "unit_l",
  piece: "unit_piece",
} as const;

export type Fixture = {
  organizationId: string;
  userId: string;
  memberId: string;
  siteId: string;
  supplierId: string;
  supplierItemId: string;
  categoryId: string;
  items: {
    flour: string;
    butter: string;
    croissant: string;
  };
  cleanup: () => Promise<void>;
};

export type ItemOptions = {
  type?: "RAW_MATERIAL" | "PACKAGING" | "SEMI_FINISHED" | "FINISHED_PRODUCT";
  stockUnitId?: string;
  isPurchasable?: boolean;
  isProduced?: boolean;
  isSellable?: boolean;
  salePrice?: string | null;
  saleUnitId?: string | null;
  minStockQuantity?: string | null;
};

export async function createItem(
  organizationId: string,
  code: string,
  name: string,
  options: ItemOptions = {},
): Promise<string> {
  const item = await prisma.item.create({
    data: {
      id: id("item"),
      organizationId,
      code,
      name,
      type: options.type ?? "RAW_MATERIAL",
      stockUnitId: options.stockUnitId ?? referenceUnits.kg,
      saleUnitId: options.saleUnitId ?? null,
      salePrice: options.salePrice ?? null,
      isPurchasable: options.isPurchasable ?? true,
      isProduced: options.isProduced ?? false,
      isSellable: options.isSellable ?? false,
      minStockQuantity: options.minStockQuantity ?? null,
    },
    select: {id: true},
  });

  return item.id;
}

export async function createFixture(): Promise<Fixture> {
  const suffix = `${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  const organizationId = id("org");
  const userId = id("user");

  await prisma.user.create({
    data: {
      id: userId,
      name: "Integration actor",
      email: `it-${suffix}@example.com`,
      emailVerified: true,
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  await prisma.organization.create({
    data: {
      id: organizationId,
      name: `Integration bakery ${suffix}`,
      slug: `it-${suffix}`,
      createdAt: new Date(),
    },
  });

  const member = await prisma.member.create({
    data: {
      id: id("member"),
      organizationId,
      userId,
      role: "owner",
      createdAt: new Date(),
    },
    select: {id: true},
  });

  const site = await prisma.site.create({
    data: {
      id: id("site"),
      organizationId,
      code: "ATL",
      name: "Atelier",
      kind: "WORKSHOP",
      timezone: "Europe/Paris",
    },
    select: {id: true},
  });

  const category = await prisma.itemCategory.create({
    data: {
      id: id("cat"),
      organizationId,
      name: "Raw materials",
      sortOrder: 1,
    },
    select: {id: true},
  });

  const flour = await createItem(organizationId, "FLOUR", "Flour", {
    minStockQuantity: "10",
  });
  const butter = await createItem(organizationId, "BUTTER", "Butter");
  const croissant = await createItem(
    organizationId,
    "CROISSANT",
    "Croissant",
    {
      type: "FINISHED_PRODUCT",
      stockUnitId: referenceUnits.piece,
      isPurchasable: false,
      isProduced: true,
      isSellable: true,
      salePrice: "2.5",
      saleUnitId: referenceUnits.piece,
    },
  );

  const supplier = await prisma.supplier.create({
    data: {
      id: id("supplier"),
      organizationId,
      code: "MILL",
      name: "Mill",
      defaultLeadTimeDays: 2,
    },
    select: {id: true},
  });

  const supplierItem = await prisma.supplierItem.create({
    data: {
      id: id("supplier_item"),
      organizationId,
      supplierId: supplier.id,
      itemId: flour,
      packQuantity: "25",
      packUnitId: referenceUnits.kg,
      price: "27.5",
      validFrom: new Date("2026-01-01T00:00:00.000Z"),
      isPreferred: true,
    },
    select: {id: true},
  });

  await prisma.organizationSetting.create({
    data: {
      organizationId,
      currency: "EUR",
      overheadPct: "10",
      forecastHistoryDays: 56,
      forecastSafetyPct: "5",
    },
  });

  return {
    organizationId,
    userId,
    memberId: member.id,
    siteId: site.id,
    supplierId: supplier.id,
    supplierItemId: supplierItem.id,
    categoryId: category.id,
    items: {flour, butter, croissant},
    cleanup: async () => {
      await prisma.organization.deleteMany({where: {id: organizationId}});
      await prisma.user.deleteMany({where: {id: userId}});
    },
  };
}

/**
 * A published recipe version with one flour line, usable by production tests.
 */
export async function createPublishedRecipe(
  fixture: Fixture,
  options: {
    yieldQuantity?: string;
    flourQuantity?: string;
    lossPct?: string;
    shelfLifeDays?: number;
  } = {},
): Promise<{recipeId: string; versionId: string}> {
  const recipe = await prisma.recipe.create({
    data: {
      id: id("recipe"),
      organizationId: fixture.organizationId,
      outputItemId: fixture.items.croissant,
      code: "CRO",
      name: "Croissant",
    },
    select: {id: true},
  });

  const version = await prisma.recipeVersion.create({
    data: {
      id: id("version"),
      organizationId: fixture.organizationId,
      recipeId: recipe.id,
      versionNumber: 1,
      status: "PUBLISHED",
      yieldQuantity: options.yieldQuantity ?? "10",
      yieldUnitId: referenceUnits.piece,
      publishedAt: new Date(),
    },
    select: {id: true},
  });

  await prisma.recipe.update({
    where: {id: recipe.id},
    data: {currentVersionId: version.id},
  });

  await prisma.recipeLine.create({
    data: {
      id: id("line"),
      organizationId: fixture.organizationId,
      recipeVersionId: version.id,
      itemId: fixture.items.flour,
      quantity: options.flourQuantity ?? "1",
      unitId: referenceUnits.kg,
      lossPct: options.lossPct ?? "0",
      position: 1,
    },
  });

  return {recipeId: recipe.id, versionId: version.id};
}

export async function createLot(
  fixture: Fixture,
  input: {
    itemId: string;
    lotNumber?: string;
    quantity: string;
    unitCost?: string;
    expiresOn?: Date | null;
    receivedAt?: Date;
    unitId?: string;
  },
): Promise<string> {
  const lot = await prisma.lot.create({
    data: {
      id: id("lot"),
      organizationId: fixture.organizationId,
      siteId: fixture.siteId,
      itemId: input.itemId,
      lotNumber: input.lotNumber ?? `LOT-${sequence}`,
      receivedAt: input.receivedAt ?? new Date("2026-10-01T00:00:00.000Z"),
      expiresOn: input.expiresOn ?? null,
      quantityReceived: input.quantity,
      quantityRemaining: input.quantity,
      unitCost: input.unitCost ?? "1",
      currency: "EUR",
    },
    select: {id: true},
  });

  await prisma.stockMovement.create({
    data: {
      id: id("movement"),
      organizationId: fixture.organizationId,
      siteId: fixture.siteId,
      itemId: input.itemId,
      lotId: lot.id,
      type: "RECEIPT",
      quantity: input.quantity,
      unitId: input.unitId ?? referenceUnits.kg,
      occurredAt: input.receivedAt ?? new Date("2026-10-01T00:00:00.000Z"),
    },
  });

  return lot.id;
}

export async function createBatch(
  fixture: Fixture,
  versionId: string,
  options: {plannedQuantity?: string; status?: "PLANNED" | "IN_PROGRESS"} = {},
): Promise<string> {
  const batch = await prisma.productionBatch.create({
    data: {
      id: id("batch"),
      organizationId: fixture.organizationId,
      siteId: fixture.siteId,
      recipeVersionId: versionId,
      code: `B-${suffixFromId(fixture.organizationId)}-${sequence}`,
      status: options.status ?? "PLANNED",
      plannedQuantity: options.plannedQuantity ?? "10",
      unitId: referenceUnits.piece,
    },
    select: {id: true},
  });

  return batch.id;
}

export async function createCustomer(
  fixture: Fixture,
  name = "Acme",
): Promise<string> {
  const customer = await prisma.customer.create({
    data: {
      id: id("customer"),
      organizationId: fixture.organizationId,
      code: "ACME",
      name,
      type: "BUSINESS",
    },
    select: {id: true},
  });

  return customer.id;
}

export function uniqueCode(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

function suffixFromId(value: string): string {
  return value.slice(-6);
}
