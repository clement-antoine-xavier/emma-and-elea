import {
  createEquipmentSchema,
  equipmentIdSchema,
} from "@/server/validators/equipment.schema";
import {expectInvalid, expectValid} from "@/test-utils/assertions";

const schema = createEquipmentSchema((key) => key);

function validEquipment(overrides: Record<string, unknown> = {}) {
  return {
    name: "Deck oven",
    kind: "OVEN",
    siteId: "",
    powerKw: "",
    ...overrides,
  };
}

describe("createEquipmentSchema", () => {
  it("accepts every equipment kind", () => {
    for (const kind of [
      "OVEN",
      "MIXER",
      "FRIDGE",
      "FREEZER",
      "PROOFER",
      "FRYER",
      "SCALE",
      "LABELLER",
      "OTHER",
    ]) {
      expectValid(schema, validEquipment({kind}));
    }
  });

  it.each(["", "0", "1", "12.345", "500"])(
    "accepts the power value %p",
    (powerKw) => {
      expectValid(schema, validEquipment({powerKw}));
    },
  );

  it.each([
    [{name: "A"}, "nameRequired"],
    [{name: "x".repeat(81)}, "nameTooLong"],
    [{kind: "TOASTER"}, "kindInvalid"],
    [{powerKw: "-1"}, "powerInvalid"],
    [{powerKw: "1.2345"}, "powerInvalid"],
    [{powerKw: "500.1"}, "powerInvalid"],
    [{powerKw: "abc"}, "powerInvalid"],
  ])("rejects %p", (overrides, message) => {
    expectInvalid(schema, validEquipment(overrides), message);
  });

  it("rejects a blank id", () => {
    expectInvalid(equipmentIdSchema, {id: ""});
  });
});
