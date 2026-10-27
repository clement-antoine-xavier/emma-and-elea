import {Decimal} from "@prisma/client/runtime/client";
import {can} from "@/lib/permissions";
import {
  assertOrganizationActor,
  assertPermission,
} from "@/server/auth/guards";
import type {Actor, OrganizationActor} from "@/server/auth/types";
import {DEFAULT_ORGANIZATION_SETTINGS} from "@/server/domain/organization-settings";
import {DomainError} from "@/server/domain/errors";
import {
  calendarDay,
  forecastQuantity,
  type ForecastHistoryPoint,
} from "@/server/domain/forecast";
import {convertQuantity, roundQuantity} from "@/server/domain/units";
import type {
  OrderDemandRecord,
  PlanningBoardRecord,
  PlanSourceName,
  ProductionPlanDetailRecord,
} from "@/lib/dto";
import type {ForecastRepository} from "@/server/repositories/forecast.repository";
import type {
  PlanningRepository,
} from "@/server/repositories/planning.repository";
import type {ProductionRepository} from "@/server/repositories/production.repository";
import type {StockRepository} from "@/server/repositories/stock.repository";
import type {OrganizationSettingsRepository} from "@/server/repositories/organization-settings.repository";
import type {SiteRepository} from "@/server/repositories/site.repository";

export type PlanningFilters = {
  siteId?: string | string[];
  date?: string | string[];
};

export type PlanningOptions = {
  sites: {id: string; name: string; code: string}[];
  items: {
    itemId: string;
    itemCode: string;
    itemName: string;
    recipeId: string;
    recipeName: string;
    stockUnitId: string;
    stockUnitCode: string;
  }[];
};

export type PlanLineValues = {
  itemId: string;
  quantity: string;
  note: string | null;
};

export interface PlanningService {
  getBoard(
    actor: Actor | null,
    filters: PlanningFilters,
  ): Promise<{
    board: PlanningBoardRecord;
    options: PlanningOptions;
    canWrite: boolean;
  }>;
  getPlan(
    actor: Actor | null,
    id: string,
  ): Promise<{
    plan: ProductionPlanDetailRecord;
    options: PlanningOptions;
    canWrite: boolean;
  } | null>;
  createPlan(
    actor: Actor | null,
    input: {
      siteId: string;
      plannedFor: Date;
      includeForecast: boolean;
      includeOrders: boolean;
      note: string | null;
    },
  ): Promise<{id: string}>;
  addLine(
    actor: Actor | null,
    planId: string,
    input: PlanLineValues,
  ): Promise<void>;
  updateLine(
    actor: Actor | null,
    planId: string,
    lineId: string,
    quantity: string,
  ): Promise<void>;
  removeLine(
    actor: Actor | null,
    planId: string,
    lineId: string,
  ): Promise<void>;
  confirmPlan(actor: Actor | null, id: string): Promise<void>;
  closePlan(actor: Actor | null, id: string): Promise<void>;
  cancelPlan(actor: Actor | null, id: string): Promise<void>;
  createBatchFromLine(
    actor: Actor | null,
    lineId: string,
  ): Promise<{batchId: string}>;
}

function single(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function parseDate(value: string, fallback: Date): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return fallback;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function canWrite(actor: OrganizationActor): boolean {
  return can(actor.role, "production:write");
}

export function createPlanningService(deps: {
  planningRepository: PlanningRepository;
  forecastRepository: ForecastRepository;
  stockRepository: StockRepository;
  productionRepository: ProductionRepository;
  settingsRepository: OrganizationSettingsRepository;
  siteRepository: SiteRepository;
}): PlanningService {
  async function buildOptions(
    organizationId: string,
  ): Promise<PlanningOptions> {
    const [sites, items] = await Promise.all([
      deps.siteRepository.list(organizationId),
      deps.forecastRepository.listItems(organizationId),
    ]);

    return {
      sites: sites
        .filter((site) => !site.archivedAt)
        .map((site) => ({id: site.id, name: site.name, code: site.code})),
      items: items.map((item) => ({
        itemId: item.itemId,
        itemCode: item.itemCode,
        itemName: item.itemName,
        recipeId: item.recipeId,
        recipeName: item.recipeName,
        stockUnitId: item.stockUnitId,
        stockUnitCode: item.stockUnitCode,
      })),
    };
  }

  async function buildBoard(
    organizationId: string,
    siteId: string | null,
    plannedFor: Date,
  ): Promise<PlanningBoardRecord> {
    const settings =
      (await deps.settingsRepository.get(organizationId)) ??
      DEFAULT_ORGANIZATION_SETTINGS;
    const historyDays = settings.forecastHistoryDays;
    const from = addDays(plannedFor, -historyDays);
    const to = addDays(plannedFor, -1);

    const [sites, items, history, uplift, orders, levels, plans] =
      await Promise.all([
        deps.siteRepository.list(organizationId),
        deps.forecastRepository.listItems(organizationId),
        siteId
          ? deps.forecastRepository.salesHistory(
              organizationId,
              siteId,
              from,
              to,
            )
          : Promise.resolve([]),
        siteId
          ? deps.forecastRepository.eventUplift(
              organizationId,
              siteId,
              plannedFor,
            )
          : Promise.resolve([]),
        siteId
          ? deps.forecastRepository.orderDemand(
              organizationId,
              siteId,
              plannedFor,
            )
          : Promise.resolve([]),
        siteId
          ? deps.stockRepository.listLevels(organizationId)
          : Promise.resolve([]),
        siteId
          ? deps.planningRepository.listPlans(organizationId, {
              siteId,
              plannedFor,
            })
          : Promise.resolve([]),
      ]);

    const site = siteId
      ? sites.find((candidate) => candidate.id === siteId) ?? null
      : null;
    const itemById = new Map(items.map((item) => [item.itemId, item]));
    const levelByItem = new Map(
      levels
        .filter((level) => level.siteId === siteId)
        .map((level) => [level.itemId, level.quantity]),
    );

    const historyByItem = new Map<string, ForecastHistoryPoint[]>();
    for (const row of history) {
      const item = itemById.get(row.itemId);
      if (!item) continue;
      const quantity = roundQuantity(
        convertQuantity(
          row.quantity,
          {
            code: "sales",
            kind: row.unitKind,
            factorToBase: row.unitFactorToBase,
          },
          {
            code: item.stockUnitCode,
            kind: item.stockUnitKind,
            factorToBase: item.stockUnitFactorToBase,
          },
        ),
      );
      const points = historyByItem.get(row.itemId) ?? [];
      points.push({businessDate: row.businessDate, quantity});
      historyByItem.set(row.itemId, points);
    }

    const eventUplift = uplift.reduce(
      (total, value) => total.plus(value),
      new Decimal(0),
    );

    const suggestions = items.flatMap((item) => {
      const result = forecastQuantity({
        targetDate: plannedFor,
        from,
        to,
        history: historyByItem.get(item.itemId) ?? [],
        safetyPct: settings.forecastSafetyPct,
        eventUpliftPct: eventUplift,
      });
      if (result.suggestedQuantity.lessThanOrEqualTo(0)) return [];

      return [
        {
          itemId: item.itemId,
          itemCode: item.itemCode,
          itemName: item.itemName,
          recipeId: item.recipeId,
          recipeName: item.recipeName,
          historyQuantity: result.historyQuantity.toString(),
          averageQuantity: result.averageQuantity.toString(),
          suggestedQuantity: result.suggestedQuantity.toString(),
          unitId: item.stockUnitId,
          unitCode: item.stockUnitCode,
          stockQuantity: (levelByItem.get(item.itemId) ?? "0").toString(),
          basis: result.basis,
        },
      ];
    });

    const orderRecords: OrderDemandRecord[] = orders.flatMap((row) => {
      const remaining = new Decimal(row.quantity).minus(
        row.fulfilledQuantity,
      );
      if (remaining.lessThanOrEqualTo(0)) return [];

      const quantity = roundQuantity(
        convertQuantity(
          remaining,
          {
            code: "order",
            kind: row.unitKind,
            factorToBase: row.unitFactorToBase,
          },
          {
            code: row.stockUnitCode,
            kind: row.stockUnitKind,
            factorToBase: row.stockUnitFactorToBase,
          },
        ),
      );
      if (quantity.lessThanOrEqualTo(0)) return [];

      const item = itemById.get(row.itemId);
      return [
        {
          orderId: row.orderId,
          orderNumber: row.orderNumber,
          customerName: row.customerName,
          orderLineId: row.orderLineId,
          itemId: row.itemId,
          itemCode: row.itemCode,
          itemName: row.itemName,
          quantity: quantity.toString(),
          unitId: row.stockUnitId,
          unitCode: row.stockUnitCode,
          recipeId: item?.recipeId ?? null,
          recipeName: item?.recipeName ?? null,
        },
      ];
    });

    return {
      siteId: site?.id ?? null,
      siteName: site?.name ?? null,
      plannedFor,
      historyFrom: from,
      historyTo: to,
      historyDays,
      safetyPct: settings.forecastSafetyPct,
      eventUpliftPct: eventUplift.isZero() ? null : eventUplift.toString(),
      suggestions,
      orders: orderRecords,
      plans,
      openPlanId:
        plans.find(
          (plan) => plan.status === "DRAFT" || plan.status === "CONFIRMED",
        )?.id ?? null,
    };
  }

  return {
    async getBoard(actorInput, filters) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "production:read");

      const options = await buildOptions(actor.organizationId);
      const requestedSite = single(filters.siteId);
      const siteId =
        options.sites.find((site) => site.id === requestedSite)?.id ??
        options.sites[0]?.id ??
        null;
      const tomorrow = addDays(calendarDay(new Date()), 1);
      const plannedFor = parseDate(single(filters.date), tomorrow);
      const board = await buildBoard(
        actor.organizationId,
        siteId,
        plannedFor,
      );

      return {board, options, canWrite: canWrite(actor)};
    },

    async getPlan(actorInput, id) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "production:read");

      const plan = await deps.planningRepository.findPlan(
        actor.organizationId,
        id,
      );
      if (!plan) return null;

      return {
        plan,
        options: await buildOptions(actor.organizationId),
        canWrite: canWrite(actor),
      };
    },

    async createPlan(actorInput, input) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "production:write");

      const site = await deps.siteRepository.findById(
        actor.organizationId,
        input.siteId,
      );
      if (!site) throw new DomainError("NOT_FOUND");

      const plannedFor = calendarDay(input.plannedFor);
      const open = await deps.planningRepository.findOpenPlan(
        actor.organizationId,
        input.siteId,
        plannedFor,
      );
      if (open) throw new DomainError("CONFLICT");

      const board = await buildBoard(
        actor.organizationId,
        input.siteId,
        plannedFor,
      );
      const forecastLines = input.includeForecast
        ? board.suggestions.map((suggestion) => ({
            itemId: suggestion.itemId,
            recipeId: suggestion.recipeId,
            orderLineId: null,
            plannedQuantity: suggestion.suggestedQuantity,
            unitId: suggestion.unitId,
            note: null,
          }))
        : [];
      const orderLines = input.includeOrders
        ? board.orders.map((order) => ({
            itemId: order.itemId,
            recipeId: order.recipeId,
            orderLineId: order.orderLineId,
            plannedQuantity: order.quantity,
            unitId: order.unitId,
            note: `${order.orderNumber} · ${order.customerName}`,
          }))
        : [];

      const lines = [...forecastLines, ...orderLines].filter(
        (line) => line.unitId !== "" && Number(line.plannedQuantity) > 0,
      );
      const source: PlanSourceName =
        forecastLines.length > 0 && orderLines.length > 0
          ? "MIXED"
          : orderLines.length > 0
            ? "ORDERS"
            : forecastLines.length > 0
              ? "FORECAST"
              : "MANUAL";

      return {
        id: await deps.planningRepository.createPlan(
          actor.organizationId,
          {
            siteId: input.siteId,
            plannedFor,
            source,
            note: input.note,
            lines,
          },
        ),
      };
    },

    async addLine(actorInput, planId, input) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "production:write");

      const [plan, items] = await Promise.all([
        deps.planningRepository.findPlan(actor.organizationId, planId),
        deps.forecastRepository.listItems(actor.organizationId),
      ]);
      if (!plan) throw new DomainError("NOT_FOUND");

      const item = items.find(
        (candidate) => candidate.itemId === input.itemId,
      );
      if (!item) throw new DomainError("NOT_FOUND");
      if (Number(input.quantity) <= 0) throw new DomainError("INVALID_INPUT");

      await deps.planningRepository.addLine(actor.organizationId, planId, {
        itemId: item.itemId,
        recipeId: item.recipeId,
        orderLineId: null,
        plannedQuantity: input.quantity,
        unitId: item.stockUnitId,
        note: input.note,
      });
    },

    async updateLine(actorInput, planId, lineId, quantity) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "production:write");
      if (Number(quantity) <= 0) throw new DomainError("INVALID_INPUT");

      const plan = await deps.planningRepository.findPlan(
        actor.organizationId,
        planId,
      );
      if (!plan) throw new DomainError("NOT_FOUND");

      await deps.planningRepository.updateLine(
        actor.organizationId,
        planId,
        lineId,
        quantity,
      );
    },

    async removeLine(actorInput, planId, lineId) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "production:write");

      const plan = await deps.planningRepository.findPlan(
        actor.organizationId,
        planId,
      );
      if (!plan) throw new DomainError("NOT_FOUND");

      await deps.planningRepository.removeLine(
        actor.organizationId,
        planId,
        lineId,
      );
    },

    async confirmPlan(actorInput, id) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "production:write");

      const plan = await deps.planningRepository.findPlan(
        actor.organizationId,
        id,
      );
      if (!plan) throw new DomainError("NOT_FOUND");
      if (plan.status !== "DRAFT" || plan.lines.length === 0) {
        throw new DomainError("INVALID_STATE_TRANSITION");
      }

      await deps.planningRepository.confirm(actor.organizationId, id);
    },

    async closePlan(actorInput, id) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "production:write");

      await deps.planningRepository.close(actor.organizationId, id);
    },

    async cancelPlan(actorInput, id) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "production:write");

      await deps.planningRepository.cancel(actor.organizationId, id);
    },

    async createBatchFromLine(actorInput, lineId) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "production:write");

      const line = await deps.planningRepository.findLineForBatch(
        actor.organizationId,
        lineId,
      );
      if (!line) throw new DomainError("NOT_FOUND");
      if (line.planStatus !== "CONFIRMED") {
        throw new DomainError("INVALID_STATE_TRANSITION");
      }
      if (line.batchId) throw new DomainError("INVALID_STATE_TRANSITION");
      if (
        !line.recipeVersionId ||
        line.recipeVersionStatus !== "PUBLISHED" ||
        !line.yieldUnitId ||
        !line.yieldUnitKind ||
        !line.yieldUnitFactorToBase
      ) {
        throw new DomainError("INVALID_STATE_TRANSITION");
      }

      const plannedQuantity = roundQuantity(
        convertQuantity(
          line.quantity,
          {
            code: "plan",
            kind: line.unitKind,
            factorToBase: line.unitFactorToBase,
          },
          {
            code: line.yieldUnitId,
            kind: line.yieldUnitKind,
            factorToBase: line.yieldUnitFactorToBase,
          },
        ),
      );
      if (plannedQuantity.lessThanOrEqualTo(0)) {
        throw new DomainError("INVALID_INPUT");
      }

      const batchId = await deps.productionRepository.createBatch(
        actor.organizationId,
        {
          siteId: line.siteId,
          recipeVersionId: line.recipeVersionId,
          productionPlanLineId: line.lineId,
          plannedQuantity: plannedQuantity.toString(),
          unitId: line.yieldUnitId,
          plannedStartAt: null,
          note: line.note,
        },
      );

      return {batchId};
    },
  };
}
