import {prisma} from "@/lib/prisma";
import type {
  PlanSourceName,
  PlanStatusName,
  ProductionPlanDetailRecord,
  ProductionPlanLineRecord,
  ProductionPlanSummaryRecord,
} from "@/lib/dto";
import {DomainError} from "@/server/domain/errors";
import {withTransaction} from "./transaction";

export type PlanLineInput = {
  itemId: string;
  recipeId: string | null;
  orderLineId: string | null;
  plannedQuantity: string;
  unitId: string;
  note: string | null;
};

export type PlanCreateInput = {
  siteId: string;
  plannedFor: Date;
  source: PlanSourceName;
  note: string | null;
  lines: PlanLineInput[];
};

export type PlanLineForBatch = {
  planId: string;
  planStatus: PlanStatusName;
  siteId: string;
  plannedFor: Date;
  lineId: string;
  quantity: string;
  unitKind: "MASS" | "VOLUME" | "COUNT" | "LENGTH";
  unitFactorToBase: string;
  recipeId: string | null;
  recipeName: string | null;
  recipeVersionId: string | null;
  recipeVersionStatus: string | null;
  yieldUnitId: string | null;
  yieldUnitKind: "MASS" | "VOLUME" | "COUNT" | "LENGTH" | null;
  yieldUnitFactorToBase: string | null;
  batchId: string | null;
  note: string | null;
};

export interface PlanningRepository {
  listPlans(
    organizationId: string,
    filters: {siteId: string; plannedFor: Date},
  ): Promise<ProductionPlanSummaryRecord[]>;
  findPlan(
    organizationId: string,
    id: string,
  ): Promise<ProductionPlanDetailRecord | null>;
  findOpenPlan(
    organizationId: string,
    siteId: string,
    plannedFor: Date,
  ): Promise<ProductionPlanSummaryRecord | null>;
  createPlan(
    organizationId: string,
    input: PlanCreateInput,
  ): Promise<string>;
  addLine(
    organizationId: string,
    planId: string,
    input: PlanLineInput,
  ): Promise<void>;
  updateLine(
    organizationId: string,
    planId: string,
    lineId: string,
    quantity: string,
  ): Promise<void>;
  removeLine(
    organizationId: string,
    planId: string,
    lineId: string,
  ): Promise<void>;
  confirm(organizationId: string, id: string): Promise<void>;
  close(organizationId: string, id: string): Promise<void>;
  cancel(organizationId: string, id: string): Promise<void>;
  findLineForBatch(
    organizationId: string,
    lineId: string,
  ): Promise<PlanLineForBatch | null>;
}

const summarySelect = {
  id: true,
  siteId: true,
  plannedFor: true,
  status: true,
  source: true,
  createdAt: true,
  site: {select: {name: true}},
  _count: {select: {lines: true}},
} as const;

type SelectedSummary = {
  id: string;
  siteId: string;
  plannedFor: Date;
  status: string;
  source: string;
  createdAt: Date;
  site: {name: string};
  _count: {lines: number};
};

function toSummary(plan: SelectedSummary): ProductionPlanSummaryRecord {
  return {
    id: plan.id,
    siteId: plan.siteId,
    siteName: plan.site.name,
    plannedFor: plan.plannedFor,
    status: plan.status as PlanStatusName,
    source: plan.source as PlanSourceName,
    lineCount: plan._count.lines,
    createdAt: plan.createdAt,
  };
}

export const planningRepository: PlanningRepository = {
  async listPlans(organizationId, filters) {
    const plans = await prisma.productionPlan.findMany({
      where: {
        organizationId,
        siteId: filters.siteId,
        plannedFor: filters.plannedFor,
      },
      orderBy: [{status: "asc"}, {createdAt: "desc"}],
      select: summarySelect,
    });

    return plans.map(toSummary);
  },

  async findPlan(organizationId, id) {
    const plan = await prisma.productionPlan.findFirst({
      where: {id, organizationId},
      select: {
        ...summarySelect,
        note: true,
        lines: {
          orderBy: {createdAt: "asc"},
          select: {
            id: true,
            itemId: true,
            item: {select: {code: true, name: true}},
            recipeId: true,
            recipe: {select: {name: true}},
            orderLineId: true,
            orderLine: {
              select: {
                orderId: true,
                order: {
                  select: {
                    number: true,
                    customer: {select: {name: true}},
                  },
                },
              },
            },
            plannedQuantity: true,
            unitId: true,
            unit: {select: {code: true}},
            note: true,
            batch: {select: {id: true, code: true}},
          },
        },
      },
    });

    if (!plan) return null;

    const lines: ProductionPlanLineRecord[] = plan.lines.map((line) => ({
      id: line.id,
      itemId: line.itemId,
      itemCode: line.item.code,
      itemName: line.item.name,
      recipeId: line.recipeId,
      recipeName: line.recipe?.name ?? null,
      orderId: line.orderLine?.orderId ?? null,
      orderNumber: line.orderLine?.order.number ?? null,
      customerName: line.orderLine?.order.customer.name ?? null,
      plannedQuantity: line.plannedQuantity.toString(),
      unitId: line.unitId,
      unitCode: line.unit.code,
      note: line.note,
      batchId: line.batch?.id ?? null,
      batchCode: line.batch?.code ?? null,
    }));

    return {
      ...toSummary(plan),
      note: plan.note,
      lines,
    };
  },

  async findOpenPlan(organizationId, siteId, plannedFor) {
    const plan = await prisma.productionPlan.findFirst({
      where: {
        organizationId,
        siteId,
        plannedFor,
        status: {in: ["DRAFT", "CONFIRMED"]},
      },
      orderBy: {createdAt: "desc"},
      select: summarySelect,
    });

    return plan ? toSummary(plan) : null;
  },

  async createPlan(organizationId, input) {
    return withTransaction(async (tx) => {
      const plan = await tx.productionPlan.create({
        data: {
          organizationId,
          siteId: input.siteId,
          plannedFor: input.plannedFor,
          source: input.source,
          note: input.note,
          status: "DRAFT",
          lines: {
            create: input.lines.map((line) => ({
              organizationId,
              ...line,
            })),
          },
        },
        select: {id: true},
      });

      return plan.id;
    });
  },

  async addLine(organizationId, planId, input) {
    await withTransaction(async (tx) => {
      const plan = await tx.productionPlan.findFirst({
        where: {id: planId, organizationId},
        select: {status: true},
      });
      if (!plan) throw new DomainError("NOT_FOUND");
      if (plan.status !== "DRAFT") {
        throw new DomainError("INVALID_STATE_TRANSITION");
      }

      if (input.orderLineId === null) {
        const existing = await tx.productionPlanLine.findFirst({
          where: {
            organizationId,
            productionPlanId: planId,
            itemId: input.itemId,
            orderLineId: null,
          },
          select: {id: true, plannedQuantity: true},
        });

        if (existing) {
          await tx.productionPlanLine.update({
            where: {id: existing.id},
            data: {
              plannedQuantity: existing.plannedQuantity.plus(
                input.plannedQuantity,
              ),
              note: input.note ?? undefined,
            },
          });
          return;
        }
      } else {
        const existing = await tx.productionPlanLine.findFirst({
          where: {
            productionPlanId: planId,
            orderLineId: input.orderLineId,
          },
          select: {id: true},
        });
        if (existing) throw new DomainError("CONFLICT");
      }

      await tx.productionPlanLine.create({
        data: {organizationId, productionPlanId: planId, ...input},
      });
    });
  },

  async updateLine(organizationId, planId, lineId, quantity) {
    await withTransaction(async (tx) => {
      const plan = await tx.productionPlan.findFirst({
        where: {id: planId, organizationId},
        select: {status: true},
      });
      if (!plan) throw new DomainError("NOT_FOUND");
      if (plan.status !== "DRAFT") {
        throw new DomainError("INVALID_STATE_TRANSITION");
      }

      const result = await tx.productionPlanLine.updateMany({
        where: {id: lineId, productionPlanId: planId, organizationId},
        data: {plannedQuantity: quantity},
      });
      if (result.count === 0) throw new DomainError("NOT_FOUND");
    });
  },

  async removeLine(organizationId, planId, lineId) {
    await withTransaction(async (tx) => {
      const plan = await tx.productionPlan.findFirst({
        where: {id: planId, organizationId},
        select: {status: true},
      });
      if (!plan) throw new DomainError("NOT_FOUND");
      if (plan.status !== "DRAFT") {
        throw new DomainError("INVALID_STATE_TRANSITION");
      }

      const result = await tx.productionPlanLine.deleteMany({
        where: {id: lineId, productionPlanId: planId, organizationId},
      });
      if (result.count === 0) throw new DomainError("NOT_FOUND");
    });
  },

  async confirm(organizationId, id) {
    const result = await prisma.productionPlan.updateMany({
      where: {id, organizationId, status: "DRAFT"},
      data: {status: "CONFIRMED"},
    });
    if (result.count === 0) throw new DomainError("INVALID_STATE_TRANSITION");
  },

  async close(organizationId, id) {
    const result = await prisma.productionPlan.updateMany({
      where: {id, organizationId, status: "CONFIRMED"},
      data: {status: "CLOSED"},
    });
    if (result.count === 0) throw new DomainError("INVALID_STATE_TRANSITION");
  },

  async cancel(organizationId, id) {
    const result = await prisma.productionPlan.updateMany({
      where: {
        id,
        organizationId,
        status: {in: ["DRAFT", "CONFIRMED"]},
      },
      data: {status: "CANCELLED"},
    });
    if (result.count === 0) throw new DomainError("INVALID_STATE_TRANSITION");
  },

  async findLineForBatch(organizationId, lineId) {
    const line = await prisma.productionPlanLine.findFirst({
      where: {id: lineId, organizationId},
      select: {
        id: true,
        plannedQuantity: true,
        note: true,
        unit: {select: {kind: true, factorToBase: true}},
        productionPlan: {
          select: {id: true, status: true, siteId: true, plannedFor: true},
        },
        recipe: {
          select: {
            id: true,
            name: true,
            currentVersion: {
              select: {
                id: true,
                status: true,
                yieldUnitId: true,
                yieldUnit: {select: {kind: true, factorToBase: true}},
              },
            },
          },
        },
        batch: {select: {id: true}},
      },
    });

    if (!line) return null;

    return {
      planId: line.productionPlan.id,
      planStatus: line.productionPlan.status as PlanStatusName,
      siteId: line.productionPlan.siteId,
      plannedFor: line.productionPlan.plannedFor,
      lineId: line.id,
      quantity: line.plannedQuantity.toString(),
      unitKind: line.unit.kind,
      unitFactorToBase: line.unit.factorToBase.toString(),
      recipeId: line.recipe?.id ?? null,
      recipeName: line.recipe?.name ?? null,
      recipeVersionId: line.recipe?.currentVersion?.id ?? null,
      recipeVersionStatus: line.recipe?.currentVersion?.status ?? null,
      yieldUnitId: line.recipe?.currentVersion?.yieldUnitId ?? null,
      yieldUnitKind: line.recipe?.currentVersion?.yieldUnit.kind ?? null,
      yieldUnitFactorToBase:
        line.recipe?.currentVersion?.yieldUnit.factorToBase.toString() ?? null,
      batchId: line.batch?.id ?? null,
      note: line.note,
    };
  },
};
