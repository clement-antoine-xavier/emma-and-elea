/**
 * Resolves the public app origin.
 *
 * Production uses BETTER_AUTH_URL so a custom domain wins. Preview deployments
 * have a per-deployment hostname, so they prefer VERCEL_URL; otherwise a
 * preview would mint OAuth and cookie origins for the production domain.
 */
export function appBaseUrl(): string {
  const configured = process.env.BETTER_AUTH_URL?.trim();

  if (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  if (configured) return configured;

  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;

  return "http://localhost:3000";
}

export function appTrustedOrigins(): string[] {
  const origins = new Set<string>([appBaseUrl()]);
  const configured = process.env.BETTER_AUTH_URL?.trim();

  if (configured) origins.add(configured);

  return [...origins];
}
