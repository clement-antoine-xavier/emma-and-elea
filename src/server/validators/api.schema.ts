import {z} from "zod";
import {
  decimalString,
  isoDateString,
  optionalIsoDateString,
} from "@/server/validators/shared";
import {
  ITEM_TYPES,
  categoryInputSchema,
  itemInputSchema,
} from "@/server/validators/catalog.schema";
import {supplierInputSchema} from "@/server/validators/supplier.schema";
import {customerInputSchema} from "@/server/validators/customer.schema";
import {
  receiptDraftSchema,
  receiptLineSchema as receiptLineFieldsSchema,
} from "@/server/validators/purchasing.schema";
import {
  completeBatchSchema,
  productionBatchSchema,
  wasteSchema,
} from "@/server/validators/production.schema";
import {
  planInputSchema,
  planLineInputSchema,
} from "@/server/validators/planning.schema";
import {
  recipeInputSchema,
  recipeLineInputSchema,
  recipeOperationInputSchema,
  recipeVersionInputSchema,
} from "@/server/validators/recipe.schema";
import {
  orderInputSchema,
  orderLineInputSchema,
  dispatchInputSchema,
  dispatchLineInputSchema,
  dailySalesInputSchema,
} from "@/server/validators/sales.schema";
import {apiValidation} from "./api.messages";

export const idSchema = z.object({
  id: z.string().trim().min(1).describe("Record identifier."),
});

export const listFiltersSchema = z.object({
  search: z.string().trim().max(120).optional(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
});

export const catalogFiltersSchema = listFiltersSchema.extend({
  type: z.enum(ITEM_TYPES).optional(),
  categoryId: z.string().trim().optional(),
  includeArchived: z.boolean().optional(),
});

export const stockLotFiltersSchema = listFiltersSchema.extend({
  includeEmpty: z.boolean().optional(),
});

export const catalogItemSchema = itemInputSchema(apiValidation.catalog);
export const recipeCreateSchema = recipeInputSchema(apiValidation.recipe);
export const recipeVersionUpdateSchema = recipeVersionInputSchema(
  apiValidation.recipe,
);
export const recipeLineCreateSchema = z.object({
  versionId: z.string().trim().min(1),
  line: recipeLineInputSchema(apiValidation.recipe),
});
export const recipeVersionCreateSchema = z.object({
  recipeId: z.string().trim().min(1),
  sourceVersionId: z.string().trim().optional(),
});
export const recipeOperationCreateSchema = z.object({
  versionId: z.string().trim().min(1),
  line: recipeOperationInputSchema(apiValidation.recipe),
});
export const recipeOperationRefSchema = z.object({
  versionId: z.string().trim().min(1),
  operationId: z.string().trim().min(1),
});
export const categoryCreateSchema = categoryInputSchema(apiValidation.catalog);
export const catalogItemUpdateSchema = catalogItemSchema.extend({
  id: z.string().trim().min(1),
});

export const supplierSchema = supplierInputSchema(apiValidation.supplier);
export const supplierUpdateSchema = supplierSchema.extend({
  id: z.string().trim().min(1),
});

export const customerSchema = customerInputSchema(apiValidation.customer);
export const customerUpdateSchema = customerSchema.extend({
  id: z.string().trim().min(1),
});

export const receiptSchema = receiptDraftSchema(apiValidation.purchasing);
export const receiptFiltersSchema = listFiltersSchema.extend({
  status: z.string().trim().optional(),
});
export const receiptLineSchema = z.object({
  receiptId: z.string().trim().min(1),
  line: receiptLineFieldsSchema(apiValidation.purchasing),
});

export const receiptLineRefSchema = z.object({
  receiptId: z.string().trim().min(1),
  lineId: z.string().trim().min(1),
});

export const stockCountCreateSchema = z.object({
  siteId: z.string().trim().min(1),
  countedAt: isoDateString("Counted date must be YYYY-MM-DD."),
  note: z.string().trim().max(300).default(""),
});

export const stockCountLinesSchema = z.object({
  countId: z.string().trim().min(1),
  lines: z
    .array(
      z.object({
        id: z.string().trim().min(1),
        countedQuantity: decimalString({
          message: "Counted quantity is not a valid amount.",
          min: 0,
          max: 1000000,
          scale: 4,
        }),
      }),
    )
    .min(1),
});

export const productionBatchInputSchema = productionBatchSchema(
  apiValidation.production,
);
export const productionCompleteSchema = completeBatchSchema(
  apiValidation.production,
).extend({id: z.string().trim().min(1)});
export const productionBatchIdSchema = z.object({
  id: z.string().trim().min(1),
});
export const wasteInputSchema = wasteSchema(apiValidation.production);

export const planningFiltersSchema = z.object({
  from: z.string().trim().optional(),
  to: z.string().trim().optional(),
});

export const planCreateSchema = planInputSchema(apiValidation.planning);
export const planLineSchema = planLineInputSchema(
  apiValidation.planning,
).extend({planId: z.string().trim().min(1)});
export const planLineUpdateSchema = z.object({
  planId: z.string().trim().min(1),
  lineId: z.string().trim().min(1),
  quantity: decimalString({
    message: "Quantity must be greater than zero.",
    min: 0,
    max: 1000000,
    scale: 4,
  }).refine(
    (value) => Number(value) > 0,
    "Quantity must be greater than zero.",
  ),
});
export const planLineRefSchema = z.object({
  planId: z.string().trim().min(1),
  lineId: z.string().trim().min(1),
});

export const orderCreateSchema = orderInputSchema(apiValidation.sales);
export const orderLineSchema = z.object({
  orderId: z.string().trim().min(1),
  line: orderLineInputSchema(apiValidation.sales),
});
export const orderLineRefSchema = z.object({
  orderId: z.string().trim().min(1),
  lineId: z.string().trim().min(1),
});

export const dispatchCreateSchema = dispatchInputSchema(apiValidation.sales);
export const dispatchLineSchema = z.object({
  dispatchId: z.string().trim().min(1),
  line: dispatchLineInputSchema(apiValidation.sales),
});
export const dispatchLineRefSchema = z.object({
  dispatchId: z.string().trim().min(1),
  lineId: z.string().trim().min(1),
});

export const dailySalesSchema = dailySalesInputSchema(apiValidation.sales);

export const dailySalesFiltersSchema = listFiltersSchema.extend({
  from: optionalIsoDateString("Date must be YYYY-MM-DD.").optional(),
  to: optionalIsoDateString("Date must be YYYY-MM-DD.").optional(),
  siteId: z.string().trim().optional(),
});

export const TASK_STATUSES = ["TODO", "IN_PROGRESS", "DONE", "BLOCKED"] as const;

export const taskFiltersSchema = z.object({
  date: z
    .string()
    .trim()
    .optional()
    .describe(
      "First day of the seven-day window (YYYY-MM-DD). Defaults to today.",
    ),
});

export const taskAssignSchema = z.object({
  taskId: z.string().trim().min(1),
  employeeId: z
    .string()
    .trim()
    .optional()
    .describe("Employee profile to assign. Send an empty string to unassign."),
});

export const taskStatusSchema = z.object({
  taskId: z.string().trim().min(1),
  status: z.enum(TASK_STATUSES),
});

export const taskSuggestionSchema = z.object({
  taskId: z.string().trim().min(1),
});
