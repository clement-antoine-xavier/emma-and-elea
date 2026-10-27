import {prisma} from "@/lib/prisma";
import {siteRepository} from "@/server/repositories/site.repository";
import {organizationSettingsRepository} from "@/server/repositories/organization-settings.repository";
import {rateRepository} from "@/server/repositories/rate.repository";
import {equipmentRepository} from "@/server/repositories/equipment.repository";
import {DEFAULT_LOSS_REASONS} from "@/server/domain/organization-defaults";
import {
  createFixture,
  referenceUnits,
  type Fixture,
} from "@/test-utils/integration/db";

describe("site, settings, rate and equipment repositories", () => {
  let fixture: Fixture;

  beforeAll(async () => {
    fixture = await createFixture();
  });

  afterAll(async () => {
    await fixture.cleanup();
  });

  it("creates, updates and archives a site", async () => {
    const site = await siteRepository.create(fixture.organizationId, {
      name: "Boutique",
      code: "SHOP",
      kind: "SHOP",
      city: "Lyon",
      timezone: "Europe/Paris",
    });

    expect(site).toMatchObject({code: "SHOP", name: "Boutique", isActive: true});
    await expect(
      siteRepository.list(fixture.organizationId),
    ).resolves.toEqual(expect.arrayContaining([expect.objectContaining({id: site.id})]));
    await expect(
      siteRepository.findById(fixture.organizationId, site.id),
    ).resolves.toEqual(site);

    const updated = await siteRepository.update(
      fixture.organizationId,
      site.id,
      {
        name: "Boutique Centre",
        code: "SHOP",
        kind: "SHOP",
        city: null,
        timezone: "Europe/Paris",
      },
    );
    expect(updated).toMatchObject({name: "Boutique Centre", city: null});

    await expect(
      siteRepository.count(fixture.organizationId),
    ).resolves.toBe(2);
    await expect(
      siteRepository.countActive(fixture.organizationId),
    ).resolves.toBe(2);

    await expect(
      siteRepository.archive(fixture.organizationId, site.id),
    ).resolves.toBe(true);
    await expect(
      siteRepository.archive(fixture.organizationId, site.id),
    ).resolves.toBe(false);
    await expect(
      siteRepository.countActive(fixture.organizationId),
    ).resolves.toBe(1);
  });

  it("creates the first site only once", async () => {
    const first = await siteRepository.ensureFirst(fixture.organizationId, {
      name: "Atelier bis",
      code: "BIS",
      kind: "WORKSHOP",
      city: null,
      timezone: "Europe/Paris",
    });

    // A tenant already has the fixture site, so ensureFirst returns it.
    expect(first.id).toBe(fixture.siteId);

    const emptyOrg = await prisma.organization.create({
      data: {
        id: `org_empty_${Date.now()}`,
        name: "Empty org",
        slug: `empty-${Date.now()}`,
        createdAt: new Date(),
      },
      select: {id: true},
    });

    const created = await siteRepository.ensureFirst(emptyOrg.id, {
      name: "Atelier",
      code: "ATL",
      kind: "WORKSHOP",
      city: null,
      timezone: "Europe/Paris",
    });
    const again = await siteRepository.ensureFirst(emptyOrg.id, {
      name: "Other",
      code: "OTH",
      kind: "WORKSHOP",
      city: null,
      timezone: "Europe/Paris",
    });
    expect(again.id).toBe(created.id);
    await prisma.organization.delete({where: {id: emptyOrg.id}});
  });

  it("reads, updates and re-ensures organization settings", async () => {
    const settings = await organizationSettingsRepository.get(
      fixture.organizationId,
    );
    expect(settings).toMatchObject({
      currency: "EUR",
      overheadPct: "10",
      forecastHistoryDays: 56,
      forecastSafetyPct: "5",
      pricesIncludeVat: true,
    });

    const updated = await organizationSettingsRepository.update(
      fixture.organizationId,
      {
        currency: "GBP",
        overheadPct: "12.5",
        forecastHistoryDays: 30,
        forecastSafetyPct: "7.5",
        defaultShelfLifeDays: 4,
        lotNumberPattern: "{site}-{seq}",
        pricesIncludeVat: false,
      },
    );
    expect(updated).toMatchObject({
      currency: "GBP",
      overheadPct: "12.5",
      forecastHistoryDays: 30,
      defaultShelfLifeDays: 4,
      pricesIncludeVat: false,
    });

    // Idempotent bootstrap: no duplicate settings or loss reasons.
    await organizationSettingsRepository.ensureDefaults(
      fixture.organizationId,
      DEFAULT_LOSS_REASONS,
    );
    const [settingsCount, reasonCount] = await Promise.all([
      prisma.organizationSetting.count({
        where: {organizationId: fixture.organizationId},
      }),
      prisma.lossReason.count({
        where: {organizationId: fixture.organizationId},
      }),
    ]);
    expect(settingsCount).toBe(1);
    expect(reasonCount).toBe(DEFAULT_LOSS_REASONS.length);
  });

  it("creates and archives labour rates", async () => {
    const rate = await rateRepository.createLabourRate(fixture.organizationId, {
      label: "Baker",
      hourlyCost: "18.5",
      siteId: null,
      validFrom: new Date("2026-01-01T00:00:00.000Z"),
    });

    expect(rate).toMatchObject({
      label: "Baker",
      hourlyCost: "18.5",
      currency: "EUR",
      validTo: null,
      archivedAt: null,
    });
    await expect(
      rateRepository.listLabourRates(fixture.organizationId),
    ).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({id: rate.id})]),
    );

    await expect(
      rateRepository.archiveLabourRate(fixture.organizationId, rate.id),
    ).resolves.toBe(true);
    await expect(
      rateRepository.archiveLabourRate(fixture.organizationId, rate.id),
    ).resolves.toBe(false);
  });

  it("creates and closes an energy tariff", async () => {
    const tariff = await rateRepository.createEnergyTariff(
      fixture.organizationId,
      {
        siteId: fixture.siteId,
        energyKind: "GAS",
        pricePerKwh: "0.12",
        validFrom: new Date("2026-01-01T00:00:00.000Z"),
      },
    );

    expect(tariff).toMatchObject({
      siteId: fixture.siteId,
      energyKind: "GAS",
      pricePerKwh: "0.12",
      currency: "EUR",
      validTo: null,
    });

    await expect(
      rateRepository.closeEnergyTariff(
        fixture.organizationId,
        tariff.id,
        new Date("2026-12-31T00:00:00.000Z"),
      ),
    ).resolves.toBe(true);
    const closed = await prisma.energyTariff.findUniqueOrThrow({
      where: {id: tariff.id},
      select: {validTo: true},
    });
    expect(closed.validTo).toEqual(new Date("2026-12-31T00:00:00.000Z"));
    await expect(
      rateRepository.closeEnergyTariff(
        fixture.organizationId,
        tariff.id,
        new Date("2027-01-01T00:00:00.000Z"),
      ),
    ).resolves.toBe(false);
  });

  it("scopes sites, settings and rates to the tenant", async () => {
    await expect(siteRepository.findById("org_other", fixture.siteId))
      .resolves.toBeNull();
    await expect(
      organizationSettingsRepository.get("org_other"),
    ).resolves.toBeNull();
    await expect(
      rateRepository.listLabourRates("org_other"),
    ).resolves.toEqual([]);
    await expect(
      siteRepository.update("org_other", fixture.siteId, {
        name: "Hijacked",
        code: "ATL",
        kind: "WORKSHOP",
        city: null,
        timezone: "Europe/Paris",
      }),
    ).resolves.toBeNull();
  });

  it("creates, lists and archives equipment", async () => {
    const equipment = await equipmentRepository.create(
      fixture.organizationId,
      {
        name: "Deck oven",
        kind: "OVEN",
        siteId: fixture.siteId,
        powerKw: "12",
      },
    );

    expect(equipment).toMatchObject({
      siteName: "Atelier",
      powerKw: "12",
      archivedAt: null,
    });
    await expect(
      equipmentRepository.list(fixture.organizationId),
    ).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({id: equipment.id})]),
    );

    await expect(
      equipmentRepository.archive(fixture.organizationId, equipment.id),
    ).resolves.toBe(true);
    await expect(
      equipmentRepository.archive(fixture.organizationId, equipment.id),
    ).resolves.toBe(false);
  });

  it("leaves the reference unit data intact", async () => {
    const unit = await prisma.unit.findUniqueOrThrow({
      where: {id: referenceUnits.kg},
      select: {code: true, kind: true},
    });
    expect(unit).toEqual({code: "kg", kind: "MASS"});
  });
});
