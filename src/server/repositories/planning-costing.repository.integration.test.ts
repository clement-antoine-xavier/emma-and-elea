import {prisma} from "@/lib/prisma";
import {planningRepository} from "@/server/repositories/planning.repository";
import {costingRepository} from "@/server/repositories/costing.repository";
import {
  createFixture,
  createPublishedRecipe,
  referenceUnits,
  type Fixture,
} from "@/test-utils/integration/db";

const plannedFor = new Date("2026-11-05T00:00:00.000Z");

describe("planning and costing repositories", () => {
  let fixture: Fixture;
  let recipeId: string;
  let versionId: string;

  beforeAll(async () => {
    fixture = await createFixture();
    ({recipeId, versionId} = await createPublishedRecipe(fixture));
  });

  afterAll(async () => {
    await fixture.cleanup();
  });

  async function createPlan() {
    return planningRepository.createPlan(fixture.organizationId, {
      siteId: fixture.siteId,
      plannedFor,
      source: "MANUAL",
      note: null,
      lines: [
        {
          itemId: fixture.items.croissant,
          recipeId: null,
          orderLineId: null,
          plannedQuantity: "10",
          unitId: referenceUnits.piece,
          note: null,
        },
      ],
    });
  }

  it("creates a plan with lines and finds it as the open plan", async () => {
    const id = await createPlan();

    const plan = await planningRepository.findPlan(
      fixture.organizationId,
      id,
    );
    expect(plan).toMatchObject({
      id,
      siteId: fixture.siteId,
      plannedFor,
      status: "DRAFT",
      source: "MANUAL",
      lineCount: 1,
    });
    expect(plan?.lines[0]).toMatchObject({
      itemId: fixture.items.croissant,
      plannedQuantity: "10",
      unitCode: "piece",
    });

    await expect(
      planningRepository.findOpenPlan(
        fixture.organizationId,
        fixture.siteId,
        plannedFor,
      ),
    ).resolves.toMatchObject({id, status: "DRAFT"});
    await expect(
      planningRepository.listPlans(fixture.organizationId, {
        siteId: fixture.siteId,
        plannedFor,
      }),
    ).resolves.toEqual(expect.arrayContaining([expect.objectContaining({id})]));
  });

  it("adds, updates and removes a line while the plan is a draft", async () => {
    const id = await createPlan();
    await planningRepository.addLine(fixture.organizationId, id, {
      itemId: fixture.items.flour,
      recipeId: null,
      orderLineId: null,
      plannedQuantity: "2",
      unitId: referenceUnits.kg,
      note: "Backup",
    });

    const withLine = await planningRepository.findPlan(
      fixture.organizationId,
      id,
    );
    expect(withLine?.lines).toHaveLength(2);
    const line = withLine!.lines.find(
      (row) => row.itemId === fixture.items.flour,
    )!;

    await expect(
      planningRepository.updateLine(
        fixture.organizationId,
        id,
        line.id,
        "3",
      ),
    ).resolves.toBeUndefined();
    await expect(
      planningRepository.removeLine(fixture.organizationId, id, line.id),
    ).resolves.toBeUndefined();
    await expect(
      planningRepository.removeLine(fixture.organizationId, id, line.id),
    ).rejects.toMatchObject({code: "NOT_FOUND"});
  });

  it("confirms, closes and cancels plans with state guards", async () => {
    const id = await createPlan();
    await planningRepository.confirm(fixture.organizationId, id);
    await expect(
      planningRepository.addLine(fixture.organizationId, id, {
        itemId: fixture.items.flour,
        recipeId: null,
        orderLineId: null,
        plannedQuantity: "1",
        unitId: referenceUnits.kg,
        note: null,
      }),
    ).rejects.toMatchObject({code: "INVALID_STATE_TRANSITION"});

    await expect(
      planningRepository.close(fixture.organizationId, id),
    ).resolves.toBeUndefined();
    await expect(
      planningRepository.close(fixture.organizationId, id),
    ).rejects.toMatchObject({code: "INVALID_STATE_TRANSITION"});

    const cancelled = await createPlan();
    await expect(
      planningRepository.cancel(fixture.organizationId, cancelled),
    ).resolves.toBeUndefined();
    await expect(
      planningRepository.confirm(fixture.organizationId, cancelled),
    ).rejects.toMatchObject({code: "INVALID_STATE_TRANSITION"});
  });

  it("returns the line data needed to create a batch", async () => {
    const id = await createPlan();
    await planningRepository.confirm(fixture.organizationId, id);
    const plan = await planningRepository.findPlan(
      fixture.organizationId,
      id,
    );
    await prisma.productionPlanLine.update({
      where: {id: plan!.lines[0].id},
      data: {recipeId},
    });

    const line = await planningRepository.findLineForBatch(
      fixture.organizationId,
      plan!.lines[0].id,
    );
    expect(line).toMatchObject({
      planStatus: "CONFIRMED",
      siteId: fixture.siteId,
      recipeVersionId: versionId,
      recipeVersionStatus: "PUBLISHED",
      yieldUnitId: referenceUnits.piece,
      batchId: null,
    });
  });

  it("scopes planning reads to the tenant", async () => {
    const id = await createPlan();

    await expect(
      planningRepository.findPlan("org_other", id),
    ).resolves.toBeNull();
    await expect(
      planningRepository.listPlans("org_other", {
        siteId: fixture.siteId,
        plannedFor,
      }),
    ).resolves.toEqual([]);
  });

  it("resolves settings, prices, labour rates and tariffs", async () => {
    const date = new Date("2026-06-01T00:00:00.000Z");

    await expect(
      costingRepository.getSettings(fixture.organizationId),
    ).resolves.toMatchObject({
      currency: "EUR",
      overheadPct: "10",
      defaultLabourRateId: null,
    });
    await expect(
      costingRepository.getDefaultSiteId(fixture.organizationId),
    ).resolves.toBe(fixture.siteId);

    // The fixture supplier sells a 25 kg pack for 27.50, so 1.10 per kg.
    await expect(
      costingRepository.resolvePrices(
        fixture.organizationId,
        [fixture.items.flour, fixture.items.butter],
        date,
      ),
    ).resolves.toEqual({
      [fixture.items.flour]: {
        unitCostPerStockUnit: "1.1",
        source: "SUPPLIER",
      },
    });

    const rate = await prisma.labourRate.create({
      data: {
        id: `rate_${Date.now()}`,
        organizationId: fixture.organizationId,
        label: "Baker",
        hourlyCost: "18",
        validFrom: new Date("2026-01-01T00:00:00.000Z"),
      },
      select: {id: true},
    });
    const tariff = await prisma.energyTariff.create({
      data: {
        id: `tariff_${Date.now()}`,
        organizationId: fixture.organizationId,
        siteId: fixture.siteId,
        energyKind: "ELECTRICITY",
        pricePerKwh: "0.2",
        validFrom: new Date("2026-01-01T00:00:00.000Z"),
      },
      select: {id: true},
    });

    await expect(
      costingRepository.resolveLabourRates(fixture.organizationId, date),
    ).resolves.toEqual([
      expect.objectContaining({id: rate.id, hourlyCost: "18", siteId: null}),
    ]);
    await expect(
      costingRepository.resolveEnergyTariffs(fixture.organizationId, date),
    ).resolves.toEqual([
      expect.objectContaining({
        siteId: fixture.siteId,
        pricePerKwh: "0.2",
        currency: "EUR",
      }),
    ]);
    expect(tariff.id).toBeTruthy();

    // Archived rates and expired windows disappear.
    await prisma.labourRate.update({
      where: {id: rate.id},
      data: {archivedAt: new Date()},
    });
    await expect(
      costingRepository.resolveLabourRates(fixture.organizationId, date),
    ).resolves.toEqual([]);
    await expect(
      costingRepository.resolvePrices(
        fixture.organizationId,
        [],
        date,
      ),
    ).resolves.toEqual({});
  });

  it("returns default settings when the tenant has none", async () => {
    const emptyOrg = await prisma.organization.create({
      data: {
        id: `org_costing_${Date.now()}`,
        name: "No settings",
        slug: `no-settings-${Date.now()}`,
        createdAt: new Date(),
      },
      select: {id: true},
    });

    await expect(
      costingRepository.getSettings(emptyOrg.id),
    ).resolves.toMatchObject({defaultLabourRateId: null});
    await expect(
      costingRepository.getDefaultSiteId(emptyOrg.id),
    ).resolves.toBeNull();
    await prisma.organization.delete({where: {id: emptyOrg.id}});
  });
});
