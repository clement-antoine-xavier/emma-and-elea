import {can, type Permission} from "@/lib/permissions";
import {assertOrganizationActor} from "@/server/auth/guards";
import type {Actor} from "@/server/auth/types";

export type DashboardNavItem = "overview" | "team";

export type DashboardAreaKey =
  | "catalog"
  | "recipes"
  | "costs"
  | "production"
  | "stock"
  | "sales"
  | "team"
  | "reports";

export type DashboardArea = {
  key: DashboardAreaKey;
  access: "manage" | "view";
};

const areas: ReadonlyArray<{
  key: DashboardAreaKey;
  read: Permission;
  write?: Permission;
}> = [
  {key: "catalog", read: "catalog:read", write: "catalog:write"},
  {key: "recipes", read: "recipe:read", write: "recipe:write"},
  {key: "costs", read: "cost:read"},
  {key: "production", read: "production:read", write: "production:write"},
  {key: "stock", read: "stock:read", write: "stock:write"},
  {key: "sales", read: "order:read", write: "order:write"},
  {key: "team", read: "team:read", write: "team:write"},
  {key: "reports", read: "report:read"},
];

export interface DashboardService {
  getNavigation(actor: Actor | null): {items: DashboardNavItem[]};
  getOverview(actor: Actor | null): {areas: DashboardArea[]};
}

export function createDashboardService(): DashboardService {
  return {
    getNavigation(actorInput) {
      const actor = assertOrganizationActor(actorInput);
      const items: DashboardNavItem[] = ["overview"];

      if (can(actor.role, "member:read")) items.push("team");

      return {items};
    },

    getOverview(actorInput) {
      const actor = assertOrganizationActor(actorInput);

      const visible = areas
        .filter((area) => can(actor.role, area.read))
        .map<DashboardArea>((area) => ({
          key: area.key,
          access:
            area.write !== undefined && can(actor.role, area.write)
              ? "manage"
              : "view",
        }));

      return {areas: visible};
    },
  };
}
