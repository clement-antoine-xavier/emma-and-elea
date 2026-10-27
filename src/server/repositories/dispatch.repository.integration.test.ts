import {prisma} from "@/lib/prisma";
import {dispatchRepository} from "@/server/repositories/dispatch.repository";
import {orderRepository} from "@/server/repositories/order.repository";
import {
  createCustomer,
  createFixture,
  createLot,
  referenceUnits,
  type Fixture,
} from "@/test-utils/integration/db";

describe("dispatch repository", () => {
  let fixture: Fixture;
  let customerId: string;
  let croissantLotId: string;

  beforeAll(async () => {
    fixture = await createFixture();
    customerId = await createCustomer(fixture, "Acme");
    croissantLotId = await createLot(fixture, {
      itemId: fixture.items.croissant,
      lotNumber: "ATL-CROISSANT-1",
      quantity: "50",
      unitCost: "0.5",
      unitId: referenceUnits.piece,
    });
  });

  afterAll(async () => {
    await fixture.cleanup();
  });

  async function createDispatch(overrides: Record<string, unknown> = {}) {
    return dispatchRepository.create(fixture.organizationId, {
      siteId: fixture.siteId,
      customerId,
      orderId: null,
      carrier: "Van",
      note: null,
      ...overrides,
    });
  }

  function line(overrides: Record<string, unknown> = {}) {
    return {
      lotId: croissantLotId,
      itemId: fixture.items.croissant,
      unitId: referenceUnits.piece,
      quantity: "4",
      unitPrice: "2.5",
      note: null,
      ...overrides,
    };
  }

  it("creates a numbered draft", async () => {
    const id = await createDispatch();

    const dispatch = await prisma.dispatch.findUniqueOrThrow({
      where: {id},
      select: {number: true, status: true, customerId: true, carrier: true},
    });

    expect(dispatch.number).toMatch(/^DSP-\d{6}-\d{3,}$/);
    expect(dispatch).toMatchObject({
      status: "DRAFT",
      customerId,
      carrier: "Van",
    });
  });

  it("adds and removes a lot line while the dispatch is a draft", async () => {
    const id = await createDispatch();
    await dispatchRepository.addLine(fixture.organizationId, id, line());

    const detail = await dispatchRepository.find(fixture.organizationId, id);
    expect(detail?.lines).toHaveLength(1);
    expect(detail?.lines[0]).toMatchObject({
      lotId: croissantLotId,
      lotNumber: "ATL-CROISSANT-1",
      quantity: "4",
      unitCode: "piece",
    });

    await dispatchRepository.removeLine(
      fixture.organizationId,
      id,
      detail!.lines[0].id,
    );
    await expect(
      dispatchRepository.removeLine(
        fixture.organizationId,
        id,
        detail!.lines[0].id,
      ),
    ).rejects.toMatchObject({code: "NOT_FOUND"});
  });

  it("posts a dispatch, consumes the lot and writes a movement", async () => {
    const id = await createDispatch();
    await dispatchRepository.addLine(fixture.organizationId, id, line());

    await dispatchRepository.post(fixture.organizationId, id);

    const dispatch = await prisma.dispatch.findUniqueOrThrow({
      where: {id},
      select: {status: true, dispatchedAt: true},
    });
    expect(dispatch.status).toBe("DISPATCHED");
    expect(dispatch.dispatchedAt).not.toBeNull();

    const lot = await prisma.lot.findUniqueOrThrow({
      where: {id: croissantLotId},
      select: {quantityRemaining: true},
    });
    expect(lot.quantityRemaining.toString()).toBe("46");

    const movement = await prisma.stockMovement.findFirstOrThrow({
      where: {referenceType: "DISPATCH", referenceId: id},
      select: {type: true, quantity: true, unitId: true, itemId: true},
    });
    expect(movement.type).toBe("DISPATCH");
    expect(movement.quantity.toString()).toBe("-4");
    expect(movement.itemId).toBe(fixture.items.croissant);
  });

  it("refuses an empty dispatch and a second post", async () => {
    const empty = await createDispatch();
    await expect(
      dispatchRepository.post(fixture.organizationId, empty),
    ).rejects.toMatchObject({code: "INVALID_INPUT"});

    const posted = await createDispatch();
    await dispatchRepository.addLine(
      fixture.organizationId,
      posted,
      line({quantity: "1"}),
    );
    await dispatchRepository.post(fixture.organizationId, posted);

    await expect(
      dispatchRepository.post(fixture.organizationId, posted),
    ).rejects.toMatchObject({code: "INVALID_STATE_TRANSITION"});
    await expect(
      dispatchRepository.addLine(fixture.organizationId, posted, line()),
    ).rejects.toMatchObject({code: "INVALID_STATE_TRANSITION"});
  });

  it("marks the linked order READY then DELIVERED as lines are fulfilled", async () => {
    const orderId = await orderRepository.create(fixture.organizationId, {
      customerId,
      siteId: fixture.siteId,
      requestedFor: new Date("2026-10-28T00:00:00.000Z"),
      currency: "EUR",
      note: null,
    });
    await orderRepository.addLine(fixture.organizationId, orderId, {
      itemId: fixture.items.croissant,
      quantity: "10",
      unitId: referenceUnits.piece,
      unitPrice: "2.5",
      note: null,
    });
    await orderRepository.confirm(fixture.organizationId, orderId);

    const first = await createDispatch({orderId});
    await dispatchRepository.addLine(
      fixture.organizationId,
      first,
      line({quantity: "4"}),
    );
    await dispatchRepository.post(fixture.organizationId, first);

    const afterFirst = await prisma.order.findUniqueOrThrow({
      where: {id: orderId},
      select: {
        status: true,
        lines: {select: {fulfilledQuantity: true}},
      },
    });
    expect(afterFirst.status).toBe("READY");
    expect(afterFirst.lines[0].fulfilledQuantity.toString()).toBe("4");

    const second = await createDispatch({orderId});
    await dispatchRepository.addLine(
      fixture.organizationId,
      second,
      line({quantity: "6"}),
    );
    await dispatchRepository.post(fixture.organizationId, second);

    const afterSecond = await prisma.order.findUniqueOrThrow({
      where: {id: orderId},
      select: {
        status: true,
        lines: {select: {fulfilledQuantity: true}},
      },
    });
    expect(afterSecond.status).toBe("DELIVERED");
    expect(afterSecond.lines[0].fulfilledQuantity.toString()).toBe("10");
  });

  it("rolls back a post when a lot no longer has enough stock", async () => {
    const id = await createDispatch();
    await dispatchRepository.addLine(
      fixture.organizationId,
      id,
      line({quantity: "9999"}),
    );

    await expect(
      dispatchRepository.post(fixture.organizationId, id),
    ).rejects.toMatchObject({code: "INSUFFICIENT_STOCK"});

    const [dispatch, movements] = await Promise.all([
      prisma.dispatch.findUniqueOrThrow({
        where: {id},
        select: {status: true},
      }),
      prisma.stockMovement.count({
        where: {referenceType: "DISPATCH", referenceId: id},
      }),
    ]);
    expect(dispatch.status).toBe("DRAFT");
    expect(movements).toBe(0);
  });

  it("cancels only a draft and only once", async () => {
    const id = await createDispatch();

    await expect(
      dispatchRepository.cancel(fixture.organizationId, id),
    ).resolves.toBeUndefined();
    await expect(
      dispatchRepository.cancel(fixture.organizationId, id),
    ).rejects.toMatchObject({code: "INVALID_STATE_TRANSITION"});
  });

  it("lists dispatches by status and scopes them to the tenant", async () => {
    const id = await createDispatch();

    const list = await dispatchRepository.list(fixture.organizationId, {
      search: "acme",
      status: "DRAFT",
      skip: 0,
      take: 50,
    });
    expect(list.dispatches.some((dispatch) => dispatch.id === id)).toBe(true);
    expect(
      list.dispatches.every((dispatch) => dispatch.status === "DRAFT"),
    ).toBe(true);

    await expect(
      dispatchRepository.find("org_other", id),
    ).resolves.toBeNull();
    await expect(
      dispatchRepository.cancel("org_other", id),
    ).rejects.toMatchObject({code: "INVALID_STATE_TRANSITION"});
  });

  it("finds only available lots of the tenant", async () => {
    await expect(
      dispatchRepository.findLot(fixture.organizationId, croissantLotId),
    ).resolves.toMatchObject({
      itemId: fixture.items.croissant,
      unitId: referenceUnits.piece,
      unitCode: "piece",
    });
    await expect(
      dispatchRepository.findLot("org_other", croissantLotId),
    ).resolves.toBeNull();
  });
});
