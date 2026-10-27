import {prisma} from "@/lib/prisma";
import {productionRepository} from "@/server/repositories/production.repository";
import type {
  BatchCompletionInput,
  ProductionBatchInput,
} from "@/server/repositories/production.repository";
import {
  createBatch,
  createFixture,
  createLot,
  createPublishedRecipe,
  referenceUnits,
  uniqueCode,
  type Fixture,
} from "@/test-utils/integration/db";

const producedOn = new Date("2026-10-27T00:00:00.000Z");

function completion(
  fixture: Fixture,
  lotId: string,
  overrides: Partial<BatchCompletionInput> = {},
): BatchCompletionInput {
  return {
    actualQuantity: "10",
    producedOn,
    inputs: [
      {
        lotId,
        itemId: fixture.items.flour,
        quantity: "2",
        unitId: referenceUnits.kg,
        unitCost: "1",
        theoreticalQuantity: "2",
      },
    ],
    output: {
      itemId: fixture.items.croissant,
      quantity: "10",
      unitId: referenceUnits.piece,
      unitCost: "0.2",
      expiresOn: new Date("2026-10-30T00:00:00.000Z"),
    },
    cost: {
      currency: "EUR",
      materialCost: "2",
      packagingCost: "0",
      labourCost: "0",
      energyCost: "0",
      overheadCost: "0.2",
      totalCost: "2.2",
      yieldQuantity: "10",
      yieldUnitId: referenceUnits.piece,
      costPerUnit: "0.22",
      salePrice: "2.5",
      marginPct: "91.2",
      inputHash: null,
      lines: [
        {
          kind: "MATERIAL",
          itemId: fixture.items.flour,
          lotId,
          recipeOperationId: null,
          label: "Flour",
          quantity: "2",
          unitId: referenceUnits.kg,
          unitCost: "1",
          amount: "2",
          position: 0,
        },
      ],
    },
    ...overrides,
  };
}

describe("production repository", () => {
  let fixture: Fixture;
  let versionId: string;
  let batchId: string;
  let flourLotId: string;
  let butterLotId: string;

  beforeAll(async () => {
    fixture = await createFixture();
    versionId = (await createPublishedRecipe(fixture)).versionId;
    batchId = await createBatch(fixture, versionId);
    flourLotId = await createLot(fixture, {
      itemId: fixture.items.flour,
      quantity: "10",
      unitCost: "1",
      expiresOn: new Date("2026-12-01T00:00:00.000Z"),
    });
    butterLotId = await createLot(fixture, {
      itemId: fixture.items.butter,
      quantity: "5",
      unitCost: "4",
    });
  });

  afterAll(async () => {
    await fixture.cleanup();
  });

  it("creates a batch with the recipe yield unit and reads it back", async () => {
    const input: ProductionBatchInput = {
      siteId: fixture.siteId,
      recipeVersionId: versionId,
      plannedQuantity: "20",
      unitId: referenceUnits.piece,
      plannedStartAt: null,
      note: "Morning batch",
    };

    const id = await productionRepository.createBatch(
      fixture.organizationId,
      { ...input, note: "Morning batch" },
    );

    const detail = await productionRepository.findBatch(
      fixture.organizationId,
      id,
    );

    expect(detail).toMatchObject({
      id,
      siteId: fixture.siteId,
      recipeVersionId: versionId,
      status: "PLANNED",
      plannedQuantity: "20",
      recipeYieldQuantity: "10",
      outputItemId: fixture.items.croissant,
      note: "Morning batch",
    });
    expect(detail?.recipeLines).toHaveLength(1);
    await expect(
      productionRepository.findBatch("org_other", id),
    ).resolves.toBeNull();
  });

  it("lists available lots for the site and requested items", async () => {
    const otherSite = await prisma.site.create({
      data: {
        id: `site_other_${Date.now()}`,
        organizationId: fixture.organizationId,
        code: `OTH${Date.now() % 1000}`,
        name: "Other site",
      },
      select: {id: true},
    });
    await prisma.lot.create({
      data: {
        id: `lot_other_site_${Date.now()}`,
        organizationId: fixture.organizationId,
        siteId: otherSite.id,
        itemId: fixture.items.flour,
        lotNumber: `OTHER-${Date.now()}`,
        receivedAt: new Date(),
        quantityReceived: "99",
        quantityRemaining: "99",
        unitCost: "1",
      },
    });

    const lots = await productionRepository.listAvailableLots(
      fixture.organizationId,
      fixture.siteId,
      [fixture.items.flour],
    );

    expect(lots.map((lot) => lot.id)).toContain(flourLotId);
    expect(lots.map((lot) => lot.id)).not.toContain(butterLotId);
    expect(lots.every((lot) => lot.quantityRemaining !== "0")).toBe(true);
  });

  it("starts and cancels a batch with state guards", async () => {
    const id = await createBatch(fixture, versionId);

    await expect(
      productionRepository.startBatch(fixture.organizationId, id),
    ).resolves.toBeUndefined();
    await expect(
      productionRepository.startBatch(fixture.organizationId, id),
    ).rejects.toMatchObject({code: "INVALID_STATE_TRANSITION"});

    await expect(
      productionRepository.cancelBatch(fixture.organizationId, id),
    ).resolves.toBeUndefined();
    await expect(
      productionRepository.cancelBatch(fixture.organizationId, id),
    ).rejects.toMatchObject({code: "INVALID_STATE_TRANSITION"});
  });

  it("completes a batch, consuming lots and writing the output and cost", async () => {
    await productionRepository.complete(
      fixture.organizationId,
      batchId,
      completion(fixture, flourLotId),
      fixture.userId,
    );

    const batch = await prisma.productionBatch.findUniqueOrThrow({
      where: {id: batchId},
      select: {status: true, actualQuantity: true, producedOn: true},
    });
    expect(batch.status).toBe("COMPLETED");
    expect(batch.actualQuantity?.toString()).toBe("10");
    expect(batch.producedOn).toEqual(producedOn);

    const lot = await prisma.lot.findUniqueOrThrow({
      where: {id: flourLotId},
      select: {quantityRemaining: true},
    });
    expect(lot.quantityRemaining.toString()).toBe("8");

    const inputs = await prisma.productionBatchInput.findMany({
      where: {productionBatchId: batchId},
      select: {itemId: true, quantity: true, lotId: true},
    });
    expect(inputs).toHaveLength(1);
    expect(inputs[0].quantity.toString()).toBe("2");

    const output = await prisma.productionBatchOutput.findFirstOrThrow({
      where: {productionBatchId: batchId},
      select: {itemId: true, quantity: true, lotId: true, isPrimary: true},
    });
    expect(output).toMatchObject({itemId: fixture.items.croissant, isPrimary: true});
    expect(output.quantity.toString()).toBe("10");

    const outputLot = await prisma.lot.findUniqueOrThrow({
      where: {id: output.lotId!},
      select: {
        productionBatchId: true,
        producedOn: true,
        expiresOn: true,
        quantityRemaining: true,
        lotNumber: true,
      },
    });
    expect(outputLot).toMatchObject({
      productionBatchId: batchId,
      producedOn,
      expiresOn: new Date("2026-10-30T00:00:00.000Z"),
    });
    expect(outputLot.quantityRemaining.toString()).toBe("10");
    expect(outputLot.lotNumber).toMatch(/^ATL-\d{6}-\d+$/);

    const movements = await prisma.stockMovement.findMany({
      where: {referenceType: "PRODUCTION_BATCH", referenceId: batchId},
      orderBy: {type: "asc"},
      select: {type: true, quantity: true, itemId: true},
    });
    expect(movements.map((movement) => movement.type)).toEqual([
      "CONSUMPTION",
      "PRODUCTION_OUTPUT",
    ]);
    expect(movements[0].quantity.toString()).toBe("-2");

    const snapshot = await prisma.costSnapshot.findFirstOrThrow({
      where: {productionBatchId: batchId},
      select: {
        scope: true,
        totalCost: true,
        costPerUnit: true,
        lines: {select: {kind: true, amount: true}},
      },
    });
    expect(snapshot.scope).toBe("PRODUCTION_BATCH");
    expect(snapshot.totalCost.toString()).toBe("2.2");
    expect(snapshot.costPerUnit.toString()).toBe("0.22");
    expect(snapshot.lines).toHaveLength(1);
    expect(snapshot.lines[0].kind).toBe("MATERIAL");
  });

  it("rolls back a completion when a lot no longer has enough stock", async () => {
    const id = await createBatch(fixture, versionId);
    const freshLot = await createLot(fixture, {
      itemId: fixture.items.flour,
      quantity: "1",
      unitCost: "1",
    });

    await expect(
      productionRepository.complete(
        fixture.organizationId,
        id,
        completion(fixture, freshLot, {
          inputs: [
            {
              lotId: freshLot,
              itemId: fixture.items.flour,
              quantity: "50",
              unitId: referenceUnits.kg,
              unitCost: "1",
              theoreticalQuantity: "50",
            },
          ],
        }),
        fixture.userId,
      ),
    ).rejects.toMatchObject({code: "INSUFFICIENT_STOCK"});

    const [batch, lot, inputs, movements, outputs] = await Promise.all([
      prisma.productionBatch.findUniqueOrThrow({
        where: {id},
        select: {status: true},
      }),
      prisma.lot.findUniqueOrThrow({
        where: {id: freshLot},
        select: {quantityRemaining: true},
      }),
      prisma.productionBatchInput.count({where: {productionBatchId: id}}),
      prisma.stockMovement.count({
        where: {referenceType: "PRODUCTION_BATCH", referenceId: id},
      }),
      prisma.productionBatchOutput.count({where: {productionBatchId: id}}),
    ]);

    expect(batch.status).toBe("PLANNED");
    expect(lot.quantityRemaining.toString()).toBe("1");
    expect(inputs).toBe(0);
    expect(movements).toBe(0);
    expect(outputs).toBe(0);
  });

  it("refuses to complete a batch twice", async () => {
    await expect(
      productionRepository.complete(
        fixture.organizationId,
        batchId,
        completion(fixture, flourLotId),
        fixture.userId,
      ),
    ).rejects.toMatchObject({code: "INVALID_STATE_TRANSITION"});
  });

  it("records and archives waste, decrementing the lot", async () => {
    const lossReason = await prisma.lossReason.create({
      data: {
        id: `loss_${Date.now()}`,
        organizationId: fixture.organizationId,
        code: uniqueCode("LOSS"),
        labelEn: "Test loss",
        labelFr: "Perte test",
        category: "OTHER",
      },
      select: {id: true},
    });

    await productionRepository.recordWaste(
      fixture.organizationId,
      {
        lotId: butterLotId,
        lossReasonId: lossReason.id,
        quantity: "1",
        reason: "Dropped",
        recordedAt: producedOn,
      },
      fixture.userId,
    );

    const lot = await prisma.lot.findUniqueOrThrow({
      where: {id: butterLotId},
      select: {quantityRemaining: true},
    });
    expect(lot.quantityRemaining.toString()).toBe("4");

    const waste = await prisma.wasteRecord.findFirstOrThrow({
      where: {organizationId: fixture.organizationId},
      select: {id: true, quantity: true, note: true, archivedAt: true},
    });
    expect(waste.quantity.toString()).toBe("1");
    expect(waste.note).toBe("Dropped");
    expect(waste.archivedAt).toBeNull();

    await productionRepository.archiveWaste(
      fixture.organizationId,
      waste.id,
    );
    const archived = await prisma.wasteRecord.findUniqueOrThrow({
      where: {id: waste.id},
      select: {archivedAt: true},
    });
    expect(archived.archivedAt).not.toBeNull();
  });

  it("traces the source and consumers of a lot", async () => {
    const trace = await productionRepository.trace(
      fixture.organizationId,
      flourLotId,
    );

    expect(trace).toMatchObject({lotId: flourLotId});
    expect(trace?.consumedBy.length).toBeGreaterThanOrEqual(1);
    await expect(
      productionRepository.trace("org_other", flourLotId),
    ).resolves.toBeNull();
  });
});
