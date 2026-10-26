import {cache} from "react";
import {headers} from "next/headers";
import {notFound} from "next/navigation";
import {getLocale} from "next-intl/server";
import {redirect} from "@/i18n/navigation";
import {auth} from "@/lib/auth";
import {
  can,
  canAny,
  isOrgRole,
  isPlatformSupport,
  type Permission,
} from "@/lib/permissions";
import {membershipRepository} from "@/server/repositories/membership.repository";
import type {Actor, OrganizationActor} from "./types";

/**
 * Resolves the caller once per request. The organization always comes from the
 * session and the member table, never from a route parameter or form field.
 */
export const getActorContext = cache(async (): Promise<Actor | null> => {
  const session = await auth.api.getSession({headers: await headers()});

  if (!session) return null;

  const memberships = await membershipRepository.findMembershipsForUser(
    session.user.id,
  );

  const activeOrganizationId = session.session.activeOrganizationId ?? null;
  const membership =
    memberships.find(
      (candidate) => candidate.organizationId === activeOrganizationId,
    ) ??
    memberships[0] ??
    null;

  return {
    userId: session.user.id,
    name: session.user.name,
    email: session.user.email,
    platformRole: session.user.role ?? null,
    isSupport: isPlatformSupport(session.user.role),
    sessionId: session.session.id,
    activeOrganizationId,
    membershipId: membership?.id ?? null,
    organizationId: membership?.organizationId ?? null,
    organization: membership?.organization ?? null,
    role: isOrgRole(membership?.role) ? membership.role : null,
  };
});

export async function requireSession(): Promise<Actor> {
  const actor = await getActorContext();

  if (!actor) {
    return redirect({href: "/sign-in", locale: await getLocale()});
  }

  return actor;
}

/**
 * Requires a session plus an organization membership with a known role.
 * Users without an organization go through onboarding; unknown roles fail
 * closed instead of falling back to a default.
 */
export async function requireOrganizationActor(): Promise<OrganizationActor> {
  const actor = await requireSession();

  if (!actor.membershipId) {
    return redirect({href: "/onboarding", locale: await getLocale()});
  }
  if (!actor.role || !actor.organizationId || !actor.organization) {
    notFound();
  }

  return actor as OrganizationActor;
}

export async function requirePermission(
  permission: Permission,
): Promise<OrganizationActor> {
  const actor = await requireOrganizationActor();

  if (!can(actor.role, permission)) notFound();

  return actor;
}

export async function requireAnyPermission(
  permissions: readonly Permission[],
): Promise<OrganizationActor> {
  const actor = await requireOrganizationActor();

  if (!canAny(actor.role, permissions)) notFound();

  return actor;
}

export async function requirePlatformSupport(): Promise<Actor> {
  const actor = await requireSession();

  if (!actor.isSupport) notFound();

  return actor;
}

export function hasPermission(
  actor: Actor | null,
  permission: Permission,
): boolean {
  return can(actor?.role, permission);
}

export type {Actor, OrganizationActor};
