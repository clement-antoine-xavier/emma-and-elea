import {prisma} from "@/lib/prisma";
import {purchaseRepository} from "@/server/repositories/purchase.repository";
import {createFixture, referenceUnits, type Fixture} from "@/test-utils/integration/db";

describe("purchase repository", () => {
  let fixture: Fixture;
  const receipts: string[] = [];

  beforeAll(async () => {
    fixture = await createFixture();
  });

  afterAll(async () => {
    for (const id of receipts) {
      await prisma.purchaseReceipt.deleteMany({where: {id}});
    }
    await fixture.cleanup();
  });

  async function draft(overrides: Record<string, unknown> = {}) {
    const id = await purchaseRepository.createDraft(fixture.organizationId, {
      siteId: fixture.siteId,
      supplierId: fixture.supplierId,
      supplierReference: null,
      note: null,
      ...overrides,
    });
    receipts.push(id);
    return id;
  }

  function line(overrides: Record<string, unknown> = {}) {
    return {
      itemId: fixture.items.flour,
      quantity: "2.5",
      unitId: referenceUnits.kg,
      unitPrice: "2",
      lotNumber: null,
      supplierLotNumber: null,
      expiresOn: null,
      bestBeforeOn: null,
      ...overrides,
    };
  }

  it("creates sequential draft numbers scoped to the tenant", async () => {
    const first = await draft();
    const second = await draft();

    const rows = await prisma.purchaseReceipt.findMany({
      where: {id: {in: [first, second]}},
      select: {number: true, status: true},
    });

    expect(rows.map((row) => row.status)).toEqual(["DRAFT", "DRAFT"]);
    expect(rows[0].number).toMatch(/^GR-\d{6}-\d{3,}$/);
    expect(rows[0].number).not.toBe(rows[1].number);
  });

  it("adds lines with a computed total and rejects a posted receipt", async () => {
    const receiptId = await draft();
    await purchaseRepository.addLine(
      fixture.organizationId,
      receiptId,
      line({quantity: "2.5", unitPrice: "2"}),
    );

    const stored = await prisma.purchaseReceiptLine.findFirst({
      where: {purchaseReceiptId: receiptId},
      select: {quantity: true, unitPrice: true, lineTotal: true},
    });
    expect(stored?.quantity.toString()).toBe("2.5");
    expect(stored?.unitPrice.toString()).toBe("2");
    expect(stored?.lineTotal.toString()).toBe("5");

    await purchaseRepository.post(
      fixture.organizationId,
      receiptId,
      fixture.userId,
    );
    await expect(
      purchaseRepository.addLine(
        fixture.organizationId,
        receiptId,
        line(),
      ),
    ).rejects.toMatchObject({code: "INVALID_STATE_TRANSITION"});
  });

  it("posts a receipt atomically into lots and stock movements", async () => {
    const receiptId = await draft();
    await purchaseRepository.addLine(
      fixture.organizationId,
      receiptId,
      line({
        quantity: "1000",
        unitId: referenceUnits.g,
        unitPrice: "0.002",
        supplierLotNumber: "SUP-42",
        expiresOn: new Date("2027-01-31T00:00:00.000Z"),
      }),
    );

    await purchaseRepository.post(
      fixture.organizationId,
      receiptId,
      fixture.userId,
    );

    const receipt = await prisma.purchaseReceipt.findUniqueOrThrow({
      where: {id: receiptId},
      select: {
        status: true,
        receivedAt: true,
        receivedById: true,
        totalAmount: true,
        lines: {
          select: {lotNumber: true, lot: {select: {id: true}}},
        },
      },
    });

    expect(receipt.status).toBe("POSTED");
    expect(receipt.receivedAt).not.toBeNull();
    expect(receipt.receivedById).toBe(fixture.userId);
    expect(Number(receipt.totalAmount.toString())).toBe(2);
    expect(receipt.lines[0].lotNumber).toMatch(/^ATL-\d{6}-\d+$/);

    const lot = await prisma.lot.findUniqueOrThrow({
      where: {id: receipt.lines[0].lot!.id},
      select: {
        itemId: true,
        quantityReceived: true,
        quantityRemaining: true,
        unitCost: true,
        supplierLotNumber: true,
        expiresOn: true,
        purchaseReceiptLineId: true,
      },
    });

    // 1000 g is stored as 1 kg, and the pack price becomes a per-kg cost.
    expect(lot.itemId).toBe(fixture.items.flour);
    expect(lot.quantityReceived.toString()).toBe("1");
    expect(lot.quantityRemaining.toString()).toBe("1");
    expect(lot.unitCost.toString()).toBe("2");
    expect(lot.supplierLotNumber).toBe("SUP-42");
    expect(lot.expiresOn).toEqual(new Date("2027-01-31T00:00:00.000Z"));
    expect(lot.purchaseReceiptLineId).not.toBeNull();

    const movements = await prisma.stockMovement.findMany({
      where: {referenceType: "PURCHASE_RECEIPT", referenceId: receiptId},
      select: {type: true, quantity: true, unitId: true, createdById: true},
    });
    expect(movements).toEqual([
      {
        type: "RECEIPT",
        quantity: expect.objectContaining({}),
        unitId: referenceUnits.kg,
        createdById: fixture.userId,
      },
    ]);
    expect(movements[0].quantity.toString()).toBe("1");
  });

  it("keeps a custom lot number and totals multiple lines", async () => {
    const receiptId = await draft();
    await purchaseRepository.addLine(
      fixture.organizationId,
      receiptId,
      line({lotNumber: "MY-LOT-1", quantity: "1", unitPrice: "2"}),
    );
    await purchaseRepository.addLine(
      fixture.organizationId,
      receiptId,
      line({
        itemId: fixture.items.butter,
        quantity: "0.5",
        unitPrice: "8",
      }),
    );

    await purchaseRepository.post(
      fixture.organizationId,
      receiptId,
      fixture.userId,
    );

    const receipt = await prisma.purchaseReceipt.findUniqueOrThrow({
      where: {id: receiptId},
      select: {totalAmount: true, lines: {select: {lotNumber: true, itemId: true}}},
    });
    expect(Number(receipt.totalAmount.toString())).toBe(6);
    expect(receipt.lines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({itemId: fixture.items.flour, lotNumber: "MY-LOT-1"}),
      ]),
    );
  });

  it("refuses to post an empty receipt", async () => {
    const receiptId = await draft();

    await expect(
      purchaseRepository.post(
        fixture.organizationId,
        receiptId,
        fixture.userId,
      ),
    ).rejects.toMatchObject({code: "INVALID_INPUT"});
  });

  it("is idempotent: a posted receipt cannot be posted again", async () => {
    const receiptId = await draft();
    await purchaseRepository.addLine(
      fixture.organizationId,
      receiptId,
      line(),
    );
    await purchaseRepository.post(
      fixture.organizationId,
      receiptId,
      fixture.userId,
    );

    await expect(
      purchaseRepository.post(
        fixture.organizationId,
        receiptId,
        fixture.userId,
      ),
    ).rejects.toMatchObject({code: "INVALID_STATE_TRANSITION"});
  });

  it("removes a draft line and refuses a posted one", async () => {
    const receiptId = await draft();
    await purchaseRepository.addLine(
      fixture.organizationId,
      receiptId,
      line(),
    );
    const stored = await prisma.purchaseReceiptLine.findFirstOrThrow({
      where: {purchaseReceiptId: receiptId},
      select: {id: true},
    });

    await expect(
      purchaseRepository.removeLine(
        fixture.organizationId,
        receiptId,
        stored.id,
      ),
    ).resolves.toBeUndefined();
    await expect(
      purchaseRepository.removeLine(
        fixture.organizationId,
        receiptId,
        stored.id,
      ),
    ).rejects.toMatchObject({code: "NOT_FOUND"});

    await purchaseRepository.addLine(
      fixture.organizationId,
      receiptId,
      line(),
    );
    await purchaseRepository.post(
      fixture.organizationId,
      receiptId,
      fixture.userId,
    );
    await expect(
      purchaseRepository.removeLine(
        fixture.organizationId,
        receiptId,
        stored.id,
      ),
    ).rejects.toMatchObject({code: "INVALID_STATE_TRANSITION"});
  });

  it("cancels a draft and refuses a second cancel", async () => {
    const receiptId = await draft();

    await expect(
      purchaseRepository.cancel(fixture.organizationId, receiptId),
    ).resolves.toBeUndefined();
    await expect(
      purchaseRepository.cancel(fixture.organizationId, receiptId),
    ).rejects.toMatchObject({code: "INVALID_STATE_TRANSITION"});
  });

  it("scopes receipt reads and lists to the tenant", async () => {
    const receiptId = await draft();

    await expect(
      purchaseRepository.findReceipt("org_other", receiptId),
    ).resolves.toBeNull();

    const list = await purchaseRepository.listReceipts(
      fixture.organizationId,
      {search: "", status: "DRAFT", skip: 0, take: 50},
    );
    expect(list.receipts.some((receipt) => receipt.id === receiptId)).toBe(
      true,
    );
    expect(
      list.receipts.every((receipt) => receipt.status === "DRAFT"),
    ).toBe(true);
  });

  it("returns the stock unit used to validate a receipt line", async () => {
    const item = await purchaseRepository.findItemForLine(
      fixture.organizationId,
      fixture.items.flour,
    );

    expect(item).toMatchObject({
      id: fixture.items.flour,
      stockUnit: {code: "kg", kind: "MASS", isBase: true},
    });
    await expect(
      purchaseRepository.findItemForLine("org_other", fixture.items.flour),
    ).resolves.toBeNull();
  });
});
