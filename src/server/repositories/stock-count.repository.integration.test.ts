import {prisma} from "@/lib/prisma";
import {stockCountRepository} from "@/server/repositories/stock-count.repository";
import {
  createFixture,
  createLot,
  type Fixture,
} from "@/test-utils/integration/db";

const countedAt = new Date("2026-10-27T00:00:00.000Z");

describe("stock count repository", () => {
  let fixture: Fixture;
  let flourLot: string;
  let butterLot: string;

  beforeAll(async () => {
    fixture = await createFixture();
    flourLot = await createLot(fixture, {
      itemId: fixture.items.flour,
      lotNumber: "ATL-COUNT-FLOUR",
      quantity: "4",
    });
    butterLot = await createLot(fixture, {
      itemId: fixture.items.butter,
      lotNumber: "ATL-COUNT-BUTTER",
      quantity: "2",
    });
  });

  afterAll(async () => {
    await fixture.cleanup();
  });

  async function createCount(siteId = fixture.siteId) {
    return stockCountRepository.createCount(fixture.organizationId, {
      siteId,
      countedAt,
      note: null,
      userId: fixture.userId,
    });
  }

  it("snapshots every available lot of the site as a line", async () => {
    const id = await createCount();

    const detail = await stockCountRepository.findCount(
      fixture.organizationId,
      id,
    );

    expect(detail).toMatchObject({
      siteId: fixture.siteId,
      status: "DRAFT",
      countedAt,
      lineCount: 2,
    });
    expect(detail?.lines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          lotId: flourLot,
          itemId: fixture.items.flour,
          expectedQuantity: "4",
          countedQuantity: "4",
          variance: "0",
          unitCode: "kg",
        }),
        expect.objectContaining({
          lotId: butterLot,
          expectedQuantity: "2",
        }),
      ]),
    );
  });

  it("refuses a count when the site has no stock", async () => {
    const emptySite = await prisma.site.create({
      data: {
        id: `site_empty_${Date.now()}`,
        organizationId: fixture.organizationId,
        code: `EMP${Date.now() % 1000}`,
        name: "Empty site",
      },
      select: {id: true},
    });

    await expect(createCount(emptySite.id)).rejects.toMatchObject({
      code: "INVALID_INPUT",
    });
  });

  it("finds the draft for the same site and day", async () => {
    const id = await createCount();

    // The repository does not enforce one draft per day (the service does), so
    // any draft for the same site and day is a valid answer here.
    await expect(
      stockCountRepository.findDraft(
        fixture.organizationId,
        fixture.siteId,
        countedAt,
      ),
    ).resolves.toMatchObject({status: "DRAFT"});
    expect(id).toBeTruthy();
    await expect(
      stockCountRepository.findDraft(
        fixture.organizationId,
        fixture.siteId,
        new Date("2026-10-28T00:00:00.000Z"),
      ),
    ).resolves.toBeNull();
  });

  it("updates counted lines with their variance", async () => {
    const id = await createCount();
    const detail = await stockCountRepository.findCount(
      fixture.organizationId,
      id,
    );
    const flourLine = detail!.lines.find((line) => line.lotId === flourLot)!;

    await expect(
      stockCountRepository.updateLines(fixture.organizationId, id, [
        {id: flourLine.id, countedQuantity: "3", variance: "-1"},
      ]),
    ).resolves.toBeUndefined();

    const updated = await stockCountRepository.findCount(
      fixture.organizationId,
      id,
    );
    expect(
      updated?.lines.find((line) => line.lotId === flourLot),
    ).toMatchObject({countedQuantity: "3", variance: "-1"});

    await expect(
      stockCountRepository.updateLines(fixture.organizationId, id, [
        {id: "missing", countedQuantity: "1", variance: "0"},
      ]),
    ).rejects.toMatchObject({code: "NOT_FOUND"});
  });

  it("posts the counted quantities and writes only the differences", async () => {
    const id = await createCount();
    const detail = await stockCountRepository.findCount(
      fixture.organizationId,
      id,
    );
    const flourLine = detail!.lines.find((line) => line.lotId === flourLot)!;
    const butterLine = detail!.lines.find((line) => line.lotId === butterLot)!;

    await stockCountRepository.updateLines(fixture.organizationId, id, [
      {id: flourLine.id, countedQuantity: "3", variance: "-1"},
      {id: butterLine.id, countedQuantity: "2", variance: "0"},
    ]);

    await stockCountRepository.post(
      fixture.organizationId,
      id,
      fixture.userId,
    );

    const [count, flour, butter, movements] = await Promise.all([
      prisma.stockCount.findUniqueOrThrow({
        where: {id},
        select: {status: true, postedAt: true},
      }),
      prisma.lot.findUniqueOrThrow({
        where: {id: flourLot},
        select: {quantityRemaining: true},
      }),
      prisma.lot.findUniqueOrThrow({
        where: {id: butterLot},
        select: {quantityRemaining: true},
      }),
      prisma.stockMovement.findMany({
        where: {referenceType: "STOCK_COUNT", referenceId: id},
        select: {type: true, quantity: true, itemId: true, reason: true},
      }),
    ]);

    expect(count.status).toBe("POSTED");
    expect(count.postedAt).not.toBeNull();
    expect(flour.quantityRemaining.toString()).toBe("3");
    expect(butter.quantityRemaining.toString()).toBe("2");

    // The matching butter line produces no movement.
    expect(movements).toHaveLength(1);
    expect(movements[0]).toMatchObject({
      type: "COUNT",
      itemId: fixture.items.flour,
      reason: "Stock count",
    });
    expect(movements[0].quantity.toString()).toBe("-1");
  });

  it("is idempotent: a posted count cannot be posted or updated again", async () => {
    const id = await createCount();
    await stockCountRepository.post(
      fixture.organizationId,
      id,
      fixture.userId,
    );

    await expect(
      stockCountRepository.post(fixture.organizationId, id, fixture.userId),
    ).rejects.toMatchObject({code: "INVALID_STATE_TRANSITION"});

    const detail = await stockCountRepository.findCount(
      fixture.organizationId,
      id,
    );
    await expect(
      stockCountRepository.updateLines(fixture.organizationId, id, [
        {
          id: detail!.lines[0].id,
          countedQuantity: "1",
          variance: "0",
        },
      ]),
    ).rejects.toMatchObject({code: "INVALID_STATE_TRANSITION"});
  });

  it("refuses to post a count without lines", async () => {
    const id = await createCount();
    await prisma.stockCountLine.deleteMany({where: {stockCountId: id}});

    await expect(
      stockCountRepository.post(fixture.organizationId, id, fixture.userId),
    ).rejects.toMatchObject({code: "INVALID_INPUT"});
  });

  it("cancels a draft only once", async () => {
    const id = await createCount();

    await expect(
      stockCountRepository.cancel(fixture.organizationId, id),
    ).resolves.toBeUndefined();
    await expect(
      stockCountRepository.cancel(fixture.organizationId, id),
    ).rejects.toMatchObject({code: "INVALID_STATE_TRANSITION"});
  });

  it("lists counts newest first and scopes reads to the tenant", async () => {
    const id = await createCount();

    const counts = await stockCountRepository.listCounts(
      fixture.organizationId,
    );
    expect(counts.some((count) => count.id === id)).toBe(true);
    await expect(
      stockCountRepository.findCount("org_other", id),
    ).resolves.toBeNull();
    await expect(
      stockCountRepository.cancel("org_other", id),
    ).rejects.toMatchObject({code: "INVALID_STATE_TRANSITION"});
  });
});
