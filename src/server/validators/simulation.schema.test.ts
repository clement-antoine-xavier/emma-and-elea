import {createSimulationSchema} from "@/server/validators/simulation.schema";
import {expectInvalid, expectValid} from "@/test-utils/assertions";

const schema = createSimulationSchema((key) => key);

function valid(overrides: Record<string, unknown> = {}) {
  return {
    materialPct: "0",
    packagingPct: "0",
    labourPct: "0",
    energyPct: "0",
    salePrice: "",
    ...overrides,
  };
}

describe("createSimulationSchema", () => {
  it("accepts the percentage bounds", () => {
    for (const materialPct of ["-100", "0", "300", "12.5"]) {
      expectValid(schema, valid({materialPct}));
    }
  });

  it("accepts an empty or positive sale price", () => {
    for (const salePrice of ["", "0.5", "2", "12.3456"]) {
      expectValid(schema, valid({salePrice}));
    }
  });

  it.each([
    [{materialPct: "-101"}, "percentInvalid"],
    [{materialPct: "301"}, "percentInvalid"],
    [{labourPct: "abc"}, "percentInvalid"],
    [{energyPct: "1.234"}, "percentInvalid"],
    [{salePrice: "0"}, "priceInvalid"],
    [{salePrice: "-1"}, "priceInvalid"],
    [{salePrice: "1.23456"}, "priceInvalid"],
  ])("rejects %p", (overrides, message) => {
    expectInvalid(schema, valid(overrides), message);
  });
});
