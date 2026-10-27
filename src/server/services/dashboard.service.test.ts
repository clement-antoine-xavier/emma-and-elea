import {createDashboardService} from "@/server/services/dashboard.service";
import type {OrganizationActor} from "@/server/auth/types";
import type {OrgRole} from "@/lib/permissions";

function actorFor(role: OrgRole): OrganizationActor {
  return {
    userId: "user_1",
    name: "Actor",
    email: "actor@example.com",
    platformRole: "user",
    isSupport: false,
    sessionId: "session_1",
    activeOrganizationId: "org_1",
    membershipId: "member_1",
    organizationId: "org_1",
    organization: {id: "org_1", name: "Bakery", slug: "bakery"},
    role,
  };
}

describe("dashboard service", () => {
  const service = createDashboardService();

  it("gives an owner every workspace route", () => {
    expect(service.getNavigation(actorFor("owner")).items).toEqual([
      "overview",
      "production",
      "recipes",
      "stock",
      "catalog",
      "purchasing",
      "sales",
      "reports",
      "team",
      "settings",
    ]);
  });

  it("filters the rail by permission for staff", () => {
    expect(service.getNavigation(actorFor("staff")).items).toEqual([
      "overview",
      "production",
      "recipes",
      "stock",
      "catalog",
      "settings",
    ]);
  });

  it("shows purchasing read access but not member management to production managers", () => {
    const items = service.getNavigation(actorFor("production_manager")).items;

    expect(items).toContain("production");
    expect(items).toContain("purchasing");
    expect(items).toContain("reports");
    expect(items).not.toContain("team");
  });

  it("keeps member management away from stock and sales roles", () => {
    expect(service.getNavigation(actorFor("stock_manager")).items).not.toContain(
      "team",
    );
    expect(service.getNavigation(actorFor("sales")).items).not.toContain("team");
  });

  it("marks an area as manage only when the role can write it", () => {
    const owner = service.getOverview(actorFor("owner")).areas;
    const staff = service.getOverview(actorFor("staff")).areas;

    expect(owner).toContainEqual({key: "catalog", access: "manage"});
    expect(staff).toContainEqual({key: "catalog", access: "view"});
    expect(staff).toContainEqual({key: "production", access: "view"});
    expect(staff).not.toContainEqual(
      expect.objectContaining({key: "costs"}),
    );
  });
});
