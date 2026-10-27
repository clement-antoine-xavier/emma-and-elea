import {createPurchasingService} from "@/server/services/purchasing.service";
import type {PurchaseRepository} from "@/server/repositories/purchase.repository";
import type {SupplierRepository} from "@/server/repositories/supplier.repository";
import type {SiteRepository} from "@/server/repositories/site.repository";
import type {CatalogRepository} from "@/server/repositories/catalog.repository";
import type {ReceiptDetailRecord, ReceiptSummaryRecord} from "@/lib/dto";
import {actorFor} from "@/test-utils/actor";
import {unit} from "@/test-utils/units";

const summary: ReceiptSummaryRecord = {
  id: "receipt_1",
  number: "GR-1",
  supplierName: "Mill",
  siteName: "Atelier",
  status: "DRAFT",
  receivedAt: null,
  totalAmount: "27.50",
  currency: "EUR",
  lineCount: 1,
  createdAt: new Date("2026-10-27T08:00:00.000Z"),
};

const detail: ReceiptDetailRecord = {
  ...summary,
  supplierId: "supplier_1",
  siteId: "site_1",
  supplierReference: null,
  note: null,
  lines: [
    {
      id: "line_1",
      itemId: "item_flour",
      itemCode: "FLOUR",
      itemName: "Flour",
      quantity: "25",
      unitCode: "kg",
      unitPrice: "1.10",
      lineTotal: "27.50",
      lotNumber: null,
      supplierLotNumber: null,
      expiresOn: null,
      bestBeforeOn: null,
      lotId: null,
    },
  ],
};

const site = {
  id: "site_1",
  code: "ATL",
  name: "Atelier",
  kind: "WORKSHOP" as const,
  city: null,
  timezone: "Europe/Paris",
  isActive: true,
  archivedAt: null,
};

function dependencies(overrides: {
  purchaseRepository?: Partial<PurchaseRepository>;
  supplierRepository?: Partial<SupplierRepository>;
  siteRepository?: Partial<SiteRepository>;
  catalogRepository?: Partial<CatalogRepository>;
} = {}) {
  const purchaseRepository = {
    listReceipts: jest.fn().mockResolvedValue({receipts: [summary], total: 1}),
    findReceipt: jest.fn().mockResolvedValue(detail),
    createDraft: jest.fn().mockResolvedValue("receipt_1"),
    addLine: jest.fn().mockResolvedValue(undefined),
    removeLine: jest.fn().mockResolvedValue(undefined),
    post: jest.fn().mockResolvedValue(undefined),
    cancel: jest.fn().mockResolvedValue(undefined),
    findItemForLine: jest.fn().mockResolvedValue({
      id: "item_flour",
      stockUnit: {
        id: "unit_kg",
        code: "kg",
        kind: "MASS",
        factorToBase: "1",
        isBase: true,
      },
    }),
    ...overrides.purchaseRepository,
  } as unknown as PurchaseRepository;
  const supplierRepository = {
    list: jest.fn().mockResolvedValue([
      {
        id: "supplier_1",
        code: "SUP-1",
        name: "Mill",
        contactName: null,
        email: null,
        phone: null,
        city: null,
        defaultLeadTimeDays: null,
        note: null,
        isArchived: false,
        activeItemCount: 0,
      },
      {
        id: "supplier_2",
        code: "OLD",
        name: "Old mill",
        contactName: null,
        email: null,
        phone: null,
        city: null,
        defaultLeadTimeDays: null,
        note: null,
        isArchived: true,
        activeItemCount: 0,
      },
    ]),
    findSummary: jest.fn().mockResolvedValue({id: "supplier_1"}),
    ...overrides.supplierRepository,
  } as unknown as SupplierRepository;
  const siteRepository = {
    list: jest.fn().mockResolvedValue([
      site,
      {...site, id: "site_2", archivedAt: new Date()},
    ]),
    findById: jest.fn().mockResolvedValue(site),
    ...overrides.siteRepository,
  } as unknown as SiteRepository;
  const catalogRepository = {
    listItemOptions: jest.fn().mockResolvedValue([
      {
        id: "item_flour",
        code: "FLOUR",
        name: "Flour",
        type: "RAW_MATERIAL",
        stockUnitId: "unit_kg",
      },
    ]),
    listUnits: jest.fn().mockResolvedValue([unit("kg"), unit("piece")]),
    findUnit: jest.fn().mockImplementation(async (id: string) =>
      id === "unit_kg" ? unit("kg") : id === "unit_piece" ? unit("piece") : null,
    ),
    ...overrides.catalogRepository,
  } as unknown as CatalogRepository;

  return {
    purchaseRepository,
    supplierRepository,
    siteRepository,
    catalogRepository,
    service: createPurchasingService({
      purchaseRepository,
      supplierRepository,
      siteRepository,
      catalogRepository,
    }),
  };
}

describe("purchasing read views", () => {
  it("parses receipt filters and pagination", async () => {
    const {service, purchaseRepository} = dependencies();

    const result = await service.getReceipts(actorFor("stock_manager"), {
      search: " mill ",
      status: "POSTED",
      page: "2",
      pageSize: "50",
    });

    expect(purchaseRepository.listReceipts).toHaveBeenCalledWith("org_1", {
      search: "mill",
      status: "POSTED",
      skip: 50,
      take: 50,
    });
    expect(result).toEqual({
      page: {items: [summary], total: 1, page: 2, pageSize: 50},
      canWrite: true,
      filters: {search: "mill", status: "POSTED"},
    });
  });

  it("drops an unknown status", async () => {
    const {service, purchaseRepository} = dependencies();

    const result = await service.getReceipts(actorFor("stock_manager"), {
      status: "LOST",
    });

    expect(purchaseRepository.listReceipts).toHaveBeenCalledWith(
      "org_1",
      expect.objectContaining({status: null}),
    );
    expect(result.filters.status).toBeNull();
  });

  it("builds options from active suppliers and sites", async () => {
    const {service} = dependencies();

    const options = await service.getFormOptions(actorFor("stock_manager"));

    expect(options.suppliers.map((row) => row.id)).toEqual(["supplier_1"]);
    expect(options.sites.map((row) => row.id)).toEqual(["site_1"]);
    expect(options.items).toEqual([
      {id: "item_flour", code: "FLOUR", name: "Flour"},
    ]);
    expect(options.units).toHaveLength(2);
  });

  it("returns a receipt with a write flag or null", async () => {
    const {service} = dependencies();

    await expect(
      service.getReceipt(actorFor("stock_manager"), "receipt_1"),
    ).resolves.toEqual({receipt: detail, canWrite: true});
    await expect(
      service.getReceipt(actorFor("production_manager"), "receipt_1"),
    ).resolves.toMatchObject({canWrite: false});

    const empty = dependencies({
      purchaseRepository: {findReceipt: jest.fn().mockResolvedValue(null)},
    });
    await expect(
      empty.service.getReceipt(actorFor("stock_manager"), "missing"),
    ).resolves.toBeNull();
  });

  it("requires purchasing:read", async () => {
    const {service} = dependencies();

    await expect(service.getReceipts(null, {})).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(
      service.getReceipts(actorFor("staff"), {}),
    ).rejects.toMatchObject({code: "FORBIDDEN"});
  });
});

describe("purchasing writes", () => {
  const draftInput = {
    siteId: "site_1",
    supplierId: "supplier_1",
    supplierReference: null,
    note: null,
  };

  const lineInput = {
    itemId: "item_flour",
    quantity: "25",
    unitId: "unit_kg",
    unitPrice: "1.10",
    lotNumber: null,
    supplierLotNumber: null,
    expiresOn: null,
    bestBeforeOn: null,
  };

  it("creates a draft when the site and supplier exist", async () => {
    const {service, purchaseRepository} = dependencies();

    await expect(
      service.createDraft(actorFor("stock_manager"), draftInput),
    ).resolves.toEqual({id: "receipt_1"});
    expect(purchaseRepository.createDraft).toHaveBeenCalledWith(
      "org_1",
      draftInput,
    );
  });

  it("rejects an unknown site or supplier", async () => {
    const missingSite = dependencies({
      siteRepository: {findById: jest.fn().mockResolvedValue(null)},
    });
    await expect(
      missingSite.service.createDraft(actorFor("stock_manager"), draftInput),
    ).rejects.toMatchObject({code: "NOT_FOUND"});

    const missingSupplier = dependencies({
      supplierRepository: {findSummary: jest.fn().mockResolvedValue(null)},
    });
    await expect(
      missingSupplier.service.createDraft(actorFor("stock_manager"), draftInput),
    ).rejects.toMatchObject({code: "NOT_FOUND"});
  });

  it("adds a line to a draft with a matching unit", async () => {
    const {service, purchaseRepository} = dependencies();

    await expect(
      service.addLine(actorFor("stock_manager"), "receipt_1", lineInput),
    ).resolves.toBeUndefined();
    expect(purchaseRepository.addLine).toHaveBeenCalledWith(
      "org_1",
      "receipt_1",
      lineInput,
    );
  });

  it("rejects a missing draft or a posted receipt", async () => {
    const missing = dependencies({
      purchaseRepository: {findReceipt: jest.fn().mockResolvedValue(null)},
    });
    await expect(
      missing.service.addLine(actorFor("stock_manager"), "missing", lineInput),
    ).rejects.toMatchObject({code: "NOT_FOUND"});

    const posted = dependencies({
      purchaseRepository: {
        findReceipt: jest
          .fn()
          .mockResolvedValue({...detail, status: "POSTED"}),
      },
    });
    await expect(
      posted.service.addLine(actorFor("stock_manager"), "receipt_1", lineInput),
    ).rejects.toMatchObject({code: "INVALID_STATE_TRANSITION"});
  });

  it("rejects a missing item and a different unit kind", async () => {
    const missingItem = dependencies({
      purchaseRepository: {findItemForLine: jest.fn().mockResolvedValue(null)},
    });
    await expect(
      missingItem.service.addLine(actorFor("stock_manager"), "receipt_1", lineInput),
    ).rejects.toMatchObject({code: "NOT_FOUND"});

    const wrongUnit = dependencies();
    await expect(
      wrongUnit.service.addLine(actorFor("stock_manager"), "receipt_1", {
        ...lineInput,
        unitId: "unit_piece",
      }),
    ).rejects.toMatchObject({code: "INVALID_UNIT"});
  });

  it("removes a line, posts and cancels", async () => {
    const {service, purchaseRepository} = dependencies();

    await expect(
      service.removeLine(actorFor("stock_manager"), "receipt_1", "line_1"),
    ).resolves.toBeUndefined();
    await expect(
      service.postReceipt(actorFor("stock_manager"), "receipt_1"),
    ).resolves.toBeUndefined();
    await expect(
      service.cancelReceipt(actorFor("stock_manager"), "receipt_1"),
    ).resolves.toBeUndefined();
    expect(purchaseRepository.post).toHaveBeenCalledWith(
      "org_1",
      "receipt_1",
      "user_1",
    );
    expect(purchaseRepository.cancel).toHaveBeenCalledWith("org_1", "receipt_1");
  });

  it("rejects writes from a read-only role", async () => {
    const {service} = dependencies();

    await expect(
      service.createDraft(actorFor("production_manager"), draftInput),
    ).rejects.toMatchObject({code: "FORBIDDEN"});
    await expect(
      service.postReceipt(actorFor("production_manager"), "receipt_1"),
    ).rejects.toMatchObject({code: "FORBIDDEN"});
  });
});
