import {DomainError} from "@/server/domain/errors";
import {can, type Permission} from "@/lib/permissions";
import type {Actor, OrganizationActor} from "./types";

/** Services call this; entry points use the Next-aware guards in actor.ts. */
export function assertOrganizationActor(
  actor: Actor | null,
): OrganizationActor {
  if (
    !actor ||
    !actor.membershipId ||
    !actor.organizationId ||
    !actor.organization ||
    !actor.role
  ) {
    throw new DomainError("FORBIDDEN");
  }

  return actor as OrganizationActor;
}

/**
 * Non-Next permission guard for services. Pages use `requirePermission` in
 * `actor.ts`, which redirects or 404s; services fail with a domain error so the
 * calling action can map it to a form message.
 */
export function assertPermission(
  actor: OrganizationActor,
  permission: Permission,
): void {
  if (!can(actor.role, permission)) throw new DomainError("FORBIDDEN");
}
