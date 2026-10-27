import {isDomainError} from "@/server/domain/errors";

/**
 * Server Action error keys shared by the settings screens. The client maps
 * these to `Settings.errors.*` messages, so a domain code never reaches the
 * browser.
 */
export type ActionErrorKey =
  | "unauthenticated"
  | "forbidden"
  | "notFound"
  | "conflict"
  | "duplicateCode"
  | "invalidUnit"
  | "invalidInput"
  | "invalidState"
  | "missingPrice"
  | "lastSite"
  | "generic";

export function mapDomainError(error: unknown): ActionErrorKey {
  if (!isDomainError(error)) return "generic";

  switch (error.code) {
    case "FORBIDDEN":
      return "forbidden";
    case "NOT_FOUND":
      return "notFound";
    case "CONFLICT":
      return "conflict";
    case "DUPLICATE_CODE":
      return "duplicateCode";
    case "INVALID_UNIT":
      return "invalidUnit";
    case "INVALID_INPUT":
      return "invalidInput";
    case "INVALID_STATE_TRANSITION":
      return "invalidState";
    case "MISSING_PRICE":
      return "missingPrice";
    case "LAST_SITE":
      return "lastSite";
    default:
      return "generic";
  }
}
