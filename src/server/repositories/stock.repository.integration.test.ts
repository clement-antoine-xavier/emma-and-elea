import {prisma} from "@/lib/prisma";
import {stockRepository} from "@/server/repositories/stock.repository";
import {
  createFixture,
  createLot,
  type Fixture,
} from "@/test-utils/integration/db";

describe("stock repository", () => {
  let fixture: Fixture;
  let flourLot: string;
  let butterLot: string;
  let emptyLot: string;

  beforeAll(async () => {
    fixture = await createFixture();
    flourLot = await createLot(fixture, {
      itemId: fixture.items.flour,
      lotNumber: "ATL-FLOUR-1",
      quantity: "4",
      unitCost: "1.1",
    });
    butterLot = await createLot(fixture, {
      itemId: fixture.items.butter,
      lotNumber: "ATL-BUTTER-1",
      quantity: "2",
      unitCost: "4",
    });
    emptyLot = await createLot(fixture, {
      itemId: fixture.items.flour,
      lotNumber: "ATL-FLOUR-EMPTY",
      quantity: "3",
      unitCost: "1",
    });
    await prisma.lot.update({
      where: {id: emptyLot},
      data: {quantityRemaining: "0", status: "CONSUMED"},
    });
  });

  afterAll(async () => {
    await fixture.cleanup();
  });

  it("sums available lots per item and flags the minimum", async () => {
    const levels = await stockRepository.listLevels(fixture.organizationId);

    const flour = levels.find((level) => level.itemId === fixture.items.flour);
    expect(flour).toMatchObject({
      itemCode: "FLOUR",
      siteId: fixture.siteId,
      siteName: "Atelier",
      unitCode: "kg",
      quantity: "4",
      minStockQuantity: "10",
      isBelowMin: true,
    });

    const butter = levels.find(
      (level) => level.itemId === fixture.items.butter,
    );
    expect(butter).toMatchObject({quantity: "2", isBelowMin: false});
    expect(levels.some((level) => level.itemId === fixture.items.croissant)).toBe(
      false,
    );
  });

  it("excludes zero or non-available lots from stock levels", async () => {
    const levels = await stockRepository.listLevels(fixture.organizationId);
    const flour = levels.find((level) => level.itemId === fixture.items.flour);

    // The empty lot contributes nothing; only the four remaining kilos count.
    expect(flour?.quantity).toBe("4");
  });

  it("searches lots by number, item name or code", async () => {
    const byNumber = await stockRepository.listLots(fixture.organizationId, {
      search: "flour-1",
      includeEmpty: false,
      skip: 0,
      take: 10,
    });
    expect(byNumber.lots.map((lot) => lot.id)).toEqual([flourLot]);

    const byName = await stockRepository.listLots(fixture.organizationId, {
      search: "butter",
      includeEmpty: false,
      skip: 0,
      take: 10,
    });
    expect(byName.lots.map((lot) => lot.id)).toEqual([butterLot]);

    const byCode = await stockRepository.listLots(fixture.organizationId, {
      search: "CROISSANT",
      includeEmpty: false,
      skip: 0,
      take: 10,
    });
    expect(byCode.total).toBe(0);
  });

  it("hides empty lots unless explicitly included", async () => {
    const active = await stockRepository.listLots(fixture.organizationId, {
      search: "EMPTY",
      includeEmpty: false,
      skip: 0,
      take: 10,
    });
    expect(active.total).toBe(0);

    const all = await stockRepository.listLots(fixture.organizationId, {
      search: "EMPTY",
      includeEmpty: true,
      skip: 0,
      take: 10,
    });
    expect(all.lots.map((lot) => lot.id)).toEqual([emptyLot]);
  });

  it("paginates lots and reports the total", async () => {
    const page = await stockRepository.listLots(fixture.organizationId, {
      search: "",
      includeEmpty: true,
      skip: 1,
      take: 1,
    });

    expect(page.lots).toHaveLength(1);
    expect(page.total).toBe(3);
  });

  it("returns a lot detail with its movements, newest first", async () => {
    const detail = await stockRepository.findLot(
      fixture.organizationId,
      flourLot,
    );

    expect(detail).toMatchObject({
      id: flourLot,
      lotNumber: "ATL-FLOUR-1",
      itemName: "Flour",
      quantityReceived: "4",
      quantityRemaining: "4",
      unitCost: "1.1",
      status: "AVAILABLE",
    });
    expect(detail?.movements).toHaveLength(1);
    expect(detail?.movements[0]).toMatchObject({
      type: "RECEIPT",
      quantity: "4",
      unitCode: "kg",
      referenceType: null,
    });
  });

  it("scopes levels, lots and details to the tenant", async () => {
    await expect(
      stockRepository.listLevels("org_other"),
    ).resolves.toEqual([]);
    await expect(
      stockRepository.listLots("org_other", {
        search: "",
        includeEmpty: true,
        skip: 0,
        take: 10,
      }),
    ).resolves.toEqual({lots: [], total: 0});
    await expect(
      stockRepository.findLot("org_other", flourLot),
    ).resolves.toBeNull();
  });

  it("keeps the reference unit on the lot", async () => {
    const detail = await stockRepository.findLot(
      fixture.organizationId,
      butterLot,
    );

    expect(detail?.unitCode).toBe("kg");
    expect(detail?.movements[0].unitCode).toBe("kg");
  });
});
