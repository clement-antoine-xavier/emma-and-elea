import {prisma} from "@/lib/prisma";
import {salesRepository} from "@/server/repositories/sales.repository";
import {
  createFixture,
  referenceUnits,
  type Fixture,
} from "@/test-utils/integration/db";

const day = new Date("2026-10-27T00:00:00.000Z");

describe("sales repository", () => {
  let fixture: Fixture;

  beforeAll(async () => {
    fixture = await createFixture();
  });

  afterAll(async () => {
    await fixture.cleanup();
  });

  function input(overrides: Record<string, unknown> = {}) {
    return {
      siteId: fixture.siteId,
      itemId: fixture.items.croissant,
      businessDate: day,
      channel: "RETAIL" as const,
      quantitySold: "12",
      revenue: "30",
      currency: "EUR",
      unitId: referenceUnits.piece,
      note: null,
      ...overrides,
    };
  }

  it("creates a daily row once per site, item, day and channel", async () => {
    await salesRepository.upsert(fixture.organizationId, input());

    const rows = await prisma.salesDaily.findMany({
      where: {organizationId: fixture.organizationId},
      select: {quantitySold: true, revenue: true, source: true},
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].quantitySold.toString()).toBe("12");
    expect(rows[0].revenue.toString()).toBe("30");
    expect(rows[0].source).toBe("MANUAL");
  });

  it("updates the existing row instead of duplicating it", async () => {
    await salesRepository.upsert(
      fixture.organizationId,
      input({quantitySold: "20", revenue: "50", note: "Rainy day"}),
    );

    const rows = await prisma.salesDaily.findMany({
      where: {organizationId: fixture.organizationId, channel: "RETAIL"},
      select: {quantitySold: true, revenue: true, note: true},
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({note: "Rainy day"});
    expect(rows[0].quantitySold.toString()).toBe("20");
    expect(rows[0].revenue.toString()).toBe("50");
  });

  it("keeps one row per channel", async () => {
    await salesRepository.upsert(
      fixture.organizationId,
      input({channel: "WHOLESALE", quantitySold: "5", revenue: "12"}),
    );

    const rows = await prisma.salesDaily.findMany({
      where: {organizationId: fixture.organizationId},
      select: {channel: true},
    });
    expect(rows.map((row) => row.channel).sort()).toEqual([
      "RETAIL",
      "WHOLESALE",
    ]);
  });

  it("lists an inclusive date range, newest first", async () => {
    await salesRepository.upsert(
      fixture.organizationId,
      input({
        businessDate: new Date("2026-10-28T00:00:00.000Z"),
        channel: "BOTH",
      }),
    );

    const rows = await salesRepository.list(fixture.organizationId, {
      from: day,
      to: new Date("2026-10-28T00:00:00.000Z"),
      siteId: null,
    });

    expect(rows.length).toBeGreaterThanOrEqual(3);
    expect(rows[0].businessDate).toEqual(
      new Date("2026-10-28T00:00:00.000Z"),
    );
    expect(rows[0].itemName).toBe("Croissant");
    expect(rows[0].unitCode).toBe("piece");
  });

  it("filters by site and excludes other tenants", async () => {
    const bySite = await salesRepository.list(fixture.organizationId, {
      from: day,
      to: day,
      siteId: fixture.siteId,
    });
    expect(bySite).not.toHaveLength(0);

    const otherSite = await salesRepository.list(fixture.organizationId, {
      from: day,
      to: day,
      siteId: "site_other",
    });
    expect(otherSite).toEqual([]);

    const otherTenant = await salesRepository.list("org_other", {
      from: new Date("2020-01-01T00:00:00.000Z"),
      to: new Date("2030-01-01T00:00:00.000Z"),
      siteId: null,
    });
    expect(otherTenant).toEqual([]);
  });

  it("returns nothing outside the range", async () => {
    const before = await salesRepository.list(fixture.organizationId, {
      from: new Date("2026-01-01T00:00:00.000Z"),
      to: new Date("2026-01-02T00:00:00.000Z"),
      siteId: null,
    });

    expect(before).toEqual([]);
  });
});
