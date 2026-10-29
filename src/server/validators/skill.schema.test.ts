import {
  createSkillSchema,
  employeeSkillInputSchema,
  SKILL_LEVELS,
} from "@/server/validators/skill.schema";
import {expectInvalid, expectValid} from "@/test-utils/assertions";

const schema = createSkillSchema((key) => key);
const employeeSchema = employeeSkillInputSchema((key) => key);

describe("createSkillSchema", () => {
  it("accepts a valid skill", () => {
    expectValid(schema, {
      code: "BAKE-1",
      name: "Baking",
      description: "Deck oven",
    });
  });

  it.each([
    [{code: "B"}, "codeInvalid"],
    [{code: "-BAKE"}, "codeInvalid"],
    [{name: "B"}, "nameRequired"],
    [{name: "x".repeat(81)}, "nameTooLong"],
    [{description: "x".repeat(501)}, "descriptionTooLong"],
  ])("rejects %p", (overrides, message) => {
    expectInvalid(
      schema,
      {code: "BAKE", name: "Baking", description: "", ...overrides},
      message,
    );
  });
});

describe("employeeSkillInputSchema", () => {
  it("accepts every level and an optional date", () => {
    for (const level of SKILL_LEVELS) {
      expectValid(employeeSchema, {
        skillId: "skill_1",
        level,
        certifiedOn: "",
      });
    }
    expectValid(employeeSchema, {
      skillId: "skill_1",
      level: "EXPERT",
      certifiedOn: "2026-01-15",
    });
  });

  it.each([
    [{skillId: ""}, "nameRequired"],
    [{level: "MASTER"}, "levelInvalid"],
    [{certifiedOn: "15/01/2026"}, "certifiedInvalid"],
  ])("rejects %p", (overrides, message) => {
    expectInvalid(
      employeeSchema,
      {
        skillId: "skill_1",
        level: "ADVANCED",
        certifiedOn: "",
        ...overrides,
      },
      message,
    );
  });
});
