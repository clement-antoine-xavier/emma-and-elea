import {DomainError} from "@/server/domain/errors";
import {mapDomainError} from "@/app/actions/errors";

describe("mapDomainError", () => {
  it.each([
    ["FORBIDDEN", "forbidden"],
    ["NOT_FOUND", "notFound"],
    ["CONFLICT", "conflict"],
    ["DUPLICATE_CODE", "duplicateCode"],
    ["INVALID_UNIT", "invalidUnit"],
    ["INVALID_INPUT", "invalidInput"],
    ["INVALID_STATE_TRANSITION", "invalidState"],
    ["MISSING_PRICE", "missingPrice"],
    ["LAST_SITE", "lastSite"],
    ["EMPLOYEE_UNAVAILABLE", "invalidState"],
    ["SHIFT_CONFLICT", "conflict"],
    ["INVALID_ROLE", "generic"],
    ["LAST_OWNER", "generic"],
    ["ARCHIVED", "generic"],
    ["INSUFFICIENT_STOCK", "generic"],
    ["UNBALANCED_POSTING", "generic"],
    ["UNEXPECTED", "generic"],
  ] as const)("maps %s to %s", (code, expected) => {
    expect(mapDomainError(new DomainError(code))).toBe(expected);
  });

  it("maps unknown failures to generic", () => {
    expect(mapDomainError(new Error("boom"))).toBe("generic");
    expect(mapDomainError("boom")).toBe("generic");
    expect(mapDomainError(null)).toBe("generic");
    expect(mapDomainError({code: "FORBIDDEN"})).toBe("generic");
  });
});
