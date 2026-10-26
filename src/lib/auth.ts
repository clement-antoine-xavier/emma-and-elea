import { betterAuth } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins/admin";
import type {AccessControl} from "better-auth/plugins/access";
import {
  adminAc,
  defaultAc,
  defaultRoles,
} from "better-auth/plugins/admin/access";
import { organization } from "better-auth/plugins/organization";
import { organizationBootstrapService } from "@/server/services/organization-bootstrap.container";
import { ac, roles } from "@/server/auth/permissions";
import { prisma } from "./prisma";

/**
 * Bootstraps the tenant when an organization is created.
 *
 * A `databaseHooks.organization` hook is not used: the organization plugin
 * creates the row through the raw adapter, which bypasses database hooks. The
 * endpoint hook sees the returned organization instead.
 */
const createOrganizationDefaults = createAuthMiddleware(async (ctx) => {
  if (ctx.path !== "/organization/create") return;

  const created = ctx.context.returned as
    | { id?: string; error?: unknown }
    | undefined;
  if (!created?.id || created.error) return;

  try {
    await organizationBootstrapService.bootstrapOrganization(created.id);
  } catch (error) {
    // The organization row is already committed, so a failure must not turn
    // into a failed creation flow. The function is idempotent and can be
    // re-run to repair the tenant.
    console.error(
      `Failed to create defaults for organization ${created.id}`,
      error,
    );
  }
});

export const auth = betterAuth({
  appName: "Emma & Elea",
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  hooks: {
    after: createOrganizationDefaults,
  },
  emailAndPassword: {
    enabled: true,
  },
  // Better Auth enables rate limiting in production. The E2E suite creates
  // several accounts in one run, so Playwright turns it off for its own server.
  rateLimit: {
    enabled: process.env.E2E_DISABLE_AUTH_RATE_LIMIT !== "true",
  },
  advanced: {
    database: {
      joins: true,
    },
  },
  plugins: [
    admin({
      // Platform staff are separate from organization roles. "admin" is kept
      // as a legacy alias for installs created before ADR-0011.
      ac: defaultAc as unknown as AccessControl,
      roles: {...defaultRoles, support: adminAc},
      adminRoles: ["support", "admin"],
      defaultRole: "user",
    }),
    organization({
      ac,
      roles,
      creatorRole: "owner",
      invitationExpiresIn: 60 * 60 * 24 * 7,
      cancelPendingInvitationsOnReInvite: true,
      // Invitations are shared as links until an email provider is chosen.
      // Owners can revisit deletion once a soft-delete flow exists.
      disableOrganizationDeletion: true,
    }),
    nextCookies(),
  ],
});
