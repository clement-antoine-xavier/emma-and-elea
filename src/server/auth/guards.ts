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
 * Whether the credential may exercise a permission. When the actor carries an
 * explicit scope set (MCP access tokens), it wins; otherwise the role matrix is
 * authoritative. This is the single guard shared by Server Actions, Server
 * Components and MCP tools.
 */
export function isGranted(
  actor: Actor | null | undefined,
  permission: Permission,
): boolean {
  if (!actor) return false;
  if (actor.scopes) return actor.scopes.has(permission);
  return can(actor.role, permission);
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
  if (!isGranted(actor, permission)) throw new DomainError("FORBIDDEN");
}

/** Throws `FORBIDDEN` unless the credential granted the scope's permissions. */
export function assertAnyPermission(
  actor: OrganizationActor,
  permissions: readonly Permission[],
): void {
  if (!permissions.some((permission) => isGranted(actor, permission))) {
    throw new DomainError("FORBIDDEN");
  }
}
