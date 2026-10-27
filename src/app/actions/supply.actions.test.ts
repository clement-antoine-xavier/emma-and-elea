import {getActorContext} from "@/server/auth/actor";
import {
  customerService,
  equipmentService,
  purchasingService,
  supplierService,
} from "@/server/services/container";
import {
  addReceiptLineAction,
  cancelReceiptAction,
  createReceiptDraftAction,
  postReceiptAction,
  removeReceiptLineAction,
} from "@/app/actions/purchasing.actions";
import {
  archiveSupplierAction,
  closeSupplierItemAction,
  createSupplierAction,
  createSupplierItemAction,
  updateSupplierAction,
} from "@/app/actions/supplier.actions";
import {
  archiveCustomerAction,
  createCustomerAction,
  updateCustomerAction,
} from "@/app/actions/customer.actions";
import {
  archiveEquipmentAction,
  createEquipmentAction,
} from "@/app/actions/equipment.actions";
import {DomainError} from "@/server/domain/errors";
import {actorFor} from "@/test-utils/actor";

jest.mock("@/server/auth/actor", () => ({getActorContext: jest.fn()}));
jest.mock("@/server/services/container", () => ({
  purchasingService: {
    createDraft: jest.fn(),
    addLine: jest.fn(),
    removeLine: jest.fn(),
    postReceipt: jest.fn(),
    cancelReceipt: jest.fn(),
  },
  supplierService: {
    createSupplier: jest.fn(),
    updateSupplier: jest.fn(),
    archiveSupplier: jest.fn(),
    createItem: jest.fn(),
    closeItem: jest.fn(),
  },
  customerService: {
    createCustomer: jest.fn(),
    updateCustomer: jest.fn(),
    archiveCustomer: jest.fn(),
  },
  equipmentService: {
    createEquipment: jest.fn(),
    archiveEquipment: jest.fn(),
  },
}));

const getActor = getActorContext as jest.Mock;
const purchasing = purchasingService as unknown as Record<string, jest.Mock>;
const supplier = supplierService as unknown as Record<string, jest.Mock>;
const customer = customerService as unknown as Record<string, jest.Mock>;
const equipment = equipmentService as unknown as Record<string, jest.Mock>;

beforeEach(() => {
  jest.clearAllMocks();
  getActor.mockResolvedValue(actorFor("stock_manager"));
});

describe("purchasing actions", () => {
  it("creates a draft with null optional text", async () => {
    purchasing.createDraft.mockResolvedValue({id: "receipt_1"});

    await expect(
      createReceiptDraftAction({
        siteId: "site_1",
        supplierId: "supplier_1",
        supplierReference: "",
        note: "",
      }),
    ).resolves.toEqual({ok: true, receiptId: "receipt_1"});
    expect(purchasing.createDraft).toHaveBeenCalledWith(expect.any(Object), {
      siteId: "site_1",
      supplierId: "supplier_1",
      supplierReference: null,
      note: null,
    });
  });

  it("adds a line and converts optional dates", async () => {
    purchasing.addLine.mockResolvedValue(undefined);

    await expect(
      addReceiptLineAction("receipt_1", {
        itemId: "item_1",
        quantity: "25",
        unitId: "unit_kg",
        unitPrice: "27.50",
        lotNumber: "",
        supplierLotNumber: "",
        expiresOn: "2027-01-01",
        bestBeforeOn: "",
      }),
    ).resolves.toEqual({ok: true});
    expect(purchasing.addLine).toHaveBeenCalledWith(
      expect.any(Object),
      "receipt_1",
      {
        itemId: "item_1",
        quantity: "25",
        unitId: "unit_kg",
        unitPrice: "27.50",
        lotNumber: null,
        supplierLotNumber: null,
        expiresOn: new Date("2027-01-01T00:00:00.000Z"),
        bestBeforeOn: null,
      },
    );
  });

  it("rejects invalid lines and ids", async () => {
    await expect(
      addReceiptLineAction("", {
        itemId: "item_1",
        quantity: "1",
        unitId: "unit_kg",
        unitPrice: "1",
        lotNumber: "",
        supplierLotNumber: "",
        expiresOn: "",
        bestBeforeOn: "",
      }),
    ).resolves.toEqual({ok: false, error: "invalidInput"});

    await expect(
      addReceiptLineAction("receipt_1", {
        itemId: "item_1",
        quantity: "0",
        unitId: "unit_kg",
        unitPrice: "1",
        lotNumber: "",
        supplierLotNumber: "",
        expiresOn: "",
        bestBeforeOn: "",
      }),
    ).resolves.toEqual({ok: false, error: "invalidInput"});
  });

  it("removes a line, posts and cancels", async () => {
    purchasing.removeLine.mockResolvedValue(undefined);
    purchasing.postReceipt.mockResolvedValue(undefined);
    purchasing.cancelReceipt.mockResolvedValue(undefined);

    await expect(
      removeReceiptLineAction({receiptId: "receipt_1", lineId: "line_1"}),
    ).resolves.toEqual({ok: true});
    await expect(postReceiptAction({id: "receipt_1"})).resolves.toEqual({
      ok: true,
    });
    await expect(cancelReceiptAction({id: "receipt_1"})).resolves.toEqual({
      ok: true,
    });
  });

  it("maps a posting state error", async () => {
    purchasing.postReceipt.mockRejectedValue(
      new DomainError("INVALID_STATE_TRANSITION"),
    );

    await expect(postReceiptAction({id: "receipt_1"})).resolves.toEqual({
      ok: false,
      error: "invalidState",
    });
  });
});

describe("supplier actions", () => {
  const supplierInput = {
    code: "SUP-1",
    name: "Mill",
    contactName: "",
    email: "",
    phone: "",
    city: "",
    defaultLeadTimeDays: "3",
    note: "",
  };

  it("creates a supplier with a numeric lead time", async () => {
    supplier.createSupplier.mockResolvedValue({id: "supplier_1"});

    await expect(createSupplierAction(supplierInput)).resolves.toEqual({
      ok: true,
      supplierId: "supplier_1",
    });
    expect(supplier.createSupplier).toHaveBeenCalledWith(expect.any(Object), {
      code: "SUP-1",
      name: "Mill",
      contactName: null,
      email: null,
      phone: null,
      city: null,
      defaultLeadTimeDays: 3,
      note: null,
    });
  });

  it("keeps an empty lead time null", async () => {
    supplier.createSupplier.mockResolvedValue({id: "supplier_1"});

    await createSupplierAction({...supplierInput, defaultLeadTimeDays: ""});

    expect(supplier.createSupplier).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({defaultLeadTimeDays: null}),
    );
  });

  it("validates the id on update and maps a duplicate code", async () => {
    await expect(
      updateSupplierAction("", supplierInput),
    ).resolves.toEqual({ok: false, error: "invalidInput"});

    supplier.updateSupplier.mockRejectedValue(new DomainError("DUPLICATE_CODE"));
    await expect(
      updateSupplierAction("supplier_1", supplierInput),
    ).resolves.toEqual({ok: false, error: "duplicateCode"});
  });

  it("creates and closes a supplier item", async () => {
    supplier.createItem.mockResolvedValue({id: "supplier_item_1"});

    await expect(
      createSupplierItemAction("supplier_1", {
        itemId: "item_1",
        supplierRef: "",
        packQuantity: "25",
        packUnitId: "unit_kg",
        price: "27.50",
        leadTimeDays: "",
        minOrderQuantity: "",
        isPreferred: true,
        validFrom: "2026-01-01",
      }),
    ).resolves.toEqual({ok: true});
    expect(supplier.createItem).toHaveBeenCalledWith(
      expect.any(Object),
      "supplier_1",
      {
        itemId: "item_1",
        supplierRef: null,
        packQuantity: "25",
        packUnitId: "unit_kg",
        price: "27.50",
        leadTimeDays: null,
        minOrderQuantity: null,
        isPreferred: true,
        validFrom: new Date("2026-01-01T00:00:00.000Z"),
      },
    );

    supplier.closeItem.mockResolvedValue(undefined);
    await expect(
      closeSupplierItemAction({id: "supplier_item_1"}),
    ).resolves.toEqual({ok: true});
  });

  it("archives a supplier", async () => {
    supplier.archiveSupplier.mockResolvedValue(undefined);

    await expect(
      archiveSupplierAction({id: "supplier_1"}),
    ).resolves.toEqual({ok: true});
  });
});

describe("customer actions", () => {
  const customerInput = {
    code: "ac-1",
    name: "Acme Bakery",
    type: "BUSINESS",
    contactName: "",
    email: "",
    phone: "",
    city: "",
    vatNumber: "",
    note: "",
  };

  it("uppercases the code and nulls optional fields", async () => {
    customer.createCustomer.mockResolvedValue({id: "customer_1"});

    await expect(createCustomerAction(customerInput)).resolves.toEqual({
      ok: true,
      customerId: "customer_1",
    });
    expect(customer.createCustomer).toHaveBeenCalledWith(expect.any(Object), {
      code: "AC-1",
      name: "Acme Bakery",
      type: "BUSINESS",
      contactName: null,
      email: null,
      phone: null,
      city: null,
      vatNumber: null,
      note: null,
    });
  });

  it("keeps an empty code null", async () => {
    customer.createCustomer.mockResolvedValue({id: "customer_1"});

    await createCustomerAction({...customerInput, code: ""});

    expect(customer.createCustomer).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({code: null}),
    );
  });

  it("rejects an invalid type and maps a conflict", async () => {
    await expect(
      createCustomerAction({...customerInput, type: "CHARITY"}),
    ).resolves.toEqual({ok: false, error: "invalidInput"});

    customer.updateCustomer.mockRejectedValue(new DomainError("CONFLICT"));
    await expect(
      updateCustomerAction("customer_1", customerInput),
    ).resolves.toEqual({ok: false, error: "conflict"});
  });

  it("archives a customer and validates its id", async () => {
    customer.archiveCustomer.mockResolvedValue(undefined);

    await expect(
      archiveCustomerAction({id: "customer_1"}),
    ).resolves.toEqual({ok: true});
    await expect(archiveCustomerAction({id: ""})).resolves.toEqual({
      ok: false,
      error: "invalidInput",
    });
  });
});

describe("equipment actions", () => {
  it("nulls the optional site and power", async () => {
    equipment.createEquipment.mockResolvedValue({id: "equipment_1"});

    await expect(
      createEquipmentAction({
        name: "Oven",
        kind: "OVEN",
        siteId: "",
        powerKw: "",
      }),
    ).resolves.toEqual({ok: true});
    expect(equipment.createEquipment).toHaveBeenCalledWith(expect.any(Object), {
      name: "Oven",
      kind: "OVEN",
      siteId: null,
      powerKw: null,
    });
  });

  it("rejects an invalid power and maps a missing site", async () => {
    await expect(
      createEquipmentAction({
        name: "Oven",
        kind: "OVEN",
        siteId: "",
        powerKw: "-1",
      }),
    ).resolves.toEqual({ok: false, error: "invalidInput"});

    equipment.createEquipment.mockRejectedValue(new DomainError("NOT_FOUND"));
    await expect(
      createEquipmentAction({
        name: "Oven",
        kind: "OVEN",
        siteId: "site_gone",
        powerKw: "3",
      }),
    ).resolves.toEqual({ok: false, error: "notFound"});
  });

  it("archives equipment", async () => {
    equipment.archiveEquipment.mockResolvedValue(undefined);

    await expect(
      archiveEquipmentAction({id: "equipment_1"}),
    ).resolves.toEqual({ok: true});
  });
});
