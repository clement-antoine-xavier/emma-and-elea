import {createSiteService} from "@/server/services/site.service";
import type {OrganizationActor} from "@/server/auth/types";
import type {OrgRole} from "@/lib/permissions";
import type {SiteRepository} from "@/server/repositories/site.repository";
import type {SiteRecord} from "@/server/repositories/types";

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

const site: SiteRecord = {
  id: "site_1",
  code: "ATL",
  name: "Atelier",
  kind: "WORKSHOP",
  city: null,
  timezone: "Europe/Paris",
  isActive: true,
  archivedAt: null,
};

function repository(overrides: Partial<SiteRepository> = {}): SiteRepository {
  return {
    list: jest.fn().mockResolvedValue([site]),
    findById: jest.fn().mockResolvedValue(site),
    count: jest.fn().mockResolvedValue(1),
    countActive: jest.fn().mockResolvedValue(2),
    create: jest.fn().mockResolvedValue(site),
    update: jest.fn().mockResolvedValue(site),
    archive: jest.fn().mockResolvedValue(true),
    ensureFirst: jest.fn().mockResolvedValue(site),
    ...overrides,
  };
}

describe("site service", () => {
  it("lets every role read sites but only writers change them", async () => {
    const repo = repository();
    const service = createSiteService({siteRepository: repo});

    await expect(service.getSites(actorFor("staff"))).resolves.toEqual({
      sites: [site],
      canWrite: false,
    });

    await expect(
      service.createSite(actorFor("staff"), {
        name: "Atelier",
        code: "ATL",
        kind: "WORKSHOP",
        city: null,
        timezone: "Europe/Paris",
      }),
    ).rejects.toMatchObject({code: "FORBIDDEN"});

    expect(repo.create).not.toHaveBeenCalled();
  });

  it("refuses to archive the last active site", async () => {
    const service = createSiteService({
      siteRepository: repository({countActive: jest.fn().mockResolvedValue(1)}),
    });

    await expect(
      service.archiveSite(actorFor("owner"), site.id),
    ).rejects.toMatchObject({code: "LAST_SITE"});
  });

  it("maps a duplicate code to a domain conflict", async () => {
    const service = createSiteService({
      siteRepository: repository({
        create: jest.fn().mockRejectedValue({code: "P2002"}),
      }),
    });

    await expect(
      service.createSite(actorFor("owner"), {
        name: "Atelier",
        code: "ATL",
        kind: "WORKSHOP",
        city: null,
        timezone: "Europe/Paris",
      }),
    ).rejects.toMatchObject({code: "DUPLICATE_CODE"});
  });
});
