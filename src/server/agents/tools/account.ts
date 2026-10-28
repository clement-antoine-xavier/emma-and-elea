import {z} from "zod";
import {homeService, siteService} from "@/server/services/container";
import {assistantTool} from "./shared";

export const accountTools = {
  whoami: assistantTool({
    name: "whoami",
    description:
      "Return the signed-in member, their role, the active organization and the persona. Use it to ground the conversation.",
    parameters: z.object({}),
    execute: async (_input, context) => ({
      user: {name: context.actor.name, email: context.actor.email},
      role: context.actor.role,
      organization: {
        id: context.actor.organization.id,
        name: context.actor.organization.name,
        slug: context.actor.organization.slug,
      },
      persona: context.persona,
      locale: context.locale,
    }),
  }),

  listSites: assistantTool({
    name: "list_sites",
    description:
      "List the active sites of the organization with their codes, kinds and cities.",
    parameters: z.object({}),
    execute: async (_input, context) => {
      const view = await siteService.getSites(context.actor);

      return {
        sites: view.sites
          .filter((site) => !site.archivedAt)
          .map((site) => ({
            id: site.id,
            code: site.code,
            name: site.name,
            kind: site.kind,
            city: site.city,
            timezone: site.timezone,
          })),
      };
    },
  }),

  dailyBriefing: assistantTool({
    name: "get_daily_briefing",
    description:
      "Return the organisation briefing for the last 7 days: KPIs, low-stock alerts, upcoming batches and recent orders. Use this first for broad questions.",
    parameters: z.object({}),
    execute: async (_input, context) => {
      const home = await homeService.getHome(context.actor, 7);
      const kpis = context.can("cost:read")
        ? home.kpis
        : {...home.kpis, wasteCost: null};

      return {
        period: `${home.from.toISOString().slice(0, 10)} to ${home.to
          .toISOString()
          .slice(0, 10)}`,
        currency: home.currency,
        kpis,
        capabilities: home.can,
        alerts: home.alerts.slice(0, 8).map((level) => ({
          itemId: level.itemId,
          itemName: level.itemName,
          quantity: level.quantity,
          minStockQuantity: level.minStockQuantity,
          unitCode: level.unitCode,
        })),
        upcomingBatches: home.upcomingBatches.slice(0, 8).map((batch) => ({
          id: batch.id,
          code: batch.code,
          status: batch.status,
          recipeName: batch.recipeName,
          plannedQuantity: batch.plannedQuantity,
          unitCode: batch.unitCode,
          producedOn: batch.producedOn,
        })),
        recentOrders: home.recentOrders.slice(0, 8).map((order) => ({
          id: order.id,
          number: order.number,
          status: order.status,
          customerName: order.customerName,
          requestedFor: order.requestedFor,
          totalAmount: order.totalAmount,
          currency: order.currency,
        })),
      };
    },
  }),
};
