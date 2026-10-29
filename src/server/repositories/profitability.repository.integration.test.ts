import {prisma} from "@/lib/prisma";
import {profitabilityRepository} from "@/server/repositories/profitability.repository";
import {
  createFixture,
  createPublishedRecipe,
  referenceUnits,
  type Fixture,
} from "@/test-utils/integration/db";

describe("profitability repository", () => {
  let fixture: Fixture;

  beforeAll(async () => {
    fixture = await createFixture();
    const {versionId} = await createPublishedRecipe(fixture);

    await prisma.costSnapshot.create({
      data: {
        organizationId: fixture.organizationId,
        scope: "RECIPE_VERSION",
        recipeVersionId: versionId,
        currency: "EUR",
        materialCost: "10",
        packagingCost: "0",
        labourCost: "5",
        energyCost: "0",
        overheadCost: "0",
        totalCost: "15",
        yieldQuantity: "10",
        yieldUnitId: referenceUnits.piece,
        costPerUnit: "1.5",
        salePrice: "2.5",
        marginPct: "40",
        inputHash: "hash",
      },
    });

    await prisma.salesDaily.create({
      data: {
        organizationId: fixture.organizationId,
        siteId: fixture.siteId,
        itemId: fixture.items.croissant,
        businessDate: new Date("2026-10-20T00:00:00.000Z"),
        channel: "RETAIL",
        quantitySold: "20",
        unitId: referenceUnits.piece,
        revenue: "50",
        currency: "EUR",
      },
    });

    const batch = await prisma.productionBatch.create({
      data: {
        organizationId: fixture.organizationId,
        siteId: fixture.siteId,
        recipeVersionId: versionId,
        code: "B-PROFIT-1",
        status: "COMPLETED",
        plannedQuantity: "30",
        actualQuantity: "30",
        unitId: referenceUnits.piece,
        producedOn: new Date("2026-10-20T00:00:00.000Z"),
        completedAt: new Date("2026-10-20T12:00:00.000Z"),
      },
    });
    await prisma.productionBatchOutput.create({
      data: {
        organizationId: fixture.organizationId,
        productionBatchId: batch.id,
        itemId: fixture.items.croissant,
        quantity: "30",
        unitId: referenceUnits.piece,
        isPrimary: true,
      },
    });

    const reason = await prisma.lossReason.create({
      data: {
        organizationId: fixture.organizationId,
        code: "EXPIRED",
        labelFr: "Périmé",
        labelEn: "Expired",
      },
    });
    const wasteLot = await prisma.lot.create({
      data: {
        organizationId: fixture.organizationId,
        siteId: fixture.siteId,
        itemId: fixture.items.croissant,
        lotNumber: "L-PROFIT-WASTE",
        receivedAt: new Date("2026-10-20T00:00:00.000Z"),
        quantityReceived: "3",
        quantityRemaining: "3",
        unitCost: "1.5",
        currency: "EUR",
      },
    });
    await prisma.wasteRecord.create({
      data: {
        organizationId: fixture.organizationId,
        siteId: fixture.siteId,
        itemId: fixture.items.croissant,
        lotId: wasteLot.id,
        lossReasonId: reason.id,
        quantity: "3",
        unitId: referenceUnits.piece,
        costImpact: "4.5",
        currency: "EUR",
        recordedAt: new Date("2026-10-21T10:00:00.000Z"),
      },
    });

    const lot = await prisma.lot.create({
      data: {
        organizationId: fixture.organizationId,
        siteId: fixture.siteId,
        itemId: fixture.items.croissant,
        lotNumber: "L-PROFIT-1",
        receivedAt: new Date("2026-10-20T00:00:00.000Z"),
        quantityReceived: "30",
        quantityRemaining: "30",
        unitCost: "1.5",
        currency: "EUR",
      },
    });
    const dispatch = await prisma.dispatch.create({
      data: {
        organizationId: fixture.organizationId,
        siteId: fixture.siteId,
        number: "D-PROFIT-1",
        status: "DISPATCHED",
        dispatchedAt: new Date("2026-10-22T09:00:00.000Z"),
      },
    });
    await prisma.dispatchLine.create({
      data: {
        organizationId: fixture.organizationId,
        dispatchId: dispatch.id,
        itemId: fixture.items.croissant,
        lotId: lot.id,
        quantity: "4",
        unitId: referenceUnits.piece,
        unitPrice: "2.5",
      },
    });
  });

  afterAll(async () => {
    await fixture.cleanup();
  });

  it("combines sales, dispatches, production and waste per item", async () => {
    const data = await profitabilityRepository.getData(
      fixture.organizationId,
      new Date("2026-10-01T00:00:00.000Z"),
      new Date("2026-10-31T23:59:59.999Z"),
    );

    expect(data.currency).toBe("EUR");
    expect(data.metrics[fixture.items.croissant]).toEqual({
      produced: "30",
      sold: "24",
      waste: "3",
      revenue: "60",
      wasteCost: "4.5",
      missingRevenue: false,
    });

    const item = data.items.find(
      (row) => row.itemId === fixture.items.croissant,
    );
    expect(item).toMatchObject({
      recipeName: "Croissant",
      salePrice: "2.5",
      costPerUnit: "1.5",
      currency: "EUR",
    });
  });

  it("returns nothing for another organization", async () => {
    const data = await profitabilityRepository.getData(
      "org_other",
      new Date("2026-10-01T00:00:00.000Z"),
      new Date("2026-10-31T23:59:59.999Z"),
    );

    expect(data.items).toEqual([]);
    expect(data.metrics).toEqual({});
  });
});
