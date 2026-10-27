/**
 * Expected domain failures. Services throw these; entry points translate them
 * into form errors, redirects, or HTTP status codes.
 */
export type DomainErrorCode =
  // Identity, tenancy and people (ADR-0012).
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INVALID_ROLE"
  | "INVALID_INPUT"
  | "CANNOT_MANAGE_OWNER"
  | "CANNOT_CHANGE_OWN_ROLE"
  | "LAST_OWNER"
  | "ALREADY_MEMBER"
  | "ALREADY_INVITED"
  | "INVITATION_EXPIRED"
  | "INVITATION_NOT_PENDING"
  | "WRONG_ACCOUNT"
  // Reference data and catalogue.
  | "INVALID_UNIT"
  | "DUPLICATE_CODE"
  | "DUPLICATE_NUMBER"
  | "ARCHIVED"
  | "LAST_SITE"
  // Recipes and costing.
  | "IMMUTABLE_VERSION"
  | "INVALID_RECIPE_OUTPUT"
  | "RECIPE_CYCLE"
  | "MISSING_PRICE"
  // Ledger, production and commercial.
  | "INSUFFICIENT_STOCK"
  | "INVALID_STATE_TRANSITION"
  | "INVALID_QUANTITY"
  | "UNBALANCED_POSTING"
  | "UNEXPECTED";

export class DomainError extends Error {
  readonly code: DomainErrorCode;

  constructor(code: DomainErrorCode, message?: string, options?: ErrorOptions) {
    super(message ?? code, options);
    this.name = "DomainError";
    this.code = code;
  }
}

export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError;
}
