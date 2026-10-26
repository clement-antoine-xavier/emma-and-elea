/**
 * Expected domain failures. Services throw these; entry points translate them
 * into form errors, redirects, or HTTP status codes.
 */
export type DomainErrorCode =
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
