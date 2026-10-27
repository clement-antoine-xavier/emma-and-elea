import {prisma} from "@/lib/prisma";
import {customerRepository} from "@/server/repositories/customer.repository";
import {supplierRepository} from "@/server/repositories/supplier.repository";
import {
  createFixture,
  referenceUnits,
  type Fixture,
} from "@/test-utils/integration/db";

let customerSequence = 0;

function customerInput() {
  customerSequence += 1;
  return {
    code: `CUST-${customerSequence}`,
    name: "Acme",
    type: "BUSINESS" as const,
    contactName: null,
    email: null,
    phone: null,
    city: null,
    vatNumber: null,
    note: null,
  };
}

const supplierInput = {
  code: "NEWSUP",
  name: "New mill",
  contactName: null,
  email: null,
  phone: null,
  city: null,
  defaultLeadTimeDays: 2,
  note: null,
};

describe("customer and supplier repositories", () => {
  let fixture: Fixture;

  beforeAll(async () => {
    fixture = await createFixture();
  });

  afterAll(async () => {
    await fixture.cleanup();
  });

  it("creates, reads, updates and archives a customer", async () => {
    const id = await customerRepository.create(
      fixture.organizationId,
      customerInput(),
    );

    await expect(
      customerRepository.find(fixture.organizationId, id),
    ).resolves.toMatchObject({id, name: "Acme", isArchived: false});
    await expect(
      customerRepository.list(fixture.organizationId),
    ).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({id})]),
    );

    await expect(
      customerRepository.update(fixture.organizationId, id, {
        ...customerInput(),
        name: "Acme edited",
        type: "INDIVIDUAL",
      }),
    ).resolves.toBe(true);
    await expect(
      customerRepository.find(fixture.organizationId, id),
    ).resolves.toMatchObject({name: "Acme edited", type: "INDIVIDUAL"});

    await expect(
      customerRepository.archive(fixture.organizationId, id),
    ).resolves.toBe(true);
    // Unlike the other repositories, customer archive throws when nothing
    // matched instead of returning false.
    await expect(
      customerRepository.archive(fixture.organizationId, id),
    ).rejects.toMatchObject({code: "NOT_FOUND"});
  });

  it("scopes customer reads and writes to the tenant", async () => {
    const id = await customerRepository.create(
      fixture.organizationId,
      customerInput(),
    );

    await expect(customerRepository.find("org_other", id)).resolves.toBeNull();
    await expect(
      customerRepository.update("org_other", id, {
        ...customerInput(),
        name: "Hijacked",
      }),
    ).resolves.toBe(false);
    await expect(
      customerRepository.archive("org_other", id),
    ).rejects.toMatchObject({code: "NOT_FOUND"});
  });

  it("reads the supplier list, summary and detail", async () => {
    const list = await supplierRepository.list(fixture.organizationId);
    const row = list.find((supplier) => supplier.id === fixture.supplierId);
    expect(row).toMatchObject({code: "MILL", activeItemCount: 1});

    await expect(
      supplierRepository.findSummary(
        fixture.organizationId,
        fixture.supplierId,
      ),
    ).resolves.toMatchObject({id: fixture.supplierId, name: "Mill"});

    const detail = await supplierRepository.findById(
      fixture.organizationId,
      fixture.supplierId,
    );
    expect(detail?.items).toEqual([
      expect.objectContaining({
        id: fixture.supplierItemId,
        itemId: fixture.items.flour,
        packQuantity: "25",
        price: "27.5",
      }),
    ]);
  });

  it("creates, updates and archives a supplier", async () => {
    const id = await supplierRepository.create(
      fixture.organizationId,
      supplierInput,
    );

    await expect(
      supplierRepository.findSummary(fixture.organizationId, id),
    ).resolves.toMatchObject({code: "NEWSUP", defaultLeadTimeDays: 2});

    await expect(
      supplierRepository.update(fixture.organizationId, id, {
        ...supplierInput,
        name: "New mill edited",
      }),
    ).resolves.toBe(true);
    await expect(
      supplierRepository.findSummary(fixture.organizationId, id),
    ).resolves.toMatchObject({name: "New mill edited"});

    await expect(
      supplierRepository.archive(fixture.organizationId, id),
    ).resolves.toBe(true);
    await expect(
      supplierRepository.archive(fixture.organizationId, id),
    ).resolves.toBe(false);

    // The code is unique per tenant, even after archiving.
    const duplicate = {
      ...supplierInput,
      code: `DUP-${Date.now()}`,
    };
    await expect(
      supplierRepository.create(fixture.organizationId, duplicate),
    ).resolves.toEqual(expect.any(String));
    await expect(
      supplierRepository.create(fixture.organizationId, duplicate),
    ).rejects.toMatchObject({code: "P2002"});
  });

  it("adds a supplier item and closes its price window", async () => {
    const validFrom = new Date("2026-02-01T00:00:00.000Z");
    const id = await supplierRepository.createItem(
      fixture.organizationId,
      fixture.supplierId,
      {
        itemId: fixture.items.butter,
        supplierRef: "BUT-1",
        packQuantity: "10",
        packUnitId: referenceUnits.kg,
        price: "40",
        leadTimeDays: 3,
        minOrderQuantity: "5",
        isPreferred: true,
        validFrom,
      },
    );

    const detail = await supplierRepository.findById(
      fixture.organizationId,
      fixture.supplierId,
    );
    expect(detail?.items.find((item) => item.id === id)).toMatchObject({
      itemId: fixture.items.butter,
      supplierRef: "BUT-1",
      leadTimeDays: 3,
      minOrderQuantity: "5",
    });

    const validTo = new Date("2026-03-01T00:00:00.000Z");
    await expect(
      supplierRepository.closeItem(fixture.organizationId, id, validTo),
    ).resolves.toBe(true);
    const closed = await prisma.supplierItem.findUniqueOrThrow({
      where: {id},
      select: {validTo: true},
    });
    expect(closed.validTo).toEqual(validTo);
  });

  it("scopes supplier reads to the tenant", async () => {
    await expect(
      supplierRepository.findSummary("org_other", fixture.supplierId),
    ).resolves.toBeNull();
    await expect(
      supplierRepository.findById("org_other", fixture.supplierId),
    ).resolves.toBeNull();
    await expect(supplierRepository.list("org_other")).resolves.toEqual([]);
  });
});
