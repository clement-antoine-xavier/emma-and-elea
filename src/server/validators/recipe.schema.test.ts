import {
  recipeIdSchema,
  recipeInputSchema,
  recipeLineIdSchema,
  recipeLineInputSchema,
  recipeOperationIdSchema,
  recipeOperationInputSchema,
  recipeVersionIdSchema,
  recipeVersionInputSchema,
} from "@/server/validators/recipe.schema";
import {expectInvalid, expectValid} from "@/test-utils/assertions";

const t = (key: string) => key;
const recipe = recipeInputSchema(t);
const version = recipeVersionInputSchema(t);
const line = recipeLineInputSchema(t);
const operation = recipeOperationInputSchema(t);

function validRecipe(overrides: Record<string, unknown> = {}) {
  return {
    code: "CROISSANT",
    name: "Croissant",
    description: "",
    outputItemId: "item_croissant",
    ...overrides,
  };
}

function validVersion(overrides: Record<string, unknown> = {}) {
  return {
    yieldQuantity: "10",
    yieldUnitId: "unit_piece",
    portionCount: "",
    prepMinutes: "20",
    cookMinutes: "18",
    instructions: "",
    changeNote: "",
    ...overrides,
  };
}

function validLine(overrides: Record<string, unknown> = {}) {
  return {
    itemId: "item_flour",
    quantity: "1",
    unitId: "unit_kg",
    lossPct: "0",
    isOptional: false,
    note: "",
    ...overrides,
  };
}

function validOperation(overrides: Record<string, unknown> = {}) {
  return {
    name: "Mix",
    description: "",
    durationMinutes: "10",
    activeMinutes: "",
    equipmentId: "",
    labourRateId: "",
    requiredSkillId: "",
    ...overrides,
  };
}

describe("recipeInputSchema", () => {
  it("accepts a recipe identity", () => {
    expectValid(recipe, validRecipe());
  });

  it.each([
    [{code: "A"}, "codeInvalid"],
    [{code: "A_B"}, "codeInvalid"],
    [{code: "A".repeat(33)}, "codeInvalid"],
    [{name: "A"}, "nameRequired"],
    [{name: "x".repeat(121)}, "nameTooLong"],
    [{description: "x".repeat(501)}, "descriptionTooLong"],
    [{outputItemId: ""}, "outputInvalid"],
  ])("rejects %p", (overrides, message) => {
    expectInvalid(recipe, validRecipe(overrides), message);
  });
});

describe("recipeVersionInputSchema", () => {
  it("accepts minimal and full versions", () => {
    expectValid(version, validVersion());
    expectValid(
      version,
      validVersion({
        portionCount: "10",
        prepMinutes: "",
        cookMinutes: "",
        instructions: "Shape and proof.",
        changeNote: "Initial version",
      }),
    );
  });

  it.each([
    [{yieldQuantity: "0"}, "yieldInvalid"],
    [{yieldQuantity: "0.00001"}, "yieldInvalid"],
    [{yieldQuantity: "-1"}, "yieldInvalid"],
    [{yieldUnitId: ""}, "unitInvalid"],
    [{portionCount: "-1"}, "portionInvalid"],
    [{prepMinutes: "1.5"}, "minutesInvalid"],
    [{cookMinutes: "100001"}, "minutesInvalid"],
    [{instructions: "x".repeat(10001)}, "instructionsTooLong"],
    [{changeNote: "x".repeat(501)}, "noteTooLong"],
  ])("rejects %p", (overrides, message) => {
    expectInvalid(version, validVersion(overrides), message);
  });
});

describe("recipeLineInputSchema", () => {
  it("accepts an optional line with zero loss", () => {
    expectValid(line, validLine({isOptional: true}));
  });

  it.each([
    [{itemId: ""}, "itemRequired"],
    [{quantity: "0"}, "quantityInvalid"],
    [{quantity: "-1"}, "quantityInvalid"],
    [{unitId: ""}, "unitInvalid"],
    [{lossPct: "-1"}, "lossInvalid"],
    [{lossPct: "100.01"}, "lossInvalid"],
    [{lossPct: "1.234"}, "lossInvalid"],
    [{note: "x".repeat(201)}, "noteTooLong"],
  ])("rejects %p", (overrides, message) => {
    expectInvalid(line, validLine(overrides), message);
  });

  it("requires the optional flag", () => {
    const withoutFlag: Record<string, unknown> = {...validLine()};
    delete withoutFlag.isOptional;
    expectInvalid(line, withoutFlag);
  });
});

describe("recipeOperationInputSchema", () => {
  it("accepts an operation without a machine or rate", () => {
    expectValid(operation, validOperation());
  });

  it.each([
    [{name: "A"}, "operationNameRequired"],
    [{name: "x".repeat(81)}, "nameTooLong"],
    [{durationMinutes: "0"}, "durationInvalid"],
    [{durationMinutes: "1.5"}, "durationInvalid"],
    [{durationMinutes: "100001"}, "durationInvalid"],
    [{activeMinutes: "0.5"}, "activeMinutesInvalid"],
    [{activeMinutes: "-1"}, "activeMinutesInvalid"],
  ])("rejects %p", (overrides, message) => {
    expectInvalid(operation, validOperation(overrides), message);
  });

  it("accepts zero active minutes", () => {
    expectValid(operation, validOperation({activeMinutes: "0"}));
  });
});

describe("recipe id schemas", () => {
  it("reject blank ids", () => {
    expectInvalid(recipeIdSchema, {id: ""});
    expectInvalid(recipeVersionIdSchema, {id: " "});
    expectInvalid(recipeLineIdSchema, {versionId: "", lineId: "line_1"});
    expectInvalid(recipeOperationIdSchema, {
      versionId: "version_1",
      operationId: "",
    });
  });
});
