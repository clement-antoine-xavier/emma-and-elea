import {type Permission} from "@/lib/permissions";
import type {DashboardNavItem} from "@/lib/navigation";
import {assertOrganizationActor, isGranted} from "@/server/auth/guards";
import type {Actor} from "@/server/auth/types";

export type {DashboardNavItem};

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

const navItems: ReadonlyArray<{
  key: DashboardNavItem;
  read: Permission;
}> = [
  {key: "overview", read: "organization:read"},
  {key: "alerts", read: "organization:read"},
  {key: "my-work", read: "task:read"},
  {key: "production", read: "production:read"},
  {key: "recipes", read: "recipe:read"},
  {key: "stock", read: "stock:read"},
  {key: "catalog", read: "catalog:read"},
  {key: "purchasing", read: "purchasing:read"},
  {key: "sales", read: "order:read"},
  {key: "reports", read: "report:read"},
  {key: "team", read: "team:read"},
  {key: "settings", read: "organization:read"},
];

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

      return {
        items: navItems
          .filter((item) => isGranted(actor, item.read))
          .map((item) => item.key),
      };
    },

    getOverview(actorInput) {
      const actor = assertOrganizationActor(actorInput);

      const visible = areas
        .filter((area) => isGranted(actor, area.read))
        .map<DashboardArea>((area) => ({
          key: area.key,
          access:
            area.write !== undefined && isGranted(actor, area.write)
              ? "manage"
              : "view",
        }));

      return {areas: visible};
    },
  };
}
