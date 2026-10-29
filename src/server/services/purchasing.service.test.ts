import {createPurchasingService} from "@/server/services/purchasing.service";
import type {OrganizationActor} from "@/server/auth/types";
import type {OrgRole} from "@/lib/permissions";
import type {PurchaseRepository} from "@/server/repositories/purchase.repository";
import type {SupplierRepository} from "@/server/repositories/supplier.repository";
import type {SiteRepository} from "@/server/repositories/site.repository";
import type {CatalogRepository} from "@/server/repositories/catalog.repository";
import type {ReceiptDetailRecord} from "@/lib/dto";

function actorFor(role: OrgRole): OrganizationActor {
  return {
    userId: "user_1",
    name: "Actor",
    email: "actor@example.com",
    platformRole: "user",
    isSupport: false,
    sessionId: "session_1",
    activeOrganizationId: "org_1",
    membershipId: "member_1",
    organizationId: "org_1",
    organization: {id: "org_1", name: "Bakery", slug: "bakery"},
    role,
  };
}

const draft: ReceiptDetailRecord = {
  id: "receipt_1",
  number: "GR-261027-001",
  supplierName: "Minoterie",
  siteName: "Atelier",
  status: "DRAFT",
  receivedAt: null,
  totalAmount: "0",
  currency: "EUR",
  lineCount: 0,
  createdAt: new Date("2026-10-27T00:00:00.000Z"),
  supplierId: "supplier_1",
  siteId: "site_1",
  supplierReference: null,
  note: null,
  lines: [],
};

function purchaseRepository(
  overrides: Partial<PurchaseRepository> = {},
): PurchaseRepository {
  return {
    listReceipts: jest.fn().mockResolvedValue({receipts: [], total: 0}),
    findReceipt: jest.fn().mockResolvedValue(draft),
    createDraft: jest.fn().mockResolvedValue("receipt_1"),
    addLine: jest.fn().mockResolvedValue(undefined),
    removeLine: jest.fn().mockResolvedValue(undefined),
    post: jest.fn().mockResolvedValue(undefined),
    cancel: jest.fn().mockResolvedValue(undefined),
    findItemForLine: jest.fn().mockResolvedValue({
      id: "item_1",
      stockUnit: {
        id: "unit_kg",
        code: "kg",
        kind: "MASS",
        factorToBase: "1",
        isBase: true,
      },
    }),
    ...overrides,
  };
}

function supplierRepository(): SupplierRepository {
  return {
    list: jest.fn().mockResolvedValue([]),
    preferredPrices: jest.fn().mockResolvedValue({}),
    findById: jest.fn().mockResolvedValue(null),
    findSummary: jest.fn().mockResolvedValue({
      id: "supplier_1",
      code: "MIN",
      name: "Minoterie",
      contactName: null,
      email: null,
      phone: null,
      city: null,
      defaultLeadTimeDays: null,
      note: null,
      isArchived: false,
    }),
    create: jest.fn(),
    update: jest.fn(),
    archive: jest.fn(),
    createItem: jest.fn(),
    closeItem: jest.fn(),
  };
}

function siteRepository(): SiteRepository {
  return {
    list: jest.fn().mockResolvedValue([]),
    findById: jest.fn().mockResolvedValue({
      id: "site_1",
      code: "ATL",
      name: "Atelier",
      kind: "WORKSHOP",
      city: null,
      timezone: "Europe/Paris",
      isActive: true,
      archivedAt: null,
    }),
    count: jest.fn(),
    countActive: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    archive: jest.fn(),
    ensureFirst: jest.fn(),
  };
}

function catalogRepository(
  overrides: Partial<CatalogRepository> = {},
): CatalogRepository {
  return {
    listUnits: jest.fn().mockResolvedValue([]),
    findUnit: jest.fn().mockResolvedValue({
      id: "unit_kg",
      code: "kg",
      labelEn: "kilogram",
      labelFr: "kilogramme",
      kind: "MASS",
      isBase: true,
    }),
    listItemOptions: jest.fn().mockResolvedValue([]),
    listAllergens: jest.fn().mockResolvedValue([]),
    listItems: jest.fn(),
    findItem: jest.fn(),
    findItemSummary: jest.fn(),
    createItem: jest.fn(),
    updateItem: jest.fn(),
    archiveItem: jest.fn(),
    listCategories: jest.fn(),
    findCategory: jest.fn(),
    createCategory: jest.fn(),
    archiveCategory: jest.fn(),
    setItemAllergen: jest.fn(),
    removeItemAllergen: jest.fn(),
    ...overrides,
  };
}

describe("purchasing service", () => {
  it("rejects drafts from read-only roles", async () => {
    const purchase = purchaseRepository();
    const service = createPurchasingService({
      purchaseRepository: purchase,
      supplierRepository: supplierRepository(),
      siteRepository: siteRepository(),
      catalogRepository: catalogRepository(),
    });

    await expect(
      service.createDraft(actorFor("production_manager"), {
        siteId: "site_1",
        supplierId: "supplier_1",
        supplierReference: null,
        note: null,
      }),
    ).rejects.toMatchObject({code: "FORBIDDEN"});
    expect(purchase.createDraft).not.toHaveBeenCalled();
  });

  it("creates a draft for a stock manager", async () => {
    const purchase = purchaseRepository();
    const service = createPurchasingService({
      purchaseRepository: purchase,
      supplierRepository: supplierRepository(),
      siteRepository: siteRepository(),
      catalogRepository: catalogRepository(),
    });

    await expect(
      service.createDraft(actorFor("stock_manager"), {
        siteId: "site_1",
        supplierId: "supplier_1",
        supplierReference: null,
        note: null,
      }),
    ).resolves.toEqual({id: "receipt_1"});
  });

  it("rejects a line whose unit measures a different kind", async () => {
    const service = createPurchasingService({
      purchaseRepository: purchaseRepository(),
      supplierRepository: supplierRepository(),
      siteRepository: siteRepository(),
      catalogRepository: catalogRepository({
        findUnit: jest.fn().mockResolvedValue({
          id: "unit_piece",
          code: "piece",
          labelEn: "piece",
          labelFr: "pièce",
          kind: "COUNT",
          isBase: true,
        }),
      }),
    });

    await expect(
      service.addLine(actorFor("stock_manager"), "receipt_1", {
        itemId: "item_1",
        quantity: "10",
        unitId: "unit_piece",
        unitPrice: "2",
        lotNumber: null,
        supplierLotNumber: null,
        expiresOn: null,
        bestBeforeOn: null,
      }),
    ).rejects.toMatchObject({code: "INVALID_UNIT"});
  });
});
