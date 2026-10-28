import {z} from "zod";
import {
  equipmentService,
  rateService,
  settingsService,
} from "@/server/services/container";
import {assistantTool} from "./shared";

export const settingsTools = {
  settings: assistantTool({
    name: "get_settings",
    description:
      "Read the organization's currency, overhead, forecast and lot-number settings.",
    parameters: z.object({}),
    execute: async (_input, context) =>
      settingsService.getSettings(context.actor),
  }),

  equipment: assistantTool({
    name: "get_equipment",
    description:
      "List the workshop equipment with its site and power rating.",
    parameters: z.object({}),
    execute: async (_input, context) =>
      equipmentService.getEquipment(context.actor),
  }),

  rates: assistantTool({
    name: "get_rates",
    description:
      "List labour rates and energy tariffs used by recipe costing. Requires cost access.",
    parameters: z.object({}),
    execute: async (_input, context) => rateService.getRates(context.actor),
  }),
};
