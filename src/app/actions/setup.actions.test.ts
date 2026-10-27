import {getActorContext} from "@/server/auth/actor";
import {
  rateService,
  recipeService,
  settingsService,
  siteService,
} from "@/server/services/container";
import {updateOrganizationSettingsAction} from "@/app/actions/settings.actions";
import {
  archiveSiteAction,
  createSiteAction,
  updateSiteAction,
} from "@/app/actions/site.actions";
import {
  archiveLabourRateAction,
  closeEnergyTariffAction,
  createEnergyTariffAction,
  createLabourRateAction,
} from "@/app/actions/rate.actions";
import {
  addRecipeLineAction,
  addRecipeOperationAction,
  archiveRecipeAction,
  createRecipeAction,
  createRecipeVersionAction,
  publishRecipeVersionAction,
  removeRecipeLineAction,
  removeRecipeOperationAction,
  updateRecipeVersionAction,
} from "@/app/actions/recipe.actions";
import {DomainError} from "@/server/domain/errors";
import {actorFor} from "@/test-utils/actor";

jest.mock("@/server/auth/actor", () => ({getActorContext: jest.fn()}));
jest.mock("@/server/services/container", () => ({
  settingsService: {updateSettings: jest.fn()},
  siteService: {
    createSite: jest.fn(),
    updateSite: jest.fn(),
    archiveSite: jest.fn(),
  },
  rateService: {
    createLabourRate: jest.fn(),
    archiveLabourRate: jest.fn(),
    createEnergyTariff: jest.fn(),
    closeEnergyTariff: jest.fn(),
  },
  recipeService: {
    createRecipe: jest.fn(),
    createVersion: jest.fn(),
    updateVersion: jest.fn(),
    addLine: jest.fn(),
    removeLine: jest.fn(),
    addOperation: jest.fn(),
    removeOperation: jest.fn(),
    publishVersion: jest.fn(),
    archiveRecipe: jest.fn(),
  },
}));

const getActor = getActorContext as jest.Mock;
const settings = settingsService as unknown as Record<string, jest.Mock>;
const site = siteService as unknown as Record<string, jest.Mock>;
const rate = rateService as unknown as Record<string, jest.Mock>;
const recipe = recipeService as unknown as Record<string, jest.Mock>;

beforeEach(() => {
  jest.clearAllMocks();
  getActor.mockResolvedValue(actorFor("owner"));
});

describe("settings action", () => {
  const input = {
    currency: "eur",
    overheadPct: "10",
    forecastHistoryDays: "56",
    forecastSafetyPct: "5",
    defaultShelfLifeDays: "",
    lotNumberPattern: "{site}-{yyMMdd}-{seq}",
    pricesIncludeVat: "false",
  };

  it("converts the form strings to column types", async () => {
    settings.updateSettings.mockResolvedValue(undefined);

    await expect(updateOrganizationSettingsAction(input)).resolves.toEqual({
      ok: true,
    });
    expect(settings.updateSettings).toHaveBeenCalledWith(expect.any(Object), {
      currency: "EUR",
      overheadPct: "10",
      forecastHistoryDays: 56,
      forecastSafetyPct: "5",
      defaultShelfLifeDays: null,
      lotNumberPattern: "{site}-{yyMMdd}-{seq}",
      pricesIncludeVat: false,
    });
  });

  it("keeps a zero shelf life", async () => {
    settings.updateSettings.mockResolvedValue(undefined);

    await updateOrganizationSettingsAction({
      ...input,
      defaultShelfLifeDays: "0",
      pricesIncludeVat: "true",
    });

    expect(settings.updateSettings).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        defaultShelfLifeDays: 0,
        pricesIncludeVat: true,
      }),
    );
  });

  it("rejects invalid settings", async () => {
    await expect(
      updateOrganizationSettingsAction({...input, forecastHistoryDays: "6"}),
    ).resolves.toEqual({ok: false, error: "invalidInput"});
    expect(settings.updateSettings).not.toHaveBeenCalled();
  });

  it("rejects a visitor and maps forbidden", async () => {
    getActor.mockResolvedValueOnce(null);
    await expect(updateOrganizationSettingsAction(input)).resolves.toEqual({
      ok: false,
      error: "unauthenticated",
    });

    settings.updateSettings.mockRejectedValue(new DomainError("FORBIDDEN"));
    await expect(updateOrganizationSettingsAction(input)).resolves.toEqual({
      ok: false,
      error: "forbidden",
    });
  });
});

describe("site actions", () => {
  const input = {
    name: "Atelier",
    code: "atl",
    kind: "WORKSHOP",
    city: "",
    timezone: "Europe/Paris",
  };

  it("uppercases the code and nulls an empty city", async () => {
    site.createSite.mockResolvedValue({id: "site_1"});

    await expect(createSiteAction(input)).resolves.toEqual({ok: true});
    expect(site.createSite).toHaveBeenCalledWith(expect.any(Object), {
      name: "Atelier",
      code: "ATL",
      kind: "WORKSHOP",
      city: null,
      timezone: "Europe/Paris",
    });
  });

  it("updates a site with its id", async () => {
    site.updateSite.mockResolvedValue(undefined);

    await expect(
      updateSiteAction({...input, id: "site_1"}),
    ).resolves.toEqual({ok: true});
    expect(site.updateSite).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({id: "site_1", code: "ATL"}),
    );
  });

  it("rejects an invalid timezone and maps the last-site guard", async () => {
    await expect(
      createSiteAction({...input, timezone: "Mars/Base"}),
    ).resolves.toEqual({ok: false, error: "invalidInput"});

    site.archiveSite.mockRejectedValue(new DomainError("LAST_SITE"));
    await expect(archiveSiteAction({id: "site_1"})).resolves.toEqual({
      ok: false,
      error: "lastSite",
    });
  });

  it("archives a site", async () => {
    site.archiveSite.mockResolvedValue(undefined);

    await expect(archiveSiteAction({id: "site_1"})).resolves.toEqual({
      ok: true,
    });
  });
});

describe("rate actions", () => {
  it("creates a tenant-wide labour rate with a UTC date", async () => {
    rate.createLabourRate.mockResolvedValue(undefined);

    await expect(
      createLabourRateAction({
        label: "Baker",
        hourlyCost: "18.50",
        siteId: "",
        validFrom: "2026-01-01",
      }),
    ).resolves.toEqual({ok: true});
    expect(rate.createLabourRate).toHaveBeenCalledWith(expect.any(Object), {
      label: "Baker",
      hourlyCost: "18.50",
      siteId: null,
      validFrom: new Date("2026-01-01T00:00:00.000Z"),
    });
  });

  it("creates an energy tariff", async () => {
    rate.createEnergyTariff.mockResolvedValue(undefined);

    await expect(
      createEnergyTariffAction({
        siteId: "site_1",
        energyKind: "GAS",
        pricePerKwh: "0.2",
        validFrom: "2026-01-01",
      }),
    ).resolves.toEqual({ok: true});
    expect(rate.createEnergyTariff).toHaveBeenCalledWith(expect.any(Object), {
      siteId: "site_1",
      energyKind: "GAS",
      pricePerKwh: "0.2",
      validFrom: new Date("2026-01-01T00:00:00.000Z"),
    });
  });

  it("archives a rate and closes a tariff", async () => {
    rate.archiveLabourRate.mockResolvedValue(undefined);
    rate.closeEnergyTariff.mockResolvedValue(undefined);

    await expect(
      archiveLabourRateAction({id: "rate_1"}),
    ).resolves.toEqual({ok: true});
    await expect(
      closeEnergyTariffAction({id: "tariff_1"}),
    ).resolves.toEqual({ok: true});
  });

  it("rejects invalid rate input", async () => {
    await expect(
      createLabourRateAction({
        label: "A",
        hourlyCost: "1",
        siteId: "",
        validFrom: "2026-01-01",
      }),
    ).resolves.toEqual({ok: false, error: "invalidInput"});
  });
});

describe("recipe actions", () => {
  it("creates a recipe and returns both ids", async () => {
    recipe.createRecipe.mockResolvedValue({
      recipeId: "recipe_1",
      versionId: "version_1",
    });

    await expect(
      createRecipeAction({
        code: "CROISSANT",
        name: "Croissant",
        description: "",
        outputItemId: "item_croissant",
      }),
    ).resolves.toEqual({
      ok: true,
      recipeId: "recipe_1",
      versionId: "version_1",
    });
    expect(recipe.createRecipe).toHaveBeenCalledWith(expect.any(Object), {
      code: "CROISSANT",
      name: "Croissant",
      description: null,
      outputItemId: "item_croissant",
    });
  });

  it("creates a version with and without a source", async () => {
    recipe.createVersion.mockResolvedValue({versionId: "version_2"});

    await expect(
      createRecipeVersionAction("recipe_1", "version_1"),
    ).resolves.toEqual({ok: true, versionId: "version_2"});
    expect(recipe.createVersion).toHaveBeenCalledWith(
      expect.any(Object),
      "recipe_1",
      "version_1",
    );

    await createRecipeVersionAction("recipe_1", "");
    expect(recipe.createVersion).toHaveBeenLastCalledWith(
      expect.any(Object),
      "recipe_1",
      null,
    );
  });

  it("updates a version and converts optional numbers", async () => {
    recipe.updateVersion.mockResolvedValue(undefined);

    await expect(
      updateRecipeVersionAction("version_1", {
        yieldQuantity: "10",
        yieldUnitId: "unit_piece",
        portionCount: "",
        prepMinutes: "20",
        cookMinutes: "",
        instructions: "",
        changeNote: "Initial",
      }),
    ).resolves.toEqual({ok: true});
    expect(recipe.updateVersion).toHaveBeenCalledWith(
      expect.any(Object),
      "version_1",
      {
        yieldQuantity: "10",
        yieldUnitId: "unit_piece",
        portionCount: null,
        prepMinutes: 20,
        cookMinutes: null,
        instructions: null,
        changeNote: "Initial",
      },
    );
  });

  it("adds and removes a recipe line", async () => {
    recipe.addLine.mockResolvedValue(undefined);
    recipe.removeLine.mockResolvedValue(undefined);

    await expect(
      addRecipeLineAction("version_1", {
        itemId: "item_flour",
        quantity: "1",
        unitId: "unit_kg",
        lossPct: "0",
        isOptional: false,
        note: "",
      }),
    ).resolves.toEqual({ok: true});
    await expect(
      removeRecipeLineAction({versionId: "version_1", lineId: "line_1"}),
    ).resolves.toEqual({ok: true});
  });

  it("adds and removes an operation", async () => {
    recipe.addOperation.mockResolvedValue(undefined);
    recipe.removeOperation.mockResolvedValue(undefined);

    await expect(
      addRecipeOperationAction("version_1", {
        name: "Mix",
        description: "",
        durationMinutes: "10",
        activeMinutes: "",
        equipmentId: "",
        labourRateId: "",
      }),
    ).resolves.toEqual({ok: true});
    expect(recipe.addOperation).toHaveBeenCalledWith(
      expect.any(Object),
      "version_1",
      {
        name: "Mix",
        description: null,
        durationMinutes: 10,
        activeMinutes: null,
        equipmentId: null,
        labourRateId: null,
      },
    );

    await expect(
      removeRecipeOperationAction({
        versionId: "version_1",
        operationId: "operation_1",
      }),
    ).resolves.toEqual({ok: true});
  });

  it("publishes and archives", async () => {
    recipe.publishVersion.mockResolvedValue(undefined);
    recipe.archiveRecipe.mockResolvedValue(undefined);

    await expect(
      publishRecipeVersionAction({id: "version_1"}),
    ).resolves.toEqual({ok: true});
    await expect(archiveRecipeAction({id: "recipe_1"})).resolves.toEqual({
      ok: true,
    });
  });

  it("rejects invalid input and maps an immutable version", async () => {
    await expect(
      createRecipeAction({
        code: "A",
        name: "Croissant",
        description: "",
        outputItemId: "item_1",
      }),
    ).resolves.toEqual({ok: false, error: "invalidInput"});

    recipe.updateVersion.mockRejectedValue(new DomainError("IMMUTABLE_VERSION"));
    await expect(
      updateRecipeVersionAction("version_1", {
        yieldQuantity: "10",
        yieldUnitId: "unit_piece",
        portionCount: "",
        prepMinutes: "",
        cookMinutes: "",
        instructions: "",
        changeNote: "",
      }),
    ).resolves.toEqual({ok: false, error: "generic"});
  });
});
