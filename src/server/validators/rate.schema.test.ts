import {
  createEnergyTariffSchema,
  createLabourRateSchema,
  rateIdSchema,
} from "@/server/validators/rate.schema";
import {expectInvalid, expectValid} from "@/test-utils/assertions";

const t = (key: string) => key;
const labour = createLabourRateSchema(t);
const energy = createEnergyTariffSchema(t);

describe("createLabourRateSchema", () => {
  function validLabour(overrides: Record<string, unknown> = {}) {
    return {
      label: "Baker",
      hourlyCost: "18.50",
      siteId: "",
      validFrom: "2026-01-01",
      ...overrides,
    };
  }

  it("accepts a tenant-wide rate", () => {
    expectValid(labour, validLabour());
  });

  it("accepts a zero cost and a site", () => {
    expectValid(labour, validLabour({hourlyCost: "0", siteId: "site_1"}));
  });

  it.each([
    [{label: "A"}, "labelRequired"],
    [{label: "x".repeat(61)}, "labelTooLong"],
    [{hourlyCost: "-1"}, "costInvalid"],
    [{hourlyCost: "10000.01"}, "costInvalid"],
    [{hourlyCost: "1.23456"}, "costInvalid"],
    [{validFrom: ""}, "dateInvalid"],
    [{validFrom: "2026-1-1"}, "dateInvalid"],
  ])("rejects %p", (overrides, message) => {
    expectInvalid(labour, validLabour(overrides), message);
  });
});

describe("createEnergyTariffSchema", () => {
  function validEnergy(overrides: Record<string, unknown> = {}) {
    return {
      siteId: "site_1",
      energyKind: "ELECTRICITY",
      pricePerKwh: "0.25",
      validFrom: "2026-01-01",
      ...overrides,
    };
  }

  it("accepts both energy kinds", () => {
    expectValid(energy, validEnergy());
    expectValid(energy, validEnergy({energyKind: "GAS"}));
  });

  it.each([
    [{siteId: ""}, "siteRequired"],
    [{energyKind: "WATER"}, "kindInvalid"],
    [{pricePerKwh: "-0.01"}, "costInvalid"],
    [{pricePerKwh: "1000.01"}, "costInvalid"],
    [{validFrom: "bad"}, "dateInvalid"],
  ])("rejects %p", (overrides, message) => {
    expectInvalid(energy, validEnergy(overrides), message);
  });
});

describe("rateIdSchema", () => {
  it("rejects a blank id", () => {
    expectInvalid(rateIdSchema, {id: " "});
  });
});
