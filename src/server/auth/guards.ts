import {DomainError} from "@/server/domain/errors";
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
