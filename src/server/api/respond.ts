import type {ZodType} from "zod";
import {
  isDomainError,
  type DomainErrorCode,
} from "@/server/domain/errors";

const STATUS_BY_CODE: Partial<Record<DomainErrorCode, number>> = {
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  ALREADY_MEMBER: 409,
  ALREADY_INVITED: 409,
  DUPLICATE_CODE: 409,
  DUPLICATE_NUMBER: 409,
  INVALID_STATE_TRANSITION: 409,
  IMMUTABLE_VERSION: 409,
  ARCHIVED: 409,
  LAST_OWNER: 409,
  INSUFFICIENT_STOCK: 409,
  INVALID_INPUT: 400,
  INVALID_ROLE: 400,
  INVALID_UNIT: 400,
  INVALID_QUANTITY: 400,
  INVALID_RECIPE_OUTPUT: 400,
  RECIPE_CYCLE: 400,
  MISSING_PRICE: 400,
  UNBALANCED_POSTING: 400,
  EMPLOYEE_UNAVAILABLE: 409,
  SHIFT_CONFLICT: 409,
  INVITATION_EXPIRED: 410,
  INVITATION_NOT_PENDING: 409,
  WRONG_ACCOUNT: 403,
  CANNOT_MANAGE_OWNER: 403,
  CANNOT_CHANGE_OWN_ROLE: 403,
};

export function jsonError(
  status: number,
  code: string,
  message: string,
  headers?: HeadersInit,
): Response {
  return Response.json(
    {error: {code, message}},
    {status, headers: {...headers}},
  );
}

/** Maps an expected domain failure to an HTTP status. */
export function domainErrorResponse(error: unknown): Response {
  if (!isDomainError(error)) {
    console.error("Unhandled API error", error);
    return jsonError(500, "UNEXPECTED", "An unexpected error occurred.");
  }

  const status = STATUS_BY_CODE[error.code] ?? 400;

  return jsonError(status, error.code, error.message);
}

/** Runs one service call and serializes its DTO. */
export async function handleApi(
  action: () => Promise<unknown> | unknown,
  status = 200,
): Promise<Response> {
  try {
    const value = await action();
    return Response.json(value === undefined ? {ok: true} : value, {status});
  } catch (error) {
    return domainErrorResponse(error);
  }
}

/**
 * Reads and validates a JSON body. Invalid JSON and schema failures are
 * answered with `400` before any service runs.
 */
export async function parseBody<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<T | Response> {
  let json: unknown;

  try {
    json = await request.json();
  } catch {
    return jsonError(400, "INVALID_INPUT", "Body must be valid JSON.");
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => {
        const path = issue.path.join(".") || "body";
        return `${path}: ${issue.message}`;
      })
      .join("; ");

    return jsonError(400, "INVALID_INPUT", message);
  }

  return parsed.data;
}
