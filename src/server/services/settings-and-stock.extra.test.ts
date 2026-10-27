import {createRateService} from "@/server/services/rate.service";
import {createSiteService} from "@/server/services/site.service";
import {createStockCountService} from "@/server/services/stock-count.service";
import type {RateRepository} from "@/server/repositories/rate.repository";
import type {SiteRepository} from "@/server/repositories/site.repository";
import type {StockCountRepository} from "@/server/repositories/stock-count.repository";
import type {
  EnergyTariffRecord,
  LabourRateRecord,
  SiteRecord,
  StockCountDetailRecord,
  StockCountSummaryRecord,
} from "@/lib/dto";
import {actorFor} from "@/test-utils/actor";

const labourRate: LabourRateRecord = {
  id: "rate_1",
  label: "Baker",
  hourlyCost: "18",
  currency: "EUR",
  siteId: null,
  siteName: null,
  validFrom: new Date("2026-01-01T00:00:00.000Z"),
  validTo: null,
  archivedAt: null,
};

const tariff: EnergyTariffRecord = {
  id: "tariff_1",
  siteId: "site_1",
  siteName: "Atelier",
  energyKind: "ELECTRICITY",
  pricePerKwh: "0.2",
  currency: "EUR",
  validFrom: new Date("2026-01-01T00:00:00.000Z"),
  validTo: null,
};

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

function rateService(overrides: Partial<RateRepository> = {}) {
  const repository = {
    listLabourRates: jest.fn().mockResolvedValue([labourRate]),
    createLabourRate: jest.fn().mockResolvedValue(labourRate),
    archiveLabourRate: jest.fn().mockResolvedValue(true),
    listEnergyTariffs: jest.fn().mockResolvedValue([tariff]),
    createEnergyTariff: jest.fn().mockResolvedValue(tariff),
    closeEnergyTariff: jest.fn().mockResolvedValue(true),
    ...overrides,
  } as unknown as RateRepository;
  return {repository, service: createRateService({rateRepository: repository})};
}

function siteService(overrides: Partial<SiteRepository> = {}) {
  const repository = {
    list: jest.fn().mockResolvedValue([site]),
    findById: jest.fn().mockResolvedValue(site),
    count: jest.fn().mockResolvedValue(2),
    countActive: jest.fn().mockResolvedValue(2),
    create: jest.fn().mockResolvedValue(site),
    update: jest.fn().mockResolvedValue(site),
    archive: jest.fn().mockResolvedValue(true),
    ensureFirst: jest.fn().mockResolvedValue(site),
    ...overrides,
  } as unknown as SiteRepository;
  return {repository, service: createSiteService({siteRepository: repository})};
}

const countSummary: StockCountSummaryRecord = {
  id: "count_1",
  siteId: "site_1",
  siteName: "Atelier",
  status: "DRAFT",
  countedAt: new Date("2026-10-27T00:00:00.000Z"),
  postedAt: null,
  lineCount: 2,
  createdAt: new Date("2026-10-27T08:00:00.000Z"),
};

const countDetail: StockCountDetailRecord = {
  ...countSummary,
  note: null,
  lines: [
    {
      id: "line_1",
      lotId: null,
      lotNumber: null,
      itemId: "item_1",
      itemCode: "FLOUR",
      itemName: "Flour",
      expectedQuantity: "10",
      countedQuantity: "10",
      variance: "0",
      unitId: "unit_kg",
      unitCode: "kg",
      note: null,
    },
    {
      id: "line_2",
      lotId: "lot_1",
      lotNumber: "ATL-1",
      itemId: "item_2",
      itemCode: "BUTTER",
      itemName: "Butter",
      expectedQuantity: "5",
      countedQuantity: "5",
      variance: "0",
      unitId: "unit_kg",
      unitCode: "kg",
      note: null,
    },
  ],
};

function stockCountService(overrides: Partial<StockCountRepository> = {}) {
  const repository = {
    listCounts: jest.fn().mockResolvedValue([countSummary]),
    findCount: jest.fn().mockResolvedValue(countDetail),
    findDraft: jest.fn().mockResolvedValue(null),
    createCount: jest.fn().mockResolvedValue("count_1"),
    updateLines: jest.fn().mockResolvedValue(undefined),
    post: jest.fn().mockResolvedValue(undefined),
    cancel: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as StockCountRepository;
  const sites = {
    list: jest.fn().mockResolvedValue([
      site,
      {...site, id: "site_2", archivedAt: new Date()},
    ]),
    findById: jest.fn().mockResolvedValue(site),
  } as unknown as SiteRepository;

  return {
    repository,
    service: createStockCountService({
      stockCountRepository: repository,
      siteRepository: sites,
    }),
  };
}

describe("rate service writes", () => {
  const labourInput = {
    label: "Baker",
    hourlyCost: "18",
    siteId: null,
    validFrom: new Date("2026-01-01T00:00:00.000Z"),
  };

  it("returns both rate lists with the write flag from the cost matrix", async () => {
    const {service} = rateService();

    await expect(service.getRates(actorFor("owner"))).resolves.toEqual({
      labourRates: [labourRate],
      energyTariffs: [tariff],
      canWrite: true,
    });
    await expect(
      service.getRates(actorFor("production_manager")),
    ).resolves.toMatchObject({canWrite: false});
  });

  it("creates labour rates and tariffs", async () => {
    const {service, repository} = rateService();
    const energyInput = {
      siteId: "site_1",
      energyKind: "ELECTRICITY" as const,
      pricePerKwh: "0.2",
      validFrom: new Date("2026-01-01T00:00:00.000Z"),
    };

    await expect(
      service.createLabourRate(actorFor("owner"), labourInput),
    ).resolves.toEqual(labourRate);
    await expect(
      service.createEnergyTariff(actorFor("owner"), energyInput),
    ).resolves.toEqual(tariff);
    expect(repository.createLabourRate).toHaveBeenCalledWith(
      "org_1",
      labourInput,
    );
    expect(repository.createEnergyTariff).toHaveBeenCalledWith(
      "org_1",
      energyInput,
    );
  });

  it("maps unique and foreign-key failures", async () => {
    const duplicate = rateService({
      createLabourRate: jest
        .fn()
        .mockRejectedValue(Object.assign(new Error("dup"), {code: "P2002"})),
    });
    await expect(
      duplicate.service.createLabourRate(actorFor("owner"), labourInput),
    ).rejects.toMatchObject({code: "CONFLICT"});

    const foreign = rateService({
      createEnergyTariff: jest
        .fn()
        .mockRejectedValue(Object.assign(new Error("fk"), {code: "P2003"})),
    });
    await expect(
      foreign.service.createEnergyTariff(actorFor("owner"), {
        siteId: "missing",
        energyKind: "GAS",
        pricePerKwh: "0.2",
        validFrom: new Date(),
      }),
    ).rejects.toMatchObject({code: "NOT_FOUND"});
  });

  it("archives a rate and closes a tariff through tomorrow", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-10-27T15:00:00.000Z"));
    const {service, repository} = rateService();

    await expect(
      service.archiveLabourRate(actorFor("owner"), "rate_1"),
    ).resolves.toBeUndefined();
    await expect(
      service.closeEnergyTariff(actorFor("owner"), "tariff_1"),
    ).resolves.toBeUndefined();
    expect(repository.closeEnergyTariff).toHaveBeenCalledWith(
      "org_1",
      "tariff_1",
      new Date("2026-10-28T00:00:00.000Z"),
    );
    jest.useRealTimers();
  });

  it("reports a missing rate or tariff", async () => {
    const {service} = rateService({
      archiveLabourRate: jest.fn().mockResolvedValue(false),
      closeEnergyTariff: jest.fn().mockResolvedValue(false),
    });

    await expect(
      service.archiveLabourRate(actorFor("owner"), "missing"),
    ).rejects.toMatchObject({code: "NOT_FOUND"});
    await expect(
      service.closeEnergyTariff(actorFor("owner"), "missing"),
    ).rejects.toMatchObject({code: "NOT_FOUND"});
  });

  it("requires organization:update to write", async () => {
    const {service} = rateService();

    await expect(
      service.createLabourRate(actorFor("production_manager"), labourInput),
    ).rejects.toMatchObject({code: "FORBIDDEN"});
    await expect(
      service.archiveLabourRate(actorFor("production_manager"), "rate_1"),
    ).rejects.toMatchObject({code: "FORBIDDEN"});
  });
});

describe("site service writes", () => {
  const input = {
    name: "Atelier",
    code: "ATL",
    kind: "WORKSHOP" as const,
    city: null,
    timezone: "Europe/Paris",
  };

  it("lists sites and reads one", async () => {
    const {service} = siteService();

    await expect(service.getSites(actorFor("staff"))).resolves.toEqual({
      sites: [site],
      canWrite: false,
    });
    await expect(service.getSite(actorFor("staff"), "site_1")).resolves.toEqual(
      site,
    );
  });

  it("creates a site and maps a duplicate code", async () => {
    const {service, repository} = siteService();

    await expect(service.createSite(actorFor("owner"), input)).resolves.toEqual(
      site,
    );
    expect(repository.create).toHaveBeenCalledWith("org_1", input);

    const duplicate = siteService({
      create: jest
        .fn()
        .mockRejectedValue(Object.assign(new Error("dup"), {code: "P2002"})),
    });
    await expect(
      duplicate.service.createSite(actorFor("owner"), input),
    ).rejects.toMatchObject({code: "DUPLICATE_CODE"});
  });

  it("updates an existing site and reports a missing row", async () => {
    const {service} = siteService();
    await expect(
      service.updateSite(actorFor("owner"), {...input, id: "site_1"}),
    ).resolves.toEqual(site);

    const missing = siteService({
      findById: jest.fn().mockResolvedValue(null),
    });
    await expect(
      missing.service.updateSite(actorFor("owner"), {...input, id: "missing"}),
    ).rejects.toMatchObject({code: "NOT_FOUND"});

    const gone = siteService({update: jest.fn().mockResolvedValue(null)});
    await expect(
      gone.service.updateSite(actorFor("owner"), {...input, id: "site_1"}),
    ).rejects.toMatchObject({code: "NOT_FOUND"});
  });

  it("archives a site unless it is the last active one", async () => {
    const {service, repository} = siteService();
    await expect(
      service.archiveSite(actorFor("owner"), "site_1"),
    ).resolves.toBeUndefined();
    expect(repository.archive).toHaveBeenCalledWith("org_1", "site_1");

    const last = siteService({countActive: jest.fn().mockResolvedValue(1)});
    await expect(
      last.service.archiveSite(actorFor("owner"), "site_1"),
    ).rejects.toMatchObject({code: "LAST_SITE"});

    const already = siteService({
      findById: jest.fn().mockResolvedValue({...site, archivedAt: new Date()}),
    });
    await expect(
      already.service.archiveSite(actorFor("owner"), "site_1"),
    ).resolves.toBeUndefined();
  });

  it("requires site:write and a member", async () => {
    const {service} = siteService();

    await expect(service.createSite(actorFor("staff"), input)).rejects.toMatchObject(
      {code: "FORBIDDEN"},
    );
    await expect(service.archiveSite(null, "site_1")).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});

describe("stock count service reads and drafts", () => {
  it("lists counts with active sites and both capabilities", async () => {
    const {service} = stockCountService();

    await expect(service.getCounts(actorFor("staff"))).resolves.toEqual({
      counts: [countSummary],
      sites: [{id: "site_1", name: "Atelier", code: "ATL"}],
      canCount: true,
      canPost: false,
    });
    await expect(
      service.getCounts(actorFor("stock_manager")),
    ).resolves.toMatchObject({canPost: true});
  });

  it("returns a count or null", async () => {
    const {service} = stockCountService();

    await expect(
      service.getCount(actorFor("staff"), "count_1"),
    ).resolves.toEqual({count: countDetail, canCount: true, canPost: false});

    const empty = stockCountService({
      findCount: jest.fn().mockResolvedValue(null),
    });
    await expect(
      empty.service.getCount(actorFor("staff"), "missing"),
    ).resolves.toBeNull();
  });

  it("creates a draft unless one already exists for the day", async () => {
    const {service, repository} = stockCountService();
    const input = {
      siteId: "site_1",
      countedAt: new Date("2026-10-27T00:00:00.000Z"),
      note: null,
    };

    await expect(service.createCount(actorFor("staff"), input)).resolves.toEqual(
      {id: "count_1"},
    );
    expect(repository.createCount).toHaveBeenCalledWith("org_1", {
      ...input,
      userId: "user_1",
    });

    const duplicate = stockCountService({
      findDraft: jest.fn().mockResolvedValue(countSummary),
    });
    await expect(
      duplicate.service.createCount(actorFor("staff"), input),
    ).rejects.toMatchObject({code: "CONFLICT"});
  });

  it("rejects a count for a missing site", async () => {
    const repository = stockCountService();
    const service = createStockCountService({
      stockCountRepository: repository.repository,
      siteRepository: {
        findById: jest.fn().mockResolvedValue(null),
      } as unknown as SiteRepository,
    });

    await expect(
      service.createCount(actorFor("staff"), {
        siteId: "missing",
        countedAt: new Date(),
        note: null,
      }),
    ).rejects.toMatchObject({code: "NOT_FOUND"});
  });
});

describe("stock count line updates", () => {
  it("computes the variance from the captured expected quantity", async () => {
    const {service, repository} = stockCountService();

    await expect(
      service.updateLines(actorFor("staff"), "count_1", [
        {id: "line_1", countedQuantity: "8.5"},
        {id: "line_2", countedQuantity: "5"},
      ]),
    ).resolves.toBeUndefined();
    expect(repository.updateLines).toHaveBeenCalledWith("org_1", "count_1", [
      {id: "line_1", countedQuantity: "8.5", variance: "-1.5"},
      {id: "line_2", countedQuantity: "5", variance: "0"},
    ]);
  });

  it("rejects a missing count, a posted count and an unknown line", async () => {
    const missing = stockCountService({
      findCount: jest.fn().mockResolvedValue(null),
    });
    await expect(
      missing.service.updateLines(actorFor("staff"), "missing", []),
    ).rejects.toMatchObject({code: "NOT_FOUND"});

    const posted = stockCountService({
      findCount: jest
        .fn()
        .mockResolvedValue({...countDetail, status: "POSTED"}),
    });
    await expect(
      posted.service.updateLines(actorFor("staff"), "count_1", [
        {id: "line_1", countedQuantity: "1"},
      ]),
    ).rejects.toMatchObject({code: "INVALID_STATE_TRANSITION"});

    const unknownLine = stockCountService();
    await expect(
      unknownLine.service.updateLines(actorFor("staff"), "count_1", [
        {id: "missing", countedQuantity: "1"},
      ]),
    ).rejects.toMatchObject({code: "NOT_FOUND"});
  });

  it("rejects a negative count", async () => {
    const {service} = stockCountService();

    await expect(
      service.updateLines(actorFor("staff"), "count_1", [
        {id: "line_1", countedQuantity: "-1"},
      ]),
    ).rejects.toMatchObject({code: "INVALID_INPUT"});
  });

  it("posts and cancels with stock:write only", async () => {
    const {service, repository} = stockCountService();

    await expect(
      service.postCount(actorFor("stock_manager"), "count_1"),
    ).resolves.toBeUndefined();
    await expect(
      service.cancelCount(actorFor("stock_manager"), "count_1"),
    ).resolves.toBeUndefined();
    expect(repository.post).toHaveBeenCalledWith("org_1", "count_1", "user_1");
    expect(repository.cancel).toHaveBeenCalledWith("org_1", "count_1");

    await expect(
      service.postCount(actorFor("staff"), "count_1"),
    ).rejects.toMatchObject({code: "FORBIDDEN"});
  });
});
