import {createSettingsService} from "@/server/services/settings.service";
import type {OrganizationActor} from "@/server/auth/types";
import type {OrgRole} from "@/lib/permissions";
import type {OrganizationSettingsRepository} from "@/server/repositories/organization-settings.repository";
import {DEFAULT_ORGANIZATION_SETTINGS} from "@/server/domain/organization-settings";

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

function repository(
  overrides: Partial<OrganizationSettingsRepository> = {},
): OrganizationSettingsRepository {
  return {
    ensureDefaults: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue(DEFAULT_ORGANIZATION_SETTINGS),
    update: jest.fn().mockResolvedValue(DEFAULT_ORGANIZATION_SETTINGS),
    ...overrides,
  };
}

const input = {
  currency: "EUR",
  overheadPct: "10",
  forecastHistoryDays: 56,
  forecastSafetyPct: "5",
  defaultShelfLifeDays: null,
  lotNumberPattern: "{site}-{yyMMdd}-{seq}",
  pricesIncludeVat: true,
};

describe("settings service", () => {
  it("falls back to the column defaults when no row exists", async () => {
    const service = createSettingsService({
      settingsRepository: repository({
        get: jest.fn().mockResolvedValue(null),
      }),
    });

    await expect(service.getSettings(actorFor("staff"))).resolves.toEqual({
      settings: DEFAULT_ORGANIZATION_SETTINGS,
      canUpdate: false,
    });
  });

  it("marks settings as editable only for roles that can update them", async () => {
    const service = createSettingsService({settingsRepository: repository()});

    await expect(service.getSettings(actorFor("owner"))).resolves.toMatchObject(
      {canUpdate: true},
    );
    await expect(
      service.getSettings(actorFor("production_manager")),
    ).resolves.toMatchObject({canUpdate: false});
  });

  it("rejects a settings update from a manager", async () => {
    const service = createSettingsService({settingsRepository: repository()});

    await expect(
      service.updateSettings(actorFor("production_manager"), input),
    ).rejects.toMatchObject({code: "FORBIDDEN"});
  });
});
