import {prisma} from "@/lib/prisma";
import {forecastRepository} from "@/server/repositories/forecast.repository";
import {reportRepository} from "@/server/repositories/report.repository";
import {orderRepository} from "@/server/repositories/order.repository";
import {
  createCustomer,
  createFixture,
  createPublishedRecipe,
  referenceUnits,
  type Fixture,
} from "@/test-utils/integration/db";

describe("forecast and report repositories", () => {
  let fixture: Fixture;
  let customerId: string;

  beforeAll(async () => {
    fixture = await createFixture();
    customerId = await createCustomer(fixture, "Acme");
    await createPublishedRecipe(fixture);
    await prisma.salesDaily.createMany({
      data: [
        {
          organizationId: fixture.organizationId,
          siteId: fixture.siteId,
          itemId: fixture.items.croissant,
          businessDate: new Date("2026-10-20T00:00:00.000Z"),
          channel: "RETAIL",
          quantitySold: "12",
          unitId: referenceUnits.piece,
          revenue: "30",
          currency: "EUR",
        },
        {
          organizationId: fixture.organizationId,
          siteId: fixture.siteId,
          itemId: fixture.items.croissant,
          businessDate: new Date("2026-10-21T00:00:00.000Z"),
          channel: "RETAIL",
          quantitySold: "8",
          unitId: referenceUnits.piece,
          revenue: "20",
          currency: "EUR",
        },
        {
          organizationId: fixture.organizationId,
          siteId: fixture.siteId,
          itemId: fixture.items.croissant,
          businessDate: new Date("2026-09-01T00:00:00.000Z"),
          channel: "RETAIL",
          quantitySold: "99",
          unitId: referenceUnits.piece,
          revenue: "200",
          currency: "EUR",
        },
      ],
    });
    await prisma.event.create({
      data: {
        organizationId: fixture.organizationId,
        siteId: fixture.siteId,
        name: "Market day",
        startsOn: new Date("2026-10-28T00:00:00.000Z"),
        endsOn: new Date("2026-10-28T00:00:00.000Z"),
        expectedUpliftPct: "20",
      },
    });
  });

  afterAll(async () => {
    await fixture.cleanup();
  });

  it("lists forecastable recipe items only", async () => {
    const items = await forecastRepository.listItems(fixture.organizationId);

    expect(items).toEqual([
      expect.objectContaining({
        itemId: fixture.items.croissant,
        itemCode: "CROISSANT",
        recipeName: "Croissant",
        yieldUnitCode: "piece",
        stockUnitCode: "piece",
      }),
    ]);
    await expect(forecastRepository.listItems("org_other")).resolves.toEqual([]);
  });

  it("returns sales history only inside the requested window", async () => {
    const history = await forecastRepository.salesHistory(
      fixture.organizationId,
      fixture.siteId,
      new Date("2026-10-19T00:00:00.000Z"),
      new Date("2026-10-22T00:00:00.000Z"),
    );

    expect(history).toHaveLength(2);
    expect(history.map((row) => row.quantity)).toEqual(["12", "8"]);
    expect(history[0]).toMatchObject({
      itemId: fixture.items.croissant,
      unitKind: "COUNT",
      unitFactorToBase: "1",
    });
  });

  it("returns the event uplift for the planned day", async () => {
    await expect(
      forecastRepository.eventUplift(
        fixture.organizationId,
        fixture.siteId,
        new Date("2026-10-28T00:00:00.000Z"),
      ),
    ).resolves.toEqual(["20"]);
    await expect(
      forecastRepository.eventUplift(
        fixture.organizationId,
        fixture.siteId,
        new Date("2026-10-29T00:00:00.000Z"),
      ),
    ).resolves.toEqual([]);
  });

  it("returns confirmed order demand for the planned day", async () => {
    const orderId = await orderRepository.create(fixture.organizationId, {
      customerId,
      siteId: fixture.siteId,
      requestedFor: new Date("2026-10-28T00:00:00.000Z"),
      currency: "EUR",
      note: null,
    });
    await orderRepository.addLine(fixture.organizationId, orderId, {
      itemId: fixture.items.croissant,
      quantity: "6",
      unitId: referenceUnits.piece,
      unitPrice: "2.5",
      note: null,
    });
    await orderRepository.confirm(fixture.organizationId, orderId);

    const demand = await forecastRepository.orderDemand(
      fixture.organizationId,
      fixture.siteId,
      new Date("2026-10-28T00:00:00.000Z"),
    );

    expect(demand).toEqual([
      expect.objectContaining({
        orderId,
        customerName: "Acme",
        itemId: fixture.items.croissant,
        quantity: "6",
        unitKind: "COUNT",
      }),
    ]);
  });

  it("summarises an empty reporting window as zeros", async () => {
    const from = new Date("2020-01-01T00:00:00.000Z");
    const to = new Date("2020-01-31T00:00:00.000Z");

    const summary = await reportRepository.summary(
      fixture.organizationId,
      from,
      to,
    );
    expect(summary).toMatchObject({
      wasteCost: "0",
      productionCost: "0",
      wasteRatePct: "0",
      currency: "EUR",
    });

    const kpis = await reportRepository.kpis(
      fixture.organizationId,
      from,
      to,
    );
    expect(kpis).toMatchObject({
      batchesToday: 0,
      expiringLotsCount: 0,
      wasteCost: "0",
      currency: "EUR",
    });
  });

  it("keeps report queries tenant-scoped", async () => {
    const from = new Date("2026-01-01T00:00:00.000Z");
    const to = new Date("2026-12-31T00:00:00.000Z");

    await expect(
      reportRepository.productMargins("org_other"),
    ).resolves.toEqual([]);
    await expect(
      reportRepository.batchYields("org_other"),
    ).resolves.toEqual([]);
    await expect(
      reportRepository.summary("org_other", from, to),
    ).resolves.toMatchObject({productionCost: "0", wasteCost: "0"});
  });
});
