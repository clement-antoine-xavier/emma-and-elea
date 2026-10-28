import {betterAuth} from "better-auth";
import {createAuthMiddleware} from "better-auth/api";
import {prismaAdapter} from "better-auth/adapters/prisma";
import {nextCookies} from "better-auth/next-js";
import {jwt} from "better-auth/plugins";
import {admin} from "better-auth/plugins/admin";
import type {AccessControl} from "better-auth/plugins/access";
import {adminAc, defaultAc, defaultRoles} from "better-auth/plugins/admin/access";
import {organization} from "better-auth/plugins/organization";
import {mcp} from "@better-auth/mcp";
import {cimd} from "@better-auth/cimd";
import {fetchClientMetadataResource} from "@better-auth/cimd/node";
import {organizationBootstrapService} from "@/server/services/organization-bootstrap.container";
import {ac, roles} from "@/server/auth/permissions";
import {apiResource, mcpResource, providerScopes} from "./resources";
import {TOKEN_ORG_CLAIM} from "./scopes";
import {prisma} from "./prisma";

const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

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
    | {id?: string; error?: unknown}
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
  baseURL,
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
    // The JWT plugin provides the signing key and `/jwks` used by the OAuth
    // provider to mint verifiable access tokens.
    jwt(),
    // MCP clients discover this authorization server from the MCP route's
    // 401 challenge. Scopes are coarse: the member role remains authoritative.
    mcp({
      loginPage: "/sign-in",
      consentPage: "/consent",
      resource: mcpResource,
      scopes: providerScopes,
      // A resource without `allowedScopes` cannot be stored with Prisma, and
      // `mcp()` always adds its own resource. Declare both resources with every
      // scope so MCP clients and REST API clients share one consent vocabulary.
      resources: [
        {identifier: mcpResource, allowedScopes: providerScopes},
        {identifier: apiResource, allowedScopes: providerScopes},
      ],
      // Dynamic-registration clients may request the API resource in addition
      // to the MCP default. Production API clients are usually pre-registered.
      clientRegistrationAllowedResources: [apiResource],
      accessTokenExpiresIn: 60 * 60,
      // Dynamic registration keeps Cursor and older Claude Code builds
      // working. MCP 2026-07-28 prefers CIMD, which `cimd()` adds below.
      allowDynamicClientRegistration: true,
      allowUnauthenticatedClientRegistration: true,
      clientRegistrationDefaultApplicationType: "infer",
      // Consent is stored per organization, so a token granted for one tenant
      // is never reused for another. Users without an organization complete
      // onboarding first.
      postLogin: {
        page: "/onboarding",
        shouldRedirect: ({session}) => !session.activeOrganizationId,
        consentReferenceId: ({session}) => {
          const organizationId = session.activeOrganizationId;
          return typeof organizationId === "string" && organizationId.length > 0
            ? organizationId
            : undefined;
        },
      },
      customAccessTokenClaims: ({referenceId}) =>
        referenceId ? {[TOKEN_ORG_CLAIM]: referenceId} : {},
    }),
    // Client ID Metadata Documents, pinned to the MCP 2026-07-28 profile.
    // `fetchClientMetadataResource` resolves DNS once and pins the connection,
    // which keeps the outbound fetch off private addresses (see ADR-0020).
    cimd({
      fetchClientMetadataResource,
      metadataProfile: "mcp-2026-07-28",
    }),
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
