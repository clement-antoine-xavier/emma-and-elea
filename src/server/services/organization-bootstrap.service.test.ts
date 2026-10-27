import {createOrganizationBootstrapService} from "@/server/services/organization-bootstrap.service";
import {
  DEFAULT_LOSS_REASONS,
  type DefaultLossReason,
} from "@/server/domain/organization-defaults";
import type {OrganizationSettingsRepository} from "@/server/repositories/organization-settings.repository";
import type {SiteRepository} from "@/server/repositories/site.repository";
import type {SiteRecord} from "@/lib/dto";

const site: SiteRecord = {
  id: "site_1",
  name: "Atelier",
  code: "ATL",
  kind: "WORKSHOP",
  city: null,
  timezone: "Europe/Paris",
  isActive: true,
  archivedAt: null,
};

function repositories() {
  const settingsRepository = {
    ensureDefaults: jest.fn().mockResolvedValue(undefined),
    get: jest.fn(),
    update: jest.fn(),
  } as unknown as OrganizationSettingsRepository & {
    ensureDefaults: jest.Mock;
  };
  const siteRepository = {
    list: jest.fn(),
    findById: jest.fn(),
    count: jest.fn(),
    countActive: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    archive: jest.fn(),
    ensureFirst: jest.fn().mockResolvedValue(site),
  } as unknown as SiteRepository & {ensureFirst: jest.Mock};

  return {settingsRepository, siteRepository};
}

describe("organization bootstrap service", () => {
  it("ensures settings without creating a site when none is given", async () => {
    const {settingsRepository, siteRepository} = repositories();
    const service = createOrganizationBootstrapService({
      settingsRepository,
      siteRepository,
    });

    await service.bootstrapOrganization("org_1");

    expect(settingsRepository.ensureDefaults).toHaveBeenCalledWith(
      "org_1",
      DEFAULT_LOSS_REASONS,
    );
    expect(siteRepository.ensureFirst).not.toHaveBeenCalled();
  });

  it("creates the first site when options provide one", async () => {
    const {settingsRepository, siteRepository} = repositories();
    const service = createOrganizationBootstrapService({
      settingsRepository,
      siteRepository,
    });
    const input = {
      name: "Atelier",
      code: "ATL",
      kind: "WORKSHOP" as const,
      city: null,
      timezone: "Europe/Paris",
    };

    await service.bootstrapOrganization("org_1", {site: input});

    expect(siteRepository.ensureFirst).toHaveBeenCalledWith("org_1", input);
  });

  it("accepts a custom loss-reason catalogue", async () => {
    const {settingsRepository, siteRepository} = repositories();
    const defaults: readonly DefaultLossReason[] = [
      {
        code: "TEST",
        labelEn: "Test",
        labelFr: "Test",
        category: "OVERPRODUCTION",
        sortOrder: 1,
      },
    ];
    const service = createOrganizationBootstrapService({
      settingsRepository,
      siteRepository,
      defaults,
    });

    await service.bootstrapOrganization("org_1");

    expect(settingsRepository.ensureDefaults).toHaveBeenCalledWith(
      "org_1",
      defaults,
    );
  });

  it("is idempotent because the repositories own the upserts", async () => {
    const {settingsRepository, siteRepository} = repositories();
    const service = createOrganizationBootstrapService({
      settingsRepository,
      siteRepository,
    });

    await service.bootstrapOrganization("org_1", {
      site: {
        name: "Atelier",
        code: "ATL",
        kind: "WORKSHOP",
        city: null,
        timezone: "Europe/Paris",
      },
    });
    await service.bootstrapOrganization("org_1", {
      site: {
        name: "Atelier",
        code: "ATL",
        kind: "WORKSHOP",
        city: null,
        timezone: "Europe/Paris",
      },
    });

    expect(settingsRepository.ensureDefaults).toHaveBeenCalledTimes(2);
    expect(siteRepository.ensureFirst).toHaveBeenCalledTimes(2);
  });

  it("propagates a settings failure", async () => {
    const {settingsRepository, siteRepository} = repositories();
    settingsRepository.ensureDefaults.mockRejectedValue(new Error("db down"));
    const service = createOrganizationBootstrapService({
      settingsRepository,
      siteRepository,
    });

    await expect(service.bootstrapOrganization("org_1")).rejects.toThrow(
      "db down",
    );
    expect(siteRepository.ensureFirst).not.toHaveBeenCalled();
  });
});
