import { betterAuth } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins/admin";
import { organization } from "better-auth/plugins/organization";
import { ensureOrganizationDefaults } from "./organization-defaults";
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
    await ensureOrganizationDefaults(created.id);
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
  advanced: {
    database: {
      joins: true,
    },
  },
  plugins: [admin(), organization(), nextCookies()],
});
