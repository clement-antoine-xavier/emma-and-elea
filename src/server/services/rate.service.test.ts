import {createRateService} from "@/server/services/rate.service";
import type {OrganizationActor} from "@/server/auth/types";
import type {OrgRole} from "@/lib/permissions";
import type {RateRepository} from "@/server/repositories/rate.repository";

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

function repository(overrides: Partial<RateRepository> = {}): RateRepository {
  return {
    listLabourRates: jest.fn().mockResolvedValue([]),
    createLabourRate: jest.fn().mockResolvedValue({}),
    archiveLabourRate: jest.fn().mockResolvedValue(true),
    listEnergyTariffs: jest.fn().mockResolvedValue([]),
    createEnergyTariff: jest.fn().mockResolvedValue({}),
    closeEnergyTariff: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe("rate service", () => {
  it("lets a production manager read costs without writing rates", async () => {
    const service = createRateService({rateRepository: repository()});

    await expect(
      service.getRates(actorFor("production_manager")),
    ).resolves.toMatchObject({canWrite: false});

    await expect(
      service.createLabourRate(actorFor("production_manager"), {
        label: "Pâtissier",
        hourlyCost: "18.5",
        siteId: null,
        validFrom: new Date("2026-01-01T00:00:00.000Z"),
      }),
    ).rejects.toMatchObject({code: "FORBIDDEN"});
  });

  it("hides rates from roles without cost read access", async () => {
    const service = createRateService({rateRepository: repository()});

    await expect(
      service.getRates(actorFor("stock_manager")),
    ).rejects.toMatchObject({code: "FORBIDDEN"});
  });
});
