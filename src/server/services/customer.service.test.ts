import {createCustomerService} from "@/server/services/customer.service";
import type {CustomerRepository} from "@/server/repositories/customer.repository";
import type {CustomerRecord} from "@/lib/dto";
import {DomainError} from "@/server/domain/errors";
import {actorFor} from "@/test-utils/actor";

const customer: CustomerRecord = {
  id: "customer_1",
  code: "ACME",
  name: "Acme Bakery",
  type: "BUSINESS",
  contactName: null,
  email: null,
  phone: null,
  city: null,
  vatNumber: null,
  note: null,
  isArchived: false,
};

function repository(
  overrides: Partial<CustomerRepository> = {},
): CustomerRepository {
  return {
    list: jest.fn().mockResolvedValue([customer]),
    find: jest.fn().mockResolvedValue(customer),
    create: jest.fn().mockResolvedValue("customer_1"),
    update: jest.fn().mockResolvedValue(true),
    archive: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

const input = {
  code: "ACME",
  name: "Acme Bakery",
  type: "BUSINESS" as const,
  contactName: null,
  email: null,
  phone: null,
  city: null,
  vatNumber: null,
  note: null,
};

describe("customer service", () => {
  it("requires a signed-in member", async () => {
    const service = createCustomerService({customerRepository: repository()});

    await expect(service.getCustomers(null)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("requires customer:read", async () => {
    const service = createCustomerService({customerRepository: repository()});

    await expect(
      service.getCustomers(actorFor("staff")),
    ).rejects.toMatchObject({code: "FORBIDDEN"});
    await expect(
      service.getCustomer(actorFor("staff"), "customer_1"),
    ).rejects.toMatchObject({code: "FORBIDDEN"});
  });

  it("lists customers for a sales role with write access", async () => {
    const service = createCustomerService({customerRepository: repository()});

    await expect(service.getCustomers(actorFor("sales"))).resolves.toEqual({
      customers: [customer],
      canWrite: true,
    });
  });

  it("hides write access from a read-only role", async () => {
    const service = createCustomerService({customerRepository: repository()});

    await expect(
      service.getCustomers(actorFor("production_manager")),
    ).resolves.toMatchObject({canWrite: false});
  });

  it("returns a detail view or null", async () => {
    const service = createCustomerService({customerRepository: repository()});

    await expect(
      service.getCustomer(actorFor("sales"), "customer_1"),
    ).resolves.toEqual({customer, canWrite: true});

    const empty = createCustomerService({
      customerRepository: repository({find: jest.fn().mockResolvedValue(null)}),
    });
    await expect(
      empty.getCustomer(actorFor("sales"), "missing"),
    ).resolves.toBeNull();
  });

  it("creates a customer", async () => {
    const repo = repository();
    const service = createCustomerService({customerRepository: repo});

    await expect(service.createCustomer(actorFor("sales"), input)).resolves.toEqual(
      {id: "customer_1"},
    );
    expect(repo.create).toHaveBeenCalledWith("org_1", input);
  });

  it("rejects writes from a read-only role", async () => {
    const service = createCustomerService({customerRepository: repository()});

    await expect(
      service.createCustomer(actorFor("production_manager"), input),
    ).rejects.toMatchObject({code: "FORBIDDEN"});
    await expect(
      service.updateCustomer(actorFor("production_manager"), "customer_1", input),
    ).rejects.toMatchObject({code: "FORBIDDEN"});
    await expect(
      service.archiveCustomer(actorFor("production_manager"), "customer_1"),
    ).rejects.toMatchObject({code: "FORBIDDEN"});
  });

  it("throws NOT_FOUND when an update or archive misses", async () => {
    const service = createCustomerService({
      customerRepository: repository({
        find: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue(false),
        archive: jest.fn().mockResolvedValue(false),
      }),
    });

    await expect(
      service.updateCustomer(actorFor("sales"), "missing", input),
    ).rejects.toBeInstanceOf(DomainError);
    await expect(
      service.archiveCustomer(actorFor("sales"), "missing"),
    ).rejects.toMatchObject({code: "NOT_FOUND"});
  });

  it("throws NOT_FOUND when the update reports no changed row", async () => {
    const service = createCustomerService({
      customerRepository: repository({
        update: jest.fn().mockResolvedValue(false),
      }),
    });

    await expect(
      service.updateCustomer(actorFor("sales"), "customer_1", input),
    ).rejects.toMatchObject({code: "NOT_FOUND"});
  });

  it("updates and archives an existing customer", async () => {
    const repo = repository();
    const service = createCustomerService({customerRepository: repo});

    await expect(
      service.updateCustomer(actorFor("sales"), "customer_1", input),
    ).resolves.toBeUndefined();
    await expect(
      service.archiveCustomer(actorFor("sales"), "customer_1"),
    ).resolves.toBeUndefined();
    expect(repo.update).toHaveBeenCalledWith("org_1", "customer_1", input);
    expect(repo.archive).toHaveBeenCalledWith("org_1", "customer_1");
  });
});
