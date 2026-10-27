import {prisma} from "@/lib/prisma";
import {orderRepository} from "@/server/repositories/order.repository";
import {
  createCustomer,
  createFixture,
  referenceUnits,
  type Fixture,
} from "@/test-utils/integration/db";

describe("order repository", () => {
  let fixture: Fixture;
  let customerId: string;

  beforeAll(async () => {
    fixture = await createFixture();
    customerId = await createCustomer(fixture, "Acme");
  });

  afterAll(async () => {
    await fixture.cleanup();
  });

  async function createOrder() {
    return orderRepository.create(fixture.organizationId, {
      customerId,
      siteId: fixture.siteId,
      requestedFor: new Date("2026-10-28T00:00:00.000Z"),
      currency: "EUR",
      note: null,
    });
  }

  function line(overrides: Record<string, unknown> = {}) {
    return {
      itemId: fixture.items.croissant,
      quantity: "5",
      unitId: referenceUnits.piece,
      unitPrice: "2.5",
      note: null,
      ...overrides,
    };
  }

  it("creates a numbered draft for the tenant", async () => {
    const id = await createOrder();

    const order = await prisma.order.findUniqueOrThrow({
      where: {id},
      select: {number: true, status: true, customerId: true, siteId: true},
    });

    expect(order.number).toMatch(/^ORD-\d{6}-\d{3,}$/);
    expect(order.status).toBe("DRAFT");
    expect(order.customerId).toBe(customerId);
  });

  it("recomputes the total as lines are added and removed", async () => {
    const id = await createOrder();
    await orderRepository.addLine(fixture.organizationId, id, line());
    await orderRepository.addLine(
      fixture.organizationId,
      id,
      line({quantity: "2", unitPrice: "4"}),
    );

    const detail = await orderRepository.find(fixture.organizationId, id);
    expect(detail?.lines).toHaveLength(2);
    expect(Number(detail?.totalAmount)).toBe(20.5);

    const firstLine = detail!.lines[0];
    await orderRepository.removeLine(
      fixture.organizationId,
      id,
      firstLine.id,
    );
    const after = await orderRepository.find(fixture.organizationId, id);
    expect(after?.lines).toHaveLength(1);
    expect(Number(after?.totalAmount)).toBe(8);
  });

  it("guards line edits by order status", async () => {
    const id = await createOrder();
    await expect(
      orderRepository.addLine(fixture.organizationId, id, line()),
    ).resolves.toBeUndefined();
    await orderRepository.confirm(fixture.organizationId, id);

    await expect(
      orderRepository.addLine(fixture.organizationId, id, line()),
    ).rejects.toMatchObject({code: "INVALID_STATE_TRANSITION"});
    await expect(
      orderRepository.removeLine(
        fixture.organizationId,
        id,
        (
          await orderRepository.find(fixture.organizationId, id)
        )!.lines[0].id,
      ),
    ).rejects.toMatchObject({code: "INVALID_STATE_TRANSITION"});
  });

  it("confirms only a draft and cancels drafts or confirmed orders", async () => {
    const id = await createOrder();
    await expect(
      orderRepository.confirm(fixture.organizationId, id),
    ).resolves.toBeUndefined();
    await expect(
      orderRepository.confirm(fixture.organizationId, id),
    ).rejects.toMatchObject({code: "INVALID_STATE_TRANSITION"});
    await expect(
      orderRepository.cancel(fixture.organizationId, id),
    ).resolves.toBeUndefined();
    await expect(
      orderRepository.cancel(fixture.organizationId, id),
    ).rejects.toMatchObject({code: "INVALID_STATE_TRANSITION"});
  });

  it("lists orders by search and status", async () => {
    const id = await createOrder();
    const number = (
      await prisma.order.findUniqueOrThrow({
        where: {id},
        select: {number: true},
      })
    ).number;

    const byNumber = await orderRepository.list(fixture.organizationId, {
      search: number,
      status: null,
      skip: 0,
      take: 20,
    });
    expect(byNumber.orders.map((order) => order.id)).toEqual([id]);

    const byCustomer = await orderRepository.list(fixture.organizationId, {
      search: "acme",
      status: "DRAFT",
      skip: 0,
      take: 20,
    });
    expect(byCustomer.orders.every((order) => order.status === "DRAFT")).toBe(
      true,
    );
  });

  it("scopes reads and mutations to the tenant", async () => {
    const id = await createOrder();

    await expect(
      orderRepository.find("org_other", id),
    ).resolves.toBeNull();
    await expect(
      orderRepository.findSummary("org_other", id),
    ).resolves.toBeNull();
    await expect(
      orderRepository.cancel("org_other", id),
    ).rejects.toMatchObject({code: "INVALID_STATE_TRANSITION"});
    await expect(
      orderRepository.addLine("org_other", id, line()),
    ).rejects.toMatchObject({code: "NOT_FOUND"});
  });

  it("returns a summary used by dispatch links", async () => {
    const id = await createOrder();

    await expect(
      orderRepository.findSummary(fixture.organizationId, id),
    ).resolves.toEqual({id, status: "DRAFT", customerId});
  });
});
