import "server-only";

import {cache} from "react";
import {headers} from "next/headers";
import {notFound} from "next/navigation";
import {getLocale} from "next-intl/server";
import {redirect} from "@/i18n/navigation";
import {auth} from "./auth";
import {prisma} from "./prisma";
import {
  can,
  canAny,
  isOrgRole,
  isPlatformSupport,
  type OrgRole,
  type Permission,
} from "./permissions";

export type MembershipSummary = {
  id: string;
  organizationId: string;
  role: string;
  createdAt: Date;
};

export type OrganizationSummary = {
  id: string;
  name: string;
  slug: string;
};

export type SessionContext = {
  session: {
    id: string;
    activeOrganizationId?: string | null;
    impersonatedBy?: string | null;
  };
  user: {
    id: string;
    name: string;
    email: string;
    role?: string | null;
  };
  membership: MembershipSummary | null;
  organization: OrganizationSummary | null;
  role: OrgRole | null;
  isSupport: boolean;
};

/**
 * Resolves the caller once per request.
 *
 * The organization is always derived from the session and the `member` table,
 * never from a route parameter or form field. A stale `activeOrganizationId`
 * falls back to the user's first membership, which keeps one-organization
 * accounts working after a session refresh.
 */
export const getAccessContext = cache(
  async (): Promise<SessionContext | null> => {
    const session = await auth.api.getSession({headers: await headers()});

    if (!session) return null;

    const memberships = await prisma.member.findMany({
      where: {userId: session.user.id},
      orderBy: {createdAt: "asc"},
      select: {
        id: true,
        organizationId: true,
        role: true,
        createdAt: true,
        organization: {select: {id: true, name: true, slug: true}},
      },
    });

    const activeOrganizationId = session.session.activeOrganizationId ?? null;
    const membership =
      memberships.find(
        (candidate) => candidate.organizationId === activeOrganizationId,
      ) ??
      memberships[0] ??
      null;

    return {
      session: {
        id: session.session.id,
        activeOrganizationId,
        impersonatedBy: session.session.impersonatedBy ?? null,
      },
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
      },
      membership,
      organization: membership?.organization ?? null,
      role: isOrgRole(membership?.role) ? membership.role : null,
      isSupport: isPlatformSupport(session.user.role),
    };
  },
);

export async function requireSession(): Promise<SessionContext> {
  const context = await getAccessContext();

  if (!context) {
    return redirect({href: "/sign-in", locale: await getLocale()});
  }

  return context;
}

/**
 * Requires a session plus an organization membership with a known role.
 * Users without an organization go through onboarding; unknown roles fail
 * closed instead of falling back to a default.
 */
export async function requireOrganization(): Promise<
  SessionContext & {
    membership: MembershipSummary;
    organization: OrganizationSummary;
    role: OrgRole;
  }
> {
  const context = await requireSession();

  if (!context.membership) {
    return redirect({href: "/onboarding", locale: await getLocale()});
  }
  if (!context.role) notFound();

  return context as SessionContext & {
    membership: MembershipSummary;
    organization: OrganizationSummary;
    role: OrgRole;
  };
}

export async function requirePermission(
  permission: Permission,
): Promise<
  SessionContext & {
    membership: MembershipSummary;
    organization: OrganizationSummary;
    role: OrgRole;
  }
> {
  const context = await requireOrganization();

  if (!can(context.role, permission)) notFound();

  return context;
}

export async function requireAnyPermission(
  permissions: readonly Permission[],
): Promise<
  SessionContext & {
    membership: MembershipSummary;
    organization: OrganizationSummary;
    role: OrgRole;
  }
> {
  const context = await requireOrganization();

  if (!canAny(context.role, permissions)) notFound();

  return context;
}

export async function requirePlatformSupport(): Promise<SessionContext> {
  const context = await requireSession();

  if (!context.isSupport) notFound();

  return context;
}

/**
 * Server actions cannot render a 404 mid-submit, so they use this instead of
 * `requirePermission` and translate the boolean into a form error.
 */
export function hasPermission(
  context: SessionContext | null,
  permission: Permission,
): boolean {
  return can(context?.role, permission);
}
