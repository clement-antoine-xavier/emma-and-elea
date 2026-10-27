import {getActorContext} from "@/server/auth/actor";
import {
  planningService,
  productionService,
  stockCountService,
} from "@/server/services/container";
import {
  archiveWasteAction,
  cancelProductionBatchAction,
  completeProductionBatchAction,
  createProductionBatchAction,
  recordWasteAction,
  startProductionBatchAction,
} from "@/app/actions/production.actions";
import {
  addPlanLineAction,
  cancelPlanAction,
  closePlanAction,
  confirmPlanAction,
  createBatchFromPlanLineAction,
  createPlanAction,
  removePlanLineAction,
  updatePlanLineAction,
} from "@/app/actions/planning.actions";
import {
  cancelStockCountAction,
  createStockCountAction,
  postStockCountAction,
  updateStockCountLinesAction,
} from "@/app/actions/stock-count.actions";
import {DomainError} from "@/server/domain/errors";
import {actorFor} from "@/test-utils/actor";

jest.mock("@/server/auth/actor", () => ({getActorContext: jest.fn()}));
jest.mock("@/server/services/container", () => ({
  productionService: {
    createBatch: jest.fn(),
    startBatch: jest.fn(),
    cancelBatch: jest.fn(),
    completeBatch: jest.fn(),
    recordWaste: jest.fn(),
    archiveWaste: jest.fn(),
  },
  planningService: {
    createPlan: jest.fn(),
    addLine: jest.fn(),
    updateLine: jest.fn(),
    removeLine: jest.fn(),
    confirmPlan: jest.fn(),
    closePlan: jest.fn(),
    cancelPlan: jest.fn(),
    createBatchFromLine: jest.fn(),
  },
  stockCountService: {
    createCount: jest.fn(),
    updateLines: jest.fn(),
    postCount: jest.fn(),
    cancelCount: jest.fn(),
  },
}));

const getActor = getActorContext as jest.Mock;
const production = productionService as unknown as Record<string, jest.Mock>;
const planning = planningService as unknown as Record<string, jest.Mock>;
const stockCount = stockCountService as unknown as Record<string, jest.Mock>;

beforeEach(() => {
  jest.clearAllMocks();
  getActor.mockResolvedValue(actorFor("production_manager"));
});

describe("production actions", () => {
  const batchInput = {
    siteId: "site_1",
    recipeVersionId: "version_1",
    plannedQuantity: "10",
    plannedStartAt: "",
    note: "",
  };

  it("rejects a visitor", async () => {
    getActor.mockResolvedValue(null);

    await expect(createProductionBatchAction(batchInput)).resolves.toEqual({
      ok: false,
      error: "unauthenticated",
    });
  });

  it("creates a batch with parsed dates", async () => {
    production.createBatch.mockResolvedValue({id: "batch_1"});

    await expect(
      createProductionBatchAction({
        ...batchInput,
        plannedStartAt: "2026-10-28",
      }),
    ).resolves.toEqual({ok: true, batchId: "batch_1"});
    expect(production.createBatch).toHaveBeenCalledWith(expect.any(Object), {
      siteId: "site_1",
      recipeVersionId: "version_1",
      plannedQuantity: "10",
      plannedStartAt: new Date("2026-10-28T00:00:00.000Z"),
      note: null,
    });
  });

  it("starts and cancels a batch", async () => {
    production.startBatch.mockResolvedValue(undefined);
    production.cancelBatch.mockResolvedValue(undefined);

    await expect(
      startProductionBatchAction({id: "batch_1"}),
    ).resolves.toEqual({ok: true});
    await expect(
      cancelProductionBatchAction({id: "batch_1"}),
    ).resolves.toEqual({ok: true});
  });

  it("completes a batch and rejects invalid quantities", async () => {
    production.completeBatch.mockResolvedValue(undefined);

    await expect(
      completeProductionBatchAction("batch_1", {
        actualQuantity: "9",
        producedOn: "2026-10-27",
      }),
    ).resolves.toEqual({ok: true});
    expect(production.completeBatch).toHaveBeenCalledWith(
      expect.any(Object),
      "batch_1",
      {
        actualQuantity: "9",
        producedOn: new Date("2026-10-27T00:00:00.000Z"),
      },
    );

    await expect(
      completeProductionBatchAction("batch_1", {actualQuantity: "0"}),
    ).resolves.toEqual({ok: false, error: "invalidInput"});
  });

  it("records waste with a date or now", async () => {
    production.recordWaste.mockResolvedValue(undefined);
    const input = {
      lotId: "lot_1",
      lossReasonId: "reason_1",
      quantity: "1",
      reason: "",
      recordedAt: "2026-10-27",
    };

    await expect(recordWasteAction(input)).resolves.toEqual({ok: true});
    expect(production.recordWaste).toHaveBeenCalledWith(expect.any(Object), {
      lotId: "lot_1",
      lossReasonId: "reason_1",
      quantity: "1",
      reason: null,
      recordedAt: new Date("2026-10-27T00:00:00.000Z"),
    });

    production.recordWaste.mockClear();
    await recordWasteAction({...input, recordedAt: ""});
    expect(production.recordWaste).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({recordedAt: expect.any(Date)}),
    );
  });

  it("archives waste and maps a missing lot", async () => {
    production.archiveWaste.mockResolvedValue(undefined);

    await expect(archiveWasteAction({id: "waste_1"})).resolves.toEqual({
      ok: true,
    });

    production.archiveWaste.mockRejectedValue(new DomainError("NOT_FOUND"));
    await expect(archiveWasteAction({id: "waste_1"})).resolves.toEqual({
      ok: false,
      error: "notFound",
    });
  });

  it("maps a completed batch with insufficient stock", async () => {
    production.completeBatch.mockRejectedValue(
      new DomainError("INSUFFICIENT_STOCK"),
    );

    await expect(
      completeProductionBatchAction("batch_1", {
        actualQuantity: "9",
        producedOn: "",
      }),
    ).resolves.toEqual({ok: false, error: "generic"});
  });
});

describe("planning actions", () => {
  const planInput = {
    siteId: "site_1",
    plannedFor: "2026-10-28",
    includeForecast: true,
    includeOrders: false,
    note: "",
  };

  it("creates a plan with UTC dates", async () => {
    planning.createPlan.mockResolvedValue({id: "plan_1"});

    await expect(createPlanAction(planInput)).resolves.toEqual({
      ok: true,
      planId: "plan_1",
    });
    expect(planning.createPlan).toHaveBeenCalledWith(expect.any(Object), {
      siteId: "site_1",
      plannedFor: new Date("2026-10-28T00:00:00.000Z"),
      includeForecast: true,
      includeOrders: false,
      note: null,
    });
  });

  it("adds and updates a line", async () => {
    planning.addLine.mockResolvedValue(undefined);
    planning.updateLine.mockResolvedValue(undefined);

    await expect(
      addPlanLineAction("plan_1", {
        itemId: "item_1",
        quantity: "5",
        note: "",
      }),
    ).resolves.toEqual({ok: true});
    await expect(
      updatePlanLineAction("plan_1", {lineId: "line_1", quantity: "6"}),
    ).resolves.toEqual({ok: true});
  });

  it("removes a line and drives the plan state machine", async () => {
    planning.removeLine.mockResolvedValue(undefined);
    planning.confirmPlan.mockResolvedValue(undefined);
    planning.closePlan.mockResolvedValue(undefined);
    planning.cancelPlan.mockResolvedValue(undefined);

    await expect(
      removePlanLineAction({planId: "plan_1", lineId: "line_1"}),
    ).resolves.toEqual({ok: true});
    await expect(confirmPlanAction({id: "plan_1"})).resolves.toEqual({
      ok: true,
    });
    await expect(closePlanAction({id: "plan_1"})).resolves.toEqual({
      ok: true,
    });
    await expect(cancelPlanAction({id: "plan_1"})).resolves.toEqual({
      ok: true,
    });

    planning.confirmPlan.mockRejectedValue(
      new DomainError("INVALID_STATE_TRANSITION"),
    );
    await expect(confirmPlanAction({id: "plan_1"})).resolves.toEqual({
      ok: false,
      error: "invalidState",
    });
  });

  it("creates a batch from a plan line", async () => {
    planning.createBatchFromLine.mockResolvedValue({batchId: "batch_1"});

    await expect(
      createBatchFromPlanLineAction({lineId: "line_1"}),
    ).resolves.toEqual({ok: true, batchId: "batch_1"});
  });
});

describe("stock count actions", () => {
  const input = {
    siteId: "site_1",
    countedAt: "2026-10-27",
    note: "",
  };

  it("creates a count and converts the date", async () => {
    stockCount.createCount.mockResolvedValue({id: "count_1"});

    await expect(createStockCountAction(input)).resolves.toEqual({
      ok: true,
      countId: "count_1",
    });
    expect(stockCount.createCount).toHaveBeenCalledWith(expect.any(Object), {
      siteId: "site_1",
      countedAt: new Date("2026-10-27T00:00:00.000Z"),
      note: null,
    });
  });

  it("updates the counted lines", async () => {
    stockCount.updateLines.mockResolvedValue(undefined);

    await expect(
      updateStockCountLinesAction("count_1", {
        lines: [{id: "line_1", countedQuantity: "2.5"}],
      }),
    ).resolves.toEqual({ok: true});
    expect(stockCount.updateLines).toHaveBeenCalledWith(
      expect.any(Object),
      "count_1",
      [{id: "line_1", countedQuantity: "2.5"}],
    );
  });

  it("rejects an empty line list", async () => {
    await expect(
      updateStockCountLinesAction("count_1", {lines: []}),
    ).resolves.toEqual({ok: false, error: "invalidInput"});
  });

  it("posts and cancels a count", async () => {
    stockCount.postCount.mockResolvedValue(undefined);
    stockCount.cancelCount.mockResolvedValue(undefined);

    await expect(postStockCountAction({id: "count_1"})).resolves.toEqual({
      ok: true,
    });
    await expect(cancelStockCountAction({id: "count_1"})).resolves.toEqual({
      ok: true,
    });
  });

  it("maps an already posted count", async () => {
    stockCount.postCount.mockRejectedValue(
      new DomainError("INVALID_STATE_TRANSITION"),
    );

    await expect(postStockCountAction({id: "count_1"})).resolves.toEqual({
      ok: false,
      error: "invalidState",
    });
  });
});
