/**
 * OIDC is the default on Vercel and needs only the store id; local development
 * can use a read-write token from `vercel env pull` or `.env`.
 */
export function isBlobConfigured(): boolean {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN?.trim() ||
      (process.env.BLOB_STORE_ID?.trim() &&
        (process.env.VERCEL_OIDC_TOKEN || process.env.VERCEL === "1")),
  );
}
