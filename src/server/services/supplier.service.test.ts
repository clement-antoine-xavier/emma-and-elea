import {createSupplierService} from "@/server/services/supplier.service";
import type {SupplierRepository} from "@/server/repositories/supplier.repository";
import type {CatalogRepository} from "@/server/repositories/catalog.repository";
import type {
  SupplierDetailRecord,
  SupplierItemRecord,
  SupplierListRecord,
} from "@/lib/dto";
import {actorFor} from "@/test-utils/actor";
import {unit} from "@/test-utils/units";

const supplierItem: SupplierItemRecord = {
  id: "supplier_item_1",
  itemId: "item_flour",
  itemCode: "FLOUR",
  itemName: "Flour",
  supplierRef: "MILL-25",
  packQuantity: "25",
  packUnitId: "unit_kg",
  packUnitCode: "kg",
  price: "27.50",
  currency: "EUR",
  leadTimeDays: 3,
  minOrderQuantity: null,
  isPreferred: true,
  validFrom: new Date("2026-01-01T00:00:00.000Z"),
  validTo: null,
  isArchived: false,
};

const supplier: SupplierListRecord = {
  id: "supplier_1",
  code: "SUP-1",
  name: "Mill",
  contactName: null,
  email: null,
  phone: null,
  city: null,
  defaultLeadTimeDays: 3,
  note: null,
  isArchived: false,
  activeItemCount: 1,
};

const detail: SupplierDetailRecord = {...supplier, items: [supplierItem]};

const input = {
  code: "sup-1",
  name: "Mill",
  contactName: null,
  email: null,
  phone: null,
  city: null,
  defaultLeadTimeDays: 3,
  note: null,
};

const itemInput = {
  itemId: "item_flour",
  supplierRef: "MILL-25",
  packQuantity: "25",
  packUnitId: "unit_kg",
  price: "27.50",
  leadTimeDays: 3,
  minOrderQuantity: null,
  isPreferred: true,
  validFrom: new Date("2026-01-01T00:00:00.000Z"),
};

function dependencies(overrides: {
  supplierRepository?: Partial<SupplierRepository>;
  catalogRepository?: Partial<CatalogRepository>;
} = {}) {
  const supplierRepository = {
    list: jest.fn().mockResolvedValue([supplier]),
    findById: jest.fn().mockResolvedValue(detail),
    findSummary: jest.fn().mockResolvedValue(supplier),
    create: jest.fn().mockResolvedValue("supplier_1"),
    update: jest.fn().mockResolvedValue(true),
    archive: jest.fn().mockResolvedValue(true),
    createItem: jest.fn().mockResolvedValue("supplier_item_1"),
    closeItem: jest.fn().mockResolvedValue(true),
    ...overrides.supplierRepository,
  } as unknown as SupplierRepository;
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
    listUnits: jest.fn().mockResolvedValue([unit("kg"), unit("g")]),
    findUnit: jest.fn().mockImplementation(async (id: string) => {
      if (id === "unit_g") return unit("g");
      if (id === "unit_kg") return unit("kg");
      return null;
    }),
    ...overrides.catalogRepository,
  } as unknown as CatalogRepository;

  return {
    supplierRepository,
    catalogRepository,
    service: createSupplierService({
      supplierRepository,
      catalogRepository,
    }),
  };
}

describe("supplier service", () => {
  it("requires a signed-in member with supplier:read", async () => {
    const {service} = dependencies();

    await expect(service.getSuppliers(null)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(
      service.getSuppliers(actorFor("staff")),
    ).rejects.toMatchObject({code: "FORBIDDEN"});
  });

  it("lists suppliers with write access for the stock manager", async () => {
    const {service} = dependencies();

    await expect(
      service.getSuppliers(actorFor("stock_manager")),
    ).resolves.toEqual({suppliers: [supplier], canWrite: true});
    await expect(
      service.getSuppliers(actorFor("production_manager")),
    ).resolves.toMatchObject({canWrite: false});
  });

  it("returns a supplier detail or null", async () => {
    const {service} = dependencies();

    await expect(
      service.getSupplier(actorFor("stock_manager"), "supplier_1"),
    ).resolves.toEqual(detail);

    const empty = dependencies({
      supplierRepository: {findById: jest.fn().mockResolvedValue(null)},
    });
    await expect(
      empty.service.getSupplier(actorFor("stock_manager"), "missing"),
    ).resolves.toBeNull();
  });

  it("builds form options from active items and units", async () => {
    const {service} = dependencies();

    const options = await service.getFormOptions(actorFor("stock_manager"));

    expect(options.items).toEqual([
      {id: "item_flour", code: "FLOUR", name: "Flour"},
    ]);
    expect(options.units).toHaveLength(2);
  });

  it("creates a supplier with an uppercased code", async () => {
    const {service, supplierRepository} = dependencies();

    await expect(
      service.createSupplier(actorFor("stock_manager"), input),
    ).resolves.toEqual({id: "supplier_1"});
    expect(supplierRepository.create).toHaveBeenCalledWith("org_1", {
      ...input,
      code: "SUP-1",
    });
  });

  it("maps a duplicate code to CONFLICT and rethrows others", async () => {
    const duplicate = dependencies({
      supplierRepository: {
        create: jest
          .fn()
          .mockRejectedValue(Object.assign(new Error("dup"), {code: "P2002"})),
      },
    });
    await expect(
      duplicate.service.createSupplier(actorFor("stock_manager"), input),
    ).rejects.toMatchObject({code: "CONFLICT"});

    const original = new Error("boom");
    const broken = dependencies({
      supplierRepository: {create: jest.fn().mockRejectedValue(original)},
    });
    await expect(
      broken.service.createSupplier(actorFor("stock_manager"), input),
    ).rejects.toBe(original);
  });

  it("requires the supplier to exist before update or archive", async () => {
    const {service} = dependencies({
      supplierRepository: {findSummary: jest.fn().mockResolvedValue(null)},
    });

    await expect(
      service.updateSupplier(actorFor("stock_manager"), "missing", input),
    ).rejects.toMatchObject({code: "NOT_FOUND"});
    await expect(
      service.archiveSupplier(actorFor("stock_manager"), "missing"),
    ).rejects.toMatchObject({code: "NOT_FOUND"});
  });

  it("updates a supplier and reports a concurrent delete", async () => {
    const {service, supplierRepository} = dependencies();
    await expect(
      service.updateSupplier(actorFor("stock_manager"), "supplier_1", input),
    ).resolves.toBeUndefined();
    expect(supplierRepository.update).toHaveBeenCalledWith(
      "org_1",
      "supplier_1",
      {...input, code: "SUP-1"},
    );

    const gone = dependencies({
      supplierRepository: {update: jest.fn().mockResolvedValue(false)},
    });
    await expect(
      gone.service.updateSupplier(
        actorFor("stock_manager"),
        "supplier_1",
        input,
      ),
    ).rejects.toMatchObject({code: "NOT_FOUND"});
  });

  it("archives a supplier", async () => {
    const {service} = dependencies();

    await expect(
      service.archiveSupplier(actorFor("stock_manager"), "supplier_1"),
    ).resolves.toBeUndefined();
  });

  it("adds a supplier item and returns the created row", async () => {
    const {service, supplierRepository} = dependencies();

    await expect(
      service.createItem(
        actorFor("stock_manager"),
        "supplier_1",
        itemInput,
      ),
    ).resolves.toEqual(supplierItem);
    expect(supplierRepository.createItem).toHaveBeenCalledWith(
      "org_1",
      "supplier_1",
      itemInput,
    );
  });

  it("rejects a missing item or an incompatible pack unit", async () => {
    const missingItem = dependencies({
      catalogRepository: {listItemOptions: jest.fn().mockResolvedValue([])},
    });
    await expect(
      missingItem.service.createItem(
        actorFor("stock_manager"),
        "supplier_1",
        itemInput,
      ),
    ).rejects.toMatchObject({code: "NOT_FOUND"});

    const badUnit = dependencies({
      catalogRepository: {
        findUnit: jest.fn().mockImplementation(async (id: string) =>
          id === "unit_piece" ? unit("piece") : unit("kg"),
        ),
      },
    });
    await expect(
      badUnit.service.createItem(actorFor("stock_manager"), "supplier_1", {
        ...itemInput,
        packUnitId: "unit_piece",
      }),
    ).rejects.toMatchObject({code: "INVALID_UNIT"});
  });

  it("throws UNEXPECTED when the created row cannot be read back", async () => {
    const {service} = dependencies({
      supplierRepository: {
        findById: jest
          .fn()
          .mockResolvedValue({...detail, items: []}),
      },
    });

    await expect(
      service.createItem(actorFor("stock_manager"), "supplier_1", itemInput),
    ).rejects.toMatchObject({code: "UNEXPECTED"});
  });

  it("maps a duplicate supplier item", async () => {
    const {service} = dependencies({
      supplierRepository: {
        createItem: jest
          .fn()
          .mockRejectedValue(Object.assign(new Error("dup"), {code: "P2002"})),
      },
    });

    await expect(
      service.createItem(actorFor("stock_manager"), "supplier_1", itemInput),
    ).rejects.toMatchObject({code: "CONFLICT"});
  });

  it("closes a supplier item at tomorrow UTC midnight", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-10-27T15:30:00.000Z"));
    const {service, supplierRepository} = dependencies();

    await service.closeItem(actorFor("stock_manager"), "supplier_item_1");

    expect(supplierRepository.closeItem).toHaveBeenCalledWith(
      "org_1",
      "supplier_item_1",
      new Date("2026-10-28T00:00:00.000Z"),
    );
    jest.useRealTimers();
  });

  it("throws NOT_FOUND when closing a missing item", async () => {
    const {service} = dependencies({
      supplierRepository: {closeItem: jest.fn().mockResolvedValue(false)},
    });

    await expect(
      service.closeItem(actorFor("stock_manager"), "missing"),
    ).rejects.toMatchObject({code: "NOT_FOUND"});
  });

  it("rejects writes from a read-only role", async () => {
    const {service} = dependencies();

    await expect(
      service.createSupplier(actorFor("production_manager"), input),
    ).rejects.toMatchObject({code: "FORBIDDEN"});
    await expect(
      service.createItem(
        actorFor("production_manager"),
        "supplier_1",
        itemInput,
      ),
    ).rejects.toMatchObject({code: "FORBIDDEN"});
    await expect(
      service.closeItem(actorFor("production_manager"), "supplier_item_1"),
    ).rejects.toMatchObject({code: "FORBIDDEN"});
  });
});
