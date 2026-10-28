import type {AssistantApprovalPreview} from "@/lib/assistant";
import {
  catalogService,
  dispatchService,
  orderService,
  planningService,
  productionService,
  purchasingService,
  recipeService,
  stockCountService,
  supplierService,
} from "@/server/services/container";
import type {AssistantContext} from "../context";

function labels(locale: "en" | "fr") {
  const fr = locale === "fr";

  return {
    customer: fr ? "Client" : "Customer",
    site: fr ? "Site" : "Site",
    status: fr ? "Statut" : "Status",
    date: fr ? "Date" : "Date",
    total: fr ? "Total" : "Total",
    lines: fr ? "Lignes" : "Lines",
    supplier: fr ? "Fournisseur" : "Supplier",
    plan: fr ? "Plan" : "Plan",
    batch: fr ? "Lot de production" : "Batch",
    recipe: fr ? "Recette" : "Recipe",
    version: fr ? "Version" : "Version",
    reason: fr ? "Motif" : "Reason",
    quantity: fr ? "Quantité" : "Quantity",
    item: fr ? "Article" : "Item",
    unknown: fr ? "Action à confirmer" : "Action to confirm",
    unknownBody: fr
      ? "L’assistant souhaite exécuter cette action."
      : "The assistant wants to run this action.",
    approval: fr ? "Validation requise" : "Approval required",
  };
}

function date(value: Date | string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toISOString().slice(0, 10);
}

function fallback(
  toolName: string,
  args: Record<string, unknown>,
  context: AssistantContext,
): AssistantApprovalPreview {
  const l = labels(context.locale);

  return {
    title: l.unknown,
    summary: `${l.unknownBody} (${toolName})`,
    facts: Object.entries(args)
      .filter(([, value]) => value !== null && value !== undefined && value !== "")
      .slice(0, 8)
      .map(([key, value]) => ({
        label: key,
        value: typeof value === "string" ? value : JSON.stringify(value),
      })),
  };
}

export async function buildApprovalPreview(input: {
  toolName: string;
  args: Record<string, unknown>;
  context: AssistantContext;
}): Promise<AssistantApprovalPreview> {
  const {toolName, args, context} = input;
  const l = labels(context.locale);
  const id = typeof args.id === "string" ? args.id : "";

  switch (toolName) {
    case "confirm_order":
    case "cancel_order": {
      const result = id ? await orderService.getOrder(context.actor, id) : null;
      if (!result) return fallback(toolName, args, context);
      const order = result.order;

      return {
        title: `${toolName === "confirm_order" ? (context.locale === "fr" ? "Confirmer" : "Confirm") : (context.locale === "fr" ? "Annuler" : "Cancel")} ${order.number}`,
        summary:
          context.locale === "fr"
            ? "La commande changera d’état et sera visible dans la planification."
            : "The order will change state and become visible in planning.",
        facts: [
          {label: l.customer, value: order.customerName},
          {label: l.site, value: order.siteName},
          {label: l.status, value: order.status},
          {label: l.date, value: date(order.requestedFor)},
          {label: l.lines, value: String(order.lineCount)},
          {label: l.total, value: `${order.totalAmount} ${order.currency}`},
        ],
        href: `/dashboard/sales/orders/${order.id}`,
      };
    }

    case "post_dispatch":
    case "cancel_dispatch": {
      const result = id
        ? await dispatchService.getDispatch(context.actor, id)
        : null;
      if (!result) return fallback(toolName, args, context);
      const dispatch = result.dispatch;

      return {
        title: `${toolName === "post_dispatch" ? (context.locale === "fr" ? "Valider" : "Post") : (context.locale === "fr" ? "Annuler" : "Cancel")} ${dispatch.number}`,
        summary:
          toolName === "post_dispatch"
            ? context.locale === "fr"
              ? "Les mouvements de stock sortants seront écrits. Cette action est définitive."
              : "Outbound stock movements will be written. This cannot be undone."
            : context.locale === "fr"
              ? "La livraison sera annulée."
              : "The delivery will be cancelled.",
        facts: [
          {label: l.customer, value: dispatch.customerName ?? "—"},
          {label: l.site, value: dispatch.siteName},
          {label: l.status, value: dispatch.status},
          {label: l.lines, value: String(dispatch.lineCount)},
        ],
        href: `/dashboard/sales/dispatches/${dispatch.id}`,
      };
    }

    case "post_receipt":
    case "cancel_receipt": {
      const result = id
        ? await purchasingService.getReceipt(context.actor, id)
        : null;
      if (!result) return fallback(toolName, args, context);
      const receipt = result.receipt;

      return {
        title: `${toolName === "post_receipt" ? (context.locale === "fr" ? "Valider" : "Post") : (context.locale === "fr" ? "Annuler" : "Cancel")} ${receipt.number}`,
        summary:
          toolName === "post_receipt"
            ? context.locale === "fr"
              ? "Les lots et mouvements de stock seront créés. Cette action est définitive."
              : "Lots and stock movements will be created. This cannot be undone."
            : context.locale === "fr"
              ? "La réception sera annulée."
              : "The receipt will be cancelled.",
        facts: [
          {label: l.supplier, value: receipt.supplierName},
          {label: l.site, value: receipt.siteName},
          {label: l.status, value: receipt.status},
          {label: l.lines, value: String(receipt.lineCount)},
          {label: l.total, value: `${receipt.totalAmount} ${receipt.currency}`},
        ],
        href: `/dashboard/purchasing/receipts/${receipt.id}`,
      };
    }

    case "post_stock_count": {
      const result = id ? await stockCountService.getCount(context.actor, id) : null;
      if (!result) return fallback(toolName, args, context);
      const count = result.count;

      return {
        title:
          context.locale === "fr"
            ? `Valider l’inventaire du ${date(count.countedAt)}`
            : `Post the stock count of ${date(count.countedAt)}`,
        summary:
          context.locale === "fr"
            ? "Les écarts seront écrits en mouvements de stock. Cette action est définitive."
            : "Variances will be written as stock movements. This cannot be undone.",
        facts: [
          {label: l.site, value: count.siteName},
          {label: l.status, value: count.status},
          {label: l.lines, value: String(count.lineCount)},
        ],
        href: `/dashboard/stock/counts/${count.id}`,
      };
    }

    case "confirm_production_plan":
    case "close_production_plan":
    case "cancel_production_plan": {
      const result = id ? await planningService.getPlan(context.actor, id) : null;
      if (!result) return fallback(toolName, args, context);
      const plan = result.plan;

      return {
        title:
          context.locale === "fr"
            ? `Plan du ${date(plan.plannedFor)}`
            : `Plan for ${date(plan.plannedFor)}`,
        summary:
          context.locale === "fr"
            ? "Le plan changera d’état et impactera la production."
            : "The plan will change state and affect production.",
        facts: [
          {label: l.site, value: plan.siteName},
          {label: l.status, value: plan.status},
          {label: l.lines, value: String(plan.lineCount)},
        ],
        href: `/dashboard/production/planning/${plan.id}`,
      };
    }

    case "start_production_batch":
    case "complete_production_batch":
    case "cancel_production_batch": {
      const result = id
        ? await productionService.getBatch(context.actor, id)
        : null;
      if (!result) return fallback(toolName, args, context);
      const batch = result.batch;

      return {
        title: `${batch.code} · ${batch.recipeName}`,
        summary:
          toolName === "complete_production_batch"
            ? context.locale === "fr"
              ? "Le lot de sortie et l’instantané de coût seront créés."
              : "The output lot and cost snapshot will be created."
            : context.locale === "fr"
              ? "Le lot de production changera d’état."
              : "The batch will change state.",
        facts: [
          {label: l.status, value: batch.status},
          {label: l.site, value: batch.siteName},
          {label: l.quantity, value: `${batch.plannedQuantity} ${batch.unitCode}`},
          ...(typeof args.actualQuantity === "string"
            ? [
                {
                  label: context.locale === "fr" ? "Quantité réelle" : "Actual quantity",
                  value: `${args.actualQuantity} ${batch.unitCode}`,
                },
              ]
            : []),
        ],
        href: `/dashboard/production/batches/${batch.id}`,
      };
    }

    case "record_waste": {
      return {
        title: context.locale === "fr" ? "Enregistrer une perte" : "Record waste",
        summary:
          context.locale === "fr"
            ? "Le stock du lot sera réduit."
            : "The lot's stock will be reduced.",
        facts: [
          {label: l.item, value: String(args.lotId ?? "—")},
          {label: l.quantity, value: String(args.quantity ?? "—")},
          {label: l.reason, value: String(args.reason ?? args.lossReasonId ?? "—")},
        ],
        href: "/dashboard/production/waste",
      };
    }

    case "publish_recipe_version":
    case "archive_recipe": {
      if (toolName === "publish_recipe_version") {
        const result = id ? await recipeService.getVersion(context.actor, id) : null;
        if (!result) return fallback(toolName, args, context);
        const version = result.version;

        return {
          title: `${version.recipeName} · v${version.versionNumber}`,
          summary:
            context.locale === "fr"
              ? "La version sera publiée et utilisable en production."
              : "The version will be published and usable in production.",
          facts: [
            {label: l.recipe, value: version.recipeName},
            {label: l.version, value: String(version.versionNumber)},
            {label: l.lines, value: String(version.lines.length)},
          ],
          href: `/dashboard/recipes/${version.recipeId}`,
        };
      }

      return fallback(toolName, args, context);
    }

    case "decide_absence":
      return {
        title:
          context.locale === "fr"
            ? "Décision sur une absence"
            : "Decide on an absence",
        summary:
          context.locale === "fr"
            ? "Le statut de la demande changera et impactera le planning."
            : "The request status will change and affect the schedule.",
        facts: [
          {label: "ID", value: String(args.id ?? "—")},
          {label: l.status, value: String(args.status ?? "—")},
        ],
        href: "/dashboard/team/absences",
      };

    case "archive_supplier": {
      const supplier = id
        ? await supplierService.getSupplier(context.actor, id)
        : null;
      return {
        title: context.locale === "fr" ? "Archiver le fournisseur" : "Archive supplier",
        summary:
          context.locale === "fr"
            ? "Le fournisseur disparaîtra des listes, son historique est conservé."
            : "The supplier will disappear from lists; history is kept.",
        facts: [{label: l.supplier, value: supplier?.name ?? id}],
        href: "/dashboard/purchasing/suppliers",
      };
    }

    case "archive_catalog_item": {
      const item = id ? await catalogService.getItem(context.actor, id) : null;
      return {
        title: context.locale === "fr" ? "Archiver l’article" : "Archive item",
        summary:
          context.locale === "fr"
            ? "L’article disparaîtra des listes, son historique est conservé."
            : "The item will disappear from lists; history is kept.",
        facts: [
          {label: l.item, value: item ? `${item.name} (${item.code})` : id},
        ],
        href: "/dashboard/catalog/items",
      };
    }

    default:
      return fallback(toolName, args, context);
  }
}
