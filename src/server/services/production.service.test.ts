import {createProductionService} from "@/server/services/production.service";
import type {ProductionRepository} from "@/server/repositories/production.repository";
import type {CostingRepository} from "@/server/repositories/costing.repository";
import type {TaskRepository} from "@/server/repositories/task.repository";
import type {BatchCompletionInput} from "@/server/repositories/production.repository";
import type {AvailableLot} from "@/server/domain/production";
import type {
  ProductionBatchDetailRecord,
  ProductionBatchSummaryRecord,
  RecipeOperationRecord,
} from "@/lib/dto";
import {actorFor} from "@/test-utils/actor";

const summary: ProductionBatchSummaryRecord = {
  id: "batch_1",
  code: "B-1",
  status: "PLANNED",
  siteName: "Atelier",
  recipeName: "Croissant",
  versionNumber: 1,
  plannedQuantity: "10",
  actualQuantity: null,
  unitCode: "piece",
  producedOn: null,
  createdAt: new Date("2026-10-27T08:00:00.000Z"),
};

const line = {
  id: "line_1",
  itemId: "item_flour",
  itemCode: "FLOUR",
  itemName: "Flour",
  itemType: "RAW_MATERIAL" as const,
  quantity: "1",
  unitId: "unit_kg",
  unitCode: "kg",
  unitKind: "MASS",
  unitFactorToBase: "1",
  itemStockUnitId: "unit_kg",
  itemStockUnitCode: "kg",
  itemStockUnitKind: "MASS",
  itemStockUnitFactorToBase: "1",
  lossPct: "10",
  isOptional: false,
  position: 1,
  note: null,
};

const operation: RecipeOperationRecord = {
  id: "operation_1",
  name: "Bake",
  description: null,
  position: 1,
  durationMinutes: 60,
  activeMinutes: 30,
  equipmentId: null,
  equipmentName: null,
  equipmentPowerKw: null,
  equipmentSiteId: null,
  labourRateId: "rate_1",
  labourRateLabel: "Baker",
  requiredSkillId: null,
  requiredSkillName: null,
};

const batch: ProductionBatchDetailRecord = {
  ...summary,
  siteId: "site_1",
  recipeId: "recipe_1",
  recipeVersionId: "version_1",
  recipeVersionNumber: 1,
  recipeYieldQuantity: "10",
  recipeYieldUnitId: "unit_piece",
  recipeYieldUnitCode: "piece",
  recipeYieldUnitKind: "COUNT",
  recipeYieldUnitFactorToBase: "1",
  outputItemId: "item_croissant",
  outputItemName: "Croissant",
  outputSalePrice: "2",
  outputStockUnitId: "unit_piece",
  outputStockUnitCode: "piece",
  outputStockUnitKind: "COUNT",
  outputStockUnitFactorToBase: "1",
  outputShelfLifeDays: 3,
  unitId: "unit_piece",
  unitCode: "piece",
  unitKind: "COUNT",
  unitFactorToBase: "1",
  plannedStartAt: null,
  startedAt: null,
  completedAt: null,
  note: null,
  inputs: [],
  outputs: [],
  recipeLines: [line],
  recipeOperations: [operation],
  cost: null,
};

const flourLot: AvailableLot = {
  id: "lot_flour",
  lotNumber: "ATL-1",
  itemId: "item_flour",
  itemName: "Flour",
  itemType: "RAW_MATERIAL",
  quantityRemaining: "10",
  unitCost: "1",
  unitId: "unit_kg",
  unitCode: "kg",
  unitKind: "MASS",
  unitFactorToBase: "1",
  expiresOn: new Date("2026-10-01T00:00:00.000Z"),
  receivedAt: new Date("2026-09-01T00:00:00.000Z"),
};

function dependencies(overrides: {
  productionRepository?: Partial<ProductionRepository>;
  costingRepository?: Partial<CostingRepository>;
} = {}) {
  const productionRepository = {
    listBatches: jest.fn().mockResolvedValue([summary]),
    findBatch: jest.fn().mockResolvedValue(batch),
    createBatch: jest.fn().mockResolvedValue("batch_1"),
    startBatch: jest.fn().mockResolvedValue(undefined),
    cancelBatch: jest.fn().mockResolvedValue(undefined),
    listAvailableLots: jest.fn().mockResolvedValue([flourLot]),
    complete: jest.fn().mockResolvedValue(undefined),
    options: jest.fn().mockResolvedValue({
      recipes: [
        {
          recipeId: "recipe_1",
          recipeVersionId: "version_1",
          name: "Croissant",
          versionNumber: 1,
          outputItemName: "Croissant",
          yieldUnitId: "unit_piece",
          yieldUnitCode: "piece",
        },
      ],
      sites: [{id: "site_1", name: "Atelier", code: "ATL"}],
    }),
    listWaste: jest.fn().mockResolvedValue([]),
    wasteOptions: jest.fn().mockResolvedValue({lots: [], lossReasons: []}),
    recordWaste: jest.fn().mockResolvedValue(undefined),
    archiveWaste: jest.fn().mockResolvedValue(undefined),
    trace: jest.fn().mockResolvedValue(null),
    ...overrides.productionRepository,
  } as unknown as ProductionRepository;
  const costingRepository = {
    getSettings: jest.fn().mockResolvedValue({
      currency: "EUR",
      overheadPct: "10",
      defaultLabourRateId: "rate_1",
    }),
    resolveLabourRates: jest.fn().mockResolvedValue([
      {id: "rate_1", siteId: null, hourlyCost: "12"},
    ]),
    resolveEnergyTariffs: jest.fn().mockResolvedValue([
      {siteId: "site_1", pricePerKwh: "0.2"},
    ]),
    ...overrides.costingRepository,
  } as unknown as CostingRepository;

  const taskRepository = {
    generateForBatch: jest.fn().mockResolvedValue(undefined),
  } as unknown as TaskRepository;

  return {
    productionRepository,
    costingRepository,
    taskRepository,
    service: createProductionService({
      productionRepository,
      costingRepository,
      taskRepository,
    }),
  };
}

describe("production service", () => {
  it("lists batches with write and execute capabilities", async () => {
    const {service, productionRepository} = dependencies();

    await expect(service.getBatches(actorFor("staff"))).resolves.toEqual({
      batches: [summary],
      canWrite: false,
      canExecute: true,
    });
    expect(productionRepository.listBatches).toHaveBeenCalledWith("org_1");

    await expect(
      service.getBatches(actorFor("production_manager")),
    ).resolves.toMatchObject({canWrite: true, canExecute: true});
  });

  it("requires production:read", async () => {
    const {service} = dependencies();

    await expect(service.getBatches(null)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(
      service.getBatch(null, "batch_1"),
    ).rejects.toMatchObject({code: "FORBIDDEN"});

    // Every organization role can read production, the staff role included.
    await expect(
      service.getBatch(actorFor("stock_manager"), "batch_1"),
    ).resolves.toBeDefined();
  });

  it("returns a batch detail or null", async () => {
    const {service} = dependencies();

    await expect(
      service.getBatch(actorFor("staff"), "batch_1"),
    ).resolves.toEqual({batch, canWrite: false, canExecute: true});

    const empty = dependencies({
      productionRepository: {findBatch: jest.fn().mockResolvedValue(null)},
    });
    await expect(
      empty.service.getBatch(actorFor("staff"), "missing"),
    ).resolves.toBeNull();
  });

  it("creates a batch from a listed recipe version and site", async () => {
    const {service, productionRepository} = dependencies();

    await expect(
      service.createBatch(actorFor("production_manager"), {
        siteId: "site_1",
        recipeVersionId: "version_1",
        plannedQuantity: "10",
        plannedStartAt: null,
        note: null,
      }),
    ).resolves.toEqual({id: "batch_1"});
    expect(productionRepository.createBatch).toHaveBeenCalledWith("org_1", {
      siteId: "site_1",
      recipeVersionId: "version_1",
      plannedQuantity: "10",
      unitId: "unit_piece",
      plannedStartAt: null,
      note: null,
    });
  });

  it("rejects a non-positive planned quantity and unknown references", async () => {
    const {service} = dependencies();

    await expect(
      service.createBatch(actorFor("production_manager"), {
        siteId: "site_1",
        recipeVersionId: "version_1",
        plannedQuantity: "0",
        plannedStartAt: null,
        note: null,
      }),
    ).rejects.toMatchObject({code: "INVALID_INPUT"});

    await expect(
      service.createBatch(actorFor("production_manager"), {
        siteId: "site_1",
        recipeVersionId: "missing",
        plannedQuantity: "10",
        plannedStartAt: null,
        note: null,
      }),
    ).rejects.toMatchObject({code: "NOT_FOUND"});
  });

  it("starts a batch with execute and cancels it with write", async () => {
    const {service, productionRepository} = dependencies();

    await expect(
      service.startBatch(actorFor("staff"), "batch_1"),
    ).resolves.toBeUndefined();
    await expect(
      service.cancelBatch(actorFor("production_manager"), "batch_1"),
    ).resolves.toBeUndefined();
    expect(productionRepository.startBatch).toHaveBeenCalledWith(
      "org_1",
      "batch_1",
    );
    expect(productionRepository.cancelBatch).toHaveBeenCalledWith(
      "org_1",
      "batch_1",
    );
  });

  it("keeps execute away from roles without it", async () => {
    const {service} = dependencies();

    await expect(
      service.startBatch(actorFor("stock_manager"), "batch_1"),
    ).rejects.toMatchObject({code: "FORBIDDEN"});
    await expect(
      service.completeBatch(actorFor("sales"), "batch_1", {
        actualQuantity: "10",
        producedOn: null,
      }),
    ).rejects.toMatchObject({code: "FORBIDDEN"});
  });

  it("completes a batch, scales the recipe and persists the cost", async () => {
    const {service, productionRepository} = dependencies();

    await service.completeBatch(actorFor("production_manager"), "batch_1", {
      actualQuantity: "20",
      producedOn: new Date("2026-10-27T00:00:00.000Z"),
    });

    const plan = (
      productionRepository.complete as jest.Mock
    ).mock.calls[0][2] as BatchCompletionInput;

    expect(plan.inputs).toEqual([
      {
        lotId: "lot_flour",
        itemId: "item_flour",
        quantity: "2.2000",
        unitId: "unit_kg",
        unitCost: "1",
        theoreticalQuantity: "2.2000",
      },
    ]);
    expect(plan.output).toMatchObject({
      itemId: "item_croissant",
      quantity: "20",
      unitId: "unit_piece",
      expiresOn: new Date("2026-10-30T00:00:00.000Z"),
    });
    expect(plan.cost).toMatchObject({
      currency: "EUR",
      yieldQuantity: "20",
      yieldUnitId: "unit_piece",
    });
    // Material 2.20 + labour 6.00, then 10% overhead on the subtotal.
    expect(plan.cost.totalCost).toBe("9.02");
    expect(plan.cost.costPerUnit).toBe("0.451");
    expect(plan.cost.lines.map((costLine) => costLine.kind)).toEqual([
      "MATERIAL",
      "LABOUR",
      "OVERHEAD",
    ]);
  });

  it("defaults the production day to today", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-10-27T15:00:00.000Z"));
    const {service, productionRepository} = dependencies();

    await service.completeBatch(actorFor("production_manager"), "batch_1", {
      actualQuantity: "10",
      producedOn: null,
    });

    const plan = (
      productionRepository.complete as jest.Mock
    ).mock.calls[0][2] as BatchCompletionInput;
    expect(plan.producedOn).toEqual(new Date("2026-10-27T00:00:00.000Z"));
    jest.useRealTimers();
  });

  it("rejects a missing, non-open or empty batch", async () => {
    const {service} = dependencies({
      productionRepository: {findBatch: jest.fn().mockResolvedValue(null)},
    });
    await expect(
      service.completeBatch(actorFor("production_manager"), "missing", {
        actualQuantity: "1",
        producedOn: null,
      }),
    ).rejects.toMatchObject({code: "NOT_FOUND"});

    const closed = dependencies({
      productionRepository: {
        findBatch: jest.fn().mockResolvedValue({...batch, status: "COMPLETED"}),
      },
    });
    await expect(
      closed.service.completeBatch(actorFor("production_manager"), "batch_1", {
        actualQuantity: "1",
        producedOn: null,
      }),
    ).rejects.toMatchObject({code: "INVALID_STATE_TRANSITION"});

    const empty = dependencies({
      productionRepository: {
        findBatch: jest.fn().mockResolvedValue({...batch, recipeLines: []}),
      },
    });
    await expect(
      empty.service.completeBatch(actorFor("production_manager"), "batch_1", {
        actualQuantity: "1",
        producedOn: null,
      }),
    ).rejects.toMatchObject({code: "INVALID_INPUT"});
  });

  it.each(["0", "-1", "abc", ""])(
    "rejects the actual quantity %p",
    async (actualQuantity) => {
      const {service} = dependencies();

      await expect(
        service.completeBatch(actorFor("production_manager"), "batch_1", {
          actualQuantity,
          producedOn: null,
        }),
      ).rejects.toMatchObject({code: "INVALID_INPUT"});
    },
  );

  it("rejects a shortage with the item detail", async () => {
    const {service} = dependencies({
      productionRepository: {
        listAvailableLots: jest
          .fn()
          .mockResolvedValue([{...flourLot, quantityRemaining: "1"}]),
      },
    });

    await expect(
      service.completeBatch(actorFor("production_manager"), "batch_1", {
        actualQuantity: "20",
        producedOn: null,
      }),
    ).rejects.toMatchObject({
      code: "INSUFFICIENT_STOCK",
      message: expect.stringContaining("Flour"),
    });
  });

  it("merges several recipe lines that consume the same lot", async () => {
    const mergedLine = {...line, id: "line_2", quantity: "0.5"};
    const {service, productionRepository} = dependencies({
      productionRepository: {
        findBatch: jest
          .fn()
          .mockResolvedValue({...batch, recipeLines: [line, mergedLine]}),
        listAvailableLots: jest.fn().mockResolvedValue([
          {...flourLot, quantityRemaining: "100"},
        ]),
      },
    });

    await service.completeBatch(actorFor("production_manager"), "batch_1", {
      actualQuantity: "10",
      producedOn: null,
    });

    const plan = (
      productionRepository.complete as jest.Mock
    ).mock.calls[0][2] as BatchCompletionInput;
    expect(plan.inputs).toHaveLength(1);
    expect(plan.inputs[0].quantity).toBe("1.6500");
  });

  it("skips optional lines and their missing stock", async () => {
    const optional = {
      ...line,
      id: "line_optional",
      itemId: "item_sugar",
      itemName: "Sugar",
      isOptional: true,
    };
    const {service, productionRepository} = dependencies({
      productionRepository: {
        findBatch: jest
          .fn()
          .mockResolvedValue({...batch, recipeLines: [line, optional]}),
      },
    });

    await service.completeBatch(actorFor("production_manager"), "batch_1", {
      actualQuantity: "10",
      producedOn: null,
    });

    const plan = (
      productionRepository.complete as jest.Mock
    ).mock.calls[0][2] as BatchCompletionInput;
    expect(plan.inputs.map((row) => row.itemId)).toEqual(["item_flour"]);
  });

  it("converts a gram yield to the output stock unit", async () => {
    const grams = {
      ...batch,
      recipeYieldQuantity: "1000",
      recipeYieldUnitId: "unit_g",
      recipeYieldUnitCode: "g",
      recipeYieldUnitKind: "MASS",
      recipeYieldUnitFactorToBase: "0.001",
      unitId: "unit_g",
      unitCode: "g",
      unitKind: "MASS",
      unitFactorToBase: "0.001",
      outputStockUnitId: "unit_kg",
      outputStockUnitCode: "kg",
      outputStockUnitKind: "MASS",
      outputStockUnitFactorToBase: "1",
      recipeLines: [
        {
          ...line,
          quantity: "500",
          unitId: "unit_g",
          unitCode: "g",
          unitKind: "MASS",
          unitFactorToBase: "0.001",
        },
      ],
    };
    const {service, productionRepository} = dependencies({
      productionRepository: {findBatch: jest.fn().mockResolvedValue(grams)},
    });

    await service.completeBatch(actorFor("production_manager"), "batch_1", {
      actualQuantity: "1000",
      producedOn: null,
    });

    const plan = (
      productionRepository.complete as jest.Mock
    ).mock.calls[0][2] as BatchCompletionInput;
    expect(plan.output.quantity).toBe("1");
  });

  it("blocks completion when a labour rate is missing", async () => {
    const {service} = dependencies({
      costingRepository: {
        getSettings: jest.fn().mockResolvedValue({
          currency: "EUR",
          overheadPct: "10",
          defaultLabourRateId: null,
        }),
        resolveLabourRates: jest.fn().mockResolvedValue([]),
      },
    });

    await expect(
      service.completeBatch(actorFor("production_manager"), "batch_1", {
        actualQuantity: "10",
        producedOn: null,
      }),
    ).rejects.toMatchObject({
      code: "MISSING_PRICE",
      message: expect.stringContaining("MISSING_RATE"),
    });
  });

  it("lists options, waste and trace data", async () => {
    const {service} = dependencies();

    await expect(
      service.getOptions(actorFor("staff")),
    ).resolves.toMatchObject({sites: [{id: "site_1"}]});
    await expect(service.getWaste(actorFor("staff"))).resolves.toEqual([]);
    await expect(service.getWasteOptions(actorFor("staff"))).resolves.toEqual({
      lots: [],
      lossReasons: [],
    });
    await expect(
      service.getTrace(actorFor("staff"), "lot_1"),
    ).resolves.toBeNull();
  });

  it("records and archives waste", async () => {
    const {service, productionRepository} = dependencies();
    const input = {
      lotId: "lot_1",
      lossReasonId: "reason_1",
      quantity: "2",
      reason: null,
      recordedAt: new Date("2026-10-27T00:00:00.000Z"),
    };

    await expect(
      service.recordWaste(actorFor("staff"), input),
    ).resolves.toBeUndefined();
    expect(productionRepository.recordWaste).toHaveBeenCalledWith(
      "org_1",
      input,
      "user_1",
    );

    await expect(
      service.archiveWaste(actorFor("staff"), "waste_1"),
    ).resolves.toBeUndefined();
    expect(productionRepository.archiveWaste).toHaveBeenCalledWith(
      "org_1",
      "waste_1",
    );
  });

  it("rejects a non-positive waste quantity", async () => {
    const {service} = dependencies();

    await expect(
      service.recordWaste(actorFor("staff"), {
        lotId: "lot_1",
        lossReasonId: "reason_1",
        quantity: "0",
        reason: null,
        recordedAt: new Date(),
      }),
    ).rejects.toMatchObject({code: "INVALID_INPUT"});
  });
});
